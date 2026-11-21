import { startTransition, useEffect, useRef, useState, type CSSProperties, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent, type RefObject } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  BookOpen,
  ChartNoAxesColumn,
  ChevronLeft,
  ChevronRight,
  Flower,
  Flower2,
  House,
  LogOut,
  Maximize,
  Plus,
  Rose,
  TreePalm,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { usePhoneSideways } from '../../hooks/usePhoneSideways'
import { KiddexLogo } from '../../components/KiddexLogo/KiddexLogo'
import { SceneBackground } from '../../components/SceneBackground/SceneBackground'
import { paths } from '../../routes/paths'
import { useSession } from '../../session/session'
import { enterFullscreen, exitFullscreen, useIsFullscreen } from '../fullscreen'
import { sectionLabel, useSection, useTeacher } from '../data/useTeacherData'
import type { SectionIcon } from '../data/types'
import { StudentsWindow } from '../pages/StudentsWindow'
import { AddStudentDialog, LogOutDialog, NewSectionDialog } from './Dialogs'
import { LazyTeacherLobbyScreen } from '../../screens/Lobby/LazyLobby'
import { isLobbyPath, isStudentsPath, pageOrder, pathOf, resolvePage, studentsPath, type PageKey } from './pages'
import { PlannerActionsContext, usePlannerActions } from './plannerActions'
import { PhonePagesContext, wantsPage2, type PageSide } from './phonePages'
import { SPREADS } from './spreads'
import styles from './planner.module.css'

/** How long a page turn takes. */
const FLIP_MS = 650

/**
 * The planner group's outer box in design px, tight around what must show:
 * the badge's left edge (20), the top of the open section tab (43), the
 * cover's right edge (1400) and the ribbon's tip (888). The book's soft
 * shadow and the bookmark hover may reach into the margin. Only this box is
 * scaled; the island scene fills the window by itself.
 */
const BOX = { x: 20, y: 43, w: 1380, h: 845 }
/** Space kept free around the planner, in screen px. */
const MARGIN = 12

/**
 * The KIDDEX logo at the window's top-left: its box in screen px at each size
 * (see .brand / .brandSmall in the CSS). Big if there's room, else small,
 * else hidden.
 */
const LOGO_SIZES = [
  { size: 'big', right: 188, bottom: 82 },
  { size: 'small', right: 152, bottom: 64 },
] as const
const LOGO_GAP = 8
type LogoSize = 'big' | 'small' | null

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

interface Fit {
  scale: number
  left: number
  top: number
  /** The biggest logo that stays clear of the tabs, bookmarks and book. */
  logo: LogoSize
}

/** Scale the planner group to fit the window with a margin, same ratio, centered. */
function fitPlanner(): Fit {
  const w = window.innerWidth
  const h = window.innerHeight
  const scale = Math.min((w - 2 * MARGIN) / BOX.w, (h - 2 * MARGIN) / BOX.h)
  // Centered, but the bookmarks never closer than MARGIN to the left edge.
  const left = Math.max((w - BOX.w * scale) / 2, MARGIN) - BOX.x * scale
  const top = (h - BOX.h * scale) / 2 - BOX.y * scale

  // The logo must stay clear of the tabs, the bookmarks and the book cover
  // (their top-left corners in design px).
  const fits = ({ right, bottom }: { right: number; bottom: number }) =>
    [
      [216, 43],
      [24, 151],
      [151, 106],
    ].every(([x, y]) => right + LOGO_GAP <= left + x * scale || bottom + LOGO_GAP <= top + y * scale)
  const logo = LOGO_SIZES.find(fits)?.size ?? null
  return { scale, left, top, logo }
}

/**
 * A phone held sideways: one planner scale for every page, so text is the
 * same size everywhere (question text 17 design px is about 11px on screen;
 * a 44px tap target is 67 design px). The stage is the screen's own size in
 * design px (--sw x --sh), and the book, bookmarks, tabs and badge are laid
 * out in it (planner.module.css, sideways-phone part). A smaller screen gets a
 * narrower book with the same text size, never a smaller scale.
 */
