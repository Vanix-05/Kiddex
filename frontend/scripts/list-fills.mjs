// Dev tool: list every fill colour in a traced companion, per part, with how
// many shapes use it. Used to pick the recolour keys (skin, hair, shirt) in
// GirlRig.tsx / BoyRig.tsx.
//
// Run: node scripts/list-fills.mjs <id>     e.g. node scripts/list-fills.mjs girl
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const id = process.argv[2]
if (!id) {
  console.error('Usage: node scripts/list-fills.mjs <companion id>')
  process.exit(1)
}
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const file = resolve(root, `src/companions/${id}/${id}Parts.generated.ts`)
const text = readFileSync(file, 'utf8')
const json = text.slice(text.indexOf('= {') + 2).trim().replace(/;?\s*$/, '')
const parts = JSON.parse(json)

const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
const total = new Map()
for (const [part, shapes] of Object.entries(parts)) {
  if (!shapes.length) continue
  const counts = new Map()
  for (const [, fill, group] of shapes) {
    const key = `${fill.toUpperCase()} ${group}`
    counts.set(key, (counts.get(key) ?? 0) + 1)
    total.set(fill.toUpperCase(), (total.get(fill.toUpperCase()) ?? 0) + 1)
  }
  console.log(`\n${part} (${shapes.length} shapes)`)
  for (const [key, n] of [...counts].sort((a, b) => b[1] - a[1])) {
    const [fill, group] = key.split(' ')
    console.log(`  ${fill}  rgb(${rgb(fill).join(',').padEnd(11)})  ${String(n).padStart(4)}  ${group}`)
  }
}
console.log(`\nall parts: ${total.size} colours`)
for (const [fill, n] of [...total].sort((a, b) => b[1] - a[1]).slice(0, 40)) {
  console.log(`  ${fill}  rgb(${rgb(fill).join(',').padEnd(11)})  ${String(n).padStart(4)}`)
}
