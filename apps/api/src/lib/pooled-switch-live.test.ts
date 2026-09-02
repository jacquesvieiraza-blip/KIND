// ═══════════════════════════════════════════════════════════════════════════════════════
// #610 FOLLOW-ON — THE PROMOTION CONTROL WAS HIDDEN FROM THE ONE MAILBOX THAT NEEDED IT.
//
// ⚑ 2 Sep. `hello@kindoutreach.com` is a House launch sender: bought by us, warmed a month in
// Instantly, App Password reinstalled, SMTP auth passing, controlled delivery test passing.
// It is `kind = 'pooled'` — and Vida's "Switch live" button was gated on `kind === 'branded'`,
// so the product offered no way to promote it.
//
// 🛑 WHY THE GATE EXISTED, AND WHY IT WAS OBSOLETE RATHER THAN PROTECTIVE. It was written when
// `pooled` could only mean a RENTED VENDOR box, released back to a pool around day 29 as the
// client moved onto their own branded domain. You would never promote one of those. Then
// **#610 redefined `pooled` on 4 Aug** — founder-ruled *"inbox x 2 yes for now but volume is
// key"* — so `pooled` now ALSO means the client's SECOND slot, even when it is our own Google
// box on our own domain. The gate was never revisited. The API accepted the transition all
// along; only the UI refused to show it, which left a hand-rolled API call as the only route.
//
// 🛑 AND THE SECOND HALF OF THE GATE WAS STALE TOO. `warmup_ready` is advisory, and the repo
// says so in its own words — `client-flow-sop.md`: *"THE WARM-UP CLOCK IS A REMINDER, NOT A
// GATE… every reader displays it."* `house-client.ts`: *"It is still only a REMINDER. #553's
// ladder decides when a mailbox sends — not a date arithmetic produced."* Nothing in the send
// path reads it and `POST /inboxes/:id/status` never consults a date, so enforcing it in this
// one JSX line made the product's ONLY date-based gate the thing standing between an operator
// and a mailbox. It also measures the wrong thing: the clock starts when the row is typed into
// Vida, not when the mailbox began warming, and its two writers disagree (14 days vs 21).
//
// ⚠️ THIS IS AN ELIGIBILITY CORRECTION, NOT A READINESS SYSTEM. One condition remains —
// `status === 'warming'` — so this is a promotion rather than a general status editor.
// Pressing it is an explicit human act, and nothing promotes a mailbox automatically. The
// readiness EVIDENCE is #553's ladder, deliberately NOT encoded here: it is an operator
// judgement, and turning it into a checkbox is the readiness framework this must not become.
//
// ⚠️ AND THE LINE THAT MUST NOT MOVE: production sending still refuses `warming`. A test that
// only proved "pooled can be promoted" would pass just as happily if someone had reached that
// outcome by widening `SENDABLE_STATUSES` — which would let every warming box send and un-warm
// itself. So the send rule is asserted here too, from the same file.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { pickSendingInbox, sendablePool, nextFromRotation, type InboxRow } from './sending-inbox'

const PORTAL_ADMIN = join(__dirname, '../../../admin/src')
const API = join(__dirname, '..')
const raw = (p: string) => readFileSync(p, 'utf8')
/** Comments first as blocks, then as lines — a commented-out gate is not a gate. */
const strip = (s: string) => s
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n').filter(l => !l.trim().startsWith('//')).join('\n')

const engine = strip(raw(join(PORTAL_ADMIN, 'app/vida/engine/page.tsx')))

/**
 * The JSX guard immediately preceding the "Switch live" button.
 *
 * ⚠️ ANCHORED TO THE BUTTON ELEMENT, NOT TO THE NEAREST `{i.`. The obvious version walks back
 * from the label to the last `{i.` and lands inside the onClick's own
 * `` `inboxes/${i.id}/status` `` — so it returns a slice of the handler and every assertion
 * about the guard silently tests the wrong string.
 */
function switchLiveGate(): string {
  const label = engine.indexOf('Switch live')
  expect(label, 'the Switch live control must still exist').toBeGreaterThan(-1)
  const btn = engine.lastIndexOf('<button', label)
  const guardEnd = engine.lastIndexOf('(', btn)
  const guardStart = engine.lastIndexOf('{', guardEnd)
  const gate = engine.slice(guardStart, guardEnd)
  expect(gate, 'the guard must be a JSX conditional, not a fragment of the handler').toMatch(/&&\s*$/)
  return gate
}

