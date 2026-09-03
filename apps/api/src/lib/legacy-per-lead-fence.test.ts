// ═══════════════════════════════════════════════════════════════════════════════════════
// THE LEGACY PER-LEAD COMMERCIAL FENCE
//
// 🛑 FOUNDER-LOCKED 3 SEP: **"IF THE CLIENT HAS AN OPEN PROGRAMME, THE LEGACY COMMERCIAL
// PER-LEAD APPROVE / REVEAL / BATCH-APPROVAL PATHS ARE REFUSED."**
//
// ── THE BYPASS THAT EXISTED ─────────────────────────────────────────────────────────────
//
// `approve-lead.ts` contained ZERO references to programmes — `grep -ci programme` returned 0.
// An authenticated programme customer calling `POST /leads/:id/approve`, `POST /leads/:id/reveal`
// or `POST /leads/approve-batch` by hand passed `batchGate`, because a programme prospect is
// EXACTLY what that gate admits: surfaced, unrevealed, not passed. What followed:
//
//   ① `revealed_at` stamped on programme work — removing it from their own review set;
//   ② a pack slot burned (a `credit_transactions` row) or **$4 taken** via `try_charge_wallet`;
//   ③ `autoEnrollLead` then correctly refusing, because a non-LIVE programme grants no OUTREACH.
//
// Charged, and nothing done. The programme model was strong enough to refuse the WORK and not
// the MONEY — reached from the one direction nobody had walked.
//
// ── WHAT IS PROVED HERE ─────────────────────────────────────────────────────────────────
//
// The refusal lands BEFORE the first mutation and BEFORE the first money statement, not merely
// "early". That is asserted behaviourally by recording every table written and every RPC called
// and requiring both to be EMPTY — a fence that refused after `revealed_at` would show a
// `leads` write, and one that refused after the charge would show `try_charge_wallet`.
//
// ⚠️ AND CALIBRATION IS PROVED UNTOUCHED. Milla's `proof-accept`, `pass` and `feedback` are
// non-commercial: they reveal nothing, charge nothing, and never reach `approveLead`. A fence
// that silenced "Looks right" would have broken the free-proof acquisition motion in order to
// protect economics that motion never touches.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

type Row = Record<string, unknown>

const state: {
  programmes: Row[]; leads: Row[]; clients: Row[]
  // ⛓️ C2 — `reads` and `clientsUnreadable` added. The fence now asks TWO questions (which
  // commercial model, and is a programme open), so "how many reads does a legacy client cost"
  // stopped being answerable by counting nothing, and "the client row would not read" became a
  // state that has to be provable.
  written: string[]; rpcs: string[]; reads: string[]
  programmesUnreadable: boolean; clientsUnreadable: boolean
} = {
  programmes: [], leads: [], clients: [], written: [], rpcs: [], reads: [],
  programmesUnreadable: false, clientsUnreadable: false,
}

