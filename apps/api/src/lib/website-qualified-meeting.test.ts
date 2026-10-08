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
//
// ⛓️ 8 Oct (precision model, founder GO) — THE THING SOLD IS NOW A *HELD* MEETING. £500 is charged only
// for a meeting that took place and meets all seven conditions; a meeting that does not happen is not
// charged, so the shortfall credit is gone from the site. The DUTY of this file is unchanged: one
// definition, read from the Terms, carried word for word everywhere the site defines what is charged.

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
  // ⛓️ 8 Oct — the marker is the HELD-meeting definition. If it is ever missing, return nothing so
  // the length check below goes red, instead of reading whichever <ol> happens to come first.
  const at = terms.indexOf('A <strong>held meeting</strong> is a meeting that meets all seven')
  if (at < 0) return []
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

  // ⛓️ 8 Oct (precision model) — WAS "both ask for QUALIFIED meetings". Nobody chooses a number of
  // meetings any more, so neither asks for one: the calculator asks what a customer is worth and the
  // form asks what a typical deal is worth.
  it('the calculator and the form ask what a deal is worth, never how many meetings', () => {
    expect(read('pricing.html')).toContain('<label for="c-deal">Your average deal size</label>')
    expect(read('get-started.html')).toContain('<label for="gs-volume">What is a typical deal worth to you?</label>')
    for (const f of ['pricing.html', 'get-started.html']) {
      expect(read(f), `${f} asks for a number of meetings again`).not.toMatch(/Qualified meetings you (want|are targeting)/)
    }
  })
})

// ⛓️ 8 Oct (precision model) — WAS "the credit for undelivered meetings is said the same way wherever
// 'not a guarantee' is". A page that says "not a guarantee" and stops there still reads as "you lose
// the money", so the duty stays: wherever the site says meetings are not guaranteed, it must also say
// what happens to your money. That is no longer a credit; it is that a meeting that does not happen
// is not charged. And the old credit must not come back anywhere a visitor can read.
describe('wherever meetings are "not guaranteed", the site says you do not pay for one that does not happen', () => {
  const NO_CHARGE = /If a meeting doesn’t happen, you don’t pay for it/

  it('Pricing says it on the price card, and names what is not guaranteed', () => {
    const t = visible(read('pricing.html'))
    expect(t).toMatch(NO_CHARGE)
    expect(t).toContain('Not guaranteed')
  })

  it('the FAQ answer to "Do you guarantee the meetings?" says no, and names attendance', () => {
    const t = visible(read('faqs.html'))
    expect(t).toContain('Do you guarantee the meetings? No.')
    expect(t, 'attendance was the first thing the risk review said is not guaranteed').toContain('attendance')
    expect(t).toMatch(NO_CHARGE)
  })

  it('no page a visitor can reach still promises the retired shortfall credit', () => {
    for (const page of LIVE) {
      const t = visible(read(page))
      expect(t, `${page} still promises the credit`).not.toMatch(/credited (against|toward) (the payment for )?your next programme/)
      expect(t, `${page} still states the credit's limits`).not.toMatch(/once per client[^.]*90 days/)
    }
  })
})

describe('the FAQs and the Terms state the same rules', () => {
  it('both questions are on the FAQ page', () => {
    const html = read('faqs.html')
    expect(html).toContain('What if the prospect doesn&rsquo;t turn up?')
    // ⛓️ 8 Oct — WAS "wasn't qualified"; a held meeting is challenged on whether it should count.
    expect(html).toContain('What if I think a meeting shouldn&rsquo;t count?')
  })

  // ⛓️ 8 Oct (precision model) — the window now runs from the meeting TAKING PLACE, because only a
  // held meeting is charged. Still derived from the Terms, so the two cannot drift.
  it('the challenge window in the FAQ is the challenge window in the contract', () => {
    const days = read('terms.html').match(/within (\d+) business days of the meeting taking place/)?.[1]
    expect(days, 'the Terms no longer state a challenge window').toBeTruthy()
    expect(visible(read('faqs.html'))).toContain(`Tell us within ${days} business days of the meeting taking place`)
  })

  // ⛓️ 8 Oct (precision model; founder chose "24 hours") — WAS "client no-show counts … no cash".
  // A client's own cancellation or no-show is charged unless they gave the notice in the Terms, and
  // the FAQ and the Terms must give the same number of hours.
  it('the FAQ no-show answer matches the contract: once, free for a prospect no-show, the same notice', () => {
    const t = visible(read('faqs.html'))
    expect(t).toContain('reschedule once, at no extra charge')
    const hours = read('terms.html').match(/unless you give us at least (\d+) hours&rsquo; notice/)?.[1]
    expect(hours, 'the Terms no longer state the notice').toBeTruthy()
    expect(t).toContain(`If you cancel or don’t attend, the meeting is charged as a held meeting unless you give us at least ${hours} hours’ notice`)
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
// ⛓️ 8 Oct (precision model) — the outcome is now a HELD meeting; the DUTY (name it, never leave it
// open) is unchanged.
describe('the outcome is a held meeting, and the site says so', () => {
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

  it('Pricing leads with paying for meetings that happen, not "Outcome-priced"', () => {
    const html = read('pricing.html')
    expect(html).toContain('<h1 class="motion-headline">Pay for meetings that happen.</h1>')
    expect(html, '"outcome-priced" names no outcome').not.toMatch(/outcome-priced/i)
  })

  it('Pricing names the outcome directly under the headline, with all seven conditions', () => {
    const html = read('pricing.html')
    const at = html.indexOf('id="qualified-meeting"')
    expect(at, 'the "what the outcome is" section is gone').toBeGreaterThan(-1)
    // Under the headline means BEFORE the buy cards and the calculator, not somewhere below them.
    expect(at, 'the definition has slipped below the buy cards').toBeLessThan(html.indexOf('class="pricing-top"'))
    const section = html.slice(at, html.indexOf('class="pricing-top"'))
    expect(section).toContain('The outcome you pay for: a held meeting.')
    expect(section).toContain('only when all seven of these are true')
    for (const c of SEVEN) expect(section, `the Pricing section lost: "${c}"`).toContain(c)
    expect(section, 'what is NOT guaranteed is part of defining the outcome').toContain('That the prospect will attend')
    expect(section).toContain('the performance of your salespeople')
  })

  it('the challenge window on Pricing is the one in the contract', () => {
    const days = read('terms.html').match(/within (\d+) business days of the meeting taking place/)?.[1]
    expect(days, 'the Terms no longer state a challenge window').toBeTruthy()
    expect(visible(read('pricing.html'))).toContain(`tell us within ${days} business days of it taking place`)
  })

  it('the homepage points at that definition, and the link lands on it', () => {
    const home = read('index.html')
    // ⛓️ 8 Oct — the anchor keeps its id; the link now says what you pay for.
    expect(home).toContain('<a href="pricing.html#qualified-meeting">You only pay for meetings that happen. See exactly what counts')
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
