-- DropForeignKey
ALTER TABLE "desktop_details" DROP CONSTRAINT "desktop_details_inventoryId_fkey";

-- DropForeignKey
ALTER TABLE "laptop_details" DROP CONSTRAINT "laptop_details_inventoryId_fkey";

-- DropForeignKey
ALTER TABLE "other_details" DROP CONSTRAINT "other_details_inventoryId_fkey";

-- DropForeignKey
ALTER TABLE "printer_details" DROP CONSTRAINT "printer_details_inventoryId_fkey";

-- DropForeignKey
ALTER TABLE "ups_details" DROP CONSTRAINT "ups_details_inventoryId_fkey";

-- AddForeignKey
ALTER TABLE "desktop_details" ADD CONSTRAINT "desktop_details_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "inventory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "laptop_details" ADD CONSTRAINT "laptop_details_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "inventory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "printer_details" ADD CONSTRAINT "printer_details_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "inventory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ups_details" ADD CONSTRAINT "ups_details_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "inventory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "other_details" ADD CONSTRAINT "other_details_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "inventory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
