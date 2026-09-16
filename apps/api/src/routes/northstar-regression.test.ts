import { describe, it, expect, vi, beforeEach } from 'vitest'

// ═══════════════════════════════════════════════════════════════════════════════════════
// NORTHSTAR — THE FOUNDER'S OWN CONVERSATION, THROUGH THE REAL HANDLER. (R121, Build 5.)
//
// Three real turns, spoken by the founder as a new client, that the product got wrong live.
// They are ONE regression conversation and nothing in the product is coded for them: the
// model's reading of each turn is scripted below (that is what a mocked model is), and what
// this file proves is everything the SERVER does with that reading —
//
//   · every turn is accepted;
//   · every safely understood fact is captured;
//   · a turn that restates two things does not lose the other nine;
//   · exclusions survive; UK + US survive as TARGET geography;
//   · nothing invents the company's OWN country from its target markets;
//   · the confirmation is built from the durable Brief, not from the last model sample.
//
// ⚠️ ONLY THE DATABASE IS A DOUBLE. `../lib/brief-draft` is replaced by an in-memory store
// that MERGES exactly as the real one merges — a store that replaced would hide the very
// defect this conversation exposed. `@kind/db` throws on touch: the handler has no business
// reading a table directly, and this guard is what proves it does not.
// ═══════════════════════════════════════════════════════════════════════════════════════

const model = vi.hoisted(() => ({ reply: null as unknown, calls: 0 }))
vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    messages = { create: async () => { model.calls += 1; return model.reply } }
  },
}))
vi.mock('../middleware/auth', () => ({ requireAuth: (_q: unknown, _r: unknown, n: () => void) => n() }))
vi.mock('@kind/db', () => ({
  db: {
    from: () => { throw new Error('builder/chat must not touch the database') },
    rpc:  () => { throw new Error('builder/chat must not touch the database') },
    auth: { getUser: async () => ({ data: { user: null }, error: null }) },
  },
}))

/** The durable Brief, in memory. */
const store = vi.hoisted(() => ({
  facts: {} as Record<string, unknown>,
  conversation: [] as Array<{ role: string; content: string }>,
  saves: 0,
}))
vi.mock('../lib/brief-draft', () => {
  const draft = () => ({
    facts: store.facts, conversation: store.conversation, confirmedAt: null, promotedClientId: null,
  })
  return {
    briefDraftFor: async () => draft(),
    writableBriefDraft: async () => draft(),
    saveBriefDraft: async (_u: string, f: Record<string, unknown>) => {
      store.saves += 1
      store.facts = { ...store.facts, ...f }   // ← the real merge, exactly
      return { ok: true, draft: draft() }
    },
    saveBriefConversation: async (_u: string, turns: Array<{ role: string; content: string }>) => {
      store.conversation = turns
      return { ok: true }
    },
    rememberCustomerTurn: async (_u: string, turns: Array<{ role: string; content: string }>) => {
      store.conversation = turns
      return { ok: true }
    },
    markBriefDraftPromoted: async () => ({ ok: true }),
    mayConfirmBrief: () => ({ ok: true, missing: [] }),
    BRIEF_TRANSCRIPT_MAX_TURNS: 40,
  }
})

beforeEach(() => { store.facts = {}; store.conversation = []; store.saves = 0; model.calls = 0 })

type Said = { role: 'user' | 'assistant'; content: string }

async function turn(messages: Said[]) {
  const { icpRouter } = await import('./icps')
  const layer = (icpRouter as unknown as {
    stack: Array<{ route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: Function }> } }>
  }).stack.find(l => l.route?.path === '/builder/chat' && l.route?.methods.post)
  if (!layer?.route) throw new Error('POST /builder/chat not found')
  const handler = layer.route.stack[layer.route.stack.length - 1].handle
  const out: { code: number; payload: Record<string, unknown> } = { code: 200, payload: {} }
  const res = {
    status(c: number) { out.code = c; return res },
    json(p: Record<string, unknown>) { out.payload = p; return res },
  }
  await handler({ body: { messages, profile_required: true }, headers: {}, params: {}, query: {}, userId: 'user-1' }, res, () => {})
  return out
}

const millaSaid = (input: unknown) => ({
  stop_reason: 'tool_use',
  content: [{ type: 'tool_use', id: 'tu_1', name: 'milla_reply', input }],
})

