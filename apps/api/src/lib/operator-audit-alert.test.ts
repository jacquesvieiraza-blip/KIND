import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── A DROPPED AUDIT ROW IS NEVER SILENT (20 Aug) ───────────────────────────────────────────
//
// `writeOperatorAudit` is the ONLY record of who did what to a client's account. It used to
// `console.error` a failed insert and return, so an operator action could happen with **nothing
// anywhere saying it did** — and the only trace was a log line nobody reads.
//
// ⛓️ The file's own header claimed *"but it IS logged loudly so a persistent audit outage is
// visible."* **It was not visible.** That comment described an intention as though it were a
// mechanism — the third such line found on 20 Aug, after `pecr.ts`'s uncounted `unknown_country`
// and `startup-check.ts` describing the deploy SHA as "used in health/diagnostics" when only the
// boot log touched it.
//
// ⚠️ NOT FAIL-CLOSED, founder-ruled: *"a human operator's action should not be blocked by a
// logging hiccup — that decision waits for Level-3."* The action still proceeds; the failure
// just stops being invisible.

const state = {
  /** How the insert should misbehave this test. */
  mode: 'ok' as 'ok' | 'returns_error' | 'throws',
  alerts: [] as { kind: string; subject: string; lines: string[] }[],
}

vi.mock('@kind/db', () => ({
  db: {
    from: () => ({
      insert: async () => {
        if (state.mode === 'throws') throw new Error('connection terminated unexpectedly')
        if (state.mode === 'returns_error') return { error: { message: 'permission denied for table operator_audit_log' } }
        return { error: null }
      },
    }),
  },
}))

vi.mock('./alerts', () => ({
  sendFounderAlert: async (kind: string, subject: string, lines: string[]) => {
    state.alerts.push({ kind, subject, lines })
  },
}))

const ENTRY = {
  operatorEmail: 'jacques.vieiraza@gmail.com',
  clientId: 'client-1',
  action: 'approve_lead' as const,
  subjectType: 'lead',
  subjectId: 'lead-9',
}

/** Let the fire-and-forget alert settle before asserting on it. */
const settle = () => new Promise(r => setTimeout(r, 0))

