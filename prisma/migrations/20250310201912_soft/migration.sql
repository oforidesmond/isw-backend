-- AlterTable
ALTER TABLE "audit_logs" ADD COLUMN     "deletedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;
