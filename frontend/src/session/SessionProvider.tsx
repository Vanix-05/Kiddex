import { startTransition, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { LOGIN_ENDED_NOTICE, SessionContext, isRole, type SessionState, type SetupResult, type User } from './session'
import { clearToken, getToken, setToken } from './authToken'
import type { Look } from '../setup/customizeData'
import { isAvatar } from '../setup/avatar'
import { cleanLook } from '../setup/customizeData'
import { isBuddyId } from '../setup/quizData'
import { authApi } from '../teacher/api/authApi'
import { ApiError, setLoginEndedHandler } from '../teacher/api/client'
import { studentApi, type StudentPatch, type StudentProfile } from './studentApi'
import { teacherQueryClient } from '../teacher/api/queryClient'
import { studentQueryClient } from '../games/studentQueryClient'
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
  section: null,
}

/** A saved user we still understand (roles from older versions are not). */
const isUser = (u: unknown): u is User =>
  !!u && typeof (u as User).username === 'string' && isRole((u as User).role)

// Keeps the session across page reloads (sessionStorage: closing the tab logs out).
function loadSession(): SessionState {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (raw) {
      // Older saved sessions may have other fields; only keep what we use.
      const saved = JSON.parse(raw) as Partial<SessionState>
      // A user with an old or unknown role: start fresh (logged out).
      if (saved.user && !isUser(saved.user)) return EMPTY
      // Anyone without a login token (an old fake login, or blocked storage): logged out.
      if (saved.user && !getToken()) return EMPTY
      return {
        user: saved.user ?? null,
        companionId: saved.companionId ?? null,
        avatar: isAvatar(saved.avatar) ? saved.avatar : null,
        buddyName: saved.buddyName ?? null,
        look: cleanLook(saved.look),
        seenBridgeCutscene: saved.seenBridgeCutscene === true,
        seenIntroClip: saved.seenIntroClip === true,
        seenLoadingVideo: saved.seenLoadingVideo === true,
        section: typeof saved.section === 'string' ? saved.section : null,
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

/** The session fields that come from the Student's profile (the backend keeps them). */
function fromProfile(p: StudentProfile): Partial<SessionState> {
  return {
    user: { username: p.schoolId, role: 'student' },
    companionId: isBuddyId(p.buddy) ? p.buddy : null,
    avatar: isAvatar(p.avatar) ? p.avatar : null,
    buddyName: p.buddyName,
    look: cleanLook(p.look),
    seenIntroClip: p.seenIntroClip,
    seenBridgeCutscene: p.seenBridgeCutscene,
    section: `Grade ${p.section.grade} – ${p.section.name}`,
  }
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Who is logged in.
 *
 * Teacher login is REAL: email + password go to the backend, which answers with
 * a login token (8 hours, kept in sessionStorage by authToken.ts). After a page
 * reload the token is checked once with GET /api/auth/me.
 *
 * Student login is REAL too: School ID + one-time code + a new PIN code (New
 * Student) or School ID + PIN code (Returning Student) go to the backend, which
 * answers with a login token (8 hours, the same token store) and the Student's
 * profile: kid, buddy, buddy name, look and the two "seen" flags. The setup and
 * later changes are saved there too. After a page reload the token is checked
 * once (GET /api/auth/me or GET /api/student/me).
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

  // Who is logged in right now, for the background saves and the login-ended handler.
  const roleRef = useRef(state.user?.role)
  useEffect(() => {
    roleRef.current = state.user?.role
  }, [state.user?.role])

  /**
   * A Student change saved in the background (the screen already shows it): one
   * quick retry, then a console warning. No popup: it is kept on this tab anyway.
   */
  const saveInBackground = useCallback((patch: StudentPatch) => {
    if (roleRef.current !== 'student' || !getToken()) return
    const loginEnded = (err: unknown) => err instanceof ApiError && err.status === 401
    void studentApi
      .patch(patch)
      .catch(async (err: unknown) => {
        if (loginEnded(err)) return
        await wait(1500)
        await studentApi.patch(patch)
      })
      .catch((err: unknown) => {
        if (!loginEnded(err)) console.warn('[student] a change could not be saved; it is kept on this tab only')
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
      studentQueryClient.clear()
      const user: User = { username: teacher.email, role: 'teacher', name: teacher.name }
      update({ ...EMPTY, user })
      return user
    },
    [update],
  )

  /** A Student logged in: keep the token and fill the session from their profile. */
  const startStudent = useCallback(
    ({ token, student }: { token: string; student: StudentProfile }) => {
      setToken(token)
      // Never keep a Teacher's cached lessons on a Student's tab.
      teacherQueryClient.clear()
      studentQueryClient.clear()
      roleRef.current = 'student'
      update({ ...EMPTY, ...fromProfile(student) })
      return { hasBuddy: isBuddyId(student.buddy) }
    },
    [update],
  )

  const checkStudentCode = useCallback(async (schoolId: string, code: string) => {
    await studentApi.checkCode(schoolId, code)
  }, [])

  const logInNewStudent = useCallback(
    async (schoolId: string, code: string, pin: string) => startStudent(await studentApi.firstLogin(schoolId, code, pin)),
    [startStudent],
  )

  const logInReturningStudent = useCallback(
    async (schoolId: string, pin: string) => startStudent(await studentApi.logIn(schoolId, pin)),
    [startStudent],
  )

  // Waits for the server: the picks reach the session only once they are saved.
  const finishSetup = useCallback(
    async ({ avatar, buddy, nickname }: SetupResult) => {
      const { student } = await studentApi.setup({ avatar, buddy, buddyName: nickname.trim() || null })
      update({ companionId: buddy, avatar, buddyName: student.buddyName })
    },
    [update],
  )

  const saveLook = useCallback(
    (look: Look) => {
      update({ look })
      saveInBackground({ look: { ...look } as Record<string, string> })
    },
    [update, saveInBackground],
  )
  const renameBuddy = useCallback(
    (name: string) => {
      const buddyName = name.trim() || null
      update({ buddyName })
      saveInBackground({ buddyName })
    },
    [update, saveInBackground],
  )

  const markBridgeCutsceneSeen = useCallback(() => {
    update({ seenBridgeCutscene: true })
    saveInBackground({ seenBridgeCutscene: true })
  }, [update, saveInBackground])
  const markIntroClipSeen = useCallback(() => {
    update({ seenIntroClip: true })
    saveInBackground({ seenIntroClip: true })
  }, [update, saveInBackground])
  const markLoadingVideoSeen = useCallback(() => update({ seenLoadingVideo: true }), [update])

  // There is no logout address: the browser forgets the token. The Teacher and Student
  // caches are cleared too, so the next person on this computer never sees these lessons or numbers.
  const logOut = useCallback(() => {
    clearToken()
    teacherQueryClient.clear()
    studentQueryClient.clear()
    update(EMPTY)
  }, [update])

  // The backend said the login ended (8 hours passed; a Teacher's password was
  // reset; a Student got a New code): log out and open the right login screen
  // (Teacher Login with a notice, or the Student welcome card). client.ts calls
  // this at most once per token, so it can't loop.
  useEffect(() => {
    setLoginEndedHandler(() => {
      const student = roleRef.current === 'student'
      // One transition, like the planner's Log out: a separate log-out would
      // render first and the guard would send us to the Welcome card instead.
      startTransition(() => {
        if (student) void router.navigate(paths.welcome)
        else void router.navigate(paths.teacher.login, { state: { notice: LOGIN_ENDED_NOTICE } })
        logOut()
      })
    })
    return () => setLoginEndedHandler(null)
  }, [logOut])

  // After a page reload: check the saved login once and refresh the session (a
  // Teacher's name, or a Student's profile). 401: the login-ended handler above
  // logs out. Network error (the backend may be waking up): keep the session; the
  // next call tries again. Only a session loaded at start is checked (not one
  // from a fresh login).
  const checkedSavedLogin = useRef(!state.user)
  useEffect(() => {
    if (checkedSavedLogin.current) return
    checkedSavedLogin.current = true
    if (state.user?.role === 'student') {
      studentApi
        .me()
        .then(({ student }) =>
          setState((prev) => {
            if (prev.user?.role !== 'student') return prev
            const next = { ...prev, ...fromProfile(student) }
            saveSession(next)
            return next
          }),
        )
        .catch(() => {})
      return
    }
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
      checkStudentCode,
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
      checkStudentCode,
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
