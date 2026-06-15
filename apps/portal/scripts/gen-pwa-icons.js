#!/usr/bin/env node
/**
 * Generate PWA icons (192, 512, maskable-512) from public/logo-k.png.
 * Dependency-free: decodes/encodes PNG using only Node's built-in zlib.
 * Run once: `node scripts/gen-pwa-icons.js`. Output → public/icons/.
 */
const fs = require('fs')
const path = require('path')
const zlib = require('zlib')

const PUBLIC = path.join(__dirname, '..', 'public')
const SRC = path.join(PUBLIC, 'logo-k.png')
const OUT = path.join(PUBLIC, 'icons')

// ── PNG decode (8-bit, non-interlaced; RGB or RGBA) ──────────────────────────
function decodePng(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('not a PNG')
  let pos = 8
  let width = 0, height = 0, colorType = 0, bitDepth = 0
  const idat = []
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos); pos += 4
    const type = buf.toString('ascii', pos, pos + 4); pos += 4
    const data = buf.subarray(pos, pos + len); pos += len; pos += 4 // skip CRC
    if (type === 'IHDR') {
      width = data.readUInt32BE(0); height = data.readUInt32BE(4)
      bitDepth = data[8]; colorType = data[9]
    } else if (type === 'IDAT') {
      idat.push(data)
    } else if (type === 'IEND') break
  }
  if (bitDepth !== 8) throw new Error('only 8-bit supported, got ' + bitDepth)
  const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : null
  if (!channels) throw new Error('only RGB/RGBA supported, colorType ' + colorType)
  const raw = zlib.inflateSync(Buffer.concat(idat))
  // Unfilter into RGBA
  const out = Buffer.alloc(width * height * 4)
  const stride = width * channels
  let prev = Buffer.alloc(stride)
  let rp = 0
  for (let y = 0; y < height; y++) {
    const filter = raw[rp++]
    const line = Buffer.from(raw.subarray(rp, rp + stride)); rp += stride
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? line[x - channels] : 0
      const b = prev[x]
      const c = x >= channels ? prev[x - channels] : 0
      let v = line[x]
      if (filter === 1) v = (v + a) & 0xff
      else if (filter === 2) v = (v + b) & 0xff
      else if (filter === 3) v = (v + ((a + b) >> 1)) & 0xff
      else if (filter === 4) {
        const p = a + b - c
        const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c)
        const pr = pa <= pb && pa <= pc ? a : pb <= pc ? b : c
        v = (v + pr) & 0xff
      }
      line[x] = v
    }
    for (let x = 0; x < width; x++) {
      const si = x * channels, di = (y * width + x) * 4
      out[di] = line[si]; out[di + 1] = line[si + 1]; out[di + 2] = line[si + 2]
      out[di + 3] = channels === 4 ? line[si + 3] : 255
    }
    prev = line
  }
  return { width, height, data: out }
}

// ── Box-filter downscale (RGBA → RGBA) ───────────────────────────────────────
function resize(img, size) {
  const { width: sw, height: sh, data: src } = img
  const dst = Buffer.alloc(size * size * 4)
  for (let dy = 0; dy < size; dy++) {
    const sy0 = Math.floor(dy * sh / size), sy1 = Math.max(sy0 + 1, Math.floor((dy + 1) * sh / size))
    for (let dx = 0; dx < size; dx++) {
      const sx0 = Math.floor(dx * sw / size), sx1 = Math.max(sx0 + 1, Math.floor((dx + 1) * sw / size))
      let r = 0, g = 0, b = 0, a = 0, n = 0
      for (let sy = sy0; sy < sy1; sy++) for (let sx = sx0; sx < sx1; sx++) {
        const i = (sy * sw + sx) * 4
        r += src[i]; g += src[i + 1]; b += src[i + 2]; a += src[i + 3]; n++
      }
      const di = (dy * size + dx) * 4
      dst[di] = (r / n) | 0; dst[di + 1] = (g / n) | 0; dst[di + 2] = (b / n) | 0; dst[di + 3] = (a / n) | 0
    }
  }
  return { width: size, height: size, data: dst }
}

// ── Composite onto a solid background with padding (for maskable safe-zone) ──
function padOnBackground(img, size, padRatio, bg) {
  const dst = Buffer.alloc(size * size * 4)
  for (let i = 0; i < size * size; i++) {
    dst[i * 4] = bg[0]; dst[i * 4 + 1] = bg[1]; dst[i * 4 + 2] = bg[2]; dst[i * 4 + 3] = 255
  }
  const inner = Math.round(size * (1 - padRatio * 2))
  const scaled = resize(img, inner)
  const off = Math.round(size * padRatio)
  for (let y = 0; y < inner; y++) for (let x = 0; x < inner; x++) {
    const si = (y * inner + x) * 4
    const dx = off + x, dy = off + y
    const di = (dy * size + dx) * 4
    const alpha = scaled.data[si + 3] / 255
    dst[di] = Math.round(scaled.data[si] * alpha + bg[0] * (1 - alpha))
    dst[di + 1] = Math.round(scaled.data[si + 1] * alpha + bg[1] * (1 - alpha))
    dst[di + 2] = Math.round(scaled.data[si + 2] * alpha + bg[2] * (1 - alpha))
    dst[di + 3] = 255
  }
  return { width: size, height: size, data: dst }
}

// ── PNG encode (RGBA, filter 0) ──────────────────────────────────────────────
const CRC_TABLE = (() => {
  const t = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c
  }
  return t
})()
function crc32(buf) {
  let c = ~0
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return ~c >>> 0
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0)
  const typeBuf = Buffer.from(type, 'ascii')
  const crcBuf = Buffer.alloc(4); crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0)
  return Buffer.concat([len, typeBuf, data, crcBuf])
}
function encodePng(img) {
  const { width, height, data } = img
  const stride = width * 4
  const raw = Buffer.alloc((stride + 1) * height)
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0
    data.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

// ── Run ──────────────────────────────────────────────────────────────────────
fs.mkdirSync(OUT, { recursive: true })
const img = decodePng(fs.readFileSync(SRC))
console.log(`source ${img.width}x${img.height}`)

fs.writeFileSync(path.join(OUT, 'icon-192.png'), encodePng(resize(img, 192)))
fs.writeFileSync(path.join(OUT, 'icon-512.png'), encodePng(resize(img, 512)))
// Maskable: logo centred at 70% on the brand background (#FFF5EE), 15% padding.
fs.writeFileSync(path.join(OUT, 'icon-maskable-512.png'), encodePng(padOnBackground(img, 512, 0.15, [0xff, 0xf5, 0xee])))
console.log('wrote icon-192.png, icon-512.png, icon-maskable-512.png →', OUT)
