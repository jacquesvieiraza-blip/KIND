// CSV LEAD IMPORT — Apollo's list into the product, through the same gates sourced leads pass.
//
// Client Zero's prospects come from the founder's Apollo account as a CSV export (#549 amended
// 30 Jul: Apollo for us, PDL + Hunter for clients). Our engine can only mail what is in our
// tables, so this is the intake.
//
// ── WHAT ALREADY EXISTED, AND WHY IT IS THE WRONG SHAPE ──────────────────────────────────
//
// `POST /figsy/webhook/enrol` (#250) is the only inbound lead path. It is not this: it
// authenticates with a per-CLIENT developer key, enrols straight into a campaign, and
// **CHARGES on the way in** (`chargeFigsyEnroll` runs charge-first, #310/#332). Importing a
// thousand prospects through it would bill for a thousand leads nobody approved — the exact
// opposite of the money model, where **approve is the only money event**. So this path is
// operator-authed, charges nothing, and lands leads in the same state the sourcing path does.
//
// ── THE GATES, REUSED RATHER THAN REIMPLEMENTED ──────────────────────────────────────────
//
// `routes/icps.ts` pool-serve is the reference: normalise → drop what this client already owns
// → drop the opt-out blocklist → drop the do-not-contact floor → insert with `status:'pending'`
// and `delivered_at: null`. A second copy of that sequence is how an import path ends up
// mailing someone who opted out — so the judgement lives HERE, pure, and both the route and the
// tests use it. The DB reads (owned set, blocklist) stay in the route; this file decides.
//
// ── WHY EVERY ROW REPORTS AN OUTCOME ─────────────────────────────────────────────────────
//
// A partial import that reports only a success count is the #349 class of defect in file form:
// the operator uploads 1,000, sees "imported", and never learns that 300 were suppressed. Each
// row gets a verdict and a reason, and the route returns all four tallies.

import { normalizeRevealEmail } from './billing-rules'
import { isSuppressed } from './suppression'

/** Hard ceiling per upload. Stated in the UI, enforced here — a cap the user cannot see is a trap. */
export const MAX_IMPORT_ROWS = 1000

export type RawRow = Record<string, string>

export type ParsedLead = {
  first_name: string
  last_name: string
  email: string
  job_title: string | null
  company: string | null
  linkedin_url: string | null
  country: string | null
}

export type RowVerdict =
  | { outcome: 'imported'; lead: ParsedLead }
  | { outcome: 'duplicate'; email: string; why: string }
  | { outcome: 'suppressed'; email: string; why: string }
  | { outcome: 'invalid'; why: string; raw?: string }

export type ImportTally = { imported: number; duplicate: number; suppressed: number; invalid: number }

/**
 * Column aliases, widest first.
 *
 * Apollo's export headers are not stable across versions and the founder may hand-edit the file,
 * so each field is looked up across the plausible names rather than one guessed header. Reading
 * a column from the wrong name costs the whole import; reading from a list costs nothing.
 */
export const COLUMNS = {
  first:    ['first_name', 'first name', 'firstname', 'given name'],
  last:     ['last_name', 'last name', 'lastname', 'surname', 'family name'],
  email:    ['email', 'email address', 'work email', 'primary email', 'email_1'],
  title:    ['title', 'job title', 'job_title', 'position', 'headline'],
  company:  ['company', 'company name', 'organization', 'organization name', 'account name', 'employer'],
  linkedin: ['linkedin', 'linkedin url', 'linkedin_url', 'person linkedin url', 'linkedin profile'],
  country:  ['country', 'location country', 'contact country'],
} as const

/** Lower-case, trim and collapse a header so `First Name` and `first_name` are the same key. */
export function normaliseHeader(h: string): string {
  return h.replace(/^﻿/, '').trim().toLowerCase().replace(/[_\s]+/g, ' ')
}

function pick(row: RawRow, keys: readonly string[]): string {
  for (const k of keys) {
    const v = row[normaliseHeader(k)]
    if (typeof v === 'string' && v.trim()) return v.trim()
  }
  return ''
}

