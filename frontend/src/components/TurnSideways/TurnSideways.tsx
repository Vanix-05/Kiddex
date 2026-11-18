import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { characterArt } from '../../assets/art'
import { TOUCH_UPRIGHT_QUERY, useMediaQuery } from '../../hooks/usePhoneSideways'
import { useIsAdminArea } from '../../routes/pageArea'
import styles from './TurnSideways.module.css'

/**
 * "Turn your phone sideways": KIDDEX plays in landscape only. Shown over every
 * screen while a touch screen is held upright. CSS alone decides when it shows
 * (so it appears instantly); the hook only makes the page behind it inert.
 * There is no "Play anyway": a website can't turn the screen itself.
 *
 * Not on the Admin page (/admin): it works upright too. There, <html> has
 * data-area="admin" (routes/pageArea.ts): CSS hides the card and the page
 * behind is not made inert.
 */
export function TurnSideways() {
  const touchUpright = useMediaQuery(TOUCH_UPRIGHT_QUERY)
  const adminArea = useIsAdminArea()
  const upright = touchUpright && !adminArea
  const ref = useRef<HTMLDivElement>(null)

  // While it shows, nothing behind it gets taps or keyboard focus. Portals
  // (popups, the storybook) also live in <body>, so every other child of
  // <body> is made inert, including ones added while it shows.
  useEffect(() => {
    if (!upright) return
    const self = ref.current
    const touched = new Set<HTMLElement>()
    const block = (el: Element) => {
      if (el instanceof HTMLElement && el !== self && !el.inert && el.tagName !== 'SCRIPT') {
        el.inert = true
        touched.add(el)
      }
    }
    Array.from(document.body.children).forEach(block)
    const watch = new MutationObserver((changes) =>
      changes.forEach((change) => change.addedNodes.forEach((node) => node instanceof Element && block(node))),
    )
    watch.observe(document.body, { childList: true })
    return () => {
      watch.disconnect()
      touched.forEach((el) => (el.inert = false))
    }
  }, [upright])

  return createPortal(
    <div ref={ref} className={styles.overlay} role="alertdialog" aria-modal="true" aria-labelledby="turn-sideways-title">
      <div className={styles.card}>
        <img className={styles.ollie} src={characterArt.ollie} alt="" draggable={false} />
        <svg className={styles.phones} viewBox="0 0 120 80" aria-hidden="true">
          <rect className={styles.phone} x="10" y="12" width="30" height="56" rx="7" />
          <circle className={styles.dot} cx="25" cy="60" r="2.5" />
          <path className={styles.arrow} d="M50 22 C 64 8, 84 10, 92 24 M85 18 L 93 25 L 97 15" />
          <rect className={styles.phoneSideways} x="58" y="36" width="56" height="30" rx="7" />
          <circle className={styles.dot} cx="106" cy="51" r="2.5" />
        </svg>
        <h1 id="turn-sideways-title" className={styles.title}>
          Turn your <span className={styles.phoneWord}>phone</span>
          <span className={styles.tabletWord}>tablet</span> sideways
        </h1>
        <p className={styles.line}>KIDDEX plays sideways, like a game!</p>
        <p className={styles.hint}>Not turning? Check that your rotation lock is off.</p>
      </div>
    </div>,
    document.body,
  )
}
