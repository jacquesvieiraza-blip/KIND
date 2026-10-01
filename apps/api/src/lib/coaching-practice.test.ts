// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 1 Oct (R180 · R184 · #2505 Objection Coach · #2506 Roleplay) — PRACTICE, GATED AND GROUNDED.
//
// Each test drives the REAL `/my/programme/coaching/*` handler (pulled from the router's own
// stack) over a mocked database and a mocked Anthropic SDK — no network, no spend. What it pins:
//   · only Full Coaching gets either feature (Enterprise, or Founders/Growth activated) — R180;
//   · the prompt carries the client's OWN objections and answers, and never a result they did
//     not give permission to quote (F6); an invented figure never reaches the client (R87);
//   · the roleplay transcript is bounded, ordered and length-capped by the server;
//   · the prospect Milla plays is THIS client's own prospect with a real meeting — never another's;
//   · the three notes come back after six replies or on "How did I do?".
// ═══════════════════════════════════════════════════════════════════════════════════════
import { describe, it, expect, vi, beforeEach } from 'vitest'

type Row = Record<string, unknown>
const state = vi.hoisted(() => ({
  plan: 'enterprise' as string | null,
  activated: false,
  pitch: {} as Row,
  leads: [] as Row[],
  meetings: [] as Row[],
  replies: [] as Row[],
  outcomes: [] as Row[],
  reads: [] as Array<{ table: string; filters: Row; ins: Row }>,
  calls: [] as Array<{ args: Row; opts: Row }>,
  modelText: '' as string,
}))

vi.mock('@kind/db', () => {
  const table = (name: string) => {
    const filters: Row = {}
    const ins: Row = {}
    const rows = (): Row[] => {
      state.reads.push({ table: name, filters: { ...filters }, ins: { ...ins } })
      switch (name) {
        case 'programmes': return state.plan ? [{ id: 'prog-1', size_band: state.plan, status: 'LIVE', created_at: '2026-09-01' }] : []
        case 'coaching_activations': return state.activated ? [{ id: 'act-1' }] : []
        case 'clients': return [{ id: 'client-1', company_name: 'Northwind' }]
        case 'figsy_knowledge': return [{ data: state.pitch }]
        // An unscoped read sees every client's leads — so a missing scope is visible, not hidden.
        case 'leads': return state.leads.filter(l => l.id === filters.id && (filters.client_id === undefined || l.client_id === filters.client_id))
        case 'meetings': return state.meetings.filter(m => m.client_id === filters.client_id && (!filters.lead_id || m.lead_id === filters.lead_id))
        case 'figsy_replies': return state.replies.filter(r => r.client_id === filters.client_id
          && (!filters.lead_id || r.lead_id === filters.lead_id)
          && (!ins.classification || (ins.classification as string[]).includes(r.classification as string)))
        case 'outcome_events': return state.outcomes.filter(o => o.client_id === filters.client_id)
        default: return []
      }
    }
    const q: Row = {
      select: () => q, order: () => q, limit: () => q, is: () => q, neq: () => q,
      eq: (k: string, v: unknown) => { filters[k] = v; return q },
      in: (k: string, v: unknown) => { ins[k] = v; return q },
      maybeSingle: async () => ({ data: rows()[0] ?? null, error: null }),
      then: (resolve: (v: unknown) => void) => resolve({ data: rows(), error: null }),
    }
    return q
  }
  return { db: { from: (t: string) => table(t) } }
})
vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    messages = {
      create: async (args: Row, opts: Row) => {
        state.calls.push({ args, opts })
        return { content: [{ type: 'text', text: state.modelText }] }
      },
    }
  },
}))
// `middleware/auth` builds a Supabase client at module level; the handlers below are called directly.
vi.mock('../middleware/auth', () => ({ requireAuth: (_q: unknown, _s: unknown, next: () => void) => next() }))

import { splitObjections, cleanTurns, inventedFigures, ROLEPLAY_MAX_TURNS, TURN_MAX_CHARS } from './coaching-practice'
import { CONVERSATION_MODEL, AI_TURN_BOUND } from './models'

async function call(method: 'get' | 'post', path: string, body: Row = {}) {
  const { myProgrammeRouter } = await import('../routes/my-programme')
  const layer = (myProgrammeRouter as unknown as {
    stack: Array<{ route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: Function }> } }>
  }).stack.find(l => l.route?.path === path && l.route?.methods[method])
  if (!layer?.route) throw new Error(`${method} ${path} is not on the router`)
  const out: { code: number; payload: Row } = { code: 200, payload: {} }
  const res = { status(c: number) { out.code = c; return res }, json(p: Row) { out.payload = p; return res } }
  await layer.route.stack[layer.route.stack.length - 1].handle({ userId: 'user-1', body, params: {}, query: {} }, res, () => {})
  return out
}
const objection = (body: Row) => call('post', '/coaching/objection', body)
const roleplay = (body: Row) => call('post', '/coaching/roleplay', body)

