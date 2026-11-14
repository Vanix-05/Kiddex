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

  // The Fractions lesson in src/mock/questionCards.ts (fakeGameLessons): its
  // name is the title, so the mission, the chalkboard and the game chip match.
  mission: {
    lessonId: 'g4-fractions',
    teacher: 'Ms. Cruz',
    title: 'Fractions',
    subject: 'Math',
    // Quiz Show and Match Up.
    games: 2,
    // The hook (useLobbyData) counts the games finished today.
    gamesDone: 0,
    done: [],
    due: 'Friday',
    // Most a perfect run can earn: Quiz Show 8 x 5 + 10, Match Up 5 x 5 + 10; 3 stars each.
    xp: 85,
    stars: 6,
    lesson: [
      { icon: '🍕', word: 'Fraction', text: 'equal parts of a whole' },
      { icon: '⬆️', word: 'Numerator', text: 'the top number' },
      { icon: '⬇️', word: 'Denominator', text: 'the bottom number' },
      { icon: '🟰', word: 'Equivalent', text: 'the same amount, like 1/2 = 2/4' },
    ],
  },

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

  ollieLines: [
    'Hoo! Tap me for today’s mission!',
    'Don’t forget: Fractions!',
    'Finish your mission to spin the Prize Wheel!',
    'Be kind to your classmates!',
  ],
}
