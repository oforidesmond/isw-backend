/*
  Warnings:

  - The values [DIVISION_CREATED,DIVISION_MODIFIED,DIVISION_DELETED] on the enum `AuditActionType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `divisionId` on the `Unit` table. All the data in the column will be lost.
  - You are about to drop the column `divisionId` on the `departments` table. All the data in the column will be lost.
  - You are about to drop the column `divisionId` on the `inventory` table. All the data in the column will be lost.
  - You are about to drop the column `divisionId` on the `maintenance_tickets` table. All the data in the column will be lost.
  - You are about to drop the column `divisionId` on the `requisitions` table. All the data in the column will be lost.
  - You are about to drop the column `divisionId` on the `stock_issued` table. All the data in the column will be lost.
  - You are about to drop the column `divisionId` on the `stock_received` table. All the data in the column will be lost.
  - You are about to drop the column `divisionId` on the `stocks` table. All the data in the column will be lost.
  - You are about to drop the column `divisionId` on the `users` table. All the data in the column will be lost.
  - You are about to drop the `divisions` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "public"."AuditActionType_new" AS ENUM ('USER_SIGNED_UP', 'USER_SIGNED_IN', 'USER_LOGGED_OUT', 'USER_PASSWORD_RESET', 'ROLE_ASSIGNED', 'ROLE_MODIFIED', 'ROLE_REVOKED', 'ROLE_CREATED', 'ROLE_DELETED', 'PERMISSION_ASSIGNED', 'PERMISSION_REVOKED', 'PERMISSION_DELETED', 'REQUISITION_SUBMITTED', 'REQUISITION_DEPT_APPROVED', 'REQUISITION_DEPT_DECLINED', 'REQUISITION_ITD_APPROVED', 'REQUISITION_ITD_DECLINED', 'REQUISITION_PROCESSED', 'ITEM_RECEIPT_ACKNOWLEDGED', 'INVENTORY_CREATED', 'INVENTORY_UPDATED', 'INVENTORY_STATUS_CHANGED', 'INVENTORY_DISPOSED', 'LAPTOP_DETAILS_UPDATED', 'DESKTOP_DETAILS_UPDATED', 'PRINTER_DETAILS_UPDATED', 'UPS_DETAILS_UPDATED', 'OTHER_DETAILS_UPDATED', 'MAINTENANCE_TICKET_CREATED', 'MAINTENANCE_TICKET_UPDATED', 'MAINTENANCE_TICKET_RESOLVED', 'STOCK_RECEIVED', 'STOCK_ISSUED', 'STOCK_ADJUSTED', 'STOCK_MODIFIED', 'STOCK_DELETED', 'IT_ITEM_CREATED', 'IT_ITEM_MODIFIED', 'IT_ITEM_DELETED', 'SUPPLIER_CREATED', 'SUPPLIER_UPDATED', 'SUPPLIER_DELETED', 'USER_DELETED', 'USER_RESTORED', 'USER_UPDATED', 'USER_STATUS_CHANGED', 'ITEM_DELETED', 'DEPARTMENT_CREATED', 'DEPARTMENT_MODIFIED', 'DEPARTMENT_DELETED', 'UNIT_CREATED', 'UNIT_MODIFIED', 'UNIT_DELETED');
ALTER TABLE "public"."audit_logs" ALTER COLUMN "actionType" TYPE "public"."AuditActionType_new" USING ("actionType"::text::"public"."AuditActionType_new");
ALTER TYPE "public"."AuditActionType" RENAME TO "AuditActionType_old";
ALTER TYPE "public"."AuditActionType_new" RENAME TO "AuditActionType";
DROP TYPE "public"."AuditActionType_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "public"."Unit" DROP CONSTRAINT "Unit_divisionId_fkey";

-- DropForeignKey
ALTER TABLE "public"."departments" DROP CONSTRAINT "departments_divisionId_fkey";

-- DropForeignKey
ALTER TABLE "public"."inventory" DROP CONSTRAINT "inventory_divisionId_fkey";

-- DropForeignKey
ALTER TABLE "public"."maintenance_tickets" DROP CONSTRAINT "maintenance_tickets_divisionId_fkey";

-- DropForeignKey
ALTER TABLE "public"."requisitions" DROP CONSTRAINT "requisitions_divisionId_fkey";

-- DropForeignKey
ALTER TABLE "public"."stock_issued" DROP CONSTRAINT "stock_issued_divisionId_fkey";

-- DropForeignKey
ALTER TABLE "public"."stock_received" DROP CONSTRAINT "stock_received_divisionId_fkey";

-- DropForeignKey
ALTER TABLE "public"."stocks" DROP CONSTRAINT "stocks_divisionId_fkey";

-- DropForeignKey
ALTER TABLE "public"."users" DROP CONSTRAINT "users_divisionId_fkey";

-- DropIndex
DROP INDEX "public"."departments_name_divisionId_key";

-- DropIndex
DROP INDEX "public"."inventory_divisionId_idx";

-- DropIndex
DROP INDEX "public"."maintenance_tickets_divisionId_idx";

-- DropIndex
DROP INDEX "public"."requisitions_divisionId_idx";

-- DropIndex
DROP INDEX "public"."stock_issued_divisionId_idx";

-- DropIndex
DROP INDEX "public"."stocks_divisionId_idx";

-- DropIndex
DROP INDEX "public"."stocks_itItemId_divisionId_key";

-- AlterTable
ALTER TABLE "public"."Unit" DROP COLUMN "divisionId";

-- AlterTable
ALTER TABLE "public"."departments" DROP COLUMN "divisionId";

-- AlterTable
ALTER TABLE "public"."inventory" DROP COLUMN "divisionId";

-- AlterTable
ALTER TABLE "public"."maintenance_tickets" DROP COLUMN "divisionId";

-- AlterTable
ALTER TABLE "public"."requisitions" DROP COLUMN "divisionId";

-- AlterTable
ALTER TABLE "public"."stock_issued" DROP COLUMN "divisionId";

-- AlterTable
ALTER TABLE "public"."stock_received" DROP COLUMN "divisionId";

-- AlterTable
ALTER TABLE "public"."stocks" DROP COLUMN "divisionId";

-- AlterTable
ALTER TABLE "public"."users" DROP COLUMN "divisionId";

-- DropTable
DROP TABLE "public"."divisions";
