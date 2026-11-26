import type { Avatar } from '../../setup/avatar'
import type { AccessoryId } from '../../setup/customizeData'
import type { KidLook } from '../../companions/wardrobe/items'

/**
 * The cache key of a kid's Lobby picture: everything that changes how it looks
 * (the kid, every style id and color, eye style and color, extras, mood).
 */
export function kidPictureKey(kid: Avatar, look: KidLook, extras: readonly AccessoryId[], mood: string): string {
  const fields = (Object.keys(look) as (keyof KidLook)[]).sort().map((k) => [k, look[k] ?? null])
  return JSON.stringify(['kid', kid, fields, extras, mood])
}
