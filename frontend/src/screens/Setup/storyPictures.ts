import { storybookArt } from '../../assets/art'

/*
 * The setup storybook's pictures are decoded a page ahead, so a page never
 * turns in with a picture still loading. Each picture is asked for once;
 * the images are kept so the browser keeps them ready.
 */

const kept = new Map<string, HTMLImageElement>()

function decode(urls: readonly string[]) {
  for (const url of urls) {
    if (kept.has(url)) continue
    const img = new Image()
    img.decoding = 'async'
    img.src = url
    kept.set(url, img)
    void img.decode().catch(() => kept.delete(url))
  }
}

/** Boy or Girl: the two backgrounds and the two pencil kids. */
export const preloadGenderPage = () =>
  decode([storybookArt.cardBg.boy, storybookArt.cardBg.girl, storybookArt.kids.boy, storybookArt.kids.girl])

/** Pick your buddy's left page: the meadow and the pencil buddies. */
export const preloadPetPage = () => decode([storybookArt.meadow, ...Object.values(storybookArt.pencilBuddies)])

/** A question's scene and its 4 answer pictures (0 = question 1). */
export const preloadQuestion = (index: number) => {
  if (index < 0 || index >= storybookArt.scenes.length) return
  decode([storybookArt.scenes[index], ...storybookArt.answers[index]])
}
