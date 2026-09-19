// ══════════════════════════════════════════════════════════════════════════════════════════
// J20-C1 · A SELECTOR READ THAT FAILED HALTS THE RUN, AND NO CAP EVER WIDENS (LR 21)
//
// REQ: *"Read failure halts the run; caps never widen."*
// RED: *"Selector read fails and the run proceeds / caps widen."*
//
// ── TWO OF THE FOUR READS DID SOMETHING WORSE THAN CARRY ON ─────────────────────────────
//
// `runSendDue` discarded the error on four reads. Two of them were the ones that compute a
// CEILING, and a discarded error there does not merely lose information — it opens the gate:
//
//   ① `const { count: sentToday } = …` → `sentToday ?? 0`. A failed count told the run that
//      NOTHING had been sent today, so the global budget re-opened to the full daily limit on
//      top of everything that had already gone out. A database hiccup was a licence to send
//      the day's allowance twice.
//   ② the per-campaign tally → an empty `Map`, which means every campaign has sent nothing
//      today, so a campaign sitting at its own daily cap was offered its whole allowance again.
//
// The other two fail closed by accident of shape — no rows, no sends — but report a healthy
// run: an unreadable campaign list came back as `no_active_campaigns`, which is a TRUE
// statement about a quiet account, and is how an operator watches a cron say "nothing to do"
// for a week while a client's outreach is stopped.
//
// ⚠️ A HALT IS A DISTINCT OUTCOME AND A PERSISTED ONE. The result carries `halted` with the
// reason, and `sendFounderAlert` writes the `operator_tasks` row that Vida Needs-you reads —
// because a return value the caller discards is the same silence in a different shape.
// ══════════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from 'vitest'

const state = {
  /** Which read should fail, and with what. */
  fail: null as null | 'count' | 'campaigns' | 'tallies' | 'due',
  alerts: [] as { kind: string; subject: string; lines: string[] }[],
  mailerCalls: 0,
}

vi.mock('@kind/db', () => ({
  db: {
    rpc: async () => ({ data: null, error: null }),
    from: (table: string) => {
      const q: Record<string, unknown> = {
        select(_cols?: unknown, opts?: { head?: boolean; count?: string }) {
          ;(q as { _head?: boolean })._head = opts?.head === true
          return q
        },
        eq() { return q }, in() { return q }, is() { return q }, not() { return q },
        gte() { return q }, lte() { return q }, order() { return q }, limit() { return q },
        insert() { return q }, update() { return q },
        async maybeSingle() { return { data: null, error: null } },
        async single() { return { data: null, error: null } },
        then(r: (v: unknown) => unknown) {
          const head = (q as { _head?: boolean })._head === true
          // ① the day's total — a HEAD count on figsy_sent_emails
          if (table === 'figsy_sent_emails' && head) {
            return r(state.fail === 'count'
              ? { data: null, count: null, error: { message: 'count read failed' } }
              // 199 of 200 already sent today: a correct run has ONE left, and a widened cap
              // is instantly visible as a budget of 200.
              : { data: null, count: 199, error: null })
          }
          // ② the active campaigns
          if (table === 'figsy_campaigns') {
            return r(state.fail === 'campaigns'
              ? { data: null, error: { message: 'campaign read failed' } }
              : { data: [{ id: 'camp-1', client_id: 'c1', settings: { daily_send_limit: 5 } }], error: null })
          }
          // ③ the per-campaign tallies — the same table, NOT a head count
          if (table === 'figsy_sent_emails') {
            return r(state.fail === 'tallies'
              ? { data: null, error: { message: 'tally read failed' } }
              : { data: [{ campaign_id: 'camp-1' }], error: null })
          }
          // ④ the due enrolments
          if (table === 'figsy_enrollments') {
            return r(state.fail === 'due'
              ? { data: null, error: { message: 'due read failed' } }
              : { data: [], error: null })
          }
          return r({ data: [], count: 0, error: null })
        },
      }
      return q
    },
  },
}))

vi.mock('./alerts', () => ({
  sendFounderAlert: async (kind: string, subject: string, lines: string[]) => {
    state.alerts.push({ kind, subject, lines })
    return { delivered: true, emailOk: true, slackOk: false, durableOk: true, taskOk: true }
  },
}))
vi.mock('./mailer', () => ({
  sendAs: async () => { state.mailerCalls++; return { ok: true, id: 'm1', error: null } },
}))
vi.mock('./campaign-settings', () => ({ withinSendWindow: () => true }))
vi.mock('./sending-inbox', () => ({
  resolveSendingInbox: async () => ({ ok: false, reason: 'no_inbox' }),
  refusalLabel: () => 'no mailbox',
  sendablePool: () => ({ ok: true, boxes: [] }),
  nextFromRotation: () => null,
}))