const PHONE_SCALE = 0.66
/** Phone bookmarks: a column down the left edge, each 68 design px (45px) tall. */
const PHONE_MARK_TOP = 78
const PHONE_MARK_STEP = 70

function usePlannerFit(phone: boolean) {
  const [fit, setFit] = useState(fitPlanner)
  const [size, setSize] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }))
  useEffect(() => {
    const onResize = () => {
      setFit(fitPlanner())
      setSize({ w: window.innerWidth, h: window.innerHeight })
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  if (phone) {
    return {
      style: { transform: `scale(${PHONE_SCALE})` },
      logo: null,
      vars: { '--sw': `${size.w / PHONE_SCALE}px`, '--sh': `${size.h / PHONE_SCALE}px` } as CSSProperties,
    }
  }
  return {
    style: { transform: `translate(${fit.left}px, ${fit.top}px) scale(${fit.scale})` },
    logo: fit.logo,
    vars: undefined,
  }
}

interface Flip {
  /** The URL whose pages are turning away. */
  from: string
  dir: 'fwd' | 'bwd'
  /** Reduce motion: a quick crossfade instead of a turn. */
  fade: boolean
  /** Phone: the page turning away and the page it turns to (one page shows at a time). */
  fromSide: PageSide
  toSide: PageSide
}

/** A sideways swipe at least this long (screen px), and mostly sideways, turns the page on a phone. */
const SWIPE_MIN = 60

type WindowState = 'hidden' | 'open' | 'closing'
type Popup = 'newSection' | 'addStudent' | 'logOut' | null

/**
 * The Teacher Dashboard: an open hardcover planner on the island scene.
 * Its data providers are in TeacherShell (the router puts it around every Teacher route).
 */
export function TeacherPlanner() {
  return <Planner />
}

function Planner() {
  const location = useLocation()
  const navigate = useNavigate()
  const { logOut } = useSession()
  const url = location.pathname + location.search
  const onStudents = isStudentsPath(location.pathname)
  // /teacher/lobby with a section: the classroom opens full screen, view only.
  // Without one, the book shows the "Make a section first" page as usual.
  const { active: section, label: sectionName } = useSection()
  const teacher = useTeacher()
  const onLobby = isLobbyPath(location.pathname) && !!section

  // What the book shows. On /teacher/students it keeps the page underneath,
  // and in the full-screen Lobby the page the Teacher came from.
  const [bookUrl, setBookUrl] = useState(onStudents || onLobby ? paths.teacher.home : url)
  const [flip, setFlip] = useState<Flip | null>(null)
  const [win, setWin] = useState<WindowState>(onStudents ? 'open' : 'hidden')
  const [winQuery, setWinQuery] = useState(onStudents ? location.search : '')
  const [popup, setPopup] = useState<Popup>(null)
  // Phone: the page of the spread on show (page 1 = 'L', page 2 = 'R').
  const phone = usePhoneSideways()
  const [side, setSide] = useState<PageSide>('L')

  // React to URL changes while rendering (no extra paint with the old page).
  const [seenUrl, setSeenUrl] = useState(url)
  if (seenUrl !== url) {
    setSeenUrl(url)
    if (onStudents) {
      setWin('open')
      setWinQuery(location.search)
    } else if (onLobby) {
      // The book stays on its page underneath, for Back to planner.
      if (win !== 'hidden') setWin('hidden')
    } else {
      if (win === 'open') setWin('closing')
      // Phone: a new spread opens on page 1, unless the tap was about page 2 (SHOW_PAGE_2).
      const toSide: PageSide = phone && wantsPage2(location.state) ? 'R' : 'L'
      if (pathOf(url) !== pathOf(bookUrl)) {
        // Starting a new turn while one plays finishes the old one at once.
        setFlip({ from: bookUrl, dir: pageOrder(url) >= pageOrder(bookUrl) ? 'fwd' : 'bwd', fade: reducedMotion(), fromSide: side, toSide })
        setSide(toSide)
      } else if (toSide !== side && toSide === 'R') {
        // Same spread, a tap on page 1 about page 2 (e.g. Check's "Go"): turn to it.
        setFlip({ from: bookUrl, dir: 'fwd', fade: reducedMotion(), fromSide: side, toSide })
        setSide(toSide)
      }
      setBookUrl(url)
    }
  }

  /** Phone: turn to the other page of the spread (‹ › or a swipe). */
  const turnPage = (to: PageSide) => {
    if (!phone || to === side) return
    setFlip({ from: bookUrl, dir: to === 'R' ? 'fwd' : 'bwd', fade: reducedMotion(), fromSide: side, toSide: to })
    setSide(to)
  }

  // Phone: a sideways swipe on the paper turns the page; an up-down one only scrolls.
  const swipe = useRef<{ id: number; x: number; y: number } | null>(null)
  const swiped = useRef(false)
  const swipeHandlers = phone
    ? {
        onPointerDown: (e: ReactPointerEvent) => {
          swiped.current = false
          swipe.current = e.isPrimary ? { id: e.pointerId, x: e.clientX, y: e.clientY } : null
        },
        onPointerUp: (e: ReactPointerEvent) => {
          const s = swipe.current
          swipe.current = null
          if (!s || s.id !== e.pointerId) return
          const dx = e.clientX - s.x
          const dy = e.clientY - s.y
          if (Math.abs(dx) < SWIPE_MIN || Math.abs(dx) < 1.5 * Math.abs(dy)) return
          swiped.current = true
          turnPage(dx < 0 ? 'R' : 'L')
        },
        onPointerCancel: () => {
          swipe.current = null
        },
        // A swipe that ends on a button doesn't also press it.
        onClickCapture: (e: ReactMouseEvent) => {
          if (!swiped.current) return
          swiped.current = false
          e.preventDefault()
          e.stopPropagation()
        },
      }
    : undefined

  // After a page change, keyboard focus goes to the new page if it was lost.
  const leftRef = useRef<HTMLDivElement>(null)
  const rightRef = useRef<HTMLDivElement>(null)
  const bookPath = pathOf(bookUrl)
  useEffect(() => {
    const active = document.activeElement
    if (!active || active === document.body) leftRef.current?.focus({ preventScroll: true })
    // Phone: a new spread starts at the top of each page (the paper scrolls there).
    if (leftRef.current) leftRef.current.scrollTop = 0
    if (rightRef.current) rightRef.current.scrollTop = 0
  }, [bookPath])

  const { style: fitStyle, logo, vars: phoneVars } = usePlannerFit(phone)
  /** Phone: the page not on show stays mounted (its state and scroll), hidden and out of reach. */
  const offPage = (s: PageSide) => (phone && s !== side ? { inert: true, style: { visibility: 'hidden' } as CSSProperties } : {})
  const fullscreen = useIsFullscreen()
  const page = resolvePage(bookUrl).key
  const activeMark: BookmarkKey = win === 'open' ? 'students' : bookmarkFor(page)

  const closeWindow = () => navigate(bookUrl)
  const close = () => setPopup(null)
  // Back to planner: the page the Teacher came from (Home if they came straight to the Lobby).
  const backToPlanner = () => navigate(isLobbyPath(pathOf(bookUrl)) ? paths.teacher.home : bookUrl)

  // Back from the Lobby: keyboard focus goes to the planner page again.
  const wasOnLobby = useRef(onLobby)
  useEffect(() => {
    if (wasOnLobby.current && !onLobby) leftRef.current?.focus({ preventScroll: true })
    wasOnLobby.current = onLobby
  }, [onLobby])
  // Made once (setPopup never changes), so pages using them don't re-render for nothing.
  const [actions] = useState(() => ({ newSection: () => setPopup('newSection'), addStudent: () => setPopup('addStudent') }))

  const leave = () => {
    // One transition: the router changes pages in a transition, so a
    // separate log-out would render first, on the old Teacher page,
    // and the guard would send us to the Welcome card instead.
    exitFullscreen()
    startTransition(() => {
      navigate(paths.teacher.login)
      logOut()
    })
  }

  return (
    <PlannerActionsContext.Provider value={actions}>
      <PhonePagesContext.Provider value={phone ? { phone, side } : NOT_PHONE}>
      {onLobby && section && (
        <LazyTeacherLobbyScreen
          teacherName={teacher.name}
          section={`Grade ${sectionName}`}
          onBack={backToPlanner}
        />
      )}
      <div
        className={styles.root}
        // Under the full-screen Lobby the planner keeps its state but isn't drawn.
        style={{ '--flip-ms': `${FLIP_MS}ms`, display: onLobby ? 'none' : undefined, ...phoneVars } as CSSProperties}
        // A click during a page turn finishes it at once.
        onPointerDownCapture={() => flip && setFlip(null)}
      >
        <div className={styles.scene} aria-hidden="true">
          <SceneBackground>{null}</SceneBackground>
        </div>

        {/* Fixed size at the window's top-left (not scaled with the planner). */}
        {logo && (
          <div className={logo === 'small' ? `${styles.brand} ${styles.brandSmall}` : styles.brand}>
            <KiddexLogo />
          </div>
        )}

        <div className={`${styles.stage} ${styles.bookStage}`} style={fitStyle} inert={win === 'open' || popup ? true : undefined}>
          <BookBack side={phone ? side : undefined} />

          <main {...swipeHandlers}>
            <div className={styles.slotL} {...offPage('L')}>
              <Half url={bookUrl} side="L" live paperRef={leftRef} phone={phone} />
            </div>
            <div className={styles.slotR} {...offPage('R')}>
              <Half url={bookUrl} side="R" live paperRef={rightRef} phone={phone} />
            </div>
          </main>

          {flip && !flip.fade && !phone && <PageTurn flip={flip} to={bookUrl} onDone={() => setFlip(null)} />}
          {flip && !flip.fade && phone && <PhonePageTurn flip={flip} to={bookUrl} onDone={() => setFlip(null)} />}
          {flip && flip.fade && (
            <div className={styles.fadeOld} inert aria-hidden="true" onAnimationEnd={() => setFlip(null)}>
              {phone ? (
                <div className={styles.slotL}>
                  <Half url={flip.from} side={flip.fromSide} />
                </div>
              ) : (
                <>
                  <div className={styles.slotL}>
                    <Half url={flip.from} side="L" />
                  </div>
                  <div className={styles.slotR}>
                    <Half url={flip.from} side="R" />
                  </div>
                </>
              )}
            </div>
          )}

          <BookFront side={phone ? side : undefined} />
        </div>

        {win !== 'hidden' && (
          <div
            className={win === 'closing' ? `${styles.blur} ${styles.blurOut}` : styles.blur}
            aria-hidden="true"
            onClick={win === 'open' ? closeWindow : undefined}
          />
        )}

        <div className={`${styles.stage} ${styles.chromeStage}`} style={fitStyle} inert={popup ? true : undefined}>
          <SectionTabs />
          <Bookmarks active={activeMark} onGo={(to) => navigate(to)} phone={phone} />
          {phone ? (
            // Phone: the pager, then Full screen (only where the browser can go full screen).
            <div className={styles.topRight}>
              <Pager side={side} onTurn={turnPage} />
              {!fullscreen && document.fullscreenEnabled && <FullscreenButton />}
            </div>
          ) : (
            !fullscreen && (
              <div className={styles.topRight}>
                <FullscreenButton />
              </div>
            )
          )}
          {win !== 'hidden' && (
            <StudentsWindow
              closing={win === 'closing'}
              initialFilter={new URLSearchParams(winQuery).get('filter')}
              onClose={closeWindow}
              onClosed={() => setWin('hidden')}
            />
          )}
        </div>

        {/* The Teacher badge: its own layer, so it stays sharp (and lit) over the Log out blur. */}
        <div
          className={`${styles.stage} ${popup === 'logOut' ? styles.badgeStageTop : styles.badgeStage}`}
          style={fitStyle}
          inert={popup && popup !== 'logOut' ? true : undefined}
        >
          <TeacherBadge lit={popup === 'logOut'} onLogOut={() => setPopup('logOut')} />
        </div>

        {popup === 'logOut' && <LogOutDialog onStay={close} onLogOut={leave} />}
        {popup === 'newSection' && <NewSectionDialog onClose={close} />}
        {popup === 'addStudent' && <AddStudentDialog onClose={close} />}
      </div>
      </PhonePagesContext.Provider>
    </PlannerActionsContext.Provider>
  )
}

/** Not on a phone: both pages show (the context's default). */
const NOT_PHONE = { phone: false, side: 'L' } as const

/**
 * Phone: the paper scrolls inside the book. While there is more below, it
 * gets data-more (a soft fade at its bottom edge, planner.module.css).
 */
function usePaperMore(paperRef: RefObject<HTMLDivElement | null> | undefined, on: boolean) {
  useEffect(() => {
    const paper = paperRef?.current
    if (!on || !paper) return
    let frame = 0
    const check = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const more = paper.scrollTop + paper.clientHeight < paper.scrollHeight - 4
        if (more) paper.dataset.more = ''
        else delete paper.dataset.more
      })
    }
    check()
    paper.addEventListener('scroll', check, { passive: true })
    const ro = new ResizeObserver(check)
    ro.observe(paper)
    for (const child of paper.children) ro.observe(child)
    const mo = new MutationObserver(check)
    mo.observe(paper, { childList: true, subtree: true })
    return () => {
      cancelAnimationFrame(frame)
      paper.removeEventListener('scroll', check)
      ro.disconnect()
      mo.disconnect()
      delete paper.dataset.more
    }
  }, [paperRef, on])
}

