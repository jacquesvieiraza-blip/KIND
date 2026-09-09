// ═══════════════════════════════════════════════════════════════════════════════════════
// A FRESH CLIENT'S OUTREACH IS WRITTEN WITHOUT THE FOUNDER.
//
// ── THE FIXTURE IS DELIBERATELY THE OPPOSITE OF HOUSE ───────────────────────────────────
//
// Every case below runs against a programme with **no House programme id, no House client, no
// House audience, no House sequence helper, no House schedule helper, no historical leads, no
// legacy NULL-programme enrolments, no pre-existing campaign sequence**. `HOUSE_LAUNCH_PROGRAMME_ID`
// is not set at all, so `isHouseLaunchProgramme` cannot answer yes even by accident.
//
// 🛑 THAT IS THE WHOLE POINT. The bug this closes was invisible on House, because House had a
// branch of its own — the launch programme prepared itself and everybody else stopped dead
// waiting for a human to type five emails. A test that used House as its fixture would have
// been green throughout.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321'
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'test-anon-key'
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-service-key'

type Row = Record<string, unknown>

const PROG = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa'
const CLIENT = 'bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb'
const CAMP = 'cccccccc-3333-4333-8333-cccccccccccc'

/**
 * Copy that passes `lintSequence`, so the linter is exercised rather than dodged.
 *
 * ⚠️ THE "Reply STOP to opt out." LINE IS LOAD-BEARING AND IT IS NOT DECORATION. `lintSequence`
 * HARD-FAILS a sequence in which the reader is never given a way to stop, and the real prompt in
 * `generateSequence` instructs exactly this sentence — so a fixture without it would be testing
 * copy the product could never actually produce. The first draft of this file omitted it and the
 * linter refused the sequence, which is the linter working.
 */
const GOOD_DRAFT = {
  step1: {
    subject: 'a question for Halden & Co',
    body: 'Hi Priya,\n\nI noticed Halden & Co has been growing the operations team this year. Most heads of operations I speak to say the same thing: the hiring is the easy part, and the first ninety days is where it goes wrong.\n\nWe built something that fixes the second half. Worth a look?\n\nJacques\n\nReply STOP to opt out.',
  },
  step2: {
    subject: 'Priya, the ninety day problem',
    body: 'Hi Priya,\n\nFollowing on from my last note. The pattern we see at Halden & Co\'s size is that onboarding is owned by nobody in particular, so it happens differently every time.\n\nHappy to show you what we changed.\n\nJacques\n\nReply STOP to opt out.',
  },
  step3: {
    subject: 'closing the loop',
    body: 'Hi Priya,\n\nLast note from me. If the timing is wrong I will leave it there.\n\nJacques\n\nReply STOP to opt out.',
  },
}

const state: {
  programmes: Row[]; clients: Row[]; icps: Row[]; campaigns: Row[]; sequences: Row[]; leads: Row[]
  generatorCalls: Row[]; generatorThrows: boolean; draft: Row
} = {
  programmes: [], clients: [], icps: [], campaigns: [], sequences: [], leads: [],
  generatorCalls: [], generatorThrows: false, draft: GOOD_DRAFT,
}

vi.mock('@kind/db', () => {
  const table = (name: string) => {
    const filters: Array<[string, string, unknown]> = []
    let updatePatch: Row | null = null
    const rows = () => {
      const src = ({
        programmes: state.programmes, clients: state.clients, icps: state.icps,
        figsy_campaigns: state.campaigns, figsy_sequences: state.sequences, leads: state.leads,
      } as Record<string, Row[]>)[name] ?? []
      return src.filter(r => filters.every(([op, col, val]) =>
        op === 'eq' ? r[col] === val
        : op === 'is' ? (r[col] ?? null) === null
        : op === 'not_is' ? (r[col] ?? null) !== null
        : true))
    }
    const o: Record<string, unknown> = {
      select() { return o },
      eq(c: string, v: unknown) { filters.push(['eq', c, v]); return o },
      is(c: string) { filters.push(['is', c, null]); return o },
      not(c: string) { filters.push(['not_is', c, null]); return o },
      order() { return o },
      limit() { return o },
      async maybeSingle() { return { data: rows()[0] ?? null, error: null } },
      async single() { return { data: rows()[0] ?? null, error: null } },
      insert(v: Row) {
        const row = { id: `seq-${state.sequences.length + 1}`, ...v }
        if (name === 'figsy_sequences') state.sequences.push(row)
        return { select: () => ({ single: async () => ({ data: row, error: null }) }) }
      },
      update(patch: Row) { updatePatch = patch; return o },
      then(r: (v: unknown) => unknown) {
        if (updatePatch) { for (const row of rows()) Object.assign(row, updatePatch) }
        return r({ data: rows(), error: null })
      },
    }
    return o
  }
  return { db: { from: (t: string) => table(t), rpc: async () => ({ data: null, error: null }) } }
})

