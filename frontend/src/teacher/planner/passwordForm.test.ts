import { describe, expect, it } from 'vitest'
import { passwordFormProblem, serverProblemField } from './passwordForm'

describe('passwordFormProblem', () => {
  it('asks for the current password first', () => {
    expect(passwordFormProblem('', 'short', 'x')).toEqual({ field: 'current', message: 'Type your current password.' })
  })

  it('needs at least 8 characters', () => {
    expect(passwordFormProblem('old', '1234567', '1234567')?.field).toBe('new')
    expect(passwordFormProblem('old', '12345678', '12345678')).toBeNull()
  })

  it('needs the two new ones to match', () => {
    expect(passwordFormProblem('old', 'abcdefgh', 'abcdefgH')).toEqual({ field: 'again', message: 'The two new passwords don’t match.' })
  })
})

describe('serverProblemField', () => {
  it('puts each server error under the right box', () => {
    expect(serverProblemField('WRONG_CURRENT_PASSWORD')).toBe('current')
    expect(serverProblemField('BAD_PASSWORD')).toBe('new')
    expect(serverProblemField('SAME_PASSWORD')).toBe('new')
    expect(serverProblemField('TOO_MANY_TRIES')).toBe('form')
    expect(serverProblemField('')).toBe('form')
  })
})
