/** What the Lobby shows. The shapes the backend will send (see useLobbyData.ts). */
import type { GameId } from '../../games/types'
import type { Avatar } from '../../setup/avatar'
import type { Look } from '../../setup/customizeData'
import type { BuddyId } from '../../setup/quizData'

export interface StudentProgress {
  /** The Student's first name, for their card and name tag. */
  name: string
  level: number
  xp: number
  /** XP that fills the bar (reaching the next level). */
  xpGoal: number
  stars: number
  streakDays: number
}

export interface Classmate {
  id: string
  name: string
  avatar: Avatar
  look: Look
  buddy: BuddyId
  buddyName: string
  level: number
  badges: number
}

export interface Mission {
  /** The lesson the mission games use (the game chip shows its name, = title). */
  lessonId: string
  teacher: string
  title: string
  subject: string
  /** How many games (the first ones of MISSION_GAMES, games/mission.ts). 0: no mission today. */
  games: number
  /** Mission games finished today for this lesson. */
  gamesDone: number
  /** Which ones (the same count as gamesDone). */
  done: GameId[]
  due: string
  xp: number
  stars: number
  /** Today's lesson, as written on the chalkboard card. */
  lesson: { icon: string; word: string; text: string }[]
}

export interface LobbyData {
  student: StudentProgress
  classmates: Classmate[]
  mission: Mission
  /** Short lines Ollie's speech bubble rotates through. */
  ollieLines: string[]
}
