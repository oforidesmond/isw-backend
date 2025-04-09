-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditActionType" ADD VALUE 'LAPTOP_DETAILS_UPDATED';
ALTER TYPE "AuditActionType" ADD VALUE 'DESKTOP_DETAILS_UPDATED';
ALTER TYPE "AuditActionType" ADD VALUE 'PRINTER_DETAILS_UPDATED';
ALTER TYPE "AuditActionType" ADD VALUE 'UPS_DETAILS_UPDATED';
ALTER TYPE "AuditActionType" ADD VALUE 'OTHER_DETAILS_UPDATED';
