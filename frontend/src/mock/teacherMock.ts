// FAKE DATA for the front-end only. Delete this file when the database is connected.
//
// Screens never import this file. They read it through the hooks in
// src/teacher/data/useTeacherData.ts, so the real API can replace those hooks
// later without touching the screens.
//
// Two sets, for the "Test view" switch (also deleted with this file):
// - sampleData: a busy class
// - emptyData:  a brand-new Teacher (one section, nothing else yet)

import type { Draft, GameType, Level, Student, TeacherData } from '../teacher/data/types'

// ---------- Students ----------

const student = (
  name: string,
  id: string,
  rest: Partial<Student> & { registered: boolean },
): Student => ({ id: `s-${id}`, name, schoolId: `2026-${id}`, ...rest })

const reg = (buddy: Student['buddy'], lastPlayed: string, mastery: number, streak: number, needsHelp = false) => ({
  registered: true,
  buddy,
  lastPlayed,
  mastery,
  streak,
  needsHelp,
})

const notYet = (oneTimeCode: string) => ({ registered: false, oneTimeCode })

const sampleStudents: Student[] = [
  student('Ana Reyes', '0144', reg('fox', 'Today', 82, 6)),
  student('Ben Santos', '0101', reg('raccoon', 'Today', 74, 4)),
  student('Carla Mendoza', '0117', reg('kitty', 'Yesterday', 46, 0, true)),
  student('Diego Cruz', '0122', reg('otter', 'Today', 91, 9)),
  student('Ella Garcia', '0130', notYet('482-915')),
  student('Felix Ramos', '0136', reg('dog', 'Nov 4', 39, 0, true)),
  student('Gia Navarro', '0141', reg('monkey', 'Today', 68, 3)),
  student('Hugo Villanueva', '0148', notYet('731-260')),
  student('Iris Domingo', '0152', reg('raccoon', 'Today', 57, 2)),
  student('Jake Aquino', '0159', reg('ram', 'Yesterday', 63, 1)),
  student('Kyla Bautista', '0163', reg('axolotl', 'Today', 88, 7)),
  student('Leo Castillo', '0168', notYet('905-143')),
  student('Mia Flores', '0172', reg('kitty', 'Today', 79, 5)),
  student('Nico Gonzales', '0177', reg('dog', 'Nov 3', 44, 0, true)),
  student('Olivia Hernandez', '0181', reg('otter', 'Today', 72, 3)),
  student('Paolo Ignacio', '0186', notYet('268-554')),
  student('Queenie Jimenez', '0190', reg('fox', 'Today', 85, 8)),
  student('Rafael Lim', '0194', reg('monkey', 'Yesterday', 61, 2)),
  student('Sofia Lopez', '0198', reg('axolotl', 'Today', 93, 10)),
  student('Tomas Manalo', '0203', notYet('617-829')),
  student('Uma Marquez', '0207', reg('ram', 'Today', 66, 2)),
  student('Vince Morales', '0211', reg('raccoon', 'Nov 4', 41, 0, true)),
  student('Wena Ocampo', '0215', notYet('350-772')),
  student('Xander Pascual', '0219', reg('dog', 'Today', 77, 4)),
  student('Yna Quiambao', '0223', reg('kitty', 'Today', 70, 3)),
  student('Zack Rivera', '0227', notYet('194-386')),
  student('Andrea Salazar', '0231', reg('fox', 'Yesterday', 58, 1)),
  student('Bea Tan', '0235', reg('otter', 'Today', 81, 5)),
  student('Carlo Uy', '0239', notYet('823-401')),
  student('Dana Valdez', '0243', reg('monkey', 'Today', 75, 4)),
]

// ---------- Draft questions ----------

type Row = [text: string, game: GameType, choices: string[], right: number, page: number, quote: string, highlight: string]

const toDrafts = (lessonId: string, topic: string, rows: Row[], status: Draft['status'], level: Level = 'easy'): Draft[] =>
  rows.map(([text, game, choices, right, page, quote, highlight], i) => ({
    id: `${lessonId}-q${i + 1}`,
    lessonId,
    text,
    game,
    choices,
    right,
    topic,
    level,
    status,
    source: { page, quote, highlight },
  }))

