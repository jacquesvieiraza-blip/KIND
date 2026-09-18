// ══════════════════════════════════════════════════════════════════════════════════════════
// J5-C10 · A PENDING ICP REVIEW IS A VIDA NEEDS-YOU — and the promoted row can carry one
//
// ── ① THE FENCE MY OWN J4-C1 ROUTED AROUND (the serious one) ────────────────────────────
//
// S1-PD-03 is founder-locked and its wording is about a property, not a line of code: *"the
// row cannot be born unflagged, so no failure mode can leave it that way."* `PUT /icps`
// honours it — `deriveProviderReview` is called for the values it is ABOUT to write, and the
// review lands in the same statement.
//
// 🛑 `promoteConfirmedBrief` (J4-C1, THIS BUILD) DOES NOT. `icpFromDraft` takes the six
// targeting facts from the confirmed brief and inserts them directly:
//
//     industries: str(f.target_category) ? [str(f.target_category)] : [],
//     seniority_levels: arr(f.seniority_levels),
//     company_sizes: arr(f.company_sizes),
//
// Those are THE CLIENT'S OWN WORDS. "about 10 to 50 staff" is not a value any provider takes,
// and nothing on this path translates it or flags it — so the ICP is born active, unflagged
// and untranslatable. `icpNeedsReview` then answers `false`, the Proof gate opens, and
// `runIcpJob` sends the client's sentence to Apollo AS A FILTER VALUE. That is the exact
// thing the founder's rule forbids, arriving through the mechanism built to honour their
// words — and it arrived because server-owned promotion was built as a new door beside the
// fence rather than through it.
//
// ── ② THE ITEM ITSELF: THE REVIEW IS NOT IN THE QUEUE ───────────────────────────────────
//
// `GET /operator/icp-review` is a DEDICATED RAIL, and XC-5's own header names why that is not
// enough: *"Northvale's ICP sat in unresolved `icp_review`, nothing ran, and Vida said no
// action was needed."* R117 wants ONE queue — `operator_tasks` — and there is no task kind for
// a pending review and nothing that raises one. Milla's half was built in J5-C2
// (`needs_icp_review` on the summary); Vida's half is missing.
//
// ⚠️ ONE MECHANISM, TWO TRIGGERS — NOT TWO MECHANISMS. The detector below and the write path
// both call the SAME raise with the SAME dedupe key, so the partial unique index makes them
// idempotent against each other. That is how `provider_credits_exhausted` already behaves. It
// is deliberately NOT a second derivation of "is this client in review" — there is exactly
// one, `icpNeedsReview`, and both triggers ask it.
// ══════════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, beforeEach, vi } from 'vitest'

type Row = Record<string, unknown>

const store = vi.hoisted(() => ({
  clients: [] as Row[],
  icps: [] as Row[],
  onboarding_brief_drafts: [] as Row[],
  operator_tasks: [] as Row[],
  partners: [] as Row[],
  partner_referrals: [] as Row[],
  subscriptions: [] as Row[],
  seq: 0,
  unreadable: null as string | null,
}))

