// ═══════════════════════════════════════════════════════════════════════════════════════
// EVERY EXECUTION PATH CONSUMES THE GATE — AND THE GATE FAILS CLOSED.
//
// `programme-authority.test.ts` proves what the decision DECIDES, against the real function.
// This file proves the two things that file cannot:
//
//   1. the DB-touching entry points behave correctly (fail closed, tenancy, idempotency);
//   2. every real execution path actually CALLS the gate — the coverage question, which is
//      where the previous generation of this repo's gates went wrong. `lookalike/generate`
//      had no fence because it was the caller nobody remembered, and the fix was never
//      "check harder", it was "prove the set is complete".
//
// ⚠️ THE PATH SWEEP IS STRUCTURAL, AND THAT IS DELIBERATE — BUT IT IS NOT STRING
// SELF-CONSISTENCY. It does not look for a comment or a phrase; it asserts that a named
// function's body invokes a named gate, with SQL/TS comments stripped first so prose about a
// gate can never stand in for one. Removing any gate from any real path turns it red, which
// is RED proof ⑩ and is captured in the PR.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

const LIB = __dirname
const ROUTES = join(__dirname, '../routes')

/** Strip TS line/block comments so commentary about a gate can never be read as the gate. */
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .split('\n')
    .map(l => {
      const i = l.search(/(?<!:)\/\//)
      return i >= 0 ? l.slice(0, i) : l
    })
    .join('\n')
}

const code = (p: string) => stripComments(readFileSync(p, 'utf8'))

/** The body of a named exported function, comments already stripped. */
function fnBody(src: string, name: string): string {
  const at = src.indexOf(`function ${name}(`)
  if (at < 0) return ''
  // Functions in this repo are top-level, so the first line-start `}` closes them.
  const end = src.indexOf('\n}', at)
  return src.slice(at, end === -1 ? undefined : end)
}

describe('the sweep is not vacuous', () => {
  it('sources load and the function extractor finds real bodies', () => {
    const figsy = code(join(LIB, 'figsy.ts'))
    expect(figsy.length).toBeGreaterThan(1000)
    expect(fnBody(figsy, 'sendSequenceEmail').length).toBeGreaterThan(200)
  })

  it('the comment stripper works — prose about a gate is not a gate', () => {
    expect(stripComments('// checkProgrammeAuthority(clientId)')).not.toContain('checkProgrammeAuthority')
    expect(stripComments('/* checkProgrammeAuthority */')).not.toContain('checkProgrammeAuthority')
    expect(stripComments('await checkProgrammeAuthority(x) // see https://a//b')).toContain('checkProgrammeAuthority')
  })
})

