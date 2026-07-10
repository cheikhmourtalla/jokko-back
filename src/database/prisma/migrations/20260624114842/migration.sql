/*
  Warnings:

  - The values [PREMINIUM] on the enum `PlanType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "PlanType_new" AS ENUM ('FREE', 'BASIC', 'PRO', 'PREMIUM');
ALTER TABLE "plans" ALTER COLUMN "code" TYPE "PlanType_new" USING ("code"::text::"PlanType_new");
ALTER TYPE "PlanType" RENAME TO "PlanType_old";
ALTER TYPE "PlanType_new" RENAME TO "PlanType";
DROP TYPE "public"."PlanType_old";
COMMIT;
