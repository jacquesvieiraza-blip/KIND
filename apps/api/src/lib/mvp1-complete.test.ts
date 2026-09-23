// ⚑ 16 Sep (MVP1 · E1 + E2) — COMPLETE EXISTS IN THE PRODUCT, AND A FINISHED CLIENT IS TOLD
// WHAT IS LEFT.
//
// ── E1: THE BACKEND COULD COMPLETE A PROGRAMME; NOTHING COULD PRESS IT ────────────────
//
// 🛑 `mayComplete(p)` is a real gate in `lib/programme.ts`, `completeProgramme` is a real
// writer, `POST /programmes/:id/complete` is a real audited route, and `GET /programmes/:id`
// even RETURNS `mayComplete` as a derived read-out. Vida reads
// `/operator/programme?client_id=…` — a different payload, which never carried it — and the
// lifecycle panel had no Complete action at all. So the sixth and final stage of the founder's
// six-stage product was reachable only by calling the API by hand.
//
// ⚠️ THE GATE IS NOT DUPLICATED IN THE BROWSER. The server sends its own verdict and the panel
// renders the control only when that verdict says yes. A second copy of the eligibility rule
// in the admin app would be a second opinion about when a client's programme may end.
//
// ── E2: A COMPLETED CLIENT COULD NOT SEE WHAT THEY HAD NOT USED ───────────────────────
//
// 🛑 `progress.authorised` (sourcing_ceiling) and `progress.delivered` (sourced_used) were
// BOTH already in the client payload, and the terminal view showed neither difference. R74's
// promise — *"unused programme value stays on account and never expires"* — was a sentence on
// the website with nothing in the product that could state the number.

process.env.SUPABASE_URL ??= 'http://localhost:54321'
process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'test-service-role'

import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

vi.mock('@kind/db', () => ({ db: { from: () => ({}), rpc: async () => ({ data: null, error: null }) } }))

import { remainingProgrammeValue } from '@kind/shared'

const REPO = join(__dirname, '../../../..')
const codeOnly = (src: string) =>
  src.split('\n').filter(l => !/^\s*(\/\/|\/\*|\*)/.test(l)).join('\n')
const src = (p: string) => codeOnly(readFileSync(join(REPO, p), 'utf8'))