/** One page of a spread, on lined paper. live = false for still copies. */
function Half({
  url,
  side,
  live = false,
  paperRef,
  phone = false,
}: {
  url: string
  side: 'L' | 'R'
  live?: boolean
  paperRef?: RefObject<HTMLDivElement | null>
  phone?: boolean
}) {
  const { key, lessonId, query } = resolvePage(url)
  const Page = side === 'L' ? SPREADS[key].Left : SPREADS[key].Right
  usePaperMore(paperRef, phone && live)
  return (
    <div
      ref={paperRef}
      className={`${styles.paper} ${side === 'L' ? styles.paperL : styles.paperR}`}
      // The left page takes focus after a page change (as before); the right one only needs its ref.
      tabIndex={paperRef && side === 'L' ? -1 : undefined}
      // The scrolling paper of a live page (Check finds it to scroll to a card).
      data-paper={live ? '' : undefined}
    >
      <Page key={pathOf(url)} lessonId={lessonId} query={query} live={live} />
      <span className={side === 'L' ? `${styles.pageNum} ${styles.pageNumL}` : `${styles.pageNum} ${styles.pageNumR}`} aria-hidden="true">
        {pageNumber(key, side)}
      </span>
    </div>
  )
}

/**
 * The 3D page turn. Forward: the old right page turns over the spine; its
 * back is the new left page, and the new right page is already underneath.
 * Backward: the same from the left. The old page on the side that doesn't
 * turn stays on top until the turning page lands on it.
 */
