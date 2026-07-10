import { Router } from "express";
import { createUser, deleteUser, getUsers, updateUser } from "../controllers/user.controller.js";
import { authorizeRoles, protect } from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/", protect, authorizeRoles("ADMIN"), getUsers);
// router.get("/", protect, authorizeRoles("ADMIN"), catchAsync (getUsers));
router.post("/", protect, authorizeRoles("ADMIN"), createUser);
router.put("/:id", protect, authorizeRoles("ADMIN"), updateUser);
router.delete("/:id", protect, authorizeRoles("ADMIN"), deleteUser);

export default router;

//