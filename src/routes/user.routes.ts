import { Router } from "express";
import { getUsers, createUser, updateUser, deleteUser } from "../controllers/user.controller";
import { protect, authorizeRoles } from "../middlewares/auth.middleware";

const router = Router();

router.get("/", protect, authorizeRoles("ADMIN"), getUsers);
router.post("/", protect, authorizeRoles("ADMIN"), createUser);
router.put("/:id", protect, authorizeRoles("ADMIN"), updateUser);
router.delete("/:id", protect, authorizeRoles("ADMIN"), deleteUser);

export default router;

//