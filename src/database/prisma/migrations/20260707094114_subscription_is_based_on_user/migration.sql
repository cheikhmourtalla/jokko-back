/*
  Warnings:

  - Added the required column `phone` to the `shop_owners` table without a default value. This is not possible if the table is not empty.
  - Made the column `phone` on table `shops` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `shopOwnerId` to the `subscriptions` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "shop_owners" ADD COLUMN     "phone" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "shops" ALTER COLUMN "phone" SET NOT NULL;

-- AlterTable
ALTER TABLE "subscriptions" ADD COLUMN     "shopOwnerId" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_shopOwnerId_fkey" FOREIGN KEY ("shopOwnerId") REFERENCES "shop_owners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
