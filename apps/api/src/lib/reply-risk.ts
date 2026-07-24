// E7 — legal / reputational RISK filter for inbound replies. Pure + dependency-free (no DB,
// no model call) so it's unit-testable in isolation and deterministic in the hot reply path.
// If a reply mentions legal action, a data-protection authority/complaint, or an abuse report,
// it must reach a human immediately — never an automated follow-up. Word-boundary matched so
// short terms don't false-positive on substrings (e.g. "assume" must not match "sue").
const RISK_TERMS = [
  'lawyer', 'attorney', 'solicitor', 'legal action', 'take legal', 'sue you', 'lawsuit',
  'cease and desist', 'cease & desist', 'defamation', 'harassment', 'harassing',
  'report you', 'reported you', 'reporting you', 'complaint to', 'file a complaint',
  'data protection', 'gdpr', 'popia', 'ico ', 'information commissioner', 'privacy regulator',
  'unlawful', 'illegal', 'fraud', 'scam', 'police', 'authorities',
]

export function isRiskyReply(body: string | null | undefined): boolean {
  if (!body) return false
  const t = ` ${body.toLowerCase().replace(/\s+/g, ' ')} `
  return RISK_TERMS.some(term =>
    t.includes(term.includes(' ') ? term : ` ${term} `) ||
    t.includes(`${term}.`) || t.includes(`${term},`) || t.includes(`${term}!`))
}
