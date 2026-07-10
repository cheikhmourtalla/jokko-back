import { Router } from "express";
import { getCategories, createCategory, deleteCategory } from "../controllers/category.controller.js";
import { protect, authorizeRoles } from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/", protect, authorizeRoles("ADMIN", "EMPLOYEE"), getCategories);
router.post("/", protect, authorizeRoles("ADMIN"), createCategory);
router.delete("/:id", protect, authorizeRoles("ADMIN"), deleteCategory);

export default router;