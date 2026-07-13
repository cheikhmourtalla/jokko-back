import { Router } from "express";
import {
  getShops, createShop, updateShopStatus,
  resetShopPassword, deleteShop, getPlatformStats, getShopDetail,
  updateSubscriptionPlan, updateSubscriptionStatus, extendTrialPeriod
} from "./controllers/super-admin.controller";
import { protectSuperAdmin } from "../../middlewares/auth.middleware.js";

const router = Router();

router.get("/shops", protectSuperAdmin, getShops);
// Platform stats for super-admin
// Shop detail
// router.get("/stats", getPlatformStats);
router.get("/stats", protectSuperAdmin, getPlatformStats);
router.get("/shops/:id", protectSuperAdmin, getShopDetail);
router.post("/shops", protectSuperAdmin, createShop);
router.patch("/shops/:id/status", protectSuperAdmin, updateShopStatus);
router.patch("/shops/:id/reset-password", protectSuperAdmin, resetShopPassword);
// Subscription management
router.patch("/shops/:shopId/subscription/plan", protectSuperAdmin, updateSubscriptionPlan);
router.patch("/shops/:shopId/subscription/status", protectSuperAdmin, updateSubscriptionStatus);
router.patch("/shops/:shopId/subscription/extend", protectSuperAdmin, extendTrialPeriod);
router.delete("/shops/:id", protectSuperAdmin, deleteShop);

export default router;