// ⚑ 3 Oct (R195 ① ② · sequencing piece 3, founder's blueprint views 1, 3, 4 — option "A, go").
// Every programme starts from "What are you trying to achieve this time?"; Milla drafts the
// direction; the client approves it BEFORE paying; the emails are written from it.
import { describe, it, expect, vi } from 'vitest'
vi.mock('@kind/db', () => ({ db: {} }))
import { readFileSync } from 'fs'
import { join } from 'path'
import {
  parseDirectionDraft, proofLineFor, usableDirection, changeDirection, approveDirectionPure,
  directionPromptBlock, DIRECTION_KEYS, type Direction,
} from './programme-direction'

const D: Direction = {
  version: 3, status: 'draft', programme_id: null, drafted_at: '2026-10-03T10:00:00Z', approved_at: null,
  goal: 'Book meetings with facilities firms under response-time pressure.',
  who: 'Operations Directors at facilities firms, 20–100 staff.',
  problem: 'Response-time obligations tracked across spreadsheets.',
  impact: 'Teams lose sight of jobs at risk.',
  answer: 'One live place to dispatch, track and sign off jobs.',
  proof: 'No result is quoted.',
  ask: '15 minutes to compare how they track jobs at risk today.',
}

describe('Milla drafts the direction — and never the proof', () => {
  it('reads the model\'s JSON, even with words around it', () => {
    const r = parseDirectionDraft('Here you go:\n{"who":"W","problem":"P","impact":"I","answer":"A","ask":"K"}\nThanks')
    expect(r).toEqual({ who: 'W', problem: 'P', impact: 'I', answer: 'A', ask: 'K' })
  })
  it('🛑 a draft missing any part is refused, never half-filled', () => {
    expect(parseDirectionDraft('{"who":"W","problem":"P","impact":"I","answer":"A"}')).toBeNull()
    expect(parseDirectionDraft('{"who":"W","problem":"","impact":"I","answer":"A","ask":"K"}')).toBeNull()
    expect(parseDirectionDraft('no json at all')).toBeNull()
  })
  it('🛑 the proof line is ours: a result only with the client\'s tick, otherwise none', () => {
    expect(proofLineFor({ result: 'Cut missed visits by a third', resultMayQuote: true })).toContain('Cut missed visits by a third')
    const none = proofLineFor({ result: 'Cut missed visits by a third', resultMayQuote: false })
    expect(none).not.toContain('Cut missed visits')
    expect(none).toMatch(/No result is quoted/)
  })
})

describe('one direction per programme, and it is frozen once paid for', () => {
  it('a direction not yet attached, or attached to the unpaid programme being chosen, is the one in use', () => {
    expect(usableDirection(D, null)).toBe(D)
    expect(usableDirection({ ...D, programme_id: 'p1' }, { id: 'p1', paid: false })).toEqual({ ...D, programme_id: 'p1' })
  })
  it('🛑 the last programme\'s direction is never reused for the next one', () => {
    expect(usableDirection({ ...D, programme_id: 'old' }, null)).toBeNull()
    expect(usableDirection({ ...D, programme_id: 'old' }, { id: 'new', paid: false })).toBeNull()
    expect(usableDirection({ ...D, programme_id: 'p1' }, { id: 'p1', paid: true })).toBeNull()
  })
})

describe('every change is a new version, and a change reopens approval', () => {
  it('a change raises the version, keeps the old one in history, and clears approval', () => {
    const approved = { ...D, status: 'approved' as const, approved_at: '2026-10-03T11:00:00Z' }
    const r = changeDirection({ current: approved, history: [] }, { key: 'impact', value: 'Visibility, not penalties.', baseVersion: 3 }, '2026-10-03T12:00:00Z')
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.data.current).toMatchObject({ version: 4, status: 'draft', approved_at: null, impact: 'Visibility, not penalties.' })
    expect(r.data.history.map(h => h.version)).toEqual([3])
  })
  it('🛑 a change against an older version is refused', () => {
    expect(changeDirection({ current: D, history: [] }, { key: 'ask', value: 'x', baseVersion: 2 }, 'now')).toEqual({ ok: false, reason: 'stale' })
  })
  it('🛑 approval needs the exact version and every part filled', () => {
    expect(approveDirectionPure(D, 2, 'now')).toEqual({ ok: false, reason: 'stale' })
    expect(approveDirectionPure({ ...D, ask: ' ' }, 3, 'now')).toEqual({ ok: false, reason: 'incomplete' })
    expect(approveDirectionPure(D, 3, '2026-10-03T13:00:00Z')).toEqual({ ok: true, direction: { ...D, status: 'approved', approved_at: '2026-10-03T13:00:00Z' } })
  })
  it('the seven parts are the blueprint\'s brief', () => {
    expect([...DIRECTION_KEYS]).toEqual(['goal', 'who', 'problem', 'impact', 'answer', 'proof', 'ask'])
  })
})

