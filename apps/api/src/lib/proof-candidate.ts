/**
 * ══════════════════════════════════════════════════════════════════════════════════════════
 *  FREE-PROOF PASS-2 WIDENED CANDIDATE — the shape, and the one predicate that guards it.
 * ══════════════════════════════════════════════════════════════════════════════════════════
 *
 * ⚑ 25 Aug (founder-ruled). When pass 2's exact confirmed targeting matches nobody and the
 * ONE widened fallback finds people, the saved ICP is NOT changed. It changes only when the
 * client explicitly accepts that batch with "👍 Looks right", and then only in the two fields
 * the widening dropped.
 *
 * This file is the vocabulary both ends of that share: `runIcpJob` writes the candidate down
 * when the widened search succeeds, and the acceptance endpoint reads it back and proves the
 * accepted batch is the one it belongs to. It lives in ONE place because the encoder below is
 * correctness-critical and a second copy of it in the other route is how the two drift apart.
 *
 * Nothing here touches a database, a provider or money. Pure functions and a type.
 */

/** The five ICP targeting fields the widened fallback reasons about. Nothing else. */
export type ProofWidenedBasis = {
  job_titles:       string[]
  seniority_levels: string[]
  industries:       string[]
  company_sizes:    string[]
  geographies:      string[]
}

/**
 * The whole of what `icps.proof_widened_candidate` holds.
 *
 * `state` is the consumption marker, and it is a STATE rather than a delete on purpose: a
 * client whose browser lost the response to a successful click must be able to press again
 * and be told the truth ("that batch is already accepted") instead of being refused. Deleting
 * the row would make that indistinguishable from "there was never a widened proof".
 *
 * ⚠️ ONLY `pending` MAY CHANGE TARGETING. `accepted` is inert — it answers a repeat click and
 * nothing else.
 */
export type ProofWidenedCandidate = {
  version: 1
  state: 'pending' | 'accepted'
  proof_pass: 2
  /** The batch's `surfaced_for_approval_at`, byte-identical. This is what ties the two. */
  batch_at: string
  basis: ProofWidenedBasis
  accepted_at?: string
}

/** The five field names, in one place, so no caller can compare four of them and miss one. */
export const PROOF_BASIS_FIELDS = ['job_titles', 'seniority_levels', 'industries', 'company_sizes', 'geographies'] as const

/**
 * ── A POSTGRES `text[]` LITERAL, SAFE TO PUT IN A POSTGREST FILTER ──────────────────────
 *
 * This exists because the Supabase query builder CANNOT express array equality safely.
 * Read in `node_modules/@supabase/postgrest-js/src/PostgrestFilterBuilder.ts`:
 *
 *   .eq(col, value)          → `eq.${value}`             — a JS array stringifies to `a,b`,
 *                                                           which is not an array literal at
 *                                                           all; Postgres rejects the cast.
 *   .contains(col, array)    → `cs.{${value.join(',')}}`  — UNQUOTED elements, so any element
 *   .containedBy(col, array) → `cd.{${value.join(',')}}`    containing a comma silently
 *                                                           becomes two elements.
 *
 * That second one is not theoretical here: `PDL_SIZE_MAP` in `pdl-search.ts` carries the keys
 * `'1,000+'` and `'501–1,000'`, so a client's `company_sizes` legitimately contains commas.
 * `.contains('company_sizes', ['1,000+'])` asks for `{1,000+}` — the TWO-element array
 * `{"1","000+"}` — and matches the wrong rows, or none at all.
 *
 * So the literal is built here, quoted properly, and handed to `.filter(col, 'eq', …)`, which
 * appends the value verbatim and lets `URLSearchParams` encode it. `.filter` is a first-class
 * builder method: this adds NO RPC, NO database function and NO second schema object.
 *
 * ⚠️ RUNTIME UNVERIFIED, AND FAIL-CLOSED BY CONSTRUCTION. That PostgREST accepts
 * `col=eq.{"a","b"}` against a `text[]` column is documented behaviour, not something this
 * session could execute against a database. Were it wrong, the predicate matches ZERO rows —
 * so an acceptance REFUSES and routes to human review rather than applying a targeting change
 * it could not prove. That is the safe direction, and it is the only direction available.
 */