const COACH_JSON = JSON.stringify({ concern: 'They worry it will not stick.', answer: 'I hear that. Brightwater felt the same.', question: 'What happened last time?' })
const FEEDBACK_JSON = JSON.stringify({ landed: 'You asked about their week.', tighten: 'Answer the timing worry sooner.', next_step: 'Ask for a two-week pilot.' })
const SOON = new Date(Date.now() + 2 * 864e5).toISOString()
const promptSent = () => JSON.stringify(state.calls.at(-1)?.args ?? {})
const t = (who: 'prospect' | 'you', text = 'ok') => ({ who, text })
/** A legal transcript of `n` lines: prospect, you, prospect, you… */
const transcript = (n: number) => Array.from({ length: n }, (_, i) => t(i % 2 === 0 ? 'prospect' : 'you', `line ${i}`))

beforeEach(() => {
  vi.resetModules()
  process.env.ANTHROPIC_API_KEY = 'test-key'
  state.plan = 'enterprise'; state.activated = false
  state.pitch = {
    offer: { problems: 'manual scheduling', solution: 'FieldOps', roi: 'cut planning time by 60%', roi_may_quote: false },
    sales_context: { objections: 'We tried this before → we point to the Brightwater rollout\nNo budget this quarter', lead_proof: 'Brightwater', decider: 'COO', won_deal: 'a two-week pilot' },
  }
  state.leads = [
    { id: 'lead-own', client_id: 'client-1', first_name: 'Dana', job_title: 'Head of Operations', company: 'Acme Field', industry: 'Facilities' },
    { id: 'lead-other', client_id: 'client-2', first_name: 'Eve', job_title: 'CEO', company: 'Rival Co', industry: 'Retail' },
    { id: 'lead-nomeeting', client_id: 'client-1', first_name: 'Ned', job_title: 'CFO', company: 'Quiet Ltd', industry: null },
  ]
  state.meetings = [
    { id: 'm-1', client_id: 'client-1', lead_id: 'lead-own', scheduled_at: SOON, state: 'BOOKED', rescheduled_from: null },
    { id: 'm-2', client_id: 'client-2', lead_id: 'lead-other', scheduled_at: SOON, state: 'BOOKED', rescheduled_from: null },
  ]
  state.replies = [
    { client_id: 'client-1', lead_id: 'lead-own', classification: 'hot', body_text: 'Happy to talk next week.' },
    { client_id: 'client-1', lead_id: 'lead-x', classification: 'warm', body_text: 'Not right now, maybe after our audit.' },
    { client_id: 'client-1', lead_id: 'lead-y', classification: 'opt_out', body_text: 'Remove me.' },
  ]
  state.outcomes = [
    { client_id: 'client-1', payload: { meeting_id: 'm-0', answer: 'not_now', note: 'They want to wait for the new CFO.' } },
    { client_id: 'client-1', payload: { meeting_id: 'm-9', answer: 'next_step', note: 'Pilot agreed.' } },
  ]
  state.reads = []; state.calls = []
  state.modelText = COACH_JSON
})

// ── 1 · ACCESS — R180's ladder, at the door ──────────────────────────────────────────────
describe('🛑 only Full Coaching gets Objection Coach and Roleplay', () => {
  for (const plan of ['founders', 'growth']) {
    it(`${plan} without Full Coaching is refused both, in the founder's words, and no model is called`, async () => {
      state.plan = plan
      const o = await objection({ objection: 'Too expensive' })
      expect(o.code).toBe(403)
      expect(o.payload.error).toBe('Objection Coach comes with Full Coaching.')
      const r = await roleplay({ leadId: 'lead-own', turns: [] })
      expect(r.code).toBe(403)
      expect(r.payload.error).toBe('Roleplay comes with Full Coaching.')
      expect(state.calls).toHaveLength(0)
    })
  }

  it('the Coaching screen learns "not full" and nothing else — no replies or notes are read for a lower plan', async () => {
    state.plan = 'founders'
    const g = await call('get', '/coaching/practice')
    expect(g.payload.data).toEqual({ full: false, objections: [] })
    expect(state.reads.map(r => r.table)).not.toContain('figsy_replies')
  })

  it('Enterprise is allowed (it owns the whole product)', async () => {
    state.plan = 'enterprise'
    expect((await objection({ objection: 'Too expensive' })).code).toBe(200)
  })

  it('Founders and Growth WITH Full Coaching activated are allowed', async () => {
    for (const plan of ['founders', 'growth']) {
      state.plan = plan; state.activated = true
      expect((await objection({ objection: 'Too expensive' })).code, plan).toBe(200)
      state.modelText = 'Hello, Dana here.'
      expect((await roleplay({ leadId: 'lead-own', turns: [] })).code, plan).toBe(200)
      state.modelText = COACH_JSON
    }
  })

  it('no programme at all → refused (never unlocked on a guess)', async () => {
    state.plan = null
    expect((await objection({ objection: 'Too expensive' })).code).toBe(403)
  })
})

