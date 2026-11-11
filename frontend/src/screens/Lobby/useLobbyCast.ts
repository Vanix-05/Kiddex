import { useEffect, useState } from 'react'
import { characterArt } from '../../assets/art'
import type { CompanionId } from '../../companions/registry'
import type { Avatar } from '../../setup/avatar'
import { lookBuddyColor, lookBuddyExtras, lookColors, lookYouExtras, type Look } from '../../setup/customizeData'
import type { BuddyId } from '../../setup/quizData'
import { characterPicture } from './characterTexture'
import type { CastMember, LobbyCast } from './game/LobbyGame'
import type { Classmate } from './lobbyData'

/** The logged-in Student, as the Lobby needs them. */
export interface LobbyStudent {
  name: string
  avatar: Avatar
  buddy: BuddyId
  buddyName: string
  look: Look
}

const kidPicture = (avatar: CompanionId, look: Look, mood?: 'happy') =>
  characterPicture(avatar, { colors: lookColors(look), extras: lookYouExtras(look) }, mood)

const buddyPicture = (buddy: CompanionId, look: Look) =>
  characterPicture(buddy, { buddyColor: lookBuddyColor(look), extras: lookBuddyExtras(look) })

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Draws the Student's own pictures ahead of time, while the Rene Island
 * cutscene plays, so the Lobby opens sooner. One at a time with a rest in
 * between, so the cutscene stays smooth. The pictures are cached by look.
 */
export async function prewarmStudent(avatar: Avatar, buddy: BuddyId, look: Look) {
  const draws = [() => kidPicture(avatar, look), () => kidPicture(avatar, look, 'happy'), () => buddyPicture(buddy, look)]
  for (const draw of draws) {
    await pause(400)
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
 * Everyone's pictures for the room: the Student and their buddy in their
 * Customize look (plus the Student's happy face), each classmate, and Ollie.
 * `cast` is null while they are being drawn.
 */
export function useLobbyCast(student: LobbyStudent, classmates: readonly Classmate[]) {
  const [cast, setCast] = useState<LobbyCast | null>(null)
  const [failed, setFailed] = useState(false)
  const { name, avatar, buddy, buddyName } = student
  // The look as text, so a new but equal object doesn't redraw everyone.
  const lookKey = JSON.stringify(student.look)

  useEffect(() => {
    let alive = true
    const look = JSON.parse(lookKey) as Look
    const load = async (): Promise<LobbyCast> => {
      const [kid, happy, pet, ollie] = await Promise.all([
        kidPicture(avatar, look),
        kidPicture(avatar, look, 'happy'),
        buddyPicture(buddy, look),
        loadImage(characterArt.ollie),
      ])
      const mates: CastMember[] = []
      for (const mate of classmates) {
        mates.push({
          id: mate.id,
          name: mate.name,
          buddyName: mate.buddyName,
          kid: await kidPicture(mate.avatar, mate.look),
          buddy: await buddyPicture(mate.buddy, mate.look),
        })
      }
      return { me: { id: 'me', name, buddyName, kid, happy, buddy: pet }, classmates: mates, ollie }
    }
    load().then(
      (loaded) => alive && setCast(loaded),
      () => alive && setFailed(true),
    )
    return () => {
      alive = false
    }
  }, [name, avatar, buddy, buddyName, lookKey, classmates])

  return { cast, failed }
}
