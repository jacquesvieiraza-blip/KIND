// ═══════════════════════════════════════════════════════════════════════════════════════
// WHO ENFORCES EACH PART OF THE CUSTOMER'S ICP — declared, so nothing can go missing.
//
// 🛑 THE PRODUCT RULE. A customer writes their ICP in normal language and M&V must understand
// and preserve every meaningful part of it. **A provider's limitations must never silently
// redefine the customer's ICP.**
//
// ⚠️ "WE SENT IT TO APOLLO" IS NOT PROOF A CRITERION SURVIVED. A search filter and a final
// factual check are different things. `person_locations` narrows who Apollo LOOKS at; it does
// not prove the person who came back is in that country — Apollo's People Search returns no
// country at all. So geography is owned at BOTH stages, and the map below says so.
//
// ⚠️ AND THE OPPOSITE FAILURE IS SILENCE. A criterion nothing owns does not announce itself.
// It simply never affects a lead, and the customer's stated targeting quietly means less than
// they wrote. `tech_stack` was in exactly that state: dropped before the Apollo request with a
// code comment explaining why, absent from the scorer, absent from the final gate — and no
// running system ever said so. A field may be declared UNENFORCEABLE, with a reason, and the
// run then REPORTS it. It may never be declared nothing.
//
// ⚠️ THIS IS A MAP, NOT AN ENGINE. It owns no logic and evaluates no candidate. Its whole job
// is to make an unowned criterion impossible to add and an unenforceable one impossible to
// hide. The enforcement itself lives where it always did: `apollo.ts` (search), `scoring.ts`
// (ranking), `icp-qualification.ts` (final acceptance).
// ═══════════════════════════════════════════════════════════════════════════════════════

export type CriterionOwner =
  /** Sent as an Apollo People Search filter — narrows WHO IS LOOKED AT. */
  | 'apollo_search'
  /** Judged by `finalVerdict` after the reveal — decides WHO IS ACCEPTED. */
  | 'post_reveal_qualification'
  /** Fed to `scoreLeadsForIcp`, which ranks delivered leads against the ICP. */
  | 'lead_scoring'
  /** Cannot be enforced with the data available today. MUST be reported, never assumed met. */
  | 'unenforceable'

export interface CriterionCoverage {
  owners: CriterionOwner[]
  note: string
}

/**
 * Every targeting field the stored ICP carries, and who acts on it.
 *
 * `icp-coverage.test.ts` reads the shared `ICP` interface and fails if a field here is missing,
 * if a field is declared that the ICP does not store, or if any entry has no owner — so a new
 * criterion cannot ship without somebody being responsible for it.
 */
export const ICP_CRITERION_OWNERS: Record<string, CriterionCoverage> = {
  job_titles: {
    owners: ['apollo_search', 'lead_scoring'],
    note: 'Sent as `person_titles`, and the scorer ranks how well a delivered lead matches the titles the customer named.',
  },
  seniority_levels: {
    owners: ['apollo_search', 'lead_scoring'],
    note: 'Mapped through SENIORITY_MAP to `person_seniorities`, and re-read by the scorer on the delivered lead.',
  },
  industries: {
    owners: ['apollo_search', 'lead_scoring'],
    note: 'Sent as `q_organization_keyword_tags` (an OR over tags), and the scorer judges the industry actually returned.',
  },
  company_sizes: {
    owners: ['apollo_search', 'lead_scoring'],
    note: 'Mapped through toEmployeeRange to `organization_num_employees_ranges`, and re-read by the scorer.',
  },
  geographies: {
    owners: ['apollo_search', 'post_reveal_qualification', 'lead_scoring'],
    note: 'Sent as `person_locations` to narrow the search — but Apollo\'s search returns no country, so the FACT is proved after the reveal by `finalVerdict`. A filter is a request; the record is the fact.',
  },
  apollo_only_consented: {
    owners: ['apollo_search', 'post_reveal_qualification'],
    note: 'Sets `contact_email_status` on the request, and the returned status is re-checked after the reveal — for House, `verified` and nothing else, with an absent status failing.',
  },
  intent_signals: {
    owners: ['apollo_search'],
    note: 'Translated into funding-stage codes and organization keyword tags on the search request. A signal is a targeting hint about the company, not a record-level fact to re-verify on the person.',
  },
  keywords: {
    owners: ['lead_scoring'],
    note: 'Deliberately NOT an Apollo filter: `q_keywords` is a literal full-text match, so the conversational builder\'s prose collapses the result set to ~0. The scorer reads them instead, where free text is exactly what an LLM can judge.',
  },
  tech_stack: {
    owners: ['unenforceable'],
    note: 'The conversational builder emits free text ("Email outreach tools", "CRM") which are not valid Apollo technology UIDs, so applying them as a filter zeroes the search — and no provider on the House path returns a per-person tech stack to check afterwards. Declared unenforceable and REPORTED on every run that sets it, rather than silently ignored. A validated tech picker would give it a real owner.',
  },
}