describe('the emails are written from the approved direction', () => {
  it('the block tells the writer it was approved, with every part', () => {
    const b = directionPromptBlock({ ...D, status: 'approved' })
    expect(b).toMatch(/APPROVED/)
    for (const k of ['goal', 'who', 'problem', 'impact', 'answer', 'proof', 'ask'] as const) expect(b).toContain(D[k])
  })
  it('🛑 wired: the writer reads it for THIS programme, and an unreadable direction stops the writing', () => {
    const gen = readFileSync(join(__dirname, 'programme-sequence-generation.ts'), 'utf8')
    expect(gen).toContain('approvedDirectionFor(programmeId, clientId)')
    expect(gen).toMatch(/approvedDirectionFor\(programmeId, clientId\)[\s\S]{0,600}ok: false/)
  })
})

describe('🛑 nothing is paid for until the direction is approved', () => {
  const route = readFileSync(join(__dirname, '../routes/my-programme.ts'), 'utf8')
  const page = readFileSync(join(__dirname, '../../../portal/src/app/(milla)/milla/programme/page.tsx'), 'utf8')
  const conv = readFileSync(join(__dirname, '../../../portal/src/components/milla/MillaConversation.tsx'), 'utf8')
  it('the first-payment route refuses without an approved direction — before the demo, House and Stripe doors', () => {
    const fn = route.slice(route.indexOf('async function programmeCheckout('))
    const at = fn.indexOf("error: 'direction_not_approved'")
    expect(at).toBeGreaterThan(-1)
    // The demo's own press (it returns early) carries the gate before it moves the demo on…
    expect(fn.indexOf('requireApprovedDirection(')).toBeLessThan(fn.indexOf('advanceNorthwindOnPress('))
    // …and every real first payment meets it first, before any other P1 check and before Stripe.
    const p1 = fn.indexOf('const gate = await requireApprovedDirection(clientId, p.id)')
    expect(p1).toBeGreaterThan(fn.indexOf('isHouseClient(clientId)'))
    expect(p1).toBeLessThan(fn.indexOf('already_paid'))
    expect(fn.lastIndexOf("error: 'direction_not_approved'")).toBeLessThan(fn.indexOf('createProgrammeCheckoutSession'))
  })
  it('🛑 Vida\'s internal first payment needs it too (R194 — the same rule for House)', () => {
    const vida = readFileSync(join(__dirname, '../routes/programme.ts'), 'utf8')
    const r = vida.slice(vida.indexOf("programmeRouter.post('/:id/authorise/first'"))
    expect(r.indexOf('requireApprovedDirection(')).toBeGreaterThan(-1)
    expect(r.indexOf('requireApprovedDirection(')).toBeLessThan(r.indexOf('authoriseFirstInternal('))
  })
  it('the page shows the price and pay button only once the direction is approved — both ways in', () => {
    expect((page.match(/directionApproved \? \(/g) ?? []).length).toBe(2)
    expect((page.match(/<ProgrammeDirection /g) ?? []).length).toBe(2)
  })
  it('Milla drafts and changes it through the direction routes only', () => {
    expect(conv).toContain("'/my/programme/direction/draft'")
    expect(conv).toContain("'/my/programme/direction/change'")
  })
  it('the walks approve a direction before they pay', () => {
    for (const f of ['demo-walk.mjs', 'journeys.mjs']) {
      const s = readFileSync(join(__dirname, '../../../../scripts/fullstack', f), 'utf8')
      const approve = s.indexOf('/my/programme/direction/approve')
      expect(approve, f).toBeGreaterThan(-1)
      expect(s.indexOf('/my/programme/checkout/first', approve), `${f}: pays after approving`).toBeGreaterThan(approve)
    }
  })
})
