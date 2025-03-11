-- DropForeignKey
ALTER TABLE "requisitions" DROP CONSTRAINT "requisition_staff_fkey";

-- AddForeignKey
ALTER TABLE "requisitions" ADD CONSTRAINT "requisition_staff_fkey" FOREIGN KEY ("staffId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
