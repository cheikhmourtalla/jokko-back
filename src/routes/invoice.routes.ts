import { Router } from "express";
import { getInvoices, getInvoiceById, addInvoicePayment } from "../controllers/invoice.controller.js";
import { protect, authorizeRoles } from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/", protect, authorizeRoles("ADMIN", "EMPLOYEE"), getInvoices);
router.get("/:id", protect, authorizeRoles("ADMIN", "EMPLOYEE"), getInvoiceById);
router.patch("/:id/payment", protect, authorizeRoles("ADMIN", "EMPLOYEE"), addInvoicePayment);

export default router;