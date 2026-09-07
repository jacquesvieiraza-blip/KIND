// ═══════════════════════════════════════════════════════════════════════════════════════
// PROGRAMME-NATIVE SOURCING — THE PROGRAMME PICKS THE TARGETING, NOT A CHECKBOX
// (founder-locked 7 Sep, HOUSE-008 blocker fix).
//
// 🛑 THE BLOCKER. Neither runnable sourcing path could safely start the House programme:
//
//   ① `POST /operator/source` selects ICPs with `.eq('is_active', true)`. House's v4
//      "Founder-Led B2B Agencies UK/US" is ATTACHED TO THE PROGRAMME but deliberately NOT
//      client-facing active, while the old African Retail-Tech targeting still IS. So the
//      operator button cannot reach v4 — and would reach for the wrong audience instead.
//      `is_active` answers "what does the client see on their screen?". It was being used to
//      answer "what work is this programme authorised to do?" — a different question, whose
//      real answer has lived in `icps.programme_id` since 29 Aug.
//
//   ② `POST /icps/:id/run` CAN address v4 by id, but it is the client wallet path: on a first
//      run with an empty balance it grants 20 credits and writes a `trial_bonus` ledger row.
//      Minting credit on the House account to make a run start is manufactured money, and the
//      founder's House lock forbids exactly that. Its volume also comes from the reveal wallet
//      rather than from programme authority.
//
// THE FIX IS AN ENTRY POINT, NOT AN ARCHITECTURE. `runIcpJob` already resolves the programme
// from `icp.programme_id`, applies `authorityFor(…, 'NEXT_BATCH')`, spends through
// `try_spend_sourcing`, opens and settles the batch, and enforces the AR5 provider boundary.
// None of that is re-implemented here. What was missing was a door that starts from the
// PROGRAMME and finds its ICP — so that is all this adds.
//
// RED PROOF — before the fix, `./programme-sourcing` does not exist, so every test below
// fails at import.
//
// Mocks only — no network, no provider, no spend, no House data, NO SOURCING.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi, afterEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

// ⚠️ HOISTED. The module under test imports `@kind/db`, which throws at module scope without
// these — and a static import runs before any `beforeEach`. Nothing here reaches a network.
vi.hoisted(() => {
  process.env.SUPABASE_URL ??= 'http://localhost:54321'
  process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'test-service-role-key'
  process.env.SUPABASE_ANON_KEY ??= 'test-anon-key'
})

const PROGRAMME_ID = 'prog-house-1'
const CLIENT_ID = 'client-house'
const V4_ID = 'icp-v4-founder-led'
const OLD_ID = 'icp-african-retail-tech'

/** The exact House shape the founder verified: SOURCING_AUTHORISED, P1 internal, P2 absent. */
const HOUSE_PROGRAMME = {
  id: PROGRAMME_ID,
  client_id: CLIENT_ID,
  status: 'SOURCING_AUTHORISED',
  meeting_target: 10,
  sourcing_ceiling: 2500,
  sourced_used: 0,
  sourced_reserved: 0,
  first_paid_at: null,
  first_authorised_at: '2026-09-05T00:00:00.000Z',   // P1 INTERNAL — no money, no revenue
  second_paid_at: null,
  second_payment_ref: null,
  second_authorised_at: null,                        // P2 ABSENT
  went_live_at: null,                                // NOT LIVE
  paused_at: null,
  review_required_at: null,
  review_resolved_at: null,
}

/** v4 is attached and NOT active. The old audience is active and attached to nothing. */
const V4_ATTACHED = { id: V4_ID, name: 'Founder-Led B2B Agencies UK/US', client_id: CLIENT_ID, is_active: false, programme_id: PROGRAMME_ID }
const OLD_ACTIVE  = { id: OLD_ID, name: 'African Retail-Tech',           client_id: CLIENT_ID, is_active: true,  programme_id: null }

interface Rec {
  rpcs: string[]
  inserts: { table: string; row: unknown }[]
  updates: { table: string; row: unknown }[]
  icpFilters: Record<string, unknown>[]
  runs: { icpId: string; clientId: string; userId: string; maxLeads?: number; opts?: unknown }[]
}
const fresh = (): Rec => ({ rpcs: [], inserts: [], updates: [], icpFilters: [], runs: [] })