/** One criterion the customer asked for that this run cannot act on. */
export interface UnenforcedCriterion {
  field: string
  values: string[]
  note: string
}

/**
 * Which of THIS ICP's criteria have no enforcement owner.
 *
 * ⚠️ ONLY WHERE THE CUSTOMER ACTUALLY ASKED FOR SOMETHING. An empty `tech_stack` is not a
 * complaint — nobody asked for anything, so nothing is being ignored. Reporting it anyway
 * would be noise, and noise is how a real warning stops being read.
 */
export function unenforcedCriteria(icp: Record<string, unknown>): UnenforcedCriterion[] {
  const out: UnenforcedCriterion[] = []
  for (const [field, spec] of Object.entries(ICP_CRITERION_OWNERS)) {
    if (!spec.owners.includes('unenforceable')) continue
    const raw = icp?.[field]
    const values = Array.isArray(raw) ? raw.filter(v => typeof v === 'string' && v.trim() !== '') as string[] : []
    if (values.length > 0) out.push({ field, values, note: spec.note })
  }
  return out
}

/**
 * Thrown when the customer asked for something M&V cannot currently enforce.
 *
 * ⛓️ THIS REPLACES A LOG LINE, AND THE DIFFERENCE IS THE WHOLE POINT (founder-locked 7 Sep).
 * The first version printed `stage=icp_unenforced` and carried on — which is still a provider
 * limitation quietly redefining the customer's ICP, only with a receipt nobody reads. The rule
 * is explicit:
 *
 *   "A non-empty criterion that M&V cannot enforce is NOT satisfied. It must be BLOCKED /
 *    UNRESOLVED / FAIL LOUDLY until M&V has enough data/capability to evaluate it."
 *
 * ⚠️ AN EMPTY CRITERION IS NOT A COMPLAINT. Nobody asked for anything, so nothing is being
 * ignored, and blocking on it would stop runs over a field the customer never filled in.
 */
export class IcpUnenforceableError extends Error {
  readonly fields: string[]
  constructor(unresolved: UnenforcedCriterion[]) {
    const named = unresolved
      .map(u => `${u.field} (${u.values.join(', ')}) — ${u.note}`)
      .join('  ·  ')
    super(
      `This ICP asks for targeting M&V cannot currently enforce, so nothing was sourced: ${named} ` +
      'Nothing was searched, revealed, reserved or spent. Clear the criterion, or wait until it ' +
      'has a real enforcement owner — it is NOT treated as satisfied.',
    )
    this.name = 'IcpUnenforceableError'
    this.fields = unresolved.map(u => u.field)
  }
}

/**
 * Refuse the run if the customer asked for anything nothing can enforce.
 *
 * Called BEFORE the cash fence and BEFORE any provider request, so a refusal costs nothing —
 * no search, no reveal, no reservation. Pure: it reads the ICP and throws, nothing else.
 */
export function assertIcpFullyOwned(icp: Record<string, unknown>): void {
  const unresolved = unenforcedCriteria(icp)
  if (unresolved.length > 0) throw new IcpUnenforceableError(unresolved)
}
