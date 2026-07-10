import { prisma } from "../config/prisma";
import { NotFoundError } from "../utils/errors";

export const AuthService = {
  getMe: async (userId: number, shopId: number) => {
    const user = await prisma.user.findUnique({
      where: {
        id: userId,
        AND: {
          shopId: shopId,
        },
      },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundError("not found");
    }

    // console.log(user);
    const shop = await prisma.shop.findUnique({
      where: { id: shopId },
      include: {
        subscriptions: {
          include: {
            plan: {
              include: {
                planFeature: {
                  include: {
                    feature: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return shop;
  },
};
