"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteSale = exports.addSalePayment = exports.createSale = exports.getSaleById = exports.getSales = void 0;
const prisma_1 = require("../config/prisma");
const logger_1 = require("../config/logger");
const notification_controller_1 = require("./notification.controller");
// ── Helpers ───────────────────────────────────────────────────
function getSaleStatus(paid, total) {
    if (paid >= total)
        return "PAID";
    if (paid > 0)
        return "PARTIAL";
    return "UNPAID";
}
async function generateInvoiceNumber(shopId) {
    const year = new Date().getFullYear();
    // Compter toutes les ventes de ce shop cette année
    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year + 1, 0, 1);
    const countThisYear = await prisma_1.prisma.sale.count({
        where: {
            shopId,
            invoiceNumber: { not: null },
            createdAt: { gte: startOfYear, lt: endOfYear },
        },
    });
    // Boucle anti-collision : essaie jusqu'à trouver un numéro libre
    let attempt = 0;
    while (attempt < 20) {
        const seq = String(countThisYear + 1 + attempt).padStart(5, "0");
        const candidate = `FAC-${year}-${seq}`;
        const existing = await prisma_1.prisma.sale.findFirst({
            where: { invoiceNumber: candidate },
            select: { id: true },
        });
        if (!existing)
            return candidate;
        attempt++;
    }
    // Dernier recours absolu — ne peut jamais collisionner
    return `FAC-${year}-${Date.now()}`;
}
// ── Encaissement automatique en caisse ───────────────────────
async function recordCashIn(shopId, amount, label, reference) {
    if (amount <= 0)
        return;
    const cashRegister = await prisma_1.prisma.cashRegister.findFirst({
        where: { shopId, status: "OPEN" },
    });
    if (!cashRegister)
        return;
    await prisma_1.prisma.$transaction([
        prisma_1.prisma.cashTransaction.create({
            data: { cashRegisterId: cashRegister.id, type: "IN", amount, label, reference },
        }),
        prisma_1.prisma.cashRegister.update({
            where: { id: cashRegister.id },
            data: { totalIn: { increment: amount } },
        }),
    ]);
}
// ── Décaissement correctif en caisse ─────────────────────────
async function recordCashOut(shopId, amount, label, reference) {
    if (amount <= 0)
        return;
    const cashRegister = await prisma_1.prisma.cashRegister.findFirst({
        where: { shopId, status: "OPEN" },
    });
    if (!cashRegister)
        return;
    await prisma_1.prisma.$transaction([
        prisma_1.prisma.cashTransaction.create({
            data: { cashRegisterId: cashRegister.id, type: "OUT", amount, label, reference },
        }),
        prisma_1.prisma.cashRegister.update({
            where: { id: cashRegister.id },
            data: { totalOut: { increment: amount } },
        }),
    ]);
}
// ── GET /sales ────────────────────────────────────────────────
const getSales = async (req, res) => {
    try {
        const shopId = req.user.shopId;
        const status = req.query.status;
        const clientId = req.query.clientId ? Number(req.query.clientId) : undefined;
        const search = req.query.search;
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        const where = { shopId };
        if (status)
            where.status = status;
        if (clientId)
            where.clientId = clientId;
        if (search) {
            where.OR = [
                { invoiceNumber: { contains: search } },
                { customerName: { contains: search } },
                { client: { name: { contains: search } } },
            ];
        }
        const [total, sales] = await Promise.all([
            prisma_1.prisma.sale.count({ where }),
            prisma_1.prisma.sale.findMany({
                where,
                include: {
                    client: true,
                    items: { include: { product: true } },
                    payments: true,
                },
                orderBy: { createdAt: "desc" },
                skip,
                take: limit,
            }),
        ]);
        return res.status(200).json({
            data: sales,
            pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
        });
    }
    catch (error) {
        return res.status(500).json({ message: "Erreur récupération ventes", error });
    }
};
exports.getSales = getSales;
// ── GET /sales/:id ────────────────────────────────────────────
const getSaleById = async (req, res) => {
    try {
        const shopId = req.user.shopId;
        const id = Number(req.params.id);
        const sale = await prisma_1.prisma.sale.findFirst({
            where: { id, shopId },
            include: {
                client: true,
                items: { include: { product: true } },
                payments: true,
            },
        });
        if (!sale)
            return res.status(404).json({ message: "Vente introuvable" });
        return res.status(200).json(sale);
    }
    catch (error) {
        return res.status(500).json({ message: "Erreur récupération vente", error });
    }
};
exports.getSaleById = getSaleById;
// ── POST /sales ───────────────────────────────────────────────
const createSale = async (req, res) => {
    try {
        const shopId = req.user.shopId;
        const userId = req.user.userId;
        const { clientId, customerName, paidAmount, note, items } = req.body;
        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ message: "Au moins un article est requis" });
        }
        if (!clientId && !customerName?.trim()) {
            return res.status(400).json({ message: "Client ou nom du client requis" });
        }
        // Vérifier les stocks
        const productIds = items.map((i) => Number(i.productId));
        const products = await prisma_1.prisma.product.findMany({
            where: { id: { in: productIds }, shopId, isActive: true },
        });
        for (const item of items) {
            const product = products.find((p) => p.id === Number(item.productId));
            if (!product) {
                return res.status(404).json({ message: `Produit ID ${item.productId} introuvable` });
            }
            if (product.quantity < Number(item.quantity)) {
                return res.status(400).json({
                    message: `Stock insuffisant pour "${product.name}" (disponible: ${product.quantity})`,
                });
            }
        }
        const totalAmount = items.reduce((sum, item) => sum + Number(item.unitPrice) * Number(item.quantity), 0);
        const paid = paidAmount !== undefined && paidAmount !== null && paidAmount !== ""
            ? Number(paidAmount)
            : totalAmount;
        if (paid < 0 || paid > totalAmount) {
            return res.status(400).json({ message: "Montant payé invalide" });
        }
        // ✅ Vérifier que la caisse est ouverte
        const cashRegister = await prisma_1.prisma.cashRegister.findFirst({
            where: { shopId, status: "OPEN" },
        });
        if (!cashRegister) {
            logger_1.logger.warn(`🔒 Vente bloquée — caisse fermée — Shop: ${shopId} — User: ${userId}`);
            return res.status(400).json({
                message: "La caisse est fermée. Veuillez ouvrir la caisse avant d'enregistrer une vente.",
                code: "CASH_CLOSED",
            });
        }
        const remaining = totalAmount - paid;
        const status = getSaleStatus(paid, totalAmount);
        const invoiceNumber = await generateInvoiceNumber(shopId);
        const sale = await prisma_1.prisma.$transaction(async (tx) => {
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
                        create: items.map((item) => {
                            const product = products.find((p) => p.id === Number(item.productId));
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
                    data: { saleId: newSale.id, amount: paid, note: "Paiement initial" },
                });
            }
            for (const item of items) {
                const product = products.find((p) => p.id === Number(item.productId));
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
            return newSale;
        });
        logger_1.logger.info(`🛒 Vente créée — ${invoiceNumber} — Total: ${totalAmount} FCFA — Payé: ${paid} FCFA — Shop: ${shopId}`);
        // Vérifier si des produits sont passés en stock faible ou rupture après la vente
        try {
            const updatedProducts = await prisma_1.prisma.product.findMany({
                where: { id: { in: productIds }, shopId },
                select: { id: true, name: true, quantity: true, alertThreshold: true },
            });
            const lowStock = updatedProducts.filter((p) => p.quantity > 0 && p.quantity <= p.alertThreshold);
            const outOfStock = updatedProducts.filter((p) => p.quantity === 0);
            if (lowStock.length > 0 || outOfStock.length > 0) {
                (0, notification_controller_1.sendNotificationToShop)(shopId, "stock_alert", {
                    type: "after_sale",
                    invoiceNumber,
                    lowStock,
                    outOfStock,
                    total: lowStock.length + outOfStock.length,
                });
            }
        }
        catch { /* silencieux */ }
        // ✅ Encaissement automatique en caisse
        if (paid > 0) {
            const clientLabel = sale.client?.name || sale.customerName || "Client";
            await recordCashIn(shopId, paid, `Vente ${invoiceNumber} — ${clientLabel}`, invoiceNumber);
        }
        return res.status(201).json({ message: "Vente enregistrée avec succès", sale });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Erreur enregistrement vente", error });
    }
};
exports.createSale = createSale;
// ── PATCH /sales/:id/payment ──────────────────────────────────
const addSalePayment = async (req, res) => {
    const saleId = Number(req.params.id);
    try {
        const shopId = req.user.shopId;
        const { amount, note } = req.body;
        const paymentAmount = Number(amount);
        if (!paymentAmount || paymentAmount <= 0) {
            return res.status(400).json({ message: "Montant invalide" });
        }
        const sale = await prisma_1.prisma.sale.findFirst({ where: { id: saleId, shopId } });
        if (!sale)
            return res.status(404).json({ message: "Vente introuvable" });
        if (sale.remaining <= 0) {
            return res.status(400).json({ message: "Cette vente est déjà totalement soldée" });
        }
        if (paymentAmount > sale.remaining) {
            return res.status(400).json({
                message: `Le montant dépasse le reste à payer (${sale.remaining} FCFA)`,
            });
        }
        const newPaid = sale.paidAmount + paymentAmount;
        const newRemaining = sale.remaining - paymentAmount;
        const newStatus = getSaleStatus(newPaid, sale.totalAmount);
        const updatedSale = await prisma_1.prisma.$transaction(async (tx) => {
            await tx.salePayment.create({
                data: { saleId, amount: paymentAmount, note: note || null },
            });
            return tx.sale.update({
                where: { id: saleId },
                data: { paidAmount: newPaid, remaining: newRemaining, status: newStatus },
                include: { client: true, items: true, payments: true },
            });
        });
        // ✅ Encaissement en caisse
        await recordCashIn(shopId, paymentAmount, `Règlement facture ${sale.invoiceNumber || `#${saleId}`}`, sale.invoiceNumber || String(saleId));
        logger_1.logger.info(`💰 Paiement ajouté — Vente #${saleId} — Montant: ${paymentAmount} FCFA — Shop: ${shopId}`);
        return res.status(200).json({ message: "Paiement ajouté avec succès", sale: updatedSale });
    }
    catch (error) {
        logger_1.logger.error("Erreur ajout paiement", { saleId, error });
        return res.status(500).json({ message: "Erreur ajout paiement", error });
    }
};
exports.addSalePayment = addSalePayment;
// ── DELETE /sales/:id ─────────────────────────────────────────
const deleteSale = async (req, res) => {
    const id = Number(req.params.id);
    try {
        const shopId = req.user.shopId;
        const sale = await prisma_1.prisma.sale.findFirst({
            where: { id, shopId },
            include: { items: true },
        });
        if (!sale)
            return res.status(404).json({ message: "Vente introuvable" });
        await prisma_1.prisma.$transaction(async (tx) => {
            for (const item of sale.items) {
                if (item.productId) {
                    await tx.product.update({
                        where: { id: item.productId },
                        data: { quantity: { increment: item.quantity } },
                    });
                    await tx.stockMovement.create({
                        data: {
                            shopId,
                            productId: item.productId,
                            type: "ENTRY",
                            quantity: item.quantity,
                            note: `Annulation vente ${sale.invoiceNumber}`,
                        },
                    });
                }
            }
            await tx.sale.delete({ where: { id } });
        });
        // ✅ Décaissement correctif si montant déjà encaissé
        if (sale.paidAmount > 0) {
            await recordCashOut(shopId, sale.paidAmount, `Annulation vente ${sale.invoiceNumber}`, sale.invoiceNumber || String(id));
        }
        logger_1.logger.warn(`🗑️ Vente annulée — ID: ${id} — Shop: ${shopId}`);
        return res.status(200).json({ message: "Vente annulée et stock restauré" });
    }
    catch (error) {
        logger_1.logger.error("Erreur suppression vente", { id, error });
        return res.status(500).json({ message: "Erreur suppression vente", error });
    }
};
exports.deleteSale = deleteSale;
