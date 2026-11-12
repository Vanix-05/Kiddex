import { useSyncExternalStore } from 'react'

/**
 * Full screen for the Teacher side. Browsers only allow entering it during a
 * click or key press, and some refuse anyway: every error is ignored, so the
 * app works the same without it.
 */
export function enterFullscreen() {
  try {
    document.documentElement.requestFullscreen?.().catch(() => {})
  } catch {
    // Not supported here.
  }
}

export function exitFullscreen() {
  try {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
  } catch {
    // Not supported here.
  }
}

const subscribe = (onChange: () => void) => {
  document.addEventListener('fullscreenchange', onChange)
  return () => document.removeEventListener('fullscreenchange', onChange)
}

/** True while the page is in full screen. */
export const useIsFullscreen = () => useSyncExternalStore(subscribe, () => document.fullscreenElement !== null)
