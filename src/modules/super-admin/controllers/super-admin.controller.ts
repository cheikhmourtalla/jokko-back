import bcrypt from "bcrypt";
import { Request, Response } from "express";
import { logger } from "../../../config/logger.js";
import { prisma } from "../../../config/prisma.js";
import { ShopService } from "../../../services/shop.service.js";
import { SubscriptionManagementService } from "../services/subscription-management.service.js";
import { logAuditAction, getAuditActor } from "../utils/audit-logger.js";
import { AuthRequest } from "../../../middlewares/auth.middleware.js";

// ── Liste de toutes les boutiques (avec pagination, recherche, filtres) ──
export const getShops = async (req: Request, res: Response) => {
  try {
    // Query params
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const search = (req.query.q as string) || "";
    const status = (req.query.status as string) || undefined; // e.g., ACTIVE,SUSPENDED,EXPIRED
    const plan = (req.query.plan as string) || undefined; // e.g., FREE,BASIC,PRO,PREMIUM

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { ownerName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (plan) {
      // Filter shops that have (at least one) subscription with the requested plan.
      // Note: this matches any subscription record for the shop — if you want to
      // filter by the latest subscription only, tell me and I will refine.
      where.subscriptions = { some: { plan: { code: plan } } };
    }

    const skip = (page - 1) * limit;

    const [total, shops] = await Promise.all([
      prisma.shop.count({ where }),
      prisma.shop.findMany({
        where,
        include: {
          subscriptions: { orderBy: { createdAt: "desc" }, take: 1 },
          _count: { select: { users: true, products: true, sales: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return res.status(200).json({
      meta: { total, totalPages, page, limit },
      data: shops,
    });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "Erreur récupération boutiques", error });
  }
};

// ── Créer une boutique + admin ────────────────────────────────
export const createShop = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const {
      shopName,
      ownerName,
      email,
      phone,
      address,
      adminPassword,
      currentShop,
      planType,
      onwnerId,
    } = req.body;

    if (!shopName || !ownerName || !email || !adminPassword || !planType) {
      return res.status(400).json({ message: "Champs obligatoires manquants" });
    }

    const existingShop = await ShopService.find(email);
    if (existingShop && currentShop === "PRIMARY") {
      return res
        .status(400)
        .json({ message: "Une boutique avec cet email existe déjà" });
    }

    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    const shop = await ShopService.createShop(
      shopName,
      ownerName,
      email,
      phone,
      address,
      hashedPassword,
      planType,
      onwnerId,
      currentShop,
    );

    logger.info(`🏪 Nouvelle boutique créée — "${shopName}" — Email: ${email}`);

    // Log audit
    const actor = getAuditActor(authReq);
    await logAuditAction({
      ...actor,
      action: "CREATE_SHOP",
      targetType: "Shop",
      targetId: (shop as any).id,
      details: { shopName, email, planType },
    });

    return res
      .status(201)
      .json({ message: "Boutique créée avec succès", shop });
  } catch (error) {
    return res.status(500).json({ message: "Erreur création boutique", error });
  }
};

// ── Modifier le statut d'une boutique ────────────────────────
export const updateShopStatus = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const id = Number(req.params.id);
    const { status } = req.body;

    if (!["ACTIVE", "SUSPENDED", "EXPIRED"].includes(status)) {
      return res.status(400).json({ message: "Statut invalide" });
    }

    const shop = await prisma.shop.update({ where: { id }, data: { status } });
    logger.warn(
      `🔄 Statut boutique modifié — ID: ${id} — Nouveau statut: ${status}`,
    );

    // Log audit
    const actor = getAuditActor(authReq);
    await logAuditAction({
      ...actor,
      action: "UPDATE_SHOP_STATUS",
      targetType: "Shop",
      targetId: id,
      details: { newStatus: status },
    });

    return res.status(200).json({ message: "Statut mis à jour", shop });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Erreur mise à jour statut", error });
  }
};

// ── Réinitialiser le mot de passe admin d'une boutique ───────
export const resetShopPassword = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const id = Number(req.params.id);
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res
        .status(400)
        .json({ message: "Mot de passe trop court (6 caractères min)" });
    }

    const shop = await prisma.shop.findUnique({ where: { id } });
    if (!shop) return res.status(404).json({ message: "Boutique introuvable" });

    const adminUser = await prisma.user.findFirst({
      where: { shopId: id, role: "ADMIN" },
    });

    if (!adminUser) {
      return res
        .status(404)
        .json({ message: "Administrateur de la boutique introuvable" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: adminUser.id },
      data: { password: hashedPassword },
    });

    // Log audit
    const actor = getAuditActor(authReq);
    await logAuditAction({
      ...actor,
      action: "RESET_SHOP_PASSWORD",
      targetType: "Shop",
      targetId: id,
      details: { userId: adminUser.id },
    });

    return res
      .status(200)
      .json({ message: "Mot de passe réinitialisé avec succès" });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Erreur réinitialisation mot de passe", error });
  }
};

