import { prisma } from '../config/prisma.js';
import { AppError, ConflictError } from '../utils/errors.js';
import { PlanChecker } from './plan-checker.service.js';


export type Role = "EMPLOYEE" | "ADMIN"
export const UserService = {
  createUser: async (
    shopOwnerId : number,
    shopId: number,
    name: string,
    email: string,
    password: string,
    role: Role,
  ) => {
    const shopPlan = await PlanChecker.plan(shopId , shopOwnerId);
    const userCount = await prisma.user.count({
      where: { shopId: shopId },
    });

    if (shopPlan.plan.code === "FREE" && userCount >= 1) {
      throw new AppError(
        "Vous avez atteind le nombre d'utilisateur avec le plan gratuit",
        403,
      );
    } else if (
      shopPlan.plan.code === "BASIC" &&
      userCount >= (shopPlan.limits.users ?? 0)
    ) {
      throw new AppError(
        "Vous avez atteind le nombre d'utilisateur avec le plan Basic",
        403,
      );
    }

    const isExistUser = await prisma.user.findUnique({ where: { email } });
    if (isExistUser) throw new ConflictError("Cet email est déjà utilisé");

    const user = await prisma.user.create({
      data: {
        shopId,
        name,
        email,
        password: password,
        role: role === "ADMIN" ? "ADMIN" : "EMPLOYEE",
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });
    return user;
  },

  //============================ To add inclue in th ecreate user (after addin a global error)
  findUser: async (email: string) => {
    return await prisma.user.findUnique({ where: { email } });
  },

  planCheck: async (shopId: number) => {
    const findShop = await prisma.shop.findUnique({
      where: { id: shopId },
      select: { id: true, subscriptions: { select: { plan : {select : {code : true}}} } },
    });

    // check if add user allowed depending on the plan
    const plan = findShop?.subscriptions?.[0]?.plan.code || "FREE";
    const maxUserToCreate = 1;

    if (plan === "FREE" && maxUserToCreate < 1) {
      // throw max user creation limit reached
      throw new Error(
        "Vous avez atteind le nombre d'utilisateur avec le plan gratuit",
      );
    }
    return plan;
  },

  //============================
};