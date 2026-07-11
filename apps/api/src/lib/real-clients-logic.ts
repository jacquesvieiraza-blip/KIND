// ─────────────────────────────────────────────────────────────────────────────
// REAL PAYING CLIENTS — pure logic (no DB import, fully unit-testable).
//
// Founder-locked rule: every money/revenue figure in the ADMIN app counts real
// paying clients only. Two kinds of account never count:
//   • demo/test clients — clients.is_demo = true (free by design)
//   • the house account — the founder's own testing login (HOUSE_ACCOUNT_EMAIL)
//
// The DB glue (resolving the house auth-user ids + fetching clients) lives in
// real-clients.ts; this file holds only the pure set computation it leans on.
// ─────────────────────────────────────────────────────────────────────────────

/** The founder's own testing account — never revenue. Lower-cased for compares. */
export const HOUSE_ACCOUNT_EMAIL = 'hello@get-kind.com'

export interface MinClient {
  id: string
  user_id: string | null
  is_demo: boolean | null
}

export interface ClientExclusions {
  /** demo ∪ house — the ids to drop from any revenue roll-up. */
  excludedClientIds: Set<string>
  demoClientIds: Set<string>
  houseClientIds: Set<string>
}

/**
 * PURE — given every client and the set of house auth-user ids, compute which
 * client ids must be excluded from revenue (demo OR house). No IO.
 */
export function computeExcludedClientIds(
  clients: MinClient[],
  houseUserIds: Set<string>,
): ClientExclusions {
  const demoClientIds = new Set<string>()
  const houseClientIds = new Set<string>()
  for (const c of clients) {
    if (c.is_demo === true) demoClientIds.add(c.id)
    if (c.user_id && houseUserIds.has(c.user_id)) houseClientIds.add(c.id)
  }
  const excludedClientIds = new Set<string>([...demoClientIds, ...houseClientIds])
  return { excludedClientIds, demoClientIds, houseClientIds }
}
