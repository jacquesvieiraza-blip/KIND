import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

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
