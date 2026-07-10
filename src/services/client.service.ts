import { prisma } from "../config/prisma";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from "../utils/errors";
import { PlanChecker } from "./plan-checker.service";

export const ClientService = {
  createClient: async (
    shopOwnerId: number,
    shopId: number,
    phone: string,
    email: string,
    name: string,
    address: string,
  ) => {
    const existing = await prisma.client.findFirst({
      where: {
        shopId,
        OR: [{ phone }, ...(email ? [{ email }] : [])],
      },
    });

    if (existing) {
      throw new BadRequestError(
        "Un client avec ce numéro de téléphone ou cet email existe déjà",
      );
    }

    const shop = await PlanChecker.plan(shopId , shopOwnerId);

    if (!shop) {
      throw new NotFoundError("Boutique introuvable");
    }

    if (shop?.plan.code == "FREE") {
      const maxCustomers = shop.limits.customers ?? 50;

      const customerCount = await prisma.client.count({
        where: { shopId },
      });

      if (customerCount >= maxCustomers) {
        throw new ForbiddenError(
          "Vous avez atteint la limite maximale de 50 clients pour le plan gratuit. Passez au Plan Basic pour un carnet illimité.",
        );
      }
    }

    const customer = await prisma.client.create({
      data: {
        shopId,
        name,
        phone,
        email: email || null,
        address: address || null,
      },
    });

    return customer;
  },
};
