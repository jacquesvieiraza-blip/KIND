// ═══════════════════════════════════════════════════════════════════════════════════════
// HOUSE AUTHORITY — a real lifecycle, without inventing a single pound.
//
// ⚑ 2 Sep. House is Client Zero: a real internal launch canary that must walk the SAME
// lifecycle a customer walks — Proof → Recommendation → P1 → sourcing → review → ONE
// approval → P2 → Live — while paying nothing and creating no Stripe object, invoice,
// revenue or commission.
//
// 🛑 WHY A NEW COLUMN AND NOT `first_paid_at`. That column is simultaneously the sourcing key
// AND the revenue trigger: `computeContribution` reads `(first_paid_at ? first_payment_cents
// : 0)`, and a partner's commission derives from that figure. Authorising House by setting it
// would have invented revenue on an account that has paid nothing.
//
// 🛑 AND THE DEFECT THAT NEARLY SHIPPED UNDERNEATH ALL OF IT. `checkEnrollmentAuthority`
// resolved a NULL-attributed enrollment to the CLIENT'S open programme — documented, and
// deliberate for a client mid-migration. House carries ~263 enrollments and ~166 leads from a
// RETIRED legacy desk, every one `programme_id = NULL`. The moment its new programme reached
// LIVE, all of them would have been authorised by it: history re-authorised as current work,
// with a real prospect at the other end of each. Attribution must be POSITIVE.
//
// ⚠️ AND LEGACY IS NOT REMOVED. A client with no open programme behaves exactly as before —
// the $299 pack model is what is actually selling, and this narrows nothing for it.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

// ── THE FAKE DATABASE ────────────────────────────────────────────────────────────────────
//
// `@kind/db` throws at import time without Supabase env vars, so it has to be replaced either
// way. It is replaced with a TABLE-AWARE fake rather than an empty object because the two
// gates that matter most here — "a null-attributed enrollment is history" and "internal P1
// only from AWAITING_FIRST_PAYMENT" — are decided INSIDE async functions that read rows.
//
// 🛑 A SOURCE-TEXT ASSERTION CANNOT PROVE EITHER. `if (open) {` and `if (false && open) {`
// contain the identical substrings; so do `!== 'AWAITING_FIRST_PAYMENT'` and
// `!== 'AWAITING_FIRST_PAYMENT' && p.status !== 'RECOMMENDED'`. Both mutations were made and
// both left a grep-based version of these tests GREEN. They call the real functions instead.
//
// A fake URL was never an option — it would invite a real call. Nothing here reaches a network.
const dbState: {
  enrollment: { id?: string; client_id: string | null; programme_id: string | null } | null
  programme: Record<string, unknown> | null
  writes: Record<string, unknown>[]
} = { enrollment: null, programme: null, writes: [] }

vi.mock('@kind/db', () => ({
  db: {
    from: (table: string) => {
      const q: Record<string, unknown> = {
        select: () => q, eq: () => q, not: () => q, limit: () => q, order: () => q, is: () => q,
        update: (patch: Record<string, unknown>) => { dbState.writes.push(patch); return q },
        async maybeSingle() {
          if (table === 'figsy_enrollments') return { data: dbState.enrollment, error: null }
          if (table === 'programmes') return { data: dbState.programme, error: null }
          return { data: null, error: null }
        },
        // `.update(...).eq(...).is(...).select()` is awaited directly — supabase-js query
        // builders are thenable, so the fake must be too or the write path never resolves.
        then: (res: (v: unknown) => unknown) => res({ data: [{ id: 'prog-1' }], error: null }),
      }
      return q
    },
  },
}))

import {
  authorityFor, checkEnrollmentAuthority, type AuthorityVerdict,
} from './programme-authority'
import {
  p1Authorised, p2Authorised, authoriseFirstInternal, type ProgrammeRow,
} from './programme'

