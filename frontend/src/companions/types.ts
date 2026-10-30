import type { ComponentType } from 'react'
import type { Emotion } from './rig/emotions'

/** A point on a companion image, in % of the image's width (x) and height (y). */
export interface AnchorPoint {
  x: number
  y: number
}

/**
 * Where things sit on a companion's PNG, so shared animations and accessories
 * work for every companion. All values are % of the (square) image.
 */
export interface CompanionAnchors {
  /** Top of the head, centered: where hats sit. */
  headTop: AnchorPoint
  /** Head width in % of the image, so hats can be sized to fit. */
  headWidth: number
  eyes: { left: AnchorPoint; right: AnchorPoint }
  /** Where the head meets the body: for collars, bows, scarves. */
  neck: AnchorPoint
  /** Bottom of the feet: the shadow and the pivot for bounce and squash. */
  feet: AnchorPoint
}

export interface CompanionDefinition {
  name: string
  image: string
  anchors: CompanionAnchors
  /** A traced, part-by-part rig. When set, <Companion> shows it instead of animating the PNG. */
  Rig?: ComponentType<{ className?: string; label?: string; emotion?: Emotion }>
}
