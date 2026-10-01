// ⚑ 1 Oct (R180 · Coaching #2496) — MEETING LEARNING: lines only for Full Coaching, only from F1
// answers and notes, and the prep-brief prompt carries them for Full Coaching and not for Growth.
// Mocks only — no network, no provider, no spend.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

const state = vi.hoisted(() => ({
  band: 'enterprise' as string, activated: false, read: [] as string[], outcomeReads: 0,
  meetings: [] as Array<{ id: string; leadId: string | null; scheduledAt: string; state: string; rescheduled: boolean }>,
  outcomes: new Map<string, { answer: string; label: string; note: string | null; at: string }>(),
  leads: [] as Array<Record<string, unknown>>,
}))
vi.mock('@kind/db', () => ({
  db: {
    from: (t: string) => {
      state.read.push(t)
      let rows: Array<Record<string, unknown>> =
        t === 'programmes' ? [{ id: 'p-1', size_band: state.band, status: 'LIVE', created_at: '2026-09-01' }]
        : t === 'coaching_activations' ? (state.activated ? [{ id: 'a-1' }] : [])
        : t === 'leads' ? [...state.leads] : []
      const q: Record<string, unknown> = {
        select() { return q }, eq() { return q }, order() { return q }, limit() { return q }, is() { return q },
        in(col: string, vals: unknown[]) { rows = rows.filter(r => vals.includes(r[col])); return q },
        then(r: (v: unknown) => unknown) { return Promise.resolve(r({ data: rows, error: null })) },
      }
      return q
    },
  },
}))
vi.mock('./meeting-truth', () => ({ meetingsForClient: async () => state.meetings }))
vi.mock('./meeting-outcome', () => ({ latestOutcomes: async () => { state.outcomeReads += 1; return state.outcomes } }))

import { meetingLearningLines, meetingLearningFor, prepBriefPrompt, MIN_LEARNING, type LearnedMeeting } from './meeting-learning'

const M = (answer: LearnedMeeting['answer'], note: string | null, at: string, jobTitle: string | null = null): LearnedMeeting => ({ answer, note, at, jobTitle })
const FIXTURE: LearnedMeeting[] = [
  M('next_step', 'They loved the case study from Harbourline.', '2026-09-20', 'Head of Operations'),
  M('next_step', null, '2026-09-18', 'Operations Director'),
  M('next_step', 'Asked for a pilot proposal.', '2026-09-15', 'Finance Director'),
  M('not_now', 'Timing — they revisit budgets next quarter.', '2026-09-19', 'CFO'),
  M('not_now', 'Too busy until the new year, timing is wrong.', '2026-09-12', 'Head of Facilities'),
  M('not_fit', 'They already have a contract with a competitor.', '2026-09-10', 'Procurement Lead'),
  M('no_show', 'Never turned up.', '2026-09-08', 'Head of Operations'),
]
const FULL = { full: true }, GROWTH = { full: false }

beforeEach(() => {
  state.band = 'enterprise'; state.activated = false; state.read = []; state.outcomeReads = 0
  state.meetings = FIXTURE.map((_, i) => ({ id: `m${i}`, leadId: `l${i}`, scheduledAt: '2026-09-01', state: 'HELD', rescheduled: false }))
  state.outcomes = new Map(FIXTURE.map((m, i) => [`m${i}`, { answer: m.answer, label: '', note: m.note, at: m.at }]))
  state.leads = FIXTURE.map((m, i) => ({ id: `l${i}`, job_title: m.jobTitle }))
})

describe('#2496 — the lines, from F1 answers and notes only', () => {
  it('🛑 the fixture gives exactly these lines — counts, the shared role, recurring reasons, their notes', () => {
    expect(meetingLearningLines(FIXTURE, FULL)).toEqual([
      "Of the seller's last 6 meetings that happened: 3 agreed a next step, 2 were interested but not now, 1 was not a fit.",
      "2 of the seller's 3 meetings that agreed a next step were with Operations people.",
      'A reason that came up in 2 of the seller\'s "not now" or "not a fit" meetings: timing. Prepare an answer for it.',
      'What the seller noted after meetings that agreed a next step: "They loved the case study from Harbourline." · "Asked for a pilot proposal."',
      'What the seller noted after meetings that did not move forward: "Timing — they revisit budgets next quarter." · "Too busy until the new year, timing is wrong."',
    ])
  })

  it('🛑 nothing for a plan without Full Coaching, however much there is to learn', () => {
    expect(meetingLearningLines(FIXTURE, GROWTH)).toEqual([])
  })

  it(`nothing until ${MIN_LEARNING} meetings that happened have been answered — a no-show is not one`, () => {
    const two = [FIXTURE[0], FIXTURE[3], FIXTURE[6]]
    expect(meetingLearningLines(two, FULL)).toEqual([])
  })

  it('no percentage, rate or money figure in any line', () => {
    for (const l of meetingLearningLines(FIXTURE, FULL)) expect(l).not.toMatch(/%|per ?cent|\brates?\b|\$|£|€/i)
  })
})

