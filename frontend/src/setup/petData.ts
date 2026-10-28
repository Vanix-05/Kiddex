import type { CardTint } from '../data/types'
import type { BuddyId } from './quizData'

/**
 * The buddies on the pet menu (/setup/pet), in menu order. Edit freely; the
 * menu grid adapts to however many there are (a new id must also be added to
 * buddyIds in quizData.ts).
 * - `name`: shown on the tile and page, and the default nickname.
 * - `skills`: 1-5 dots each. Decorative for now.
 * - `tint`: the tile's background color (colors.tint* in theme.ts).
 * A pet with no picture yet shows a "Coming soon" silhouette and can't be
 * picked (see isBuddyReady in components/BuddyFigure/buddyArt.ts).
 */

export interface PetSkills {
  brave: number
  speedy: number
  smart: number
}

export interface PetInfo {
  id: BuddyId
  name: string
  intro: string
  skills: PetSkills
  funFact: string
  tint: CardTint
}

export const pets: PetInfo[] = [
  {
    id: 'otter',
    name: 'Otter',
    intro: 'Hi! I hold hands when I sleep so I don’t float away. Will you hold mine?',
    skills: { brave: 3, speedy: 3, smart: 3 },
    funFact: 'Otters have a favorite rock they keep in a pocket of skin!',
    tint: 'lavender',
  },
  {
    id: 'fox',
    name: 'Fox',
    intro: 'I’m not sneaky, I’m just… thinking very quietly.',
    skills: { brave: 2, speedy: 4, smart: 5 },
    funFact: 'Foxes can hear a watch ticking from 40 steps away!',
    tint: 'peach',
  },
  {
    id: 'kitty',
    name: 'Kitty',
    intro: 'I nap 16 hours a day. The other 8, I’m learning with you.',
    skills: { brave: 2, speedy: 4, smart: 4 },
    funFact: 'Cats have 32 muscles in each ear!',
    tint: 'periwinkle',
  },
  {
    id: 'axolotl',
    name: 'Axolotl',
    intro: 'I can regrow my tail! Mistakes don’t scare me one bit.',
    skills: { brave: 3, speedy: 2, smart: 4 },
    funFact: 'Axolotls can regrow legs and even parts of their heart!',
    tint: 'pink',
  },
  {
    id: 'dog',
    name: 'Dog',
    intro: 'Best friend reporting for duty! Tail already wagging.',
    skills: { brave: 4, speedy: 4, smart: 2 },
    funFact: 'A dog’s nose print is as unique as your fingerprint!',
    tint: 'peach',
  },
  {
    id: 'monkey',
    name: 'Monkey',
    intro: 'Bananas, jokes, and big ideas. In that order.',
    skills: { brave: 3, speedy: 5, smart: 3 },
    funFact: 'Some monkeys use rocks as tools to crack nuts!',
    tint: 'pink',
  },
  {
    id: 'raccoon',
    name: 'Raccoon',
    intro: 'I wash my snacks before eating. Smart AND clean.',
    skills: { brave: 3, speedy: 3, smart: 5 },
    funFact: 'Raccoons have super sensitive hands, like little fingers!',
    tint: 'lavender',
  },
  {
    id: 'ram',
    name: 'Ram',
    intro: 'Bump! Sorry. I go headfirst into every challenge.',
    skills: { brave: 5, speedy: 3, smart: 2 },
    funFact: 'A ram’s horns keep growing its whole life!',
    tint: 'periwinkle',
  },
]

export const skillRows: { key: keyof PetSkills; icon: string; label: string }[] = [
  { key: 'brave', icon: '⚔️', label: 'Brave' },
  { key: 'speedy', icon: '🏃', label: 'Speedy' },
  { key: 'smart', icon: '🧠', label: 'Smart' },
]

export const MAX_SKILL = 5
export const MAX_NICKNAME = 12

export const petById = (id: BuddyId | null | undefined) => pets.find((p) => p.id === id)

/** Keeps a typed nickname kid-safe: letters and spaces only, at most 12 characters. */
export const cleanNickname = (text: string) =>
  text
    .replace(/[^\p{L} ]/gu, '')
    .replace(/^ +/, '')
    .replace(/ {2,}/g, ' ')
    .slice(0, MAX_NICKNAME)

// What Ollie says on /setup/pet.
export const ollieOnMatch = 'This one is YOUR match!'
export const ollieOnOther = (name: string) => `Ooh, ${name} is fun too!`
export const ollieChosen = 'A perfect team!'
