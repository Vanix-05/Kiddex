/**
 * The storybook screens are laid out on a fixed 1440 x 900 stage, scaled as
 * one piece to fit the window. This works out that scale and position.
 */

/** A part of the 1440 x 900 stage that has to fit in the window. */
export interface StageView {
  x: number
  y: number
  w: number
  h: number
}

/** The whole stage. */
export const FULL_STAGE: StageView = { x: 0, y: 0, w: 1440, h: 900 }

/** CSS transform (origin 0 0) that fits `view` inside a w x h window, centered. */
export function fitStage(w: number, h: number, view: StageView = FULL_STAGE) {
  const s = Math.min(w / view.w, h / view.h)
  const x = (w - view.w * s) / 2 - view.x * s
  const y = (h - view.h * s) / 2 - view.y * s
  return `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) scale(${s.toFixed(4)})`
}