function PageTurn({ flip, to, onDone }: { flip: Flip; to: string; onDone: () => void }) {
  const fwd = flip.dir === 'fwd'
  const keep: 'L' | 'R' = fwd ? 'L' : 'R'
  const turn: 'L' | 'R' = fwd ? 'R' : 'L'
  const dir = fwd ? styles.fwd : styles.bwd
  return (
    <div className={styles.flipLayer} inert aria-hidden="true">
      <div className={`${keep === 'L' ? styles.slotL : styles.slotR} ${styles.cover2}`}>
        <Half url={flip.from} side={keep} />
      </div>
      <div className={`${styles.underShade} ${dir}`} />
      <div
        className={`${styles.flipper} ${dir}`}
        onAnimationEnd={(e) => {
          if (e.target === e.currentTarget) onDone()
        }}
      >
        <div className={styles.face}>
          <Half url={flip.from} side={turn} />
          <div className={`${styles.shade} ${styles.shadeIn} ${fwd ? styles.shadeFromLeft : styles.shadeFromRight}`} />
        </div>
        <div className={`${styles.face} ${styles.faceBack}`}>
          <Half url={to} side={keep} />
          <div className={`${styles.shade} ${styles.shadeOut} ${fwd ? styles.shadeFromRight : styles.shadeFromLeft}`} />
        </div>
      </div>
    </div>
  )
}

