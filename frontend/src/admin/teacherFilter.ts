import type { AdminTeacher } from './adminApi'

export type TeacherFilter = 'all' | 'active' | 'off'

/** Lowercase, trimmed, with runs of spaces made one. */
export const cleanSearch = (text: string) => text.trim().replace(/\s+/g, ' ').toLowerCase()

/** The Teachers that match the search (name or email) and the filter. Search ignores case and extra spaces. */
export function filterTeachers(teachers: AdminTeacher[], search: string, filter: TeacherFilter): AdminTeacher[] {
  const q = cleanSearch(search)
  return teachers.filter((t) => {
    if (filter === 'active' && !t.active) return false
    if (filter === 'off' && t.active) return false
    return !q || cleanSearch(t.name).includes(q) || cleanSearch(t.email).includes(q)
  })
}

/** The counts on the filter buttons (always from the full list). */
export function filterCounts(teachers: AdminTeacher[]): Record<TeacherFilter, number> {
  const active = teachers.filter((t) => t.active).length
  return { all: teachers.length, active, off: teachers.length - active }
}
