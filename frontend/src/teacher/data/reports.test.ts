import { describe, expect, it } from 'vitest'
import type { ProgressPack, SectionProgress } from '../api/sectionsApi'
import { autoTodos, currentPack, dueChip, dueWords, masteryCell, ollieNote, orderPacks, phToday, weekLabel } from './reports'

// Wednesday, Nov 25 2026 (Philippine time). Friday is the 27th.
const TODAY = '2026-11-25'

const pack = (over: Partial<ProgressPack> = {}): ProgressPack => ({
  assignmentId: 'a1',
  name: 'Fractions Review',
  lessonTitle: 'Equivalent Fractions',
  games: ['quiz-show', 'fill-blank'],
  dueDate: '2026-11-27',
  done: 3,
  notDone: [
    { studentId: 's2', schoolId: '2026-0162' },
    { studentId: 's3', schoolId: '2026-0165' },
    { studentId: 's4', schoolId: '2026-0177' },
    { studentId: 's5', schoolId: '2026-0188' },
  ],
  ...over,
})

/** A class of 7 where everyone played and nothing needs a To do. */
const base = (over: Partial<SectionProgress> = {}): SectionProgress => ({
  registered: 7,
  today: { played: 4 },
  week: {
    from: '2026-11-23',
    to: '2026-11-29',
    played: 7,
    studyDaysAverage: 2.1,
    studyDays: [0, 1, 2, 3, 4, 5].map((days) => ({ days, count: days === 2 ? 7 : 0 })),
    days: [],
  },
  mastery: 80,
  needHelpCount: 0,
  topics: [{ topic: 'Equivalent Fractions', lesson: 'Fractions Review', percent: 80, needHelp: 0, played: 7 }],
  needHelp: [],
  packs: [],
  neverPlayed: [],
  ...over,
})

const helpRow = (studentId: string, schoolId: string, topic: string, percent: number) => ({
  studentId,
  schoolId,
  buddy: null,
  buddyName: null,
  topic,
  percent,
})

describe('autoTodos', () => {
  it('none when everyone is on track', () => {
    expect(autoTodos(base(), TODAY)).toEqual([])
  })

  it('Students who need help: up to 3 School IDs grouped by topic, See who → Need help', () => {
    const [t] = autoTodos(
      base({
        needHelp: [
          helpRow('s4', '2026-0177', 'Fractions', 31),
          helpRow('s2', '2026-0162', 'Fractions', 38),
          helpRow('s3', '2026-0165', 'Plant Parts', 45),
        ],
      }),
      TODAY,
    )
    expect(t.title).toBe('3 Students need help')
    expect(t.tag).toBe('below 50%')
    expect(t.detail).toBe('2026-0177, 2026-0162 (Fractions) · 2026-0165 (Plant Parts)')
    expect(t.action).toBe('See who')
    expect(t.primary).toBe(true)
    expect(t.target).toEqual({ kind: 'students', filter: 'help' })
  })

  it('one Student: "1 Student needs help"', () => {
    const [t] = autoTodos(base({ needHelp: [helpRow('s4', '2026-0177', 'Fractions', 31)] }), TODAY)
    expect(t.title).toBe('1 Student needs help')
  })

  it('a pack due within 3 days with Students not done → Progress', () => {
    const [t] = autoTodos(base({ packs: [pack()] }), TODAY)
    expect(t.title).toBe('Fractions Review is due Friday')
    expect(t.detail).toBe('4 of 7 Students haven’t finished it yet')
    expect(t.action).toBe('Progress')
    expect(t.target).toEqual({ kind: 'progress' })
  })

  it('no pack To do when it is past, too far, or everyone finished', () => {
    expect(autoTodos(base({ packs: [pack({ dueDate: '2026-11-20' })] }), TODAY)).toEqual([])
    expect(autoTodos(base({ packs: [pack({ dueDate: '2026-12-01' })] }), TODAY)).toEqual([])
    expect(autoTodos(base({ packs: [pack({ notDone: [], done: 7 })] }), TODAY)).toEqual([])
    expect(autoTodos(base({ packs: [pack({ dueDate: null })] }), TODAY)).toEqual([])
  })

  it('one Student never played → Open their page', () => {
    const [t] = autoTodos(
      base({ neverPlayed: [{ studentId: 's5', schoolId: '2026-0188', registeredAt: '2026-11-20T02:00:00Z' }] }),
      TODAY,
    )
    expect(t.title).toBe('2026-0188 hasn’t played yet')
    expect(t.detail).toBe('Registered Nov 20 · no rounds so far')
    expect(t.action).toBe('Open')
    expect(t.target).toEqual({ kind: 'student', studentId: 's5' })
  })

  it('two or more never played → See who (My Students)', () => {
    const [t] = autoTodos(
      base({
        neverPlayed: [
          { studentId: 's5', schoolId: '2026-0188', registeredAt: null },
          { studentId: 's6', schoolId: '2026-0191', registeredAt: null },
        ],
      }),
      TODAY,
    )
    expect(t.title).toBe('2 Students haven’t played yet')
    expect(t.action).toBe('See who')
    expect(t.target).toEqual({ kind: 'students' })
  })

  it('all three, in order: help, due pack, never played', () => {
    const ids = autoTodos(
      base({
        needHelp: [helpRow('s4', '2026-0177', 'Fractions', 31)],
        packs: [pack()],
        neverPlayed: [{ studentId: 's5', schoolId: '2026-0188', registeredAt: null }],
      }),
      TODAY,
    ).map((t) => t.id)
    expect(ids).toEqual(['auto-help', 'auto-due-a1', 'auto-never'])
  })
})

