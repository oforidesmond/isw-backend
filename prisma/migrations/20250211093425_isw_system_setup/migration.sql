/*
  Warnings:

  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "AuditActionType" AS ENUM ('USER_SIGNED_UP', 'USER_SIGNED_IN', 'ROLE_ASSIGNED', 'ROLE_MODIFIED', 'ROLE_REVOKED', 'REQUISITION_SUBMITTED', 'REQUISITION_APPROVED', 'REQUISITION_DECLINED', 'REQUISITION_PROCESSED', 'INVENTORY_CREATED', 'INVENTORY_UPDATED', 'INVENTORY_STATUS_CHANGED', 'INVENTORY_DISPOSED', 'MAINTENANCE_TICKET_CREATED', 'MAINTENANCE_TICKET_UPDATED', 'MAINTENANCE_TICKET_RESOLVED', 'STOCK_RECEIVED', 'STOCK_ISSUED', 'STOCK_ADJUSTED', 'SUPPLIER_CREATED', 'SUPPLIER_UPDATED', 'SUPPLIER_DELETED', 'USER_DELETED', 'ITEM_DELETED');

-- CreateEnum
CREATE TYPE "DeviceType" AS ENUM ('LAPTOP', 'PRINTER', 'UPS', 'DESKTOP', 'OTHER');

-- CreateEnum
CREATE TYPE "ItemClass" AS ENUM ('FIXED_ASSET', 'CONSUMABLE');

-- CreateEnum
CREATE TYPE "Urgency" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "RequisitionStatus" AS ENUM ('SUBMITTED', 'PENDING_DEPT_APPROVAL', 'PENDING_ITD_APPROVAL', 'APPROVED', 'DECLINED', 'PROCESSED');

-- CreateEnum
CREATE TYPE "InventoryStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'NON_FUNCTIONAL', 'OBSOLETE', 'DISPOSED');

-- CreateEnum
CREATE TYPE "IssueType" AS ENUM ('HARDWARE', 'SOFTWARE');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW');

-- DropTable
DROP TABLE "User";

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "actionType" "AuditActionType" NOT NULL,
    "performedById" TEXT,
    "affectedUserId" TEXT,
    "entityType" TEXT,
    "entityId" TEXT,
    "oldState" JSONB,
    "newState" JSONB,
    "ipAddress" TEXT,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "itItemId" TEXT NOT NULL,
    "stockReceivedId" TEXT NOT NULL,
    "userFullName" TEXT NOT NULL,
    "userDepartment" TEXT NOT NULL,
    "userUnit" TEXT,
    "roomNo" TEXT,
    "lpoReference" TEXT,
    "supplierId" TEXT,
    "warrantyPeriod" INTEGER NOT NULL,
    "purchaseDate" TIMESTAMP(3) NOT NULL,
    "status" "InventoryStatus" NOT NULL,
    "statusChangedAt" TIMESTAMP(3),
    "markedObsoleteById" TEXT,
    "disposedById" TEXT,
    "disposalDate" TIMESTAMP(3),
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "inventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "desktop_details" (
    "id" TEXT NOT NULL,
    "inventoryId" TEXT NOT NULL,
    "desktopBrand" TEXT,
    "desktopModel" TEXT,
    "desktopSerialNumber" TEXT,
    "desktopMonitorBrand" TEXT,
    "desktopMonitorModel" TEXT,
    "desktopMonitorSerialNumber" TEXT,
    "desktopMacAddress" TEXT,
    "desktopProcessorType" TEXT,
    "desktopMemorySize" TEXT,
    "desktopStorageDriveType" TEXT,
    "desktopStorageDriveSize" TEXT,
    "desktopOperatingSystem" TEXT,
    "desktopEndpointSecurity" BOOLEAN,
    "desktopSpiceworksMonitoring" BOOLEAN,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "desktop_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "laptop_details" (
    "id" TEXT NOT NULL,
    "inventoryId" TEXT NOT NULL,
    "laptopBrand" TEXT,
    "laptopModel" TEXT,
    "laptopSerialNumber" TEXT,
    "laptopMacAddress" TEXT,
    "laptopProcessorType" TEXT,
    "laptopMemorySize" TEXT,
    "laptopStorageDriveType" TEXT,
    "laptopStorageDriveSize" TEXT,
    "laptopOperatingSystem" TEXT,
    "laptopEndpointSecurity" BOOLEAN,
    "laptopSpiceworksMonitoring" BOOLEAN,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "laptop_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "printer_details" (
    "id" TEXT NOT NULL,
    "inventoryId" TEXT NOT NULL,
    "printerBrand" TEXT,
    "printerModel" TEXT,
    "printerSerialNumber" TEXT,
    "printerMacAddress" TEXT,
    "printerTonerNumber" TEXT,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "printer_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ups_details" (
    "id" TEXT NOT NULL,
    "inventoryId" TEXT NOT NULL,
    "upsBrand" TEXT,
    "upsModel" TEXT,
    "upsSerialNumber" TEXT,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ups_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "other_details" (
    "id" TEXT NOT NULL,
    "inventoryId" TEXT NOT NULL,
    "deviceType" TEXT,
    "otherBrand" TEXT,
    "otherModel" TEXT,
    "otherSerialNumber" TEXT,
    "otherMacAddress" TEXT,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "other_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suppliers" (
    "id" TEXT NOT NULL,
    "supplierID" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactDetails" TEXT,
    "lpoReference" TEXT NOT NULL,
    "lpoDate" TIMESTAMP(3) NOT NULL,
    "voucherNumber" TEXT NOT NULL,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "it_items" (
    "id" TEXT NOT NULL,
    "itemID" TEXT NOT NULL,
    "deviceType" "DeviceType" NOT NULL,
    "itemClass" "ItemClass" NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "defaultWarranty" INTEGER NOT NULL,
    "supplierId" TEXT,
    "validationRules" JSONB,
    "specifications" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "it_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "requisitions" (
    "id" TEXT NOT NULL,
    "requisitionID" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "itItemId" TEXT NOT NULL,
    "itemDescription" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "urgency" "Urgency" NOT NULL,
    "purpose" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "deptApproverId" TEXT,
    "itdApproverId" TEXT,
    "status" "RequisitionStatus" NOT NULL,
    "declineReason" TEXT,
    "approvalSignatures" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "requisitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_received" (
    "id" TEXT NOT NULL,
    "lpoReference" TEXT NOT NULL,
    "voucherNumber" TEXT NOT NULL,
    "lpoDate" TIMESTAMP(3) NOT NULL,
    "itItemId" TEXT NOT NULL,
    "quantityReceived" INTEGER NOT NULL,
    "supplierId" TEXT NOT NULL,
    "warrantyPeriod" INTEGER NOT NULL,
    "receivedById" TEXT NOT NULL,
    "dateReceived" TIMESTAMP(3) NOT NULL,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "stock_received_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stocks" (
    "id" TEXT NOT NULL,
    "itItemId" TEXT NOT NULL,
    "quantityInStock" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "stocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_issued" (
    "id" TEXT NOT NULL,
    "requisitionId" TEXT NOT NULL,
    "stockBatchId" TEXT NOT NULL,
    "itItemId" TEXT NOT NULL,
    "quantityIssued" INTEGER NOT NULL,
    "requestDate" TIMESTAMP(3) NOT NULL,
    "issuedById" TEXT NOT NULL,
    "issueDate" TIMESTAMP(3) NOT NULL,
    "disbursementNote" TEXT,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "stock_issued_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_tickets" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "technicianReceivedById" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "userFullName" TEXT NOT NULL,
    "issueType" "IssueType" NOT NULL,
    "unit" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "roomNo" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priority" "Priority" NOT NULL,
    "actionTaken" TEXT,
    "technicianReturnedById" TEXT,
    "dateLogged" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateResolved" TIMESTAMP(3),
    "auditedById" TEXT,
    "auditDate" TIMESTAMP(3),
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "maintenance_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_batches" (
    "id" TEXT NOT NULL,
    "stockReceivedId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "warrantyPeriod" INTEGER NOT NULL,
    "expiryDate" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "stock_batches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "audit_logs_actionType_idx" ON "audit_logs"("actionType");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "user_roles_userId_roleId_key" ON "user_roles"("userId", "roleId");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_name_key" ON "permissions"("name");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_assetId_key" ON "inventory"("assetId");

-- CreateIndex
CREATE INDEX "inventory_itItemId_idx" ON "inventory"("itItemId");

-- CreateIndex
CREATE INDEX "inventory_status_idx" ON "inventory"("status");

-- CreateIndex
CREATE UNIQUE INDEX "desktop_details_inventoryId_key" ON "desktop_details"("inventoryId");

-- CreateIndex
CREATE UNIQUE INDEX "laptop_details_inventoryId_key" ON "laptop_details"("inventoryId");

-- CreateIndex
CREATE UNIQUE INDEX "printer_details_inventoryId_key" ON "printer_details"("inventoryId");

-- CreateIndex
CREATE UNIQUE INDEX "ups_details_inventoryId_key" ON "ups_details"("inventoryId");

-- CreateIndex
CREATE UNIQUE INDEX "other_details_inventoryId_key" ON "other_details"("inventoryId");

-- CreateIndex
CREATE UNIQUE INDEX "suppliers_supplierID_key" ON "suppliers"("supplierID");

-- CreateIndex
CREATE INDEX "suppliers_lpoReference_idx" ON "suppliers"("lpoReference");

-- CreateIndex
CREATE INDEX "suppliers_voucherNumber_idx" ON "suppliers"("voucherNumber");

-- CreateIndex
CREATE UNIQUE INDEX "it_items_itemID_key" ON "it_items"("itemID");

-- CreateIndex
CREATE INDEX "it_items_deviceType_idx" ON "it_items"("deviceType");

-- CreateIndex
CREATE UNIQUE INDEX "requisitions_requisitionID_key" ON "requisitions"("requisitionID");

-- CreateIndex
CREATE INDEX "requisitions_staffId_idx" ON "requisitions"("staffId");

-- CreateIndex
CREATE INDEX "requisitions_status_idx" ON "requisitions"("status");

-- CreateIndex
CREATE INDEX "stock_received_lpoReference_idx" ON "stock_received"("lpoReference");

-- CreateIndex
CREATE INDEX "stock_received_voucherNumber_idx" ON "stock_received"("voucherNumber");

-- CreateIndex
CREATE INDEX "stock_received_itItemId_idx" ON "stock_received"("itItemId");

-- CreateIndex
CREATE INDEX "stock_received_supplierId_idx" ON "stock_received"("supplierId");

-- CreateIndex
CREATE UNIQUE INDEX "stocks_itItemId_key" ON "stocks"("itItemId");

-- CreateIndex
CREATE INDEX "stocks_itItemId_idx" ON "stocks"("itItemId");

-- CreateIndex
CREATE INDEX "stocks_quantityInStock_idx" ON "stocks"("quantityInStock");

-- CreateIndex
CREATE INDEX "stocks_itItemId_quantityInStock_idx" ON "stocks"("itItemId", "quantityInStock");

-- CreateIndex
CREATE INDEX "stock_issued_requisitionId_idx" ON "stock_issued"("requisitionId");

-- CreateIndex
CREATE INDEX "stock_issued_itItemId_idx" ON "stock_issued"("itItemId");

-- CreateIndex
CREATE INDEX "stock_issued_issuedById_idx" ON "stock_issued"("issuedById");

-- CreateIndex
CREATE INDEX "stock_issued_stockBatchId_idx" ON "stock_issued"("stockBatchId");

-- CreateIndex
CREATE INDEX "stock_issued_requestDate_idx" ON "stock_issued"("requestDate");

-- CreateIndex
CREATE INDEX "stock_issued_requisitionId_stockBatchId_idx" ON "stock_issued"("requisitionId", "stockBatchId");

-- CreateIndex
CREATE UNIQUE INDEX "maintenance_tickets_ticketId_key" ON "maintenance_tickets"("ticketId");

-- CreateIndex
CREATE INDEX "maintenance_tickets_assetId_idx" ON "maintenance_tickets"("assetId");

-- CreateIndex
CREATE INDEX "maintenance_tickets_technicianReceivedById_idx" ON "maintenance_tickets"("technicianReceivedById");

-- CreateIndex
CREATE INDEX "maintenance_tickets_priority_idx" ON "maintenance_tickets"("priority");

-- CreateIndex
CREATE INDEX "maintenance_tickets_auditedById_idx" ON "maintenance_tickets"("auditedById");

-- CreateIndex
CREATE INDEX "maintenance_tickets_department_idx" ON "maintenance_tickets"("department");

-- CreateIndex
CREATE INDEX "maintenance_tickets_department_unit_idx" ON "maintenance_tickets"("department", "unit");

-- CreateIndex
CREATE INDEX "maintenance_tickets_dateLogged_idx" ON "maintenance_tickets"("dateLogged");

-- CreateIndex
CREATE INDEX "maintenance_tickets_priority_dateLogged_idx" ON "maintenance_tickets"("priority", "dateLogged");

-- CreateIndex
CREATE UNIQUE INDEX "stock_batches_stockReceivedId_key" ON "stock_batches"("stockReceivedId");

-- CreateIndex
CREATE INDEX "stock_batches_stockReceivedId_idx" ON "stock_batches"("stockReceivedId");

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_affectedUserId_fkey" FOREIGN KEY ("affectedUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_itItemId_fkey" FOREIGN KEY ("itItemId") REFERENCES "it_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_stockReceivedId_fkey" FOREIGN KEY ("stockReceivedId") REFERENCES "stock_received"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_markedObsoleteById_fkey" FOREIGN KEY ("markedObsoleteById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_disposedById_fkey" FOREIGN KEY ("disposedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "desktop_details" ADD CONSTRAINT "desktop_details_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "inventory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "laptop_details" ADD CONSTRAINT "laptop_details_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "inventory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "printer_details" ADD CONSTRAINT "printer_details_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "inventory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ups_details" ADD CONSTRAINT "ups_details_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "inventory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "other_details" ADD CONSTRAINT "other_details_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "inventory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "it_items" ADD CONSTRAINT "it_items_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requisitions" ADD CONSTRAINT "requisition_staff_fkey" FOREIGN KEY ("staffId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requisitions" ADD CONSTRAINT "requisition_itItem_fkey" FOREIGN KEY ("itItemId") REFERENCES "it_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requisitions" ADD CONSTRAINT "requisition_deptApprover_fkey" FOREIGN KEY ("deptApproverId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requisitions" ADD CONSTRAINT "requisition_itdApprover_fkey" FOREIGN KEY ("itdApproverId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_received" ADD CONSTRAINT "stock_received_itItemId_fkey" FOREIGN KEY ("itItemId") REFERENCES "it_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_received" ADD CONSTRAINT "stock_received_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_received" ADD CONSTRAINT "stock_received_receivedById_fkey" FOREIGN KEY ("receivedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stocks" ADD CONSTRAINT "stocks_itItemId_fkey" FOREIGN KEY ("itItemId") REFERENCES "it_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_issued" ADD CONSTRAINT "stock_issued_requisitionId_fkey" FOREIGN KEY ("requisitionId") REFERENCES "requisitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_issued" ADD CONSTRAINT "stock_issued_stockBatchId_fkey" FOREIGN KEY ("stockBatchId") REFERENCES "stock_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_issued" ADD CONSTRAINT "stock_issued_itItemId_fkey" FOREIGN KEY ("itItemId") REFERENCES "it_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_issued" ADD CONSTRAINT "stock_issued_issuedById_fkey" FOREIGN KEY ("issuedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_tickets" ADD CONSTRAINT "maintenance_tickets_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "inventory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_tickets" ADD CONSTRAINT "maintenance_tickets_technicianReceivedById_fkey" FOREIGN KEY ("technicianReceivedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_tickets" ADD CONSTRAINT "maintenance_tickets_technicianReturnedById_fkey" FOREIGN KEY ("technicianReturnedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_tickets" ADD CONSTRAINT "maintenance_tickets_auditedById_fkey" FOREIGN KEY ("auditedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_batches" ADD CONSTRAINT "stock_batches_stockReceivedId_fkey" FOREIGN KEY ("stockReceivedId") REFERENCES "stock_received"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
