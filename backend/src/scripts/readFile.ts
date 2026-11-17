// `npm run read-file -- "C:\path\to\lesson.pdf"`: reads a lesson file with the same
// readLessonFile the upload address uses, and prints what it found.
// This is the only place where lesson text may be printed.
import { readFile } from "node:fs/promises";
import path from "node:path";
import { AppError } from "../middleware/AppError";
import { readLessonFile } from "../lessons/readLessonFile";

async function main(): Promise<void> {
  const filePath = process.argv[2];
  if (!filePath) {
    console.log('Usage: npm run read-file -- "C:\\path\\to\\lesson.pdf"');
    process.exitCode = 1;
    return;
  }

  try {
    const buffer = await readFile(filePath);
    const lesson = await readLessonFile(buffer, path.basename(filePath));
    const unitWord = lesson.unitLabel === "slide" ? "Slides" : "Pages";

    console.log(`File type:        ${lesson.fileType}`);
    console.log(`${`${unitWord}:`.padEnd(18)}${lesson.unitCount}${lesson.unitCountIsEstimate ? " (estimate)" : ""}`);
    console.log(`Words:            ${lesson.wordCount}`);
    console.log(`Tables read:      ${lesson.tablesRead ?? "unknown"}`);
    console.log(`Pictures skipped: ${lesson.picturesSkipped ?? "unknown"}`);
    console.log(`Text level:       ${lesson.textLevel} (at least ${lesson.minWords} words needed)`);

    for (const unit of lesson.units) {
      const preview = unit.text.length > 200 ? `${unit.text.slice(0, 200)}...` : unit.text;
      console.log(`\n--- ${lesson.unitLabel} ${unit.number} ---`);
      console.log(preview || "(no text)");
    }
  } catch (err) {
    if (err instanceof AppError) {
      console.log(`${err.code}: ${err.message}`);
    } else if ((err as NodeJS.ErrnoException)?.code === "ENOENT") {
      console.log("File not found. Check the path.");
    } else {
      console.log("Could not read the file:", err);
    }
    process.exitCode = 1;
  }
}

main();
