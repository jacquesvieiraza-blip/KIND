// ═══════════════════════════════════════════════════════════════════════════════════════
// 🛑 THE CLIENT NEVER CHOSE ANYTHING.
//
// ── WHAT THE 10 SEP AUDIT FOUND (items B and C) ─────────────────────────────────────────
//
// The founder's flow is: Proof completes → the client opens the CALCULATOR in Milla → they
// choose a meeting target → that becomes the recommendation → they accept → P1. In the code:
//
//   · There was no calculator in Milla. Every `meeting_target` reference in `apps/portal` was
//     display-only; no input, no slider, no call to a quote.
//   · The only `programmes` INSERT was `createProgramme(clientId, meetings)` behind
//     `POST /programmes`, admin-key only, fed by an OPERATOR typing into a Vida box captioned
//     "Meeting target" that rendered while the client was still at Proof.
//   · `GET /programmes/quote/:meetings` returned exactly the right figures and sat behind the
//     admin key. The portal never called it.
//   · The client never saw `recommended_volume` at all — `/my/programme` did not select it.
//   · And the payment card rendered **$0**, because the same reader read
//     `first_payment_cents` / `second_payment_cents` without selecting them.
//
// The only calculator in the repo was `apps/website/pipeline-calculator.html`, a marketing
// page on the retired $4-per-approved-lead model. Nothing here derives from it.
//
// Mocks only. No provider, no database, no network, no money moved.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

vi.mock('@kind/db', () => ({ db: {} }))

import {
  calculateProgramme, meetingTargetProblem, programmeMatchesQuote,
  quoteProgramme, LEADS_PER_TARGETED_MEETING, MIN_LEADS_PER_MEETING,
  TARGET_NOT_GUARANTEE, ILLUSTRATIVE_LABEL, ProgrammePricingError,
} from '@kind/shared'
import { PENDING_MIGRATIONS } from './pending-migrations'