vi.mock('@kind/db', () => {
  const bag = (t: string): Row[] => {
    const s = store as unknown as Record<string, Row[]>
    if (!Array.isArray(s[t])) s[t] = []
    return s[t]
  }
  const from = (t: string) => {
    const f: ((r: Row) => boolean)[] = []
    let ord: { c: string; asc: boolean } | null = null
    let lim = Infinity
    const fail = () => (store.unreadable === t ? { message: `${t} unreadable`, code: '57014' } : null)
    const hits = () => {
      let out = bag(t).filter(r => f.every(fn => fn(r)))
      if (ord) {
        const { c, asc } = ord
        out = [...out].sort((a, b) => String(a[c] ?? '').localeCompare(String(b[c] ?? '')) * (asc ? 1 : -1))
      }
      return lim === Infinity ? out : out.slice(0, lim)
    }
    const q: Record<string, unknown> = {
      select() { return q },
      eq(c: string, v: unknown) { f.push(r => r[c] === v); return q },
      is(c: string, v: unknown) { f.push(r => (r[c] ?? null) === v); return q },
      in(c: string, v: unknown[]) { f.push(r => v.includes(r[c])); return q },
      not(c: string, op: string, v: unknown) {
        if (op === 'in') {
          const set = String(v).replace(/^\(|\)$/g, '').split(',').map(x => x.trim())
          f.push(r => !set.includes(String(r[c] ?? '')))
        } else { f.push(r => (r[c] ?? null) !== v) }
        return q
      },
      order(c: string, o?: { ascending?: boolean }) { ord = { c, asc: o?.ascending !== false }; return q },
      limit(n: number) { lim = n; return q },
      async maybeSingle() { const e = fail(); return e ? { data: null, error: e } : { data: hits()[0] ?? null, error: null } },
      async single() { const e = fail(); return e ? { data: null, error: e } : { data: hits()[0] ?? null, error: null } },
      insert(row: Row) {
        // The partial unique index on operator_tasks: ONE open task per (kind, dedupe_key).
        const clash = t === 'operator_tasks' && row.dedupe_key != null && bag(t).some(r =>
          r.kind === row.kind && r.dedupe_key === row.dedupe_key && r.status === 'open')
        const made = { id: `${t}-${++store.seq}`, ...row }
        const err = fail() ?? (clash
          ? { code: '23505', message: 'duplicate key value violates unique constraint "operator_tasks_one_open_per_key"' }
          : null)
        const done = err ? { data: null, error: err } : { data: made, error: null as unknown }
        const push = () => { if (!err) bag(t).push(made) }
        const sel = () => ({
          async maybeSingle() { push(); return done },
          async single() { push(); return done },
          then(res: (v: unknown) => unknown) { push(); return res(done) },
        })
        return { select: sel, then(res: (v: unknown) => unknown) { push(); return res(done) } }
      },
      upsert(row: Row) {
        const key = (r: Row) => r.user_id ?? r.id
        const apply = () => {
          const i = bag(t).findIndex(r => key(r) === key(row))
          const made = i >= 0 ? { ...bag(t)[i], ...row } : { id: `${t}-${++store.seq}`, ...row }
          if (i >= 0) bag(t)[i] = made; else bag(t).push(made)
          return made
        }
        return {
          select: () => ({ async maybeSingle() { return { data: apply(), error: null } } }),
          then(res: (v: unknown) => unknown) { apply(); return res({ error: null }) },
        }
      },
      update(patch: Row) {
        const uf: ((r: Row) => boolean)[] = []
        const u: Record<string, unknown> = {
          eq(c: string, v: unknown) { uf.push(r => r[c] === v); return u },
          is(c: string, v: unknown) { uf.push(r => (r[c] ?? null) === v); return u },
          in(c: string, v: unknown[]) { uf.push(r => v.includes(r[c])); return u },
          select() { return u },
          async maybeSingle() {
            const hit = bag(t).filter(r => uf.every(fn => fn(r)))
            if (!hit.length) return { data: null, error: null }
            Object.assign(hit[0], patch); return { data: hit[0], error: null }
          },
          then(res: (v: unknown) => unknown) {
            const hit = bag(t).filter(r => uf.every(fn => fn(r)))
            for (const r of hit) Object.assign(r, patch)
            return res({ data: hit, error: null })
          },
        }
        return u
      },
      then(res: (v: unknown) => unknown) { const e = fail(); return res(e ? { data: null, error: e } : { data: hits(), error: null }) },
    }
    return q
  }
  return {
    db: {
      from,
      rpc: async () => ({ data: { ok: false, reason: 'in_flight' }, error: null }),
      auth: {
        getUser: async () => ({ data: { user: { id: 'user-1', email: 'ada@redmayne.co.uk' } }, error: null }),
        admin: { getUserById: async () => ({ data: { user: { id: 'user-1', email: 'ada@redmayne.co.uk' } }, error: null }) },
      },
    },
  }
})

