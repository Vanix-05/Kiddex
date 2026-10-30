/** How a companion feels. Shown through its face, posture and tempo together. */
export type Emotion = 'calm' | 'happy' | 'sad' | 'surprised' | 'sleepy'

export const EMOTIONS: readonly Emotion[] = ['calm', 'happy', 'sad', 'surprised', 'sleepy']

/**
 * An emotion is just a set of numbers. When the emotion changes, each number
 * springs to its new value, so every change is smooth.
 */
export interface EmotionPose {
  /** Eyelid: 0 = open, 1 = shut. Below 0 opens the eyes wider. */
  lid: number
  /** Eyelid tilt in degrees. Positive raises the inner corners (sad). */
  lidTilt: number
  eyeScale: number
  /** Ears and gills droop, in degrees (outward and down; negative perks them up). */
  droop: number
  /** Head offset, in SVG units (positive = lower). */
  headY: number
  headTilt: number
  /** Speed of the idle motion (breathing, sway). */
  tempo: number
  /** Size of the idle motion. */
  motion: number
  /** Blush opacity. */
  blush: number
}

export const EMOTION_POSES: Record<Emotion, EmotionPose> = {
  calm: { lid: 0, lidTilt: 0, eyeScale: 1, droop: 0, headY: 0, headTilt: 0, tempo: 1, motion: 1, blush: 0.35 },
  happy: { lid: 0, lidTilt: 0, eyeScale: 1, droop: -3, headY: -30, headTilt: -3, tempo: 1.5, motion: 1.5, blush: 0.8 },
  sad: { lid: 0.3, lidTilt: 13, eyeScale: 0.95, droop: 26, headY: 80, headTilt: 5, tempo: 0.6, motion: 0.5, blush: 0 },
  surprised: { lid: -0.1, lidTilt: 0, eyeScale: 1.16, droop: -7, headY: -40, headTilt: 0, tempo: 1.1, motion: 0.35, blush: 0.2 },
  sleepy: { lid: 0.58, lidTilt: -3, eyeScale: 1, droop: 12, headY: 70, headTilt: 0, tempo: 0.45, motion: 1.3, blush: 0.3 },
}
