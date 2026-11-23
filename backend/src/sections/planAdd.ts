// Decides which School IDs of an "Add students" list can be added, and why the
// others are skipped. Pure (no database), so `npm run test-students` can check it.
import { MAX_STUDENTS_PER_SECTION } from "./limits";
import { cleanSchoolId, showSchoolId } from "./schoolId";

export type SkipReason = "BAD_FORMAT" | "DUPLICATE_IN_LIST" | "ALREADY_IN_SECTION" | "IN_ANOTHER_SECTION";

export interface Skipped {
  /** The shown form ("2026-0144"), or what was sent when it is not a School ID. */
  schoolId: string;
  reason: SkipReason;
}

export interface AddPlan {
  /** Clean School IDs ("20260144") to add, in the order sent. */
  good: string[];
  skipped: Skipped[];
  /** Places left in the section before adding. */
  placesLeft: number;
  /** true = the good ones don't fit: add nothing (409 SECTION_FULL). */
  full: boolean;
}

/**
 * @param sent         what the Teacher sent
 * @param studentCount Students already in the section
 * @param owners       for School IDs already saved anywhere: clean id → its section id
 * @param sectionId    the section being added to
 */
export function planAdd(
  sent: string[],
  studentCount: number,
  owners: Map<string, string>,
  sectionId: string,
): AddPlan {
  const good: string[] = [];
  const skipped: Skipped[] = [];
  const seen = new Set<string>();
  for (const raw of sent) {
    const clean = cleanSchoolId(raw);
    if (!clean) {
      skipped.push({ schoolId: raw.trim().slice(0, 40), reason: "BAD_FORMAT" });
      continue;
    }
    const shown = showSchoolId(clean);
    if (seen.has(clean)) {
      skipped.push({ schoolId: shown, reason: "DUPLICATE_IN_LIST" });
      continue;
    }
    seen.add(clean);
    const owner = owners.get(clean);
    if (owner === sectionId) skipped.push({ schoolId: shown, reason: "ALREADY_IN_SECTION" });
    // Another section, maybe another Teacher's: never say whose.
    else if (owner !== undefined) skipped.push({ schoolId: shown, reason: "IN_ANOTHER_SECTION" });
    else good.push(clean);
  }
  const placesLeft = Math.max(0, MAX_STUDENTS_PER_SECTION - studentCount);
  return { good, skipped, placesLeft, full: good.length > placesLeft };
}
