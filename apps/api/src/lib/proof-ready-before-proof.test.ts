// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 23 Sep — BLACKBURNE, AND THE FOUNDER'S RULE THAT A CLIENT NEVER SEES THAT SCREEN AGAIN
//
// Production, 23 Sep: Blackburne Enterprises reached Brief 11/11, Apollo returned 20 real people
// from a workable pool of 11,510, all 20 were set aside on SIZE, and the client sat on a Proof
// screen reading "We hit a snag confirming your matches".
//
// Founder, verbatim: *"we do not present the next step until we can verify we have the
// information we need. the onboarding portal should not allow us to move to this screen ever."*
// · *"20, or all of them if smaller."* · *"the i hit a snag is bulsshit. it is so customer
// unfriendly."*
//
// This file proves both halves, by RUNNING them:
//   ① Blackburne's exact shape — size picked from the dropdown, different words in the brief,
//     Apollo's people at the picked size — now keeps every person; only exclusions remove;
//   ② the readiness rule moves a client on at 20, or at everybody when the market is smaller,
//     and at nothing else — and it never answers "ready" for an empty or failed run.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { proofReadiness, firstProofReadiness, PROOF_READY_TARGET, PROOF_NEEDS_US_COPY } from '@kind/shared'
import { hardFit, removalCriterion } from './proof-fit'
import { FAILED_RUN_BODY, FAILED_RUN_HEADLINE } from './run-outcome'

vi.mock('@kind/db', () => ({ db: {} }))
process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321'
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-key'
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'test-key'
const { icpFromDraft } = await import('./promotion')

const draft = (facts: Record<string, unknown>) => ({
  id: 'd', userId: 'u', facts, conversation: [], confirmedAt: 'c', promotedClientId: null,
}) as never

describe('① Blackburne — the search and the check can no longer disagree about the same field', () => {
  // What the client said in the Brief, and what they then PICKED from the Employees dropdown.
  const icp = icpFromDraft(draft({
    target_category: 'HVAC units for commercial spaces',
    company_sizes: ['around 20'],
    picked: { company_sizes: ['51–200'] },
    geographies: ['United Kingdom'],
  }))

  it('the pick is the only size on the ICP — so the check judges exactly what was searched', () => {
    expect(icp.company_sizes).toEqual(['51–200'])
    expect(icp.target_size, 'the brief\'s words would outrank the pick in the check').toBeUndefined()
  })

  it('🛑 twenty people at the picked size are ALL kept', () => {
    for (const head of ['60', '75', '120', '180', '51', '200']) {
      const f = hardFit({ country: 'United Kingdom', company_size: head, job_title: 'Owner', seniority: 'owner', industry: 'Construction' }, icp as never)
      expect(removalCriterion(f), `a ${head}-person company was removed`).toBeNull()
    }
  })

  it('🛑 and even a size MISMATCH, or an unreadable headcount, only ranks — it never removes', () => {
    for (const head of ['8', '4000', null]) {
      const f = hardFit({ country: 'United Kingdom', company_size: head, job_title: 'Owner', seniority: 'owner' }, icp as never)
      expect(removalCriterion(f), `size ${String(head)} removed a person`).toBeNull()
    }
  })

  it('⚠️ an EXCLUSION still removes — the one instruction the client gave us', () => {
    const ex = { ...(icp as object), exclusions: 'no recruitment agencies' }
    const f = hardFit({ country: 'United Kingdom', company_size: '120', company: 'Apex Recruitment Agencies' }, ex as never)
    expect(removalCriterion(f)).toBe('excluded')
  })
})

