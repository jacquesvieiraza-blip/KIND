// ONE contract for sequence merge-tokens, shared by the two halves of the launch path:
//
//   • POST /operator/sequence/suggest  drafts against a REAL lead, then DE-tokenises the
//     copy so the saved sequence is a reusable template.
//   • GET  /operator/sequence/:id/preview  and the client's read-only view FILL those
//     tokens back in from a real lead.
//
// If those two used their own regexes they would drift the moment one changed — a sequence
// written with {{first_name}} would preview with a literal "{{first_name}}" in the subject
// line, which is exactly the thing an operator would not notice until a prospect did.

export type TokenLead = {
  first_name?: string | null
  last_name?: string | null
  job_title?: string | null
  company?: string | null
}
export type TokenSender = {
  signer_name?: string | null
  company_name?: string | null
}

// Which lead field backs which token. Order matters for de-tokenising: replace the longest
// values first so "Alex Morgan" doesn't become "{{first_name}} Morgan" when last_name would
// also have matched inside it.
const LEAD_TOKENS: [keyof TokenLead, string][] = [
  ['company', '{{company}}'],
  ['job_title', '{{job_title}}'],
  ['first_name', '{{first_name}}'],
  ['last_name', '{{last_name}}'],
]

// ⛓️ 24 Sep — the legal tail a model drops when it writes a company name naturally. The House
// walk's sample was "Rock Strategic LLC"; the copy said "Rock Strategic", which an exact match
// never saw, so every prospect would have been told they run somebody else's company.
// Kept to unambiguous legal forms: "Co" or "Company" can be part of the name people use.
const LEGAL_SUFFIX = /[\s,]+(?:l\.?l\.?c|ltd|limited|inc|incorporated|corp|corporation|plc|llp|gmbh|ag|pty(?:\s+ltd)?|pte(?:\s+ltd)?|s\.a|b\.v|n\.v|s\.r\.l)\.?$/i

/** A company name without its legal tail — "Rock Strategic, LLC" → "Rock Strategic". */
export function companyCore(name: string): string {
  let out = name.trim()
  for (let prev = ''; prev !== out;) { prev = out; out = out.replace(LEGAL_SUFFIX, '').trim() }
  return out
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
/** The value as a whole word, any case — "Chris" matches "chris" but never "Christmas". */
const wordRe = (value: string) => new RegExp(`(?<![\\p{L}\\p{N}])${escapeRe(value)}(?![\\p{L}\\p{N}])`, 'giu')

/** Every spelling of this lead's details that the copy must not carry, longest first. */
function identityValues(lead: TokenLead): [string, string][] {
  const pairs: [string, string][] = []
  for (const [field, token] of LEAD_TOKENS) {
    const value = String(lead[field] ?? '').trim()
    if (value.length > 1) pairs.push([value, token])
    if (field === 'company' && value) {
      const core = companyCore(value)
      if (core.length > 1 && core !== value) pairs.push([core, token])
    }
  }
  return pairs.sort((a, b) => b[0].length - a[0].length)
}

/**
 * Replace a specific lead's real details with merge tokens, turning one person's email back
 * into a template. Values of 1 character or less are skipped — swapping every "A" in the
 * body for {{first_name}} would shred the copy.
 *
 * ⛓️ 24 Sep — WAS an exact, case-sensitive substring swap. The founder's House walk showed the
 * copy it let through: "christopher, ceo lead gen question" (lower case) and "running Rock
 * Strategic as CEO" (no "LLC"). Now any case, the company with or without its legal tail, and
 * whole words only — so a first name of "Chris" no longer eats the middle of "Christmas".
 */
export function detokenise(text: string, lead: TokenLead): string {
  let out = text
  for (const [value, token] of identityValues(lead)) out = out.replace(wordRe(value), token)
  return out
}

/**
 * 🛑 WHAT OF THIS LEAD'S IDENTITY IS STILL IN THE COPY. Empty means the template is clean.
 *
 * The generator refuses to save a sequence while this returns anything: one person's name or
 * company in a template goes to every prospect on the programme. Only who they ARE is checked —
 * first name, last name, company — never the job title, which is a common noun in prose.
 */
export function leakedIdentity(text: string, lead: TokenLead): string[] {
  return identityValues({ first_name: lead.first_name, last_name: lead.last_name, company: lead.company })
    .map(([value]) => value)
    .filter(value => wordRe(value).test(text))
}

/**
 * Fill merge tokens from a real lead (and the sending client) so the copy reads exactly as
 * the prospect will receive it. Tolerant of whitespace and case inside the braces, because
 * an operator hand-writing a sequence will type {{ First_Name }} sooner or later.
 *
 * An unknown token is left alone on purpose: a visible {{whatever}} in the preview is a bug
 * the operator can SEE, whereas silently blanking it hides a broken template until it sends.
 */
export function fillTokens(text: string, lead: TokenLead, sender?: TokenSender): string {
  const values: Record<string, string> = {
    first_name: String(lead.first_name ?? 'there'),
    last_name: String(lead.last_name ?? ''),
    job_title: String(lead.job_title ?? 'their role'),
    company: String(lead.company ?? 'their company'),
    sender_name: String(sender?.signer_name ?? sender?.company_name ?? ''),
    sender_company: String(sender?.company_name ?? ''),
  }
  return text.replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (whole, name: string) => {
    const key = name.toLowerCase()
    return key in values ? values[key] : whole
  })
}

/**
 * Which tokens say something about THE PROSPECT, as opposed to about us.
 *
 * #612 needs this distinction and it is not a detail: `{{sender_name}}` and
 * `{{sender_company}}` are also merge tokens, but an email that opens *"I'm Jacques from
 * K.I.N.D"* is **not personalised to the person reading it** — it is personalised to the
 * person sending it, which is the opposite. Only the four lead-backed tokens count.
 *
 * Derived from LEAD_TOKENS above rather than re-listed, so adding a lead token here makes it
 * count as personalisation everywhere at once.
 */
export const PROSPECT_TOKEN_NAMES: string[] = LEAD_TOKENS.map(([field]) => String(field))

/** Does this text address the PROSPECT by one of their own details? */
export function hasProspectToken(text: string): boolean {
  const re = /\{\{\s*([a-z_]+)\s*\}\}/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    if (PROSPECT_TOKEN_NAMES.includes(m[1].toLowerCase())) return true
  }
  return false
}

/**
 * Running day-count for a step list: step 1 is day 0, and each later step adds its own
 * wait. Used by both the operator preview and the client's read-only view so "day 4" means
 * the same thing in both.
 */
export function stepDays(steps: { wait_days?: number | null }[]): number[] {
  let day = 0
  return steps.map((s, i) => {
    day += Number(s.wait_days ?? (i === 0 ? 0 : 3)) || 0
    return day
  })
}

/**
 * ⚑ 24 Sep — EVERY EMAIL ENDS WITH ITS SIGN-OFF, WHATEVER THE MODEL DID.
 *
 * The model is told how to sign off; House's version 3 came back with no sign-off at all. An
 * email already carrying the name on a line of its own is left exactly as it is; otherwise the
 * name is added as the last line. No name (no signer, no company) → the body is unchanged.
 */
export function ensureSignOff(body: string, name: string): string {
  const n = name.trim()
  if (!n || !body.trim()) return body
  const lines = body.split('\n').map(l => l.trim().toLowerCase())
  if (lines.includes(n.toLowerCase())) return body
  return `${body.replace(/\s+$/, '')}\n${n}`
}
