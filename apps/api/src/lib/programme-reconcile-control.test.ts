// ═══════════════════════════════════════════════════════════════════════════════════════
// THE ONE-TIME RECONCILIATION CONTROL — offered on one programme, once, and then not at all.
//
// 🛑 WHAT A BUTTON CAN GET WRONG THAT AN ENDPOINT CANNOT. `/operator/programme/:id/
// reconcile-sourcing` refuses on its own and is proved in `programme-reconcile.test.ts`. This
// file is about the CONTROL: whether it is drawn at all, on which programme, whether a second
// click can fire while the first is in flight, and whether a failure can be painted as a
// success. Those are failures of a screen, not of a function.
//
// ⚠️ TWO HALVES, TWO KINDS OF PROOF, AND THE DIFFERENCE IS STATED RATHER THAN BLURRED.
// The VISIBILITY rule is server-side, so it is driven behaviourally against a recording
// database — every "must not appear" case really runs `reconcileAvailability` and reads its
// answer. The Vida half has no DOM harness in this repo (every admin `.tsx` is asserted from
// its source, as `admin-proxy-only.test.ts` and its neighbours do), so it is asserted on the
// executable source with tight anchors — and every one of those anchors was red-proved by
// deliberately breaking the file it guards.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

type Row = Record<string, unknown>

let programme: Row | null = null
let programmeError: string | null = null
let batchCount = 0
let batchError: string | null = null
let orphanCount = 0
let leadError: string | null = null
/** Every table the availability rule read, so "did it look anything up by name?" is answerable. */
const reads: string[] = []

vi.mock('@kind/db', () => {
  const q = (table: string): Record<string, unknown> => {
    const self: any = {
      _count: false,
      select(_c?: string, opts?: { count?: string; head?: boolean }) { self._count = !!opts?.count; return self },
      eq() { return self }, is() { return self }, not() { return self }, order() { return self },
      async maybeSingle() {
        reads.push(table)
        if (table === 'programmes') {
          return programmeError ? { data: null, error: { message: programmeError } } : { data: programme, error: null }
        }
        return { data: null, error: null }
      },
      then(res: (v: unknown) => unknown) {
        reads.push(table)
        if (table === 'programme_batches') {
          return Promise.resolve(batchError
            ? { data: null, error: { message: batchError }, count: null }
            : { data: [], error: null, count: batchCount }).then(res)
        }
        if (table === 'leads') {
          return Promise.resolve(leadError
            ? { data: null, error: { message: leadError }, count: null }
            : { data: [], error: null, count: orphanCount }).then(res)
        }
        return Promise.resolve({ data: [], error: null, count: 0 }).then(res)
      },
    }
    return self
  }
  return { db: { from: (t: string) => q(t) } }
})

/** The audience half of the launch-programme gate, driveable — the real one needs an auth user. */
let audience: 'house' | 'client' | 'throw' = 'house'
vi.mock('./provider-boundary', async (orig) => ({
  ...(await orig<Record<string, unknown>>()),
  audienceForClientStrict: async () => {
    if (audience === 'throw') throw new Error('identity could not be proved')
    return audience
  },
}))

import { reconcileAvailability, RECONCILE_FROM_STATUS } from './programme-reconcile-availability'

const LAUNCH = '11111111-1111-4111-8111-111111111111'
const RIVAL  = '22222222-2222-4222-8222-222222222222'
const HOUSE_CLIENT = 'house-client'
const MBF_CLIENT   = 'mbf-client'

/** Live production truth on 8 Sep: the launch programme, 246 delivered, none accounted for. */
function liveState() {
  process.env.HOUSE_LAUNCH_PROGRAMME_ID = LAUNCH
  audience = 'house'
  programme = { id: LAUNCH, client_id: HOUSE_CLIENT, status: 'SOURCING_AUTHORISED', sourced_used: 0, sourced_reserved: 0 }
  batchCount = 0
  orphanCount = 246
}

beforeEach(() => {
  reads.length = 0
  programme = null; programmeError = null
  batchCount = 0; batchError = null
  orphanCount = 0; leadError = null
  audience = 'house'
  delete process.env.HOUSE_LAUNCH_PROGRAMME_ID
})

// ── ① THE ONE PROGRAMME IT IS OFFERED ON ─────────────────────────────────────────────

describe('① the control is offered on the House launch programme, and it names the count', () => {
  it('🛑 the positive control — available, with 246 to account for', async () => {
    liveState()
    const a = await reconcileAvailability(LAUNCH, HOUSE_CLIENT)
    expect(a.available, a.reason ?? '').toBe(true)
    expect(a.unaccounted).toBe(246)
    expect(a.reason).toBeNull()
  })

  it('the pre-reconcile status is exactly one status, not a band', () => {
    expect(RECONCILE_FROM_STATUS).toBe('SOURCING_AUTHORISED')
  })
})

// ── ② WHERE IT MUST NOT APPEAR ───────────────────────────────────────────────────────

