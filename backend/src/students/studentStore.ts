// The Student's own row in the database: the login's store, the login check
// behind requireStudent, and the profile the Student app gets. The profile never
// holds a hash, a code or a classmate's School ID. Never log any of those.
import { fromDb } from "../auth/authErrors";
import { prisma } from "../db/prisma";
import type { Prisma } from "../generated/prisma/client";
import { showSchoolId } from "../sections/schoolId";
import type { StudentLoginStore } from "./studentLogin";

const LOGIN_FIELDS = {
  id: true,
  tokenVersion: true,
  oneTimeCode: true,
  pinHash: true,
  failedLogins: true,
  lockedUntil: true,
  registeredAt: true,
} satisfies Prisma.StudentSelect;

/** The login's store, on the real database (a waking database gets one more try). */
export const studentLoginStore: StudentLoginStore = {
  find: (schoolId) => fromDb(() => prisma.student.findUnique({ where: { schoolId }, select: LOGIN_FIELDS })),
  update: async (id, changes) => {
    await fromDb(() => prisma.student.update({ where: { id }, data: changes, select: { id: true } }));
  },
  useCode: async (id, code, changes) => {
    // Not tried twice: it saves a new PIN code hash.
    const { count } = await fromDb(() => prisma.student.updateMany({ where: { id, oneTimeCode: code }, data: changes }), {
      retry: false,
    });
    return count === 1;
  },
};

/** For requireStudent: is the Student still there, with this tokenVersion? */
export const findStudentForCheck = (id: string) =>
  fromDb(() => prisma.student.findUnique({ where: { id }, select: { id: true, tokenVersion: true } }));

/** What the Student app gets about the logged-in Student (GET /api/student/me and the login answers). */
export interface StudentProfile {
  /** "2026-0144" (their own; never a classmate's). */
  schoolId: string;
  section: { grade: number; name: string };
  avatar: string | null;
  buddy: string | null;
  buddyName: string | null;
  look: Prisma.JsonValue | null;
  seenIntroClip: boolean;
  seenBridgeCutscene: boolean;
}

const PROFILE_FIELDS = {
  schoolId: true,
  section: { select: { grade: true, name: true } },
  avatar: true,
  buddy: true,
  buddyName: true,
  look: true,
  seenIntroClip: true,
  seenBridgeCutscene: true,
} satisfies Prisma.StudentSelect;

type ProfileRow = Prisma.StudentGetPayload<{ select: typeof PROFILE_FIELDS }>;

const toProfile = (row: ProfileRow): StudentProfile => ({ ...row, schoolId: showSchoolId(row.schoolId) });

export async function studentProfile(id: string): Promise<StudentProfile | null> {
  const row = await fromDb(() => prisma.student.findUnique({ where: { id }, select: PROFILE_FIELDS }));
  return row && toProfile(row);
}

/** Saves setup or look changes and answers the new profile. */
export async function updateStudentProfile(id: string, data: Prisma.StudentUpdateInput): Promise<StudentProfile> {
  const row = await fromDb(() => prisma.student.update({ where: { id }, data, select: PROFILE_FIELDS }));
  return toProfile(row);
}
