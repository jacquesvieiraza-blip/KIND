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

/**
 * THE SEVEN CONDITIONS, READ OUT OF THE CONTRACT.
 *
 * ⛓️ 23 Sep, second pass — the founder: "you need to give what the outcome is. i made mention on
 * the paste". A one-sentence summary on the marketing pages was a SECOND definition, and a second
 * definition is exactly how a site and its contract come to disagree. So there is one list — his
 * seven, in the Terms — and every page that defines a qualified meeting must carry the same seven,
 * word for word. They are read from terms.html, never retyped here, so changing a condition in the
 * contract and not on the site fails this file.
 */
const SEVEN = (() => {
  const terms = read('terms.html')
  const at = terms.indexOf('A <strong>qualified meeting</strong> is a meeting that meets all seven')
  const ol = terms.slice(terms.indexOf('<ol>', at), terms.indexOf('</ol>', at))
  return [...ol.matchAll(/<li>([\s\S]*?)<\/li>/g)].map(m => m[1])
})()

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
  it('the contract holds exactly seven conditions — otherwise everything below is vacuous', () => {
    expect(SEVEN).toHaveLength(7)
  })

  for (const page of ['pricing.html', 'faqs.html', 'get-started.html']) {
    it(`${page} carries all seven conditions, word for word as the Terms state them`, () => {
      const html = read(page)
      for (const c of SEVEN) expect(html, `${page} is missing or has reworded: "${c}"`).toContain(c)
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

  // ⛓️ 25 Sep (R166 ③ ⑤ · P13) — "the FIRST payment" no longer exists for a new programme: it is
  // paid in one payment. Founder: *"one payment in. run bang"* and *"Once only, 90 days, new
  // programmes"*. The FAQ now names THE payment, and says once per client / 90 days.
  it('the FAQ answer to "Do you guarantee the meetings?" says it, names the payment, once and 90 days', () => {
    const t = visible(read('faqs.html'))
    expect(t).toContain('each one not delivered is credited against the payment for your next programme')
    expect(t).toContain('That credit is given once per client and expires after 90 days')
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

// ── THE OUTCOME IS NAMED, NEVER LEFT OPEN ─────────────────────────────────────────────────
//
// The founder's risk review, in one line: "the definition of the outcome is too open to dispute."
// The site said "Outcome-priced", "Choose the outcome", "You tell us the outcome" and never once
// said what the outcome WAS. Worse, "outcome-priced" reads as "you pay when it happens" — and the
// programme is paid 50/50 up front. So every "outcome" that meant the thing they buy became
// "qualified meetings" or "meeting target", and the word survives in exactly two senses:
//   · DEFINING the outcome as a Qualified Meeting (the Pricing section, the homepage link)
//   · the SALES result we do not guarantee — his own words ("the outcome it controls")
describe('the outcome is a Qualified Meeting, and the site says so', () => {
  const ALLOWED = [
    'sales outcome', 'revenue outcome', 'the outcome we control',          // what we do not guarantee
    'The outcome you pay for', 'The outcome is a Qualified Meeting', 'THE OUTCOME', // what it IS
  ]

  it('no live page uses "outcome" for the thing being sold, undefined', () => {
    for (const page of LIVE) {
      const html = read(page)
      let text = visible(html) + ' ' + (html.match(/<meta content="([^"]*)" name="description"/)?.[1] ?? '')
      for (const a of ALLOWED) text = text.split(a).join('')
      const stray = text.match(/.{0,40}outcome.{0,30}/gi) ?? []
      expect(stray, `${page} says "outcome" without saying what it is`).toEqual([])
    }
  })

  it('Pricing leads with the price per qualified meeting, not "Outcome-priced"', () => {
    const html = read('pricing.html')
    expect(html).toContain('<h1 class="motion-headline">Priced per qualified meeting.</h1>')
    expect(html, '"outcome-priced" reads as pay-on-result — the programme is 50/50 up front').not.toMatch(/outcome-priced/i)
  })

  it('Pricing names the outcome directly under the headline, with all seven conditions', () => {
    const html = read('pricing.html')
    const at = html.indexOf('id="qualified-meeting"')
    expect(at, 'the "what the outcome is" section is gone').toBeGreaterThan(-1)
    // Under the headline means BEFORE the buy cards and the calculator, not somewhere below them.
    expect(at, 'the definition has slipped below the buy cards').toBeLessThan(html.indexOf('class="pricing-top"'))
    const section = html.slice(at, html.indexOf('class="pricing-top"'))
    expect(section).toContain('The outcome you pay for: a Qualified Meeting.')
    expect(section).toContain('only when all seven of these are met and it is booked')
    for (const c of SEVEN) expect(section, `the Pricing section lost: "${c}"`).toContain(c)
    expect(section, 'what is NOT guaranteed is part of defining the outcome').toContain('That the prospect will attend')
    expect(section).toContain('the performance of your salespeople')
  })

  it('the challenge window on Pricing is the one in the contract', () => {
    const days = read('terms.html').match(/within (\d+) business days of the meeting being booked/)?.[1]
    expect(visible(read('pricing.html'))).toContain(`raised within ${days} business days of it being booked`)
  })

  it('the homepage points at that definition, and the link lands on it', () => {
    const home = read('index.html')
    expect(home).toContain('<a href="pricing.html#qualified-meeting">The outcome is a Qualified Meeting.')
    expect(read('pricing.html'), 'the homepage link points at an anchor that does not exist').toContain('id="qualified-meeting"')
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
