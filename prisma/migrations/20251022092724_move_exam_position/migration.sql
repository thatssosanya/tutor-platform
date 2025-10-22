/*
  Warnings:

  - You are about to drop the column `examPosition` on the `Question` table. All the data in the column will be lost.

*/

-- AlterTable
ALTER TABLE "public"."Topic" ADD COLUMN     "examPosition" INTEGER;

-- Create new topics for examPositions
INSERT INTO "Topic" ("id", "subjectId", "name", "examPosition")
SELECT
    'exp-' || "examPosition"::text AS "id",
    "subjectId",
    'Topic ' || "examPosition"::text AS "name",
    "examPosition"
FROM (
    SELECT DISTINCT "subjectId", "examPosition"
    FROM "Question"
    WHERE "examPosition" IS NOT NULL
) AS unique_positions
ON CONFLICT ("id", "subjectId") DO NOTHING;

-- Connect questions to new examPosition topics
INSERT INTO "QuestionToTopic" ("questionId", "topicId", "subjectId")
SELECT
    q.id AS "questionId",
    'exp-' || q."examPosition"::text AS "topicId",
    q."subjectId"
FROM "Question" AS q
WHERE q."examPosition" IS NOT NULL
ON CONFLICT ("questionId", "topicId", "subjectId") DO NOTHING;

-- AlterTable
ALTER TABLE "public"."Question" DROP COLUMN "examPosition";
