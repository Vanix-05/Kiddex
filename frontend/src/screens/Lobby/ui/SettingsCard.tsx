import type { ReactNode } from 'react'
import type { LobbySettings } from '../useLobbySettings'
import { CardButton, LobbyCard } from './LobbyCard'
import { LobbyIcon } from './icons'
import styles from './ui.module.css'

/** One settings row: a label and a segmented pill. */
function Row<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: readonly (readonly [T, ReactNode])[]
  onChange: (value: T) => void
}) {
  return (
    <div className={styles.row}>
      {label}
      <div className={styles.seg} role="group" aria-label={label}>
        {options.map(([option, text]) => (
          <button key={option} type="button" className={styles.segBtn} aria-pressed={option === value} onClick={() => onChange(option)}>
            {text}
          </button>
        ))}
      </div>
    </div>
  )
}

const ON_OFF = [
  ['on', 'On'],
  ['off', 'Off'],
] as const

/** The gear: camera, names, emotes and moving effects. Saved on this device. */
export function SettingsCard({
  settings,
  onChange,
  onHowTo,
  onLogOut,
  onClose,
}: {
  settings: LobbySettings
  onChange: (patch: Partial<LobbySettings>) => void
  onHowTo: () => void
  onLogOut: () => void
  onClose: () => void
}) {
  return (
    <LobbyCard label="Settings" onClose={onClose}>
      <h2 className={styles.cardTitle}>Settings</h2>
      <div className={styles.set}>
        <Row
          label="Camera angle"
          value={settings.angle}
          onChange={(angle) => onChange({ angle })}
          options={[
            [
              'diag',
              <>
                <LobbyIcon name="diagonal" size={20} />
                Diagonal
              </>,
            ],
            [
              'straight',
              <>
                <LobbyIcon name="straight" size={20} />
                Straight
              </>,
            ],
          ]}
        />
        <Row
          label="Zoom"
          value={settings.zoom}
          onChange={(zoom) => onChange({ zoom })}
          options={[
            ['close', 'Close'],
            ['far', 'Far'],
          ]}
        />
        <Row label="Show names" value={settings.names ? 'on' : 'off'} onChange={(v) => onChange({ names: v === 'on' })} options={ON_OFF} />
        <Row label="Classmates' emotes" value={settings.emotes ? 'on' : 'off'} onChange={(v) => onChange({ emotes: v === 'on' })} options={ON_OFF} />
        <Row
          label="Moving effects"
          value={settings.motion}
          onChange={(motion) => onChange({ motion })}
          options={[
            ['full', 'Full'],
            ['less', 'Less'],
          ]}
        />
        <div className={styles.row}>
          Sound <span className={styles.soon}>Coming soon</span>
        </div>
      </div>
      <div className={styles.acts}>
        <CardButton onClick={onHowTo}>How to play</CardButton>
        <CardButton color="orange" primary onClick={onClose}>
          Done
        </CardButton>
      </div>
      <button type="button" className={styles.logout} onClick={onLogOut}>
        Log out
      </button>
    </LobbyCard>
  )
}
