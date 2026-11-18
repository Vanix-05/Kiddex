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

// ---------- The <video> itself, primed on the Choose tap ----------
//
// Phones don't load a hidden video by themselves: iPhone Safari ignores
// preload, Android does the same in Data Saver or battery saver, and iPhone
// Low Power Mode refuses play() unless a tap started it. So on the Choose tap
// the video element is made right away and primed (muted play(), then pause
// at 0): that is allowed from a tap even in Low Power Mode, and it makes the
// phone load the first frame. The clip (usePullInClip) then puts this same
// element on screen. Laptops load it anyway, so for them nothing changes.

/** The downloaded copy's address if it is already in memory (no waiting), else null. */
export function pullInVideoReady(gender: Avatar | null | undefined): string | null {
  return blobs.get(gender ?? 'boy') ?? null
}

/** A hidden, muted, inline <video> for the wide shot (the clip gives it its class and puts it on screen). */
export function makePullInPlayer(url: string): HTMLVideoElement {
  const video = document.createElement('video')
  video.muted = true
  video.defaultMuted = true
  video.playsInline = true
  video.setAttribute('playsinline', '')
  video.setAttribute('muted', '')
  video.preload = 'auto'
  video.disablePictureInPicture = true
  video.setAttribute('aria-hidden', 'true')
  video.tabIndex = -1
  video.src = url
  return video
}

/** Players the clip has started using at the cut: a late priming pause must not stop them. */
const inUse = new WeakSet<HTMLVideoElement>()

/** The clip uses this player now (from the cut on): priming leaves it alone. */
export function claimPullInPlayer(video: HTMLVideoElement) {
  inUse.add(video)
}

/** Muted play(), then pause at 0 as soon as it plays: unlocks and loads it on phones. Errors are ignored. */
export function primePullInPlayer(video: HTMLVideoElement) {
  video.muted = true
  video
    .play()
    .then(() => {
      if (inUse.has(video)) return
      video.pause()
      video.currentTime = 0
    })
    .catch(() => {})
}

/** The player made and primed on the Choose tap, waiting for the clip. */
let primed: { url: string; video: HTMLVideoElement } | null = null

/** On the Choose tap (inside it): make this video's player and prime it. */
export function primePullInVideo(url: string) {
  if (primed?.url !== url) primed = { url, video: makePullInPlayer(url) }
  primePullInPlayer(primed.video)
}

/** The clip takes the player primed on the tap for this address (once), or null if there is none. */
export function takePrimedPullInVideo(url: string): HTMLVideoElement | null {
  if (primed?.url !== url) return null
  const { video } = primed
  primed = null
  return video
}
