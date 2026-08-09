import dotenv from "dotenv";
import { defineConfig } from "prisma/config";
import { env } from "./src/config/env-config.js";
dotenv.config();

export default defineConfig({
  schema: "./src/database/prisma/schema.prisma",
  migrations: {
    path: "./src/database/prisma/migrations/",
  },
  datasource: {
    url: env.db.url,
    shadowDatabaseUrl: env.db.directUrl,
  },
});