// ── 2 · GROUNDING — their words, their permission, no invented figures ─────────────────────
describe('🛑 Objection Coach is grounded in the client\'s own sales context', () => {
  it('the prompt carries their own objections and answers, and their proof; the model is the conversational one, bounded', async () => {
    const r = await objection({ objection: 'We tried this before' })
    expect(r.code).toBe(200)
    expect(r.payload.data).toEqual({ concern: 'They worry it will not stick.', answer: 'I hear that. Brightwater felt the same.', question: 'What happened last time?' })
    const sent = promptSent()
    expect(sent).toContain('We tried this before → we point to the Brightwater rollout')
    expect(sent).toContain('Proof the seller leads with: Brightwater')
    expect(state.calls[0].args.model).toBe(CONVERSATION_MODEL)
    expect(state.calls[0].opts).toEqual(AI_TURN_BOUND)
  })

  it('🛑 a result reaches the prompt ONLY when the client ticked permission', async () => {
    await objection({ objection: 'Does it work?' })
    expect(promptSent()).not.toContain('60%')
    state.pitch = { ...state.pitch, offer: { ...(state.pitch.offer as Row), roi_may_quote: true } }
    await objection({ objection: 'Does it work?' })
    expect(promptSent()).toContain('A result the seller may mention: cut planning time by 60%')
  })

  it('🛑 R87 — an answer quoting a figure that is in none of the facts is refused, never shown', async () => {
    state.modelText = JSON.stringify({ concern: 'c', answer: 'Clients save 40% in a month.', question: 'q?' })
    const r = await objection({ objection: 'Does it work?' })
    expect(r.code).toBe(503)
    expect(JSON.stringify(r.payload)).not.toContain('40%')
  })

  it('a figure the client gave permission to quote may be used', async () => {
    state.pitch = { ...state.pitch, offer: { ...(state.pitch.offer as Row), roi_may_quote: true } }
    state.modelText = JSON.stringify({ concern: 'c', answer: 'One client cut planning time by 60%.', question: 'q?' })
    expect((await objection({ objection: 'Does it work?' })).code).toBe(200)
  })

  it('the objection is bounded; an unreadable model answer is an honest 503, not a sentence in her voice', async () => {
    expect((await objection({ objection: 'x'.repeat(301) })).code).toBe(400)
    expect((await objection({ objection: '   ' })).code).toBe(400)
    state.modelText = 'Sure! Here is some advice.'
    expect((await objection({ objection: 'Too expensive' })).code).toBe(503)
  })

  it('the picker offers their own objections (split), a not-now/not-fit reply, and a not-now meeting note — nothing else', async () => {
    const g = await call('get', '/coaching/practice')
    const opts = (g.payload.data as { objections: Array<{ text: string; source: string }> }).objections
    expect(opts).toEqual([
      { text: 'We tried this before', source: 'yours' },
      { text: 'No budget this quarter', source: 'yours' },
      { text: 'Not right now, maybe after our audit.', source: 'reply' },
      { text: 'They want to wait for the new CFO.', source: 'meeting' },
    ])
    // Replies are chosen by the classifier's enum, never by reading their words here.
    expect(state.reads.find(r => r.table === 'figsy_replies')?.ins).toEqual({ classification: ['warm', 'cold'] })
  })

  it('splitObjections keeps the objection, drops their answer and list marks', () => {
    expect(splitObjections('1. "Too pricey" → we show the pilot\n- No time; Already have a vendor')).toEqual(['Too pricey', 'No time', 'Already have a vendor'])
    expect(splitObjections('')).toEqual([])
    // ⚑ 1 Oct (real-screen preview) — the demo's own answer is written `"objection" — answer`: the chip
    // showed `We already have a system" — ours replaces…` (half a quote, plus their answer).
    expect(splitObjections('"We already have a system" — ours replaces the spreadsheets.')).toEqual(['We already have a system'])
    expect(splitObjections('Too pricey – we show the pilot')).toEqual(['Too pricey'])
    expect(splitObjections('A long-term contract scares us')).toEqual(['A long-term contract scares us'])
    expect(splitObjections('No budget; - Too busy - call in Q3')).toEqual(['No budget', 'Too busy'])
  })

  it('inventedFigures ignores figures that are in the facts, catches the rest', () => {
    expect(inventedFigures('A 2-week pilot, 60% faster', ['a two-week pilot', '60% faster', '2 weeks'])).toEqual([])
    expect(inventedFigures('Saves $5,000 a year', ['no figures here'])).toEqual(['5000'])
  })
})

