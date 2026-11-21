import { QueryClientProvider } from '@tanstack/react-query'
import { Outlet } from 'react-router-dom'
import { teacherQueryClient } from '../api/queryClient'
import { TeacherDataProvider } from './TeacherDataProvider'

/**
 * Around every Teacher route: the server data cache and the in-memory Teacher
 * data. It sits above both the planner and the full-screen game preview, so
 * going to a preview and back keeps the Teacher's sections, students, To dos
 * and review-pack switches (they live only in memory for now).
 */
export function TeacherShell() {
  return (
    <QueryClientProvider client={teacherQueryClient}>
      <TeacherDataProvider>
        <Outlet />
      </TeacherDataProvider>
    </QueryClientProvider>
  )
}
