/** Titles skipped for the letter circle: "Ms. Santos" -> "S". */
const TITLES = new Set(['mr', 'ms', 'mrs', 'miss', 'dr', 'sir', "ma'am", 'maam', 'madam', 'teacher'])

/** The first letter of a Teacher's name, without a title like Mr./Ms./Dr./Sir/Ma'am. */
export function nameInitial(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  const isTitle = (word: string) => TITLES.has(word.toLowerCase().replace(/’/g, "'").replace(/\.$/, ''))
  const first = words.find((word) => !isTitle(word)) ?? words[0] ?? ''
  const letter = Array.from(first).find((ch) => /\p{L}|\p{N}/u.test(ch)) ?? first.charAt(0)
  return (letter ?? '').toLocaleUpperCase()
}
