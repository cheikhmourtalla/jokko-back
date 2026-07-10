import { Router } from "express";
import {
  getShops, createShop, updateShopStatus,
  resetShopPassword, deleteShop,
} from "../controllers/super-admin.controller";
import { protectSuperAdmin } from "../middlewares/auth.middleware";

const router = Router();

router.get("/shops", protectSuperAdmin, getShops);
router.post("/shops", protectSuperAdmin, createShop);
router.patch("/shops/:id/status", protectSuperAdmin, updateShopStatus);
router.patch("/shops/:id/reset-password", protectSuperAdmin, resetShopPassword);
router.delete("/shops/:id", protectSuperAdmin, deleteShop);

export default router;