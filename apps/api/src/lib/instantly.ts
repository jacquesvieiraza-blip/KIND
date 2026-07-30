// INSTANTLY API v2 — the network half. The judgement is in `instantly-map.ts`.
//
// Prompt 4: OUR OWN outreach only (Client Zero). Instantly's mailboxes are AirMail-provisioned
// and expose no SMTP credentials, so the product instructs their sender instead of being one
// (#577). Client sending is Smartlead and is NOT built here.
//
// THE KEY IS NEVER LOGGED AND NEVER RETURNED. It goes into one header in one function and
// nowhere else. Every error string below is built from status codes and response text, and
// `redact()` scrubs the value from anything that would otherwise carry it — an API key in a
// log line is a credential in a log aggregator forever.
//
// VERIFIED against the public docs (developer.instantly.ai, checked 26 Jul):
//   • base `https://api.instantly.ai/api/v2`, `Authorization: Bearer <key>`
//   • `GET  /accounts`                    — the connected mailboxes
//   • `POST /accounts/warmup-analytics`   — warmup state per mailbox
//   • `GET|POST /campaigns`               — list / create
//   • `POST /leads`                       — add a lead
//
// NOT VERIFIED, and therefore NOT silently guessed — see `NOT_POSSIBLE` at the bottom:
//   • the reply-retrieval endpoint's exact path and shape
//   • published rate limits
//   • the campaign-create body beyond name + sequence
//
// Every response is treated as unknown and narrowed at the edge, because a shape we assumed
// and never verified is how a blank first name reaches a real prospect.

const BASE = 'https://api.instantly.ai/api/v2'
const TIMEOUT_MS = 15_000

export function instantlyKey(): string | null {
  const k = process.env.INSTANTLY_API_KEY
  return k && k.trim() ? k.trim() : null
}

export function instantlyConfigured(): boolean {
  return instantlyKey() !== null
}

/** Scrub the key out of any string before it can reach a log or an API response. */
export function redact(s: string): string {
  const k = instantlyKey()
  if (!k) return s
  return s.split(k).join('[INSTANTLY_API_KEY]')
}

export type InstantlyResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number | null; error: string }

/**
 * The ONE place the key is used.
 *
 * Returns a result rather than throwing, so every caller is forced to handle the failure —
 * a rejected promise in a cron is a silent no-op, which is the shape of most of what this
 * project has spent the week removing.
 */
async function call<T>(path: string, init?: { method?: string; body?: unknown }): Promise<InstantlyResult<T>> {
  const key = instantlyKey()
  if (!key) return { ok: false, status: null, error: 'INSTANTLY_API_KEY is not set' }

  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  try {
    const r = await fetch(`${BASE}${path}`, {
      method: init?.method ?? 'GET',
      headers: { Authorization: `Bearer ${key}`, 'content-type': 'application/json' },
      body: init?.body === undefined ? undefined : JSON.stringify(init.body),
      signal: ctrl.signal,
    })
    const text = await r.text().catch(() => '')
    if (!r.ok) {
      // 402/403 on this API means the workspace is not on a plan that includes v2 — a
      // NOT-POSSIBLE, not a bug to work around. Say so in those words.
      const plan = (r.status === 402 || r.status === 403)
        ? ' — API v2 requires the Instantly HYPERGROWTH plan or above; this is a plan limit, not a code fault'
        : ''
      return { ok: false, status: r.status, error: redact(`HTTP ${r.status}${plan}. ${text.slice(0, 300)}`) }
    }
    try { return { ok: true, data: (text ? JSON.parse(text) : {}) as T } }
    catch { return { ok: false, status: r.status, error: 'Instantly returned a body that is not JSON' } }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return { ok: false, status: null, error: redact(msg.includes('abort') ? `No answer within ${TIMEOUT_MS / 1000}s` : msg) }
  } finally { clearTimeout(t) }
}

// ── MAILBOXES ───────────────────────────────────────────────────────────────────────────

export type InstantlyAccount = {
  email: string
  /** Instantly's own warmup flag/score. Absent on plans that do not expose it. */
  warmup_status?: string | number | null
  status?: string | number | null
}

