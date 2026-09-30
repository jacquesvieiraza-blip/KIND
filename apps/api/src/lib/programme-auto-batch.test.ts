// ⚑ 30 Sep (R175) — THE AUTOMATIC NEXT BATCH. Guards the founder's GO, clause by clause:
// it sources only inside a live programme's authority and limit, only once the last batch has
// been reviewed and fewer than two days of sending are left, and it never emails anybody.
import { describe, it, expect, vi } from 'vitest'

vi.mock('@kind/db', () => ({ db: {} }))   // the decision is pure; the IO half is never called here
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { decideAutoBatch, AUTO_BATCH_DAYS_OF_SENDING, type AutoBatchFacts } from './programme-auto-batch'

const due: AutoBatchFacts = {
  status: 'LIVE', isDemo: false, paused: false, killSwitchOn: false,
  authority: { allowed: true }, nextBatch: 250, dailyCap: 50, leftToContact: 40,
  latestBatch: { seq: 1, status: 'served', stillChecking: 0, awaitingSend: 0, surfaced: 234, enrolled: 234 },
}
const withBatch = (b: Partial<NonNullable<AutoBatchFacts['latestBatch']>>): AutoBatchFacts =>
  ({ ...due, latestBatch: { ...due.latestBatch!, ...b } })

describe('R175 — when the next batch starts', () => {
  it('a live, reviewed programme with fewer than two days of sending left is DUE', () => {
    const d = decideAutoBatch(due)
    expect(d.action).toBe('source')
    expect(d.state).toBe('due')
    expect(d.line).toContain('250')
  })

  it('two days of sending is the line: at 2 × cap it waits, one under it sources', () => {
    expect(AUTO_BATCH_DAYS_OF_SENDING).toBe(2)
    expect(decideAutoBatch({ ...due, leftToContact: 100 }).state).toBe('enough_left')
    expect(decideAutoBatch({ ...due, leftToContact: 99 }).state).toBe('due')
    expect(decideAutoBatch({ ...due, dailyCap: 30, leftToContact: 59 }).state).toBe('due')
    expect(decideAutoBatch({ ...due, dailyCap: 30, leftToContact: 60 }).state).toBe('enough_left')
  })

  it('House today — 234 in the sequence, cap 50 — is automatic and not yet due', () => {
    const d = decideAutoBatch({ ...due, leftToContact: 234 })
    expect(d.action).toBe('wait')
    expect(d.line).toContain('fewer than 100')
    expect(d.line).toContain('now 234')
  })

  it('the batch size is the programme\'s own, shrunk near the limit — never a number of its own', () => {
    expect(decideAutoBatch({ ...due, nextBatch: 66 }).line).toContain('up to 66')
  })
})

describe('R175 — every reason to hold beats the reason to act', () => {
  const cases: [string, AutoBatchFacts, string, 'wait' | 'stop'][] = [
    ['demo', { ...due, isDemo: true }, 'demo', 'stop'],
    ['not live', { ...due, status: 'APPROVED' }, 'not_live', 'wait'],
    ['paused', { ...due, paused: true }, 'paused', 'wait'],
    ['kill-switch ON', { ...due, killSwitchOn: true }, 'kill_switch', 'wait'],
    ['review hold', { ...due, authority: { allowed: false, reason: 'review_required', message: 'held' } }, 'review_hold', 'wait'],
    ['limit reached', { ...due, authority: { allowed: false, reason: 'sourcing_ceiling_reached', message: 'x' } }, 'limit_reached', 'stop'],
    ['no room left', { ...due, nextBatch: 0 }, 'limit_reached', 'stop'],
    ['other refusal', { ...due, authority: { allowed: false, reason: 'first_payment_missing', message: 'no P1' } }, 'not_authorised', 'wait'],
    ['no first batch', { ...due, latestBatch: null }, 'no_first_batch', 'wait'],
    ['batch still sourcing', withBatch({ status: 'running' }), 'batch_running', 'wait'],
    ['still being checked', withBatch({ stillChecking: 12 }), 'checking', 'wait'],
    ['Send not pressed', withBatch({ awaitingSend: 180 }), 'ready_for_review', 'wait'],
    ['Make live not pressed', withBatch({ enrolled: 0 }), 'ready_for_review', 'wait'],
    ['last batch found nobody', withBatch({ surfaced: 0, enrolled: 0 }), 'audience_used_up', 'stop'],
    ['no send cap', { ...due, dailyCap: null }, 'no_cap', 'wait'],
    ['unreadable left-to-contact', { ...due, leftToContact: null }, 'unreadable', 'wait'],
    ['unreadable batch', withBatch({ awaitingSend: null }), 'unreadable', 'wait'],
  ]
  for (const [name, facts, state, action] of cases) {
    it(`${name} → ${action} (${state}), even with 40 left to email`, () => {
      const d = decideAutoBatch(facts)
      expect(d.state).toBe(state)
      expect(d.action).toBe(action)
      expect(d.line.length).toBeGreaterThan(10)
    })
  }

  it('the limit line never prints the limit itself (R136 ③)', () => {
    const d = decideAutoBatch({ ...due, authority: { allowed: false, reason: 'sourcing_ceiling_reached', message: '400' } })
    expect(d.line).not.toMatch(/\d/)
  })
})