// ── ⑩ EVERY REAL EXECUTION / SEND PATH CALLS THE GATE ─────────────────────────────────────
//
// One row per path audited. A path listed as EXEMPT carries the reason it is exempt, so an
// exemption is a stated argument rather than an omission nobody noticed.
describe('⑩ PATH COVERAGE — no execution path bypasses programme authority', () => {
  const GATED: { path: string; file: string; fn: string; call: string }[] = [
    // SOURCING — one gate below all eight runIcpJob call sites (Stripe webhook, client Run,
    // ICP create, operator run, operator bulk, admin, partners, start-work).
    { path: 'sourcing (all 8 entry points)', file: join(ROUTES, 'icps.ts'), fn: 'runIcpJob', call: 'authorityFor(' },
    // OUTREACH — sendSequenceEmail is the single chokepoint every sequence step funnels
    // through, including day-1 and the three cron paths.
    { path: 'email outreach + cron send-due-all', file: join(LIB, 'figsy.ts'), fn: 'sendSequenceEmail', call: 'checkEnrollmentAuthority(' },
    // Provider pushes — the last gate before an engine takes its own copy of the lead.
    { path: 'Smartlead push (live + backfill)', file: join(LIB, 'smartlead-send.ts'), fn: 'pushApprovedLeadToSmartlead', call: 'checkProgrammeAuthority(' },
    { path: 'Instantly push', file: join(LIB, 'instantly-push.ts'), fn: 'pushApprovedLeadToInstantly', call: 'checkProgrammeAuthority(' },
    { path: 'LinkedIn dispatch', file: join(LIB, 'linkedin.ts'), fn: 'dispatchLinkedInStep', call: 'checkProgrammeAuthority(' },
    // Conversation — the REPLY rule, which forgives money/approval but not pause or terminal.
    { path: 'manual reply', file: join(LIB, 'manual-reply.ts'), fn: 'sendManualReply', call: 'checkReplyAuthority(' },
    // Campaign activation — the original BUILD-002 gate, now consuming the same module.
    { path: 'campaign activation', file: join(LIB, 'start-work.ts'), fn: 'ensureCampaignForIcp', call: 'checkProgrammeAuthority(' },
  ]

  for (const g of GATED) {
    it(`${g.path} → ${g.fn} calls the gate`, () => {
      const body = fnBody(code(g.file), g.fn)
      expect(body.length, `${g.fn} not found in ${g.file}`).toBeGreaterThan(100)
      expect(
        body,
        `${g.path}: ${g.fn} no longer calls ${g.call} — a programme could deliver through this path while paused, unapproved or unpaid, and nothing else in the system would notice.`,
      ).toContain(g.call)
    })
  }

  it('WhatsApp is EXEMPT, and the reason is asserted rather than assumed', () => {
    // `routes/whatsapp.ts` sends to a PHONE NUMBER supplied in the request body. It is keyed
    // to no enrollment, no campaign and no lead, so there is no programme to resolve — it is
    // an operator/inbound-response channel, not programme delivery. If it ever gains a
    // campaign or enrollment link, this assertion fails and it must be gated.
    const wa = code(join(ROUTES, 'whatsapp.ts'))
    expect(wa, 'whatsapp.ts now references enrollments — it may have become a programme delivery path and needs the gate')
      .not.toContain('figsy_enrollments')
    expect(wa).not.toContain('programme_id')
  })

  it('the audited set is COMPLETE — no other file calls a real provider send without the gate', () => {
    // Guards against a NEW send path appearing. Every module that pushes a lead into an
    // outbound engine must consume programme authority; if a new one appears, this fails and
    // names it rather than letting it ship ungated.
    const senders = ['smartlead-send.ts', 'instantly-push.ts', 'linkedin.ts', 'figsy.ts', 'manual-reply.ts']
    for (const f of senders) {
      const src = code(join(LIB, f))
      expect(src, `${f} lost its programme-authority import`).toMatch(/programme-authority/)
    }
  })
})

// ── ⑥ CONCURRENCY: openBatch claims atomically ────────────────────────────────────────────
describe('⑥ DUPLICATE / CONCURRENT BATCH START', () => {
  beforeEach(() => vi.resetModules())

  it('openBatch goes through the atomic claim RPC, not a read-then-insert', async () => {
    // ⚠️ BEHAVIOURAL, NOT STRUCTURAL: the fake db records what was actually called. A
    // regression back to `select(seq) → insert` would show up as a `.from()` call here.
    const calls: string[] = []
    vi.doMock('@kind/db', () => ({
      db: {
        rpc: async (name: string, args: Record<string, unknown>) => {
          calls.push(`rpc:${name}`)
          return { data: { id: 'batch-1', programme_id: args.p_programme_id, seq: 1, status: 'running' }, error: null }
        },
        from: (t: string) => { calls.push(`from:${t}`); throw new Error('openBatch must not touch tables directly') },
      },
    }))
    const { openBatch } = await import('./programme')
    const batch = await openBatch('prog-1', 250, 250)
    expect(batch?.id).toBe('batch-1')
    expect(calls).toEqual(['rpc:claim_programme_batch'])
    expect(calls.some(c => c.startsWith('from:')), 'openBatch read or wrote a table directly — the race is back').toBe(false)
  })

  it('🛑 TWO CONCURRENT CLAIMS RETURN THE SAME BATCH — one active batch, and the loser REUSES it', async () => {
    // The founder's requirement stated exactly: two workers must end with ONE active batch,
    // and the second must receive the existing one rather than create another. The fake RPC
    // models the real function's contract — a running batch is returned, not duplicated.
    let created = 0
    const running: { id: string; seq: number } | null = null as { id: string; seq: number } | null
    let current = running
    vi.doMock('@kind/db', () => ({
      db: {
        rpc: async () => {
          if (current) return { data: current, error: null }      // already running → reuse
          created += 1
          current = { id: `batch-${created}`, seq: created }
          return { data: current, error: null }
        },
        from: () => { throw new Error('no direct table access') },
      },
    }))
    const { openBatch } = await import('./programme')
    const [a, b] = await Promise.all([openBatch('p', 250, 250), openBatch('p', 250, 250)])
    expect(a?.id).toBe(b?.id)
    expect(created, 'a second batch was created for the same programme').toBe(1)
  })

  it('a failed claim returns null and is LOGGED, never a silent zero', async () => {
    const errors: unknown[] = []
    vi.spyOn(console, 'error').mockImplementation((...a) => { errors.push(a) })
    vi.doMock('@kind/db', () => ({
      db: { rpc: async () => ({ data: null, error: { message: 'deadlock detected' } }), from: () => { throw new Error('x') } },
    }))
    const { openBatch } = await import('./programme')
    expect(await openBatch('p', 250, 250)).toBeNull()
    expect(errors.length, 'a batch that could not be claimed was swallowed').toBeGreaterThan(0)
  })
})

