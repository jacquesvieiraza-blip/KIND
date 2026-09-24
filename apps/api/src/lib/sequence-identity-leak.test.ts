// ═══════════════════════════════════════════════════════════════════════════════════════
// 24 Sep — ONE PROSPECT'S NAME AND COMPANY REACHED A CLIENT'S APPROVAL SCREEN.
//
// The founder's House walk: the generated sequence said "<first name, lower case>, ceo lead gen
// question", "noticed you're running <company without its LLC> as CEO", and was signed by a name
// nobody gave it. `detokenise` matched only the exact, case-sensitive spelling, and with no signer
// on file the prompt told the model to pick a name. Approved, that copy goes to every prospect.
//
// The lead below is invented; it has the same SHAPE as the walk's sample (lower-case first name
// in a lowercase subject, company written without its legal tail).
// ═══════════════════════════════════════════════════════════════════════════════════════
import { describe, it, expect, vi, beforeEach } from 'vitest'

const state = vi.hoisted(() => ({
  brokenDetokenise: false,
  draft: {} as Record<string, { subject: string; body: string }>,
  applied: [] as { steps: { subject: string; body: string }[] }[],
}))

const LEAD = {
  id: 'lead-1', first_name: 'Dana', last_name: 'Okafor', job_title: 'CEO', company: 'Harbour Point LLC',
  industry: null, seniority: 'c_suite', country: 'United States', tech_stack: null, score: 90, score_reasoning: null,
}

function table(name: string) {
  const row = name === 'leads' ? LEAD
    : name === 'clients' ? { company_name: 'Kind', industry: null, signer_name: null, booking_url: null }
    : { name: 'House', campaign_intent: null }
  const chain: Record<string, unknown> = {}
  for (const m of ['select', 'eq', 'not', 'is', 'order', 'limit']) chain[m] = () => chain
  chain.maybeSingle = async () => ({ data: row, error: null })
  return chain
}

vi.mock('@kind/db', () => ({ db: { from: (t: string) => table(t) } }))
vi.mock('./programme-chain', () => ({
  resolveProgrammeChain: async () => ({ ok: true, chain: { clientId: 'client-1', campaignId: 'camp-1', sequenceId: null, steps: [] } }),
}))
vi.mock('./figsy', () => ({
  generateSequence: async () => state.draft,
  getClientKnowledgeForOutreach: async () => undefined,
}))
vi.mock('./meeting-brief-deliver', () => ({ briefContextFor: async () => null }))
vi.mock('./programme-sequence', () => ({
  applyProgrammeSequence: async (_id: string, steps: { subject: string; body: string }[]) => {
    state.applied.push({ steps })
    return { ok: true, created: true, steps: steps.length, sequenceId: 'seq-1' }
  },
}))
// Lets one test put back the OLD behaviour — copy handed through untouched — to prove the guard
// behind detokenise refuses on its own.
vi.mock('./sequence-tokens', async (importOriginal) => {
  const real = await importOriginal<typeof import('./sequence-tokens')>()
  return { ...real, detokenise: (text: string, lead: never) => (state.brokenDetokenise ? text : real.detokenise(text, lead)) }
})

import { detokenise, leakedIdentity, companyCore } from './sequence-tokens'
import { generateProgrammeSequence } from './programme-sequence-generation'

const WALK_DRAFT = {
  step1: { subject: 'dana, ceo lead gen question', body: 'Hi Dana,\n\nnoticed you\'re running Harbour Point as CEO and hiring for growth. Worth a short reply?\n\nKind\n\nReply STOP to opt out.' },
  step2: { subject: 'quick follow up on pipeline', body: 'Hi Dana,\n\nOne more thought for Harbour Point: most teams your size lose deals in the follow up.\n\nKind\n\nReply STOP to opt out.' },
  step3: { subject: 'a different angle for you', body: 'Hi Dana,\n\nA quick idea on booked meetings for a team like yours.\n\nKind\n\nReply STOP to opt out.' },
  step4: { subject: 'one last useful idea', body: 'Hi Dana,\n\nShort one. Is new pipeline a priority this quarter?\n\nKind\n\nReply STOP to opt out.' },
  step5: { subject: 'closing the loop here', body: 'Hi Dana,\n\nI will leave it here. If timing changes, just reply.\n\nKind\n\nReply STOP to opt out.' },
}