describe('ollieNote', () => {
  const never = (n: number) =>
    Array.from({ length: n }, (_, i) => ({ studentId: `n${i}`, schoolId: `2026-01${80 + i}`, registeredAt: null }))

  it('1. nobody has played yet', () => {
    expect(ollieNote(base({ neverPlayed: never(7) }), TODAY)).toBe('Your class’s progress will show here after the first game.')
    expect(ollieNote(base({ registered: 0 }), TODAY)).toBe('Your class’s progress will show here after the first game.')
  })

  it('2. two or more under 50% in one topic, with the due date when its pack is due soon', () => {
    const p = base({
      topics: [{ topic: 'Equivalent Fractions', lesson: 'Fractions Review', percent: 58, needHelp: 2, played: 6 }],
      packs: [pack()],
      neverPlayed: never(1),
    })
    expect(ollieNote(p, TODAY)).toBe(
      '2 Students are below 50% on Equivalent Fractions. A short class review before Friday’s due date could help.',
    )
    expect(ollieNote({ ...p, packs: [] }, TODAY)).toBe('2 Students are below 50% on Equivalent Fractions. A short class review could help.')
  })

  it('3. a pack due within 3 days with Students not done', () => {
    expect(ollieNote(base({ packs: [pack()], neverPlayed: never(1) }), TODAY)).toBe(
      '4 Students haven’t finished Fractions Review yet. It’s due Friday.',
    )
  })

  it('4. someone never played', () => {
    expect(ollieNote(base({ neverPlayed: never(1) }), TODAY)).toBe('2026-0180 hasn’t played yet. Maybe check their login card?')
    expect(ollieNote(base({ neverPlayed: never(3) }), TODAY)).toBe('3 Students haven’t played yet. Maybe check their login cards?')
  })

  it('5. everyone on track', () => {
    expect(ollieNote(base(), TODAY)).toBe('Everyone is on track this week. Nice work!')
  })

  it('one Student under 50% in a topic is not rule 2', () => {
    const p = base({ topics: [{ topic: 'Plant Parts', lesson: 'Plants Quiz', percent: 45, needHelp: 1, played: 5 }] })
    expect(ollieNote(p, TODAY)).toBe('Everyone is on track this week. Nice work!')
  })
})

describe('due dates', () => {
  it('the due chip: today, tomorrow, a weekday, was due', () => {
    expect(dueChip('2026-11-25', TODAY)).toEqual({ text: 'Due today', past: false })
    expect(dueChip('2026-11-26', TODAY)).toEqual({ text: 'Due tomorrow', past: false })
    expect(dueChip('2026-11-27', TODAY)).toEqual({ text: 'Due Fri, Nov 27', past: false })
    expect(dueChip('2026-11-20', TODAY)).toEqual({ text: 'Was due Nov 20', past: true })
  })

  it('due words for To dos and the note', () => {
    expect(dueWords('2026-11-25', TODAY)).toBe('today')
    expect(dueWords('2026-11-26', TODAY)).toBe('tomorrow')
    expect(dueWords('2026-11-27', TODAY)).toBe('Friday')
  })

  it('today in Philippine time', () => {
    // 23:30 PH on Nov 25 is still 15:30 UTC; 00:30 PH on Nov 26 is 16:30 UTC on Nov 25.
    expect(phToday(new Date('2026-11-25T15:30:00Z'))).toBe('2026-11-25')
    expect(phToday(new Date('2026-11-25T16:30:00Z'))).toBe('2026-11-26')
  })
})

describe('this week label', () => {
  it('Monday to Friday', () => {
    expect(weekLabel('2026-11-23')).toBe('this week (Nov 23–27)')
  })

  it('across two months', () => {
    expect(weekLabel('2026-11-30')).toBe('this week (Nov 30–Dec 4)')
  })
})

describe('Mastery cell', () => {
  it('a number', () => {
    expect(masteryCell({ mastery: 72, lastPlayed: 'Today' })).toEqual({ kind: 'percent', percent: 72 })
    expect(masteryCell({ mastery: 0, lastPlayed: 'Today' })).toEqual({ kind: 'percent', percent: 0 })
  })

  it('played, but not enough answers yet', () => {
    expect(masteryCell({ mastery: undefined, lastPlayed: 'Nov 22' })).toEqual({ kind: 'notEnough' })
  })

  it('never played: the dash', () => {
    expect(masteryCell({ mastery: undefined, lastPlayed: undefined })).toEqual({ kind: 'none' })
  })
})

describe('pack order', () => {
  const packs = [
    pack({ assignmentId: 'old', dueDate: '2026-11-13' }),
    pack({ assignmentId: 'late', dueDate: '2026-11-20' }),
    pack({ assignmentId: 'fri', dueDate: '2026-11-27' }),
    pack({ assignmentId: 'next', dueDate: '2026-12-04' }),
    pack({ assignmentId: 'none', dueDate: null }),
  ]

  it('upcoming first (soonest), then past due (most recent), then no due date', () => {
    expect(orderPacks(packs, TODAY).map((p) => p.assignmentId)).toEqual(['fri', 'next', 'late', 'old', 'none'])
  })

  it('Home talks about the next pack due, or an overdue one when nothing is coming up', () => {
    expect(currentPack(base({ packs }), TODAY)?.assignmentId).toBe('fri')
    expect(currentPack(base({ packs: packs.slice(0, 2) }), TODAY)?.assignmentId).toBe('late')
    expect(currentPack(base(), TODAY)).toBeUndefined()
  })
})
