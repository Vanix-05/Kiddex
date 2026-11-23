/** The Change password form's own checks, before anything is sent. */

export type PasswordField = 'current' | 'new' | 'again'
export type PasswordProblem = { field: PasswordField | 'form'; message: string }

/** Same rule as the backend (MIN_PASSWORD_LENGTH). */
export const MIN_PASSWORD_LENGTH = 8

/** The first problem before sending, or null. */
export function passwordFormProblem(current: string, next: string, again: string): PasswordProblem | null {
  if (!current) return { field: 'current', message: 'Type your current password.' }
  if (next.length < MIN_PASSWORD_LENGTH) return { field: 'new', message: 'At least 8 characters.' }
  if (next !== again) return { field: 'again', message: 'The two new passwords don’t match.' }
  return null
}

/** Where a server error code shows: under its box, or under the buttons. */
export function serverProblemField(code: string): PasswordProblem['field'] {
  if (code === 'WRONG_CURRENT_PASSWORD') return 'current'
  if (code === 'BAD_PASSWORD' || code === 'SAME_PASSWORD') return 'new'
  return 'form'
}
