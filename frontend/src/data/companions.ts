import { companionArt } from '../assets/art'
import type { OptionItem } from './types'

/**
 * Companions shown on the "Choose Your Companion" screen. The learner picks one.
 * To add one: put the PNG in assets/companions, register it in assets/art.ts,
 * then add an entry here. The grid grows automatically.
 */
export const companions: OptionItem[] = [
  { id: 'boy', name: 'Boy', image: companionArt.boy },
  { id: 'girl', name: 'Girl', image: companionArt.girl },
  { id: 'axolotl', name: 'Axolotl', image: companionArt.axolotl },
  { id: 'dog', name: 'Dog', image: companionArt.dog },
  { id: 'fox', name: 'Fox', image: companionArt.fox },
  { id: 'kitty', name: 'Kitty', image: companionArt.kitty },
  { id: 'monkey', name: 'Monkey', image: companionArt.monkey },
  { id: 'otter', name: 'Otter', image: companionArt.otter },
  { id: 'raccoon', name: 'Raccoon', image: companionArt.raccoon },
  { id: 'ram', name: 'Ram', image: companionArt.ram },
]
