// ⚑ 16 Sep (MVP1 · F2 + F3) — THE RETIRED MODEL MUST NOT REACH INTO MVP1.
//
// R124 (founder-locked 16 Sep), verbatim: *"299/4 is gone. out. we are on the programme. all
// clients."* This is NOT a legacy deletion — the founder's boundary is explicit: *"Do NOT
// undertake a giant legacy deletion. Fence only where legacy behaviour affects MVP1."* So
// nothing legacy is removed here. What changes is what can REACH a programme-model client.
//
// ── F2: THE DAILY DRIP COULD EAT A PROOF SET ──────────────────────────────────────────
//
// 🛑 THE SELECTION WAS `programme_id IS NULL AND delivered_at IS NULL`, which is EXACTLY what
// a Proof lead and a structurally set-aside candidate look like:
//
//   · a Proof run never acquires a programme identity (it runs inside `if (!proofMode)`'s
//     exclusion, by design), so `programme_id` is null;
//   · a set-aside candidate is inserted and never surfaced, so `delivered_at` is null.
//
// The drip then calls `enrichAndDeliverLeads` with NO `qualifyAgainst` — no ICP gate at all —
// so the next morning it would REVEAL and CHARGE FOR candidates our own structural gate had
// just refused, and would pace a client's Proof set at five a day as if it were legacy work.
//
// ── F3: COPY THAT TEACHES A MODEL THAT NO LONGER EXISTS ───────────────────────────────

process.env.SUPABASE_URL ??= 'http://localhost:54321'
process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'test-service-role'

import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

vi.mock('@kind/db', () => ({ db: { from: () => ({}), rpc: async () => ({ data: null, error: null }) } }))

const REPO = join(__dirname, '../../../..')
const codeOnly = (src: string) =>
  src.split('\n').filter(l => !/^\s*(\/\/|\/\*|\*)/.test(l)).join('\n')
const src = (p: string) => codeOnly(readFileSync(join(REPO, p), 'utf8'))

