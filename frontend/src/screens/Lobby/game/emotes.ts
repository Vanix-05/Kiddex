/** The emote bar, in order: keys 1-5. `emoji` ones show as a big round bubble. */
export interface Emote {
  text: string
  emoji: boolean
  /** Read out for the emoji buttons. */
  label: string
}

export const EMOTES: readonly Emote[] = [
  { text: '👋', emoji: true, label: 'Wave' },
  { text: '🎉', emoji: true, label: 'Party' },
  { text: '💖', emoji: true, label: 'Love' },
  { text: 'Good job!', emoji: false, label: 'Good job!' },
  { text: "Let's play!", emoji: false, label: "Let's play!" },
]