/** The RUN is out of scope here — J5-C1 owns it. */
vi.mock('./proof-run-launch', () => ({ launchProofRun: () => {} }))

const CLIENT = 'c1111111-1111-4111-8111-111111111111'
const ICP = 'i2222222-2222-4222-8222-222222222222'

beforeEach(() => {
  store.clients = []; store.icps = []; store.onboarding_brief_drafts = []
  store.operator_tasks = []; store.partners = []; store.partner_referrals = []
  store.subscriptions = []; store.unreadable = null; store.seq = 0
  vi.resetModules()
})

describe('J5-C10 ① · the promoted ICP is BORN carrying its review (S1-PD-03)', () => {
  /**
   * The eleven canonical facts — with a company size THE PROVIDER CANNOT TAKE. "about 10 to
   * 50 staff" is how a person answers the question; `'11–50'` is the only thing Apollo takes.
   */
  const UNTRANSLATABLE = {
    contact_name: 'Ada', company_name: 'Redmayne', website: 'redmayne.co.uk',
    what_they_do: 'fractional finance directors for agencies',
    target_category: 'marketing agencies', geographies: ['United Kingdom'],
    target_company_type: 'agency',
    company_sizes: ['about 10 to 50 staff'],
    job_titles: ['Managing Director'],
    seniority_levels: ['whoever owns the P&L'],
    exclusions: 'no competitors of ours', desired_outcome: 'book qualified meetings',
    country: 'United Kingdom',
  }

  /**
   * ⚠️ THE CATEGORY IS STILL THE CLIENT'S OWN PHRASE, AND THAT IS CORRECT. `target_category`
   * is brief fact #5 — what kind of company they want to reach, in their words — and it is
   * NOT the closed `industries` vocabulary. Only seniority and size are asked with our bands
   * in the question, so only those two can owe a review.
   */
  const TRANSLATABLE = {
    ...UNTRANSLATABLE,
    company_sizes: ['11–50'],
    seniority_levels: ['C-Suite'],
  }

  /** A client whose category HAPPENS to be one of the sixteen. */
  const CANONICAL_CATEGORY = { ...TRANSLATABLE, target_category: 'SaaS' }

  async function promote(facts: Row) {
    store.onboarding_brief_drafts.push({
      id: 'draft-1', user_id: 'user-1', facts, confirmed_at: '2026-09-18T09:00:00Z',
      promoted_client_id: null, promoted_at: null,
      created_at: '2026-09-18T08:00:00Z', updated_at: '2026-09-18T09:00:00Z',
    })
    const { promoteConfirmedBrief } = await import('./promotion')
    const { briefDraftFor } = await import('./brief-draft')
    const draft = await briefDraftFor('user-1')
    return promoteConfirmedBrief('user-1', draft!, { authEmail: 'ada@redmayne.co.uk' })
  }

  it('🛑 an UNTRANSLATABLE brief produces an ICP that is FLAGGED, not one that is silently wrong', async () => {
    const r = await promote(UNTRANSLATABLE)
    expect(r.ok, `promotion refused: ${JSON.stringify(r)}`).toBe(true)
    const icp = store.icps[0]
    expect(icp, 'no ICP was created at all').toBeTruthy()

    const { icpNeedsReview } = await import('./icp-provider-translation')
    expect(
      icpNeedsReview(icp.icp_review, (icp.icp_review_resolved_at as string | null) ?? null),
      'the ICP was born UNFLAGGED with untranslatable targeting — the Proof gate will open and '
      + "the client's own sentence goes to Apollo as a filter value",
    ).toBe(true)
  })

  it('🛑 AND THE CLIENT\'S SENTENCE NEVER BECOMES A PROVIDER FILTER VALUE', async () => {
    await promote(UNTRANSLATABLE)
    const icp = store.icps[0]
    expect(icp.company_sizes, 'a sentence was written into a provider column').not.toContain('about 10 to 50 staff')
    expect(icp.seniority_levels, 'a sentence was written into a provider column').not.toContain('whoever owns the P&L')
    // ⚠️ AND THE WORDS ARE NOT LOST — they survive as the review's own evidence, which is what
    // the operator translates FROM. Dropping them silently would be the other way to be wrong.
    expect(JSON.stringify(icp.icp_review), 'the client\'s words were discarded rather than kept for review')
      .toContain('about 10 to 50 staff')
  })

  it('a brief that translates cleanly gets NO review — the normal path stays cheap', async () => {
    const r = await promote(TRANSLATABLE)
    expect(r.ok).toBe(true)
    const icp = store.icps[0]
    const { icpNeedsReview } = await import('./icp-provider-translation')
    expect(
      icpNeedsReview(icp.icp_review, (icp.icp_review_resolved_at as string | null) ?? null),
      'a perfectly translatable client was put into review',
    ).toBe(false)
    expect(icp.company_sizes).toEqual(['11–50'])
    expect(icp.seniority_levels).toEqual(['C-Suite'])
  })

  it('🛑 the free-text CATEGORY never becomes a provider industry, and never owes a review', async () => {
    // ⛓️ THE SECOND CORRECTION IN THIS ITEM. `industries: [str(f.target_category)]` put
    // "marketing agencies" into Apollo's closed 16-value industry filter — broken as a filter
    // (the search returns nothing) and, once a review was derived from it, every single signup
    // would have become an operator task. The category lives on the ICP's NAME and is enforced
    // semantically by FD-2; the provider column carries canonical values or none.
    await promote(TRANSLATABLE)
    const icp = store.icps[0]
    expect(icp.industries, 'a free-text category was written into the provider industry filter')
      .not.toContain('marketing agencies')
    expect(icp.industries, 'an untranslatable category left a value in the column').toEqual([])
    expect(icp.name, "the client's own category words were lost from the ICP").toBe('marketing agencies')
    const { icpNeedsReview } = await import('./icp-provider-translation')
    expect(
      icpNeedsReview(icp.icp_review, null),
      'every client whose category is not one of our sixteen was put into the operator queue',
    ).toBe(false)
  })

  it('a category that IS one of the sixteen is canonicalised, not discarded', async () => {
    await promote(CANONICAL_CATEGORY)
    expect(store.icps[0].industries, 'a translatable category was thrown away').toEqual(['SaaS'])
  })

  it('🛑 the flagged ICP raises the Vida task in the SAME promotion, not on the next cron tick', async () => {
    // A client who has just confirmed their brief is waiting on this. Five minutes of an empty
    // queue is five minutes of an operator not knowing there is anything to do.
    await promote(UNTRANSLATABLE)
    const tasks = store.operator_tasks.filter(t => t.kind === 'icp_review_pending')
    expect(tasks, 'promotion flagged the ICP and told nobody').toHaveLength(1)
    expect(tasks[0].client_id).toBe(store.clients[0].id)
    expect(tasks[0].status).toBe('open')
  })
})