function table(name: string) {
  const rows = (): Row[] =>
    name === 'programmes' ? state.programmes : name === 'leads' ? state.leads : state.clients
  const q: any = {
    _f: [] as ((r: Row) => boolean)[], _mode: '', _payload: null as Row | null, _limit: 0,
    select() { return q },
    eq(c: string, v: unknown) { q._f.push((r: Row) => r[c] === v); return q },
    neq(c: string, v: unknown) { q._f.push((r: Row) => r[c] !== v); return q },
    is(c: string, v: unknown) { q._f.push((r: Row) => (r[c] ?? null) === v); return q },
    in(c: string, l: unknown[]) { q._f.push((r: Row) => l.includes(r[c] as never)); return q },
    not(c: string, op: string, v: unknown) {
      if (op === 'is' && v === null) { q._f.push((r: Row) => (r[c] ?? null) !== null); return q }
      const set = String(v).replace(/[()]/g, '').split(',')
      q._f.push((r: Row) => !set.includes(String(r[c]))); return q
    },
    order() { return q },
    limit(n: number) { q._limit = n; return q },
    update(p: Row) { q._mode = 'update'; q._payload = p; state.written.push(name); return q },
    insert(p: Row) { q._mode = 'insert'; q._payload = p; state.written.push(name); return q },
    upsert(p: Row) { q._mode = 'insert'; q._payload = p; state.written.push(name); return q },
    _hit() { const all = rows().filter(r => q._f.every((f: (r: Row) => boolean) => f(r))); return q._limit > 0 ? all.slice(0, q._limit) : all },
    async maybeSingle() {
      state.reads.push(name)
      if (name === 'programmes' && state.programmesUnreadable) return { data: null, error: { message: 'programmes unreadable' } }
      if (name === 'clients' && state.clientsUnreadable) return { data: null, error: { message: 'clients unreadable' } }
      return { data: q._hit()[0] ?? null, error: null }
    },
    async single() { return q.maybeSingle() },
    _run() {
      if (q._mode === '') state.reads.push(name)
      if (name === 'programmes' && state.programmesUnreadable) return { data: null, error: { message: 'programmes unreadable' }, count: null }
      if (name === 'clients' && state.clientsUnreadable) return { data: null, error: { message: 'clients unreadable' }, count: null }
      if (q._mode === 'update') { const h = q._hit(); for (const r of h) Object.assign(r, q._payload); return { data: h, error: null } }
      if (q._mode === 'insert') { const row = { id: `x${rows().length + 1}`, ...(q._payload as Row) }; rows().push(row); return { data: row, error: null } }
      return { data: q._hit(), error: null, count: q._hit().length }
    },
    then(res: (v: unknown) => unknown) { return Promise.resolve(q._run()).then(res) },
  }
  return q
}

vi.mock('@kind/db', () => ({
  db: {
    from: (t: string) => table(t),
    rpc: async (n: string) => { state.rpcs.push(n); return { data: n === 'try_charge_wallet' ? true : null, error: null } },
  },
}))
vi.mock('./alerts', () => ({ sendFounderAlert: () => Promise.resolve() }))

import { checkLegacyPerLeadAuthority, LEGACY_FENCED_COPY, PROGRAMME_MODEL_FENCED_COPY } from './programme-authority'
import { approveLead } from './approve-lead'

const PROG_CLIENT = 'house'
const LEGACY_CLIENT = 'legacy'

/**
 * ⛓️ C2 — EVERY CLIENT IN THIS SUITE NOW EXISTS AS A ROW, because the fence reads
 * `clients.commercial_model` before it reads the programme. `commercial_model: null` is the
 * COMPATIBILITY state — exactly what the whole live book holds — so every assertion below that
 * predates C2 keeps asserting the behaviour it was written for, unweakened.
 */
const client = (id: string, commercial_model: string | null = null) =>
  state.clients.push({ id, commercial_model })

function seedOpenProgramme(status = 'READY_FOR_APPROVAL') {
  state.programmes.push({
    id: 'P1', client_id: PROG_CLIENT, status, approved_at: null, paused_at: null,
    went_live_at: null, second_paid_at: null, second_authorised_at: null,
    first_paid_at: 'p1', meeting_target: 4,
  })
}
const lead = (id: string, clientId: string, over: Row = {}) =>
  state.leads.push({
    id, client_id: clientId, programme_id: clientId === PROG_CLIENT ? 'P1' : null,
    delivered_at: 'd', surfaced_for_approval_at: 's', revealed_at: null, status: 'scored',
    email: `${id}@example.com`, country: 'GB', crm_existing: false, ...over,
  })

