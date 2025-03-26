/*
  Warnings:

  - The values [REQUISITION_APPROVED,REQUISITION_DECLINED] on the enum `AuditActionType` will be removed. If these variants are still used in the database, this will fail.
  - The values [SUBMITTED,APPROVED,DECLINED] on the enum `RequisitionStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "AuditActionType_new" AS ENUM ('USER_SIGNED_UP', 'USER_SIGNED_IN', 'USER_LOGGED_OUT', 'USER_PASSWORD_RESET', 'ROLE_ASSIGNED', 'ROLE_MODIFIED', 'ROLE_REVOKED', 'ROLE_CREATED', 'ROLE_DELETED', 'PERMISSION_ASSIGNED', 'PERMISSION_REVOKED', 'REQUISITION_SUBMITTED', 'REQUISITION_DEPT_APPROVED', 'REQUISITION_DEPT_DECLINED', 'REQUISITION_ITD_APPROVED', 'REQUISITION_ITD_DECLINED', 'REQUISITION_PROCESSED', 'INVENTORY_CREATED', 'INVENTORY_UPDATED', 'INVENTORY_STATUS_CHANGED', 'INVENTORY_DISPOSED', 'MAINTENANCE_TICKET_CREATED', 'MAINTENANCE_TICKET_UPDATED', 'MAINTENANCE_TICKET_RESOLVED', 'STOCK_RECEIVED', 'STOCK_ISSUED', 'STOCK_ADJUSTED', 'SUPPLIER_CREATED', 'SUPPLIER_UPDATED', 'SUPPLIER_DELETED', 'USER_DELETED', 'USER_RESTORED', 'USER_UPDATED', 'USER_STATUS_CHANGED', 'ITEM_DELETED');
ALTER TABLE "audit_logs" ALTER COLUMN "actionType" TYPE "AuditActionType_new" USING ("actionType"::text::"AuditActionType_new");
ALTER TYPE "AuditActionType" RENAME TO "AuditActionType_old";
ALTER TYPE "AuditActionType_new" RENAME TO "AuditActionType";
DROP TYPE "AuditActionType_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "RequisitionStatus_new" AS ENUM ('PENDING_DEPT_APPROVAL', 'PENDING_ITD_APPROVAL', 'DEPT_APPROVED', 'ITD_APPROVED', 'DEPT_DECLINED', 'ITD_DECLINED', 'PROCESSED');
ALTER TABLE "requisitions" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "requisitions" ALTER COLUMN "status" TYPE "RequisitionStatus_new" USING ("status"::text::"RequisitionStatus_new");
ALTER TYPE "RequisitionStatus" RENAME TO "RequisitionStatus_old";
ALTER TYPE "RequisitionStatus_new" RENAME TO "RequisitionStatus";
DROP TYPE "RequisitionStatus_old";
ALTER TABLE "requisitions" ALTER COLUMN "status" SET DEFAULT 'PENDING_DEPT_APPROVAL';
COMMIT;

-- AlterTable
ALTER TABLE "requisitions" ADD COLUMN     "issuedAt" TIMESTAMP(3),
ADD COLUMN     "issuedById" TEXT,
ALTER COLUMN "status" SET DEFAULT 'PENDING_DEPT_APPROVAL';

-- AddForeignKey
ALTER TABLE "requisitions" ADD CONSTRAINT "requisitions_issuedById_fkey" FOREIGN KEY ("issuedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