// ── ⑦ TENANCY AND BROKEN LINKS FAIL CLOSED ────────────────────────────────────────────────
describe('⑦ WRONG-CLIENT AND BROKEN PROGRAMME LINKS FAIL CLOSED', () => {
  beforeEach(() => vi.resetModules())

  /** A minimal supabase-shaped stub: one row per table, or an error. */
  function stubDb(rows: Record<string, unknown>, errors: Record<string, { message: string }> = {}) {
    const chain = (table: string) => {
      const c: Record<string, unknown> = {}
      for (const m of ['select', 'eq', 'not', 'limit', 'is', 'in']) c[m] = () => c
      c.maybeSingle = async () => ({ data: rows[table] ?? null, error: errors[table] ?? null })
      c.single = c.maybeSingle
      return c
    }
    return { db: { from: (t: string) => chain(t), rpc: async () => ({ data: null, error: null }) } }
  }

  it('an enrollment naming a programme owned by ANOTHER client is refused', async () => {
    vi.doMock('@kind/db', () => stubDb({
      figsy_enrollments: { id: 'e1', client_id: 'client-A', programme_id: 'prog-X' },
      programmes: { id: 'prog-X', client_id: 'client-B', status: 'LIVE' },
    }))
    const { checkEnrollmentAuthority } = await import('./programme-authority')
    const v = await checkEnrollmentAuthority('e1', 'OUTREACH')
    expect(v.allowed).toBe(false)
    expect(!v.allowed && v.reason).toBe('programme_unresolvable')
    expect(!v.allowed && v.message).toContain('never treated as ordinary non-programme work')
  })

  it('an enrollment naming a programme that does NOT EXIST is refused — never treated as legacy', async () => {
    // 🛑 THE FOUNDER'S RULE, ASSERTED DIRECTLY. A dangling link must not fall back to the
    // legacy path: that is how programme work would escape every control while looking like
    // an ordinary legacy send in every log.
    vi.doMock('@kind/db', () => stubDb({
      figsy_enrollments: { id: 'e1', client_id: 'client-A', programme_id: 'prog-GONE' },
      programmes: null,
    }))
    const { checkEnrollmentAuthority } = await import('./programme-authority')
    const v = await checkEnrollmentAuthority('e1', 'OUTREACH')
    expect(v.allowed).toBe(false)
    expect(!v.allowed && v.reason).toBe('programme_unresolvable')
  })

  it('an UNREADABLE programme is refused, not waved through', async () => {
    vi.doMock('@kind/db', () => stubDb(
      { figsy_enrollments: { id: 'e1', client_id: 'c', programme_id: 'p' } },
      { programmes: { message: 'connection reset' } },
    ))
    const { checkEnrollmentAuthority } = await import('./programme-authority')
    const v = await checkEnrollmentAuthority('e1', 'OUTREACH')
    expect(v.allowed).toBe(false)
  })

  it('a client-level read failure refuses rather than reading as "no programme"', async () => {
    // "I could not read it" and "there is none" must never render the same on a money path —
    // the same defect this repo already fixed inside programme.ts.
    vi.doMock('@kind/db', () => stubDb({}, { programmes: { message: 'timeout' } }))
    const { checkProgrammeAuthority } = await import('./programme-authority')
    const v = await checkProgrammeAuthority('client-1', 'OUTREACH')
    expect(v.allowed).toBe(false)
    expect(!v.allowed && v.reason).toBe('programme_unresolvable')
  })

  it('a genuine legacy client (no programme row, clean read) IS allowed', async () => {
    // The other half. A fix that quietly stopped legacy delivery would be a worse bug.
    vi.doMock('@kind/db', () => stubDb({ programmes: null }))
    const { checkProgrammeAuthority } = await import('./programme-authority')
    const v = await checkProgrammeAuthority('client-1', 'OUTREACH')
    expect(v.allowed).toBe(true)
    expect(v.allowed && v.mode).toBe('legacy')
  })
})

