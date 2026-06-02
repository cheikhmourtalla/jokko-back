"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addSupplierPayment = exports.addSupplierDebt = exports.deleteSupplier = exports.updateSupplier = exports.createSupplier = exports.getSupplierById = exports.getSuppliers = void 0;
const prisma_1 = require("../config/prisma");
// ── GET /suppliers ────────────────────────────────────────────
const getSuppliers = async (req, res) => {
    try {
        const shopId = req.user.shopId;
        const suppliers = await prisma_1.prisma.supplier.findMany({
            where: { shopId },
            include: {
                supplierDebts: {
                    include: { payments: true },
                    orderBy: { createdAt: "desc" },
                },
                _count: { select: { stockMovements: true } },
            },
            orderBy: { name: "asc" },
        });
        const formatted = suppliers.map((s) => ({
            ...s,
            totalDebt: s.supplierDebts
                .filter((d) => d.status !== "PAID")
                .reduce((sum, d) => sum + d.remaining, 0),
            totalPaid: s.supplierDebts.reduce((sum, d) => sum + d.paidAmount, 0),
            totalPurchases: s.supplierDebts.reduce((sum, d) => sum + d.totalAmount, 0),
            deliveries: s._count.stockMovements,
        }));
        return res.status(200).json(formatted);
    }
    catch (error) {
        return res.status(500).json({ message: "Erreur récupération fournisseurs", error });
    }
};
exports.getSuppliers = getSuppliers;
// ── GET /suppliers/:id ────────────────────────────────────────
const getSupplierById = async (req, res) => {
    try {
        const shopId = req.user.shopId;
        const id = Number(req.params.id);
        const supplier = await prisma_1.prisma.supplier.findFirst({
            where: { id, shopId },
            include: {
                supplierDebts: {
                    include: { payments: true },
                    orderBy: { createdAt: "desc" },
                },
                stockMovements: {
                    include: { product: true },
                    orderBy: { createdAt: "desc" },
                    take: 20,
                },
            },
        });
        if (!supplier)
            return res.status(404).json({ message: "Fournisseur introuvable" });
        return res.status(200).json({
            ...supplier,
            totalDebt: supplier.supplierDebts
                .filter((d) => d.status !== "PAID")
                .reduce((sum, d) => sum + d.remaining, 0),
            totalPaid: supplier.supplierDebts.reduce((sum, d) => sum + d.paidAmount, 0),
            totalPurchases: supplier.supplierDebts.reduce((sum, d) => sum + d.totalAmount, 0),
        });
    }
    catch (error) {
        return res.status(500).json({ message: "Erreur récupération fournisseur", error });
    }
};
exports.getSupplierById = getSupplierById;
// ── POST /suppliers ───────────────────────────────────────────
const createSupplier = async (req, res) => {
    try {
        const shopId = req.user.shopId;
        const { name, phone, email, address } = req.body;
        if (!name)
            return res.status(400).json({ message: "Le nom est obligatoire" });
        const supplier = await prisma_1.prisma.supplier.create({
            data: {
                shopId,
                name,
                phone: phone || null,
                email: email || null,
                address: address || null,
            },
        });
        return res.status(201).json({ message: "Fournisseur créé avec succès", supplier });
    }
    catch (error) {
        return res.status(500).json({ message: "Erreur création fournisseur", error });
    }
};
exports.createSupplier = createSupplier;
// ── PUT /suppliers/:id ────────────────────────────────────────
const updateSupplier = async (req, res) => {
    try {
        const shopId = req.user.shopId;
        const id = Number(req.params.id);
        const { name, phone, email, address } = req.body;
        const existing = await prisma_1.prisma.supplier.findFirst({ where: { id, shopId } });
        if (!existing)
            return res.status(404).json({ message: "Fournisseur introuvable" });
        const updated = await prisma_1.prisma.supplier.update({
            where: { id },
            data: {
                name: name || existing.name,
                phone: phone !== undefined ? phone : existing.phone,
                email: email !== undefined ? email : existing.email,
                address: address !== undefined ? address : existing.address,
            },
        });
        return res.status(200).json({ message: "Fournisseur modifié", supplier: updated });
    }
    catch (error) {
        return res.status(500).json({ message: "Erreur modification fournisseur", error });
    }
};
exports.updateSupplier = updateSupplier;
// ── DELETE /suppliers/:id ─────────────────────────────────────
const deleteSupplier = async (req, res) => {
    try {
        const shopId = req.user.shopId;
        const id = Number(req.params.id);
        const existing = await prisma_1.prisma.supplier.findFirst({ where: { id, shopId } });
        if (!existing)
            return res.status(404).json({ message: "Fournisseur introuvable" });
        await prisma_1.prisma.supplier.delete({ where: { id } });
        return res.status(200).json({ message: "Fournisseur supprimé" });
    }
    catch (error) {
        return res.status(500).json({ message: "Erreur suppression fournisseur", error });
    }
};
exports.deleteSupplier = deleteSupplier;
// ── POST /suppliers/:id/debts ─────────────────────────────────
// Créer une dette manuellement (sans approvisionnement)
const addSupplierDebt = async (req, res) => {
    try {
        const shopId = req.user.shopId;
        const supplierId = Number(req.params.id);
        const { totalAmount, paidAmount, note } = req.body;
        if (!totalAmount || Number(totalAmount) <= 0) {
            return res.status(400).json({ message: "Montant total invalide" });
        }
        const supplier = await prisma_1.prisma.supplier.findFirst({ where: { id: supplierId, shopId } });
        if (!supplier)
            return res.status(404).json({ message: "Fournisseur introuvable" });
        const total = Number(totalAmount);
        const paid = paidAmount ? Number(paidAmount) : 0;
        if (paid > total) {
            return res.status(400).json({ message: "L'acompte ne peut pas dépasser le total" });
        }
        // Si acompte versé, vérifier que la caisse est ouverte
        if (paid > 0) {
            const cashRegister = await prisma_1.prisma.cashRegister.findFirst({
                where: { shopId, status: "OPEN" },
            });
            if (!cashRegister) {
                return res.status(400).json({
                    message: "La caisse est fermée. Impossible de verser un acompte sans caisse ouverte.",
                    code: "CASH_CLOSED",
                });
            }
        }
        const remaining = total - paid;
        const status = remaining <= 0 ? "PAID" : paid > 0 ? "PARTIAL" : "UNPAID";
        const debt = await prisma_1.prisma.$transaction(async (tx) => {
            const newDebt = await tx.supplierDebt.create({
                data: {
                    supplierId,
                    totalAmount: total,
                    paidAmount: paid,
                    remaining,
                    status,
                    note: note || null,
                },
            });
            // Enregistrer l'acompte si versé
            if (paid > 0) {
                await tx.supplierPayment.create({
                    data: {
                        supplierDebtId: newDebt.id,
                        amount: paid,
                        note: "Acompte initial",
                    },
                });
                // Décaissement en caisse si ouverte
                const cashRegister = await tx.cashRegister.findFirst({
                    where: { shopId, status: "OPEN" },
                });
                if (cashRegister) {
                    await tx.cashTransaction.create({
                        data: {
                            cashRegisterId: cashRegister.id,
                            type: "OUT",
                            amount: paid,
                            label: `Acompte fournisseur — ${supplier.name}`,
                            reference: String(supplierId),
                        },
                    });
                    await tx.cashRegister.update({
                        where: { id: cashRegister.id },
                        data: { totalOut: { increment: paid } },
                    });
                }
            }
            return newDebt;
        });
        return res.status(201).json({ message: "Dette enregistrée", debt });
    }
    catch (error) {
        return res.status(500).json({ message: "Erreur ajout dette fournisseur", error });
    }
};
exports.addSupplierDebt = addSupplierDebt;
// ── POST /suppliers/:id/debts/:debtId/payments ────────────────
// Enregistrer un paiement (règlement ou acompte) vers un fournisseur
const addSupplierPayment = async (req, res) => {
    try {
        const shopId = req.user.shopId;
        const supplierId = Number(req.params.id);
        const debtId = Number(req.params.debtId);
        const { amount, note } = req.body;
        const paymentAmount = Number(amount);
        if (!paymentAmount || paymentAmount <= 0) {
            return res.status(400).json({ message: "Montant invalide" });
        }
        const supplier = await prisma_1.prisma.supplier.findFirst({ where: { id: supplierId, shopId } });
        if (!supplier)
            return res.status(404).json({ message: "Fournisseur introuvable" });
        const debt = await prisma_1.prisma.supplierDebt.findUnique({ where: { id: debtId } });
        if (!debt)
            return res.status(404).json({ message: "Dette introuvable" });
        if (debt.status === "PAID") {
            return res.status(400).json({ message: "Cette dette est déjà soldée" });
        }
        if (paymentAmount > debt.remaining) {
            return res.status(400).json({
                message: `Le montant dépasse le reste dû (${debt.remaining} FCFA)`,
            });
        }
        // ✅ Vérifier que la caisse est ouverte
        const cashRegForPayment = await prisma_1.prisma.cashRegister.findFirst({
            where: { shopId, status: "OPEN" },
        });
        if (!cashRegForPayment) {
            return res.status(400).json({
                message: "La caisse est fermée. Veuillez ouvrir la caisse avant de payer un fournisseur.",
                code: "CASH_CLOSED",
            });
        }
        const newPaid = debt.paidAmount + paymentAmount;
        const newRemaining = debt.remaining - paymentAmount;
        const newStatus = newRemaining <= 0 ? "PAID" : "PARTIAL";
        const payment = await prisma_1.prisma.$transaction(async (tx) => {
            const newPayment = await tx.supplierPayment.create({
                data: {
                    supplierDebtId: debtId,
                    amount: paymentAmount,
                    note: note || null,
                },
            });
            await tx.supplierDebt.update({
                where: { id: debtId },
                data: { paidAmount: newPaid, remaining: newRemaining, status: newStatus },
            });
            // ✅ Décaissement automatique en caisse si ouverte
            const cashRegister = await tx.cashRegister.findFirst({
                where: { shopId, status: "OPEN" },
            });
            if (cashRegister) {
                await tx.cashTransaction.create({
                    data: {
                        cashRegisterId: cashRegister.id,
                        type: "OUT",
                        amount: paymentAmount,
                        label: `Paiement fournisseur — ${supplier.name}`,
                        reference: String(supplierId),
                    },
                });
                await tx.cashRegister.update({
                    where: { id: cashRegister.id },
                    data: { totalOut: { increment: paymentAmount } },
                });
            }
            return newPayment;
        });
        return res.status(201).json({
            message: "Paiement enregistré",
            payment,
            debtStatus: newStatus,
            remaining: newRemaining,
        });
    }
    catch (error) {
        return res.status(500).json({ message: "Erreur paiement fournisseur", error });
    }
};
exports.addSupplierPayment = addSupplierPayment;