/**
 * Phone: the same 3D turn, for one page. Forward: the page on show turns
 * over toward the left (around its left edge), and the next page is already
 * underneath. Backward: the earlier page comes back from the left and lands
 * on the page on show. Same time, shading and curl as the laptop turn.
 */
function PhonePageTurn({ flip, to, onDone }: { flip: Flip; to: string; onDone: () => void }) {
  const fwd = flip.dir === 'fwd'
  return (
    <div className={styles.flipLayer} inert aria-hidden="true">
      {/* Backward: the old page stays on top until the turning page lands on it. */}
      {!fwd && (
        <div className={`${styles.slotL} ${styles.cover2}`}>
          <Half url={flip.from} side={flip.fromSide} />
        </div>
      )}
      <div className={`${styles.underShade} ${styles.phoneUnder}`} />
      <div
        className={`${styles.flipper} ${fwd ? styles.phoneTurnAway : styles.phoneTurnBack}`}
        onAnimationEnd={(e) => {
          if (e.target === e.currentTarget) onDone()
        }}
      >
        <div className={styles.face}>
          <Half url={fwd ? flip.from : to} side={fwd ? flip.fromSide : flip.toSide} />
          <div className={`${styles.shade} ${fwd ? styles.shadeIn : styles.shadeInBack} ${styles.shadeFromLeft}`} />
        </div>
      </div>
    </div>
  )
}

