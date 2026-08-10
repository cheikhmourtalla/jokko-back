import "dotenv/config";
import bcrypt from "bcrypt";
import { prisma } from "../config/prisma.js";
import { logger } from "../config/logger.js";

export async function seedAdmin() {
  try {
    const email = "superadmin@jokkobusiness.com";
    const password = "superadmin123"; // Changer après la première connexion !

    const existing = await prisma.superAdmin.findUnique({ where: { email } });

    if (existing) {
      logger.info("✅ Super Admin existe déjà :", email);
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.superAdmin.create({
      data: {
        name: "Super Admin Jokko Business",
        email,
        password: hashedPassword,
      },
    });

    logger.info("✅ Super Admin créé avec succès !");
    logger.info("✅ Email    :", email);
    logger.info("✅ Password :", password);
    logger.info("⚠️  Changez ce mot de passe en production !");
  } catch (e) {
    logger.error(" ❌ Seed admin Error");
  }
}