// THE SEAM. Whatever reaches the generator is what the copy would really be written from.
vi.mock('./figsy', () => ({
  generateSequence: async (lead: Row, company: string, industry: unknown, intent: unknown, booking: unknown, signer: unknown, knowledge: unknown, opts: Row) => {
    state.generatorCalls.push({ lead, company, industry, intent, booking, signer, knowledge, opts })
    if (state.generatorThrows) throw new Error('the model was unreachable')
    return state.draft
  },
  getClientKnowledgeForOutreach: async () => 'We run outbound programmes and charge per qualified prospect.',
}))
vi.mock('./meeting-brief-deliver', () => ({ briefContextFor: async () => null }))

function seedFreshProgramme(over: { leads?: Row[]; sequences?: Row[]; campaignId?: string | null } = {}) {
  state.programmes = [{ id: PROG, client_id: CLIENT, status: 'SOURCING' }]
  state.clients = [{ id: CLIENT, company_name: 'Northwind Logistics', industry: 'Logistics', signer_name: 'Jacques', booking_url: 'https://cal.test/jv' }]
  state.icps = [{ id: 'icp-1', client_id: CLIENT, programme_id: PROG, is_active: true }]
  state.campaigns = over.campaignId === null ? [] : [{ id: CAMP, client_id: CLIENT, icp_id: 'icp-1', name: 'Northwind Q4', campaign_intent: null }]
  state.sequences = over.sequences ?? []
  state.leads = over.leads ?? [{
    id: 'lead-1', client_id: CLIENT, programme_id: PROG, first_name: 'Priya', last_name: 'Natarajan',
    job_title: 'Head of Operations', company: 'Halden & Co', industry: 'Logistics', seniority: 'senior',
    country: 'United Kingdom', tech_stack: [], score: 91, score_reasoning: 'fit',
    qualified_at: 'q', disqualified_at: null,
  }]
}

const prevHouse = process.env.HOUSE_LAUNCH_PROGRAMME_ID
beforeEach(() => {
  // 🛑 THE FIXTURE IS NOT HOUSE, AND CANNOT BECOME HOUSE. With no configured launch programme
  // id, `isHouseLaunchProgramme` answers no for everything — so nothing below can be satisfied
  // by the House branch quietly doing the work.
  delete process.env.HOUSE_LAUNCH_PROGRAMME_ID
  state.generatorCalls = []; state.generatorThrows = false; state.draft = GOOD_DRAFT
  seedFreshProgramme()
})
afterEach(() => {
  if (prevHouse === undefined) delete process.env.HOUSE_LAUNCH_PROGRAMME_ID
  else process.env.HOUSE_LAUNCH_PROGRAMME_ID = prevHouse
})

