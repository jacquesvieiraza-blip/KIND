import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

// ── BUILD-002 GPT CLOSURE — the four evidence gaps ───────────────────────────────────────
//
// Each block below is a gap the verification named, and each one is proved by a test that
// FAILS if the guard is removed. Two of the four were real gaps in the first submission and
// are patched here; the assertions are what stop them coming back.

const REPO = join(__dirname, '../../../..')
const SQL = readFileSync(join(REPO, 'supabase/migrations/20260828_programme_money_engine.sql'), 'utf8')
const RUNNER = readFileSync(join(REPO, 'apps/api/src/lib/pending-migrations.ts'), 'utf8')
const START_WORK = readFileSync(join(__dirname, 'start-work.ts'), 'utf8')
const AUTHORITY = readFileSync(join(__dirname, 'programme-authority.ts'), 'utf8')
const STRIPE_ROUTE = readFileSync(join(__dirname, '../routes/stripe.ts'), 'utf8')
const PROG_ROUTE = readFileSync(join(__dirname, '../routes/programme.ts'), 'utf8')
const ICPS = readFileSync(join(__dirname, '../routes/icps.ts'), 'utf8')

const exec = SQL.split('\n').filter(l => !l.trim().startsWith('--')).join('\n')

// ═════════════════════════════════════════════════════════════════════════════════════════
// GAP 2 · CONTROLLED ~250 BATCHES
// ═════════════════════════════════════════════════════════════════════════════════════════
//
// ⚠️ THIS WAS A REAL GAP IN THE FIRST SUBMISSION, AND THE VERIFICATION NAMED IT EXACTLY:
// "do not confuse total programme ceiling with per-batch execution control."
//
// The gate granted `LEAST(p_requested, remaining_ceiling)`. A request for 2,500 against a
// 2,500 ceiling was granted 2,500 — the entire programme executed in ONE batch. The ceiling
// was enforced; controlled batching was not. `nextBatchSize` existed but was only a read-out
// on the operator screen, so nothing stopped a caller asking for more.
//
// It matters beyond tidiness: "material quality/performance problems pause further batches"
// (founder lock 4) has nothing left to pause if the whole programme already went out.
describe('GAP 2 · a single grant can never exceed the controlled batch size', () => {
  it('the batch cap is a declared constant inside the gate, not a caller convention', () => {
    expect(exec).toMatch(/v_batch_cap\s+int\s+:= 250;/)
  })

  it('⚠️ THE GRANT IS LEAST(requested, room, BATCH CAP) — all three, not just the ceiling', () => {
    // Remove `v_batch_cap` from this LEAST and a 2,500-record request is granted in full.
    expect(exec).toMatch(/v_granted := LEAST\(p_requested, COALESCE\(v_room, 0\), v_batch_cap\);/)
  })

  it('the cap is bounded by the ceiling too — the last batch is the remainder, not 250', () => {
    // `v_room` stays in the LEAST, so a programme with 100 authority left grants 100, never
    // 250. Controlled batching must not become a way to exceed the ceiling.
    expect(exec).toMatch(/GREATEST\(0, sourcing_ceiling - sourced_used - sourced_reserved\) INTO v_room/)
  })

  it('⚠️ BOTH MIGRATION HOMES CARRY THE CAP — the runner is what actually executes', () => {
    // The canonical .sql is the record; PENDING_MIGRATIONS is what the product applies. A cap
    // in only one of them is a cap that does not exist in production.
    expect(RUNNER).toContain('v_batch_cap    int     := 250;')
    expect(RUNNER).toContain('v_granted := LEAST(p_requested, COALESCE(v_room, 0), v_batch_cap);')
  })

  it('worked: 1,000 requested against a 2,500 ceiling grants 250, and the ceiling is untouched', () => {
    // The arithmetic the SQL performs, evaluated here so the expectation is legible.
    const grant = (requested: number, ceiling: number, used: number, reserved: number, cap = 250) =>
      Math.min(requested, Math.max(0, ceiling - used - reserved), cap)
    expect(grant(1000, 2500, 0, 0)).toBe(250)      // the gap: this was 1000
    expect(grant(2500, 2500, 0, 0)).toBe(250)      // the gap: this was 2500
    expect(grant(250, 2500, 2250, 0)).toBe(250)    // last full batch
    expect(grant(250, 2500, 2400, 0)).toBe(100)    // remainder, NOT 250 — ceiling still wins
    expect(grant(250, 2500, 2500, 0)).toBe(0)      // exhausted
    expect(grant(250, 2500, 2300, 200)).toBe(0)    // reserved counts against the ceiling
  })

  it('ten batches are needed to consume a 10-meeting programme — that is the control', () => {
    let used = 0, batches = 0
    while (used < 2500 && batches < 100) { used += Math.min(250, 2500 - used); batches++ }
    expect(batches).toBe(10)
  })
})

