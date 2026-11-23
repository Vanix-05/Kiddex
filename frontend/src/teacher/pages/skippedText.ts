import type { SkippedSchoolId } from '../data/types'

/** Why the server skipped a School ID, in a Teacher's words. Never says whose class it is in. */
export function skippedText({ schoolId, reason }: SkippedSchoolId): string {
  switch (reason) {
    case 'IN_ANOTHER_SECTION':
      return `${schoolId} is already in another class. Ask your school’s KIDDEX admin.`
    case 'ALREADY_IN_SECTION':
      return `${schoolId} is already in this section.`
    case 'DUPLICATE_IN_LIST':
      return `${schoolId} was in the list twice.`
    default:
      return `${schoolId} is not a School ID.`
  }
}
