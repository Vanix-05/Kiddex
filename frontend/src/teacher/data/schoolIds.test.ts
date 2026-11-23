import { describe, expect, it } from 'vitest'
import { checkIds, cleanSchoolId, problemText, splitList } from './schoolIds'

describe('School IDs on the screen', () => {
  it('cleans the forms a Teacher types', () => {
    expect(cleanSchoolId('2026-0144')).toBe('20260144')
    expect(cleanSchoolId('20260144')).toBe('20260144')
    expect(cleanSchoolId(' 2026 0144 ')).toBe('20260144')
    expect(cleanSchoolId('2026-019')).toBeNull()
    expect(cleanSchoolId('abc')).toBeNull()
  })

  it('splits a pasted column, commas, tabs and spaces', () => {
    expect(splitList('2026-0191\n2026-0192\r\n\n2026-0193, 2026-0194\t2026-0195 2026-0196')).toEqual([
      '2026-0191',
      '2026-0192',
      '2026-0193',
      '2026-0194',
      '2026-0195',
      '2026-0196',
    ])
    expect(splitList('2026 0197')).toEqual(['2026 0197'])
  })

  it('marks bad, repeated and already-added School IDs', () => {
    const checked = checkIds(['2026-0191', '20260191', '2026-019', '2026-0144'], new Set(['2026-0144']))
    expect(checked.map((c) => c.problem)).toEqual([null, 'twice', 'format', 'inSection'])
    expect(checked.map(problemText).slice(1)).toEqual([
      '2026-0191 is in the list twice',
      '2026-019 needs 8 numbers',
      '2026-0144 is already in this section',
    ])
  })
})