/** Phone: ‹ "Page 1 of 2" › in the top bar, between the section tabs and Full screen. */
function Pager({ side, onTurn }: { side: PageSide; onTurn: (to: PageSide) => void }) {
  const n = side === 'L' ? 1 : 2
  return (
    <div className={styles.pager} role="group" aria-label="Pages">
      <button type="button" className={styles.pageBtn} aria-label="Previous page" disabled={side === 'L'} onClick={() => onTurn('L')}>
        <ChevronLeft size={30} strokeWidth={2.8} aria-hidden="true" />
      </button>
      <span className={styles.pagePill} aria-live="polite">
        Page {n} of 2
        <span className={styles.pageDots} aria-hidden="true">
          <span className={n === 1 ? styles.pageDotOn : styles.pageDot} />
          <span className={n === 2 ? styles.pageDotOn : styles.pageDot} />
        </span>
      </span>
      <button type="button" className={styles.pageBtn} aria-label="Next page" disabled={side === 'R'} onClick={() => onTurn('R')}>
        <ChevronRight size={30} strokeWidth={2.8} aria-hidden="true" />
      </button>
    </div>
  )
}

// ---------- The book (maroon hardcover) ----------

/** A gold corner guard (top-left as drawn; the others are mirrored in CSS). */
function Corner({ className }: { className: string }) {
  return (
    <svg className={`${styles.corner} ${className}`} viewBox="0 0 54 54" aria-hidden="true">
      <path d="M0 17A17 17 0 0 1 17 0H54L0 54Z" fill="var(--book-gold)" />
      <path d="M0 17A17 17 0 0 1 17 0H46L0 46Z" fill="var(--book-gold-light)" />
      <path d="M54 0L0 54" stroke="var(--book-gold-dark)" strokeWidth="2" />
    </svg>
  )
}

