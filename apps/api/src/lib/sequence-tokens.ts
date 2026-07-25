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

/**
 * Replace a specific lead's real details with merge tokens, turning one person's email back
 * into a template. Values of 1 character or less are skipped — swapping every "A" in the
 * body for {{first_name}} would shred the copy.
 */
export function detokenise(text: string, lead: TokenLead): string {
  let out = text
  const byLength = LEAD_TOKENS
    .map(([field, token]) => [String(lead[field] ?? ''), token] as [string, string])
    .filter(([value]) => value.length > 1)
    .sort((a, b) => b[0].length - a[0].length)
  for (const [value, token] of byLength) out = out.split(value).join(token)
  return out
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
