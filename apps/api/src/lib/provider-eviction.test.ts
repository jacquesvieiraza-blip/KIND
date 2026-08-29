// ═══════════════════════════════════════════════════════════════════════════════════════
// SUPPRESSED AFTER ENROL, BEFORE SEND — the case the send gate does not cover.
//
// THE FOUNDER'S ACCEPTANCE LINE: "suppressed after enrol, before send → no delivery →
// provider-side continuation stopped."
//
// This suite proves the first two clauses and is DELIBERATELY HONEST ABOUT THE THIRD.
//
//   ✅ no delivery from K.I.N.D           — the send gate refuses, on every path
//   ✅ our own continuation stopped        — the enrolment is moved to 'opted_out'
//   ⚠️ provider-side continuation STOPPED  — NOT achievable for Smartlead. There is no
//                                            confirmable remove endpoint (api.smartlead.ai
//                                            returns 403 from this environment; founder-ruled
//                                            20 Aug, "yes alert not api"). What this build
//                                            adds is a TRACKED, PERSISTED BLOCKER so the
//                                            unclosed risk is countable and visible instead
//                                            of living in one email nobody may read.
//
// Saying that plainly is the point. A test suite that asserted "continuation stopped" here
// would be asserting something untrue, and a green suite claiming a closed risk is worse
// than a red one — it is how a product comes to LOOK like it propagates opt-outs while a
// suppressed person keeps receiving mail.
//
// No legal or compliance claim is made anywhere in this file.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { stripCommentsForEnvScan } from './env-inventory'

const API = join(__dirname, '..')
/** CODE assertions read comment-stripped source, so a guard cannot trip over prose. */
const read = (f: string) => stripCommentsForEnvScan(readFileSync(join(API, f), 'utf8'))
/**
 * DOCUMENTATION assertions read the RAW file — the classification and the "this does not
 * close the risk" wording live in comments ON PURPOSE, because they are instructions to the
 * next reader rather than behaviour. Stripping them would be asserting the opposite of what
 * these two checks are for.
 */
const readRaw = (f: string) => readFileSync(join(API, f), 'utf8')

// ═══════════════════════════════════════════════════════════════════════════════════════
// A · THE CLASSIFICATION, PER PROVIDER — asserted, not assumed
// ═══════════════════════════════════════════════════════════════════════════════════════

