import type { ReactNode } from 'react'
import { Companion } from '../../companions/Companion'
import { ITEMS } from '../../setup/customizeData'
import { buddyIds } from '../../setup/quizData'
import styles from './DevLooksScreen.module.css'

const AVATARS = ['boy', 'girl'] as const

/**
 * Dev only (/dev/looks): every Customize look at once, to check they're all
 * cute. Every buddy in every color (Gold too, locks ignored), and the boy and
 * girl in every skin with the face large. Still, calm figures.
 */
export function DevLooksScreen() {
  return (
    <main className={styles.page}>
      <h1>Every look</h1>

      <h2>Buddies × colors</h2>
      <div className={styles.grid} style={{ gridTemplateColumns: `auto repeat(${ITEMS.buddyColor.length}, 1fr)` }}>
        <span />
        {ITEMS.buddyColor.map((c) => (
          <b key={c.id} className={styles.colHead}>
            {c.label}
          </b>
        ))}
        {buddyIds.map((id) => (
          <Row key={id} label={id}>
            {ITEMS.buddyColor.map((c) => (
              <figure key={c.id} className={styles.cell}>
                <Companion id={id} still buddyColor={c.id} className={styles.buddy} />
              </figure>
            ))}
          </Row>
        ))}
      </div>

      <h2>Kids × skins</h2>
      <div className={styles.grid} style={{ gridTemplateColumns: `auto repeat(${ITEMS.skin.length}, 1fr)` }}>
        <span />
        {ITEMS.skin.map((s, i) => (
          <b key={s.id} className={styles.colHead}>
            Skin {i + 1}
          </b>
        ))}
        {AVATARS.map((id) => (
          <Row key={id} label={id}>
            {ITEMS.skin.map((s) => (
              <figure key={s.id} className={`${styles.cell} ${styles.face}`}>
                <Companion id={id} still colors={{ skin: s.swatch }} className={styles.kid} />
              </figure>
            ))}
          </Row>
        ))}
      </div>
    </main>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <b className={styles.rowHead}>{label}</b>
      {children}
    </>
  )
}
