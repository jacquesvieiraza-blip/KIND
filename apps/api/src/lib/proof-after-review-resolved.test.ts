// ═══════════════════════════════════════════════════════════════════════════════════════
// S1-RT-004 — RESOLVING THE ICP REVIEW CONTINUES INTO THE FIRST FREE PROOF RUN, ONCE.
//
// 🛑 THE RUNTIME DEFECT. Juniper Ridge Consulting finished its Brief, was promoted, and
// reached the Proof desk. `POST /icps/:id/proof` refused with `needs_icp_review` because
// "10-100 employees" is not a value any provider takes. An operator translated it in Vida
// (11–50 + 51–200) and the review resolved correctly — and NOTHING STARTED PROOF:
// `proof_started_at` NULL, no `proof_pass_claims` row, no `icp_run_outcomes` row, no leads,
// Apollo never called. The client's only start door is the confirmation screen they had
// already passed, and no Vida control issues that POST.
//
// ⚠️ THE FIXTURE IS JUNIPER RIDGE'S PERSISTED SHAPE: active draft ICP, unresolved
// `icp_review` on `company_sizes`, `proof_started_at` NULL, zero claims, zero runs.
//
// ⚠️ IDEMPOTENCY IS ASSERTED THROUGH THE CLAIM LEDGER, never a second fence. The double is
// `claim_proof_authority`'s own contract: one grant, then `in_flight`.
//
// Mocks only. No provider, no network, no database, nothing sourced, nothing sent.
// ═══════════════════════════════════════════════════════════════════════════════════════

process.env.SUPABASE_URL ??= 'http://localhost:54321'
process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'test-service-role'

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

type Row = Record<string, any>

const CLIENT = 'client-juniper'
const ICP = 'icp-juniper'

/** Every runIcpJob invocation, with the options it was given. */
let runs: Array<{ icpId: string; clientId: string; userId: string; cap: number; opts: Row | undefined }> = []
/** Every claim_proof_authority call — the authority ledger's own door. */
let claims: number

/** Juniper Ridge's persisted shape: an owned, unfunded prospect who has never entered Proof. */
const prospect = (): Row => ({ user_id: 'auth-user-juniper', proof_passes_done: 0, proof_started_at: null })

/** The `clients` row and the `credit_transactions` rows the fence reads. Both are read by the
 *  db double AT CALL TIME, so a test can shape them after the module factory was registered. */
let clientRow: Row | null = prospect()
let clientError: { message: string } | null = null
let fundingRows: Row[] = []
let fundingError: { message: string } | null = null

function installMocks() {
  runs = []
  claims = 0
  clientRow = prospect()
  clientError = null
  fundingRows = []
  fundingError = null
  vi.doMock('./alerts', () => ({ sendFounderAlert: async () => ({ delivered: true }) }))
  vi.doMock('./proof-claim', () => ({
    // ⚠️ THE REAL CONTRACT: one grant per client, then `in_flight`. That is the ledger's
    // idempotency, and it is the ONLY fence this feature relies on.
    claimProofAuthority: async () => {
      claims += 1
      return claims === 1
        ? { ok: true, claimId: 'claim-1', authority: 'PROOF', pass: 1, kind: 'automatic' }
        : { ok: false, reason: 'in_flight' }
    },
    settleProofClaim: async () => ({ settled: true }),
  }))
  vi.doMock('../routes/icps', () => ({
    PROOF_PASS_LEADS: 20,
    recordRunOutcome: async () => undefined,
    runIcpJob: async (icpId: string, clientId: string, userId: string, cap: number, o?: Row) => {
      runs.push({ icpId, clientId, userId, cap, opts: o })
      return { inserted: 0, skipped: 0, relaxed: null, terminal: 'completed' }
    },
  }))
  vi.doMock('@kind/db', () => ({
    db: {
      from: (table: string) => {
        const q: any = {}
        for (const m of ['select', 'eq', 'is', 'not', 'or', 'update', 'order', 'limit']) q[m] = () => q
        if (table === 'credit_transactions') {
          // ⚠️ THE FUNDING READ IS AWAITED WITHOUT `.maybeSingle()`, exactly as the proof route
          // reads it — a supabase builder is thenable. The double has to be one too, or the
          // fence would hang rather than fail.
          q.then = (resolve: (v: unknown) => unknown) => resolve({ data: fundingRows, error: fundingError })
        } else {
          q.maybeSingle = async () => ({ data: clientRow, error: clientError })
        }
        return q
      },
    },
  }))
}

