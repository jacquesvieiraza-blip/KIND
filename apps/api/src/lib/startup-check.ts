/**
 * Startup environment variable check — the RUNTIME HALF of `docs/ENVIRONMENT.md` (#561).
 * Called before the server starts listening.
 *
 * The doc and this file are two views of one fact. The doc is what you read while deciding
 * what to set; this is what the running process says about what it actually found. A test
 * (`env-doc-drift.test.ts`) fails when either drifts from the source.
 *
 * ── THE FIVE TIERS, AND WHY THE LAST TWO WERE ADDED (#561, 30 Jul) ──────────────────────
 *
 * CRITICAL  → app refuses to start
 * IMPORTANT → app starts, logs a warning (a feature is silently degraded)
 * OPTIONAL  → logged as info only; a legitimate "off" state
 * PLATFORM  → Railway/Node set it. NOT reported as missing, because nagging about PORT
 *             every boot is how a startup block trains you to skip reading it.
 * PARKED    → deliberately UNSET, and **presence is the fault, not absence.** This tier
 *             exists because the check could previously only complain about absence, and
 *             the most dangerous variable in this repo is dangerous when SET:
 *             `HOUSE_CLIENT_ID` un-parks the Instantly push #593 deliberately parked on
 *             30 Jul. A check that can only see missing values cannot see that at all.
 *
 * ⚠️ WHAT THIS FILE CANNOT COVER, stated rather than papered over: it runs in the **API
 * process**, so it can only see the API's own variables. The 13 variables read only by the
 * portal or the admin app live in different Railway services — checking them here would
 * report every one of them missing on a perfectly healthy deploy. They are documented in
 * `ENVIRONMENT.md` and verified by reading it, not by this.
 */

// `parseSenderPool` is pure (it imports only the deliverability constants), so importing
// it here adds no database, no network and no environment dependency to boot.
import { parseSenderPool } from './sender-pool'
import { redirectedProviders } from './provider-hosts'

interface VarSpec {
  key: string
  level: 'critical' | 'important' | 'optional' | 'platform' | 'parked'
  description: string
}

