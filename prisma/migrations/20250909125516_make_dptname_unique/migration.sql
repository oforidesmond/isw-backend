/*
  Warnings:

  - A unique constraint covering the columns `[name]` on the table `departments` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "departments_name_key" ON "public"."departments"("name");
