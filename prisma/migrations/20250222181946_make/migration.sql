/*
  Warnings:

  - A unique constraint covering the columns `[requisitionId,itItemId]` on the table `stock_issued` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "other_details" ALTER COLUMN "inventoryId" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "stock_issued_requisitionId_itItemId_key" ON "stock_issued"("requisitionId", "itItemId");
