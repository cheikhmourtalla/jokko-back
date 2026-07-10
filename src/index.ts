import cors from "cors";
import express, { Request, Response } from "express";
// import 'express-async-errors';
import helmet from "helmet";
import morgan from "morgan";
import path from "path";
import { env } from "./config/env-config";
import { logger, morganStream } from "./config/logger";
import { ErrorHandler } from "./middlewares/error-handler.middleware";
import authRoutes from "./routes/auth.routes";
import billingRoute from "./routes/billing.routes.js";
import cashRoutes from "./routes/cash.routes";
import categoryRoutes from "./routes/category.routes";
import clientRoutes from "./routes/client.routes";
import dashboardRoutes from "./routes/dashboard.routes";
import invoiceRoutes from "./routes/invoice.routes";
import notificationRoutes from "./routes/notification.routes";
import productRoutes from "./routes/product.routes";
import saleRoutes from "./routes/sale.routes";
import shopRoutes from "./routes/shop.routes";
import stockRoutes from "./routes/stock.routes";
import subscription from "./routes/subscription.routes.js";
import superAdminRoutes from "./routes/super-admin.routes";
import supplierRoutes from "./routes/supplier.routes";
import uploadRoutes from "./routes/upload.routes";
import userRoutes from "./routes/user.routes";

const app = express();
// const PORT = Number(env.PORT) || 5000;

app.use(express.json());
app.use(
  cors({
    origin: env.frontendUrl || "*",
    // origin: "*",
    credentials: true,
  }),
);
app.use(
  morgan(env.mode === "production" ? "combined" : "dev", {
    stream: morganStream,
  }),
);
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);

// ── Servir les fichiers uploadés statiquement ────────────────
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.get("/", (_req: Request, res: Response) => {
  res.json({ message: "Jokko Business API v1.0", status: "running" });
});

app.use("/api/auth", authRoutes);
app.use("/api/super-admin", superAdminRoutes);
app.use("/api/users", userRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/products", productRoutes);
app.use("/api/clients", clientRoutes);
app.use("/api/suppliers", supplierRoutes);
app.use("/api/stock", stockRoutes);
app.use("/api/sales", saleRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/cash", cashRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/shop", shopRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/subscription", subscription);
app.use("/api/billing", billingRoute);

app.use((req: Request, res: Response) => {
  logger.warn(`404 — Route non trouvée : ${req.method} ${req.originalUrl}`);
  res.status(404).json({ message: `Route non trouvée : ${req.originalUrl}` });
});

// Global Error handler
app.use(ErrorHandler);

app.listen(env.port, () => {
  logger.info(`✅ Jokko Business API démarrée sur ${env.server}:${env.port}`);
  logger.info(`📁 Uploads servis sur ${env.server}:${env.port}/uploads/`);
  logger.info(`🌍 Environnement : ${env.mode}`);
});
