// The friendly errors for lessons and questions, all in one place.
import { AppError } from "../middleware/AppError";
import { MAX_FILE_MB } from "./limits";

export const lessonErrors = {
  // Uploading a file
  noFile: () => new AppError(400, "NO_FILE", "Please choose a lesson file."),
  oneFileOnly: () => new AppError(400, "ONE_FILE_ONLY", "Please choose only one lesson file."),
  fileTooBig: () =>
    new AppError(413, "FILE_TOO_BIG", `This file is bigger than ${MAX_FILE_MB} MB. Try a smaller file.`),
  oldFormat: () =>
    new AppError(
      415,
      "OLD_FORMAT",
      "This is an older Word or PowerPoint file. Open it and save it as .docx or .pptx, then upload again.",
    ),
  wrongType: () =>
    new AppError(415, "WRONG_TYPE", "Please upload a PDF, Word (.docx) or PowerPoint (.pptx) file."),
  pdfLocked: () =>
    new AppError(422, "PDF_LOCKED", "This PDF has a password. Remove the password and upload again."),
  cantRead: () => new AppError(422, "CANT_READ", "We could not open this file. It may be damaged."),

  // Lessons and questions
  lessonNotFound: () =>
    new AppError(
      404,
      "LESSON_NOT_FOUND",
      "We could not find this lesson. It may have been removed. Please upload it again.",
    ),
  questionNotFound: () =>
    new AppError(404, "QUESTION_NOT_FOUND", "We could not find this question. It may have been removed."),
  alreadyMaking: () =>
    new AppError(409, "ALREADY_MAKING", "The questions for this lesson are still being made. Please wait."),
  alreadyHasQuestions: () =>
    new AppError(409, "ALREADY_HAS_QUESTIONS", "This lesson already has questions."),
  markedNotChecked: () => new AppError(409, "MARKED_NOT_CHECKED", "Please check the marked questions first."),
  noQuestions: () => new AppError(409, "NO_QUESTIONS", "This lesson has no questions yet."),

  // Archive and Delete
  archiveFirst: () => new AppError(409, "ARCHIVE_FIRST", "Students played this lesson. Archive it instead."),
  confirmNeeded: () => new AppError(400, "CONFIRM_NEEDED", "Please tick the box to confirm."),

  // Making questions
  notEnoughText: () =>
    new AppError(422, "NOT_ENOUGH_TEXT", "This file does not have enough text to make questions."),
  badRequest: (message: string) => new AppError(400, "BAD_REQUEST", message),
  tooManyGames: () => new AppError(400, "TOO_MANY_GAMES", "Please pick up to 2 games."),
  aiBusy: () => new AppError(503, "AI_BUSY", "The AI is busy right now. Please try again in a few minutes."),
  noGoodQuestions: () =>
    new AppError(
      422,
      "NO_GOOD_QUESTIONS",
      "We could not make good questions from this lesson. Try a file with more text.",
    ),
  // Stored on a lesson that was still "making" when the server stopped (Render's free server can sleep or restart).
  serverRestarted: () =>
    new AppError(500, "SERVER_RESTARTED", "The server restarted while making questions. Please try again."),

  // The database
  dbUnavailable: () =>
    new AppError(503, "DB_UNAVAILABLE", "We can't reach the saved lessons right now. Please try again in a minute."),
};

const SERVER_ERROR_MESSAGE = "Something went wrong on the server. Please try again.";

/** The Teacher-friendly message for a stored error code (a failed lesson keeps only the code). */
export function messageForCode(code: string): string {
  for (const make of Object.values(lessonErrors)) {
    const error = make("");
    if (error.code === code) return error.message;
  }
  return SERVER_ERROR_MESSAGE;
}
