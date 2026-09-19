// ══════════════════════════════════════════════════════════════════════════════════════════
// J5-C6 · DESK BAND = GATE BAND, AND A "NOT A FIT" CARD CLAIMS NOTHING AND ACCEPTS NOTHING
//
// REQ: *"Not-a-fit carries no positive claim or accept control"* (PV 02).
//
// ── ① THE DESK BANDED AGAINST THE WRONG TARGETING ───────────────────────────────────────
//
// The structural gate judges a batch against the ICP THE RUN USED. The desk re-derives the
// band at read time — correctly, so a later model verdict can refine it (J5-C13) — but it
// fetched its criteria like this:
//
//     .from('icps').select(…).eq('client_id', clientId)
//       .order('created_at', { ascending: false }).limit(1)
//
// 🛑 THE CLIENT'S NEWEST ICP, NOT THE LEAD'S. One client, two ICPs — or one ICP replaced
// after a refinement — and every card on the desk is judged against targeting it was never
// sourced for. A perfect UK marketing-agency match, gated and surfaced, is banded **"Not a
// fit"** because a newer ICP says Germany. The gate and the desk disagree about the same row,
// which is the exact shape C05 exists to stop — and `leads.icp_id` has been on the row the
// whole time, read by `/proof-accept` two hundred lines below.
//
// ── ② AND A REFUSED CARD STILL CARRIED THE MODEL'S CASE FOR IT ──────────────────────────
//
// A `not_a_fit` card rendered **"Why this fits: …"** — the scorer's positive sentence,
// forwarded verbatim under a label saying the opposite. That is the 72/100 card again, one
// band over: the label and the prose making different claims about one company.
//
// ── ③ AND IT OFFERED THE ACCEPT CONTROL, WHICH ON THIS DESK CHANGES TARGETING ────────────
//
// 🛑 "👍 Looks right" IS NOT A REACTION. `/leads/:id/proof-accept` ADOPTS a widened proof
// basis — it writes `job_titles` and `seniority_levels` onto the live ICP. So accepting a card
// the product itself refused would rewrite the client's targeting on the strength of it, and
// would write `lead_feedback.action = 'approve'`, which is the counter the calibration
// escalation reads. The control must be gone from the card AND refused by the route: a button
// hidden in a browser is not a refusal.
// ══════════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

type Row = Record<string, unknown>

const state: { clients: Row[]; leads: Row[]; icps: Row[]; txs: Row[]; feedback: Row[] } =
  { clients: [], leads: [], icps: [], txs: [], feedback: [] }

function table(name: string) {
  const rows = (): Row[] =>
    name === 'leads' ? state.leads : name === 'icps' ? state.icps
    : name === 'credit_transactions' ? state.txs
    : name === 'lead_feedback' ? state.feedback : state.clients
  const q: any = {
    _f: [] as ((r: Row) => boolean)[], _limit: 0, _sort: null as { c: string; asc: boolean } | null,
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
    // 🛑 REAL ORDERING, AND IT IS LOAD-BEARING. The defect under test is
    // `.order('created_at', { ascending: false }).limit(1)` picking the client's NEWEST ICP.
    // A no-op `order()` returns rows in insertion order, so the desk would pick the sourced
    // ICP by accident and the whole of ① would pass against the defect it exists to catch.
    order(c: string, o?: { ascending?: boolean }) {
      q._sort = { c, asc: o?.ascending !== false }; return q
    },
    limit(n: number) { q._limit = n; return q },
    // The approve-reaction write. Recorded so a test can prove a REFUSED accept never
    // becomes a `looksRight` the calibration escalation counts.
    async upsert(v: Row) { state.feedback.push(v); return { error: null } },
    async update() { return { error: null } },
    _hit() {
      const all = rows().filter(r => q._f.every((f: (r: Row) => boolean) => f(r)))
      if (q._sort) {
        const { c, asc } = q._sort
        all.sort((a, b) => (String(a[c] ?? '') < String(b[c] ?? '') ? -1 : String(a[c] ?? '') > String(b[c] ?? '') ? 1 : 0) * (asc ? 1 : -1))
      }
      return q._limit > 0 ? all.slice(0, q._limit) : all
    },
    async maybeSingle() { return { data: q._hit()[0] ?? null, error: null } },
    async single() { return { data: q._hit()[0] ?? null, error: null } },
    then(res: (v: unknown) => unknown) {
      return Promise.resolve({ data: q._hit(), error: null, count: q._hit().length }).then(res)
    },
  }
  return q
}

