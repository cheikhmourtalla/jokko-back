import { Router } from "express";
import {
  openCash, closeCash, getCurrentCash,
  getCashHistory, getCashById, addTransaction,
} from "../controllers/cash.controller";
import { protect, authorizeRoles } from "../middlewares/auth.middleware";

const router = Router();

router.get("/current", protect, authorizeRoles("ADMIN", "EMPLOYEE"), getCurrentCash);
router.get("/history", protect, authorizeRoles("ADMIN", "EMPLOYEE"), getCashHistory);
router.get("/:id", protect, authorizeRoles("ADMIN", "EMPLOYEE"), getCashById);
router.post("/open", protect, authorizeRoles("ADMIN", "EMPLOYEE"), openCash);
router.patch("/:id/close", protect, authorizeRoles("ADMIN", "EMPLOYEE"), closeCash);
router.post("/transactions", protect, authorizeRoles("ADMIN", "EMPLOYEE"), addTransaction);

export default router;