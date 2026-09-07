// ─────────────────────────────────────────────────────────────────────────────
// REAL PAYING CLIENTS — DB glue over the pure logic in real-clients-logic.ts.
//
// Resolves the set of client ids to EXCLUDE from every admin revenue figure:
// demo/test accounts (clients.is_demo) and the house account (the founder's own
// testing login, auth email = HOUSE_ACCOUNT_EMAIL). There is no email on
// `clients`, so the house auth-user ids are looked up via the admin auth API.
// ─────────────────────────────────────────────────────────────────────────────
import { db } from '@kind/db'
import {
  computeExcludedClientIds,
  HOUSE_ACCOUNT_EMAIL,
  type MinClient,
  type ClientExclusions,
} from './real-clients-logic'

export { computeExcludedClientIds, HOUSE_ACCOUNT_EMAIL }
export type { MinClient, ClientExclusions }

/**
 * IO — resolve the auth-user id(s) whose email is the house account. Pages through
 * listUsers (perPage-cap agnostic: loops until an empty page, so a server that caps
 * perPage below the request never truncates). Fails OPEN to an empty set (house
 * simply isn't excluded) rather than throwing — a lookup outage must never break an
 * admin revenue endpoint.
 */
export async function resolveHouseUserIds(opts?: { strict?: boolean }): Promise<Set<string>> {
  const ids = new Set<string>()
  try {
    for (let page = 1; page <= 500; page++) {
      const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 })
      const users = data?.users ?? []
      if (error && opts?.strict) throw new Error(`auth listUsers failed — ${error.message ?? String(error)}`)
      if (error || users.length === 0) break
      for (const u of users) {
        if ((u.email ?? '').trim().toLowerCase() === HOUSE_ACCOUNT_EMAIL) ids.add(u.id)
      }
    }
  } catch (err) {
    // ⚑ 7 Sep — STRICT IS OPT-IN, AND EVERY EXISTING CALLER KEEPS THE FAIL-OPEN.
    //
    // Swallowing is right for an admin revenue page: an auth blink must not break it, and
    // "the house was not excluded" is a small, visible inaccuracy. It is WRONG for a sourcing
    // run, where the same swallow answers "not house" and quietly moves House onto the
    // clients' provider. A caller that cannot survive an unknown asks for `strict` and gets
    // the throw; nobody else's behaviour changes at all.
    if (opts?.strict) throw err
    console.warn('[real-clients] resolveHouseUserIds failed — house account not excluded:', err)
  }
  return ids
}

/** IO — every client (id, user_id, is_demo), paged past the PostgREST 1000-row cap. */
async function fetchAllClientsMin(): Promise<MinClient[]> {
  const out: MinClient[] = []
  const page = 1000
  for (let from = 0; ; from += page) {
    const { data, error } = await db
      .from('clients')
      .select('id, user_id, is_demo')
      .order('id', { ascending: true })
      .range(from, from + page - 1)
    if (error) throw error
    const rows = (data ?? []) as MinClient[]
    out.push(...rows)
    if (rows.length < page) break
  }
  return out
}

/**
 * IO — the full exclusion object (demo ∪ house). Every revenue roll-up filters its
 * per-client rows through `excludedClientIds` before summing.
 */
export async function getClientExclusions(): Promise<ClientExclusions> {
  const [clients, houseUserIds] = await Promise.all([fetchAllClientsMin(), resolveHouseUserIds()])
  return computeExcludedClientIds(clients, houseUserIds)
}

/** IO convenience — just the excluded-id set. */
export async function getExcludedClientIds(): Promise<Set<string>> {
  return (await getClientExclusions()).excludedClientIds
}
