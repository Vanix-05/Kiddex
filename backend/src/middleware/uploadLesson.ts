// Receives one lesson file (form field "file") into memory only; nothing is written to disk.
// Multer's own errors are turned into our friendly lesson errors.
import type { RequestHandler } from "express";
import multer from "multer";
import { lessonErrors } from "../lessons/lessonErrors";
import { MAX_FILE_MB } from "../lessons/limits";

const upload = multer({
  storage: multer.memoryStorage(),
  defParamCharset: "utf8", // browsers send file names as UTF-8 (e.g. "Fracciones-Año.pdf")
  limits: { fileSize: MAX_FILE_MB * 1024 * 1024, files: 1, fields: 10 },
}).single("file");

export const uploadLesson: RequestHandler = (req, res, next) => {
  upload(req, res, (err: unknown) => {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") return next(lessonErrors.fileTooBig());
      if (err.code === "LIMIT_FILE_COUNT") return next(lessonErrors.oneFileOnly());
      // A second file, or a file sent under another field name.
      if (err.code === "LIMIT_UNEXPECTED_FILE") {
        return next(err.field === "file" ? lessonErrors.oneFileOnly() : lessonErrors.noFile());
      }
    }
    next(err);
  });
};
