import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { isBuddyId, type BuddyId } from '../../setup/quizData'
import { MagicFall } from '../MagicFall/MagicFall'
import { magicVideo } from '../MagicFall/magicVideo'
import { SetupBook } from '../Setup/SetupBook'

/** After it ends, what is underneath stays up this long before it plays again. */
const LOOP_PAUSE_MS = 1500

/**
 * Dev only (/dev/pullin): "the buddy reaches out and pulls you in", then the
 * magic fall, on a loop with a Restart button. Nothing is saved.
 *   ?buddy=fox   any buddy id (default otter); &color=mint for a buddy color
 *   ?t=4         hold second 4 (of the clip, or of the fall with part=fall)
 *   ?video=0     as if the magic video file wasn't there
 *   ?part=fall   only the magic fall, with the buddy on top
 */
export function DevPullInScreen() {
  const [params] = useSearchParams()
  const asked = params.get('buddy')
  const buddy: BuddyId = isBuddyId(asked) ? asked : 'otter'
  const buddyColor = params.get('color') ?? undefined
  const frozen = params.get('t')
  const freezeAt = frozen !== null && Number.isFinite(Number(frozen)) ? Number(frozen) : undefined
  const video = params.get('video') === '0' ? null : magicVideo
  const onlyFall = params.get('part') === 'fall'

  const [run, setRun] = useState(0)
  const [part, setPart] = useState<'clip' | 'fall' | 'after'>(onlyFall ? 'fall' : 'clip')
  const restart = () => {
    setPart(onlyFall ? 'fall' : 'clip')
    setRun((r) => r + 1)
  }

  // Loop: a short look at where it lands, then again from the start.
  useEffect(() => {
    if (part !== 'after') return
    const timer = window.setTimeout(restart, LOOP_PAUSE_MS)
    return () => window.clearTimeout(timer)
    // restart only uses setters and onlyFall.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [part, onlyFall])

  return (
    <>
      {/* Under the fall: what the Customize Bridge would be (a plain page here). */}
      {part === 'after' || onlyFall ? (
        <main style={{ display: 'grid', placeItems: 'center', minHeight: '100svh' }}>
          <p>The Customize Bridge opens here.</p>
        </main>
      ) : (
        <SetupBook
          key={run}
          pullIn={{ buddy, buddyColor, freezeAt, onEnd: (next) => setPart(next === 'fall' ? 'fall' : 'after') }}
        />
      )}
      {part === 'fall' && (
        <MagicFall
          key={`fall-${run}`}
          buddy={buddy}
          buddyColor={buddyColor}
          video={video}
          freezeAt={onlyFall ? freezeAt : undefined}
          onLeave={() => {}}
          onGone={() => setPart('after')}
        />
      )}
      <button type="button" style={{ position: 'fixed', left: 12, top: 12, zIndex: 300, padding: '6px 14px' }} onClick={restart}>
        Restart
      </button>
    </>
  )
}
