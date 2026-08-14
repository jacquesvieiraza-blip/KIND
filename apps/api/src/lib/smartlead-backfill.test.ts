// THE UNLOCK-DAY BACKFILL — pins for the gap that would have defeated R25.
//
// The gap, found 13 Aug while building A22: the month-one Smartlead push already exists and is
// wired, but with no API key it refuses `no_api_key` — and that refusal is deliberately NOT
// alerted, because alerting on every approval while the key is unbought trains the founder to
// ignore the alert. Nothing recorded the skip and nothing replayed it, so every lead approved
// BEFORE unlock day would have stayed un-pushed forever: charged, revealed, enrolled, and
// never in the client's campaign. "Day 1 works" would have been true only for leads approved
// after the purchase — which is not what R25 says.
//
// RED PROOF (each fails without the fix):
//   • delete the smartleadConfigured pre-flight  → "halts with ONE reason" fails
//   • delete the kill-switch pre-flight          → "the kill-switch governs the backfill" fails
//   • make backfillSummary return 'ok' at 0/N    → "0 of N never reads as success" fails

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

const leadRows: { id: string; email: string | null }[] = []
vi.mock('@kind/db', () => ({
  db: {
    from: () => {
      const q: Record<string, unknown> = {}
      const chain = new Proxy(q, {
        get: (_t, prop) => {
          if (prop === 'then') return undefined
          if (prop === 'limit') return () => Promise.resolve({ data: leadRows })
          if (prop === 'maybeSingle') return () => Promise.resolve({ data: null })
          return () => chain
        },
      })
      return chain
    },
  },
}))

// The live push — never called for real; the mock IS the only thing this suite ever invokes.
const pushSpy = vi.fn()
vi.mock('./smartlead-send', () => ({ pushApprovedLeadToSmartlead: (...a: unknown[]) => pushSpy(...a) }))
const configuredSpy = vi.fn()
vi.mock('./smartlead', () => ({ smartleadConfigured: () => configuredSpy() }))

import { backfillSmartleadForClient, backfillSummary, BACKFILL_DEFAULT_LIMIT } from './smartlead-backfill'

beforeEach(() => {
  leadRows.length = 0
  pushSpy.mockReset()
  configuredSpy.mockReset().mockReturnValue(true)
  process.env.AUTO_OUTREACH_ENABLED = 'true'
})

describe('the backfill cannot send anything the ordinary path would refuse', () => {
  it('NO KEY: halts with ONE clear reason instead of 200 identical refusals', async () => {
    configuredSpy.mockReturnValue(false)
    leadRows.push({ id: 'l1', email: 'a@b.com' }, { id: 'l2', email: 'c@d.com' })
    const out = await backfillSmartleadForClient('c1')
    expect(out.haltedBefore).toMatch(/SMARTLEAD_API_KEY is not set/)
    expect(out.haltedBefore).toMatch(/R25/)
    expect(pushSpy).not.toHaveBeenCalled()   // nothing attempted
    expect(out.pushed).toBe(0)
  })

  it('THE KILL-SWITCH GOVERNS IT, exactly as it governs every send path', async () => {
    process.env.AUTO_OUTREACH_ENABLED = 'false'
    leadRows.push({ id: 'l1', email: 'a@b.com' })
    const out = await backfillSmartleadForClient('c1')
    expect(out.haltedBefore).toMatch(/AUTO_OUTREACH_ENABLED is off/)
    expect(pushSpy).not.toHaveBeenCalled()
  })

  it('an unset kill-switch is OFF — absence is never permission', async () => {
    delete process.env.AUTO_OUTREACH_ENABLED
    leadRows.push({ id: 'l1', email: 'a@b.com' })
    const out = await backfillSmartleadForClient('c1')
    expect(out.haltedBefore).toMatch(/AUTO_OUTREACH_ENABLED is off/)
    expect(pushSpy).not.toHaveBeenCalled()
  })

  it('leads with no address are dropped before Smartlead sees them', async () => {
    leadRows.push({ id: 'l1', email: 'a@b.com' }, { id: 'l2', email: null }, { id: 'l3', email: '   ' })
    pushSpy.mockResolvedValue({ pushed: true, campaignId: 'camp1' })
    const out = await backfillSmartleadForClient('c1')
    expect(out.found).toBe(1)
    expect(pushSpy).toHaveBeenCalledTimes(1)
  })
})

