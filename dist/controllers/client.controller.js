"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteClient = exports.updateClient = exports.createClient = exports.getClientById = exports.getClients = void 0;
const prisma_1 = require("../config/prisma");
const getClients = async (req, res) => {
    try {
        const shopId = req.user.shopId;
        const clients = await prisma_1.prisma.client.findMany({
            where: { shopId },
            include: { sales: { select: { totalAmount: true, paidAmount: true, remaining: true } } },
            orderBy: { createdAt: "desc" },
        });
        const formatted = clients.map((c) => ({
            ...c,
            totalPurchases: c.sales.reduce((sum, s) => sum + s.totalAmount, 0),
            totalPaid: c.sales.reduce((sum, s) => sum + s.paidAmount, 0),
            totalRemaining: c.sales.reduce((sum, s) => sum + s.remaining, 0),
        }));
        return res.status(200).json(formatted);
    }
    catch (error) {
        return res.status(500).json({ message: "Erreur récupération clients", error });
    }
};
exports.getClients = getClients;
const getClientById = async (req, res) => {
    try {
        const shopId = req.user.shopId;
        const id = Number(req.params.id);
        const client = await prisma_1.prisma.client.findFirst({
            where: { id, shopId },
            include: {
                sales: {
                    include: { items: { include: { product: true } }, payments: true },
                    orderBy: { createdAt: "desc" },
                },
            },
        });
        if (!client)
            return res.status(404).json({ message: "Client introuvable" });
        return res.status(200).json({
            ...client,
            totalPurchases: client.sales.reduce((sum, s) => sum + s.totalAmount, 0),
            totalPaid: client.sales.reduce((sum, s) => sum + s.paidAmount, 0),
            totalRemaining: client.sales.reduce((sum, s) => sum + s.remaining, 0),
        });
    }
    catch (error) {
        return res.status(500).json({ message: "Erreur récupération client", error });
    }
};
exports.getClientById = getClientById;
const createClient = async (req, res) => {
    try {
        const shopId = req.user.shopId;
        const { name, phone, email, address } = req.body;
        if (!name || !phone) {
            return res.status(400).json({ message: "Nom et téléphone obligatoires" });
        }
        const existing = await prisma_1.prisma.client.findFirst({ where: { shopId, phone } });
        if (existing) {
            return res.status(400).json({ message: "Un client avec ce téléphone existe déjà" });
        }
        const client = await prisma_1.prisma.client.create({
            data: { shopId, name, phone, email: email || null, address: address || null },
        });
        return res.status(201).json({ message: "Client créé avec succès", client });
    }
    catch (error) {
        return res.status(500).json({ message: "Erreur création client", error });
    }
};
exports.createClient = createClient;
const updateClient = async (req, res) => {
    try {
        const shopId = req.user.shopId;
        const id = Number(req.params.id);
        const { name, phone, email, address } = req.body;
        const existing = await prisma_1.prisma.client.findFirst({ where: { id, shopId } });
        if (!existing)
            return res.status(404).json({ message: "Client introuvable" });
        if (phone && phone !== existing.phone) {
            const duplicate = await prisma_1.prisma.client.findFirst({ where: { shopId, phone, NOT: { id } } });
            if (duplicate)
                return res.status(400).json({ message: "Ce téléphone est déjà utilisé" });
        }
        const client = await prisma_1.prisma.client.update({
            where: { id },
            data: { name, phone, email: email || null, address: address || null },
        });
        return res.status(200).json({ message: "Client modifié", client });
    }
    catch (error) {
        return res.status(500).json({ message: "Erreur modification client", error });
    }
};
exports.updateClient = updateClient;
const deleteClient = async (req, res) => {
    try {
        const shopId = req.user.shopId;
        const id = Number(req.params.id);
        const existing = await prisma_1.prisma.client.findFirst({
            where: { id, shopId },
            include: { _count: { select: { sales: true } } },
        });
        if (!existing)
            return res.status(404).json({ message: "Client introuvable" });
        if (existing._count.sales > 0) {
            return res.status(400).json({ message: "Impossible de supprimer un client avec des ventes" });
        }
        await prisma_1.prisma.client.delete({ where: { id } });
        return res.status(200).json({ message: "Client supprimé" });
    }
    catch (error) {
        return res.status(500).json({ message: "Erreur suppression client", error });
    }
};
exports.deleteClient = deleteClient;
