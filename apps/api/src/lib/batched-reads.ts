// ═══════════════════════════════════════════════════════════════════════════════════════
// XC-3 · TWO PRIMITIVES FOR READING A LIST WITHOUT ONE ROUND TRIP PER ROW
//
// ── WHY THESE EXIST, AND WHY THEY ARE NOT AN OPTIMISATION ──────────────────────────────
//
// The lifecycle board is the operator's list of every client, and it walked clients in a
// `for` loop doing `await` reads inside it: the programme→ICP→campaign chain (five reads), a
// send count, a leads read and a replies read — eight sequential round trips per client. At 40
// clients that is 320 serialised queries, and it is the page the whole console opens on.
//
// 🛑 THE COST IS NOT ONLY SPEED. The admin proxy abandons a request at 45s, so past some
// client count the board simply STOPS ANSWERING — and the failure mode is not "slow", it is
// "the operator's list of clients is gone", which no amount of patience fixes. A per-row read
// loop is therefore a correctness problem with a client count attached to it.
//
// ⚠️ AND THE `.in()` LIST IS NOT UNBOUNDED EITHER, which is the trap in the obvious fix.
// supabase-js sends filters in the QUERY STRING, so `.in('id', tenThousandIds)` builds a URL
// that the gateway rejects — and a rejected read comes back as `{data: null, error}`, which a
// destructured `const { data }` reads as EMPTY. "No replies awaiting a decision" is a
// perfectly plausible-looking answer, and it would be produced by a URL that was too long.
// So the id list is chunked, and the chunks run in bounded parallel.
// ═══════════════════════════════════════════════════════════════════════════════════════

/**
 * How many ids may go into one `.in(…)` filter.
 *
 * ⚠️ CONSERVATIVE ON PURPOSE. A uuid is 36 characters plus a separator, so 300 ids is roughly
 * 11 KB of query string — comfortably inside the usual 16 KB request-line limits with room for
 * the rest of the URL. Raising this trades a round trip for a 414 that presents as empty data.
 */
export const IN_CHUNK = 300

/**
 * How many of those chunk reads may be in flight at once.
 *
 * ⚠️ BOUNDED, because the point is not "as parallel as possible". An unbounded fan-out over a
 * few thousand ids opens hundreds of simultaneous connections to the same pooler, which is how
 * a read path starts causing the timeouts it was written to avoid.
 */
export const READ_CONCURRENCY = 6

/** Split a list into `size`-sized chunks. An empty list yields no chunks. */
export function chunk<T>(items: readonly T[], size: number = IN_CHUNK): T[][] {
  if (size < 1) throw new Error('chunk size must be at least 1')
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

/**
 * Run `fn` over every item with at most `limit` in flight, preserving input order.
 *
 * ⚠️ IT NEVER REJECTS, AND THAT IS DELIBERATE. One unreadable chunk out of twenty must not
 * throw away the other nineteen — but it must not silently look like an empty chunk either,
 * so a failure resolves to `{ ok: false, error }` and the CALLER decides what an unreadable
 * part of the answer means. That decision is never "the answer is zero".
 */
export type Settled<T> = { ok: true; value: T } | { ok: false; error: unknown }

export async function mapBounded<T, R>(
  items: readonly T[],
  fn: (item: T, index: number) => Promise<R>,
  limit: number = READ_CONCURRENCY,
): Promise<Settled<R>[]> {
  const out: Settled<R>[] = new Array(items.length)
  let next = 0
  const workers = new Array(Math.max(1, Math.min(limit, items.length))).fill(0).map(async () => {
    for (;;) {
      const i = next++
      if (i >= items.length) return
      try {
        out[i] = { ok: true, value: await fn(items[i], i) }
      } catch (error) {
        out[i] = { ok: false, error }
      }
    }
  })
  await Promise.all(workers)
  return out
}

/**
 * Read one table for many ids, chunked and in bounded parallel.
 *
 * `read` is given ONE chunk of ids and returns that chunk's rows. It is the caller's own
 * supabase-js call, so this helper stays free of any assumption about columns or filters.
 *
 * ⚠️ `complete` IS THE WHOLE POINT OF THE RETURN SHAPE. `rows` alone cannot distinguish "there
 * are no matching rows" from "two of the eleven chunks could not be read", and every defect
 * this module exists to prevent lives in that gap. A caller that ignores `complete` is making
 * the same mistake in a new place.
 */
export async function readInChunks<Id, Row>(
  ids: readonly Id[],
  read: (chunkIds: Id[]) => Promise<Row[]>,
  opts: { chunkSize?: number; limit?: number } = {},
): Promise<{ rows: Row[]; complete: boolean; errors: unknown[] }> {
  if (ids.length === 0) return { rows: [], complete: true, errors: [] }
  const settled = await mapBounded(chunk(ids, opts.chunkSize ?? IN_CHUNK), read, opts.limit ?? READ_CONCURRENCY)
  const rows: Row[] = []
  const errors: unknown[] = []
  for (const s of settled) {
    if (s.ok) rows.push(...s.value)
    else errors.push(s.error)
  }
  return { rows, complete: errors.length === 0, errors }
}