// ═════════════════════════════════════════════════════════════════════════════════════════
// GAP 3 · GO-LIVE BYPASS
// ═════════════════════════════════════════════════════════════════════════════════════════
//
// Every executable path to SENDING for a programme client. Two families exist:
//
//   ① `ensureCampaignForIcp(..., { activate: true })` — the ONLY code that writes
//      `status: 'active'` on a campaign. Five call sites reach it.
//   ② `startWorkForClient` — ONE executable caller, the legacy payment webhook, which is
//      the "money arrived → start sourcing" coupling the programme model breaks.
//
// ⚠️ THE GATE GOES IN ① BECAUSE IT IS THE DOOR, NOT THE CALLERS. Gating five callers is the
// shape AR8 already proved fails: `lookalike/generate` had no fence for months precisely
// because it was the caller nobody remembered.
describe('GAP 3 · no programme client reaches sending before Go Live', () => {
  // ⛓️ REWRITTEN 29 Aug (BUILD-003 PR2). These three assertions used to pin the SHAPE OF THE
  // INLINE GATE'S SOURCE inside start-work.ts — `if (activate) { ... from('programmes')`,
  // `if (p.paused_at)`, `if (progErr)`. That gate was a SECOND COPY of a rule
  // `programme.ts` already exported and nothing consumed, and PR2 replaced it with one
  // action-aware module. Pinning a regex to a deleted `if` would have made this file fail for
  // the right reason and the wrong cause, and "restore the duplicate" would have been the
  // obvious way to make it pass — the exact wrong lesson.
  //
  // What matters has not changed and is still asserted: the gate fires on the ACTIVATE path
  // only, and it refuses when paused, when not live/paid, and when the state cannot be read.
  // The BEHAVIOUR of each of those refusals is proved against the real decision function in
  // `programme-authority.test.ts`; what is proved HERE is that start-work CONSUMES it.
  it('the gate is inside ensureCampaignForIcp, on the activate path only', () => {
    expect(START_WORK).toMatch(/if \(activate\) \{[\s\S]{0,1200}checkProgrammeAuthority\(/)
    // Scaffolding stays open: `activate: false` creates a draft, which sends nothing.
    // Blocking it would stop Milla persisting a client's ICP at all.
    expect(START_WORK).toMatch(/if \(!activate\)[\s\S]{0,400}'draft'/)
  })

  it('⚠️ NOT LIVE, NOT PAID, OR PAUSED — all three still refuse, through the one module', () => {
    // OUTREACH is the action that requires approval + Payment 2 + LIVE. Asking for SOURCING
    // here would let a Payment-1 programme activate a sending campaign.
    expect(START_WORK).toMatch(/checkProgrammeAuthority\(clientId, 'OUTREACH'\)/)
    expect(START_WORK).toMatch(/programme_paused/)
    expect(START_WORK).toMatch(/programme_not_live/)
  })

  it('⚠️ A READ ERROR REFUSES TOO — not knowing is not the same as knowing it is fine', () => {
    // The cost of a wrong refusal is a delayed campaign. The cost of a wrong activation is
    // sending on a programme nobody paid for. `programme_unresolvable` is the module's name
    // for "could not read"; it maps onto this function's existing refusal vocabulary.
    expect(START_WORK).toMatch(/programme_unresolvable[\s\S]{0,200}programme_state_unreadable/)
  })

  it('⚠️ THE ONE startWorkForClient CALLER REFUSES A PROGRAMME CLIENT AT THE DOOR', () => {
    // The sourcing gate would already refuse their PDL spend — but `startWorkForClient` also
    // reaches campaign activation, and relying on a downstream refusal to protect an upstream
    // door is exactly how the AR8 hole survived.
    expect(STRIPE_ROUTE).toMatch(/PROGRAMME CLIENTS DO NOT START WORK FROM A LEGACY PAYMENT/)
    // ⛓️ 28 Aug WALKTHROUGH FIX — the destructure now reads the error too. This assertion
    // pinned the `{ data: openProg }` form and correctly went red when the fail-closed
    // error branch was added, which is the test doing its job. Reasoning:
    // `programme-walkthrough-fix.test.ts` DEFECT 2.
    expect(STRIPE_ROUTE).toMatch(/const \{ data: openProg, error: progErr \}[\s\S]{0,200}from\('programmes'\)/)
    expect(STRIPE_ROUTE).toMatch(/if \(openProg\)[\s\S]{0,900}did NOT start work/)
    // and the refusal happens BEFORE the import that starts work
    const gateAt = STRIPE_ROUTE.indexOf('const { data: openProg, error: progErr }')
    const startAt = STRIPE_ROUTE.indexOf("const { startWorkForClient } = await import")
    expect(gateAt).toBeGreaterThan(0)
    expect(gateAt, 'the programme check must come BEFORE startWorkForClient is imported').toBeLessThan(startAt)
  })

  it('⚠️ THE CALLER CAN TELL THE TWO REFUSALS APART — money problem vs scheduling problem', () => {
    // "You already have a live campaign" is fixable in a minute. "This programme has not been
    // paid for" must not be worked around. One sentence for both is how someone tries the
    // wrong fix.
    expect(ICPS).toMatch(/if \('reason' in r\)[\s\S]{0,160}refusal: r\.reason/)
  })

  it('there is still exactly ONE executable startWorkForClient caller', () => {
    // If a second appears, this gate has to be repeated — and the count is how anyone finds out.
    const callers = (STRIPE_ROUTE.match(/await startWorkForClient\(/g) ?? []).length
    expect(callers).toBe(1)
  })
})

// ═════════════════════════════════════════════════════════════════════════════════════════
// GAP 4 · STRIPE IDENTIFIERS AND THE CHECKOUT EMAIL
// ═════════════════════════════════════════════════════════════════════════════════════════
describe('GAP 4 · payment identifiers persist, and a missing email fails closed', () => {
  it('A · session ids are stored and are the unique idempotency key', () => {
    expect(exec).toMatch(/first_payment_ref\s+text/)
    expect(exec).toMatch(/second_payment_ref\s+text/)
    expect(exec).toMatch(/programmes_first_ref_uidx[\s\S]{0,120}WHERE first_payment_ref IS NOT NULL/)
    expect(exec).toMatch(/programmes_second_ref_uidx[\s\S]{0,120}WHERE second_payment_ref IS NOT NULL/)
  })

  it('B · payment INTENT ids are stored separately — refunds and disputes key on them', () => {
    // #317 already had to resolve a session from an intent. Storing only the session would
    // make a chargeback unattributable to its programme.
    expect(exec).toMatch(/first_payment_intent_id\s+text/)
    expect(exec).toMatch(/second_payment_intent_id\s+text/)
    expect(STRIPE_ROUTE).toMatch(/const rawIntent = \(session as unknown as \{ payment_intent\?: unknown \}\)\.payment_intent/)
    expect(STRIPE_ROUTE).toMatch(/paymentIntentId: intentId/)
  })

  it('⚠️ C · A MISSING CONTACT EMAIL REFUSES THE CHECKOUT — it was `?? \'\'` and that is fail-OPEN', () => {
    // Stripe accepts a session with no customer_email, so a blank string does not error: the
    // checkout would be created, the operator would hand over a link, and the client would
    // never get a receipt at an address we hold.
    expect(PROG_ROUTE).toMatch(/async function clientEmailOrRefuse/)
    expect(PROG_ROUTE).toMatch(/typeof email !== 'string' \|\| email\.trim\(\) === ''/)
    expect(PROG_ROUTE).not.toMatch(/contact_email \?\? ''/)
    // both stages use it, and both return early
    expect((PROG_ROUTE.match(/const email = await clientEmailOrRefuse\(p\.client_id, res\)/g) ?? []).length).toBe(2)
    expect((PROG_ROUTE.match(/if \(email === null\) return/g) ?? []).length).toBe(2)
  })

  it('a read error on the client row also refuses', () => {
    expect(PROG_ROUTE).toMatch(/if \(error\)[\s\S]{0,220}Could not read the client record/)
  })
})

// ═════════════════════════════════════════════════════════════════════════════════════════
// GAP 1 · WHY BUILD-002 CANNOT CAUSE THE kind-owns-go FAILURE
// ═════════════════════════════════════════════════════════════════════════════════════════
//
// The failing assertion was `res.body.sourcing === true`, receiving `undefined`. `undefined`
// means the route returned its 500 body (`{success:false,error:...}`), which has no
// `sourcing` key — i.e. the handler threw.
//
// Every line BUILD-002 added to `icps.ts` is inside `runIcpJob`. The activate route does not
// await it: `started` is assigned first, `runIcpJob(...)` is called fire-and-forget with a
// `.catch`, and `res.json({... sourcing: started ...})` runs on the synchronous continuation.
// So no BUILD-002 code can execute before `sourcing` is computed, and nothing in it can
// reach the route's catch.
//
// ⚠️ THAT IS AN ARGUMENT ABOUT STRUCTURE, SO IT IS PINNED AS STRUCTURE. If someone later
// awaits `runIcpJob` here, the argument silently stops holding — and this test goes red.
describe('GAP 1 · the activate route computes `sourcing` independently of the job', () => {
  // ⛓️ 1 Sep — PATTERN UPDATED, INTENT UNCHANGED AND NOW STRICTER. This assertion went red
  // on the fire-and-forget ownership fix, and it was RIGHT to: the call site literally
  // changed shape. The claim it defends — *the activate route does not await the job* — is
  // exactly what that fix preserves, so the regex is widened to accept the wrapper and the
  // forbidden forms are widened with it. **This guard caught a real edit to the line it
  // guards, which is the system working rather than a test to relax.**
  it('⚠️ runIcpJob IS NOT AWAITED BY THE ACTIVATE ROUTE — fire-and-forget with a .catch', () => {
    expect(ICPS).toMatch(
      /started = true\n\s*(?:trackBackground\()?runIcpJob\(req\.params\.id, clientId, ownerUserId[^\n]*\)\n\s*\.catch\(/,
    )
    expect(ICPS, 'awaiting it would put every runIcpJob failure into the route response')
      .not.toMatch(/started = true\n\s*await runIcpJob\(/)
    // The wrapper must not become a blocking await either — same harm, new spelling.
    expect(ICPS, 'awaiting the tracked job blocks the response just as awaiting the job would')
      .not.toMatch(/started = true\n\s*await trackBackground\(/)
  })

  it('`sourcing` is the local flag, assigned before the job is called', () => {
    const started = ICPS.indexOf('started = true')
    const call = ICPS.indexOf('runIcpJob(req.params.id, clientId, ownerUserId')
    expect(started).toBeGreaterThan(0)
    expect(started, '`started` must be set BEFORE the job is dispatched').toBeLessThan(call)
    expect(ICPS).toMatch(/res\.json\(\{ success: true, data, sourcing: started/)
  })

  it('every BUILD-002 edit to icps.ts sits inside runIcpJob, behind that boundary', () => {
    const jobStart = ICPS.indexOf('export async function runIcpJob')
    const routeStart = ICPS.indexOf("res.json({ success: true, data, sourcing: started")
    for (const marker of [
      'const programmeId = (icp as { programme_id?: string | null }).programme_id ?? null',
      'programmeBatch = await openBatch(programmeId, pdlRemainder, grantedSize)',
      'settleBatch(programmeBatch.id, returnedCount)',
    ]) {
      const at = ICPS.indexOf(marker)
      expect(at, `not found: ${marker}`).toBeGreaterThan(0)
      expect(at, `${marker} must be inside runIcpJob`).toBeGreaterThan(jobStart)
      expect(at, `${marker} must not be in the activate handler`).toBeLessThan(routeStart)
    }
  })
})

// ── the gates behave, not just exist ────────────────────────────────────────────────────
const dbState: { programmes: Record<string, unknown>[]; campaigns: Record<string, unknown>[] } = {
  programmes: [], campaigns: [],
}
vi.mock('@kind/db', () => ({
  db: {
    from: (t: string) => {
      const rows = t === 'programmes' ? dbState.programmes : dbState.campaigns
      const filters: Array<(r: Record<string, unknown>) => boolean> = []
      const q: Record<string, unknown> = {
        select() { return q }, order() { return q }, limit() { return q },
        eq(c: string, v: unknown) { filters.push(r => r[c] === v); return q },
        not(c: string, _o: string, list: string) {
          const set = list.replace(/[()]/g, '').split(',')
          filters.push(r => !set.includes(String(r[c]))); return q
        },
        async maybeSingle() { return { data: rows.filter(r => filters.every(f => f(r)))[0] ?? null, error: null } },
        // ⚠️ THE WRITE SIDE IS MOCKED TOO, DELIBERATELY. Without it the two NON-VACUOUS
        // cases below reach the real campaign insert, throw, and fall into the function's
        // own fail-closed catch — which would look like the gate refusing them when in fact
        // the gate let them through. A test that cannot tell those apart proves nothing.
        insert(payload: Record<string, unknown>) {
          const row = { id: `camp-${rows.length + 1}`, ...payload }
          rows.push(row)
          return { select: () => ({ single: async () => ({ data: row, error: null }) }) }
        },
        update() { return { eq: async () => ({ error: null }) } },
      }
      return q
    },
  },
}))

describe('GAP 3 · behavioural — ensureCampaignForIcp actually refuses', () => {
  beforeEach(() => { dbState.programmes = []; dbState.campaigns = [] })

  it('refuses to activate for a programme that has not gone live', async () => {
    dbState.programmes.push({ id: 'p1', client_id: 'c1', status: 'APPROVED', second_paid_at: null, paused_at: null })
    const { ensureCampaignForIcp } = await import('./start-work')
    const r = await ensureCampaignForIcp('c1', 'icp-1', 'ICP', { activate: true })
    expect('refused' in r && r.refused).toBeTruthy()
    expect((r as { refused: { reason: string } }).refused.reason).toBe('programme_not_live')
  })

  it('refuses to activate for a PAUSED live programme — pause stops sending too', async () => {
    dbState.programmes.push({ id: 'p1', client_id: 'c1', status: 'LIVE', second_paid_at: 'x', paused_at: 'now' })
    const { ensureCampaignForIcp } = await import('./start-work')
    const r = await ensureCampaignForIcp('c1', 'icp-1', 'ICP', { activate: true })
    expect((r as { refused: { reason: string } }).refused.reason).toBe('programme_paused')
  })

  it('⚠️ NON-VACUOUS: a LIVE, PAID programme is NOT refused by this gate', async () => {
    // Without this the three tests above would all pass on a function that refuses everything.
    //
    // ⛓️ `approved_at` and `second_payment_ref` ADDED 29 Aug (BUILD-003 PR2), and the addition
    // is a real TIGHTENING rather than fixture maintenance. The old inline gate read status,
    // pause and `second_paid_at` only — so a programme that reached LIVE and was paid for
    // WITHOUT AN APPROVAL ROW would have activated a sending campaign. "One programme
    // approval" is a founder lock, not a side effect of the status column, so the canonical
    // gate checks it and this fixture now has to be a genuinely complete programme to pass.
    dbState.programmes.push({ id: 'p1', client_id: 'c1', status: 'LIVE', second_paid_at: 'x',
      second_payment_ref: 'cs_2', approved_at: 'x', first_paid_at: 'x', paused_at: null })
    const { ensureCampaignForIcp } = await import('./start-work')
    const r = await ensureCampaignForIcp('c1', 'icp-1', 'ICP', { activate: true })
    const reason = (r as { refused?: { reason?: string } }).refused?.reason
    expect(reason, 'a live paid programme must pass the programme gate').toBeUndefined()
  })

  it('⚠️ NON-VACUOUS: a LEGACY client (no programme) is NOT refused by this gate', async () => {
    // The legacy model must keep working. If this gate refused everyone, every existing
    // client would stop sending the moment it merged.
    const { ensureCampaignForIcp } = await import('./start-work')
    const r = await ensureCampaignForIcp('legacy-client', 'icp-1', 'ICP', { activate: true })
    const reason = (r as { refused?: { reason?: string } }).refused?.reason
    expect(reason).toBeUndefined()
  })

  it('scaffolding (activate:false) is never gated — a draft sends nothing', async () => {
    dbState.programmes.push({ id: 'p1', client_id: 'c1', status: 'DRAFT', second_paid_at: null, paused_at: null })
    const { ensureCampaignForIcp } = await import('./start-work')
    const r = await ensureCampaignForIcp('c1', 'icp-1', 'ICP')
    const reason = (r as { refused?: { reason?: string } }).refused?.reason
    expect(reason, 'blocking the draft would stop Milla persisting an ICP at all').toBeUndefined()
  })
})

// ═════════════════════════════════════════════════════════════════════════════════════════
// GAP 4D · DEPLOYMENT ORDER
// ═════════════════════════════════════════════════════════════════════════════════════════
//
// ⚠️ THE FIRST SUBMISSION SAID "API FIRST, MIGRATION SECOND". THAT WAS WRONG AND WOULD HAVE
// TAKEN THE PRODUCT DOWN. API-first deploys code that:
//   ① calls `try_spend_sourcing` with THREE arguments against a two-argument function —
//      PostgREST returns "function not found", the caller reads a non-number, and every
//      legacy client's sourcing silently grants 0; and
//   ② reads `public.programmes` inside `ensureCampaignForIcp` on the activate path for EVERY
//      client — a missing table sets the error branch, and the new fail-closed logic then
//      refuses every campaign activation, legacy clients included.
//
// Migration-first is safe in both directions, which is the property these assertions pin.
describe('GAP 4D · migration-first, and the code proves why', () => {
  it('the API really does call the gate with three arguments', () => {
    // ① — if this is true, the function must exist with three parameters before deploy.
    expect(ICPS).toMatch(/p_programme_id: programmeId/)
  })

  it('the API really does read `programmes` on the activate path for EVERY client', () => {
    // ② — the read is not inside a "if this client has a programme" branch; it IS that check.
    //
    // ⛓️ REPOINTED 29 Aug (BUILD-003 PR2). The `programmes` read moved out of start-work into
    // `programme-authority.ts` when the duplicated gate was collapsed into one module, so this
    // now asserts the same fact one level down: start-work calls the gate unconditionally on
    // the activate path, and the gate is what reads `programmes` for EVERY client.
    expect(START_WORK).toMatch(/if \(activate\) \{[\s\S]{0,1200}checkProgrammeAuthority\(/)
    expect(AUTHORITY).toMatch(/from\('programmes'\)/)
    expect(START_WORK).toMatch(/if \(!verdict\.allowed\)[\s\S]{0,600}return \{ refused/)
  })

  it('⚠️ THE TWO-ARG OVERLOAD IS DROPPED — so an old API\'s two-arg call is not ambiguous', () => {
    // With both a two-arg function and a three-arg defaulted one present, a two-argument
    // call is PostgreSQL's documented ambiguity case — a hard error on the live money path.
    // One function with a default resolves cleanly for BOTH the old and new API.
    expect(exec).toMatch(/DROP FUNCTION IF EXISTS public\.try_spend_sourcing\(uuid, int\);/)
    expect(exec).toMatch(/p_programme_id uuid DEFAULT NULL/)
    expect(RUNNER).toContain('DROP FUNCTION IF EXISTS public.try_spend_sourcing(uuid, int);')
  })

  it('the deployment order is written where the person running it will read it', () => {
    // A deploy order that lives only in a PR body is a deploy order nobody has at 2am.
    expect(SQL).toMatch(/DEPLOYMENT ORDER: RUN THIS MIGRATION \*\*BEFORE\*\* DEPLOYING THE API/)
    expect(RUNNER).toMatch(/RUN THIS BEFORE DEPLOYING THE API/)
  })
})
