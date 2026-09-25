// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 25 Sep (R158 · R163) — THE CLIENT'S OFFER, IN THEIR OWN WORDS.
//
// The founder: *"ask the client. what problems do you solve. what impact. have you seen an ROI.
// what is the solution. this is where the power of Milla comes in yes"* — built after the House
// full test, as ruled. Straight after choosing a programme, Milla shows four boxes; the answers
// land in the SAME store the email writer already reads (`figsy_knowledge`, kind `pitch`), so
// the next sequence is written from the client's own problem, impact, result and solution.
//
// 🛑 A RESULT IS USED ONLY WITH PERMISSION. The ROI is always RECORDED; it reaches an email only
// when the client ticked "you may mention this result" — the same rule the Brief's proof
// already follows (recorded in `proof_all`, never read by the digest without permission).
//
// ⚠️ SKIPPABLE, AND NOTHING WAITS ON IT (founder: "Asked, but can skip"). Preparation, approval
// and sending never read whether this was answered.
// ═══════════════════════════════════════════════════════════════════════════════════════
import { db } from '@kind/db'

export const OFFER_FIELD_MAX = 600

export type OfferInput = {
  problems: string
  impact: string
  roi: string
  roiMayQuote: boolean
  solution: string
}

export type OfferState = {
  answered: boolean
  skipped: boolean
  problems: string
  impact: string
  roi: string
  roiMayQuote: boolean
  solution: string
}

const str = (v: unknown): string => (typeof v === 'string' ? v.trim().slice(0, OFFER_FIELD_MAX) : '')

/** What a client sent, cleaned. `null` when there is nothing to save at all. */
export function cleanOffer(body: unknown): OfferInput | null {
  const b = (body ?? {}) as Record<string, unknown>
  const input: OfferInput = {
    problems: str(b.problems),
    impact: str(b.impact),
    roi: str(b.roi),
    // A permission is only ever an explicit true. Anything else — absent, "yes", 1 — is not.
    roiMayQuote: b.roiMayQuote === true,
    solution: str(b.solution),
  }
  return input.problems || input.impact || input.roi || input.solution ? input : null
}

async function readPitch(clientId: string): Promise<Record<string, unknown>> {
  const { data, error } = await db.from('figsy_knowledge')
    .select('data').eq('client_id', clientId).eq('kind', 'pitch').maybeSingle()
  if (error) throw new Error(error.message)
  return ((data as { data?: Record<string, unknown> | null } | null)?.data ?? {}) as Record<string, unknown>
}

export async function readOffer(clientId: string): Promise<OfferState> {
  const d = await readPitch(clientId)
  const offer = (d.offer ?? {}) as Record<string, unknown>
  return {
    answered: typeof offer.answered_at === 'string',
    skipped: typeof offer.skipped_at === 'string',
    problems: str(offer.problems),
    impact: str(offer.impact),
    roi: str(offer.roi),
    roiMayQuote: offer.roi_may_quote === true,
    solution: str(offer.solution),
  }
}

/**
 * Save the four answers INTO the existing pitch, never over it: the Brief's own fields
 * (product, pitch, pain_points, differentiators, proof_all…) are kept exactly as they were.
 */
export async function saveOffer(clientId: string, input: OfferInput): Promise<void> {
  const d = await readPitch(clientId)
  const now = new Date().toISOString()
  const { error } = await db.from('figsy_knowledge').upsert({
    client_id: clientId, kind: 'pitch',
    data: {
      ...d,
      offer: {
        problems: input.problems,
        impact: input.impact,
        roi: input.roi,
        roi_may_quote: input.roiMayQuote,
        solution: input.solution,
        answered_at: now,
        source: 'milla_offer_card',
      },
    },
    updated_at: now,
  }, { onConflict: 'client_id,kind' })
  if (error) throw new Error(error.message)
}

/** "Skip for now": remembered so the card is not pushed again; answering later still works. */
export async function skipOffer(clientId: string): Promise<void> {
  const d = await readPitch(clientId)
  const prev = (d.offer ?? {}) as Record<string, unknown>
  const now = new Date().toISOString()
  const { error } = await db.from('figsy_knowledge').upsert({
    client_id: clientId, kind: 'pitch',
    data: { ...d, offer: { ...prev, skipped_at: now } },
    updated_at: now,
  }, { onConflict: 'client_id,kind' })
  if (error) throw new Error(error.message)
}

/**
 * The lines the email writer's grounding gains from the offer. ⚠️ THE ROI ONLY WITH PERMISSION.
 * Called by `getClientKnowledgeForOutreach`; pure, so the permission rule is tested directly.
 */
export function offerDigestLines(pitchData: Record<string, unknown> | null | undefined): string[] {
  const offer = ((pitchData ?? {}).offer ?? {}) as Record<string, unknown>
  const lines: string[] = []
  if (str(offer.problems)) lines.push(`Problems the sender solves, in the client's words: ${str(offer.problems)}`)
  if (str(offer.impact))   lines.push(`What those problems cost the sender's customers: ${str(offer.impact)}`)
  if (str(offer.solution)) lines.push(`The sender's solution, in the client's words: ${str(offer.solution)}`)
  if (str(offer.roi) && offer.roi_may_quote === true) {
    lines.push(`A result the client has PERMITTED us to quote, exactly as stated: ${str(offer.roi)}`)
  }
  return lines
}
