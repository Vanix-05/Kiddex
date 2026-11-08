import type { ComponentType } from 'react'
import { matchPath } from 'react-router-dom'
import { paths } from '../../routes/paths'

/** Every page of the planner, in book order (a later page = a forward flip). */
export type PageKey = 'home' | 'lessons' | 'making' | 'check' | 'games' | 'progress' | 'lobby'

const ORDER: Record<PageKey, number> = { home: 0, lessons: 1, making: 2, check: 3, games: 4, progress: 5, lobby: 6 }

export interface PageProps {
  /** From the URL, on the Lessons steps. */
  lessonId?: string
  query: URLSearchParams
  /** false = a still copy drawn on a turning page (no timers, no focus). */
  live: boolean
}

/** A spread: the left and right page, drawn separately so a flip can show halves. */
export interface Spread {
  Left: ComponentType<PageProps>
  Right: ComponentType<PageProps>
}

export const lessonStepPath = (id: string, step: 'making' | 'check' | 'games') => `${paths.teacher.lessons}/${id}/${step}`

export const studentsPath = (filter?: string) => (filter ? `${paths.teacher.students}?filter=${filter}` : paths.teacher.students)

export interface ResolvedPage {
  key: PageKey
  lessonId?: string
  query: URLSearchParams
}

/** Which planner page a URL (path + query) shows. Unknown paths show Home. */
export function resolvePage(url: string): ResolvedPage {
  const [pathname, search = ''] = url.split('?')
  const query = new URLSearchParams(search)
  for (const step of ['making', 'check', 'games'] as const) {
    const m = matchPath(`${paths.teacher.lessons}/:id/${step}`, pathname)
    if (m) return { key: step, lessonId: m.params.id, query }
  }
  if (matchPath(paths.teacher.lessons, pathname)) return { key: 'lessons', query }
  if (matchPath(paths.teacher.progress, pathname)) return { key: 'progress', query }
  if (matchPath(paths.teacher.lobby, pathname)) return { key: 'lobby', query }
  return { key: 'home', query }
}

export const isStudentsPath = (pathname: string) => !!matchPath(paths.teacher.students, pathname)

export const pageOrder = (url: string) => ORDER[resolvePage(url).key]

/** Just the path part of a URL, for "did the page change?" checks. */
export const pathOf = (url: string) => url.split('?')[0]