const REQUIRED_VARS: VarSpec[] = [
  // Core infrastructure
  { key: 'SUPABASE_URL',              level: 'critical',  description: 'Supabase project URL' },
  { key: 'SUPABASE_SERVICE_ROLE_KEY', level: 'critical',  description: 'Supabase service role key' },
  { key: 'ANTHROPIC_API_KEY',         level: 'critical',  description: 'Claude AI — FIGSY sequences, reply classification' },

  // Payments — Stripe is the only processor (#352 removed the last dead Paystack path).
  // NOTE: these fail SILENTLY at runtime (graceful no-op / disabled Buy button) — so they MUST be loud here.
  { key: 'STRIPE_SECRET_KEY',         level: 'important', description: 'Stripe — unset = no checkout, customers cannot pay' },
  { key: 'STRIPE_WEBHOOK_SECRET',     level: 'important', description: 'Stripe webhook — unset = customer charged but NEVER credited' },
  { key: 'STRIPE_PRICE_LEADGEN_20',   level: 'important', description: 'Stripe price ID — Lead Gen 20 bundle (checkout fails without it)' },
  { key: 'STRIPE_PRICE_LEADGEN_40',   level: 'important', description: 'Stripe price ID — Lead Gen 40 bundle' },
  { key: 'STRIPE_PRICE_LEADGEN_100',  level: 'important', description: 'Stripe price ID — Lead Gen 100 bundle' },
  { key: 'STRIPE_PRICE_FIGSY_20',     level: 'important', description: 'Stripe price ID — FIGSY 20 bundle' },
  { key: 'STRIPE_PRICE_FIGSY_40',     level: 'important', description: 'Stripe price ID — FIGSY 40 bundle' },
  { key: 'STRIPE_PRICE_FIGSY_100',    level: 'important', description: 'Stripe price ID — FIGSY 100 bundle' },

  // Email — Resend is THE send transport (sequences, FIGSY cold, digests, alerts)
  { key: 'RESEND_API_KEY',            level: 'critical',  description: 'Resend — all outbound email; unset = FIGSY records "sent" but sends NOTHING' },
  { key: 'RESEND_WEBHOOK_SECRET',     level: 'important', description: 'Resend inbound webhook — unset = client replies rejected (no reply capture)' },
  // HC-4 (20 Aug) — raised important → critical, and it is what turns S5 from a sentence into
  // something enforced.
  //
  // S5 (founder-locked 26 Jul): **"Never cold-email from the primary domain."** Its enforcement
  // column in PRODUCT-RULES read `—` for 25 days, and `deliverability.ts:19` is
  // `process.env.FIGSY_COLD_FROM || 'K.I.N.D <hello@get-kind.com>'` — so unset, every cold send
  // silently falls back to the transactional domain and the only symptom is a `console.warn`
  // nobody reads. At `important` that fallback is reachable in production by forgetting one
  // variable; at `critical` the API refuses to boot and says why.
  //
  // ⚠️ THE CONSENT EMAIL IS WHY THIS MOVED NOW. It goes to a cold prospect and sent from
  // `FROM` — the transactional identity — so a spam complaint from a stranger who never asked
  // to hear from us landed on the reputation of our invoices and password resets.
  //
  // Verified set in Railway before this was raised (founder screenshot, 20 Aug):
  // `K.I.N.D <figsy@gettingkind.com>` — a separate domain from the primary, so promoting it
  // locks nobody out. Raising a var to critical without checking its live value first is how
  // a deploy dies at boot.
  { key: 'FIGSY_COLD_FROM',           level: 'critical',  description: 'S5 — the cold/consent From. Unset, every cold send falls back to hello@get-kind.com and poisons the domain every invoice and password reset leaves from' },

  // ── LEAD ENGINE — ⛓️ 17 Sep (FD-6): ONE PROVIDER, AND IT IS APOLLO ────────────────
  //
  // WAS: "we run PDL + Hunter. Apollo is optional/BYO, NOT used day-to-day." Every clause of
  // that is now false, and the grades were the exact inverse of the truth: the two keys
  // meant to be UNSET were `important`, and the one key without which nothing can be
  // sourced at all was `optional`.
  { key: 'PDL_API_KEY',               level: 'optional',  description: 'RETIRED (FD-6, 17 Sep): "PDL IS NOT A PAID/ACTIVE PROVIDER FOR MVP1. We are not paying for PDL." UNSET IS THE CORRECT STATE — the enrichment waterfall refuses PDL in code, so a key would not re-enable it' },
  // The ONE programme the approved five-step House launch sequence may be seeded into. Unset is
  // the safe default (nothing seeds anywhere) — and it is `important` rather than `optional`
  // precisely because unset is ALSO the state in which the House launch cannot prepare, and a
  // silent "no sequence" is how a launch day gets spent hunting for a missing uuid.
  { key: 'HOUSE_LAUNCH_PROGRAMME_ID', level: 'important', description: 'The uuid of the one programme the approved House launch sequence may seed. Unset = nothing seeds anywhere (safe), and the House launch programme cannot be prepared' },
  { key: 'HUNTER_API_KEY',            level: 'optional',  description: 'LOCKED OFF (FD-5, 17 Sep): "Hunter remains LOCKED OFF. Do not silently re-enable Hunter." UNSET IS THE CORRECT STATE and the waterfall refuses it in code regardless' },
  // ⚠️ `important`, NOT `critical`. `critical` REFUSES TO BOOT (see runStartupCheck), and a
  // box that will not start cannot serve the health check, the migration runner or Vida — so
  // an Apollo outage would become a total outage. It is in LAUNCH_CRITICAL_CAPABILITIES
  // instead, which is loud and does not take the service down.
  { key: 'APOLLO_API_KEY',            level: 'important', description: 'Apollo — THE ONLY lead source (FD-6). Unset = nothing can be sourced, for Proof or for any programme. People Search is free; the email reveal spends a credit' },
  // 🛑 IT WAS IN NEITHER LIST UNTIL 17 Sep, and that absence had a cost: with it unset every
  // programme stops at Prepare with "No pooled sending mailbox is available", and boot said
  // nothing at all. It is the inventory the automatic sender claim draws from.
  { key: 'POOLED_SENDERS_JSON',       level: 'important', description: 'The pooled sending mailboxes, as a JSON array. Unset = automatic preparation cannot assign a sender, so every programme stops at Prepare. Unparseable = the same outcome, silently' },

  // ── ⚑ 18 Sep (Batch 1b) — PROVIDER BASE URLS (§8.2 full-stack harness) ──────────────
  // ⚠️ UNSET IS PRODUCTION FOR EVERY ONE OF THESE. They exist so the full-stack run can point
  // the real API at recording fakes — without which Batch 1's contract-required zero-call
  // proof (PDL and Hunter receive NO calls with their keys SET) cannot be obtained at all.
  // Registered as `optional` because unset is the correct and normal state; a SET one is
  // shouted about separately at the end of this check, since a production process talking to
  // a fake looks perfectly healthy while delivering nothing.
  // ⚠️ LITERAL ROWS, NOT A `.map()` OVER `PROVIDER_BASE_URL_VARS`. `env-doc-drift.test.ts`
  // scans this file's TEXT for `key: '...'`, so a spread would leave all five with "no tier"
  // while looking perfectly correct here. `provider-hosts.test.ts` asserts the two lists agree,
  // so there is still exactly one truth — it is just enforced by a test rather than by a loop.
  { key: 'APOLLO_BASE_URL',           level: 'optional',  description: 'Apollo base URL override for the §8.2 full-stack harness. UNSET = the real Apollo (https://api.apollo.io/api/v1). Set = this process talks to a fake, and boot says so loudly' },
  { key: 'RESEND_BASE_URL',           level: 'optional',  description: 'Resend base URL override for the §8.2 full-stack harness. UNSET = the real Resend. Set = a fake, announced at boot' },
  { key: 'STRIPE_BASE_URL',           level: 'optional',  description: 'Stripe base URL override for the §8.2 full-stack harness — also reconfigures the Stripe SDK host/port/protocol. UNSET = the real Stripe. Set = a fake, announced at boot' },
  { key: 'GOOGLE_API_BASE_URL',       level: 'optional',  description: 'Google API host override, used by the SYSTEM PROBE only — the googleapis SDK path is not redirected. UNSET = the real Google' },
  { key: 'ANTHROPIC_BASE_URL',        level: 'optional',  description: 'Read by the Anthropic SDK itself, so no code change is needed. UNSET = the real Anthropic API. Set = the full-stack model harness, announced at boot' },

  // App URLs
  { key: 'PORTAL_URL',                level: 'important', description: 'Portal URL — used in email links and CORS' },
  { key: 'ADMIN_URL',                 level: 'optional',  description: 'Vida console URL — only used to build the "counter-sign this partner" link in an alert email (R42). Unset falls back to the production console, so the email still works; set it on staging so the link does not point at production.' },

  // WhatsApp (optional until approved)
  { key: 'WHATSAPP_TOKEN',            level: 'optional',  description: 'WhatsApp Cloud API — Vida chatbot (apply at developers.facebook.com)' },
  { key: 'WHATSAPP_PHONE_NUMBER_ID',  level: 'optional',  description: 'WhatsApp Phone Number ID' },
  { key: 'WHATSAPP_VERIFY_TOKEN',     level: 'optional',  description: 'WhatsApp webhook verify token' },

  // Internal
  { key: 'ADMIN_SECRET_KEY',          level: 'important', description: 'Admin API auth secret' },
  // ── ADDED 30 JUL (#561) — the 61 API variables this check could not see ────────────────
  // The 26-Jul sweep counted 69 and this file listed 22 of them, so the runtime half was
  // reporting on a quarter of the environment and staying silent about the rest. The real
  // number is 96 across the three apps (83 read by the API); every one the API reads is now
  // here. Full table, with what breaks and where each is set: docs/ENVIRONMENT.md.

  // Core — SUPABASE_ANON_KEY is CRITICAL and was not listed at all. `middleware/auth.ts`
  // does `createClient(url!, process.env.SUPABASE_ANON_KEY!)` at module scope, and
  // supabase-js THROWS on an undefined key — so the API does not boot without it. It was
  // effectively critical already; the check just never said so.
  { key: 'SUPABASE_ANON_KEY',         level: 'critical',  description: 'Supabase anon key — middleware/auth.ts builds a client at import; unset = the API does not boot at all' },
  { key: 'DATABASE_URL',              level: 'important', description: 'Direct Postgres — Run migrations, RLS audit and backup manifest all need it (currently mangled, #558)' },

  // Sending — the four that decide whether a sent email is usable.
  { key: 'INBOX_SECRET_KEY',          level: 'important', description: 'Mailbox password key (64 hex) — unset = saved SMTP passwords cannot be read, so NOTHING sends and the add-mailbox form refuses' },
  { key: 'FIGSY_COLD_REPLY_TO',       level: 'important', description: 'Reply-To on cold mail — unset = replies land nowhere we read' },
  { key: 'FIGSY_REPLY_TO',            level: 'important', description: 'Reply-To on sequence mail' },
  { key: 'FIGSY_UNSUB_MAILTO',        level: 'important', description: 'List-Unsubscribe mailto — unset = the one-click header is absent and Gmail penalises the domain' },
  // HC-2 (19 Aug) — raised important → critical on the founder's ruling. Unset, the ladder in
  // deliverability.ts hands the ADMIN key to the unsubscribe signer: one secret doing two jobs,
  // so rotating the admin key invalidates every unsubscribe link ever sent. The signer now
  // refuses in production, which stops sends — so a silent warning at boot was the wrong tier.
  { key: 'UNSUBSCRIBE_SECRET',        level: 'critical',  description: 'Signs every unsubscribe link — REQUIRED in production; unset means the admin key silently becomes the signing key' },
  { key: 'TRACKING_URL',              level: 'important', description: 'Base URL for the tracking pixel and click links — unset falls back to API_URL, then to nothing (no opens, no clicks)' },
  { key: 'FOUNDER_EMAIL',             level: 'important', description: 'Where every alert goes — unset falls back to hello@get-kind.com' },
  { key: 'API_URL',                   level: 'important', description: 'Public API base — tracking/unsubscribe links and the MCP manifest' },
  { key: 'API_INTERNAL_URL',          level: 'optional',  description: 'Loopback base for cron self-calls; falls back to localhost:PORT' },
  { key: 'TEST_INBOX_EMAIL',          level: 'optional',  description: 'Destination for the #553 ladder test send' },

  // Feature switches. Unset is a VALID configured state for every one of these, and for the
  // first it is the SAFE one — so they are optional and their default is stated.
  { key: 'AUTO_OUTREACH_ENABLED',     level: 'optional',  description: 'The kill-switch. Unset/false = nothing sends automatically — the correct state until the #553 ladder passes' },
  { key: 'FIGSY_OPERATOR_SEND_ENABLED', level: 'optional', description: 'Arms the Vida Run-once control ONLY. Unset/false = the operator route refuses. It authorises nothing on its own — a founder must still press the button, for one named client, with an explicit max_sends' },
  { key: 'SAFE_TEST_MODE',          level: 'optional',  description: 'The zero-spend guard (R66). Set = every paid provider call throws instead of spending; launch testing uses mocks/fixtures/pool only. Unset = normal production behaviour.' },
  { key: 'PAID_PROVIDERS_ENABLED', level: 'important', description: 'The deliberate path to provider spend (R66). Paid providers are OFF by default; live sourcing does not run until this is set to true. A test runner ignores it and is always safe.' },
  { key: 'VITEST',                 level: 'optional',  description: 'Set by vitest inside its own process — never configured by hand. The zero-spend guard reads it so a test run can never reach a paid provider (R66).' },
  { key: 'RUN_CRONS',                 level: 'optional',  description: 'Unset/false = this replica runs no scheduled jobs' },
  { key: 'IS_STAGING',                level: 'optional',  description: 'true = staging boot rules (only the Supabase vars stay critical)' },
  { key: 'NEXT_PUBLIC_IS_STAGING',    level: 'optional',  description: 'Same signal, read from the shared build env' },
  { key: 'LIFECYCLE_EMAILS_ENABLED',  level: 'optional',  description: 'Unset = lifecycle/nurture emails do not send' },
  { key: 'NEXUS_AUTOTUNE_KILL',       level: 'optional',  description: 'Kill-switch for per-client Nexus auto-tune' },
  { key: 'FEATURE_CAMPAIGN_INTENT',   level: 'optional',  description: 'Feature flag — campaign intent capture' },
  { key: 'FEATURE_ICP_BUILDER',       level: 'optional',  description: 'Feature flag — ICP builder' },
  { key: 'SUPPRESSED_DOMAINS',        level: 'optional',  description: 'EXTRA do-not-contact domains. The employer floor is hard-coded and cannot be switched off from here' },
  { key: 'EXTRA_ALLOWED_ORIGINS',     level: 'optional',  description: 'Additional CORS origins beyond the portal and *.railway.app' },
  { key: 'FIGSY_KIND_CLIENT_ID',      level: 'optional',  description: 'Legacy pointer at our own client row; superseded by the Vida house-client action (#600)' },

  // Volume fences. Each has a code default, so unset is normal.
  { key: 'FIGSY_DAILY_SEND_LIMIT',    level: 'optional',  description: 'House-wide daily send ceiling' },
  { key: 'FIGSY_PER_CLIENT_DAILY_CAP', level: 'optional', description: 'Per-client daily send ceiling' },
  { key: 'FIGSY_COLD_DAILY_CAP',      level: 'optional',  description: 'Daily ceiling for our own cold outreach' },
  { key: 'FIGSY_WARMUP_START',        level: 'optional',  description: 'Warm-up ramp start date' },
  { key: 'INTENT_ENROLL_CAP_PER_CAMPAIGN', level: 'optional', description: 'Cap on intent-triggered enrolments per campaign' },

  // Subscription price IDs — the three monthly products. Resolved through
  // STRIPE_SUBSCRIPTIONS[…].priceEnvVar, which is why a plain grep never finds them.
  { key: 'STRIPE_PRICE_MILLA_MONTHLY',  level: 'optional', description: 'Stripe price ID — Milla VA $49/mo' },
  { key: 'STRIPE_PRICE_VIDA_MONTHLY',   level: 'optional', description: 'Stripe price ID — Vida chatbot $29/mo' },
  { key: 'STRIPE_PRICE_DENISE_MONTHLY', level: 'optional', description: 'Stripe price ID — Denise AE $39/mo' },

  // Integrations that are simply off. Unset = the feature no-ops, by design.
  { key: 'SMARTLEAD_API_KEY',         level: 'optional',  description: 'Smartlead — CLIENT sending. Deferred until a client exists; key currently 401s' },
  { key: 'SMARTLEAD_BASE_URL',        level: 'optional',  description: 'Smartlead API base; defaults in code' },
  { key: 'SMARTLEAD_WEBHOOK_SECRET',  level: 'optional',  description: 'Verifies Smartlead inbound. Unset until a client sends through Smartlead — but it MUST be set before the first campaign, or inbound replies arrive unverified' },
  { key: 'CLEARBIT_API_KEY',          level: 'optional',  description: 'Clearbit enrichment — not in the day-to-day stack' },
  { key: 'HUBSPOT_API_KEY',           level: 'optional',  description: 'HubSpot CRM push' },
  { key: 'PHANTOMBUSTER_API_KEY',     level: 'optional',  description: 'PhantomBuster — LinkedIn automation' },
  { key: 'PHANTOMBUSTER_LINKEDIN_AGENT_ID', level: 'optional', description: 'PhantomBuster agent id' },
  { key: 'GOOGLE_CLIENT_ID',          level: 'optional',  description: 'Google OAuth — calendar booking' },
  { key: 'GOOGLE_CLIENT_SECRET',      level: 'optional',  description: 'Google OAuth secret' },
  { key: 'GOOGLE_REDIRECT_URI',       level: 'optional',  description: 'Google OAuth redirect' },
  { key: 'VAPI_API_KEY',              level: 'optional',  description: 'Vapi voice agent' },
  { key: 'VAPI_ASSISTANT_ID',         level: 'optional',  description: 'Vapi assistant id' },
  { key: 'VAPI_PHONE_NUMBER_ID',      level: 'optional',  description: 'Vapi phone number id' },
  { key: 'VAPI_WEBHOOK_SECRET',       level: 'optional',  description: 'Vapi webhook signature' },
  { key: 'VAPID_PUBLIC_KEY',          level: 'optional',  description: 'Web-push public key' },
  { key: 'VAPID_PRIVATE_KEY',         level: 'optional',  description: 'Web-push private key' },
  { key: 'VAPID_SUBJECT',             level: 'optional',  description: 'Web-push contact (mailto:)' },
  { key: 'SLACK_WEBHOOK_URL',         level: 'optional',  description: 'Slack alert mirror' },
  { key: 'NEXT_PUBLIC_API_URL',       level: 'optional',  description: 'API base as the browser sees it; the API reads it only as a fallback' },
  { key: 'NEXT_PUBLIC_APP_URL',       level: 'optional',  description: 'Portal base as the browser sees it' },
  { key: 'NEXT_PUBLIC_SUPABASE_URL',  level: 'optional',  description: 'Supabase URL as the browser sees it' },

  // PLATFORM — Railway and Node set these. Listed so the doc is complete; never reported as
  // missing, because a startup block that nags about PORT is a block nobody reads.
  { key: 'PORT',                      level: 'platform',  description: 'Set by Railway; defaults to 4000 locally' },
  { key: 'NODE_ENV',                  level: 'platform',  description: 'Set by the runtime' },
  { key: 'RAILWAY_GIT_COMMIT_SHA',    level: 'platform',  description: 'Deploy identity, used in health/diagnostics' },
  // ⛓️ XC-4 — the fallback that finally makes `/health.commit` answerable. Railway injects
  // RAILWAY_GIT_COMMIT_SHA only for git-source builds, and `ship.sh` uses `railway up`, so
  // the API answered `commit:"unknown"` on every deploy it has ever made. `/health` now
  // resolves platform SHA → this override → `apps/api/.deploy-stamp`. UNSET IS NORMAL:
  // this exists for a non-Railway pipeline that knows its own commit. Platform level, not
  // critical — refusing to boot over a diagnostic would be a self-inflicted outage.
  { key: 'KIND_DEPLOY_COMMIT',        level: 'platform',  description: 'Explicit deploy identity when the platform injects none; used in health/diagnostics' },
  { key: 'RAILWAY_REPLICA_ID',        level: 'platform',  description: 'Replica identity, used by the cron single-run guard (#343)' },

  // PARKED — deliberately unset. For these, PRESENCE is the fault.
  { key: 'HOUSE_CLIENT_ID',           level: 'parked',    description: 'Gates the Instantly step-9 push, PARKED on 30 Jul (#593). Setting it UN-PARKS a path we decided not to run — our own engine sends without it' },
  { key: 'INSTANTLY_API_KEY',         level: 'parked',    description: 'Instantly is a WARMUP UTILITY only since the #577 amendment — the API is not called. A key here is idle, not wrong' },
  { key: 'PAYSTACK_SECRET_KEY',       level: 'parked',    description: 'Paystack was removed in #352. Nothing reads it but the env probe — delete it' },
  { key: 'FLUTTERWAVE_SECRET_KEY',    level: 'parked',    description: 'Flutterwave was never wired. Nothing reads it but the env probe — delete it' },
  { key: 'FLUTTERWAVE_WEBHOOK_HASH',  level: 'parked',    description: 'Flutterwave webhook hash — same; delete it' },
]

