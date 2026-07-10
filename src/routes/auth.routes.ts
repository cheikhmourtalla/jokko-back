
import { Router } from "express";
import {
  forgotPassword,
  login,
  loginSuperAdmin,
  me,
} from "../controllers/auth.controller";
import { authorizeRoles, protect } from "../middlewares/auth.middleware.js";

const router = Router();
router.post("/login", login);
router.post("/super-admin/login", loginSuperAdmin);
router.post("/forgot-password", forgotPassword);
router.get("/me", protect, authorizeRoles("ADMIN", "EMPLOYEE"), me);


export default router;