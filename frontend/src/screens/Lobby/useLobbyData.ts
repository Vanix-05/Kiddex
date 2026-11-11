import { lobbyMock } from '../../mock/lobbyMock'
import type { LobbyData } from './lobbyData'

/**
 * Everything the Lobby shows that will come from the backend: the Student's
 * progress, their classmates, today's mission and Ollie's lines.
 *
 * FAKE for now: it returns src/mock/lobbyMock.ts. Replace the body with the
 * real API calls later; the screen only uses this hook.
 */
export function useLobbyData(): LobbyData {
  return lobbyMock
}
