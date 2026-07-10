import { Router } from "express";
import { upload, uploadProductImage, deleteProductImage } from "../controllers/upload.controller.js";
import { protect, authorizeRoles } from "../middlewares/auth.middleware.js";

const router = Router();

router.post(
  "/product-image",
  protect,
  authorizeRoles("ADMIN"),
  upload.single("image"),
  uploadProductImage
);

router.delete(
  "/product-image/:filename",
  protect,
  authorizeRoles("ADMIN"),
  deleteProductImage
);

export default router;