"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addInvoicePayment = exports.getInvoiceById = exports.getInvoices = void 0;
const prisma_1 = require("../config/prisma");
// Helper encaissement caisse
async function recordCashIn(shopId, amount, label, reference, paymentMethod = "CASH") {
    if (amount <= 0)
        return;
    const cashRegister = await prisma_1.prisma.cashRegister.findFirst({
        where: { shopId, status: "OPEN" },
    });
    if (!cashRegister)
        return;
    await prisma_1.prisma.$transaction([
        prisma_1.prisma.cashTransaction.create({
            data: { cashRegisterId: cashRegister.id, type: "IN", amount, label, reference, paymentMethod },
        }),
        prisma_1.prisma.cashRegister.update({
            where: { id: cashRegister.id },
            data: { totalIn: { increment: amount } },
        }),
    ]);
}
// ── GET /invoices ─────────────────────────────────────────────
// Liste toutes les factures avec recherche avancée
const getInvoices = async (req, res) => {
    try {
        const shopId = req.user.shopId;
        const search = req.query.search;
        const status = req.query.status;
        const dateFrom = req.query.dateFrom;
        const dateTo = req.query.dateTo;
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        const where = { shopId };
        if (status)
            where.status = status;
        if (dateFrom || dateTo) {
            where.createdAt = {};
            if (dateFrom)
                where.createdAt.gte = new Date(dateFrom);
            if (dateTo) {
                const end = new Date(dateTo);
                end.setHours(23, 59, 59, 999);
                where.createdAt.lte = end;
            }
        }
        if (search) {
            where.OR = [
                { invoiceNumber: { contains: search } },
                { customerName: { contains: search } },
                { client: { name: { contains: search } } },
                { client: { phone: { contains: search } } },
            ];
        }
        const [total, invoices] = await Promise.all([
            prisma_1.prisma.sale.count({ where }),
            prisma_1.prisma.sale.findMany({
                where,
                include: {
                    client: true,
                    items: { include: { product: true } },
                    payments: { orderBy: { paidAt: "asc" } },
                },
                orderBy: { createdAt: "desc" },
                skip,
                take: limit,
            }),
        ]);
        // Stats globales
        const stats = await prisma_1.prisma.sale.aggregate({
            where: { shopId },
            _sum: { totalAmount: true, paidAmount: true, remaining: true },
            _count: true,
        });
        return res.status(200).json({
            data: invoices,
            pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
            stats: {
                totalInvoices: stats._count,
                totalRevenue: stats._sum.totalAmount || 0,
                totalCollected: stats._sum.paidAmount || 0,
                totalOutstanding: stats._sum.remaining || 0,
            },
        });
    }
    catch (error) {
        return res.status(500).json({ message: "Erreur récupération factures", error });
    }
};
exports.getInvoices = getInvoices;
// ── GET /invoices/:id ─────────────────────────────────────────
const getInvoiceById = async (req, res) => {
    try {
        const shopId = req.user.shopId;
        const id = Number(req.params.id);
        const invoice = await prisma_1.prisma.sale.findFirst({
            where: { id, shopId },
            include: {
                client: true,
                items: { include: { product: true } },
                payments: { orderBy: { paidAt: "asc" } },
            },
        });
        if (!invoice)
            return res.status(404).json({ message: "Facture introuvable" });
        return res.status(200).json(invoice);
    }
    catch (error) {
        return res.status(500).json({ message: "Erreur récupération facture", error });
    }
};
exports.getInvoiceById = getInvoiceById;
// ── PATCH /invoices/:id/payment ───────────────────────────────
// Ajouter un paiement sur une facture (dette client)
const addInvoicePayment = async (req, res) => {
    try {
        const shopId = req.user.shopId;
        const saleId = Number(req.params.id);
        const { amount, note, paymentMethod } = req.body;
        const paymentAmount = Number(amount);
        if (!paymentAmount || paymentAmount <= 0) {
            return res.status(400).json({ message: "Montant invalide" });
        }
        const sale = await prisma_1.prisma.sale.findFirst({ where: { id: saleId, shopId } });
        if (!sale)
            return res.status(404).json({ message: "Facture introuvable" });
        if (sale.remaining <= 0) {
            return res.status(400).json({ message: "Cette facture est déjà totalement soldée" });
        }
        if (paymentAmount > sale.remaining) {
            return res.status(400).json({
                message: `Le montant dépasse le reste à payer (${sale.remaining} FCFA)`,
            });
        }
        const newPaid = sale.paidAmount + paymentAmount;
        const newRemaining = sale.remaining - paymentAmount;
        const newStatus = newRemaining <= 0 ? "PAID" : "PARTIAL";
        // ✅ Vérifier que la caisse est ouverte
        const cashRegister = await prisma_1.prisma.cashRegister.findFirst({
            where: { shopId, status: "OPEN" },
        });
        if (!cashRegister) {
            return res.status(400).json({
                message: "La caisse est fermée. Veuillez ouvrir la caisse avant d'enregistrer un paiement.",
                code: "CASH_CLOSED",
            });
        }
        const updatedSale = await prisma_1.prisma.$transaction(async (tx) => {
            await tx.salePayment.create({
                data: { saleId, amount: paymentAmount, note: note || null, paymentMethod: paymentMethod || "CASH" },
            });
            return tx.sale.update({
                where: { id: saleId },
                data: { paidAmount: newPaid, remaining: newRemaining, status: newStatus },
                include: {
                    client: true,
                    items: { include: { product: true } },
                    payments: { orderBy: { paidAt: "asc" } },
                },
            });
        });
        // ✅ Encaissement automatique en caisse
        const clientLabel = updatedSale.client?.name || updatedSale.customerName || "Client";
        await recordCashIn(shopId, paymentAmount, `Règlement facture ${sale.invoiceNumber} — ${clientLabel}`, sale.invoiceNumber || String(saleId), paymentMethod || "CASH");
        return res.status(200).json({
            message: "Paiement enregistré sur la facture",
            invoice: updatedSale,
        });
    }
    catch (error) {
        return res.status(500).json({ message: "Erreur paiement facture", error });
    }
};
exports.addInvoicePayment = addInvoicePayment;
