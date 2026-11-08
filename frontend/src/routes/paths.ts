/** All route paths in one place, so links never drift out of sync. */
export const paths = {
  /** Welcome card: "I'm a Student" (popup + notebook pages) or "I'm a Teacher". */
  welcome: '/',
  /** First-time setup, for students with no buddy yet: quiz -> gender -> reveal -> pet. */
  setup: {
    quiz: '/setup',
    gender: '/setup/gender',
    reveal: '/setup/reveal',
    pet: '/setup/pet',
  },
  /** After the first-time setup: dress up you and your buddy, then sail to the Lobby. */
  customize: '/customize',
  /** Rene Island, the class Lobby (placeholder for now). */
  lobby: '/lobby',
  /** Teacher Login, and the Teacher Dashboard (the planner). Lessons steps: /teacher/lessons/:id/making|check|games */
  teacher: {
    login: '/teacher/login',
    home: '/teacher',
    lessons: '/teacher/lessons',
    students: '/teacher/students',
    progress: '/teacher/progress',
    lobby: '/teacher/lobby',
  },
} as const
