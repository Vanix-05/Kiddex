// Dev tool: split Ollie (assets/characters/ollie-cutout.png) into a body layer
// and a feather-wing layer, so the "Welcome, Student!" popup can wave the wing.
//
// Run: node scripts/split-ollie-wing.mjs
// Writes (both 428x600, stacked they match ollie-cutout.png):
//   src/assets/characters/ollie-wing.png   the wing + feather (+2px soft edge)
//   src/assets/characters/ollie-body.png   everything else, with the area
//                                          behind the wing filled in:
//     - head/scarf (above y=360): copied from Ollie's mirrored right side
//     - body side (below): cream belly with a brown outline along a hand-placed curve
// The wing pivots at the shoulder, (145, 375) in the art.
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { inflateSync, deflateSync } from 'node:zlib'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const ART = resolve(root, 'src/assets/characters')

// ---- PNG read/write (8-bit, non-interlaced) ----
function readPng(path) {
  const buf = readFileSync(path)
  let pos = 8
  let w, h, ct, idat = []
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos)
    const type = buf.toString('ascii', pos + 4, pos + 8)
    const data = buf.subarray(pos + 8, pos + 8 + len)
    if (type === 'IHDR') {
      w = data.readUInt32BE(0); h = data.readUInt32BE(4)
      if (data[8] !== 8 || data[12] !== 0) throw new Error('unsupported depth/interlace')
      ct = data[9]
    } else if (type === 'IDAT') idat.push(data)
    pos += 12 + len
  }
  const ch = ct === 6 ? 4 : ct === 2 ? 3 : ct === 4 ? 2 : ct === 0 ? 1 : 0
  if (!ch) throw new Error('color type ' + ct)
  const raw = inflateSync(Buffer.concat(idat))
  const stride = w * ch
  const out = Buffer.alloc(w * h * ch)
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)]
    const src = y * (stride + 1) + 1
    for (let x = 0; x < stride; x++) {
      const a = x >= ch ? out[y * stride + x - ch] : 0
      const b = y > 0 ? out[(y - 1) * stride + x] : 0
      const c = x >= ch && y > 0 ? out[(y - 1) * stride + x - ch] : 0
      let v = raw[src + x]
      if (f === 1) v += a
      else if (f === 2) v += b
      else if (f === 3) v += (a + b) >> 1
      else if (f === 4) {
        const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c)
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c
      }
      out[y * stride + x] = v & 255
    }
  }
  // to RGBA
  const rgba = Buffer.alloc(w * h * 4)
  for (let i = 0; i < w * h; i++) {
    if (ch === 4) out.copy(rgba, i * 4, i * 4, i * 4 + 4)
    else if (ch === 3) { rgba[i*4]=out[i*3]; rgba[i*4+1]=out[i*3+1]; rgba[i*4+2]=out[i*3+2]; rgba[i*4+3]=255 }
    else if (ch === 2) { rgba[i*4]=rgba[i*4+1]=rgba[i*4+2]=out[i*2]; rgba[i*4+3]=out[i*2+1] }
    else { rgba[i*4]=rgba[i*4+1]=rgba[i*4+2]=out[i]; rgba[i*4+3]=255 }
  }
  return { w, h, data: rgba }
}
const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
function crc(buf) {
  let c = 0xffffffff
  for (const b of buf) c = crcTable[(c ^ b) & 255] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const c = Buffer.alloc(4); c.writeUInt32BE(crc(td))
  return Buffer.concat([len, td, c])
}
function writePng(path, { w, h, data }) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4)
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0
  const raw = Buffer.alloc((w * 4 + 1) * h)
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0
    data.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4)
  }
  writeFileSync(path, Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0)),
  ]))
}

// ---- Cut out the wing ----
const img = readPng(resolve(ART, 'ollie-cutout.png'))
const { w, h, data } = img
const idx = (x, y) => y * w + x
const alpha = (x, y) => data[idx(x, y) * 4 + 3]
const lum = (i) => 0.3 * data[i*4] + 0.59 * data[i*4+1] + 0.11 * data[i*4+2]
const dark = new Uint8Array(w * h)
for (let i = 0; i < w * h; i++) dark[i] = data[i*4+3] > 100 && lum(i) < 120 ? 1 : 0

function inPoly(poly, x, y) {
  let c = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j]
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c
  }
  return c
}
const POLY = [[0,190],[24,197],[48,209],[70,231],[95,261],[118,299],[132,334],[150,351],[166,371],[172,394],[185,420],[185,455],[170,460],[160,480],[150,515],[135,545],[110,560],[80,555],[50,525],[30,470],[28,410],[35,370],[10,300],[0,250]]
const QUILL = [[150,395],[190,400],[190,460],[160,460]]
const poly = new Uint8Array(w * h), quill = new Uint8Array(w*h)
for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { if (inPoly(POLY, x, y)) poly[idx(x,y)] = 1; if (inPoly(QUILL, x, y)) quill[idx(x,y)] = 1 }

