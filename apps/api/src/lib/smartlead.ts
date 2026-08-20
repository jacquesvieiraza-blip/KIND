// THE ENGINE (item 211) — Smartlead client.
//
// PHASE 1 (below, unchanged): READ-ONLY connectivity. It exists to prove that
// SMARTLEAD_API_KEY authenticates and the account is reachable, before anything can send.
// `verifySmartlead()` is what the Engine page and the System check call, and it still does
// exactly what it did — two read endpoints, no mutations.
//
// PHASE 2 (Prompt 7, added 27 Jul): the WRITE half — create a campaign, save our sequence,
// add leads. Kept in this file because it is the same network seam and the same credential;
// the judgement about WHO may be pushed is pure and lives in `smartlead-map.ts`, and the
// hand-off that ties them together is `smartlead-send.ts`. Same three-file shape as Instantly.
//
// Founder-locked 26 Jul: **Instantly is OURS, Smartlead is the CLIENTS'** (#577), and both run
// inside our own product — *"we use our own product for us"*, no CSV hand-off.
//
// Auth: Smartlead authenticates with the API key as a QUERY PARAM (?api_key=...), which makes
// this materially more dangerous than a header-based API — the credential is part of the URL,
// so it lands in any log line that records a URL and in any error that echoes the request.
// The key is never logged and never returned; `redact()` scrubs it, in both raw and
// URL-encoded form, from anything that could carry it.

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

// ════════════════════════════════════════════════════════════════════════════════════════
// PHASE 2 — THE WRITE HALF (Prompt 7). Everything above this line is unchanged Phase 1.
// ════════════════════════════════════════════════════════════════════════════════════════
//
// VERIFIED against Smartlead's published API reference (checked 27 Jul):
//   • base `https://server.smartlead.ai/api/v1`, auth `?api_key=<key>`
//   • `POST /campaigns/create`         — create, returns the campaign id
//   • `POST /campaigns/{id}/sequences` — save the sequence
//   • `POST /campaigns/{id}/leads`     — add leads; body wraps them in `lead_list`; max 400
//
// NOT VERIFIED, and therefore NOT guessed — see NOT_POSSIBLE at the bottom of this file:
//   • the exact per-step field names inside a sequence
//   • warmup field names on an email account
//   • published rate limits

const WRITE_TIMEOUT_MS = 15_000

export function smartleadKey(): string | null {
  const k = process.env.SMARTLEAD_API_KEY
  return k && k.trim() ? k.trim() : null
}

/**
 * Scrub the key from any string before it can reach a log or an API response.
 *
 * Scrubs the URL-ENCODED form too. The key travels as a query parameter, so it is
 * `encodeURIComponent`-ed into every request URL — a key containing `+` or `/` appears as
 * `%2B` / `%2F` in an echoed URL and would slip straight past a plain string replace.
 */
export function redact(s: string): string {
  const k = smartleadKey()
  if (!k) return s
  return s.split(k).join('[SMARTLEAD_API_KEY]')
          .split(encodeURIComponent(k)).join('[SMARTLEAD_API_KEY]')
}

export type SmartleadResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number | null; error: string }

/**
 * The ONE place the key is used for a write.
 *
 * Returns a result rather than throwing, so every caller is forced to handle the failure — a
 * rejected promise on a background path is a silent no-op, which is the shape of most of what
 * this project has spent the week removing.
 */
async function write<T>(path: string, body: unknown): Promise<SmartleadResult<T>> {
  const key = smartleadKey()
  if (!key) return { ok: false, status: null, error: 'SMARTLEAD_API_KEY is not set' }

  const sep = path.includes('?') ? '&' : '?'
  const url = `${BASE}${path}${sep}api_key=${encodeURIComponent(key)}`
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), WRITE_TIMEOUT_MS)
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    })
    const text = await r.text().catch(() => '')
    if (!r.ok) {
      // Name the KIND of failure — the fixes are completely different and nobody should have
      // to infer them from a bare status code.
      const hint =
        r.status === 401 ? ' — the key was rejected. Either SMARTLEAD_API_KEY is wrong or the Smartlead subscription is not active.' :
        r.status === 402 || r.status === 403 ? ' — a plan limit, not a code fault. Smartlead gates API access by plan.' :
        r.status === 429 ? ' — rate limited. Nothing here retries (see NOT_POSSIBLE); this call fails once, loudly.' : ''
      return { ok: false, status: r.status, error: redact(`HTTP ${r.status}${hint} ${text.slice(0, 300)}`) }
    }
    try { return { ok: true, data: (text ? JSON.parse(text) : {}) as T } }
    catch { return { ok: false, status: r.status, error: 'Smartlead returned a body that is not JSON' } }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return { ok: false, status: null, error: redact(msg.includes('abort') || msg.includes('timeout') ? `No answer within ${WRITE_TIMEOUT_MS / 1000}s` : msg) }
  } finally { clearTimeout(t) }
}

export type SmartleadCampaign = { id: number | string; name: string; status?: string }

/** Create a campaign and return its id. */
export async function createCampaign(name: string): Promise<SmartleadResult<{ id?: number | string }>> {
  return write<{ id?: number | string }>('/campaigns/create', { name })
}

