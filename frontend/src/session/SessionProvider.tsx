import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { SessionContext, type SessionState, type User } from './session'

const STORAGE_KEY = 'kiddex.session'

// Keeps the mock session across page reloads during development.
function loadSession(): SessionState {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (raw) {
      // Older saved sessions may still have avatarId/petId; only keep what we use.
      const saved = JSON.parse(raw) as Partial<SessionState>
      return { user: saved.user ?? null, companionId: saved.companionId ?? null }
    }
  } catch {
    // Storage unavailable or corrupted: start fresh.
  }
  return { user: null, companionId: null }
}

function saveSession(state: SessionState) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Ignore: the session just won't survive a reload.
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>(loadSession)

  const update = useCallback((patch: Partial<SessionState>) => {
    setState((prev) => {
      const next = { ...prev, ...patch }
      saveSession(next)
      return next
    })
  }, [])

  const logIn = useCallback(
    async (username: string, password: string): Promise<User> => {
      // TODO: replace with a real call to the backend auth endpoint
      // (e.g. POST /api/auth/login) and read the role from the response.
      await new Promise((resolve) => setTimeout(resolve, 400))
      if (!username.trim() || !password) {
        throw new Error('Please enter your username and password.')
      }
      const user: User = { username: username.trim(), role: 'learner' }
      update({ user })
      return user
    },
    [update],
  )

  const logOut = useCallback(() => update({ user: null, companionId: null }), [update])
  // TODO: save the companion choice to the backend once the API exists.
  const setCompanion = useCallback((companionId: string) => update({ companionId }), [update])

  const value = useMemo(
    () => ({ ...state, logIn, logOut, setCompanion }),
    [state, logIn, logOut, setCompanion],
  )

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}