vi.mock('@kind/db', () => ({
  db: {
    from: (t: string) => table(t),
    rpc: async () => ({ data: null, error: null }),
    auth: { admin: { getUserById: async () => ({ data: { user: { email: 'nobody@example.com' } } }) } },
  },
}))
vi.mock('./alerts', () => ({ sendFounderAlert: () => Promise.resolve() }))
vi.mock('../lib/alerts', () => ({ sendFounderAlert: () => Promise.resolve() }))
vi.mock('../middleware/auth', () => ({
  requireAuth: (_r: unknown, _s: unknown, next: () => void) => next(),
}))
vi.mock('@anthropic-ai/sdk', () => ({ default: class { messages = { create: async () => ({ content: [] }) } } }))

const C = 'c-desk'
const USER = 'u-desk'
const AT = '2026-09-17T10:00:00.000Z'

/** The ICP the lead was actually sourced under. */
const ICP_SOURCED = {
  id: 'icp-sourced', client_id: C, is_active: true, pending_targeting: null,
  geographies: ['United Kingdom'], company_sizes: ['11–50'], industries: [],
  job_titles: ['Founder'], seniority_levels: ['founder'],
  target_category: 'marketing agencies', target_company_type: null, exclusions: null,
  proof_widened_candidate: null, created_at: '2026-09-01T00:00:00.000Z',
}

/**
 * A NEWER ICP for the same client, targeting something else entirely. Nothing on the desk was
 * sourced for it — it exists only to be the row `.order(created_at desc).limit(1)` picks.
 */
const ICP_NEWER = {
  id: 'icp-newer', client_id: C, is_active: true, pending_targeting: null,
  geographies: ['Germany'], company_sizes: ['501–1,000'], industries: [],
  job_titles: ['Site Manager'], seniority_levels: ['manager'],
  // ⚠️ A SINGLE MARKET WORD ON PURPOSE. "construction firms" reduces to the core word
  // "firms" — `categoryVerdict` strips organisational words and `construction` is one of
  // them — so it would match almost nothing and this fixture would be testing that quirk
  // rather than which ICP the desk read. Reported in the evidence package, not fixed here.
  target_category: 'logistics', target_company_type: null, exclusions: null,
  proof_widened_candidate: null, created_at: '2026-09-10T00:00:00.000Z',
}

/** A textbook match for `ICP_SOURCED`, and a textbook refusal for `ICP_NEWER`. */
function surfacedLead(over: Row = {}) {
  state.leads.push({
    id: 'lead-1', client_id: C, icp_id: ICP_SOURCED.id, programme_id: null, proof_pass: 1,
    delivered_at: AT, surfaced_for_approval_at: AT, revealed_at: null, set_aside_reason: null,
    status: 'scored', score: 88, score_reasoning: 'Runs a UK marketing agency of the right size.',
    first_name: 'Ada', last_name: 'Vaughan', job_title: 'Founder', seniority: 'founder',
    company: 'Fathom Marketing Agency', industry: 'Marketing', company_size: '24',
    country: 'United Kingdom', category_fit: null, created_at: AT, ...over,
  })
}

async function forApprovalCards(): Promise<Array<Record<string, any>>> {
  const mod = await import('../routes/leads')
  const layer = (mod.leadRouter as unknown as { stack: Array<Record<string, any>> }).stack
    .find(l => l.route?.path === '/for-approval' && l.route?.methods.get)
  if (!layer) throw new Error('GET /for-approval not found on leadRouter')
  const handler = layer.route.stack[layer.route.stack.length - 1].handle
  let payload: any = null
  const res: any = { json: (b: unknown) => { payload = b }, status: () => res }
  await handler({ userId: USER, query: {}, body: {}, params: {} }, res, () => {})
  return (payload?.data ?? []) as Array<Record<string, any>>
}

async function proofAccept(id: string): Promise<{ status: number; body: any }> {
  const mod = await import('../routes/leads')
  const layer = (mod.leadRouter as unknown as { stack: Array<Record<string, any>> }).stack
    .find(l => l.route?.path === '/:id/proof-accept' && l.route?.methods.post)
  if (!layer) throw new Error('POST /:id/proof-accept not found on leadRouter')
  const handler = layer.route.stack[layer.route.stack.length - 1].handle
  let status = 200
  let body: any = null
  const res: any = { status(c: number) { status = c; return res }, json(b: unknown) { body = b; return res } }
  await handler({ userId: USER, query: {}, body: {}, params: { id } }, res, () => {})
  return { status, body }
}

beforeEach(() => {
  state.clients = [{ id: C, user_id: USER, proof_passes_done: 1, plan: 'lead_gen', wallet_balance_usd: 0 }]
  state.leads = []; state.icps = [ICP_SOURCED, ICP_NEWER]; state.txs = []; state.feedback = []
})

