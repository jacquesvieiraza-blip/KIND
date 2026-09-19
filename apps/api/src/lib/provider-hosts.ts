// ═══════════════════════════════════════════════════════════════════════════════════════
// BATCH 1b · WHERE EACH PROVIDER LIVES — ONE HOME, PRODUCTION DEFAULTS
//
// ── WHY THIS EXISTS ────────────────────────────────────────────────────────────────────
//
// The §8.2 full-stack pre-production run has to point the REAL API, portal and admin at
// RECORDING FAKES instead of real providers. Node's `fetch` ignores `HTTPS_PROXY` (nothing in
// this repo installs a proxy dispatcher — checked), so a provider call can only be redirected
// by the URL the code builds. Before this module those URLs were literals in four files.
//
// 🛑 AND THE POINT OF THE RUN IS THE ZERO-CALL PROOF. Batch 1's contract requires PDL and
// Hunter to receive **zero calls with their keys SET** — the only shape that catches a pasted
// key re-enabling a founder-locked provider. That proof is only possible if a fake can stand
// where the real provider stands and COUNT. So this is harness plumbing whose absence would
// make the contract's own evidence unobtainable.
//
// ── THE ONE RULE THIS MODULE MUST NEVER BREAK ──────────────────────────────────────────
//
// ⚠️ AN UNSET VARIABLE IS PRODUCTION, BYTE FOR BYTE. Every default below is the literal that
// was previously inlined at the call site, and `base()` falls back to it on unset, empty or
// whitespace-only input. `provider-hosts.test.ts` asserts each default against the string the
// call site used to contain, so a typo here cannot quietly repoint a live provider.
//
// ⚠️ AND IT IS A HOST, NOT A CREDENTIAL. Nothing in this file reads a key. Redirecting a base
// URL grants no access; the keys stay exactly where they were.
//
// ⚠️ TRAILING SLASHES ARE STRIPPED, because every call site concatenates a path beginning with
// `/`. A variable set as `http://127.0.0.1:1234/` would otherwise build `//emails`, which some
// servers route differently — a difference between the harness and production that would exist
// only because of how somebody typed an env var.
// ═══════════════════════════════════════════════════════════════════════════════════════

/**
 * Normalise one raw environment value against its production default.
 *
 * ⚠️ EVERY CALLER PASSES `process.env.X` AS A LITERAL, never `process.env[name]`. Two static
 * sweeps in this repo depend on that: `env-inventory.ts` builds the register by scanning for
 * literal `process.env.NAME` reads, and `env-doc-drift.test.ts` fails the gate when the
 * register, `docs/ENVIRONMENT.md` and `startup-check.ts` disagree. A dynamic index would make
 * these five variables INVISIBLE to both — an undocumented variable that repoints a live
 * provider is precisely the drift those guards exist to catch, so the indirection is banned
 * here even though it would be shorter.
 */
function base(raw: string | undefined, productionDefault: string): string {
  if (typeof raw !== 'string' || raw.trim() === '') return productionDefault
  return raw.trim().replace(/\/+$/, '')
}

/**
 * Apollo's PUBLIC REST API.
 *
 * ⚠️ `/api/v1` IS LOAD-BEARING AND THE DEFAULT KEEPS IT. The bare `/v1` host is Apollo's
 * internal web API: it ACCEPTS an `X-Api-Key`, runs with no account context and returns
 * HTTP 200 with zero results. That is a silent-empty-page failure, and it is why this default
 * is the full `/api/v1` base rather than the host.
 */
export const apolloBase = (): string =>
  base(process.env.APOLLO_BASE_URL, 'https://api.apollo.io/api/v1')

/** Resend's REST API — transactional mail and the inbound-reply fetch. */
export const resendBase = (): string =>
  base(process.env.RESEND_BASE_URL, 'https://api.resend.com')

/**
 * Stripe's REST host, for the two places this repo calls it with `fetch` rather than the SDK.
 *
 * ⚠️ THE SDK IS CONFIGURED SEPARATELY (`stripeSdkHostOptions` below) because the Stripe SDK
 * takes a host/port/protocol triple, not a URL.
 */
export const stripeBase = (): string =>
  base(process.env.STRIPE_BASE_URL, 'https://api.stripe.com')

