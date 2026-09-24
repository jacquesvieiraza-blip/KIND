import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, existsSync } from 'fs'
import { join } from 'path'

// ── THE TWO DEMO REELS — FOUNDER-SUPPLIED, 24 SEP 2026 ───────────────────────────────────
//
// "im going to give you 2 demo reels for this section one to replace the Milla and the other to
// replace the Vida" · "the overlay image to this must be this image. the video under it." ·
// "when someone presses play takes them to the video".
//
// Before this, the homepage and the Vida page played the SAME YouTube video under two different
// stills — so the Vida page showed a visitor the Milla walkthrough. Now each page plays its own
// reel, from our own site, under the founder's own picture, in the same inset frame.
//
// What this file pins, because each one is a way the section could quietly break:
//   · each page plays ITS reel, under ITS picture — a swapped pair is a wrong demo, not a bug
//   · the file behind every play button exists, is an MP4, and starts before it has downloaded
//   · the button's link IS the video, so a failed script still takes the visitor to it
//   · nothing on the site loads YouTube any more (the privacy half is in website-no-trackers)

const WEB = join(__dirname, '../../../website')
const read = (f: string) => readFileSync(join(WEB, f), 'utf8')
const bytes = (f: string) => readFileSync(join(WEB, f))

const LIVE = (() => {
  const src = read('server.js')
  const block = src.slice(src.indexOf('const RETIRED = {'), src.indexOf('\n}', src.indexOf('const RETIRED = {')))
  const retired = new Set([...block.matchAll(/'\/([a-z0-9-]+)':/g)].map(m => m[1] + '.html'))
  return readdirSync(WEB).filter(f => f.endsWith('.html') && !retired.has(f))
})()

const REELS: Array<{ page: string; video: string; still: string }> = [
  { page: 'index.html', video: 'mv-milla-reel.mp4', still: 'mv-milla-reel-poster.webp' },
  { page: 'milla.html', video: 'mv-milla-reel.mp4', still: 'mv-milla-reel-poster.webp' },
  { page: 'vida.html', video: 'mv-vida-reel.mp4', still: 'mv-vida-reel-poster.webp' },
]

describe('each page plays its own reel, under its own picture', () => {
  for (const { page, video, still } of REELS) {
    it(`${page} → ${video}, with ${still} on top`, () => {
      const html = read(page)
      const play = html.match(/<a class="mv-play" href="([^"]+)"[^>]*><img[^>]*src="([^"]+)"/)
      expect(play, `${page} has lost its play surface`).toBeTruthy()
      expect(play![1], `${page} plays the wrong video`).toBe(video)
      expect(play![2], `${page} shows the wrong picture over its reel`).toBe(still)
    })
  }

  it('the Milla and Vida pages do not play the same thing any more', () => {
    const href = (p: string) => read(p).match(/<a class="mv-play" href="([^"]+)"/)![1]
    expect(href('index.html')).not.toBe(href('vida.html'))
  })
})

describe('the files behind the play buttons are real, and start fast', () => {
  for (const f of ['mv-milla-reel.mp4', 'mv-vida-reel.mp4']) {
    it(`${f} is an MP4 whose index comes before its data`, () => {
      expect(existsSync(join(WEB, f)), `${f} is missing — the play button leads nowhere`).toBe(true)
      const b = bytes(f)
      expect(b.subarray(4, 8).toString('latin1'), `${f} is not an MP4`).toBe('ftyp')
      // "Fast start": with the index (moov) at the front a browser can begin playing before the
      // whole file arrives. With it at the end, the visitor waits for all of it first.
      const moov = b.indexOf('moov'), mdat = b.indexOf('mdat')
      expect(moov, `${f} has no index`).toBeGreaterThan(0)
      expect(moov, `${f} is not fast-start — re-export with the index at the front`).toBeLessThan(mdat)
      expect(b.length, `${f} is too heavy for a homepage`).toBeLessThan(8 * 1024 * 1024)
    })
  }

  for (const f of ['mv-milla-reel-poster.webp', 'mv-vida-reel-poster.webp']) {
    it(`${f} is a real WebP picture`, () => {
      expect(existsSync(join(WEB, f)), `${f} is missing — the frame would be empty`).toBe(true)
      const b = bytes(f)
      expect(b.subarray(0, 4).toString('latin1')).toBe('RIFF')
      expect(b.subarray(8, 12).toString('latin1')).toBe('WEBP')
    })
  }
})

describe('pressing play puts the reel in the frame — and still works if the script does not', () => {
  for (const page of ['index.html', 'vida.html']) {
    it(`${page} swaps the picture for a <video> built from the button's own link`, () => {
      const html = read(page)
      expect(html).toContain("document.createElement('video')")
      expect(html).toContain("v.src = link.getAttribute('href')")
      expect(html).toContain('v.controls = true')
      expect(html, 'without playsinline an iPhone takes the reel full-screen').toContain("v.setAttribute('playsinline', '')")
      // same 16:9 frame the picture sat in, so the page does not jump when play is pressed
      expect(html).toContain('.mv-videobox iframe,.mv-videobox video{position:absolute;inset:0;width:100%;height:100%')
      expect(html, 'the play surface still builds a YouTube iframe').not.toContain("createElement('iframe')")
    })
  }
})

describe('nothing on the site loads YouTube', () => {
  it('no page a visitor can reach links to or embeds YouTube', () => {
    for (const page of LIVE) {
      expect(read(page), `${page} still loads YouTube`).not.toMatch(/youtu\.?be|youtube-nocookie/i)
    }
  })

  it('the Cookie Policy says the videos are ours, and no longer lists YouTube', () => {
    const cookies = read('cookies.html')
    expect(cookies).not.toContain('YouTube')
    expect(cookies).toContain('Our product videos are served from our own website and set no cookie')
  })
})
