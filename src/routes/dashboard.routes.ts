import { Router } from "express";
import { getDashboardStats } from "../controllers/dashboard.controller.js";
import { protect, authorizeRoles } from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/stats", protect, authorizeRoles("ADMIN", "EMPLOYEE"), getDashboardStats);

export default router;