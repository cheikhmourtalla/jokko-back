import { Router } from "express";
import {
  getShopSettings, updateShopSettings,
  uploadShopLogo, deleteShopLogo, uploadLogo,
} from "../controllers/shop.controller";
import { protect, authorizeRoles } from "../middlewares/auth.middleware";

const router = Router();

router.get("/settings", protect, authorizeRoles("ADMIN", "EMPLOYEE"), getShopSettings);
router.put("/settings", protect, authorizeRoles("ADMIN"), updateShopSettings);
router.post("/logo", protect, authorizeRoles("ADMIN"), uploadLogo.single("logo"), uploadShopLogo);
router.delete("/logo", protect, authorizeRoles("ADMIN"), deleteShopLogo);

export default router;