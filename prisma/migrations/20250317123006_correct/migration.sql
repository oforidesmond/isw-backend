-- AlterTable
ALTER TABLE "audit_logs" ALTER COLUMN "deletedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "roles" ALTER COLUMN "deletedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "user_roles" ALTER COLUMN "deletedAt" DROP DEFAULT;
