import { NextFunction, Response } from "express";
import { prisma } from "../config/prisma.js";
import { AuthRequest } from "../middlewares/auth.middleware.js";
import { ClientService } from "../services/client.service.js";
import { BadRequestError, ForbiddenError, NotFoundError } from "../utils/errors.js";

export const getClients = async (req: AuthRequest, res: Response) => {
  try {

    const shopId = req.user!.shopId;
    const plan = req.user!.planType;

    const customerCount =
      plan === "FREE"
        ? await prisma.client.count({
            where: { shopId },
          })
        : null;

    const clients = await prisma.client.findMany({
      where: { shopId },
      include: {
        sales: {
          select: { totalAmount: true, paidAmount: true, remaining: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const formatted = clients.map((c) => ({
      ...c,
      totalPurchases: c.sales.reduce((sum, s) => sum + s.totalAmount, 0),
      totalPaid: c.sales.reduce((sum, s) => sum + s.paidAmount, 0),
      totalRemaining: c.sales.reduce((sum, s) => sum + s.remaining, 0),
    }));

    return res.status(200).json({ data: formatted, customerCount });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Erreur récupération clients", error });
  }
};

export const getClientById = async (req: AuthRequest, res: Response) => {
  try {
    const shopId = req.user!.shopId;
    const id = Number(req.params.id);

    const client = await prisma.client.findFirst({
      where: { id, shopId },
      include: {
        sales: {
          include: { items: { include: { product: true } }, payments: true },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!client) return res.status(404).json({ message: "Client introuvable" });

    return res.status(200).json({
      ...client,
      totalPurchases: client.sales.reduce((sum, s) => sum + s.totalAmount, 0),
      totalPaid: client.sales.reduce((sum, s) => sum + s.paidAmount, 0),
      totalRemaining: client.sales.reduce((sum, s) => sum + s.remaining, 0),
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Erreur récupération client", error });
  }
};

export const createClient = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const user = req.user;

    const { name, phone, email, address } = req.body;

    if (!name || !phone) {
      throw new BadRequestError("Nom , email et téléphone obligatoires");
    }

    if(!user){
      throw new ForbiddenError('Token invalide ou  à éxpiré')
    }


    const client =  await ClientService.createClient(user?.ownerId, user.shopId, phone, email, name, address)

    return res.status(201).json({ message: "Client créé avec succès", client });
  } catch (e) {
    next(e);
  }
};

export const updateClient = async (req: AuthRequest, res: Response) => {
  try {
    const shopId = req.user!.shopId;
    const id = Number(req.params.id);
    const { name, phone, email, address } = req.body;

    const existing = await prisma.client.findFirst({ where: { id, shopId } });
    if (!existing)
      return res.status(404).json({ message: "Client introuvable" });

    if (phone && phone !== existing.phone) {
      const duplicate = await prisma.client.findFirst({
        where: { shopId, phone, NOT: { id } },
      });
      if (duplicate)
        return res
          .status(400)
          .json({ message: "Ce téléphone est déjà utilisé" });
    }

    const client = await prisma.client.update({
      where: { id },
      data: { name, phone, email: email || null, address: address || null },
    });

    return res.status(200).json({ message: "Client modifié", client });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Erreur modification client", error });
  }
};

export const deleteClient = async (req: AuthRequest, res: Response) => {
  try {
    const shopId = req.user!.shopId;
    const id = Number(req.params.id);

    const existing = await prisma.client.findFirst({
      where: { id, shopId },
      include: { _count: { select: { sales: true } } },
    });

    if (!existing)
      return res.status(404).json({ message: "Client introuvable" });
    if (existing._count.sales > 0) {
      return res
        .status(400)
        .json({ message: "Impossible de supprimer un client avec des ventes" });
    }

    await prisma.client.delete({ where: { id } });
    return res.status(200).json({ message: "Client supprimé" });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Erreur suppression client", error });
  }
};
