const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://kindapi-production-e64c.up.railway.app'

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
    const err = new Error(errMsg) as Error & { status: number }
    err.status = res.status
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