/** The launch is fire-and-forget and resolves dynamic imports, so poll rather than sleep. */
async function settle(expected: number, ms = 2000): Promise<void> {
  const until = Date.now() + ms
  while (runs.length < expected && Date.now() < until) await new Promise(r => setTimeout(r, 10))
  await new Promise(r => setTimeout(r, 60))   // let a SECOND, unwanted launch arrive if it is coming
}

beforeEach(() => { vi.resetModules(); installMocks() })
afterEach(() => { vi.restoreAllMocks(); vi.resetModules() })

const ICPS_SRC     = readFileSync(join(process.cwd(), 'apps/api/src/routes/icps.ts'), 'utf8')
const OPERATOR_SRC = readFileSync(join(process.cwd(), 'apps/api/src/routes/operator.ts'), 'utf8')
const LAUNCH_SRC   = readFileSync(join(process.cwd(), 'apps/api/src/lib/proof-run-launch.ts'), 'utf8')
/** `proof-run-launch.ts` with its comment lines removed — for assertions about CODE, never
 *  prose. A guard that matches a comment quoting the thing it bans proves nothing. */
const LAUNCH_CODE  = LAUNCH_SRC.split('\n')
  .filter(l => !l.trim().startsWith('//') && !l.trim().startsWith('*')).join('\n')

describe('① an unresolved ICP review blocks Proof before anything is claimed', () => {
  it('the proof route refuses with needs_icp_review and returns BEFORE the claim', () => {
    const gate  = ICPS_SRC.indexOf("code: 'needs_icp_review'")
    const claim = ICPS_SRC.indexOf('claimProofAuthority(clientId, req.params.id)')
    expect(gate, 'the needs_icp_review refusal exists').toBeGreaterThan(-1)
    expect(claim, 'the claim exists').toBeGreaterThan(-1)
    expect(gate, 'the refusal must PRECEDE the claim — nothing claimed, nothing spent').toBeLessThan(claim)
  })
})

describe('② resolution writes the translation, then continues — never the other way round', () => {
  it('the resolve handler writes the translated values and icp_review_resolved_at', () => {
    expect(OPERATOR_SRC).toContain('icp_review_resolved_at: now')
    expect(OPERATOR_SRC).toContain('...outcome.values')
  })

  it('the Proof continuation runs AFTER the write, the replay fence and the audit', () => {
    const write = OPERATOR_SRC.indexOf('icp_review_resolved_at: now')
    const fence = OPERATOR_SRC.indexOf(".is('icp_review_resolved_at', null)", write)
    const audit = OPERATOR_SRC.indexOf("action: 'icp_provider_review_resolved'", write)
    const cont  = OPERATOR_SRC.indexOf('continueProofAfterReviewResolved(clientId', write)
    expect(fence).toBeGreaterThan(write)
    expect(audit).toBeGreaterThan(fence)
    expect(cont, 'a human translation is never at risk from a provider failure').toBeGreaterThan(audit)
  })

  it('a failed Proof start never turns the resolution into an error response', () => {
    const cont = OPERATOR_SRC.indexOf('continueProofAfterReviewResolved(clientId')
    const tail = OPERATOR_SRC.slice(cont, cont + 1400)
    expect(tail).toContain('success: true')
    expect(tail, 'the response carries what actually happened').toContain('proof }')
  })
})

