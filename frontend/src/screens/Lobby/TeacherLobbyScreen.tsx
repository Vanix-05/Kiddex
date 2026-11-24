import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { TEMPLATE_FOR_TYPE } from '../../content/questionCard'
import { GAMES, xpFor } from '../../games/session'
import { makeBoard, noMission, soonestAssignment } from '../../games/studentData'
import { sectionKeys, sectionsApi } from '../../teacher/api/sectionsApi'
import { useLessonLoad, useSection } from '../../teacher/data/useTeacherData'
import type { Classmate, Mission, StudentProgress } from './lobbyData'
import { MainLobby } from './MainLobby'
import { OpeningClassroom } from './OpeningClassroom'
import { lobbyDataFrom } from './useLobbyData'

// FAKE: comes from the server when the backend is connected (the section's
// Students who are in the classroom right now). Empty for now: no multiplayer yet.
const STUDENTS_IN_ROOM: Classmate[] = []

/** The Teacher's view shows no Student numbers (its top bar has none anyway). */
const NO_PROGRESS: StudentProgress = { level: 1, xp: 0, xpGoal: 300, stars: 0, streakDays: 0 }

/**
 * The Teacher's view-only visit to a section's classroom (/teacher/lobby,
 * full screen over the planner). The same Lobby as the Students', with the
 * Teacher as Ollie (MainLobby's `viewer`). It never calls the Student address:
 * the mission is the section's assignment with the soonest due date (nothing
 * done), and the chalkboard comes from that lesson's approved questions.
 */
export function TeacherLobbyScreen({ teacherName, section, onBack }: { teacherName: string; section: string; onBack: () => void }) {
  const { active } = useSection()
  const sectionId = active?.id ?? ''
  const assignments = useQuery({
    queryKey: sectionKeys.assignments(sectionId),
    queryFn: () => sectionsApi.assignments(sectionId),
    enabled: !!sectionId,
  })
  const pick = soonestAssignment(assignments.data ?? [])
  const { lesson, loading } = useLessonLoad(pick?.lessonId)

  const mission = useMemo((): Mission => {
    if (!pick || !lesson) return noMission(teacherName, (assignments.data?.length ?? 0) > 0)
    const approved = lesson.questions.filter((q) => q.status === 'approved')
    const count = (game: (typeof pick.games)[number]) => approved.filter((q) => TEMPLATE_FOR_TYPE[q.type] === game).length
    return {
      state: 'open',
      assignmentId: pick.id,
      lessonId: pick.lessonId,
      name: pick.name,
      lessonTitle: lesson.title,
      subject: lesson.subject,
      teacher: teacherName,
      dueDate: pick.dueDate,
      games: pick.games,
      done: [],
      bestStars: {},
      maxXp: pick.games.reduce((sum, g) => sum + xpFor(Math.min(GAMES[g].roundSize, count(g))), 0),
      board: makeBoard(lesson.questions),
      hasLessons: true,
    }
  }, [pick, lesson, teacherName, assignments.data])

  const data = useMemo(() => ({ ...lobbyDataFrom(NO_PROGRESS, mission), classmates: STUDENTS_IN_ROOM }), [mission])
  const viewer = useMemo(() => ({ name: teacherName, section, onBack }), [teacherName, section, onBack])

  // Wait for the mission, so the room's chalkboard is written once.
  if ((sectionId && assignments.isPending) || (pick && loading)) return <OpeningClassroom />
  return <MainLobby viewer={viewer} data={data} />
}
