// ═══════════════════════════════════════════════════════════════════════════════════════
// THE CURRENT WORKSPACE — House's live Milla was showing its retired desk as current work
//
// 🛑 THE FOUNDER'S SCREENSHOT. House was set to `commercial_model = 'programme'` and has no
// open programme. Vida read it correctly. Milla did not: three prospect cards from the retired
// per-lead desk under "Earlier activity", a reply in Recent Replies, and historical campaign
// and meeting numbers — every one of them presented as the CURRENT workspace.
//
// ── THE CAUSE, AND WHY THE PREVIOUS FIX MISSED IT ───────────────────────────────────────
//
// #1633 scoped these reads to the OPEN PROGRAMME: `if (!programmeId) return everything()`. That
// is the C2 defect again in the read model — "no programme row" read as "no boundary" — and it
// was never updated when the commercial model landed. House has no programme, so every one of
// those reads fell straight back to the unbounded client-scoped list.
//
// ── THE DISTINCTION THIS SUITE EXISTS TO PROVE ──────────────────────────────────────────
//
// ⚠️ BLANKING EVERY PROGRAMME CLIENT WITH NO PROGRAMME WOULD BREAK THE LAUNCH. Signup writes
// `commercial_model = 'programme'`, so a GENUINE NEW CUSTOMER RUNNING FREE PROOF is in exactly
// that state — and their calibration cards are current work. Nothing on the lead row separates
// a proof lead from a legacy delivered one (both carry `delivered_at` + `surfaced_for_approval_at`
// and nothing else), so the discriminator is the PROOF SESSION, which `try_claim_proof_pass`
// records positively on the client.
//
// Every assertion below is paired: the House case AND the free-proof case, so a fix that
// silences one by breaking the other cannot pass.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

type Row = Record<string, unknown>

const state: {
  client: Row | null
  clientError: { message: string } | null
  programme: Row | null
  programmeError: { message: string } | null
  /** every table read, in order — proves a scope costs what it claims to cost */
  reads: string[]
} = { client: null, clientError: null, programme: null, programmeError: null, reads: [] }

vi.mock('@kind/db', () => ({
  db: {
    from: (table: string) => {
      const q: Record<string, unknown> = {}
      for (const m of ['select', 'eq', 'not', 'is', 'in', 'gte', 'order', 'limit']) q[m] = () => q
      q.maybeSingle = async () => {
        state.reads.push(table)
        if (table === 'clients')    return { data: state.client, error: state.clientError }
        if (table === 'programmes') return { data: state.programme, error: state.programmeError }
        return { data: null, error: null }
      }
      q.single = q.maybeSingle
      q.then = (r: (v: unknown) => unknown) => Promise.resolve({ data: [], error: null }).then(r)
      return q
    },
  },
}))

import { currentWorkspaceScope, hasCurrentWork } from './current-workspace'

const PROG = { id: 'p-new', client_id: 'c1', status: 'LIVE' }
const API = join(__dirname, '..')
const strip = (s: string) => s.split('\n')
  .filter(l => { const t = l.trim(); return !t.startsWith('//') && !t.startsWith('*') }).join('\n')
const raw = (p: string) => strip(readFileSync(join(API, p), 'utf8'))