const API = join(__dirname, '..')
const raw = (p: string) => readFileSync(p, 'utf8')
const strip = (s: string) => s
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n').filter(l => !l.trim().startsWith('//')).join('\n')

const P = (over: Partial<ProgrammeRow> = {}): ProgrammeRow => ({
  id: 'prog-1', client_id: 'house', status: 'DRAFT',
  meeting_target: 4, recommended_volume: 1000,
  price_per_meeting_cents: 45000, price_total_cents: 180000,
  first_payment_cents: 90000, second_payment_cents: 90000,
  first_payment_ref: null, second_payment_ref: null,
  first_payment_intent_id: null, second_payment_intent_id: null,
  first_paid_at: null, second_paid_at: null,
  first_authorised_at: null, second_authorised_at: null,
  sourcing_ceiling: 0, sourced_used: 0, sourced_reserved: 0,
  approved_at: null, went_live_at: null, paused_at: null, pause_reason: null,
  value_settled_at: null, make_whole_cents: 0, contribution_cents: null,
  contribution_finalised_at: null, disputed_at: null,
  ...over,
})
const ok = (v: AuthorityVerdict) => v.allowed === true

// ── AUTHORITY IS SATISFIED BY EITHER SOURCE, PER STAGE ───────────────────────────────────
describe('internal authority carries the same weight as a payment, stage by stage', () => {
  it('P1 is satisfied by a payment OR internal authority — and by nothing else', () => {
    expect(p1Authorised(P())).toBe(false)
    expect(p1Authorised(P({ first_paid_at: 'x' }))).toBe(true)
    expect(p1Authorised(P({ first_authorised_at: 'x' }))).toBe(true)
  })

  it('P2 paid requires BOTH paid_at and ref — the same pair `authorityFor` demands', () => {
    // A looser test here would let a half-written payment row satisfy go-live while the send
    // gate still refused, and the two would disagree about the same programme.
    expect(p2Authorised(P({ second_paid_at: 'x' }))).toBe(false)
    expect(p2Authorised(P({ second_paid_at: 'x', second_payment_ref: 'cs_1' }))).toBe(true)
    expect(p2Authorised(P({ second_authorised_at: 'x' }))).toBe(true)
  })

  it('SOURCING is authorised by internal P1, with no payment anywhere on the row', () => {
    const p = P({ status: 'SOURCING_AUTHORISED', first_authorised_at: 'x', sourcing_ceiling: 1000 })
    expect(ok(authorityFor(p, 'SOURCING'))).toBe(true)
    expect(p.first_paid_at).toBeNull()
    expect(p.first_payment_ref).toBeNull()
  })

  it('🛑 internal P1 does NOT authorise OUTREACH — Payment 1 buys preparation only', () => {
    const v = authorityFor(P({ status: 'SOURCING_AUTHORISED', first_authorised_at: 'x' }), 'OUTREACH')
    expect(v.allowed).toBe(false)
    expect((v as { reason: string }).reason).toBe('programme_not_approved')
  })

  it('🛑 internal P2 without LIVE does NOT authorise OUTREACH', () => {
    // The state House sits in between P2 and Make Live. It must be inert.
    const v = authorityFor(P({
      status: 'APPROVED', approved_at: 'a', second_authorised_at: 'x', first_authorised_at: 'f',
    }), 'OUTREACH')
    expect(v.allowed).toBe(false)
    expect((v as { reason: string }).reason).toBe('programme_not_live')
  })

  it('LIVE + approval + internal P2 authorises OUTREACH', () => {
    const p = P({ status: 'LIVE', approved_at: 'a', went_live_at: 'w', second_authorised_at: 'x' })
    expect(ok(authorityFor(p, 'OUTREACH'))).toBe(true)
  })

  it('LIVE without an approval is still refused — approval is checked independently', () => {
    const v = authorityFor(P({ status: 'LIVE', went_live_at: 'w', second_authorised_at: 'x' }), 'OUTREACH')
    expect(v.allowed).toBe(false)
    expect((v as { reason: string }).reason).toBe('programme_not_approved')
  })

  it('paused and terminal refuse every action, whatever the authority', () => {
    for (const action of ['SOURCING', 'NEXT_BATCH', 'OUTREACH'] as const) {
      expect(authorityFor(P({ status: 'LIVE', approved_at: 'a', went_live_at: 'w', second_authorised_at: 'x', paused_at: 'p' }), action).allowed).toBe(false)
      expect(authorityFor(P({ status: 'COMPLETED', first_authorised_at: 'x' }), action).allowed).toBe(false)
    }
  })
})

