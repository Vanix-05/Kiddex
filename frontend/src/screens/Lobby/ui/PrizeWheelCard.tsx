import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { WHEEL_COLORS } from '../game/drawRoom'
import type { Mission, WheelPrize } from '../lobbyData'
import { BigIcon, CardButton, LobbyCard } from './LobbyCard'
import styles from './ui.module.css'

export type WheelState = 'locked' | 'ready' | 'used'

const hex = (n: number) => `#${n.toString(16).padStart(6, '0')}`
const SPIN_MS = 3600
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * The Prize Wheel on the Quiz Stage. One spin a day, earned by finishing
 * Ollie's mission. Every slice is a prize: no blanks, no "so close", and
 * spins are never bought.
 */
export function PrizeWheelCard({
  state,
  prizes,
  mission,
  lastPrize,
  lessMotion,
  onSpinStart,
  onWin,
  onMission,
  onClose,
}: {
  state: WheelState
  prizes: WheelPrize[]
  mission: Mission
  /** What today's spin gave (state 'used'). */
  lastPrize: WheelPrize | null
  lessMotion: boolean
  onSpinStart: () => void
  onWin: (prize: WheelPrize) => void
  onMission: () => void
  onClose: () => void
}) {
  const [turn, setTurn] = useState(0)
  const [phase, setPhase] = useState<'idle' | 'spinning' | 'won'>('idle')
  const [won, setWon] = useState<WheelPrize | null>(null)
  const timer = useRef(0)
  useEffect(() => () => window.clearTimeout(timer.current), [])

  const n = prizes.length
  const slice = 360 / n
  const fast = lessMotion || reducedMotion()
  const ms = fast ? 600 : SPIN_MS

  const spin = () => {
    if (phase !== 'idle') return
    const i = Math.floor(Math.random() * n)
    // Bring the middle of slice i under the pointer at the top, after a few full turns.
    setTurn(360 * (fast ? 1 : 6) + (360 - (i * slice + slice / 2)))
    setPhase('spinning')
    onSpinStart()
    timer.current = window.setTimeout(() => {
      setWon(prizes[i])
      setPhase('won')
      onWin(prizes[i])
    }, ms + 150)
  }

  const wheel = (
    <div className={styles.wheelBox}>
      <svg
        viewBox="-110 -110 220 220"
        className={styles.wheelSvg}
        style={{ transform: `rotate(${turn}deg)`, transitionDuration: `${ms}ms` } as CSSProperties}
        aria-hidden="true"
      >
        <circle r="106" fill="#ffc94d" stroke="#7a4a2c" strokeWidth="5" />
        {prizes.map((p, i) => {
          const a0 = ((i * slice - 90) * Math.PI) / 180
          const a1 = (((i + 1) * slice - 90) * Math.PI) / 180
          const r = 96
          const mid = i * slice + slice / 2
          return (
            <g key={i}>
              <path
                d={`M0 0L${Math.cos(a0) * r} ${Math.sin(a0) * r}A${r} ${r} 0 0 1 ${Math.cos(a1) * r} ${Math.sin(a1) * r}Z`}
                fill={hex(WHEEL_COLORS[i % WHEEL_COLORS.length])}
                stroke="#7a4a2c"
                strokeWidth="2.5"
                strokeLinejoin="round"
              />
              <g transform={`rotate(${mid}) translate(0 -66)`}>
                <text textAnchor="middle" fontSize="24" y="4">
                  {p.icon}
                </text>
                <text textAnchor="middle" fontSize="12.5" fontWeight="700" y="24" fill="#4a2c17">
                  {p.stars ? `+${p.stars}` : 'Sticker'}
                </text>
              </g>
            </g>
          )
        })}
        <circle r="16" fill="#fff3d6" stroke="#7a4a2c" strokeWidth="4" />
      </svg>
      <span className={styles.wheelPointer} aria-hidden="true" />
    </div>
  )

  if (state === 'locked') {
    return (
      <LobbyCard label="Prize Wheel" onClose={onClose}>
        {wheel}
        <h2 className={styles.cardTitle}>Prize Wheel</h2>
        <p className={styles.sub}>Finish today's mission from Ollie to earn a free spin. Every slice is a prize!</p>
        {mission.state === 'none' ? (
          <p className={styles.sub}>There is no mission right now.</p>
        ) : (
          <p className={styles.sub}>
            <b>
              {mission.done.length} of {mission.games.length} mission games
            </b>{' '}
            done
          </p>
        )}
        <div className={styles.acts}>
          <CardButton onClick={onClose}>Later</CardButton>
          <CardButton color="orange" primary onClick={onMission}>
            Go to mission
          </CardButton>
        </div>
      </LobbyCard>
    )
  }

  if (state === 'used' && phase === 'idle') {
    return (
      <LobbyCard label="Prize Wheel" onClose={onClose}>
        <BigIcon icon="wheel" tint="--color-tint-lavender" />
        <h2 className={styles.cardTitle}>See you tomorrow!</h2>
        <p className={styles.sub}>
          {lastPrize ? (
            <>
              Today you won <b>{lastPrize.icon} {lastPrize.label}</b>.{' '}
            </>
          ) : null}
          Finish tomorrow's mission for another spin.
        </p>
        <div className={styles.acts}>
          <CardButton color="orange" primary onClick={onClose}>
            OK
          </CardButton>
        </div>
      </LobbyCard>
    )
  }

  return (
    <LobbyCard label="Prize Wheel" onClose={phase === 'spinning' ? () => {} : onClose}>
      {wheel}
      {phase === 'won' && won ? (
        <>
          <h2 className={`${styles.cardTitle} ${styles.prizePop}`}>
            {won.icon} You won {won.stars ? `${won.stars} stars` : 'a sticker'}!
          </h2>
          <p className={styles.sub}>{won.stars ? 'They are in your star count now.' : 'It goes on your sticker wall in My Room.'}</p>
          <div className={styles.acts}>
            <CardButton color="orange" primary onClick={onClose}>
              Yay!
            </CardButton>
          </div>
        </>
      ) : (
        <>
          <h2 className={styles.cardTitle}>You earned a spin!</h2>
          <p className={styles.sub}>Great job on today's mission. Every slice is a prize!</p>
          <div className={styles.acts}>
            <CardButton color="orange" primary onClick={spin}>
              {phase === 'spinning' ? 'Spinning…' : 'Spin!'}
            </CardButton>
          </div>
        </>
      )}
    </LobbyCard>
  )
}