// ── Supprimer une boutique ────────────────────────────────────
export const deleteShop = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const id = Number(req.params.id);
    await prisma.shop.delete({ where: { id } });
    logger.warn(`🗑️ Boutique supprimée — ID: ${id}`);

    // Log audit
    const actor = getAuditActor(authReq);
    await logAuditAction({
      ...actor,
      action: "DELETE_SHOP",
      targetType: "Shop",
      targetId: id,
      details: {},
    });

    return res.status(200).json({ message: "Boutique supprimée" });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Erreur suppression boutique", error });
  }
};

// ── Détail d'une boutique — Super Admin ───────────────────────
export const getShopDetail = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: "ID invalide" });

    const shop = await prisma.shop.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        ownerName: true,
        email: true,
        phone: true,
        address: true,
        logoUrl: true,
        status: true,
        currentShop: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!shop) return res.status(404).json({ message: "Boutique introuvable" });

    // counts
    const [productsCount, salesCount, clientsCount, usersCount] = await Promise.all([
      prisma.product.count({ where: { shopId: id } }),
      prisma.sale.count({ where: { shopId: id } }),
      prisma.client.count({ where: { shopId: id } }),
      prisma.user.count({ where: { shopId: id } }),
    ]);

    // recent 30 days sales total
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const salesSum = await prisma.sale.aggregate({
      where: { shopId: id, createdAt: { gte: thirtyDaysAgo } },
      _sum: { totalAmount: true },
    });

    // last 10 subscriptions
    const subscriptionsHistory = await prisma.subscription.findMany({
      where: { shopId: id },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { plan: { select: { code: true, name: true, price: true } } },
    });

    // owners
    const owners = await prisma.shopOwner.findMany({ where: { shopId: id }, select: { id: true, userId: true, phone: true } });

    return res.status(200).json({
      shop,
      counts: { productsCount, salesCount, clientsCount, usersCount },
      recentStats: { salesLast30Days: salesSum._sum?.totalAmount || 0 },
      subscriptionsHistory,
      owners,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erreur récupération détail boutique", error });
  }
};

// ── Statistiques globales plateforme (Super Admin) ────────────
export const getPlatformStats = async (_req: Request, res: Response) => {
  try {
    // Total shops
    const totalShops = await prisma.shop.count();

    // Shops by status
    const shopsByStatusGroup = await prisma.shop.groupBy({
      by: ["status"],
      _count: { _all: true },
    });
    const shopsByStatus: Record<string, number> = {};
    shopsByStatusGroup.forEach((g: any) => {
      shopsByStatus[g.status] = g._count._all;
    });

    // Recent shops
    const recentShops = await prisma.shop.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, name: true, email: true, createdAt: true, status: true },
    });

    // Recent subscriptions (with plan & shop)
    const recentSubscriptions = await prisma.subscription.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        plan: { select: { code: true, name: true, price: true } },
        shop: { select: { id: true, name: true, email: true } },
      },
    });

    // Subscriptions group by status and by plan (plan code)
    const subsGroup = await prisma.subscription.groupBy({
      by: ["status", "planId"],
      _count: { _all: true },
    });

    // Fetch involved plans to map ids to codes
    const planIds = Array.from(new Set(subsGroup.map((s: any) => s.planId)));
    const plans =
      planIds.length > 0
        ? await prisma.plan.findMany({ where: { id: { in: planIds } } })
        : [];
    const planById: Record<number, any> = {};
    plans.forEach((p) => (planById[p.id] = p));

    const subscriptionsByStatus: Record<string, number> = {};
    const subscriptionsByPlan: Record<string, number> = {};

    subsGroup.forEach((g: any) => {
      const status = g.status;
      subscriptionsByStatus[status] = (subscriptionsByStatus[status] || 0) + g._count._all;

      const plan = planById[g.planId];
      const planCode = plan ? plan.code : String(g.planId);
      subscriptionsByPlan[planCode] = (subscriptionsByPlan[planCode] || 0) + g._count._all;
    });

    // MRR estimate: sum of plan.price for ACTIVE subscriptions (excluding FREE)
    const activeSubs = await prisma.subscription.findMany({
      where: { status: "ACTIVE" },
      include: { plan: { select: { code: true, price: true } } },
    });

    const mrr = activeSubs.reduce((acc, s) => {
      if (!s.plan || s.plan.code === "FREE") return acc;
      return acc + (s.plan.price || 0);
    }, 0);

    return res.status(200).json({
      totalShops,
      shopsByStatus,
      subscriptionsByStatus,
      subscriptionsByPlan,
      mrr,
      recentShops,
      recentSubscriptions,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erreur récupération stats", error });
  }
};

