/** The kid's own character, picked on /setup/gender. */
export type Avatar = 'boy' | 'girl'

export const isAvatar = (value: unknown): value is Avatar => value === 'boy' || value === 'girl'
