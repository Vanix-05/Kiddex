import { useEffect, useRef, useState, type CSSProperties, type Ref } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { BookOpen, ChartNoAxesColumn, Flower, Flower2, House, Plus, Rose, TreePalm, Users, type LucideIcon } from 'lucide-react'
import { characterArt } from '../../assets/art'
import { KiddexLogo } from '../../components/KiddexLogo/KiddexLogo'
import { SceneBackground } from '../../components/SceneBackground/SceneBackground'
import { paths } from '../../routes/paths'
import { useSession } from '../../session/session'
import { TestDataProvider } from '../data/TestDataProvider'
import { sectionLabel, useSection, useTeacher } from '../data/useTeacherData'
import type { SectionIcon } from '../data/types'
import { StudentsWindow } from '../pages/StudentsWindow'
import { isStudentsPath, pageOrder, pathOf, resolvePage, studentsPath, type PageKey } from './pages'
import { SPREADS } from './spreads'
import { SHOW_TEST_SWITCH } from '../data/testDataContext'
import { TestViewSwitch } from './TestViewSwitch'
import styles from './planner.module.css'

/** How long a page turn takes. */
const FLIP_MS = 650
const STAGE_W = 1440
const STAGE_H = 900

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Scale for the 1440x900 stage: as big as fits, same ratio, centered. */
function fitStage() {
  const w = window.innerWidth
  const h = window.innerHeight
  const scale = Math.min(w / STAGE_W, h / STAGE_H)
  return { scale, left: (w - STAGE_W * scale) / 2, top: (h - STAGE_H * scale) / 2 }
}

