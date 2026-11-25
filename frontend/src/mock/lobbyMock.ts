// FAKE DATA: delete each part when it becomes real (later steps).
//
// The Student's progress and today's mission are REAL now (GET /api/student/games).
// Classmates are REAL too (the live Lobby, screens/Lobby/live/).
// Still fake: the Class Garden, the Prize Wheel slices and Ollie's lines.
// Screens never import this file. The Lobby reads it through
// src/screens/Lobby/useLobbyData.ts, so the real API can replace it later
// without touching the screen.

import type { LobbyData } from '../screens/Lobby/lobbyData'

export const lobbyMock: Pick<LobbyData, 'garden' | 'wheel'> = {
  // The whole section's sampaguita: 9 of 12 missions so far (it shows buds).
  garden: { done: 9, goal: 12 },

  // 8 slices, matching the wheel's colors in the room. No blanks: every spin wins.
  wheel: [
    { label: '+5 stars', icon: '⭐', stars: 5 },
    { label: 'Sticker', icon: '🌺', stars: 0 },
    { label: '+10 stars', icon: '🌟', stars: 10 },
    { label: '+3 stars', icon: '⭐', stars: 3 },
    { label: 'Sticker', icon: '🐢', stars: 0 },
    { label: '+5 stars', icon: '⭐', stars: 5 },
    { label: '+15 stars', icon: '💫', stars: 15 },
    { label: 'Sticker', icon: '🌈', stars: 0 },
  ],
}

/** Short lines Ollie's speech bubble rotates through. `mission`: today's pack name, or null (no mission). */
export function ollieLines(mission: string | null): string[] {
  return [
    'Hoo! Tap me for today’s mission!',
    ...(mission ? [`Don’t forget: ${mission}!`] : []),
    'Finish your mission to spin the Prize Wheel!',
    'Be kind to your classmates!',
  ]
}
