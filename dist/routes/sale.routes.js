"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// ============================================================
//  sale.routes.ts
// ============================================================
const express_1 = require("express");
const sale_controller_1 = require("../controllers/sale.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = (0, express_1.Router)();
router.get("/", auth_middleware_1.protect, (0, auth_middleware_1.authorizeRoles)("ADMIN", "EMPLOYEE"), sale_controller_1.getSales);
router.get("/:id", auth_middleware_1.protect, (0, auth_middleware_1.authorizeRoles)("ADMIN", "EMPLOYEE"), sale_controller_1.getSaleById);
router.post("/", auth_middleware_1.protect, (0, auth_middleware_1.authorizeRoles)("ADMIN", "EMPLOYEE"), sale_controller_1.createSale);
router.patch("/:id/payment", auth_middleware_1.protect, (0, auth_middleware_1.authorizeRoles)("ADMIN", "EMPLOYEE"), sale_controller_1.addSalePayment);
router.delete("/:id", auth_middleware_1.protect, (0, auth_middleware_1.authorizeRoles)("ADMIN"), sale_controller_1.deleteSale);
exports.default = router;
