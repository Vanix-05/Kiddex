import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { CardPages } from './LoginCards'
import { PrintCardsContext, type LoginCardInfo } from './printCards'
import styles from './loginCards.module.css'

/** The class the print styles look for (loginCards.module.css): only this shows on paper. */
const PRINT_ROOT = 'kiddex-print-root'

/**
 * Prints login cards with the browser's own print (no PDF library). The sheets
 * sit in a portal on <body> that only shows while printing; the whole app is
 * hidden on paper. On a phone the browser's print/share sheet opens.
 */
export function PrintCardsProvider({ children }: { children: ReactNode }) {
  // `n` makes printing the same cards twice still print twice.
  const [job, setJob] = useState<{ cards: LoginCardInfo[]; n: number } | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const print = useCallback((cards: LoginCardInfo[]) => {
    if (cards.length > 0) setJob((j) => ({ cards, n: (j?.n ?? 0) + 1 }))
  }, [])

  useEffect(() => {
    if (!job) return
    let stopped = false
    // Wait for Ollie's picture, so every card prints with it.
    const pictures = [...(rootRef.current?.querySelectorAll('img') ?? [])]
    void Promise.all(pictures.map((img) => img.decode().catch(() => undefined))).then(() => {
      if (!stopped) window.print()
    })
    return () => {
      stopped = true
    }
  }, [job])

  return (
    <PrintCardsContext.Provider value={print}>
      {children}
      {/* Kept after printing (hidden on screen), so a phone's slower print sheet still finds it. */}
      {job &&
        createPortal(
          <div ref={rootRef} className={`${PRINT_ROOT} ${styles.printRoot}`}>
            <CardPages cards={job.cards} />
          </div>,
          document.body,
        )}
    </PrintCardsContext.Provider>
  )
}
