// readLessonFile: checks what kind of file it really is, picks the right reader,
// cleans the text and adds the counts. Used by the upload address and by `npm run read-file`.
import path from "node:path";
import JSZip from "jszip";
import { AppError } from "../middleware/AppError";
import { cleanText, countWords } from "./cleanText";
import { lessonErrors } from "./lessonErrors";
import { LOW_TEXT_WORDS, MIN_WORDS_TO_MAKE_QUESTIONS, WORDS_PER_PAGE_ESTIMATE } from "./limits";
import { readDocx } from "./readers/readDocx";
import { readPdf } from "./readers/readPdf";
import { readPptx } from "./readers/readPptx";
import type { ReaderResult } from "./readers/types";

export type LessonFileType = "pdf" | "docx" | "pptx";
export type TextLevel = "none" | "low" | "ok";

export interface LessonText {
  fileType: LessonFileType;
  unitLabel: "page" | "slide";
  unitCount: number;
  unitCountIsEstimate: boolean;
  wordCount: number;
  tablesRead: number | null;
  picturesSkipped: number | null;
  textLevel: TextLevel;
  minWords: number;
  units: { number: number; text: string }[];
}

const PDF_START = Buffer.from("%PDF");
const ZIP_START = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
const OLD_OFFICE_START = Buffer.from([0xd0, 0xcf, 0x11, 0xe0]); // .doc / .ppt (and renamed ones)

export async function readLessonFile(buffer: Buffer, fileName: string): Promise<LessonText> {
  const extension = path.extname(fileName).toLowerCase();
  if (extension === ".doc" || extension === ".ppt") throw lessonErrors.oldFormat();
  if (extension !== ".pdf" && extension !== ".docx" && extension !== ".pptx") throw lessonErrors.wrongType();
  const fileType = extension.slice(1) as LessonFileType;

  let raw: ReaderResult;
  try {
    raw = await runReader(fileType, buffer);
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw Object.assign(lessonErrors.cantRead(), { cause: err });
  }

  const units = raw.units.map((text, index) => ({ number: index + 1, text: cleanText(text) }));
  const wordCount = units.reduce((sum, unit) => sum + countWords(unit.text), 0);
  const isWord = fileType === "docx";

  return {
    fileType,
    unitLabel: fileType === "pptx" ? "slide" : "page",
    unitCount: isWord ? Math.max(1, Math.ceil(wordCount / WORDS_PER_PAGE_ESTIMATE)) : units.length,
    unitCountIsEstimate: isWord,
    wordCount,
    tablesRead: raw.tablesRead,
    picturesSkipped: raw.picturesSkipped,
    textLevel: wordCount < MIN_WORDS_TO_MAKE_QUESTIONS ? "none" : wordCount < LOW_TEXT_WORDS ? "low" : "ok",
    minWords: MIN_WORDS_TO_MAKE_QUESTIONS,
    units,
  };
}

// Checks the first bytes (and for Office files, the zip contents) so a renamed file is rejected.
async function runReader(fileType: LessonFileType, buffer: Buffer): Promise<ReaderResult> {
  if (fileType === "pdf") {
    if (!startsWith(buffer, PDF_START)) throw lessonErrors.wrongType();
    return readPdf(buffer);
  }

  if (startsWith(buffer, OLD_OFFICE_START)) throw lessonErrors.oldFormat();
  if (!startsWith(buffer, ZIP_START)) throw lessonErrors.wrongType();

  const zip = await JSZip.loadAsync(buffer); // a broken zip ends up as CANT_READ
  if (fileType === "docx") {
    if (!zip.file("word/document.xml")) throw lessonErrors.wrongType();
    return readDocx(buffer, zip);
  }
  if (!zip.file("ppt/presentation.xml")) throw lessonErrors.wrongType();
  return readPptx(zip);
}

function startsWith(buffer: Buffer, start: Buffer): boolean {
  return buffer.length >= start.length && buffer.subarray(0, start.length).equals(start);
}
