import { Gamepad2, Link2, Pencil, type LucideIcon } from 'lucide-react'
import type { BuddyHead, TemplateId } from './data/types'
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
export const gameThumbs: Record<TemplateId, string> = { 'quiz-show': gQuiz, 'match-up': gMatch, 'fill-blank': gBlank }

/**
 * The fixed mini game templates the questions go into.
 * tone: each game's color (Quiz orange, Match blue, Blank green).
 * unit / units: what one card is called in that game ("pair" for Match Up).
 */
export const GAME_INFO: Record<TemplateId, { name: string; how: string; tag: string; tone: 'warn' | 'info' | 'ok'; unit: string; units: string }> = {
  'quiz-show': { name: 'Quiz Show', how: 'Pick the right answer', tag: 'Quiz', tone: 'warn', unit: 'question', units: 'questions' },
  'match-up': { name: 'Match Up', how: 'Match pairs', tag: 'Match', tone: 'info', unit: 'pair', units: 'pairs' },
  'fill-blank': { name: 'Fill the Blank', how: 'Word bank', tag: 'Blank', tone: 'ok', unit: 'question', units: 'questions' },
}

export const GAME_ORDER: TemplateId[] = ['quiz-show', 'match-up', 'fill-blank']

/** Each game's icon, for its tag and chips. */
export const GAME_ICON: Record<TemplateId, LucideIcon> = { 'quiz-show': Gamepad2, 'match-up': Link2, 'fill-blank': Pencil }