beforeEach(() => { state.brokenDetokenise = false; state.applied = []; state.draft = WALK_DRAFT })

describe('detokenise — every spelling of the sample person', () => {
  it('🛑 the walk\'s subject: a lower-case first name and title become tokens', () => {
    expect(detokenise('dana, ceo lead gen question', LEAD)).toBe('{{first_name}}, {{job_title}} lead gen question')
  })

  it('🛑 the walk\'s body: the company WITHOUT its legal tail becomes a token', () => {
    expect(detokenise('noticed you\'re running Harbour Point as CEO', LEAD))
      .toBe('noticed you\'re running {{company}} as {{job_title}}')
    expect(detokenise('Harbour Point LLC is growing', LEAD)).toBe('{{company}} is growing')
    expect(detokenise('HARBOUR POINT is growing', LEAD)).toBe('{{company}} is growing')
  })

  it('whole words only — a name never eats the middle of another word', () => {
    expect(detokenise('Merry Christmas, Chris', { first_name: 'Chris' })).toBe('Merry Christmas, {{first_name}}')
  })

  it('the legal tail comes off; a name that merely ends in a common word does not', () => {
    expect(companyCore('Rock Strategic LLC')).toBe('Rock Strategic')
    expect(companyCore('Acme Holdings, Inc.')).toBe('Acme Holdings')
    expect(companyCore('Blue Sky Pty Ltd')).toBe('Blue Sky')
    expect(companyCore('Nandos Logistics')).toBe('Nandos Logistics')
    expect(companyCore('The Coffee Company')).toBe('The Coffee Company')
  })

  it('leakedIdentity names what is left, and nothing once the copy is clean', () => {
    expect(leakedIdentity('hi dana at harbour point', LEAD).sort()).toEqual(['Dana', 'Harbour Point'])
    expect(leakedIdentity(detokenise('hi dana at harbour point', LEAD), LEAD)).toEqual([])
    // The title is a common noun in prose and is never a leak on its own.
    expect(leakedIdentity('as a CEO you know', LEAD)).toEqual([])
  })
})

describe('generateProgrammeSequence — the saved copy', () => {
  it('🛑 the walk\'s draft is saved with NO trace of the sample person', async () => {
    const res = await generateProgrammeSequence('prog-1')
    expect(res.ok).toBe(true)
    expect(state.applied).toHaveLength(1)
    for (const call of state.applied) {
      for (const s of call.steps) expect(leakedIdentity(`${s.subject}\n${s.body}`, LEAD)).toEqual([])
    }
  })

  it('🛑 with the OLD pass-through detokenise, the guard refuses and nothing is written', async () => {
    state.brokenDetokenise = true
    const res = await generateProgrammeSequence('prog-1')
    expect(res.ok).toBe(false)
    expect(res.ok ? '' : res.reason).toContain('still named the one prospect')
    expect(state.applied).toHaveLength(0)
  })
})

describe('the sign-off — never a person nobody named', () => {
  it('🛑 with no signer on file the rule names the company and forbids a made-up person', async () => {
    const { signOffRule } = await vi.importActual<typeof import('./figsy')>('./figsy')
    const rule = signOffRule(null, 'Kind')
    expect(rule).toContain('"Kind"')
    expect(rule).toContain('Do NOT sign with, invent or guess any person\'s name')
    expect(rule).not.toMatch(/pick a name/i)
    expect(signOffRule('  ', '')).not.toMatch(/pick a name|real first name/i)
  })

  it('a signer on file is used exactly', async () => {
    const { signOffRule } = await vi.importActual<typeof import('./figsy')>('./figsy')
    expect(signOffRule('Jacques', 'Kind')).toContain('Sign off as exactly "Jacques"')
  })

  it('the drafting prompt goes through the rule', async () => {
    const { readFileSync } = await import('fs')
    const { join } = await import('path')
    const src = readFileSync(join(__dirname, 'figsy.ts'), 'utf8')
    expect(src).toContain('${signOffRule(senderName, senderCompanyName)}')
    expect(src).not.toContain('pick a name that fits the sender\\\'s company')
  })
})
