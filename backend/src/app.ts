// Builds the Express app: CORS, JSON body, routes and error handling.
// It does not start listening; src/index.ts does that.
import express from "express";
import cors from "cors";
import { env } from "./config/env";
import { requireTeacher } from "./auth/requireTeacher";
import { adminRouter } from "./routes/admin";
import { authRouter } from "./routes/auth";
import { healthRouter } from "./routes/health";
import { lessonsRouter } from "./routes/lessons";
import { questionsRouter } from "./routes/questions";
import { errorHandler, notFound } from "./middleware/errors";

export const app = express();

// The real server (Render) sits behind one proxy. Trust exactly that one, so
// req.ip is the visitor's address (the login limit per computer needs it).
app.set("trust proxy", 1);

// No "X-Powered-By: Express" header.
app.disable("x-powered-by");

// Only the KIDDEX website addresses in FRONTEND_URL may call this API from a
// browser. Any other site gets no CORS headers, so the browser blocks it.
app.use(
  cors({
    origin: env.frontendOrigins,
    allowedHeaders: ["Authorization", "Content-Type"],
    // How long a browser may remember the preflight answer (10 minutes).
    maxAge: 600,
  }),
);
app.use(express.json({ limit: "1mb" }));

// Open: "/", /api/ping, /api/health and the two login addresses.
app.use(healthRouter);
app.use(authRouter);
// The Admin page (Teacher accounts). Everything but its login needs requireAdmin.
app.use(adminRouter);

// Everything about lessons and questions needs a logged-in Teacher. This runs
// before the routes, so a file upload without a login is never read.
app.use(["/api/lessons", "/api/questions"], requireTeacher);
app.use(lessonsRouter);
app.use(questionsRouter);

// These two must stay last.
app.use(notFound);
app.use(errorHandler);
