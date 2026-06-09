"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addTransaction = exports.getCashById = exports.getCashHistory = exports.getCurrentCash = exports.closeCash = exports.openCash = void 0;
const prisma_1 = require("../config/prisma");
const logger_1 = require("../config/logger");
// ── Ouvrir la caisse ─────────────────────────────────────────
const openCash = async (req, res) => {
    try {
        const shopId = req.user.shopId;
        const userId = req.user.userId;
        const { openingAmount, note } = req.body;
        if (openingAmount === undefined || openingAmount === null) {
            return res.status(400).json({ message: "Le montant d'ouverture est obligatoire" });
        }
        const existing = await prisma_1.prisma.cashRegister.findFirst({
            where: { shopId, status: "OPEN" },
        });
        if (existing) {
            return res.status(400).json({
                message: "Une caisse est déjà ouverte",
                cashRegister: existing,
            });
        }
        const cashRegister = await prisma_1.prisma.cashRegister.create({
            data: { shopId, userId, openingAmount: Number(openingAmount), note: note || null },
        });
        logger_1.logger.info(`🟢 Caisse ouverte — Shop: ${shopId} — Montant: ${openingAmount} FCFA — User: ${userId}`);
        return res.status(201).json({ message: "Caisse ouverte avec succès", cashRegister });
    }
    catch (error) {
        return res.status(500).json({ message: "Erreur ouverture caisse", error });
    }
};
exports.openCash = openCash;
// ── Fermer la caisse + snapshot journalier ───────────────────
const closeCash = async (req, res) => {
    try {
        const shopId = req.user.shopId;
        const id = Number(req.params.id);
        const { note } = req.body;
        const cashRegister = await prisma_1.prisma.cashRegister.findFirst({
            where: { id, shopId, status: "OPEN" },
            include: { transactions: true },
        });
        if (!cashRegister) {
            return res.status(404).json({ message: "Caisse ouverte introuvable" });
        }
        const closingAmount = cashRegister.openingAmount + cashRegister.totalIn - cashRegister.totalOut;
        const closed = await prisma_1.prisma.cashRegister.update({
            where: { id },
            data: {
                status: "CLOSED",
                closingAmount,
                closedAt: new Date(),
                note: note || cashRegister.note,
            },
            include: {
                transactions: true,
                user: { select: { name: true } },
            },
        });
        // Résumé par mode de paiement
        const methodLabels = {
            CASH: "💵 Espèces",
            WAVE: "🔵 Wave",
            ORANGE_MONEY: "🟠 Orange Money",
            FREE_MONEY: "🟣 Free Money",
            BANK: "🏦 Virement bancaire",
            OTHER: "📱 Autre",
        };
        const byMethod = {};
        for (const tx of closed.transactions) {
            const m = tx.paymentMethod || "CASH";
            if (!byMethod[m])
                byMethod[m] = { in: 0, out: 0 };
            if (tx.type === "IN")
                byMethod[m].in += tx.amount;
            else
                byMethod[m].out += tx.amount;
        }
        const paymentMethodSummary = Object.entries(byMethod).map(([method, amounts]) => ({
            method,
            label: methodLabels[method] || method,
            totalIn: amounts.in,
            totalOut: amounts.out,
            net: amounts.in - amounts.out,
        }));
        // Résumé de la journée
        const summary = {
            date: new Date().toLocaleDateString("fr-FR"),
            openedAt: cashRegister.openedAt,
            closedAt: closed.closedAt,
            openingAmount: cashRegister.openingAmount,
            totalIn: cashRegister.totalIn,
            totalOut: cashRegister.totalOut,
            closingAmount,
            transactionCount: cashRegister.transactions.length,
            openedBy: closed.user?.name || "Inconnu",
            paymentMethodSummary,
        };
        logger_1.logger.info(`🔴 Caisse fermée — Shop: ${shopId} — Clôture: ${closingAmount} FCFA — Entrées: ${cashRegister.totalIn} FCFA — Sorties: ${cashRegister.totalOut} FCFA`);
        return res.status(200).json({
            message: "Caisse fermée avec succès",
            cashRegister: closed,
            summary,
        });
    }
    catch (error) {
        return res.status(500).json({ message: "Erreur fermeture caisse", error });
    }
};
exports.closeCash = closeCash;
// ── Caisse en cours ──────────────────────────────────────────
const getCurrentCash = async (req, res) => {
    try {
        const shopId = req.user.shopId;
        const cashRegister = await prisma_1.prisma.cashRegister.findFirst({
            where: { shopId, status: "OPEN" },
            include: {
                transactions: { orderBy: { createdAt: "desc" } },
                user: { select: { name: true } },
            },
        });
        if (!cashRegister) {
            return res.status(200).json({ open: false, cashRegister: null });
        }
        const currentBalance = cashRegister.openingAmount + cashRegister.totalIn - cashRegister.totalOut;
        return res.status(200).json({
            open: true,
            cashRegister: { ...cashRegister, currentBalance },
        });
    }
    catch (error) {
        return res.status(500).json({ message: "Erreur récupération caisse", error });
    }
};
exports.getCurrentCash = getCurrentCash;
// ── Historique journalier des caisses ────────────────────────
const getCashHistory = async (req, res) => {
    try {
        const shopId = req.user.shopId;
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 15;
        const skip = (page - 1) * limit;
        const [total, registers] = await Promise.all([
            prisma_1.prisma.cashRegister.count({ where: { shopId } }),
            prisma_1.prisma.cashRegister.findMany({
                where: { shopId },
                include: {
                    user: { select: { name: true } },
                    transactions: { orderBy: { createdAt: "asc" } },
                },
                orderBy: { openedAt: "desc" },
                skip,
                take: limit,
            }),
        ]);
        // Enrichir chaque session avec un résumé
        const data = registers.map((r) => ({
            ...r,
            currentBalance: r.closingAmount ?? (r.openingAmount + r.totalIn - r.totalOut),
            transactionCount: r.transactions.length,
            salesIncome: r.transactions
                .filter((t) => t.type === "IN" && t.label.startsWith("Vente"))
                .reduce((sum, t) => sum + t.amount, 0),
            supplierPayments: r.transactions
                .filter((t) => t.type === "OUT" && t.label.toLowerCase().includes("fournisseur"))
                .reduce((sum, t) => sum + t.amount, 0),
        }));
        return res.status(200).json({
            data,
            pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
        });
    }
    catch (error) {
        return res.status(500).json({ message: "Erreur historique caisses", error });
    }
};
exports.getCashHistory = getCashHistory;
// ── Détail d'une session de caisse ───────────────────────────
const getCashById = async (req, res) => {
    try {
        const shopId = req.user.shopId;
        const id = Number(req.params.id);
        const cashRegister = await prisma_1.prisma.cashRegister.findFirst({
            where: { id, shopId },
            include: {
                transactions: { orderBy: { createdAt: "asc" } },
                user: { select: { name: true } },
            },
        });
        if (!cashRegister) {
            return res.status(404).json({ message: "Session de caisse introuvable" });
        }
        const balance = cashRegister.closingAmount
            ?? (cashRegister.openingAmount + cashRegister.totalIn - cashRegister.totalOut);
        return res.status(200).json({ ...cashRegister, currentBalance: balance });
    }
    catch (error) {
        return res.status(500).json({ message: "Erreur récupération session", error });
    }
};
exports.getCashById = getCashById;
// ── Ajouter une transaction manuelle ────────────────────────
const addTransaction = async (req, res) => {
    try {
        const shopId = req.user.shopId;
        const { type, amount, label, reference, paymentMethod } = req.body;
        if (!type || !amount || !label) {
            return res.status(400).json({ message: "Type, montant et libellé sont obligatoires" });
        }
        if (!["IN", "OUT"].includes(type)) {
            return res.status(400).json({ message: "Type doit être IN ou OUT" });
        }
        const validMethods = ["CASH", "WAVE", "ORANGE_MONEY", "FREE_MONEY", "BANK", "OTHER"];
        const method = validMethods.includes(paymentMethod) ? paymentMethod : "CASH";
        const cashRegister = await prisma_1.prisma.cashRegister.findFirst({
            where: { shopId, status: "OPEN" },
        });
        if (!cashRegister) {
            return res.status(400).json({
                message: "Aucune caisse ouverte. Ouvrez la caisse avant toute transaction.",
            });
        }
        const amountNum = Number(amount);
        const [transaction] = await prisma_1.prisma.$transaction([
            prisma_1.prisma.cashTransaction.create({
                data: {
                    cashRegisterId: cashRegister.id,
                    type,
                    amount: amountNum,
                    label,
                    reference: reference || null,
                    paymentMethod: method,
                },
            }),
            prisma_1.prisma.cashRegister.update({
                where: { id: cashRegister.id },
                data: type === "IN"
                    ? { totalIn: { increment: amountNum } }
                    : { totalOut: { increment: amountNum } },
            }),
        ]);
        logger_1.logger.info(`💳 Transaction manuelle — ${type} — ${amountNum} FCFA — "${label}" — Shop: ${shopId}`);
        return res.status(201).json({ message: "Transaction enregistrée", transaction });
    }
    catch (error) {
        return res.status(500).json({ message: "Erreur ajout transaction", error });
    }
};
exports.addTransaction = addTransaction;
