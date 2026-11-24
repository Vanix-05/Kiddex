import { teacherWords } from '../../../games/studentData'
import type { Mission } from '../lobbyData'
import { BigIcon, CardButton, LobbyCard } from './LobbyCard'
import styles from './ui.module.css'
import m from './mission.module.css'

/**
 * The chalkboard: today's lesson (mockups b1, b2, b3). Key words (the lesson's
 * first matching pairs) or key ideas (its first fill-in-the-blank sentences,
 * with the answer in bold), from the backend.
 */
export function BoardCard({ mission, onClose }: { mission: Mission; onClose: () => void }) {
  const gotIt = (
    <div className={styles.acts}>
      <CardButton color="orange" primary onClick={onClose}>
        Got it
      </CardButton>
    </div>
  )

  if (mission.state === 'none') {
    return (
      <LobbyCard label="Today's lesson" onClose={onClose}>
        <BigIcon icon="book" tint="--color-tint-mint" />
        <h2 className={styles.cardTitle}>Nothing on the board yet</h2>
        <p className={styles.sub}>
          When {teacherWords(mission.teacher)} gives your class a mission, its key words show up here.
        </p>
        {gotIt}
      </LobbyCard>
    )
  }

  const { keyWords, keyIdeas } = mission.board
  return (
    <LobbyCard label="Today's lesson" onClose={onClose}>
      <BigIcon icon="book" tint="--color-tint-mint" />
      <h2 className={styles.cardTitle}>{mission.lessonTitle}</h2>
      <p className={styles.sub}>
        {mission.subject ? `${mission.subject} lesson` : 'Lesson'} from {teacherWords(mission.teacher)}
      </p>
      {(keyWords.length > 0 || keyIdeas.length > 0) && (
        <div className={m.chalk}>
          <div className={m.chalkHead}>{keyWords.length > 0 ? 'Key words' : 'Key ideas'}</div>
          <ol>
            {keyWords.length > 0
              ? keyWords.map((k, i) => (
                  <li key={i}>
                    <b>{k.word}</b>
                    <span>{k.text}</span>
                  </li>
                ))
              : keyIdeas.map((k, i) => (
                  <li key={i}>
                    <span>
                      {k.before}
                      <b>{k.answer}</b>
                      {k.after}
                    </span>
                  </li>
                ))}
          </ol>
        </div>
      )}
      {gotIt}
    </LobbyCard>
  )
}
