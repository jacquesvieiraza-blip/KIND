// #611 Phase B — THE THREE PANEL FIXES, AND WHY EACH ONE NEEDED A TEST RATHER THAN A LOOK.
//
// All three were display bugs on the Engine board. None of them broke a build, none of them
// failed a gate, and two of them would have shown a REASSURING falsehood on the single screen
// the founder checks before send-day. That is the failure shape this repo keeps meeting: a
// green tick over something nobody probed.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { boxSendVerdict, pickSendingInbox, type InboxRow } from './sending-inbox'
import { warmupProgress, DEFAULT_WARMUP_DAYS } from './house-client'
import { stripCommentsForEnvScan } from './env-inventory'

const ENGINE = join(__dirname, '../../../../apps/admin/src/app/vida/engine/page.tsx')
const HOUSE_AUDIT = join(__dirname, '../../../../apps/admin/src/components/HouseAudit.tsx')

const box = (over: Partial<InboxRow> & { id: string }): InboxRow => ({
  email: `${over.id}@kindoutreach.com`,
  kind: 'branded',
  status: 'active',
  provider: 'google-smtp',
  daily_cap: 30,
  smtp_host: 'smtp.gmail.com',
  smtp_port: 587,
  smtp_secure: false,
  smtp_user: `${over.id}@kindoutreach.com`,
  smtp_pass_enc: 'cipher',
  from_name: 'Jacques',
  ...over,
} as InboxRow)

// ── FIX ②: THE CHIP ───────────────────────────────────────────────────────────────────────
describe('boxSendVerdict — the chip tells the truth about ONE mailbox', () => {
  it('an active branded box with credentials can send', () => {
    expect(boxSendVerdict(box({ id: 'a' }), true)).toEqual({ canSend: true })
  })

  // ── RED PROOF ③ — THE CHIP ──────────────────────────────────────────────────────────────
  //
  // This is the exact state of the founder's four boxes RIGHT NOW: warming, credentials saved,
  // clock running to ~25 Aug. The old chip was `has_smtp ? 'can send' : 'no SMTP details'` —
  // status-blind — so it rendered a GREEN "can send" on every one of them, while the send path
  // refuses all four. The board and the sender said opposite things and nothing was red.
  it('a WARMING box with full credentials CANNOT send — and the old chip said it could', () => {
    const warming = box({ id: 'w', status: 'warming' })

    // What the old chip computed, verbatim: host && user && password.
    const oldChipSaidCanSend = Boolean(warming.smtp_host && warming.smtp_user && warming.smtp_pass_enc)
    expect(oldChipSaidCanSend).toBe(true)          // ← the green tick that was wrong

    const v = boxSendVerdict(warming, true)
    expect(v.canSend).toBe(false)                   // ← what the send path actually does
    if (!v.canSend) {
      expect(v.reason).toBe('warming_only')
      expect(v.label).toContain('warming')
    }
  })

  it('a box with no credentials still reads as a credentials problem, not a warming one', () => {
    const v = boxSendVerdict(box({ id: 'x', smtp_pass_enc: null }), true)
    expect(v.canSend).toBe(false)
    if (!v.canSend) expect(v.reason).toBe('no_credentials')
  })

  it('no secret key is the whole API being down, not this mailbox', () => {
    const v = boxSendVerdict(box({ id: 'a' }), false)
    expect(v.canSend).toBe(false)
    if (!v.canSend) expect(v.reason).toBe('no_secret_key')
  })

  it('agrees with pickSendingInbox on every row — one rulebook, never two', () => {
    for (const row of [
      box({ id: 'a' }),
      box({ id: 'w', status: 'warming' }),
      box({ id: 'x', smtp_pass_enc: null }),
      box({ id: 'p', kind: 'pooled', status: 'assigned' }),
    ]) {
      expect(boxSendVerdict(row, true).canSend).toBe(pickSendingInbox([row], true).ok)
    }
  })

  it('the board renders the verdict, not has_smtp', () => {
    const src = stripCommentsForEnvScan(readFileSync(ENGINE, 'utf8'))
    expect(src).toContain('i.can_send')
    // The old expression must be gone from the CHIP. `has_smtp` legitimately survives on the
    // "Add mailbox details" button — that button really is asking about credentials.
    expect(src).not.toContain("i.has_smtp ? 'can send'")
  })
})

