import { bedroomArt } from '../../assets/art'

/**
 * The bedroom's pictures, decoded ahead of time.
 *
 * Decoding the big pictures takes a few seconds on a weak laptop, so it must
 * not happen while the intro clip is moving. The Student login starts it
 * (preloadBedroom) as soon as a new Student opens the book; the browser
 * decodes off the main thread while they type their numbers. By the time
 * the bedroom is shown, each picture only has to be copied into its canvas.
 */

/** The hands are drawn small (about 200 to 400 px wide on screen): this many pixels is plenty. */
export const HAND_PX = 512

const decoded = new Map<string, Promise<ImageBitmap>>()

/** A picture, decoded (once) and optionally made no wider than maxWidth pixels. */
export function loadPicture(src: string, maxWidth?: number): Promise<ImageBitmap> {
  const key = `${src}|${maxWidth ?? ''}`
  let picture = decoded.get(key)
  if (!picture) {
    picture = fetch(src)
      .then((response) => response.blob())
      .then(async (blob) => {
        const full = await createImageBitmap(blob)
        if (!maxWidth || full.width <= maxWidth) return full
        const small = await createImageBitmap(full, {
          resizeWidth: maxWidth,
          resizeHeight: Math.round((full.height * maxWidth) / full.width),
          resizeQuality: 'high',
        })
        full.close()
        return small
      })
    decoded.set(key, picture)
    // A failed download can be tried again later.
    picture.catch(() => decoded.delete(key))
  }
  return picture
}

/** Starts downloading and decoding every bedroom picture. */
export function preloadBedroom() {
  const { wall, shelf, chair, bed, desk, handLeft, handRight } = bedroomArt
  for (const room of [wall, shelf, chair, bed]) {
    void loadPicture(room.sharp).catch(() => {})
    void loadPicture(room.soft).catch(() => {})
  }
  void loadPicture(desk).catch(() => {})
  for (const hand of [handLeft, handRight]) {
    void loadPicture(hand.picture, HAND_PX).catch(() => {})
    void loadPicture(hand.shadow).catch(() => {})
  }
}

/**
 * The pictures are in their canvases now: let go of the decoded copies, so
 * the browser can free them. (They are not closed by hand: a canvas may still
 * be finishing its drawing from one, and would come out blank.)
 */
export function releasePictures() {
  decoded.clear()
}
