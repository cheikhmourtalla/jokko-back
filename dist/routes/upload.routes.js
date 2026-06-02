"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const upload_controller_1 = require("../controllers/upload.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = (0, express_1.Router)();
router.post("/product-image", auth_middleware_1.protect, (0, auth_middleware_1.authorizeRoles)("ADMIN"), upload_controller_1.upload.single("image"), upload_controller_1.uploadProductImage);
router.delete("/product-image/:filename", auth_middleware_1.protect, (0, auth_middleware_1.authorizeRoles)("ADMIN"), upload_controller_1.deleteProductImage);
exports.default = router;
