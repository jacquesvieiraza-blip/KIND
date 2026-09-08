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

  it('🛑 NOT when there is nothing to account for', async () => {
    liveState()
    orphanCount = 0
    const a = await reconcileAvailability(LAUNCH, HOUSE_CLIENT)
    expect(a.available).toBe(false)
    expect(a.reason).toContain('no delivered prospect')
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
    expect(ROUTES).toContain('data: { ...truth, icps, reconcile, commercial: {')
  })
})

// ── ④ THE VIDA CONTROL ITSELF ────────────────────────────────────────────────────────

describe('④ the control obeys the server, fires once, and never paints a failure green', () => {
  const VIDA = readFileSync(join(__dirname, '../../../admin/src/app/vida/page.tsx'), 'utf8')
  /** Executable lines only — a rule described in a comment is not a rule. */
  const CODE = VIDA.split('\n')
    .filter(l => { const t = l.trim(); return t && !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*') && !t.startsWith('{/*') })
    .join('\n')
  const HANDLER = CODE.slice(CODE.indexOf('const reconcileSourcing = useCallback'), CODE.indexOf('const setCommercialModel'))

  it('🛑 1 · 2 · 3 · 4 · it is rendered ONLY on the server boolean', () => {
    expect(CODE, 'the button is not gated on the server answer').toContain('{prog.reconcile?.available && (')
    expect(CODE).toContain("'Account for delivered sourcing'")
    // ⚠️ AND THE GATE IS NOT RE-DERIVED IN THE BROWSER. A visibility check this file could
    // compute is a check anybody with the console open could satisfy.
    const block = CODE.slice(CODE.indexOf('{prog.reconcile?.available && ('), CODE.indexOf('{recMsg && ('))
    for (const derived of ['SOURCING_AUTHORISED', 'HOUSE_LAUNCH_PROGRAMME_ID', 'house', 'sourced_used']) {
      expect(block, `the browser re-derives visibility from ${derived}`).not.toContain(derived)
    }
  })

  it('🛑 5 · it can only POST the programme already loaded on screen', () => {
    expect(HANDLER).toContain('const id = prog?.programme?.id')
    expect(HANDLER).toContain('`/api/proxy/operator/programme/${encodeURIComponent(id)}/reconcile-sourcing`')
    // Not typed, not chosen, not resolved from a client or a list.
    for (const other of ['prompt(', 'selectedProgramme', 'programmes[', 'client_id:']) {
      expect(HANDLER, `the id can come from ${other}`).not.toContain(other)
    }
    expect(HANDLER).toContain('if (!id || recBusy) return')
  })

  it('🛑 6 · a second click while the first is in flight cannot fire', () => {
    // Three things together: the guard at the top, the flag set before the request, the flag
    // cleared only in `finally`, and the button disabled on it. Any one alone is not enough.
    expect(HANDLER).toContain('if (!id || recBusy) return')
    expect(HANDLER).toContain('setRecBusy(true)')
    expect(HANDLER).toContain('} finally { setRecBusy(false) }')
    expect(CODE).toContain('<button onClick={reconcileSourcing} disabled={recBusy}')
    // ⚠️ ORDERING, NOT PRESENCE. `setRecBusy(true)` after the fetch would leave the whole
    // request window unguarded, and every assertion above would still pass.
    const busyAt = HANDLER.indexOf('setRecBusy(true)')
    const fetchAt = HANDLER.indexOf('await fetch(')
    expect(busyAt).toBeGreaterThan(-1)
    expect(fetchAt, 'the busy flag is set after the request starts').toBeGreaterThan(busyAt)
  })

  it('🛑 7 · a failure is rendered as a failure, in the API\'s own words, and never retried', () => {
    expect(HANDLER).toContain('if (!j?.success) {')
    const fail = HANDLER.slice(HANDLER.indexOf('if (!j?.success) {'), HANDLER.indexOf("setRecMsg({ tone: 'ok'"))
    expect(fail).toContain("tone: 'error'")
    expect(fail).toContain('j?.error')
    expect(fail, 'the failure branch falls through into the success path').toContain('return')
    // No retry, anywhere in the handler.
    for (const retry of ['setTimeout', 'retry', 'attempt', 'while (']) {
      expect(HANDLER, `the handler retries via ${retry}`).not.toContain(retry)
    }
  })

  it('🛑 the "it RAN but the re-read failed" warning is surfaced verbatim, not softened', () => {
    expect(HANDLER).toContain("j.error.includes('Do NOT press this again')")
    expect(HANDLER).toContain("setRecMsg({ tone: 'warn', text: j.error })")
    expect(CODE, 'the warning tone renders the same as an ordinary error').toContain("recMsg.tone === 'warn'")
  })

  it('🛑 8 · the counters are RE-READ, never patched locally', () => {
    expect(HANDLER).toContain('await loadProgramme(selected)')
    // 🛑 NOTHING WRITES THE PROGRAMME INTO LOCAL STATE. `setProg` here would show the number
    // this screen expected rather than the one the database holds — the exact false green the
    // whole HOUSE-009 arc exists to remove.
    expect(HANDLER, 'the screen patches programme truth locally').not.toContain('setProg(')
    for (const fabricated of ['sourced_used', 'room_remaining', 'sourced_reserved', 'used:', 'left:']) {
      expect(HANDLER, `the handler fabricates ${fabricated}`).not.toContain(fabricated)
    }
    // And on FAILURE nothing is re-read into the counters either — the only re-read on a
    // failure is the one behind the "it ran" warning.
    const fail = HANDLER.slice(HANDLER.indexOf('if (!j?.success) {'), HANDLER.indexOf("setRecMsg({ tone: 'ok'"))
    expect((fail.match(/loadProgramme/g) ?? []).length, 'a plain failure re-reads as though something changed').toBe(1)
  })

  it('🛑 9 · it triggers no sourcing, approval, P2, Live, Run or send', () => {
    expect(HANDLER).toContain('reconcile-sourcing')
    // ⚠️ THE BANNED LIST IS OF INVOCATIONS, NOT WORDS — and it had to be narrowed. A bare
    // `'approve'` matches the confirmation's own line *"approve the programme"*, which is text
    // this control is REQUIRED to contain: an assertion that fails while the code is right is
    // one somebody eventually deletes. These are route paths and function names.
    for (const forbidden of ['lifecycle(', 'go-live', 'authorise/second', 'authorise/first',
                             'ready-for-approval', '/approve', 'approveLead', 'approveProgramme',
                             'operator/source', 'programme/source', 'send-due', 'run-once',
                             'campaign/start']) {
      expect(HANDLER, `the handler reaches ${forbidden}`).not.toContain(forbidden)
    }
    // ⚠️ `Apollo` AND `PDL` ARE DELIBERATELY NOT ON THAT LIST — the confirmation is REQUIRED to
    // say "call Apollo" and "charge PDL" in its will-NOT half, so banning the words would fail
    // on the very copy the founder specified. What is asserted instead is the only thing that
    // could actually reach a provider: the number of requests, and where the one goes.
    expect(HANDLER).toContain('call Apollo')
    expect(HANDLER).toContain('approve the programme')
    // Exactly one request, to exactly one path.
    expect((HANDLER.match(/fetch\(/g) ?? []).length).toBe(1)
  })

  it('🛑 10 · the confirmation states the state move, and both lists, in plain English', () => {
    expect(HANDLER).toContain('prospects already delivered to this House programme?')
    // The three things it WILL do.
    expect(HANDLER).toContain('create one settled sourcing batch')
    expect(HANDLER).toContain('account for those existing delivered prospects')
    expect(HANDLER, 'the confirmation hides the status change the founder approved')
      .toContain('move the programme from SOURCING_AUTHORISED to SOURCING')
    // And the nine it will NOT.
    for (const wont of ['source more prospects', 'call Apollo', 'charge PDL', 'delete leads',
                        'approve the programme', 'take Payment 2', 'Make Live', 'Run', 'send anything']) {
      expect(HANDLER, `the confirmation omits "${wont}"`).toContain(wont)
    }
    expect(HANDLER, 'nothing is confirmed at all').toContain('if (!confirm(')
  })

  it('the returned headline is rendered verbatim — the screen invents no summary', () => {
    expect(HANDLER).toContain("setRecMsg({ tone: 'ok', text: String(j.data?.headline ?? 'Done.') })")
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
