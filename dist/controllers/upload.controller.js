"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteProductImage = exports.uploadProductImage = exports.upload = void 0;
const multer_1 = __importDefault(require("multer"));
const cloudinary_1 = require("cloudinary");
const streamifier_1 = __importDefault(require("streamifier"));
// Config Cloudinary depuis les variables d'environnement
cloudinary_1.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});
// Multer en mémoire (pas de disque)
const storage = multer_1.default.memoryStorage();
const fileFilter = (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (allowed.includes(file.mimetype)) {
        cb(null, true);
    }
    else {
        cb(new Error("Format non supporté. Utilisez JPG, PNG ou WebP."));
    }
};
exports.upload = (0, multer_1.default)({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});
// Helper upload vers Cloudinary
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
// ── POST /upload/product-image ────────────────────────────────
const uploadProductImage = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "Aucun fichier reçu" });
        }
        const imageUrl = await uploadToCloudinary(req.file.buffer, "jokko-business/products");
        return res.status(200).json({ message: "Image uploadée avec succès", imageUrl });
    }
    catch (error) {
        return res.status(500).json({ message: "Erreur upload image", error });
    }
};
exports.uploadProductImage = uploadProductImage;
// ── DELETE /upload/product-image ──────────────────────────────
const deleteProductImage = async (req, res) => {
    try {
        const { publicId } = req.body;
        if (!publicId)
            return res.status(400).json({ message: "Public ID manquant" });
        await cloudinary_1.v2.uploader.destroy(publicId);
        return res.status(200).json({ message: "Image supprimée" });
    }
    catch (error) {
        return res.status(500).json({ message: "Erreur suppression image", error });
    }
};
exports.deleteProductImage = deleteProductImage;
