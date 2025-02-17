-- DropForeignKey
ALTER TABLE "requisitions" DROP CONSTRAINT "requisition_itItem_fkey";

-- AlterTable
ALTER TABLE "it_items" ALTER COLUMN "defaultWarranty" DROP NOT NULL;

-- AlterTable
ALTER TABLE "maintenance_tickets" ALTER COLUMN "receivedAt" SET DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "unit" DROP NOT NULL,
ALTER COLUMN "roomNo" DROP NOT NULL;

-- AlterTable
ALTER TABLE "requisitions" ALTER COLUMN "itItemId" DROP NOT NULL,
ALTER COLUMN "urgency" DROP NOT NULL,
ALTER COLUMN "unit" DROP NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'SUBMITTED';

-- AddForeignKey
ALTER TABLE "requisitions" ADD CONSTRAINT "requisition_itItem_fkey" FOREIGN KEY ("itItemId") REFERENCES "it_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
