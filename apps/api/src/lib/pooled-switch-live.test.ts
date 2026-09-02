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
// ⚠️ THIS IS AN ELIGIBILITY CORRECTION, NOT A READINESS SYSTEM. The other two conditions stay:
// `status === 'warming'` (so this is a promotion, not a general status editor) and
// `warmup_ready` (so the row's own dates decide when it is offered). Pressing it is still an
// explicit human act, and nothing promotes a mailbox automatically.
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
describe('the Switch live control is offered by STATUS, not by kind', () => {
  it('🛑 the branded-only restriction is gone', () => {
    // The exact obsolete clause, named so a future re-introduction fails loudly rather than
    // quietly hiding the control from House's second sender again.
    expect(switchLiveGate()).not.toMatch(/kind\s*===\s*'branded'/)
  })

  it('a POOLED warming mailbox now qualifies — this is the House defect', () => {
    const gate = switchLiveGate()
    expect(gate).toContain("i.status === 'warming'")
    expect(gate).toContain('i.warmup_ready')
    // Nothing in the gate may consult kind at all, in either direction.
    expect(gate).not.toMatch(/kind/)
  })

  it('a BRANDED warming mailbox still qualifies exactly as before — nothing was traded away', () => {
    // Both conditions a branded box satisfied are still the only two conditions, so a branded
    // box's behaviour is unchanged by construction.
    const gate = switchLiveGate()
    expect(gate.match(/i\.\w+/g)).toEqual(['i.status', 'i.warmup_ready'])
  })

  it('the two legitimate conditions were PRESERVED, not removed alongside the third', () => {
    // The failure mode this catches: "make it work for hello@" by deleting the whole guard,
    // which would offer promotion on active, released and retired rows too.
    const gate = switchLiveGate()
    expect(gate, 'status must still gate it').toMatch(/status\s*===\s*'warming'/)
    expect(gate, "the row's own warm-up dates must still gate it").toMatch(/warmup_ready/)
  })

  it('released and retired rows gain nothing — they are not `warming`', () => {
    // The guard is positive on 'warming', so every other status is excluded by construction
    // rather than by a list somebody must remember to extend.
    for (const status of ['released', 'retired', 'active', 'assigned']) {
      expect(status).not.toBe('warming')
    }
    expect(switchLiveGate()).toMatch(/status\s*===\s*'warming'/)
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