// ═════════════════════════════════════════════════════════════════════════════════════════
// ① THE BAND IS THE GATE'S BAND
// ═════════════════════════════════════════════════════════════════════════════════════════
describe('J5-C6 · the desk judges a card against the targeting it was SOURCED for', () => {
  it('🛑 a perfect match is NOT banded "Not a fit" because a newer ICP exists', async () => {
    surfacedLead()
    const [card] = await forApprovalCards()
    expect(card, 'the desk returned no card at all').toBeTruthy()
    expect(
      card.band,
      'the desk judged a UK marketing-agency match against a newer construction ICP it was never sourced for',
    ).toBe('start_here')
  })

  it('a client with ONE ICP is completely unaffected — this narrows nothing', async () => {
    state.icps = [ICP_SOURCED]
    surfacedLead()
    const [card] = await forApprovalCards()
    expect(card.band).toBe('start_here')
    expect(card.can_accept).toBe(true)
  })

  it('a lead with no ICP on the row is judged against no requirements, exactly as before', async () => {
    // A legacy row, or one whose ICP was deleted. `fitBand` then sees nothing to fail — which
    // is what a failed ICP read has always produced here — and the score still decides.
    surfacedLead({ icp_id: null, country: 'Germany', industry: 'Construction' })
    const [card] = await forApprovalCards()
    expect(card.band).toBe('start_here')
  })

  it('two leads from two different ICPs are each judged against their own', async () => {
    surfacedLead()
    surfacedLead({
      id: 'lead-2', icp_id: ICP_NEWER.id, country: 'Germany', company_size: '800',
      industry: 'Logistics', company: 'Baumeister Logistics GmbH',
      job_title: 'Site Manager', seniority: 'manager',
    })
    const cards = await forApprovalCards()
    const byId = Object.fromEntries(cards.map(c => [c.id, c]))
    expect(byId['lead-1'].band, 'the UK agency was judged against the German ICP').toBe('start_here')
    expect(byId['lead-2'].band, 'the German builder was judged against the UK ICP').toBe('start_here')
  })
})

// ═════════════════════════════════════════════════════════════════════════════════════════
// ② A REFUSED CARD MAKES NO POSITIVE CLAIM
// ═════════════════════════════════════════════════════════════════════════════════════════
describe('J5-C6 · "Not a fit" carries no positive claim', () => {
  /** The gate admitted it; the model then judged the category a refusal (J5-C13 · FD-2). */
  const refused = () => surfacedLead({ category_fit: 'no' })

  it('the fixture really is banded not_a_fit — otherwise this whole block proves nothing', async () => {
    refused()
    const [card] = await forApprovalCards()
    expect(card.band).toBe('not_a_fit')
  })

  it('🛑 the scorer\'s "why this fits" sentence is NOT forwarded', async () => {
    refused()
    const [card] = await forApprovalCards()
    expect(
      card.why_fits,
      'a card labelled "Not a fit" carried the model\'s case for it — the 72/100 card, one band over',
    ).toBeNull()
  })

  it('🛑 and the criterion that refused it is stated instead — PV 02 prints the reason', async () => {
    refused()
    const [card] = await forApprovalCards()
    expect(card.band_reason, 'a refusal with no reason is a refusal the client cannot act on').toBeTruthy()
    expect(String(card.band_reason)).toMatch(/kind of company you asked for/)
    // Client-safe: a criterion in their own terms, never a column, a provider or a score.
    expect(String(card.band_reason)).not.toMatch(/category_fit|industry tag|score|apollo|pdl/i)
  })

  it('🛑 and it carries NO operator vocabulary — `mvp1-proof-exception` locks that out', async () => {
    // 🛑 THE TWO RULES GENUINELY COLLIDED AND THIS IS THE RESOLUTION.
    // `mvp1-proof-exception.test.ts` locks it: *"the operator panel names criteria; the CLIENT
    // keeps FAILED_RUN_BODY … the criterion vocabulary lives only in the admin app"* — and it
    // forbids the words `set_aside_reason` / "set aside" anywhere on the Milla page. PV 02, the
    // SOURCE for this very item, shows a client a set-aside prospect WITH its reason printed.
    //
    // They are reconcilable because `setAsideReason` is two things joined by a colon: the
    // CRITERION KEY (`category:`), which is the operator's grouping vocabulary and is stamped
    // on `leads.set_aside_reason`, and the SENTENCE, which was already written in the client's
    // own terms. The client gets the sentence. Neither rule is weakened, and the older guard
    // is untouched.
    const { setAsideReason, setAsideSentence, hardFit } = await import('./proof-fit')
    const fit = hardFit({ country: 'Germany' }, { geographies: ['United Kingdom'] })
    expect(setAsideReason(fit), 'the operator record lost its criterion key').toMatch(/^geography: /)
    expect(setAsideSentence(fit), 'the client sentence carries the operator key').not.toMatch(/geography/)
    expect(setAsideSentence(fit)).toBe('outside the countries you asked for')
    // The two can never describe different criteria: one is the other, prefixed.
    expect(String(setAsideReason(fit))).toBe(`geography: ${setAsideSentence(fit)}`)
  })

  it('an ADMITTED card keeps its reasoning and carries no band reason', async () => {
    surfacedLead()
    const [card] = await forApprovalCards()
    expect(card.why_fits).toBe('Runs a UK marketing agency of the right size.')
    expect(card.band_reason).toBeNull()
  })

  it('it is never starred, and its number cannot claim more than the structure supports', async () => {
    refused()
    const [card] = await forApprovalCards()
    expect(card.recommended).toBe(false)
    expect(Number(card.score)).toBeLessThanOrEqual(30)
  })
})

