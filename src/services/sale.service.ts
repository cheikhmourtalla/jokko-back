import { logger } from "../config/logger.js";
import { prisma } from "../config/prisma.js";
import { sendNotificationToShop } from "../controllers/notification.controller.js";
import {
  generateInvoiceNumber,
  getSaleStatus,
  recordCashIn,
} from "../controllers/sale.controller.js";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from "../utils/errors.js";
import { PlanChecker } from "./plan-checker.service.js";

export type Item = {
  productId: number;
  quantity: number;
  unitPrice: number;
};

export const SaleService = {
  createSale: async (
    shopOwnerId :number,
    shopId: number,
    userId: number,
    clientId: number,
    customerName: string,
    paidAmount: string,
    paymentMethod: string,
    items: Item[],
    note: string,
    productId: number[],
  ) => {
    const subscription = await PlanChecker.plan(shopId , shopOwnerId);

    if (!subscription) {
      throw new ForbiddenError("Abonnement introuvable");
    }

    const maxSalesPerMonth = subscription.limits.sales;

    if (maxSalesPerMonth) {
      const now = new Date();

      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const currentSales = await prisma.sale.count({
        where: {
          shopId,
          createdAt: {
            gte: startOfMonth,
          },
        },
      });

      if (currentSales >= maxSalesPerMonth) {
        throw new ForbiddenError(
          `Vous avez atteint la limite mensuelle de ${maxSalesPerMonth} ventes autorisées par votre abonnement.`,
        );
      }
    }
    //  Find product
    const products = await prisma.product.findMany({
      where: { id: { in: productId }, shopId, isActive: true },
    });

    for (const item of items) {
      const product = products.find((p) => p.id === Number(item.productId));
      if (!product) {
        throw new NotFoundError(`Produit ID ${item.productId} introuvable`);
      }
      if (product.quantity < Number(item.quantity)) {
        throw new BadRequestError(
          `Stock insuffisant pour "${product.name}" (disponible: ${product.quantity})`,
        );
      }
    }

    // sales amount
    const totalAmount = items.reduce(
      (sum: number, item: Item) =>
        sum + Number(item.unitPrice) * Number(item.quantity),
      0,
    );

    const paid =
      paidAmount !== undefined && paidAmount !== null && paidAmount !== ""
        ? Number(paidAmount)
        : totalAmount;

    if (paid < 0 || paid > totalAmount) {
      throw new BadRequestError("Montant payé invalide");
    }

    // Check cahd registration status
    const cashRegister = await prisma.cashRegister.findFirst({
      where: { shopId, status: "OPEN" },
    });

    if (!cashRegister) {
      logger.warn(
        `🔒 Vente bloquée — caisse fermée — Shop: ${shopId} — User: ${userId}`,
      );
      throw new BadRequestError(
        "La caisse est fermée. Veuillez ouvrir la caisse avant d'enregistrer une vente.",
        "CASH_CLOSED",
      );
    }

    const remaining = totalAmount - paid;
    const status = getSaleStatus(paid, totalAmount);
    const invoiceNumber = await generateInvoiceNumber(shopId);
    const method = paymentMethod || "CASH";

    const sale = await prisma.$transaction(async (tx) => {
      const newSale = await tx.sale.create({
        data: {
          shopId,
          userId,
          clientId: clientId ? Number(clientId) : null,
          customerName: customerName?.trim() || null,
          invoiceNumber,
          totalAmount,
          paidAmount: paid,
          remaining,
          status,
          note: note || null,
          items: {
            create: items.map((item: any) => {
              const product = products.find(
                (p) => p.id === Number(item.productId),
              )!;
              return {
                productId: product.id,
                productName: product.name,
                productImageUrl: product.imageUrl,
                quantity: Number(item.quantity),
                unitPrice: Number(item.unitPrice),
                totalAmount: Number(item.unitPrice) * Number(item.quantity),
              };
            }),
          },
        },
        include: {
          client: true,
          items: { include: { product: true } },
          payments: true,
        },
      });

      if (paid > 0) {
        await tx.salePayment.create({
          data: {
            saleId: newSale.id,
            amount: paid,
            note: "Paiement initial",
            paymentMethod: method,
          },
        });
      }

      for (const item of items) {
        const product = products.find((p) => p.id === Number(item.productId))!;
        await tx.product.update({
          where: { id: product.id },
          data: { quantity: product.quantity - Number(item.quantity) },
        });
        await tx.stockMovement.create({
          data: {
            shopId,
            productId: product.id,
            userId,
            type: "SALE",
            quantity: Number(item.quantity),
            note: `Vente ${invoiceNumber}`,
          },
        });
      }

      const updatedProducts = await tx.product.findMany({
        where: { id: { in: productId }, shopId },
        select: { id: true, name: true, quantity: true, alertThreshold: true },
      });

      const lowStock = updatedProducts.filter(
        (p) => p.quantity > 0 && p.quantity <= p.alertThreshold,
      );
      const outOfStock = updatedProducts.filter((p) => p.quantity === 0);

      if (subscription.plan.code !== "FREE") {
        if (lowStock.length > 0 || outOfStock.length > 0) {
          sendNotificationToShop(shopId, "stock_alert", {
            type: "after_sale",
            invoiceNumber,
            lowStock,
            outOfStock,
            total: lowStock.length + outOfStock.length,
          });
        }
      } else {
        logger.warn("Free plan no alert Threshold permitted");
      }

      return newSale;
    });

    if (paid > 0) {
      const clientLabel = sale.client?.name || sale.customerName || "Client";
      await recordCashIn(
        shopId,
        paid,
        `Vente ${invoiceNumber} — ${clientLabel}`,
        invoiceNumber,
        method,
      );
    }

    logger.info(
      `🛒 Vente créée — ${invoiceNumber} — Total: ${totalAmount} FCFA — Payé: ${paid} FCFA — Shop: ${shopId}`,
    );
  },
};
