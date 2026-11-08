/**
 * Every illustration the app uses, imported in one place.
 *
 * Characters and companions are transparent images. Ollie and the companions
 * load as small WebP copies (characters/web, companions/web) made from the
 * big PNGs by `npm run web-art` (scripts/make-web-art.mjs); the PNGs stay for
 * the trace/rig scripts. The scene pieces are SVGs (the sea is drawn in code:
 * components/SceneBackground/Sea.tsx).
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
import ollie from './characters/web/ollie-cutout.webp'
// The same Ollie split in two for the wave (scripts/split-ollie-wing.mjs).
// Both are 428x600 and line up exactly with ollie-cutout.png when stacked.
import ollieBody from './characters/web/ollie-body.webp'
import ollieWing from './characters/web/ollie-wing.webp'
// Big transparent Ollie, cut from Ollie.png (scripts/cutout-ollie-large.mjs).
import ollieLargeImg from './characters/web/ollie-large.webp'

// Companions: 700x700 WebP copies of the 5000x5000 PNGs (see make-web-art.mjs)
import boy from './companions/web/human_boy.webp'
import girl from './companions/web/human_girl.webp'
import axolotl from './companions/web/pet_axolotl.webp'
import dog from './companions/web/pet_dog.webp'
import fox from './companions/web/pet_fox.webp'
import kitty from './companions/web/pet_kitty.webp'
import monkey from './companions/web/pet_monkey.webp'
import otter from './companions/web/pet_otter.webp'
import raccoon from './companions/web/pet_raccoon.webp'
import ram from './companions/web/pet_ram.webp'

export const sceneArt = { sun, cloud, island, sailboat, ground, dock, bush, sign }
export const characterArt = { girlFoxLogin, ollie }
export const ollieLayers = { body: ollieBody, wing: ollieWing }
/** Ollie at 845x1183 (same framing as ollie-cutout.png), for when he's drawn big. */
export const ollieLarge = ollieLargeImg
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
