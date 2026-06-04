"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const dashboard_controller_1 = require("../controllers/dashboard.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = (0, express_1.Router)();
router.get("/stats", auth_middleware_1.protect, (0, auth_middleware_1.authorizeRoles)("ADMIN", "EMPLOYEE"), dashboard_controller_1.getDashboardStats);
exports.default = router;
