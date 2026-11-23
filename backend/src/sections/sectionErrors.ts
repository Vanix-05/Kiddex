// The friendly errors for sections and Students, all in one place.
import { AppError } from "../middleware/AppError";

export const sectionErrors = {
  badRequest: (message: string) => new AppError(400, "BAD_REQUEST", message),
  // Unknown, or another Teacher's: the same answer, so nobody learns which.
  sectionNotFound: () =>
    new AppError(404, "SECTION_NOT_FOUND", "We could not find this section. Please refresh the page."),
  // Unknown, or in another Teacher's section: the same answer.
  studentNotFound: () =>
    new AppError(404, "STUDENT_NOT_FOUND", "We could not find this Student. Please refresh the page."),
  sectionTaken: (grade: number, name: string) =>
    new AppError(409, "SECTION_TAKEN", `You already have Grade ${grade} – ${name}.`),
  sectionFull: (placesLeft: number) =>
    new AppError(
      409,
      "SECTION_FULL",
      `This section has room for ${placesLeft} more Student${placesLeft === 1 ? "" : "s"}.`,
    ),
  dbUnavailable: () =>
    new AppError(503, "DB_UNAVAILABLE", "We can't reach your class lists right now. Please try again in a minute."),
};
