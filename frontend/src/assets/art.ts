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
import type { BuddyId } from '../setup/quizData'
import sun from './scene/sun.svg'
import cloud from './scene/cloud.svg'
import island from './scene/island.svg'
import sailboat from './scene/sailboat.svg'
import ground from './scene/ground.svg'
import dock from './scene/dock.svg'
import bush from './scene/bush.svg'
import sign from './scene/sign.svg'

// Login screen only: girl + fox (371x474), in layers so heads and eyes can
// move. Every layer is 371x474 and they line up exactly when stacked.
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

// The kid's bedroom at night (the intro clip and the setup book's background).
// WebP copies made by `npm run web-art` from assets/bedroom/*.png: each room
// picture has a sharp copy and a pre-blurred "soft" one (half size) for the
// focus change. layout.json says how big each one is and where the shelf, bed
// and chair go on the back wall.
import bedroomLayoutJson from './bedroom/web/layout.json'
import backWall from './bedroom/web/back-wall.webp'
import backWallSoft from './bedroom/web/back-wall-soft.webp'
import roomShelf from './bedroom/web/room-shelf.webp'
import roomShelfSoft from './bedroom/web/room-shelf-soft.webp'
import roomChair from './bedroom/web/room-chair.webp'
import roomChairSoft from './bedroom/web/room-chair-soft.webp'
import roomBed from './bedroom/web/room-bed.webp'
import roomBedSoft from './bedroom/web/room-bed-soft.webp'
import bedroomDesk from './bedroom/web/desk.webp'
import bedroomDeskSoft from './bedroom/web/desk-soft.webp'
import startFrame from './bedroom/web/start-frame.webp'
import startFrameOnPage from './bedroom/web/start-frame-on-page.webp'
// The hands: the slightly lighter, warmer copies (scripts/make-light-hands.mjs), closer to
// the kid's skin in the pull-in wide shot. Used everywhere: intro, pull-in, magic fall.
import handLeft from './bedroom/web/hand-left-light.webp'
import handLeftShadow from './bedroom/web/hand-left-shadow.webp'
import handRight from './bedroom/web/hand-right-pencil-light.webp'
import handRightShadow from './bedroom/web/hand-right-pencil-shadow.webp'

export const sceneArt = { sun, cloud, island, sailboat, ground, dock, bush, sign }
export const characterArt = { ollie }
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

export const bedroomArt = {
  wall: { sharp: backWall, soft: backWallSoft },
  shelf: { sharp: roomShelf, soft: roomShelfSoft },
  chair: { sharp: roomChair, soft: roomChairSoft },
  bed: { sharp: roomBed, soft: roomBedSoft },
  desk: bedroomDesk,
  deskSoft: bedroomDeskSoft,
  /** The glowing page the Student falls into: the pull-in ends on it and the magic video starts from it. */
  startFrame,
  /** The start frame with soft clear edges, as it lies on the storybook's page. */
  startFrameOnPage,
  handLeft: { picture: handLeft, shadow: handLeftShadow },
  handRight: { picture: handRight, shadow: handRightShadow },
}
/** Sizes and places of the bedroom pictures, in their own pixels (see make-web-art.mjs). */
export const bedroomLayout = bedroomLayoutJson

// The setup storybook's Boy or Girl and quiz pages: still, hand-drawn
// pictures. WebP copies made by `npm run web-art` from assets/storybook/*.
// The answer pictures a..d follow the order of the answers in setup/quizData.ts.
const storybookFiles = import.meta.glob<string>('./storybook/web/*.webp', { eager: true, import: 'default' })
const storybookPicture = (name: string): string => {
  const url = storybookFiles[`./storybook/web/${name}.webp`]
  if (!url) throw new Error(`Missing storybook picture ${name}.webp (run npm run web-art)`)
  return url
}
const QUESTIONS = [1, 2, 3, 4, 5]

export const storybookArt = {
  /** The pencil boy and girl, on a transparent background. */
  kids: { boy: storybookPicture('kid-boy'), girl: storybookPicture('kid-girl') },
  /** The Boy and Girl cards' backgrounds. */
  cardBg: { boy: storybookPicture('bg-boy'), girl: storybookPicture('bg-girl') },
  /** One scene per question: scenes[0] is question 1. */
  scenes: QUESTIONS.map((n) => storybookPicture(`q${n}-scene`)),
  /** The 4 answer pictures per question: answers[0][0] is question 1's first answer. */
  answers: QUESTIONS.map((n) => ['a', 'b', 'c', 'd'].map((letter) => storybookPicture(`q${n}-${letter}`))),
  /** Pick your buddy's left page: the meadow with the tree stump and the bench (no buddies in it). */
  meadow: storybookPicture('buddy-meadow'),
  /** The buddies in pencil, on a transparent background (pencil-<id>.webp). A buddy without one shows a silhouette. */
  pencilBuddies: Object.fromEntries(
    Object.entries(storybookFiles).flatMap(([path, url]) => {
      const id = /\/pencil-([a-z]+)\.webp$/.exec(path)?.[1]
      return id ? [[id, url]] : []
    }),
  ) as Partial<Record<BuddyId, string>>,
}
