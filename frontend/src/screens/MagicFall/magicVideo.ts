/**
 * The magic transition video (src/assets/videos/magic/magic-transition.mp4),
 * or null if the file isn't in the repo. Found with import.meta.glob, so the
 * build works without it.
 */
const found = import.meta.glob<string>('../../assets/videos/magic/magic-transition.mp4', {
  eager: true,
  query: '?url',
  import: 'default',
})

export const magicVideo: string | null = Object.values(found)[0] ?? null
