-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "lastPlayDay" TEXT,
ADD COLUMN     "stars" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "streakDays" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "xp" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "TopicLevel" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "topicKey" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "level" "Level" NOT NULL DEFAULT 'easy',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TopicLevel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameRound" (
    "id" TEXT NOT NULL,
    "clientRoundId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "assignmentId" TEXT,
    "game" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "startLevel" "Level" NOT NULL,
    "endLevel" "Level" NOT NULL,
    "change" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "right" INTEGER NOT NULL,
    "helpedRight" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "helpsUsed" INTEGER NOT NULL,
    "xp" INTEGER NOT NULL,
    "stars" INTEGER NOT NULL,
    "starsEarned" INTEGER NOT NULL,
    "countsForMission" BOOLEAN NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameRound_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoundAnswer" (
    "id" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "questionId" TEXT,
    "position" INTEGER NOT NULL,
    "level" "Level" NOT NULL,
    "right" BOOLEAN NOT NULL,
    "tries" INTEGER NOT NULL,
    "ms" INTEGER NOT NULL,
    "helped" BOOLEAN NOT NULL,

    CONSTRAINT "RoundAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TopicLevel_studentId_topicKey_key" ON "TopicLevel"("studentId", "topicKey");

-- CreateIndex
CREATE UNIQUE INDEX "GameRound_clientRoundId_key" ON "GameRound"("clientRoundId");

-- CreateIndex
CREATE INDEX "GameRound_studentId_lessonId_game_idx" ON "GameRound"("studentId", "lessonId", "game");

-- CreateIndex
CREATE INDEX "GameRound_assignmentId_idx" ON "GameRound"("assignmentId");

-- CreateIndex
CREATE INDEX "RoundAnswer_questionId_idx" ON "RoundAnswer"("questionId");

-- AddForeignKey
ALTER TABLE "TopicLevel" ADD CONSTRAINT "TopicLevel_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameRound" ADD CONSTRAINT "GameRound_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameRound" ADD CONSTRAINT "GameRound_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameRound" ADD CONSTRAINT "GameRound_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoundAnswer" ADD CONSTRAINT "RoundAnswer_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "GameRound"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoundAnswer" ADD CONSTRAINT "RoundAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE SET NULL ON UPDATE CASCADE;
