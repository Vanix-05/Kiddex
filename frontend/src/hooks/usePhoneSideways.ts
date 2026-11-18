import { useCallback, useSyncExternalStore } from 'react'

/** A phone held sideways: landscape and short. CSS uses this exact media query too. */
export const PHONE_SIDEWAYS_QUERY = '(orientation: landscape) and (max-height: 500px)'

/** A touch screen held upright (TurnSideways asks the kid to turn it). */
export const TOUCH_UPRIGHT_QUERY = '(orientation: portrait) and (pointer: coarse)'

/** True while the media query matches; updates when it changes (e.g. the phone turns). */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia(query)
      list.addEventListener('change', onChange)
      return () => list.removeEventListener('change', onChange)
    },
    [query],
  )
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  )
}

/** True on a phone held sideways (see PHONE_SIDEWAYS_QUERY). */
export function usePhoneSideways(): boolean {
  return useMediaQuery(PHONE_SIDEWAYS_QUERY)
}
