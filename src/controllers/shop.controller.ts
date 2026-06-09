import { Response } from "express";
import { prisma } from "../config/prisma";
import { AuthRequest } from "../middlewares/auth.middleware";
import { v2 as cloudinary } from "cloudinary";
import multer from "multer";
import streamifier from "streamifier";
import type { Request } from "express";

// Config Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Multer mémoire pour les logos
const logoStorage = multer.memoryStorage();
const logoFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowed = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error("Format non supporté."));
};

export const uploadLogo = multer({
  storage: logoStorage,
  fileFilter: logoFilter,
  limits: { fileSize: 3 * 1024 * 1024 },
});

// Helper upload Cloudinary
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

// ── GET /shop/settings ────────────────────────────────────────
export const getShopSettings = async (req: AuthRequest, res: Response) => {
  try {
    const shopId = req.user!.shopId;
    const shop = await prisma.shop.findUnique({
      where: { id: shopId },
      include: {
        subscriptions: { orderBy: { createdAt: "desc" }, take: 1 },
        _count: { select: { users: true, products: true, sales: true, clients: true } },
      },
    });
    if (!shop) return res.status(404).json({ message: "Boutique introuvable" });
    return res.status(200).json(shop);
  } catch (error) {
    return res.status(500).json({ message: "Erreur récupération paramètres", error });
  }
};

// ── PUT /shop/settings ────────────────────────────────────────
export const updateShopSettings = async (req: AuthRequest, res: Response) => {
  try {
    const shopId = req.user!.shopId;
    const { name, ownerName, phone, address } = req.body;
    if (!name || !ownerName) {
      return res.status(400).json({ message: "Nom boutique et propriétaire obligatoires" });
    }
    const shop = await prisma.shop.update({
      where: { id: shopId },
      data: { name: name.trim(), ownerName: ownerName.trim(), phone: phone?.trim() || null, address: address?.trim() || null },
    });
    return res.status(200).json({ message: "Paramètres mis à jour", shop });
  } catch (error) {
    return res.status(500).json({ message: "Erreur mise à jour", error });
  }
};

// ── POST /shop/logo ───────────────────────────────────────────
export const uploadShopLogo = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ message: "Aucun fichier reçu" });
    const logoUrl = await uploadToCloudinary(req.file.buffer, "jokko-business/logos");
    const shop = await prisma.shop.update({
      where: { id: req.user!.shopId },
      data: { logoUrl },
    });
    return res.status(200).json({ message: "Logo uploadé", logoUrl, shop });
  } catch (error) {
    return res.status(500).json({ message: "Erreur upload logo", error });
  }
};

// ── DELETE /shop/logo ─────────────────────────────────────────
export const deleteShopLogo = async (req: AuthRequest, res: Response) => {
  try {
    const shopId = req.user!.shopId;
    await prisma.shop.update({ where: { id: shopId }, data: { logoUrl: null } });
    return res.status(200).json({ message: "Logo supprimé" });
  } catch (error) {
    return res.status(500).json({ message: "Erreur suppression logo", error });
  }
};