import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { CompanionId } from '../../companions/registry'
import type { Look } from '../../setup/customizeData'
import { BridgeCutscene } from '../Customize/cutscene/BridgeCutscene'

/** Sample Students for the cutscene. */
const PRESETS: Record<string, { avatar: CompanionId; buddy: CompanionId; look: Look; buddyName: string | null }> = {
  // Girl + purple fox with a scarf
  a: {
    avatar: 'girl',
    buddy: 'fox',
    look: { hair: 'ginger', shirt: 'mint', youExtra: 'flower', buddyColor: 'purple', buddyExtra: 'scarf' },
    buddyName: 'Mochi',
  },
  // Boy (dark skin) + mint axolotl with a bow
  b: {
    avatar: 'boy',
    buddy: 'axolotl',
    look: { skin: 'skin6', hair: 'black', shirt: 'blue', youExtra: 'glasses', buddyColor: 'mint', buddyExtra: 'bow' },
    buddyName: null,
  },
}

/**
 * Dev only (/dev/cutscene): the Customize Bridge -> Rene Island cutscene with
 * a sample Student. ?p=a (girl + fox) or ?p=b (boy + axolotl); ?t=7.5 holds
 * one moment, for screenshots.
 */
export function DevCutsceneScreen() {
  const [params] = useSearchParams()
  const preset = PRESETS[params.get('p') ?? 'a'] ?? PRESETS.a
  const frozen = params.get('t')
  const freezeAt = frozen !== null && Number.isFinite(Number(frozen)) ? Number(frozen) : undefined
  const [run, setRun] = useState(0)
  const [done, setDone] = useState(false)

  if (done) {
    return (
      <main style={{ display: 'grid', placeItems: 'center', minHeight: '100svh', gap: 12 }}>
        <button
          type="button"
          autoFocus
          onClick={() => {
            setDone(false)
            setRun((r) => r + 1)
          }}
        >
          Done (onDone called). Play again
        </button>
      </main>
    )
  }

  return <BridgeCutscene key={run} {...preset} freezeAt={freezeAt} onDone={() => setDone(true)} />
}
