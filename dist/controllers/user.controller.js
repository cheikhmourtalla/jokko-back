"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteUser = exports.updateUser = exports.createUser = exports.getUsers = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const prisma_1 = require("../config/prisma");
const getUsers = async (req, res) => {
    try {
        const shopId = req.user.shopId;
        const users = await prisma_1.prisma.user.findMany({
            where: { shopId },
            select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
            orderBy: { createdAt: "desc" },
        });
        return res.status(200).json(users);
    }
    catch (error) {
        return res.status(500).json({ message: "Erreur récupération utilisateurs", error });
    }
};
exports.getUsers = getUsers;
const createUser = async (req, res) => {
    try {
        const shopId = req.user.shopId;
        const { name, email, password, role } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ message: "Nom, email et mot de passe obligatoires" });
        }
        const existing = await prisma_1.prisma.user.findUnique({ where: { email } });
        if (existing)
            return res.status(400).json({ message: "Cet email est déjà utilisé" });
        const hashedPassword = await bcrypt_1.default.hash(password, 10);
        const user = await prisma_1.prisma.user.create({
            data: {
                shopId,
                name,
                email,
                password: hashedPassword,
                role: role === "ADMIN" ? "ADMIN" : "EMPLOYEE",
            },
            select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
        });
        return res.status(201).json({ message: "Utilisateur créé", user });
    }
    catch (error) {
        return res.status(500).json({ message: "Erreur création utilisateur", error });
    }
};
exports.createUser = createUser;
const updateUser = async (req, res) => {
    try {
        const shopId = req.user.shopId;
        const id = Number(req.params.id);
        const { name, role, isActive, password } = req.body;
        const existing = await prisma_1.prisma.user.findFirst({ where: { id, shopId } });
        if (!existing)
            return res.status(404).json({ message: "Utilisateur introuvable" });
        const data = {};
        if (name)
            data.name = name;
        if (role)
            data.role = role === "ADMIN" ? "ADMIN" : "EMPLOYEE";
        if (isActive !== undefined)
            data.isActive = Boolean(isActive);
        if (password)
            data.password = await bcrypt_1.default.hash(password, 10);
        const user = await prisma_1.prisma.user.update({
            where: { id },
            data,
            select: { id: true, name: true, email: true, role: true, isActive: true },
        });
        return res.status(200).json({ message: "Utilisateur modifié", user });
    }
    catch (error) {
        return res.status(500).json({ message: "Erreur modification utilisateur", error });
    }
};
exports.updateUser = updateUser;
const deleteUser = async (req, res) => {
    try {
        const shopId = req.user.shopId;
        const id = Number(req.params.id);
        const currentUserId = req.user.userId;
        if (id === currentUserId) {
            return res.status(400).json({ message: "Vous ne pouvez pas supprimer votre propre compte" });
        }
        const existing = await prisma_1.prisma.user.findFirst({ where: { id, shopId } });
        if (!existing)
            return res.status(404).json({ message: "Utilisateur introuvable" });
        await prisma_1.prisma.user.delete({ where: { id } });
        return res.status(200).json({ message: "Utilisateur supprimé" });
    }
    catch (error) {
        return res.status(500).json({ message: "Erreur suppression utilisateur", error });
    }
};
exports.deleteUser = deleteUser;