beforeEach(() => {
  state.programmes = []; state.leads = []; state.clients = []
  state.written = []; state.rpcs = []; state.reads = []
  state.programmesUnreadable = false; state.clientsUnreadable = false
  client(PROG_CLIENT); client(LEGACY_CLIENT)   // both UNCLASSIFIED — today's live book
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ① THE RULE ITSELF — CLIENT-LEVEL, NOT LEAD-LEVEL
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('① the fence asks about the CLIENT, not about the row', () => {
  it('🛑 a client with an OPEN PROGRAMME is refused', async () => {
    seedOpenProgramme()
    const v = await checkLegacyPerLeadAuthority(PROG_CLIENT)
    expect(v.allowed).toBe(false)
    expect(!v.allowed && v.code).toBe('programme_open')
    expect(!v.allowed && v.message).toBe(LEGACY_FENCED_COPY)
  })

  it('🛑 a client with NO programme is ALLOWED — legacy is exactly as it was', async () => {
    const v = await checkLegacyPerLeadAuthority(LEGACY_CLIENT)
    expect(v.allowed).toBe(true)
  })

  it.each([
    ['DRAFT'], ['RECOMMENDED'], ['AWAITING_FIRST_PAYMENT'], ['SOURCING_AUTHORISED'],
    ['SOURCING'], ['READY_FOR_APPROVAL'], ['APPROVED'], ['LIVE'],
  ])('🛑 every NON-TERMINAL programme state fences the client — %s', async (status) => {
    seedOpenProgramme(status)
    const v = await checkLegacyPerLeadAuthority(PROG_CLIENT)
    expect(v.allowed).toBe(false)
  })

  it.each([['COMPLETED'], ['CANCELLED']])('a TERMINAL programme (%s) is not an open one — legacy re-entry is deliberately unchanged here', async (status) => {
    // Founder-ruled 3 Sep: terminal-programme legacy re-entry is tracked post-launch and is
    // NOT solved in this PR. `openProgrammeFor` excludes terminal states, so a completed
    // programme leaves the client on the legacy path exactly as before this change — stated
    // as a test so the boundary is explicit rather than incidental.
    seedOpenProgramme(status)
    const v = await checkLegacyPerLeadAuthority(PROG_CLIENT)
    expect(v.allowed).toBe(true)
  })

  // ═════════════════════════════════════════════════════════════════════════════════════
  // ⛓️ C2 — THE DECLARED COMMERCIAL MODEL, WHICH IS WHAT THE FENCE ACTUALLY ASKS NOW
  //
  // 🛑 THE HOLE THESE CLOSE. Every test above this block passes both before and after C2,
  // because they all describe clients whose model is unclassified. The client the fence was
  // getting WRONG is the one nobody had a fixture for: a declared programme client with no
  // programme open — House and MBF, today. They were `allowed: true`, free to be charged $4
  // per lead against a wallet they never bought.
  // ═════════════════════════════════════════════════════════════════════════════════════
  describe('⛓️ C2 — the model decides, and absence decides nothing', () => {
    it('🛑 A DECLARED PROGRAMME CLIENT WITH NO PROGRAMME IS REFUSED — this is House today', async () => {
      state.clients = []; client(PROG_CLIENT, 'programme')
      const v = await checkLegacyPerLeadAuthority(PROG_CLIENT)
      expect(v.allowed, 'no programme row must not mean "legacy"').toBe(false)
      expect(!v.allowed && v.code).toBe('programme_model')
      // ⚠️ AND NOT THE OTHER COPY. `LEGACY_FENCED_COPY` opens "Your programme covers this",
      // which for a client with no programme is a sentence about something that does not exist.
      expect(!v.allowed && v.message).toBe(PROGRAMME_MODEL_FENCED_COPY)
      expect(!v.allowed && v.message).not.toBe(LEGACY_FENCED_COPY)
      expect(PROGRAMME_MODEL_FENCED_COPY, 'it must not claim a programme they do not have')
        .not.toMatch(/Your programme covers this/)
    })

    it('🛑 a declared programme client WITH a programme is still refused, and told so', async () => {
      state.clients = []; client(PROG_CLIENT, 'programme')
      seedOpenProgramme()
      const v = await checkLegacyPerLeadAuthority(PROG_CLIENT)
      expect(v.allowed).toBe(false)
      expect(!v.allowed && v.code).toBe('programme_open')
      expect(!v.allowed && v.message).toBe(LEGACY_FENCED_COPY)
    })

    it('a DECLARED LEGACY client with no programme is allowed — the model works both ways', async () => {
      state.clients = []; client(LEGACY_CLIENT, 'legacy')
      const v = await checkLegacyPerLeadAuthority(LEGACY_CLIENT)
      expect(v.allowed, 'declaring legacy must actually mean legacy').toBe(true)
    })

    it('🛑 DECLARED LEGACY + AN OPEN PROGRAMME IS A CONFLICT, AND IT REFUSES', async () => {
      // ⚠️ NEITHER ANSWER IS SAFE. Choosing programme spends against a declaration; choosing
      // legacy charges $4 to a client whose programme has already been paid for. So nothing
      // consequential proceeds and a human is asked.
      state.clients = []; client(PROG_CLIENT, 'legacy')
      seedOpenProgramme()
      const v = await checkLegacyPerLeadAuthority(PROG_CLIENT)
      expect(v.allowed, 'a contradiction must never resolve in favour of charging').toBe(false)
      expect(!v.allowed && v.code).toBe('programme_unresolvable')
    })

    it('🛑 AN UNREADABLE CLIENT ROW IS REFUSED — "we could not tell" is not "legacy"', async () => {
      state.clientsUnreadable = true
      const v = await checkLegacyPerLeadAuthority(LEGACY_CLIENT)
      expect(v.allowed).toBe(false)
      expect(!v.allowed && v.code).toBe('programme_unresolvable')
    })

    it('🛑 A CLIENT ROW THAT DOES NOT EXIST IS REFUSED, not defaulted', async () => {
      state.clients = []
      const v = await checkLegacyPerLeadAuthority('nobody')
      expect(v.allowed).toBe(false)
      expect(!v.allowed && v.code).toBe('programme_unresolvable')
    })

    // ═══════════════════════════════════════════════════════════════════════════════════
    // 🛑 is_demo AND commercial_model ARE ORTHOGONAL — founder-locked 3 Sep
    //
    // The first cut of the enrol fence skipped it for a demo client, reasoning that a demo
    // charges nothing so the money fence need not run. That quietly turned the demo flag into a
    // GRANT OF LEGACY COMMERCIAL WORKFLOW: MBF is both a demo and a programme client, so it
    // would have gone straight down the retired per-lead path the moment it was declared
    // `programme` — the same absence-means-a-fact inference C2 exists to end, wearing a
    // different flag. Demo decides whether money and provider spend are REAL. Nothing else.
    // ═══════════════════════════════════════════════════════════════════════════════════
    it('🛑 MBF — programme + is_demo + NO programme — the resolver refuses, demo or not', async () => {
      // The resolver never reads `is_demo`, and this is the assertion that keeps it that way.
      state.clients = []; state.clients.push({ id: 'mbf', commercial_model: 'programme', is_demo: true })
      const v = await checkLegacyPerLeadAuthority('mbf')
      expect(v.allowed, 'a demo flag must not buy legacy commercial authority').toBe(false)
      expect(!v.allowed && v.code).toBe('programme_model')
    })

    it('⚠️ NON-VACUOUS: an UNCLASSIFIED demo client is unaffected — every demo on the book today', async () => {
      state.clients = []; state.clients.push({ id: 'demo', commercial_model: null, is_demo: true })
      const v = await checkLegacyPerLeadAuthority('demo')
      expect(v.allowed, 'demo accounts must keep working exactly as they do now').toBe(true)
    })

    it('🛑 THE RESOLVER NEVER READS is_demo — proved on the source, not inferred', () => {
      const cm = readFileSync(join(__dirname, 'commercial-model.ts'), 'utf8')
      expect(cm, 'the commercial model is orthogonal to demo-ness').not.toContain('is_demo')
      expect(cm).not.toContain('isDemoClient')
    })

    it('🛑 THE TWO ENROL ROUTES NO LONGER SKIP THE FENCE FOR A DEMO', () => {
      const figsyRoutes = readFileSync(join(join(__dirname, '..'), 'routes/figsy.ts'), 'utf8')
        .split('\n').filter(l => !l.trim().startsWith('//') && !l.trim().startsWith('*')).join('\n')
      expect(figsyRoutes, 'the demo bypass around the fence is gone')
        .not.toContain('if (!(await isDemoClient(clientId))) {')
      // ⚠️ AND THE MONEY EXEMPTION SURVIVES, which is the half that must not be lost: a demo
      // still enrols off-ledger, because `chargeFigsyEnroll` is what skips, not the fence.
      const charge = readFileSync(join(__dirname, 'figsy.ts'), 'utf8')
      expect(charge, 'a demo still charges nothing').toMatch(/if \(await isDemoClient\(clientId\)\) \{[\s\S]{0,400}return 'skipped'/)
    })

    it('🛑 autoEnrollLead ASKS THE MODEL FOR A DEMO TOO — only the WALLET gate skips', () => {
      const figsy = readFileSync(join(__dirname, 'figsy.ts'), 'utf8')
        .split('\n').filter(l => !l.trim().startsWith('//') && !l.trim().startsWith('*')).join('\n')
      const fn = figsy.slice(figsy.indexOf('export async function autoEnrollLead'))
      // The model question is asked for every non-fulfilment enrol, demo included…
      expect(fn).toMatch(/if \(!programmeFulfilment\) \{[\s\S]{0,600}mayUseLegacyCommercialPath\(model\)/)
      expect(fn, 'the demo bypass around the MODEL question is gone')
        .not.toMatch(/if \(!isDemo && !programmeFulfilment\) \{[\s\S]{0,600}clientCommercialModel/)
      // …and the WALLET gate still skips for a demo, which is the legitimate demo safety.
      expect(fn).toContain('if (!isDemo && !programmeFulfilment && !canEnroll(client?.figsy_credits_remaining))')
    })

    it('🛑 approveLead REFUSES a declared programme client — nothing written, no rpc', async () => {
      // The end-to-end shape of the hole: the money function itself, not just the resolver.
      state.clients = []; client(PROG_CLIENT, 'programme')
      lead('L1', PROG_CLIENT, { programme_id: null })
      state.written = []; state.rpcs = []

      const out = await approveLead('L1', PROG_CLIENT)

      expect(out.status).toBe('programme_fenced')
      expect(out.status === 'programme_fenced' && out.code).toBe('programme_model')
      expect(state.written, 'the refusal lands before the revealed_at claim').toEqual([])
      expect(state.rpcs, 'and before try_charge_wallet').toEqual([])
    })
  })

  it('🛑 AN UNREADABLE PROGRAMME STATE IS REFUSED — fail-closed', async () => {
    // Not knowing whether a client has an open programme is not permission to charge them $4.
    state.programmesUnreadable = true
    const v = await checkLegacyPerLeadAuthority(PROG_CLIENT)
    expect(v.allowed).toBe(false)
    expect(!v.allowed && v.code).toBe('programme_unresolvable')
    expect(!v.allowed && v.message).toMatch(/nothing was approved and nothing was charged/)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ② THE REFUSAL LANDS BEFORE MONEY AND BEFORE MUTATION
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('② a programme customer calling the legacy money path is refused before anything happens', () => {
  it('🛑 approveLead REFUSES — and NOTHING is written and NO rpc is called', async () => {
    seedOpenProgramme()
    lead('L1', PROG_CLIENT)
    state.written = []; state.rpcs = []

    const out = await approveLead('L1', PROG_CLIENT)

    expect(out.status).toBe('programme_fenced')
    expect(out.revealed).toBe(false)
    // 🛑 THE ORDER IS THE PROOF. `approveLead`'s very first act after this fence is the atomic
    // `revealed_at` claim — a WRITE. An empty write list means the refusal preceded it.
    expect(state.written, 'no table may be written').toEqual([])
    expect(state.rpcs, 'no RPC — every charge in this repo is an RPC').toEqual([])
  })

  it('🛑 revealed_at is NOT stamped on the programme lead', async () => {
    seedOpenProgramme()
    lead('L1', PROG_CLIENT)
    await approveLead('L1', PROG_CLIENT)
    expect(state.leads[0].revealed_at ?? null, 'programme work is not mutated').toBeNull()
  })

  it('🛑 NO PACK SLOT AND NO WALLET CHARGE — named, as well as allowlisted', async () => {
    seedOpenProgramme()
    lead('L1', PROG_CLIENT)
    await approveLead('L1', PROG_CLIENT)
    expect(state.written).not.toContain('credit_transactions')
    for (const r of ['try_charge_wallet', 'try_charge_reveal_credit', 'try_charge_figsy_credit', 'reveal_is_owned', 'record_reveal_or_refund']) {
      expect(state.rpcs, `${r} must not be reached`).not.toContain(r)
    }
  })

  it('🛑 it refuses a HISTORICAL null-attributed lead of the same client too', async () => {
    // The founder chose the client-level rule precisely for this: scoping the fence to
    // `lead.programme_id` would leave House's ~166 retired rows commercially mutable — and
    // chargeable — while their programme is open.
    seedOpenProgramme()
    lead('L_OLD', PROG_CLIENT, { programme_id: null })
    const out = await approveLead('L_OLD', PROG_CLIENT)
    expect(out.status).toBe('programme_fenced')
    expect(state.written).toEqual([])
    expect(state.leads[0].revealed_at ?? null).toBeNull()
  })

  it('🛑 an UNREADABLE programme state refuses rather than charging', async () => {
    lead('L1', PROG_CLIENT)
    state.programmesUnreadable = true
    state.written = []; state.rpcs = []
    const out = await approveLead('L1', PROG_CLIENT)
    expect(out.status).toBe('programme_fenced')
    expect(state.written).toEqual([])
    expect(state.rpcs).toEqual([])
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ③ THE GENUINE LEGACY CLIENT IS UNCHANGED
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('③ a client with NO programme keeps their existing legitimate path', () => {
  it('🛑 approveLead PROCEEDS PAST THE FENCE — it is not the thing that stops them', async () => {
    lead('L1', LEGACY_CLIENT)
    const out = await approveLead('L1', LEGACY_CLIENT)
    // Whatever this legacy client's outcome is, it is NOT the programme fence — the fence is
    // transparent to them. (The outcome here is `no_campaign`, the pre-existing #625 guard,
    // because this fixture seeds no campaign; the point is that the flow got that far.)
    expect(out.status).not.toBe('programme_fenced')
    // 🛑 AND THE CLAIM RAN. `revealed_at` was stamped by the atomic claim, which is the very
    // next statement after the fence — so the fence did not intercept them.
    expect(state.written, 'the legacy path still reaches its first write').toContain('leads')
  })

  it('the fence costs a legacy client exactly TWO reads and no more', async () => {
    // ⛓️ C2 — was "exactly one programme read". It is now one `clients` read (which model?)
    // followed by one `programmes` read (is one open?), and the count is asserted rather than
    // described: a resolver that quietly re-reads per call is a per-approval cost on the one
    // path a client hits repeatedly.
    state.written = []; state.rpcs = []; state.reads = []
    const v = await checkLegacyPerLeadAuthority(LEGACY_CLIENT)
    expect(v.allowed).toBe(true)
    expect(state.reads, 'the model first, then the programme — and nothing else').toEqual(['clients', 'programmes'])
    expect(state.written, 'the fence itself writes nothing, ever').toEqual([])
    expect(state.rpcs).toEqual([])
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ④ CALIBRATION IS NOT COMMERCIAL, AND IS NOT FENCED
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('④ Milla\'s "Looks right", pass and feedback are untouched', () => {
  const leadsSrc = readFileSync(join(join(__dirname, '..'), 'routes/leads.ts'), 'utf8')
  const code = leadsSrc.split('\n').filter(l => !l.trim().startsWith('//') && !l.trim().startsWith('*')).join('\n')

  it('🛑 THE ENROL DOOR IS FENCED TOO — it charges $4 without going through batchGate', () => {
    // ⛓️ 3 Sep (C2) — A DOOR PR B MISSED. `POST /figsy/webhook/enrol` and
    // `POST /figsy/campaigns/:id/enroll` call `chargeFigsyEnroll` DIRECTLY, which takes a flat
    // $4 from the wallet per lead. Neither goes through `batchGate`, so the client-level rule
    // PR B locked was enforced on three routes and not on these two.
    const figsyRoutes = readFileSync(join(join(__dirname, '..'), 'routes/figsy.ts'), 'utf8')
      .split('\n').filter(l => !l.trim().startsWith('//') && !l.trim().startsWith('*')).join('\n')
    const fences = [...figsyRoutes.matchAll(/const fence = await checkLegacyPerLeadAuthority\(clientId\)/g)]
    expect(fences, 'both enrol loops carry the fence').toHaveLength(2)
    // ⚠️ AND EACH ONE LANDS BEFORE THE CHARGE. The charge is what this is protecting against,
    // so a fence after it would refuse a client who had already been billed.
    const charges = [...figsyRoutes.matchAll(/await chargeFigsyEnroll\(clientId, lead\)/g)]
    expect(charges).toHaveLength(2)
    for (let i = 0; i < 2; i++) {
      expect(fences[i].index, 'the fence precedes its charge').toBeLessThan(charges[i].index!)
    }
    // ⛓️ CORRECTED — this used to assert the fence was SKIPPED for a demo. Founder-ruled:
    // `is_demo` and `commercial_model` are orthogonal, and that skip made the demo flag a grant
    // of legacy commercial workflow. The fence now runs for every client; only the CHARGE is
    // demo-exempt, and that exemption lives in `chargeFigsyEnroll` where it belongs.
    expect(figsyRoutes, 'no demo bypass may sit around the commercial fence')
      .not.toContain('if (!(await isDemoClient(clientId))) {')
    expect(figsyRoutes, 'the refusal carries the verdict code, never a hardcoded one')
      .toContain('res.status(409).json({ success: false, error: fence.code, message: fence.message })')
  })

  it('🛑 exactly THREE routes are fenced, and they are the three commercial ones', () => {
    // `batchGate` is the shared chokepoint; every route that calls it is fenced, and no route
    // that does not call it is.
    const gateCallers = [...code.matchAll(/await batchGate\(/g)].length
    expect(gateCallers, 'approve, reveal and approve-batch — no more, no fewer').toBe(3)
    const fencedHandlers = [...code.matchAll(/if \('fenced' in \w+\)/g)].length
    expect(fencedHandlers, 'every batchGate caller answers the fence').toBe(3)
  })

  it('🛑 the calibration routes do NOT call batchGate and do NOT call approveLead', () => {
    // Slice each calibration handler out and prove neither commercial mechanism appears in it.
    for (const route of ['/:id/proof-accept', '/:id/pass', '/:id/feedback']) {
      const start = code.indexOf(`leadRouter.post('${route}'`)
      expect(start, `${route} must exist`).toBeGreaterThan(-1)
      // Up to the next route declaration.
      const rest = code.slice(start + 10)
      const nextIdx = rest.search(/\nleadRouter\.(post|get|patch|delete)\(/)
      const body = nextIdx === -1 ? rest : rest.slice(0, nextIdx)
      expect(body, `${route} must not be gated by batchGate`).not.toContain('batchGate')
      expect(body, `${route} must not reach approveLead`).not.toContain('approveLead')
    }
  })

  it('🛑 approveLead is reached from the three commercial routes and nowhere else', () => {
    const callers = [...code.matchAll(/await approveLead\(/g)].length
    expect(callers, 'approve, reveal, approve-batch').toBe(3)
  })

  it('the calibration surface in Milla posts no commercial route', () => {
    const page = readFileSync(
      join(__dirname, '../../../portal/src/app/(milla)/milla/page.tsx'), 'utf8')
    const visible = page.split('\n').filter(l => !l.trim().startsWith('//') && !l.trim().startsWith('*')).join('\n')
    expect(visible).toContain('/proof-accept')
    expect(visible).toMatch(/\/leads\/\$\{id\}\/pass/)
    expect(visible).not.toMatch(/api\.post\(`\/leads\/[^`]*\/approve`/)
    expect(visible).not.toMatch(/api\.post\(`\/leads\/[^`]*\/reveal`/)
    expect(visible).not.toContain('approve-batch')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ⑤ TWO LAYERS, BOTH BEFORE THE FIRST WRITE
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('⑤ the fence is at the route chokepoint AND inside the money function', () => {
  const leadsCode = readFileSync(join(join(__dirname, '..'), 'routes/leads.ts'), 'utf8')
    .split('\n').filter(l => !l.trim().startsWith('//') && !l.trim().startsWith('*')).join('\n')
  const approveCode = readFileSync(join(__dirname, 'approve-lead.ts'), 'utf8')
    .split('\n').filter(l => !l.trim().startsWith('//') && !l.trim().startsWith('*')).join('\n')

  it('🛑 batchGate fences FIRST — before the batch minimum and before any lead read', () => {
    const gate = leadsCode.slice(leadsCode.indexOf('async function batchGate'))
    const fenceAt = gate.indexOf('checkLegacyPerLeadAuthority')
    const checkBatchAt = gate.indexOf("import('../lib/approval-batch')")
    const leadReadAt = gate.indexOf("db.from('leads')")
    expect(fenceAt).toBeGreaterThan(-1)
    expect(fenceAt, 'the fence precedes the batch rule').toBeLessThan(checkBatchAt)
    expect(fenceAt, 'the fence precedes the lead read').toBeLessThan(leadReadAt)
  })

  it('🛑 approveLead fences BEFORE its atomic claim — the claim is a WRITE', () => {
    const fn = approveCode.slice(approveCode.indexOf('export async function approveLead'))
    const fenceAt = fn.indexOf('checkLegacyPerLeadAuthority')
    const claimAt = fn.indexOf("update({ revealed_at: now })")
    const chargeAt = fn.indexOf("try_charge_wallet")
    expect(fenceAt).toBeGreaterThan(-1)
    expect(claimAt).toBeGreaterThan(-1)
    expect(fenceAt, 'the fence precedes the revealed_at claim').toBeLessThan(claimAt)
    expect(fenceAt, 'the fence precedes the wallet charge').toBeLessThan(chargeAt)
  })

  it('the second layer exists so a FOURTH caller inherits the refusal', () => {
    // `approveLead` is described in this repository as shared with an operator-on-behalf path.
    // A money function whose only guard lives in one of its callers is one import away from
    // being unguarded — so the guard is in the function too.
    expect(approveCode).toContain('const fence = await checkLegacyPerLeadAuthority(clientId)')
    // ⛓️ C2 — `code` added. The outcome carries WHICH refusal it was, because the route used to
    // answer every one of them with the literal string `programme_open` — a false statement to
    // a programme client who has no programme open.
    expect(approveCode).toContain("return { status: 'programme_fenced', revealed: false, message: fence.message, code: fence.code }")
    const leadsRoute = readFileSync(join(join(__dirname, '..'), 'routes/leads.ts'), 'utf8')
    expect(leadsRoute, 'the route must forward the verdict code, never hardcode one')
      .toContain("error: outcome.code, message: outcome.message")
  })
})
