import { useEffect, useRef, useState } from 'react'
import { WelcomeStudentPopup, type PopupRects } from '../WelcomeStudentPopup/WelcomeStudentPopup'
import { ENTER_MS, LEAVE_MS, SchoolIdScreen } from './SchoolIdScreen'

/**
 * choose   = the "Welcome, Student!" popup
 * enter    = "Start here" transition into the School ID page
 * schoolId = the School ID page
 * back     = School ID page fading out over the popup (Back)
 */
type Phase = 'choose' | 'enter' | 'schoolId' | 'back'

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * Everything "I'm a Student" opens, drawn over the login screen without
 * changing the URL: the popup, then (New Student) the School ID page.
 */
export function StudentFlow({ onClose }: { onClose: () => void }) {
  const [phase, setPhase] = useState<Phase>('choose')
  const [from, setFrom] = useState<PopupRects | null>(null)
  // The popup's pop-in and wave only play the first time it opens.
  const [popupIntro, setPopupIntro] = useState(true)
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const after = (ms: number, next: Phase) => {
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setPhase(next), ms)
  }

  const startNewStudent = (rects: PopupRects) => {
    if (phase !== 'choose') return // ignore double taps
    if (reducedMotion()) {
      setPhase('schoolId')
      return
    }
    setFrom(rects)
    setPhase('enter')
    after(ENTER_MS, 'schoolId')
  }

  const backToPopup = () => {
    if (phase !== 'schoolId') return
    setPopupIntro(false)
    if (reducedMotion()) {
      setPhase('choose')
      return
    }
    setPhase('back')
    after(LEAVE_MS, 'choose')
  }

  return (
    <>
      {(phase === 'choose' || phase === 'back') && (
        <WelcomeStudentPopup onClose={onClose} onStartNewStudent={startNewStudent} intro={popupIntro} />
      )}
      {phase !== 'choose' && (
        <SchoolIdScreen
          mode={phase === 'enter' ? 'enter' : phase === 'back' ? 'leave' : 'shown'}
          from={from}
          onBack={backToPopup}
        />
      )}
    </>
  )
}
