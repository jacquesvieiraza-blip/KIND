// ═══════════════════════════════════════════════════════════════════════════════════════
// HOUSE READINESS — HISTORY MUST NOT WEAR THE CLOTHES OF CURRENT WORK.
//
// ⚑ 1 Sep. The founder walked Client Zero and found three surfaces crediting the programme
// with a retired desk's work:
//
//   • Pipeline: **Approved 16 · Contacted 145** — and 16 + 145 = **161**, exactly House's
//     historical revealed-lead count, on an account at Proof with sourcing unauthorised.
//   • Teams Hub: **"166 Leads today"** — House's ALL-TIME lead total, relabelled *today*.
//   • `/ae/low-credits`: still emailing "top up your credits" with no programme fence.
//
// 🛑 AND THE FINDING UNDER ALL OF IT. Milla says House is at **Proof**; Vida says House is on
// the **legacy model**. Neither is wrong: `readCustomerProgramme` maps "no programme row" to
// `NO_PROGRAMME` → stage Proof (`customer-programme.ts:65`), and Vida reads the same absence
// as legacy. **Nothing records which model a client is on**, so one fact is described in two
// vocabularies. House genuinely has no programme row.
//
// ⚠️ THESE TESTS DO NOT INVENT THAT FLAG. They prove the BOUNDARY: once a client has a
// programme, every surface counts only rows attributed to it; until then a legacy client's
// screens are untouched. The missing discriminator is a founder decision, reported not built.
//
// ⚠️ NOTHING HERE DELETES OR HIDES HISTORY. Every rule under test is a READ filter.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import {
  scopeFor, rowCountsForProgramme, onlyThisProgramme, HISTORY_NOT_THIS_PROGRAMME,
} from './programme-scope'

const API = join(__dirname, '..')
const PORTAL = join(__dirname, '../../../portal/src')
const strip = (s: string) => s
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n').filter(l => !l.trim().startsWith('//')).join('\n')
const raw = (p: string) => readFileSync(p, 'utf8')

// ── THE RULE, RUN ────────────────────────────────────────────────────────────────────────
describe('the isolation rule is executable, not a convention', () => {
  it('a client with no programme is LEGACY — their screens are untouched', () => {
    // 🛑 THE MOST IMPORTANT ASSERTION IN THIS FILE. R74 keeps the legacy runtime live for
    // legacy clients. Emptying a paying legacy client's pipeline to fix House would be a far
    // worse defect than the one being fixed.
    expect(scopeFor(null)).toEqual({ mode: 'legacy' })
    expect(scopeFor(undefined)).toEqual({ mode: 'legacy' })
    expect(rowCountsForProgramme(scopeFor(null), null)).toBe(true)
    expect(rowCountsForProgramme(scopeFor(null), 'anything')).toBe(true)
  })

  it('a client WITH a programme counts only rows carrying that programme id', () => {
    const s = scopeFor('prog-1')
    expect(s).toEqual({ mode: 'programme', programmeId: 'prog-1' })
    expect(rowCountsForProgramme(s, 'prog-1')).toBe(true)
    expect(rowCountsForProgramme(s, 'prog-2')).toBe(false)
  })

  it('🛑 ATTRIBUTION IS POSITIVE — a null programme_id is HISTORY, never "probably current"', () => {
    // This single line is the 161-lead bleed, expressed as a rule. Treating null as a match
    // is what credited House's programme with a retired desk's work.
    expect(rowCountsForProgramme(scopeFor('prog-1'), null)).toBe(false)
    expect(rowCountsForProgramme(scopeFor('prog-1'), undefined)).toBe(false)
  })

  it('the House shape, run end to end: 161 historical rows + 2 real ones', () => {
    const rows = [
      ...Array.from({ length: 161 }, (_, i) => ({ id: `hist-${i}`, programme_id: null })),
      { id: 'new-1', programme_id: 'prog-1' },
      { id: 'new-2', programme_id: 'prog-1' },
    ]
    // Before a programme exists: everything shows (legacy client, unchanged).
    expect(onlyThisProgramme(scopeFor(null), rows)).toHaveLength(163)
    // With a programme: only its own two.
    const kept = onlyThisProgramme(scopeFor('prog-1'), rows)
    expect(kept.map(r => r.id)).toEqual(['new-1', 'new-2'])
  })

  it('history is FILTERED, never destroyed — the input set is untouched', () => {
    const rows = [{ id: 'a', programme_id: null }, { id: 'b', programme_id: 'p' }]
    onlyThisProgramme(scopeFor('p'), rows)
    expect(rows).toHaveLength(2)                    // nothing removed from the source
    expect(rows[0].programme_id).toBe(null)         // nothing rewritten
  })

  it('an empty programme says so, and never implies the history was lost', () => {
    expect(HISTORY_NOT_THIS_PROGRAMME).toMatch(/kept on record/)
    expect(HISTORY_NOT_THIS_PROGRAMME).not.toMatch(/deleted|removed|lost/i)
  })
})

