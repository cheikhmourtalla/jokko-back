import { Response } from "express";
import { prisma } from "../config/prisma.js";
import { AuthRequest } from "../middlewares/auth.middleware.js";

export const getCategories = async (req: AuthRequest, res: Response) => {
  try {
    const shopId = req.user!.shopId;
    const categories = await prisma.category.findMany({
      where: { shopId },
      include: { _count: { select: { products: true } } },
      orderBy: { name: "asc" },
    });
    return res.status(200).json(categories);
  } catch (error) {
    return res.status(500).json({ message: "Erreur récupération catégories", error });
  }
};

export const createCategory = async (req: AuthRequest, res: Response) => {
  try {
    const shopId = req.user!.shopId;
    const { name } = req.body;

    if (!name) return res.status(400).json({ message: "Le nom est obligatoire" });

    const category = await prisma.category.create({ data: { shopId, name } });
    return res.status(201).json({ message: "Catégorie créée", category });
  } catch (error: any) {
    if (error.code === "P2002") {
      return res.status(400).json({ message: "Cette catégorie existe déjà" });
    }
    return res.status(500).json({ message: "Erreur création catégorie", error });
  }
};

export const deleteCategory = async (req: AuthRequest, res: Response) => {
  try {
    const shopId = req.user!.shopId;
    const id = Number(req.params.id);

    const existing = await prisma.category.findFirst({ where: { id, shopId } });
    if (!existing) return res.status(404).json({ message: "Catégorie introuvable" });

    await prisma.category.delete({ where: { id } });
    return res.status(200).json({ message: "Catégorie supprimée" });
  } catch (error) {
    return res.status(500).json({ message: "Erreur suppression catégorie", error });
  }
};