beforeEach(() => {
  state.mode = 'ok'
  state.alerts.length = 0
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('RED PROOF — the old shape logged and moved on', () => {
  it('a console.error is not a signal: nothing leaves the process', () => {
    // Reproduced from the line this replaces. The row is gone, the action stands, and the only
    // evidence is a string in a log stream nobody opens.
    const sent: string[] = []
    const oldPath = (error: { message: string } | null) => {
      if (error) { /* console.error(...) */ }          // ← the whole of the old handling
      return sent
    }
    expect(oldPath({ message: 'permission denied' })).toEqual([])   // ← RED: no alert, ever
  })
})

describe('an insert that RETURNS an error raises a founder alert', () => {
  it('the alert fires, and names the action, the operator and the subject', async () => {
    state.mode = 'returns_error'
    const { writeOperatorAudit } = await import('./operator-audit')
    // ⚠️ EVERY TEST IN THIS FILE USES A DIFFERENT `action`, AND THAT IS LOAD-BEARING. The
    // throttle store is module-level and shared across tests, so two tests sharing an action
    // would have the second one silently held and its assertion would fail for a reason with
    // nothing to do with the code. (An earlier version of this line called `auditAlertDue`
    // with a throwaway Map to "reset" it — which resets nothing, and read like a guard while
    // being dead code. Removed rather than left to mislead.)
    await writeOperatorAudit(ENTRY)
    await settle()

    expect(state.alerts, 'exactly one alert for one dropped row').toHaveLength(1)
    const [a] = state.alerts
    expect(a.kind).toBe('audit_dropped')
    const body = a.lines.join('\n')
    expect(body, 'the action').toContain('approve_lead')
    expect(body, 'the operator').toContain('jacques.vieiraza@gmail.com')
    expect(body, 'the subject').toContain('lead-9')
    expect(body, 'and WHY the row was not written').toContain('permission denied')
  })

  it('says plainly that the ACTION still went through — this is the record, not the work', async () => {
    // Without this sentence the alert reads as "an approval failed", which would send somebody
    // to re-approve a lead that was already approved and charged.
    state.mode = 'returns_error'
    const { writeOperatorAudit } = await import('./operator-audit')
    await writeOperatorAudit({ ...ENTRY, action: 'pass_lead' })
    await settle()
    expect(state.alerts[0].lines.join('\n')).toContain('THE ACTION ITSELF WENT THROUGH')
  })
})

describe('⚠️ an insert that THROWS alerts too — the outage case, and the one that matters most', () => {
  it('a connection failure is not silently swallowed', async () => {
    // supabase-js RETURNS its errors, but a dead connection THROWS. Alerting on only the
    // returned case would leave the database-is-down scenario — the exact scenario this whole
    // item exists for — as quiet as it was before.
    state.mode = 'throws'
    const { writeOperatorAudit } = await import('./operator-audit')
    await writeOperatorAudit({ ...ENTRY, action: 'reveal_lead' })
    await settle()

    expect(state.alerts).toHaveLength(1)
    expect(state.alerts[0].lines.join('\n')).toContain('connection terminated')
  })
})

describe('⚠️ A SUCCESSFUL WRITE ALERTS ABOUT NOTHING — without this the tests above prove nothing', () => {
  it('the happy path is silent', async () => {
    // The #617 lesson, which has caught a false pass repeatedly this week: if the harness were
    // simply firing alerts unconditionally, every assertion above would still be green.
    state.mode = 'ok'
    const { writeOperatorAudit } = await import('./operator-audit')
    await writeOperatorAudit({ ...ENTRY, action: 'send_now' })
    await settle()
    expect(state.alerts, 'a working audit write is not news').toEqual([])
  })

  it('and the action is never blocked — writeOperatorAudit still resolves on failure', async () => {
    // Founder-ruled: not fail-closed. If this ever threw, a logging hiccup would start
    // reversing operator actions, which is a far worse bug than the one being fixed.
    state.mode = 'throws'
    const { writeOperatorAudit } = await import('./operator-audit')
    await expect(writeOperatorAudit({ ...ENTRY, action: 'enroll_lead' })).resolves.toBeUndefined()
  })
})

describe('the throttle — an outage must not flood the inbox it is trying to reach', () => {
  it('the second failure inside the window is held', async () => {
    // Fifty leads worked during a database outage would otherwise be fifty emails, arriving
    // exactly when the founder needs one clear signal.
    state.mode = 'returns_error'
    const { writeOperatorAudit } = await import('./operator-audit')
    await writeOperatorAudit({ ...ENTRY, action: 'approve_draft' })
    await writeOperatorAudit({ ...ENTRY, action: 'approve_draft' })
    await writeOperatorAudit({ ...ENTRY, action: 'approve_draft' })
    await settle()
    expect(state.alerts, 'three dropped rows, one alert').toHaveLength(1)
  })

  it('a DIFFERENT action still gets through — the throttle is per action, not global', async () => {
    // A global throttle would hide a second, unrelated failure behind the first, which is how
    // a throttle turns into the silence it was meant to prevent.
    state.mode = 'returns_error'
    const { writeOperatorAudit } = await import('./operator-audit')
    await writeOperatorAudit({ ...ENTRY, action: 'reject_draft' })
    await writeOperatorAudit({ ...ENTRY, action: 'surface_lead' })
    await settle()
    expect(state.alerts.map(a => a.lines[0])).toEqual(['Action: reject_draft', 'Action: surface_lead'])
  })

  it('the window reopens — asserted on the real function with an explicit clock', async () => {
    // The branch that matters most is the one that decides NOT to alert (cron-health's lesson),
    // so it is tested directly rather than inferred, with its own store and no wall-clock.
    const { auditAlertDue } = await import('./operator-audit')
    const store = new Map<string, number>()
    const t0 = 1_000_000

    expect(auditAlertDue('x', t0, store), 'first is always due').toBe(true)
    expect(auditAlertDue('x', t0 + 60_000, store), 'a minute later: held').toBe(false)
    expect(auditAlertDue('x', t0 + 14 * 60_000, store), 'fourteen minutes: still held').toBe(false)
    expect(auditAlertDue('x', t0 + 15 * 60_000, store), 'at fifteen: due again').toBe(true)
    expect(auditAlertDue('x', t0 + 16 * 60_000, store), 'and the window restarts from THEN').toBe(false)
  })

  it('the alert says it is throttled, so silence afterwards is not read as "it stopped"', async () => {
    state.mode = 'returns_error'
    const { writeOperatorAudit } = await import('./operator-audit')
    await writeOperatorAudit({ ...ENTRY, action: 'set_pdl_cap' })
    await settle()
    expect(state.alerts[0].lines.join('\n')).toContain('held for 15 minutes')
  })
})
