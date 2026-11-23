// The totals on the Admin page (GET /api/admin/stats). Numbers only: never names,
// School IDs, scores or lists. The counting is passed in, so the test script can
// check the answer without a database.

export const ADMIN_STATS_KEYS = [
  "teachers",
  "activeTeachers",
  "sections",
  "students",
  "registeredStudents",
  "lessons",
  "approvedLessons",
] as const;

export type AdminStatsKey = (typeof ADMIN_STATS_KEYS)[number];
export type AdminStats = Record<AdminStatsKey, number>;

/** One count per total (each one a database count() in the route). */
export type AdminStatsCounters = Record<AdminStatsKey, () => Promise<number>>;

/** Runs every count together and answers exactly the 7 numbers. */
export async function readAdminStats(count: AdminStatsCounters): Promise<AdminStats> {
  const values = await Promise.all(ADMIN_STATS_KEYS.map((key) => count[key]()));
  const stats = {} as AdminStats;
  ADMIN_STATS_KEYS.forEach((key, i) => {
    stats[key] = Number(values[i]);
  });
  return stats;
}