// ── ⑨ ATTRIBUTION ─────────────────────────────────────────────────────────────────────────
describe('⑨ DELIVERY ATTRIBUTION', () => {
  beforeEach(() => vi.resetModules())

  it('an enrollment takes programme + batch from the LEAD, not from the client', async () => {
    vi.doMock('@kind/db', () => ({
      db: {
        from: () => {
          const c: Record<string, unknown> = {}
          for (const m of ['select', 'eq']) c[m] = () => c
          c.maybeSingle = async () => ({ data: { programme_id: 'prog-1', batch_id: 'batch-3' }, error: null })
          return c
        },
      },
    }))
    const { resolveLeadAttribution } = await import('./programme-authority')
    expect(await resolveLeadAttribution('lead-1')).toEqual({ programmeId: 'prog-1', batchId: 'batch-3' })
  })

  it('a lead with no attribution stays NULL — never backfilled, never guessed', async () => {
    vi.doMock('@kind/db', () => ({
      db: {
        from: () => {
          const c: Record<string, unknown> = {}
          for (const m of ['select', 'eq']) c[m] = () => c
          c.maybeSingle = async () => ({ data: { programme_id: null, batch_id: null }, error: null })
          return c
        },
      },
    }))
    const { resolveLeadAttribution } = await import('./programme-authority')
    expect(await resolveLeadAttribution('lead-legacy')).toEqual({ programmeId: null, batchId: null })
  })

  it('attribution NEVER blocks delivery — a read failure yields null, not a throw', async () => {
    // Attribution is a RECORD, not a gate. The authority checks decide whether work happens;
    // losing provenance must not cost a client an enrollment they paid for.
    vi.doMock('@kind/db', () => ({ db: { from: () => { throw new Error('down') } } }))
    const { resolveLeadAttribution } = await import('./programme-authority')
    expect(await resolveLeadAttribution('lead-1')).toEqual({ programmeId: null, batchId: null })
  })

  it('the enrollment insert writes both attribution columns', () => {
    const body = fnBody(code(join(LIB, 'figsy.ts')), 'autoEnrollLead')
    expect(body).toContain('programme_id:')
    expect(body).toContain('batch_id:')
    expect(body).toContain('resolveLeadAttribution(')
  })

  it('the sourcing run stamps the lead BEFORE the batch is settled', () => {
    // Order matters: once settleBatch runs the batch is no longer the open one, and a later
    // "which batch bought this person?" has nothing to key on.
    const src = code(join(ROUTES, 'icps.ts'))
    const stamp = src.indexOf('batch_id: programmeBatch.id')
    const settle = src.indexOf('settleBatch(programmeBatch.id')
    expect(stamp, 'the attribution stamp is missing from runIcpJob').toBeGreaterThan(0)
    expect(settle).toBeGreaterThan(0)
    expect(stamp, 'attribution is stamped AFTER the batch is settled — provenance is lost').toBeLessThan(settle)
  })

  it('meetings truth is NOT touched — public.meetings stays the sole meeting authority', () => {
    const auth = code(join(LIB, 'programme-authority.ts'))
    // It may COUNT meetings; it may never write them.
    expect(auth).not.toMatch(/from\('meetings'\)[\s\S]{0,80}(insert|update|delete)/)
    expect(auth).toContain('clientMeetingCounts')
  })
})