// ─────────────────────────────────────────────────────────────────────────────
// Ⓐ F2 — THE DRIP
// ─────────────────────────────────────────────────────────────────────────────
describe('Ⓐ · F2 · the daily drip cannot select Proof or set-aside rows', () => {
  /** The drip's own candidate query, bounded by its two ends so no other read can satisfy it. */
  const dripQuery = () => {
    const s = src('apps/api/src/routes/internal.ts')
    const at = s.indexOf('const { data: pending } = await db.from(\'leads\')')
    expect(at, 'the drip candidate query moved — find it before editing this guard')
      .toBeGreaterThan(0)
    return s.slice(at, s.indexOf('.limit(toDeliver)', at) + 40)
  }

  it('🛑 A PROOF-ATTRIBUTED ROW IS EXCLUDED — `proof_pass IS NULL`', () => {
    // Row-level attribution, which is the discriminator `current-workspace.ts` established:
    // `proof_pass` is stamped by `runIcpJob` on exactly the ids one Proof run inserted.
    expect(dripQuery(), 'the drip can still reveal and charge for a client\'s Proof set')
      .toMatch(/\.is\('proof_pass', null\)/)
  })

  it('🛑 A SET-ASIDE CANDIDATE IS EXCLUDED — `set_aside_reason IS NULL`', () => {
    // Our own structural gate refused these. Revealing them the next morning would pay for
    // people we had just decided not to show, and would show them ungated.
    expect(dripQuery(), 'the drip can still reveal candidates the structural gate refused')
      .toMatch(/\.is\('set_aside_reason', null\)/)
  })

  it('and the 9-Sep programme fence is still there — this ADDS to it', () => {
    expect(dripQuery()).toMatch(/\.is\('programme_id', null\)/)
    expect(dripQuery()).toMatch(/\.is\('delivered_at', null\)/)
  })

  it('🛑 AUTO-REPLENISH REVEALS NOTHING, and must stay that way', () => {
    const s = src('apps/api/src/routes/internal.ts')
    const at = s.indexOf("internalRouter.post('/figsy/auto-replenish'")
    expect(at).toBeGreaterThan(0)
    const route = s.slice(at, s.indexOf('internalRouter.post', at + 10))
    // It is an ALERT job: it counts enrollments and emails the founder. No enrichment, no
    // reveal, no charge. If any of these ever appear here, F2 has a second hole.
    for (const forbidden of ['enrichAndDeliverLeads', 'revealed_at', 'approveLead']) {
      expect(route, `auto-replenish now ${forbidden} — it must never reveal or charge`)
        .not.toContain(forbidden)
    }
  })

  it('and F1 already removes Proof clients from its selection', () => {
    const s = src('apps/api/src/routes/internal.ts')
    const at = s.indexOf("internalRouter.post('/figsy/auto-replenish'")
    const route = s.slice(at, s.indexOf('internalRouter.post', at + 10))
    // It selects on `first_icp_run_at IS NOT NULL` — the legacy first-run stamp that F1 now
    // fences out of Proof entirely. So a Proof client is not in this set at all.
    expect(route).toMatch(/\.not\('first_icp_run_at', 'is', null\)/)
    const icps = src('apps/api/src/routes/icps.ts')
    expect(icps).toMatch(/if \(!proofMode\) \{/)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Ⓑ F3 — THE SIGNUP ALERT
// ─────────────────────────────────────────────────────────────────────────────
describe('Ⓑ · F3 · the signup alert speaks the programme', () => {
  const auth = () => src('apps/api/src/routes/auth.ts')

  it('🛑 THE RETIRED PACK SENTENCE IS GONE', () => {
    const s = auth()
    const at = s.indexOf('New signup —')
    expect(at, 'the signup alert moved').toBeGreaterThan(0)
    const alert = s.slice(at, at + 900)
    // R124: there is no pack to load and no per-lead price to quote.
    expect(alert, 'the signup alert still teaches the retired pack model')
      .not.toMatch(/PACK_PRICE_USD|No freebies|must load/)
  })

  it('and it says what actually happens next', () => {
    const s = auth()
    const at = s.indexOf('New signup —')
    const alert = s.slice(at, at + 900)
    // Free Proof first, then the programme — the MVP1 journey, in the operator's words.
    expect(alert).toMatch(/Proof/i)
    expect(alert).toMatch(/programme/i)
  })

  it('🛑 AND NO PRICE IS TYPED INTO IT (working method, rule 7)', () => {
    const s = auth()
    const at = s.indexOf('New signup —')
    const alert = s.slice(at, at + 900)
    expect(alert, 'a money figure was typed into an alert instead of interpolated')
      .not.toMatch(/\$\d/)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Ⓒ F3 — VIDA'S BRIEF PROGRESS IS THE CLIENT'S COUNT, NEVER OURS
// ─────────────────────────────────────────────────────────────────────────────
describe('Ⓒ · F3 · one onboarding truth on the Vida header', () => {
  it('🛑 THE "Brief" CHIP NEVER SUBSTITUTES OUR OWN PERCENTAGE', () => {
    // R121 Build 4 made this chip the client's eleven-fact Brief count — but left a fallback
    // to `onboarding.percent`, which is OUR eight go-live checks. Under the label "Brief" that
    // is a competing answer wearing the canonical one's name: the exact defect R121 closed,
    // surviving in the branch nobody looks at.
    const page = src('apps/admin/src/app/vida/page.tsx')
    const at = page.indexOf('Brief {cockpit.onboarding.brief')
    expect(at, 'the Brief chip moved — find it before editing this guard').toBeGreaterThan(0)
    const chip = page.slice(at, at + 320)
    expect(chip, 'the Brief chip still falls back to our own go-live percentage')
      .not.toMatch(/\$\{cockpit\.onboarding\.percent\}%/)
  })

  it('an unreadable Brief count says so, rather than borrowing a number', () => {
    const page = src('apps/admin/src/app/vida/page.tsx')
    const at = page.indexOf('Brief {cockpit.onboarding.brief')
    const chip = page.slice(at, at + 320)
    expect(chip).toMatch(/—|not read|unknown/i)
  })

  it('and `go_live` keeps its own name, where it legitimately belongs', () => {
    // The founder's boundary: *"Keep go-live checks where they legitimately belong under their
    // own name."* They are OUR checks and they stay — they simply stop answering "Brief".
    const page = src('apps/admin/src/app/vida/page.tsx')
    expect(page).toMatch(/onboarding\.go_live/)
  })
})
