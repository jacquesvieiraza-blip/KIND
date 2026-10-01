// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 1 Oct (Coaching F6 · #2486 · R180) — THE CLIENT'S OWN SALES CONTEXT.
//
// Four answers about HOW the client sells — the objections they hear and their answers, the proof
// they lead with, who usually decides, and what a won deal looks like — kept once and used by
// every Coaching feature, starting with the meeting prep brief. They sit BESIDE the four offer
// answers Milla already asks (`client-offer.ts`: problems, impact, result, solution), in the same
// `figsy_knowledge` pitch record, so there is no new table and no migration.
//
// ⚠️ SKIPPABLE, AND NOTHING WAITS ON IT — same rule as the offer card.
// ⚠️ A RESULT IS QUOTED ONLY WITH PERMISSION — the offer's ROI reaches a prompt only when ticked.
// ═══════════════════════════════════════════════════════════════════════════════════════
import { db } from '@kind/db'

export const SALES_CONTEXT_MAX = 600
export const SALES_FIELDS = ['objections', 'lead_proof', 'decider', 'won_deal'] as const
export type SalesField = typeof SALES_FIELDS[number]
export type SalesContext = Record<SalesField, string> & { answeredAt: string | null }

const str = (v: unknown): string => (typeof v === 'string' ? v.trim().slice(0, SALES_CONTEXT_MAX) : '')

async function readPitch(clientId: string): Promise<Record<string, unknown>> {
  const { data, error } = await db.from('figsy_knowledge')
    .select('data').eq('client_id', clientId).eq('kind', 'pitch').maybeSingle()
  if (error) throw new Error(error.message)
  return ((data as { data?: Record<string, unknown> | null } | null)?.data ?? {}) as Record<string, unknown>
}

export function salesContextFrom(pitch: Record<string, unknown> | null | undefined): SalesContext {
  const sc = ((pitch ?? {}).sales_context ?? {}) as Record<string, unknown>
  return {
    objections: str(sc.objections), lead_proof: str(sc.lead_proof), decider: str(sc.decider), won_deal: str(sc.won_deal),
    answeredAt: typeof sc.answered_at === 'string' ? sc.answered_at : null,
  }
}

export async function readSalesContext(clientId: string): Promise<SalesContext> {
  return salesContextFrom(await readPitch(clientId))
}

/** What a client sent, cleaned. `null` when every field is empty. */
export function cleanSalesContext(body: unknown): Record<SalesField, string> | null {
  const b = (body ?? {}) as Record<string, unknown>
  const out = Object.fromEntries(SALES_FIELDS.map(f => [f, str(b[f])])) as Record<SalesField, string>
  return SALES_FIELDS.some(f => out[f]) ? out : null
}

/** Saved INTO the pitch, never over it: the offer answers and the Brief's fields are kept. */
export async function saveSalesContext(clientId: string, input: Record<SalesField, string>): Promise<void> {
  const d = await readPitch(clientId)
  const now = new Date().toISOString()
  const { error } = await db.from('figsy_knowledge').upsert({
    client_id: clientId, kind: 'pitch',
    data: { ...d, sales_context: { ...input, answered_at: now, source: 'milla_coaching' } },
    updated_at: now,
  }, { onConflict: 'client_id,kind' })
  if (error) throw new Error(error.message)
}

/**
 * The lines a Coaching prompt gains: the offer answers and the sales context, in the client's
 * own words. Pure, so the permission rule is tested directly. ⚠️ THE RESULT ONLY WITH PERMISSION.
 */
export function salesContextLines(pitch: Record<string, unknown> | null | undefined): string[] {
  const p = pitch ?? {}
  const offer = (p.offer ?? {}) as Record<string, unknown>
  const sc = salesContextFrom(p)
  const lines: string[] = []
  if (str(offer.problems)) lines.push(`Problems the seller solves: ${str(offer.problems)}`)
  if (str(offer.solution)) lines.push(`The seller's solution: ${str(offer.solution)}`)
  if (str(offer.roi) && offer.roi_may_quote === true) lines.push(`A result the seller may mention: ${str(offer.roi)}`)
  if (sc.objections) lines.push(`Objections the seller usually hears, and their answers: ${sc.objections}`)
  if (sc.lead_proof) lines.push(`Proof the seller leads with: ${sc.lead_proof}`)
  if (sc.decider) lines.push(`Who usually decides: ${sc.decider}`)
  if (sc.won_deal) lines.push(`What a won deal looks like: ${sc.won_deal}`)
  return lines
}
