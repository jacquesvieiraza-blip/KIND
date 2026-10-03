// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 3 Oct (R195 ④ · sequencing piece 2, founder's blueprint view 2) — "YOUR BUSINESS", KEPT ONCE.
//
// The founder: *"i want this type of thing"* — and R195 ④: the facts that do not change live ONCE,
// in My ICP → "Your business"; a programme picks from them and never overwrites them.
//
// ⚠️ NOTHING NEW IS COLLECTED. Milla already holds these facts — the Brief's (`product`,
// `pain_points`, `bad_fit`) and the four offer answers (`offer.*`, R163) — in the ONE store the
// email writer reads (`figsy_knowledge`, kind `pitch`, via `getClientKnowledgeForOutreach`). This
// file shows them and applies a change the client APPROVED in the chat. Nothing else.
//
// 🛑 APPROVED EMAILS NEVER MOVE. A programme email is built from its approved version as it goes
// out (R193 ①, `approved-step.ts`), so a change here shapes only emails written LATER. This file
// reads and writes `figsy_knowledge` and nothing else — no programme, enrolment or email.
//
// ⚠️ VERSIONED. Every approved change raises `profile.version` and keeps the before and after in
// `profile.history`, so "what changed" can always be answered (blueprint view 9, piece 7).
// ═══════════════════════════════════════════════════════════════════════════════════════
import { db } from '@kind/db'

export const BUSINESS_KEYS = ['sells', 'problems', 'impact', 'answer', 'result', 'not_fit'] as const
export type BusinessKey = typeof BUSINESS_KEYS[number]
export const BUSINESS_FIELD_MAX = 600
const HISTORY_KEEP = 50

export type BusinessFacts = Record<BusinessKey, string>
export type Business = {
  facts: BusinessFacts
  resultMayQuote: boolean
  /** Who they sell to and who buys — read from the live targeting, changed there. */
  market: string
  buyers: string
  /** 0 = nothing held yet. Rises by one on every approved change. */
  version: number
  approvedAt: string | null
}
export type BusinessChange = { key: BusinessKey; value: string; mayQuote: boolean; baseVersion: number }

type Rec = Record<string, unknown>
const s = (v: unknown): string => (typeof v === 'string' ? v.trim() : '')
const list = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && !!x.trim()) : [])

/** The facts, as the client sees them. Pure. */
export function businessFromRows(pitch: Rec | null, icp: Rec | null, updatedAt: string | null): Business {
  const p = pitch ?? {}
  const offer = (p.offer ?? {}) as Rec
  const profile = (p.profile ?? {}) as Rec
  const facts: BusinessFacts = {
    sells: s(p.product),
    // The offer answer is the client's own, later word; the Brief's is the fallback.
    problems: s(offer.problems) || s(p.pain_points),
    impact: s(offer.impact),
    answer: s(offer.solution),
    result: s(offer.roi),
    not_fit: s(p.bad_fit),
  }
  const held = Object.values(facts).some(Boolean)
  const version = typeof profile.version === 'number' ? profile.version : held ? 1 : 0
  const i = icp ?? {}
  const market = [
    ...list(i.industries), ...list(i.company_sizes).map(x => `${x} staff`), ...list(i.geographies),
  ].join(' · ')
  return {
    facts,
    resultMayQuote: offer.roi_may_quote === true,
    market,
    buyers: list(i.job_titles).join(' · '),
    version,
    approvedAt: s(profile.approved_at) || s(offer.answered_at) || (held ? updatedAt : null) || null,
  }
}

/** A change the client approved, cleaned. `null` = not a change we accept. */
export function cleanBusinessChange(body: unknown): BusinessChange | null {
  const b = (body ?? {}) as Rec
  const key = b.key as BusinessKey
  if (!BUSINESS_KEYS.includes(key)) return null
  if (typeof b.base_version !== 'number' || !Number.isInteger(b.base_version) || b.base_version < 0) return null
  const value = s(b.value).slice(0, BUSINESS_FIELD_MAX)
  // Only the result may be cleared — "we have no result we may quote" is a real answer.
  if (!value && key !== 'result') return null
  // A permission is only ever an explicit true (the R163 rule).
  return { key, value, mayQuote: key === 'result' && value ? b.may_quote === true : false, baseVersion: b.base_version }
}

/** The stored `pitch` data with one approved change applied. Pure; every other field is kept. */
export function mergeBusinessChange(
  data: Rec | null, change: { key: BusinessKey; value: string; mayQuote?: boolean }, at: string,
): Rec {
  const d: Rec = { ...(data ?? {}) }
  const offer: Rec = { ...((d.offer ?? {}) as Rec) }
  const before = businessFromRows(d, null, null)
  switch (change.key) {
    case 'sells': d.product = change.value; break
    // Both places, so the writer is never handed the old problem beside the new one.
    case 'problems': d.pain_points = change.value; offer.problems = change.value; break
    case 'impact': offer.impact = change.value; break
    case 'answer': offer.solution = change.value; break
    case 'result': offer.roi = change.value; offer.roi_may_quote = change.mayQuote === true; break
    case 'not_fit': d.bad_fit = change.value; break
  }
  if (change.key !== 'sells' && change.key !== 'not_fit') d.offer = offer
  const version = before.version + 1
  const history = Array.isArray(((d.profile ?? {}) as Rec).history) ? [...(((d.profile as Rec).history) as unknown[])] : []
  history.push({ version, key: change.key, before: before.facts[change.key], after: change.value, at })
  d.profile = { version, approved_at: at, history: history.slice(-HISTORY_KEEP) }
  return d
}

/** Reads the facts. A failed read THROWS — it is never shown as "nothing held". */
export async function readBusiness(clientId: string): Promise<Business> {
  const { data: k, error: kErr } = await db.from('figsy_knowledge')
    .select('data, updated_at').eq('client_id', clientId).eq('kind', 'pitch').maybeSingle()
  if (kErr) throw new Error(kErr.message)
  const { data: icp, error: iErr } = await db.from('icps')
    .select('industries, company_sizes, geographies, job_titles').eq('client_id', clientId).eq('is_active', true)
    .order('created_at', { ascending: false }).limit(1).maybeSingle()
  if (iErr) throw new Error(iErr.message)
  const row = k as { data?: Rec | null; updated_at?: string | null } | null
  return businessFromRows(row?.data ?? null, (icp as Rec | null) ?? null, row?.updated_at ?? null)
}

/**
 * Applies a change the client approved. `stale` when the facts moved since the client looked —
 * the change is then refused, never written over someone else's.
 */
export async function approveBusinessChange(
  clientId: string, change: BusinessChange,
): Promise<{ ok: true; version: number } | { ok: false; reason: 'stale'; version: number }> {
  const { data: k, error } = await db.from('figsy_knowledge')
    .select('data').eq('client_id', clientId).eq('kind', 'pitch').maybeSingle()
  if (error) throw new Error(error.message)
  const data = ((k as { data?: Rec | null } | null)?.data) ?? null
  const current = businessFromRows(data, null, null)
  if (change.baseVersion !== current.version) return { ok: false, reason: 'stale', version: current.version }
  const at = new Date().toISOString()
  const next = mergeBusinessChange(data, change, at)
  const { error: wErr } = await db.from('figsy_knowledge')
    .upsert({ client_id: clientId, kind: 'pitch', data: next, updated_at: at }, { onConflict: 'client_id,kind' })
  if (wErr) throw new Error(wErr.message)
  return { ok: true, version: (next.profile as { version: number }).version }
}
