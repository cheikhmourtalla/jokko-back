import { Router } from 'express'
import { billingController } from "../controllers/billing.controller";
import { authorizeRoles, protect, protectSuperAdmin } from "../middlewares/auth.middleware";

const router = Router();
router.post(
  "/checkout",
  protect,
  // authorizeRoles("ADMIN"), // Partial
  protectSuperAdmin,
  billingController.bilingCheckout,
);

export default router