/** Under the pages: shadow, cover, gold line and corners, the spine, the stacked page edges and the paper leaves. */
/** side: on a phone, the page on show (the spine is at its inner edge). */
function BookBack({ side }: { side?: PageSide }) {
  return (
    <div className={styles.bookBack} aria-hidden="true" data-side={side}>
      <span className={styles.bookShadow} />
      <span className={styles.cover}>
        <span className={styles.foil} />
      </span>
      <Corner className={styles.cornerTL} />
      <Corner className={styles.cornerTR} />
      <Corner className={`${styles.cornerBL} ${styles.cornerBottom}`} />
      <Corner className={`${styles.cornerBR} ${styles.cornerBottom}`} />
      <span className={styles.hinge} />
      <span className={`${styles.stack} ${styles.stackL}`} />
      <span className={`${styles.stack} ${styles.stackR}`} />
      <span className={`${styles.stack} ${styles.stackB}`} />
      <span className={`${styles.leaf} ${styles.leafL}`} />
      <span className={`${styles.leaf} ${styles.leafR}`} />
    </div>
  )
}

/** Over the pages (never over the text): the gutter line, the headband and the ribbon bookmark. */
function BookFront({ side }: { side?: PageSide }) {
  return (
    <div className={styles.bookFront} aria-hidden="true" data-side={side}>
      <span className={styles.gutter} />
      <span className={styles.band} />
      <span className={styles.ribbon} />
    </div>
  )
}

// ---------- Section tabs ----------

const TAB_ICONS: Record<SectionIcon, LucideIcon> = { flower: Flower, tulip: Flower2, rose: Rose }
const TAB_COLORS = { yellow: styles.tabYellow, pink: styles.tabPink, coral: styles.tabCoral }

/**
 * Tabs sit in a row, each as wide as its own label (never squeezed). With no
 * section yet, only the big dashed "+ New section" tab shows.
 */
function SectionTabs() {
  const { sections, active, setActive } = useSection()
  const { newSection } = usePlannerActions()
  const first = sections.length === 0
  return (
    <div className={styles.tabs} role="group" aria-label="Sections">
      {sections.map((s) => {
        const Icon = TAB_ICONS[s.icon]
        const on = s.id === active?.id
        return (
          <button
            key={s.id}
            type="button"
            className={`${styles.tab} ${TAB_COLORS[s.color]} ${on ? styles.tabOn : ''}`}
            aria-pressed={on}
            onClick={() => setActive(s.id)}
          >
            <span className={styles.tabIcon} aria-hidden="true">
              <Icon size={18} strokeWidth={2.2} />
            </span>
            {sectionLabel(s)}
          </button>
        )
      })}
      <button type="button" className={first ? `${styles.tab} ${styles.tabAdd}` : `${styles.tab} ${styles.tabNew}`} onClick={newSection}>
        <span className={styles.tabPlus} aria-hidden="true">
          <Plus size={first ? 18 : 16} strokeWidth={3} />
        </span>
        {first ? 'New section' : 'New'}
        {!first && <span className="visually-hidden"> section</span>}
      </button>
    </div>
  )
}

// ---------- Bookmarks ----------

type BookmarkKey = 'home' | 'students' | 'lessons' | 'progress' | 'lobby'

const bookmarkFor = (page: PageKey): BookmarkKey =>
  page === 'home' ? 'home' : page === 'progress' ? 'progress' : page === 'lobby' ? 'lobby' : 'lessons'