/**
 * Save our rendered copy as the campaign's sequence.
 *
 * The STEP SHAPE IS UNVERIFIED — the endpoint is confirmed, the field names inside each step
 * are not, because both Smartlead doc hosts return 403 to this environment. Stated in
 * NOT_POSSIBLE rather than presented as working.
 */
export async function saveSequence(campaignId: string, sequence: unknown[]): Promise<SmartleadResult<unknown>> {
  return write(`/campaigns/${encodeURIComponent(campaignId)}/sequences`, { sequence })
}

/**
 * Add leads to a campaign. The caller must chunk to 400 — see `chunkLeads` in smartlead-map.
 *
 * `ignore_global_block_list` and `ignore_unsubscribe_list` are both FALSE deliberately: we
 * keep our own suppression list, and Smartlead keeps theirs, and a person who unsubscribed on
 * either one must not be emailed. Setting these true to "get more leads through" would be
 * emailing people who said stop.
 */
export async function addLeads(campaignId: string, leadList: unknown[]): Promise<SmartleadResult<{ added_count?: number; skipped_count?: number }>> {
  return write<{ added_count?: number; skipped_count?: number }>(
    `/campaigns/${encodeURIComponent(campaignId)}/leads`,
    { lead_list: leadList, settings: { ignore_global_block_list: false, ignore_unsubscribe_list: false } },
  )
}

/** List campaigns — the write half needs this to find an existing campaign by name. */
export async function listCampaignsTyped(): Promise<SmartleadResult<SmartleadCampaign[]>> {
  const r = await get('/campaigns/')
  if (!r.ok) return { ok: false, status: r.status || null, error: redact(r.detail ?? `HTTP ${r.status}`) }
  const d = r.json
  const rows = Array.isArray(d) ? d
    : Array.isArray((d as { data?: unknown } | null)?.data) ? (d as { data: unknown[] }).data
    : null
  // Null rather than [] when the shape is unrecognised: "0 campaigns" rendered from an
  // unparsed body is a measurement nobody took.
  if (!rows) return { ok: false, status: 200, error: 'Smartlead returned an unrecognised shape for /campaigns' }
  return { ok: true, data: rows as SmartleadCampaign[] }
}

// ── WHAT THIS INTEGRATION CANNOT DO ─────────────────────────────────────────────────────
//
// Founder's standing instruction: *"Report anything the API cannot do (rate limits, plan
// limits) as NOT-POSSIBLE rather than working around it silently."*
export const NOT_POSSIBLE: { what: string; why: string }[] = [
  {
    what: 'Anything at all, until Smartlead is bought and the key is live',
    why: 'The System check reports Smartlead as CHECKED-BROKEN with HTTP 401 — a key is set and the workspace rejects it. Founder-decided: Smartlead is purchased only once a client pays. Until then every call fails at the door and says so. NOTHING in this integration has been exercised against a live workspace.',
  },
  {
    what: 'Guaranteeing the sequence STEP shape is right',
    why: 'api.smartlead.ai and helpcenter.smartlead.ai both return 403 to this environment, exactly as developer.instantly.ai did. The ENDPOINT (POST /campaigns/{id}/sequences) is confirmed; the per-step field names are NOT. `toSmartleadSequence` is pure and fully unit-tested, so when the shape is confirmed the change is one mapping function — but it must be confirmed against a live workspace before the first client send, not assumed.',
  },
  {
    what: 'Reading warmup state per mailbox',
    why: 'The warmup fields on /email-accounts could not be verified. The System row therefore reports whether the mailbox is PRESENT and says warmup is NOT-MEASURED, rather than rendering a confident "warm" from a field name nobody checked.',
  },
  {
    what: 'Pulling replies',
    why: 'Not built, deliberately. Replies come back through the provider-agnostic spine in `reply-ingest.ts`, which already accepts a `smartlead` provider — so the missing piece is a webhook or a fetch, not the ingestion. Guessing an endpoint would ship a path that silently returns nothing, which is how a client stops hearing about their own replies.',
  },
  {
    what: 'Removing or stopping a lead in a campaign when they opt out (HC-3)',
    why: 'THE GAP THAT MATTERS MOST IN THIS LIST, because it is the one with a person on the other end. Smartlead sends from its own engine with its own copy of the lead, so `opt_out_blocklist` — which every one of OUR send paths re-reads — does nothing to it. A person who replies STOP is suppressed everywhere except the one place still emailing them. There is NO remove/stop/lead-lookup endpoint in this file to call, and api.smartlead.ai returns 403 to this environment so no URL can be confirmed; writing one would be guessing an endpoint, which is what the replies entry below already refuses to do. Founder-ruled 20 Aug — *"yes alert not api"*. So `alertSmartleadStillSending` in `smartlead-send.ts` reads `leads.smartlead_campaign_id` and pages the founder with the person and the campaign to remove by hand, on BOTH suppression doors (reply-STOP and one-click unsubscribe). That works today; the API call gets written the day the workspace is live, which is also the first day it could be tested. ⚠️ NOT a silent no-op — a silent one would make the product LOOK like it propagates opt-outs while a suppressed person kept receiving mail.',
  },
  {
    what: 'Respecting a published rate limit',
    why: 'No rate limit is documented publicly. Nothing retries or backs off, because a retry loop against an unknown limit is how an account gets suspended. Calls fail once, loudly, and a 429 says exactly that.',
  },
]