function harness(fx: {
  programme?: Record<string, unknown> | null
  programmeErr?: string
  icps?: Record<string, unknown>[]
  icpsErr?: string
  owner?: { user_id: string | null } | null
  runResult?: { inserted: number; skipped: number; relaxed: string | null }
  runThrows?: Error
}, rec: Rec) {
  vi.resetModules()
  vi.doMock('@kind/db', () => ({
    db: {
      from: (table: string) => {
        const filters: Record<string, unknown> = {}
        const q: Record<string, unknown> = {}
        for (const m of ['select', 'order', 'limit', 'in', 'is', 'not']) q[m] = () => q
        q.eq = (col: string, val: unknown) => { filters[col] = val; return q }
        q.insert = (row: unknown) => { rec.inserts.push({ table, row }); return q }
        q.update = (row: unknown) => { rec.updates.push({ table, row }); return q }
        q.maybeSingle = async () => {
          if (table === 'programmes') {
            return fx.programmeErr
              ? { data: null, error: { message: fx.programmeErr } }
              : { data: fx.programme === undefined ? HOUSE_PROGRAMME : fx.programme, error: null }
          }
          if (table === 'clients') {
            return { data: fx.owner === undefined ? { user_id: 'house-user' } : fx.owner, error: null }
          }
          return { data: null, error: null }
        }
        q.single = q.maybeSingle
        // The ICP lookup is awaited directly, so the query object itself must be thenable —
        // and recording the FILTERS is what makes "it never selected on is_active" provable.
        q.then = (resolve: (v: unknown) => void) => {
          if (table === 'icps') {
            rec.icpFilters.push({ ...filters })
            if (fx.icpsErr) return resolve({ data: null, error: { message: fx.icpsErr } })
            // ⚠️ THE MOCK MUST ACTUALLY FILTER. Returning every row regardless of `.eq()` does
            // not model PostgREST — it models a bug — and it made test A read as "ambiguous"
            // when the real query would have returned exactly one row. A fixture that ignores
            // the filter cannot prove anything about which filter was used.
            const all = fx.icps ?? [V4_ATTACHED, OLD_ACTIVE]
            const rows = all.filter(r => Object.entries(filters).every(([k, v]) => r[k] === v))
            return resolve({ data: rows, error: null })
          }
          return resolve({ data: [], error: null })
        }
        return q
      },
      rpc: async (fn: string) => { rec.rpcs.push(fn); return { data: null, error: null } },
    },
  }))
  vi.doMock('../routes/icps', () => ({
    runIcpJob: async (icpId: string, clientId: string, userId: string, maxLeads?: number, opts?: unknown) => {
      rec.runs.push({ icpId, clientId, userId, maxLeads, opts })
      if (fx.runThrows) throw fx.runThrows
      return fx.runResult ?? { inserted: 12, skipped: 3, relaxed: null }
    },
  }))
}

const load = async () => (await import('./programme-sourcing')).sourceProgramme

/**
 * EXECUTABLE LINES ONLY.
 *
 * ⚠️ EVERY BANNED-WORD SCAN BELOW MUST READ CODE, NOT PROSE. This file's own header explains
 * the `trial_bonus` defect and names Apollo, PDL and Hunter — so a scan of the raw source
 * fails on the comment that documents the fix. A guard that fires on its own explanation is
 * not a guard, it is a trap.
 */
