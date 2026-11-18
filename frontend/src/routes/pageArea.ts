/**
 * Which part of the site is open, as `data-area` on <html>: "admin" on /admin
 * pages, nothing elsewhere. Set from the address itself (before the lazy Admin
 * page has even downloaded), so "Turn your phone sideways" never flashes there.
 *
 * router.tsx calls syncPageArea on start and on every page change;
 * TurnSideways reads it with useIsAdminArea().
 */
import { useSyncExternalStore } from 'react'

const ADMIN_PREFIX = '/admin'

export const isAdminPath = (pathname: string) => pathname === ADMIN_PREFIX || pathname.startsWith(`${ADMIN_PREFIX}/`)

const listeners = new Set<() => void>()

/** Sets or removes data-area="admin" on <html> for this address. */
export function syncPageArea(pathname: string): void {
  const root = document.documentElement
  const admin = isAdminPath(pathname)
  if (admin === (root.dataset.area === 'admin')) return
  if (admin) root.dataset.area = 'admin'
  else delete root.dataset.area
  listeners.forEach((listener) => listener())
}

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

const isAdminArea = () => document.documentElement.dataset.area === 'admin'

/** True while an /admin page is open. */
export function useIsAdminArea(): boolean {
  return useSyncExternalStore(subscribe, isAdminArea, () => false)
}