describe('② the client moves to Proof at 20 — or at everybody when their market is smaller', () => {
  const base = { claimed: true, onDesk: 0, runStatus: null, runInserted: null, workState: null, needsReview: false }

  it('the target is 20', () => expect(PROOF_READY_TARGET).toBe(20))

  it('nothing claimed → still in the Brief conversation', () => {
    expect(proofReadiness({ ...base, claimed: false })).toBe('not_started')
  })

  it('🛑 a run still working is PREPARING — never shown to the client as a result', () => {
    expect(proofReadiness({ ...base, onDesk: 7, workState: 'started' })).toBe('preparing')
  })

  it('🛑 20 on the desk → ready', () => {
    expect(proofReadiness({ ...base, onDesk: 20, workState: 'started' })).toBe('ready')
  })

  it('🛑 a market of 12, all 12 on the desk → ready ("all of them if smaller")', () => {
    expect(proofReadiness({ ...base, onDesk: 12, runStatus: 'served', runInserted: 12, workState: 'completed' })).toBe('ready')
  })

  it('🛑 BLACKBURNE: 20 found, 0 on the desk → NOT ready, and ours to finish — never the Proof screen', () => {
    expect(proofReadiness({ ...base, onDesk: 0, runStatus: 'served', runInserted: 20, workState: 'completed' })).toBe('needs_us')
  })

  it('20 found, 17 on the desk → not ready; ours to top up', () => {
    expect(proofReadiness({ ...base, onDesk: 17, runStatus: 'served', runInserted: 20, workState: 'completed' })).toBe('needs_us')
  })

  it('a crashed run → ours, never the client\'s', () => {
    expect(proofReadiness({ ...base, runStatus: 'failed', workState: 'failed' })).toBe('needs_us')
  })

  it('the search found NOBODY → only the client can change that, so Milla asks them', () => {
    expect(proofReadiness({ ...base, runStatus: 'no_match', runInserted: 0, workState: 'completed' })).toBe('needs_client')
  })

  it('an unreadable desk is not an empty one — hold, assert nothing', () => {
    expect(proofReadiness({ ...base, onDesk: null, runStatus: 'served', runInserted: 20 })).toBe('preparing')
  })

  it('a client past their first Proof is never held (`null`)', () => {
    expect(firstProofReadiness({ proof_passes_done: 2, leads_awaiting: 0 })).toBeNull()
    expect(firstProofReadiness({ proof_passes_done: 1, proof_started_at: 'x', leads_awaiting: 20 })).toBe('ready')
  })
})

describe('③ both doors ask the rule, and the "snag" is gone', () => {
  const code = (p: string) => readFileSync(join(__dirname, '../../../', p), 'utf8').split('\n')
    .filter(l => { const t = l.trim(); return !(t.startsWith('//') || t.startsWith('*') || t.startsWith('/*') || t.startsWith('{/*')) })
    .join('\n')

  it('🛑 the Brief page holds on confirm and leaves only on `ready`', () => {
    const w = code('portal/src/app/(milla)/milla/welcome/page.tsx')
    expect(w).toContain("setProofHold('preparing')")
    expect(w).not.toContain('finding=1')
    expect(w).toContain('firstProofReadiness(')
  })

  it('🛑 the desk sends a not-ready FIRST Proof back to the Brief — after the programme read lands', () => {
    const d = code('portal/src/app/(milla)/milla/page.tsx')
    const at = d.indexOf('firstProofReadiness(summary)')
    expect(at, 'the desk does not ask the rule').toBeGreaterThan(-1)
    const effect = d.slice(d.lastIndexOf('useEffect(', at), d.indexOf('}, [summary, prog, router])', at))
    expect(effect).toContain("if (!prog || prog.hasProgramme !== false) return")
    expect(effect).toContain("router.replace('/milla/welcome')")
  })

  it('🛑 no client-facing file says "snag" about their matches', () => {
    for (const p of ['portal/src/app/(milla)/milla/page.tsx', 'portal/src/app/(milla)/milla/welcome/page.tsx', 'api/src/lib/run-outcome.ts']) {
      expect(code(p), p).not.toMatch(/'We hit a snag confirming your matches'/)
    }
    expect(FAILED_RUN_HEADLINE).not.toMatch(/snag/i)
    expect(FAILED_RUN_BODY, 'the desk and the Brief hold must say the same thing').toBe(PROOF_NEEDS_US_COPY)
  })
})
