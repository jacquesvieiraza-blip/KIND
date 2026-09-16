import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { nexusTuneGate, autoTuneReady, AUTOTUNE_MIN_MEETINGS, AUTOTUNE_MIN_WORKED } from './nexus-guard'

// #602b — WHAT THE NEXUS PAGE IS ALLOWED TO PROMISE, BOUND TO WHAT THE GATE ACTUALLY PERMITS.
//
// The founder asked for Nexus back on the site on 1 Aug. `nexus.html` was retired on 29 Jul
// (#560) with the reason recorded in `server.js`: *"built, default-OFF and fenced — selling it
// is ahead of the product."* Un-retiring it without reading it would have put that exact
// overclaim back on the live site, which is the #478 failure (a surface that oversells) wearing
// a different hat.
//
// SO WHAT IS ACTUALLY TRUE, verified in code rather than recalled:
//
//   LIVE   the nightly recompute — `cron.ts:307` schedules `/nexus/recompute-all` at 04:00 UTC,
//          which calls `computeNexusProfile(clientId)` for every client. Nexus DOES record.
//   LIVE   the fence — `nexus-guard.assertSameClient` throws `NexusFenceError` unless source and
//          target are the same client. "Never shared with another client" is enforced, not copy.
//   LIVE   surfaced both sides — `/leads/nexus-summary` (the client, in Milla) and
//          `/operator/nexus` (our operators, in Vida).
//   NOT    auto-tuning. `nexusTuneGate` is default-deny per client — its own words are
//          *"auto-tune off for this client (default — founder must enable)"* — and even once
//          enabled it needs a `confident` profile with 3+ booked meetings and 40+ worked leads.
//
// So "it remembers" is true today and "it gets sharper every time you approve" is not: no client
// can currently collect on it. The page now says the first and not the second, and this file
// fails if that flips back — because the failure mode is silent. Nothing errors when a website
// promises tuning that a default-deny gate refuses; a client just never gets what they read.
//
// THE GUARD IS TWO-WAY ON PURPOSE. It pins the copy AND re-derives the gate, so the day
// auto-tune ships default-ON, the assertion about the gate breaks and sends whoever changed it
// to this file — which is where the sentence they now need to rewrite is named.

const WEB = join(__dirname, '../../../website')
const nexus = readFileSync(join(WEB, 'nexus.html'), 'utf8')

// Copy is compared with tags stripped: the claims below get split across <span>/<br> for the
// gradient treatment, so a raw substring search would miss the very sentence it exists to catch.
const prose = nexus.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ')

describe('the gate the page has to tell the truth about', () => {
  it('auto-tune is OFF for a client by default — nobody has to disable it', () => {
    const confident = { confidence: 'confident' as const, sample_worked: 500, sample_meetings: 50 }
    // Enough signal by any measure...
    expect(autoTuneReady(confident).ready).toBe(true)
    // ...and still refused, because the per-client switch has never been thrown.
    const gate = nexusTuneGate(confident, /* clientEnabled */ false, /* globalKill */ false)
    expect(gate.allowed).toBe(false)
    expect(gate.state).toBe('off')
    expect(gate.reason).toMatch(/default/i)
  })

  it('and even an enabled client tunes nothing until there is real signal', () => {
    const thin = { confidence: 'confident' as const, sample_worked: AUTOTUNE_MIN_WORKED - 1, sample_meetings: AUTOTUNE_MIN_MEETINGS }
    expect(nexusTuneGate(thin, true, false).allowed).toBe(false)
    const green = { confidence: 'confident' as const, sample_worked: AUTOTUNE_MIN_WORKED, sample_meetings: AUTOTUNE_MIN_MEETINGS }
    expect(nexusTuneGate(green, true, false).allowed).toBe(true)
  })
})

describe('nexus.html promises memory, not tuning', () => {
  // The exact sentences that were on the page when it was retired. Each one promises the
  // outreach IMPROVES automatically — the half the gate refuses.
  const BANNED = [
    'gets sharper every time you approve',
    'makes your next batch sharper',
    'sharpens your outreach',
    'gets sharper with every yes',
    'keeps compounding',
  ]

  for (const claim of BANNED) {
    it(`does not claim "${claim}"`, () => {
      expect(prose.toLowerCase()).not.toContain(claim.toLowerCase())
    })
  }

  it('still makes the claim that IS true — it remembers, and it is yours alone', () => {
    expect(prose).toMatch(/remembers every lead you approve/i)
    expect(prose).toMatch(/never shared with another client/i)
  })

  it('the meta description a buyer sees in search does not promise tuning either', () => {
    const meta = nexus.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? ''
    expect(meta.length).toBeGreaterThan(0)
    for (const claim of BANNED) expect(meta.toLowerCase()).not.toContain(claim.toLowerCase())
  })
})

describe('the page is reachable again, and honestly linked', () => {
  it('/nexus is NOT in the retired list on either front door', () => {
    expect(readFileSync(join(WEB, 'server.js'), 'utf8')).not.toMatch(/'\/nexus':/)
    expect(readFileSync(join(WEB, '_redirects'), 'utf8')).not.toMatch(/^\/nexus/m)
  })

  // ⛓️ 16 Sep — THIS ASSERTION HAS NOW FLIPPED TWICE AND BOTH FLIPS WERE THE SITE MOVING.
  // #603 required FIGSY unlinked (its page 301d); #604 required it shown (the page came back);
  // now the founder has retired the NAME, not just the page: "remove figsy from the site
  // completely. replace it with either Milla or Vida pending the place." Vida is the engine
  // that sources, writes and books, so Vida is what this page must name. The standard has
  // never changed — the page must name the thing that actually does the work.
  it('the engine it names is Vida, and FIGSY is gone', () => {
    expect(prose).not.toMatch(/FIGSY/i)
    expect(prose).toMatch(/Vida/)
  })
})
