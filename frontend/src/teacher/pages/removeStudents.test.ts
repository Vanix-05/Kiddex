import { describe, expect, it } from 'vitest'
import { removedLinkText, sameSchoolId, toastText } from './removeStudents'
import { skippedText } from './skippedText'

describe('sameSchoolId (Delete forever typing check)', () => {
  it('matches with or without the dash', () => {
    expect(sameSchoolId('20260177', '2026-0177')).toBe(true)
    expect(sameSchoolId('2026-0177', '2026-0177')).toBe(true)
    expect(sameSchoolId('2026-0177', '20260177')).toBe(true)
  })

  it('ignores spaces around and inside', () => {
    expect(sameSchoolId('  2026 0177 ', '2026-0177')).toBe(true)
  })

  it('does not match another, a part, or nothing', () => {
    expect(sameSchoolId('20260178', '2026-0177')).toBe(false)
    expect(sameSchoolId('2026017', '2026-0177')).toBe(false)
    expect(sameSchoolId('', '2026-0177')).toBe(false)
    expect(sameSchoolId('-', '2026-0177')).toBe(false)
  })
})

describe('toastText', () => {
  it('says what happened to the School ID', () => {
    expect(toastText('removed', '20260177')).toBe('20260177 removed')
    expect(toastText('restored', '20260177')).toBe('20260177 restored')
    expect(toastText('deleted', '20260177')).toBe('20260177 deleted forever')
  })
})

describe('removedLinkText', () => {
  it('is hidden at 0', () => {
    expect(removedLinkText(0)).toBeNull()
    expect(removedLinkText(undefined)).toBeNull()
  })

  it('shows the count', () => {
    expect(removedLinkText(1)).toBe('Removed (1)')
    expect(removedLinkText(2)).toBe('Removed (2)')
  })
})

describe('skippedText', () => {
  it('tells the Teacher to Restore a School ID removed from this section', () => {
    expect(skippedText({ schoolId: '2026-0177', reason: 'REMOVED_IN_SECTION' })).toBe(
      '2026-0177 was removed from this section. Restore them from Removed.',
    )
  })
})