describe('J5-C10 ② · the detector finds reviews that were already sitting there', () => {
  const pendingIcp = (over: Row = {}): Row => ({
    id: ICP, client_id: CLIENT, name: 'Marketing agencies', is_active: true,
    icp_review: { requirements: [{ field: 'company_sizes', said: ['about 10 to 50 staff'] }] },
    icp_review_at: '2026-09-18T09:00:00Z', icp_review_resolved_at: null, ...over,
  })

  beforeEach(() => {
    store.clients = [{ id: CLIENT, company_name: 'Redmayne', user_id: 'user-1' }]
  })

  it('🛑 NORTHVALE · an ICP already in unresolved review becomes a Needs-you row', async () => {
    // The case XC-5's own header names. An event-only raise would never have found it, because
    // the event happened before the mechanism existed.
    store.icps = [pendingIcp()]
    const { detectPendingIcpReviews } = await import('./icp-review-tasks')
    const res = await detectPendingIcpReviews()
    expect(res.ok).toBe(true)
    expect(res.raised).toBe(1)
    const t = store.operator_tasks.find(x => x.kind === 'icp_review_pending')
    expect(t, 'the detector found the review and raised nothing').toBeTruthy()
    expect(t!.client_id).toBe(CLIENT)
    expect(t!.subject_id).toBe(ICP)
    expect(String(t!.title), 'the task does not name the company an operator has to act for')
      .toContain('Redmayne')
  })

  it('🛑 a RESOLVED review raises nothing — and this is the one predicate, not a second copy', async () => {
    store.icps = [pendingIcp({ icp_review_resolved_at: '2026-09-18T10:00:00Z' })]
    const { detectPendingIcpReviews } = await import('./icp-review-tasks')
    const res = await detectPendingIcpReviews()
    expect(res.raised).toBe(0)
    expect(store.operator_tasks).toHaveLength(0)
  })

  it('an ICP with no review at all raises nothing', async () => {
    store.icps = [pendingIcp({ icp_review: null, icp_review_at: null })]
    const { detectPendingIcpReviews } = await import('./icp-review-tasks')
    expect((await detectPendingIcpReviews()).raised).toBe(0)
  })

  it('🛑 the sweep is IDEMPOTENT — twelve cron ticks are one row, not twelve', async () => {
    store.icps = [pendingIcp()]
    const { detectPendingIcpReviews } = await import('./icp-review-tasks')
    await detectPendingIcpReviews()
    await detectPendingIcpReviews()
    await detectPendingIcpReviews()
    expect(
      store.operator_tasks.filter(t => t.kind === 'icp_review_pending' && t.status === 'open'),
      'a five-minute cron would file 288 identical rows a day and the queue becomes unreadable',
    ).toHaveLength(1)
  })

  it('🛑 F-DBREAD · an unreadable icps table is REPORTED, never read as "no reviews"', async () => {
    store.icps = [pendingIcp()]
    store.unreadable = 'icps'
    const { detectPendingIcpReviews } = await import('./icp-review-tasks')
    const res = await detectPendingIcpReviews()
    expect(res.ok, 'a failed read answered "nothing pending", which is the calm-queue inversion').toBe(false)
    expect(res.error).toBeTruthy()
  })
})

