import { Router } from "express";
import {
  getProducts, getProductById, createProduct,
  updateProduct, deleteProduct,
  getLowStockProducts, getOutOfStockProducts,
  getSuggestedPrice,
} from "../controllers/product.controller";
import { protect, authorizeRoles } from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/", protect, authorizeRoles("ADMIN", "EMPLOYEE"), getProducts);
router.get("/low-stock", protect, authorizeRoles("ADMIN", "EMPLOYEE"), getLowStockProducts);
router.get("/out-of-stock", protect, authorizeRoles("ADMIN", "EMPLOYEE"), getOutOfStockProducts);
router.get("/:id/price", protect, authorizeRoles("ADMIN", "EMPLOYEE"), getSuggestedPrice);
router.get("/:id", protect, authorizeRoles("ADMIN", "EMPLOYEE"), getProductById);
router.post("/", protect, authorizeRoles("ADMIN"), createProduct);
router.put("/:id", protect, authorizeRoles("ADMIN"), updateProduct);
router.delete("/:id", protect, authorizeRoles("ADMIN"), deleteProduct);

export default router;