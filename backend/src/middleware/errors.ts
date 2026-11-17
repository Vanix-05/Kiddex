// 404 and error handlers. Every error answer has the same JSON shape:
// { error: { code, message } }. Messages are short and safe to show a Teacher;
// the full details are only written to the server console.
import type { ErrorRequestHandler, RequestHandler } from "express";
import { AppError } from "./AppError";

export const notFound: RequestHandler = (_req, res) => {
  res.status(404).json({
    error: { code: "NOT_FOUND", message: "This page or address does not exist." },
  });
};

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  // Errors we expected: answer with their own code and message.
  if (err instanceof AppError) {
    const cause = err.cause instanceof Error ? ` (${err.cause.name}: ${err.cause.message})` : "";
    console.warn(`[${err.code}] ${req.method} ${req.originalUrl}${cause}`);
    if (!res.headersSent) res.status(err.status).json({ error: { code: err.code, message: err.message } });
    return;
  }

  // Bad JSON sent by the browser (from express.json()).
  if (err?.type === "entity.parse.failed") {
    res.status(400).json({
      error: { code: "BAD_JSON", message: "The data sent was not readable. Please try again." },
    });
    return;
  }
  if (err?.type === "entity.too.large") {
    res.status(413).json({
      error: { code: "TOO_LARGE", message: "The data sent was too large." },
    });
    return;
  }

  console.error(`[error] ${req.method} ${req.originalUrl}`, err);
  if (res.headersSent) return;
  res.status(500).json({
    error: { code: "SERVER_ERROR", message: "Something went wrong on the server. Please try again." },
  });
};
