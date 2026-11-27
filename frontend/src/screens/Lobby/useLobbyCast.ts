import { useEffect, useState } from 'react'
import { characterArt } from '../../assets/art'
import type { CompanionId } from '../../companions/registry'
import type { Avatar } from '../../setup/avatar'
import { DEFAULT_LOOK, loadKidPieces } from '../../companions/wardrobe/items'
import { kidLook, lookBuddyColor, lookBuddyExtras, lookYouExtras, type Look } from '../../setup/customizeData'
import type { BuddyId } from '../../setup/quizData'
import { characterPicture, kidCharacterPicture } from './characterTexture'
import type { CastMember, LobbyCast } from './game/LobbyGame'

/** The logged-in Student, as the Lobby needs them. */
export interface LobbyStudent {
  name: string
  avatar: Avatar
  buddy: BuddyId
  buddyName: string
  look: Look
}

/**
 * The Student's (or a classmate's) kid in their wardrobe look. Old or other-kid
 * looks are made to fit by kidLook. If a piece can't be downloaded, the kid is
 * drawn in their default clothes and hair (keeping skin and eyes), never broken.
 */
export async function kidPicture(avatar: Avatar, look: Look, mood?: 'happy') {
  const kl = kidLook(look, avatar)
  const extras = lookYouExtras(look)
  try {
    return await kidCharacterPicture(avatar, kl, extras, mood)
  } catch {
    const plain = { ...DEFAULT_LOOK[avatar], skin: kl.skin, eyeColor: kl.eyeColor, eyes: kl.eyes }
    return kidCharacterPicture(avatar, plain, extras, mood)
  }
}

export const buddyPicture = (buddy: CompanionId, look: Look) =>
  characterPicture(buddy, { buddyColor: lookBuddyColor(look), extras: lookBuddyExtras(look) })

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Draws the Student's own pictures ahead of time, while the Rene Island
 * cutscene plays, so the Lobby opens sooner. One at a time with a rest in
 * between, so the cutscene stays smooth. The pictures are cached by look.
 */
export async function prewarmStudent(avatar: Avatar, buddy: BuddyId, look: Look, restMs = 400) {
  // Start downloading the kid's wardrobe pieces now (the pictures below wait for them).
  void loadKidPieces(avatar, kidLook(look, avatar)).catch(() => {})
  const draws = [() => kidPicture(avatar, look), () => kidPicture(avatar, look, 'happy'), () => buddyPicture(buddy, look)]
  for (const draw of draws) {
    if (restMs > 0) await pause(restMs)
    await draw().catch(() => {}) // the Lobby tries again, and shows its own message if it can't
  }
}

async function loadImage(src: string) {
  const image = new Image()
  image.src = src
  await image.decode()
  return image
}

/**
 * The pictures the room needs to open: the Student and their buddy in their
 * Customize look (plus the Student's happy face), and Ollie. `cast` is null
 * while they are being drawn. With no Student (the Teacher's view-only visit),
 * only Ollie. Classmates come and go later (useLiveClassmates.ts).
 */
export function useLobbyCast(student: LobbyStudent | null) {
  const [cast, setCast] = useState<LobbyCast | null>(null)
  const [failed, setFailed] = useState(false)
  const name = student?.name
  const avatar = student?.avatar
  const buddy = student?.buddy
  const buddyName = student?.buddyName
  // The look as text, so a new but equal object doesn't redraw everyone.
  const lookKey = JSON.stringify(student?.look ?? null)

  useEffect(() => {
    let alive = true
    const look = JSON.parse(lookKey) as Look | null
    const loadMe = async (): Promise<CastMember | null> => {
      if (!look || !avatar || !buddy || name === undefined || buddyName === undefined) return null
      const [kid, happy, pet] = await Promise.all([
        kidPicture(avatar, look),
        // The happy face is a bonus: without it, the kid keeps the calm face.
        kidPicture(avatar, look, 'happy').catch(() => undefined),
        buddyPicture(buddy, look),
      ])
      return { id: 'me', name, buddyName, kid, happy, buddy: pet }
    }
    const load = async (): Promise<LobbyCast> => {
      const [me, ollie] = await Promise.all([loadMe(), loadImage(characterArt.ollie)])
      return { me, ollie }
    }
    load().then(
      (loaded) => alive && setCast(loaded),
      (e) => {
        console.warn('[lobby] cast failed:', e)
        if (alive) setFailed(true)
      },
    )
    return () => {
      alive = false
    }
  }, [name, avatar, buddy, buddyName, lookKey])

  return { cast, failed }
}