// ─────────────────────────────────────────────────────────────────────────────
// Ⓐ E1 — THE CONTROL EXISTS, AND ONLY WHEN THE SERVER SAYS SO
// ─────────────────────────────────────────────────────────────────────────────
describe('Ⓐ · E1 · Complete is reachable from Vida', () => {
  it('🛑 THE SERVER SENDS ITS OWN VERDICT to the payload Vida actually reads', () => {
    const op = src('apps/api/src/lib/operator-programme.ts')
    expect(op, 'Vida\'s programme payload still cannot tell whether completion is allowed')
      .toMatch(/may_complete/)
    expect(op, 'the verdict is not the shared gate').toMatch(/mayComplete\(/)
  })

  it('🛑 AND THE REASON TRAVELS WITH IT — a disabled control must say why', () => {
    const op = src('apps/api/src/lib/operator-programme.ts')
    expect(op).toMatch(/complete_blocked_reason/)
  })

  it('the panel has a Complete action key', () => {
    const copy = src('apps/admin/src/lib/vida-lifecycle-copy.ts')
    expect(copy).toMatch(/'complete_programme'/)
  })

  it('🛑 IT IS OFFERED ONLY WHEN `mayComplete` IS TRUE', () => {
    const copy = src('apps/admin/src/lib/vida-lifecycle-copy.ts')
    const at = copy.indexOf("key: 'complete_programme'")
    expect(at, 'the Complete action is not produced anywhere').toBeGreaterThan(0)
    // The action must sit behind the server's verdict, not behind a stage alone.
    expect(copy.slice(Math.max(0, at - 900), at), 'the Complete control is offered unconditionally')
      .toMatch(/mayComplete/)
  })

  it('🛑 THE ELIGIBILITY RULE IS NOT RE-IMPLEMENTED IN THE BROWSER', () => {
    const copy = src('apps/admin/src/lib/vida-lifecycle-copy.ts')
    const page = src('apps/admin/src/app/vida/page.tsx')
    // The admin app must not know WHY completion is allowed — only whether.
    for (const rule of ['value_settled_at', 'make_whole', 'sourced_used >=', 'meeting_target <=']) {
      expect(copy, `the completion rule "${rule}" was copied into the admin app`).not.toContain(rule)
      expect(page, `the completion rule "${rule}" was copied into the admin page`).not.toContain(rule)
    }
  })

  it('and it calls the EXISTING completion route', () => {
    const page = src('apps/admin/src/app/vida/page.tsx')
    expect(page).toMatch(/\/programmes\/\$\{encodeURIComponent\([a-zA-Z]+\)\}\/complete/)
    expect(page).toMatch(/case 'complete_programme'/)
  })

  it('🛑 AND NOTHING ABOUT COMPLETION AUTHORITY MOVED', () => {
    const prog = src('apps/api/src/lib/programme.ts')
    // `mayComplete` and `completeProgramme` keep their exact shape — E1 is a UI exposure.
    expect(prog).toMatch(/export function mayComplete\(p: ProgrammeRow\)/)
    expect(prog).toMatch(/const gate = mayComplete\(p\)/)
    const route = src('apps/api/src/routes/programme.ts')
    expect(route).toMatch(/programmeRouter\.post\('\/:id\/complete'/)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Ⓑ E2 — REMAINING VALUE, FROM TWO NUMBERS THAT WERE ALREADY THERE
// ─────────────────────────────────────────────────────────────────────────────
describe('Ⓑ · E2 · a finished client is told what they have not used', () => {
  it('nothing delivered against an authorised ceiling leaves the whole ceiling', () => {
    expect(remainingProgrammeValue({ authorised: 2500, delivered: 0 })).toBe(2500)
  })

  it('a fully worked programme leaves nothing', () => {
    expect(remainingProgrammeValue({ authorised: 2500, delivered: 2500 })).toBe(0)
  })

  it('a partly worked programme leaves the difference', () => {
    expect(remainingProgrammeValue({ authorised: 2500, delivered: 1800 })).toBe(700)
  })

  it('🛑 IT CLAMPS AT ZERO — over-delivery never reads as negative value owed', () => {
    expect(remainingProgrammeValue({ authorised: 2500, delivered: 2600 })).toBe(0)
  })

  it('🛑 AND AN UNREADABLE NUMBER IS `null`, NOT ZERO', () => {
    // Zero says "you have nothing left", which is a claim. `null` says we could not tell, and
    // the screen renders nothing rather than a false reassurance.
    expect(remainingProgrammeValue({ authorised: null, delivered: 0 })).toBe(null)
    expect(remainingProgrammeValue({ authorised: 2500, delivered: null })).toBe(null)
  })

  it('🛑 the terminal view does NOT render "unused prospects" from the ceiling any more (R136)', () => {
    // ⛓️ INVERTED 23 Sep (R136 ③ · ④). WAS `'the terminal view renders it from the payload it
    // already had'`, asserting the workspace used `remainingProgrammeValue` over
    // `progress.authorised`. That number was `sourcing_ceiling − sourced_used`: it disclosed the
    // internal limit by subtraction (*"i said 400 internally. we dont disclose this."*), and R136
    // ④ replaced "unused value stays on account" with a WALLET CREDIT for meetings not delivered
    // (*"we refund credits to their wallet internally to use towards another icp run."*). The
    // pure function above is kept and still tested; the client screen no longer calls it, and
    // the ceiling is not on the client wire at all.
    const ws = src('apps/portal/src/components/milla/ProgrammeWorkspace.tsx')
    expect(ws).not.toMatch(/remainingProgrammeValue/)
    expect(ws).not.toMatch(/progress\.authorised/)
    expect(ws).toMatch(/progress\.delivered/)
  })

  it('🛑 CANCELLED STAYS DISTINCT from completed', () => {
    const ws = src('apps/portal/src/components/milla/ProgrammeWorkspace.tsx')
    // The existing terminal discriminator is untouched: a cancelled programme must never be
    // described as a completed one (founder, 10 Sep).
    expect(ws).toMatch(/terminal === 'cancelled'/)
  })

  it('🛑 AND NOTHING STARTS A NEXT PROGRAMME AUTOMATICALLY', () => {
    const ws = src('apps/portal/src/components/milla/ProgrammeWorkspace.tsx')
    for (const forbidden of ['createProgramme', '/programmes', 'api.post']) {
      expect(ws, `the terminal view can start work (${forbidden})`).not.toContain(forbidden)
    }
  })
})
