import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { SetupBook } from '../Setup/SetupBook'

/** After the clip ends, the Boy or Girl page stays up this long before it plays again. */
const LOOP_PAUSE_MS = 2000

/**
 * Dev only (/dev/intro): the bedroom intro clip, into the setup storybook,
 * on a loop with a Restart button. ?t=8 holds second 8, to check any moment
 * by eye (nothing loops then).
 */
export function DevIntroScreen() {
  const [params] = useSearchParams()
  const frozen = params.get('t')
  const freezeAt = frozen !== null && Number.isFinite(Number(frozen)) ? Number(frozen) : undefined
  const [run, setRun] = useState(0)
  const [ended, setEnded] = useState(0)

  // Loop: a short look at where it lands, then again from the start.
  useEffect(() => {
    if (!ended || freezeAt !== undefined) return
    const timer = window.setTimeout(() => setRun((r) => r + 1), LOOP_PAUSE_MS)
    return () => window.clearTimeout(timer)
  }, [ended, freezeAt])

  return (
    <>
      <SetupBook key={run} intro freezeAt={freezeAt} onIntroEnd={() => setEnded((n) => n + 1)} />
      <button
        type="button"
        style={{ position: 'fixed', left: 12, top: 12, zIndex: 300, padding: '6px 14px' }}
        onClick={() => setRun((r) => r + 1)}
      >
        Restart
      </button>
    </>
  )
}
