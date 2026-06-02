"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.forgotPassword = exports.loginSuperAdmin = exports.login = void 0;
const logger_1 = require("../config/logger");
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = require("../config/prisma");
// ── Login utilisateur boutique ────────────────────────────────
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: "Email et mot de passe obligatoires" });
        }
        const user = await prisma_1.prisma.user.findUnique({
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
        const isPasswordValid = await bcrypt_1.default.compare(password, user.password);
        if (!isPasswordValid) {
            logger_1.logger.warn(`❌ Tentative de connexion échouée — ${email} (mauvais mot de passe)`);
            return res.status(401).json({ message: "Identifiants invalides" });
        }
        const token = jsonwebtoken_1.default.sign({ userId: user.id, shopId: user.shopId, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: "1d" });
        logger_1.logger.info(`✅ Connexion réussie — ${user.email} (${user.role}) — Boutique: ${user.shop.name}`);
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
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Erreur lors de la connexion", error });
    }
};
exports.login = login;
// ── Login Super Admin ─────────────────────────────────────────
const loginSuperAdmin = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: "Email et mot de passe obligatoires" });
        }
        const admin = await prisma_1.prisma.superAdmin.findUnique({ where: { email } });
        if (!admin) {
            return res.status(401).json({ message: "Identifiants invalides" });
        }
        const isPasswordValid = await bcrypt_1.default.compare(password, admin.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: "Identifiants invalides" });
        }
        const token = jsonwebtoken_1.default.sign({ userId: admin.id, email: admin.email, role: "SUPER_ADMIN" }, process.env.JWT_SECRET, { expiresIn: "1d" });
        return res.status(200).json({
            message: "Connexion Super Admin réussie",
            token,
            user: { id: admin.id, name: admin.name, email: admin.email, role: "SUPER_ADMIN" },
        });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Erreur lors de la connexion", error });
    }
};
exports.loginSuperAdmin = loginSuperAdmin;
// ── Mot de passe oublié ───────────────────────────────────────
const forgotPassword = async (req, res) => {
    // TODO: implémenter l'envoi d'email avec nodemailer
    return res.status(200).json({
        message: "Si cet email existe, un lien de réinitialisation a été envoyé.",
    });
};
exports.forgotPassword = forgotPassword;
