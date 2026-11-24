import { QueryClient } from '@tanstack/react-query'
import { ApiError } from '../teacher/api/client'

/**
 * The Student's server data cache (their games, progress and mission). Separate
 * from the Teacher's (teacher/api/queryClient.ts), and cleared on every login and
 * logout, so a Student never sees another Student's numbers on this computer.
 */
export const studentQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: true,
      // A 4xx (like a login that ended) won't change by asking again.
      retry: (count, error) => !(error instanceof ApiError && error.status >= 400 && error.status < 500) && count < 1,
    },
  },
})
