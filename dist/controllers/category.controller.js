"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCategory = exports.createCategory = exports.getCategories = void 0;
const prisma_1 = require("../config/prisma");
const getCategories = async (req, res) => {
    try {
        const shopId = req.user.shopId;
        const categories = await prisma_1.prisma.category.findMany({
            where: { shopId },
            include: { _count: { select: { products: true } } },
            orderBy: { name: "asc" },
        });
        return res.status(200).json(categories);
    }
    catch (error) {
        return res.status(500).json({ message: "Erreur récupération catégories", error });
    }
};
exports.getCategories = getCategories;
const createCategory = async (req, res) => {
    try {
        const shopId = req.user.shopId;
        const { name } = req.body;
        if (!name)
            return res.status(400).json({ message: "Le nom est obligatoire" });
        const category = await prisma_1.prisma.category.create({ data: { shopId, name } });
        return res.status(201).json({ message: "Catégorie créée", category });
    }
    catch (error) {
        if (error.code === "P2002") {
            return res.status(400).json({ message: "Cette catégorie existe déjà" });
        }
        return res.status(500).json({ message: "Erreur création catégorie", error });
    }
};
exports.createCategory = createCategory;
const deleteCategory = async (req, res) => {
    try {
        const shopId = req.user.shopId;
        const id = Number(req.params.id);
        const existing = await prisma_1.prisma.category.findFirst({ where: { id, shopId } });
        if (!existing)
            return res.status(404).json({ message: "Catégorie introuvable" });
        await prisma_1.prisma.category.delete({ where: { id } });
        return res.status(200).json({ message: "Catégorie supprimée" });
    }
    catch (error) {
        return res.status(500).json({ message: "Erreur suppression catégorie", error });
    }
};
exports.deleteCategory = deleteCategory;