/**
 * Parse one CSV row into a lead, or say why it cannot be one.
 *
 * An email is the only hard requirement: a row without one can never be contacted, so importing
 * it would put a permanently un-mailable record on the client's desk.
 */
export function parseRow(row: RawRow): { ok: true; lead: ParsedLead } | { ok: false; why: string } {
  const rawEmail = pick(row, COLUMNS.email)
  if (!rawEmail) return { ok: false, why: 'no email column found or the cell was empty' }

  const email = normalizeRevealEmail(rawEmail)
  if (!email || !email.includes('@') || !email.includes('.')) {
    return { ok: false, why: `"${rawEmail}" is not a usable email address` }
  }

  const first = pick(row, COLUMNS.first)
  const last = pick(row, COLUMNS.last)
  // Names are optional but not decorative: the sequence writer personalises on first_name, and
  // "Hi ," is worse than no send. A nameless row is allowed in and shows on the desk as blank —
  // the operator decides, rather than us silently dropping a real prospect.
  return {
    ok: true,
    lead: {
      first_name: first,
      last_name: last,
      email,
      job_title: pick(row, COLUMNS.title) || null,
      company: pick(row, COLUMNS.company) || null,
      linkedin_url: pick(row, COLUMNS.linkedin) || null,
      country: pick(row, COLUMNS.country) || null,
    },
  }
}

/**
 * Every usable email in the file, normalised and de-duplicated.
 *
 * The route needs this BEFORE deciding anything, to ask the blocklist about exactly these
 * addresses. It goes through `parseRow` rather than reaching for a column itself — a second
 * copy of the email-picking rule is how the blocklist ends up queried for a set of addresses
 * that is not the set being imported, which fails OPEN.
 */
export function candidateEmails(rows: RawRow[]): string[] {
  const out = new Set<string>()
  for (const row of rows) {
    const parsed = parseRow(row)
    if (parsed.ok) out.add(parsed.lead.email)
  }
  return [...out]
}

/**
 * Decide every row's fate, given what the caller has already read from the database.
 *
 * `owned` and `blocked` are normalised email sets the route fetches; keeping the reads out of
 * here is what makes the whole decision testable without a database.
 *
 * ORDER MATTERS AND IS DELIBERATE: suppression is checked BEFORE duplication. A person who is
 * both already-held and opted-out should report as **suppressed**, because that is the fact the
 * operator needs to see — "duplicate" reads as harmless.
 */
export function decideRows(a: {
  rows: RawRow[]
  owned: Set<string>
  blocked: Set<string>
}): { verdicts: RowVerdict[]; tally: ImportTally } {
  const verdicts: RowVerdict[] = []
  // Within-file duplicates count too: the same person twice in one CSV must not become two
  // leads on the desk, and the second occurrence is a duplicate of the first.
  const seen = new Set<string>()

  for (const row of a.rows) {
    const parsed = parseRow(row)
    if (!parsed.ok) {
      verdicts.push({ outcome: 'invalid', why: parsed.why })
      continue
    }
    const { lead } = parsed
    const e = lead.email

    if (a.blocked.has(e)) {
      verdicts.push({ outcome: 'suppressed', email: e, why: 'on the opt-out blocklist' })
      continue
    }
    if (isSuppressed({ email: e, company: lead.company, linkedin: lead.linkedin_url })) {
      verdicts.push({ outcome: 'suppressed', email: e, why: 'matches the do-not-contact list' })
      continue
    }
    if (a.owned.has(e)) {
      verdicts.push({ outcome: 'duplicate', email: e, why: 'this client already holds this contact' })
      continue
    }
    if (seen.has(e)) {
      verdicts.push({ outcome: 'duplicate', email: e, why: 'appears more than once in this file' })
      continue
    }
    seen.add(e)
    verdicts.push({ outcome: 'imported', lead })
  }

  return {
    verdicts,
    tally: {
      imported:   verdicts.filter(v => v.outcome === 'imported').length,
      duplicate:  verdicts.filter(v => v.outcome === 'duplicate').length,
      suppressed: verdicts.filter(v => v.outcome === 'suppressed').length,
      invalid:    verdicts.filter(v => v.outcome === 'invalid').length,
    },
  }
}

