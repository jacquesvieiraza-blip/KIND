// PAGE, DON'T TRUNCATE.
//
// Nine places in the API read rows with `.limit(20000)` and then count or group them. That
// is a silent lie waiting for scale: PostgREST returns *some* 20,000 rows, in no guaranteed
// order, and the code carries on as though it had them all.
//
// The two that matter most:
//   • the Vida worklist pulls every lead for up to 200 clients — 100 clients × 200 leads is
//     already 20,000, so past that half the board's clients silently read as zero
//   • the nightly top-up builds its "who has paid" set from credit_transaction ROWS, and an
//     active client generates many; a client whose rows fall outside the window never gets
//     their 200 sourced
//
// `money-path.ts` already had a private pager. This is that idea, shared, with a stable sort
// key (without one, paging can skip or duplicate rows because each page may come back in a
// different order) and a hard ceiling so a runaway table can't hang a request.

import { db } from '@kind/db'

export type PageOpts = {
  /** Rows per round trip. 1000 is Supabase's comfortable default. */
  page?: number
  /** Absolute ceiling. Reached = we log loudly rather than return a quiet half-answer. */
  max?: number
  /** Stable sort column. Paging without one can skip or repeat rows. */
  orderBy?: string
  /** For the log line, so a truncation says WHICH read gave up. */
  label?: string
}

/**
 * Read every row a query matches, a page at a time.
 *
 * `build` receives a fresh query builder each round so filters are re-applied per page.
 * Returns `{ rows, complete }` — `complete: false` means the ceiling was hit and the caller
 * is holding a partial answer, which is something it should say out loud rather than treat
 * as a total.
 */
export async function pageRows<T = Record<string, unknown>>(
  table: string,
  build: (q: ReturnType<typeof db.from>) => unknown,
  opts: PageOpts = {},
): Promise<{ rows: T[]; complete: boolean }> {
  const page = opts.page ?? 1000
  const max = opts.max ?? 200_000
  const out: T[] = []

  for (let from = 0; from < max; from += page) {
    let q = build(db.from(table)) as unknown as {
      range: (a: number, b: number) => unknown
      order: (c: string, o: { ascending: boolean }) => unknown
    }
    if (opts.orderBy) q = q.order(opts.orderBy, { ascending: true }) as typeof q
    const { data, error } = (await q.range(from, from + page - 1)) as { data: T[] | null; error: unknown }
    if (error) throw error
    const rows = data ?? []
    out.push(...rows)
    if (rows.length < page) return { rows: out, complete: true }
  }

  console.warn(`[page-rows] ${opts.label ?? table}: hit the ${max}-row ceiling — the answer is PARTIAL.`)
  return { rows: out, complete: false }
}

/**
 * The set of client ids that have ever paid — derived from transaction rows without
 * truncating, and returned as a set of CLIENTS rather than a list of rows.
 *
 * This is the shape the callers actually wanted: the nightly crons were reading up to 20,000
 * *transactions* to answer a question about *clients*, so a busy client's rows could crowd a
 * quiet client out of the window entirely — and that client then never got topped up.
 */
export async function paidClientIds(paidTypes: string[]): Promise<{ ids: Set<string>; complete: boolean }> {
  const { rows, complete } = await pageRows<{ client_id: string }>(
    'credit_transactions',
    q => (q as unknown as { select: (c: string) => { in: (c: string, v: string[]) => unknown } })
      .select('client_id').in('type', paidTypes),
    { orderBy: 'client_id', label: 'paidClientIds' },
  )
  return { ids: new Set(rows.map(r => r.client_id).filter(Boolean)), complete }
}
