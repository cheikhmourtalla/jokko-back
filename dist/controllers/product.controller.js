"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSuggestedPrice = exports.getOutOfStockProducts = exports.getLowStockProducts = exports.deleteProduct = exports.updateProduct = exports.createProduct = exports.getProductById = exports.getProducts = void 0;
exports.computePrice = computePrice;
const prisma_1 = require("../config/prisma");
const getProducts = async (req, res) => {
    try {
        const shopId = req.user.shopId;
        const search = typeof req.query.search === "string" ? req.query.search : "";
        const categoryId = req.query.categoryId ? Number(req.query.categoryId) : undefined;
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        const where = { shopId, isActive: true };
        if (search)
            where.name = { contains: search };
        if (categoryId)
            where.categoryId = categoryId;
        const [total, products] = await Promise.all([
            prisma_1.prisma.product.count({ where }),
            prisma_1.prisma.product.findMany({
                where,
                include: { category: true },
                orderBy: { createdAt: "desc" },
                skip,
                take: limit,
            }),
        ]);
        return res.status(200).json({
            data: products,
            pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
        });
    }
    catch (error) {
        return res.status(500).json({ message: "Erreur récupération produits", error });
    }
};
exports.getProducts = getProducts;
const getProductById = async (req, res) => {
    try {
        const shopId = req.user.shopId;
        const id = Number(req.params.id);
        const product = await prisma_1.prisma.product.findFirst({
            where: { id, shopId },
            include: { category: true },
        });
        if (!product)
            return res.status(404).json({ message: "Produit introuvable" });
        return res.status(200).json(product);
    }
    catch (error) {
        return res.status(500).json({ message: "Erreur récupération produit", error });
    }
};
exports.getProductById = getProductById;
const createProduct = async (req, res) => {
    try {
        const shopId = req.user.shopId;
        const { name, description, reference, categoryId, quantity, purchasePrice, salePrice, alertThreshold, imageUrl, semiWholesalePrice, semiWholesaleMinQty, wholesalePrice, wholesaleMinQty, } = req.body;
        if (!name || purchasePrice == null || salePrice == null) {
            return res.status(400).json({ message: "Nom, prix d'achat et prix de vente sont obligatoires" });
        }
        const product = await prisma_1.prisma.product.create({
            data: {
                shopId,
                name,
                description: description || null,
                reference: reference || null,
                categoryId: categoryId ? Number(categoryId) : null,
                quantity: 0, // TOUJOURS 0 — le stock est géré uniquement par addStockEntry
                purchasePrice: Number(purchasePrice),
                salePrice: Number(salePrice),
                alertThreshold: alertThreshold ?? 5,
                imageUrl: imageUrl || null,
                semiWholesalePrice: semiWholesalePrice ? Number(semiWholesalePrice) : null,
                semiWholesaleMinQty: semiWholesaleMinQty ? Number(semiWholesaleMinQty) : null,
                wholesalePrice: wholesalePrice ? Number(wholesalePrice) : null,
                wholesaleMinQty: wholesaleMinQty ? Number(wholesaleMinQty) : null,
            },
            include: { category: true },
        });
        return res.status(201).json({ message: "Produit créé avec succès", product });
    }
    catch (error) {
        return res.status(500).json({ message: "Erreur création produit", error });
    }
};
exports.createProduct = createProduct;
const updateProduct = async (req, res) => {
    try {
        const shopId = req.user.shopId;
        const id = Number(req.params.id);
        const existing = await prisma_1.prisma.product.findFirst({ where: { id, shopId } });
        if (!existing)
            return res.status(404).json({ message: "Produit introuvable" });
        const { name, description, reference, categoryId, purchasePrice, salePrice, alertThreshold, imageUrl, semiWholesalePrice, semiWholesaleMinQty, wholesalePrice, wholesaleMinQty, } = req.body;
        const updated = await prisma_1.prisma.product.update({
            where: { id },
            data: {
                name: name ?? existing.name,
                description: description !== undefined ? description : existing.description,
                reference: reference !== undefined ? reference : existing.reference,
                categoryId: categoryId !== undefined ? (categoryId ? Number(categoryId) : null) : existing.categoryId,
                purchasePrice: purchasePrice !== undefined ? Number(purchasePrice) : existing.purchasePrice,
                salePrice: salePrice !== undefined ? Number(salePrice) : existing.salePrice,
                alertThreshold: alertThreshold !== undefined ? Number(alertThreshold) : existing.alertThreshold,
                imageUrl: imageUrl !== undefined ? imageUrl : existing.imageUrl,
                semiWholesalePrice: semiWholesalePrice !== undefined ? (semiWholesalePrice ? Number(semiWholesalePrice) : null) : existing.semiWholesalePrice,
                semiWholesaleMinQty: semiWholesaleMinQty !== undefined ? (semiWholesaleMinQty ? Number(semiWholesaleMinQty) : null) : existing.semiWholesaleMinQty,
                wholesalePrice: wholesalePrice !== undefined ? (wholesalePrice ? Number(wholesalePrice) : null) : existing.wholesalePrice,
                wholesaleMinQty: wholesaleMinQty !== undefined ? (wholesaleMinQty ? Number(wholesaleMinQty) : null) : existing.wholesaleMinQty,
            },
            include: { category: true },
        });
        return res.status(200).json({ message: "Produit modifié avec succès", product: updated });
    }
    catch (error) {
        return res.status(500).json({ message: "Erreur modification produit", error });
    }
};
exports.updateProduct = updateProduct;
const deleteProduct = async (req, res) => {
    try {
        const shopId = req.user.shopId;
        const id = Number(req.params.id);
        const existing = await prisma_1.prisma.product.findFirst({ where: { id, shopId } });
        if (!existing)
            return res.status(404).json({ message: "Produit introuvable" });
        // Soft delete pour préserver l'historique
        await prisma_1.prisma.product.update({ where: { id }, data: { isActive: false } });
        return res.status(200).json({ message: "Produit supprimé avec succès" });
    }
    catch (error) {
        return res.status(500).json({ message: "Erreur suppression produit", error });
    }
};
exports.deleteProduct = deleteProduct;
const getLowStockProducts = async (req, res) => {
    try {
        const shopId = req.user.shopId;
        const products = await prisma_1.prisma.product.findMany({
            where: { shopId, isActive: true, quantity: { gt: 0 } },
            include: { category: true },
        });
        const lowStock = products.filter((p) => p.quantity <= p.alertThreshold);
        return res.status(200).json(lowStock);
    }
    catch (error) {
        return res.status(500).json({ message: "Erreur produits stock faible", error });
    }
};
exports.getLowStockProducts = getLowStockProducts;
const getOutOfStockProducts = async (req, res) => {
    try {
        const shopId = req.user.shopId;
        const products = await prisma_1.prisma.product.findMany({
            where: { shopId, isActive: true, quantity: 0 },
            include: { category: true },
            orderBy: { updatedAt: "desc" },
        });
        return res.status(200).json(products);
    }
    catch (error) {
        return res.status(500).json({ message: "Erreur produits en rupture", error });
    }
};
exports.getOutOfStockProducts = getOutOfStockProducts;
// ── GET /products/:id/price?quantity=X ───────────────────────
// Retourne le prix suggéré selon la quantité et les niveaux tarifaires
const getSuggestedPrice = async (req, res) => {
    try {
        const shopId = req.user.shopId;
        const id = Number(req.params.id);
        const quantity = Number(req.query.quantity) || 1;
        const product = await prisma_1.prisma.product.findFirst({
            where: { id, shopId },
            select: {
                salePrice: true,
                semiWholesalePrice: true,
                semiWholesaleMinQty: true,
                wholesalePrice: true,
                wholesaleMinQty: true,
            },
        });
        if (!product)
            return res.status(404).json({ message: "Produit introuvable" });
        const suggested = computePrice(product, quantity);
        return res.status(200).json({
            quantity,
            suggestedPrice: suggested.price,
            tier: suggested.tier,
            tiers: {
                detail: { price: product.salePrice, label: "Détail" },
                semiWholesale: product.semiWholesalePrice ? {
                    price: product.semiWholesalePrice,
                    minQty: product.semiWholesaleMinQty,
                    label: "Demi-gros",
                } : null,
                wholesale: product.wholesalePrice ? {
                    price: product.wholesalePrice,
                    minQty: product.wholesaleMinQty,
                    label: "Gros",
                } : null,
            },
        });
    }
    catch (error) {
        return res.status(500).json({ message: "Erreur calcul prix", error });
    }
};
exports.getSuggestedPrice = getSuggestedPrice;
// Helper — calcule le prix selon la quantité
function computePrice(product, quantity) {
    // Gros (priorité la plus haute)
    if (product.wholesalePrice &&
        product.wholesaleMinQty &&
        quantity >= product.wholesaleMinQty) {
        return { price: product.wholesalePrice, tier: "wholesale" };
    }
    // Demi-gros
    if (product.semiWholesalePrice &&
        product.semiWholesaleMinQty &&
        quantity >= product.semiWholesaleMinQty) {
        return { price: product.semiWholesalePrice, tier: "semiWholesale" };
    }
    // Détail (par défaut)
    return { price: product.salePrice, tier: "detail" };
}
