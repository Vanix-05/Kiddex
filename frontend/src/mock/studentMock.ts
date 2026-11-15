// FAKE: delete when the backend is connected.
//
// A Returning Student's kid and buddy come from the backend later. Until then
// the session uses the look the New Student flow saved in this browser, and
// this one when there is none (session/SessionProvider.tsx).

import type { Avatar } from '../setup/avatar'
import type { Look } from '../setup/customizeData'
import type { BuddyId } from '../setup/quizData'

export const FAKE_RETURNING_STUDENT: { avatar: Avatar; companionId: BuddyId; buddyName: string; look: Look } = {
  avatar: 'girl',
  companionId: 'fox',
  buddyName: 'Mochi',
  look: { buddyColor: 'pink' },
}
