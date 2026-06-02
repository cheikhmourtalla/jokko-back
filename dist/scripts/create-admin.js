"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const bcrypt_1 = __importDefault(require("bcrypt"));
const prisma_1 = require("../config/prisma");
async function main() {
    const users = [
        {
            name: "Admin SamaStock",
            email: "admin@samastock.com",
            password: "admin123",
            role: "admin",
        },
        {
            name: "Employé SamaStock",
            email: "employee@samastock.com",
            password: "employee123",
            role: "employee",
        },
    ];
    for (const userData of users) {
        const existingUser = await prisma_1.prisma.user.findUnique({
            where: { email: userData.email },
        });
        if (existingUser) {
            console.log(`${userData.role} existe déjà : ${userData.email}`);
            continue;
        }
        const hashedPassword = await bcrypt_1.default.hash(userData.password, 10);
        await prisma_1.prisma.user.create({
            data: {
                name: userData.name,
                email: userData.email,
                password: hashedPassword,
                role: userData.role,
            },
        });
        console.log(`${userData.role} créé : ${userData.email}`);
    }
}
main()
    .catch((error) => {
    console.error("Erreur création utilisateurs :", error);
})
    .finally(async () => {
    await prisma_1.prisma.$disconnect();
});
