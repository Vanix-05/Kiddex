// FAKE DATA for the front-end only. Delete this file when the database is connected.
//
// Screens never import this file. They read it through the hooks in
// src/teacher/data/useTeacherData.ts, so the real API can replace those hooks
// later without touching the screens.
//
// Two sets, for the "Test view" switch (also deleted with this file):
// - sampleData: a busy class
// - emptyData:  a brand-new Teacher (one section, nothing else yet)

import { TEMPLATE_FOR_TYPE } from '../content/questionCard'
import type { QuestionCard, SourceQuote, Student, TeacherData, TemplateId } from '../teacher/data/types'
import { equivalentFractionsCards, fakeSourceQuotes, mixedCards, partsCards } from './questionCards'

const ALL_GAMES: TemplateId[] = ['quiz-show', 'match-up', 'fill-blank']

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

// ---------- Question cards ----------
// The cards themselves are in src/mock/questionCards.ts (the one fake card file).

/**
 * The fake "AI" for uploads: the 16 Equivalent Fractions cards, for this lesson,
 * labeled with the Teacher's topic and subject. Only the game types the Teacher picked.
 */
export function fakeDraftsFor(lesson: { id: string; topic: string; subject: string; games: TemplateId[] }, grade: number) {
  const cards: QuestionCard[] = []
  const quotes: Record<string, SourceQuote> = {}
  for (const card of equivalentFractionsCards) {
    if (!lesson.games.includes(TEMPLATE_FOR_TYPE[card.type])) continue
    const id = card.id.replace(card.lessonId, lesson.id)
    cards.push({ ...card, id, lessonId: lesson.id, topic: lesson.topic, subject: lesson.subject, grade, status: 'draft' })
    const quote = fakeSourceQuotes[card.id]
    if (quote) quotes[id] = quote
  }
  return { cards, quotes }
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
      games: ALL_GAMES,
      status: 'toCheck',
    },
    {
      id: 'mixed',
      title: 'Mixed Numbers',
      fileName: 'Mixed-Numbers.docx',
      fileType: 'DOC',
      size: '4 pages',
      uploaded: 'uploaded Oct 30',
      topic: 'Mixed Numbers',
      subject: 'Math',
      games: ALL_GAMES,
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
      games: ['quiz-show', 'match-up'],
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
      games: ['quiz-show'],
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
      games: ['quiz-show'],
      status: 'draft',
    },
  ],
  cards: [...partsCards, ...mixedCards],
  sourceQuotes: fakeSourceQuotes,
  editedCardIds: [],
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
  cards: [],
  sourceQuotes: {},
  editedCardIds: [],
  nextDueLabel: 'Fri, Nov 14',
}
