-- CreateEnum
CREATE TYPE "LessonStatus" AS ENUM ('uploaded', 'making', 'ready', 'failed', 'approved');

-- CreateEnum
CREATE TYPE "CardType" AS ENUM ('multiple_choice', 'matching_pair', 'fill_blank');

-- CreateEnum
CREATE TYPE "Level" AS ENUM ('easy', 'medium', 'hard');

-- CreateEnum
CREATE TYPE "CardStatus" AS ENUM ('draft', 'approved');

-- CreateEnum
CREATE TYPE "CardFlag" AS ENUM ('not_in_lesson', 'ai_unsure');

-- CreateTable
CREATE TABLE "Lesson" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "topic" TEXT,
    "subject" TEXT,
    "grade" INTEGER,
    "games" TEXT[],
    "fileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "unitLabel" TEXT NOT NULL,
    "unitCount" INTEGER NOT NULL,
    "unitCountIsEstimate" BOOLEAN NOT NULL,
    "wordCount" INTEGER NOT NULL,
    "tablesRead" INTEGER,
    "picturesSkipped" INTEGER,
    "textLevel" TEXT NOT NULL,
    "units" JSONB NOT NULL,
    "textWasCut" BOOLEAN NOT NULL DEFAULT false,
    "status" "LessonStatus" NOT NULL DEFAULT 'uploaded',
    "errorCode" TEXT,
    "makingStep" TEXT,
    "makingStartedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lesson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "type" "CardType" NOT NULL,
    "prompt" TEXT NOT NULL,
    "choices" TEXT[],
    "answer" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "grade" INTEGER NOT NULL,
    "level" "Level" NOT NULL,
    "explanation" TEXT,
    "sourcePage" INTEGER,
    "sourceQuote" TEXT,
    "flag" "CardFlag",
    "flagChecked" BOOLEAN NOT NULL DEFAULT false,
    "madeBy" TEXT NOT NULL DEFAULT 'ai',
    "status" "CardStatus" NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Lesson_ownerId_createdAt_idx" ON "Lesson"("ownerId", "createdAt");

-- CreateIndex
CREATE INDEX "Question_lessonId_position_idx" ON "Question"("lessonId", "position");

-- AddForeignKey
ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Teacher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
