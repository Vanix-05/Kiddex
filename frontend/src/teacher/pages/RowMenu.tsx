import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react'
import { MoreHorizontal } from 'lucide-react'
import styles from './StudentsWindow.module.css'

export interface RowMenuItem {
  key: string
  label: string
  icon: ReactNode
  /** Its colors (the default is maroon, like "Remove from section"). */
  className?: string
  onSelect: () => void
}

/** Where the menu opens: as the CSS says, or measured ('auto'). */
export type RowMenuPlace = 'css' | { prefer: 'down' | 'up' }

/** The visible box of everything that clips `el` (the scrolling list, the paper…). */
function clipBox(el: HTMLElement): { top: number; bottom: number } {
  let top = 0
  let bottom = window.innerHeight
  for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
    const { overflowY } = getComputedStyle(p)
    if (overflowY === 'visible') continue
    const r = p.getBoundingClientRect()
    top = Math.max(top, r.top)
    bottom = Math.min(bottom, r.bottom)
  }
  return { top, bottom }
}

/**
 * ⋯ at the end of a row (My Students, My lessons): a small menu. A real menu:
 * arrow keys move, Enter picks, Esc or a click outside closes it (focus back on ⋯).
 * Picking an item puts focus back on ⋯ first, so a popup it opens gives focus back there.
 *
 * `place`: 'css' (My Students: under ⋯, above it on a phone), or a preferred side
 * that is kept when the menu fits there inside the scrolling list, else the other side.
 */
export function RowMenu({
  label,
  moreId,
  items,
  buttonClassName,
  menuClassName,
  place = 'css',
}: {
  /** "More for 2026-0177" */
  label: string
  /** data-more-id on ⋯, so focus can come back to it. */
  moreId: string
  items: RowMenuItem[]
  buttonClassName?: string
  menuClassName?: string
  place?: RowMenuPlace
}) {
  const [open, setOpen] = useState(false)
  const [side, setSide] = useState<'down' | 'up' | null>(null)
  const menuId = useId()
  const wrapRef = useRef<HTMLSpanElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const menuItems = () => [...(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])]

  const prefer = place === 'css' ? null : place.prefer
  // Measured placement, before the menu is painted.
  useLayoutEffect(() => {
    if (!open || !prefer) return
    const button = buttonRef.current
    const menu = menuRef.current
    if (!button || !menu) return
    const box = clipBox(button)
    const b = button.getBoundingClientRect()
    const need = menu.getBoundingClientRect().height + 8
    const fitsDown = b.bottom + need <= box.bottom
    const fitsUp = b.top - need >= box.top
    setSide(prefer === 'up' ? (fitsUp || !fitsDown ? 'up' : 'down') : fitsDown || !fitsUp ? 'down' : 'up')
  }, [open, prefer])

  // Open: focus the first item. A click outside closes it.
  useEffect(() => {
    if (!open) return
    menuItems()[0]?.focus({ preventScroll: true })
    const onDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [open])

  const close = () => {
    setOpen(false)
    buttonRef.current?.focus({ preventScroll: true })
  }

  const onMenuKey = (e: ReactKeyboardEvent) => {
    const list = menuItems()
    const at = list.indexOf(document.activeElement as HTMLElement)
    if (e.key === 'Escape') {
      // Only the menu closes, not the window or the view behind it.
      e.stopPropagation()
      e.nativeEvent.stopImmediatePropagation()
      close()
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      const step = e.key === 'ArrowDown' ? 1 : -1
      list[(at + step + list.length) % list.length]?.focus({ preventScroll: true })
    } else if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault()
      list[e.key === 'Home' ? 0 : list.length - 1]?.focus({ preventScroll: true })
    } else if (e.key === 'Tab') {
      setOpen(false)
    }
  }

  const sideStyle =
    !prefer || !side
      ? undefined
      : side === 'up'
        ? { top: 'auto', bottom: 'calc(100% + 6px)' }
        : { top: 'calc(100% + 6px)', bottom: 'auto' }

  return (
    <span ref={wrapRef} className={styles.more}>
      <button
        ref={buttonRef}
        type="button"
        className={[styles.moreButton, open && styles.moreOpen, buttonClassName].filter(Boolean).join(' ')}
        aria-label={label}
        data-more-id={moreId}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => {
          setSide(null)
          setOpen((o) => !o)
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault()
            setSide(null)
            setOpen(true)
          }
        }}
      >
        <MoreHorizontal size={22} strokeWidth={2.6} aria-hidden="true" />
      </button>
      {open && (
        <div
          ref={menuRef}
          id={menuId}
          className={[styles.menu, menuClassName].filter(Boolean).join(' ')}
          style={sideStyle}
          role="menu"
          aria-label={label}
          onKeyDown={onMenuKey}
        >
          {items.map((item) => (
            <button
              key={item.key}
              type="button"
              role="menuitem"
              className={[styles.menuItem, item.className].filter(Boolean).join(' ')}
              onClick={() => {
                close()
                item.onSelect()
              }}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </span>
  )
}
