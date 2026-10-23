/** All route paths in one place, so links never drift out of sync. */
export const paths = {
  login: '/login',
  register: '/register',
  learner: {
    chooseCompanion: '/learner/setup/companion',
    home: '/learner',
  },
  educator: {
    home: '/educator',
  },
} as const