export function pgTextArrayLiteral(values: readonly string[]): string {
  // Backslash first, then the quote — escaping the quote first would then escape the
  // backslash it had just added, doubling it.
  const quoted = values.map(v => `"${String(v).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`)
  return `{${quoted.join(',')}}`
}

/**
 * Are two targeting arrays the same set of values?
 *
 * ⚠️ ORDER-INSENSITIVE AND DUPLICATE-INSENSITIVE, DELIBERATELY. An ICP's targeting fields are
 * SETS of labels — "CEO, CTO" and "CTO, CEO" are the same targeting, and nothing in the
 * product treats their order as meaning anything. A comparison that called those two different
 * would send a client to human review because an unrelated write reordered a column.
 */
export function sameTargetingSet(a: readonly string[] | null | undefined, b: readonly string[] | null | undefined): boolean {
  const sa = new Set(a ?? [])
  const sb = new Set(b ?? [])
  if (sa.size !== sb.size) return false
  for (const v of sa) if (!sb.has(v)) return false
  return true
}

/** Read the five targeting fields off an ICP row, always as arrays. */
export function basisOf(row: Record<string, unknown> | null | undefined): ProofWidenedBasis {
  const arr = (v: unknown): string[] => Array.isArray(v) ? v.map(String) : []
  return {
    job_titles:       arr(row?.job_titles),
    seniority_levels: arr(row?.seniority_levels),
    industries:       arr(row?.industries),
    company_sizes:    arr(row?.company_sizes),
    geographies:      arr(row?.geographies),
  }
}

/** Does the ICP row still carry exactly the targeting the candidate was derived from? */
export function basisMatchesRow(basis: ProofWidenedBasis, row: Record<string, unknown> | null | undefined): boolean {
  const now = basisOf(row)
  return PROOF_BASIS_FIELDS.every(f => sameTargetingSet(basis[f], now[f]))
}

/**
 * Read a stored candidate back, accepting ONLY a shape this file wrote.
 *
 * ⚠️ THE COLUMN IS SERVER-OWNED, AND THIS IS WHERE THAT IS ENFORCED. Anything malformed,
 * anything from a future version, anything naming a pass other than 2 — returns null, which
 * means "no widened candidate", which means acceptance changes no targeting. A candidate that
 * cannot be fully understood is not a licence to rewrite a client's ICP.
 */
export function readCandidate(raw: unknown): ProofWidenedCandidate | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const c = raw as Record<string, unknown>
  if (c.version !== 1) return null
  if (c.proof_pass !== 2) return null
  if (c.state !== 'pending' && c.state !== 'accepted') return null
  if (typeof c.batch_at !== 'string' || c.batch_at.trim() === '') return null
  const b = c.basis
  if (!b || typeof b !== 'object' || Array.isArray(b)) return null
  const basis = b as Record<string, unknown>
  for (const f of PROOF_BASIS_FIELDS) {
    if (!Array.isArray(basis[f]) || (basis[f] as unknown[]).some(v => typeof v !== 'string')) return null
  }
  return {
    version: 1,
    state: c.state,
    proof_pass: 2,
    batch_at: c.batch_at,
    basis: basisOf(basis),
    ...(typeof c.accepted_at === 'string' ? { accepted_at: c.accepted_at } : {}),
  }
}

/** The candidate as it is first written down: pending, tied to one batch, one basis. */
export function pendingCandidate(batchAt: string, basis: ProofWidenedBasis): ProofWidenedCandidate {
  return { version: 1, state: 'pending', proof_pass: 2, batch_at: batchAt, basis }
}