describe('J5-C10 ③ · resolving the review clears the task', () => {
  it('🛑 the condition clearing closes the row — a queue that only grows is not a queue', async () => {
    store.clients = [{ id: CLIENT, company_name: 'Redmayne', user_id: 'user-1' }]
    store.icps = [{
      id: ICP, client_id: CLIENT, name: 'Marketing agencies', is_active: true,
      icp_review: { requirements: [{ field: 'company_sizes', said: ['about 10 to 50 staff'] }] },
      icp_review_at: '2026-09-18T09:00:00Z', icp_review_resolved_at: null,
    }]
    const { detectPendingIcpReviews, clearIcpReviewTask } = await import('./icp-review-tasks')
    await detectPendingIcpReviews()
    expect(store.operator_tasks.filter(t => t.status === 'open')).toHaveLength(1)

    const out = await clearIcpReviewTask(CLIENT, ICP)
    expect(out.ok).toBe(true)
    const row = store.operator_tasks[0]
    expect(row.status, 'the task stayed open after the review was resolved').toBe('resolved')
    // ⚠️ THE ROW SURVIVES AS EVIDENCE, with a note. The migration's own words: "resolved by a
    // human with a note, or by the condition clearing, and either way the row survives".
    expect(String(row.resolution_note), 'a resolution with no reason is not evidence').toBeTruthy()
  })

  it('clearing a condition nobody raised is not an error', async () => {
    const { clearIcpReviewTask } = await import('./icp-review-tasks')
    expect((await clearIcpReviewTask(CLIENT, ICP)).ok).toBe(true)
  })
})
