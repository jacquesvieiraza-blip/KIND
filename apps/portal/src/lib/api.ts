// All API calls go through the Next.js proxy at /api/kind/...
// The proxy forwards to Railway server-side, so no CORS or NEXT_PUBLIC_ env var needed.
const API_BASE = '/api/kind'

async function apiFetch<T>(path: string, options?: RequestInit, token?: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  })

  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'API request failed')
  return data
}

export const api = {
  get: <T>(path: string, token?: string) => apiFetch<T>(path, { method: 'GET' }, token),
  post: <T>(path: string, body: unknown, token?: string) =>
    apiFetch<T>(path, { method: 'POST', body: JSON.stringify(body) }, token),
  patch: <T>(path: string, body: unknown, token?: string) =>
    apiFetch<T>(path, { method: 'PATCH', body: JSON.stringify(body) }, token),
  delete: <T>(path: string, token?: string) => apiFetch<T>(path, { method: 'DELETE' }, token),
}
