import { useEffect, useState } from 'react'
import { loadedPiece, loadPiece, type PieceFile } from './items'

/** True once every file is downloaded (and re-renders then). */
export function usePiecesLoaded(files: readonly PieceFile[]): boolean {
  const key = files.join(' ')
  const [, setDone] = useState('')
  const ready = files.every((f) => loadedPiece(f))
  useEffect(() => {
    const list = key ? key.split(' ') : []
    if (list.every((f) => loadedPiece(f))) return
    let live = true
    Promise.all(list.map(loadPiece)).then(
      () => live && setDone(key),
      (e: unknown) => console.error(e),
    )
    return () => {
      live = false
    }
  }, [key])
  return ready
}
