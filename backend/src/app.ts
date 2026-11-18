// Builds the Express app: CORS, JSON body, routes and error handling.
// It does not start listening; src/index.ts does that.
import express from "express";
import cors from "cors";
import { env } from "./config/env";
import { requireTeacher } from "./auth/requireTeacher";
import { authRouter } from "./routes/auth";
import { healthRouter } from "./routes/health";
import { lessonsRouter } from "./routes/lessons";
import { questionsRouter } from "./routes/questions";
import { errorHandler, notFound } from "./middleware/errors";

export const app = express();

// The real server (Render) sits behind one proxy. Trust exactly that one, so
// req.ip is the visitor's address (the login limit per computer needs it).
app.set("trust proxy", 1);

// Only the KIDDEX frontend may call this API from a browser.
app.use(cors({ origin: env.frontendUrl }));
app.use(express.json({ limit: "1mb" }));

// Open: "/", /api/health and the login address.
app.use(healthRouter);
app.use(authRouter);

// Everything about lessons and questions needs a logged-in Teacher. This runs
// before the routes, so a file upload without a login is never read.
app.use(["/api/lessons", "/api/questions"], requireTeacher);
app.use(lessonsRouter);
app.use(questionsRouter);

// These two must stay last.
app.use(notFound);
app.use(errorHandler);
