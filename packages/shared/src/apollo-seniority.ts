// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 23 Sep (R142) — SENIORITY IS APOLLO'S OWN ELEVEN VALUES. ONE LIST, READ BY THE BRIEF, THE
// SEARCH AND THE CHECK.
//
// Founder, verbatim: *"this is why we use apollo drop downs and make sure we do not assume. so
// this all needs to be fixed. we dont assume again. if unsure milla needs to ask."*
//
// 🛑 WHAT WAS LIVE. The Brief offered six labels WE invented ("VP / Director", "Individual
// Contributor"…). The search translated them into Apollo's values, Apollo returned exactly the
// seniority asked for — and then our own check compared Apollo's `c_suite` on the returned row
// with the stored label "C-Suite", found them different, and printed "not the seniority you
// asked for" on a Chief Executive Officer (Blackburne Enterprises, 23 Sep).
//
// Apollo's `person_seniorities` accepts exactly these eleven (docs.apollo.io, People API
// Search). The LABEL is what a client reads and what `icps.seniority_levels` stores; the VALUE
// is what Apollo receives and what Apollo writes on the people it returns.
// ═══════════════════════════════════════════════════════════════════════════════════════

export const APOLLO_SENIORITIES = [
  { value: 'owner',    label: 'Owner' },
  { value: 'founder',  label: 'Founder' },
  { value: 'c_suite',  label: 'C-Suite' },
  { value: 'partner',  label: 'Partner' },
  { value: 'vp',       label: 'VP' },
  { value: 'head',     label: 'Head of' },
  { value: 'director', label: 'Director' },
  { value: 'manager',  label: 'Manager' },
  { value: 'senior',   label: 'Senior' },
  { value: 'entry',    label: 'Entry level' },
  { value: 'intern',   label: 'Intern' },
] as const

export type ApolloSeniorityValue = typeof APOLLO_SENIORITIES[number]['value']

/** What the Brief offers, in Apollo's order. */
export const APOLLO_SENIORITY_LABELS: readonly string[] = APOLLO_SENIORITIES.map(s => s.label)

/**
 * ⚠️ LABELS SAVED BEFORE 23 SEP STILL MEAN WHAT THEY MEANT. Every ICP already in the database
 * holds the old six labels; two of them have no single Apollo twin, so they keep the exact
 * translation the search has always given them. They are never OFFERED again — only read.
 */
export const LEGACY_SENIORITY_LABELS: Readonly<Record<string, readonly ApolloSeniorityValue[]>> = {
  'VP / Director':          ['vp', 'director'],
  'Individual Contributor': ['entry'],
}

/** Every label a stored ICP may hold: Apollo's eleven, plus the two legacy ones. */
export const ACCEPTED_SENIORITY_LABELS: readonly string[] =
  [...APOLLO_SENIORITY_LABELS, ...Object.keys(LEGACY_SENIORITY_LABELS)]

/** Apollo's form of a seniority as any source writes it: "C-Suite", "c suite", "C_SUITE" → "c_suite". */
export function apolloSeniorityKey(s: unknown): string {
  return String(s ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_')
}

const BY_KEY: ReadonlyMap<string, ApolloSeniorityValue> = new Map(
  APOLLO_SENIORITIES.flatMap(s => [[apolloSeniorityKey(s.label), s.value], [s.value, s.value]] as const),
)

/**
 * The Apollo values a stored seniority list means — the ONE translation the search sends and
 * the check compares against. Accepts Apollo's labels, Apollo's own values, and the two legacy
 * labels. Anything else translates to nothing: it is never guessed into a value.
 */
export function apolloSenioritiesFor(stored: readonly string[] | null | undefined): ApolloSeniorityValue[] {
  const out: ApolloSeniorityValue[] = []
  for (const s of stored ?? []) {
    const legacy = LEGACY_SENIORITY_LABELS[String(s ?? '').trim()]
    const vals = legacy ?? (BY_KEY.has(apolloSeniorityKey(s)) ? [BY_KEY.get(apolloSeniorityKey(s))!] : [])
    for (const v of vals) if (!out.includes(v)) out.push(v)
  }
  return out
}

/**
 * Does a person's seniority — as Apollo wrote it on the row — match what the ICP asked for?
 * `null` when either side names nothing to compare.
 */
export function seniorityMatchesApollo(asked: readonly string[] | null | undefined, rowSeniority: unknown): boolean | null {
  const want = apolloSenioritiesFor(asked)
  const have = BY_KEY.get(apolloSeniorityKey(rowSeniority))
  if (want.length === 0 || !have) return null
  return want.includes(have)
}
