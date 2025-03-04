/*
  Warnings:

  - Made the column `performedById` on table `audit_logs` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditActionType" ADD VALUE 'USER_LOGGED_OUT';
ALTER TYPE "AuditActionType" ADD VALUE 'USER_PASSWORD_RESET';

-- DropForeignKey
ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_performedById_fkey";

-- AlterTable
ALTER TABLE "audit_logs" ADD COLUMN     "userAgent" TEXT,
ALTER COLUMN "performedById" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
