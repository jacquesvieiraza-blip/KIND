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
  it('SMARTLEAD — no safe eviction mechanism, so a blocker is raised instead of a claim', () => {
    // The existing helper ALERTS. It sends an email naming who to remove by hand. It issues
    // no stop, pause or delete call, because none can be confirmed from here.
    const alertFn = read('lib/smartlead-send.ts')
    const body = alertFn.slice(alertFn.indexOf('export async function alertSmartleadStillSending'))
    const upToEnd = body.slice(0, body.indexOf('\n}'))
    expect(upToEnd).toContain('sendFounderAlert')
    // ⚠️ It must NOT be quietly upgraded to a guessed API call — writing an unverified
    // endpoint on a path that touches real people is what the 20 Aug ruling forbids.
    expect(upToEnd).not.toMatch(/fetch\(['"`]https:\/\/api\.smartlead/)
  })

  it('SMARTLEAD — the blocker is raised on BOTH suppression doors, not just one', () => {
    // An opt-out tracked on reply-STOP and untracked on one-click unsubscribe is a hole
    // shaped exactly like the door people actually use.
    expect(read('lib/reply-ingest.ts')).toContain('raiseProviderEviction')
    expect(read('routes/figsy.ts')).toContain('raiseProviderEviction')
  })

  it('INSTANTLY — dormant, so entry is refused AND retention is still counted', () => {
    const src = read('lib/instantly-push.ts')
    expect(src).toContain('checkSendAllowed')
    // Refusing entry changes nothing for someone already inside a provider, so the refusal
    // path raises the blocker too. A revival must not be able to retain a suppressed person.
    const refusal = src.slice(src.indexOf('if (!verdict.allowed)'))
    expect(refusal.slice(0, 700)).toContain('raiseProviderEviction')
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

  it('THE RISK IS NOT DESCRIBED AS CLOSED, anywhere', () => {
    // The founder's instruction: "do not pretend the risk is closed". Asserted as text,
    // because the wording is the control — a surface that reads as a tidy task queue would
    // imply the risk is managed.
    const src = readRaw('lib/provider-eviction.ts')
    expect(src).toMatch(/does not close it|does not CLOSE the risk|not the same thing/i)
    expect(src).toMatch(/NO LEGAL OR COMPLIANCE CLAIM/i)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// B · THE FAILURE MATRIX — suppressed after enrol, before send
// ═══════════════════════════════════════════════════════════════════════════════════════

type Rec = { leads: Record<string, unknown>[]; updates: Record<string, unknown>[]; readError: { message: string } | null }

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
  return import('./provider-eviction')
}

describe('SUPPRESSED AFTER ENROL — the blocker is raised, and it says what it means', () => {
  let rec: Rec
  beforeEach(() => { rec = { leads: [], updates: [], readError: null } })
  afterEach(() => { vi.doUnmock('@kind/db'); vi.resetModules() })

  it('a suppressed person ALREADY IN a campaign raises a blocker', async () => {
    rec.leads = [{ id: 'l-1', smartlead_campaign_id: 'camp-9', provider_eviction_required_at: null, provider_evicted_at: null }]
    const m = await withDb(rec)
    const open = await m.raiseProviderEviction('stop@example.com', 'replied_opt_out')
    expect(open).toBe(1)
    expect(rec.updates[0].provider_eviction_required_at).toBeTruthy()
    expect(rec.updates[0].provider_eviction_provider).toBe('smartlead')
    expect(rec.updates[0].provider_eviction_reason).toBe('replied_opt_out')
  })

  it('a suppressed person NOT in any campaign raises nothing — the send gate is sufficient', async () => {
    rec.leads = []
    const m = await withDb(rec)
    expect(await m.raiseProviderEviction('never-pushed@example.com', 'list_unsubscribe')).toBe(0)
    expect(rec.updates).toHaveLength(0)
  })

  it('RE-RAISING DOES NOT RESET THE CLOCK — the blocker\'s age is the operator signal', async () => {
    // How long a suppressed person may have been receiving mail is the single most useful
    // number here. Refreshing the timestamp on every re-check would erase it.
    rec.leads = [{ id: 'l-1', smartlead_campaign_id: 'camp-9', provider_eviction_required_at: '2026-08-01T00:00:00Z', provider_evicted_at: null }]
    const m = await withDb(rec)
    expect(await m.raiseProviderEviction('stop@example.com', 'again')).toBe(1)
    expect(rec.updates).toHaveLength(0)
  })

  it('A THROW NEVER UNWINDS THE SUPPRESSION — the blocklist write has already happened', async () => {
    // ⚠️ THIS IS A REGRESSION GUARD FOR A DEFECT I INTRODUCED, caught by check.sh at the
    // final gate. The first cut of raiseProviderEviction had no try/catch, so an unexpected
    // throw — a mock gap exposed it, but a schema change or a driver error would do the same
    // — propagated out of suppressOptOut AFTER the blocklist row was written, taking the
    // rest of the opt-out path down with it. alertSmartleadStillSending has always been
    // wrapped for exactly this reason and I did not copy the reasoning with the pattern.
    //
    // Losing the blocker is an untracked risk. Losing the suppression means we keep emailing
    // someone who said stop. The two are not close.
    vi.resetModules()
    vi.doMock('@kind/db', () => ({
      db: { from: () => { throw new Error('driver exploded') } },
    }))
    const m = await import('./provider-eviction')
    await expect(m.raiseProviderEviction('stop@example.com', 'replied_opt_out')).resolves.toBeNull()
    vi.doUnmock('@kind/db')
  })

  it('AN UNREADABLE CHECK RETURNS null, NEVER 0', async () => {
    // "We could not tell whether this person is still in a campaign" is the most dangerous
    // possible answer to render as "they are not".
    rec.readError = { message: 'permission denied' }
    const m = await withDb(rec)
    expect(await m.raiseProviderEviction('stop@example.com', 'replied_opt_out')).toBeNull()
  })

  it('the operator queue lists what is raised and NOT yet cleared', async () => {
    rec.leads = [{ id: 'l-1', client_id: 'c1', email: 'stop@example.com', smartlead_campaign_id: 'camp-9',
      provider_eviction_provider: 'smartlead', provider_eviction_reason: 'replied_opt_out',
      provider_eviction_required_at: '2026-08-01T00:00:00Z' }]
    const m = await withDb(rec)
    const pending = await m.pendingProviderEvictions()
    expect(pending).not.toBeNull()
    expect(pending![0].campaignId).toBe('camp-9')
    expect(pending![0].raisedAt).toBe('2026-08-01T00:00:00Z')
  })

  it('A BLOCKER CANNOT BE CLEARED WITHOUT A NAMED HUMAN', async () => {
    // "The system cleared it" confirms nothing. A blocker closeable without a name is a
    // blocker that gets closed to tidy the list.
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
    const blockerAt = src.indexOf('raiseProviderEviction')
    expect(blocklistAt).toBeGreaterThan(-1)
    expect(blockerAt).toBeGreaterThan(blocklistAt)
  })
})