const code = (src: string) => src.split('\n')
  .filter(l => { const t = l.trim(); return t && !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*') })
  .join('\n')

const SOURCE = () => code(readFileSync(join(__dirname, './programme-sourcing.ts'), 'utf8'))

afterEach(() => { vi.doUnmock('@kind/db'); vi.doUnmock('../routes/icps'); vi.resetModules() })

// ── A / B / O — THE PROGRAMME'S ICP WINS, AND `is_active` IS NEVER CONSULTED ───────────

describe('A/B/O · the programme picks its own targeting', () => {
  it('A · sources the ATTACHED ICP even though another ICP is the client-facing active one', async () => {
    const rec = fresh()
    harness({}, rec)                                   // v4 attached + inactive, old active
    const sourceProgramme = await load()
    const r = await sourceProgramme(PROGRAMME_ID)

    expect(r.ok, `refused: ${(r as { message?: string }).message}`).toBe(true)
    expect(rec.runs).toHaveLength(1)
    expect(rec.runs[0].icpId, 'the run did not use the programme-attached v4 ICP').toBe(V4_ID)
  })

  it('B · the client-facing ACTIVE African Retail-Tech ICP is never selected', async () => {
    const rec = fresh()
    harness({}, rec)
    const sourceProgramme = await load()
    await sourceProgramme(PROGRAMME_ID)
    expect(rec.runs.map(r => r.icpId), 'the old active audience was sourced').not.toContain(OLD_ID)
  })

  it('O · the ICP lookup filters on programme_id and NEVER on is_active', async () => {
    // ⛓️ THE GUARD ON THE ACTUAL DEFECT. `is_active` answers a question about the client's
    // screen; attachment answers the question about authority. Reverting this selection to
    // `is_active = true` is what this catches — behaviourally in A/B, and in the query here.
    const rec = fresh()
    harness({}, rec)
    const sourceProgramme = await load()
    await sourceProgramme(PROGRAMME_ID)

    expect(rec.icpFilters.length, 'the attached ICP was never looked up').toBeGreaterThan(0)
    for (const f of rec.icpFilters) {
      expect(f.programme_id, 'the ICP lookup is not anchored to the programme').toBe(PROGRAMME_ID)
      expect(Object.keys(f), 'the ICP lookup filters on is_active again').not.toContain('is_active')
    }
  })

  it('O2 · and the source says so — no `is_active` filter anywhere in this path', () => {
    const src = SOURCE()
    expect(src, 'programme-native sourcing selects on is_active again').not.toMatch(/eq\(\s*'is_active'/)
    expect(src, 'the ICP is no longer resolved through programme attachment').toMatch(/eq\(\s*'programme_id'/)
  })
})

// ── C / D / E — FAIL CLOSED ────────────────────────────────────────────────────────────

describe('C/D/E · it refuses rather than guessing', () => {
  it('C · no ICP attached to the programme → refuses, and runs nothing', async () => {
    const rec = fresh()
    harness({ icps: [OLD_ACTIVE] }, rec)          // an active ICP exists, but none is attached
    const sourceProgramme = await load()
    const r = await sourceProgramme(PROGRAMME_ID)
    expect(r.ok).toBe(false)
    expect((r as { reason: string }).reason).toBe('no_attached_icp')
    expect(rec.runs, 'it sourced despite having no attached targeting').toHaveLength(0)
  })

  it('C2 · TWO attached ICPs is ambiguity, not a choice to make on the founder\'s behalf', async () => {
    const rec = fresh()
    harness({ icps: [V4_ATTACHED, { ...V4_ATTACHED, id: 'icp-v5' }] }, rec)
    const sourceProgramme = await load()
    const r = await sourceProgramme(PROGRAMME_ID)
    expect(r.ok).toBe(false)
    expect((r as { reason: string }).reason).toBe('ambiguous_attached_icp')
    expect(rec.runs).toHaveLength(0)
  })

  it('C3 · an ICP attached to this programme but owned by ANOTHER client → refuses', async () => {
    const rec = fresh()
    harness({ icps: [{ ...V4_ATTACHED, client_id: 'someone-else' }] }, rec)
    const sourceProgramme = await load()
    const r = await sourceProgramme(PROGRAMME_ID)
    expect(r.ok).toBe(false)
    expect(rec.runs, 'it sourced across a client boundary').toHaveLength(0)
  })

  it('C4 · the programme does not exist → refuses', async () => {
    const rec = fresh()
    harness({ programme: null }, rec)
    const sourceProgramme = await load()
    const r = await sourceProgramme(PROGRAMME_ID)
    expect(r.ok).toBe(false)
    expect((r as { reason: string }).reason).toBe('programme_not_found')
    expect(rec.runs).toHaveLength(0)
  })

  it('C5 · the ICP lookup ERRORS → refuses loudly, never falls back to any other ICP', async () => {
    const rec = fresh()
    harness({ icpsErr: 'connection reset' }, rec)
    const sourceProgramme = await load()
    const r = await sourceProgramme(PROGRAMME_ID)
    expect(r.ok).toBe(false)
    expect(rec.runs).toHaveLength(0)
  })

  it('D · a programme with NO sourcing authority (DRAFT) → refuses', async () => {
    const rec = fresh()
    harness({ programme: { ...HOUSE_PROGRAMME, status: 'DRAFT' } }, rec)
    const sourceProgramme = await load()
    const r = await sourceProgramme(PROGRAMME_ID)
    expect(r.ok).toBe(false)
    expect((r as { reason: string }).reason).toBe('programme_not_sourcing_authorised')
    expect(rec.runs).toHaveLength(0)
  })

  it('D2 · P1 missing → refuses (no sourcing before the first payment or its internal twin)', async () => {
    const rec = fresh()
    harness({ programme: { ...HOUSE_PROGRAMME, first_paid_at: null, first_authorised_at: null } }, rec)
    const sourceProgramme = await load()
    const r = await sourceProgramme(PROGRAMME_ID)
    expect(r.ok).toBe(false)
    expect((r as { reason: string }).reason).toBe('first_payment_missing')
    expect(rec.runs).toHaveLength(0)
  })

  it('D3 · a PAUSED programme → refuses', async () => {
    const rec = fresh()
    harness({ programme: { ...HOUSE_PROGRAMME, paused_at: '2026-09-06T00:00:00.000Z' } }, rec)
    const sourceProgramme = await load()
    expect((await sourceProgramme(PROGRAMME_ID)).ok).toBe(false)
    expect(rec.runs).toHaveLength(0)
  })

  it('E · the sourcing ceiling is exhausted → refuses, and nothing runs', async () => {
    const rec = fresh()
    harness({ programme: { ...HOUSE_PROGRAMME, sourced_used: 2500 } }, rec)
    const sourceProgramme = await load()
    const r = await sourceProgramme(PROGRAMME_ID)
    expect(r.ok).toBe(false)
    expect((r as { reason: string }).reason).toBe('sourcing_ceiling_reached')
    expect(rec.runs).toHaveLength(0)
  })

  it('E2 · RESERVED volume counts against the ceiling too — it is not only what was used', async () => {
    const rec = fresh()
    harness({ programme: { ...HOUSE_PROGRAMME, sourced_used: 1500, sourced_reserved: 1000 } }, rec)
    const sourceProgramme = await load()
    expect((await sourceProgramme(PROGRAMME_ID)).ok).toBe(false)
    expect(rec.runs).toHaveLength(0)
  })
})

// ── QUANTITY — THE EXISTING MECHANISM, NEVER A NEW NUMBER ──────────────────────────────

describe('the batch size is the programme\'s own, not a number invented here', () => {
  it('asks for nextBatchSize(programme) — 250 with a full 2,500 ceiling', async () => {
    const rec = fresh()
    harness({}, rec)
    const sourceProgramme = await load()
    await sourceProgramme(PROGRAMME_ID)
    const { PROGRAMME_BATCH_SIZE } = await import('./programme')
    expect(rec.runs[0].maxLeads).toBe(PROGRAMME_BATCH_SIZE)
    expect(rec.runs[0].maxLeads).toBe(250)
  })

  it('and it SHRINKS to the remaining room rather than overrunning the ceiling', async () => {
    const rec = fresh()
    harness({ programme: { ...HOUSE_PROGRAMME, sourced_used: 2400 } }, rec)   // room = 100
    const sourceProgramme = await load()
    await sourceProgramme(PROGRAMME_ID)
    expect(rec.runs[0].maxLeads, 'the run asked for more than the ceiling allows').toBe(100)
  })

  it('no hard-coded quantity was introduced — the size comes from the shared constant', () => {
    const src = SOURCE()
    expect(src, 'the batch size is no longer the canonical programme mechanism').toMatch(/nextBatchSize\(/)
  })
})

// ── F / G — NO MINTED MONEY. THIS IS THE OTHER HALF OF THE BLOCKER. ────────────────────

describe('F/G · no trial credit, no fake wallet, no fake payment', () => {
  it('F · no trial credits are granted and no `trial_bonus` row is written', async () => {
    const rec = fresh()
    harness({}, rec)
    const sourceProgramme = await load()
    await sourceProgramme(PROGRAMME_ID)

    expect(rec.rpcs, 'the programme path grants first-run credits').not.toContain('grant_first_run_credits')
    const ledger = rec.inserts.filter(i => i.table === 'credit_transactions')
    expect(ledger, 'the programme path wrote a credit_transactions row').toHaveLength(0)
    const bodies = JSON.stringify(rec.inserts)
    expect(bodies).not.toContain('trial_bonus')
  })

  it('G · nothing is inserted or updated anywhere by this path — it only READS and delegates', async () => {
    const rec = fresh()
    harness({}, rec)
    const sourceProgramme = await load()
    await sourceProgramme(PROGRAMME_ID)
    expect(rec.inserts, `it wrote rows: ${JSON.stringify(rec.inserts)}`).toHaveLength(0)
    expect(rec.updates, `it updated rows: ${JSON.stringify(rec.updates)}`).toHaveLength(0)
  })

  it('G2 · and the source names none of the money machinery', () => {
    const src = SOURCE()
    for (const banned of ['grant_first_run_credits', 'trial_bonus', 'credit_balance', 'credit_transactions', 'stripe', 'Stripe', 'invoice']) {
      expect(src, `programme-native sourcing now touches ${banned}`).not.toContain(banned)
    }
  })
})

// ── H / I / J / K — THE PROVIDER BOUNDARY IS INHERITED, NOT RE-IMPLEMENTED ─────────────

describe('H/I/J/K · House stays Apollo-only, verified-only, no PDL, no Hunter', () => {
  it('every provider decision is delegated to runIcpJob — this path owns none of it', async () => {
    // ⚠️ THE HONEST FORM OF THIS PROOF. Apollo-only, verified-only, no-PDL and no-Hunter are
    // properties of `runIcpJob` and are proved against it in `house-apollo-only.test.ts`.
    // What must be true HERE is that this entry point cannot bypass them: it calls that job
    // and contains no provider machinery of its own.
    const src = SOURCE()
    expect(src, 'the programme path no longer goes through the canonical job').toMatch(/runIcpJob\(/)
    for (const banned of ['apollo', 'Apollo', 'pdl', 'PDL', 'hunter', 'Hunter', 'fetch(', 'searchPeople', 'contact_email_status']) {
      expect(src, `programme-native sourcing reaches for ${banned} itself`).not.toContain(banned)
    }
  })

  it('and the canonical job still resolves the audience strictly before any provider', () => {
    const icps = readFileSync(join(__dirname, '../routes/icps.ts'), 'utf8')
    expect(icps).toContain('const audience = await audienceForClientStrict(clientId)')
  })
})

// ── L / M / N — NO P2, NO LIVE, NO SEND ───────────────────────────────────────────────

describe('L/M/N · sourcing authorises nothing downstream', () => {
  it('L/M · P2 and Go-Live columns are never written, and the source never names them', async () => {
    const rec = fresh()
    harness({}, rec)
    const sourceProgramme = await load()
    await sourceProgramme(PROGRAMME_ID)
    expect(JSON.stringify(rec.updates)).not.toMatch(/second_authorised_at|second_paid_at|went_live_at|approved_at/)

    const src = SOURCE()
    for (const banned of ['second_authorised_at', 'second_paid_at', 'went_live_at', 'approved_at', 'goLiveProgramme', 'authoriseSecondInternal', 'approveProgramme']) {
      expect(src, `programme-native sourcing now touches ${banned}`).not.toContain(banned)
    }
  })

  it('N · no send/outreach path is named or triggered', async () => {
    const src = SOURCE()
    for (const banned of ['sendDue', 'send-due', 'figsy', 'Figsy', 'sendEmail', 'outreach', 'AUTO_OUTREACH_ENABLED', 'FIGSY_OPERATOR_SEND_ENABLED']) {
      expect(src, `programme-native sourcing now reaches the send path via ${banned}`).not.toContain(banned)
    }
  })

  it('the programme status is not advanced by sourcing — it is the job\'s business, not this door\'s', async () => {
    const rec = fresh()
    harness({}, rec)
    const sourceProgramme = await load()
    await sourceProgramme(PROGRAMME_ID)
    expect(rec.updates.filter(u => u.table === 'programmes')).toHaveLength(0)
  })
})

// ── THE RUN ITSELF ────────────────────────────────────────────────────────────────────

describe('what it hands to the canonical job', () => {
  it('runs for the PROGRAMME\'s client, never a client passed in from outside', async () => {
    const rec = fresh()
    harness({}, rec)
    const sourceProgramme = await load()
    await sourceProgramme(PROGRAMME_ID)
    expect(rec.runs[0].clientId).toBe(CLIENT_ID)
  })

  it('passes no proof-pass opts — a programme run must never consume a proof pass', async () => {
    const rec = fresh()
    harness({}, rec)
    const sourceProgramme = await load()
    await sourceProgramme(PROGRAMME_ID)
    expect(rec.runs[0].opts).toBeUndefined()
  })

  it('a refusal thrown by the job comes back as a refusal, not as a silent zero', async () => {
    const rec = fresh()
    harness({ runThrows: new Error('This programme is DRAFT, which carries no sourcing authority yet.') }, rec)
    const sourceProgramme = await load()
    const r = await sourceProgramme(PROGRAMME_ID)
    expect(r.ok).toBe(false)
    expect((r as { message: string }).message).toMatch(/no sourcing authority/)
  })

  it('a successful run reports what actually landed', async () => {
    const rec = fresh()
    harness({ runResult: { inserted: 7, skipped: 2, relaxed: null } }, rec)
    const sourceProgramme = await load()
    const r = await sourceProgramme(PROGRAMME_ID)
    expect(r).toMatchObject({ ok: true, programmeId: PROGRAMME_ID, clientId: CLIENT_ID, icpId: V4_ID, requested: 250, inserted: 7, skipped: 2 })
  })
})

// ── THE DOOR — a function nobody can press is not an entry path ────────────────────────

describe('the operator door', () => {
  const OPERATOR = code(readFileSync(join(__dirname, '../routes/operator.ts'), 'utf8'))

  /**
   * THE BODY OF ONE ROUTE, bounded by the next route declaration.
   *
   * ⚠️ NOT A FIXED-SIZE SLICE. `slice(at, at + 2600)` ran past the end of this route and into
   * `/nexus`, so an assertion about THIS handler was reading a different one's code. A window
   * is not a boundary.
   */
  const routeBody = (decl: string) => {
    const at = OPERATOR.indexOf(decl)
    expect(at, `route ${decl} not found`).toBeGreaterThan(-1)
    const rest = OPERATOR.slice(at + decl.length)
    const next = rest.indexOf('operatorRouter.')
    return rest.slice(0, next > -1 ? next : rest.length)
  }

  it('a programme-native operator route exists', () => {
    expect(OPERATOR).toMatch(/operatorRouter\.post\(\s*'\/programme\/source'/)
  })

  it('it starts from an explicit programme id — never inferred from a client', () => {
    const body = routeBody("operatorRouter.post('/programme/source'")
    expect(body).toMatch(/programme_id/)
    expect(body, 'the route now guesses the programme from a client').not.toMatch(/openProgrammeFor|requireClient/)
  })

  it('it refuses without programme_id, and refuses without an explicit confirm', () => {
    const body = routeBody("operatorRouter.post('/programme/source'")
    expect(body).toMatch(/if \(!programme_id/)
    expect(body).toMatch(/confirm !== true/)
  })

  it('it delegates to sourceProgramme — it does not re-implement selection or authority', () => {
    const body = routeBody("operatorRouter.post('/programme/source'")
    expect(body).toMatch(/sourceProgramme\(programme_id\)/)
    expect(body, 'the door selects ICPs itself again').not.toMatch(/from\('icps'\)/)
    expect(body, 'the door calls the job directly, bypassing programme resolution').not.toMatch(/runIcpJob\(/)
  })

  it('🛑 the EXISTING /operator/source route is untouched — this fix added a door, it did not change one', () => {
    // Scope guard. The old route still selects on `is_active`, which is correct for what it is
    // (an operator top-up for a client's live targeting). Changing it was never the fix, and
    // silently changing it here would alter behaviour for every non-programme client.
    expect(routeBody("operatorRouter.post('/source'")).toMatch(/eq\('is_active', true\)/)
  })
})
