import { Router } from "express";
import {
  createSecondShop,
  createShop,
  deleteShopLogo,
  getShops,
  getShopSettings,
  switchShop,
  updateShopSettings,
  uploadShopLogo,
} from "../controllers/shop.controller.js";
import { authorizeRoles, protect } from "../middlewares/auth.middleware.js";
import { upload } from "../config/storage.config.js";

const router = Router();

// publuc route , anyone can create shop
router.post("/", createShop);

router.post(
  "/create-second-shop",
  protect,
  authorizeRoles("ADMIN"),
  createSecondShop,
);
router.get("/", protect, authorizeRoles("ADMIN", "EMPLOYEE"), getShops);
router.post("/switch", protect, authorizeRoles("ADMIN"), switchShop);
router.get(
  "/settings",
  protect,
  authorizeRoles("ADMIN", "EMPLOYEE"),
  getShopSettings,
);
router.put("/settings", protect, authorizeRoles("ADMIN"), updateShopSettings);
router.post(
  "/logo",
  protect,
  authorizeRoles("ADMIN"),
  upload.single("logo"),
  uploadShopLogo,
);
router.delete("/logo", protect, authorizeRoles("ADMIN"), deleteShopLogo);

export default router;
