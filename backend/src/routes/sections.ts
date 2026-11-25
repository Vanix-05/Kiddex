// Section and Student addresses for the Teacher screens (all need requireTeacher):
//   GET  /api/sections                         my sections, oldest first, with Student counts
//   POST /api/sections                         { grade, name } → 201 { section }
//   GET  /api/sections/:sectionId/students     the section's Students, School ID order
//   POST /api/sections/:sectionId/students     { schoolIds } → 201 { added, skipped }
//   POST /api/students/:studentId/new-code     a new one-time code → { student }
//   GET  /api/students/:studentId/levels       the Student's level per topic and why (step 8)
// A Teacher only ever sees their own: another Teacher's section is 404 SECTION_NOT_FOUND.
// Students have NO names. Only counts are logged, never School IDs or codes.
import { Router } from "express";
import { z } from "zod";
import { currentTeacherId } from "../auth/currentTeacher";
import { MAX_GRADE, MAX_SECTION_NAME, MAX_STUDENTS_PER_SECTION, MIN_GRADE } from "../sections/limits";
import { sectionErrors } from "../sections/sectionErrors";
import { studentLevels } from "../store/levelStore";
import { addStudents, createSection, listSections, listStudents, makeNewCode } from "../store/sectionStore";

export const sectionsRouter = Router();

const gradeMessage = `The grade must be a whole number from ${MIN_GRADE} to ${MAX_GRADE}.`;
const nameMessage = "Please type the section’s name.";

const NewSectionSchema = z.object({
  grade: z.number({ error: gradeMessage }).int(gradeMessage).min(MIN_GRADE, gradeMessage).max(MAX_GRADE, gradeMessage),
  name: z
    .string({ error: nameMessage })
    .trim()
    .min(1, nameMessage)
    .max(MAX_SECTION_NAME, `The section’s name can be at most ${MAX_SECTION_NAME} characters.`),
});

const AddStudentsSchema = z.object({
  schoolIds: z
    .array(z.string({ error: "Each School ID must be text." }).max(40, "A School ID is too long."), {
      error: "Please send a list of School IDs.",
    })
    .min(1, "Please add at least one School ID.")
    .max(MAX_STUDENTS_PER_SECTION, `Please add at most ${MAX_STUDENTS_PER_SECTION} School IDs at a time.`),
});

function parse<T>(schema: z.ZodType<T>, body: unknown): T {
  const parsed = schema.safeParse(body ?? {});
  if (!parsed.success) {
    throw sectionErrors.badRequest(parsed.error.issues[0]?.message ?? "Something in the request is missing.");
  }
  return parsed.data;
}

sectionsRouter.get("/api/sections", async (req, res) => {
  res.json(await listSections(currentTeacherId(req)));
});

sectionsRouter.post("/api/sections", async (req, res) => {
  const { grade, name } = parse(NewSectionSchema, req.body);
  const section = await createSection(currentTeacherId(req), grade, name);
  console.log("[sections] section made");
  res.status(201).json({ section });
});

sectionsRouter.get("/api/sections/:sectionId/students", async (req, res) => {
  res.json(await listStudents(currentTeacherId(req), req.params.sectionId));
});

// A new one-time code for one of my Students. Never logs the School ID or the code.
sectionsRouter.post("/api/students/:studentId/new-code", async (req, res) => {
  const student = await makeNewCode(currentTeacherId(req), req.params.studentId);
  console.log("[students] new login code made");
  res.json({ student });
});

// The Student's levels per topic, worked out by fixed rules (not AI). Only right / helped
// per answer is sent, never the questions. Another Teacher's Student: 404 STUDENT_NOT_FOUND.
sectionsRouter.get("/api/students/:studentId/levels", async (req, res) => {
  res.json(await studentLevels(currentTeacherId(req), req.params.studentId));
});

sectionsRouter.post("/api/sections/:sectionId/students", async (req, res) => {
  const { schoolIds } = parse(AddStudentsSchema, req.body);
  const answer = await addStudents(currentTeacherId(req), req.params.sectionId, schoolIds);
  console.log(`[sections] students added: ${answer.added.length}, skipped: ${answer.skipped.length}`);
  res.status(201).json(answer);
});
