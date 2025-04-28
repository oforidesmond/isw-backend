/*
  Warnings:

  - Added the required column `updatedAt` to the `role_permissions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `user_roles` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "role_permissions" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "user_roles" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;
