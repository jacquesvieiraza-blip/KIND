// ══════════════════════════════════════════════════════════════════════════════════════════
// THE CANDIDATE'S HEADCOUNT — one reader, deliberately OUTSIDE `apollo.ts`.
//
// 🛑 WHY IT IS NOT IN `apollo.ts`, WHICH IS WHERE IT BELONGS BY SUBJECT. Eighteen test stubs
// across fourteen files replace that whole module with `vi.doMock('./apollo', () => ({ … }))`,
// listing only the two or three exports each one needs. A pure function added there is
// `undefined` under every one of them — the sourcing route then throws on a call that cannot
// fail in production, and the first run of this change turned 49 tests red for a reason that
// had nothing to do with headcounts.
//
// ⚠️ AND EVERY FUTURE STUB WOULD FORGET IT AGAIN. This function touches no network, no client
// and no environment; it has no reason to sit behind a mocked provider module. Here, nothing
// stubs it and nothing can drop it.
// ══════════════════════════════════════════════════════════════════════════════════════════

/**
 * The candidate's headcount, from whichever key this payload carries.
 *
 * ⚠️ ONE READER, BECAUSE THERE WERE TWO CALL SITES. `routes/icps.ts` wrote
 * `contact.organization?.num_employees` in two places, and a fix applied to one of them is a
 * defect that returns on the path nobody remembered. Both now ask this.
 *
 * ⚠️ `estimated_num_employees` IS PREFERRED, NOT REQUIRED. A payload carrying the older key
 * still answers, so this widens what we can read and narrows nothing.
 */
export interface HasOrganisation {
  organization?: { num_employees?: number | null; estimated_num_employees?: number | null } | null
}

export function apolloHeadcount(contact: HasOrganisation | null | undefined): number | null {
  const org = contact?.organization
  if (!org) return null
  for (const raw of [org.estimated_num_employees, org.num_employees]) {
    const n = Number(raw)
    if (Number.isFinite(n) && n >= 1) return n
  }
  return null
}
