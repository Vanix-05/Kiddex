// Builds the Express app: CORS, JSON body, routes and error handling.
// It does not start listening; src/index.ts does that.
import express from "express";
import cors from "cors";
import { env } from "./config/env";
import { healthRouter } from "./routes/health";
import { lessonsRouter } from "./routes/lessons";
import { questionsRouter } from "./routes/questions";
import { errorHandler, notFound } from "./middleware/errors";

export const app = express();

// Only the KIDDEX frontend may call this API from a browser.
app.use(cors({ origin: env.frontendUrl }));
app.use(express.json({ limit: "1mb" }));

app.use(healthRouter);
app.use(lessonsRouter);
app.use(questionsRouter);

// These two must stay last.
app.use(notFound);
app.use(errorHandler);
