-- CreateEnum
CREATE TYPE "public"."QuestionMetaType" AS ENUM ('SOURCE_VERIFIED', 'SYNTAX_VERIFIED', 'BODY_REPORT', 'WORK_REPORT', 'HINT_REPORT');

-- CreateEnum
CREATE TYPE "public"."QuestionMetaSource" AS ENUM ('FIPI', 'AI', 'USER');

-- CreateTable
CREATE TABLE "public"."QuestionMeta" (
    "id" TEXT NOT NULL,
    "type" "public"."QuestionMetaType" NOT NULL,
    "source" "public"."QuestionMetaSource" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT,
    "questionId" TEXT NOT NULL,

    CONSTRAINT "QuestionMeta_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."QuestionMeta" ADD CONSTRAINT "QuestionMeta_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."QuestionMeta" ADD CONSTRAINT "QuestionMeta_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "public"."Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Insert
INSERT INTO "QuestionMeta" (
    "id",
    "questionId",
    "type",
    "source",
    "userId",
    "createdAt",
    "updatedAt"
)
SELECT
    gen_random_uuid()::text,
    id,
    'SYNTAX_VERIFIED'::"QuestionMetaType",
    'USER'::"QuestionMetaSource",
    NULL,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM
    "public"."Question"
WHERE
    "verified" = true;

-- DropColumn
ALTER TABLE "public"."Question" DROP COLUMN "verified";