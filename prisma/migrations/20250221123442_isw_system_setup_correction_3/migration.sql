/*
  Warnings:

  - A unique constraint covering the columns `[staffId]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `staffId` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "users" ADD COLUMN     "mustResetPassword" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "staffId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "users_staffId_key" ON "users"("staffId");
