-- CreateEnum
CREATE TYPE "CurrentShopType" AS ENUM ('PRIMARY', 'SECONDARY');

-- AlterTable
ALTER TABLE "shops" ADD COLUMN     "currentShop" "CurrentShopType" NOT NULL DEFAULT 'PRIMARY';
