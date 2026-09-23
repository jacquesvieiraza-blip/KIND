// ══════════════════════════════════════════════════════════════════════════════════════════
// XC-7 · THE LEGACY DOORS ARE FENCED FOR A PROGRAMME CLIENT (R124 · LR 18)
//
// REQ: *"Auto-run on wallet, /icps/:id/run, activate, lookalike, /company, legacy emails,
// auto-consent — none for programme clients."*
// RED: *"Any legacy door reachable for a programme client."*
//
// R124 (16 Sep, founder-locked): *"299/4 is gone. out. we are on the programme. all clients."*
//
// ── WHAT A DOOR IS, AND WHY THIS IS A LIST RATHER THAN A RULE ───────────────────────────
//
// Each of these is a path built on the retired per-lead model — a wallet balance, welcome
// reveal credits, a $4 approval, a $299 pack — and each one was written before the programme
// existed. There is no single predicate that closes them, because they are seven different
// acts in six files; what closes them is that each one ASKS, and the value of this file is
// that it names all seven so a door nobody remembered cannot pass as fenced.
//
// ── WHAT WAS ACTUALLY OPEN ──────────────────────────────────────────────────────────────
//
// Four of the seven were already fenced (the wallet auto-run, lookalike, /company's credit
// surfaces, and the low/zero-credit emails). Three were not:
//
//   · `/icps/:id/run` granted twenty welcome REVEAL CREDITS and started a legacy sourcing run
//     against a provider budget the client's programme never bought;
//   · `activate` started that same run off `credit_balance`, falling back to twenty free
//     reveals, for a never-run ICP;
//   · auto-consent cold-emailed a programme client's scored leads with no approval behind it.
//
// And a fourth, found while crawling: `/clients/chase-unpaid` pushes *"$299 gets your sender
// and your first 100 approved leads"* to a real person's PHONE, and it selects everybody with
// an active ICP and no legacy transaction — which is every programme customer who has ever had
// targeting, because they never buy a pack.
//
// ⛓️ ~~⚠️ A LEGACY CLIENT IS UNAFFECTED, AND THAT IS PART OF THE PROOF. R74 keeps the retired
// runtime live until the coordinated migration ships.~~ SUPERSEDED 23 Sep by R137: no account
// passes a legacy door now. `kind-owns-go.test.ts` still asserts `sourcing: true`, against the
// test-only legacy-era resolver, because that is the only state in which the path it covers
// was reachable.
// ══════════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const strip = (s: string) => s
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .split('\n')
  .map(l => { const i = l.search(/(?<!:)\/\//); return i === -1 ? l : l.slice(0, i) })
  .join('\n')

const src = (p: string) => strip(readFileSync(join(__dirname, p), 'utf8'))

const ICPS = src('../routes/icps.ts')
const STRIPE = src('../routes/stripe.ts')
const LOOKALIKE = src('../routes/lookalike.ts')
const COMPANY = src('../routes/company.ts')
const INTERNAL = src('../routes/internal.ts')

/** From a marker to the next route declaration — so a guard judges one handler. */
function handler(source: string, marker: string, stopAt = 6000): string {
  const at = source.indexOf(marker)
  expect(at, `${marker} moved — this guard must be repointed`).toBeGreaterThan(-1)
  return source.slice(at, at + stopAt)
}

// ═════════════════════════════════════════════════════════════════════════════════════════
// ① THE SEVEN DOORS, NAMED
// ═════════════════════════════════════════════════════════════════════════════════════════
describe('XC-7 · every named legacy door asks who the client is', () => {
  it('🛑 ① AUTO-RUN ON WALLET — a top-up does not start legacy work for a programme client', () => {
    const block = handler(STRIPE, "const { clientCommercialModel, mayUseLegacyCommercialPath }", 1200)
    expect(block).toContain('if (!mayUseLegacyCommercialPath(model))')
  })

  it('🛑 ② /icps/:id/run — the welcome credits and the legacy run', () => {
    const block = handler(ICPS, "icpRouter.post('/:id/run'", 3000)
    expect(block, 'the run door no longer asks').toContain('legacyDoorVerdict(clientId)')
    // 🛑 BEFORE THE GRANT. A refusal after twenty credits were granted is a refusal that has
    // already cost something.
    const fenceAt = block.indexOf('legacyDoorVerdict(clientId)')
    const grantAt = block.indexOf('grant_first_run_credits')
    expect(grantAt, 'the welcome grant moved — this guard must be repointed').toBeGreaterThan(-1)
    expect(fenceAt, 'the fence runs after the welcome credits are granted').toBeLessThan(grantAt)
    expect(block).toContain('res.status(door.status)')
    // 🛑 AND IT IS REACHED. Position alone passed against the whole fence wrapped in
    // `if (false) {` — the text in the right place and never executed, which is the original
    // defect with a decoration. The fence is a BARE BLOCK, and its refusal is unconditional
    // on anything but the verdict.
    expect(block, 'the fence sits inside a branch that can be turned off')
      .toMatch(/\n    \{\n      const \{ legacyDoorVerdict \}/)
    expect(block).toMatch(/if \(!door\.allowed\) \{/)
  })

  it('🛑 ③ ACTIVATE — the legacy first run, not the targeting itself', () => {
    const block = handler(ICPS, 'let started = false', 2500)
    expect(block, 'activation starts a legacy run for a programme client again')
      .toContain('legacyDoorVerdict(clientId)')
    expect(block).toContain('if (!legacyRunDoor.allowed) {')
    // The run is what is fenced; the ICP and the brief still go live, which is why an
    // operator can still apply a programme client's revision.
    expect(block).toContain('runIcpJob(req.params.id, clientId, ownerUserId')
  })

  it('🛑 ④ LOOKALIKE', () => {
    expect(LOOKALIKE).toContain('if (!mayUseLegacyCommercialPath(model))')
  })

  it('🛑 ⑤ /company — every credit surface asks', () => {
    // The owner's Command Centre, the seat detail, the pool actions and the credit requests.
    // 🛑 THE DECLARATION AND THE CALLS. Counting calls alone passed while the function they
    // call was renamed away — text in the right shape around a gate that no longer exists.
    expect(COMPANY, 'the seat economics gate is gone')
      .toContain('async function seatHasRetiredEconomics(clientId: string): Promise<boolean> {')
    expect((COMPANY.match(/await seatHasRetiredEconomics\(/g) ?? []).length).toBeGreaterThanOrEqual(5)
    expect(COMPANY).toContain('companyHasRetiredEconomics')
    expect(COMPANY, 'an unreadable roster opens the pool actions')
      .toContain("console.error('[company] seat roster unreadable for economics gate:'")
  })

  it('🛑 ⑥ LEGACY EMAILS — low credits, zero credits, and the retired-pack push', () => {
    expect((INTERNAL.match(/mayNotify\('low_credits'/g) ?? []).length).toBeGreaterThanOrEqual(2)
    expect(INTERNAL).toContain("mayNotify('zero_credits'")
    // 🛑 THE ONE NOBODY HAD NAMED. The chase pushes the retired pack price to a phone.
    const chase = handler(INTERNAL, "internalRouter.post('/clients/chase-unpaid'", 2600)
    expect(chase, 'the retired pack is still pushed to a programme client\'s phone')
      .toContain('chaseProgrammes')
    expect(chase).toContain("mayNotify('zero_credits', { onProgramme: onProgramme(chaseProgrammes, cid) })")
    // And it still quotes the price from the constants, so the fence is what changed.
    expect(chase).toContain('PACK_PRICE_USD')
  })

  it('🛑 ⑦ AUTO-CONSENT — cold mail fired by a sourcing run', () => {
    const block = handler(ICPS, 'scoreLeadsForIcp(gatedIds, icp', 2600)
    expect(block).toContain('legacyDoorVerdict(clientId)')
    expect(block, 'the free-proof fence was replaced rather than joined').toContain('if (proofMode)')
    expect(block, 'the outreach switch was replaced rather than joined')
      .toContain("process.env.AUTO_OUTREACH_ENABLED === 'true'")
  })
})

// ═════════════════════════════════════════════════════════════════════════════════════════
// ② THE ONE REFUSAL, AND WHAT IT DOES WITH "WE COULD NOT TELL"
//
// ⚠️ DRIVEN THROUGH THE REAL RESOLVER, NOT A SPY ON IT. `legacyDoorVerdict` calls
// `clientCommercialModel` through the module's own binding, so a spy on the export object
// never intercepts it — and a test that believed it had is a test of nothing. The database is
// faked instead, which exercises the resolution these fences actually depend on.
// ═════════════════════════════════════════════════════════════════════════════════════════
describe('XC-7 · the door verdict itself', () => {
  async function verdictWith(state: {
    stored?: string | null
    clientError?: { message: string } | null
    openProgramme?: { id: string } | null
    programmeThrows?: boolean
  }) {
    vi.resetModules()
    vi.doMock('@kind/db', () => ({
      db: {
        from: (table: string) => {
          const q: Record<string, unknown> = {
            select() { return q }, eq() { return q }, in() { return q }, is() { return q },
            not() { return q }, order() { return q }, limit() { return q },
            async maybeSingle() {
              if (table === 'clients') {
                if (state.clientError) return { data: null, error: state.clientError }
                return { data: { commercial_model: state.stored ?? null }, error: null }
              }
              return { data: null, error: null }
            },
            async single() { return { data: null, error: null } },
            then(r: (v: unknown) => unknown) { return Promise.resolve({ data: [], error: null }).then(r) },
          }
          return q
        },
      },
    }))
    vi.doMock('./programme-authority', () => ({
      openProgrammeFor: async () => {
        if (state.programmeThrows) throw new Error('programme table unreadable')
        return state.openProgramme ?? null
      },
    }))
    const mod = await import('./commercial-model')
    return { mod, verdict: await mod.legacyDoorVerdict('c1') }
  }

  it('🛑 A PROGRAMME CLIENT IS REFUSED — 403, and told which model they are on', async () => {
    const { mod, verdict } = await verdictWith({ stored: 'programme' })
    expect(verdict.allowed).toBe(false)
    expect((verdict as { status: number }).status).toBe(403)
    expect((verdict as { reason: string }).reason).toBe(mod.LEGACY_DOOR_REFUSAL)
  })

  it('🛑 AND SO IS AN UNCLASSIFIED CLIENT WITH AN OPEN PROGRAMME', async () => {
    const { verdict } = await verdictWith({ stored: null, openProgramme: { id: 'p1' } })
    expect(verdict.allowed).toBe(false)
    expect((verdict as { status: number }).status).toBe(403)
  })

  it('🛑 UNREADABLE IS A 503, NOT A 403 — and never an open door', async () => {
    // "We could not tell" and "you are on the programme" are different sentences, and only
    // one of them is about the client. Both refuse; only one invites a retry.
    const { verdict } = await verdictWith({ clientError: { message: 'connection reset' } })
    expect(verdict.allowed, 'an unreadable model opened a door that spends money').toBe(false)
    expect((verdict as { status: number }).status).toBe(503)
    expect((verdict as { reason: string }).reason).toContain('connection reset')
  })

  it('🛑 AND AN UNREADABLE PROGRAMME TABLE IS THE SAME REFUSAL', async () => {
    const { verdict } = await verdictWith({ stored: null, programmeThrows: true })
    expect(verdict.allowed).toBe(false)
    expect((verdict as { status: number }).status).toBe(503)
  })

  it('🛑 NO CLIENT PASSES A LEGACY DOOR ANY MORE — stored legacy and NULL are refused (R137)', async () => {
    // ⛓️ INVERTED 23 Sep (R137). WAS: `'🛑 A LEGACY CLIENT IS UNAFFECTED — R74 keeps the retired
    // runtime live'`, asserting both verdicts `allowed: true`. R137 retires that runtime for
    // every account. Founder, verbatim: *"the 299/4 is retired/ this must go. everything must be
    // updated to new programme pricing model."*
    for (const stored of ['legacy', null] as const) {
      const { verdict } = await verdictWith({ stored })
      expect(verdict.allowed, `stored ${String(stored)} must not open a retired door`).toBe(false)
      expect((verdict as { status: number }).status, 'a programme answer, not "we could not tell"').toBe(403)
    }
  })

  it('🛑 AND A THROW IS A REFUSAL TOO — asserted in source, because nothing can reach it', () => {
    // ⚠️ DEFENCE IN DEPTH, AND HONESTLY LABELLED. `clientCommercialModel` catches its own
    // reads, so the only way to reach this catch is a failure of the dynamic import itself —
    // not something a caller can produce. It is asserted where it can be: a door that crashes
    // on its own gate is a door that fails OPEN the moment somebody wraps it in a try/catch.
    const CM = src('./commercial-model.ts')
    const at = CM.indexOf('export async function legacyDoorVerdict')
    const fn = CM.slice(at)
    const catchAt = fn.indexOf('} catch (err) {')
    expect(catchAt, 'the verdict no longer catches at all').toBeGreaterThan(-1)
    expect(fn.slice(catchAt, catchAt + 400)).toContain('allowed: false, status: 503')
    expect(fn.slice(catchAt, catchAt + 400), 'a thrown resolution opens the door')
      .not.toContain('allowed: true')
  })

  it('the refusal names the programme and never a credit balance', () => {
    const CM = src('./commercial-model.ts')
    const at = CM.indexOf('export const LEGACY_DOOR_REFUSAL')
    const copy = CM.slice(at, CM.indexOf('export type LegacyDoorVerdict', at))
    expect(copy).toContain('on the programme')
    expect(copy, 'the refusal quotes a balance the account does not have').not.toMatch(/\$|balance|credits left/)
  })
})
