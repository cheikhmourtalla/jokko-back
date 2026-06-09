"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteShopLogo = exports.uploadShopLogo = exports.updateShopSettings = exports.getShopSettings = exports.uploadLogo = void 0;
const prisma_1 = require("../config/prisma");
const cloudinary_1 = require("cloudinary");
const multer_1 = __importDefault(require("multer"));
const streamifier_1 = __importDefault(require("streamifier"));
// Config Cloudinary
cloudinary_1.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});
// Multer mémoire pour les logos
const logoStorage = multer_1.default.memoryStorage();
const logoFilter = (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"];
    if (allowed.includes(file.mimetype))
        cb(null, true);
    else
        cb(new Error("Format non supporté."));
};
exports.uploadLogo = (0, multer_1.default)({
    storage: logoStorage,
    fileFilter: logoFilter,
    limits: { fileSize: 3 * 1024 * 1024 },
});
// Helper upload Cloudinary
const uploadToCloudinary = (buffer, folder) => {
    return new Promise((resolve, reject) => {
        const stream = cloudinary_1.v2.uploader.upload_stream({ folder, resource_type: "image" }, (error, result) => {
            if (error || !result)
                return reject(error);
            resolve(result.secure_url);
        });
        streamifier_1.default.createReadStream(buffer).pipe(stream);
    });
};
// ── GET /shop/settings ────────────────────────────────────────
const getShopSettings = async (req, res) => {
    try {
        const shopId = req.user.shopId;
        const shop = await prisma_1.prisma.shop.findUnique({
            where: { id: shopId },
            include: {
                subscriptions: { orderBy: { createdAt: "desc" }, take: 1 },
                _count: { select: { users: true, products: true, sales: true, clients: true } },
            },
        });
        if (!shop)
            return res.status(404).json({ message: "Boutique introuvable" });
        return res.status(200).json(shop);
    }
    catch (error) {
        return res.status(500).json({ message: "Erreur récupération paramètres", error });
    }
};
exports.getShopSettings = getShopSettings;
// ── PUT /shop/settings ────────────────────────────────────────
const updateShopSettings = async (req, res) => {
    try {
        const shopId = req.user.shopId;
        const { name, ownerName, phone, address } = req.body;
        if (!name || !ownerName) {
            return res.status(400).json({ message: "Nom boutique et propriétaire obligatoires" });
        }
        const shop = await prisma_1.prisma.shop.update({
            where: { id: shopId },
            data: { name: name.trim(), ownerName: ownerName.trim(), phone: phone?.trim() || null, address: address?.trim() || null },
        });
        return res.status(200).json({ message: "Paramètres mis à jour", shop });
    }
    catch (error) {
        return res.status(500).json({ message: "Erreur mise à jour", error });
    }
};
exports.updateShopSettings = updateShopSettings;
// ── POST /shop/logo ───────────────────────────────────────────
const uploadShopLogo = async (req, res) => {
    try {
        if (!req.file)
            return res.status(400).json({ message: "Aucun fichier reçu" });
        const logoUrl = await uploadToCloudinary(req.file.buffer, "jokko-business/logos");
        const shop = await prisma_1.prisma.shop.update({
            where: { id: req.user.shopId },
            data: { logoUrl },
        });
        return res.status(200).json({ message: "Logo uploadé", logoUrl, shop });
    }
    catch (error) {
        return res.status(500).json({ message: "Erreur upload logo", error });
    }
};
exports.uploadShopLogo = uploadShopLogo;
// ── DELETE /shop/logo ─────────────────────────────────────────
const deleteShopLogo = async (req, res) => {
    try {
        const shopId = req.user.shopId;
        await prisma_1.prisma.shop.update({ where: { id: shopId }, data: { logoUrl: null } });
        return res.status(200).json({ message: "Logo supprimé" });
    }
    catch (error) {
        return res.status(500).json({ message: "Erreur suppression logo", error });
    }
};
exports.deleteShopLogo = deleteShopLogo;