// ═════════════════════════════════════════════════════════════════════════════════════════
// ③ AND NO ACCEPT CONTROL — ON THE CARD, AND IN THE ROUTE
// ═════════════════════════════════════════════════════════════════════════════════════════
describe('J5-C6 · "Not a fit" offers no accept control, and the route refuses one anyway', () => {
  it('🛑 the card says the control does not belong to it', async () => {
    surfacedLead({ category_fit: 'no' })
    const [card] = await forApprovalCards()
    expect(card.can_accept, 'a refused card still offered "Looks right"').toBe(false)
  })

  it('🛑 THE ROUTE REFUSES IT — a button hidden in a browser is not a refusal', async () => {
    // `/proof-accept` ADOPTS a widened basis onto the live ICP. Accepting a card the product
    // refused would rewrite the client's targeting on the strength of it.
    surfacedLead({ category_fit: 'no' })
    const { status, body } = await proofAccept('lead-1')
    expect(status, 'a structurally-refused card was accepted by the server').toBe(409)
    expect(String(body?.code ?? body?.error)).toBeTruthy()
  })

  it('🛑 and it writes NO approve feedback — that counter drives the calibration escalation', async () => {
    // `looksRight` is read from `lead_feedback.action = 'approve'`. Recording one for a card
    // we refused would teach the calibration rule from a reaction the client was never
    // offered — and the reaction write deliberately runs before every OTHER gate on this
    // route, so this refusal has to come before it.
    surfacedLead({ category_fit: 'no' })
    await proofAccept('lead-1')
    expect(
      state.feedback.filter(f => f.action === 'approve'),
      'a refused card was recorded as "looks right"',
    ).toHaveLength(0)
  })

  it('an ADMITTED card still reaches the ordinary acceptance path, unchanged', async () => {
    surfacedLead()
    const { status } = await proofAccept('lead-1')
    expect(status, 'a legitimate acceptance was refused by the new guard').toBe(200)
    expect(state.feedback.filter(f => f.action === 'approve')).toHaveLength(1)
  })
})

// ═════════════════════════════════════════════════════════════════════════════════════════
// ④ THE SCREEN OBEYS THE SERVER
// ═════════════════════════════════════════════════════════════════════════════════════════
describe('J5-C6 · the card renders what the server decided, never its own rule', () => {
  // ⚠️ COMMENT-STRIPPED. An absence assertion that reads comments passes or fails on prose —
  // and the note beside this very change quotes the pattern it forbids.
  const PAGE = readFileSync(
    join(__dirname, '../../../portal/src/app/(milla)/milla/page.tsx'), 'utf8',
  )
    .split('\n')
    .filter(l => { const t = l.trim(); return !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*') })
    .join('\n')

  it('🛑 the accept button is gated on the SERVER\'S answer', () => {
    expect(PAGE, 'the browser still offers "Looks right" on every card')
      .toMatch(/can_accept !== false && \(/)
    // Re-deriving `band !== 'not_a_fit'` in the browser would be a second authority on fit,
    // which is the thing `band_label` was introduced to stop.
    expect(PAGE, 'the screen decides acceptability for itself')
      .not.toMatch(/band !== 'not_a_fit'/)
  })

  it('🛑 the refusal reason renders where the positive claim used to', () => {
    expect(PAGE).toMatch(/l\.band_reason/)
    expect(PAGE, 'the "Why this fits" block is no longer conditional on there being one')
      .toMatch(/\{l\.why_fits && /)
  })

  it('the "Not a fit" control is untouched — a client may always reject a card', () => {
    expect(PAGE).toMatch(/pass\(l\.id\)/)
  })
})
