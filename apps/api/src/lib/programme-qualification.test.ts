// ═══════════════════════════════════════════════════════════════════════════════════════
// ENTITLEMENT IS CONSUMED BY QUALIFICATION — the thirty ways that could stop being true.
//
// 🛑 THE DEFECT THIS WHOLE SUITE BRACKETS. `sourced_used` was settled on `delivered_at`, the
// legacy self-serve VISIBILITY stamp — gated on the programme path by `deliveryCapBalance()`,
// which returns a CONSTANT 25 whatever the plan or balance, then by a ~5/day drip that runs no
// ICP gate at all. A 250-candidate batch would have settled at 25 used and released 225 of a
// customer's paid volume, and the historical House run reported `0 used` about 246 real people.
//
// ⚠️ WHERE EACH KIND OF PROOF IS USED, AND WHY. The qualification core and the surfacing act
// are driven BEHAVIOURALLY against a recording database — those are decisions, and a decision
// must be exercised. The RPC is asserted against its executable SQL (there is no Postgres in
// this suite, so its logic is pinned by structure, exactly as `programme-authority-gate.test.ts`
// pins the sourcing gate — CODE VERIFIED, not RUNTIME VERIFIED). The call-site rules — what the
// run path, the drip and preparation are wired to — are asserted on executable source with the
// comments stripped, because a rule described in a comment is not a rule.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

type Row = Record<string, unknown>

/** The lead rows the fake database holds, by id. */
let leads = new Map<string, Row>()
/** Every UPDATE applied, so "what was written" is answerable. */
const writes: { id: string; patch: Row }[] = []
/** Apollo ids this run actually sent to the provider. THE cost ledger of this suite. */
let revealedIds: string[] = []
/** What the provider answers with, keyed by apollo id. */
let providerAnswers = new Map<string, { email: string; email_status: string | null; country: string | null; last_name: string | null }>()
/** When true the provider door throws, exactly as the zero-spend guard does. */
let providerThrows = false
let leadReadError: string | null = null
/** Ids whose VERDICT write fails — the facts write still lands, which is the whole point. */
let updateFailIds = new Set<string>()
/** Ids whose FACTS (reveal) write fails, so a paid fact we could not keep can be exercised. */
let factsWriteFailIds = new Set<string>()

vi.mock('@kind/db', () => {
  const q = (table: string): Record<string, unknown> => {
    const self: any = {
      _f: [] as ((r: Row) => boolean)[], _op: null as string | null, _patch: null as Row | null,
      select() { return self },
      eq(c: string, v: unknown) { self._f.push((r: Row) => r[c] === v); return self },
      is(c: string, v: unknown) { self._f.push((r: Row) => (r[c] ?? null) === v); return self },
      not(c: string, op: string, v: unknown) {
        if (op === 'is' && v === null) { self._f.push((r: Row) => (r[c] ?? null) !== null); return self }
        const set = String(v).replace(/[()]/g, '').split(',')
        self._f.push((r: Row) => !set.includes(String(r[c])))
        return self
      },
      in(c: string, list: unknown[]) { self._f.push((r: Row) => list.includes(r[c] as never)); return self },
      gt(c: string, v: unknown) { self._f.push((r: Row) => String(r[c]) > String(v)); return self },
      order() { return self }, limit() { return self },
      update(p: Row) { self._op = 'update'; self._patch = p; return self },
      _hit() { return [...leads.values()].filter(r => self._f.every((f: (x: Row) => boolean) => f(r))) },
      async maybeSingle() { return { data: self._hit()[0] ?? null, error: null } },
      then(res: (v: unknown) => unknown) {
        if (table !== 'leads') return Promise.resolve({ data: [], error: null }).then(res)
        if (leadReadError && !self._op) return Promise.resolve({ data: null, error: { message: leadReadError } }).then(res)
        const hit = self._hit()
        // ⚠️ THE TWO WRITES ARE TOLD APART BY WHAT THEY CARRY. A verdict write names
        // `qualified_at`/`disqualified_at`; the reveal write names the paid facts. Failing both
        // indiscriminately would make the double-spend case unable to see its own fix.
        const isVerdict = self._patch !== null && ('qualified_at' in (self._patch as Row) || 'disqualified_at' in (self._patch as Row))
        if (self._op === 'update' && isVerdict && hit.some((r: Row) => updateFailIds.has(String(r.id)))) {
          return Promise.resolve({ data: null, error: { message: 'verdict write refused' } }).then(res)
        }
        if (self._op === 'update' && !isVerdict && hit.some((r: Row) => factsWriteFailIds.has(String(r.id)))) {
          return Promise.resolve({ data: null, error: { message: 'facts write refused' } }).then(res)
        }
        if (self._op === 'update') {
          for (const r of hit) { writes.push({ id: String(r.id), patch: { ...(self._patch as Row) } }); Object.assign(r, self._patch) }
        }
        return Promise.resolve({ data: hit, error: null }).then(res)
      },
    }
    return self
  }
  return { db: { from: (t: string) => q(t) } }
})

vi.mock('./apollo', () => ({
  bulkMatchEmails: async (ids: string[]) => {
    revealedIds.push(...ids)
    if (providerThrows) throw new Error('the zero-spend guard refused this call')
    const out = new Map<string, { email: string; email_status: string | null; country: string | null; last_name: string | null }>()
    for (const id of ids) { const a = providerAnswers.get(id); if (a) out.set(id, a) }
    return out
  },
}))

import { qualifyCandidates, factsAreSufficient } from './programme-qualification'
import { surfaceQualifiedBatch } from './programme-surfacing'

const HOUSE_ICP = { geographies: ['United Kingdom'], requireVerifiedBusinessEmail: true }
const C = 'house-client'