/** The 15 questions the fake "AI" drafts for any uploaded lesson. */
const equivalentRows: Row[] = [
  ['What fraction is the same as 1/2?', 'quiz', ['2/4', '1/3', '2/3', '3/4'], 0, 2, 'One half is the same amount as two fourths: 1/2 = 2/4.', '1/2 = 2/4'],
  ['Match: 2/4 →', 'match', ['1/2', '1/4', '2/3', '3/4'], 0, 2, 'Two fourths name the same amount as one half.', 'one half'],
  ['2/3 = ___/6', 'blank', ['4', '3', '2', '6'], 0, 4, 'Multiply the top and bottom of 2/3 by 2 to get 4/6.', '4/6'],
  ['True or false: 3/6 = 1/2', 'quiz', ['True', 'False', 'Only sometimes', 'Not sure'], 0, 3, 'Three sixths and one half cover the same part of a whole.', 'the same part'],
  ['Which pair are equivalent fractions?', 'quiz', ['1/3 and 2/6', '1/3 and 1/6', '2/3 and 2/6', '1/2 and 1/3'], 0, 3, 'Fractions like 1/3 and 2/6 are equivalent fractions.', '1/3 and 2/6'],
  ['Fractions that name the same amount are called _______ fractions.', 'quiz', ['equivalent', 'improper', 'mixed', 'unit'], 0, 3, 'Fractions that name the same amount, like 1/2 and 2/4, are called equivalent fractions.', 'equivalent fractions'],
  ['Match: 3/9 →', 'match', ['1/3', '1/9', '3/3', '2/9'], 0, 5, 'Three ninths is the same as one third.', 'one third'],
  ['4/8 = 1/___', 'blank', ['2', '4', '8', '3'], 0, 5, 'Divide the top and bottom of 4/8 by 4 to get 1/2.', '1/2'],
  ['Which is NOT equal to 2/5?', 'quiz', ['3/5', '4/10', '6/15', '8/20'], 0, 6, '2/5, 4/10 and 6/15 all name the same amount.', '4/10 and 6/15'],
  ['Multiply the top and bottom by the same ___', 'blank', ['number', 'fraction', 'shape', 'color'], 0, 4, 'To make an equivalent fraction, multiply the top and bottom by the same number.', 'the same number'],
  ['Match: 5/10 →', 'match', ['1/2', '1/5', '5/5', '1/10'], 0, 6, 'Five tenths is one half.', 'one half'],
  ['Which fraction equals 3/4?', 'quiz', ['6/8', '3/8', '4/3', '6/4'], 0, 7, 'Three fourths is the same as six eighths.', 'six eighths'],
  ['Match: 6/8 →', 'match', ['3/4', '2/4', '6/4', '1/8'], 0, 7, 'Six eighths and three fourths are equivalent.', 'three fourths'],
  ['1/3 = ___/9', 'blank', ['3', '1', '6', '9'], 0, 8, 'Multiply the top and bottom of 1/3 by 3 to get 3/9.', '3/9'],
  ['Which two fractions are equal?', 'quiz', ['2/6 and 1/3', '2/6 and 1/2', '1/4 and 2/4', '3/5 and 3/6'], 0, 8, 'Two sixths and one third name the same amount.', 'one third'],
]

