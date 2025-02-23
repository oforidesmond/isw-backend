/*
  Warnings:

  - A unique constraint covering the columns `[lpoReference,voucherNumber,itItemId]` on the table `stock_received` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "stock_received_lpoReference_voucherNumber_itItemId_key" ON "stock_received"("lpoReference", "voucherNumber", "itItemId");
