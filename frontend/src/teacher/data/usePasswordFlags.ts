import { useQuery, useQueryClient } from '@tanstack/react-query'
import { authApi, type Me, type PasswordFlags } from '../api/authApi'

/** GET /api/auth/me in the Teacher cache: loaded once per page load. */
export const meKey = ['me'] as const

/**
 * The Teacher's password flags (key button dot, sticky note). null while
 * loading or if the call failed: then nothing shows (it never blocks the page).
 */
export function usePasswordFlags(): PasswordFlags | null {
  const { data } = useQuery({
    queryKey: meKey,
    queryFn: authApi.me,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  })
  return data?.password ?? null
}

/** Changes the cached flags at once (after Change password, or the note's X). */
export function useSetPasswordFlags() {
  const queryClient = useQueryClient()
  return (flags: Partial<PasswordFlags>) =>
    queryClient.setQueryData<Me>(meKey, (old) => (old ? { ...old, password: { ...old.password, ...flags } } : old))
}