function lead(id: string, over: Row = {}): Row {
  const r: Row = {
    id, client_id: C, programme_id: 'P', batch_id: null,
    email: null, email_status: null, country: null, apollo_id: `apollo-${id}`,
    qualified_at: null, disqualified_at: null, disqualify_reason: null,
    status: 'scored', opted_out_at: null, provider_eviction_required_at: null,
    surfaced_for_approval_at: null, delivered_at: null,
    ...over,
  }
  leads.set(id, r)
  return r
}
const answer = (id: string, over: Partial<{ email: string; email_status: string | null; country: string | null }> = {}) =>
  providerAnswers.set(`apollo-${id}`, {
    email: `${id}@northwind-logistics.co.uk`, email_status: 'verified', country: 'United Kingdom', last_name: 'Real', ...over,
  })

beforeEach(() => {
  leads = new Map(); writes.length = 0
  revealedIds = []; providerAnswers = new Map(); providerThrows = false; leadReadError = null
  updateFailIds = new Set(); factsWriteFailIds = new Set()
})

// ── ① THE CORE DECISION ──────────────────────────────────────────────────────────────

describe('① every candidate is judged, and the verdict is persisted both ways', () => {
  it('🛑 3 · 26 · ALL of them — not the first 25', async () => {
    // The defect in one number: `insertedIds.slice(0, deliveryCapBalance(...))`, and that
    // function returns a constant 25. A 250-candidate batch had 25 judged and 225 abandoned.
    const ids: string[] = []
    for (let i = 0; i < 250; i++) { const id = `L${i}`; lead(id); answer(id); ids.push(id) }

    const q = await qualifyCandidates(C, ids, HOUSE_ICP)

    expect(q.candidates_total).toBe(250)
    expect(q.qualified, 'only a capped sample was judged').toBe(250)
    expect(q.still_unjudged).toBe(0)
    expect(revealedIds).toHaveLength(250)
  })

  it('🛑 11 · a failure persists a truthful reason, and the row is not left blank', async () => {
    lead('L1'); answer('L1', { email_status: 'unverified' })
    lead('L2'); answer('L2', { country: 'Germany' })
    lead('L3'); answer('L3', { email: 'someone@gmail.com' })

    const q = await qualifyCandidates(C, ['L1', 'L2', 'L3'], HOUSE_ICP)

    expect(q.qualified).toBe(0)
    expect(q.disqualified).toBe(3)
    expect(leads.get('L1')!.disqualify_reason).toBe('unverified_email')
    expect(leads.get('L2')!.disqualify_reason).toBe('geography_mismatch')
    expect(leads.get('L3')!.disqualify_reason).toBe('personal_email')
    for (const id of ['L1', 'L2', 'L3']) {
      expect(leads.get(id)!.disqualified_at, `${id} has no disqualification marker`).toBeTruthy()
      expect(leads.get(id)!.qualified_at).toBeNull()
    }
    expect(q.reasons).toEqual({ unverified_email: 1, geography_mismatch: 1, personal_email: 1 })
  })

  it('🛑 9 · a candidate the provider never answered for is NOT silently passed', async () => {
    lead('L1')                     // no provider answer at all
    const q = await qualifyCandidates(C, ['L1'], HOUSE_ICP)
    expect(q.qualified).toBe(0)
    expect(q.disqualified).toBe(1)
    expect(leads.get('L1')!.disqualify_reason).toBe('no_email')
  })

  it('🛑 2 · 24 · `delivered_at` grants nothing — the current 30 are judged like everybody else', async () => {
    // The live shape: ~30 of the 246 carry a legacy delivery stamp written by a path that runs
    // no ICP gate and forces `apollo_consented: true`. It is not evidence of anything.
    lead('L_DELIVERED', { delivered_at: 'd', apollo_consented: true, email: 'x@gmail.com' })
    answer('L_DELIVERED', { email: 'x@gmail.com' })

    const q = await qualifyCandidates(C, ['L_DELIVERED'], HOUSE_ICP)
    expect(q.qualified, 'a delivered row was treated as qualified').toBe(0)
    expect(leads.get('L_DELIVERED')!.disqualify_reason).toBe('personal_email')
  })

  it('🛑 the qualification NEVER writes `delivered_at` — that is surfacing\'s job', async () => {
    lead('L1'); answer('L1')
    await qualifyCandidates(C, ['L1'], HOUSE_ICP)
    for (const w of writes) expect(Object.keys(w.patch), 'qualification wrote a delivery stamp').not.toContain('delivered_at')
    for (const w of writes) expect(Object.keys(w.patch)).not.toContain('surfaced_for_approval_at')
  })
})

// ── ② PROVIDER COST — ASKED ONCE, NEVER TWICE ────────────────────────────────────────

