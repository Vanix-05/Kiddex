import { describe, expect, it } from 'vitest'

// Every source file, as text (Vite reads them; no Node file reading needed).
const sources = import.meta.glob(['/src/**/*.{ts,tsx}', '!/src/**/*.test.{ts,tsx}'], {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

/** Dev-only places that may use the sample cards. */
const DEV_ONLY = [/^\/src\/games\/dev\//, /^\/src\/screens\/Dev[A-Za-z]+\//]

describe('sampleCards.ts is for the dev pages only', () => {
  it('found the source files', () => {
    expect(Object.keys(sources).length).toBeGreaterThan(50)
  })

  it('nothing outside src/games/dev/ and the dev screens imports it', () => {
    const importers = Object.entries(sources)
      .filter(([, text]) => /from\s+['"][^'"]*sampleCards['"]/.test(text) || /import\(\s*['"][^'"]*sampleCards['"]/.test(text))
      .map(([file]) => file)
    expect(importers.filter((file) => !DEV_ONLY.some((dev) => dev.test(file)))).toEqual([])
  })

  it('the old mock question file is gone', () => {
    expect(Object.keys(sources).some((file) => file.endsWith('/mock/questionCards.ts'))).toBe(false)
  })
})
