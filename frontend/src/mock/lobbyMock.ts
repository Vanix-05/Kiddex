// FAKE DATA: delete when the database is connected.
//
// Screens never import this file. The Lobby reads it through
// src/screens/Lobby/useLobbyData.ts, so the real API can replace that hook
// later without touching the screen.

import type { LobbyData } from '../screens/Lobby/lobbyData'

export const lobbyMock: LobbyData = {
  student: {
    // TODO: the real name comes from the Teacher's student list when the backend is connected.
    name: 'Sam',
    level: 4,
    xp: 240,
    xpGoal: 300,
    stars: 125,
    streakDays: 3,
  },

  // Only 1 classmate for now (no server or multiplayer yet).
  classmates: [
    {
      id: 'mabborang',
      name: 'Mabborang',
      avatar: 'boy',
      look: { skin: 'skin4', hair: 'black', shirt: 'blue' },
      buddy: 'kitty',
      buddyName: 'Bubbles',
      level: 6,
      badges: 2,
    },
  ],

  mission: {
    teacher: 'Ms. Cruz',
    title: 'Parts of a Plant',
    subject: 'Science',
    games: 3,
    due: 'Friday',
    xp: 60,
    stars: 5,
    lesson: [
      { icon: '🌱', word: 'Roots', text: 'drink water from the soil' },
      { icon: '🌿', word: 'Stem', text: 'holds the plant up' },
      { icon: '🍃', word: 'Leaves', text: 'make food from sunlight' },
      { icon: '🌸', word: 'Flower', text: 'makes seeds' },
    ],
  },

  ollieLines: [
    'Hoo! Tap me for today’s mission!',
    'Don’t forget: Parts of a Plant!',
    'Try the Quiz Stage! Hoo!',
    'Be kind to your classmates!',
  ],
}
