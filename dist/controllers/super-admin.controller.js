"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteShop = exports.resetShopPassword = exports.updateShopStatus = exports.createShop = exports.getShops = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const prisma_1 = require("../config/prisma");
const logger_1 = require("../config/logger");
// ── Liste de toutes les boutiques ────────────────────────────
const getShops = async (_req, res) => {
    try {
        const shops = await prisma_1.prisma.shop.findMany({
            include: {
                subscriptions: { orderBy: { createdAt: "desc" }, take: 1 },
                _count: { select: { users: true, products: true, sales: true } },
            },
            orderBy: { createdAt: "desc" },
        });
        return res.status(200).json(shops);
    }
    catch (error) {
        return res.status(500).json({ message: "Erreur récupération boutiques", error });
    }
};
exports.getShops = getShops;
// ── Créer une boutique + admin ────────────────────────────────
const createShop = async (req, res) => {
    try {
        const { shopName, ownerName, email, phone, address, adminPassword, subscriptionEndDate, } = req.body;
        if (!shopName || !ownerName || !email || !adminPassword) {
            return res.status(400).json({ message: "Champs obligatoires manquants" });
        }
        const existingShop = await prisma_1.prisma.shop.findUnique({ where: { email } });
        if (existingShop) {
            return res.status(400).json({ message: "Une boutique avec cet email existe déjà" });
        }
        const hashedPassword = await bcrypt_1.default.hash(adminPassword, 10);
        const endDate = subscriptionEndDate
            ? new Date(subscriptionEndDate)
            : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 jours par défaut
        const shop = await prisma_1.prisma.$transaction(async (tx) => {
            const newShop = await tx.shop.create({
                data: { name: shopName, ownerName, email, phone: phone || null, address: address || null },
            });
            await tx.subscription.create({
                data: { shopId: newShop.id, endDate },
            });
            await tx.user.create({
                data: {
                    shopId: newShop.id,
                    name: ownerName,
                    email,
                    password: hashedPassword,
                    role: "ADMIN",
                },
            });
            return newShop;
        });
        logger_1.logger.info(`🏪 Nouvelle boutique créée — "${shopName}" — Email: ${email}`);
        return res.status(201).json({ message: "Boutique créée avec succès", shop });
    }
    catch (error) {
        return res.status(500).json({ message: "Erreur création boutique", error });
    }
};
exports.createShop = createShop;
// ── Modifier le statut d'une boutique ────────────────────────
const updateShopStatus = async (req, res) => {
    try {
        const id = Number(req.params.id);
        const { status } = req.body;
        if (!["ACTIVE", "SUSPENDED", "EXPIRED"].includes(status)) {
            return res.status(400).json({ message: "Statut invalide" });
        }
        const shop = await prisma_1.prisma.shop.update({ where: { id }, data: { status } });
        logger_1.logger.warn(`🔄 Statut boutique modifié — ID: ${id} — Nouveau statut: ${status}`);
        return res.status(200).json({ message: "Statut mis à jour", shop });
    }
    catch (error) {
        return res.status(500).json({ message: "Erreur mise à jour statut", error });
    }
};
exports.updateShopStatus = updateShopStatus;
// ── Réinitialiser le mot de passe admin d'une boutique ───────
const resetShopPassword = async (req, res) => {
    try {
        const id = Number(req.params.id);
        const { newPassword } = req.body;
        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({ message: "Mot de passe trop court (6 caractères min)" });
        }
        const shop = await prisma_1.prisma.shop.findUnique({ where: { id } });
        if (!shop)
            return res.status(404).json({ message: "Boutique introuvable" });
        const adminUser = await prisma_1.prisma.user.findFirst({
            where: { shopId: id, role: "ADMIN" },
        });
        if (!adminUser) {
            return res.status(404).json({ message: "Administrateur de la boutique introuvable" });
        }
        const hashedPassword = await bcrypt_1.default.hash(newPassword, 10);
        await prisma_1.prisma.user.update({ where: { id: adminUser.id }, data: { password: hashedPassword } });
        return res.status(200).json({ message: "Mot de passe réinitialisé avec succès" });
    }
    catch (error) {
        return res.status(500).json({ message: "Erreur réinitialisation mot de passe", error });
    }
};
exports.resetShopPassword = resetShopPassword;
// ── Supprimer une boutique ────────────────────────────────────
const deleteShop = async (req, res) => {
    try {
        const id = Number(req.params.id);
        await prisma_1.prisma.shop.delete({ where: { id } });
        logger_1.logger.warn(`🗑️ Boutique supprimée — ID: ${id}`);
        return res.status(200).json({ message: "Boutique supprimée" });
    }
    catch (error) {
        return res.status(500).json({ message: "Erreur suppression boutique", error });
    }
};
exports.deleteShop = deleteShop;
