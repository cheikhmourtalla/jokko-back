import { Response } from "express";
import { prisma } from "../config/prisma";
import { AuthRequest } from "../middlewares/auth.middleware";
import path from "path";
import fs from "fs";
import multer from "multer";
import type { Request } from "express";

// Config multer pour les logos
const logoDir = path.join(process.cwd(), "uploads", "logos");
if (!fs.existsSync(logoDir)) {
  fs.mkdirSync(logoDir, { recursive: true });
}

const logoStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, logoDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `logo_${Date.now()}${ext}`);
  },
});

const logoFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowed = [".jpg", ".jpeg", ".png", ".webp", ".svg"];
  if (allowed.includes(path.extname(file.originalname).toLowerCase())) {
    cb(null, true);
  } else {
    cb(new Error("Format non supporté. Utilisez JPG, PNG, WebP ou SVG."));
  }
};

export const uploadLogo = multer({
  storage: logoStorage,
  fileFilter: logoFilter,
  limits: { fileSize: 3 * 1024 * 1024 }, // 3MB max
});

// ── GET /shop/settings ────────────────────────────────────────
export const getShopSettings = async (req: AuthRequest, res: Response) => {
  try {
    const shopId = req.user!.shopId;

    const shop = await prisma.shop.findUnique({
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
      return res.status(400).json({ message: "Nom boutique et nom propriétaire obligatoires" });
    }

    const shop = await prisma.shop.update({
      where: { id: shopId },
      data: {
        name: name.trim(),
        ownerName: ownerName.trim(),
        phone: phone?.trim() || null,
        address: address?.trim() || null,
      },
    });

    return res.status(200).json({ message: "Paramètres mis à jour", shop });
  } catch (error) {
    return res.status(500).json({ message: "Erreur mise à jour paramètres", error });
  }
};

// ── POST /shop/logo ───────────────────────────────────────────
export const uploadShopLogo = (req: AuthRequest, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ message: "Aucun fichier reçu" });
  }

  const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
  const logoUrl = `${baseUrl}/uploads/logos/${req.file.filename}`;

  // Mettre à jour le logo en base
  prisma.shop.update({
    where: { id: req.user!.shopId },
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

// ── DELETE /shop/logo ─────────────────────────────────────────
export const deleteShopLogo = async (req: AuthRequest, res: Response) => {
  try {
    const shopId = req.user!.shopId;

    const shop = await prisma.shop.findUnique({ where: { id: shopId } });
    if (!shop) return res.status(404).json({ message: "Boutique introuvable" });

    // Supprimer le fichier si c'est un logo uploadé (pas une URL externe)
    if (shop.logoUrl && shop.logoUrl.includes("/uploads/logos/")) {
      const filename = shop.logoUrl.split("/uploads/logos/")[1];
      const filePath = path.join(logoDir, filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await prisma.shop.update({ where: { id: shopId }, data: { logoUrl: null } });

    return res.status(200).json({ message: "Logo supprimé" });
  } catch (error) {
    return res.status(500).json({ message: "Erreur suppression logo", error });
  }
};