// ── FIX ③: THE DENOMINATOR ────────────────────────────────────────────────────────────────
describe('warmupProgress — the fraction counts to the row\'s OWN ready date', () => {
  const start = '2026-08-04T00:00:00.000Z'
  const plus = (d: number) => new Date(Date.parse(start) + d * 864e5)

  it('a 21-day box on day 7 reads 7/21', () => {
    const ready = new Date(Date.parse(start) + 21 * 864e5).toISOString()
    expect(warmupProgress(start, ready, plus(7))).toEqual({ day: 7, days: 21, ready: false })
  })

  // ── RED PROOF ④ — THE DENOMINATOR ───────────────────────────────────────────────────────
  //
  // The founder's boxes started 4 Aug on DEFAULT_WARMUP_DAYS = 21. The board hardcoded `/14`
  // and the route clamped the day to `Math.min(14, …)`. On 18 Aug — day 14 of 21 — that pair
  // rendered **"warm-up 14/14 · ready"**: a finished warm-up, a full week early, on the screen
  // used to decide when sending starts. The row's own ready date said 25 Aug the whole time.
  it('on day 14 of a 21-day warm-up it reads 14/21 and NOT ready — the old code said 14/14', () => {
    const ready = new Date(Date.parse(start) + DEFAULT_WARMUP_DAYS * 864e5).toISOString()
    const p = warmupProgress(start, ready, plus(14))

    // What the old route computed, verbatim.
    const oldDay = Math.max(0, Math.min(14, Math.round((plus(14).getTime() - Date.parse(start)) / 864e5)))
    expect(oldDay).toBe(14)                          // and the board wrote "/14" after it → "14/14"

    expect(p).toEqual({ day: 14, days: 21, ready: false })
    expect(`${p.day}/${p.days}`).toBe('14/21')
  })

  it('the day is clamped to the row\'s own length, so it never reads "day 37 of 21"', () => {
    const ready = new Date(Date.parse(start) + 21 * 864e5).toISOString()
    expect(warmupProgress(start, ready, plus(37))).toEqual({ day: 21, days: 21, ready: true })
  })

  it('a 14-day vendor-warmed box still reads /14 — the fix is derivation, not a new constant', () => {
    const ready = new Date(Date.parse(start) + 14 * 864e5).toISOString()
    expect(warmupProgress(start, ready, plus(9))).toEqual({ day: 9, days: 14, ready: false })
  })

  it('no ready date means NO fraction — never a guessed denominator', () => {
    expect(warmupProgress(start, null, plus(5))).toEqual({ day: 5, days: null, ready: null })
  })

  it('no start date means nothing to show at all', () => {
    expect(warmupProgress(null, null, plus(5))).toEqual({ day: null, days: null, ready: null })
  })

  it('a garbage date is treated as absent, not as 1970', () => {
    expect(warmupProgress('not-a-date', 'nor-this', plus(5))).toEqual({ day: null, days: null, ready: null })
  })

  it('the board renders the derived length, and the hardcoded /14 is gone', () => {
    const src = stripCommentsForEnvScan(readFileSync(ENGINE, 'utf8'))
    expect(src).toContain('i.warmup_days')
    expect(src).not.toContain('/14{')
  })
})

// ── FIX ①: THE AUTO-RUN ───────────────────────────────────────────────────────────────────
describe('the house audit runs when the founder presses the button, and not before', () => {
  const src = stripCommentsForEnvScan(readFileSync(HOUSE_AUDIT, 'utf8'))

  // The founder's words, 4 Aug: *"i didnt run anything"* — he opened Engine and four screens
  // of audit findings were already on it. The panel called `run()` from a `useEffect`, so
  // "what does the audit say" and "the audit has been run" became the same event, and a page
  // load looked like a deliberate act in the operator log's neighbourhood.
  it('has no useEffect at all — the button is the only trigger', () => {
    expect(src).not.toContain('useEffect')
  })

  it('still has the button wired to run', () => {
    expect(src).toContain('onClick={run}')
  })
})
