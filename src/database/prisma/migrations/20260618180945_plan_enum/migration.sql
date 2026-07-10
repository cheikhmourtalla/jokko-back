/*
  Warnings:

  - The `plan` column on the `subscriptions` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('FREE', 'BASIC', 'PRO', 'PREMINIUM');

-- AlterTable
ALTER TABLE "subscriptions" DROP COLUMN "plan",
ADD COLUMN     "plan" "Plan" NOT NULL DEFAULT 'BASIC';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "userCounts" INTEGER NOT NULL DEFAULT 0;
