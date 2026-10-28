/** All route paths in one place, so links never drift out of sync. */
export const paths = {
  welcome: '/',
  register: '/register',
  /** Companion setup, for learners with no buddy yet. */
  setup: '/setup',
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
