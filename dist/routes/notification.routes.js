"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const notification_controller_1 = require("../controllers/notification.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = (0, express_1.Router)();
router.get("/stream", auth_middleware_1.protect, (0, auth_middleware_1.authorizeRoles)("ADMIN", "EMPLOYEE"), notification_controller_1.streamNotifications);
router.get("/stock-alerts", auth_middleware_1.protect, (0, auth_middleware_1.authorizeRoles)("ADMIN", "EMPLOYEE"), notification_controller_1.getStockAlerts);
exports.default = router;
