import { QueryClient } from '@tanstack/react-query'
import { ApiError } from './client'

/** One cache for the Teacher Dashboard's server data (TeacherPlanner wraps the Teacher routes in it). */
export const teacherQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Lessons change when the AI finishes, so fresh data is welcome; polling is set per hook.
      staleTime: 1000,
      refetchOnWindowFocus: true,
      // A missing lesson won't come back by asking again.
      retry: (count, error) => !(error instanceof ApiError && error.status === 404) && count < 2,
    },
  },
})
