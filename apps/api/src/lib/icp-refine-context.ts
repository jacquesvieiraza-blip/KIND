// ══════════════════════════════════════════════════════════════════════════════════════════
// J6-C2 · WHAT THE CLIENT ALREADY HAS, SAID TO MILLA BEFORE SHE CHANGES IT (LR 11,13 · FD-1)
//
// ── THE DEFECT: THE INSTRUCTION WAS THERE, THE FACTS WERE NOT ───────────────────────────
//
// `/icps/chat-build`'s system prompt says, in these words:
//
//     "call the propose_targeting tool with the WHOLE profile as it should end up. Start from
//      what they already have and change only what they asked about."
//
// 🛑 AND THE DOOR NEVER READ THEIR ICP. It is handed the durable Brief and twenty turns of
// browser history, and nothing else — `icps` is not queried anywhere in the handler. So the
// model was told to start from something it had never been shown, and "the WHOLE profile"
// came out of one conversation about one change.
//
// ⚠️ THE BRIEF IS NOT THE ICP, AND THAT IS THE POINT. The Brief is what they said at signup;
// the ICP is what is live now — after a refinement, after an operator's translation of a
// phrase we could not map, after a widened proof pass was adopted. A client who changed their
// geography last month and comes back to change their size is described by the ICP and not by
// the Brief, and Milla was reading the older of the two.
//
// 🛑 EXCLUSIONS ARE THE SHARPEST CASE (FD-1). "Not recruitment agencies" is canonical targeting
// truth and it lives on `icps.exclusions`. Invisible here, so a proposal could contradict the
// one instruction the client gave about who to leave out — and `propose_targeting` returns the
// whole profile, so the contradiction is what gets written.
//
// ── WHAT THIS FILE IS ALLOWED TO DO ─────────────────────────────────────────────────────
//
//   • state what is stored, in the client's own words where the column holds them
//   • say NOTHING about a field that is not set — never "none", never "any", never a default,
//     because the prompt's own rule is that an empty list means "I do not know yet"
//   • touch no database: the caller reads, this renders, so the rule can be proved without one
// ══════════════════════════════════════════════════════════════════════════════════════════

/** Only the fields the prompt block states. Every one is an existing `icps` column. */
export interface RefineContextIcp {
  name?: string | null
  target_category?: string | null
  target_company_type?: string | null
  target_size?: string | null
  exclusions?: string | null
  geographies?: string[] | null
  company_sizes?: string[] | null
  job_titles?: string[] | null
  seniority_levels?: string[] | null
  industries?: string[] | null
}

const text = (v: unknown): string => String(v ?? '').trim()
const list = (v: unknown): string[] =>
  Array.isArray(v) ? v.map(x => text(x)).filter(Boolean) : []

/**
 * The block appended to the refine prompt, or `''` when there is nothing true to say.
 *
 * ⚠️ `''` FOR AN EMPTY ICP IS DELIBERATE. A heading with nothing under it reads to a model as
 * "they have no targeting", which is a claim; saying nothing leaves the door exactly as it was
 * for a client who genuinely has nothing stored yet.
 */
export function describeCurrentTargeting(icp: RefineContextIcp | null | undefined): string {
  if (!icp) return ''
  const lines: string[] = []

  // ⚠️ THE CLIENT'S OWN WORDS FIRST, AND LABELLED AS THEIRS. `target_category` is the column
  // the founder locked as the only authority on client intent; `industries` is the closed
  // provider list and is evidence, never the requirement — so it is stated last and named for
  // what it is, or the model would refine against our vocabulary instead of their answer.
  const category = text(icp.target_category)
  if (category) lines.push(`- The kind of company they asked for, in their own words: "${category}"`)
  const type = text(icp.target_company_type)
  if (type) lines.push(`- The kind of organisation: "${type}"`)

  const geos = list(icp.geographies)
  if (geos.length) lines.push(`- Countries: ${geos.join(', ')}`)

  const size = text(icp.target_size)
  const sizes = list(icp.company_sizes)
  if (size) lines.push(`- Company size, in their own words: "${size}"`)
  else if (sizes.length) lines.push(`- Company size: ${sizes.join(', ')}`)

  const roles = list(icp.job_titles)
  if (roles.length) lines.push(`- Roles: ${roles.join(', ')}`)
  const seniority = list(icp.seniority_levels)
  if (seniority.length) lines.push(`- Seniority: ${seniority.join(', ')}`)

  // 🛑 FD-1. Last, and with the strongest sentence in the block, because it is the only
  // instruction here that SUBTRACTS and the only one a proposal can actively contradict.
  const excl = text(icp.exclusions)
  if (excl) {
    lines.push(`- Who they asked us to LEAVE OUT: "${excl}" — this still applies unless they say otherwise in this conversation.`)
  }

  const industries = list(icp.industries)
  if (industries.length) {
    lines.push(`- (Our internal provider tags for the above: ${industries.join(', ')} — a search hint we derived, never their words. Do not read these back to them.)`)
  }

  if (lines.length === 0) return ''
  const name = text(icp.name)
  return `

THEIR TARGETING AS IT STANDS TODAY${name ? ` (“${name}”)` : ''} — this is what "what they already have" means. Start from it and change only what they ask about in this conversation. A field that is not listed here is one they have not established; do not invent it.
${lines.join('\n')}`
}