// ── THE THREE TURNS, VERBATIM ────────────────────────────────────────────────────────────
const T1 = "I'm Jacques and I run Northstar Revenue. We don't have a website yet. We're a B2B sales consultancy that helps founder-led service businesses build predictable pipeline. Our best customers are agencies and consultancies in the UK and US, usually around 11–50 employees. We normally want to speak with founders, CEOs, CROs and VP-level sales leaders. We don't want recruitment agencies or software companies. The goal is to book qualified sales conversations with companies that genuinely need help building pipeline."
const T2 = "Any type of agency or consultancy is fine as long as they're founder-led B2B service businesses. I'd especially lean towards marketing agencies, creative agencies, management consultancies and sales consultancies."
const T3 = 'Also remember that I do not want recruitment agencies or software companies, and I specifically want marketing agencies, creative agencies, management consultancies and sales consultancies.'

// ── WHAT A CAPABLE MODEL READS FROM EACH — scripted, because the model is a double ───────
/** Turn 1: ten of eleven understood at once; the one honest gap is asked for. */
const READ_T1 = {
  type: 'question',
  content: 'Got all of that. When you say agencies and consultancies — are those the target companies themselves, or the kind of business those agencies serve?',
  brief_so_far: {
    contact_name: 'Jacques',
    company_name: 'Northstar Revenue',
    website_none: true,
    what_they_do: 'B2B sales consultancy helping founder-led service businesses build predictable pipeline',
    target_category: 'agencies and consultancies',
    geographies: ['United Kingdom', 'United States'],
    company_sizes: ['11–50'],
    job_titles: ['Founder', 'CEO', 'CRO', 'VP Sales'],
    seniority_levels: ['C-Suite', 'VP / Director'],
    exclusions: 'no recruitment agencies or software companies',
    desired_outcome: 'book qualified sales conversations with companies that genuinely need help building pipeline',
    desired_outcome_kind: 'meetings',
    // ⚠️ NO `country`. He never said where Northstar is based. "UK and US" are markets.
  },
}
/** Turn 2: the worst realistic case — the model records ONLY what this turn was about. */
const READ_T2 = {
  type: 'question',
  content: 'Perfect — founder-led B2B service businesses, leaning marketing, creative, management and sales consultancies. Anything else I should know before I put a plan together?',
  brief_so_far: {
    target_company_type: 'founder-led B2B service businesses',
    target_category: 'marketing agencies, creative agencies, management consultancies and sales consultancies',
  },
}
/** Turn 3: she is ready. The completion restates only what HE restated. */
const READ_T3 = {
  type: 'complete',
  content: "Here's the plan as I understand it.",
  profile: { company_name: 'Northstar Revenue', contact_name: 'Jacques', website_none: true, industry: 'B2B sales consultancy' },
  icp: {
    name: 'Founder-led agencies & consultancies',
    target_category: 'marketing agencies, creative agencies, management consultancies and sales consultancies',
    target_company_type: 'founder-led B2B service businesses',
    industries: ['Consulting'],
    job_titles: ['Founder', 'CEO', 'CRO', 'VP Sales'],
    seniority_levels: ['C-Suite', 'VP / Director'],
    company_sizes: ['11–50'],
    // ⚠️ NO `geographies` HERE, DELIBERATELY. If the confirmation reads this sample instead of
    // the durable Brief, UK + US vanish from the plan he is asked to approve.
    apollo_only_consented: true,
  },
  business: { product: 'B2B sales consultancy', bad_fit: 'no recruitment agencies or software companies' },
  campaign_intent: 'book qualified sales conversations',
  brief_so_far: {
    exclusions: 'no recruitment agencies or software companies',
    target_category: 'marketing agencies, creative agencies, management consultancies and sales consultancies',
  },
}

