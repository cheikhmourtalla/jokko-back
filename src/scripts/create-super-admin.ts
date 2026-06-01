import "dotenv/config";
import bcrypt from "bcrypt";
import { prisma } from "../config/prisma";

async function main() {
  const email = "superadmin@jokkobusiness.com";
  const password = "superadmin123"; // Changer après la première connexion !

  const existing = await prisma.superAdmin.findUnique({ where: { email } });

  if (existing) {
    console.log("✅ Super Admin existe déjà :", email);
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

  console.log("✅ Super Admin créé avec succès !");
  console.log("   Email    :", email);
  console.log("   Password :", password);
  console.log("   ⚠️  Changez ce mot de passe en production !");
}

main()
  .catch((error) => {
    console.error("❌ Erreur :", error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());