function useStageFit() {
  const [fit, setFit] = useState(fitStage)
  useEffect(() => {
    const onResize = () => setFit(fitStage())
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return { transform: `translate(${fit.left}px, ${fit.top}px) scale(${fit.scale})` }
}

interface Flip {
  /** The URL whose pages are turning away. */
  from: string
  dir: 'fwd' | 'bwd'
  /** Reduce motion: a quick crossfade instead of a turn. */
  fade: boolean
}

type WindowState = 'hidden' | 'open' | 'closing'

/** The Teacher Dashboard: an open spiral planner on the island scene. */
export function TeacherPlanner() {
  return (
    <TestDataProvider>
      <Planner />
    </TestDataProvider>
  )
}

function Planner() {
  const location = useLocation()
  const navigate = useNavigate()
  const url = location.pathname + location.search
  const onStudents = isStudentsPath(location.pathname)

  // What the book shows. On /teacher/students it keeps the page underneath.
  const [bookUrl, setBookUrl] = useState(onStudents ? paths.teacher.home : url)
  const [flip, setFlip] = useState<Flip | null>(null)
  const [win, setWin] = useState<WindowState>(onStudents ? 'open' : 'hidden')
  const [winQuery, setWinQuery] = useState(onStudents ? location.search : '')

  // React to URL changes while rendering (no extra paint with the old page).
  const [seenUrl, setSeenUrl] = useState(url)
  if (seenUrl !== url) {
    setSeenUrl(url)
    if (onStudents) {
      setWin('open')
      setWinQuery(location.search)
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

  const fitStyle = useStageFit()
  const page = resolvePage(bookUrl).key
  const activeMark: BookmarkKey = win === 'open' ? 'students' : bookmarkFor(page)

  const closeWindow = () => navigate(bookUrl)

  return (
    <div
      className={styles.root}
      style={{ '--flip-ms': `${FLIP_MS}ms` } as CSSProperties}
      // A click during a page turn finishes it at once.
      onPointerDownCapture={() => flip && setFlip(null)}
    >
      <div className={styles.scene} aria-hidden="true">
        <SceneBackground>{null}</SceneBackground>
      </div>

      <div className={`${styles.stage} ${styles.bookStage}`} style={fitStyle} inert={win === 'open' ? true : undefined}>
        <div className={styles.brand}>
          <KiddexLogo />
        </div>
        <div className={styles.cover} aria-hidden="true" />

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

        <Rings />
      </div>

      {win !== 'hidden' && (
        <div
          className={win === 'closing' ? `${styles.blur} ${styles.blurOut}` : styles.blur}
          aria-hidden="true"
          onClick={win === 'open' ? closeWindow : undefined}
        />
      )}

      <div className={`${styles.stage} ${styles.chromeStage}`} style={fitStyle}>
        <SectionTabs />
        <Bookmarks active={activeMark} onGo={(to) => navigate(to)} />
        <ProfileChip />
        {SHOW_TEST_SWITCH && <TestViewSwitch />}
        {win !== 'hidden' && (
          <StudentsWindow
            closing={win === 'closing'}
            initialFilter={new URLSearchParams(winQuery).get('filter')}
            onClose={closeWindow}
            onClosed={() => setWin('hidden')}
          />
        )}
      </div>
    </div>
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

/** Metal spiral rings down the middle. */
function Rings() {
  return (
    <div className={styles.rings} aria-hidden="true">
      {Array.from({ length: 16 }, (_, i) => (
        <span key={i} className={styles.ring} style={{ top: i * 44 }} />
      ))}
    </div>
  )
}

// ---------- Section tabs ----------

const TAB_ICONS: Record<SectionIcon, LucideIcon> = { flower: Flower, tulip: Flower2, rose: Rose }
const TAB_COLORS = { yellow: styles.tabYellow, pink: styles.tabPink, coral: styles.tabCoral }
/** Tab widths and gaps from the reference (stage px, relative to the tab strip). */
const ACTIVE_W = 203
const TAB_W = 149
const GAP = 9

function SectionTabs() {
  const { sections, active, setActive } = useSection()
  const widths = sections.map((s) => (s.id === active.id ? ACTIVE_W : TAB_W))
  const lefts = widths.map((_, i) => 16 + widths.slice(0, i).reduce((a, w) => a + w + GAP, 0))
  const placed = sections.map((s, i) => ({ s, left: lefts[i], w: widths[i] }))
  const x = 16 + widths.reduce((a, w) => a + w + GAP, 0)
  return (
    <div className={styles.tabs} role="group" aria-label="Sections">
      {placed.map(({ s, left, w }) => {
        const Icon = TAB_ICONS[s.icon]
        const on = s.id === active.id
        return (
          <button
            key={s.id}
            type="button"
            className={`${styles.tab} ${TAB_COLORS[s.color]} ${on ? styles.tabOn : ''}`}
            style={{ left, width: w }}
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
      <button
        type="button"
        className={`${styles.tab} ${styles.tabNew}`}
        style={{ left: x, width: 104 }}
        onClick={() => {
          // TODO: add a new section.
        }}
      >
        <Plus size={20} aria-hidden="true" /> New
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
  { key: 'students', label: 'Students', icon: Users, top: 240, to: studentsPath() },
  { key: 'lessons', label: 'Lessons', icon: BookOpen, top: 330, to: paths.teacher.lessons },
  { key: 'progress', label: 'Progress', icon: ChartNoAxesColumn, top: 420, to: paths.teacher.progress },
  { key: 'lobby', label: 'Lobby', icon: TreePalm, top: 560, to: paths.teacher.lobby },
]

function Bookmarks({ active, onGo }: { active: BookmarkKey; onGo: (to: string) => void }) {
  return (
    <nav className={styles.bookmarks} aria-label="Planner pages">
      {BOOKMARKS.map(({ key, label, icon: Icon, top, to }) => {
        const on = key === active
        const className = [styles.bookmark, key === 'lobby' && styles.bookmarkGreen, on && styles.bookmarkOn]
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
            <Icon size={26} strokeWidth={2.2} aria-hidden="true" />
            {label}
          </button>
        )
      })}
    </nav>
  )
}

// ---------- Ms. Cruz ----------

function ProfileChip() {
  const teacher = useTeacher()
  const { logOut } = useSession()
  const navigate = useNavigate()
  return (
    <div className={styles.chip}>
      <span
        className={styles.chipAvatar}
        aria-hidden="true"
        style={{ backgroundImage: `url(${characterArt.ollie})`, backgroundSize: '190%', backgroundPosition: '50% 6%' }}
      />
      {teacher.name}
      <button
        type="button"
        className={styles.logOut}
        onClick={() => {
          navigate(paths.educator.login)
          logOut()
        }}
      >
        · Log out
      </button>
    </div>
  )
}
