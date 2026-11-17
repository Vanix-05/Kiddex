import type { Avatar } from '../../../setup/avatar'

/**
 * The pull-in's wide shot: the kid at the desk being pulled into the book
 * (src/assets/videos/magic/pull-in-boy.mp4 and pull-in-girl.mp4, 4.58 s,
 * 1280 x 720, no sound). Found with import.meta.glob, so the build works
 * without the files (the clip then plays the old rush instead).
 */
const found = import.meta.glob<string>('../../../assets/videos/magic/pull-in-{boy,girl}.mp4', {
  eager: true,
  query: '?url',
  import: 'default',
})
const fileFor = (gender: Avatar): string | null =>
  Object.entries(found).find(([path]) => path.endsWith(`pull-in-${gender}.mp4`))?.[1] ?? null

/** Downloaded copies, kept in memory as blob URLs (one per gender, made once). */
const blobs = new Map<Avatar, string>()
const loading = new Map<Avatar, Promise<void>>()

/**
 * Starts downloading this gender's video, quietly, into memory. Called as
 * soon as Boy or Girl is picked, so it is there long before Choose.
 */
export function preloadPullInVideo(gender: Avatar) {
  const file = fileFor(gender)
  if (!file || blobs.has(gender) || loading.has(gender)) return
  const job = fetch(file)
    .then((response) => {
      if (!response.ok) throw new Error(`${response.status}`)
      return response.blob()
    })
    .then((blob) => {
      blobs.set(gender, URL.createObjectURL(blob))
    })
    .catch(() => {})
    .finally(() => loading.delete(gender))
  loading.set(gender, job)
}

/**
 * The video to play for this gender (the boy's if there is none): the copy in
 * memory once it has downloaded. If its download is still going, this waits
 * for it rather than asking for the file a second time (two requests for the
 * same file at once can make the browser fail one of them). If the download
 * failed, or never started, it is the file's own address (the browser then
 * streams it). null: the file isn't in the repo.
 */
export async function whenPullInVideo(gender: Avatar | null | undefined): Promise<string | null> {
  const g: Avatar = gender ?? 'boy'
  await loading.get(g)
  return blobs.get(g) ?? fileFor(g)
}
