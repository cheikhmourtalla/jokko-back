import { Router } from "express";
import { addStockEntry, addStockOut, getStockMovements } from "../controllers/stock.controller.js";
import { protect, authorizeRoles } from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/movements", protect, authorizeRoles("ADMIN", "EMPLOYEE"), getStockMovements);
router.post("/entry", protect, authorizeRoles("ADMIN", "EMPLOYEE"), addStockEntry);
router.post("/out", protect, authorizeRoles("ADMIN", "EMPLOYEE"), addStockOut);

export default router;