const partsRows: Row[] = [
  ['A pizza is cut into 4 equal parts. One part is…', 'quiz', ['1/4', '1/2', '4/1', '1/3'], 0, 1, 'Each of the 4 equal parts is one fourth of the pizza.', 'one fourth'],
  ['Match: half →', 'match', ['1/2', '1/4', '2/1', '1/3'], 0, 1, 'Two equal parts are called halves.', 'halves'],
  ['The bottom number is the ___', 'blank', ['denominator', 'numerator', 'whole', 'part'], 0, 2, 'The denominator tells how many equal parts the whole has.', 'denominator'],
  ['The top number is the ___', 'blank', ['numerator', 'denominator', 'whole', 'sum'], 0, 2, 'The numerator tells how many parts we are talking about.', 'numerator'],
  ['Which shape shows 1/3 shaded?', 'quiz', ['1 of 3 equal parts', '1 of 4 equal parts', '3 of 3 parts', '2 of 3 parts'], 0, 3, 'One of three equal parts is one third.', 'one third'],
  ['Match: 3 of 8 parts →', 'match', ['3/8', '8/3', '3/5', '5/8'], 0, 4, 'Three of eight equal parts is three eighths.', 'three eighths'],
  ['Parts must be ___ to make a fraction.', 'blank', ['equal', 'big', 'round', 'colored'], 0, 4, 'Fractions only work when all the parts are equal.', 'equal'],
  ['How many fourths make a whole?', 'quiz', ['4', '2', '1', '8'], 0, 5, 'Four fourths make one whole.', 'Four fourths'],
  ['Match: 2 of 5 parts →', 'match', ['2/5', '5/2', '2/3', '3/5'], 0, 6, 'Two of five equal parts is two fifths.', 'two fifths'],
  ['Which fraction is one whole?', 'quiz', ['6/6', '1/6', '6/1', '0/6'], 0, 7, 'When the top and bottom are the same, the fraction is one whole.', 'one whole'],
  ['5 of 6 slices eaten: ___/6 eaten', 'blank', ['5', '1', '6', '11'], 0, 9, 'Five of six slices is five sixths.', 'five sixths'],
  ['Which is the biggest part?', 'quiz', ['1/2', '1/3', '1/4', '1/8'], 0, 11, 'The fewer the parts, the bigger each part is.', 'bigger each part'],
]

const mixedRows: Row[] = Array.from({ length: 15 }, (_, i): Row => {
  const whole = (i % 3) + 1
  const top = (i % 4) + 1
  const game: GameType = i < 7 ? 'quiz' : i < 11 ? 'match' : 'blank'
  return [
    `Write ${whole} and ${top}/5 as a fraction`,
    game,
    [`${whole * 5 + top}/5`, `${whole + top}/5`, `${top}/5`, `${whole}/5`],
    0,
    i + 1,
    'A mixed number is a whole number and a fraction together.',
    'a whole number and a fraction',
  ]
})

/** The fake "AI" for uploads: the same 15 questions, labeled with the Teacher's topic. */
export function fakeDraftsFor(lessonId: string, topic: string): Draft[] {
  return toDrafts(lessonId, topic, equivalentRows, 'toCheck')
}

// ---------- Sample data (a busy class) ----------