// In a staging/preview deployment we want the API to boot with ONLY the staging
// database creds — no production secrets (Anthropic, Resend, Stripe, …) should
// ever live in the isolated staging environment. When IS_STAGING=true, only the
// Supabase vars stay critical; everything else degrades to a warning so AI/email/
// payment features no-op gracefully instead of aborting startup.
const STAGING = process.env.IS_STAGING === 'true' || process.env.NEXT_PUBLIC_IS_STAGING === 'true'
const STAGING_CRITICAL = new Set(['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'])


// ═══════════════════════════════════════════════════════════════════════════════
// XC-8 / J14-C1 · THE GO-LIVE CAPABILITIES — one line per STAGE OF THE JOURNEY
//
// ── WHY THIS IS A TABLE NOW, AND EXPORTED ─────────────────────────────────────
//
// The three capabilities used to be an inline array inside `runStartupCheck`, which meant
// the only way to check them was to boot a process — so nothing checked them, and every one
// of them was wrong about MVP1:
//
//   · 🎯 LEAD ENGINE required `PDL_API_KEY` and `HUNTER_API_KEY` and never mentioned Apollo.
//     Under FD-6 that is exactly inverted: those two keys are meant to be UNSET, so a
//     correctly configured box printed ❌ for a deliberate absence — and the one key without
//     which nothing can be sourced was graded `optional`.
//   · `POOLED_SENDERS_JSON` appeared in NEITHER the register nor the capabilities, while
//     being the inventory automatic preparation claims a sender from. Unset, every programme
//     stops at Prepare and boot said nothing.
//   · The stages MVP1 actually walks — book a meeting, honour an unsubscribe, capture a
//     reply — had no line at all.
//
// ── TWO RULES A CAPABILITY MUST OBEY ──────────────────────────────────────────
//
// ① **IT NAMES A STAGE, NOT A VENDOR.** "This stage of the client journey can happen" is
//    something an operator can act on. A list of keys is not.
// ② **PRESENT IS NOT ALWAYS SATISFIED.** `POOLED_SENDERS_JSON` is JSON: unparseable, it
//    yields zero senders and every programme stops at Prepare with the same silence as an
//    unset variable — under a green tick. So a capability may carry a `check`, and the
//    check's verdict beats the variable's presence.
// ═══════════════════════════════════════════════════════════════════════════════

