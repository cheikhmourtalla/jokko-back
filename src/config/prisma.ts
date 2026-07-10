import "dotenv/config";
import { PrismaClient } from "../database/prisma/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { env } from "./env-config";

console.log(env.db.url)


const connectionString = `${env.db.url}`;
export const adapter = new PrismaPg({connectionString})
const prisma = new PrismaClient({ adapter , log: env.mode === "development" ? ["error", "warn"] : ["error"] });

export { prisma };
