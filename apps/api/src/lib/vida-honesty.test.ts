import { describe, it, expect, vi } from 'vitest'

// `operator-audit` imports the Supabase client at module load, which needs env vars this
// suite deliberately does not have. The function under test is pure and touches none of it.
vi.mock('@kind/db', () => ({ db: { from: () => ({ insert: async () => ({ error: null }) }) } }))

import { campaignAuditAction } from './operator-audit'
import { panelView, loadError } from '@kind/shared'

// PROMPT 3 — THE VIDA HONESTY FIXES.
//
// Both defects are the same shape and it is the shape behind most of this week: a screen or a
// log that states something confidently, and is wrong. A blank console and a broken console
// looked identical; pressing Run recorded a pause.

// ── #564 ──────────────────────────────────────────────────────────────────────────────
// The audit log is the only record of who did what to a client's account, and it was writing
// `pause_campaign` for EVERYTHING on the campaign routes. Pressing "Run it" therefore logged
// the OPPOSITE of what happened — worse than no log, because a wrong log stops you looking.
describe('#564 — the audit log records the real action', () => {
  it('pressing RUN records a resume, NOT a pause', () => {
    expect(campaignAuditAction({ isNew: false, nextStatus: 'active' })).toBe('resume_campaign')
  })

  it('pressing PAUSE records a pause', () => {
    expect(campaignAuditAction({ isNew: false, nextStatus: 'paused' })).toBe('pause_campaign')
  })

  it('renaming or re-capping records an EDIT — not a start, not a stop', () => {
    // This was the quieter half: every settings save logged `pause_campaign`, so the log
    // claimed the operator had stopped a campaign they only renamed.
    expect(campaignAuditAction({ isNew: false })).toBe('edit_campaign')
    expect(campaignAuditAction({ isNew: false, nextStatus: null })).toBe('edit_campaign')
  })

  it('creating a campaign still records a start', () => {
    expect(campaignAuditAction({ isNew: true })).toBe('start_campaign')
    expect(campaignAuditAction({ isNew: true, nextStatus: 'active' })).toBe('start_campaign')
  })

  it('run and pause are never the same value — the whole bug in one assertion', () => {
    expect(campaignAuditAction({ isNew: false, nextStatus: 'active' }))
      .not.toBe(campaignAuditAction({ isNew: false, nextStatus: 'paused' }))
  })
})

// ── #565 ──────────────────────────────────────────────────────────────────────────────
// Three `.catch(() => {})` calls meant a failed load left the state empty, and the console
// rendered a calm "nothing to do" over an endpoint that was down — on the one screen whose
// job is telling the operator what to work on next.
describe('#565 — a failed load is never "nothing to do"', () => {
  it('a FAILED load says so, and says the absence proves nothing', () => {
    const v = panelView({ loading: false, error: 'API returned 500', count: 0, label: 'the worklist' })
    expect(v.state).toBe('failed')
    expect(v.message).toContain('Couldn\'t load')
    expect(v.message).toContain('NOT "nothing to do"')
    expect(v.message).toContain('API returned 500')   // the reason, not just a shrug
  })

  it('a failed load is NEVER trustworthy, even though its count is also zero', () => {
    // This is the assertion that matters. Both cases have count 0. Only one of them means
    // there is nothing to do.
    const failed = panelView({ loading: false, error: 'boom', count: 0, label: 'alerts' })
    const empty = panelView({ loading: false, error: null, count: 0, label: 'alerts' })
    expect(failed.trustworthy).toBe(false)
    expect(empty.trustworthy).toBe(true)
    expect(failed.state).not.toBe(empty.state)
  })

  it('a genuinely empty panel says so plainly', () => {
    const v = panelView({ loading: false, error: null, count: 0, label: 'the worklist' })
    expect(v.state).toBe('empty')
    expect(v.message).toContain('Nothing in the worklist')
  })

  it('a loaded panel with rows renders normally and says nothing', () => {
    const v = panelView({ loading: false, error: null, count: 7, label: 'the worklist' })
    expect(v.state).toBe('ready')
    expect(v.message).toBeNull()
    expect(v.trustworthy).toBe(true)
  })

  it('loading is not empty and not failed — it stays untrustworthy until it resolves', () => {
    const v = panelView({ loading: true, error: null, count: 0, label: 'alerts' })
    expect(v.state).toBe('loading')
    expect(v.trustworthy).toBe(false)
  })

  it('an error WINS over a count — a failed load has no count to believe', () => {
    // A partial response could carry rows AND an error. The rows are not evidence.
    const v = panelView({ loading: false, error: 'partial failure', count: 3, label: 'alerts' })
    expect(v.state).toBe('failed')
  })
})

describe('loadError', () => {
  it('uses the real message when there is one', () => {
    expect(loadError(new Error('fetch failed'))).toBe('fetch failed')
  })
  it('never returns an empty string — a blank reason renders as no reason at all', () => {
    expect(loadError(undefined)).toContain('gave no reason')
    expect(loadError('')).toContain('gave no reason')
    expect(loadError({})).toContain('gave no reason')
  })
})
