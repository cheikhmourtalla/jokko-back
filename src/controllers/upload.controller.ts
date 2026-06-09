import { Request, Response } from "express";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { AuthRequest } from "../middlewares/auth.middleware";
import streamifier from "streamifier";

// Config Cloudinary depuis les variables d'environnement
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Multer en mémoire (pas de disque)
const storage = multer.memoryStorage();

const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Format non supporté. Utilisez JPG, PNG ou WebP."));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

// Helper upload vers Cloudinary
const uploadToCloudinary = (buffer: Buffer, folder: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: "image" },
      (error, result) => {
        if (error || !result) return reject(error);
        resolve(result.secure_url);
      }
    );
    streamifier.createReadStream(buffer).pipe(stream);
  });
};

// ── POST /upload/product-image ────────────────────────────────
export const uploadProductImage = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Aucun fichier reçu" });
    }
    const imageUrl = await uploadToCloudinary(req.file.buffer, "jokko-business/products");
    return res.status(200).json({ message: "Image uploadée avec succès", imageUrl });
  } catch (error) {
    return res.status(500).json({ message: "Erreur upload image", error });
  }
};

// ── DELETE /upload/product-image ──────────────────────────────
export const deleteProductImage = async (req: AuthRequest, res: Response) => {
  try {
    const { publicId } = req.body;
    if (!publicId) return res.status(400).json({ message: "Public ID manquant" });
    await cloudinary.uploader.destroy(publicId);
    return res.status(200).json({ message: "Image supprimée" });
  } catch (error) {
    return res.status(500).json({ message: "Erreur suppression image", error });
  }
};