export interface Capability {
  /** What an operator reads. A stage of the journey, in the founder's words. */
  label: string
  /** Every variable the stage genuinely needs. */
  vars: string[]
  /**
   * An extra verdict for values whose PRESENCE proves nothing.
   *
   * ⚠️ IT MUST NEVER RETURN A CREDENTIAL. This string is printed at boot, into logs that get
   * pasted into chat. `parseSenderPool`'s `problems` are written to that contract already.
   */
  check?: (env: Record<string, string | undefined>) => { ok: boolean; detail?: string }
}

/** Capabilities without which MVP1 cannot be walked at all. Loud, never boot-refusing. */
export const LAUNCH_CRITICAL_CAPABILITIES: string[] = [
  '🎯 LEAD ENGINE (Apollo — the only source)',
  '✉️  CLIENT SENDING (FIGSY emails)',
  '📬 PREPARATION (a sender to send from)',
]

export const CAPABILITIES: Capability[] = [
  {
    label: '💳 PAYMENTS   (customers can pay)',
    vars: ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'STRIPE_PRICE_LEADGEN_20', 'STRIPE_PRICE_LEADGEN_40', 'STRIPE_PRICE_LEADGEN_100', 'STRIPE_PRICE_FIGSY_20', 'STRIPE_PRICE_FIGSY_40', 'STRIPE_PRICE_FIGSY_100'],
  },
  {
    // ⛓️ WAS: `['PDL_API_KEY', 'HUNTER_API_KEY', 'ANTHROPIC_API_KEY']` under the label
    // "🎯 LEAD ENGINE (deliver leads)". FD-6: one provider, and it is Apollo. Anthropic stays
    // — nothing is delivered unscored, and scoring is Claude.
    label: '🎯 LEAD ENGINE (Apollo — the only source)',
    vars: ['APOLLO_API_KEY', 'ANTHROPIC_API_KEY'],
  },
  {
    // 🛑 THE CAPABILITY THAT DID NOT EXIST. Automatic preparation claims a pooled mailbox; with
    // no inventory it refuses, every programme stops at READY_FOR_APPROVAL minus a sender, and
    // the only symptom is a line in a run log.
    label: '📬 PREPARATION (a sender to send from)',
    vars: ['POOLED_SENDERS_JSON', 'INBOX_SECRET_KEY'],
    check: (env) => {
      const pool = parseSenderPool(env.POOLED_SENDERS_JSON)
      if (pool.senders.length > 0) return { ok: true }
      const why = pool.problems.length > 0
        ? pool.problems.join(' · ')
        : 'POOLED_SENDERS_JSON holds no usable mailbox, so automatic preparation cannot assign a sender.'
      return { ok: false, detail: why }
    },
  },
  {
    // INBOX_SECRET_KEY added 30 Jul (#561/#600). Without it the API cannot decrypt a single
    // stored mailbox password, so every per-client send is refused — and this block read
    // ✅ SENDING while nothing could actually leave. A false green on the one line whose
    // whole job is to prevent false greens.
    label: '✉️  CLIENT SENDING (FIGSY emails)',
    vars: ['RESEND_API_KEY', 'ANTHROPIC_API_KEY', 'ADMIN_SECRET_KEY', 'FIGSY_COLD_FROM', 'INBOX_SECRET_KEY', 'UNSUBSCRIBE_SECRET', 'TRACKING_URL'],
  },
  {
    // ⛓️ 17 Sep — grouped under the STAGE that needs it. `RESEND_WEBHOOK_SECRET` was a loose
    // `important` variable, so "can we capture a reply at all?" had no line anybody read.
    label: '💬 REPLIES (a prospect can answer)',
    vars: ['RESEND_WEBHOOK_SECRET'],
  },
  {
    // ⛓️ 17 Sep — the three Google keys were loose `optional` rows. Booking a meeting is the
    // MVP1 outcome boundary (MEETING_BOOKED), so "can a meeting be booked?" is not optional
    // as a QUESTION even while the keys remain optional as VARIABLES.
    label: '📅 MEETINGS (a prospect can book)',
    vars: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REDIRECT_URI'],
  },
]

