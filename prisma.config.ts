import "dotenv/config";
import { defineConfig } from "prisma/config";
import { env } from "./src/config/env-config.js";
export default defineConfig({
  schema: "./src/database/prisma/schema.prisma",
  migrations: {
    path: "./src/database/prisma/migrations/",
  },
  datasource: {
    url: env.db.url,
  },
});
