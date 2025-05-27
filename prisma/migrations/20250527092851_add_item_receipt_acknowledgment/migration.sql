-- CreateTable
CREATE TABLE "item_receipt_acknowledgments" (
    "id" TEXT NOT NULL,
    "stockIssuedId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "acknowledgedAt" TIMESTAMP(3) NOT NULL,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "item_receipt_acknowledgments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "item_receipt_acknowledgments_stockIssuedId_key" ON "item_receipt_acknowledgments"("stockIssuedId");

-- CreateIndex
CREATE INDEX "item_receipt_acknowledgments_stockIssuedId_idx" ON "item_receipt_acknowledgments"("stockIssuedId");

-- CreateIndex
CREATE INDEX "item_receipt_acknowledgments_userId_idx" ON "item_receipt_acknowledgments"("userId");

-- AddForeignKey
ALTER TABLE "item_receipt_acknowledgments" ADD CONSTRAINT "item_receipt_acknowledgments_stockIssuedId_fkey" FOREIGN KEY ("stockIssuedId") REFERENCES "stock_issued"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_receipt_acknowledgments" ADD CONSTRAINT "item_receipt_acknowledgments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
