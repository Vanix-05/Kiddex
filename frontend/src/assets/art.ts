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
// The same picture split into layers so heads and eyes can move. Every layer
// is 371x474 and lines up exactly with girlfoxlogin.png when stacked.
import gfBody from './characters/girlfox/body.png'
import gfGirlHead from './characters/girlfox/girl-head.png'
import gfGirlEyes from './characters/girlfox/girl-eyes.png'
import gfGirlEyeArea from './characters/girlfox/girl-eye-area.png'
import gfFoxHead from './characters/girlfox/fox-head.png'
import gfFoxEyes from './characters/girlfox/fox-eyes.png'
import gfFoxEyeArea from './characters/girlfox/fox-eye-area.png'

// Setup screens: Ollie the guide owl (428x600). A transparent, smaller copy
// of characters/Ollie.png, whose background is solid white.
import ollie from './characters/ollie-cutout.png'
// The same Ollie split in two for the wave (scripts/split-ollie-wing.mjs).
// Both are 428x600 and line up exactly with ollie-cutout.png when stacked.
import ollieBody from './characters/ollie-body.png'
import ollieWing from './characters/ollie-wing.png'

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
export const characterArt = { girlFoxLogin, ollie }
export const ollieLayers = { body: ollieBody, wing: ollieWing }
export const girlFoxLayers = {
  body: gfBody,
  girlHead: gfGirlHead,
  girlEyes: gfGirlEyes,
  girlEyeArea: gfGirlEyeArea,
  foxHead: gfFoxHead,
  foxEyes: gfFoxEyes,
  foxEyeArea: gfFoxEyeArea,
}
export const companionArt = { boy, girl, axolotl, dog, fox, kitty, monkey, otter, raccoon, ram }
