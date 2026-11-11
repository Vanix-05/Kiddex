import { useCallback, useState } from 'react'
import type { Angle, Zoom } from './game/LobbyGame'

/** The Settings card's choices. Remembered on this device. */
export interface LobbySettings {
  angle: Angle
  zoom: Zoom
  /** Classmates' name tags (the Student's own tag always shows). */
  names: boolean
  /** Classmates' emotes. */
  emotes: boolean
  /** Moving effects. Less stops parallax, bob and drifting clouds. */
  motion: 'full' | 'less'
}

const STORAGE_KEY = 'kiddex.lobby.settings'

const DEFAULTS: LobbySettings = { angle: 'diag', zoom: 'close', names: true, emotes: true, motion: 'full' }

function load(): LobbySettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULTS
    // Only keep values we still understand.
    const saved = JSON.parse(raw) as Partial<Record<keyof LobbySettings, unknown>>
    return {
      angle: saved.angle === 'straight' ? 'straight' : 'diag',
      zoom: saved.zoom === 'far' ? 'far' : 'close',
      names: saved.names !== false,
      emotes: saved.emotes !== false,
      motion: saved.motion === 'less' ? 'less' : 'full',
    }
  } catch {
    // Storage unavailable or corrupted: use the defaults.
    return DEFAULTS
  }
}

export function useLobbySettings() {
  const [settings, setSettings] = useState(load)

  const change = useCallback((patch: Partial<LobbySettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      } catch {
        // Ignore: the settings just won't be remembered.
      }
      return next
    })
  }, [])

  return [settings, change] as const
}
