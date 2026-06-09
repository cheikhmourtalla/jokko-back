import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";

import { logger, morganStream } from "./config/logger";
import authRoutes from "./routes/auth.routes";
import superAdminRoutes from "./routes/super-admin.routes";
import userRoutes from "./routes/user.routes";
import categoryRoutes from "./routes/category.routes";
import productRoutes from "./routes/product.routes";
import clientRoutes from "./routes/client.routes";
import supplierRoutes from "./routes/supplier.routes";
import stockRoutes from "./routes/stock.routes";
import saleRoutes from "./routes/sale.routes";
import invoiceRoutes from "./routes/invoice.routes";
import cashRoutes from "./routes/cash.routes";
import dashboardRoutes from "./routes/dashboard.routes";
import uploadRoutes from "./routes/upload.routes";
import shopRoutes from "./routes/shop.routes";
import notificationRoutes from "./routes/notification.routes";

const app = express();
const PORT = Number(process.env.PORT) || 5000;

app.use(cors({
  origin: process.env.FRONTEND_URL || "*",
  credentials: true,
}));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev", { stream: morganStream }));
app.use(express.json());

// Helmet sans bloquer les images
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));

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

app.use((req: Request, res: Response) => {
  logger.warn(`404 — Route non trouvée : ${req.method} ${req.originalUrl}`);
  res.status(404).json({ message: `Route non trouvée : ${req.originalUrl}` });
});

app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  logger.error(`Erreur serveur sur ${req.method} ${req.originalUrl}`, {
    error: err.message,
    stack: err.stack,
  });
  res.status(500).json({ message: "Erreur interne du serveur", error: err.message });
});

app.listen(PORT, () => {
  logger.info(`✅ Jokko Business API démarrée sur http://localhost:${PORT}`);
  logger.info(`📁 Uploads servis sur http://localhost:${PORT}/uploads/`);
  logger.info(`🌍 Environnement : ${process.env.NODE_ENV || "development"}`);
});