/** The connected mailboxes — the five already-warm AirMail boxes. */
export async function listAccounts(): Promise<InstantlyResult<InstantlyAccount[]>> {
  const r = await call<unknown>('/accounts')
  if (!r.ok) return r
  // The v2 list endpoints wrap in `items`; older shapes returned a bare array. Accept both
  // rather than assuming, and return an explicit failure if it is neither — an unexpected
  // shape silently coerced to [] would render "0 mailboxes" as if that were measured.
  const d = r.data as { items?: unknown } | unknown[]
  const rows = Array.isArray(d) ? d : Array.isArray((d as { items?: unknown }).items) ? (d as { items: unknown[] }).items : null
  if (!rows) return { ok: false, status: 200, error: 'Instantly returned an unrecognised shape for /accounts — neither an array nor { items: [...] }' }
  return { ok: true, data: rows as InstantlyAccount[] }
}

/** Warmup state per mailbox. Best-effort: not every plan exposes it. */
export async function warmupAnalytics(emails: string[]): Promise<InstantlyResult<unknown>> {
  return call('/accounts/warmup-analytics', { method: 'POST', body: { emails } })
}

// ── CAMPAIGNS + LEADS ───────────────────────────────────────────────────────────────────

export type InstantlyCampaign = { id: string; name: string; status?: string | number }

export async function listCampaigns(): Promise<InstantlyResult<InstantlyCampaign[]>> {
  const r = await call<unknown>('/campaigns')
  if (!r.ok) return r
  const d = r.data as { items?: unknown } | unknown[]
  const rows = Array.isArray(d) ? d : Array.isArray((d as { items?: unknown }).items) ? (d as { items: unknown[] }).items : null
  if (!rows) return { ok: false, status: 200, error: 'Instantly returned an unrecognised shape for /campaigns' }
  return { ok: true, data: rows as InstantlyCampaign[] }
}

export async function createCampaign(name: string, sequence: { subject: string; body: string; day: number }[]): Promise<InstantlyResult<InstantlyCampaign>> {
  return call<InstantlyCampaign>('/campaigns', {
    method: 'POST',
    body: {
      name,
      // Their v2 campaign body carries the sequence inline. The step shape beyond
      // subject/body/day is UNVERIFIED — see NOT_POSSIBLE.
      sequences: [{ steps: sequence.map(s => ({ subject: s.subject, body: s.body, day: s.day })) }],
    },
  })
}

/** Add one lead to a campaign. Our copy is already rendered — see `toInstantlySequence`. */
export async function addLead(campaignId: string, lead: Record<string, unknown>): Promise<InstantlyResult<{ id?: string }>> {
  return call<{ id?: string }>('/leads', { method: 'POST', body: { campaign: campaignId, ...lead } })
}

// ── WHAT THIS INTEGRATION CANNOT DO ─────────────────────────────────────────────────────
//
// Founder's instruction, verbatim: *"Report anything the API cannot do (rate limits, plan
// limits) as NOT-POSSIBLE rather than working around it silently."* So they are stated here,
// in code, rather than discovered later by someone reading a cron that quietly does nothing.
export const NOT_POSSIBLE: { what: string; why: string }[] = [
  {
    what: 'Any of this, without the HyperGrowth plan',
    why: 'Instantly API v2 needs HYPERGROWTH or above. A workspace below it gets 402/403 on every call, and `call()` says so in those words rather than reporting a code fault. ⚠️ CORRECTED 30 Jul: this used to say "Growth-plan-and-above", taken from Instantly\'s own 402 error text. Their published plan-comparison table lists **API: No** and **Webhooks: No** on Growth — so the error message was wrong about its own product, and trusting it would have had the founder buy a tier on which none of this works. Read the plan table, not the error string.',
  },
  {
    what: 'Pulling replies',
    why: 'The v2 reply-retrieval endpoint could not be verified — developer.instantly.ai returns 403 to this environment, so its exact path and payload are unknown. Rather than guess an endpoint and ship a cron that silently returns nothing, reply ingestion is left UNBUILT and the System screen reports it as NOT-MEASURED. `fromInstantlyReply()` is written and tested, so when the shape is confirmed the only missing piece is the fetch.',
  },
  {
    what: 'Respecting a published rate limit',
    why: 'No rate limit is documented publicly. Nothing here retries or backs off, because a retry loop against an unknown limit is how an account gets suspended. Calls fail once, loudly.',
  },
  {
    what: 'Verifying the campaign-create body beyond name + steps',
    why: 'Schedule, sending window, daily cap and mailbox assignment are all configurable in Instantly and are NOT set by this code. They must be configured in the Instantly UI. Setting them blind would silently override what is already on the five warm mailboxes.',
  },
]