describe('every provider path is classified, and the classification matches the code', () => {
  it('SMARTLEAD — the provider IS told, via its global block list', () => {
    // ⛓️ THIS ASSERTION REPLACES ONE THAT WAS WRONG. It used to prove that only an ALERT
    // existed, and cited that as evidence of "no safe eviction mechanism". That was true of
    // this repo and I stated it as a fact about Smartlead, whose API supports pause,
    // unsubscribe-from-campaign, global unsubscribe and a workspace global block list. A
    // green test asserting the wrong claim defends it, so it is replaced, not amended.
    expect(read('lib/smartlead.ts')).toContain('addToGlobalBlockList')
    expect(read('lib/provider-eviction.ts')).toContain('addToGlobalBlockList')
  })

  it('the endpoint chosen matches our suppression IDENTITY and SEMANTICS', () => {
    const sl = read('lib/smartlead.ts')
    const fn = sl.slice(sl.indexOf('export async function addToGlobalBlockList'))
    const body = fn.slice(0, fn.indexOf('\n}'))
    // Email, not a stored Smartlead lead id we may never have.
    expect(body).toContain('domain_block_list')
    // Workspace-wide: null client scope. Global has to outlive any one campaign.
    expect(body).toContain('client_id: null')
    // ⚠️ ADDRESSES ONLY — never a bare domain. Suppressing a whole company because one
    // person opted out would silence colleagues who never asked.
    expect(body).not.toMatch(/split\(['"]@['"]\)/)
  })

  it('THE 20-AUG ALERT IS KEPT ALONGSIDE, not replaced', () => {
    // It is the human-readable half. The API call is the tracked half. Removing the alert to
    // "tidy up" would take away the thing a person actually reads.
    const alertFn = read('lib/smartlead-send.ts')
    expect(alertFn).toContain('alertSmartleadStillSending')
    expect(alertFn).toContain('sendFounderAlert')
  })

  it('SMARTLEAD — the blocker is raised on BOTH suppression doors, not just one', () => {
    // An opt-out tracked on reply-STOP and untracked on one-click unsubscribe is a hole
    // shaped exactly like the door people actually use.
    expect(read('lib/reply-ingest.ts')).toContain('propagateSuppressionToProviders')
    expect(read('routes/figsy.ts')).toContain('propagateSuppressionToProviders')
  })

  it('INSTANTLY — dormant, so entry is refused AND retention is still counted', () => {
    const src = read('lib/instantly-push.ts')
    expect(src).toContain('checkSendAllowed')
    // Refusing entry changes nothing for someone already inside a provider, so the refusal
    // path raises the blocker too. A revival must not be able to retain a suppressed person.
    const refusal = src.slice(src.indexOf('if (!verdict.allowed)'))
    expect(refusal.slice(0, 700)).toContain('propagateSuppressionToProviders')
  })

  it('WHATSAPP and LINKEDIN — no provider-side sequence exists to continue', () => {
    // Meta sends exactly what we hand it, one message at a time; PhantomBuster acts per
    // queued step. Nothing continues on its own after suppression because nothing was ever
    // handed over to continue — the send gate IS the whole answer for these two.
    for (const f of ['lib/whatsapp.ts', 'lib/linkedin.ts']) {
      expect(read(f), `${f} must consult the send gate`).toContain('checkSendAllowed')
    }
    // And the classification is written down where the next reader will find it, so nobody
    // has to re-derive "is there a continuation path here?" from scratch.
    const doc = readRaw('lib/provider-eviction.ts')
    expect(doc).toContain('WHATSAPP')
    expect(doc).toContain('LINKEDIN')
  })

  it('THE CLAIM BOUNDARY IS STATED — code verified is not runtime verified', () => {
    // The provider call is written to the DOCUMENTED contract; both Smartlead doc hosts
    // return 403 from here, so the request shape cannot be confirmed. Mocked tests prove OUR
    // half and never Smartlead's, and every file that carries the call says so — because the
    // failure this repo keeps finding is a green suite read as a runtime guarantee.
    for (const f of ['lib/provider-eviction.ts', 'lib/smartlead.ts']) {
      expect(readRaw(f), `${f} must carry the claim boundary`).toMatch(/RUNTIME UNVERIFIED/)
    }
    expect(readRaw('lib/provider-eviction.ts')).toMatch(/NO LEGAL OR COMPLIANCE CLAIM/i)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// B · THE FAILURE MATRIX — suppressed after enrol, before send
// ═══════════════════════════════════════════════════════════════════════════════════════

type Rec = {
  leads: Record<string, unknown>[]
  updates: Record<string, unknown>[]
  readError: { message: string } | null
  /** What Smartlead's global block list answers. */
  provider: { ok: true; data: unknown } | { ok: false; status: number | null; error: string }
  providerCalls: string[][]
  alerts: string[]
}

function fresh(): Rec {
  return { leads: [], updates: [], readError: null, provider: { ok: true, data: {} }, providerCalls: [], alerts: [] }
}

async function withDb(rec: Rec) {
  vi.resetModules()
  vi.doMock('@kind/db', () => ({
    db: { from: () => {
      const q: Record<string, unknown> = {}
      for (const m of ['select', 'eq', 'not', 'is', 'ilike', 'order', 'limit']) q[m] = () => q
      q.update = (patch: Record<string, unknown>) => {
        rec.updates.push(patch)
        const chain: Record<string, unknown> = {}
        chain.eq = () => chain
        chain.not = () => chain
        ;(chain as { then: unknown }).then = (r: (v: unknown) => void) => r({ error: null })
        return chain
      }
      q.then = (r: (v: unknown) => void) =>
        r(rec.readError ? { data: null, error: rec.readError } : { data: rec.leads, error: null })
      return q
    } },
  }))
  vi.doMock('./smartlead', () => ({
    addToGlobalBlockList: async (emails: string[]) => { rec.providerCalls.push(emails); return rec.provider },
  }))
  vi.doMock('./alerts', () => ({
    sendFounderAlert: async (_k: string, subject: string) => { rec.alerts.push(subject) },
  }))
  return import('./provider-eviction')
}

const inCampaign = (over: Record<string, unknown> = {}) => ({
  id: 'l-1', smartlead_campaign_id: 'camp-9',
  provider_eviction_required_at: null, provider_evicted_at: null, ...over,
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// THE ACCEPTANCE MATRIX — A through F
// ═══════════════════════════════════════════════════════════════════════════════════════

describe('A · SUPPRESSED BEFORE THE PROVIDER PUSH — never pushed', () => {
  it('a person in no provider triggers no provider call at all', async () => {
    // The send gate refuses the push; there is nothing on Smartlead's side to stop, and
    // calling their API for someone who was never there is noise, not safety.
    const rec = fresh()
    const m = await withDb(rec)
    const out = await m.propagateSuppressionToProviders('never-pushed@example.com', 'list_unsubscribe')
    expect(out.attempted).toBe(false)
    expect(out.openBlockers).toBe(0)
    expect(rec.providerCalls).toHaveLength(0)
    expect(rec.updates).toHaveLength(0)
  })

  it('the entry gate itself is the send gate — asserted where it lives', () => {
    const push = read('lib/instantly-push.ts')
    expect(push).toContain('checkSendAllowed')
    expect(read('lib/smartlead-send.ts')).toContain('opt_out_blocklist')
  })
})

describe('B · SUPPRESSED AFTER ENROLMENT — ours stops, and Smartlead is TOLD', () => {
  it('THE PROVIDER SUPPRESSION REQUEST IS ACTUALLY MADE, with the email', async () => {
    const rec = fresh()
    rec.leads = [inCampaign()]
    const m = await withDb(rec)
    const out = await m.propagateSuppressionToProviders('Stop@Example.com', 'replied_opt_out')
    expect(out.attempted).toBe(true)
    expect(rec.providerCalls).toEqual([['stop@example.com']])
  })

  it('THE BLOCKER IS RAISED BEFORE THE CALL, not after', async () => {
    // If the process dies mid-call the risk must already be recorded. Raising it afterwards
    // means a crash leaves a suppressed person in a live campaign with nothing saying so.
    const rec = fresh()
    rec.leads = [inCampaign()]
    const m = await withDb(rec)
    await m.propagateSuppressionToProviders('stop@example.com', 'replied_opt_out')
    expect(rec.updates[0].provider_eviction_required_at).toBeTruthy()
    expect(rec.updates[0].provider_eviction_provider).toBe('smartlead')
  })
})

describe('C · PROVIDER SUPPRESSION SUCCEEDS — resolved, with the evidence kept', () => {
  it('no unresolved blocker remains', async () => {
    const rec = fresh()
    rec.leads = [inCampaign()]
    const m = await withDb(rec)
    const out = await m.propagateSuppressionToProviders('stop@example.com', 'replied_opt_out')
    expect(out.providerOk).toBe(true)
    expect(out.openBlockers).toBe(0)
    const resolve = rec.updates.find(u => u.provider_evicted_at)!
    expect(resolve.provider_evicted_by).toBe('smartlead-api:global_block_list')
  })

  it('HISTORY IS RETAINED — the raise is not erased by the resolution', async () => {
    // The record must still say this person WAS in a campaign when they opted out, and how
    // long the gap was. Resolution is a stamp on top of history, never an erasure of it.
    const rec = fresh()
    rec.leads = [inCampaign()]
    const m = await withDb(rec)
    await m.propagateSuppressionToProviders('stop@example.com', 'replied_opt_out')
    const resolve = rec.updates.find(u => u.provider_evicted_at)!
    expect(resolve).not.toHaveProperty('provider_eviction_required_at')
  })

  it('no founder alert is raised on the happy path — an alert per opt-out is noise', async () => {
    const rec = fresh()
    rec.leads = [inCampaign()]
    const m = await withDb(rec)
    await m.propagateSuppressionToProviders('stop@example.com', 'replied_opt_out')
    expect(rec.alerts).toHaveLength(0)
  })
})

describe('D · PROVIDER SUPPRESSION FAILS — ours holds, the blocker stands', () => {
  it('K.I.N.D SUPPRESSION IS NOT ROLLED BACK, and nothing here can unwind it', async () => {
    // The blocklist write happened before this function was called and never depended on it.
    // Asserted at the call site, because that ordering is the guarantee.
    const src = read('lib/reply-ingest.ts')
    const blocklistAt = src.indexOf("from('opt_out_blocklist')")
    const providerAt = src.indexOf('propagateSuppressionToProviders')
    expect(blocklistAt).toBeGreaterThan(-1)
    expect(providerAt).toBeGreaterThan(blocklistAt)
  })

  it('a failed provider call leaves the blocker OPEN and pages the founder', async () => {
    const rec = fresh()
    rec.leads = [inCampaign()]
    rec.provider = { ok: false, status: 401, error: 'HTTP 401 — the key was rejected' }
    const m = await withDb(rec)
    const out = await m.propagateSuppressionToProviders('stop@example.com', 'replied_opt_out')
    expect(out.providerOk).toBe(false)
    expect(out.openBlockers).toBe(1)
    expect(rec.updates.some(u => u.provider_evicted_at)).toBe(false)
    expect(rec.alerts[0]).toMatch(/SMARTLEAD SUPPRESSION FAILED/)
  })

  it('an unreadable membership check returns null blockers — NEVER zero', async () => {
    const rec = fresh()
    rec.readError = { message: 'permission denied' }
    const m = await withDb(rec)
    const out = await m.propagateSuppressionToProviders('stop@example.com', 'replied_opt_out')
    expect(out.openBlockers).toBeNull()
    expect(rec.providerCalls).toHaveLength(0)
  })

  it('A THROW NEVER UNWINDS THE SUPPRESSION', async () => {
    // ⚠️ REGRESSION GUARD for a defect I introduced and check.sh caught: the first cut had no
    // try/catch, so a throw propagated out of suppressOptOut AFTER the blocklist row was
    // written, taking the rest of the opt-out path with it.
    vi.resetModules()
    vi.doMock('@kind/db', () => ({ db: { from: () => { throw new Error('driver exploded') } } }))
    const m = await import('./provider-eviction')
    const out = await m.propagateSuppressionToProviders('stop@example.com', 'replied_opt_out')
    expect(out.openBlockers).toBeNull()
    expect(out.providerOk).toBe(false)
    vi.doUnmock('@kind/db')
  })
})

describe('E · REPEATED SUPPRESSION IS IDEMPOTENT', () => {
  it('an already-resolved person is NOT re-sent to the provider', async () => {
    const rec = fresh()
    rec.leads = [inCampaign({ provider_eviction_required_at: '2026-08-01T00:00:00Z', provider_evicted_at: '2026-08-01T01:00:00Z' })]
    const m = await withDb(rec)
    const out = await m.propagateSuppressionToProviders('stop@example.com', 'replied_opt_out')
    expect(out.attempted).toBe(false)
    expect(out.providerOk).toBe(true)
    expect(rec.providerCalls).toHaveLength(0)
    expect(rec.updates).toHaveLength(0)
  })

  it('AN OPEN BLOCKER KEEPS ITS ORIGINAL CLOCK on a retry', async () => {
    // Its age is how long this person may have been receiving mail — the single most useful
    // number here, and refreshing it on every retry erases exactly that.
    const rec = fresh()
    rec.leads = [inCampaign({ provider_eviction_required_at: '2026-08-01T00:00:00Z' })]
    const m = await withDb(rec)
    await m.propagateSuppressionToProviders('stop@example.com', 'again')
    expect(rec.updates.some(u => u.provider_eviction_required_at)).toBe(false)
  })

  it('a retry after a failure DOES call the provider again — that is the recovery path', async () => {
    const rec = fresh()
    rec.leads = [inCampaign({ provider_eviction_required_at: '2026-08-01T00:00:00Z' })]
    const m = await withDb(rec)
    await m.propagateSuppressionToProviders('stop@example.com', 'again')
    expect(rec.providerCalls).toEqual([['stop@example.com']])
  })

  it('nothing here resumes a lead or clears a local suppression', async () => {
    const rec = fresh()
    rec.leads = [inCampaign()]
    const m = await withDb(rec)
    await m.propagateSuppressionToProviders('stop@example.com', 'replied_opt_out')
    for (const u of rec.updates) {
      expect(Object.keys(u)).not.toContain('status')
      expect(Object.keys(u)).not.toContain('opted_out_at')
      expect(Object.keys(u)).not.toContain('opted_back_in_at')
    }
  })
})

describe('the operator queue and its named-human resolution', () => {
  it('lists what is raised and NOT yet cleared', async () => {
    const rec = fresh()
    rec.leads = [{ id: 'l-1', client_id: 'c1', email: 'stop@example.com', smartlead_campaign_id: 'camp-9',
      provider_eviction_provider: 'smartlead', provider_eviction_reason: 'replied_opt_out',
      provider_eviction_required_at: '2026-08-01T00:00:00Z' }]
    const m = await withDb(rec)
    const pending = await m.pendingProviderEvictions()
    expect(pending![0].campaignId).toBe('camp-9')
    expect(pending![0].raisedAt).toBe('2026-08-01T00:00:00Z')
  })

  it('A BLOCKER CANNOT BE CLEARED WITHOUT A NAMED HUMAN', async () => {
    const rec = fresh()
    const m = await withDb(rec)
    expect(await m.markProviderEvicted('l-1', '   ')).toBe(false)
    expect(rec.updates).toHaveLength(0)
    expect(await m.markProviderEvicted('l-1', 'jacques.vieiraza@gmail.com')).toBe(true)
    expect(rec.updates[0].provider_evicted_by).toBe('jacques.vieiraza@gmail.com')
  })
})

describe('OUR OWN continuation is stopped — the half that IS fully closed', () => {
  const src = read('lib/reply-ingest.ts')

  it('the enrolment is moved to opted_out, so K.I.N.D sends nothing further', () => {
    expect(src).toMatch(/from\('figsy_enrollments'\)[\s\S]{0,120}status: 'opted_out'/)
  })

  it('the lead itself is marked opted out', () => {
    expect(src).toMatch(/status: 'opted_out', opted_out_at/)
  })

  it('the blocker is raised AFTER the blocklist write, never instead of it', () => {
    // The suppression itself is the thing that matters and must not be held hostage to a
    // membership check — an alert or blocker failure must never take the opt-out down with it.
    const blocklistAt = src.indexOf("from('opt_out_blocklist')")
    const blockerAt = src.indexOf('propagateSuppressionToProviders')
    expect(blocklistAt).toBeGreaterThan(-1)
    expect(blockerAt).toBeGreaterThan(blocklistAt)
  })
})
