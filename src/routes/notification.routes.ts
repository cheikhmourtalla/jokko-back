import { Router } from "express";
import { streamNotifications, getStockAlerts } from "../controllers/notification.controller.js";
import { protect, authorizeRoles } from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/stream", protect, authorizeRoles("ADMIN", "EMPLOYEE"), streamNotifications);
router.get("/stock-alerts", protect, authorizeRoles("ADMIN", "EMPLOYEE"), getStockAlerts);

export default router;