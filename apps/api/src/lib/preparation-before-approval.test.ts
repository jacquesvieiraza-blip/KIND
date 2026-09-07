// ═══════════════════════════════════════════════════════════════════════════════════════
// PREPARATION HAPPENS BEFORE APPROVAL, AND PREPARATION IS NON-SENDING (founder-locked 7 Sep).
//
// 🛑 THE DEADLOCK. `READY_FOR_APPROVAL` means *a human may now look at what will run, and
// approve it* — so the campaign, the sequence, the words, the timing, the sender and the
// audience have to EXIST before the question is put. Preparation was gated at APPROVED, i.e.
// strictly after, so the customer was being asked to approve work that could not yet exist.
//
// **THE RULING:** *"Campaign + sequence + messaging + cadence + sender + prepared enrolments
// must exist before the client is asked to approve. Preparation is NON-SENDING. P1 allows
// sourcing/preparation only. Approval does not send. P2 does not Make Live. Make Live does not
// broadly enable uncontrolled sending."*
//
// ⚠️ THE DANGER IN MOVING PREPARATION EARLIER IS OBVIOUS AND MUST BE PROVED AWAY, not argued
// away: work that exists earlier is work that could LEAVE earlier. Every case in ② exists to
// show that preparing grants nothing — not approval, not Payment 2, not LIVE, not a send.
//
// ⚠️ AND THE PROOF IS STRUCTURAL WHERE IT CAN BE. A pre-approval campaign is a DRAFT, because
// `activate: true` is the only door to `status: 'active'` — the status the outreach machinery
// looks for — and a pre-approval enrolment is inert because OUTREACH authority requires
// approval AND Payment 2 AND status LIVE. Neither is a flag somebody has to remember.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

vi.hoisted(() => {
  process.env.SUPABASE_URL ??= 'http://localhost:54321'
  process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'test-service-role-key'
  process.env.SUPABASE_ANON_KEY ??= 'test-anon-key'
})

import {
  preparationStageFor, PRE_APPROVAL_PREPARABLE, POST_APPROVAL_PREPARABLE,
} from './programme-preparation'
import type { ProgrammeRow } from './programme'

