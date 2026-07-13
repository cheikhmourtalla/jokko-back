import { Router } from "express";
import {
  SuperAdminShopController
} from "./controllers/super-admin.controller";
import { protectSuperAdmin } from "../../middlewares/auth.middleware.js";

const router = Router();

// router.get("/stats", protectSuperAdmin, getPlatformStats);
router.get("/stats" ,  SuperAdminShopController.getStats);
router.get("/shops",  SuperAdminShopController.listShops);
router.get("/shops/:id",  SuperAdminShopController.getShopDetail);




// router.get("/shops/:id", protectSuperAdmin, getShopDetail);
// router.post("/shops", protectSuperAdmin, createShop);
// router.patch("/shops/:id/status", protectSuperAdmin, updateShopStatus);
// Subscription management
// router.patch("/shops/:shopId/subscription/plan", protectSuperAdmin, updateSubscriptionPlan);
// router.patch("/shops/:shopId/subscription/status", protectSuperAdmin, updateSubscriptionStatus);
// router.patch("/shops/:shopId/subscription/extend", protectSuperAdmin, extendTrialPeriod);
// router.delete("/shops/:id", protectSuperAdmin, deleteShop);

export default router;