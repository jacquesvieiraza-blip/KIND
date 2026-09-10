// ═══════════════════════════════════════════════════════════════════════════════════════
// 🛑 MAKE LIVE ARMS · RUN STARTS · P2 DOES NEITHER.
//
// ── WHAT THE 10 SEP AUDIT FOUND, AND IT WAS THE LAUNCH BLOCKER ──────────────────────────
//
// The founder's rule is three separate acts: client approval, then P2, then an operator Make
// Live that ARMS and sends zero, then a separate operator Run that STARTS. In the code there
// were effectively none of the last two:
//
//   ① `recordSecondPayment` ran preparation and wrote `status: 'LIVE', went_live_at` itself,
//      with the comment "the successful paid path still auto-goes-live, exactly as it always
//      has." So for every PAYING client the operator's Make Live was skipped: the money
//      arriving armed the programme, activated its campaign and stamped every enrolment due.
//      R108 records the founder verbatim — *"**P2 does not Make Live.**"*
//
//   ② Nothing recorded that Run had happened. `programmes` had no run column, and
//      `authorityFor(..., 'OUTREACH')` asked approval, P2, LIVE, the approved hash, the
//      schedule and the sender — never "has Run been pressed". Make Live leaves every
//      enrolment `next_send_at = now`, which is exactly what `send-due` selects. So the first
//      time `AUTO_OUTREACH_ENABLED` was set to 'true' to let the founder Run ONE canary, the
//      two-hourly cron and the client-callable `/figsy/send-due` would have delivered for
//      EVERY live programme, with nobody pressing anything.
//
// ⚠️ THE FIX IS STRUCTURAL, NOT A CHECK IN THE RUN BUTTON. Run is a stored fact on the row and
// the AUTHORITY asks it, so a path that does not know about Run cannot route around it — the
// same argument `outreach-kill-switch.ts` makes about the switch.
//
// Mocks only. No provider, no database, no network, nothing sent.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// `authorityFor` is pure — it takes a row and returns a verdict — but its module imports the
// Supabase client at load time and there is no URL in a test env. Nothing here touches the db.
vi.mock('@kind/db', () => ({ db: {} }))

import { authorityFor, type ProgrammeRow as AuthorityRow } from './programme-authority'
import { PENDING_MIGRATIONS } from './pending-migrations'

