// ═══════════════════════════════════════════════════════════════════════════════════════
// NEEDS ICP REVIEW — the operator's decision layer. (S1-RT-005.)
//
// ── WHAT THIS IS FOR ───────────────────────────────────────────────────────────────────
//
// A client described their own market in their own words and our CLOSED provider
// vocabularies could not take them. The product used to answer "Milla didn't catch that",
// deterministically, and the Brief could never be finished. Their words are now kept, only
// what we can prove is canonicalised, and the remainder lands here — with Proof and every
// provider spend REFUSED server-side until a person has finished the translation.
//
//     THE CLIENT SPEAKS NATURALLY. THE CLIENT NEVER HAS TO SPEAK APOLLO.
//     PROVIDER TRANSLATION IS OUR PROBLEM, NOT THEIRS.
//
// ── WHY A PURE MODULE ──────────────────────────────────────────────────────────────────
//
// Every decision below has a wrong answer that either strands a client for longer or clears
// a block that should have held. There is no React component test runtime in this repo, so
// the decisions live here where they can be driven directly and the component keeps only the
// render.
//
// 🛑 THIS FILE GRANTS NOTHING. The server re-canonicalises every value and owns the write;
// a screen that decided a resolution was valid would be a second authority, and two
// authorities have never agreed about anything here for long.
// ═══════════════════════════════════════════════════════════════════════════════════════

export const ICP_REVIEW_PATH = '/api/proxy/operator/icp-review'

export type ProviderField = 'industries' | 'seniority_levels' | 'company_sizes'

/** Plain English, because an operator reads this — never the column name. */
export const FIELD_LABEL: Record<ProviderField, string> = {
  industries:       'Industry',
  seniority_levels: 'Seniority',
  company_sizes:    'Company size',
}

export interface ReviewRow {
  icp_id: string
  client_id: string
  company_name: string | null
  name: string | null
  review: { requirements: Array<{ field: ProviderField; said: string[] }> } | null
  review_at: string | null
  canonical: Record<string, unknown>
  customer_truth: {
    target_category?: string | null
    target_company_type?: string | null
    brief?: Record<string, unknown> | null
  }
}

export interface ReviewView {
  state: 'loading' | 'ready' | 'error'
  rows: ReviewRow[]
  vocabularies: Record<ProviderField, string[]>
  error: string | null
}

/** Shown when the rail is genuinely empty — which is the normal, healthy state. */
export const ICP_REVIEW_EMPTY_COPY =
  'No client is waiting on a targeting translation. Everyone’s words mapped cleanly.'

/**
 * ⚠️ "NOBODY IS WAITING" AND "WE COULD NOT FIND OUT" ARE DIFFERENT FACTS, and collapsing
 * them would retire the only control this fail-closed design has: an operator who is shown
 * an empty rail because the read failed will not go looking for the client the server is
 * currently refusing to source for.
 */
export function readReviews(payload: unknown): ReviewView {
  const empty: ReviewView = { state: 'error', rows: [], vocabularies: EMPTY_VOCAB, error: null }
  if (!payload || typeof payload !== 'object') {
    return { ...empty, error: 'The review rail could not be read.' }
  }
  const p = payload as { success?: boolean; error?: string; data?: unknown }
  if (p.success !== true) {
    return { ...empty, error: typeof p.error === 'string' && p.error ? p.error : 'The review rail could not be read.' }
  }
  const d = (p.data ?? {}) as { reviews?: unknown; vocabularies?: unknown }
  const rows = Array.isArray(d.reviews) ? (d.reviews as ReviewRow[]) : []
  const vocab = readVocabularies(d.vocabularies)
  return { state: 'ready', rows, vocabularies: vocab, error: null }
}

const EMPTY_VOCAB: Record<ProviderField, string[]> =
  { industries: [], seniority_levels: [], company_sizes: [] }

/**
 * ⚠️ THE VOCABULARIES COME FROM THE SERVER, NEVER FROM A COPY IN THIS APP. A second list in
 * the admin would drift from the one the server validates against, and the operator would be
 * offered a value their own save then refuses — which is the drift this repo keeps writing
 * rules about.
 */
export function readVocabularies(v: unknown): Record<ProviderField, string[]> {
  if (!v || typeof v !== 'object') return EMPTY_VOCAB
  const o = v as Record<string, unknown>
  const one = (k: ProviderField) => (Array.isArray(o[k]) ? (o[k] as unknown[]).filter((x): x is string => typeof x === 'string') : [])
  return { industries: one('industries'), seniority_levels: one('seniority_levels'), company_sizes: one('company_sizes') }
}

/** The fields this row is actually waiting on. Nothing else may be edited from the panel. */
export function fieldsUnderReview(row: ReviewRow): ProviderField[] {
  return (row.review?.requirements ?? []).map(r => r.field)
}

/** The client's own words for one field, for the operator to translate FROM. */
export function saidFor(row: ReviewRow, field: ProviderField): string[] {
  return (row.review?.requirements ?? []).find(r => r.field === field)?.said ?? []
}

/** The ceiling the provider takes for any one closed field. Mirrors the server's `maxItems`. */
export const PROVIDER_MAX_ITEMS = 6

/**
 * 🛑 WHAT THE OPERATOR IS ACTUALLY DECIDING (S1-PD-07) — all four parts, on screen.
 *
 * ── WHY THIS EXISTS ────────────────────────────────────────────────────────────────────
 *
 * A provider field can be MIXED. The client says "Consulting and creative agencies";
 * "Consulting" canonicalises and goes live, "creative agencies" does not and becomes the
 * review. The panel showed the operator ONLY the unresolved words — so they picked "Media",
 * pressed save, and the route wrote `industries = ["Media"]`. "Consulting" was deleted by
 * the act of completing the translation, and nothing on screen had ever mentioned it.
 *
 * The server now merges, so the value is safe. This is the other half: the operator must not
 * have to INFER that an invisible value will be preserved. They see what already mapped,
 * what needs translating, what they have chosen, and what the ICP will actually hold.
 */
