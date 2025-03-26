/*
  Warnings:

  - A unique constraint covering the columns `[entityId,actionType]` on the table `audit_logs` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "audit_logs_entityId_actionType_key" ON "audit_logs"("entityId", "actionType");
