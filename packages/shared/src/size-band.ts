// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 25 Sep (R166 ② · P7, board #2353) — THE CLIENT'S SIZE BAND, AS DATA.
//
// Founder, verbatim, from the options put to him: *"Three: 1–50, 51–200, 200+"*, and the names
// Founders · Growth · Enterprise. The band is set by the client's OWN company size — never chosen
// by the client. Unknown size (free email, no website, not found): *"A person reviews it"*.
//
// Pure: no prices here. What each band pays is P8's (R166 ①), so this file cannot drift into a
// second price list.
// ═══════════════════════════════════════════════════════════════════════════════════════

export type SizeBand = 'founders' | 'growth' | 'enterprise'

export const SIZE_BANDS: readonly { key: SizeBand; label: string; min: number; max: number | null }[] = [
  { key: 'founders',   label: 'Founders',   min: 1,   max: 50 },
  { key: 'growth',     label: 'Growth',     min: 51,  max: 200 },
  { key: 'enterprise', label: 'Enterprise', min: 201, max: null },
] as const

export function isSizeBand(v: unknown): v is SizeBand {
  return v === 'founders' || v === 'growth' || v === 'enterprise'
}

/** The band for a headcount, or null when there is no usable headcount. Pure. */
export function bandForEmployees(employees: number | null | undefined): SizeBand | null {
  const n = Number(employees)
  if (!Number.isFinite(n) || n < 1) return null
  for (const b of SIZE_BANDS) if (n >= b.min && (b.max === null || n <= b.max)) return b.key
  return null
}

export function sizeBandLabel(band: SizeBand | null | undefined): string {
  return SIZE_BANDS.find(b => b.key === band)?.label ?? 'Not set'
}

/** Why a person must decide the band (R166 ②: "A person reviews it"). */
export type SizeReviewReason = 'free_email' | 'no_website' | 'domain_mismatch' | 'not_found' | 'lookup_failed' | 'stated_smaller'

export const SIZE_REVIEW_REASON_COPY: Record<SizeReviewReason, string> = {
  free_email:      'They signed up with a free email address, so the company could not be confirmed.',
  no_website:      'No company website was given.',
  domain_mismatch: 'Their email address and their website are different companies.',
  not_found:       'Apollo has no company size for their website.',
  lookup_failed:   'The company-size check could not reach Apollo.',
  // ⚑ 25 Sep (R168 ④) — the only case where the client's own answer waits for a person.
  stated_smaller:  'They told us a smaller company size than company records show, so a person confirms their band before they pay.',
}

// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 25 Sep (R168 ④ · P7b) — SIZE IS STATED BY THE CLIENT, THEN CHECKED.
//
// Founder: *"when they sign up. they got to tell us their company name. their size. we take their
// word for it. but we should build in a company check."* — and, asked what happens when the two
// disagree: *"a"*. Their word sets the band. The check holds the price for a person ONLY when it
// finds the company BIGGER (the one way to under-pay); smaller, or not found, their word stands.
// ═══════════════════════════════════════════════════════════════════════════════════════
const BAND_RANK: Record<SizeBand, number> = { founders: 1, growth: 2, enterprise: 3 }

/**
 * What to do with a stated size and the check's answer. Pure.
 * `checkedBand` null = the check could not find the company (or could not run).
 */
export function statedSizeVerdict(statedBand: SizeBand, checkedBand: SizeBand | null):
  | { kind: 'stated_stands' }
  | { kind: 'person_confirms' } {
  if (checkedBand && BAND_RANK[checkedBand] > BAND_RANK[statedBand]) return { kind: 'person_confirms' }
  return { kind: 'stated_stands' }
}