describe('③ resolution starts the free Proof path exactly once', () => {
  it('starts Proof, through claimProofAuthority, with Proof options', async () => {
    const { continueProofAfterReviewResolved } = await import('./proof-run-launch')
    const out = await continueProofAfterReviewResolved(CLIENT, ICP)

    expect(out.started, 'Proof started').toBe(true)
    if (out.started) { expect(out.pass).toBe(1); expect(out.kind).toBe('automatic') }
    expect(claims, 'authority came from the claim ledger').toBe(1)

    await settle(1)
    expect(runs, 'exactly one run').toHaveLength(1)
    expect(runs[0].icpId).toBe(ICP)
    expect(runs[0].clientId).toBe(CLIENT)
    // 🛑 PROOF MODE, NOT THE PAID PATH. Without these the run is an ordinary client sourcing
    // run — PDL behind AR8's cash fence, a budget no prospect has.
    expect(runs[0].opts, 'proof options are present').toBeTruthy()
    expect(runs[0].opts?.proofPass).toBe(1)
    expect(runs[0].opts?.proofKind).toBe('automatic')
    expect(runs[0].cap).toBe(20)
  })

  it('a replayed resolution cannot create a second run — the ledger answers in_flight', async () => {
    const { continueProofAfterReviewResolved } = await import('./proof-run-launch')
    const first  = await continueProofAfterReviewResolved(CLIENT, ICP)
    const second = await continueProofAfterReviewResolved(CLIENT, ICP)

    expect(first.started).toBe(true)
    expect(second.started, 'no duplicate').toBe(false)
    if (!second.started) expect(second.reason).toBe('already_started')

    await settle(1)
    expect(runs, 'still exactly one run').toHaveLength(1)
  })

  it('a client row with no owner user starts nothing, and says so', async () => {
    clientRow = { ...prospect(), user_id: null }
    const { continueProofAfterReviewResolved } = await import('./proof-run-launch')
    const out = await continueProofAfterReviewResolved(CLIENT, ICP)
    expect(out.started).toBe(false)
    if (!out.started) expect(out.reason).toBe('not_eligible')
    expect(claims, 'no authority is claimed for a run that cannot notify anybody').toBe(0)
    await settle(0)
    expect(runs).toHaveLength(0)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ⑤ THE ELIGIBILITY FENCE — a resolved review is not, by itself, "start Proof".
//
// 🛑 THE DEFECT THIS GROUP PINS. `POST /operator/icp-review/:icpId/resolve` is GENERIC: it
// translates a provider review on ANY client's ICP, including a live paying one. The first cut
// of the continuation proved only that the client row had an owner, so an ordinary operator
// translation for a FUNDED client would have claimed a free Proof pass and started a free run
// nobody asked for. Every test below resolves successfully and starts NOTHING.
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('⑤ only a genuine pre-first-free-Proof prospect continues into a run', () => {
  /** Resolve, then assert the review stands and absolutely nothing Proof-shaped happened. */
  async function resolvesButStartsNothing(expectDetail: RegExp) {
    const { continueProofAfterReviewResolved } = await import('./proof-run-launch')
    const out = await continueProofAfterReviewResolved(CLIENT, ICP)
    expect(out.started, 'no Proof run').toBe(false)
    if (!out.started) {
      expect(out.reason).toBe('not_eligible')
      expect('detail' in out ? out.detail : '', 'the reason is truthful and specific').toMatch(expectDetail)
    }
    // 🛑 THE MONEY/AUTHORITY ASSERTION. Not "the run was refused later" — the ledger was never
    // asked, so no pass could be held, consumed or released by this path at all.
    expect(claims, 'claimProofAuthority was NEVER called').toBe(0)
    await settle(0)
    expect(runs, 'runIcpJob was NEVER called').toHaveLength(0)
  }

  it('CASE B — a client funded with real money starts nothing', async () => {
    // The exact shape `fundedVia` calls 'real': a purchase type carrying a provider reference.
    fundingRows = [{ type: 'purchase', reference: 'cs_test_123' }]
    await resolvesButStartsNothing(/already live \(funded\)/)
  })

  it('CASE B — a COMPED client starts nothing either', async () => {
    // `manual_grant` is entitled, not paid — and `fundedVia` returns 'comp', not null. A comped
    // account is live; its leads come through its campaign.
    fundingRows = [{ type: 'manual_grant', reference: null }]
    await resolvesButStartsNothing(/already live \(comped\)/)
  })

  it('a usage row is NOT funding — the real classifier decides, not a substring', async () => {
    // ⚠️ THE FENCE MUST NOT OVER-REFUSE EITHER. `usage` is outside PAID_TX_TYPES, so a prospect
    // with ledger rows that are not funding is still a prospect. This is the same `fundedVia`
    // the proof route and the money surfaces use — no second definition (#619).
    fundingRows = [{ type: 'usage', reference: 'lead_1' }]
    const { continueProofAfterReviewResolved } = await import('./proof-run-launch')
    const out = await continueProofAfterReviewResolved(CLIENT, ICP)
    expect(out.started, 'an unfunded prospect still continues').toBe(true)
    await settle(1)
    expect(runs).toHaveLength(1)
  })

  it('CASE C — a client who has already USED a free Proof pass starts nothing', async () => {
    clientRow = { ...prospect(), proof_passes_done: 1 }
    await resolvesButStartsNothing(/already used 1 free Proof pass/)
  })

  it('CASE C — a client whose FIRST Proof run crashed starts nothing (counter 0, stamp set)', async () => {
    // 🛑 THE GAP THE COUNTER CANNOT SEE. A released claim leaves `proof_passes_done` at 0 while
    // `proof_started_at` is stamped. They have entered Proof and still hold the attempt —
    // spending it is THEIR decision at their own door, not a side effect of an operator's save.
    clientRow = { ...prospect(), proof_started_at: '2026-09-15T10:00:00.000Z' }
    await resolvesButStartsNothing(/already entered Proof/)
  })

  it('an unreadable funding ledger FAILS CLOSED — a maybe is not a prospect', async () => {
    fundingError = { message: 'permission denied for table credit_transactions' }
    await resolvesButStartsNothing(/funding state could not be read/)
  })

  it('an unreadable client row fails closed too', async () => {
    clientError = { message: 'connection reset' }
    await resolvesButStartsNothing(/client row could not be read/)
  })

  it('the fence runs BEFORE the claim, and can only refuse', () => {
    const fence = LAUNCH_SRC.indexOf('await firstFreeProofEligibility(clientId)')
    const claim = LAUNCH_SRC.indexOf("await import('./proof-claim')", fence)
    expect(fence, 'the fence exists').toBeGreaterThan(-1)
    expect(claim, 'the claim follows it').toBeGreaterThan(fence)
    // It returns a refusal or a userId — there is no branch in which it grants authority.
    const body = LAUNCH_CODE.slice(
      LAUNCH_CODE.indexOf('export async function firstFreeProofEligibility'),
      LAUNCH_CODE.indexOf('/** What the operator'),
    )
    for (const forbidden of ['claimProofAuthority', 'launchProofRun', 'proof_pass_claims', 'try_claim_proof_pass', 'rpc(']) {
      expect(body, `the fence must not touch ${forbidden}`).not.toContain(forbidden)
    }
  })

  it('there is ONE funding definition, and it is the shared classifier', () => {
    expect(LAUNCH_SRC, 'reuses fundedVia').toContain('fundedVia(')
    // 🛑 NO SECOND COMMERCIAL TRUTH. Re-listing transaction types here is exactly how six
    // inlined copies came to disagree (#619) — the classifier owns them, this file must not.
    for (const txType of ["'wallet_topup'", "'purchase'", "'credit_purchase'", "'manual_grant'"]) {
      expect(LAUNCH_SRC, `must not re-declare ${txType}`).not.toContain(txType)
    }
  })

  it('claimProofAuthority is still the ONLY authority owner', () => {
    expect((LAUNCH_CODE.match(/claimProofAuthority\(/g) ?? []).length, 'claimed in exactly one place').toBe(1)
    expect(LAUNCH_CODE, 'no second ledger write').not.toContain("from('proof_pass_claims')")
    expect(LAUNCH_CODE, 'no second claim RPC').not.toContain('try_claim_proof_pass')
    expect(LAUNCH_CODE, 'no direct RPC of any kind').not.toContain('db.rpc(')
  })
})

describe('④ the paid sourcing paths and every commercial boundary are untouched', () => {
  it('Vida GO / activate still calls runIcpJob with NO proof options', () => {
    expect(ICPS_SRC).toContain('runIcpJob(req.params.id, clientId, ownerUserId, credits > 0 ? credits : 20)')
  })

  it('/icps/:id/run still calls runIcpJob with NO proof options', () => {
    expect(ICPS_SRC).toContain('runIcpJob(req.params.id, clientId, req.userId!, effectiveBalance)')
  })

  it('the shared boundary creates no payment, reveal, send, enrolment or Make Live authority', () => {
    for (const forbidden of [
      'revealed_at', 'wallet', 'pack_', 'autoEnrollLead',
      'sendDay1OutreachBatch', 'assertGoingLive', 'markReadyForApproval', 'enrichAndDeliverLeads',
    ]) {
      expect(LAUNCH_CODE, `must not touch ${forbidden}`).not.toContain(forbidden)
    }
  })

  // ⛓️ 16 Sep (S1-RT-004 correction) — `credit_transactions` CAME OUT OF THE BLUNT LIST ABOVE
  // AND INTO THIS, WHICH IS STRICTER, NOT LOOSER. The eligibility fence must READ the funding
  // ledger — refusing a live client is the whole point of it, and reading creates no payment
  // authority whatsoever. What must never appear is a WRITE, an unscoped read, or a second
  // read site that could drift. All three are pinned here, where one substring ban used to be.
  it('the funding ledger is READ, in exactly one place, and never written', () => {
    expect((LAUNCH_CODE.match(/from\('credit_transactions'\)/g) ?? []).length,
      'read in exactly one place').toBe(1)
    expect(LAUNCH_CODE, 'and only the two columns the classifier reads')
      .toContain("select('type, reference')")
    for (const verb of ['insert', 'update', 'upsert', 'delete']) {
      expect(LAUNCH_CODE, `must never ${verb} the funding ledger`)
        .not.toMatch(new RegExp(`from\\('credit_transactions'\\)[\\s\\S]{0,240}\\.${verb}\\(`))
    }
    // No money may be moved from this file by any route, ledger or not.
    expect(LAUNCH_CODE, 'no charge').not.toContain('try_charge_wallet')
    expect(LAUNCH_CODE, 'no grant').not.toContain('manual_grant')
  })

  it('the proof route still owns its own gates — only the run tail is shared', () => {
    expect(ICPS_SRC).toContain("code: 'needs_icp_review'")
    expect(ICPS_SRC).toContain('already_started: true')
    expect(ICPS_SRC, 'the route launches through the shared boundary').toContain('launchProofRun({')
  })

  it('there is exactly ONE Proof run dispatch in the codebase — no duplicated tail', () => {
    expect((ICPS_SRC.match(/proofPass: claimed/g) ?? []).length, 'the route no longer dispatches directly').toBe(0)
    expect((LAUNCH_SRC.match(/proofPass: claimed/g) ?? []).length, 'the shared boundary dispatches once').toBe(1)
  })
})
