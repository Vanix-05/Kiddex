import { describe, expect, it } from 'vitest'
import type { AdminTeacher } from './adminApi'
import { filterCounts, filterTeachers } from './teacherFilter'

const teacher = (name: string, email: string, active = true): AdminTeacher => ({
  id: email,
  name,
  email,
  active,
  lastLoginAt: null,
  createdAt: '2026-11-01T00:00:00.000Z',
  lessonCount: 0,
})

const list = [
  teacher('Ms. Garcia', 'garcia.g6@school.ph'),
  teacher('Mr.  Reyes', 'reyes.g5@school.ph', false),
  teacher('Ms. Dela Cruz', 'delacruz@kiddex.test'),
]
const names = (t: AdminTeacher[]) => t.map((x) => x.name)

describe('filterTeachers', () => {
  it('shows everyone with no search and All', () => {
    expect(filterTeachers(list, '', 'all')).toHaveLength(3)
    expect(filterTeachers(list, '   ', 'all')).toHaveLength(3)
  })

  it('searches the name and the email, ignoring case', () => {
    expect(names(filterTeachers(list, 'GAR', 'all'))).toEqual(['Ms. Garcia'])
    expect(names(filterTeachers(list, 'kiddex.test', 'all'))).toEqual(['Ms. Dela Cruz'])
  })

  it('ignores extra spaces in the search and the name', () => {
    expect(names(filterTeachers(list, '  dela   cruz ', 'all'))).toEqual(['Ms. Dela Cruz'])
    expect(names(filterTeachers(list, 'mr. reyes', 'all'))).toEqual(['Mr.  Reyes'])
  })

  it('filters Active and Off', () => {
    expect(names(filterTeachers(list, '', 'off'))).toEqual(['Mr.  Reyes'])
    expect(filterTeachers(list, '', 'active')).toHaveLength(2)
    expect(filterTeachers(list, 'reyes', 'active')).toHaveLength(0)
  })
})

describe('filterCounts', () => {
  it('counts the full list', () => {
    expect(filterCounts(list)).toEqual({ all: 3, active: 2, off: 1 })
  })
})
