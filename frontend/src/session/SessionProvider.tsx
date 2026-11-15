import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { SessionContext, isRole, type SessionState, type SetupResult, type User } from './session'
import type { Look } from '../setup/customizeData'
import { isAvatar } from '../setup/avatar'
import { cleanLook } from '../setup/customizeData'
import { isBuddyId } from '../setup/quizData'
import { FAKE_RETURNING_STUDENT } from '../mock/studentMock'

const STORAGE_KEY = 'kiddex.session'

const EMPTY: SessionState = {
  user: null,
  companionId: null,
  avatar: null,
  buddyName: null,
  look: {},
  seenBridgeCutscene: false,
  seenIntroClip: false,
  seenLoadingVideo: false,
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
        seenIntroClip: saved.seenIntroClip === true,
        seenLoadingVideo: saved.seenLoadingVideo === true,
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

// FAKE: delete when the backend is connected (it keeps each Student's kid and buddy).
// The Student's kid, buddy and look, kept in this browser after the New
// Student flow (setup + Customize), so a Returning Student who logs in here
// later gets them back. Survives logging out (the session doesn't).
const SAVED_STUDENT_KEY = 'kiddex.savedStudent'
type SavedStudent = Pick<SessionState, 'avatar' | 'companionId' | 'buddyName' | 'look'>

function saveStudentLook(state: SessionState) {
  if (state.user?.role !== 'student' || !state.avatar || !state.companionId) return
  const saved: SavedStudent = { avatar: state.avatar, companionId: state.companionId, buddyName: state.buddyName, look: state.look }
  try {
    localStorage.setItem(SAVED_STUDENT_KEY, JSON.stringify(saved))
  } catch {
    // Ignore: a Returning Student gets the default look instead.
  }
}

/** The look saved in this browser, or the default one (girl + pink fox "Mochi"). */
function returningStudentLook(): SavedStudent {
  try {
    const saved = JSON.parse(localStorage.getItem(SAVED_STUDENT_KEY) ?? 'null') as Partial<SavedStudent> | null
    if (saved && isAvatar(saved.avatar) && isBuddyId(saved.companionId)) {
      return {
        avatar: saved.avatar,
        companionId: saved.companionId,
        buddyName: typeof saved.buddyName === 'string' ? saved.buddyName : null,
        look: cleanLook(saved.look),
      }
    }
  } catch {
    // Unreadable: use the default.
  }
  return { ...FAKE_RETURNING_STUDENT }
}

const fakeDelay = () => new Promise((resolve) => setTimeout(resolve, 300))

/**
 * FAKE authentication for now (no backend yet):
 * - any email + password logs a Teacher in
 * - any 8-digit School ID + 6-digit one-time code + 4-digit PIN code starts
 *   a new Student (New Student notebook pages), with no buddy yet
 * - any 8-digit School ID + 4-digit PIN code logs a Returning Student in,
 *   with the kid and buddy saved in this browser (or a default one)
 * TODO: replace with real calls to the backend auth endpoints.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>(loadSession)

  /** `keepLook`: the New Student flow changed the kid or buddy, so keep them in this browser too. */
  const update = useCallback((patch: Partial<SessionState>, keepLook = false) => {
    setState((prev) => {
      const next = { ...prev, ...patch }
      saveSession(next)
      if (keepLook) saveStudentLook(next)
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

  // TODO: replace with the backend call that checks the School ID + PIN code
  // and sends the Student's kid, buddy and look.
  const logInReturningStudent = useCallback(
    (schoolId: string) => {
      const user: User = { username: schoolId, role: 'student' }
      // They made their buddy before: no setup, intro clip or bridge cutscene.
      // The loading video plays once, as the Lobby opens (seenLoadingVideo false).
      update({ ...EMPTY, ...returningStudentLook(), user, seenBridgeCutscene: true, seenIntroClip: true })
    },
    [update],
  )

  const finishSetup = useCallback(
    ({ avatar, buddy, nickname }: SetupResult) => {
      // TODO: save to the backend once the API exists.
      update({ companionId: buddy, avatar, buddyName: nickname || null }, true)
    },
    [update],
  )

  // TODO: save to the backend once the API exists (the look and the buddy's name).
  const saveLook = useCallback((look: Look) => update({ look }, true), [update])
  const renameBuddy = useCallback((name: string) => update({ buddyName: name.trim() || null }, true), [update])

  // TODO: save to the backend once the API exists.
  const markBridgeCutsceneSeen = useCallback(() => update({ seenBridgeCutscene: true }), [update])
  const markIntroClipSeen = useCallback(() => update({ seenIntroClip: true }), [update])
  const markLoadingVideoSeen = useCallback(() => update({ seenLoadingVideo: true }), [update])

  const logOut = useCallback(() => update(EMPTY), [update])

  const value = useMemo(
    () => ({
      ...state,
      logInTeacher,
      logInNewStudent,
      logInReturningStudent,
      finishSetup,
      saveLook,
      renameBuddy,
      markBridgeCutsceneSeen,
      markIntroClipSeen,
      markLoadingVideoSeen,
      logOut,
    }),
    [
      state,
      logInTeacher,
      logInNewStudent,
      logInReturningStudent,
      finishSetup,
      saveLook,
      renameBuddy,
      markBridgeCutsceneSeen,
      markIntroClipSeen,
      markLoadingVideoSeen,
      logOut,
    ],
  )

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}
