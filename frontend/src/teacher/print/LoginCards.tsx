import { characterArt } from '../../assets/art'
import { CARDS_PER_PAGE, type LoginCardInfo } from './printCards'
import styles from './loginCards.module.css'

/** One login card: the same in the preview and on paper (sized in mm and pt). */
export function LoginCard({ card }: { card: LoginCardInfo }) {
  return (
    <div className={styles.card}>
      <strong className={styles.brand}>KIDDEX</strong>
      <span className={styles.meta}>
        {card.section} · {card.teacher}
      </span>
      <span className={styles.label}>School ID</span>
      <span className={styles.schoolId}>{card.schoolId}</span>
      <span className={styles.label}>One-time code</span>
      <span className={styles.code}>{card.code}</span>
      <span className={styles.tip}>
        Tap <strong>New Student</strong>, then make your own PIN code.
      </span>
      <img src={characterArt.ollie} alt="" className={styles.ollie} draggable={false} />
    </div>
  )
}

/** One A4 page of up to 8 cards (2 × 4), with dashed cut lines. Empty places stay blank. */
export function CardPage({ cards }: { cards: LoginCardInfo[] }) {
  return (
    <div className={styles.page}>
      {Array.from({ length: CARDS_PER_PAGE }, (_, i) =>
        cards[i] ? <LoginCard key={cards[i].id} card={cards[i]} /> : <div key={`empty-${i}`} className={styles.empty} />,
      )}
    </div>
  )
}

/** Splits the cards into pages of 8. */
export function CardPages({ cards }: { cards: LoginCardInfo[] }) {
  const pages = Array.from({ length: Math.ceil(cards.length / CARDS_PER_PAGE) }, (_, i) =>
    cards.slice(i * CARDS_PER_PAGE, (i + 1) * CARDS_PER_PAGE),
  )
  return (
    <>
      {pages.map((page, i) => (
        <CardPage key={i} cards={page} />
      ))}
    </>
  )
}

/** The first page as a small white A4 sheet (the Print login cards view). */
export function CardPreview({ cards }: { cards: LoginCardInfo[] }) {
  return (
    <div className={styles.previewBox} aria-hidden="true">
      <div className={styles.paper}>
        <CardPage cards={cards.slice(0, CARDS_PER_PAGE)} />
      </div>
    </div>
  )
}
