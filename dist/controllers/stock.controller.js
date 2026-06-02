"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStockMovements = exports.addStockOut = exports.addStockEntry = void 0;
const prisma_1 = require("../config/prisma");
const logger_1 = require("../config/logger");
const notification_controller_1 = require("./notification.controller");
// ── POST /stock/entry ─────────────────────────────────────────
// Paramètres optionnels :
//   supplierId     : lier à un fournisseur existant
//   unitCost       : coût unitaire (pour calculer la dette)
//   paidAmount     : acompte versé au fournisseur à la livraison
//   createDebt     : true/false — créer une dette fournisseur automatiquement
const addStockEntry = async (req, res) => {
    try {
        const shopId = req.user.shopId;
        const userId = req.user.userId;
        const { productId, quantity, note, supplierId, unitCost, paidAmount, // acompte versé au fournisseur
        createDebt, // boolean — créer une dette fournisseur
         } = req.body;
        if (!productId || !quantity || Number(quantity) <= 0) {
            return res.status(400).json({ message: "productId et quantity > 0 sont obligatoires" });
        }
        const product = await prisma_1.prisma.product.findFirst({
            where: { id: Number(productId), shopId },
        });
        if (!product)
            return res.status(404).json({ message: "Produit introuvable" });
        // Vérifier le fournisseur si fourni
        if (supplierId) {
            const supplier = await prisma_1.prisma.supplier.findFirst({
                where: { id: Number(supplierId), shopId },
            });
            if (!supplier)
                return res.status(404).json({ message: "Fournisseur introuvable" });
        }
        const qty = Number(quantity);
        const cost = unitCost ? Number(unitCost) : null;
        const totalCost = cost ? cost * qty : null;
        const paid = paidAmount ? Number(paidAmount) : 0;
        const result = await prisma_1.prisma.$transaction(async (tx) => {
            // 1. Mettre à jour le stock
            const updatedProduct = await tx.product.update({
                where: { id: Number(productId) },
                data: { quantity: { increment: qty } },
            });
            // 2. Créer le mouvement de stock
            const movement = await tx.stockMovement.create({
                data: {
                    shopId,
                    productId: Number(productId),
                    userId,
                    supplierId: supplierId ? Number(supplierId) : null,
                    type: "ENTRY",
                    quantity: qty,
                    unitCost: cost,
                    note: note || null,
                },
            });
            // 3. Gérer la dette fournisseur si demandé
            let debt = null;
            if (supplierId && createDebt && totalCost && totalCost > 0) {
                const remaining = totalCost - paid;
                debt = await tx.supplierDebt.create({
                    data: {
                        supplierId: Number(supplierId),
                        totalAmount: totalCost,
                        paidAmount: paid,
                        remaining: remaining > 0 ? remaining : 0,
                        status: remaining <= 0 ? "PAID" : paid > 0 ? "PARTIAL" : "UNPAID",
                        note: note || `Approvisionnement — ${product.name} x${qty}`,
                    },
                });
                // 4. Enregistrer l'acompte si versé
                if (paid > 0) {
                    await tx.supplierPayment.create({
                        data: {
                            supplierDebtId: debt.id,
                            amount: paid,
                            note: "Acompte à la livraison",
                        },
                    });
                    // 5. Décaissement en caisse si elle est ouverte
                    const cashRegister = await tx.cashRegister.findFirst({
                        where: { shopId, status: "OPEN" },
                    });
                    if (cashRegister) {
                        await tx.cashTransaction.create({
                            data: {
                                cashRegisterId: cashRegister.id,
                                type: "OUT",
                                amount: paid,
                                label: `Acompte fournisseur — ${product.name} x${qty}`,
                                reference: String(supplierId),
                            },
                        });
                        await tx.cashRegister.update({
                            where: { id: cashRegister.id },
                            data: { totalOut: { increment: paid } },
                        });
                    }
                }
            }
            return { updatedProduct, movement, debt };
        });
        logger_1.logger.info(`📦 Entrée stock — Produit: ${productId} — Qté: ${qty} — Shop: ${shopId}${supplierId ? ` — Fournisseur: ${supplierId}` : ""}`);
        return res.status(201).json({
            message: "Entrée de stock enregistrée",
            product: result.updatedProduct,
            movement: result.movement,
            debt: result.debt,
        });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Erreur entrée de stock", error });
    }
};
exports.addStockEntry = addStockEntry;
// ── POST /stock/out ───────────────────────────────────────────
const addStockOut = async (req, res) => {
    try {
        const shopId = req.user.shopId;
        const userId = req.user.userId;
        const { productId, quantity, note } = req.body;
        if (!productId || !quantity || Number(quantity) <= 0) {
            return res.status(400).json({ message: "productId et quantity > 0 sont obligatoires" });
        }
        const product = await prisma_1.prisma.product.findFirst({
            where: { id: Number(productId), shopId },
        });
        if (!product)
            return res.status(404).json({ message: "Produit introuvable" });
        if (product.quantity < Number(quantity)) {
            return res.status(400).json({ message: "Stock insuffisant" });
        }
        const [updatedProduct, movement] = await prisma_1.prisma.$transaction([
            prisma_1.prisma.product.update({
                where: { id: Number(productId) },
                data: { quantity: { decrement: Number(quantity) } },
            }),
            prisma_1.prisma.stockMovement.create({
                data: {
                    shopId,
                    productId: Number(productId),
                    userId,
                    type: "OUT",
                    quantity: Number(quantity),
                    note: note || null,
                },
            }),
        ]);
        logger_1.logger.info(`📤 Sortie stock — Produit: ${productId} — Qté: ${quantity} — Shop: ${shopId}`);
        // Notifier si stock faible ou rupture
        if (updatedProduct.quantity === 0) {
            (0, notification_controller_1.sendNotificationToShop)(shopId, "stock_alert", {
                type: "out_of_stock",
                outOfStock: [{ id: updatedProduct.id, name: updatedProduct.name, quantity: 0 }],
                lowStock: [],
                total: 1,
            });
        }
        else if (updatedProduct.quantity <= product.alertThreshold) {
            (0, notification_controller_1.sendNotificationToShop)(shopId, "stock_alert", {
                type: "low_stock",
                lowStock: [{ id: updatedProduct.id, name: updatedProduct.name, quantity: updatedProduct.quantity, alertThreshold: product.alertThreshold }],
                outOfStock: [],
                total: 1,
            });
        }
        return res.status(201).json({
            message: "Sortie de stock enregistrée",
            product: updatedProduct,
            movement,
        });
    }
    catch (error) {
        return res.status(500).json({ message: "Erreur sortie de stock", error });
    }
};
exports.addStockOut = addStockOut;
// ── GET /stock/movements ──────────────────────────────────────
const getStockMovements = async (req, res) => {
    try {
        const shopId = req.user.shopId;
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        const productId = req.query.productId ? Number(req.query.productId) : undefined;
        const type = req.query.type;
        const where = { shopId };
        if (productId)
            where.productId = productId;
        if (type)
            where.type = type;
        const [total, movements] = await Promise.all([
            prisma_1.prisma.stockMovement.count({ where }),
            prisma_1.prisma.stockMovement.findMany({
                where,
                include: {
                    product: true,
                    user: { select: { name: true } },
                    supplier: { select: { name: true } },
                },
                orderBy: { createdAt: "desc" },
                skip,
                take: limit,
            }),
        ]);
        return res.status(200).json({
            data: movements,
            pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
        });
    }
    catch (error) {
        return res.status(500).json({ message: "Erreur récupération mouvements", error });
    }
};
exports.getStockMovements = getStockMovements;
