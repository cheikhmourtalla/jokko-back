"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const bcrypt_1 = __importDefault(require("bcrypt"));
const prisma_1 = require("../config/prisma");
async function main() {
    const email = "superadmin@jokkobusiness.com";
    const password = "superadmin123"; // Changer après la première connexion !
    const existing = await prisma_1.prisma.superAdmin.findUnique({ where: { email } });
    if (existing) {
        console.log("✅ Super Admin existe déjà :", email);
        return;
    }
    const hashedPassword = await bcrypt_1.default.hash(password, 10);
    await prisma_1.prisma.superAdmin.create({
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
    .finally(() => prisma_1.prisma.$disconnect());
