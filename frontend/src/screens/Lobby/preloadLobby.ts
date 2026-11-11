/**
 * The Lobby (and Pixi with it) is its own download, so the login page stays
 * small. The Customize screen calls this as soon as it opens, so the Lobby is
 * ready by the time the cutscene ends. Calling it again is free: the browser
 * keeps the first download.
 */
import type { Avatar } from '../../setup/avatar'
import type { Look } from '../../setup/customizeData'
import type { BuddyId } from '../../setup/quizData'

export const preloadLobby = () => import('./LobbyScreen')

/** When the cutscene starts (the look is final): also draw the Student's pictures ahead of time. */
export const prewarmLobby = (avatar: Avatar, buddy: BuddyId, look: Look) =>
  import('./useLobbyCast').then((m) => m.prewarmStudent(avatar, buddy, look))