// keep regions: flood over light pixels from seeds
const keep = new Uint8Array(w * h)
const SEEDS = [[150,280],[200,450],[130,520],[150,330],[100,240]] // face, belly, scarf: never part of the wing
for (const [sx, sy] of SEEDS) {
  const st = [idx(sx, sy)]
  if (dark[st[0]]) { console.log('seed dark', sx, sy); continue }
  while (st.length) {
    const i = st.pop()
    if (keep[i] || dark[i] || data[i*4+3] < 100) continue
    keep[i] = 1
    const x = i % w, y = (i / w) | 0
    if (x > 0) st.push(i - 1); if (x < w - 1) st.push(i + 1); if (y > 0) st.push(i - w); if (y < h - 1) st.push(i + w)
  }
}
// wing interior: light, in polygon, not keep
const interior = new Uint8Array(w * h)
for (let i = 0; i < w * h; i++) interior[i] = poly[i] && !dark[i] && !keep[i] && data[i*4+3] > 0 ? 1 : 0
// dilate 7
const R = 7
const wing = new Uint8Array(w * h)
for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
  const i = idx(x, y)
  if (!poly[i] || keep[i] || data[i*4+3] === 0) continue
  if (quill[i]) { wing[i] = 1; continue }
  let hit = false
  for (let dy = -R; dy <= R && !hit; dy++) for (let dx = -R; dx <= R; dx++) {
    const xx = x + dx, yy = y + dy
    if (xx < 0 || yy < 0 || xx >= w || yy >= h || dx*dx+dy*dy > R*R) continue
    if (interior[idx(xx, yy)]) { hit = true; break }
  }
  if (hit) wing[i] = 1
}

// ---- Fill in the body behind the wing ----
const AX = 453 // mirror: x' = AX - x
const MIRROR_TO = 360
const EDGE = [[350,80],[360,82],[390,96],[430,102],[470,104],[500,110],[520,118],[530,130],[540,139],[550,149],[565,165]]
const edgeAt = (y) => { for (let k = 1; k < EDGE.length; k++) { const [y0,x0]=EDGE[k-1],[y1,x1]=EDGE[k]; if (y<=y1) return x0+(x1-x0)*(y-y0)/(y1-y0) } return 999 }
const px = (x,y) => [...data.subarray(idx(x,y)*4, idx(x,y)*4+4)]
const OUTLINE = px(144,540), CREAM = px(190,470), TAN = px(150,520)
const FACE = px(130, 285)

// Refill a 2px band around the cut too, so the wing's soft edge doesn't stay behind.
const hole = new Uint8Array(w*h)
for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { if (!wing[idx(x,y)]) continue
  for (let dy=-2;dy<=2;dy++) for (let dx=-2;dx<=2;dx++) { const xx=x+dx, yy=y+dy; if (xx>=0&&yy>=0&&xx<w&&yy<h) hole[idx(xx,yy)]=1 } }
const body = { w, h, data: Buffer.from(data) }, wl = { w, h, data: Buffer.alloc(w*h*4) }
for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
  const i = idx(x, y)
  if (!hole[i]) continue
  data.copy(wl.data, i*4, i*4, i*4+4)
  let c
  if (y < MIRROR_TO) {
    const mx = AX - x
    c = mx >= 0 && mx < w && !wing[idx(mx,y)] ? px(mx, y) : [0,0,0,0]
    // The lenses aren't perfectly symmetric: don't copy the right lens rim next to the left one.
    if (x >= 62 && x <= 100 && y >= 225 && y <= 272 && c[3] > 0 && 0.3*c[0]+0.59*c[1]+0.11*c[2] < 200) c = FACE
  } else {
    const d = x - edgeAt(y) // distance inside the body edge
    if (d < -0.5) c = [0,0,0,0]
    else if (d < 5) c = [...OUTLINE.slice(0,3), d < 0.5 ? 128 : 255]
    else { const t = Math.min(1, (d - 5) / 14); c = [0,1,2].map(k => Math.round(TAN[k]*(1-t)+CREAM[k]*t)).concat(255) }
  }
  body.data.set(c, i*4)
}
writePng(resolve(ART, 'ollie-body.png'), body)
writePng(resolve(ART, 'ollie-wing.png'), wl)
console.log('Wrote ollie-body.png and ollie-wing.png')
