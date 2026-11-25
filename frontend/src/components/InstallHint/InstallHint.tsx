import { useEffect, useRef, useState } from 'react'
import { characterArt } from '../../assets/art'
import appIcon from '../../assets/app-icon.png'
import { usePhoneSideways } from '../../hooks/usePhoneSideways'
import { promptInstall, snoozeInstallHint, useInstallKind, type InstallKind } from './installApp'
import styles from './InstallHint.module.css'

/**
 * Phones only, on the Welcome screen: a small "Play like an app" chip (top right).
 * It opens Ollie's card: on iPhone the 3 steps (Share, Add to Home Screen, open
 * KIDDEX from its icon); on Android one "Add KIDDEX" button (Chrome's own prompt).
 * Never on laptops, never once KIDDEX is opened from its icon, and "Not now"
 * hides it for a week (installApp.ts).
 */
export function InstallHint() {
  const phone = usePhoneSideways()
  const kind = useInstallKind()
  const [open, setOpen] = useState(false)
  if (!phone || !kind) return null
  return (
    <>
      <button type="button" className={styles.chip} onClick={() => setOpen(true)} aria-haspopup="dialog">
        <img src={appIcon} alt="" className={styles.chipIcon} draggable={false} />
        Play like an app
      </button>
      {open && <InstallCard kind={kind} onClose={() => setOpen(false)} />}
    </>
  )
}

function InstallCard({ kind, onClose }: { kind: InstallKind; onClose: () => void }) {
  const firstRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    firstRef.current?.focus({ preventScroll: true })
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const notNow = () => {
    snoozeInstallHint()
    onClose()
  }
  const add = async () => {
    await promptInstall()
    onClose()
  }

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <section className={styles.card} role="dialog" aria-modal="true" aria-labelledby="install-title">
        <img src={characterArt.ollie} alt="" className={styles.ollie} draggable={false} />
        <div className={styles.body}>
          <h2 id="install-title" className={styles.title}>
            Play KIDDEX like an app!
          </h2>
          <p className={styles.sub}>Hoo! Put me on your home screen. No more address bar. You only do this once.</p>

          {kind === 'ios' ? (
            <ol className={styles.steps}>
              <li className={styles.step}>
                <span className={styles.num}>1</span>
                <span className={styles.pic}>
                  <ShareIcon />
                </span>
                <span>
                  Tap <b>Share</b> at the top
                </span>
              </li>
              <li className={styles.arrow} aria-hidden="true">
                ›
              </li>
              <li className={styles.step}>
                <span className={styles.num}>2</span>
                <span className={styles.pic}>
                  <AddIcon />
                </span>
                <span>
                  Tap <b>Add to Home Screen</b>
                </span>
              </li>
              <li className={styles.arrow} aria-hidden="true">
                ›
              </li>
              <li className={styles.step}>
                <span className={styles.num}>3</span>
                <span className={styles.pic}>
                  <img src={appIcon} alt="" className={styles.mini} draggable={false} />
                </span>
                <span>
                  Open <b>KIDDEX</b> from its icon
                </span>
              </li>
            </ol>
          ) : (
            <div className={styles.appRow}>
              <img src={appIcon} alt="" className={styles.bigIcon} draggable={false} />
              <div>
                <div className={styles.appName}>KIDDEX</div>
                <div className={styles.appSub}>Opens full screen, sideways</div>
              </div>
            </div>
          )}

          <div className={styles.acts}>
            <button ref={firstRef} type="button" className={styles.later} onClick={notNow}>
              Not now
            </button>
            {kind === 'ios' ? (
              <button type="button" className={styles.go} onClick={onClose}>
                Got it!
              </button>
            ) : (
              <button type="button" className={styles.go} onClick={add}>
                <span className={styles.plus} aria-hidden="true">
                  +
                </span>
                Add KIDDEX
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}

/** Safari's Share picture (a box with an arrow up). */
function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="#2F7DE1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 9H6.5A1.5 1.5 0 005 10.5v9A1.5 1.5 0 006.5 21h11a1.5 1.5 0 001.5-1.5v-9A1.5 1.5 0 0017.5 9H16" />
      <path d="M12 3v12M8.5 6.5L12 3l3.5 3.5" />
    </svg>
  )
}

/** The "Add to Home Screen" picture (a plus in a rounded square). */
function AddIcon() {
  return (
    <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3.5" y="3.5" width="17" height="17" rx="4" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  )
}
