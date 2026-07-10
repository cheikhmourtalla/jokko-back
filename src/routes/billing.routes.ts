import { Router } from 'express'
import { billingController } from "../controllers/billing.controller.js";
import { authorizeRoles, protect, protectSuperAdmin } from "../middlewares/auth.middleware.js";

const router = Router();
router.post(
  "/checkout",
  protect,
  // authorizeRoles("ADMIN"), // Partial
  protectSuperAdmin,
  billingController.bilingCheckout,
);

export default router