// ── Gestion des abonnements (Super Admin) ──────────────────────

// Changer le plan d'une boutique
export const updateSubscriptionPlan = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const shopId = Number(req.params.shopId);
    const { planCode, paymentReference } = req.body;

    if (!shopId || !planCode) {
      return res.status(400).json({ message: "shopId et planCode obligatoires" });
    }

    const result = await SubscriptionManagementService.changePlan(
      shopId,
      planCode,
      paymentReference,
    );

    logger.info(
      `🔄 Plan d'abonnement changé — Shop ID: ${shopId} — Nouveau plan: ${planCode}`,
    );

    // Log audit
    const actor = getAuditActor(authReq);
    await logAuditAction({
      ...actor,
      action: "UPDATE_SUBSCRIPTION_PLAN",
      targetType: "Subscription",
      targetId: result.subscription.id,
      details: { shopId, newPlan: planCode, paymentId: result.payment?.id },
    });

    return res.status(200).json({
      message: "Plan changé avec succès",
      subscription: result.subscription,
      payment: result.payment,
    });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "Erreur changement plan", error });
  }
};

// Modifier le statut d'un abonnement
export const updateSubscriptionStatus = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const shopId = Number(req.params.shopId);
    const { status } = req.body;

    if (!shopId || !status) {
      return res.status(400).json({ message: "shopId et status obligatoires" });
    }

    const updated = await SubscriptionManagementService.updateStatus(shopId, status);

    logger.info(
      `🔄 Statut abonnement modifié — Shop ID: ${shopId} — Nouveau statut: ${status}`,
    );

    // Log audit
    const actor = getAuditActor(authReq);
    await logAuditAction({
      ...actor,
      action: "UPDATE_SUBSCRIPTION_STATUS",
      targetType: "Subscription",
      targetId: updated.id,
      details: { shopId, newStatus: status },
    });

    return res.status(200).json({
      message: "Statut abonnement mis à jour",
      subscription: updated,
    });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "Erreur mise à jour statut abonnement", error });
  }
};

// Prolonger la période d'essai ou d'abonnement
export const extendTrialPeriod = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const shopId = Number(req.params.shopId);
    const { daysToAdd } = req.body;

    if (!shopId || daysToAdd === undefined) {
      return res.status(400).json({ message: "shopId et daysToAdd obligatoires" });
    }

    const updated = await SubscriptionManagementService.extendPeriod(shopId, daysToAdd);

    logger.info(
      `⏰ Période d'abonnement prolongée — Shop ID: ${shopId} — +${daysToAdd} jours`,
    );

    // Log audit
    const actor = getAuditActor(authReq);
    await logAuditAction({
      ...actor,
      action: "EXTEND_SUBSCRIPTION_PERIOD",
      targetType: "Subscription",
      targetId: updated.id,
      details: { shopId, daysAdded: daysToAdd, newEndDate: updated.endDate },
    });

    return res.status(200).json({
      message: "Période prolongée avec succès",
      subscription: updated,
    });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "Erreur prolongation période", error });
  }
};

