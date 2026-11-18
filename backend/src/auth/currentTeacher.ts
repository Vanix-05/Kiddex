// Who is asking: the Teacher that requireTeacher found from the login token.
import type { Request } from "express";

export function currentTeacherId(req: Request): string {
  if (!req.teacher) {
    // A programmer mistake, not a user one: the route forgot requireTeacher.
    throw new Error("currentTeacherId() was called on a route without requireTeacher. Add requireTeacher before this route.");
  }
  return req.teacher.id;
}