export const sampleData: TeacherData = {
  teacher: { name: 'Ms. Cruz' },
  sections: [
    { id: 'sampaguita', grade: 4, name: 'Sampaguita', color: 'yellow', icon: 'flower' },
    { id: 'tulips', grade: 4, name: 'Tulips', color: 'pink', icon: 'tulip' },
    { id: 'rose', grade: 5, name: 'Rose', color: 'coral', icon: 'rose' },
  ],
  activeSectionId: 'sampaguita',
  todayLabel: 'Thursday, November 6',
  weekSubject: 'Fractions',
  stats: { playedToday: 18, reviewPackDone: 15, reviewPackTotal: 22, studyDays: 3.4 },
  todos: [
    {
      id: 't-review',
      title: 'Check 12 AI-drafted questions',
      detail: 'Fractions: Parts of a Whole · hidden until approved',
      action: 'Review',
      primary: true,
      target: { kind: 'check', lessonId: 'parts' },
      done: false,
    },
    {
      id: 't-help',
      title: '4 students need help',
      tag: 'below 50%',
      detail: 'Equivalent Fractions, after 3+ tries',
      action: 'See who',
      target: { kind: 'students', filter: 'help' },
      done: false,
    },
    {
      id: 't-login',
      title: '8 students haven’t logged in',
      detail: 'Login cards may be lost or not handed out',
      action: 'My Students',
      target: { kind: 'students', filter: 'notYet' },
      done: false,
    },
    {
      id: 't-assign',
      title: 'Mixed Numbers is ready',
      detail: '15 approved questions · not assigned yet',
      action: 'Assign',
      target: { kind: 'games', lessonId: 'mixed' },
      done: false,
    },
    {
      id: 't-print',
      title: 'Print login cards for 2 new students',
      detail: 'Done at 7:42 AM',
      action: 'Print',
      target: { kind: 'none' },
      done: true,
      doneAt: '7:42 AM',
    },
  ],
  upcoming: [
    { id: 'u1', weekday: 'FRI', date: 7, title: 'Fractions Review pack is due', detail: '7 still playing' },
    { id: 'u2', weekday: 'MON', date: 10, title: 'Mixed Numbers starts', detail: 'if you assign it' },
  ],
  weakTopics: [
    { topic: 'Equivalent Fractions', percent: 48 },
    { topic: 'Comparing Fractions', percent: 57 },
    { topic: 'Parts of a Whole', percent: 64 },
  ],
  week: [
    { day: 'Mon', count: 21 },
    { day: 'Tue', count: 19 },
    { day: 'Wed', count: 24 },
    { day: 'Thu', count: 18, today: true },
    { day: 'Fri', count: null },
  ],
  ollieNote: 'KIDDEX already gives extra practice on Equivalent Fractions to the 4 students below 50%.',
  students: sampleStudents,
  lessons: [
    {
      id: 'parts',
      title: 'Fractions: Parts of a Whole',
      fileName: 'Fractions-Parts-of-a-Whole.pdf',
      fileType: 'PDF',
      size: '12 pages',
      uploaded: 'uploaded Nov 3',
      topic: 'Parts of a Whole',
      subject: 'Math',
      games: ['quiz', 'match', 'blank'],
      status: 'toCheck',
    },
    {
      id: 'mixed',
      title: 'Mixed Numbers',
      fileName: 'Mixed-Numbers.pptx',
      fileType: 'PPT',
      size: '18 slides',
      uploaded: 'uploaded Oct 30',
      topic: 'Mixed Numbers',
      subject: 'Math',
      games: ['quiz', 'match', 'blank'],
      status: 'ready',
    },
    {
      id: 'comparing',
      title: 'Comparing Fractions',
      fileName: 'Comparing-Fractions.pdf',
      fileType: 'PDF',
      size: '9 pages',
      uploaded: 'uploaded Oct 24',
      topic: 'Comparing Fractions',
      subject: 'Math',
      games: ['quiz', 'match'],
      status: 'assigned',
      assignedNote: 'due Fri',
    },
    {
      id: 'basics',
      title: 'Fraction Basics',
      fileName: 'Fraction-Basics.pptx',
      fileType: 'PPT',
      size: '14 slides',
      uploaded: 'uploaded Oct 20',
      topic: 'Fraction Basics',
      subject: 'Math',
      games: ['quiz'],
      status: 'assigned',
      assignedNote: 'done',
    },
    {
      id: 'halves',
      title: 'Halves and Quarters',
      fileName: 'Halves-and-Quarters.pdf',
      fileType: 'PDF',
      size: '6 pages',
      uploaded: 'uploaded Oct 14',
      topic: 'Halves and Quarters',
      subject: 'Math',
      games: ['quiz'],
      status: 'draft',
    },
  ],
  drafts: [
    ...toDrafts('parts', 'Parts of a Whole', partsRows, 'toCheck'),
    ...toDrafts('mixed', 'Mixed Numbers', mixedRows, 'approved'),
  ],
  nextDueLabel: 'Fri, Nov 14',
}

// ---------- Empty data (a brand-new Teacher) ----------

export const emptyData: TeacherData = {
  teacher: { name: 'Ms. Cruz' },
  sections: [{ id: 'sampaguita', grade: 4, name: 'Sampaguita', color: 'yellow', icon: 'flower' }],
  activeSectionId: 'sampaguita',
  todayLabel: 'Thursday, November 6',
  weekSubject: 'Fractions',
  stats: { playedToday: 0, reviewPackDone: null, reviewPackTotal: null, studyDays: null },
  todos: [],
  upcoming: [],
  weakTopics: [],
  week: [],
  ollieNote: 'Your class’s progress will show here after the first game.',
  students: [],
  lessons: [],
  drafts: [],
  nextDueLabel: 'Fri, Nov 14',
}
