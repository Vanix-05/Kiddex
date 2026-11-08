import type { BuddyHead, GameType } from './data/types'
import gBlank from '../assets/teacher/g-blank.png'
import gMatch from '../assets/teacher/g-match.png'
import gQuiz from '../assets/teacher/g-quiz.png'
import hAxolotl from '../assets/teacher/h_axolotl.png'
import hDog from '../assets/teacher/h_dog.png'
import hFox from '../assets/teacher/h_fox.png'
import hKitty from '../assets/teacher/h_kitty.png'
import hMonkey from '../assets/teacher/h_monkey.png'
import hOtter from '../assets/teacher/h_otter.png'
import hRaccoon from '../assets/teacher/h_raccoon.png'
import hRam from '../assets/teacher/h_ram.png'

/** Buddy heads for the student list. */
export const buddyHeads: Record<BuddyHead, string> = {
  axolotl: hAxolotl,
  dog: hDog,
  fox: hFox,
  kitty: hKitty,
  monkey: hMonkey,
  otter: hOtter,
  raccoon: hRaccoon,
  ram: hRam,
}

/** Mini game thumbnails. */
export const gameThumbs: Record<GameType, string> = { quiz: gQuiz, match: gMatch, blank: gBlank }

/** The fixed mini game templates the questions go into. */
export const GAME_INFO: Record<GameType, { name: string; how: string; tag: string }> = {
  quiz: { name: 'Quiz Show', how: 'Pick the right answer', tag: 'Quiz' },
  match: { name: 'Match Up', how: 'Match pairs', tag: 'Match' },
  blank: { name: 'Fill the Blank', how: 'Word bank', tag: 'Blank' },
}

export const GAME_ORDER: GameType[] = ['quiz', 'match', 'blank']
