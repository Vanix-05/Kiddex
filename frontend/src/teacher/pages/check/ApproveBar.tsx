import { ArrowRight, Check, Lock, Sparkles, TriangleAlert } from 'lucide-react'
import type { BarState } from './checkLogic'
import styles from '../Check.module.css'

interface ApproveBarProps {
  state: BarState
  /** The short happy moment after Approve all worked. */
  done: boolean
  busy: boolean
  onGo: (id: string) => void
  onApprove: () => void
}

/** The bar fixed at the bottom of the Check page: locked, marked left, or ready (c1, c3, c4). */
export function ApproveBar({ state, done, busy, onGo, onApprove }: ApproveBarProps) {
  if (done) {
    return (
      <div className={`${styles.bar} ${styles.barReady} ${styles.barDone}`} role="status">
        <span className={styles.barIcon} aria-hidden="true">
          <Sparkles size={22} strokeWidth={2.4} />
        </span>
        <span className={styles.barText}>
          <strong>All approved!</strong>
          <span>Opening the games…</span>
        </span>
      </div>
    )
  }

  switch (state.kind) {
    case 'empty':
      return (
        <div className={styles.bar}>
          <span className={styles.barIcon} aria-hidden="true">
            <Lock size={20} />
          </span>
          <span className={styles.barText}>
            <strong>No questions yet</strong>
            <span>Add a question to approve</span>
          </span>
          <button type="button" className={styles.barLocked} disabled>
            <Lock size={18} aria-hidden="true" /> Approve all
          </button>
        </div>
      )
    case 'locked':
      return (
        <div className={styles.bar}>
          <span className={styles.barIcon} aria-hidden="true">
            <Lock size={20} />
          </span>
          <span className={styles.barText}>
            <strong>Scroll to the end to approve</strong>
            <span>{state.moreBelow > 0 ? `${state.moreBelow} more below` : 'Almost at the end'}</span>
          </span>
          <button type="button" className={styles.barLocked} disabled>
            <Lock size={18} aria-hidden="true" /> Approve all
          </button>
        </div>
      )
    case 'marked':
      return (
        <div className={`${styles.bar} ${styles.barMarked}`}>
          <span className={styles.barIcon} aria-hidden="true">
            <TriangleAlert size={20} />
          </span>
          <span className={styles.barText}>
            <strong>
              {state.left} marked question{state.left === 1 ? '' : 's'} left
            </strong>
            <span>Check question {state.firstNumber} first</span>
          </span>
          <button type="button" className={styles.barGo} onClick={() => onGo(state.firstId)}>
            Go to {state.firstNumber} <ArrowRight size={18} aria-hidden="true" />
          </button>
        </div>
      )
    case 'ready':
      return (
        <div className={`${styles.bar} ${styles.barReady}`}>
          <span className={styles.barIcon} aria-hidden="true">
            <Check size={22} strokeWidth={3} />
          </span>
          <span className={styles.barText}>
            <strong>You read all {state.total}</strong>
            <span>Students only see approved questions</span>
          </span>
          <button type="button" className={styles.barApprove} disabled={busy} onClick={onApprove}>
            <Check size={20} strokeWidth={3} aria-hidden="true" /> {busy ? 'Approving…' : `Approve all ${state.total}`}
          </button>
        </div>
      )
    case 'approved':
      return (
        <div className={`${styles.bar} ${styles.barReady}`}>
          <span className={styles.barIcon} aria-hidden="true">
            <Check size={22} strokeWidth={3} />
          </span>
          <span className={styles.barText}>
            <strong>All {state.total} approved</strong>
            <span>Students only see approved questions</span>
          </span>
          <button type="button" className={styles.barApprove} disabled>
            Approved <Check size={18} strokeWidth={3} aria-hidden="true" />
          </button>
        </div>
      )
  }
}
