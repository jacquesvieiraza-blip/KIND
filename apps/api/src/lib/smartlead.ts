// THE ENGINE (item 211) — Smartlead client · PHASE 1: READ-ONLY connectivity only.
//
// Scope discipline (deliberate): this module currently exposes ZERO sending. It
// exists to prove, on staging/admin only, that the SMARTLEAD_API_KEY authenticates
// and the Smartlead account is reachable before we build the client-facing sending
// path (Phases 2-6 — the SendingProvider seam, modes, reply capture — each previewed
// before it goes live per RULEBOOK §11). Read endpoints only: list email accounts +
// list campaigns. No campaign creation, no sends, no mutations.
//
// Auth: Smartlead authenticates with the API key as a query param (?api_key=...).
// The key is never logged and never returned to the client — only derived booleans.

const BASE = process.env.SMARTLEAD_BASE_URL || 'https://server.smartlead.ai/api/v1'

export function smartleadConfigured(): boolean {
  return !!process.env.SMARTLEAD_API_KEY
}

type Check = { name: string; ok: boolean; status?: number; count?: number; detail?: string }

export type SmartleadVerifyResult = {
  configured: boolean
  ok: boolean
  baseUrl: string
  checks: Check[]
  emailAccounts?: number
  campaigns?: number
  error?: string
}

// Single read-only GET against the Smartlead API. Returns a structured result and
// never throws — callers get {ok:false,...} on any network/HTTP error so the verify
// endpoint can report a clean diagnostic instead of a 500.
async function get(path: string): Promise<{ ok: boolean; status: number; json?: unknown; detail?: string }> {
  const key = process.env.SMARTLEAD_API_KEY
  if (!key) return { ok: false, status: 0, detail: 'SMARTLEAD_API_KEY not set' }
  const sep = path.includes('?') ? '&' : '?'
  const url = `${BASE}${path}${sep}api_key=${encodeURIComponent(key)}`
  try {
    const res = await fetch(url, { method: 'GET', signal: AbortSignal.timeout(10000) })
    let json: unknown
    try { json = await res.json() } catch { json = undefined }
    return {
      ok: res.ok,
      status: res.status,
      json,
      detail: res.ok ? undefined : `HTTP ${res.status}`,
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'request failed'
    return { ok: false, status: 0, detail: msg }
  }
}

function countArray(json: unknown): number | undefined {
  if (Array.isArray(json)) return json.length
  // Smartlead sometimes wraps lists; tolerate {data:[...]}
  if (json && typeof json === 'object' && Array.isArray((json as { data?: unknown }).data)) {
    return ((json as { data: unknown[] }).data).length
  }
  return undefined
}

// PHASE-1 PROOF: authenticate + reach two read endpoints. A 200 on either proves the
// Admin API key is valid and the account is reachable. No data is sent anywhere.
export async function verifySmartlead(): Promise<SmartleadVerifyResult> {
  const result: SmartleadVerifyResult = {
    configured: smartleadConfigured(),
    ok: false,
    baseUrl: BASE,
    checks: [],
  }
  if (!result.configured) {
    result.error = 'SMARTLEAD_API_KEY not set on this service'
    return result
  }

  const accounts = await get('/email-accounts/?offset=0&limit=100')
  const accountsCount = countArray(accounts.json)
  result.checks.push({
    name: 'list email accounts',
    ok: accounts.ok,
    status: accounts.status,
    count: accountsCount,
    detail: accounts.detail,
  })
  if (accountsCount !== undefined) result.emailAccounts = accountsCount

  const campaigns = await get('/campaigns/')
  const campaignsCount = countArray(campaigns.json)
  result.checks.push({
    name: 'list campaigns',
    ok: campaigns.ok,
    status: campaigns.status,
    count: campaignsCount,
    detail: campaigns.detail,
  })
  if (campaignsCount !== undefined) result.campaigns = campaignsCount

  // Auth is proven if either read endpoint returns 2xx (a fresh account legitimately
  // has zero email accounts AND zero campaigns — both reachable is the real signal).
  result.ok = result.checks.some((c) => c.ok)
  if (!result.ok) {
    const auth = result.checks.find((c) => c.status === 401 || c.status === 403)
    result.error = auth
      ? 'Smartlead rejected the API key (401/403) — check the key + plan API access'
      : 'Could not reach Smartlead read endpoints — see checks[]'
  }
  return result
}