/**
 * Turn an accepted lead into the row shape `leads` expects.
 *
 * Mirrors the pool-serve insert in `routes/icps.ts` exactly — `status: 'pending'` and
 * `delivered_at: null`, so an imported lead is **invisible to the client until the operator
 * surfaces it**, the same as a sourced one. Importing straight onto the desk would bypass the
 * step where an operator looks at what arrived.
 */
export function toLeadRow(lead: ParsedLead, clientId: string): Record<string, unknown> {
  return {
    client_id:        clientId,
    icp_id:           null,          // imported leads belong to no ICP — they were not sourced
    first_name:       lead.first_name,
    last_name:        lead.last_name,
    email:            lead.email,
    job_title:        lead.job_title,
    company:          lead.company,
    linkedin_url:     lead.linkedin_url,
    country:          lead.country,
    tech_stack:       [] as string[],
    apollo_id:        null,
    // NOT a consent claim — this site already said so, and the wording is now the canonical
    // one used at every other site: apollo_consented = provider-VERIFIED email, treated as a
    // legitimate-interest contact. It is NOT a consent record. Naming predates the pivot; do
    // not build consent logic on it. Consent is `status` + `consent_given_at` + the token.
    // Set false here so an imported row can never be mistaken for one carrying consent.
    apollo_consented: false,
    status:           'pending',
    delivered_at:     null,
    source:           'csv_import',
  }
}

// ── CSV PARSING ──────────────────────────────────────────────────────────────────────────
//
// Hand-rolled rather than a new dependency, and RFC-4180-correct rather than `split(',')`.
//
// A naive split is not a shortcut here, it is a data-corruption bug waiting for the first
// Apollo export: company names carry commas (`Acme, Inc.`), titles carry quotes, and quoted
// fields can contain newlines. Splitting on commas would shift every column after the first
// such row, silently importing job titles into the country field. Thirty lines and a test
// suite beats a dependency for one screen — and beats a wrong parser at any price.

/**
 * Parse CSV text into header-keyed rows. Headers are normalised (lower-cased, `_`→space) so
 * `First Name` and `first_name` are the same key by the time `parseRow` looks for them.
 *
 * Handles: quoted fields · escaped quotes (`""`) · commas and newlines inside quotes · CRLF ·
 * a UTF-8 BOM · trailing blank lines. Ragged rows are tolerated (missing cells read as empty)
 * rather than rejected — a short last column is not worth failing a thousand good rows over.
 */
export function parseCsv(text: string): { headers: string[]; rows: RawRow[] } {
  const cells: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false

  const src = text.replace(/^﻿/, '')
  for (let i = 0; i < src.length; i++) {
    const c = src[i]
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') { field += '"'; i++ }   // escaped quote
        else inQuotes = false
      } else field += c
      continue
    }
    if (c === '"') { inQuotes = true; continue }
    if (c === ',') { row.push(field); field = ''; continue }
    if (c === '\r') continue
    if (c === '\n') { row.push(field); cells.push(row); row = []; field = ''; continue }
    field += c
  }
  // Whatever is still buffered is the final field of the final row.
  if (field.length > 0 || row.length > 0) { row.push(field); cells.push(row) }

  const nonEmpty = cells.filter(r => r.some(c => c.trim() !== ''))
  if (nonEmpty.length === 0) return { headers: [], rows: [] }

  const headers = nonEmpty[0].map(normaliseHeader)
  const rows: RawRow[] = nonEmpty.slice(1).map(r => {
    const o: RawRow = {}
    headers.forEach((h, idx) => { o[h] = (r[idx] ?? '').trim() })
    return o
  })
  return { headers, rows }
}
