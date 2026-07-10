import { Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { env } from "../config/env-config.js";

// Dossier uploads
const uploadDir = path.join(process.cwd(), "uploads", "products");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Config multer
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const name = `product_${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`;
    cb(null, name);
  },
});

const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowed = [".jpg", ".jpeg", ".png", ".webp", ".gif"];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error("Format non supporté. Utilisez JPG, PNG ou WebP."));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
});

// ── POST /upload/product-image ────────────────────────────────
export const uploadProductImage = (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ message: "Aucun fichier reçu" });
  }

  const baseUrl =  `${env.server}:${env.port || 5000}`;
  const imageUrl = `${baseUrl}/uploads/products/${req.file.filename}`;

  return res.status(200).json({
    message: "Image uploadée avec succès",
    imageUrl,
    filename: req.file.filename,
  });
};

// ── DELETE /upload/product-image/:filename ────────────────────
export const deleteProductImage = (req: Request, res: Response) => {
  const { filename } = req.params;

  // Sécurité : pas de path traversal
  if (filename.includes("/") || filename.includes("..")) {
    return res.status(400).json({ message: "Nom de fichier invalide" });
  }

  const filePath = path.join(uploadDir, filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ message: "Fichier introuvable" });
  }

  fs.unlinkSync(filePath);
  return res.status(200).json({ message: "Image supprimée" });
};