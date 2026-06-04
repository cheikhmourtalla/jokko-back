"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const path_1 = __importDefault(require("path"));
const logger_1 = require("./config/logger");
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const super_admin_routes_1 = __importDefault(require("./routes/super-admin.routes"));
const user_routes_1 = __importDefault(require("./routes/user.routes"));
const category_routes_1 = __importDefault(require("./routes/category.routes"));
const product_routes_1 = __importDefault(require("./routes/product.routes"));
const client_routes_1 = __importDefault(require("./routes/client.routes"));
const supplier_routes_1 = __importDefault(require("./routes/supplier.routes"));
const stock_routes_1 = __importDefault(require("./routes/stock.routes"));
const sale_routes_1 = __importDefault(require("./routes/sale.routes"));
const invoice_routes_1 = __importDefault(require("./routes/invoice.routes"));
const cash_routes_1 = __importDefault(require("./routes/cash.routes"));
const dashboard_routes_1 = __importDefault(require("./routes/dashboard.routes"));
const upload_routes_1 = __importDefault(require("./routes/upload.routes"));
const shop_routes_1 = __importDefault(require("./routes/shop.routes"));
const notification_routes_1 = __importDefault(require("./routes/notification.routes"));
const app = (0, express_1.default)();
const PORT = Number(process.env.PORT) || 5000;
app.use(cors());
app.use((0, morgan_1.default)(process.env.NODE_ENV === "production" ? "combined" : "dev", { stream: logger_1.morganStream }));
app.use(express_1.default.json());
// Helmet sans bloquer les images
app.use((0, helmet_1.default)({
    crossOriginResourcePolicy: { policy: "cross-origin" },
}));
// ── Servir les fichiers uploadés statiquement ────────────────
app.use("/uploads", express_1.default.static(path_1.default.join(process.cwd(), "uploads")));
app.get("/", (_req, res) => {
    res.json({ message: "Jokko Business API v1.0", status: "running" });
});
app.use("/api/auth", auth_routes_1.default);
app.use("/api/super-admin", super_admin_routes_1.default);
app.use("/api/users", user_routes_1.default);
app.use("/api/categories", category_routes_1.default);
app.use("/api/products", product_routes_1.default);
app.use("/api/clients", client_routes_1.default);
app.use("/api/suppliers", supplier_routes_1.default);
app.use("/api/stock", stock_routes_1.default);
app.use("/api/sales", sale_routes_1.default);
app.use("/api/invoices", invoice_routes_1.default);
app.use("/api/cash", cash_routes_1.default);
app.use("/api/dashboard", dashboard_routes_1.default);
app.use("/api/upload", upload_routes_1.default);
app.use("/api/shop", shop_routes_1.default);
app.use("/api/notifications", notification_routes_1.default);
app.use((req, res) => {
    logger_1.logger.warn(`404 — Route non trouvée : ${req.method} ${req.originalUrl}`);
    res.status(404).json({ message: `Route non trouvée : ${req.originalUrl}` });
});
app.use((err, req, res, _next) => {
    logger_1.logger.error(`Erreur serveur sur ${req.method} ${req.originalUrl}`, {
        error: err.message,
        stack: err.stack,
    });
    res.status(500).json({ message: "Erreur interne du serveur", error: err.message });
});
app.listen(PORT, () => {
    logger_1.logger.info(`✅ Jokko Business API démarrée sur http://localhost:${PORT}`);
    logger_1.logger.info(`📁 Uploads servis sur http://localhost:${PORT}/uploads/`);
    logger_1.logger.info(`🌍 Environnement : ${process.env.NODE_ENV || "development"}`);
});
