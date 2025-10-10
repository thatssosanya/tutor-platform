-- AlterTable
ALTER TABLE "public"."Question" ADD COLUMN     "examPosition" INTEGER,
ADD COLUMN     "hint" TEXT,
ADD COLUMN     "sourcePosition" INTEGER;

-- AlterTable
ALTER TABLE "public"."Test" ADD COLUMN     "disableHints" BOOLEAN NOT NULL DEFAULT false;
