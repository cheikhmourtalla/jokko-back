/*
  Warnings:

  - You are about to drop the column `plan` on the `subscriptions` table. All the data in the column will be lost.
  - The `status` column on the `subscriptions` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Added the required column `planId` to the `subscriptions` table without a default value. This is not possible if the table is not empty.
  - Made the column `userCounts` on table `users` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "FeatureCode" AS ENUM ('ADVANCED_REPORTS', 'TOP_PRODUCTS', 'LOW_STOCK_ALERT', 'STOCK_VALUE', 'SUPPLIER_MANAGEMENT', 'EMPLOYEE_MANAGEMENT', 'ACCOUNTING', 'MULTI_STORE', 'EXPORT_EXCEL', 'EXPORT_PDF', 'API_ACCESS');

-- CreateEnum
CREATE TYPE "PlanType" AS ENUM ('FREE', 'BASIC', 'PRO', 'PREMINIUM');

-- CreateEnum
CREATE TYPE "UsageMetric" AS ENUM ('SALES', 'PRODUCTS', 'USERS');

-- AlterTable
ALTER TABLE "subscriptions" DROP COLUMN "plan",
ADD COLUMN     "planId" INTEGER NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
ALTER COLUMN "endDate" DROP NOT NULL;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "userCounts" SET NOT NULL;

-- DropEnum
DROP TYPE "Plan";

-- CreateTable
CREATE TABLE "plans" (
    "id" SERIAL NOT NULL,
    "code" "PlanType" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "maxSalesPerMonth" INTEGER,
    "maxProducts" INTEGER,
    "maxUsers" INTEGER,
    "maxStores" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "features" (
    "id" SERIAL NOT NULL,
    "code" "FeatureCode" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "features_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan_features" (
    "planId" INTEGER NOT NULL,
    "featureId" INTEGER NOT NULL,

    CONSTRAINT "plan_features_pkey" PRIMARY KEY ("planId","featureId")
);

-- CreateTable
CREATE TABLE "usage_counters" (
    "id" SERIAL NOT NULL,
    "shopId" INTEGER NOT NULL,
    "metric" "UsageMetric" NOT NULL,
    "used" INTEGER NOT NULL DEFAULT 0,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usage_counters_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "plans_code_key" ON "plans"("code");

-- CreateIndex
CREATE UNIQUE INDEX "features_code_key" ON "features"("code");

-- CreateIndex
CREATE UNIQUE INDEX "usage_counters_shopId_metric_key" ON "usage_counters"("shopId", "metric");

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_planId_fkey" FOREIGN KEY ("planId") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_features" ADD CONSTRAINT "plan_features_planId_fkey" FOREIGN KEY ("planId") REFERENCES "plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_features" ADD CONSTRAINT "plan_features_featureId_fkey" FOREIGN KEY ("featureId") REFERENCES "features"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_counters" ADD CONSTRAINT "usage_counters_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE CASCADE;
