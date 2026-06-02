"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.protectSuperAdmin = exports.authorizeRoles = exports.protect = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const protect = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        // Support du token en query param pour EventSource (SSE)
        const queryToken = req.query.token;
        if (!authHeader && !queryToken) {
            return res.status(401).json({ message: "Accès non autorisé : token manquant" });
        }
        const token = authHeader?.startsWith("Bearer ")
            ? authHeader.split(" ")[1]
            : queryToken;
        if (!token) {
            return res.status(401).json({ message: "Accès non autorisé : token manquant" });
        }
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    }
    catch {
        return res.status(401).json({ message: "Token invalide ou expiré" });
    }
};
exports.protect = protect;
const authorizeRoles = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: "Accès non autorisé" });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ message: "Accès interdit : permissions insuffisantes" });
        }
        next();
    };
};
exports.authorizeRoles = authorizeRoles;
// Middleware pour le Super Admin (JWT séparé)
const protectSuperAdmin = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ message: "Accès non autorisé" });
        }
        const token = authHeader.split(" ")[1];
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        if (decoded.role !== "SUPER_ADMIN") {
            return res.status(403).json({ message: "Réservé au super administrateur" });
        }
        req.user = { ...decoded, shopId: 0 };
        next();
    }
    catch {
        return res.status(401).json({ message: "Token invalide ou expiré" });
    }
};
exports.protectSuperAdmin = protectSuperAdmin;
