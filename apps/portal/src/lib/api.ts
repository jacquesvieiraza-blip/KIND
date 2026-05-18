const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://kindapi-production-e64c.up.railway.app'

async function apiFetch<T>(path: string, options?: RequestInit, token?: string): Promise<T> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 15000)
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    signal: controller.signal,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options?.headers },
  }).finally(() => clearTimeout(timer))
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
  post:    <T>(path: string, body: unknown, token?: string) => apiFetch<T>(path, { method: 'POST', body: JSON.stringify(body) }, token),
  patch:   <T>(path: string, body: unknown, token?: string) => apiFetch<T>(path, { method: 'PATCH', body: JSON.stringify(body) }, token),
  delete_: <T>(path: string, token?: string) => apiFetch<T>(path, { method: 'DELETE' }, token),
}
