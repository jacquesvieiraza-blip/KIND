const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://kindapi-production-e64c.up.railway.app'

/**
 * 🛑 THE BUDGET FOR A CALL THAT IS WAITING ON A MODEL TURN. ⚑ 14 Sep.
 *
 * ⚠️ ONE NUMBER, AND IT IS HALF OF AN ARITHMETIC. The founder ruled the conversational
 * surfaces onto Sonnet ("sonnet on every human facing surface"), which is slower than the
 * model they ran on — so the 15s default below stopped being a budget and became a way to
 * throw away replies that were still legitimately coming. These routes hold no state, so an
 * abandoned turn is work the client paid for in waiting and never received.
 *
 * The other half is server-side: every one of these routes bounds its Anthropic call at
 * **30s with no SDK retry** (`AI_TURN_BOUND` in the API), so the worst case a browser can be
 * waiting on is 30s plus transport. 45s leaves 15s of margin and cannot be reached by a
 * healthy turn.
 *
 * ⚠️ THE ONBOARDING ROUTE IS NOT THIS NUMBER and deliberately so — it passes 60s against a
 * server that allows 45s, an arithmetic written before this one and proved in its own
 * comment (`routes/icps.ts`, the builder/chat provider call). Two budgets, both stated.
 */
export const AI_TURN_TIMEOUT_MS = 45_000

async function apiFetch<T>(path: string, options?: RequestInit, token?: string, timeoutMs = 15000): Promise<T> {
  // ⚑ 26 Aug — the timeout is now per-call. 15s is right for CRUD and was WRONG for the one
  // endpoint that waits on a model turn (`/icps/builder/chat`): the server allows Anthropic
  // 45s with one retry, so a browser that walked away at 15s abandoned replies that were
  // still legitimately coming — and the work was thrown away, because that route holds no
  // state. Callers that wait on a model pass a larger budget; everything else is unchanged.
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  let res: Response
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...options,
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options?.headers },
    })
  } catch (e: any) {
    clearTimeout(timer)
    const err = new Error(e?.name === 'AbortError' ? 'Request timed out — please try again' : 'Network error — check your connection') as Error & { status: number }
    err.status = 0
    throw err
  }
  clearTimeout(timer)

  const contentType = res.headers.get('content-type') ?? ''
  if (!contentType.includes('application/json')) {
    if (!res.ok) {
      const err = new Error(`Server error (${res.status}) — please try again`) as Error & { status: number }
      err.status = res.status
      throw err
    }
    return (await res.text()) as unknown as T
  }

  const data = await res.json()
  if (!res.ok) {
    const errMsg = Array.isArray(data.error)
      ? data.error.map((e: { message?: string }) => e.message ?? JSON.stringify(e)).join(', ')
      : (typeof data.error === 'string' ? data.error : JSON.stringify(data.error)) || 'API request failed'
    const err = new Error(errMsg) as Error & { status: number; code?: string }
    err.status = res.status
    // ⚑ 10 Sep (C01) — THE MACHINE-READABLE CODE SURVIVES THE THROW.
    //
    // 🛑 IT WAS DROPPED HERE, AND THAT IS WHY EVERY FAILURE LOOKED THE SAME. `/icps/revise`
    // answers 409 with `existing_pending_targeting` or `targeting_state_changed` — two
    // opposite situations, one of which must never be retried — and the only thing that
    // reached the screen was `error`, the PROSE. So the transcript either printed our
    // internal review wording verbatim or collapsed both into "I hit a snag reaching the
    // engine". A screen cannot branch on a fact it was not given.
    //
    // ⚠️ THE PROSE IS STILL CARRIED, for logs and for callers that already show it. What is
    // new is that a caller can now tell WHICH refusal it was without matching on a sentence.
    if (typeof data.code === 'string' && data.code) err.code = data.code
    throw err
  }
  return data
}

export const api = {
  get:     <T>(path: string, token?: string) => apiFetch<T>(path, { method: 'GET' }, token),
  post:    <T>(path: string, body: unknown, token?: string, timeoutMs?: number) => apiFetch<T>(path, { method: 'POST', body: JSON.stringify(body) }, token, timeoutMs),
  put:     <T>(path: string, body: unknown, token?: string) => apiFetch<T>(path, { method: 'PUT', body: JSON.stringify(body) }, token),
  patch:   <T>(path: string, body: unknown, token?: string) => apiFetch<T>(path, { method: 'PATCH', body: JSON.stringify(body) }, token),
  delete_: <T>(path: string, token?: string) => apiFetch<T>(path, { method: 'DELETE' }, token),
}
