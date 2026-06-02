"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteShopLogo = exports.uploadShopLogo = exports.updateShopSettings = exports.getShopSettings = exports.uploadLogo = void 0;
const prisma_1 = require("../config/prisma");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const multer_1 = __importDefault(require("multer"));
// Config multer pour les logos
const logoDir = path_1.default.join(process.cwd(), "uploads", "logos");
if (!fs_1.default.existsSync(logoDir)) {
    fs_1.default.mkdirSync(logoDir, { recursive: true });
}
const logoStorage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => cb(null, logoDir),
    filename: (_req, file, cb) => {
        const ext = path_1.default.extname(file.originalname).toLowerCase();
        cb(null, `logo_${Date.now()}${ext}`);
    },
});
const logoFilter = (_req, file, cb) => {
    const allowed = [".jpg", ".jpeg", ".png", ".webp", ".svg"];
    if (allowed.includes(path_1.default.extname(file.originalname).toLowerCase())) {
        cb(null, true);
    }
    else {
        cb(new Error("Format non supporté. Utilisez JPG, PNG, WebP ou SVG."));
    }
};
exports.uploadLogo = (0, multer_1.default)({
    storage: logoStorage,
    fileFilter: logoFilter,
    limits: { fileSize: 3 * 1024 * 1024 }, // 3MB max
});
// ── GET /shop/settings ────────────────────────────────────────
const getShopSettings = async (req, res) => {
    try {
        const shopId = req.user.shopId;
        const shop = await prisma_1.prisma.shop.findUnique({
            where: { id: shopId },
            include: {
                subscriptions: {
                    orderBy: { createdAt: "desc" },
                    take: 1,
                },
                _count: {
                    select: { users: true, products: true, sales: true, clients: true },
                },
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
            return res.status(400).json({ message: "Nom boutique et nom propriétaire obligatoires" });
        }
        const shop = await prisma_1.prisma.shop.update({
            where: { id: shopId },
            data: {
                name: name.trim(),
                ownerName: ownerName.trim(),
                phone: phone?.trim() || null,
                address: address?.trim() || null,
            },
        });
        return res.status(200).json({ message: "Paramètres mis à jour", shop });
    }
    catch (error) {
        return res.status(500).json({ message: "Erreur mise à jour paramètres", error });
    }
};
exports.updateShopSettings = updateShopSettings;
// ── POST /shop/logo ───────────────────────────────────────────
const uploadShopLogo = (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: "Aucun fichier reçu" });
    }
    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
    const logoUrl = `${baseUrl}/uploads/logos/${req.file.filename}`;
    // Mettre à jour le logo en base
    prisma_1.prisma.shop.update({
        where: { id: req.user.shopId },
        data: { logoUrl },
    }).then((shop) => {
        return res.status(200).json({
            message: "Logo uploadé avec succès",
            logoUrl,
            shop,
        });
    }).catch((error) => {
        return res.status(500).json({ message: "Erreur sauvegarde logo", error });
    });
};
exports.uploadShopLogo = uploadShopLogo;
// ── DELETE /shop/logo ─────────────────────────────────────────
const deleteShopLogo = async (req, res) => {
    try {
        const shopId = req.user.shopId;
        const shop = await prisma_1.prisma.shop.findUnique({ where: { id: shopId } });
        if (!shop)
            return res.status(404).json({ message: "Boutique introuvable" });
        // Supprimer le fichier si c'est un logo uploadé (pas une URL externe)
        if (shop.logoUrl && shop.logoUrl.includes("/uploads/logos/")) {
            const filename = shop.logoUrl.split("/uploads/logos/")[1];
            const filePath = path_1.default.join(logoDir, filename);
            if (fs_1.default.existsSync(filePath)) {
                fs_1.default.unlinkSync(filePath);
            }
        }
        await prisma_1.prisma.shop.update({ where: { id: shopId }, data: { logoUrl: null } });
        return res.status(200).json({ message: "Logo supprimé" });
    }
    catch (error) {
        return res.status(500).json({ message: "Erreur suppression logo", error });
    }
};
exports.deleteShopLogo = deleteShopLogo;
