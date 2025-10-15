-- CreateEnum
CREATE TYPE "public"."QuestionSource" AS ENUM ('FIPI', 'AI', 'USER');

-- CreateEnum
CREATE TYPE "public"."SolutionType" AS ENUM ('SHORT', 'LONG', 'MULTICHOICE', 'MULTIRESPONSE', 'MULTICHOICEGROUP');

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "permissions" INTEGER NOT NULL,
    "creatorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Subject" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Subject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Topic" (
    "id" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parentId" TEXT,

    CONSTRAINT "Topic_pkey" PRIMARY KEY ("id","subjectId")
);

-- CreateTable
CREATE TABLE "public"."QuestionToTopic" (
    "questionId" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,

    CONSTRAINT "QuestionToTopic_pkey" PRIMARY KEY ("questionId","topicId","subjectId")
);

-- CreateTable
CREATE TABLE "public"."Question" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "body" TEXT,
    "solutionPostfix" TEXT,
    "work" TEXT,
    "solution" TEXT,
    "solutionType" "public"."SolutionType" NOT NULL,
    "source" "public"."QuestionSource" NOT NULL DEFAULT 'FIPI',
    "creatorId" TEXT,
    "subjectId" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Attachment" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,

    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Option" (
    "id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,

    CONSTRAINT "Option_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Test" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Test_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."QuestionToTest" (
    "id" TEXT NOT NULL,
    "order" DOUBLE PRECISION NOT NULL,
    "testId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,

    CONSTRAINT "QuestionToTest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Assignment" (
    "id" TEXT NOT NULL,
    "dueAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "testId" TEXT NOT NULL,
    "assignedById" TEXT NOT NULL,
    "assignedToId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Assignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."StudentAnswer" (
    "id" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,
    "assignmentId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."_SubjectToUser" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_SubjectToUser_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_id_key" ON "public"."User"("id");

-- CreateIndex
CREATE UNIQUE INDEX "User_name_key" ON "public"."User"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Subject_id_key" ON "public"."Subject"("id");

-- CreateIndex
CREATE UNIQUE INDEX "Question_id_key" ON "public"."Question"("id");

-- CreateIndex
CREATE UNIQUE INDEX "Attachment_id_key" ON "public"."Attachment"("id");

-- CreateIndex
CREATE UNIQUE INDEX "Option_id_key" ON "public"."Option"("id");

-- CreateIndex
CREATE UNIQUE INDEX "QuestionToTest_testId_questionId_key" ON "public"."QuestionToTest"("testId", "questionId");

-- CreateIndex
CREATE UNIQUE INDEX "QuestionToTest_testId_order_key" ON "public"."QuestionToTest"("testId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "StudentAnswer_assignmentId_questionId_key" ON "public"."StudentAnswer"("assignmentId", "questionId");

-- CreateIndex
CREATE INDEX "_SubjectToUser_B_index" ON "public"."_SubjectToUser"("B");

-- AddForeignKey
ALTER TABLE "public"."User" ADD CONSTRAINT "User_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Topic" ADD CONSTRAINT "Topic_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "public"."Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Topic" ADD CONSTRAINT "Topic_parentId_subjectId_fkey" FOREIGN KEY ("parentId", "subjectId") REFERENCES "public"."Topic"("id", "subjectId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."QuestionToTopic" ADD CONSTRAINT "QuestionToTopic_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "public"."Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."QuestionToTopic" ADD CONSTRAINT "QuestionToTopic_topicId_subjectId_fkey" FOREIGN KEY ("topicId", "subjectId") REFERENCES "public"."Topic"("id", "subjectId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Question" ADD CONSTRAINT "Question_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Question" ADD CONSTRAINT "Question_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "public"."Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Attachment" ADD CONSTRAINT "Attachment_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "public"."Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Option" ADD CONSTRAINT "Option_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "public"."Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Test" ADD CONSTRAINT "Test_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Test" ADD CONSTRAINT "Test_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "public"."Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."QuestionToTest" ADD CONSTRAINT "QuestionToTest_testId_fkey" FOREIGN KEY ("testId") REFERENCES "public"."Test"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."QuestionToTest" ADD CONSTRAINT "QuestionToTest_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "public"."Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Assignment" ADD CONSTRAINT "Assignment_testId_fkey" FOREIGN KEY ("testId") REFERENCES "public"."Test"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Assignment" ADD CONSTRAINT "Assignment_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Assignment" ADD CONSTRAINT "Assignment_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StudentAnswer" ADD CONSTRAINT "StudentAnswer_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "public"."Assignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StudentAnswer" ADD CONSTRAINT "StudentAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "public"."Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_SubjectToUser" ADD CONSTRAINT "_SubjectToUser_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_SubjectToUser" ADD CONSTRAINT "_SubjectToUser_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