// ── PIPELINE: the 161 bleed ──────────────────────────────────────────────────────────────
describe('Pipeline no longer consumes historical leads as current programme activity', () => {
  const leads = strip(raw(join(API, 'routes/leads.ts')))

  it('the pipeline query is scoped by programme_id when a programme exists', () => {
    const q = leads.match(/leadRouter\.get\('\/pipeline'[\s\S]{0,3000}/)?.[0] ?? ''
    expect(q).not.toBe('')                                            // vacuity
    expect(q).toMatch(/scopeFor\(prog\.programmeId\)/)
    expect(q).toMatch(/if \(scope\.mode === 'programme'\) approvedQ = approvedQ\.eq\('programme_id', scope\.programmeId\)/)
  })

  it('an UNREADABLE programme refuses rather than falling through to legacy', () => {
    // 🛑 Falling through on the error path would re-open the bleed exactly where nobody looks.
    const q = leads.match(/leadRouter\.get\('\/pipeline'[\s\S]{0,3000}/)?.[0] ?? ''
    expect(q).toMatch(/if \(prog === null\)[\s\S]{0,220}res\.status\(503\)/)
  })

  it('and `revealed_at` is still the legacy claim it always was — not redefined', () => {
    // The fix is a SCOPE, not a redefinition of what approval meant historically.
    expect(leads).toMatch(/\.not\('revealed_at', 'is', null\)/)
  })
})

// ── TEAMS HUB: "166 Leads today" ─────────────────────────────────────────────────────────
describe('Teams Hub stops calling an all-time total "today"', () => {
  const hub = strip(raw(join(PORTAL, 'components/TeamsHub.tsx')))

  it('the value still comes from /leads/stats.total — the number was never wrong', () => {
    expect(hub).toMatch(/leadsRes\.value\?\.data\?\.total/)
  })

  it('Milla reads the truthful label; /dashboard keeps the one it always had', () => {
    expect(hub).toContain('millaTruthfulLabels ? "Leads, all time" : "Leads today"')
    expect(hub).toMatch(/millaTruthfulLabels = false/)   // default preserves legacy behaviour
  })

  it('and NO per-day metric was invented to fill the gap', () => {
    // `/leads/stats` has no daily figure; manufacturing one would be the fabrication the
    // brand rule forbids.
    expect(hub).not.toMatch(/leads_today|leadsPerDay|todayCount/)
  })

  it('the Milla route renders the shared component with the flag; the dashboard route does not', () => {
    const milla = raw(join(PORTAL, 'app/(milla)/milla/teams/page.tsx'))
    const dash = raw(join(PORTAL, 'app/(dashboard)/dashboard/team/page.tsx'))
    expect(milla).toMatch(/<TeamsHub millaTruthfulLabels \/>/)
    expect(dash).toMatch(/<TeamsHub \/>/)
    expect(dash, 'the legacy route must not adopt the Milla label').not.toMatch(/millaTruthfulLabels/)
  })
})

// ── R87: the fence that missed a route ───────────────────────────────────────────────────
describe('the retired low-credit email cannot reach a programme customer', () => {
  const internal = strip(raw(join(API, 'routes/internal.ts')))

  it('/ae/low-credits is fenced — it is a SEPARATE route from /ae/zero-credits', () => {
    // The 31-Aug fence landed on the sibling and missed this one, which has its own cron.
    const route = internal.match(/internalRouter\.post\('\/ae\/low-credits'[\s\S]{0,2600}/)?.[0] ?? ''
    expect(route).not.toBe('')                                        // vacuity
    expect(route).toMatch(/programmeClientIds\(/)
    expect(route).toMatch(/mayNotify\('low_credits'/)
  })

  it('the fence precedes the send, or it is not a fence', () => {
    const route = internal.match(/internalRouter\.post\('\/ae\/low-credits'[\s\S]{0,3000}/)?.[0] ?? ''
    const gate = route.indexOf("mayNotify('low_credits'")
    const send = route.indexOf('resend.emails.send')
    expect(gate).toBeGreaterThan(-1)
    expect(send).toBeGreaterThan(gate)
  })

  it('the sibling route keeps its own fences — this did not move them', () => {
    expect(internal).toMatch(/mayNotify\('zero_credits'/)
  })
})

// ── ISOLATION: nothing outside the fix moved ─────────────────────────────────────────────
describe('isolation — history preserved, legacy untouched, nothing else edited', () => {
  it('no delete, update or zeroing of historical rows was introduced', () => {
    const scope = raw(join(API, 'lib/programme-scope.ts'))
    for (const w of ['delete(', 'update(', 'upsert(', 'insert(']) {
      expect(scope, `programme-scope must be read-only — found ${w}`).not.toContain(w)
    }
  })

  it('the $4 per-lead constant and the legacy wallet path are UNTOUCHED', () => {
    // R74: the legacy runtime stays live for legacy clients. This slice scopes reads; it does
    // not retire the legacy money model, and pretending otherwise would break paying clients.
    const approve = raw(join(API, 'lib/approve-lead.ts'))
    expect(approve).toMatch(/export const PRICE_PER_LEAD_USD = 4/)
    expect(approve).toMatch(/try_charge_wallet/)
  })

  it('the score×100 writer is still parked, as it has been all week', () => {
    expect(raw(join(API, 'lib/scoring.ts'))).toMatch(/estimated_deal_value_usd:\s*r\.score \* 100/)
  })

  it('sending and paid sourcing remain OFF by default — this slice enabled nothing', () => {
    expect(raw(join(API, 'lib/figsy.ts'))).toMatch(/process\.env\.AUTO_OUTREACH_ENABLED === 'true'/)
    expect(raw(join(API, 'lib/paid-provider-guard.ts'))).toMatch(/PAID_PROVIDERS_ENABLED/)
  })
})
