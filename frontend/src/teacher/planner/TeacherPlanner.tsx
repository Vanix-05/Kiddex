import { startTransition, useEffect, useRef, useState, type CSSProperties, type Ref } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { BookOpen, ChartNoAxesColumn, Flower, Flower2, House, LogOut, Maximize, Plus, Rose, TreePalm, Users, type LucideIcon } from 'lucide-react'
import { KiddexLogo } from '../../components/KiddexLogo/KiddexLogo'
import { SceneBackground } from '../../components/SceneBackground/SceneBackground'
import { paths } from '../../routes/paths'
import { useSession } from '../../session/session'
import { enterFullscreen, exitFullscreen, useIsFullscreen } from '../fullscreen'
import { QueryClientProvider } from '@tanstack/react-query'
import { teacherQueryClient } from '../api/queryClient'
import { TeacherDataProvider } from '../data/TeacherDataProvider'
import { sectionLabel, useSection, useTeacher } from '../data/useTeacherData'
import type { SectionIcon } from '../data/types'
import { StudentsWindow } from '../pages/StudentsWindow'
import { AddStudentDialog, LogOutDialog, NewSectionDialog } from './Dialogs'
import { LazyTeacherLobbyScreen } from '../../screens/Lobby/LazyLobby'
import { isLobbyPath, isStudentsPath, pageOrder, pathOf, resolvePage, studentsPath, type PageKey } from './pages'
import { PlannerActionsContext, usePlannerActions } from './plannerActions'
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

function usePlannerFit() {
  const [fit, setFit] = useState(fitPlanner)
  useEffect(() => {
    const onResize = () => setFit(fitPlanner())
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return {
    style: { transform: `translate(${fit.left}px, ${fit.top}px) scale(${fit.scale})` },
    logo: fit.logo,
  }
}

interface Flip {
  /** The URL whose pages are turning away. */
  from: string
  dir: 'fwd' | 'bwd'
  /** Reduce motion: a quick crossfade instead of a turn. */
  fade: boolean
}

type WindowState = 'hidden' | 'open' | 'closing'
type Popup = 'newSection' | 'addStudent' | 'logOut' | null

/** The Teacher Dashboard: an open hardcover planner on the island scene. */
export function TeacherPlanner() {
  return (
    <QueryClientProvider client={teacherQueryClient}>
      <TeacherDataProvider>
        <Planner />
      </TeacherDataProvider>
    </QueryClientProvider>
  )
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
      if (pathOf(url) !== pathOf(bookUrl)) {
        // Starting a new turn while one plays finishes the old one at once.
        setFlip({ from: bookUrl, dir: pageOrder(url) >= pageOrder(bookUrl) ? 'fwd' : 'bwd', fade: reducedMotion() })
      }
      setBookUrl(url)
    }
  }

  // After a page change, keyboard focus goes to the new page if it was lost.
  const leftRef = useRef<HTMLDivElement>(null)
  const bookPath = pathOf(bookUrl)
  useEffect(() => {
    const active = document.activeElement
    if (!active || active === document.body) leftRef.current?.focus({ preventScroll: true })
  }, [bookPath])

  const { style: fitStyle, logo } = usePlannerFit()
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
        style={{ '--flip-ms': `${FLIP_MS}ms`, display: onLobby ? 'none' : undefined } as CSSProperties}
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
          <BookBack />

          <main>
            <div className={styles.slotL}>
              <Half url={bookUrl} side="L" live paperRef={leftRef} />
            </div>
            <div className={styles.slotR}>
              <Half url={bookUrl} side="R" live />
            </div>
          </main>

          {flip && !flip.fade && <PageTurn flip={flip} to={bookUrl} onDone={() => setFlip(null)} />}
          {flip && flip.fade && (
            <div className={styles.fadeOld} inert aria-hidden="true" onAnimationEnd={() => setFlip(null)}>
              <div className={styles.slotL}>
                <Half url={flip.from} side="L" />
              </div>
              <div className={styles.slotR}>
                <Half url={flip.from} side="R" />
              </div>
            </div>
          )}

          <BookFront />
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
          <Bookmarks active={activeMark} onGo={(to) => navigate(to)} />
          {!fullscreen && (
            <div className={styles.topRight}>
              <FullscreenButton />
            </div>
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
    </PlannerActionsContext.Provider>
  )
}

/** One page of a spread, on lined paper. live = false for still copies. */
function Half({ url, side, live = false, paperRef }: { url: string; side: 'L' | 'R'; live?: boolean; paperRef?: Ref<HTMLDivElement> }) {
  const { key, lessonId, query } = resolvePage(url)
  const Page = side === 'L' ? SPREADS[key].Left : SPREADS[key].Right
  return (
    <div
      ref={paperRef}
      className={`${styles.paper} ${side === 'L' ? styles.paperL : styles.paperR}`}
      tabIndex={paperRef ? -1 : undefined}
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
function BookBack() {
  return (
    <div className={styles.bookBack} aria-hidden="true">
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
function BookFront() {
  return (
    <div className={styles.bookFront} aria-hidden="true">
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

function Bookmarks({ active, onGo }: { active: BookmarkKey; onGo: (to: string) => void }) {
  return (
    <nav className={styles.bookmarks} aria-label="Planner pages">
      {BOOKMARKS.map(({ key, label, icon: Icon, top, to }) => {
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

