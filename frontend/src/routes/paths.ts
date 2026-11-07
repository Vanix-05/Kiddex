/** All route paths in one place, so links never drift out of sync. */
export const paths = {
  welcome: '/',
  register: '/register',
  /** First-time setup, for learners with no buddy yet: quiz -> gender -> pet. */
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
  learner: {
    code: '/learner/code',
    who: '/learner/who',
    pin: '/learner/pin',
    home: '/learner',
  },
  educator: {
    login: '/educator/login',
    home: '/educator',
  },
} as const
