import { Response } from "express";
import { prisma } from "../config/prisma";
import { AuthRequest } from "../middlewares/auth.middleware";
import { logger } from "../config/logger";

// ── Store des connexions SSE actives par shop ─────────────────
// Map<shopId, Set<Response>>
const clients = new Map<number, Set<Response>>();

// ── Envoyer un événement à tous les clients d'un shop ─────────
export function sendNotificationToShop(shopId: number, event: string, data: object) {
  const shopClients = clients.get(shopId);
  if (!shopClients || shopClients.size === 0) return;

  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  shopClients.forEach((client) => {
    try {
      client.write(payload);
    } catch {
      shopClients.delete(client);
    }
  });
}

// ── GET /notifications/stream ─────────────────────────────────
// Le frontend se connecte ici pour recevoir les événements SSE
export const streamNotifications = async (req: AuthRequest, res: Response) => {
  const shopId = req.user!.shopId;
  const userId = req.user!.userId;

  // Headers SSE obligatoires
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no"); // Important pour Nginx
  res.flushHeaders();

  // Ajouter ce client à la liste
  if (!clients.has(shopId)) {
    clients.set(shopId, new Set());
  }
  clients.get(shopId)!.add(res);

  logger.info(`📡 SSE connecté — Shop: ${shopId} — User: ${userId} — Clients actifs: ${clients.get(shopId)!.size}`);

  // Envoyer un événement de connexion immédiat
  res.write(`event: connected\ndata: ${JSON.stringify({ message: "Connexion établie", shopId })}\n\n`);

  // Envoyer les alertes stock actuelles dès la connexion
  try {
    const allProducts = await prisma.product.findMany({
      where: { shopId, isActive: true },
      select: { id: true, name: true, quantity: true, alertThreshold: true },
    });

    const lowStock = allProducts.filter(
      (p) => p.quantity > 0 && p.quantity <= p.alertThreshold
    );
    const outOfStock = allProducts.filter((p) => p.quantity === 0);

    if (lowStock.length > 0 || outOfStock.length > 0) {
      res.write(`event: stock_alert\ndata: ${JSON.stringify({
        type: "initial",
        lowStock,
        outOfStock,
        total: lowStock.length + outOfStock.length,
      })}\n\n`);
    }
  } catch (error) {
    logger.error("Erreur envoi alertes initiales SSE", { error });
  }

  // Heartbeat toutes les 30s pour maintenir la connexion
  const heartbeat = setInterval(() => {
    try {
      res.write(`: heartbeat\n\n`);
    } catch {
      clearInterval(heartbeat);
    }
  }, 30000);

  // Nettoyage à la déconnexion du client
  req.on("close", () => {
    clearInterval(heartbeat);
    clients.get(shopId)?.delete(res);
    if (clients.get(shopId)?.size === 0) {
      clients.delete(shopId);
    }
    logger.info(`📡 SSE déconnecté — Shop: ${shopId} — User: ${userId}`);
  });
};

// ── GET /notifications/stock-alerts ──────────────────────────
// Endpoint REST pour récupérer les alertes actuelles (fallback)
export const getStockAlerts = async (req: AuthRequest, res: Response) => {
  try {
    const shopId = req.user!.shopId;

    const products = await prisma.product.findMany({
      where: { shopId, isActive: true },
      select: {
        id: true, name: true, quantity: true,
        alertThreshold: true, category: { select: { name: true } },
      },
    });

    const lowStock = products.filter(
      (p) => p.quantity > 0 && p.quantity <= p.alertThreshold
    );
    const outOfStock = products.filter((p) => p.quantity === 0);

    return res.status(200).json({
      lowStock,
      outOfStock,
      total: lowStock.length + outOfStock.length,
    });
  } catch (error) {
    return res.status(500).json({ message: "Erreur récupération alertes", error });
  }
};