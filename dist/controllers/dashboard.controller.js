"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDashboardStats = void 0;
const prisma_1 = require("../config/prisma");
const getDashboardStats = async (req, res) => {
    try {
        const shopId = req.user.shopId;
        const [totalProducts, allProducts, totalClients, totalSuppliers, salesData, unpaidSales, supplierDebts, cashRegister,] = await Promise.all([
            prisma_1.prisma.product.count({ where: { shopId, isActive: true } }),
            prisma_1.prisma.product.findMany({
                where: { shopId, isActive: true },
                select: { quantity: true, alertThreshold: true, purchasePrice: true },
            }),
            prisma_1.prisma.client.count({ where: { shopId } }),
            prisma_1.prisma.supplier.count({ where: { shopId } }),
            prisma_1.prisma.sale.findMany({
                where: { shopId },
                select: { totalAmount: true, paidAmount: true, remaining: true, createdAt: true },
            }),
            prisma_1.prisma.sale.findMany({
                where: { shopId, status: { in: ["UNPAID", "PARTIAL"] } },
                select: { remaining: true },
            }),
            prisma_1.prisma.supplierDebt.findMany({
                where: { supplier: { shopId }, status: { in: ["UNPAID", "PARTIAL"] } },
                select: { remaining: true },
            }),
            prisma_1.prisma.cashRegister.findFirst({
                where: { shopId, status: "OPEN" },
            }),
        ]);
        const lowStockProducts = allProducts.filter((p) => p.quantity > 0 && p.quantity <= p.alertThreshold).length;
        const outOfStockProducts = allProducts.filter((p) => p.quantity === 0).length;
        const stockValue = allProducts.reduce((total, p) => total + p.quantity * p.purchasePrice, 0);
        const totalSalesAmount = salesData.reduce((sum, s) => sum + s.totalAmount, 0);
        const totalPaidAmount = salesData.reduce((sum, s) => sum + s.paidAmount, 0);
        const totalClientDebt = unpaidSales.reduce((sum, s) => sum + s.remaining, 0);
        const totalSupplierDebt = supplierDebts.reduce((sum, d) => sum + d.remaining, 0);
        // Ventes des 7 derniers jours
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const recentSales = salesData.filter((s) => new Date(s.createdAt) >= sevenDaysAgo);
        const recentSalesAmount = recentSales.reduce((sum, s) => sum + s.totalAmount, 0);
        // Produits les plus vendus (top 5)
        const topProducts = await prisma_1.prisma.saleItem.groupBy({
            by: ["productId", "productName"],
            where: { sale: { shopId } },
            _sum: { quantity: true, totalAmount: true },
            orderBy: { _sum: { quantity: "desc" } },
            take: 5,
        });
        const currentBalance = cashRegister
            ? cashRegister.openingAmount + cashRegister.totalIn - cashRegister.totalOut
            : null;
        return res.status(200).json({
            // Produits
            totalProducts,
            lowStockProducts,
            outOfStockProducts,
            stockValue,
            // Ventes
            totalSales: salesData.length,
            totalSalesAmount,
            totalPaidAmount,
            totalClientDebt,
            recentSalesAmount,
            // Clients & Fournisseurs
            totalClients,
            totalSuppliers,
            totalSupplierDebt,
            // Caisse
            cashOpen: cashRegister?.status === "OPEN",
            currentBalance,
            // Top produits
            topProducts: topProducts.map((p) => ({
                productId: p.productId,
                productName: p.productName,
                totalQuantity: p._sum.quantity,
                totalAmount: p._sum.totalAmount,
            })),
        });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Erreur récupération statistiques", error });
    }
};
exports.getDashboardStats = getDashboardStats;
