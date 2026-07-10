import { NextFunction, Response } from "express";
import { AuthRequest } from "../middlewares/auth.middleware.js";
import { SubscriptionService } from "../services/subscription.service.js";
import { NotFoundError } from "../utils/errors.js";

export const SubscriptionController = {
  getCurrentSubs: async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const user = req?.user;

      if (!user) {
        throw new NotFoundError("Shop not found");
      }

      const subscription = await SubscriptionService.currentSubscription(
        user.shopId,
        user.ownerId,
      );

      return res.status(200).json({ message: "Subscription", subscription });
    } catch (e) {
      console.error("Error while getting subscription");
      next(e)
    }
  },
};
