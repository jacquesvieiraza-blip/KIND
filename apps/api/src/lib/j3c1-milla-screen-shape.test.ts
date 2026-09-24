// ══════════════════════════════════════════════════════════════════════════════════════════
// J3-C1 · THE SAME SHAPE ON EVERY MILLA SCREEN — SIX STAGES, AND NO RETIRED PRICE
//
// REQ: *"Six-stage bar, M&V naming, no retired price — on every Milla screen"*
// (PV 01-06; R124; R127).
//
// ── WHAT THIS ITEM IS, STATED HONESTLY ──────────────────────────────────────────────────
//
// Both halves have already been BUILT: the retired pack copy came off these screens on 30 Aug
// (BUILD-004A-1) and the hand-written ribbon was replaced by the canonical six on 16 Sep (B1,
// under R127). What did not exist is anything that keeps them off, and this repo has a
// specific history of exactly that: `MILLA_STAGES` (seven) and `LIFECYCLE_STAGES` (eight) and
// a hand-written strip inside Vida all rendered "the stage" at once, and one client read
// `Proof` on Milla and `recommendation` on Vida until somebody noticed.
//
// 🛑 SO THIS FILE IS THE THING THAT MAKES "ON EVERY MILLA SCREEN" CHECKABLE. It walks the
// `(milla)` route group — every screen, not a list somebody has to remember to extend — and
// asserts the three properties on all of them.
//
// ── R124 AND R127, WHICH ARE WHAT IS ACTUALLY BEING ENFORCED ────────────────────────────
//
// R124 (16 Sep): *"299/4 is gone. out. we are on the programme. all clients."*
// R127 (16 Sep): *"Brief / Proof / Programme / Approval / Results / Complete"* · *"No seventh
// `signup` product stage"* · ONE canonical projection in shared code, consumed rather than
// duplicated.
//
// ⚠️ WHAT THIS FILE DELIBERATELY DOES NOT DO: rewrite client-facing sentences. There is no
// founder lock in PRODUCT-RULES governing what the product calls US in its own copy — R22 is
// about the WEBSITE masthead and says so in its own evidence column ("the site masthead
// itself (P12-frozen) — the logo IS the ruling"). Twenty-three client-facing sentences across
// these screens say "K.I.N.D", several of them recorded elsewhere as founder-approved wording;
// rewriting them on my reading of a website rule would be a lock paraphrased from memory,
// which is the failure the Citation Law exists for. Reported in the evidence package, not
// changed here.
// ══════════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { MVP1_MILLA_STAGES } from '@kind/shared'

const MILLA_ROOT = join(__dirname, '../../../portal/src/app/(milla)')

/** Every `.tsx` under the `(milla)` route group — walked, never listed. */
function screens(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) screens(p, out)
    else if (name.endsWith('.tsx')) out.push(p)
  }
  return out
}