describe('a fresh non-House programme writes its own outreach', () => {
  it('1 · writes a canonical sequence, linked to the exact campaign, with no human involved', async () => {
    const { generateProgrammeSequence } = await import('./programme-sequence-generation')
    const r = await generateProgrammeSequence(PROG)
    expect(r.ok, r.ok ? '' : r.reason).toBe(true)
    expect(state.sequences).toHaveLength(1)
    expect(state.sequences[0].campaign_id, 'the sequence is not linked to the programme\'s campaign').toBe(CAMP)
    expect(state.sequences[0].client_id).toBe(CLIENT)
    expect((state.sequences[0].steps as Row[]).length).toBeGreaterThan(0)
  })

  it('2 · the steps carry a real cadence — never all on day zero', async () => {
    const { generateProgrammeSequence } = await import('./programme-sequence-generation')
    await generateProgrammeSequence(PROG)
    const steps = state.sequences[0].steps as { step: number; wait_days: number }[]
    expect(steps.map(s => s.step)).toEqual(steps.map((_, i) => i + 1))
    // `wait_days` is the gap AFTER a step, so the last one is never read; every earlier gap must
    // be real, or two cold emails land in one morning.
    expect(steps.slice(0, -1).every(s => s.wait_days > 0), `cadence was ${JSON.stringify(steps.map(s => s.wait_days))}`).toBe(true)
  })

  it('3 · the copy is a TEMPLATE — the sample prospect\'s own details are tokenised back out', async () => {
    const { generateProgrammeSequence } = await import('./programme-sequence-generation')
    await generateProgrammeSequence(PROG)
    // 🛑 SUBJECT AND BODY ARE CHECKED SEPARATELY, AND THAT IS THE POINT. Asserted against the
    // whole JSON blob, a mutation that dropped `detokenise` from the SUBJECT alone stayed green,
    // because the body still carried the tokens the assertion was looking for. Found by mutation
    // (G4, 9 Sep) — the fixture's subjects now carry the prospect's details too, so each field
    // has to be de-tokenised on its own to pass.
    const steps = state.sequences[0].steps as { subject: string; body: string }[]
    for (const [i, step] of steps.entries()) {
      for (const [field, text] of [['subject', step.subject], ['body', step.body]] as const) {
        expect(text, `step ${i + 1} ${field} carries the sample prospect's own first name`).not.toContain('Priya')
        expect(text, `step ${i + 1} ${field} carries the sample prospect's own company`).not.toContain('Halden & Co')
      }
    }
    expect(steps[0].subject, 'step 1 subject lost its merge token').toContain('{{company}}')
    expect(steps[1].subject, 'step 2 subject lost its merge token').toContain('{{first_name}}')
    expect(JSON.stringify(steps)).toContain('{{first_name}}')
  })

  it('4 · it is written from THIS client\'s own context, not from a default', async () => {
    const { generateProgrammeSequence } = await import('./programme-sequence-generation')
    await generateProgrammeSequence(PROG)
    expect(state.generatorCalls).toHaveLength(1)
    const call = state.generatorCalls[0]
    expect(call.company).toBe('Northwind Logistics')
    expect(String(call.knowledge)).toContain('qualified prospect')
    expect((call.lead as Row).id, 'the draft was not written against this programme\'s own prospect').toBe('lead-1')
  })

  it('5 · a prospect from ANOTHER programme is never the one it writes for', async () => {
    seedFreshProgramme({ leads: [
      { id: 'other-prog-lead', client_id: CLIENT, programme_id: 'zzzzzzzz-9999-4999-8999-zzzzzzzzzzzz',
        first_name: 'Wrong', last_name: 'Person', job_title: 'CFO', company: 'Elsewhere Ltd',
        score: 99, qualified_at: 'q', disqualified_at: null },
      { id: 'lead-1', client_id: CLIENT, programme_id: PROG, first_name: 'Priya', last_name: 'Natarajan',
        job_title: 'Head of Operations', company: 'Halden & Co', industry: 'Logistics',
        score: 10, qualified_at: 'q', disqualified_at: null },
    ] })
    const { generateProgrammeSequence } = await import('./programme-sequence-generation')
    await generateProgrammeSequence(PROG)
    expect((state.generatorCalls[0].lead as Row).id).toBe('lead-1')
  })

  it('6 · a DISQUALIFIED prospect is never the one it writes for', async () => {
    seedFreshProgramme({ leads: [
      { id: 'rejected', client_id: CLIENT, programme_id: PROG, first_name: 'No', company: 'Rejected Ltd',
        score: 99, qualified_at: 'q', disqualified_at: 'd' },
      { id: 'lead-1', client_id: CLIENT, programme_id: PROG, first_name: 'Priya', company: 'Halden & Co',
        job_title: 'Head of Operations', score: 10, qualified_at: 'q', disqualified_at: null },
    ] })
    const { generateProgrammeSequence } = await import('./programme-sequence-generation')
    await generateProgrammeSequence(PROG)
    expect((state.generatorCalls[0].lead as Row).id).toBe('lead-1')
  })
})