/**
 * Google's API host, for the system probe only.
 *
 * 🛑 THIS DOES **NOT** REDIRECT GOOGLE CALENDAR. The runtime Google path goes through the
 * `googleapis` SDK (`lib/gcal.ts`), which takes its endpoints from its own client options, not
 * from a URL this module could supply. No Batch 1b check calls Google — check 2 only asserts
 * that the capability is LISTED at boot — so redirecting the SDK is deliberately out of scope
 * and is reported as an out-of-scope finding rather than half-done here.
 *
 * ⚠️ AND IT IS NOT THE OAUTH SCOPE STRINGS. `gcal.ts`'s `SCOPES` array contains
 * `https://www.googleapis.com/auth/...` values, which are IDENTIFIERS Google matches exactly,
 * not addresses to call. Rewriting them would break consent for every connected client. They
 * are pinned by `gcal-scopes.test.ts` and this module must never touch them.
 */
export const googleApiBase = (): string =>
  base(process.env.GOOGLE_API_BASE_URL, 'https://www.googleapis.com')

/**
 * Host options for the Stripe SDK constructor.
 *
 * Returns `{}` when `STRIPE_BASE_URL` is unset, so the SDK keeps its own `DEFAULT_HOST`
 * (`api.stripe.com`) and the constructed client is identical to today's.
 *
 * ⚠️ THE SDK DEFAULTS `port` TO 443 AND `protocol` TO 'https'. A fake on
 * `http://127.0.0.1:58510` therefore needs all three fields, or the SDK dials 443 over TLS
 * against a plaintext port and the failure looks like a network fault rather than a
 * misconfiguration.
 */
export function stripeSdkHostOptions(): { host?: string; port?: number; protocol?: 'http' | 'https' } {
  const raw = process.env.STRIPE_BASE_URL
  if (typeof raw !== 'string' || raw.trim() === '') return {}
  try {
    const u = new URL(raw.trim())
    const protocol = u.protocol === 'http:' ? 'http' : 'https'
    return {
      host: u.hostname,
      port: u.port ? Number(u.port) : (protocol === 'http' ? 80 : 443),
      protocol,
    }
  } catch {
    // A malformed value must not silently become production. It also must not throw at module
    // load and take the API down, so it is ignored loudly and the SDK keeps its default.
    console.error(`[provider-hosts] STRIPE_BASE_URL is not a valid URL (${raw}) — the Stripe SDK will use its production default.`)
    return {}
  }
}

/**
 * Every variable this module reads, for the startup check and the env register.
 *
 * ⚠️ `ANTHROPIC_BASE_URL` IS IN THIS LIST BUT NOT READ HERE. The Anthropic SDK reads it
 * itself — verified in the installed SDK: `constructor({ baseURL = Core.readEnv('ANTHROPIC_BASE_URL'), … })`
 * — so the model harness needs **no code change at all** across the 34 `new Anthropic(...)`
 * sites in this repo. It is listed so the register documents it and the boot check can report
 * it, because an unlisted variable that silently repoints a provider is the drift this repo
 * keeps paying for.
 */
export const PROVIDER_BASE_URL_VARS = [
  'APOLLO_BASE_URL',
  'RESEND_BASE_URL',
  'STRIPE_BASE_URL',
  'GOOGLE_API_BASE_URL',
  'ANTHROPIC_BASE_URL',
] as const

/**
 * Is any provider currently redirected away from production?
 *
 * 🛑 USED BY THE BOOT CHECK TO SHOUT. A deployed service that is quietly talking to a fake is
 * the worst possible state: it looks healthy, it spends nothing, and it delivers nothing. So
 * the startup check prints an unmissable line whenever any of these is set, and the
 * full-stack harness EXPECTS to see that line — the same fact serves as reassurance in
 * production and as confirmation in the harness.
 */
export function redirectedProviders(): string[] {
  // Literal reads, for the same reason `base()` takes a value rather than a name.
  const set = (name: string, raw: string | undefined) =>
    (typeof raw === 'string' && raw.trim() !== '' ? name : null)
  return [
    set('APOLLO_BASE_URL', process.env.APOLLO_BASE_URL),
    set('RESEND_BASE_URL', process.env.RESEND_BASE_URL),
    set('STRIPE_BASE_URL', process.env.STRIPE_BASE_URL),
    set('GOOGLE_API_BASE_URL', process.env.GOOGLE_API_BASE_URL),
    set('ANTHROPIC_BASE_URL', process.env.ANTHROPIC_BASE_URL),
  ].filter((v): v is string => v !== null)
}
