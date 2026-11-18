import { startTransition, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { LOGIN_ENDED_NOTICE, SessionContext, isRole, type SessionState, type SetupResult, type User } from './session'
import { clearToken, getToken, setToken } from './authToken'
import type { Look } from '../setup/customizeData'
import { isAvatar } from '../setup/avatar'
import { cleanLook } from '../setup/customizeData'
import { isBuddyId } from '../setup/quizData'
import { FAKE_RETURNING_STUDENT } from '../mock/studentMock'
import { authApi } from '../teacher/api/authApi'
import { setLoginEndedHandler } from '../teacher/api/client'
import { teacherQueryClient } from '../teacher/api/queryClient'
import { router } from '../routes/router'
import { paths } from '../routes/paths'

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
      // A Teacher without a login token (an old fake login, or blocked storage): logged out.
      if (saved.user?.role === 'teacher' && !getToken()) return EMPTY
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

/**
 * Who is logged in.
 *
 * Teacher login is REAL: email + password go to the backend, which answers with
 * a login token (8 hours, kept in sessionStorage by authToken.ts). After a page
 * reload the token is checked once with GET /api/auth/me.
 *
 * Student login is still FAKE (no backend yet):
 * - any 8-digit School ID + 6-digit one-time code + 4-digit PIN code starts
 *   a new Student (New Student notebook pages), with no buddy yet
 * - any 8-digit School ID + 4-digit PIN code logs a Returning Student in,
 *   with the kid and buddy saved in this browser (or a default one)
 * TODO: replace the Student parts with real calls to the backend.
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
      if (!email.trim() || !password) throw new Error('Please enter your email and password.')
      // Throws an ApiError with the backend's friendly message (wrong login,
      // too many tries, can't reach KIDDEX).
      const { token, teacher } = await authApi.logIn(email.trim(), password)
      setToken(token)
      // A fresh cache: never show lessons from an earlier login on this computer.
      teacherQueryClient.clear()
      const user: User = { username: teacher.email, role: 'teacher', name: teacher.name }
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

  // There is no logout address: the browser forgets the token. The Teacher cache
  // is cleared too, so the next Teacher on this computer never sees these lessons.
  const logOut = useCallback(() => {
    clearToken()
    teacherQueryClient.clear()
    update(EMPTY)
  }, [update])

  // The backend said the Teacher's login ended (8 hours passed, or the password
  // was reset): log out and open Teacher Login with a notice. client.ts calls
  // this at most once per token, so it can't loop.
  useEffect(() => {
    setLoginEndedHandler(() => {
      // One transition, like the planner's Log out: a separate log-out would
      // render first and the guard would send us to the Welcome card instead.
      startTransition(() => {
        void router.navigate(paths.teacher.login, { state: { notice: LOGIN_ENDED_NOTICE } })
        logOut()
      })
    })
    return () => setLoginEndedHandler(null)
  }, [logOut])

  // After a page reload: check the saved Teacher login once and refresh the name.
  // 401: the login-ended handler above logs out. Network error (the backend may
  // be waking up): keep the session; the next call tries again.
  // Only a Teacher session loaded at start is checked (not one from a fresh login).
  const checkedSavedLogin = useRef(state.user?.role !== 'teacher')
  useEffect(() => {
    if (checkedSavedLogin.current) return
    checkedSavedLogin.current = true
    authApi
      .me()
      .then(({ teacher }) =>
        setState((prev) => {
          if (prev.user?.role !== 'teacher') return prev
          const next = { ...prev, user: { ...prev.user, username: teacher.email, name: teacher.name } }
          saveSession(next)
          return next
        }),
      )
      .catch(() => {})
  }, [state.user?.role])

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