/**
 * Is this capability satisfied by this environment?
 *
 * Pure and exported so every line above is provable without booting a process — which is
 * why all three previous capabilities could be wrong at once and nothing noticed.
 */
export function capabilityState(
  cap: Capability,
  env: Record<string, string | undefined>,
): { label: string; ok: boolean; miss: string[]; detail: string } {
  const isSet = (k: string) => !!env[k] && env[k]!.trim() !== ''
  const miss = cap.vars.filter(k => !isSet(k))
  if (miss.length > 0) {
    return { label: cap.label, ok: false, miss, detail: `MISSING: ${miss.join(', ')}` }
  }
  if (cap.check) {
    const verdict = cap.check(env)
    if (!verdict.ok) {
      // Every variable is present and the capability is still off. That distinction is the
      // whole reason `check` exists, so the sentence says so rather than listing nothing.
      return { label: cap.label, ok: false, miss: [], detail: verdict.detail ?? 'set, but not usable' }
    }
  }
  return { label: cap.label, ok: true, miss: [], detail: 'ready' }
}

export function runStartupCheck(): void {
  const missing: VarSpec[]  = []
  const warnings: VarSpec[] = []
  const optional: VarSpec[] = []
  // PARKED vars are reported when SET, not when missing — see the header. This list is the
  // one thing here that reads a PRESENT value as the problem.
  const unparked: VarSpec[] = []

  for (const spec of REQUIRED_VARS) {
    const val = process.env[spec.key]
    const isSet = !!val && val.trim() !== ''

    if (spec.level === 'parked') {
      if (isSet) unparked.push(spec)
      continue
    }
    // Railway/Node own these. Absence is not news and reporting it is noise.
    if (spec.level === 'platform') continue

    if (!isSet) {
      // Staging: keep only the DB vars hard-critical; downgrade the rest to warnings.
      const level = STAGING && spec.level === 'critical' && !STAGING_CRITICAL.has(spec.key)
        ? 'important'
        : spec.level
      if (level === 'critical')  missing.push(spec)
      if (level === 'important') warnings.push(spec)
      if (level === 'optional')  optional.push(spec)
    }
  }

  const lines: string[] = ['', '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━']
  lines.push('  K.I.N.D API — STARTUP CHECK' + (STAGING ? '  ·  🧪 STAGING MODE (secrets optional)' : ''))
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  // Platform and parked vars are not "required", so counting them would inflate both halves
  // of this fraction and make a healthy deploy look incomplete.
  const configurable = REQUIRED_VARS.filter(v => v.level !== 'platform' && v.level !== 'parked')
  const needed   = configurable.filter(v => v.level !== 'optional').length
  const setCount = needed - missing.length - warnings.length
  lines.push(`  ✅ ${setCount}/${needed} required vars set  ·  ${configurable.length} configurable, ${REQUIRED_VARS.length} known (see docs/ENVIRONMENT.md)`)

  if (missing.length > 0) {
    lines.push(`\n  ❌ CRITICAL — app cannot start:`)
    for (const v of missing) {
      lines.push(`     ${v.key.padEnd(30)} → ${v.description}`)
    }
  }

  if (warnings.length > 0) {
    lines.push(`\n  ⚠️  IMPORTANT — feature degraded:`)
    for (const v of warnings) {
      lines.push(`     ${v.key.padEnd(30)} → ${v.description}`)
    }
  }

  if (optional.length > 0) {
    lines.push(`\n  ℹ️  OPTIONAL — not yet configured:`)
    for (const v of optional) {
      lines.push(`     ${v.key.padEnd(30)} → ${v.description}`)
    }
  }

  // A parked variable that IS set is the one thing here that a missing-value check could
  // never have caught — and HOUSE_CLIENT_ID being set silently un-parks the Instantly push.
  if (unparked.length > 0) {
    lines.push(`\n  🅿️  PARKED BUT SET — these are meant to be UNSET:`)
    for (const v of unparked) {
      lines.push(`     ${v.key.padEnd(30)} → ${v.description}`)
    }
  }

  // ── ⚑ 18 Sep (Batch 1b) — IS THIS PROCESS TALKING TO A FAKE? SAY SO, LOUDLY ──────────
  //
  // 🛑 THE WORST STATE A DEPLOYED SERVICE CAN BE IN is quietly pointed at a fake provider: it
  // looks healthy, it spends nothing, and it delivers nothing to anybody. Base-URL injection
  // exists for the §8.2 full-stack run, and the price of having it is that boot must announce
  // it every time. The same line reassures in production (it never prints) and confirms in the
  // harness (it must print, and the run asserts that it does).
  const redirected = redirectedProviders()
  if (redirected.length > 0) {
    lines.push('')
    lines.push(`  🧪🧪  ${redirected.length} PROVIDER BASE URL(S) REDIRECTED AWAY FROM PRODUCTION: ${redirected.join(', ')}`)
    lines.push('        This process is NOT talking to the real providers. Correct for the full-stack')
    lines.push('        harness; in production it means nothing you send or source is real.')
  }

  // ── 🚦 GO-LIVE READINESS — capability-level, impossible to miss ──────────────
  // Each go-live capability fails SILENTLY at runtime if its config is missing, so
  // we surface ON/OFF here loudly. (Skipped in staging — secrets intentionally absent.)
  if (!STAGING) {
    const caps = CAPABILITIES.map(c => capabilityState(c, process.env))
    lines.push('  🚦 GO-LIVE READINESS')
    for (const c of caps) {
      lines.push(c.ok
        ? `     ✅ ${c.label}`
        : `     ❌ ${c.label}  — ${c.detail}`)
    }
    const offCount = caps.filter(c => !c.ok).length
    if (offCount > 0) {
      lines.push('')
      lines.push(`  🚨🚨  ${offCount} GO-LIVE CAPABILITY${offCount === 1 ? '' : 'IES'} OFF — these fail SILENTLY in prod. Set the vars above before claiming "ready". 🚨🚨`)
    }
  }

  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
  console.log(lines.join('\n'))

  if (missing.length > 0) {
    throw new Error(
      `Startup aborted — ${missing.length} critical env var(s) missing: ${missing.map(v => v.key).join(', ')}`
    )
  }
}
