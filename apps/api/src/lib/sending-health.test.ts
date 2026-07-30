import { describe, it, expect } from 'vitest'
import {
  isSendingExpected, windowSeverity, tallyClassifications,
  measured, NOT_MEASURED, FAILED_NOT_MEASURED, BOUNCE_REASONS, OPT_OUT_REASONS,
  type WindowCounts,
} from './sending-health'

// #576/#553 — THE ONE GLANCE, AND THE ONE THING IT REFUSES TO GUESS.
//
// Client Zero sends through OUR engine (#577 amended 30 Jul), so a break is ours to see. The
// founder's condition was *"we need a way to monitor the break"* — and the failure mode this
// file guards against is the panel that looks calm while the send path is dead.
//
// Two rules, both learned the hard way elsewhere in this repo:
//   ① ZERO IS NOT ALWAYS CALM. Zero sent on a day nothing was due is correct. Zero sent while
//      sending is on and enrollments are due is what a broken cron looks like from outside —
//      and rendering both in the same grey is the #565 defect wearing a different hat.
//   ② A NUMBER WE NEVER MEASURED IS NOT ZERO. Failed sends leave no row (the write path
//      DELETES it on failure), so "failed: 0" would be a claim about something never counted.

const win = (over: Partial<WindowCounts> = {}): WindowCounts => ({
  sent: measured(100),
  failed: NOT_MEASURED(FAILED_NOT_MEASURED),
  bounced: measured(0),
  optOuts: measured(0),
  replies: measured(0),
  repliesByClass: {},
  ...over,
})

describe('zero sent is only calm when nothing was due', () => {
  it('AMBER when sending is expected and nothing sent', () => {
    // The assertion the panel exists for. A dead send cron produces exactly this.
    const v = windowSeverity(win({ sent: measured(0) }), true)
    expect(v.level).toBe('amber')
    expect(v.message).toContain('sending is expected')
    expect(v.message).toContain('send cron')
  })

  it('OK when nothing sent and nothing was due', () => {
    const v = windowSeverity(win({ sent: measured(0) }), false)
    expect(v.level).toBe('ok')
    expect(v.message).toContain('nothing was due')
  })

  it('the two cases do NOT read the same — that is the whole point', () => {
    const quiet = windowSeverity(win({ sent: measured(0) }), false)
    const broken = windowSeverity(win({ sent: measured(0) }), true)
    expect(quiet.level).not.toBe(broken.level)
    expect(quiet.message).not.toBe(broken.message)
  })
})

describe('sending is expected only when all three conditions hold', () => {
  const base = { autoOutreachEnabled: true, activeCampaigns: 1, enrollmentsDue: 5 }

  it('expected when the switch is on, a campaign is active and steps are due', () => {
    const r = isSendingExpected(base)
    expect(r.expected).toBe(true)
    expect(r.why).toContain('1 active campaign')
  })

  it('NOT expected with the kill-switch off, and says so', () => {
    // Today's real state. Without this the panel would show amber every day until launch and
    // train the founder to ignore it — the same alert-fatigue argument as #491's throttle.
    const r = isSendingExpected({ ...base, autoOutreachEnabled: false })
    expect(r.expected).toBe(false)
    expect(r.why).toContain('AUTO_OUTREACH_ENABLED is off')
  })

  it('NOT expected with no active campaign', () => {
    const r = isSendingExpected({ ...base, activeCampaigns: 0 })
    expect(r.expected).toBe(false)
    expect(r.why).toContain('No active campaign')
  })

  it('NOT expected when nothing is due — the sequences are just waiting', () => {
    const r = isSendingExpected({ ...base, enrollmentsDue: 0 })
    expect(r.expected).toBe(false)
    expect(r.why).toContain('No enrollments are due')
  })

  it('every answer carries a REASON, never a bare boolean', () => {
    // "Not expected" with no reason sends the operator hunting. Each branch names its cause.
    for (const o of [{}, { autoOutreachEnabled: false }, { activeCampaigns: 0 }, { enrollmentsDue: 0 }]) {
      expect(isSendingExpected({ ...base, ...o }).why.length).toBeGreaterThan(20)
    }
  })
})

describe('bounces are judged as a RATE, because the count alone lies', () => {
  it('RED above 5% — the mailbox reputation is burning', () => {
    const v = windowSeverity(win({ sent: measured(100), bounced: measured(6) }), true)
    expect(v.level).toBe('red')
    expect(v.message).toContain('6%')
    expect(v.message).toContain('pause')
  })

  it('AMBER between 2% and 5%', () => {
    const v = windowSeverity(win({ sent: measured(100), bounced: measured(3) }), true)
    expect(v.level).toBe('amber')
  })

  it('OK below 2%', () => {
    expect(windowSeverity(win({ sent: measured(1000), bounced: measured(5) }), true).level).toBe('ok')
  })

  it('5 bounces reads RED on 20 sends and OK on 2,000 — same count, opposite meaning', () => {
    // Judging the raw count would either cry wolf at scale or stay silent while a small
    // mailbox dies. This is the assertion that pins the choice.
    expect(windowSeverity(win({ sent: measured(20), bounced: measured(5) }), true).level).toBe('red')
    expect(windowSeverity(win({ sent: measured(2000), bounced: measured(5) }), true).level).toBe('ok')
  })
})

describe('a number nobody measured is never reported as zero', () => {
  it('failed sends are NOT-MEASURED, with the reason', () => {
    const w = win()
    expect(w.failed.measured).toBe(false)
    expect(w.failed.measured === false && w.failed.why).toContain('deleted on failure')
  })

  it('the reason names what would fix it, so the gap is closeable', () => {
    expect(FAILED_NOT_MEASURED).toContain('status column')
    expect(FAILED_NOT_MEASURED).toContain('send_failures')
  })

  it('an unmeasured SENT count makes the whole window unmeasured, not ok', () => {
    // Severity derives from sends. If that is unknown, every judgement below it is too —
    // returning 'ok' here would be a green light nobody earned.
    const v = windowSeverity(win({ sent: NOT_MEASURED('the count query failed') }), true)
    expect(v.level).toBe('unmeasured')
    expect(v.message).toContain('count query failed')
  })
})

describe('reply classifications are counted as the classifier labelled them', () => {
  it('tallies by label', () => {
    expect(tallyClassifications([
      { classification: 'hot' }, { classification: 'hot' }, { classification: 'cold' },
    ])).toEqual({ hot: 2, cold: 1 })
  })

  it('a null or blank classification becomes "unclassified" rather than vanishing', () => {
    // Older rows predate the classifier. Dropping them would quietly understate replies —
    // and the reply count is the number that says whether the outreach is working at all.
    expect(tallyClassifications([{ classification: null }, { classification: '  ' }]))
      .toEqual({ unclassified: 2 })
  })

  it('an empty list is an empty tally, not an error', () => {
    expect(tallyClassifications([])).toEqual({})
  })
})

describe('the blocklist reason strings match what the webhook actually writes', () => {
  it('bounces and complaints are the two bounce reasons', () => {
    // routes/figsy.ts upserts reason: isComplaint ? 'spam_complaint' : 'hard_bounce'. If those
    // strings ever change, this panel silently reports zero bounces — so they are pinned here
    // rather than trusted.
    expect([...BOUNCE_REASONS]).toEqual(['hard_bounce', 'spam_complaint'])
  })

  it('list_unsubscribe is the opt-out reason', () => {
    expect([...OPT_OUT_REASONS]).toEqual(['list_unsubscribe'])
  })
})
