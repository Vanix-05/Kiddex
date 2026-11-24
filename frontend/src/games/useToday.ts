import { useState } from 'react'
import { dayOf } from './mission'

/** Today, "2026-11-24" in the Student's own time zone, read once when the screen opens. */
export function useToday(): string {
  const [today] = useState(() => dayOf(Date.now()))
  return today
}
