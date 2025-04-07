-- AlterTable
ALTER TABLE "suppliers" ALTER COLUMN "lpoReference" DROP NOT NULL,
ALTER COLUMN "lpoDate" DROP NOT NULL,
ALTER COLUMN "voucherNumber" DROP NOT NULL;
