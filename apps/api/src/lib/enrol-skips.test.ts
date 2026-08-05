// #620 — A REFUSED LEAD MUST NEVER LOOK LIKE SILENCE.
//
// The enrol paths NAME every refusal — `copy_rejected:…` (#612), `pecr_individual_risk:…`
// (#617) — and return them as `skip_reasons`. Nothing rendered them: zero hits across the portal
// and the admin console. So on send-day "every draft was refused" and "nothing happened" are the
// same picture on the board, and the operator goes hunting a bug in the wrong place — on the one
// day that cannot be afforded.
//
// ⚠️ NO MIGRATION: the schema is frozen, so this rides on `operator_audit_log`, which already
// exists and already has a JSON `detail` column. A response-only surface would go blank on
// refresh and would never have existed at all for a cron-triggered enrol.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { enrolSkipSummary } from './enrol-skips'
import { stripCommentsForEnvScan } from './env-inventory'

describe('enrolSkipSummary — words, never a bare count', () => {
  it('names every reason with its count', () => {
    const s = enrolSkipSummary({ 'copy_rejected: booking link in step 1': 2, 'pecr_individual_risk: Sarah Jones Consulting (UK)': 1 })
    expect(s).toContain('copy_rejected')
    expect(s).toContain('pecr_individual_risk')
    expect(s).toContain('× 2')
    expect(s).toContain('× 1')
  })

  it('puts the biggest cause first — that is the one worth acting on', () => {
    const s = enrolSkipSummary({ rare: 1, common: 9 })
    expect(s.indexOf('common')).toBeLessThan(s.indexOf('rare'))
  })

  it('an empty map produces an empty string, not "undefined"', () => {
    expect(enrolSkipSummary({})).toBe('')
    expect(enrolSkipSummary(undefined as never)).toBe('')
  })
})

// ── THE WIRING ────────────────────────────────────────────────────────────────────────────
describe('both enrol routes record what they refused', () => {
  const src = stripCommentsForEnvScan(readFileSync(join(__dirname, '../routes/figsy.ts'), 'utf8'))

  it('BOTH enrol paths call recordEnrolSkips — one path recording is not recording', () => {
    expect(src.split('recordEnrolSkips({').length - 1).toBe(2)
  })

  it('records BEFORE responding, so a client that never reads the body still leaves a trail', () => {
    // Bounded per occurrence rather than a whole-file index compare, which would pass with one
    // correct path and one broken one (the #619 rows.map( lesson).
    let from = 0
    for (let i = 0; i < 2; i++) {
      const recAt = src.indexOf('recordEnrolSkips({', from)
      expect(recAt, `record call ${i + 1} must exist`).toBeGreaterThan(-1)
      const resAt = src.indexOf('skip_reasons: skipReasons', recAt)
      expect(resAt, `record call ${i + 1} must be followed by its response`).toBeGreaterThan(-1)
      expect(recAt).toBeLessThan(resAt)
      from = resAt
    }
  })

  it('the response still carries skip_reasons — this ADDS a trail, it does not replace one', () => {
    expect(src.split('skip_reasons: skipReasons').length - 1).toBe(2)
  })
})

describe('the writer refuses to log a clean run', () => {
  const src = stripCommentsForEnvScan(readFileSync(join(__dirname, 'operator-audit.ts'), 'utf8'))
  const fn = src.slice(src.indexOf('export async function recordEnrolSkips'))
  const body = fn.slice(0, fn.indexOf('\n}\n') + 1)

  it('no-ops when nobody was skipped — a line for every clean run would bury the one that matters', () => {
    expect(body).toContain('if (a.skipped <= 0) return')
  })

  it('writes through the existing helper and the existing table — no migration', () => {
    expect(body).toContain('writeOperatorAudit({')
    expect(body).toContain("action:        'enrol_skips'")
  })

  it('carries the reasons themselves, not just the summary sentence', () => {
    // A summary alone cannot be re-counted or filtered later; the raw map can.
    expect(body).toContain('reasons:  a.reasons')
  })
})

describe('Vida renders the refusal', () => {
  const src = stripCommentsForEnvScan(
    readFileSync(join(__dirname, '../../../admin/src/app/vida/page.tsx'), 'utf8'))

  it('reads the trail for the selected client', () => {
    expect(src).toContain('/api/proxy/operator/enrol-skips?client_id=')
  })

  it('shows the REASONS in words, not just a count', () => {
    // Bounded to the rendering block: asserting `summary` against the whole file would pass on a
    // variable that is fetched and never displayed — which was the entire bug.
    const at = src.indexOf('last enrol:')
    expect(at, 'the enrol line must be rendered').toBeGreaterThan(-1)
    const block = src.slice(at, at + 400)
    expect(block).toContain('detail?.summary')
    expect(block).toContain('skipped')
  })

  it('stays silent when nothing was refused — no noise on a healthy board', () => {
    expect(src).toContain('(enrolSkips.detail?.skipped ?? 0) > 0')
  })
})