const BOOKMARKS: { key: BookmarkKey; label: string; icon: LucideIcon; top: number; to: string }[] = [
  { key: 'home', label: 'Home', icon: House, top: 151, to: paths.teacher.home },
  { key: 'students', label: 'Students', icon: Users, top: 239, to: studentsPath() },
  { key: 'lessons', label: 'Lessons', icon: BookOpen, top: 327, to: paths.teacher.lessons },
  { key: 'progress', label: 'Progress', icon: ChartNoAxesColumn, top: 415, to: paths.teacher.progress },
  { key: 'lobby', label: 'Lobby', icon: TreePalm, top: 531, to: paths.teacher.lobby },
]

/** Each bookmark's own color (planner.module.css). */
const BOOKMARK_COLORS: Record<BookmarkKey, string> = {
  home: styles.bmHome,
  students: styles.bmStudents,
  lessons: styles.bmLessons,
  progress: styles.bmProgress,
  lobby: styles.bmLobby,
}

function Bookmarks({ active, onGo, phone }: { active: BookmarkKey; onGo: (to: string) => void; phone: boolean }) {
  return (
    <nav className={styles.bookmarks} aria-label="Planner pages">
      {BOOKMARKS.map(({ key, label, icon: Icon, top: laptopTop, to }, i) => {
        // Phone: an even column down the left edge.
        const top = phone ? PHONE_MARK_TOP + i * PHONE_MARK_STEP : laptopTop
        const on = key === active
        const className = [styles.bookmark, BOOKMARK_COLORS[key], on && styles.bookmarkOn]
          .filter(Boolean)
          .join(' ')
        return (
          <button
            key={key}
            type="button"
            className={className}
            style={{ top }}
            aria-current={on ? 'page' : undefined}
            onClick={() => !on && onGo(to)}
          >
            <Icon size={27} strokeWidth={2.2} aria-hidden="true" />
            {label}
          </button>
        )
      })}
    </nav>
  )
}

// ---------- Full screen button ----------

/** Only shows while the page isn't full screen (the Teacher may leave it with Esc). */
function FullscreenButton() {
  return (
    <button type="button" className={styles.fullscreen} onClick={enterFullscreen}>
      <Maximize size={18} strokeWidth={2.4} aria-hidden="true" />
      Full screen
    </button>
  )
}

// ---------- The Teacher badge (bottom left) ----------

/** "Ms. Cruz" -> "MC" */
const initials = (name: string) =>
  name
    .replace(/\./g, '')
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

/** A Teacher ID on a lanyard, under the Lobby bookmark: the name, "Teacher" and Log out. */
function TeacherBadge({ lit, onLogOut }: { lit: boolean; onLogOut: () => void }) {
  const teacher = useTeacher()
  return (
    <div className={styles.badgeWrap}>
      <span className={styles.lanyard} aria-hidden="true" />
      <div className={lit ? `${styles.badge} ${styles.badgeLit}` : styles.badge}>
        <span className={styles.avatar} aria-hidden="true">
          {initials(teacher.name)}
        </span>
        <b className={styles.badgeName}>{teacher.name}</b>
        <span className={styles.badgeRole}>Teacher</span>
        <button type="button" className={styles.badgeOut} onClick={onLogOut} aria-haspopup="dialog">
          <LogOut size={19} strokeWidth={2.4} aria-hidden="true" />
          Log out
        </button>
      </div>
      <span className={styles.clip} aria-hidden="true" />
    </div>
  )
}

/** Page numbers: Home is pages 1 and 2, Lessons 3 and 4, and so on. */
const pageNumber = (key: PageKey, side: 'L' | 'R') => {
  const order: PageKey[] = ['home', 'lessons', 'making', 'check', 'games', 'progress', 'lobby']
  return order.indexOf(key) * 2 + (side === 'L' ? 1 : 2)
}

