/*
  Warnings:

  - A unique constraint covering the columns `[name,divisionId]` on the table `departments` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[itItemId,divisionId]` on the table `stocks` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditActionType" ADD VALUE 'DIVISION_CREATED';
ALTER TYPE "AuditActionType" ADD VALUE 'DIVISION_MODIFIED';
ALTER TYPE "AuditActionType" ADD VALUE 'DIVISION_DELETED';

-- DropIndex
DROP INDEX "departments_name_key";

-- AlterTable
ALTER TABLE "Unit" ADD COLUMN     "divisionId" TEXT;

-- AlterTable
ALTER TABLE "departments" ADD COLUMN     "divisionId" TEXT;

-- AlterTable
ALTER TABLE "inventory" ADD COLUMN     "divisionId" TEXT;

-- AlterTable
ALTER TABLE "maintenance_tickets" ADD COLUMN     "divisionId" TEXT;

-- AlterTable
ALTER TABLE "requisitions" ADD COLUMN     "divisionId" TEXT;

-- AlterTable
ALTER TABLE "stock_issued" ADD COLUMN     "divisionId" TEXT;

-- AlterTable
ALTER TABLE "stock_received" ADD COLUMN     "divisionId" TEXT;

-- AlterTable
ALTER TABLE "stocks" ADD COLUMN     "divisionId" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "divisionId" TEXT;

-- CreateTable
CREATE TABLE "divisions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "divisions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "divisions_name_key" ON "divisions"("name");

-- CreateIndex
CREATE UNIQUE INDEX "departments_name_divisionId_key" ON "departments"("name", "divisionId");

-- CreateIndex
CREATE INDEX "inventory_divisionId_idx" ON "inventory"("divisionId");

-- CreateIndex
CREATE INDEX "maintenance_tickets_divisionId_idx" ON "maintenance_tickets"("divisionId");

-- CreateIndex
CREATE INDEX "requisitions_divisionId_idx" ON "requisitions"("divisionId");

-- CreateIndex
CREATE INDEX "stock_issued_divisionId_idx" ON "stock_issued"("divisionId");

-- CreateIndex
CREATE INDEX "stocks_divisionId_idx" ON "stocks"("divisionId");

-- CreateIndex
CREATE UNIQUE INDEX "stocks_itItemId_divisionId_key" ON "stocks"("itItemId", "divisionId");

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_divisionId_fkey" FOREIGN KEY ("divisionId") REFERENCES "divisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Unit" ADD CONSTRAINT "Unit_divisionId_fkey" FOREIGN KEY ("divisionId") REFERENCES "divisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_divisionId_fkey" FOREIGN KEY ("divisionId") REFERENCES "divisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_divisionId_fkey" FOREIGN KEY ("divisionId") REFERENCES "divisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requisitions" ADD CONSTRAINT "requisitions_divisionId_fkey" FOREIGN KEY ("divisionId") REFERENCES "divisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_received" ADD CONSTRAINT "stock_received_divisionId_fkey" FOREIGN KEY ("divisionId") REFERENCES "divisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stocks" ADD CONSTRAINT "stocks_divisionId_fkey" FOREIGN KEY ("divisionId") REFERENCES "divisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_issued" ADD CONSTRAINT "stock_issued_divisionId_fkey" FOREIGN KEY ("divisionId") REFERENCES "divisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_tickets" ADD CONSTRAINT "maintenance_tickets_divisionId_fkey" FOREIGN KEY ("divisionId") REFERENCES "divisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