// ── Source guards ─────────────────────────────────────────────────────────────────────
const api = (f: string) => readFileSync(join(__dirname, '..', f), 'utf8')
const code = (s: string) => s.split('\n').filter(l => !l.trim().startsWith('//') && !l.trim().startsWith('*')).join('\n')

describe('R175 — it only ever sources, through the button\'s own door', () => {
  const lib = code(api('lib/programme-auto-batch.ts'))

  it('spends only through sourceProgramme', () => {
    expect(lib).toContain('sourceProgramme(p.id)')
    for (const other of ['runIcpJob', 'startWorkForClient', 'try_spend_sourcing', 'openBatch(']) expect(lib).not.toContain(other)
  })

  it('never emails, enrols, surfaces or goes live — the human review stop is kept', () => {
    for (const act of ['autoEnrollLead', 'surfaceEverything', 'sendSequenceEmail', 'prepareProgramme', 'goLive', 'surfaced_for_approval_at:']) {
      expect(lib).not.toContain(act)
    }
  })

  it('writes nothing to the database itself — only reads, the sourcing door and the audit log', () => {
    for (const w of ['.insert(', '.update(', '.upsert(', '.delete(', '.rpc(']) expect(lib).not.toContain(w)
    expect(lib).toContain("action: 'programme_source_run'")
    expect(lib).toContain("action: 'programme_source_refused'")
  })

  it('asks the same authority the button and the route ask', () => {
    expect(lib).toContain("authorityFor(p, 'NEXT_BATCH')")
    expect(lib).toContain('nextBatchSize(p)')
    expect(lib).toContain("eq('status', 'LIVE')")
  })
})

describe('R175 — scheduled once a day, and never as the retired top-up', () => {
  const cron = code(api('cron.ts'))
  it('the daily job is registered exactly once, before the send window', () => {
    expect(cron.match(/callInternal\('\/programmes\/auto-batch'\)/g)?.length).toBe(1)
    expect(cron).toContain("cron.schedule('45 5 * * *', () => callInternal('/programmes/auto-batch')")
    expect(cron).not.toContain('/leads/top-up')
  })

  it('the route runs runAutoBatches and nothing else', () => {
    const internal = api('routes/internal.ts')
    const at = internal.indexOf("internalRouter.post('/programmes/auto-batch'")
    expect(at).toBeGreaterThan(-1)
    const body = internal.slice(at, internal.indexOf('internalRouter.post(', at + 10))
    expect(body).toContain('runAutoBatches()')
    expect(body).not.toContain('startWorkForClient')
    expect(body).not.toContain('runIcpJob')
  })
})

describe('R175 — Vida shows the same decision; the client never sees it', () => {
  it('the operator programme truth carries autoBatchFor, the job\'s own decision', () => {
    const truth = code(api('lib/operator-programme.ts'))
    expect(truth).toContain('autoBatchFor(p)')
    expect(truth).toContain('auto_batch: autoBatch')
  })

  it('Vida prints the server\'s line and hides it on the demo', () => {
    const vida = readFileSync(join(__dirname, '../../../admin/src/app/vida/page.tsx'), 'utf8')
    expect(vida).toContain('data-testid="auto-batch-line"')
    expect(vida).toContain('prog.programme.auto_batch.line')
    expect(vida).toMatch(/auto_batch && !selectedIsDemo\(\)/)
  })

  it('no client route or portal file mentions it', () => {
    for (const f of ['routes/programme.ts', 'routes/milla.ts']) {
      let src = ''
      try { src = api(f) } catch { continue }
      expect(src, f).not.toContain('auto_batch')
      expect(src, f).not.toContain('programme-auto-batch')
    }
  })
})