describe('🛑 what it must never do', () => {
  it('7 · it never overwrites an existing sequence — an operator\'s edit survives', async () => {
    const authored = [{ step: 1, subject: 'operator wrote this', body: 'and it must survive', wait_days: 3 }]
    seedFreshProgramme({ sequences: [{ id: 'seq-existing', client_id: CLIENT, campaign_id: CAMP, name: 'Hand-authored', steps: authored }] })
    const { generateProgrammeSequence } = await import('./programme-sequence-generation')
    const r = await generateProgrammeSequence(PROG)
    expect(r.ok).toBe(false)
    expect(!r.ok && r.alreadyPresent).toBe(true)
    expect(state.sequences[0].steps).toEqual(authored)
    expect(state.generatorCalls, 'the model was called for a programme that already had words').toHaveLength(0)
  })

  it('8 · a second run is idempotent — one row, one generation', async () => {
    const { generateProgrammeSequence } = await import('./programme-sequence-generation')
    const first = await generateProgrammeSequence(PROG)
    expect(first.ok).toBe(true)
    const second = await generateProgrammeSequence(PROG)
    expect(second.ok).toBe(false)
    expect(!second.ok && second.alreadyPresent).toBe(true)
    expect(state.sequences, 'a retry wrote a second canonical sequence').toHaveLength(1)
    expect(state.generatorCalls, 'a retry paid for a second generation').toHaveLength(1)
  })

  it('9 · copy that fails the quality rules is REFUSED, never saved', async () => {
    // 🛑 FAIL CLOSED. This copy goes into a frozen snapshot a customer approves with no operator
    // between them and it, so the linter's hard failures must stop it rather than warn.
    state.draft = { step1: { subject: 'Hope this finds you well', body: 'I wanted to reach out and touch base about synergy — a real game-changer.' } }
    const { generateProgrammeSequence } = await import('./programme-sequence-generation')
    const r = await generateProgrammeSequence(PROG)
    expect(r.ok).toBe(false)
    expect(!r.ok && r.reason).toMatch(/quality rules/)
    expect(state.sequences, 'copy the product itself would reject was saved for a customer to approve').toHaveLength(0)
  })

  it('10 · a generator failure writes nothing and says so plainly', async () => {
    state.generatorThrows = true
    const { generateProgrammeSequence } = await import('./programme-sequence-generation')
    const r = await generateProgrammeSequence(PROG)
    expect(r.ok).toBe(false)
    expect(!r.ok && r.reason).toContain('could not be drafted')
    expect(state.sequences).toHaveLength(0)
  })

  it('11 · with no qualified prospect it refuses rather than inventing a reader', async () => {
    seedFreshProgramme({ leads: [] })
    const { generateProgrammeSequence } = await import('./programme-sequence-generation')
    const r = await generateProgrammeSequence(PROG)
    expect(r.ok).toBe(false)
    expect(!r.ok && r.reason).toContain('no qualified prospect')
    expect(state.sequences).toHaveLength(0)
  })

  it('12 · it never creates a campaign — that is preparation\'s job, under the programme\'s authority', async () => {
    seedFreshProgramme({ campaignId: null })
    const { generateProgrammeSequence } = await import('./programme-sequence-generation')
    const r = await generateProgrammeSequence(PROG)
    expect(r.ok).toBe(false)
    expect(state.campaigns, 'a second door to campaign creation was opened').toHaveLength(0)
    expect(state.sequences).toHaveLength(0)
  })

  it('13 · it reaches no House helper and no House copy, by construction', async () => {
    const { readFileSync } = await import('node:fs')
    const src = readFileSync(new URL('./programme-sequence-generation.ts', import.meta.url), 'utf8')
    const code = src.split('\n').filter(l => {
      const t = l.trim(); return t && !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*')
    }).join('\n')
    for (const forbidden of ['house-sequence', 'isHouseLaunchProgramme', 'HOUSE_SEQUENCE_STEPS', 'applyHouseProgrammeSequence', 'HOUSE_LAUNCH_PROGRAMME_ID']) {
      expect(code.includes(forbidden), `generation can reach ${forbidden}`).toBe(false)
    }
  })

  it('14 · it sends nothing, enrols nobody and advances no status', async () => {
    const { readFileSync } = await import('node:fs')
    const src = readFileSync(new URL('./programme-sequence-generation.ts', import.meta.url), 'utf8')
    const code = src.split('\n').filter(l => {
      const t = l.trim(); return t && !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*')
    }).join('\n')
    for (const forbidden of ['sendSequenceEmail', 'autoEnrollLead', 'markReadyForApproval', 'sendAs', 'runSendDue']) {
      expect(code.includes(forbidden), `generation can reach ${forbidden}`).toBe(false)
    }
  })
})
