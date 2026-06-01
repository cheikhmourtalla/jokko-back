import { Request, Response } from "express";
import { logger } from "../config/logger";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "../config/prisma";

// ── Login utilisateur boutique ────────────────────────────────
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email et mot de passe obligatoires" });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { shop: true },
    });

    if (!user) {
      return res.status(401).json({ message: "Identifiants invalides" });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: "Compte désactivé. Contactez votre administrateur." });
    }

    // Vérifier le statut de la boutique
    if (user.shop.status === "SUSPENDED") {
      return res.status(403).json({ message: "Cette boutique est suspendue." });
    }
    if (user.shop.status === "EXPIRED") {
      return res.status(403).json({ message: "L'abonnement de cette boutique a expiré." });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      logger.warn(`❌ Tentative de connexion échouée — ${email} (mauvais mot de passe)`);
      return res.status(401).json({ message: "Identifiants invalides" });
    }

    const token = jwt.sign(
      { userId: user.id, shopId: user.shopId, email: user.email, role: user.role },
      process.env.JWT_SECRET as string,
      { expiresIn: "1d" }
    );

    logger.info(`✅ Connexion réussie — ${user.email} (${user.role}) — Boutique: ${user.shop.name}`);

    return res.status(200).json({
      message: "Connexion réussie",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        shopId: user.shopId,
        shopName: user.shop.name,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erreur lors de la connexion", error });
  }
};

// ── Login Super Admin ─────────────────────────────────────────
export const loginSuperAdmin = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email et mot de passe obligatoires" });
    }

    const admin = await prisma.superAdmin.findUnique({ where: { email } });

    if (!admin) {
      return res.status(401).json({ message: "Identifiants invalides" });
    }

    const isPasswordValid = await bcrypt.compare(password, admin.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Identifiants invalides" });
    }

    const token = jwt.sign(
      { userId: admin.id, email: admin.email, role: "SUPER_ADMIN" },
      process.env.JWT_SECRET as string,
      { expiresIn: "1d" }
    );

    return res.status(200).json({
      message: "Connexion Super Admin réussie",
      token,
      user: { id: admin.id, name: admin.name, email: admin.email, role: "SUPER_ADMIN" },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erreur lors de la connexion", error });
  }
};

// ── Mot de passe oublié ───────────────────────────────────────
export const forgotPassword = async (req: Request, res: Response) => {
  // TODO: implémenter l'envoi d'email avec nodemailer
  return res.status(200).json({
    message: "Si cet email existe, un lien de réinitialisation a été envoyé.",
  });
};