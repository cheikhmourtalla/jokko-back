import { Response } from "express";
import bcrypt from "bcrypt";
import { prisma } from "../config/prisma";
import { AuthRequest } from "../middlewares/auth.middleware";

export const getUsers = async (req: AuthRequest, res: Response) => {
  try {
    const shopId = req.user!.shopId;
    const users = await prisma.user.findMany({
      where: { shopId },
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });
    return res.status(200).json(users);
  } catch (error) {
    return res.status(500).json({ message: "Erreur récupération utilisateurs", error });
  }
};

export const createUser = async (req: AuthRequest, res: Response) => {
  try {
    const shopId = req.user!.shopId;
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Nom, email et mot de passe obligatoires" });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(400).json({ message: "Cet email est déjà utilisé" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
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
  } catch (error) {
    return res.status(500).json({ message: "Erreur création utilisateur", error });
  }
};

export const updateUser = async (req: AuthRequest, res: Response) => {
  try {
    const shopId = req.user!.shopId;
    const id = Number(req.params.id);
    const { name, role, isActive, password } = req.body;

    const existing = await prisma.user.findFirst({ where: { id, shopId } });
    if (!existing) return res.status(404).json({ message: "Utilisateur introuvable" });

    const data: any = {};
    if (name) data.name = name;
    if (role) data.role = role === "ADMIN" ? "ADMIN" : "EMPLOYEE";
    if (isActive !== undefined) data.isActive = Boolean(isActive);
    if (password) data.password = await bcrypt.hash(password, 10);

    const user = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, name: true, email: true, role: true, isActive: true },
    });

    return res.status(200).json({ message: "Utilisateur modifié", user });
  } catch (error) {
    return res.status(500).json({ message: "Erreur modification utilisateur", error });
  }
};

export const deleteUser = async (req: AuthRequest, res: Response) => {
  try {
    const shopId = req.user!.shopId;
    const id = Number(req.params.id);
    const currentUserId = req.user!.userId;

    if (id === currentUserId) {
      return res.status(400).json({ message: "Vous ne pouvez pas supprimer votre propre compte" });
    }

    const existing = await prisma.user.findFirst({ where: { id, shopId } });
    if (!existing) return res.status(404).json({ message: "Utilisateur introuvable" });

    await prisma.user.delete({ where: { id } });
    return res.status(200).json({ message: "Utilisateur supprimé" });
  } catch (error) {
    return res.status(500).json({ message: "Erreur suppression utilisateur", error });
  }
};