describe('🛑 NORTHSTAR · the founder’s own three turns', () => {
  it('🛑 EVERY TURN IS ACCEPTED, EVERY FACT SURVIVES, AND THE PLAN IS BUILT FROM THE BRIEF', async () => {
    // ── Turn 1 ──────────────────────────────────────────────────────────────────────────
    model.reply = millaSaid(READ_T1)
    const r1 = await turn([{ role: 'user', content: T1 }])
    expect(r1.code, JSON.stringify(r1.payload)).toBe(200)
    expect((r1.payload.data as { type: string }).type).toBe('question')

    // Ten things said, ten things held. Not asked for again — the check is on STATE.
    expect(store.facts.company_name).toBe('Northstar Revenue')
    expect(store.facts.contact_name).toBe('Jacques')
    expect(store.facts.website_none).toBe(true)
    expect(store.facts.geographies).toEqual(['United Kingdom', 'United States'])
    expect(store.facts.exclusions).toBe('no recruitment agencies or software companies')
    expect(store.facts.desired_outcome_kind).toBe('meetings')
    // 🛑 THE COMPANY'S OWN COUNTRY IS NOT INVENTED FROM ITS TARGET MARKETS.
    expect(store.facts.country, 'a country was derived for Northstar').toBeUndefined()
    // And the conversation is remembered, so leaving and coming back continues it.
    expect(store.conversation.map(t => t.role)).toEqual(['user', 'assistant'])

    // ── Turn 2 ──────────────────────────────────────────────────────────────────────────
    model.reply = millaSaid(READ_T2)
    const r2 = await turn([
      { role: 'user', content: T1 }, { role: 'assistant', content: READ_T1.content },
      { role: 'user', content: T2 },
    ])
    expect(r2.code, JSON.stringify(r2.payload)).toBe(200)

    // The two things he refined are updated…
    expect(store.facts.target_company_type).toBe('founder-led B2B service businesses')
    expect(String(store.facts.target_category)).toContain('marketing agencies')
    // …and the nine he did not repeat are UNTOUCHED. This is the defect, live: a turn about
    // one thing used to be the whole Brief.
    expect(store.facts.geographies).toEqual(['United Kingdom', 'United States'])
    expect(store.facts.exclusions).toBe('no recruitment agencies or software companies')
    expect(store.facts.job_titles).toEqual(['Founder', 'CEO', 'CRO', 'VP Sales'])
    expect(store.facts.desired_outcome).toContain('book qualified sales conversations')
    expect(store.facts.country).toBeUndefined()

    // ── Turn 3 ──────────────────────────────────────────────────────────────────────────
    model.reply = millaSaid(READ_T3)
    const r3 = await turn([
      { role: 'user', content: T1 }, { role: 'assistant', content: READ_T1.content },
      { role: 'user', content: T2 }, { role: 'assistant', content: READ_T2.content },
      { role: 'user', content: T3 },
    ])
    expect(r3.code, JSON.stringify(r3.payload)).toBe(200)
    // ── ⛓️ 16 Sep (S1-ONB-001) — THE THIRD TURN NO LONGER FINISHES IT, AND THAT IS CORRECT.
    //
    // The founder's own three turns never say where NORTHSTAR is based — "the UK and US" are
    // his customers. The account cannot be opened without his own country, so onboarding is
    // not READY and Milla asks for it. Nothing is invented: that is the same guarantee this
    // file was written for, now enforced a step earlier instead of at the Confirm click.
    const held = r3.payload.data as Record<string, unknown>
    expect(held.type).toBe('outstanding')
    expect((held.brief_outstanding as { next: { id: string } }).next.id).toBe('country')
    expect(store.facts.country, 'still never derived from the target markets').toBeUndefined()

    // ── Turn 4 — he answers it, and only then does the plan exist ───────────────────────
    model.reply = millaSaid({ ...READ_T3, profile: { ...(READ_T3 as { profile?: Record<string, unknown> }).profile, country: 'South Africa' } })
    const r4 = await turn([
      { role: 'user', content: T1 }, { role: 'assistant', content: READ_T1.content },
      { role: 'user', content: T2 }, { role: 'assistant', content: READ_T2.content },
      { role: 'user', content: T3 }, { role: 'user', content: 'We are based in South Africa.' },
    ])
    expect(r4.code, JSON.stringify(r4.payload)).toBe(200)
    const data = r4.payload.data as Record<string, unknown>
    expect(data.type).toBe('complete')
    expect(store.facts.country, 'HIS answer, persisted').toBe('South Africa')

    // 🛑 THE CONFIRMATION IS THE DURABLE BRIEF, NOT THE LAST SAMPLE. The completion carried
    // no geographies at all; the plan he is asked to approve still has both markets.
    expect(data.brief_geographies).toEqual(['United Kingdom', 'United States'])
    expect((data.icp as Record<string, unknown>).geographies).toEqual(['United Kingdom', 'United States'])
    // Exclusions, stated three times, are on the screen where he says yes.
    expect(data.brief_exclusions).toBe('no recruitment agencies or software companies')
    expect((data.business as Record<string, unknown>).bad_fit).toBe('no recruitment agencies or software companies')
    // Category and type are the refined ones from turn 2, not the first guess.
    expect(String((data.icp as Record<string, unknown>).target_category)).toContain('management consultancies')
    expect((data.icp as Record<string, unknown>).target_company_type).toBe('founder-led B2B service businesses')
    // ⛓️ 16 Sep — the country on the card is HIS, and it is never the market he sells into.
    expect((data.profile as Record<string, unknown>).country).toBe('South Africa')
    expect((data.profile as Record<string, unknown>).country).not.toBe('United Kingdom')
    expect((data.profile as Record<string, unknown>).country).not.toBe('United States')

    // One model call per turn — no schema-shape roulette.
    expect(model.calls).toBe(4)
  })

  it('🛑 THE THIRD TURN ALONE, ON A RECORD THAT ALREADY HOLDS THE OTHER NINE — re-entry', async () => {
    // He left after turn 2 and came back. The transcript is whatever the browser has; the
    // Brief is what the server has. The plan must come from the second.
    // ⛓️ 16 Sep (S1-ONB-001) — the record he comes back to now holds the country he gave, so
    // this test still exercises what it is named for: RE-ENTRY, and the plan coming from the
    // server's Brief rather than from the browser's transcript.
    store.facts = { ...READ_T1.brief_so_far, ...READ_T2.brief_so_far, country: 'South Africa' }
    model.reply = millaSaid(READ_T3)
    const r = await turn([{ role: 'user', content: T3 }])
    expect(r.code, JSON.stringify(r.payload)).toBe(200)
    const data = r.payload.data as Record<string, unknown>
    expect(data.type).toBe('complete')
    expect(data.brief_geographies).toEqual(['United Kingdom', 'United States'])
    expect(data.brief_exclusions).toBe('no recruitment agencies or software companies')
  })

  it('🛑 A COMPLETION ON AN EMPTY RECORD IS A CONVERSATION, NOT A PLAN — nothing is invented to finish', async () => {
    // Same third turn, but the server holds nothing (a fresh browser, a lost draft). The
    // model says "complete"; the Brief says two facts. She keeps talking; nobody is promoted.
    model.reply = millaSaid(READ_T3)
    const r = await turn([{ role: 'user', content: T3 }])
    expect(r.code, JSON.stringify(r.payload)).toBe(200)
    // ⛓️ 16 Sep (S1-RT-010) — she does not "keep talking" with the completion's own
    // sentence any more; the server suppresses it and returns the outstanding fact as product
    // state. Nobody is promoted, nothing is invented, and the facts he gave are still kept.
    expect((r.payload.data as { type: string }).type).toBe('outstanding')
    expect((r.payload.data as { icp?: unknown }).icp, 'no plan is proposed').toBeUndefined()
    // And the two facts he DID just say were kept, not thrown away with the refused plan.
    expect(store.facts.exclusions).toBe('no recruitment agencies or software companies')
  })
})


