import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { SessionContext, type SessionState, type SetupResult, type User } from './session'
import { findClass, findLearner, saveLearnerSetup } from '../mock/learners'
import { isAvatar } from '../setup/avatar'

const STORAGE_KEY = 'kiddex.session'

const EMPTY: SessionState = {
  user: null,
  companionId: null,
  avatar: null,
  buddyName: null,
  classCode: null,
  learnerId: null,
}

// Keeps the mock session across page reloads during development.
function loadSession(): SessionState {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (raw) {
      // Older saved sessions may have other fields; only keep what we use.
      const saved = JSON.parse(raw) as Partial<SessionState>
      return {
        user: saved.user ?? null,
        companionId: saved.companionId ?? null,
        avatar: isAvatar(saved.avatar) ? saved.avatar : null,
        buddyName: saved.buddyName ?? null,
        classCode: saved.classCode ?? null,
        learnerId: saved.learnerId ?? null,
      }
    }
  } catch {
    // Storage unavailable or corrupted: start fresh.
  }
  return EMPTY
}

function saveSession(state: SessionState) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Ignore: the session just won't survive a reload.
  }
}

const fakeDelay = () => new Promise((resolve) => setTimeout(resolve, 300))

/**
 * FAKE authentication for now (see src/mock/learners.ts):
 * - any email + password logs an educator in
 * - any 6-character class code opens the test class
 * - any 4-digit PIN logs the picked learner in
 * TODO: replace with real calls to the backend auth endpoints.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>(loadSession)

  const update = useCallback((patch: Partial<SessionState>) => {
    setState((prev) => {
      const next = { ...prev, ...patch }
      saveSession(next)
      return next
    })
  }, [])

  const logInEducator = useCallback(
    async (email: string, password: string): Promise<User> => {
      await fakeDelay()
      if (!email.trim() || !password) throw new Error('Please enter your email and password.')
      const user: User = { username: email.trim(), role: 'educator' }
      update({ user, companionId: null, avatar: null, buddyName: null })
      return user
    },
    [update],
  )

  const enterClassCode = useCallback(
    (code: string) => {
      const found = findClass(code)
      if (found) update({ classCode: code.toUpperCase(), learnerId: null })
      return !!found
    },
    [update],
  )

  const pickLearner = useCallback((learnerId: string) => update({ learnerId }), [update])

  const logInLearner = useCallback(
    async (pin: string): Promise<User> => {
      await fakeDelay()
      if (!/^\d{4}$/.test(pin)) throw new Error('Type all 4 numbers.')
      const learner = findLearner(state.classCode, state.learnerId)
      if (!learner) throw new Error('Please pick who you are first.')
      const user: User = { username: learner.handle, role: 'learner' }
      update({
        user,
        companionId: learner.buddy,
        avatar: learner.avatar,
        buddyName: learner.nickname || null,
      })
      return user
    },
    [state.classCode, state.learnerId, update],
  )

  const finishSetup = useCallback(
    ({ avatar, buddy, nickname }: SetupResult) => {
      // TODO: save to the backend once the API exists.
      if (state.learnerId) saveLearnerSetup(state.learnerId, { avatar, buddy, nickname })
      update({ companionId: buddy, avatar, buddyName: nickname || null })
    },
    [state.learnerId, update],
  )

  const logOut = useCallback(() => update(EMPTY), [update])

  const value = useMemo(
    () => ({ ...state, logInEducator, enterClassCode, pickLearner, logInLearner, finishSetup, logOut }),
    [state, logInEducator, enterClassCode, pickLearner, logInLearner, finishSetup, logOut],
  )

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}
