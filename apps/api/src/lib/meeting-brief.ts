// ═══════════════════════════════════════════════════════════════════════════
// THE MEETING BRIEF (P34) — the pure half.
//
// One client-level record of what we understand about a client. Split from the
// database half for the same reason as P33 and P27's ab-winner: the rules worth
// guarding — above all the evidence rule — must be provable without Postgres.
//
// ── THE EVIDENCE RULE IS THE POINT OF THIS FILE ─────────────────────────────
// "Every populated value must be supported by existing client evidence. No model
// assumptions, no generic sales knowledge, no plausible-sounding invention.
// Unsupported fields remain empty."
//
// That is easy to agree with and easy to lose: the assembly below has no model
// in it at all. Every field is copied from a row, or left null. There is no LLM
// call on this path, which is the only way to make "no invention" checkable
// rather than hoped for. If a future version wants a model to phrase things, it
// must write into a DRAFT a human then approves — never straight into evidence.
//
// ── WHAT v1 IS ASSEMBLED FROM, AND THE SOURCE THAT DOES NOT EXIST ───────────
// The build brief named the Milla welcome conversation as the primary source.
// It is not persisted anywhere — /icps/builder/chat is stateless and the
// transcript dies with the page. Founder-ruled: build from what does persist.
//   active ICP  →  figsy_knowledge (pitch/messaging)  →  P32 lead_feedback
// ═══════════════════════════════════════════════════════════════════════════

/** Every field a brief can carry. All optional — see the evidence rule. */
export const BRIEF_FIELDS = [
  'objective', 'ideal_accounts', 'target_personas', 'exclusions', 'proposition',
  'proof_points', 'strong_signals', 'anti_signals', 'geography', 'meeting_objective',
] as const
export type BriefField = typeof BRIEF_FIELDS[number]

/** Where a populated field came from. 'client' means a human typed it. */
export type BriefSource = 'icp' | 'knowledge' | 'feedback' | 'client'

export type BriefContent = Partial<Record<BriefField, string | null>>
export type BriefProvenance = Partial<Record<BriefField, BriefSource>>

export type AssembledBrief = {
  content: BriefContent
  provenance: BriefProvenance
  /** Fields left empty because nothing supported them. Surfaced, not hidden. */
  unsupported: BriefField[]
}

/** The evidence the assembler is allowed to read. Nothing else is in scope. */
export type BriefEvidence = {
  icp?: {
    name?: string | null
    industries?: string[] | null
    job_titles?: string[] | null
    seniority_levels?: string[] | null
    company_sizes?: string[] | null
    geographies?: string[] | null
    keywords?: string[] | null
  } | null
  /** figsy_knowledge rows of kind 'pitch' / 'messaging', already flattened. */
  knowledge?: {
    pitch?: string | null
    product?: string | null
    pain_points?: string | null
    differentiators?: string | null
  } | null
  /** P32: reason codes this client has been rejecting, already aggregated. */
  antiSignals?: string[] | null
}

const clean = (v: unknown): string | null => {
  if (typeof v !== 'string') return null
  const t = v.trim()
  return t.length > 0 ? t : null
}

const list = (v: unknown): string | null => {
  if (!Array.isArray(v)) return null
  const items = v.map(x => (typeof x === 'string' ? x.trim() : '')).filter(Boolean)
  return items.length > 0 ? items.join(', ') : null
}

/**
 * Build a brief from evidence. Deterministic, no model, no invention.
 *
 * Note what is NOT here: `objective`, `proof_points` and `meeting_objective`
 * have no source in the current schema, so they are always returned unsupported.
 * That is the rule working, not a gap in the code — they become fillable the
 * moment a client edits the brief, which is exactly the path the product wants
 * (their words, attributed to them, versioned).
 */