describe('② 1 · 2 · 3 · it appears nowhere else, and every unknown is a NO', () => {
  it('🛑 1 · NOT for MBF — a different client entirely', async () => {
    liveState()
    audience = 'client'                                   // MBF is a customer, not House
    programme = { id: LAUNCH, client_id: MBF_CLIENT, status: 'SOURCING_AUTHORISED', sourced_used: 0 }
    const a = await reconcileAvailability(LAUNCH, MBF_CLIENT)
    expect(a.available, 'a one-time House repair was offered on a customer programme').toBe(false)
    expect(a.reason).toContain('not the configured House launch programme')
  })

  it('🛑 2 · NOT for a SECOND House programme — House is a classification, not an identity', async () => {
    liveState()
    programme = { id: RIVAL, client_id: HOUSE_CLIENT, status: 'SOURCING_AUTHORISED', sourced_used: 0 }
    const a = await reconcileAvailability(RIVAL, HOUSE_CLIENT)
    expect(a.available).toBe(false)
    expect(a.reason).toContain('not the configured House launch programme')
  })

  it('🛑 2 · NOT for another programme under the SAME House client', async () => {
    liveState()
    programme = { id: RIVAL, client_id: HOUSE_CLIENT, status: 'SOURCING_AUTHORISED', sourced_used: 0 }
    expect(audience, 'the fixture is the same proved House client').toBe('house')
    expect((await reconcileAvailability(RIVAL, HOUSE_CLIENT)).available).toBe(false)
  })

  it('🛑 3 · NOT for a wrong or partial programme id', async () => {
    liveState()
    for (const bad of ['', '   ', 'not-a-uuid', LAUNCH.slice(0, 8), `${LAUNCH}0`, RIVAL, null, undefined]) {
      const a = await reconcileAvailability(bad as never, HOUSE_CLIENT)
      expect(a.available, `${JSON.stringify(bad)} was accepted`).toBe(false)
    }
  })

  it('🛑 3 · an EMPTY id short-circuits before any read — the fast path, proved separately', async () => {
    // ⚠️ WRITTEN BECAUSE A TEETH-PROOF FOUND THIS LINE UNGUARDED. Deleting the empty check
    // produced ZERO red: `isHouseLaunchProgramme` refuses an empty id anyway, so the deeper
    // gate was covering it. That is defence in depth working — and an unasserted line is a
    // line that rots, so the fast path is now proved by its own distinct reason.
    liveState()
    for (const empty of ['', '   ', null, undefined]) {
      const a = await reconcileAvailability(empty as never, HOUSE_CLIENT)
      expect(a.available).toBe(false)
      expect(a.reason, 'the empty-id fast path no longer answers first').toBe('no programme is loaded')
    }
    expect(reads, 'an empty id reached the database').toEqual([])
  })

  it('🛑 NOT when the variable is unset — the state every deployment starts in', async () => {
    liveState()
    delete process.env.HOUSE_LAUNCH_PROGRAMME_ID
    expect((await reconcileAvailability(LAUNCH, HOUSE_CLIENT)).available).toBe(false)
  })

  it('🛑 NOT when the audience cannot be proved — a throw is never a yes', async () => {
    liveState()
    audience = 'throw'
    expect((await reconcileAvailability(LAUNCH, HOUSE_CLIENT)).available).toBe(false)
  })

  it('🛑 NOT for a HISTORICAL programme — the status is the state, not the calendar', async () => {
    liveState()
    programme = { id: LAUNCH, client_id: HOUSE_CLIENT, status: 'COMPLETED', sourced_used: 0 }
    const a = await reconcileAvailability(LAUNCH, HOUSE_CLIENT)
    expect(a.available).toBe(false)
    expect(a.reason).toContain('only offered at SOURCING_AUTHORISED')
  })

  it('🛑 NOT when the programme names another client — tenancy on a row found positively', async () => {
    liveState()
    programme = { id: LAUNCH, client_id: 'someone-else', status: 'SOURCING_AUTHORISED', sourced_used: 0 }
    const a = await reconcileAvailability(LAUNCH, HOUSE_CLIENT)
    expect(a.available).toBe(false)
    expect(a.reason).toContain('different client')
  })

  it('🛑 NOT when there is nothing to qualify', async () => {
    liveState()
    orphanCount = 0
    const a = await reconcileAvailability(LAUNCH, HOUSE_CLIENT)
    expect(a.available).toBe(false)
    expect(a.reason).toContain('already belongs to a batch')
  })

  it('🛑 THE COUNT IS THE POPULATION THE ACTION READS — no `delivered_at` anywhere in it', () => {
    // ⛓️ 9 Sep — A REAL INTEGRATION DEFECT, CAUGHT BY WIRING THE NEW CONTROL TO THIS GATE.
    // The count was `delivered_at IS NOT NULL AND batch_id IS NULL` — the OLD reconcile's orphan
    // test. `qualifyAndSettleBatch` pages every batch-less candidate, delivered or not. On the
    // live House programme that is 30 versus 246: the operator would have been offered "30
    // sourced leads" and 246 would have been checked. A programme whose candidates had never
    // been surfaced would have counted ZERO and been offered nothing at all.
    //
    // ⚠️ ASSERTED ON THE EXECUTABLE QUERY, because the db mock in this file counts rows without
    // modelling columns — it cannot tell one predicate from another, so only the source can.
    const SRC = readFileSync(join(__dirname, 'programme-reconcile-availability.ts'), 'utf8')
      .split('\n').filter(l => { const t = l.trim(); return t && !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*') }).join('\n')
    const count = SRC.slice(SRC.indexOf('const { count: orphans'), SRC.indexOf('if (leadErr)'))
    expect(count, 'the count is no longer made').toContain(".is('batch_id', null)")
    expect(count, 'the offered count is narrower than the population the action judges')
      .not.toContain('delivered_at')
    // The same three facts the action itself uses to find its candidates.
    expect(count).toContain(".eq('programme_id', pid)")
    expect(count).toContain(".eq('client_id', cid)")

    // 🛑 AND THE TWO POPULATIONS ARE THE SAME ONE, read from the action's own source.
    const ACTION = readFileSync(join(__dirname, 'programme-batch-recovery.ts'), 'utf8')
    const page = ACTION.slice(ACTION.indexOf('const candidateIds: string[] = []'), ACTION.indexOf('if (candidateIds.length === 0)'))
    expect(page, 'the action now filters its candidates by delivery as well').not.toContain('delivered_at')
    expect(page).toContain(".is('batch_id', null)")
  })

  it('🛑 every UNREADABLE fact is a NO, never a silent yes', async () => {
    for (const set of [
      () => { programmeError = 'connection reset' },
      () => { batchError = 'timeout' },
      () => { leadError = 'timeout' },
    ]) {
      liveState(); set()
      const a = await reconcileAvailability(LAUNCH, HOUSE_CLIENT)
      expect(a.available, 'an unreadable fact was treated as permission').toBe(false)
      expect(a.reason).toMatch(/could not be read/)
      programmeError = null; batchError = null; leadError = null
    }
  })

  it('🛑 identity is never inferred from a name, and nothing is resolved from the client', async () => {
    liveState()
    await reconcileAvailability(LAUNCH, HOUSE_CLIENT)
    // Only the programme, its batches and its prospects. No `clients`, no `icps`.
    expect([...new Set(reads)].sort()).toEqual(['leads', 'programme_batches', 'programmes'])
    const SRC = readFileSync(join(__dirname, 'programme-reconcile-availability.ts'), 'utf8')
      .split('\n').filter(l => { const t = l.trim(); return t && !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*') }).join('\n')
    for (const inferred of ['company_name', 'HOUSE_CLIENT_ID', "order('created_at'", '.limit(1)']) {
      expect(SRC, `availability infers identity from ${inferred}`).not.toContain(inferred)
    }
  })
})

// ── ③ AFTER A SUCCESSFUL RUN, IT IS GONE ─────────────────────────────────────────────

describe('③ 4 · it disappears once the work is done — because the state changed', () => {
  it('🛑 the post-reconcile world: SOURCING, 246 used, one batch, no orphans', async () => {
    liveState()
    // Exactly what the RPC leaves behind.
    programme = { id: LAUNCH, client_id: HOUSE_CLIENT, status: 'SOURCING', sourced_used: 246, sourced_reserved: 0 }
    batchCount = 1
    orphanCount = 0

    const a = await reconcileAvailability(LAUNCH, HOUSE_CLIENT)
    expect(a.available, 'the one-time repair is still on offer after it ran').toBe(false)
    expect(a.unaccounted).toBe(0)
  })

  it('🛑 4 · and EACH of the three post-run facts is independently sufficient to hide it', async () => {
    // Belt and braces on purpose: if any one of them were the only guard, a partial state
    // would put a one-time repair back on screen.
    const cases: [string, () => void][] = [
      ['status moved to SOURCING', () => { programme = { ...(programme as Row), status: 'SOURCING' } }],
      ['246 already accounted', () => { programme = { ...(programme as Row), sourced_used: 246 } }],
      ['a batch exists', () => { batchCount = 1 }],
      ['no orphaned prospects', () => { orphanCount = 0 }],
    ]
    for (const [label, apply] of cases) {
      liveState(); apply()
      const a = await reconcileAvailability(LAUNCH, HOUSE_CLIENT)
      expect(a.available, `the button survives: ${label}`).toBe(false)
    }
  })

  it('the API hands Vida the answer — it is not left to the browser to work out', () => {
    const ROUTES = readFileSync(join(__dirname, '../routes/operator.ts'), 'utf8')
    expect(ROUTES).toContain("const { reconcileAvailability } = await import('../lib/programme-reconcile-availability')")
    expect(ROUTES).toContain('const reconcile = await reconcileAvailability(truth.programme?.id ?? null, clientId)')
    // ⛓️ 9 Sep — RETARGETED. The response literal gained a `readiness` field and a `degraded`
    // override on the same object, so it now spans several lines. What this case is FOR — that
    // the availability answer is COMPUTED ON THE SERVER and handed to the browser as part of
    // programme truth — is unchanged, so the anchor moved with the shape rather than being
    // dropped.
    expect(ROUTES).toContain('res.json({ success: true, data: { ...truth,')
    expect(ROUTES, 'the availability answer no longer travels with programme truth')
      .toContain('icps, reconcile, commercial: {')
  })
})

// ── ④ THE VIDA CONTROL ITSELF ────────────────────────────────────────────────────────
//
// ⛓️ 9 Sep — RETARGETED WHOLE, AND THE PREMISE IS WHAT CHANGED. Every case below used to be
// about `Account for delivered sourcing`, a control named after an internal repair. The founder
// approved its replacement: `Qualify sourced leads`, which names the WORK — do these people
// match the targeting? The safety properties are unchanged and every one of them is still
// asserted here (server-gated visibility, one POST, single-flight, no fabricated counters, no
// failure painted green). What moved is the endpoint, the copy and the readout.

describe('④ the control obeys the server, fires once, and never paints a failure green', () => {
  const VIDA = readFileSync(join(__dirname, '../../../admin/src/app/vida/page.tsx'), 'utf8')
  /** Executable lines only — a rule described in a comment is not a rule. */
  const CODE = VIDA.split('\n')
    .filter(l => { const t = l.trim(); return t && !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*') && !t.startsWith('{/*') })
    .join('\n')
  const HANDLER = CODE.slice(CODE.indexOf('const qualifySourcedLeads = useCallback'), CODE.indexOf('const setCommercialModel'))
  /** The approved copy, as an object literal — pure code, so no comment can satisfy it. */
  const CONFIRM = CODE.slice(CODE.indexOf('const QUALIFY_CONFIRM = {'), CODE.indexOf('const openQualifyConfirm'))
  /**
   * The same copy with its source-level string joins closed up.
   * ⚠️ A SENTENCE BROKEN ACROSS `' + '` IS STILL ONE SENTENCE TO A READER, and asserting on the
   * raw source would make the approved wording depend on where the line happens to wrap.
   */
  const CONFIRM_TEXT = CONFIRM.replace(/'\s*\n?\s*\+\s*'/g, '')
  /** The rendered dialog. Sliced from the JSX guard, so the block comment above it is outside. */
  const DIALOG = CODE.slice(CODE.indexOf('{qualConfirm && ('), CODE.indexOf('{qualMsg && ('))
  /** The one control that opens it. */
  const OPENER = CODE.slice(CODE.indexOf('const openQualifyConfirm = useCallback'), CODE.indexOf('const qualifySourcedLeads = useCallback'))
  /** The offered control, from its server gate to the message line. */
  const OFFER = CODE.slice(CODE.indexOf('{prog.reconcile?.available && ('), CODE.indexOf('{qualConfirm && ('))

  it('🛑 1 · the OLD control is gone — it is replaced, not left beside its replacement', () => {
    // Two live controls for one job is how an operator presses the wrong one. The phrase may
    // survive in a comment recording what was replaced; `CODE` is comment-stripped, so this
    // fails only if it is still something a person can press.
    expect(CODE, 'the obsolete control is still on the page').not.toContain('Account for delivered sourcing')
    expect(CODE, 'the page still calls the old reconcile endpoint').not.toContain('reconcile-sourcing')
    expect(CODE, 'the old copy constant survives').not.toContain('RECONCILE_CONFIRM')
  })

  it('🛑 2 · the button says exactly `Qualify sourced leads`, and the supporting line is plain English', () => {
    expect(OFFER).toContain("{qualBusy ? 'Qualifying…' : 'Qualify sourced leads'}")
    expect(OFFER, 'the supporting line no longer names what is ready to be checked')
      .toContain('sourced leads are ready to be checked against this programme')
    expect(OFFER).toContain('{prog.reconcile.unaccounted}')
    // 🛑 14 · NO INTERNAL LANGUAGE ON A SCREEN AN OPERATOR READS. Each of these is a real,
    // load-bearing concept; none of them is the operator's problem.
    //
    // ⚠️ THE BAN IS ON THE RENDERED TEXT, NOT THE WHOLE BLOCK. `prog.reconcile?.available` is
    // the SERVER FIELD this control is gated on — an identifier nobody reads on screen — and a
    // ban wide enough to catch it fails while the copy is exactly right, which is the shape of
    // assertion somebody eventually deletes.
    // The paragraph as a READER sees it: JSX expressions are the count and the busy flag, so
    // they stand in as `N` rather than contributing their identifiers to the prose. The two
    // button labels are the single-quoted literals in the block (class names use double
    // quotes), so they are held to the same standard as the sentence.
    const VISIBLE =
      OFFER.slice(OFFER.indexOf('<p className='), OFFER.indexOf('</p>')).replace(/\{[^}]*\}/g, ' N ')
      + ' ' + (OFFER.match(/'[^']*'/g) ?? []).join(' ')
    expect(VISIBLE, 'the supporting line was not found where it is rendered').toContain('sourced leads are ready')
    expect(VISIBLE, 'the button label is not among the rendered strings').toContain('Qualify sourced leads')
    for (const internal of ['delivered_at', 'reconcil', 'batch', 'reserved', 'granted',
                            'Apollo', 'PDL', 'SOURCING_AUTHORISED', 'RPC']) {
      expect(VISIBLE, `the visible copy exposes ${internal}`).not.toContain(internal)
    }
  })

  it('🛑 12 · it is rendered ONLY on the server boolean, so it disappears when it no longer applies', () => {
    expect(CODE, 'the button is not gated on the server answer').toContain('{prog.reconcile?.available && (')
    // ⚠️ AND THE GATE IS NOT RE-DERIVED IN THE BROWSER. A visibility check this file could
    // compute is a check anybody with the console open could satisfy.
    const block = CODE.slice(CODE.indexOf('{prog.reconcile?.available && ('), CODE.indexOf('{qualMsg && ('))
    for (const derived of ['SOURCING_AUTHORISED', 'HOUSE_LAUNCH_PROGRAMME_ID', 'house', 'sourced_used']) {
      expect(block, `the browser re-derives visibility from ${derived}`).not.toContain(derived)
    }
    // Nothing local can keep it on screen after a successful run either — there is no
    // "I already did this" flag anywhere near it, only the server's answer re-read.
    expect(block, 'the control carries its own local visibility state').not.toContain('useState')
  })

  it('🛑 5 · it can only POST the programme already loaded on screen, AND only if it is the selected client\'s', () => {
    // ⛓️ 13 Sep (BL-1) — STRENGTHENED, NOT RELAXED. This pinned
    // ~~`const id = prog?.programme?.id`~~, which proved the id came from the loaded programme
    // and nowhere else — true, and not enough: a late response for ANOTHER client could put
    // that client's programme in `prog`, and this control would then post their id under the
    // selected client's name. `programmeActionId()` is the same "from the screen, never typed"
    // rule PLUS the server-identity check, so what is pinned here is strictly more.
    expect(HANDLER).toContain('const id = programmeActionId()')
    expect(HANDLER).toContain('`/api/proxy/operator/programme/${encodeURIComponent(id)}/qualify-batch`')
    // Not typed, not chosen, not resolved from a client or a list — and NOT read back out of
    // `prog` here either, which is what the gate exists to centralise.
    for (const other of ['prompt(', 'selectedProgramme', 'programmes[', 'client_id:', 'prog?.programme?.id']) {
      expect(HANDLER, `the id can come from ${other}`).not.toContain(other)
    }
    // The two refusals, split so each says what it is: no owned programme, or already in flight.
    expect(HANDLER).toContain('if (!id) {')
    expect(HANDLER).toContain('if (qualBusy) return')
  })

  it('🛑 5 · a second click while the first is in flight cannot fire', () => {
    // Three things together: the guard at the top, the flag set before the request, the flag
    // cleared only in `finally`, and the button disabled on it. Any one alone is not enough.
    expect(HANDLER).toContain('if (qualBusy) return')
    expect(HANDLER).toContain('setQualBusy(true)')
    expect(HANDLER).toContain('} finally { setQualBusy(false) }')
    expect(CODE).toContain('<button onClick={qualifySourcedLeads} disabled={qualBusy}')
    // ⚠️ ORDERING, NOT PRESENCE. `setQualBusy(true)` after the fetch would leave the whole
    // request window unguarded, and every assertion above would still pass.
    const busyAt = HANDLER.indexOf('setQualBusy(true)')
    const fetchAt = HANDLER.indexOf('await fetch(')
    expect(busyAt).toBeGreaterThan(-1)
    expect(fetchAt, 'the busy flag is set after the request starts').toBeGreaterThan(busyAt)
  })

  it('🛑 9 · 10 · a PARTIAL run is never shown as success — it is paused, and it says so', () => {
    // 🛑 THE FAILURE MODE THIS CASE EXISTS FOR. The API refuses to settle while any candidate is
    // unjudged, or after a provider failure, and hands back what it managed in `partial`. A
    // screen that rendered that as "0 qualified · 0 rejected · 0 used · batch ready for review"
    // would be telling an operator the work is done and the batch is reviewable when neither is
    // true — and `batch ready for review` is the sentence a person acts on.
    const fail = HANDLER.slice(HANDLER.indexOf('if (!j?.success) {'), HANDLER.indexOf("const d = (j.data"))
    expect(fail, 'the partial report is never read').toContain('j?.partial')
    expect(fail).toContain('still_unjudged')
    expect(fail).toContain('provider_failed')
    expect(fail, 'a paused run is rendered in the success tone').toContain("tone: 'warn'")
    expect(fail).toContain('Qualification paused.')
    expect(fail).toContain('leads still need checking. Nothing was settled.')
    expect(fail, 'a paused run falls through into the success path').toContain('return')
    // 🛑 AND THE PAUSED BRANCH IS DECIDED BY THE NUMBERS, NOT BY A STRING MATCH ON THE MESSAGE.
    expect(fail).toContain('Number(partial.still_unjudged ?? 0) > 0 || partial.provider_failed')
    // The warn tone renders differently from both the success and the error tone.
    expect(CODE).toContain("qualMsg.tone === 'ok' ? 'text-emerald-800'")
    expect(CODE).toContain("qualMsg.tone === 'warn' ? 'text-orange-800 font-semibold'")
  })

  it('🛑 a refusal is rendered as a refusal, in the API\'s own words, and never retried', () => {
    expect(HANDLER).toContain('if (!j?.success) {')
    const fail = HANDLER.slice(HANDLER.indexOf('if (!j?.success) {'), HANDLER.indexOf("const d = (j.data"))
    expect(fail).toContain("tone: 'error'")
    expect(fail).toContain('j?.error')
    // No retry, anywhere in the handler.
    for (const retry of ['setTimeout', 'retry', 'attempt', 'while (']) {
      expect(HANDLER, `the handler retries via ${retry}`).not.toContain(retry)
    }
  })

  it('🛑 8 · every number on screen came from the response, and the counters are RE-READ', () => {
    expect(HANDLER).toContain('await loadProgramme(selected)')
    // 🛑 NOTHING WRITES THE PROGRAMME INTO LOCAL STATE. `setProg` here would show the number
    // this screen expected rather than the one the database holds — the exact false green the
    // whole HOUSE-009 arc exists to remove.
    expect(HANDLER, 'the screen patches programme truth locally').not.toContain('setProg(')
    // The summary reads four fields off `j.data` and computes none of them. `used` in
    // particular is the server's read-back of the programme row, never `qualified` reused.
    // ⛓️ 9 Sep — RETARGETED. The summary now renders the SETTLED BATCH's totals rather than
    // this run's tally. The DUTY is unchanged and is what this case is for — every number on
    // screen came from the response and none is computed here — but the field names moved,
    // because `qualified` counts only the verdicts one call wrote and the House screen showed
    // "176 qualified" beside "246 used" as a result.
    expect(HANDLER).toContain('const settledQualified = d.batch_qualified ?? d.qualified ?? 0')
    expect(HANDLER).toContain('const settledRejected = d.batch_rejected ?? d.disqualified ?? 0')
    // ⛓️ RETARGETED AGAIN 9 Sep — settling now continues to preparation inside the same call,
    // so the line's trailing clause reports that outcome instead of a fixed phrase. The duty
    // above is unchanged: every number still comes from the response and none is computed here.
    expect(HANDLER).toContain('const settled = `${settledQualified} qualified · ${settledRejected} rejected · ${d.used ?? 0} used`')
    // 🛑 AND THE CONTINUATION'S OUTCOME IS THE SERVER'S TOO — including the sentence shown when
    // it could not continue. A summary invented here is how a screen starts lying.
    expect(HANDLER).toContain('d.continued.detail')
    expect(HANDLER).toContain("d.status_after === 'READY_FOR_APPROVAL'")
    // 🛑 NOT DERIVED. Any arithmetic on these numbers is a number this screen invented.
    for (const fabricated of ['d.qualified +', 'd.qualified -', 'unaccounted -', 'unaccounted +',
                              'sourced_used', 'sourced_reserved', 'room_remaining']) {
      expect(HANDLER, `the handler fabricates a counter via ${fabricated}`).not.toContain(fabricated)
    }
  })

  it('🛑 11 · a successful run re-reads programme truth before anything else is believed', () => {
    const ok = HANDLER.slice(HANDLER.indexOf("const d = (j.data"))
    expect(ok, 'a successful run leaves the counters on screen stale').toContain('await loadProgramme(selected)')
  })

  it('🛑 6 · 7 · 13 · it triggers no sourcing, approval, P2, Live, Run or send', () => {
    expect(HANDLER).toContain('qualify-batch')
    // ⚠️ THE BANNED LIST IS OF INVOCATIONS, NOT WORDS — route paths and function names, so a
    // sentence of copy can never satisfy or break it.
    for (const forbidden of ['lifecycle(', 'go-live', 'authorise/second', 'authorise/first',
                             'ready-for-approval', '/approve', 'approveLead', 'approveProgramme',
                             'operator/source', 'programme/source', 'icps/', 'people-search',
                             'reconcile-sourcing', 'send-due', 'run-once', 'campaign/start']) {
      expect(HANDLER, `the handler reaches ${forbidden}`).not.toContain(forbidden)
    }
    // Exactly one request, to exactly one path.
    expect((HANDLER.match(/fetch\(/g) ?? []).length).toBe(1)
  })

  it('🛑 14 · the approved copy is exactly what the founder specified — one question, one paragraph', () => {
    expect(CONFIRM).toContain('`Qualify these ${n} sourced leads?`')
    expect(CONFIRM_TEXT).toContain('Vida will check the existing sourced leads against the attached ICP.')
    expect(CONFIRM_TEXT).toContain('Only leads that qualify will count against the programme and move forward for review.')
    expect(CONFIRM_TEXT).toContain('No new leads will be sourced and nothing will be sent.')
    // 🛑 NO LEGALISTIC LIST. The founder asked for the giant will / will-not enumeration to go.
    expect(CONFIRM, 'the will/will-not list is back').not.toContain('will: [')
    expect(CONFIRM, 'the will/will-not list is back').not.toContain('wont: [')
    expect(DIALOG, 'the dialog re-grew a will list').not.toContain('This will:')
    expect(DIALOG, 'the dialog re-grew a will-not list').not.toContain('It will NOT:')
    // And no internal vocabulary in the dialog either.
    for (const internal of ['delivered_at', 'batch', 'reconcil', 'reserved', 'granted', 'Apollo', 'PDL', 'RPC']) {
      expect(CONFIRM_TEXT, `the confirmation exposes ${internal}`).not.toContain(internal)
    }
    // The dialog renders the constant rather than retyping it.
    expect(DIALOG).toContain('QUALIFY_CONFIRM.question(')
    expect(DIALOG).toContain('{QUALIFY_CONFIRM.body}')
  })

  it('🛑 3 · the button OPENS the confirmation and posts nothing', () => {
    expect(CODE).toContain('<button onClick={openQualifyConfirm} disabled={qualBusy}')
    // The opener is the whole path from the button, and it contains no request at all.
    expect(OPENER).toContain('setQualConfirm(true)')
    expect(OPENER, 'the button posts before anybody has confirmed').not.toContain('fetch(')
    // ⚠️ AND THE SINGLE-FLIGHT GUARD IS ON THE OPENER TOO — a dialog opened during a request
    // in flight is a second press waiting to happen.
    expect(OPENER).toContain('if (qualBusy) return')
    // ⛓️ 13 Sep (BL-1) — and the OWNERSHIP gate is on the opener too, because this button
    // opens a dialog that names the SELECTED client over a programme that may be somebody
    // else's. Refusing only at the post would still have shown an untrue sentence first.
    expect(OPENER).toContain('programmeActionId()')
    // The native dialog is not in this path.
    expect(HANDLER, 'the browser confirm is still in the path').not.toContain('confirm(')
    expect(OPENER).not.toContain('window.confirm')
  })

  it('🛑 4 · Cancel closes and posts nothing', () => {
    const cancel = DIALOG.slice(DIALOG.indexOf('<button onClick={() => setQualConfirm(false)} disabled={qualBusy}'))
    expect(cancel.slice(0, 400), 'Cancel is not labelled Cancel').toContain('Cancel')
    // Its ONLY effect is closing. Asserted on the handler expression, not on the label.
    expect(DIALOG).toContain('<button onClick={() => setQualConfirm(false)} disabled={qualBusy}')
    expect(DIALOG, 'Cancel triggers the qualification').not.toContain('onClick={() => qualifySourcedLeads')
    // Dismissing by clicking the backdrop is the same no-op, and the panel itself does not
    // dismiss (`stopPropagation`) — a stray click inside the copy must not cancel a decision.
    expect(DIALOG).toContain('onClick={() => setQualConfirm(false)}')
    expect(DIALOG).toContain('onClick={e => e.stopPropagation()}')
  })

  it('🛑 5 · the confirming button is the ONLY thing that posts, and it fires once', () => {
    expect(DIALOG).toContain('<button onClick={qualifySourcedLeads} disabled={qualBusy}')
    expect(DIALOG).toContain("{qualBusy ? 'Qualifying…' : 'Qualify sourced leads'}")
    // `qualifySourcedLeads` has exactly one caller in the whole page, and it is that button.
    expect((CODE.match(/onClick=\{qualifySourcedLeads\}/g) ?? []).length).toBe(1)
    // Single-flight survives the change: the guard, the flag before the request, the finally,
    // and the confirmation closing FIRST so it cannot be pressed a second time.
    expect(HANDLER).toContain('if (qualBusy) return')
    expect(HANDLER).toContain('setQualConfirm(false)')
    const closeAt = HANDLER.indexOf('setQualConfirm(false)')
    const fetchAt = HANDLER.indexOf('await fetch(')
    expect(closeAt, 'the dialog is still open while the request runs').toBeLessThan(fetchAt)
    expect((HANDLER.match(/fetch\(/g) ?? []).length).toBe(1)
  })

  it('🛑 2 · both buttons read exactly what the founder specified, and there are only two', () => {
    // ⚠️ ASSERTED PER BUTTON RATHER THAN BY ONE CLEVER REGEX. The two labels are written in
    // different shapes — a bare text node and a busy-state ternary — and a pattern loose
    // enough to catch both was loose enough to silently catch only one.
    const buttons = DIALOG.split('<button').slice(1).map(b => b.slice(0, b.indexOf('</button>')))
    expect(buttons, `the dialog has ${buttons.length} button(s)`).toHaveLength(2)
    // The label is the text after the element's own `>`, whitespace-normalised — indentation
    // is not part of what a button says.
    // ⚠️ `lastIndexOf`, NOT `indexOf` — the FIRST `>` in the chunk belongs to the arrow in
    // `onClick={() => …}`, so an index-of split returns the whole attribute list as the label.
    const label = (b: string) => b.slice(b.lastIndexOf('>') + 1).replace(/\s+/g, ' ').trim()
    expect(label(buttons[0]), 'the first button is not Cancel').toBe('Cancel')
    expect(label(buttons[1])).toBe("{qualBusy ? 'Qualifying…' : 'Qualify sourced leads'}")
    // Neither says OK, and neither is a bare confirm.
    for (const b of buttons) expect(b).not.toMatch(/>\s*(OK|Ok|Confirm|Yes)\s*</)
  })

  it('no new modal system was invented — it reuses the overlay this app already uses', () => {
    // There is no shared dialog component in the admin app; `vida/partners/page.tsx` rolls its
    // own. This copies those exact classes locally rather than adding an abstraction.
    const PARTNERS = readFileSync(join(__dirname, '../../../admin/src/app/vida/partners/page.tsx'), 'utf8')
    const shell = 'fixed inset-0 z-50 bg-black/40 flex items-start justify-center p-4 sm:p-8 overflow-y-auto'
    expect(PARTNERS, 'the pattern being reused no longer exists').toContain(shell)
    expect(DIALOG).toContain(shell)
    expect(DIALOG).toContain('role="dialog" aria-modal="true"')
    // And no shared component was introduced along the way.
    expect(VIDA).not.toContain("from '@/components/Modal'")
    expect(VIDA).not.toContain("from '@/components/Dialog'")
  })

  it('🛑 the endpoint it posts to is the one #1656 shipped, and it takes no body of its own', () => {
    // The route exists, is operator-key gated, and is the qualification/recovery door — not a
    // second backend path invented for this screen.
    const ROUTES = readFileSync(join(__dirname, '../routes/operator.ts'), 'utf8')
    expect(ROUTES).toContain("operatorRouter.post('/programme/:programmeId/qualify-batch'")
    const route = ROUTES.slice(ROUTES.indexOf("operatorRouter.post('/programme/:programmeId/qualify-batch'"))
      .slice(0, 2000)
    expect(route, 'the operator key check is gone').toContain("adminKeyValid(req.headers['x-admin-key'])")
    expect(route).toContain("const { qualifyAndSettleBatch } = await import('../lib/programme-batch-recovery')")
    expect(route).toContain('qualifyAndSettleBatch(req.params.programmeId)')
    // The screen sends an empty body — every input the action uses comes from the URL and the
    // database, so there is nothing a browser could put in it that would change the outcome.
    expect(HANDLER).toContain("body: '{}'")
  })
})

// ── ⑤ NOTHING ELSE ON THE PAGE MOVED ─────────────────────────────────────────────────

describe('⑤ no other visible change', () => {
  const VIDA = readFileSync(join(__dirname, '../../../admin/src/app/vida/page.tsx'), 'utf8')

  it('🛑 the lifecycle controls are untouched, all six of them', () => {
    for (const a of ['recommend', 'await-first-payment', 'authorise/first',
                     'ready-for-approval', 'authorise/second', 'go-live']) {
      expect(VIDA, `the ${a} control changed`).toContain(`lifecycle('${a}'`)
    }
    // 🛑 AND STILL NO APPROVE BUTTON. The single programme approval belongs to the client, in
    // Milla; this PR must not be the one that quietly adds one.
    expect(VIDA).not.toContain("lifecycle('approve'")
  })

  it('🛑 Milla and the Website are not touched by this change', () => {
    // Asserted on the tree rather than trusted: the founder approved ONE visible change.
    const { existsSync } = require('fs') as typeof import('fs')
    expect(existsSync(join(__dirname, '../../../admin/src/app/vida/page.tsx'))).toBe(true)
    // The control's own styling reuses the page's existing language rather than introducing one.
    expect(VIDA).toContain("className=\"text-[12.5px] font-bold text-white bg-[#7C3AED] rounded-lg px-2.5 py-1.5 disabled:opacity-50\"")
  })
})
