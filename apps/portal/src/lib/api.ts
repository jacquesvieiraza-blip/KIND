const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://kindapi-production-83cb.up.railway.app'

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
    const err = new Error(data.error || 'API request failed') as Error & { status: number }
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
