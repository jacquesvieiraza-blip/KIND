/**
 * ⚑ 29 Sep (R174 ⑧ · PR 8c) — THE ONE "REAL CLIENTS ONLY" RULE FOR A BUSINESS NUMBER.
 *
 * Revenue already dropped the demo and House (R152); signups, sending stats, the top-bar
 * "sent", the Engine totals and the founder's client count did not, so every demo reset read as
 * a new signup and every demo email as a real send. Each of those reads now goes through this one
 * function, so they cannot disagree about who counts.
 *
 * `column` is the client-id column the query filters on — `client_id`, `id` on `clients`, or
 * `leads.client_id` for `figsy_sent_emails`, which has no client id of its own and is joined
 * through `leads!inner(client_id)` exactly as the daily-cap counter does. An empty set leaves the
 * query untouched (a PostgREST `in ()` is a syntax error, not "nothing excluded").
 */
export function pgInList(ids: Iterable<string>): string | null {
  const a = [...ids]
  return a.length ? `(${a.map(i => `"${i}"`).join(',')})` : null
}
export function withoutClients<Q>(q: Q, column: string, ids: Iterable<string>): Q {
  const list = pgInList(ids)
  return list ? (q as unknown as { not: (c: string, op: string, v: string) => Q }).not(column, 'in', list) : q
}