/** Executable lines only — a promise made in a comment is not a property of the code. */
const code = (f: string) => readFileSync(join(__dirname, f), 'utf8')
  .split('\n').filter(l => { const t = l.trim(); return t && !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*') }).join('\n')

const P = (over: Partial<ProgrammeRow> = {}): ProgrammeRow => ({
  id: 'prog-1', client_id: 'house', status: 'SOURCING_AUTHORISED',
  first_authorised_at: 'i1', second_authorised_at: null,
  first_paid_at: null, second_paid_at: null,
  first_payment_ref: null, second_payment_ref: null,
  approved_at: null, paused_at: null, went_live_at: null,
  ...over,
} as unknown as ProgrammeRow)

// ── ① THE STAGE DECISION ─────────────────────────────────────────────────────────────

describe('① which preparation authority a programme holds', () => {
  it('🛑 P1 authorises PRE-APPROVAL preparation — the deadlock, broken', () => {
    for (const status of PRE_APPROVAL_PREPARABLE) {
      const v = preparationStageFor(P({ status: status as ProgrammeRow['status'] }))
      expect(v.ok, `${status} cannot prepare, so the client is still asked to approve nothing`).toBe(true)
      expect(v.ok && v.stage).toBe('pre_approval')
    }
  })

  it('🛑 and P1 is the FLOOR — nothing prepares on nothing', () => {
    const v = preparationStageFor(P({ first_authorised_at: null, first_paid_at: null }))
    expect(v.ok).toBe(false)
    expect(!v.ok && v.reason).toMatch(/P1/)
  })

  it('the POST-approval rule is unchanged: an approval recorded AND P2', () => {
    for (const status of POST_APPROVAL_PREPARABLE) {
      const s = status as ProgrammeRow['status']
      expect(preparationStageFor(P({ status: s, approved_at: null, second_authorised_at: 'i2' })).ok,
        'an APPROVED-status programme with no approval row prepares').toBe(false)
      expect(preparationStageFor(P({ status: s, approved_at: 'a', second_authorised_at: null })).ok,
        'P2 is no longer required after approval').toBe(false)
      const v = preparationStageFor(P({ status: s, approved_at: 'a', second_authorised_at: 'i2' }))
      expect(v.ok).toBe(true)
      expect(v.ok && v.stage).toBe('post_approval')
    }
  })

  it('🛑 paused and terminal still refuse, at BOTH stages', () => {
    expect(preparationStageFor(P({ paused_at: 'p' })).ok).toBe(false)
    expect(preparationStageFor(P({ status: 'CANCELLED' })).ok).toBe(false)
    expect(preparationStageFor(P({ status: 'COMPLETED', approved_at: 'a', second_authorised_at: 'i2' })).ok).toBe(false)
  })

  it('a programme that has not reached sourcing authority prepares nothing', () => {
    for (const status of ['DRAFT', 'RECOMMENDED', 'AWAITING_FIRST_PAYMENT'] as const) {
      expect(preparationStageFor(P({ status })).ok, status).toBe(false)
    }
  })
})

// ── ② PREPARATION GRANTS NOTHING — 6, 7, 8, 9 ────────────────────────────────────────

describe('② preparing does not approve, does not pay, does not go live and does not send', () => {
  const PREP = code('./programme-preparation.ts')

  it('🛑 6 · it cannot send — no send call exists anywhere in the module', () => {
    for (const banned of ['sendSequenceEmail', 'sendDay1OutreachBatch', 'sendManualReply',
                          'sendConsentEmail', 'dispatchLinkedInStep', 'enqueueLinkedInStep']) {
      expect(PREP, `preparation reaches ${banned}`).not.toContain(banned)
    }
  })

  // ⚠️ WRITE SHAPES, NOT STATUS NAMES. The module legitimately NAMES 'APPROVED' and 'LIVE' —
  // `POST_APPROVAL_PREPARABLE` is the list of statuses that hold post-approval authority, and a
  // guard that flagged it would be flagging the rule itself. What must never appear is a WRITE.
  it('🛑 7 · it cannot approve', () => {
    for (const banned of ["status: 'APPROVED'", 'approved_at:', 'approveProgramme(', 'approveProgrammeAsCustomer']) {
      expect(PREP, `preparation writes ${banned}`).not.toContain(banned)
    }
  })

  it('🛑 8 · it cannot authorise Payment 2', () => {
    for (const banned of ['second_authorised_at:', 'second_paid_at:', 'authoriseSecondInternal',
                          'recordSecondPayment']) {
      expect(PREP, `preparation grants ${banned}`).not.toContain(banned)
    }
  })

  it('🛑 9 · it cannot make a programme LIVE', () => {
    for (const banned of ["status: 'LIVE'", 'went_live_at:', 'goLiveProgramme', 'setStatus(']) {
      expect(PREP, `preparation grants ${banned}`).not.toContain(banned)
    }
  })

  it('🛑 and it writes no programme status at all — the whole module touches one table', () => {
    // Enrolments and campaigns are created through their own modules; the only thing this file
    // writes directly is nothing. A `programmes` update here would be the grant.
    expect(PREP).not.toContain("db.from('programmes').update")
  })

  it('🛑 6 (structural) · the pre-approval campaign is a DRAFT, and that IS the send door', () => {
    // `activate: true` is the only door to `status: 'active'`, which is what the outreach
    // machinery looks for. Withholding it is a structural guarantee, not a promise.
    expect(PREP).toContain("stage.stage === 'post_approval'")
    expect(PREP).toContain("? { activate: true, goingLive: { programmeId } }")
    expect(PREP).toContain(': { activate: false })')
  })

  it('🛑 activation still demands an approval and Payment 2 — assertGoingLive is untouched', () => {
    const at = PREP.indexOf('export async function assertGoingLive')
    expect(at).toBeGreaterThan(-1)
    const body = PREP.slice(at, PREP.indexOf('export async function prepareProgrammeOutreach'))
    expect(body, 'the go-live gate was staged too, so preparation can activate a campaign')
      .toContain("if (!p.approved_at) return { ok: false, reason: 'programme has no approval recorded' }")
    expect(body).toContain('if (!p2Authorised(p))')
    expect(body).toContain('POST_APPROVAL_PREPARABLE.includes(p.status)')
  })

  it('🛑 an enrolment made before approval is INERT — OUTREACH still needs approval + P2 + LIVE', () => {
    const AUTH = code('./programme-authority.ts')
    const at = AUTH.indexOf("if (action === 'OUTREACH') {")
    expect(at, 'the OUTREACH branch has moved — re-read this guard').toBeGreaterThan(-1)
    const body = AUTH.slice(at, at + 1400)
    expect(body, 'OUTREACH no longer requires Payment 2').toContain('p2Authorised')
    expect(body, 'OUTREACH no longer requires an approval').toContain('approved_at')
    // The LIVE requirement is delegated to `mayStartCampaign` — the existing go-live rule,
    // reused rather than restated. Asserting the delegation is asserting the requirement.
    expect(body, 'OUTREACH no longer consults the go-live rule').toContain('mayStartCampaign(p)')
    expect(body).toContain("refuse('programme_not_live'")
  })
})

// ── ③ THE SEQUENCE LINK — 10, 11, 12, 25 ─────────────────────────────────────────────

describe('③ programme work resolves programme → campaign → sequence, positively', () => {
  const CHAIN = code('./programme-chain.ts')

  it('🛑 10 · the sequence is NEVER resolved by client_id', () => {
    const at = CHAIN.indexOf("db.from('figsy_sequences')")
    expect(at, 'the sequence read has moved — re-read this guard').toBeGreaterThan(-1)
    const read = CHAIN.slice(at, CHAIN.indexOf('\n', CHAIN.indexOf('.eq(', at)) + 1)
    expect(read, 'the sequence is found by client, which is how a retired desk becomes current')
      .toContain(".eq('campaign_id', chain.campaignId)")
    expect(read).not.toContain(".eq('client_id'")
  })

  it('🛑 25 · there is no "newest client sequence" fallback anywhere', () => {
    for (const banned of ["order('created_at'", '.limit(1)', 'newest']) {
      expect(CHAIN, `the chain reaches for ${banned} — that is an inference, not a link`)
        .not.toContain(banned)
    }
  })

  it('🛑 11 · a sequence belonging to another campaign is invisible to this programme', () => {
    // The read is keyed on THIS campaign's id, so a sequence pointing at a different campaign
    // is not filtered out afterwards — it is never returned. Nothing to leak.
    expect(CHAIN).toContain(".eq('campaign_id', chain.campaignId)")
  })

  it('🛑 12 · the campaign is found through the programme\'s OWN ICP, never through the client', () => {
    const at = CHAIN.indexOf("db.from('figsy_campaigns')")
    const read = CHAIN.slice(at, at + 200)
    expect(read).toContain(".eq('icp_id', chain.icpId)")
    expect(read).not.toContain(".eq('client_id'")
    // And the ICP itself is found by `programme_id`, never by `is_active`.
    expect(CHAIN).toContain(".eq('programme_id', programmeId)")
    expect(CHAIN).not.toContain("is_active")
  })

  it('🛑 client_id appears ONLY as a tenancy filter on rows already found positively', () => {
    // Every `client_id` use in this module is `.filter(r => r.client_id === clientId)` on a
    // result set — never `.eq('client_id', …)` in a query, which is how a row would be FOUND.
    expect(CHAIN).not.toContain(".eq('client_id'")
    expect((CHAIN.match(/r\.client_id === clientId/g) ?? []).length,
      'the tenancy checks on the three resolved rows are gone').toBeGreaterThanOrEqual(3)
  })

  it('🛑 AMBIGUITY IS A REFUSAL, never a pick — two candidates resolve to neither', () => {
    for (const ambiguous of ['attached ICPs, so "the" campaign and sequence are ambiguous',
                             'campaigns, so which one the customer would be approving is ambiguous',
                             'sequences, so the words the customer would approve are ambiguous']) {
      expect(CHAIN, 'an ambiguous chain quietly picks one again').toContain(ambiguous)
    }
  })

  it('a read failure is `ok: false`, never an empty chain', () => {
    // `{ campaignId: null }` from a failed read would present as "no campaign yet", which the
    // readiness rule reports as a fixable blocker rather than as a system it could not see.
    expect((CHAIN.match(/return \{ ok: false, degraded:/g) ?? []).length).toBeGreaterThanOrEqual(4)
  })

  it('the migration adds the link WITHOUT relinking history', () => {
    const SQL = readFileSync(join(__dirname, '../../../../supabase/migrations/20260907_preparation_snapshot.sql'), 'utf8')
    const exec = SQL.split('\n').filter(l => !l.trim().startsWith('--')).join('\n')
    expect(exec).toContain('ADD COLUMN IF NOT EXISTS campaign_id uuid REFERENCES public.figsy_campaigns(id) ON DELETE SET NULL')
    // 🛑 NO BACKFILL. A guessed campaign for a historical sequence IS the leak this column
    // exists to stop, and a migration is exactly where somebody would helpfully add one.
    expect(exec, 'the migration backfills campaign_id — that is the leak, not the fix')
      .not.toMatch(/UPDATE\s+public\.figsy_sequences/i)
    expect(exec).not.toMatch(/ON DELETE CASCADE/i)
  })
})

// ── ④ READINESS USES THE SAME CHAIN THE SNAPSHOT DOES ────────────────────────────────

describe('④ one resolution, so the approved thing and the frozen thing cannot differ', () => {
  it('🛑 readiness and the snapshot both go through resolveProgrammeChain', () => {
    expect(code('./preparation-readiness.ts')).toContain('resolveProgrammeChain(programmeId)')
    expect(code('./preparation-snapshot.ts')).toContain('resolveProgrammeChain(programmeId)')
  })

  it('readiness no longer reads sequences by client', () => {
    const READY = code('./preparation-readiness.ts')
    expect(READY, 'the old client-scoped sequence read is back').not.toContain("db.from('figsy_sequences')")
  })
})