const API = join(__dirname, '..')
const PORTAL = join(API, '..', '..', 'portal', 'src')
const raw = (p: string) => readFileSync(p, 'utf8')
const code = (s: string) => s.split('\n')
  .filter(l => { const t = l.trim(); return t && !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*') && !t.startsWith('{/*') })
  .join('\n')

const CHOICE = raw(join(API, 'lib', 'client-programme-choice.ts'))
const ROUTES = raw(join(API, 'routes', 'my-programme.ts'))
const READER = raw(join(API, 'lib', 'customer-programme.ts'))
const CALC_UI = raw(join(PORTAL, 'components', 'milla', 'ProgrammeCalculator.tsx'))
const PROG_PAGE = raw(join(PORTAL, 'app', '(milla)', 'milla', 'programme', 'page.tsx'))
const VIDA = raw(join(API, '..', '..', 'admin', 'src', 'app', 'vida', 'page.tsx'))

describe('🛑 ① every committed figure is the curve\'s, not the calculator\'s', () => {
  it('price, split and per-meeting cost come straight from quoteProgramme', () => {
    for (const meetings of [1, 7, 10, 23, 50, 120]) {
      const q = quoteProgramme(meetings)
      const r = calculateProgramme({ meetings })
      expect(r.totalCents, `total at ${meetings}`).toBe(q.totalCents)
      expect(r.firstPaymentCents).toBe(q.firstPaymentCents)
      expect(r.secondPaymentCents).toBe(q.secondPaymentCents)
      expect(r.effectiveCostPerMeetingCents).toBe(q.pricePerMeetingCents)
      // R81's founder lock: the halves partition the total exactly, odd cent to payment two.
      expect(r.firstPaymentCents + r.secondPaymentCents).toBe(r.totalCents)
    }
  })

  it('the default volume is the canonical benchmark — meetings × 250 (R77)', () => {
    const r = calculateProgramme({ meetings: 10 })
    expect(r.assumptions.leadsPerMeeting).toBe(LEADS_PER_TARGETED_MEETING)
    expect(r.recommendedVolume).toBe(10 * LEADS_PER_TARGETED_MEETING)
    expect(r.recommendedVolume).toBe(quoteProgramme(10).recommendedVolume)
  })

  it('🛑 leads-per-meeting is CLAMPED AT THE BENCHMARK — a client cannot buy more sourcing', () => {
    // The curve prices PER MEETING and is independent of volume, so an unclamped assumption
    // would let a client take four times the sourcing at the same price.
    const greedy = calculateProgramme({ meetings: 10, leadsPerMeeting: 1000 })
    expect(greedy.assumptions.leadsPerMeeting).toBe(LEADS_PER_TARGETED_MEETING)
    expect(greedy.recommendedVolume).toBe(2500)
    expect(greedy.totalCents).toBe(quoteProgramme(10).totalCents)
    // Lowering it is theirs to choose and only reduces what we spend.
    const modest = calculateProgramme({ meetings: 10, leadsPerMeeting: 100 })
    expect(modest.recommendedVolume).toBe(1000)
    expect(modest.totalCents, 'a lower volume changed the price').toBe(greedy.totalCents)
    // …and not below the floor, where a volume stops describing a deliverable programme.
    expect(calculateProgramme({ meetings: 10, leadsPerMeeting: 1 }).assumptions.leadsPerMeeting)
      .toBe(MIN_LEADS_PER_MEETING)
  })

  it('an impossible target is refused at the boundary, before any figure is produced', () => {
    for (const bad of [0, -3, 2.5]) {
      expect(() => calculateProgramme({ meetings: bad })).toThrow(ProgrammePricingError)
    }
    expect(meetingTargetProblem(0)).toBeTruthy()
    expect(meetingTargetProblem(2.5)).toBeTruthy()
    expect(meetingTargetProblem(10)).toBeNull()
  })

  it('🛑 there is no second pricing engine — the calculator imports the curve and multiplies nothing', () => {
    const c = code(raw(join(API, '..', '..', '..', 'packages', 'shared', 'src', 'programme-calculator.ts')))
    expect(c).toContain("from './programme-pricing'")
    // No anchor, no floor, no 450/437.5/400 re-typed anywhere in the calculator.
    for (const literal of ['450', '437.5', '400', '0.5', '/ 2']) {
      expect(c.includes(literal), `the calculator re-derives money: ${literal}`).toBe(false)
    }
  })
})

describe('🛑 ② illustrative is theirs, and it is never mistaken for ours', () => {
  it('clients, revenue and the multiple are arithmetic on the client\'s own figures', () => {
    const r = calculateProgramme({ meetings: 10, averageClientValue: 25000, meetingToClientPct: 25 })
    expect(r.estimatedClients).toBe(2.5)
    expect(r.estimatedRevenueCents).toBe(Math.round(2.5 * 25000 * 100))
    expect(r.revenueMultiple).toBeCloseTo(r.estimatedRevenueCents / r.totalCents, 6)
    expect(r.assumptions).toEqual({ leadsPerMeeting: 250, averageClientValue: 25000, meetingToClientPct: 25 })
  })

  it('🛑 no assumptions means NO multiple — never a "0×" verdict beside their price', () => {
    const r = calculateProgramme({ meetings: 10 })
    expect(r.estimatedRevenueCents).toBe(0)
    expect(r.revenueMultiple).toBeNull()
  })

  it('a half-filled form still answers, rather than refusing', () => {
    // A client modelling their own business must not be told the product is broken.
    const r = calculateProgramme({ meetings: 5, averageClientValue: 10000 })
    expect(r.totalCents).toBe(quoteProgramme(5).totalCents)
    expect(r.assumptions.meetingToClientPct).toBe(0)
  })

  it('nonsense assumptions are bounded, not kept', () => {
    const r = calculateProgramme({ meetings: 5, meetingToClientPct: 4000, averageClientValue: -9 })
    expect(r.assumptions.meetingToClientPct).toBe(100)
    expect(r.assumptions.averageClientValue).toBe(0)
  })

  it('both framings exist as constants, so no screen writes a softer version', () => {
    expect(TARGET_NOT_GUARANTEE).toContain('target, not a guarantee')
    expect(ILLUSTRATIVE_LABEL).toContain('not a forecast')
    // …and they travel WITH the numbers, from the server.
    const c = code(ROUTES)
    expect(c).toContain('target_note: TARGET_NOT_GUARANTEE')
    expect(c).toContain('illustrative_note: ILLUSTRATIVE_LABEL')
  })

  it('the screen renders them rather than composing its own', () => {
    const c = code(CALC_UI)
    expect(c).toContain('{calc?.target_note}')
    expect(c).toContain('{calc?.illustrative_note}')
    // 🛑 AND IT COMPUTES NO MONEY. A browser deriving a price is a second engine with the
    // client's own number attached.
    for (const forbidden of ['* 250', '/ 2', 'quoteProgramme(', 'pricePerMeeting']) {
      expect(c.includes(forbidden), `the calculator screen derives money: ${forbidden}`).toBe(false)
    }
  })
})

describe('🛑 ③ the CLIENT owns the choice, and the programme matches what they saw', () => {
  it('the client-facing routes exist and are client-authenticated', () => {
    const c = code(ROUTES)
    expect(c).toContain("myProgrammeRouter.get('/calculator'")
    expect(c).toContain("myProgrammeRouter.post('/choose'")
    expect(c).toContain("myProgrammeRouter.post('/accept'")
    // Every one resolves the caller's OWN client id — never a client id from the body.
    for (const m of c.match(/myProgrammeRouter\.(get|post)\('\/(calculator|choose|accept)'[\s\S]{0,400}/g) ?? []) {
      expect(m).toContain('await getClientId(req.userId!)')
      expect(m.includes('req.body?.clientId'), 'a client id came from the request').toBe(false)
    }
  })

  it('🛑 choosing is refused until Proof is complete, and it FAILS CLOSED', () => {
    const c = code(CHOICE)
    expect(c).toContain('if (!(await proofIsComplete(clientId)))')
    expect(c).toContain("reason: 'proof_incomplete'")
    // An unreadable answer refuses rather than letting a client past Proof on a hiccup.
    expect(c).toContain('if (error || !data) return false')
  })

  it('🛑 it takes no money and sources nothing', () => {
    const c = code(CHOICE)
    for (const forbidden of [
      'stripe', 'checkout', 'payment_intent', 'first_paid_at', 'sourcing_ceiling',
      'runIcpJob', 'sourceProgramme', 'pdl', 'apollo', 'try_spend_sourcing',
    ]) {
      expect(c.toLowerCase().includes(forbidden.toLowerCase()),
        `choosing reaches into money or sourcing: ${forbidden}`).toBe(false)
    }
  })

  it('IDEMPOTENT BY SHAPE — a second choice updates the same programme, never a second one', () => {
    const c = code(CHOICE)
    expect(c).toContain('const existing = await openProgrammeForClient(clientId)')
    expect(c).toContain('if (existing) {')
    // …and the re-choice rewrites every committed figure together, so a row cannot hold one
    // target and another target's price.
    for (const field of ['meeting_target:', 'recommended_volume:', 'price_total_cents:', 'first_payment_cents:', 'second_payment_cents:']) {
      expect(c, `a re-choice leaves ${field} stale`).toContain(field)
    }
  })

  it('🛑 the stored programme is COMPARED against what the client was shown', () => {
    // "The client accepted a number" is a commercial claim: if the row and the quote disagree,
    // they agreed to one price and owe another.
    expect(code(CHOICE)).toContain('if (!programmeMatchesQuote(')
    const r = calculateProgramme({ meetings: 10 })
    expect(programmeMatchesQuote(
      { meeting_target: 10, price_total_cents: r.totalCents, recommended_volume: r.recommendedVolume }, r)).toBe(true)
    expect(programmeMatchesQuote(
      { meeting_target: 11, price_total_cents: r.totalCents, recommended_volume: r.recommendedVolume }, r)).toBe(false)
    expect(programmeMatchesQuote(
      { meeting_target: 10, price_total_cents: r.totalCents + 1, recommended_volume: r.recommendedVolume }, r)).toBe(false)
  })

  it('a programme already under way cannot be re-priced from a browser', () => {
    const c = code(CHOICE)
    expect(c).toContain("const RECHOOSABLE = ['DRAFT', 'RECOMMENDED', 'AWAITING_FIRST_PAYMENT'] as const")
    expect(c).toContain("reason: 'locked'")
  })

  it('🛑 the ICP is attached automatically — no operator button on the healthy path', () => {
    const c = code(CHOICE)
    expect(c).toContain('const { attachIcpToProgramme } = await import(\'./programme-icp\')')
    expect(c).toContain('acceptedIcpFor(clientId)')
    // Resolved BEFORE anything is written: a programme with no targeting cannot source, and
    // the P1 continuation refuses without exactly one attached ICP.
    expect(c.indexOf('const icp = await acceptedIcpFor(clientId)'))
      .toBeLessThan(c.indexOf('const existing = await openProgrammeForClient(clientId)'))
    expect(c).toContain("reason: 'no_icp'")
  })

  it('acceptance is a fact SEPARATE from paying, and idempotent', () => {
    const c = code(CHOICE)
    expect(c).toContain('export async function acceptRecommendation')
    expect(c).toContain(".is('recommendation_accepted_at', null)")
    expect(c).toContain('alreadyAccepted: true')
    // 🛑 IT AUTHORISES NOTHING — the response says so in words.
    expect(code(ROUTES)).toContain("authorised: 'nothing — the first payment is the next, separate step'")
  })
})

describe('🛑 ④ the $0 payment card', () => {
  it('the reader now SELECTS the two amounts it reads', () => {
    const c = code(READER)
    expect(c).toContain('first_payment_cents, second_payment_cents')
    expect(c).toContain('firstPaymentCents: Number(p.first_payment_cents ?? 0)')
  })

  it('…and the recommended volume, which the client could not see at all', () => {
    const c = code(READER)
    expect(c).toContain('recommended_volume')
    expect(c).toContain('recommendedVolume: p.recommended_volume == null ? null : Number(p.recommended_volume)')
  })

  it('the assumptions are passed through, never re-derived', () => {
    expect(code(READER)).toContain("assumptions: (p.calculator_assumptions as CustomerProgramme['recommendation']['assumptions']) ?? null")
  })
})

describe('🛑 ⑤ the calculator is where the client already is, and Vida stops offering to type a target', () => {
  it('it renders at Recommendation, before a programme exists', () => {
    const c = code(PROG_PAGE)
    expect(c).toContain("{!p.hasProgramme && p.stage === 'Recommendation' && (")
    expect(c).toContain('<ProgrammeCalculator onChosen={() => { void load() }} />')
  })

  it('🛑 Vida no longer draws programme creation while the client is in Proof', () => {
    const c = code(VIDA)
    expect(c).toContain("prog.lifecycle?.verdict?.stage === 'signup' || prog.lifecycle?.verdict?.stage === 'proof'")
    expect(c).toContain('They choose their meeting target in Milla')
    // The admin primitive REMAINS, relabelled as recovery — it is not removed.
    expect(c).toContain('Create a programme — recovery')
  })
})

describe('⑥ the migration is additive and in all three homes', () => {
  const entry = PENDING_MIGRATIONS.find(m => m.key === '20260910_programme_calculator_choice')

  it('registered in the runner', () => { expect(entry).toBeTruthy() })

  it('two nullable columns, no default, no backfill, nothing destructive', () => {
    const sql = entry!.sql
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS calculator_assumptions      jsonb')
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS recommendation_accepted_at  timestamptz')
    expect(sql.includes('DEFAULT'), 'a column carries a default').toBe(false)
    expect(sql.includes('UPDATE public.programmes'), 'existing programmes were backfilled').toBe(false)
    for (const destructive of ['DROP COLUMN', 'DROP CONSTRAINT', 'DELETE FROM']) {
      expect(sql.includes(destructive), `destructive: ${destructive}`).toBe(false)
    }
  })

  it('declared in the schema of record, and filed in supabase/migrations', () => {
    const schema = raw(join(API, '..', '..', '..', 'packages', 'db', 'src', 'schema.sql'))
    expect(schema).toContain('calculator_assumptions     jsonb')
    const file = raw(join(API, '..', '..', '..', 'supabase', 'migrations', '20260910_programme_calculator_choice.sql'))
    expect(file).toContain('ADD COLUMN IF NOT EXISTS calculator_assumptions')
  })
})