describe('② 6 · 7 · 8 · 19 · nothing is bought twice', () => {
  it('🛑 8 · stored facts sufficient ⇒ NO provider call', async () => {
    lead('L1', { email: 'ada@northwind-logistics.co.uk', email_status: 'verified', country: 'United Kingdom' })
    const q = await qualifyCandidates(C, ['L1'], HOUSE_ICP)
    expect(revealedIds, 'a fully-enriched candidate was revealed anyway').toEqual([])
    expect(q.judged_from_stored_facts).toBe(1)
    expect(q.provider_reveals_attempted).toBe(0)
    expect(q.qualified).toBe(1)
  })

  it('🛑 10 · an existing EMAIL is not "fully enriched" — the ICP decides what is missing', async () => {
    // ⚠️ THE ASSUMPTION THE FOUNDER WARNED AGAINST. `email IS NULL` is not the missing-facts
    // condition: House requires a provider-VERIFIED address, and `leads` never stored the
    // status. Treating a present address as sufficient would pass an unverified one.
    lead('L1', { email: 'ada@northwind-logistics.co.uk', email_status: null, country: 'United Kingdom' })
    expect(factsAreSufficient(leads.get('L1') as never, HOUSE_ICP)).toBe(false)
    answer('L1')
    const q = await qualifyCandidates(C, ['L1'], HOUSE_ICP)
    expect(q.provider_reveals_attempted, 'an unverified address was accepted without asking').toBe(1)
    expect(leads.get('L1')!.email_status).toBe('verified')
  })

  it('🛑 `apollo_consented` is never accepted as the verification fact', async () => {
    // It is written `verified || likely_to_engage` at insert and unconditionally by the drip.
    lead('L1', { email: 'ada@northwind-logistics.co.uk', apollo_consented: true, country: 'United Kingdom' })
    expect(factsAreSufficient(leads.get('L1') as never, HOUSE_ICP)).toBe(false)
    const SRC = readFileSync(join(__dirname, 'programme-qualification.ts'), 'utf8')
      .split('\n').filter(l => { const t = l.trim(); return t && !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*') }).join('\n')
    expect(SRC, 'the flag is being read as evidence').not.toMatch(/if\s*\([^)]*apollo_consented/)
  })

  it('🛑 6 · 19 · an ALREADY-JUDGED candidate is skipped — no read of the provider, no rewrite', async () => {
    lead('LQ', { qualified_at: 'q' })
    lead('LD', { disqualified_at: 'd', disqualify_reason: 'personal_email' })
    answer('LQ'); answer('LD')

    const q = await qualifyCandidates(C, ['LQ', 'LD'], HOUSE_ICP)

    expect(q.already_judged).toBe(2)
    expect(revealedIds, 'a judged candidate was revealed again').toEqual([])
    expect(writes, 'a judged candidate was rewritten').toEqual([])
    expect(q.qualified + q.disqualified).toBe(0)
  })

  it('🛑 7 · a DISQUALIFIED candidate is never revealed again, however many times this runs', async () => {
    lead('L1'); answer('L1', { email: 'x@gmail.com' })
    await qualifyCandidates(C, ['L1'], HOUSE_ICP)
    expect(revealedIds).toHaveLength(1)
    expect(leads.get('L1')!.disqualified_at).toBeTruthy()

    revealedIds = []
    for (let i = 0; i < 3; i++) await qualifyCandidates(C, ['L1'], HOUSE_ICP)
    expect(revealedIds, 'a rejected candidate is being re-bought').toEqual([])
  })

  it('🛑 a non-Apollo id is never sent to Apollo (AR5), and is judged on what we hold', async () => {
    lead('L1', { apollo_id: 'pdl_123' })
    const q = await qualifyCandidates(C, ['L1'], HOUSE_ICP)
    expect(revealedIds).toEqual([])
    expect(q.disqualified).toBe(1)
  })

  it('🛑 BLOCKER 1 · reveal succeeds → VERDICT WRITE FAILS → retry buys NOTHING', async () => {
    // 🛑 THE DOUBLE-SPEND THIS CLOSES. Until 9 Sep the revealed facts and the verdict were one
    // patch in ONE update — while the comment above it claimed they were separate. If that
    // write failed, the paid `email_status` died with the verdict, `factsAreSufficient`
    // answered false on the retry, and Apollo was charged for the same person again.
    lead('L1'); answer('L1')
    // The verdict write fails; the facts write must already have landed.
    updateFailIds = new Set(['L1'])

    const first = await qualifyCandidates(C, ['L1'], HOUSE_ICP)
    expect(revealedIds, 'the first pass did not reveal').toEqual(['apollo-L1'])
    expect(first.qualified + first.disqualified, 'a verdict was counted that never persisted').toBe(0)
    expect(first.still_unjudged).toBe(1)

    // ── THE PAID FACT SURVIVED, DURABLY, ON THE LEAD ROW ────────────────────────────
    expect(leads.get('L1')!.email, 'the paid address was lost with the verdict').toBe('L1@northwind-logistics.co.uk')
    expect(leads.get('L1')!.email_status, 'the paid VERIFICATION STATUS was lost with the verdict').toBe('verified')
    expect(leads.get('L1')!.country).toBe('United Kingdom')

    // ── THE RETRY: NO SECOND REVEAL, AND IT CAN NOW BE JUDGED ───────────────────────
    revealedIds = []
    updateFailIds = new Set()
    const second = await qualifyCandidates(C, ['L1'], HOUSE_ICP)

    expect(revealedIds, 'Apollo was charged for the same person twice').toEqual([])
    expect(second.provider_reveals_attempted).toBe(0)
    expect(second.judged_from_stored_facts, 'the retry did not judge from the stored reveal').toBe(1)
    expect(second.qualified).toBe(1)
    expect(second.still_unjudged).toBe(0)
    expect(leads.get('L1')!.qualified_at).toBeTruthy()
  })

  it('🛑 BLOCKER 1 · and a candidate whose PAID reveal could not be stored is left unjudged', async () => {
    // Judging on evidence we could not keep would record a verdict whose basis is gone — and
    // the next pass would buy that evidence again anyway. It stays a candidate, so nothing
    // settles.
    lead('L1'); answer('L1')
    factsWriteFailIds = new Set(['L1'])
    const q = await qualifyCandidates(C, ['L1'], HOUSE_ICP)
    expect(q.still_unjudged).toBe(1)
    expect(leads.get('L1')!.qualified_at).toBeNull()
    expect(leads.get('L1')!.disqualified_at).toBeNull()
  })

  it('the reveal is PERSISTED, so the fact is bought once even across runs', async () => {
    lead('L1'); answer('L1')
    await qualifyCandidates(C, ['L1'], HOUSE_ICP)
    const r = leads.get('L1')!
    expect(r.email).toBe('L1@northwind-logistics.co.uk')
    expect(r.email_status).toBe('verified')
    expect(r.country).toBe('United Kingdom')
    expect(r.last_name).toBe('Real')
  })
})

// ── ③ PROVIDER FAILURE ───────────────────────────────────────────────────────────────

describe('③ 17 · 18 · a provider failure keeps its work and settles nothing', () => {
  it('🛑 18 · completed verdicts survive, and the remainder is REPORTED', async () => {
    lead('L_STORED', { email: 'ok@northwind-logistics.co.uk', email_status: 'verified', country: 'United Kingdom' })
    lead('L_NEEDS')
    providerThrows = true

    const q = await qualifyCandidates(C, ['L_STORED', 'L_NEEDS'], HOUSE_ICP)

    expect(q.provider_failed).toBe(true)
    expect(q.qualified, 'the stored-fact half was thrown away with the failure').toBe(1)
    expect(q.still_unjudged, 'a candidate we never managed to ask about was judged anyway').toBe(1)
    expect(leads.get('L_STORED')!.qualified_at).toBeTruthy()
    expect(leads.get('L_NEEDS')!.disqualified_at, 'an unanswered question became a permanent refusal').toBeNull()
    expect(leads.get('L_NEEDS')!.qualified_at).toBeNull()
  })

  it('🛑 19 · and the retry costs nothing for what was already judged', async () => {
    lead('L_STORED', { email: 'ok@northwind-logistics.co.uk', email_status: 'verified', country: 'United Kingdom' })
    lead('L_NEEDS'); answer('L_NEEDS')
    providerThrows = true
    await qualifyCandidates(C, ['L_STORED', 'L_NEEDS'], HOUSE_ICP)

    revealedIds = []; providerThrows = false
    const q2 = await qualifyCandidates(C, ['L_STORED', 'L_NEEDS'], HOUSE_ICP)

    expect(q2.already_judged, 'the retry re-judged work that was already done').toBe(1)
    expect(revealedIds, 'the retry re-revealed a candidate it had already judged').toEqual(['apollo-L_NEEDS'])
    expect(q2.still_unjudged).toBe(0)
    expect(q2.qualified).toBe(1)
  })

  it('🛑 a verdict whose WRITE failed still counts as unjudged — the settle must see it', async () => {
    // Found in the final adversarial pass. `judgeAll` un-counts a verdict whose write failed,
    // so a remainder computed before those writes UNDER-reports — and `still_unjudged` is one of
    // the two facts the settle refuses on. It must never be smaller than the truth, or a
    // half-written attempt could be settled as though it were complete.
    lead('L_OK', { email: 'a@northwind-logistics.co.uk', email_status: 'verified', country: 'United Kingdom' })
    lead('L_WRITE_FAILS', { email: 'b@northwind-logistics.co.uk', email_status: 'verified', country: 'United Kingdom' })
    lead('L_NEEDS')
    updateFailIds = new Set(['L_WRITE_FAILS'])
    providerThrows = true

    const q = await qualifyCandidates(C, ['L_OK', 'L_WRITE_FAILS', 'L_NEEDS'], HOUSE_ICP)

    expect(q.provider_failed).toBe(true)
    expect(q.qualified, 'a verdict that was never persisted was counted').toBe(1)
    // The one whose write failed AND the one the provider never answered for.
    expect(q.still_unjudged, 'the unjudged remainder is smaller than the truth').toBe(2)
    expect(leads.get('L_WRITE_FAILS')!.qualified_at).toBeNull()
  })

  it('🛑 a read failure judges nobody and claims nothing', async () => {
    lead('L1')
    leadReadError = 'connection reset'
    const q = await qualifyCandidates(C, ['L1'], HOUSE_ICP)
    expect(q.provider_failed).toBe(true)
    expect(q.still_unjudged).toBe(1)
    expect(writes).toEqual([])
  })
})

// ── ④ SURFACING ─────────────────────────────────────────────────────────────────────

describe('④ 20 · 21 · 22 · only the qualified rows of THIS batch become visible', () => {
  it('🛑 20 · a disqualified candidate is never surfaced', async () => {
    lead('LQ', { batch_id: 'B1', qualified_at: 'q', email: 'a@x.co.uk' })
    lead('LD', { batch_id: 'B1', disqualified_at: 'd', email: 'b@x.co.uk' })
    lead('LN', { batch_id: 'B1', email: 'c@x.co.uk' })                      // unjudged

    const r = await surfaceQualifiedBatch('P', C, 'B1')
    expect(r.ok && r.surfaced).toBe(1)
    expect(leads.get('LQ')!.surfaced_for_approval_at).toBeTruthy()
    expect(leads.get('LD')!.surfaced_for_approval_at, 'a rejected candidate reached the review desk').toBeNull()
    expect(leads.get('LN')!.surfaced_for_approval_at).toBeNull()
  })

  it('🛑 21 · another batch\'s people are not in this review set', async () => {
    lead('L_THIS', { batch_id: 'B1', qualified_at: 'q', email: 'a@x.co.uk' })
    lead('L_OLD', { batch_id: 'B0', qualified_at: 'q', email: 'b@x.co.uk' })
    const r = await surfaceQualifiedBatch('P', C, 'B1')
    expect(r.ok && r.surfaced).toBe(1)
    expect(leads.get('L_OLD')!.surfaced_for_approval_at).toBeNull()
  })

  it('🛑 25 · another client\'s row cannot be surfaced through this programme', async () => {
    lead('L_FOREIGN', { client_id: 'someone-else', batch_id: 'B1', qualified_at: 'q', email: 'a@x.co.uk' })
    const r = await surfaceQualifiedBatch('P', C, 'B1')
    expect(r.ok && r.surfaced).toBe(0)
    expect(leads.get('L_FOREIGN')!.surfaced_for_approval_at).toBeNull()
  })

  it('🛑 suppressed prospects are excluded, and both stamps are written together', async () => {
    lead('LQ', { batch_id: 'B1', qualified_at: 'q', email: 'a@x.co.uk' })
    lead('L_OUT', { batch_id: 'B1', qualified_at: 'q', email: 'b@x.co.uk', opted_out_at: 'o' })
    lead('L_PASSED', { batch_id: 'B1', qualified_at: 'q', email: 'c@x.co.uk', status: 'passed' })
    lead('L_NOEMAIL', { batch_id: 'B1', qualified_at: 'q' })

    await surfaceQualifiedBatch('P', C, 'B1')
    expect(leads.get('LQ')!.delivered_at, 'the two stamps disagreed').toBe(leads.get('LQ')!.surfaced_for_approval_at)
    for (const id of ['L_OUT', 'L_PASSED', 'L_NOEMAIL']) {
      expect(leads.get(id)!.surfaced_for_approval_at, `${id} reached the desk`).toBeNull()
    }
  })

  it('🛑 22 · surfacing moves NO counter — it is a fact about a screen', () => {
    const SRC = readFileSync(join(__dirname, 'programme-surfacing.ts'), 'utf8')
      .split('\n').filter(l => { const t = l.trim(); return t && !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*') }).join('\n')
    for (const banned of ['sourced_used', 'sourced_reserved', 'settleBatch', 'programme_batches',
                          'reconcile_programme_sourcing', 'db.rpc(', "from('programmes')"]) {
      expect(SRC, `surfacing reaches ${banned}`).not.toContain(banned)
    }
  })

  it('a second surfacing run never re-stamps the batch timestamp', async () => {
    lead('LQ', { batch_id: 'B1', qualified_at: 'q', email: 'a@x.co.uk' })
    await surfaceQualifiedBatch('P', C, 'B1')
    const first = leads.get('LQ')!.surfaced_for_approval_at
    const again = await surfaceQualifiedBatch('P', C, 'B1')
    expect(again.ok && again.surfaced).toBe(0)
    expect(leads.get('LQ')!.surfaced_for_approval_at).toBe(first)
  })
})

// ── ⑤ THE RECONCILIATION RPC, AS SQL ────────────────────────────────────────────────

describe('⑤ 12 · 13 · 14 · 15 · 28 · 30 · the settle counts the right event', () => {
  const SQL = readFileSync(
    join(__dirname, '../../../../supabase/migrations/20260909_programme_qualification.sql'), 'utf8')
  /** What the database would actually execute — prose about a guard is not a guard. */
  const exec = SQL.split('\n').filter(l => !l.trim().startsWith('--')).join('\n')
  // ⚠️ THE FUNCTION BODY ONLY, ENDING AT `$$;`. The trailing `COMMENT ON FUNCTION` is
  // executable SQL whose text legitimately says the word "delivered_at" while explaining what
  // the function no longer counts — an assertion that read it would fail while the code is
  // right, which is how a guard gets weakened instead of fixed.
  const fnAll = exec.slice(exec.indexOf('CREATE OR REPLACE FUNCTION public.reconcile_programme_sourcing'))
  const fn = fnAll.slice(0, fnAll.indexOf('$$;') + 3)

  it('the file is real and is the one being read', () => {
    expect(fn.length).toBeGreaterThan(1500)
    expect(exec).toContain('ADD COLUMN IF NOT EXISTS qualified_at')
    expect(exec).toContain('ADD COLUMN IF NOT EXISTS email_status')
    expect(exec).toContain('ADD COLUMN IF NOT EXISTS inserted int')
  })

  it('🛑 13 · 2 · it counts `qualified_at`, and `delivered_at` appears NOWHERE in it', () => {
    expect(fn).toMatch(/SELECT COUNT\(\*\) INTO v_qualified[\s\S]{0,240}AND qualified_at IS NOT NULL/)
    expect(fn, 'the settle is counting the self-serve visibility stamp again').not.toContain('delivered_at')
  })

  it('🛑 12 · 28 · it REFUSES while any candidate is unjudged — the old button\'s safety net', () => {
    expect(fn).toMatch(/AND qualified_at IS NULL\s*\n\s*AND disqualified_at IS NULL/)
    expect(fn).toMatch(/IF v_unjudged > 0 THEN\s*\n\s*RAISE EXCEPTION/)
    // And the refusal happens BEFORE anything is written.
    expect(fn.indexOf('IF v_unjudged > 0')).toBeLessThan(fn.indexOf('INSERT INTO public.programme_batches'))
    expect(fn.indexOf('IF v_unjudged > 0')).toBeLessThan(fn.indexOf('UPDATE public.leads SET batch_id'))
  })

  it('🛑 14 · every candidate is stamped — the rejected ones too', () => {
    const stamp = fn.slice(fn.indexOf('UPDATE public.leads SET batch_id'), fn.indexOf('UPDATE public.programmes'))
    expect(stamp).toContain('AND batch_id IS NULL')
    // 🛑 NOT FILTERED BY VERDICT. Leaving rejects batch-less would make them look like a
    // second unaccounted attempt for ever.
    expect(stamp, 'only the qualified rows are being stamped').not.toContain('qualified_at')
  })

  it('🛑 15 · but `used` is the QUALIFIED count only', () => {
    expect(fn).toMatch(/SET sourced_used = sourced_used \+ v_qualified/)
    expect(fn, 'the rejected candidates are being charged to the customer').not.toMatch(/sourced_used \+ v_candidates/)
    // requested / granted / inserted / delivered stay four separate numbers.
    expect(fn).toContain('(p_programme_id, v_seq, v_requested, v_candidates, v_candidates, v_qualified, \'served\', now())')
  })

  it('🛑 30 · the ceiling cannot be exceeded, and it is checked on what is CONSUMED', () => {
    expect(fn).toMatch(/IF COALESCE\(v_room, 0\) < v_qualified THEN\s*\n\s*RAISE EXCEPTION/)
    expect(fn).toMatch(/AND sourced_used \+ sourced_reserved \+ v_qualified <= sourcing_ceiling/)
    expect(fn).toMatch(/IF NOT FOUND THEN\s*\n\s*RAISE EXCEPTION/)
  })

  it('🛑 25 · a foreign-client lead refuses the whole call rather than being filtered out', () => {
    expect(fn).toMatch(/client_id IS DISTINCT FROM v_client[\s\S]{0,120}IF v_foreign > 0 THEN\s*\n\s*RAISE EXCEPTION/)
    expect(fn.indexOf('v_foreign')).toBeLessThan(fn.indexOf('INTO v_candidates'))
  })

  it('it is idempotent, and `sourced_reserved` is untouched for a historical run', () => {
    expect(fn).toMatch(/IF v_candidates <= 0 THEN\s*\n\s*RETURN 0;/)
    expect(fn, 'the historical settle is releasing a reservation that never existed')
      .not.toMatch(/sourced_reserved\s*=/)
  })

  it('🛑 16 · 27 · nothing in it sources anybody or calls a provider', () => {
    for (const banned of ['apollo', 'Apollo', 'pdl', 'http', 'INSERT INTO public.leads', 'DELETE']) {
      expect(fn, `the settle reaches ${banned}`).not.toContain(banned)
    }
  })
})

// ── ⑥ THE CALL SITES ────────────────────────────────────────────────────────────────

const code = (p: string) => readFileSync(p, 'utf8')
  .split('\n').filter(l => { const t = l.trim(); return t && !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*') }).join('\n')

describe('⑥ 1 · 4 · 5 · 23 · 27 · 29 · what the rest of the system is wired to', () => {
  const ICPS = code(join(__dirname, '../routes/icps.ts'))
  const INTERNAL = code(join(__dirname, '../routes/internal.ts'))
  const PREP = code(join(__dirname, 'programme-preparation.ts'))
  const REVIEW = code(join(__dirname, 'programme-review.ts'))
  const RECOVERY = code(join(__dirname, 'programme-batch-recovery.ts'))
  const QUAL = code(join(__dirname, 'programme-qualification.ts'))

  it('🛑 1 · `used` never moves at insert — the only writer is the settle RPC', () => {
    // The insert loop records ids; it does not touch a counter.
    expect(ICPS, 'the run writes the consumed ceiling directly').not.toContain('sourced_used')
    expect(ICPS).toContain('settleBatch(programmeBatch.id, qualified ?? 0)')
  })

  it('🛑 4 · a programme lead cannot enter the self-serve drip', () => {
    const at = INTERNAL.indexOf("const { data: pending } = await db.from('leads')")
    expect(at, 'the drip selection is gone').toBeGreaterThan(-1)
    const sel = INTERNAL.slice(at, at + 420)
    expect(sel, 'programme work can be picked up by the ~5/day drip again')
      .toContain(".is('programme_id', null)")
    expect(sel).toContain(".is('delivered_at', null)")
  })

  it('🛑 5 · 29 · the House qualification path has no Hunter, no waterfall, no phone, no PDL', () => {
    for (const banned of ['hunterAllowed', 'waterfallEnrich', 'HUNTER_API_KEY', 'reveal_phone',
                          'reveal_personal', 'searchPeople', 'pdl', 'PDL']) {
      expect(QUAL, `the qualification core reaches ${banned}`).not.toContain(banned)
      expect(RECOVERY, `the recovery reaches ${banned}`).not.toContain(banned)
    }
    // The single provider door, and it is the safe one.
    expect(QUAL).toContain("await import('./apollo')")
    // One CALL, however many times the name appears (the import line names it too).
    expect((QUAL.match(/await bulkMatchEmails\(/g) ?? []).length).toBe(1)
  })

  it('🛑 16 · 27 · the recovery sources nobody and never tops up a shortfall', () => {
    for (const banned of ['runIcpJob', 'sourceProgramme', 'openBatch', 'try_reserve_programme_sourcing',
                          'try_spend_sourcing', 'searchPeopleWithFallback', 'nextBatchSize']) {
      expect(RECOVERY, `the recovery reaches ${banned}`).not.toContain(banned)
    }
    expect(RECOVERY).toContain("db.rpc('reconcile_programme_sourcing'")
  })

  it('🛑 17 · the recovery refuses to settle a partial judgement', () => {
    expect(RECOVERY).toContain('if (q.provider_failed || q.still_unjudged > 0) {')
    const at = RECOVERY.indexOf('if (q.provider_failed || q.still_unjudged > 0) {')
    const settleAt = RECOVERY.indexOf("db.rpc('reconcile_programme_sourcing'")
    expect(settleAt, 'the settle runs before the completeness check').toBeGreaterThan(at)
    expect(RECOVERY.slice(at, settleAt)).toContain('return {')
  })

  it('🛑 23 · preparation cannot enrol a disqualified candidate — twice over', () => {
    // The page query…
    expect(PREP).toContain(".not('qualified_at', 'is', null)")
    expect(PREP).toContain(".is('disqualified_at', null)")
    // …and the per-lead fence `autoEnrollLead` calls itself.
    expect(PREP).toContain("if (l.disqualified_at) return { ok: false")
    expect(PREP).toContain('if (!l.qualified_at) return { ok: false')
    // The head count must describe the SAME population, or `remaining` never reaches zero.
    expect((PREP.match(/\.not\('qualified_at', 'is', null\)/g) ?? []).length).toBe(2)
  })

  it('🛑 20 · and the customer review desk shows only qualified prospects', () => {
    expect(REVIEW).toContain(".not('qualified_at', 'is', null)")
    expect(REVIEW).toContain(".is('disqualified_at', null)")
  })

  it('🛑 `surfaceEverything` cannot reach programme work — it has no verdict filter of its own', () => {
    // Found in the final reconciliation, and it is launch-critical: that act is CLIENT-scoped
    // with no suppression and no ICP filter, so on a programme client it would have put every
    // unjudged candidate on the review desk — and `markReadyForApproval` would then count them
    // as reviewable while the programme desk showed nothing.
    // ⚠️ ANCHORED ON THE SURFACING QUERY, NOT ON `.eq('client_id', clientId)` — that appears
    // several times in this file, and the first match is a different read entirely. The
    // surfacing selection is the one that claims un-surfaced rows.
    const SW = code(join(__dirname, 'start-work.ts'))
    const at = SW.indexOf(".is('surfaced_for_approval_at', null)")
    expect(at, 'the surfacing selection is gone').toBeGreaterThan(-1)
    expect(SW.slice(Math.max(0, at - 300), at), 'the client-scoped surfacing act can reach programme rows again')
      .toContain(".is('programme_id', null)")
  })

  it('🛑 "ready" and "there is something to review" describe the SAME set', () => {
    // Both counts and the desk must ask one question. If readiness admitted an unjudged row,
    // a programme could reach READY_FOR_APPROVAL with an empty customer desk.
    const READY = code(join(__dirname, 'preparation-readiness.ts'))
    const PROG = code(join(__dirname, 'programme.ts'))
    for (const [name, src] of [['readiness', READY], ['markReadyForApproval', PROG]] as const) {
      expect(src, `${name} counts prospects the review desk will not show`)
        .toContain(".not('qualified_at', 'is', null)")
      expect(src).toContain(".is('disqualified_at', null)")
    }
  })

  it('🛑 BLOCKER 2 · the batch is stamped on EVERY candidate of the attempt, pool included', () => {
    // 🛑 THE ACCOUNTING HOLE. `pdlInsertedIds` is the PROVIDER half; `insertedIds` is the whole
    // attempt, pool copies included. Stamping only the provider half left a pool-served
    // QUALIFIED prospect outside `count(batch_id = X)` — so it never reached `sourced_used`,
    // was never surfaced (surfacing is batch-scoped), could never be enrolled (preparation
    // enrols the current batch), and sat programme-attributed and batch-less for ever, which
    // the recovery RPC would later read as a SECOND unaccounted attempt.
    expect(ICPS).toContain("update({ batch_id: programmeBatch.id })")
    const at = ICPS.indexOf("update({ batch_id: programmeBatch.id })")
    const stamp = ICPS.slice(at, at + 120)
    expect(stamp, 'only the provider half of the attempt is stamped into the batch')
      .toContain(".in('id', insertedIds)")
    expect(stamp).not.toContain('pdlInsertedIds')
    // The guard around it must admit a pool-only attempt too.
    expect(ICPS).toContain('if (programmeBatch && insertedIds.length > 0) {')
  })

  it('🛑 BLOCKER 2 · pool volume is RESERVED as entitlement — and never as provider money', () => {
    // A pool-served candidate now consumes USED, so it must be reserved against the ceiling or
    // the ceiling is under-counted AND `settle_programme_batch` clamps `delivered` to `granted`,
    // silently dropping qualified pool prospects out of the customer's consumed volume.
    //
    // ⛓️ 9 Sep — RETARGETED, BECAUSE THE RESERVATION MOVED IN FRONT OF THE INSERT. This case
    // used to anchor on `if (!proofMode && programmeIdForPool && pool.served > 0)`, a block that
    // reserved AFTER the pool had already been served — which is the contradiction the founder
    // then rejected: a short grant left rows already written and already in the batch. The DUTY
    // is unchanged and still asserted here (reserve the pool half, as entitlement, never as
    // provider money); what changed is WHERE, and the population invariant it now buys is
    // proved behaviourally in `programme-attribution.test.ts`.
    expect(ICPS).toContain("db.rpc('try_reserve_programme_sourcing', {")
    // The identity is the one the sourcing gate VALIDATED, not a re-read of the ICP column.
    const at = ICPS.indexOf('const pool = await servePoolLeads(icp, clientId, runCap, programmeIdForRun')
    expect(at, 'the pool serve no longer carries the programme authority callback').toBeGreaterThan(-1)
    const block = ICPS.slice(at, at + 900)
    expect(block, 'the pool serve no longer reserves entitlement before it admits candidates')
      .toContain("db.rpc('try_reserve_programme_sourcing', {")
    expect(block).toContain('p_programme_id: programmeIdForRun, p_requested: eligible,')
    // 🛑 ENTITLEMENT, NOT MONEY. `try_spend_sourcing` books $0.28 a head; a pool record is free,
    // and putting it through the money call is the exact conflation HOUSE-009 removed.
    expect(block, 'pool volume is being booked as PDL provider cost').not.toContain('try_spend_sourcing')
    // And the PDL money call still asks only for the provider remainder.
    expect(ICPS).toContain('p_client_id: clientId, p_requested: pdlRemainder, p_programme_id: programmeId,')
  })

  it('🛑 BLOCKER 3 · the grant is taken BEFORE a pool row is written, and caps what is written', () => {
    // 🛑 THE LOCKED RULE: *a programme batch may NEVER contain more candidate authority than was
    // actually granted for that attempt.* Reserving afterwards and logging a short grant is not
    // fail-closed — the rows exist, they can qualify, they can surface, and the settle clamp
    // reports a smaller USED than the customer can see.
    //
    // ⚠️ ANCHORED ON THE EXECUTABLE ORDER, NOT ON THE CALLBACK EXISTING. A callback that ran
    // after the insert would satisfy "there is an `admit`"; only the ORDER of the two statements
    // decides whether an unauthorised candidate can exist.
    const gate   = ICPS.indexOf('admitted = admit ? await admit(eligible.length) : eligible.length')
    const insert = ICPS.indexOf("await db.from('leads').insert(rows).select('id')")
    expect(gate, 'the pool serve no longer takes a grant before admitting candidates').toBeGreaterThan(-1)
    expect(insert, 'the pool insert is gone').toBeGreaterThan(-1)
    expect(gate, 'the grant is taken AFTER the rows are written — the rejected mitigation')
      .toBeLessThan(insert)
    // A zero grant writes nothing at all.
    expect(ICPS).toContain('if (admitted <= 0) return { insertedIds: [], served: 0, reserved: 0 }')
    // And the insert is fed the TRIMMED list, not the eligible one.
    expect(ICPS).toContain('const granted = eligible.slice(0, admitted)')
    expect(ICPS, 'the insert is built from the untrimmed eligible list again')
      .toContain('const rows = granted.map(c => ({')
  })

  it('🛑 BLOCKER 2 · the batch records the WHOLE attempt, so the settle cannot clamp a pool row out', () => {
    // ⛓️ 9 Sep — the pool half of the REQUEST is `poolAttempted` rather than `pool.served`, so a
    // grant taken before an insert that then failed cannot produce a batch claiming to have
    // requested less than it was granted. The granted side is unchanged.
    for (const call of [
      'openBatch(houseProgrammeId, pdlRemainder + poolAttempted, grantedSize + poolReserved)',
      'openBatch(programmeId, pdlRemainder + poolAttempted, grantedSize + poolReserved)',
    ]) {
      expect(ICPS, `the batch records only the provider half: ${call}`).toContain(call)
    }
    // A pool-only attempt still opens a batch — otherwise those candidates are orphaned.
    expect(ICPS).toContain('if (grantedSize + poolReserved > 0) {')
    expect(ICPS).toContain('if (programmeId && grantedSize + poolReserved > 0) {')
    // 🛑 AND THE THREE BRANCHES THAT NEVER REACH `openBatch` AT ALL. It lives inside
    // `pdlRemainder > 0`; a demo run, an exhausted cursor and a pool serve that filled the whole
    // target all skip it, which would leave reserved volume with no batch to settle it.
    expect(ICPS, 'a pool-only attempt is left with reserved volume and no batch to release it')
      .toContain('if (!programmeBatch && programmeIdForRun && poolReserved > 0) {')
  })

  it('🛑 BLOCKER 2 · and both halves of one batch are settled and surfaced together', async () => {
    // Behavioural, on the population the settle and the surfacing actually read: two candidates
    // sharing a batch — one that came from the pool, one from the provider — are both judged,
    // both counted by `batch_id + qualified_at`, and both put in front of the customer.
    leads = new Map(); revealedIds = []; providerAnswers = new Map()
    lead('L_POOL', { batch_id: 'B1', email: 'pool@northwind-logistics.co.uk', email_status: 'verified', country: 'United Kingdom' })
    lead('L_PROVIDER', { batch_id: 'B1' }); answer('L_PROVIDER')

    const q = await qualifyCandidates(C, ['L_POOL', 'L_PROVIDER'], HOUSE_ICP)
    expect(q.qualified, 'a pool candidate was not judged alongside the provider one').toBe(2)
    expect(q.provider_reveals_attempted, 'the pool candidate was revealed unnecessarily').toBe(1)

    // The settle population: batch + qualified. Both are in it.
    const settlePopulation = [...leads.values()].filter(r => r.batch_id === 'B1' && r.qualified_at)
    expect(settlePopulation.map(r => r.id).sort()).toEqual(['L_POOL', 'L_PROVIDER'])

    const s = await surfaceQualifiedBatch('P', C, 'B1')
    expect(s.ok && s.surfaced, 'a qualified pool candidate was never shown to the customer').toBe(2)
  })

  it('🛑 a normal batch SURFACES its qualified prospects — otherwise it is unreviewable', () => {
    // Found in the final adversarial pass. The programme path no longer calls
    // `enrichAndDeliverLeads` and `surfaceEverything` is fenced off programme work, so nothing
    // else would ever stamp these rows — and both `markReadyForApproval` and the customer's
    // desk require them. The batch would be judged, settled, accounted for and invisible.
    expect(ICPS).toContain("await import('../lib/programme-surfacing')")
    expect(ICPS).toContain('surfaceQualifiedBatch(programmeIdForRun, clientId, programmeBatch.id)')
    // ⚠️ AFTER THE SETTLE, NEVER BEFORE. Surfacing is visibility; the ledger is already closed.
    const settleAt = ICPS.indexOf('settleBatch(programmeBatch.id, qualified ?? 0)')
    const surfaceAt = ICPS.indexOf('surfaceQualifiedBatch(programmeIdForRun, clientId, programmeBatch.id)')
    expect(settleAt).toBeGreaterThan(-1)
    expect(surfaceAt, 'the run surfaces before it settles').toBeGreaterThan(settleAt)
  })


  it('the legacy non-programme path is untouched', () => {
    // Delivery, its cap and the Hunter decision all survive for clients with no programme.
    expect(ICPS).toContain('await enrichAndDeliverLeads(clientId, deliverNow, {')
    expect(ICPS).toContain('const deliverNow = insertedIds.slice(0, cap)')
    expect(ICPS).toContain("hunterAllowed: audience !== 'house'")
  })
})
