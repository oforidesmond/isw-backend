/*
  Warnings:

  - You are about to drop the column `roomNo` on the `inventory` table. All the data in the column will be lost.
  - You are about to drop the column `userDepartment` on the `inventory` table. All the data in the column will be lost.
  - You are about to drop the column `userFullName` on the `inventory` table. All the data in the column will be lost.
  - You are about to drop the column `userUnit` on the `inventory` table. All the data in the column will be lost.
  - You are about to drop the column `department` on the `maintenance_tickets` table. All the data in the column will be lost.
  - You are about to drop the column `roomNo` on the `maintenance_tickets` table. All the data in the column will be lost.
  - You are about to drop the column `unit` on the `maintenance_tickets` table. All the data in the column will be lost.
  - You are about to drop the column `userFullName` on the `maintenance_tickets` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `permissions` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `permissions` table. All the data in the column will be lost.
  - You are about to drop the column `department` on the `requisitions` table. All the data in the column will be lost.
  - You are about to drop the column `unit` on the `requisitions` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[resource]` on the table `permissions` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `departmentId` to the `inventory` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `inventory` table without a default value. This is not possible if the table is not empty.
  - Added the required column `departmentId` to the `maintenance_tickets` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `maintenance_tickets` table without a default value. This is not possible if the table is not empty.
  - Added the required column `resource` to the `permissions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `departmentId` to the `requisitions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `password` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "maintenance_tickets_department_idx";

-- DropIndex
DROP INDEX "maintenance_tickets_department_unit_idx";

-- DropIndex
DROP INDEX "permissions_name_key";

-- AlterTable
ALTER TABLE "inventory" DROP COLUMN "roomNo",
DROP COLUMN "userDepartment",
DROP COLUMN "userFullName",
DROP COLUMN "userUnit",
ADD COLUMN     "departmentId" TEXT NOT NULL,
ADD COLUMN     "unitId" TEXT,
ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "maintenance_tickets" DROP COLUMN "department",
DROP COLUMN "roomNo",
DROP COLUMN "unit",
DROP COLUMN "userFullName",
ADD COLUMN     "departmentId" TEXT NOT NULL,
ADD COLUMN     "unitId" TEXT,
ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "permissions" DROP COLUMN "description",
DROP COLUMN "name",
ADD COLUMN     "actions" TEXT[],
ADD COLUMN     "resource" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "requisitions" DROP COLUMN "department",
DROP COLUMN "unit",
ADD COLUMN     "departmentId" TEXT NOT NULL,
ADD COLUMN     "roomNo" TEXT,
ADD COLUMN     "unitId" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "departmentId" TEXT,
ADD COLUMN     "password" TEXT NOT NULL,
ADD COLUMN     "roomNo" TEXT,
ADD COLUMN     "unitId" TEXT;

-- CreateTable
CREATE TABLE "departments" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "deptApproverId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Unit" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Unit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "departments_name_key" ON "departments"("name");

-- CreateIndex
CREATE UNIQUE INDEX "departments_deptApproverId_key" ON "departments"("deptApproverId");

-- CreateIndex
CREATE UNIQUE INDEX "Unit_name_key" ON "Unit"("name");

-- CreateIndex
CREATE INDEX "maintenance_tickets_departmentId_idx" ON "maintenance_tickets"("departmentId");

-- CreateIndex
CREATE INDEX "maintenance_tickets_departmentId_unitId_idx" ON "maintenance_tickets"("departmentId", "unitId");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_resource_key" ON "permissions"("resource");

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_deptApproverId_fkey" FOREIGN KEY ("deptApproverId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Unit" ADD CONSTRAINT "Unit_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requisitions" ADD CONSTRAINT "requisitions_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requisitions" ADD CONSTRAINT "requisitions_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_tickets" ADD CONSTRAINT "maintenance_tickets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_tickets" ADD CONSTRAINT "maintenance_tickets_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_tickets" ADD CONSTRAINT "maintenance_tickets_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
