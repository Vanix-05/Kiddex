/**
 * Calls `fit` whenever the screen's size may have changed, and keeps checking
 * for a moment after, because phones report the new size late.
 *
 * Why not just `resize`: when KIDDEX runs from the home screen (iPhone and
 * Android) and the Student goes to the home screen and back, the phone turns
 * the app upright and sideways again. The `resize` event can come while the
 * old size is still being reported, and no event comes after, so screens that
 * size themselves in code (the login book, the Lobby, the games...) stay
 * stuck at the wrong size. So we also listen for the app coming back
 * (visibilitychange, pageshow), for orientationchange and visualViewport
 * resize, we watch the page's real width after layout (ResizeObserver), and
 * we run `fit` again on the next frame and 250ms / 700ms later.
 * `fit` must be cheap and safe to call many times (it only reads sizes and sets
 * styles or state). Returns the cleanup.
 */
export function onViewportChange(fit: () => void): () => void {
  let frame = 0
  const timers: number[] = []
  const run = () => {
    fit()
    cancelAnimationFrame(frame)
    frame = requestAnimationFrame(fit)
    timers.splice(0).forEach((t) => window.clearTimeout(t))
    timers.push(window.setTimeout(fit, 250), window.setTimeout(fit, 700))
  }
  const onVisible = () => {
    if (document.visibilityState === 'visible') run()
  }
  const viewport = window.visualViewport
  // Fires after layout with the real size (the width flips when the phone turns).
  const watch = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => fit())
  watch?.observe(document.documentElement)

  window.addEventListener('resize', run)
  window.addEventListener('orientationchange', run)
  window.addEventListener('pageshow', run)
  document.addEventListener('visibilitychange', onVisible)
  viewport?.addEventListener('resize', run)
  return () => {
    window.removeEventListener('resize', run)
    window.removeEventListener('orientationchange', run)
    window.removeEventListener('pageshow', run)
    document.removeEventListener('visibilitychange', onVisible)
    viewport?.removeEventListener('resize', run)
    watch?.disconnect()
    cancelAnimationFrame(frame)
    timers.forEach((t) => window.clearTimeout(t))
  }
}
