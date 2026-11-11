import { EMOTES } from '../game/emotes'
import styles from './ui.module.css'

/** Bottom middle: each button shows a bubble over the Student (keys 1-5 too). */
export function EmoteBar({ onEmote }: { onEmote: (text: string, emoji: boolean) => void }) {
  return (
    <div className={styles.tray} role="toolbar" aria-label="Emotes">
      {EMOTES.map((emote) => (
        <button
          key={emote.text}
          type="button"
          className={emote.emoji ? styles.emo : styles.phrase}
          aria-label={emote.emoji ? emote.label : undefined}
          onClick={() => onEmote(emote.text, emote.emoji)}
        >
          {emote.text}
        </button>
      ))}
    </div>
  )
}