export interface FieldDecision {
  field: ProviderField
  /** What already translated and is live on the ICP right now. Never editable from here. */
  alreadyMapped: string[]
  /** The client's own words that could not be translated. */
  needsTranslation: string[]
  /** What the operator has picked for those words. */
  chosen: string[]
  /** What the ICP will hold after Save — the union, deduplicated, in the server's order. */
  final: string[]
  /** True when `final` exceeds the provider ceiling: the server REFUSES, it does not slice. */
  overMax: boolean
}

/**
 * ⚠️ THE SAME MERGE THE SERVER PERFORMS, and it is a PREVIEW, not an authority: the server
 * reads the existing half from the row and re-derives this independently. The two agreeing is
 * the point — an operator must never be shown one final set and have another one saved.
 */
export function fieldDecision(
  row: ReviewRow, field: ProviderField, picked: string[],
): FieldDecision {
  const before = (row.canonical ?? {})[field]
  const alreadyMapped = Array.isArray(before)
    ? (before as unknown[]).map(v => String(v ?? '').trim()).filter(Boolean)
    : []
  const final: string[] = []
  const seen = new Set<string>()
  for (const v of [...alreadyMapped, ...picked.map(p => String(p ?? '').trim())]) {
    if (!v) continue
    const k = v.toLowerCase()
    if (seen.has(k)) continue
    seen.add(k); final.push(v)
  }
  return {
    field,
    alreadyMapped,
    needsTranslation: saidFor(row, field),
    chosen: picked,
    final,
    overMax: final.length > PROVIDER_MAX_ITEMS,
  }
}

/** Every reviewed field's decision, for rendering. */
export function decisionsFor(
  row: ReviewRow, picked: Partial<Record<ProviderField, string[]>>,
): FieldDecision[] {
  return fieldsUnderReview(row).map(f => fieldDecision(row, f, picked[f] ?? []))
}

/** The one sentence under a field, so the panel never hand-assembles it. */
export function decisionSummary(d: FieldDecision): string {
  const already = d.alreadyMapped.length ? `Already mapped: ${d.alreadyMapped.join(', ')}. ` : ''
  const chosen = d.chosen.length ? `Chosen translation: ${d.chosen.join(', ')}. ` : ''
  return `${already}Needs translation: ${d.needsTranslation.map(s => `“${s}”`).join(', ')}. ${chosen}Final: ${d.final.join(' + ') || '—'}`
}

export type SubmitGate =
  | { ok: true }
  | { ok: false; reason: string }

/**
 * 🛑 MAY THIS RESOLUTION BE SENT?
 *
 * ⚠️ IT IS A COURTESY, NOT A GATE. The server re-canonicalises and refuses independently;
 * this exists so an operator is told BEFORE the round trip, not so the server can trust the
 * screen. Both refusals say the same thing for the same reason.
 *
 * ⚠️ EMPTY IS REFUSED, and that is the important one. Clearing a review by supplying nothing
 * would leave the provider column empty — which downstream means UNCONSTRAINED — so the
 * client's specific constraint would silently become a broader search than anyone chose.
 */
export function maySubmit(
  row: ReviewRow, picked: Partial<Record<ProviderField, string[]>>,
): SubmitGate {
  const needed = fieldsUnderReview(row)
  if (needed.length === 0) return { ok: false, reason: 'This row is not awaiting review.' }
  for (const f of needed) {
    if ((picked[f] ?? []).length === 0) {
      return {
        ok: false,
        reason: `Pick at least one ${FIELD_LABEL[f].toLowerCase()} value. Leaving it empty would mean NO constraint at all, which widens this client’s search rather than expressing it.`,
      }
    }
  }
  // ⚑ 14 Sep (S1-PD-07) — the same ceiling the server refuses on, said BEFORE the round trip.
  // The server still decides; this only spares the operator a rejected save.
  for (const d of decisionsFor(row, picked)) {
    if (d.overMax) {
      return {
        ok: false,
        reason: `${FIELD_LABEL[d.field]} would end up with ${d.final.length} values and the provider takes at most ${PROVIDER_MAX_ITEMS}: ${d.final.join(', ')}. Nothing has been saved. Choose the final list yourself — dropping one of this client’s constraints is a decision, not something to leave to a cut-off.`,
      }
    }
  }
  return { ok: true }
}

export interface ResolveResult {
  ok: boolean
  message: string
}

/** What the operator is told after a save. The server's own sentence wins where there is one. */
export const RESOLVE_FAILED_COPY =
  'The resolution was not saved, so nothing changed and this client is still waiting. Please try again.'

export function readResolve(payload: unknown): ResolveResult {
  if (!payload || typeof payload !== 'object') return { ok: false, message: RESOLVE_FAILED_COPY }
  const p = payload as { success?: boolean; error?: string }
  if (p.success === true) {
    return { ok: true, message: 'Saved. Their targeting is now provider-safe and Proof is unblocked for this client.' }
  }
  return { ok: false, message: typeof p.error === 'string' && p.error ? p.error : RESOLVE_FAILED_COPY }
}

/** The one resolve path. Built here so no call site hand-assembles it. */
export function resolvePath(icpId: string): string {
  return `${ICP_REVIEW_PATH}/${encodeURIComponent(icpId)}/resolve`
}
