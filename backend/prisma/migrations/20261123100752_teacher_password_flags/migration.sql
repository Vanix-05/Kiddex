-- AlterTable
ALTER TABLE "Teacher" ADD COLUMN     "passwordIsTemporary" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "passwordNoteHidden" BOOLEAN NOT NULL DEFAULT false;
