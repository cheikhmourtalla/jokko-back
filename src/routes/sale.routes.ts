// ============================================================
//  sale.routes.ts
// ============================================================
import { Router } from "express";
import {
  getSales, getSaleById, createSale,
  addSalePayment, deleteSale,
} from "../controllers/sale.controller";
import { protect, authorizeRoles } from "../middlewares/auth.middleware";

const router = Router();
router.get("/", protect, authorizeRoles("ADMIN", "EMPLOYEE"), getSales);
router.get("/:id", protect, authorizeRoles("ADMIN", "EMPLOYEE"), getSaleById);
router.post("/", protect, authorizeRoles("ADMIN", "EMPLOYEE"), createSale);
router.patch("/:id/payment", protect, authorizeRoles("ADMIN", "EMPLOYEE"), addSalePayment);
router.delete("/:id", protect, authorizeRoles("ADMIN"), deleteSale);
export default router;