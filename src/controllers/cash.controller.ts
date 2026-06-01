import { Response } from "express";
import { prisma } from "../config/prisma";
import { AuthRequest } from "../middlewares/auth.middleware";
import { logger } from "../config/logger";

// ── Ouvrir la caisse ─────────────────────────────────────────
export const openCash = async (req: AuthRequest, res: Response) => {
  try {
    const shopId = req.user!.shopId;
    const userId = req.user!.userId;
    const { openingAmount, note } = req.body;

    if (openingAmount === undefined || openingAmount === null) {
      return res.status(400).json({ message: "Le montant d'ouverture est obligatoire" });
    }

    const existing = await prisma.cashRegister.findFirst({
      where: { shopId, status: "OPEN" },
    });
    if (existing) {
      return res.status(400).json({
        message: "Une caisse est déjà ouverte",
        cashRegister: existing,
      });
    }

    const cashRegister = await prisma.cashRegister.create({
      data: { shopId, userId, openingAmount: Number(openingAmount), note: note || null },
    });

    logger.info(`🟢 Caisse ouverte — Shop: ${shopId} — Montant: ${openingAmount} FCFA — User: ${userId}`);
    return res.status(201).json({ message: "Caisse ouverte avec succès", cashRegister });
  } catch (error) {
    return res.status(500).json({ message: "Erreur ouverture caisse", error });
  }
};

// ── Fermer la caisse + snapshot journalier ───────────────────
export const closeCash = async (req: AuthRequest, res: Response) => {
  try {
    const shopId = req.user!.shopId;
    const id = Number(req.params.id);
    const { note } = req.body;

    const cashRegister = await prisma.cashRegister.findFirst({
      where: { id, shopId, status: "OPEN" },
      include: { transactions: true },
    });
    if (!cashRegister) {
      return res.status(404).json({ message: "Caisse ouverte introuvable" });
    }

    const closingAmount =
      cashRegister.openingAmount + cashRegister.totalIn - cashRegister.totalOut;

    const closed = await prisma.cashRegister.update({
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
    };

    logger.info(`🔴 Caisse fermée — Shop: ${shopId} — Clôture: ${closingAmount} FCFA — Entrées: ${cashRegister.totalIn} FCFA — Sorties: ${cashRegister.totalOut} FCFA`);
    return res.status(200).json({
      message: "Caisse fermée avec succès",
      cashRegister: closed,
      summary,
    });
  } catch (error) {
    return res.status(500).json({ message: "Erreur fermeture caisse", error });
  }
};

// ── Caisse en cours ──────────────────────────────────────────
export const getCurrentCash = async (req: AuthRequest, res: Response) => {
  try {
    const shopId = req.user!.shopId;

    const cashRegister = await prisma.cashRegister.findFirst({
      where: { shopId, status: "OPEN" },
      include: {
        transactions: { orderBy: { createdAt: "desc" } },
        user: { select: { name: true } },
      },
    });

    if (!cashRegister) {
      return res.status(200).json({ open: false, cashRegister: null });
    }

    const currentBalance =
      cashRegister.openingAmount + cashRegister.totalIn - cashRegister.totalOut;

    return res.status(200).json({
      open: true,
      cashRegister: { ...cashRegister, currentBalance },
    });
  } catch (error) {
    return res.status(500).json({ message: "Erreur récupération caisse", error });
  }
};

// ── Historique journalier des caisses ────────────────────────
export const getCashHistory = async (req: AuthRequest, res: Response) => {
  try {
    const shopId = req.user!.shopId;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 15;
    const skip = (page - 1) * limit;

    const [total, registers] = await Promise.all([
      prisma.cashRegister.count({ where: { shopId } }),
      prisma.cashRegister.findMany({
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
  } catch (error) {
    return res.status(500).json({ message: "Erreur historique caisses", error });
  }
};

// ── Détail d'une session de caisse ───────────────────────────
export const getCashById = async (req: AuthRequest, res: Response) => {
  try {
    const shopId = req.user!.shopId;
    const id = Number(req.params.id);

    const cashRegister = await prisma.cashRegister.findFirst({
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
  } catch (error) {
    return res.status(500).json({ message: "Erreur récupération session", error });
  }
};

// ── Ajouter une transaction manuelle ────────────────────────
export const addTransaction = async (req: AuthRequest, res: Response) => {
  try {
    const shopId = req.user!.shopId;
    const { type, amount, label, reference } = req.body;

    if (!type || !amount || !label) {
      return res.status(400).json({ message: "Type, montant et libellé sont obligatoires" });
    }
    if (!["IN", "OUT"].includes(type)) {
      return res.status(400).json({ message: "Type doit être IN ou OUT" });
    }

    const cashRegister = await prisma.cashRegister.findFirst({
      where: { shopId, status: "OPEN" },
    });
    if (!cashRegister) {
      return res.status(400).json({
        message: "Aucune caisse ouverte. Ouvrez la caisse avant toute transaction.",
      });
    }

    const amountNum = Number(amount);

    const [transaction] = await prisma.$transaction([
      prisma.cashTransaction.create({
        data: {
          cashRegisterId: cashRegister.id,
          type,
          amount: amountNum,
          label,
          reference: reference || null,
        },
      }),
      prisma.cashRegister.update({
        where: { id: cashRegister.id },
        data:
          type === "IN"
            ? { totalIn: { increment: amountNum } }
            : { totalOut: { increment: amountNum } },
      }),
    ]);

    logger.info(`💳 Transaction manuelle — ${type} — ${amountNum} FCFA — "${label}" — Shop: ${shopId}`);
    return res.status(201).json({ message: "Transaction enregistrée", transaction });
  } catch (error) {
    return res.status(500).json({ message: "Erreur ajout transaction", error });
  }
};