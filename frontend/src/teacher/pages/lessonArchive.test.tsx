import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { archivedWhen } from '../data/lessonMapping'
import { ForeverConfirm } from '../planner/LessonDialogs'
import {
  archivedLinkText,
  canDeleteForever,
  erasedForeverLine,
  erasedLine,
  lessonMenuItems,
  lessonToastText,
  scoresLeaveLine,
} from './lessonArchive'

describe('the ⋯ menu on a lesson row', () => {
  it('assigned and played: Change due date, then Archive', () => {
    expect(lessonMenuItems({ assigned: true, playedBy: 15 })).toEqual(['due', 'archive'])
  })
  it('assigned, nobody played: Change due date, then Delete', () => {
    expect(lessonMenuItems({ assigned: true, playedBy: 0 })).toEqual(['due', 'delete'])
  })
  it('not assigned, nobody played: Delete only', () => {
    expect(lessonMenuItems({ assigned: false, playedBy: 0 })).toEqual(['delete'])
  })
  it('not assigned but played (an old pack): Archive only, never Delete', () => {
    expect(lessonMenuItems({ assigned: false, playedBy: 2 })).toEqual(['archive'])
  })
})

describe('the toast and the popups’ words', () => {
  it('toast texts', () => {
    expect(lessonToastText('archived', 'Equivalent Fractions')).toBe('“Equivalent Fractions” archived')
    expect(lessonToastText('restored', 'Equivalent Fractions')).toBe('“Equivalent Fractions” restored')
    expect(lessonToastText('deletedForever', 'Telling Time')).toBe('“Telling Time” deleted forever')
    expect(lessonToastText('deleted', 'Parts of a Plant')).toBe('“Parts of a Plant” deleted')
    expect(lessonToastText('dueSaved', 'anything')).toBe('Due date saved')
  })

  it('"Archived (N)" is hidden at 0', () => {
    expect(archivedLinkText(0)).toBeNull()
    expect(archivedLinkText(2)).toBe('Archived (2)')
  })

  it('counts in the lines', () => {
    expect(erasedLine(18)).toBe('The lesson and its 18 questions are erased.')
    expect(erasedLine(1)).toBe('The lesson and its 1 question are erased.')
    expect(erasedLine(0)).toBe('The lesson is erased.')
    expect(erasedForeverLine(24)).toBe('The lesson, its 24 questions and its review pack are erased.')
    expect(scoresLeaveLine(15)).toBe('15 Students’ scores for it leave your reports.')
    expect(scoresLeaveLine(1)).toBe('1 Student’s scores for it leave your reports.')
  })

  it('when it was archived', () => {
    const now = new Date(2026, 10, 28, 15)
    expect(archivedWhen(new Date(2026, 10, 28, 8).toISOString(), now)).toBe('Archived today')
    expect(archivedWhen(new Date(2026, 10, 27, 20).toISOString(), now)).toBe('Archived yesterday')
    expect(archivedWhen(new Date(2026, 9, 30, 10).toISOString(), now)).toBe('Archived Oct 30')
  })
})

describe('Delete forever', () => {
  const render = (ticked: boolean, saving = false) =>
    renderToStaticMarkup(
      <ForeverConfirm ticked={ticked} saving={saving} onTick={() => {}} onCancel={() => {}} onDelete={() => {}} />,
    )
  /** The Delete forever button's opening tag. */
  const deleteButton = (html: string) => /<button[^>]*>(?:(?!<\/button>).)*Delete forever<\/button>/.exec(html)?.[0] ?? ''

  it('stays disabled until the box is ticked', () => {
    expect(canDeleteForever(false, false)).toBe(false)
    expect(deleteButton(render(false))).toContain('disabled')
    expect(render(false)).toMatch(/<input[^>]*type="checkbox"/)
    expect(render(false)).not.toMatch(/<input[^>]*checked/)
  })

  it('can be pressed once ticked, and not again while it deletes', () => {
    expect(canDeleteForever(true, false)).toBe(true)
    expect(deleteButton(render(true))).not.toContain('disabled')
    expect(canDeleteForever(true, true)).toBe(false)
    expect(render(true, true)).toContain('Deleting…')
  })

  it('the whole line is the checkbox’s label', () => {
    const html = render(false)
    const id = /<input[^>]*id="([^"]+)"/.exec(html)?.[1]
    expect(id).toBeTruthy()
    expect(html).toMatch(new RegExp(`<label[^>]*for="${id}"[^>]*>.*I understand this can’t be undone</label>`))
  })
})
