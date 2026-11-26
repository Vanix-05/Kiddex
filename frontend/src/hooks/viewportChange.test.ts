import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { onViewportChange } from './viewportChange'

/** Tests run without a browser: a small stand-in window and document. */
function fakeBrowser() {
  const win = Object.assign(new EventTarget(), {
    setTimeout: (fn: () => void, ms: number) => globalThis.setTimeout(fn, ms),
    clearTimeout: (id: number) => globalThis.clearTimeout(id),
    visualViewport: undefined,
  })
  const doc = Object.assign(new EventTarget(), { visibilityState: 'visible', documentElement: {} })
  vi.stubGlobal('window', win)
  vi.stubGlobal('document', doc)
  vi.stubGlobal('requestAnimationFrame', (fn: () => void) => globalThis.setTimeout(fn, 16))
  vi.stubGlobal('cancelAnimationFrame', (id: number) => globalThis.clearTimeout(id))
}

describe('onViewportChange', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    fakeBrowser()
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('fits again a moment after the event, when phones report the real size', () => {
    const fit = vi.fn()
    const stop = onViewportChange(fit)
    window.dispatchEvent(new Event('resize'))
    expect(fit).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(800)
    expect(fit.mock.calls.length).toBeGreaterThanOrEqual(3)
    stop()
  })

  it('fits when the app comes back from the home screen', () => {
    const fit = vi.fn()
    const stop = onViewportChange(fit)
    document.dispatchEvent(new Event('visibilitychange'))
    window.dispatchEvent(new Event('pageshow'))
    expect(fit).toHaveBeenCalled()
    stop()
  })

  it('stops listening after cleanup', () => {
    const fit = vi.fn()
    onViewportChange(fit)()
    window.dispatchEvent(new Event('resize'))
    vi.advanceTimersByTime(800)
    expect(fit).not.toHaveBeenCalled()
  })
})
