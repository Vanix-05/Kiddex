-- CreateTable
CREATE TABLE "Section" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "grade" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "nameKey" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Section_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Student" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "oneTimeCode" TEXT,
    "codeMadeAt" TIMESTAMP(3),
    "pinHash" TEXT,
    "tokenVersion" INTEGER NOT NULL DEFAULT 0,
    "failedLogins" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "registeredAt" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "avatar" TEXT,
    "buddy" TEXT,
    "buddyName" TEXT,
    "look" JSONB,
    "seenIntroClip" BOOLEAN NOT NULL DEFAULT false,
    "seenBridgeCutscene" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Section_teacherId_createdAt_idx" ON "Section"("teacherId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Section_teacherId_grade_nameKey_key" ON "Section"("teacherId", "grade", "nameKey");

-- CreateIndex
CREATE UNIQUE INDEX "Student_schoolId_key" ON "Student"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "Student_oneTimeCode_key" ON "Student"("oneTimeCode");

-- CreateIndex
CREATE INDEX "Student_sectionId_schoolId_idx" ON "Student"("sectionId", "schoolId");

-- AddForeignKey
ALTER TABLE "Section" ADD CONSTRAINT "Section_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