const run = async () => {
  const { runSendDue } = await import('./send-due')
  return runSendDue({ mode: 'automatic' })
}

beforeEach(() => { state.fail = null; state.alerts = []; state.mailerCalls = 0 })

// ═════════════════════════════════════════════════════════════════════════════════════════
// ① THE HEALTHY RUN — or every halt below proves nothing
// ═════════════════════════════════════════════════════════════════════════════════════════
describe('J20-C1 · a healthy run is not a halt', () => {
  it('🛑 THE ANTI-VACUITY CASE — with every read answering, the run completes and counts', async () => {
    const r = await run()
    expect(r.halted, 'a healthy run reports a halt, so the halts below mean nothing').toBeUndefined()
    // 199 of 200 sent today ⟹ exactly one left. This is the number a widened cap breaks.
    expect(r.remaining_today).toBe(1)
    expect(state.alerts).toEqual([])
  })
})

// ═════════════════════════════════════════════════════════════════════════════════════════
// ② EVERY READ FAILURE HALTS — AND NO CAP IS ASSUMED
// ═════════════════════════════════════════════════════════════════════════════════════════
describe('J20-C1 · a read we could not complete stops the run', () => {
  const CASES: [NonNullable<typeof state.fail>, string][] = [
    ['count', 'daily_total_unreadable'],
    ['campaigns', 'active_campaigns_unreadable'],
    ['tallies', 'campaign_tallies_unreadable'],
    ['due', 'due_enrolments_unreadable'],
  ]

  for (const [which, reason] of CASES) {
    it(`🛑 ${which}: the run HALTS with \`${reason}\` and sends nothing`, async () => {
      state.fail = which
      const r = await run()
      expect(r.halted?.reason, 'the run carried on past a read it could not complete').toBe(reason)
      expect(r.sent).toBe(0)
      expect(r.attempted).toBe(0)
      expect(state.mailerCalls, 'an email left on a run that could not read its own caps').toBe(0)
    })

    it(`${which}: and it is REPORTED, so the halt is a record rather than a log line`, async () => {
      state.fail = which
      await run()
      expect(state.alerts.length, 'the run stopped and nobody was told').toBe(1)
      expect(state.alerts[0].kind).toBe('sends_stalled')
      expect(state.alerts[0].lines.join(' ')).toContain('no cap was assumed')
    })
  }

  it('🛑 THE GLOBAL CAP NEVER WIDENS — a failed count is not "nothing sent today"', async () => {
    // THE DEFECT, EXACTLY. 199 of 200 have gone out. Reading the count as 0 would report 200
    // remaining and offer the day's whole allowance a second time.
    state.fail = 'count'
    const r = await run()
    expect(r.remaining_today, 'the daily budget re-opened on a failed read').toBe(0)
    expect(r.remaining_today).not.toBe(200)
  })

  it('🛑 AND A HALT IS NEVER DRESSED AS A HEALTHY EMPTY RUN', async () => {
    // `no_active_campaigns` and `capped` are TRUE statements about a healthy account. A failed
    // read reported as either of them is the silence this item removes.
    state.fail = 'campaigns'
    const r = await run()
    expect(r.no_active_campaigns, 'an unreadable campaign list reported as "no campaigns"').toBeUndefined()
    expect(r.capped).toBeUndefined()
    expect(r.halted?.detail).toContain('could not be listed')
  })
})

// ═════════════════════════════════════════════════════════════════════════════════════════
// ③ THE SOURCE PROPERTY — no discarded errors left in the selector
// ═════════════════════════════════════════════════════════════════════════════════════════
describe('J20-C1 · the selector keeps no silent read', () => {
  it('🛑 EVERY ONE OF THE FOUR READS BINDS ITS ERROR', async () => {
    const { readFileSync } = await import('node:fs')
    const { join } = await import('node:path')
    const src = readFileSync(join(__dirname, 'send-due.ts'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .split('\n')
      .map(l => { const i = l.search(/(?<!:)\/\//); return i === -1 ? l : l.slice(0, i) })
      .join('\n')
    for (const bind of [
      'const { count: sentToday, error: sentTodayErr }',
      'const { data: activeCamps, error: campErr }',
      'const { data: sentRows, error: sentRowsErr }',
      'const { data: due, error: dueErr }',
    ]) {
      expect(src, `a selector read discards its error again: ${bind}`).toContain(bind)
    }
    // And the widening fallback is gone for good.
    expect(src, 'the failed count can read as zero again').not.toContain('(sentToday ?? 0)')
  })
})
