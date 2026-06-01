
import { Router } from "express";
import { login, loginSuperAdmin, forgotPassword } from "../controllers/auth.controller";

const router = Router();
router.post("/login", login);
router.post("/super-admin/login", loginSuperAdmin);
router.post("/forgot-password", forgotPassword);
export default router;