"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteProductImage = exports.uploadProductImage = exports.upload = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
// Dossier uploads
const uploadDir = path_1.default.join(process.cwd(), "uploads", "products");
if (!fs_1.default.existsSync(uploadDir)) {
    fs_1.default.mkdirSync(uploadDir, { recursive: true });
}
// Config multer
const storage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => {
        const ext = path_1.default.extname(file.originalname).toLowerCase();
        const name = `product_${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`;
        cb(null, name);
    },
});
const fileFilter = (_req, file, cb) => {
    const allowed = [".jpg", ".jpeg", ".png", ".webp", ".gif"];
    const ext = path_1.default.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
        cb(null, true);
    }
    else {
        cb(new Error("Format non supporté. Utilisez JPG, PNG ou WebP."));
    }
};
exports.upload = (0, multer_1.default)({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
});
// ── POST /upload/product-image ────────────────────────────────
const uploadProductImage = (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: "Aucun fichier reçu" });
    }
    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
    const imageUrl = `${baseUrl}/uploads/products/${req.file.filename}`;
    return res.status(200).json({
        message: "Image uploadée avec succès",
        imageUrl,
        filename: req.file.filename,
    });
};
exports.uploadProductImage = uploadProductImage;
// ── DELETE /upload/product-image/:filename ────────────────────
const deleteProductImage = (req, res) => {
    const { filename } = req.params;
    // Sécurité : pas de path traversal
    if (filename.includes("/") || filename.includes("..")) {
        return res.status(400).json({ message: "Nom de fichier invalide" });
    }
    const filePath = path_1.default.join(uploadDir, filename);
    if (!fs_1.default.existsSync(filePath)) {
        return res.status(404).json({ message: "Fichier introuvable" });
    }
    fs_1.default.unlinkSync(filePath);
    return res.status(200).json({ message: "Image supprimée" });
};
exports.deleteProductImage = deleteProductImage;
