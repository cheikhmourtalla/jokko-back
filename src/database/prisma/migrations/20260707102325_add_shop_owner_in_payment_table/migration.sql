/*
  Warnings:

  - You are about to drop the column `shopId` on the `payments` table. All the data in the column will be lost.
  - Added the required column `shopOwnerId` to the `payments` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "payments" DROP CONSTRAINT "payments_shopId_fkey";

-- AlterTable
ALTER TABLE "payments" DROP COLUMN "shopId",
ADD COLUMN     "shopOwnerId" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_shopOwnerId_fkey" FOREIGN KEY ("shopOwnerId") REFERENCES "shop_owners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
