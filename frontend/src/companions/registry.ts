import dogImage from './dog/pet_dog.png'
import { dogAnchors } from './dog/anchors'
import foxImage from '../assets/companions/pet_fox.png'
import { foxAnchors } from './fox/anchors'
import { FoxRig } from './fox/FoxRig'
import boyImage from '../assets/companions/human_boy.png'
import { boyAnchors } from './boy/anchors'
import { BoyRig } from './boy/BoyRig'
import girlImage from '../assets/companions/human_girl.png'
import { girlAnchors } from './girl/anchors'
import { GirlRig } from './girl/GirlRig'
import kittyImage from '../assets/companions/pet_kitty.png'
import { kittyAnchors } from './kitty/anchors'
import { KittyRig } from './kitty/KittyRig'
import axolotlImage from '../assets/companions/pet_axolotl.png'
import { axolotlAnchors } from './axolotl/anchors'
import { AxolotlRig } from './axolotl/AxolotlRig'
import raccoonImage from '../assets/companions/pet_raccoon.png'
import { raccoonAnchors } from './raccoon/anchors'
import { RaccoonRig } from './raccoon/RaccoonRig'
import ramImage from '../assets/companions/pet_ram.png'
import { ramAnchors } from './ram/anchors'
import { RamRig } from './ram/RamRig'
import monkeyImage from '../assets/companions/pet_monkey.png'
import { monkeyAnchors } from './monkey/anchors'
import { MonkeyRig } from './monkey/MonkeyRig'
import type { CompanionDefinition } from './types'

/**
 * Every companion that <Companion id="..." /> can show.
 * To add one: make a folder with its PNG and an anchors.ts, then add a line here.
 * A companion with a traced rig (fox, boy, girl, kitty, axolotl, raccoon, ram,
 * monkey) also passes `Rig`.
 */
export const companionRegistry = {
  dog: { name: 'Dog', image: dogImage, anchors: dogAnchors },
  fox: { name: 'Fox', image: foxImage, anchors: foxAnchors, Rig: FoxRig },
  boy: { name: 'Boy', image: boyImage, anchors: boyAnchors, Rig: BoyRig },
  girl: { name: 'Girl', image: girlImage, anchors: girlAnchors, Rig: GirlRig },
  kitty: { name: 'Kitty', image: kittyImage, anchors: kittyAnchors, Rig: KittyRig },
  axolotl: { name: 'Axolotl', image: axolotlImage, anchors: axolotlAnchors, Rig: AxolotlRig },
  raccoon: { name: 'Raccoon', image: raccoonImage, anchors: raccoonAnchors, Rig: RaccoonRig },
  ram: { name: 'Ram', image: ramImage, anchors: ramAnchors, Rig: RamRig },
  monkey: { name: 'Monkey', image: monkeyImage, anchors: monkeyAnchors, Rig: MonkeyRig },
} satisfies Record<string, CompanionDefinition>

export type CompanionId = keyof typeof companionRegistry

export const isCompanionId = (id: string | null | undefined): id is CompanionId =>
  !!id && Object.hasOwn(companionRegistry, id)
