import { NextFunction, Request, Response } from "express";
import { BillingService } from "../services/billing.service.js";
import { AuthRequest } from "../middlewares/auth.middleware.js";

export const billingController = {
  bilingCheckout: async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const billingOptions = req.body;
      const result = await BillingService.checkout(billingOptions);
      return res.status(200).json(result);
    } catch (e) {
      console.log(e);
      next(e);
    }
  },
};
