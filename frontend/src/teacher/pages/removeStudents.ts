// Small rules for Remove, Restore and Delete forever (no React, so Vitest can check them).

/** Digits only, the same cleaning as the School ID search: "2026-0177" → "20260177". */
export const schoolIdDigits = (text: string) => text.replace(/\D/g, '')

/** Delete forever's typing check: the typed School ID matches (a dash, no dash or spaces all work). */
export function sameSchoolId(typed: string, schoolId: string): boolean {
  const a = schoolIdDigits(typed)
  return a.length > 0 && a === schoolIdDigits(schoolId)
}

/** What the toast at the bottom of My Students says. */
export type ToastKind = 'removed' | 'restored' | 'deleted'

export function toastText(kind: ToastKind, schoolId: string): string {
  if (kind === 'removed') return `${schoolId} removed`
  if (kind === 'restored') return `${schoolId} restored`
  return `${schoolId} deleted forever`
}

/** "Removed (2)", or null when there are none (the link is hidden at 0). */
export function removedLinkText(count: number | undefined): string | null {
  return count && count > 0 ? `Removed (${count})` : null
}

/** How long the toast stays. */
export const TOAST_MS = 8000
