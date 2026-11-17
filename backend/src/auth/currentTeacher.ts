// Who is asking. For now every request belongs to one demo Teacher.
// Real login replaces this later: then the id comes from the signed-in Teacher.
import type { Request } from "express";

export const DEMO_TEACHER_ID = "demo-teacher";

export function currentTeacherId(_req?: Request): string {
  return DEMO_TEACHER_ID;
}
