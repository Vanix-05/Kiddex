/**
 * Every illustration the app uses, imported in one place.
 *
 * Characters and companions are transparent PNGs. The scene pieces are SVGs
 * (the sea is drawn in code: components/SceneBackground/Sea.tsx).
 */

// Scene
import sun from './scene/sun.svg'
import cloud from './scene/cloud.svg'
import island from './scene/island.svg'
import sailboat from './scene/sailboat.svg'
import ground from './scene/ground.svg'
import dock from './scene/dock.svg'
import bush from './scene/bush.svg'
import sign from './scene/sign.svg'

// Login screen only: girl + fox in one image (371x474)
import girlFoxLogin from './characters/girlfoxlogin.png'

// Companions (all 5000x5000, square)
import boy from './companions/human_boy.png'
import girl from './companions/human_girl.png'
import axolotl from './companions/pet_axolotl.png'
import dog from './companions/pet_dog.png'
import fox from './companions/pet_fox.png'
import kitty from './companions/pet_kitty.png'
import monkey from './companions/pet_monkey.png'
import otter from './companions/pet_otter.png'
import raccoon from './companions/pet_raccoon.png'
import ram from './companions/pet_ram.png'

export const sceneArt = { sun, cloud, island, sailboat, ground, dock, bush, sign }
export const characterArt = { girlFoxLogin }
export const companionArt = { boy, girl, axolotl, dog, fox, kitty, monkey, otter, raccoon, ram }
