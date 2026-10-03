// 4c (#2542 · R186 ③) — FOUNDER FIRST: THE CLIENT SEES THE WORDING ONLY AFTER HE HAS APPROVED IT.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

let approvals: { snapshot_hash: string }[] = []
vi.mock('@kind/db', () => ({
  db: {
    from: (t: string) => {
      const q: Record<string, (...a: unknown[]) => unknown> = {
        select: () => q, eq: () => q,
        maybeSingle: async () => ({ data: { review_preparation_hash: 'v2' }, error: null }),
      }
      ;(q as Record<string, unknown>).then = (ok: (v: unknown) => unknown) =>
        Promise.resolve({ data: t === 'founder_wording_approvals' ? approvals.filter(a => a.snapshot_hash === 'v2') : [], error: null }).then(ok)
      return q
    },
  },
}))

import { founderWordingApproved } from './founder-approval'

beforeEach(() => { approvals = []; delete process.env.FOUNDER_WORDING_GATE })

describe('4c — has the founder approved the current version?', () => {
  it('no approval, or only an older version → no', async () => {
    expect(await founderWordingApproved('p1')).toBe(false)
    approvals = [{ snapshot_hash: 'v1' }]
    expect(await founderWordingApproved('p1')).toBe(false)
  })
  it('the current version approved → yes; gate switched off → yes', async () => {
    approvals = [{ snapshot_hash: 'v2' }]
    expect(await founderWordingApproved('p1')).toBe(true)
    approvals = []; process.env.FOUNDER_WORDING_GATE = 'off'
    expect(await founderWordingApproved('p1')).toBe(true)
  })
})

describe('4c — Milla withholds and the server re-decides', () => {
  const ROUTE = readFileSync(join(__dirname, '../routes/my-programme.ts'), 'utf8')
  const UI = readFileSync(join(__dirname, '../../../portal/src/components/milla/ProgrammeApproval.tsx'), 'utf8')
  it('the emails are withheld and the button stays off until he approves', () => {
    expect(ROUTE).toContain('messages: founderApproved ? frozen.messages : []')
    expect(ROUTE).toContain('canApprove: founderApproved &&')
  })
  it('a client approve press before his approval is refused on the server', () => {
    const at = ROUTE.indexOf("myProgrammeRouter.post('/approve'")
    const route = ROUTE.slice(at, at + 4000)
    expect(route.indexOf("error: 'awaiting_founder'")).toBeGreaterThan(-1)
    expect(route.indexOf("error: 'awaiting_founder'")).toBeLessThan(route.indexOf('approveProgrammeAsCustomer('))
  })
  // ⛓️ 3 Oct (review S8): was 'Our team is checking your emails before you see them.' — now R189 ⑧'s
  // ruled words, which are also true on a live programme with a new version.
  it('the client is told plainly what is happening, in R189 ⑧\'s words', () => {
    expect(UI).toContain('Your emails are with our team for a final check, usually within 1 working day.')
  })
})

// ⚑ 3 Oct (review S8 · RUNTIME: the real Approval screen showed the client nothing at all) — the
// panel was mounted only when `canApprove`, which is false until the founder approves.
describe('4a·2 — the client waiting on the founder SEES the notice', () => {
  const PAGE = readFileSync(join(__dirname, '../../../portal/src/app/(milla)/milla/programme/page.tsx'), 'utf8')
  it('the approval panel opens while the founder is checking, at the approval stage', () => {
    // ⛓️ 3 Oct (#2544 · 4b): one condition with the live re-approval now; the approval-stage half reads:
    expect(PAGE).toContain(": review.canApprove || (review.awaiting_founder === true && review.programme.status === 'READY_FOR_APPROVAL')")
  })
  it('the demo keeps its emails and its Approve button', () => {
    expect(readFileSync(join(__dirname, 'founder-approval.ts'), 'utf8')).toContain('if (clientId && await isDemoProgrammeClient(clientId)) return true')
  })
})