/** Source with comments stripped — this repo QUOTES what it struck, so a naive scan lies. */
const codeOf = (p: string): string =>
  readFileSync(p, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .split('\n')
    .map(l => { const i = l.search(/(?<!:)\/\//); return i === -1 ? l : l.slice(0, i) })
    .join('\n')

const ALL = screens(MILLA_ROOT)
const rel = (p: string) => p.slice(p.indexOf('(milla)'))

describe('J3-C1 · the guard is reading real screens', () => {
  it('the route group is found and is not a handful of files', () => {
    // A moved directory leaves every assertion below scanning nothing and passing.
    expect(ALL.length, 'the (milla) route group moved — this guard must be repointed')
      .toBeGreaterThan(15)
    expect(ALL.some(p => p.endsWith('milla/page.tsx'))).toBe(true)
    expect(ALL.some(p => p.endsWith('welcome/page.tsx'))).toBe(true)
  })
})

// ═════════════════════════════════════════════════════════════════════════════════════════
// ① R124 — NO RETIRED PRICE, ANYWHERE A CLIENT CAN READ IT
// ═════════════════════════════════════════════════════════════════════════════════════════
describe('J3-C1 · the retired economics are off every Milla screen', () => {
  // The $299 onboarding pack, the $4-per-lead approval and the "first 100 included" quota.
  // Each is a MONEY SENTENCE a client could read, and R124 retired all three for all clients.
  const RETIRED: [string, RegExp][] = [
    ['the $299 pack', /\$\s*299|299\s*(?:usd|dollars)/i],
    ['the $4 per-lead price', /\$\s*4\b(?!\d)/],
    ['the 100-lead quota', /\b100\s+(?:included\s+)?leads\b|included\s+leads/i],
    ['a per-lead price line', /per[\s-]lead\s+(?:price|charge|cost)|\bper lead\b\s*[.,)]?\s*\$/i],
  ]

  for (const [what, pattern] of RETIRED) {
    it(`🛑 ${what} appears on no Milla screen`, () => {
      const offenders = ALL.filter(p => pattern.test(codeOf(p))).map(rel)
      expect(offenders, `${what} is back in front of a client`).toEqual([])
    })
  }

  it('🛑 and the retired money CONSTANTS are not imported by any of them', () => {
    // `PACK_PRICE_USD` and the per-lead constant are the legacy economics in one symbol.
    // Money sentences are interpolated from `@kind/shared`, so an import is how one returns.
    const offenders = ALL
      .filter(p => /PACK_PRICE_USD|PACK_LEADS|PER_LEAD_USD/.test(codeOf(p)))
      .map(rel)
    expect(offenders, 'a Milla screen imports the retired pack economics').toEqual([])
  })
})

// ═════════════════════════════════════════════════════════════════════════════════════════
// ② R127 — ONE CANONICAL SIX, CONSUMED AND NEVER DUPLICATED
// ═════════════════════════════════════════════════════════════════════════════════════════
describe('J3-C1 · the stage bar is the canonical six, on every screen that draws one', () => {
  it('the six are the founder\'s six, in his order', () => {
    expect([...MVP1_MILLA_STAGES]).toEqual([
      'Brief', 'Proof', 'Programme', 'Approval', 'Results', 'Complete',
    ])
  })

  it('🛑 EVERY Milla screen gets the bar from the shell — none draws its own', () => {
    // The shell wraps the whole route group (`(milla)/layout.tsx`), so "on every screen" is a
    // structural fact rather than a list. A screen that drew its own would be a second
    // vocabulary beside the canonical one, which is precisely the C41 defect.
    const layout = codeOf(join(MILLA_ROOT, 'layout.tsx'))
    expect(layout, 'the route group no longer wraps its screens in the shell')
      .toMatch(/<MillaShell>\{children\}<\/MillaShell>/)
    const drawers = ALL
      .filter(p => !p.endsWith('MillaShell.tsx'))
      .filter(p => /MVP1_MILLA_STAGES/.test(codeOf(p)))
      .map(rel)
    expect(drawers, 'a Milla screen draws its own stage bar').toEqual([])
  })

  it('🛑 NO HAND-WRITTEN STAGE LIST ANYWHERE IN THE GROUP', () => {
    // The retired ribbon was a literal array — "Sign up › Build plan › We reach out › …" —
    // living beside the approved vocabulary with nothing keeping the two in step. A list of
    // the canonical names typed out by hand is the same defect wearing the right words.
    const offenders: string[] = []
    for (const p of ALL) {
      const src = codeOf(p)
      // Three or more canonical stage names as adjacent quoted strings is a list, not prose.
      if (/'(?:Brief|Proof|Programme|Approval|Results|Complete)',\s*'(?:Brief|Proof|Programme|Approval|Results|Complete)',\s*'(?:Brief|Proof|Programme|Approval|Results|Complete)'/.test(src)) {
        offenders.push(rel(p))
      }
      // And the retired seven-step journey, by its own words.
      if (/Build plan|We reach out|Meeting booked'/.test(src)) offenders.push(rel(p))
    }
    expect(offenders, 'a second stage vocabulary is back on a client screen').toEqual([])
  })

  it('🛑 and no screen invents a SEVENTH stage — R127 names signup by name', () => {
    // *"No seventh `signup` product stage. Signup/conversing is a state inside/preparing
    // Brief."* A screen labelling a step "Sign up" is the one R127 forbids explicitly.
    const offenders = ALL
      .filter(p => /['"`]Sign ?up['"`]\s*[,\]]/i.test(codeOf(p)))
      .map(rel)
    expect(offenders, 'a screen renders signup as a product stage').toEqual([])
  })

  it('the shell derives the bar and types not one label', () => {
    const shell = codeOf(join(__dirname, '../../../portal/src/components/milla/MillaShell.tsx'))
    expect(shell).toMatch(/MVP1_MILLA_STAGES\.map\(/)
    expect(shell, 'the shell maps a stage name to a different word')
      .not.toMatch(/MVP1_MILLA_STAGES[\s\S]{0,400}(?:LABELS|labelFor|renameStage)/)
  })

  it('the position comes from the shared projection, not from a local guess', () => {
    const shell = codeOf(join(__dirname, '../../../portal/src/components/milla/MillaShell.tsx'))
    expect(shell).toMatch(/mvp1MillaStageFromLegacy\(stage\)/)
  })
})

// ═════════════════════════════════════════════════════════════════════════════════════════
// ③ THE ONE SCREEN WITHOUT THE BAR, STATED RATHER THAN LEFT AS A SURPRISE
// ═════════════════════════════════════════════════════════════════════════════════════════
describe('J3-C1 · the onboarding exception is deliberate and is the only one', () => {
  const shell = codeOf(join(__dirname, '../../../portal/src/components/milla/MillaShell.tsx'))

  it('🛑 NO path returns bare — the exception list is empty, and it stays empty', () => {
    // ⛓️ 22 Sep — WAS: *"exactly ONE path returns bare, and it is /milla/welcome"*, pinning
    // #513's rule that onboarding is full-screen until the client's ICP is live.
    //
    // 🛑 FOUNDER-LOCKED 22 Sep: *"the client lands after sign up and lands in Milla portal.
    // they speak there and see there."* The first run is a conversation INSIDE the portal, so
    // the one exception is gone and there is no longer a screen the shell steps aside for.
    //
    // ⚠️ THE GUARD IS UNCHANGED IN PURPOSE AND STRICTER IN EFFECT. Its own reason — *"an
    // exception list is how 'every screen' quietly becomes 'most screens'"* — is why this now
    // asserts EMPTY rather than a different single entry. One is a list; zero is a rule. Any
    // future early return here, for any route, fails this immediately.
    const bares = shell.match(/if \(pathname === '[^']+'\) return <>\{children\}<\/>/g) ?? []
    expect(bares, 'a route was given a way to drop the portal chrome').toEqual([])
  })

  it('and that screen still tells the client where they are, in words', () => {
    // The bar is absent; the journey is not. The onboarding panel names what happens next
    // rather than leaving a prospect with no sense of the sequence at all.
    const welcome = codeOf(join(MILLA_ROOT, 'milla/welcome/page.tsx'))
    // ⛓️ 24 Sep (R145 step 2) — the plan card ("Your targeting plan" / "Proposed ICP") is gone; the one panel is
    // headed "Your targeting", and the line under its button names the next step or what is missing.
    expect(welcome).toMatch(/Your targeting plan|Proposed ICP|<b>Your targeting<\/b>/)
    expect(welcome).toContain('Free proof.')
  })
})
