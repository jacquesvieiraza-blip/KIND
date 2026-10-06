// ─────────────────────────────────────────────────────────────────────────────
// REAL PAYING CLIENTS — DB glue over the pure logic in real-clients-logic.ts.
//
// Resolves the set of client ids to EXCLUDE from every admin revenue figure:
// demo/test accounts (clients.is_demo) and the house account (the founder's own
// testing login, auth email = HOUSE_ACCOUNT_EMAIL). There is no email on
// `clients`, so the house auth-user ids are looked up via the admin auth API.
// ─────────────────────────────────────────────────────────────────────────────
import { db } from '@kind/db'
import { RETIRED_HOUSE_ACCOUNT_EMAILS } from '@kind/shared'
import {
  computeExcludedClientIds,
  HOUSE_ACCOUNT_EMAIL,
  isHouseEmail,
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
export async function resolveHouseUserIds(): Promise<Set<string>> {
  const ids = new Set<string>()
  try {
    for (let page = 1; page <= 500; page++) {
      const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 })
      const users = data?.users ?? []
      if (error || users.length === 0) break
      for (const u of users) {
        if (isHouseEmail(u.email)) ids.add(u.id)
      }
    }
  } catch (err) {
    console.warn('[real-clients] resolveHouseUserIds failed — house account not excluded:', err)
  }
  return ids
}

/**
 * ⚑ 29 Sep (R152 · fix) — THE HOUSE *LOGIN* ONLY: the auth user(s) whose email is
 * `HOUSE_ACCOUNT_EMAIL` (jacques.vieiraza+house@gmail.com), NOT every address on the House list.
 *
 * R152 keeps the retired `hello@get-kind.com` on the list ONLY so its history stays out of every
 * revenue figure. Deciding WHICH account is Client Zero from the whole list found two accounts —
 * the new House and the old one — and refused to guess: House setup, the House mailbox, the test
 * account wipe and System's House check all answered "the house account could not be resolved".
 * Exclusion still uses `resolveHouseUserIds` (the whole list); only the decision uses this.
 */
export async function resolveHouseLoginUserIds(): Promise<Set<string>> {
  const ids = new Set<string>()
  const login = HOUSE_ACCOUNT_EMAIL.trim().toLowerCase()
  try {
    for (let page = 1; page <= 500; page++) {
      const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 })
      const users = data?.users ?? []
      if (error || users.length === 0) break
      for (const u of users) {
        if ((u.email ?? '').trim().toLowerCase() === login) ids.add(u.id)
      }
    }
  } catch (err) {
    console.warn('[real-clients] resolveHouseLoginUserIds failed — the house login is not resolved:', err)
  }
  return ids
}

/**
 * ⚑ 6 Oct (item 3 · founder "yes hide it. lock that") — THE OLD HOUSE ACCOUNT, HIDDEN FROM VIDA.
 * The clients owned by a RETIRED House login (`hello@get-kind.com`, R152). Pure. Vida's client
 * list, "Needs you" board and worklist leave these out; nothing about the account is changed,
 * and it stays on the House list (`resolveHouseUserIds`) so its history stays out of revenue.
 */
export function retiredHouseClientIds(
  clients: { id: string; user_id: string | null }[], retiredUserIds: Set<string>,
): Set<string> {
  return new Set(clients.filter(c => c.user_id !== null && retiredUserIds.has(c.user_id)).map(c => c.id))
}

/** IO — the auth ids of the retired House login(s). A lookup failure is an EMPTY set: shown, never hidden. */
export async function resolveRetiredHouseUserIds(): Promise<Set<string>> {
  const ids = new Set<string>()
  const retired = new Set(RETIRED_HOUSE_ACCOUNT_EMAILS.map(e => e.trim().toLowerCase()))
  try {
    for (let page = 1; page <= 500; page++) {
      const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 })
      const users = data?.users ?? []
      if (error || users.length === 0) break
      for (const u of users) {
        if (retired.has((u.email ?? '').trim().toLowerCase())) ids.add(u.id)
      }
    }
  } catch (err) {
    console.warn('[real-clients] resolveRetiredHouseUserIds failed — the old House account stays visible:', err)
  }
  return ids
}

/** IO — the client ids Vida hides (see `retiredHouseClientIds`). Never throws: a failure hides nothing. */
export async function getRetiredHouseClientIds(): Promise<Set<string>> {
  try {
    const [clients, retired] = await Promise.all([fetchAllClientsMin(), resolveRetiredHouseUserIds()])
    return retiredHouseClientIds(clients as { id: string; user_id: string | null }[], retired)
  } catch (err) {
    console.warn('[real-clients] getRetiredHouseClientIds failed — nothing hidden:', err)
    return new Set()
  }
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