const API = join(__dirname, '..')
const raw = (p: string) => readFileSync(join(API, p), 'utf8')
/** Executable lines only — a comment describing a ban is not the ban. */
const code = (s: string) => s.split('\n')
  .filter(l => { const t = l.trim(); return t && !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*') })
  .join('\n')

const PROGRAMME = raw('lib/programme.ts')
const AUTHORITY = raw('lib/programme-authority.ts')
const SEND_DUE = raw('lib/send-due.ts')
const LIFECYCLE = raw('lib/programme-lifecycle.ts')
const ROUTES = raw('routes/programme.ts')

/** A programme that has passed every gate EXCEPT the one under test. */
const ARMED = {
  id: 'p1', client_id: 'c1', status: 'LIVE',
  meeting_target: 10, recommended_volume: 2500,
  first_paid_at: '2026-09-01T00:00:00Z', second_paid_at: '2026-09-09T00:00:00Z',
  first_payment_ref: 'cs_1', second_payment_ref: 'cs_2',
  sourcing_ceiling: 2500, sourced_used: 2500, sourced_reserved: 0,
  approved_at: '2026-09-08T00:00:00Z', went_live_at: '2026-09-09T12:00:00Z',
  paused_at: null, pause_reason: null,
  review_required_at: null, review_reason: null, review_resolved_at: null,
  first_payment_intent_id: null, second_payment_intent_id: null,
  first_authorised_at: null, second_authorised_at: null,
  send_schedule: { days: [1, 2, 3, 4, 5], start: '08:30', end: '17:00', tz: 'Europe/London' },
  run_at: null,
} as unknown as AuthorityRow

const started = (over: Record<string, unknown> = {}) =>
  ({ ...ARMED, run_at: '2026-09-09T13:00:00Z', ...over }) as unknown as AuthorityRow

describe('🛑 ① armed is not started — OUTREACH refuses without Run', () => {
  it('a fully approved, paid, LIVE programme that was never Run is REFUSED', () => {
    const v = authorityFor(ARMED, 'OUTREACH')
    expect(v.allowed).toBe(false)
    expect(v.allowed === false && v.reason).toBe('programme_not_run')
  })

  it('…and the refusal says which of the two acts is missing, in operator words', () => {
    const v = authorityFor(ARMED, 'OUTREACH')
    const detail = v.allowed === false ? v.message : ''
    expect(detail).toContain('Make Live arms and sends nothing')
    expect(detail).toContain('Run is the separate operator action')
  })

  it('⚠️ NON-VACUOUS: the SAME row with Run stamped is ALLOWED', () => {
    // Without this every assertion above would pass on a gate that refuses everything.
    const v = authorityFor(started(), 'OUTREACH')
    expect(v.allowed, v.allowed === false ? v.message : '').toBe(true)
  })

  it('🛑 a MISSING column reads as not-run, so the gate is safe before the migration', () => {
    // Before `20260910_programme_run_authority` runs, the select returns `undefined` rather
    // than null. A gate that treated absence as permission would send for every programme in
    // exactly the window where nobody had pressed Run yet.
    const { run_at: _drop, ...noColumn } = ARMED as unknown as Record<string, unknown>
    const v = authorityFor(noColumn as unknown as AuthorityRow, 'OUTREACH')
    expect(v.allowed).toBe(false)
    expect(v.allowed === false && v.reason).toBe('programme_not_run')
  })

  it('Run does not grant SOURCING or NEXT_BATCH — P1 already did, and nothing changed there', () => {
    // The whole point of the two-payment model: P1 buys sourcing and preparation. Requiring
    // Run for those would have made it impossible to build the thing the client approves.
    const sourcing = authorityFor({ ...ARMED, status: 'SOURCING' } as unknown as AuthorityRow, 'SOURCING')
    expect(sourcing.allowed, sourcing.allowed === false ? sourcing.message : '').toBe(true)
  })

  it('the gate is asked AFTER approval and P2, so a refusal names the nearest missing thing', () => {
    const noApproval = authorityFor({ ...ARMED, approved_at: null } as unknown as AuthorityRow, 'OUTREACH')
    expect(noApproval.allowed === false && noApproval.reason).toBe('programme_not_approved')
    const noP2 = authorityFor(
      { ...ARMED, second_paid_at: null, second_payment_ref: null } as unknown as AuthorityRow, 'OUTREACH')
    expect(noP2.allowed === false && noP2.reason).toBe('second_payment_missing')
  })

  it('🛑 and it is enforced in the AUTHORITY, not in the Run button', () => {
    // A check inside the operator route would be a convention: the cron and the
    // client-callable `/figsy/send-due` never call that route.
    const gate = code(AUTHORITY)
    expect(gate).toContain("if (!p.run_at) {")
    expect(gate).toContain("return refuse('programme_not_run',")
    // …and the column is SELECTED, or the gate would refuse every programme including a Run one.
    expect(gate).toContain("'run_at'")
  })
})

describe('🛑 ② the send workers cannot even see an un-run programme', () => {
  it('the selection layer marks it and filters it out', () => {
    const c = code(SEND_DUE)
    expect(c).toContain("if (model.openProgramme && !model.openProgramme.run_at) {")
    expect(c).toContain("openProgrammeByClient.set(cid as string, '__not_run__')")
    expect(c).toContain("if (openId === '__not_run__') return false")
  })

  it('…which is a SECOND gate, not a replacement for the authority one', () => {
    // Two independent layers, deliberately: one stops the work being offered, the other
    // refuses it at the seam. A single gap in either must not put a real person in a queue.
    expect(code(SEND_DUE)).toContain("if (openId === '__unreadable__') return false")
    expect(code(AUTHORITY)).toContain("return refuse('programme_not_run',")
  })
})

describe('🛑 ③ Make Live arms and sends zero; Run grants and sends nothing', () => {
  const goLive = PROGRAMME.slice(
    PROGRAMME.indexOf('export async function goLiveProgramme'),
    PROGRAMME.indexOf('export async function runProgramme'))
  const run = PROGRAMME.slice(
    PROGRAMME.indexOf('export async function runProgramme'),
    PROGRAMME.indexOf('export async function runProgramme') + 3200)

  it('🛑 Make Live NEVER stamps run_at — the two acts cannot collapse into one', () => {
    expect(goLive.length).toBeGreaterThan(0)
    expect(code(goLive).includes('run_at'), 'Make Live grants delivery authority').toBe(false)
    expect(code(goLive)).toContain("status: 'LIVE',")
    expect(code(goLive)).toContain('went_live_at: new Date().toISOString()')
  })

  it('Make Live records WHO armed it, and Run records who started it', () => {
    expect(code(goLive)).toContain('went_live_by: pressedBy ?? null')
    expect(code(run)).toContain('run_by: pressedBy ?? null')
  })

  it('🛑 Run calls no provider and touches no enrolment — it writes one timestamp', () => {
    const c = code(run)
    for (const forbidden of ['sendSequenceEmail', 'figsy_enrollments', 'figsy_campaigns', 'resend', 'sendAs', 'next_send_at']) {
      expect(c.includes(forbidden), `Run reaches into delivery: ${forbidden}`).toBe(false)
    }
    expect(c).toContain("db.from('programmes')")
  })

  it('Run re-proves the armed state from the ROW rather than trusting Make Live ran', () => {
    const c = code(run)
    expect(c).toContain("if (p.status !== 'LIVE' || !p.went_live_at)")
    expect(c).toContain('if (!p.approved_at)')
    expect(c).toContain('if (!p2Authorised(p))')
    expect(c).toContain('if (p.paused_at)')
  })

  it('🛑 Run is IDEMPOTENT, and the FIRST press is the one recorded', () => {
    const c = code(run)
    // An early return for an already-run programme, and a compare-and-set for the race.
    expect(c).toContain('if (p.run_at) return { ok: true, alreadyRunning: true, runAt: p.run_at }')
    expect(c).toContain(".is('run_at', null)")
  })

  it('the route audits the grant, and only a real transition', () => {
    const c = code(ROUTES)
    expect(c).toContain("programmeRouter.post('/:id/run'")
    expect(c).toContain("auditProgramme(req, 'programme_run', req.params.id")
    expect(c).toContain('if (r.ok && !r.alreadyRunning) {')
    // The response must not let a screen imply Make Live started anything.
    expect(c).toContain('armed_only: true')
  })
})

describe('🛑 ④ P2 records money and arms nothing', () => {
  const p2 = PROGRAMME.slice(
    PROGRAMME.indexOf('export async function recordSecondPayment'),
    PROGRAMME.indexOf('export function programmeStageOf'))

  it('🛑 it does not write LIVE, does not stamp went_live_at, and does not prepare', () => {
    const c = code(p2)
    expect(c.includes("status: 'LIVE'"), 'P2 writes LIVE').toBe(false)
    // ⚠️ MATCHED AS A WRITE (`went_live_at:`), NOT AS A MENTION. The replay branch at the top
    // of the function READS `p.went_live_at` to answer "was this already recorded and still
    // not live", which is exactly the truthful thing to report — banning the word would ban
    // the read as well as the write.
    expect(/went_live_at\s*:/.test(c), 'P2 stamps a go-live').toBe(false)
    expect(c.includes('prepareProgrammeOutreach'), 'P2 runs preparation').toBe(false)
    expect(c.includes('run_at'), 'P2 grants delivery authority').toBe(false)
  })

  it('the money is still committed unconditionally, and exactly once', () => {
    const c = code(p2)
    expect(c).toContain('second_payment_ref: params.sessionId')
    expect(c).toContain('.update(base)')
    expect(c).toContain(".is('second_payment_ref', null)")
  })

  it('…and P2 alone leaves the programme refused by OUTREACH', () => {
    // The end-to-end shape of the fix, as a fact about the row P2 produces: APPROVED and paid
    // in full, and still unable to send.
    const afterP2 = { ...ARMED, status: 'APPROVED', went_live_at: null, run_at: null } as unknown as AuthorityRow
    const v = authorityFor(afterP2, 'OUTREACH')
    expect(v.allowed).toBe(false)
  })
})

describe('🛑 ⑤ Vida reads the two acts as two states', () => {
  it('armed-but-not-run is asked BEFORE the send count', () => {
    // The send count used to be the proxy for "has it started", so a stray historical send
    // promoted an un-run programme to Review and hid the fact that nobody had pressed Run.
    const c = code(LIFECYCLE)
    const runCheck = c.indexOf('if (!p.run) {')
    const sendCheck = c.indexOf('if (f.sends > 0) {')
    expect(runCheck).toBeGreaterThan(-1)
    expect(runCheck, 'the send count is consulted before Run').toBeLessThan(sendCheck)
  })

  it('the Run fact is carried as its own named fact, never derived from `live`', () => {
    expect(code(LIFECYCLE)).toContain('run: boolean')
    expect(code(raw('lib/programme-lifecycle-facts.ts'))).toContain('run: !!p.run_at')
    expect(code(raw('lib/programme-lifecycle-facts.ts'))).toContain("'run_at, '")
  })
})

describe('⑥ the migration is additive, un-backfilled and in all three homes', () => {
  const entry = PENDING_MIGRATIONS.find(m => m.key === '20260910_programme_run_authority')

  it('registered in the runner', () => { expect(entry).toBeTruthy() })

  it('three nullable columns, no default, and NOTHING destructive', () => {
    const sql = entry!.sql
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS run_at       timestamptz')
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS run_by       text')
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS went_live_by text')
    expect(sql.includes('DEFAULT'), 'a column carries a default').toBe(false)
    for (const destructive of ['DROP COLUMN', 'DROP CONSTRAINT', 'DELETE FROM']) {
      expect(sql.includes(destructive), `destructive: ${destructive}`).toBe(false)
    }
  })

  it('🛑 NO BACKFILL — a backfill would grant the authority the column exists to require', () => {
    const sql = entry!.sql
    expect(sql.includes('UPDATE public.programmes'), 'existing rows were granted Run').toBe(false)
    expect(sql.includes('SET run_at'), 'existing rows were granted Run').toBe(false)
  })

  it('declared in the schema of record, and filed in supabase/migrations', () => {
    const schema = readFileSync(join(API, '..', '..', '..', 'packages', 'db', 'src', 'schema.sql'), 'utf8')
    expect(schema).toContain('run_at                    timestamptz')
    const file = readFileSync(
      join(API, '..', '..', '..', 'supabase', 'migrations', '20260910_programme_run_authority.sql'), 'utf8')
    expect(file).toContain('ADD COLUMN IF NOT EXISTS run_at')
  })
})
