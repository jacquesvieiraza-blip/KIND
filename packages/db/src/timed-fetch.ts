// ── ⚑ 1 Oct (#2050) — EVERY DATABASE CALL HAS A DEADLINE ───────────────────────────────────
//
// The Supabase client set no request timeout, so one hung call to the database could hang a run
// forever — a send run holding its place, a proof pass that could never be released on elapsed
// time. This fetch gives every request a deadline. When it passes, the request is aborted and the
// client returns an ERROR, never data — so every caller's existing "unreadable → refuse" path is
// what runs, which is the safe direction for money and for sending.
//
// A caller's own abort signal still works: whichever fires first wins.

/** Default deadline for one database request. A healthy query is far under a second; a
 * minute is generous enough that no real query is cut off, and still ends a hang. */
export const DB_REQUEST_TIMEOUT_MS_DEFAULT = 60_000

export function dbRequestTimeoutMs(env: Record<string, string | undefined> = process.env): number {
  const v = Number(env.DB_REQUEST_TIMEOUT_MS)
  return Number.isFinite(v) && v >= 1_000 ? Math.floor(v) : DB_REQUEST_TIMEOUT_MS_DEFAULT
}

export function timedFetch(
  timeoutMs: number,
  base: typeof fetch = fetch,
): typeof fetch {
  return async (input, init) => {
    const ctl = new AbortController()
    const timer = setTimeout(
      () => ctl.abort(new Error(`database request timed out after ${timeoutMs}ms`)),
      timeoutMs,
    )
    const outer = init?.signal
    const onOuter = () => ctl.abort(outer?.reason)
    if (outer) {
      if (outer.aborted) ctl.abort(outer.reason)
      else outer.addEventListener('abort', onOuter, { once: true })
    }
    try {
      return await base(input, { ...init, signal: ctl.signal })
    } finally {
      clearTimeout(timer)
      outer?.removeEventListener('abort', onOuter)
    }
  }
}