// ── THE VALID STATES, ENFORCED IN THE FUNCTION ───────────────────────────────────────────
describe('internal authority may only be recorded from its own valid state', () => {
  const src = strip(raw(join(API, 'lib/programme.ts')))
  const fn = (name: string) => {
    const at = src.indexOf(`export async function ${name}`)
    expect(at, `${name} must exist`).toBeGreaterThan(-1)
    return src.slice(at, at + src.slice(at).indexOf('\n}\n') + 3)
  }

  it('🛑 P1 is AWAITING_FIRST_PAYMENT only — it cannot skip Recommendation', () => {
    // The paid path reaches `recordFirstPayment` only after `/checkout/first` has called
    // `awaitFirstPayment`. The internal path must not be allowed to skip what the paid path
    // cannot skip — and a UI-only rule is not a control, because a route is callable without
    // the screen that hides its button.
    const f = fn('authoriseFirstInternal')
    // ⚠️ THE CONDITION IS MATCHED WHOLE. `!== 'AWAITING_FIRST_PAYMENT'` is a substring of
    // `!== 'AWAITING_FIRST_PAYMENT' && p.status !== 'RECOMMENDED'`, so a `toContain` check
    // stays green while the gate is widened. It was widened, and it did.
    expect(f).toMatch(/if \(p\.status !== 'AWAITING_FIRST_PAYMENT'\) \{/)
    expect(f).toContain('p.paused_at')
    expect(f).toContain('TERMINAL_STATUSES.includes(p.status)')
  })

  it('🛑 …and the FUNCTION refuses it, not just the source line', async () => {
    for (const status of ['DRAFT', 'RECOMMENDED', 'SOURCING', 'APPROVED', 'LIVE'] as const) {
      dbState.programme = P({ status }) as unknown as Record<string, unknown>
      dbState.writes = []
      const r = await authoriseFirstInternal('prog-1')
      expect(r.ok, `internal P1 must refuse from ${status}`).toBe(false)
      expect(dbState.writes, `${status} must not write`).toHaveLength(0)
    }
    dbState.programme = P({ status: 'AWAITING_FIRST_PAYMENT' }) as unknown as Record<string, unknown>
    dbState.writes = []
    const good = await authoriseFirstInternal('prog-1')
    expect(good.ok, 'and it must ACCEPT the one state it is for').toBe(true)
    expect(dbState.writes[0]).toMatchObject({
      sourcing_ceiling: 1000, status: 'SOURCING_AUTHORISED',
    })
    expect(dbState.writes[0], 'internal authority never writes payment evidence')
      .not.toHaveProperty('first_paid_at')
  })

  it('P1 opens the ceiling and moves to SOURCING_AUTHORISED — the paid path minus the money', () => {
    const f = fn('authoriseFirstInternal')
    expect(f).toContain('sourcing_ceiling: p.recommended_volume')
    expect(f).toContain("status: 'SOURCING_AUTHORISED'")
  })

  it('P2 requires APPROVED **and** an approval timestamp', () => {
    const f = fn('authoriseSecondInternal')
    expect(f).toContain("p.status !== 'APPROVED' || !p.approved_at")
  })

  it('🛑 P2 writes NEITHER status NOR went_live_at — Live is a separate founder control', () => {
    const f = fn('authoriseSecondInternal')
    expect(f).toContain('second_authorised_at:')
    expect(f, 'internal P2 must not advance status').not.toMatch(/status:\s*'LIVE'/)
    expect(f, 'internal P2 must not stamp went_live_at').not.toContain('went_live_at:')
  })

  it('neither internal writer touches any money or payment field', () => {
    for (const name of ['authoriseFirstInternal', 'authoriseSecondInternal']) {
      const f = fn(name)
      for (const banned of ['first_paid_at:', 'second_paid_at:', 'payment_ref:', 'payment_intent_id:',
                            'first_payment_cents', 'second_payment_cents', 'stripe', 'Stripe', 'invoice']) {
        expect(f, `${name} must never write ${banned}`).not.toContain(banned)
      }
    }
  })
})

// ── XOR, BOTH DIRECTIONS, BOTH STAGES ────────────────────────────────────────────────────
describe('a stage holds ONE authority — payment or internal, never both', () => {
  const src = strip(raw(join(API, 'lib/programme.ts')))

  it('the internal writers refuse when ANY payment evidence exists, intent id included', () => {
    for (const stage of ['first', 'second']) {
      const name = stage === 'first' ? 'authoriseFirstInternal' : 'authoriseSecondInternal'
      const at = src.indexOf(`export async function ${name}`)
      const f = src.slice(at, at + src.slice(at).indexOf('\n}\n'))
      expect(f).toContain(`p.${stage}_paid_at || p.${stage}_payment_ref || p.${stage}_payment_intent_id`)
    }
  })

  it('the Stripe writers refuse when internal authority exists', () => {
    expect(src).toContain('if (p.first_authorised_at) {')
    expect(src).toContain('if (p.second_authorised_at) {')
  })

  it('🛑 the DB carries the same rule, per stage, and existing rows cannot violate it', () => {
    const mig = raw(join(API, 'lib/pending-migrations.ts'))
    const at = mig.indexOf('20260902_programme_internal_authority')
    expect(at).toBeGreaterThan(-1)
    const sql = mig.slice(at, at + 4000)
    expect(sql).toContain('programmes_p1_authority_xor')
    expect(sql).toContain('programmes_p2_authority_xor')
    expect(sql).toContain('first_authorised_at IS NULL')
    expect(sql).toContain('first_payment_intent_id IS NULL')
    expect(sql).toContain('second_payment_intent_id IS NULL')
    // Added NULL with no default and no backfill, so every existing row satisfies the OR.
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS first_authorised_at  timestamptz')
    expect(sql).not.toMatch(/DEFAULT|UPDATE public\.programmes/)
  })

  it('🛑 the migration CREATES ONLY IF MISSING — never DROP-then-ADD on every run', () => {
    // The runner has no ledger and re-executes every entry. `ADD CONSTRAINT ... CHECK` takes
    // an ACCESS EXCLUSIVE lock and revalidates the table, and a DROP/ADD pair would also leave
    // a window with no constraint during which a concurrent write could make the re-ADD fail.
    const mig = raw(join(API, 'lib/pending-migrations.ts'))
    const at = mig.indexOf('20260902_programme_internal_authority')
    // Bound the slice to THIS entry — `.trim()` closes each template literal — so a later
    // migration's SQL can never satisfy or break the assertions below.
    const end = mig.indexOf('`.trim()', at)
    const sql = mig.slice(at, end === -1 ? at + 4000 : end)
    // ⚠️ SQL COMMENTS STRIPPED FIRST. The entry documents WHY it is not a DROP/ADD pair, and
    // that warning contains the words "DROP CONSTRAINT" — a raw substring check would fail on
    // the very comment that proves the point. Only executable SQL is asserted against.
    const exec = sql.split('\n').filter(l => !l.trim().startsWith('--')).join('\n')
    expect(exec, 'a CHECK is not an RLS policy — do not drop and recreate it').not.toContain('DROP CONSTRAINT')
    expect(sql).toContain('IF NOT EXISTS (')
    expect(sql).toContain('FROM pg_constraint')
    expect(sql).toContain('DO $$')
  })

  it('revenue reads PAYMENT only — internal authority contributes nothing', () => {
    // The whole reason the columns are separate. If this ever reads `*_authorised_at`, House
    // starts producing revenue and a partner starts earning commission on money nobody paid.
    const at = src.indexOf('export async function computeContribution')
    const f = src.slice(at, at + 900)
    expect(f).toContain('(p.first_paid_at ? p.first_payment_cents : 0)')
    expect(f).toContain('(p.second_paid_at ? p.second_payment_cents : 0)')
    expect(f, 'contribution must never read internal authority').not.toContain('authorised_at')
  })
})

// ── GO LIVE ──────────────────────────────────────────────────────────────────────────────
describe('Make Live is explicit, guarded, and idempotent without rewriting history', () => {
  const src = strip(raw(join(API, 'lib/programme.ts')))
  const at = src.indexOf('export async function goLiveProgramme')
  const fn = src.slice(at, at + src.slice(at).indexOf('\n}\n'))

  it('already-live returns success and writes NOTHING', () => {
    // "Requires went_live_at to be null" and "idempotent" are different claims; both are true
    // of different branches, and the early return is what makes the second one true.
    expect(fn).toContain("if (p.status === 'LIVE' && p.went_live_at) return { ok: true, alreadyLive: true }")
    expect(fn.indexOf('alreadyLive: true')).toBeLessThan(fn.indexOf("db.from('programmes')"))
  })

  it('the real transition is a compare-and-set on went_live_at', () => {
    expect(fn).toContain(".is('went_live_at', null)")
    expect(fn).toContain("status: 'LIVE'")
    expect(fn).toContain('went_live_at: new Date().toISOString()')
  })

  it('it refuses without approval, without P2, when paused, and when terminal', () => {
    expect(fn).toContain('!p.approved_at')
    expect(fn).toContain('!p2Authorised(p)')
    expect(fn).toContain('p.paused_at')
    expect(fn).toContain('TERMINAL_STATUSES.includes(p.status)')
    expect(fn).toContain("p.status !== 'APPROVED'")
  })

  it('the existing Stripe P2 auto-live behaviour is unchanged', () => {
    // Untouched on purpose: for a paying customer the payment IS the last human act.
    expect(src).toContain("{ ...base, status: 'LIVE', went_live_at: new Date().toISOString() }")
  })
})

// ── POSITIVE ATTRIBUTION ─────────────────────────────────────────────────────────────────
describe('a null programme_id is HISTORY when the client has an open programme', () => {
  const auth = strip(raw(join(API, 'lib/programme-authority.ts')))

  it('🛑 the authority layer REFUSES it rather than inheriting the client programme', async () => {
    // THE DEFECT ITSELF, exercised end to end: House carries ~263 legacy enrollments with
    // `programme_id = NULL`. Under the old rule its LIVE programme authorised every one of
    // them the moment it went live — history re-sent, with a real prospect at the far end.
    dbState.enrollment = { client_id: 'house', programme_id: null }
    dbState.programme = P({
      status: 'LIVE', approved_at: 'a', went_live_at: 'w',
      second_authorised_at: 'i', first_authorised_at: 'i',
      sourcing_ceiling: 1000,
    }) as unknown as Record<string, unknown>

    const v = await checkEnrollmentAuthority('enr-legacy', 'OUTREACH')
    expect(v.allowed, 'a LIVE programme must not authorise work it never sourced').toBe(false)
    expect(v.allowed === false && v.reason).toBe('not_this_programme')
  })

  it('an enrollment that NAMES the programme is authorised as normal', async () => {
    // The other half of "positive attribution": the fence stops history, not the programme's
    // own work. Without this, a refusal that broke everything would still pass the test above.
    dbState.enrollment = { client_id: 'house', programme_id: 'prog-1' }
    dbState.programme = P({
      status: 'LIVE', approved_at: 'a', went_live_at: 'w',
      second_authorised_at: 'i', first_authorised_at: 'i', sourcing_ceiling: 1000,
    }) as unknown as Record<string, unknown>

    const v = await checkEnrollmentAuthority('enr-current', 'OUTREACH')
    expect(v.allowed, 'the programme must still authorise its OWN work').toBe(true)
  })

  it('a client with NO open programme still resolves as legacy — the selling model is untouched', async () => {
    // ⚠️ THE REGRESSION THAT WOULD MATTER COMMERCIALLY. The $299 pack model is what is
    // actually selling, and every one of those enrollments is null-attributed with no
    // programme anywhere. It must behave exactly as it did before.
    dbState.enrollment = { client_id: 'pack-client', programme_id: null }
    dbState.programme = null

    const v = await checkEnrollmentAuthority('enr-pack', 'OUTREACH')
    expect(v).toEqual({ allowed: true, mode: 'legacy', programme: null })
    expect(authorityFor(null, 'OUTREACH')).toEqual({ allowed: true, mode: 'legacy', programme: null })
    expect(auth).toContain('return await checkProgrammeAuthority(e.client_id, action)')
  })

  it('🛑 the SELECTION layer filters on programme_id too — authority alone is not enough', () => {
    // Two independent gates: this one stops history being OFFERED, the other stops it being
    // authorised. A row that slipped past selection would still be refused, and vice versa.
    const sd = strip(raw(join(API, 'lib/send-due.ts')))
    expect(sd).toContain('openProgrammeByClient')
    expect(sd).toContain("return (e as { programme_id?: string | null }).programme_id === openId")
    expect(sd, 'a genuine legacy client selects exactly as before').toContain('if (openId == null) return true')
    expect(sd, 'unreadable programme state must fail closed').toContain("if (openId === '__unreadable__') return false")
  })

  it('the same rule serves the operator run and the cron — one implementation', () => {
    const sd = strip(raw(join(API, 'lib/send-due.ts')))
    expect((sd.match(/openProgrammeByClient/g) ?? []).length).toBeGreaterThan(1)
    expect(sd).toContain("export async function runSendDue(mode: SendDueMode)")
  })
})

// ── R87 ──────────────────────────────────────────────────────────────────────────────────
describe('a programme client receives no retired low-credit email', () => {
  const internal = strip(raw(join(API, 'routes/internal.ts')))

  it('/ae/low-credits is fenced — it is a SEPARATE route from /ae/zero-credits', () => {
    const at = internal.indexOf("internalRouter.post('/ae/low-credits'")
    expect(at).toBeGreaterThan(-1)
    const route = internal.slice(at, at + 3000)
    expect(route).toContain('programmeClientIds(')
    // ⚠️ THE ARGUMENT IS THE FENCE. `mayNotify('low_credits')` with no second argument is a
    // call that gates nothing, and it satisfies a bare `toContain("mayNotify('low_credits'")`.
    // Assert the `onProgramme` fact is actually computed and passed.
    expect(route).toMatch(/mayNotify\('low_credits',\s*\{\s*onProgramme:\s*onProgramme\(lowProgrammes,\s*client\.id\)\s*\}\)/)
  })

  it('the fence precedes the send, or it is not a fence', () => {
    const at = internal.indexOf("internalRouter.post('/ae/low-credits'")
    const route = internal.slice(at, at + 4000)
    expect(route.indexOf("mayNotify('low_credits'")).toBeGreaterThan(-1)
    expect(route.indexOf('resend.emails.send')).toBeGreaterThan(route.indexOf("mayNotify('low_credits'"))
  })

  it('the sibling route keeps its own fences — this did not move them', () => {
    expect(internal).toContain("mayNotify('zero_credits'")
    // ⚠️ COUNTS THE FENCED SHAPE, NOT THE CALL. There are two low-credit senders in this file
    // — a cron and the AE route — and both must pass the programme fact. Counting bare
    // `mayNotify('low_credits'` occurrences stays at 2 while one of them is stripped of its
    // argument, which is exactly what a mutation of the sibling site did.
    const fenced = internal.match(
      /mayNotify\('low_credits',\s*\{\s*onProgramme:\s*onProgramme\(lowProgrammes,\s*client\.id\)\s*\}\)/g,
    ) ?? []
    expect(fenced, 'both low-credit senders must be fenced').toHaveLength(2)
    expect((internal.match(/mayNotify\('low_credits'/g) ?? []).length).toBe(2)
  })
})

// ── VIDA ─────────────────────────────────────────────────────────────────────────────────
describe('the Vida controls stop at READY_FOR_APPROVAL', () => {
  const vidaRaw = raw(join(API, '../../admin/src/app/vida/page.tsx'))
  const vida = strip(vidaRaw)

  it('🛑 THERE IS NO VIDA APPROVE BUTTON — the one approval belongs to the customer in Milla', () => {
    expect(vida, 'no approve action may be wired').not.toMatch(/lifecycle\(\s*'approve'/)
    expect(vida).not.toContain("case 'approve':")
    expect(vida).not.toMatch(/programmes\/\$\{[^}]*\}\/approve/)
  })

  it('READY_FOR_APPROVAL says so, and offers no way through', () => {
    expect(vidaRaw).toContain('Awaiting client approval in Milla')
  })

  it('exactly the seven approved controls exist, and no eighth', () => {
    const actions = [...vida.matchAll(/lifecycle\('([^']+)'/g)].map(m => m[1])
    expect(new Set(actions)).toEqual(new Set([
      'create', 'recommend', 'await-first-payment',
      'authorise/first', 'ready-for-approval', 'authorise/second', 'go-live',
    ]))
  })

  it('visibility mirrors the backend gates', () => {
    expect(vida).toContain("case 'authorise/first':      return p.status === 'AWAITING_FIRST_PAYMENT' && !p1Paid && !p.first_authorised_at")
    expect(vida).toContain("case 'authorise/second':     return p.status === 'APPROVED' && !!p.approved_at && !p2Paid && !p.second_authorised_at")
    expect(vida).toContain("case 'go-live':              return p.status === 'APPROVED' && !!p.approved_at && !p.went_live_at && p2Ok")
  })

  it('the wording is "P1/P2 internally" and never implies money', () => {
    expect(vidaRaw).toContain('Authorise P1 internally')
    expect(vidaRaw).toContain('Authorise P2 internally')
    expect(vidaRaw).not.toContain('Authorise Payment 1 internally')
    expect(vidaRaw).toContain('internal authority')
    // Move to P1 must say no checkout is created; internal authority must say no money.
    expect(vidaRaw).toContain('No checkout is created')
    expect(vidaRaw).toContain('No money is recorded')
  })

  it('Create programme has NO default meeting target', () => {
    expect(vida).toContain("const [lcMeetings, setLcMeetings] = useState('')")
    expect(vida).toContain("disabled={lcBusy !== null || !lcMeetings.trim()}")
  })

  it('and the await-first-payment route creates no Stripe session', () => {
    const routes = strip(raw(join(API, 'routes/programme.ts')))
    const at = routes.indexOf("programmeRouter.post('/:id/await-first-payment'")
    expect(at).toBeGreaterThan(-1)
    const fn = routes.slice(at, at + 400)
    expect(fn).toContain('awaitFirstPayment(req.params.id)')
    expect(fn).not.toContain('createProgrammeCheckoutSession')
    expect(fn).not.toContain('stripe')
  })
})
