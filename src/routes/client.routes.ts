import { Router } from "express";
import {
  getClients, getClientById, createClient, updateClient, deleteClient,
} from "../controllers/client.controller";
import { protect, authorizeRoles } from "../middlewares/auth.middleware.js";

const router = Router();
router.get("/", protect, authorizeRoles("ADMIN", "EMPLOYEE"), getClients);
router.get("/:id", protect, authorizeRoles("ADMIN", "EMPLOYEE"), getClientById);
router.post("/", protect, authorizeRoles("ADMIN", "EMPLOYEE"), createClient);
router.put("/:id", protect, authorizeRoles("ADMIN", "EMPLOYEE"), updateClient);
router.delete("/:id", protect, authorizeRoles("ADMIN"), deleteClient);
export default router;