// ── 3 · ROLEPLAY BOUNDS ──────────────────────────────────────────────────────────────────
describe('🛑 the roleplay transcript is bounded by the server, not the browser', () => {
  it(`more than ${ROLEPLAY_MAX_TURNS} lines is refused and no model is called`, async () => {
    const r = await roleplay({ leadId: 'lead-own', turns: transcript(ROLEPLAY_MAX_TURNS + 1) })
    expect(r.code).toBe(400)
    expect(state.calls).toHaveLength(0)
  })
  it(`a line over ${TURN_MAX_CHARS} characters is refused`, async () => {
    const r = await roleplay({ leadId: 'lead-own', turns: [t('prospect', 'Hi'), t('you', 'x'.repeat(TURN_MAX_CHARS + 1))] })
    expect(r.code).toBe(400)
    expect(state.calls).toHaveLength(0)
  })
  it('a transcript out of order (the client writing the prospect\'s lines) is refused', () => {
    expect(cleanTurns([t('you'), t('prospect')]).ok).toBe(false)
    expect(cleanTurns([t('prospect'), t('prospect')]).ok).toBe(false)
    expect(cleanTurns('nope').ok).toBe(false)
    expect(cleanTurns(transcript(4)).ok).toBe(true)
  })
  it('asking for the next line before the client has replied is refused', async () => {
    expect((await roleplay({ leadId: 'lead-own', turns: [t('prospect', 'Hi')] })).code).toBe(400)
  })
})

// ── 4 · THE PERSONA IS THIS CLIENT'S OWN PROSPECT ──────────────────────────────────────────
describe('🛑 Milla plays only this client\'s own prospect, with a real meeting', () => {
  it('another client\'s lead → 404, and nothing about them reaches a model', async () => {
    // Even if a meeting row under THIS client pointed at their lead, the lead read is scoped.
    state.meetings.push({ id: 'm-x', client_id: 'client-1', lead_id: 'lead-other', scheduled_at: SOON, state: 'BOOKED', rescheduled_from: null })
    const r = await roleplay({ leadId: 'lead-other', turns: [] })
    expect(r.code).toBe(404)
    expect(state.calls).toHaveLength(0)
  })
  it('their own lead with no meeting → 404', async () => {
    expect((await roleplay({ leadId: 'lead-nomeeting', turns: [] })).code).toBe(404)
    expect(state.calls).toHaveLength(0)
  })
  it('their own prospect: the persona is that person — role, company, their own words — and the objections are theirs', async () => {
    state.modelText = 'Hi, Dana here. I have about ten minutes.'
    const r = await roleplay({ leadId: 'lead-own', turns: [] })
    expect(r.code).toBe(200)
    expect(r.payload.data).toEqual({ done: false, line: 'Hi, Dana here. I have about ten minutes.' })
    const system = String(state.calls[0].args.system)
    expect(system).toContain('You are Dana, Head of Operations at Acme Field (Facilities).')
    expect(system).toContain('Happy to talk next week.')
    expect(system).toContain('- We tried this before')
    expect(system).not.toContain('Rival Co')
    expect(state.calls[0].args.model).toBe(CONVERSATION_MODEL)
  })
  it('a prospect line with an invented figure is refused', async () => {
    state.modelText = 'We have 250 engineers, so this is big for us.'
    expect((await roleplay({ leadId: 'lead-own', turns: [] })).code).toBe(503)
  })
})

// ── 5 · FEEDBACK ─────────────────────────────────────────────────────────────────────────
describe('"How did I do?" — three notes', () => {
  it('on request after one reply: what landed, what to tighten, the next step', async () => {
    state.modelText = FEEDBACK_JSON
    const r = await roleplay({ leadId: 'lead-own', turns: transcript(2), finish: true })
    expect(r.code).toBe(200)
    expect(r.payload.data).toEqual({ done: true, feedback: { landed: 'You asked about their week.', tighten: 'Answer the timing worry sooner.', nextStep: 'Ask for a two-week pilot.' } })
    expect(promptSent()).toContain('SELLER: line 1')
  })
  it('after six replies the notes come without being asked', async () => {
    state.modelText = FEEDBACK_JSON
    const r = await roleplay({ leadId: 'lead-own', turns: transcript(12) })
    expect((r.payload.data as Row).done).toBe(true)
  })
  it('asking before replying once is refused', async () => {
    expect((await roleplay({ leadId: 'lead-own', turns: [t('prospect', 'Hi')], finish: true })).code).toBe(400)
  })
})
