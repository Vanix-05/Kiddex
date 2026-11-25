import { useSyncExternalStore } from 'react'

/**
 * "Play like an app": what this phone can do to put KIDDEX on its home screen.
 * - iPhone / iPad: Safari can't be asked from code, so we show the steps (Share, Add to Home Screen).
 * - Android Chrome: Chrome hands us its install prompt (`beforeinstallprompt`) once it decides
 *   KIDDEX can be installed; "Add KIDDEX" opens it. No prompt (other browsers, or already
 *   installed): we show nothing, because there are no steps we can promise.
 * Imported once from main.tsx, so the prompt is caught even before the login screen mounts.
 */

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export type InstallKind = 'ios' | 'android'

const SNOOZE_KEY = 'kiddex.installHint.snoozeUntil'
const SNOOZE_DAYS = 7

let deferred: InstallPromptEvent | null = null
let installed = false
const listeners = new Set<() => void>()
const changed = () => listeners.forEach((fn) => fn())

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault() // we show our own Ollie card instead of Chrome's bar
    deferred = e as InstallPromptEvent
    changed()
  })
  window.addEventListener('appinstalled', () => {
    installed = true
    deferred = null
    changed()
  })
}

/** Opened from the home screen icon (no address bar): nothing to suggest. */
function isInstalledApp(): boolean {
  return (
    window.matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

/** iPhone, iPod, or an iPad (which says "Macintosh" but has a touch screen). */
function isIOS(): boolean {
  const ua = navigator.userAgent
  return /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
}

function snoozed(): boolean {
  try {
    return Number(localStorage.getItem(SNOOZE_KEY) ?? 0) > Date.now()
  } catch {
    return false
  }
}

/** "Not now": hide the chip for a week. */
export function snoozeInstallHint() {
  try {
    localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_DAYS * 24 * 60 * 60 * 1000))
  } catch {
    // Private mode: the chip just comes back next visit.
  }
  changed()
}

/** Android: opens Chrome's install prompt. True if the Student said yes. */
export async function promptInstall(): Promise<boolean> {
  const event = deferred
  if (!event) return false
  deferred = null // Chrome allows each prompt once
  await event.prompt()
  const { outcome } = await event.userChoice
  if (outcome === 'accepted') installed = true
  changed()
  return outcome === 'accepted'
}

function current(): InstallKind | null {
  if (installed || isInstalledApp() || snoozed()) return null
  if (isIOS()) return 'ios'
  if (deferred) return 'android'
  return null
}

function subscribe(fn: () => void) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

/** Which install help to offer on this device right now, or null for none. */
export function useInstallKind(): InstallKind | null {
  return useSyncExternalStore(subscribe, current, () => null)
}