const box = (over: Partial<InboxRow> & { id: string }): InboxRow => ({
  email: `${over.id}@kindoutreach.com`,
  kind: 'branded', status: 'active', provider: 'google-smtp', daily_cap: 30,
  smtp_host: 'smtp.gmail.com', smtp_port: 587, smtp_secure: false,
  smtp_user: `${over.id}@kindoutreach.com`, smtp_pass_enc: 'v1:cipher', from_name: 'Jacques',
  ...over,
} as InboxRow)

// ── THE CONTROL'S ELIGIBILITY ────────────────────────────────────────────────────────────
//
// The gate is ONE positive condition on `status`, so the whole eligibility table can be
// derived from it rather than asserted case by case against a hand-written list. That matters:
// a list somebody must remember to extend is how `released` quietly became eligible the day a
// sixth status is added.
describe('the Switch live control is offered by STATUS, and by nothing else', () => {
  /** Evaluate the real gate against a row's status — the guard, applied. */
  const offered = (status: string) => new Function('i', `return !!(${switchLiveGate().slice(1)}true)`)({ status })

  it('🛑 the branded-only restriction is gone', () => {
    // Named exactly, so a future re-introduction fails loudly rather than quietly hiding the
    // control from House's second sender again.
    expect(switchLiveGate()).not.toMatch(/kind\s*===\s*'branded'/)
    expect(switchLiveGate(), 'the gate must not consult kind in either direction').not.toMatch(/kind/)
  })

  it('🛑 `warmup_ready` is gone — the repo documents that clock as a REMINDER, NOT A GATE', () => {
    // `client-flow-sop.md:53` and `house-client.ts:146` both say so, nothing in the send path
    // reads it, and the status route never consults a date. This was the product's only
    // date-based gate and it measured the wrong thing.
    expect(switchLiveGate()).not.toMatch(/warmup_ready/)
  })

  it('the gate is exactly one condition, on status — nothing else grants or removes eligibility', () => {
    expect(switchLiveGate().match(/i\.\w+/g)).toEqual(['i.status'])
    expect(switchLiveGate()).toMatch(/status\s*===\s*'warming'/)
  })

  it('A · BRANDED + warming → the control is available', () => {
    expect(offered('warming')).toBe(true)
  })

  it('B · POOLED + warming → the control is available (the House defect, closed)', () => {
    // The gate no longer reads `kind`, so pooled and branded resolve identically. Asserted as
    // behaviour rather than as an absence, because "kind is not mentioned" and "a pooled box
    // is actually offered the control" are different claims.
    expect(offered('warming')).toBe(true)
  })

  it('C · warming + `warmup_ready` FALSE → the control is STILL available', () => {
    // The whole point of the correction. A row whose Vida clock has not elapsed — because the
    // row was typed in last week while the mailbox warmed in Instantly for a month — must not
    // be blocked by that arithmetic.
    const gate = switchLiveGate()
    expect(gate).not.toMatch(/warmup_ready/)
    expect(new Function('i', `return !!(${gate.slice(1)}true)`)({ status: 'warming', warmup_ready: false })).toBe(true)
  })

  it('D · active → no control (it is already live; this is a promotion, not a status editor)', () => {
    expect(offered('active')).toBe(false)
  })

  it('E · released → no control', () => {
    expect(offered('released')).toBe(false)
  })

  it('F · retired → no control', () => {
    expect(offered('retired')).toBe(false)
  })

  it('and `assigned` is not offered either — every non-warming status is excluded by construction', () => {
    expect(offered('assigned')).toBe(false)
  })
})

