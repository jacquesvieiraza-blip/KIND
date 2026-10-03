// 4a (#2542 · R186 ③) — THE FOUNDER APPROVES THE WORDING BEFORE IT REACHES ANYONE.
//
// Founder: "i want to review the sequence and campaign wording for now. this is a stage gate
// approval needed by me in vida." · once per sequence: "A. lock" · founder first: "A. lock".

import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { founderVerdict, founderGateOn, wordingHash } from './founder-approval'

const W = wordingHash([{ subject: 'Hi', body: 'One', wait_days: 3 }])

describe('4a — the rule', () => {
  it('nothing sends for a version he has not approved', () => {
    const v = founderVerdict({ gateOn: true, version: 'v1', wording: W, approvals: [], followUp: false })
    expect(v.allowed).toBe(false)
    expect(!v.allowed && v.message).toMatch(/has not approved these emails yet/)
  })
  it('the exact version he approved sends', () => {
    expect(founderVerdict({ gateOn: true, version: 'v1', wording: W, approvals: [{ snapshot_hash: 'v1', wording_hash: W }], followUp: false }))
      .toEqual({ allowed: true })
  })
  it('a new version (new wording or new people) waits — for NEW people', () => {
    expect(founderVerdict({ gateOn: true, version: 'v2', wording: W, approvals: [{ snapshot_hash: 'v1', wording_hash: W }], followUp: false }).allowed).toBe(false)
  })
  it('Batch 2: a follow-up to someone already emailed keeps going while the wording is approved', () => {
    expect(founderVerdict({ gateOn: true, version: 'v2', wording: W, approvals: [{ snapshot_hash: 'v1', wording_hash: W }], followUp: true }))
      .toEqual({ allowed: true })
  })
  it('…but not if the wording itself changed', () => {
    const W2 = wordingHash([{ subject: 'Hi', body: 'Two', wait_days: 3 }])
    expect(founderVerdict({ gateOn: true, version: 'v2', wording: W2, approvals: [{ snapshot_hash: 'v1', wording_hash: W }], followUp: true }).allowed).toBe(false)
  })
  it('the gate stays on until he turns it off', () => {
    expect(founderGateOn({})).toBe(true)
    expect(founderGateOn({ FOUNDER_WORDING_GATE: 'on' })).toBe(true)
    expect(founderGateOn({ FOUNDER_WORDING_GATE: 'OFF' })).toBe(false)
  })
  it('the wording hash ignores nothing that a prospect reads', () => {
    expect(wordingHash([{ subject: 'Hi', body: 'One', wait_days: 3 }])).not.toBe(wordingHash([{ subject: 'Hi!', body: 'One', wait_days: 3 }]))
  })
})

describe('4a — wired into the one send door, and recorded in Vida', () => {
  const read = (p: string) => readFileSync(join(__dirname, p), 'utf8')
  it('the gate asks it for every real send (not for campaign set-up)', () => {
    const gate = read('programme-authority.ts')
    expect(gate).toContain("if (ctx?.enforceSchedule !== false) {\n    const { founderApprovalVerdict } = await import('./founder-approval')")
    expect(gate).toContain("reason: 'founder_not_approved'")
    expect(read('figsy.ts')).toContain('followUp: step > 1 })')
  })
  it('Vida can read the version and approve exactly that one; the act is audited', () => {
    const r = read('../routes/programme.ts')
    expect(r).toContain("programmeRouter.get('/:id/wording'")
    expect(r).toContain("programmeRouter.post('/:id/wording/approve'")
    expect(r).toContain("auditProgramme(req, 'founder_wording_approved'")
    expect(read('founder-approval.ts')).toContain('The emails changed while you were reading them.')
  })
  it('the table exists in both homes', () => {
    expect(existsSync(join(__dirname, '../../../../supabase/migrations/20261002_founder_wording_approval.sql'))).toBe(true)
    expect(read('pending-migrations.ts')).toContain("key: '20261002_founder_wording_approval'")
  })
})

// ⚑ 3 Oct — the round review's findings on 4a (S7 · S9 · S11).
describe('4a — review fixes', () => {
  const FA = readFileSync(join(__dirname, 'founder-approval.ts'), 'utf8')
  const ROUTE = readFileSync(join(__dirname, '../routes/programme.ts'), 'utf8')
  const PANEL = readFileSync(join(__dirname, '../../../admin/src/components/vida/FounderWordingApproval.tsx'), 'utf8')
  it('S7 — no sentence claims follow-ups continue (not true until R191 4c is built)', () => {
    const refused = founderVerdict({ gateOn: true, version: 'v2', wording: 'other', approvals: [{ snapshot_hash: 'v1', wording_hash: W }], followUp: false })
    expect(!refused.allowed && refused.message).not.toMatch(/continue/)
    expect(PANEL).not.toMatch(/Follow-ups to people already emailed continue/)
  })
  it('S9 — the demo is not gated (it reaches nobody and is rebuilt on every press)', () => {
    expect(FA).toContain('if (row?.client_id && await isDemoProgrammeClient(row.client_id)) return { allowed: true }')
  })
  it('S11 — the founder reads them filled for a real prospect, by the sender\'s own token filler', () => {
    const route = ROUTE.slice(ROUTE.indexOf("programmeRouter.get('/:id/wording'"))
    expect(route).toContain("const { applyTokens } = await import('../lib/sequence-apply')")
    expect(route).toContain("subject: fill(String(st.subject ?? '')), body: fill(String(st.body ?? ''))")
    expect(PANEL).toContain('Each email also ends with the opt-out line and the client&apos;s legal line, added when it is sent.')
  })
})
