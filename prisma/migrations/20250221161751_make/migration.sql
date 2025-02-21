/*
  Warnings:

  - A unique constraint covering the columns `[roleId,permissionId]` on the table `role_permissions` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "role_permissions_roleId_permissionId_key" ON "role_permissions"("roleId", "permissionId");