// ═══════════════════════════════════════════════════════════════════════════════════════
// F9 — THE FULL STATE, TURN BY TURN. Not "Northstar passes" — what is actually held.
//
// The founder asked for the state after each turn rather than a verdict, because a verdict
// is the thing three rounds of this correction produced and none of them could be checked.
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('🛑 F9 · Northstar — the state after every turn', () => {
  it('F9 state after T1, T2, T3 and at confirmation', async () => {
    const snapshots: Array<Record<string, unknown>> = []
    const snap = (label: string, extra: Record<string, unknown> = {}) => {
      const f = store.facts
      snapshots.push({
        turn: label,
        transcript_turns: store.conversation.length,
        contact_name: f.contact_name ?? null,
        company_name: f.company_name ?? null,
        website_none: f.website_none ?? null,
        what_they_do: f.what_they_do ?? null,
        target_category: f.target_category ?? null,
        target_company_type: f.target_company_type ?? null,
        geographies: f.geographies ?? null,
        company_sizes: f.company_sizes ?? null,
        job_titles: f.job_titles ?? null,
        seniority_levels: f.seniority_levels ?? null,
        exclusions: f.exclusions ?? null,
        desired_outcome: f.desired_outcome ?? null,
        desired_outcome_kind: f.desired_outcome_kind ?? null,
        country_MUST_BE_ABSENT: f.country ?? null,
        ...extra,
      })
    }

    model.reply = millaSaid(READ_T1)
    await turn([{ role: 'user', content: T1 }])
    snap('T1')

    model.reply = millaSaid(READ_T2)
    await turn([
      { role: 'user', content: T1 }, { role: 'assistant', content: READ_T1.content },
      { role: 'user', content: T2 },
    ])
    snap('T2')

    // ⛓️ 16 Sep (S1-ONB-001) — T3 alone no longer confirms: he never said where NORTHSTAR is.
    // The trace records that refusal and then his answer, so the packet shows both states.
    model.reply = millaSaid(READ_T3)
    const held = await turn([
      { role: 'user', content: T1 }, { role: 'assistant', content: READ_T1.content },
      { role: 'user', content: T2 }, { role: 'assistant', content: READ_T2.content },
      { role: 'user', content: T3 },
    ])
    snap('T3 / still needed', {
      reply_type: (held.payload.data as Record<string, unknown>).type,
      outstanding_next: ((held.payload.data as Record<string, unknown>).brief_outstanding as { next?: { id?: string } } | undefined)?.next?.id,
    })

    model.reply = millaSaid({ ...READ_T3, profile: { ...(READ_T3 as { profile?: Record<string, unknown> }).profile, country: 'South Africa' } })
    const final = await turn([
      { role: 'user', content: T1 }, { role: 'assistant', content: READ_T1.content },
      { role: 'user', content: T2 }, { role: 'assistant', content: READ_T2.content },
      { role: 'user', content: T3 }, { role: 'user', content: 'We are based in South Africa.' },
    ])
    const data = final.payload.data as Record<string, unknown>
    const icp = data.icp as Record<string, unknown>
    snap('T3 / confirmation', {
      reply_type: data.type,
      confirmation_brief_exclusions: data.brief_exclusions,
      confirmation_brief_geographies: data.brief_geographies,
      confirmation_icp_geographies: icp.geographies,
      confirmation_icp_target_category: icp.target_category,
      confirmation_icp_target_company_type: icp.target_company_type,
      confirmation_profile_country: (data.profile as Record<string, unknown>).country ?? '',
    })

    // ── THE STATE, PRINTED. This is the packet's Northstar section, produced by the run.
    // eslint-disable-next-line no-console
    console.log('\n🛑 NORTHSTAR STATE TRACE\n' + JSON.stringify(snapshots, null, 2))

    // ── AND ASSERTED, so it cannot quietly change.
    const [t1, t2, tHeld, t3] = snapshots
    // T1: ten facts from one message, and no invented company country.
    expect(t1.company_name).toBe('Northstar Revenue')
    expect(t1.geographies).toEqual(['United Kingdom', 'United States'])
    expect(t1.exclusions).toBe('no recruitment agencies or software companies')
    expect(t1.desired_outcome_kind).toBe('meetings')
    expect(t1.country_MUST_BE_ABSENT, 'a country was invented from the target markets').toBeNull()
    // ⚠️ TWO, NOT ONE: their message is persisted BEFORE the model call, and her reply is
    // appended after it. Both halves of the exchange are stored, which is what makes a
    // refresh mid-conversation continue rather than restart.
    expect(t1.transcript_turns).toBe(2)

    // T2: two facts refined, nine untouched.
    expect(t2.target_company_type).toBe('founder-led B2B service businesses')
    expect(String(t2.target_category)).toContain('marketing agencies')
    expect(t2.geographies, 'a turn about category damaged the markets').toEqual(['United Kingdom', 'United States'])
    expect(t2.exclusions).toBe('no recruitment agencies or software companies')
    expect(t2.job_titles).toEqual(['Founder', 'CEO', 'CRO', 'VP Sales'])
    expect(t2.country_MUST_BE_ABSENT).toBeNull()

    // ⛓️ T3 HELD: ten Brief facts and his own country still unknown → not ready, and the
    // country is the thing asked for. Nothing was invented from the UK/US target markets.
    expect(tHeld.reply_type).toBe('outstanding')
    expect(tHeld.outstanding_next).toBe('country')
    expect(tHeld.country_MUST_BE_ABSENT, 'no country was derived while it was unknown').toBeNull()

    // T3: the confirmation is the durable Brief, not the last sample.
    expect(t3.reply_type).toBe('complete')
    expect(t3.confirmation_brief_geographies).toEqual(['United Kingdom', 'United States'])
    expect(t3.confirmation_icp_geographies).toEqual(['United Kingdom', 'United States'])
    expect(t3.confirmation_brief_exclusions).toBe('no recruitment agencies or software companies')
    expect(String(t3.confirmation_icp_target_category)).toContain('management consultancies')
    expect(t3.confirmation_icp_target_company_type).toBe('founder-led B2B service businesses')
    // ⛓️ 16 Sep — HIS answer is on the card, and it is never the market he sells into.
    expect(t3.confirmation_profile_country).toBe('South Africa')
    expect(t3.confirmation_profile_country, 'a country was fabricated from the targets').not.toBe('United Kingdom')
    expect(t3.confirmation_profile_country).not.toBe('United States')
  })
})