describe('it re-offers approved leads through the LIVE path, one at a time', () => {
  it('pushes each lead and reports per-lead detail', async () => {
    leadRows.push({ id: 'l1', email: 'a@b.com' }, { id: 'l2', email: 'c@d.com' })
    pushSpy.mockResolvedValue({ pushed: true, campaignId: 'camp1' })
    const out = await backfillSmartleadForClient('c1')
    expect(out.found).toBe(2)
    expect(out.pushed).toBe(2)
    expect(out.results.every(r => r.pushed)).toBe(true)
    // The SAME function the money path calls — so every gate re-runs per lead.
    expect(pushSpy).toHaveBeenCalledWith('l1', 'c1')
  })

  it('a refusal is recorded with its reason, not swallowed', async () => {
    leadRows.push({ id: 'l1', email: 'a@b.com' }, { id: 'l2', email: 'c@d.com' })
    pushSpy
      .mockResolvedValueOnce({ pushed: true, campaignId: 'camp1' })
      .mockResolvedValueOnce({ pushed: false, reason: 'no_smartlead_inbox', detail: 'no mailbox' })
    const out = await backfillSmartleadForClient('c1')
    expect(out.pushed).toBe(1)
    expect(out.refused).toBe(1)
    expect(out.results[1].detail).toBe('no mailbox')
  })

  it('one lead throwing does not abandon the rest — it is run by hand mid-onboarding', async () => {
    leadRows.push({ id: 'l1', email: 'a@b.com' }, { id: 'l2', email: 'c@d.com' })
    pushSpy
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce({ pushed: true, campaignId: 'camp1' })
    const out = await backfillSmartleadForClient('c1')
    expect(out.refused).toBe(1)
    expect(out.pushed).toBe(1)
    expect(out.results[0].detail).toMatch(/Threw: boom/)
  })
})

describe('the summary makes failure loud', () => {
  it('0 of N NEVER reads as success', () => {
    const s = backfillSummary({ clientId: 'c1', found: 40, pushed: 0, refused: 40, results: [] })
    expect(s).toMatch(/⚠️/)
    expect(s).toMatch(/NOT a successful backfill/)
  })

  it('a partial result names the refused ones', () => {
    expect(backfillSummary({ clientId: 'c1', found: 10, pushed: 7, refused: 3, results: [] }))
      .toMatch(/7 of 10 pushed, 3 refused/)
  })

  it('a halt reports the halt, never a count', () => {
    expect(backfillSummary({ clientId: 'c1', found: 0, pushed: 0, refused: 0, results: [], haltedBefore: 'key missing' }))
      .toMatch(/Nothing attempted — key missing/)
  })

  it('nothing to do says so plainly', () => {
    expect(backfillSummary({ clientId: 'c1', found: 0, pushed: 0, refused: 0, results: [] }))
      .toMatch(/nothing to backfill/)
  })
})

describe('the design decisions that keep this safe', () => {
  const src = readFileSync(join(__dirname, 'smartlead-backfill.ts'), 'utf8')

  it('is query-driven, not a second copy of "approved" that can drift', () => {
    expect(src).toContain("not('revealed_at', 'is', null)")
    expect(src).not.toMatch(/create table|pending_push/i)
  })

  it('is bounded — never an unbounded month of leads in one call', () => {
    expect(BACKFILL_DEFAULT_LIMIT).toBeLessThanOrEqual(500)
    expect(src).toMatch(/\.limit\(limit\)/)
  })

  it('calls the live push rather than reimplementing the gates', () => {
    expect(src).toContain("await import('./smartlead-send')")
    expect(src).not.toContain('canPushToSmartlead')   // no second copy of the gate
  })
})