beforeEach(() => {
  state.client = { commercial_model: null, proof_passes_done: 0, proof_started_at: null }
  state.clientError = null
  state.programme = null
  state.programmeError = null
  state.reads = []
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ① THE FIVE SCOPES — and the two that used to be one
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('① the boundary of a client\'s current work', () => {
  it('🛑 HOUSE — declared programme, no programme, no proof session → NONE', async () => {
    // The screenshot, as an assertion. `none` is a POSITIVE answer: there is no current work,
    // which is different from "we found none" and different again from "no boundary".
    state.client = { commercial_model: 'programme', proof_passes_done: 0, proof_started_at: null }
    const s = await currentWorkspaceScope('c1')
    expect(s.kind).toBe('none')
    expect(hasCurrentWork(s), 'House has no current workspace at all').toBe(false)
  })

  it('🛑 A GENUINE NEW CUSTOMER MID FREE PROOF — same model, same absence → PROOF, not none', async () => {
    // ⚠️ THE PAIR THAT MATTERS. Signup writes `commercial_model = 'programme'`, so this client
    // is in the identical model state as House. Blanking them would break the launch
    // acquisition motion, and a fix that cannot tell them apart is not a fix.
    state.client = { commercial_model: 'programme', proof_passes_done: 1, proof_started_at: '2026-09-03T09:00:00Z' }
    const s = await currentWorkspaceScope('c1')
    expect(s.kind).toBe('proof')
    expect(hasCurrentWork(s)).toBe(true)
  })

  it('🛑 P_NEW — a programme is open → PROGRAMME, and it carries the id for positive attribution', async () => {
    state.client = { commercial_model: 'programme', proof_passes_done: 0, proof_started_at: null }
    state.programme = PROG
    const s = await currentWorkspaceScope('c1')
    expect(s.kind).toBe('programme')
    expect(s.kind === 'programme' && s.programmeId).toBe('p-new')
  })

  it('a DECLARED LEGACY client → LEGACY — client-scoped, exactly as it always was', async () => {
    state.client = { commercial_model: 'legacy', proof_passes_done: 0, proof_started_at: null }
    expect((await currentWorkspaceScope('c1')).kind).toBe('legacy')
  })

  it('⚠️ NON-VACUOUS: an UNCLASSIFIED client → LEGACY. This is the whole live book.', async () => {
    // A change that fenced these accounts would blank every existing customer's desk on Friday.
    expect((await currentWorkspaceScope('c1')).kind).toBe('legacy')
    state.programme = PROG
    expect((await currentWorkspaceScope('c1')).kind, 'unclassified WITH a programme is scoped to it')
      .toBe('programme')
  })

  it('🛑 an UNREADABLE model → unreadable, never legacy and never none', async () => {
    state.clientError = { message: 'connection reset' }
    const s = await currentWorkspaceScope('c1')
    expect(s.kind).toBe('unreadable')
  })

  it('a proof COUNT with no start stamp is still a session — the stamp is not required', async () => {
    // ⛓️ CORRECTED. The first cut required `proof_started_at` because it BOUNDED the work by it.
    // That bound was wrong — the column is rewritten on every claim, so it would have hidden
    // pass 1 from a client on pass 2 — and with the bound gone the stamp has no job. An account
    // predating that migration is still a genuine free-proof client and keeps its desk.
    state.client = { commercial_model: 'programme', proof_passes_done: 2, proof_started_at: null }
    expect((await currentWorkspaceScope('c1')).kind).toBe('proof')
  })

  it('the proof read is skipped entirely for a legacy client — it costs nothing to be unchanged', async () => {
    state.client = { commercial_model: 'legacy', proof_passes_done: 0, proof_started_at: null }
    state.reads = []
    await currentWorkspaceScope('c1')
    // clients (the model) + programmes (is one open) — and no second clients read.
    expect(state.reads).toEqual(['clients', 'programmes'])
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ② IT IS NOT A NAME, A DATE CUTOFF, OR A HOUSE SPECIAL CASE
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('② the discriminator is positive, stored, and about nobody in particular', () => {
  it('🛑 no company name, no HOUSE_CLIENT_ID, no env var, no hardcoded id', () => {
    const src = raw('lib/current-workspace.ts')
    for (const banned of ['company_name', 'HOUSE_CLIENT_ID', 'get-kind.com', 'process.env', 'is_demo']) {
      expect(src, `the boundary must never be decided by ${banned}`).not.toContain(banned)
    }
  })

  it('🛑 IT WRITES NOTHING — no history is deleted, backfilled or restamped', () => {
    const src = raw('lib/current-workspace.ts')
    for (const w of ['.update(', '.insert(', '.delete(', '.upsert(', '.rpc(']) {
      expect(src, `the boundary must not write: ${w}`).not.toContain(w)
    }
  })

  it('🛑 THE ONLY TIMESTAMP IS THE SESSION\'S OWN START STAMP, not a chosen cutoff', () => {
    const src = raw('lib/current-workspace.ts')
    expect(src).toContain("select('proof_passes_done')")
    // 🛑 NO DATE ANYWHERE — not a cutoff, not a stamp, not arithmetic. A first cut bounded the
    // proof case by `proof_started_at`; that column is rewritten on every claim, so it would
    // have filtered away pass 1's batch for a client on pass 2. The count is the whole signal.
    expect(src, 'the boundary must not compare timestamps').not.toMatch(/proof_started_at|Date\.now\(\)|new Date\(|getTime\(\)|gte\(/)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ③ EVERY LIVE PATH THE FOUNDER'S SCREENSHOT SHOWED CONSUMES IT
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('③ the four surfaces that were rendering history as current work', () => {
  const summary = raw('lib/milla-summary.ts')
  const leadsRt = raw('routes/leads.ts')

  it('🛑 THE PROSPECT CARDS — /leads/for-approval is bounded, and returns [] for `none`', () => {
    const fn = leadsRt.slice(leadsRt.indexOf("leadRouter.get('/for-approval'"))
    expect(fn).toContain('currentWorkspaceScope(clientId)')
    expect(fn, 'no current work returns an empty desk positively, before the query')
      .toMatch(/if \(scope\.kind === 'none'\) \{ res\.json\(\{ success: true, data: \[\] \}\); return \}/)
    expect(fn).toContain("if (scope.kind === 'programme') q = q.eq('programme_id', scope.programmeId)")
    // 🛑 AND A PROOF CLIENT IS NOT BOUNDED — "two labelled proof sets, nothing deleted or
    // filtered away" is founder-locked, and a bound here hid pass 1 from a client on pass 2.
    expect(fn, 'no server-side filter may separate the proof batches')
      .not.toMatch(/\.(gte|gt|lte|lt)\(\s*['"]surfaced_for_approval_at/)
    // ⚠️ AND THE BOUNDARY IS APPLIED BEFORE THE ROWS ARE FETCHED, not filtered afterwards.
    expect(fn.indexOf('currentWorkspaceScope')).toBeLessThan(fn.indexOf('const { data, error } = await q'))
  })

  it('🛑 RECENT REPLIES — the rail the previous fix did not close', () => {
    const fn = summary.slice(summary.indexOf('async function recentRepliesFor'))
      .slice(0, summary.slice(summary.indexOf('async function recentRepliesFor')).indexOf('export async function'))
    expect(fn, 'the old open-programme scoping must be gone')
      .not.toContain('openProgrammeForClient')
    expect(fn).toContain('currentWorkspaceScope(clientId)')
    expect(fn, 'no current work is an empty rail, stated positively')
      .toMatch(/if \(scope\.kind === 'none'\) return \{ data: \[\] as Record<string, unknown>\[\], error: null \}/)
    expect(fn, 'and legacy still takes the identical query it always took')
      .toMatch(/if \(scope\.kind === 'legacy'\) return base\(\)/)
  })

  it('🛑 THE CAMPAIGN SENTENCE — fail-closed, and silent when there is no current work', () => {
    const fn = summary.slice(summary.indexOf('async function campaignFor'))
      .slice(0, summary.indexOf('async function recentRepliesFor') - summary.indexOf('async function campaignFor'))
    expect(fn).not.toContain('openProgrammeForClient')
    expect(fn).toContain('currentWorkspaceScope(clientId)')
    expect(fn).toMatch(/if \(scope\.kind === 'none'\) return \{ data: null, error: null \}/)
    expect(fn, 'an unreadable scope must not assert a campaign either')
      .toMatch(/if \(scope\.kind === 'unreadable'\)[\s\S]{0,300}return \{ data: null, error: null \}/)
    expect(fn).toMatch(/if \(scope\.kind === 'legacy'\) return newest\(\)/)
  })

  it('🛑 THE WAITING COUNT AND THE MEETING COUNT — the two numbers beside the cards', () => {
    expect(summary).toContain('const summaryScope = await currentWorkspaceScope(clientId)')
    expect(summary, 'and the count is not bounded by a date either')
      .not.toMatch(/\.gte\(\s*'surfaced_for_approval_at'/)
    expect(summary).toContain("const noCurrentWork = summaryScope.kind === 'none'")
    expect(summary, 'no current work means nothing is waiting')
      .toMatch(/noCurrentWork\s*\n?\s*\? Promise\.resolve\(\{ count: 0 \}\)/)
    expect(summary, 'and no meetings this month')
      .toContain('noCurrentWork ? Promise.resolve(null) : meetingCounts({ clientId, since: monthStart })')
    // ⚠️ THE ALL-TIME REPORT FIGURES ARE DELIBERATELY UNTOUCHED. They are labelled as history
    // and are the one place history belongs — this is what "preserved, not deleted" looks like.
    expect(summary).toContain('meetingCounts({ clientId }),')
  })

  it('🛑 THE "EARLIER ACTIVITY" BANNER IS DRIVEN BY THE CARD LIST, so it goes with them', () => {
    const page = strip(readFileSync(join(API, '../../portal/src/app/(milla)/milla/page.tsx'), 'utf8'))
    expect(page).toContain('leads && leads.length > 0 && proofPassesDone === 0 && (')
    expect(page, 'the founder-locked wording itself is untouched').toContain('Earlier activity')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ④ TENANCY, AND THE ARCHIVE
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('④ what does not change', () => {
  it('🛑 EVERY BOUNDED QUERY IS STILL CLIENT-SCOPED — the boundary narrows, never widens', () => {
    const leadsRt = raw('routes/leads.ts')
    const fn = leadsRt.slice(leadsRt.indexOf("leadRouter.get('/for-approval'"))
      .slice(0, 3000)
    expect(fn).toContain(".eq('client_id', clientId)")
    // MBF cannot leak into House and House cannot leak into MBF: the tenancy filter is not
    // conditional on the scope, and the scope only ever ADDS a filter.
    expect(fn.indexOf(".eq('client_id', clientId)"), 'tenancy is applied unconditionally')
      .toBeLessThan(fn.indexOf("if (scope.kind === 'programme')"))
  })

  it('🛑 NOTHING IN THE LIVE PATHS DELETES OR UPDATES A HISTORICAL ROW', () => {
    const summary = raw('lib/milla-summary.ts')
    for (const w of ['.delete(', '.update(']) {
      expect(summary, `milla-summary is a read model: ${w}`).not.toContain(w)
    }
  })
})
