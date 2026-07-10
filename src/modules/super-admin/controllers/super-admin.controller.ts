import bcrypt from "bcrypt";
import { Request, Response } from "express";
import { logger } from "../../../config/logger.js";
import { prisma } from "../../../config/prisma.js";
import { ShopService } from "../../../services/shop.service.js";

// ── Liste de toutes les boutiques ────────────────────────────
export const getShops = async (_req: Request, res: Response) => {
  try {
    const shops = await prisma.shop.findMany({
      include: {
        subscriptions: { orderBy: { createdAt: "desc" }, take: 1 },
        _count: { select: { users: true, products: true, sales: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return res.status(200).json(shops);
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Erreur récupération boutiques", error });
  }
};

// ── Créer une boutique + admin ────────────────────────────────
export const createShop = async (req: Request, res: Response) => {
  try {
    const {
      shopName,
      ownerName,
      email,
      phone,
      address,
      adminPassword,
      currentShop,
      planType,
      onwnerId,
    } = req.body;

    if (!shopName || !ownerName || !email || !adminPassword || !planType) {
      return res.status(400).json({ message: "Champs obligatoires manquants" });
    }

    const existingShop = await ShopService.find(email);
    if (existingShop && currentShop === "PRIMARY") {
      return res
        .status(400)
        .json({ message: "Une boutique avec cet email existe déjà" });
    }

    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    const shop = ShopService.createShop(
      shopName,
      ownerName,
      email,
      phone,
      address,
      hashedPassword,
      planType,
      onwnerId,
      currentShop,
    );

    logger.info(`🏪 Nouvelle boutique créée — "${shopName}" — Email: ${email}`);
    return res
      .status(201)
      .json({ message: "Boutique créée avec succès", shop });
  } catch (error) {
    return res.status(500).json({ message: "Erreur création boutique", error });
  }
};

// ── Modifier le statut d'une boutique ────────────────────────
export const updateShopStatus = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { status } = req.body;

    if (!["ACTIVE", "SUSPENDED", "EXPIRED"].includes(status)) {
      return res.status(400).json({ message: "Statut invalide" });
    }

    const shop = await prisma.shop.update({ where: { id }, data: { status } });
    logger.warn(
      `🔄 Statut boutique modifié — ID: ${id} — Nouveau statut: ${status}`,
    );
    return res.status(200).json({ message: "Statut mis à jour", shop });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Erreur mise à jour statut", error });
  }
};

// ── Réinitialiser le mot de passe admin d'une boutique ───────
export const resetShopPassword = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res
        .status(400)
        .json({ message: "Mot de passe trop court (6 caractères min)" });
    }

    const shop = await prisma.shop.findUnique({ where: { id } });
    if (!shop) return res.status(404).json({ message: "Boutique introuvable" });

    const adminUser = await prisma.user.findFirst({
      where: { shopId: id, role: "ADMIN" },
    });

    if (!adminUser) {
      return res
        .status(404)
        .json({ message: "Administrateur de la boutique introuvable" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: adminUser.id },
      data: { password: hashedPassword },
    });

    return res
      .status(200)
      .json({ message: "Mot de passe réinitialisé avec succès" });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Erreur réinitialisation mot de passe", error });
  }
};

// ── Supprimer une boutique ────────────────────────────────────
export const deleteShop = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    await prisma.shop.delete({ where: { id } });
    logger.warn(`🗑️ Boutique supprimée — ID: ${id}`);
    return res.status(200).json({ message: "Boutique supprimée" });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Erreur suppression boutique", error });
  }
};
