import type { ReactNode } from 'react'
import { BigIcon, CardButton, LobbyCard } from './LobbyCard'
import styles from './ui.module.css'
import shop from './starShop.module.css'

// FAKE: prices are placeholders until the shop is built.
const ITEMS: readonly { name: string; price: number; pic: ReactNode }[] = [
  {
    name: 'Cap',
    price: 30,
    pic: <path d="M5 26c0-9 6-15 14-15s13 6 13 14v1H5zm27 0c3 0 7 1 9 3H30z" />,
  },
  {
    name: 'Big bow',
    price: 20,
    pic: <path d="M23 20 8 10c-3-2-6 0-5 4l2 12c1 4 4 5 7 3l11-6 11 6c3 2 6 1 7-3l2-12c1-4-2-6-5-4zm-3 3h6v5h-6z" />,
  },
  {
    name: 'Sunglasses',
    price: 40,
    pic: <path d="M3 15h42v4h-2c-1 7-4 10-9 10s-8-4-8-9h-4c0 5-3 9-8 9s-8-3-9-10H3z" />,
  },
  {
    name: 'Crown',
    price: 80,
    pic: <path d="M6 31 3 11l11 9 10-13 10 13 11-9-3 20zm0 3h36v4H6z" />,
  },
]

/**
 * The Star Shop on the classroom's left wall: buying isn't built yet, so it shows what
 * will be there as faded shadows. `stars`: the same number as the top bar; none
 * in the Teacher's view-only Lobby (a Teacher has no stars).
 */
export function StarShopCard({ stars, onClose }: { stars?: number; onClose: () => void }) {
  return (
    <LobbyCard label="Star Shop: coming soon" onClose={onClose}>
      <BigIcon icon="star" tint="--color-tint-peach" />
      <h2 className={styles.cardTitle}>Star Shop</h2>
      <p className={styles.soon}>Coming soon</p>
      <p className={shop.desc}>Trade the stars you win in games for special looks for you and your buddy.</p>
      <ul className={shop.items}>
        {ITEMS.map((item) => (
          <li key={item.name} className={shop.item}>
            <svg className={shop.pic} viewBox="0 0 48 40" aria-hidden="true">
              {item.pic}
            </svg>
            <span className={shop.name}>{item.name}</span>
            <span className={shop.price}>
              <span aria-hidden="true">★ </span>
              {item.price}
              <span className="visually-hidden"> stars</span>
            </span>
          </li>
        ))}
      </ul>
      {stars !== undefined && (
        <p className={shop.have}>
          You have{' '}
          <b>
            <span aria-hidden="true">★ </span>
            {stars}
            <span className="visually-hidden"> stars</span>
          </b>{' '}
          · keep playing to collect more!
        </p>
      )}
      <div className={styles.acts}>
        <CardButton color="orange" primary onClick={onClose}>
          Okay
        </CardButton>
      </div>
    </LobbyCard>
  )
}
