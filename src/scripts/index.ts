import { prisma } from "../config/prisma.js";
import { seedAdmin } from "./create-super-admin.js";
import { seedDb } from "./seed-db.js";

const main = async () => {
  await Promise.all([await seedAdmin(), await seedDb()]);
};

main()
  .catch((error) => {
    console.error("❌ Erreur Seed  :", error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

// .finally(() => prisma.$disconnect());
