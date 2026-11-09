import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { SessionContext, isRole, type SessionState, type SetupResult, type User } from './session'
import type { Look } from '../setup/customizeData'
import { isAvatar } from '../setup/avatar'
import { cleanLook } from '../setup/customizeData'

const STORAGE_KEY = 'kiddex.session'

const EMPTY: SessionState = {
  user: null,
  companionId: null,
  avatar: null,
  buddyName: null,
  look: {},
  seenBridgeCutscene: false,
}

/** A saved user we still understand (roles from older versions are not). */
const isUser = (u: unknown): u is User =>
  !!u && typeof (u as User).username === 'string' && isRole((u as User).role)

// Keeps the mock session across page reloads during development.
function loadSession(): SessionState {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (raw) {
      // Older saved sessions may have other fields; only keep what we use.
      const saved = JSON.parse(raw) as Partial<SessionState>
      // A user with an old or unknown role: start fresh (logged out).
      if (saved.user && !isUser(saved.user)) return EMPTY
      return {
        user: saved.user ?? null,
        companionId: saved.companionId ?? null,
        avatar: isAvatar(saved.avatar) ? saved.avatar : null,
        buddyName: saved.buddyName ?? null,
        look: cleanLook(saved.look),
        seenBridgeCutscene: saved.seenBridgeCutscene === true,
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
 * FAKE authentication for now (no backend yet):
 * - any email + password logs a Teacher in
 * - any 8-digit School ID + 6-digit one-time code + 4-digit PIN code starts
 *   a new Student (New Student notebook pages), with no buddy yet
 * Returning Student "Log in" is still a TODO (StudentFlow.tsx).
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

  const logInTeacher = useCallback(
    async (email: string, password: string): Promise<User> => {
      await fakeDelay()
      if (!email.trim() || !password) throw new Error('Please enter your email and password.')
      const user: User = { username: email.trim(), role: 'teacher' }
      update({ ...EMPTY, user })
      return user
    },
    [update],
  )

  // TODO: replace with the backend call that checks the School ID + one-time
  // code and saves the new PIN code.
  const logInNewStudent = useCallback(
    (schoolId: string) => {
      const user: User = { username: schoolId, role: 'student' }
      update({ ...EMPTY, user })
    },
    [update],
  )

  const finishSetup = useCallback(
    ({ avatar, buddy, nickname }: SetupResult) => {
      // TODO: save to the backend once the API exists.
      update({ companionId: buddy, avatar, buddyName: nickname || null })
    },
    [update],
  )

  // TODO: save to the backend once the API exists (the look and the buddy's name).
  const saveLook = useCallback((look: Look) => update({ look }), [update])
  const renameBuddy = useCallback((name: string) => update({ buddyName: name.trim() || null }), [update])

  // TODO: save to the backend once the API exists.
  const markBridgeCutsceneSeen = useCallback(() => update({ seenBridgeCutscene: true }), [update])

  const logOut = useCallback(() => update(EMPTY), [update])

  const value = useMemo(
    () => ({ ...state, logInTeacher, logInNewStudent, finishSetup, saveLook, renameBuddy, markBridgeCutsceneSeen, logOut }),
    [state, logInTeacher, logInNewStudent, finishSetup, saveLook, renameBuddy, markBridgeCutsceneSeen, logOut],
  )

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}