// ── IT SHOWS A CONTROL; IT DOES NOT PRESS IT ─────────────────────────────────────────────
describe('displaying the control changes nothing by itself', () => {
  it('promotion happens only inside the button\'s own onClick', () => {
    // A `post(... status: 'active' ...)` reachable from an effect, a poll or a render would be
    // automatic promotion wearing a button's clothes.
    const activeCalls = engine.match(/status:\s*'active'/g) ?? []
    expect(activeCalls).toHaveLength(1)
    const at = engine.indexOf("status: 'active'")
    const context = engine.slice(Math.max(0, at - 220), at)
    expect(context, 'the only promotion must sit in an onClick handler').toContain('onClick')
  })

  it('nothing promotes on verify, on the diagnostic send, on warm-up date or on Instantly health', () => {
    // Each of these is an event that could plausibly be wired to "and now make it live".
    for (const fn of ['async function verify', 'async function testSend']) {
      const at = engine.indexOf(fn)
      expect(at, `${fn} must still exist`).toBeGreaterThan(-1)
      const body = engine.slice(at, at + 1400)
      expect(body, `${fn} must not change status`).not.toMatch(/status:\s*'active'/)
    }
    expect(engine).not.toMatch(/useEffect[\s\S]{0,400}status:\s*'active'/)
  })

  it('the existing status API is reused — no second activation route was created', () => {
    // One route, one rulebook. A second promotion path is how two screens start disagreeing
    // about what "live" means.
    expect(engine).toContain("inboxes/${i.id}/status")
    const operator = strip(raw(join(API, 'routes/operator.ts')))
    const statusRoutes = operator.match(/operatorRouter\.post\('\/inboxes\/:id\/status'/g) ?? []
    expect(statusRoutes).toHaveLength(1)
    expect(operator).not.toMatch(/inboxes\/:id\/(activate|promote|go-live)/)
  })
})

// ── THE SEND RULE THAT MUST NOT MOVE ─────────────────────────────────────────────────────
describe('production sending still refuses a warming mailbox', () => {
  it('SENDABLE_STATUSES is unchanged — assigned and active, never warming', () => {
    const src = raw(join(API, 'lib/sending-inbox.ts'))
    expect(src).toContain("const SENDABLE_STATUSES = new Set(['assigned', 'active'])")
    expect(src).not.toMatch(/SENDABLE_STATUSES\s*=\s*new Set\(\[[^\]]*'warming'/)
  })

  it('a pooled warming box is refused by the real picker, offered control or not', () => {
    const warming = [box({ id: 'hello', kind: 'pooled', status: 'warming' })]
    const picked = pickSendingInbox(warming, true)
    expect(picked.ok).toBe(false)
    expect((picked as { reason: string }).reason).toBe('warming_only')
    expect(sendablePool(warming, true).ok).toBe(false)
  })

  it('and once an operator DOES promote it, the same picker accepts it — the transition is real', () => {
    // The other half of the proof: the refusal above is about status, not about `pooled`.
    const active = [box({ id: 'hello', kind: 'pooled', status: 'active' })]
    const picked = pickSendingInbox(active, true)
    expect(picked.ok).toBe(true)
    expect((picked as { inbox: InboxRow }).inbox.email).toBe('hello@kindoutreach.com')
  })
})

// ── NOTHING ELSE MOVED ───────────────────────────────────────────────────────────────────
describe('rotation, ranking and every authority gate are untouched', () => {
  it('ranking still prefers active-before-assigned and branded-before-pooled', () => {
    const src = raw(join(API, 'lib/sending-inbox.ts'))
    expect(src).toContain("return (String(r.status) === 'active' ? 0 : 1) * 10 + (String(r.kind) === 'branded' ? 0 : 1)")
  })

  it('two live boxes still both send, least-used first — House\'s launch pair', () => {
    const boxes = [
      box({ id: 'jacques', kind: 'branded', status: 'active' }),
      box({ id: 'hello', kind: 'pooled', status: 'active' }),
    ]
    const pool = sendablePool(boxes, true)
    expect(pool.ok).toBe(true)
    expect((pool as { boxes: InboxRow[] }).boxes.map(b => b.smtp_user))
      .toEqual(['jacques@kindoutreach.com', 'hello@kindoutreach.com'])
    // and the batch alternates rather than draining the ranked-first box
    const tally = [{ id: 'jacques', dailyCap: 30, sentThisBatch: 0 }, { id: 'hello', dailyCap: 30, sentThisBatch: 0 }]
    const order: string[] = []
    for (let i = 0; i < 4; i++) {
      const id = nextFromRotation(tally)!
      order.push(id)
      tally.find(t => t.id === id)!.sentThisBatch += 1
    }
    expect(order).toEqual(['hello', 'jacques', 'hello', 'jacques'])
  })

  it('programme authority, the kill-switch and paid sourcing are not touched by this change', () => {
    expect(raw(join(API, 'lib/programme-authority.ts')))
      .toMatch(/if \(!programme\) return \{ allowed: true, mode: 'legacy', programme: null \}/)
    expect(raw(join(API, 'lib/figsy.ts'))).toMatch(/process\.env\.AUTO_OUTREACH_ENABLED === 'true'/)
    expect(raw(join(API, 'lib/paid-provider-guard.ts'))).toMatch(/PAID_PROVIDERS_ENABLED/)
  })

  it('the mailbox vocabulary is unchanged — no new state was invented', () => {
    const migrations = raw(join(API, 'lib/pending-migrations.ts'))
    expect(migrations).toContain("kind              text NOT NULL CHECK (kind IN ('pooled','branded'))")
    expect(migrations).toContain("CHECK (status IN ('assigned','warming','active','released','retired'))")
  })
})