describe('#2496 — the gate and the read', () => {
  it('🛑 Enterprise (Full Coaching) gets the lines; F1 is read and replies/sends are never touched', async () => {
    const lines = await meetingLearningFor('c-1')
    expect(lines).toEqual(meetingLearningLines(FIXTURE, FULL))
    expect(state.outcomeReads).toBe(1)
    expect(state.read).not.toContain('figsy_replies')
    expect(state.read).not.toContain('figsy_sent_emails')
  })

  it('Founders with Full Coaching turned on get them too', async () => {
    state.band = 'founders'; state.activated = true
    expect((await meetingLearningFor('c-1')).length).toBeGreaterThan(0)
  })

  it('🛑 Growth gets none — and its F1 answers are not even read for this', async () => {
    state.band = 'growth'
    expect(await meetingLearningFor('c-1')).toEqual([])
    expect(state.outcomeReads).toBe(0)
  })
})

describe('#2496 — the prep-brief prompt', () => {
  const lead = { first_name: 'Declan', last_name: 'Murray', job_title: 'VP Operations', company: 'Harbourline FM', industry: 'Facilities Services', score_reasoning: 'Runs 40 sites.' }
  const base = { sellerName: 'Northwind', lead, replyText: 'Happy to talk.', sellerLines: ['Who usually decides: COO'] }

  it('🛑 carries the learning for Full Coaching, and not for Growth', async () => {
    const full = prepBriefPrompt({ ...base, learningLines: await meetingLearningFor('c-1') })
    state.band = 'growth'
    const growth = prepBriefPrompt({ ...base, learningLines: await meetingLearningFor('c-1') })
    expect(full).toContain("WHAT THE SELLER'S OWN PAST MEETINGS TAUGHT")
    expect(full).toContain('- A reason that came up in 2 of the seller\'s "not now" or "not a fit" meetings: timing.')
    expect(growth).not.toContain('PAST MEETINGS TAUGHT')
    expect(growth).not.toContain('Harbourline."')
  })

  it('without learning lines the prompt is byte-for-byte the one the route built before', () => {
    // The template exactly as it stood inline in `routes/leads.ts` before #2496.
    const reply = { body_text: 'Happy to talk.', body: null as string | null }
    const sellerLines = base.sellerLines
    const before =
      `Prepare ${'Northwind'} for a first sales call.\n\n` +
      `THEM: ${[lead.first_name, lead.last_name].filter(Boolean).join(' ')} — ${lead.job_title ?? 'unknown role'} at ${lead.company ?? 'unknown company'}` +
      `${lead.industry ? ` (${lead.industry})` : ''}.\n` +
      `${lead.score_reasoning ? `WHY THEY FIT: ${lead.score_reasoning}\n` : ''}` +
      `${reply ? `THEIR OWN WORDS: "${(reply.body_text ?? reply.body ?? '').slice(0, 800)}"\n` : ''}` +
      `${sellerLines.length ? `HOW THE SELLER SELLS (their own words — use it, never invent beyond it):\n${sellerLines.map(l => `- ${l}`).join('\n')}\n` : ''}\n` +
      `Give exactly four short sections with these headings and nothing else:\n` +
      `WHAT THEY LIKELY CARE ABOUT\nTHREE QUESTIONS TO ASK\nTHE OBJECTION TO EXPECT\nHOW TO CLOSE THE NEXT STEP\n` +
      `Be specific to this person. Plain text, no markdown, no preamble.`
    expect(prepBriefPrompt({ ...base, learningLines: [] })).toBe(before)
  })

  it('🛑 the brief route builds its prompt here, with the learning from the gate', () => {
    const src = readFileSync(join(__dirname, '..', 'routes', 'leads.ts'), 'utf8')
    const route = src.slice(src.indexOf("leadRouter.post('/coaching/:leadId/brief'"), src.indexOf("leadRouter.get('/meetings'"))
    expect(route).toContain('const learningLines = await meetingLearningFor(clientId)')
    expect(route).toMatch(/content: prepBriefPrompt\(\{[\s\S]*learningLines/)
    expect(route).not.toContain('Give exactly four short sections')
  })
})
