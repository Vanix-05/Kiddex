import { useNavigate, useParams } from 'react-router-dom'
import { GameNotReady, GameScreen } from '../../games/GameRoute'
import { PREVIEW_PLAYER } from '../../games/samplePlayer'
import { GAMES, isGameId } from '../../games/session'
import type { GameId, GameLesson } from '../../games/types'
import { useSession } from '../../session/session'
import { useLessonLoad } from '../data/useTeacherData'
import { approvedCardsFor, canPreview, gamesPagePath, previewPath } from './previewCards'
import styles from '../../games/GameRoute.module.css'

/**
 * /teacher/lessons/:id/preview/:gameId: the Teacher plays the lesson's
 * APPROVED questions in Quiz Show or Match Up, exactly as a Student would,
 * full screen. Nothing is saved (GameScreen's `preview`, see games/roundEnd.ts).
 * Leave and Back to games return to the lesson's Games page.
 */
export function TeacherPreviewScreen() {
  const { id, gameId } = useParams()
  const navigate = useNavigate()
  const { user } = useSession()
  const { lesson, loading } = useLessonLoad(id)

  const back = () => navigate(id ? gamesPagePath(id) : '/teacher/lessons')

  if (loading) {
    return (
      <div className={styles.empty} role="status">
        <p className={styles.loading}>Getting the game ready…</p>
      </div>
    )
  }

  if (!lesson) {
    return (
      <GameNotReady
        title="We couldn’t open this lesson"
        line="It may have been deleted, or the connection dropped. Try again from your lessons."
        button="Back to the lesson"
        onBack={back}
      />
    )
  }

  const game: GameId | null = isGameId(gameId) ? gameId : null
  if (!game || !canPreview(lesson.questions, game)) {
    const name = game ? GAMES[game].name : 'This game'
    return (
      <GameNotReady
        title={`${name} isn’t ready yet`}
        line={
          game && !GAMES[game].built
            ? 'This game isn’t built yet.'
            : 'Approve more questions for this game, then try it again.'
        }
        button="Back to the lesson"
        onBack={back}
      />
    )
  }

  const gameLesson: GameLesson = {
    id: lesson.id,
    // The topic, or the file name when there is no topic.
    name: lesson.title,
    teacher: user?.name || '',
    subject: lesson.subject,
  }

  return (
    <GameScreen
      gameId={game}
      player={PREVIEW_PLAYER}
      lesson={gameLesson}
      cards={approvedCardsFor(lesson.questions, game)}
      lessonCanPlay={(other) => canPreview(lesson.questions, other)}
      preview
      leaveTo="games"
      onLeave={back}
      onPlayGame={(next) => navigate(previewPath(lesson.id, next))}
    />
  )
}
