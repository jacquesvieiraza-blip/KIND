import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'

// ── THE WHOLE WEBSITE SELLS A QUALIFIED MEETING — FOUNDER RULING, 23 SEP 2026 ─────────────
//
// The founder replaced "$450 per booked meeting" with "$450 per QUALIFIED meeting" after a risk
// review: charging for a calendar booking leaves M&V absorbing no-shows, wrong decision-makers
// and disputes raised after the sales call has gone badly — events it cannot control. The
// ruling, in his words: "it is always 50/50. pricing is 450." Undelivered qualified meetings
// are "credit[ed] … to be used against their next Programme … the first 50%."
//
// `website-money-claims.test.ts` pins what the CONTRACT says. This file pins that the rest of
// the site says the same thing — because a site that sells one definition on the pricing page
// and contracts another in the Terms is the exact dispute this ruling exists to prevent.
// "Website only, legal included, not the portals" — the founder's scope, so only apps/website.

const WEB = join(__dirname, '../../../website')
const read = (f: string) => readFileSync(join(WEB, f), 'utf8')

/** Visible text only — a class name or a comment is not a claim a visitor reads. */
const visible = (html: string) => html
  .replace(/<!--[\s\S]*?-->/g, ' ')
  .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&rsquo;/g, '’').replace(/&mdash;/g, '—').replace(/&amp;/g, '&')
  .replace(/\s+/g, ' ')

/** Pages a visitor can reach: everything on disk minus what server.js retires. */
const LIVE = (() => {
  const src = read('server.js')
  const block = src.slice(src.indexOf('const RETIRED = {'), src.indexOf('\n}', src.indexOf('const RETIRED = {')))
  const retired = new Set([...block.matchAll(/'\/([a-z0-9-]+)':/g)].map(m => m[1] + '.html'))
  return readdirSync(WEB).filter(f => f.endsWith('.html') && !retired.has(f))
})()

/** The short definition, as confirmed by the founder. Carried verbatim on three pages. */
const DEFINITION =
  'A qualified meeting is a prospect who fits your approved ICP and the role or seniority you set, has shown ' +
  'genuine interest in what you offer, isn’t already your customer or an excluded account, and has agreed to ' +
  'meet you at a confirmed date and time. We can show you that they accepted. A reply on its own is not a qualified meeting.'

describe('one word for the thing being sold, on every page a visitor can reach', () => {
  it('there are live pages to check — otherwise every assertion below is vacuous', () => {
    expect(LIVE.length).toBeGreaterThan(10)
    expect(LIVE).toContain('terms.html')
    expect(LIVE).toContain('pricing.html')
  })

  it('no live page sells a "booked meeting" any more', () => {
    // The VERB survives ("the meeting being booked") — that is the act of booking, and the
    // challenge window is measured from it. The NOUN is what was sold, and it is gone.
    for (const page of LIVE) {
      const text = visible(read(page))
      const hits = text.match(/booked[ -]meetings?/gi) ?? []
      expect(hits, `${page} still sells a "booked meeting"`).toEqual([])
    }
  })

  it('and the search descriptions agree — the first words anyone sees', () => {
    for (const page of LIVE) {
      const meta = read(page).match(/<meta content="([^"]*)" name="description"/)?.[1] ?? ''
      expect(meta, `${page}'s search description still says "booked meeting"`).not.toMatch(/booked[ -]meeting/i)
    }
  })
})

describe('the definition is the same everywhere it is given', () => {
  for (const page of ['pricing.html', 'faqs.html', 'get-started.html']) {
    it(`${page} carries the founder-confirmed definition, word for word`, () => {
      expect(visible(read(page))).toContain(DEFINITION)
    })
  }

  it('no live page keeps the calendar-only definition it replaced', () => {
    for (const page of LIVE) {
      expect(visible(read(page)), `${page} still defines a meeting as any person at a matching company`)
        .not.toContain('by a real person at a company that matches the brief')
    }
  })

  it('the calculator and the form both ask for QUALIFIED meetings', () => {
    expect(read('pricing.html')).toContain('<label for="c-meet">Qualified meetings you want</label>')
    expect(read('get-started.html')).toContain('<label for="gs-volume">Qualified meetings you are targeting</label>')
  })
})

describe('the credit for undelivered meetings is said the same way wherever "not a guarantee" is', () => {
  // A page that says "not a guarantee" and stops there reads as "you lose the money". The founder
  // ruled the opposite. Every page that makes the not-a-guarantee statement must carry the credit.
  const CREDIT = 'If fewer qualified meetings are delivered, the difference is credited against your next programme.'

  it('Pricing says it beside the calculator', () => {
    expect(visible(read('pricing.html'))).toContain(CREDIT)
  })

  it('Trust says it beside "not guarantees of meetings"', () => {
    expect(visible(read('trust.html'))).toContain(CREDIT)
  })

  it('the FAQ answer to "Do you guarantee the meetings?" says it, and names the first payment', () => {
    const t = visible(read('faqs.html'))
    expect(t).toContain('each one not delivered is credited against the first payment of your next programme')
    expect(t, 'attendance was the first thing the risk review said is not guaranteed').toContain('attendance')
  })
})

describe('the FAQs and the Terms state the same rules', () => {
  it('both new questions are on the FAQ page', () => {
    const html = read('faqs.html')
    expect(html).toContain('What if the prospect doesn&rsquo;t turn up?')
    expect(html).toContain('What if I think a meeting wasn&rsquo;t qualified?')
  })

  it('the challenge window in the FAQ is the challenge window in the contract', () => {
    // Derived from the Terms, so changing the number in one place and not the other fails here.
    const days = read('terms.html').match(/within (\d+) business days of the meeting being booked/)?.[1]
    expect(days, 'the Terms no longer state a challenge window').toBeTruthy()
    expect(visible(read('faqs.html'))).toContain(`Tell us within ${days} business days of the meeting being booked`)
  })

  it('the FAQ no-show answer matches the contract: once, free, client no-show counts, no cash', () => {
    const t = visible(read('faqs.html'))
    expect(t).toContain('reschedule once, at no extra charge')
    expect(t).toContain('If you cancel or don’t attend, the meeting counts as delivered')
    expect(t).toContain('We don’t give cash refunds')
  })
})

describe('/milla is the homepage, and cannot drift from it again', () => {
  // It did once: the founder took $450 off the homepage and /milla — the same page at a second
  // address — kept "1 booked meeting = $450" for a week, because it was a copy nobody regenerated.
  it('milla.html is index.html plus its canonical tag, and nothing else', () => {
    const milla = read('milla.html').replace('<link href="/" rel="canonical"/>', '')
    expect(milla === read('index.html'), 'milla.html has drifted from the homepage').toBe(true)
  })
})
