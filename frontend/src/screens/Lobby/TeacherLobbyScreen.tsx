import { useMemo } from 'react'
import type { Classmate } from './lobbyData'
import { MainLobby } from './MainLobby'
import { useLobbyData } from './useLobbyData'

// FAKE: comes from the server when the backend is connected (the section's
// Students who are in the classroom right now). Empty for now: no multiplayer yet.
const STUDENTS_IN_ROOM: Classmate[] = []

/**
 * The Teacher's view-only visit to a section's classroom (/teacher/lobby,
 * full screen over the planner). The same Lobby as the Students', with the
 * Teacher as Ollie (MainLobby's `viewer`).
 */
export function TeacherLobbyScreen({ teacherName, section, onBack }: { teacherName: string; section: string; onBack: () => void }) {
  const lobby = useLobbyData()
  const data = useMemo(() => ({ ...lobby, classmates: STUDENTS_IN_ROOM }), [lobby])
  const viewer = useMemo(() => ({ name: teacherName, section, onBack }), [teacherName, section, onBack])
  return <MainLobby viewer={viewer} data={data} />
}
