-- AlterEnum
ALTER TYPE "FeatureCode" ADD VALUE 'OUT_OF_STOCK_ALERT';

-- AlterTable
ALTER TABLE "plans" ADD COLUMN     "maxCustomers" INTEGER;
