import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { PACK_LEADS, PACK_PRICE_USD, LEAD_PRICE_USD, packLine } from '@kind/shared'

// #563 — THE MONEY SCREEN COULD NOT TELL THE TRUTH.
//
// `billing/page.tsx` fetched only `/credits`, so it knew the wallet and nothing else. It
// structurally could not know the client was holding 100 included leads — and said
// "$4 per approved lead" to someone whose first hundred were free. It is the screen a client
// opens immediately after paying, which is the worst possible place to be wrong about money.
//
// Fixed on main: it now fetches `/leads/milla-summary`, renders `packLine(pack)` from
// @kind/shared (the same helper the desk and Milla's greeting use — one source of truth), and
// carries a `packUnknown` state so a FAILED pack fetch says "this does not mean you have none"
// rather than silently implying the client has no pack.
//
// Pinned by reading the source, the way `portal-public-routes.test.ts` does: the page is a
// React server/client component with real network calls, and the assertion worth making is
// about which questions it asks and what it refuses to claim — not about rendered pixels.
//
// ⚠️ COMMENT LINES ARE STRIPPED BEFORE ANY POSITION OR ABSENCE CHECK. Three tests this week
// bound to a string inside a comment that quoted the old code and "passed" while asserting the
// opposite (#560's `express.static`, #564's "surfaced by the reload", #564②'s ordering).
// `reply-routing.test.ts` established the practice; this is it.

const SRC = join(__dirname, '../../../../apps/portal/src/app/(dashboard)/dashboard/billing/page.tsx')
const raw = readFileSync(SRC, 'utf8')

/** The file with `//` comment lines and block comments removed — what the browser actually runs. */
const code = raw
  .split('\n')
  .filter(l => !l.trim().startsWith('//') && !l.trim().startsWith('*') && !l.trim().startsWith('/*'))
  .join('\n')

describe('the billing screen asks about the pack, not just the wallet', () => {
  it('fetches the pack, not only /credits', () => {
    // The structural fix. Without this call the page cannot know about the included 100 at all,
    // so every honesty assertion below would be unimplementable.
    expect(code).toContain('/leads/milla-summary')
    expect(code).toContain('/credits')
  })

  it('renders packLine from @kind/shared rather than re-deriving the sentence', () => {
    // Three surfaces state the client's pack position (this page, the desk, Milla's greeting).
    // Three hand-written sentences is three chances to disagree about how many leads are left.
    expect(code).toContain("from '@kind/shared'")
    expect(code).toContain('packLine(pack)')
  })

  it('has a packUnknown state — a failed fetch must not imply "you have none"', () => {
    expect(code).toContain('packUnknown')
  })

  it('and says so in words the client can act on', () => {
    // The specific honesty: absence of data is not evidence of absence of pack. Asserted
    // against the rendered string, so rewording that drops the reassurance fails here.
    expect(raw).toContain('does not mean you have none')
  })
})

describe('the pack panel is not hidden behind a truthy-zero bug', () => {
  it('renders on packLine(...) being non-empty, not on a bare `pack &&`', () => {
    // `pack && ...` renders nothing useful when the pack object exists but is exhausted, and
    // `pack.left && ...` would print a literal 0. Gating on the composed sentence is what makes
    // "0 of 100 left" sayable.
    expect(code).toContain('{packLine(pack) && (')
  })
})

// ── #563 REMAINDER — THE STARTER CARD LIED ABOUT THE $99 ─────────────────────────────────
//
// The pack PANEL was fixed (above). The **first-purchase card** was not: it read
// *"Fund your wallet. Each approved lead is a flat $4."* — and after #562 both halves are false.
// The first payment does NOT credit the wallet (`isPackPurchase` skips `increment_wallet`,
// because the $99 buys the pack), and the first 100 approvals are NOT $4 each; they are
// included. It is the screen a client reads immediately before entering a card.
//
// The guard is drift, not wording. Every figure now comes from `@kind/shared`, so a price change
// cannot leave this sentence lying — which is precisely how it became a lie the first time.
describe('the first-purchase card tells the truth about what $99 buys', () => {
  it('does NOT claim the first payment funds the wallet', () => {
    expect(code).not.toContain('Fund your wallet')
  })

  it('does NOT price the included leads at $4', () => {
    // The specific falsehood: "Each approved lead is a flat $4" said to someone whose first
    // hundred are free.
    expect(code).not.toContain('Each approved lead is a flat')
  })

  it('says the pack is included, and that reviewing is free', () => {
    expect(code).toContain('approved leads included')
    expect(code.toLowerCase()).toContain('reviewing is always free')
  })

  it('derives every figure from the shared constants — no hand-typed 99, 100 or 4', () => {
    // The drift guard. `PACK_PRICE_USD` etc. live in @kind/shared exactly so the client can read
    // the same numbers the API charges from; hand-typing them is what broke this before.
    expect(code).toContain('PACK_LEADS')
    expect(code).toContain('LEAD_PRICE_USD')
    expect(code).toContain('WALLET_FIRST_PURCHASE_USD = PACK_PRICE_USD')
    expect(code).not.toMatch(/WALLET_FIRST_PURCHASE_USD = \d+/)
  })
})

describe('the shared constants are the single source of truth', () => {
  it('the API re-exports them rather than declaring its own', () => {
    // Two declarations is how the API could charge $4 while the portal advertised something
    // else, with nothing failing.
    const pack = readFileSync(join(__dirname, './onboarding-pack.ts'), 'utf8')
    expect(pack).toContain("from '@kind/shared'")
    expect(pack).not.toMatch(/export const PACK_LEADS\s*=\s*\d+/)
    expect(pack).not.toMatch(/export const LEAD_PRICE_USD\s*=\s*\d+/)
  })

  it('they still hold the founder-locked values', () => {
    // Deriving from a constant is only safe if the constant is right.
    expect(PACK_LEADS).toBe(100)
    expect(PACK_PRICE_USD).toBe(99)
    expect(LEAD_PRICE_USD).toBe(4)
  })

  it('packLine quotes the per-lead price from the constant, not a literal', () => {
    // The exhausted-pack sentence hand-typed "$4" too.
    expect(packLine({ active: true, included: 100, used: 100, left: 0 }))
      .toContain(`$${LEAD_PRICE_USD} each`)
  })
})