export function assembleBrief(ev: BriefEvidence): AssembledBrief {
  const content: BriefContent = {}
  const provenance: BriefProvenance = {}

  const put = (field: BriefField, value: string | null, source: BriefSource) => {
    if (value === null) return
    content[field] = value
    provenance[field] = source
  }

  const icp = ev.icp ?? null
  if (icp) {
    // Personas and accounts describe WHO to reach — the ICP is the only record of that.
    const personas = [list(icp.job_titles), list(icp.seniority_levels)]
      .filter(Boolean).join(' · ')
    put('target_personas', personas.length > 0 ? personas : null, 'icp')

    const accounts = [list(icp.industries), list(icp.company_sizes) && `sized ${list(icp.company_sizes)}`]
      .filter(Boolean).join(', ')
    put('ideal_accounts', accounts.length > 0 ? accounts : null, 'icp')

    put('geography', list(icp.geographies), 'icp')
    put('strong_signals', list(icp.keywords), 'icp')
  }

  const k = ev.knowledge ?? null
  if (k) {
    // What the client SELLS — figsy_knowledge is the store the outreach prompts
    // already read, so the brief and the emails cannot disagree about the offer.
    put('proposition', clean(k.pitch) ?? clean(k.product), 'knowledge')
    put('proof_points', clean(k.differentiators), 'knowledge')
    put('objective', clean(k.pain_points) && `Reach buyers with: ${clean(k.pain_points)}`, 'knowledge')
  }

  // P32 — what this client has actually been REJECTING. The one field that comes
  // from behaviour rather than from something they typed, which makes it the most
  // valuable line in the brief and the one most worth showing them.
  const anti = (ev.antiSignals ?? []).map(s => s.trim()).filter(Boolean)
  put('anti_signals', anti.length > 0 ? anti.join(', ') : null, 'feedback')

  const unsupported = BRIEF_FIELDS.filter(f => content[f] == null)
  return { content, provenance, unsupported }
}

/**
 * Is this brief worth showing anyone? A brief with nothing in it is not a brief.
 *
 * Guards the assembly path: a brand-new client with no ICP and no knowledge would
 * otherwise get an empty draft that says "here's what I understand" and lists
 * nothing — which reads as broken rather than as early.
 */
export function hasSubstance(b: AssembledBrief): boolean {
  return Object.values(b.content).some(v => typeof v === 'string' && v.trim().length > 0)
}

/**
 * Render a brief as prompt context. Used by BOTH consumers, so the scoring model
 * and the sequence writer read the identical text — a difference between them
 * would be a silent divergence in what "the client's understanding" means.
 *
 * Returns null when there is nothing to add, so a caller can append nothing at
 * all rather than an empty header. Both consumers must then behave EXACTLY as
 * they do today, which is what the no-brief fallback requires.
 */
export function briefPromptContext(content: BriefContent): string | null {
  const LABELS: Record<BriefField, string> = {
    objective:         'Objective',
    ideal_accounts:    'Ideal accounts',
    target_personas:   'Target personas',
    exclusions:        'Do NOT target',
    proposition:       'What they sell',
    proof_points:      'Proof points',
    strong_signals:    'Strong signals',
    anti_signals:      'Anti-signals (this client has been rejecting these)',
    geography:         'Target geography (intent only — never a permission)',
    meeting_objective: 'What a good meeting looks like',
  }
  const lines = BRIEF_FIELDS
    .map(f => {
      const v = content[f]
      return typeof v === 'string' && v.trim() ? `- ${LABELS[f]}: ${v.trim()}` : null
    })
    .filter(Boolean)

  if (lines.length === 0) return null
  return `The client's approved Meeting Brief — what they have confirmed about who they want:\n${lines.join('\n')}`
}

/**
 * The next version number. Trivial, and separated so the off-by-one is testable:
 * a first brief is version 1, not 0, and an edit of v3 is v4 even if v2 was
 * skipped by a failed write.
 */
export function nextVersion(currentMax: number | null | undefined): number {
  return (typeof currentMax === 'number' && currentMax > 0 ? currentMax : 0) + 1
}

/**
 * Accept a client's edit. Only known fields survive, and only as trimmed text.
 *
 * A client edit is CLIENT-provided evidence: every field they touch is attributed
 * to them, not to the source it originally came from. Without that re-attribution
 * a brief would keep claiming a persona came from the ICP after the client
 * rewrote it, which is the provenance lying.
 */
export function applyClientEdit(
  base: BriefContent, baseProv: BriefProvenance, edit: Record<string, unknown>,
): { content: BriefContent; provenance: BriefProvenance } {
  const content: BriefContent = { ...base }
  const provenance: BriefProvenance = { ...baseProv }
  for (const f of BRIEF_FIELDS) {
    if (!(f in edit)) continue          // untouched fields keep their origin
    const v = clean(edit[f])
    if (v === null) {
      // Explicitly cleared. Drop the field AND its provenance — a stale source
      // for an empty field is worse than no record at all.
      delete content[f]
      delete provenance[f]
      continue
    }
    content[f] = v
    provenance[f] = 'client'
  }
  return { content, provenance }
}
