-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditActionType" ADD VALUE 'DEPARTMENT_CREATED';
ALTER TYPE "AuditActionType" ADD VALUE 'DEPARTMENT_MODIFIED';
ALTER TYPE "AuditActionType" ADD VALUE 'DEPARTMENT_DELETED';
ALTER TYPE "AuditActionType" ADD VALUE 'UNIT_CREATED';
ALTER TYPE "AuditActionType" ADD VALUE 'UNIT_MODIFIED';
ALTER TYPE "AuditActionType" ADD VALUE 'UNIT_DELETED';
