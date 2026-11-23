// Today's mission: which assignment the Lobby puts first. Pure function: no database.
import type { TemplateId } from "../content/questionCard";
import { phDay } from "./streak";

export interface MissionCandidate {
  assignmentId: string;
  dueDate: Date | null;
  /** When the assignment was made (newest wins a tie). */
  createdAt: Date;
  /** Its playable games, in the usual order. */
  games: readonly TemplateId[];
  /** Which of those are done (a round with countsForMission exists). */
  done: readonly TemplateId[];
  /** When the last of its done games was finished, or null. */
  lastDoneAt: Date | null;
}

export interface MissionPick {
  assignmentId: string;
  state: "open" | "complete";
}

const isOpen = (a: MissionCandidate) => a.games.some((g) => !a.done.includes(g));

/**
 * - Open = at least one playable game not done. Overdue ones still count.
 * - The mission is the open one with the soonest due date (no due date goes last);
 *   a tie goes to the newest.
 * - None open: the one whose last game was finished today (Philippine time) shows as
 *   complete. Otherwise no mission (null).
 */
export function pickMission(assignments: readonly MissionCandidate[], today: string): MissionPick | null {
  const open = assignments.filter(isOpen);
  if (open.length) {
    const due = (a: MissionCandidate) => a.dueDate?.getTime() ?? Number.POSITIVE_INFINITY;
    const [first] = [...open].sort((a, b) => due(a) - due(b) || b.createdAt.getTime() - a.createdAt.getTime());
    return { assignmentId: first!.assignmentId, state: "open" };
  }
  const finishedToday = assignments
    .filter((a) => a.games.length > 0 && a.lastDoneAt && phDay(a.lastDoneAt) === today)
    .sort((a, b) => b.lastDoneAt!.getTime() - a.lastDoneAt!.getTime());
  return finishedToday[0] ? { assignmentId: finishedToday[0].assignmentId, state: "complete" } : null;
}
