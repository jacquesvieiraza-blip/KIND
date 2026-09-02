# ⚙️ K.I.N.D — THE ENVIRONMENT (#561)

> **Every environment variable the three deployed apps read, what breaks without it, and which Railway service holds it.**
> `Last-checked: 30 Jul 2026` — swept from source, not from memory.
> **This doc and `apps/api/src/lib/startup-check.ts` are two views of one fact.** The doc is what you read while deciding what to set; the startup check is what the running process says about what it actually found. `env-doc-drift.test.ts` fails the gate when either drifts from the source.

## The number

**105 distinct variables** across `apps/api`, `apps/portal` and `apps/admin` — **88** read by the API, **17** read only by the portal or the admin app.

**#561 recorded 69, and that figure was wrong twice over.** The first was method: a `process.env.X` grep cannot see the **12 variables this repo reaches by indirection** —

| How it is reached | Where | Example |
|---|---|---|
| `process.env[bundle.priceEnvVar]` | `lib/stripe.ts` | the six `STRIPE_PRICE_*` bundle IDs, built from `PRICING` |
| `has('NAME')` | `routes/engine.ts` | the `GET /engine/env` probe — the only reader of `PAYSTACK_SECRET_KEY` |
| `{ key: 'NAME' }` | `lib/startup-check.ts` | the only place three `STRIPE_PRICE_LEADGEN_*` names appear at all |

The second was subtler and worth recording, because it is the same defect this repo keeps finding in its own instruments. **My first scanner had a comment-stripping bug and undercounted by four.** A regex literal like `` /key:\s*['"]([A-Z]+)['"]/g `` contains quote characters; a stripper that tracks quotes but not regex literals treats the `'` inside it as opening a string, and from that point on every `//` looks like it is inside a string and survives. The scanner silently stops stripping part-way through a file. It was caught because the sweep returned a variable named `FOO` that exists only in a sentence in a comment — **a measuring instrument reporting something that was never there.** `stripCommentsForEnvScan` is regex-aware now, and the count went 96 → 100.

## How this doc stays true

`env-doc-drift.test.ts` walks the three source trees, strips comments, extracts every variable name, and **fails if any of them is missing from the tables below**. Add a `process.env` read and the gate goes red until it is documented. It also asserts the reverse for the API's own variables — that `startup-check.ts` has a tier for each — so the runtime half cannot fall behind the written half again.

## The five tiers

| Tier | Meaning |
|---|---|
| 🔴 **required** | the API refuses to start |
| 🟠 important | it starts, and something is **silently** degraded |
| ⚪ optional | unset is a legitimate "off" |
| ⚙️ platform | Railway or Node sets it; nothing to configure |
| 🅿️ **parked** | deliberately unset — **presence is the fault, not absence** |

## Notable right now (30 Jul)

- **`INBOX_SECRET_KEY` — set this before anything else.** Without it the API cannot decrypt a single stored mailbox password, so **every per-client send is refused** and the add-mailbox form (#600) refuses to save one. Generate with `openssl rand -hex 32`, put it in Railway → @kind/api, and **keep it** — rotating it means re-entering every mailbox password. **It was missing from the go-live readiness block**, which meant that block could print ✅ CLIENT SENDING while nothing could actually leave. That is a false green on the one line whose entire job is to prevent false greens; it is in the capability list now.
- **`HOUSE_CLIENT_ID` — leave it UNSET.** It gates the step-9 Instantly push, **parked** on 30 Jul when our own engine took over sending (#593). Unset is what keeps that path dormant. Vida shows you the house client id (#600) and that is exactly what makes this variable look like the last step of setup — it is not.
- **This is why the parked tier exists.** The startup check could previously only complain about a **missing** value. The most dangerous variable in this repo is dangerous when **set**, and a check that only sees absence cannot see that at all. Five variables are parked; the boot log now names any that are set.
- **`SMARTLEAD_WEBHOOK_SECRET` — unset until a client.** Smartlead is deferred until a client exists. But it must be set before the first Smartlead campaign, **not after**: inbound replies arriving unverified is a silent failure, and the first one you notice will be a reply that never reached the client.
- **`INSTANTLY_API_KEY` — idle, not wrong.** Since the #577 amendment Instantly is a **warmup utility only** and the API is never called. A key sitting there does nothing.
- **`SUPABASE_ANON_KEY` was effectively required and listed nowhere.** `middleware/auth.ts` calls `createClient(url!, process.env.SUPABASE_ANON_KEY!)` at module scope and supabase-js **throws** on an undefined key — so the API does not boot without it. It is 🔴 now.
- **`PAYSTACK_SECRET_KEY`, `FLUTTERWAVE_SECRET_KEY`, `FLUTTERWAVE_WEBHOOK_HASH` are dead.** Paystack was removed in #352 and Flutterwave was never wired. Nothing reads them but the `/engine/env` probe. Delete them from Railway.
- **`DATABASE_URL` is currently mangled** (#558) — a placeholder reference was pasted in. It breaks *Run migrations*, *RLS audit* and *Backup manifest*. Nothing client-facing.

### 🔴 Required — the API does not start without these

| Variable | Apps | Tier | What breaks when unset | Where it is set |
|---|---|---|---|---|
| `ANTHROPIC_API_KEY` | api | 🔴 **required** | Claude AI — FIGSY sequences, reply classification | Railway → **@kind/api** |
| `RESEND_API_KEY` | admin·api | 🔴 **required** | Resend — all outbound email; unset = FIGSY records "sent" but sends NOTHING | Railway → **@kind/admin** + Railway → **@kind/api** |
| `SUPABASE_ANON_KEY` | api | 🔴 **required** | Supabase anon key — middleware/auth.ts builds a client at import; unset = the API does not boot at all | Railway → **@kind/api** |
| `SUPABASE_SERVICE_ROLE_KEY` | admin·api | 🔴 **required** | Supabase service role key | Railway → **@kind/admin** + Railway → **@kind/api** |
| `SUPABASE_URL` | api | 🔴 **required** | Supabase project URL | Railway → **@kind/api** |
| `UNSUBSCRIBE_SECRET` | api | 🔴 **required** | Signs every unsubscribe link — REQUIRED in production; unset means the admin key silently becomes the signing key | Railway → **@kind/api** |

### 🟠 Important — the API starts, and something is silently degraded

Every row here fails **quietly**. Nothing throws; a feature just does not happen.

| Variable | Apps | Tier | What breaks when unset | Where it is set |
|---|---|---|---|---|
| `ADMIN_SECRET_KEY` | admin·api | 🟠 important | Admin API auth secret | Railway → **@kind/admin** + Railway → **@kind/api** |
| `API_URL` | api | 🟠 important | Public API base — tracking/unsubscribe links and the MCP manifest | Railway → **@kind/api** |
| `DATABASE_URL` | api | 🟠 important | Direct Postgres — Run migrations, RLS audit and backup manifest all need it (currently mangled, #558) | Railway → **@kind/api** |
| `FIGSY_COLD_FROM` | api | 🔴 **critical** | **S5 — the cold AND consent From. Unset, every cold send falls back to `hello@get-kind.com`, the domain every invoice and password reset leaves from.** ⛓️ Raised 🟠→🔴 on 20 Aug (HC-4): at `important` that fallback was reachable in production by forgetting one variable, with only a `console.warn` to show for it. Live value verified before the promotion — `K.I.N.D <figsy@gettingkind.com>` — so it locks nobody out. | Railway → **@kind/api** |
| `FIGSY_COLD_REPLY_TO` | api | 🟠 important | Reply-To on cold mail — unset = replies land nowhere we read | Railway → **@kind/api** |
| `FIGSY_REPLY_TO` | api | 🟠 important | Reply-To on sequence mail | Railway → **@kind/api** |
| `FIGSY_UNSUB_MAILTO` | api | 🟠 important | List-Unsubscribe mailto — unset = the one-click header is absent and Gmail penalises the domain | Railway → **@kind/api** |
| `FOUNDER_EMAIL` | api | 🟠 important | Where every alert goes — unset falls back to hello@get-kind.com | Railway → **@kind/api** |
| `HUNTER_API_KEY` | api | 🟠 important | Hunter.io — email reveal in the enrichment waterfall | Railway → **@kind/api** |
| `INBOX_SECRET_KEY` | api | 🟠 important | Mailbox password key (64 hex) — unset = saved SMTP passwords cannot be read, so NOTHING sends and the add-mailbox form refuses | Railway → **@kind/api** |
| `PDL_API_KEY` | api | 🟠 important | People Data Labs — PRIMARY lead sourcing; unset (with no Apollo) = zero leads | Railway → **@kind/api** |
| `PORTAL_URL` | api | 🟠 important | Portal URL — used in email links and CORS | Railway → **@kind/api** |
| `ADMIN_URL` | api | ⚪ optional | Vida console URL, used only for the "counter-sign this partner" link in the R42 alert email. Unset falls back to the production console — the email still works, it just always points at production, which is why staging should set it. | Railway → **@kind/api** |
| `RESEND_WEBHOOK_SECRET` | api | 🟠 important | Resend inbound webhook — unset = client replies rejected (no reply capture) | Railway → **@kind/api** |
| `STRIPE_PRICE_FIGSY_100` | api | 🟠 important | Stripe price ID — FIGSY 100 bundle | Railway → **@kind/api** |
| `STRIPE_PRICE_FIGSY_20` | api | 🟠 important | Stripe price ID — FIGSY 20 bundle | Railway → **@kind/api** |
| `STRIPE_PRICE_FIGSY_40` | api | 🟠 important | Stripe price ID — FIGSY 40 bundle | Railway → **@kind/api** |
| `STRIPE_PRICE_LEADGEN_100` | api | 🟠 important | Stripe price ID — Lead Gen 100 bundle | Railway → **@kind/api** |
| `STRIPE_PRICE_LEADGEN_20` | api | 🟠 important | Stripe price ID — Lead Gen 20 bundle (checkout fails without it) | Railway → **@kind/api** |
| `STRIPE_PRICE_LEADGEN_40` | api | 🟠 important | Stripe price ID — Lead Gen 40 bundle | Railway → **@kind/api** |
| `STRIPE_SECRET_KEY` | api | 🟠 important | Stripe — unset = no checkout, customers cannot pay | Railway → **@kind/api** |
| `STRIPE_WEBHOOK_SECRET` | api | 🟠 important | Stripe webhook — unset = customer charged but NEVER credited | Railway → **@kind/api** |
| `TRACKING_URL` | api | 🟠 important | Base URL for the tracking pixel and click links — unset falls back to API_URL, then to nothing (no opens, no clicks) | Railway → **@kind/api** |

### ⚪ Optional — unset is a legitimate "off"

| Variable | Apps | Tier | What breaks when unset | Where it is set |
|---|---|---|---|---|
| `API_INTERNAL_URL` | api | ⚪ optional | Loopback base for cron self-calls; falls back to localhost:PORT | Railway → **@kind/api** |
| `APOLLO_API_KEY` | api | ⚪ optional | Apollo — optional / BYO-key; not used in the day-to-day PDL+Hunter stack | Railway → **@kind/api** |
| `AUTO_OUTREACH_ENABLED` | api | ⚪ optional | The kill-switch. Unset/false = nothing sends automatically — the correct state until the #553 ladder passes | Railway → **@kind/api** |
| `FIGSY_OPERATOR_SEND_ENABLED` | api | ⚪ optional | Arms the Vida **Run one send now** control only. Unset/false = the operator route refuses. ⚠️ It authorises nothing by itself — a founder must still press the button for one named client with an explicit `max_sends`, and `AUTO_OUTREACH_ENABLED` stays off. Set it deliberately for a controlled run, then unset it | Railway → **@kind/api** |
| `SAFE_TEST_MODE` | api | ⚪ optional | 🛑 **THE ZERO-SPEND GUARD (R66).** Set to `1` and every paid provider call — PDL, Apollo, Hunter, Clearbit — **throws instead of spending**. Launch testing runs on mocks, fixtures or existing pooled contacts only; when safe data runs out the run FAILS LOUDLY rather than quietly buying more. ⚠️ **Fails closed:** any value other than an explicit off-value (`0`/`false`/`no`/`off`/empty) keeps it ON, so a typo cannot re-enable spending. **Unset = normal production behaviour.** | Railway → @kind/api → Variables |
| `PAID_PROVIDERS_ENABLED` | api | 🔴 **required in production** | 🛑 **THE DELIBERATE PATH TO PROVIDER SPEND (R66).** Paid providers are **OFF by default** — PDL, Apollo, Hunter and Clearbit all refuse unless this is exactly `true`/`1`/`yes`/`on`. ⚠️ **Forgetting it costs a refused call, never money**, which is the direction R66 requires; but it also means **live sourcing does not run until it is set**. Set it in Railway → @kind/api once, on purpose. ⚠️ **A test runner ignores it entirely** — `VITEST`/`NODE_ENV=test` are always safe and cannot be overridden. | Railway → @kind/api → Variables |
| `VITEST` | api | ⚪ set by the test runner | **Never set by hand, never set in Railway.** Vitest sets it to `true` inside its own process; the zero-spend guard reads it so a test run can **never** reach a paid provider, whatever `PAID_PROVIDERS_ENABLED` says (R66). Listed because the code reads it — it is not configuration. | *(set automatically by vitest)* |
| `CLEARBIT_API_KEY` | api | ⚪ optional | Clearbit enrichment — not in the day-to-day stack | Railway → **@kind/api** |
| `EXTRA_ALLOWED_ORIGINS` | api | ⚪ optional | Additional CORS origins beyond the portal and *.railway.app | Railway → **@kind/api** |
| `FEATURE_CAMPAIGN_INTENT` | api | ⚪ optional | Feature flag — campaign intent capture | Railway → **@kind/api** |
| `FEATURE_ICP_BUILDER` | api | ⚪ optional | Feature flag — ICP builder | Railway → **@kind/api** |
| `FIGSY_COLD_DAILY_CAP` | api | ⚪ optional | Daily ceiling for our own cold outreach | Railway → **@kind/api** |
| `FIGSY_DAILY_SEND_LIMIT` | api | ⚪ optional | House-wide daily send ceiling | Railway → **@kind/api** |
| `FIGSY_KIND_CLIENT_ID` | api | ⚪ optional | Legacy pointer at our own client row; superseded by the Vida house-client action (#600) | Railway → **@kind/api** |
| `FIGSY_PER_CLIENT_DAILY_CAP` | api | ⚪ optional | Per-client daily send ceiling | Railway → **@kind/api** |
| `FIGSY_WARMUP_START` | api | ⚪ optional | Warm-up ramp start date | Railway → **@kind/api** |
| `GOOGLE_CLIENT_ID` | api | ⚪ optional | Google OAuth — calendar booking | Railway → **@kind/api** |
| `GOOGLE_CLIENT_SECRET` | api | ⚪ optional | Google OAuth secret | Railway → **@kind/api** |
| `GOOGLE_REDIRECT_URI` | api | ⚪ optional | Google OAuth redirect | Railway → **@kind/api** |
| `HUBSPOT_API_KEY` | api | ⚪ optional | HubSpot CRM push | Railway → **@kind/api** |
| `INTENT_ENROLL_CAP_PER_CAMPAIGN` | api | ⚪ optional | Cap on intent-triggered enrolments per campaign | Railway → **@kind/api** |
| `IS_STAGING` | api | ⚪ optional | true = staging boot rules (only the Supabase vars stay critical) | Railway → **@kind/api** |
| `LIFECYCLE_EMAILS_ENABLED` | api | ⚪ optional | Unset = lifecycle/nurture emails do not send | Railway → **@kind/api** |
| `NEXT_PUBLIC_API_URL` | admin·api·portal | ⚪ optional | API base as the browser sees it; the API reads it only as a fallback | Railway → **@kind/admin** + Railway → **@kind/api** + Railway → **@kind/portal** |
| `NEXT_PUBLIC_APP_URL` | api | ⚪ optional | Portal base as the browser sees it | Railway → **@kind/api** |
| `NEXT_PUBLIC_IS_STAGING` | api·portal | ⚪ optional | Same signal, read from the shared build env | Railway → **@kind/api** + Railway → **@kind/portal** |
| `NEXT_PUBLIC_SUPABASE_URL` | admin·api·portal | ⚪ optional | Supabase URL as the browser sees it | Railway → **@kind/admin** + Railway → **@kind/api** + Railway → **@kind/portal** |
| `NEXUS_AUTOTUNE_KILL` | api | ⚪ optional | Kill-switch for per-client Nexus auto-tune | Railway → **@kind/api** |
| `PHANTOMBUSTER_API_KEY` | api | ⚪ optional | PhantomBuster — LinkedIn automation | Railway → **@kind/api** |
| `PHANTOMBUSTER_LINKEDIN_AGENT_ID` | api | ⚪ optional | PhantomBuster agent id | Railway → **@kind/api** |
| `RUN_CRONS` | api | ⚪ optional | Unset/false = this replica runs no scheduled jobs | Railway → **@kind/api** |
| `SLACK_WEBHOOK_URL` | api | ⚪ optional | Slack alert mirror | Railway → **@kind/api** |
| `SMARTLEAD_API_KEY` | api | ⚪ optional | Smartlead — CLIENT sending. Deferred until a client exists; key currently 401s | Railway → **@kind/api** |
| `SMARTLEAD_BASE_URL` | api | ⚪ optional | Smartlead API base; defaults in code | Railway → **@kind/api** |
| `SMARTLEAD_WEBHOOK_SECRET` | api | ⚪ optional | Verifies Smartlead inbound. Unset until a client sends through Smartlead — but it MUST be set before the first campaign, or inbound replies arrive unverified | Railway → **@kind/api** |
| `STRIPE_PRICE_DENISE_MONTHLY` | api | ⚪ optional | Stripe price ID — Denise AE $39/mo | Railway → **@kind/api** |
| `STRIPE_PRICE_MILLA_MONTHLY` | api | ⚪ optional | Stripe price ID — Milla VA $49/mo. ⚠️ **NOT SOLD** — the subscription ladder was retired for the one-wallet model (24–25 Jul); the var is kept because the code path still reads it. | Railway → **@kind/api** |
| `STRIPE_PRICE_VIDA_MONTHLY` | api | ⚪ optional | Stripe price ID — Vida chatbot $29/mo. ⚠️ **NOT SOLD** — same retirement as Milla above. | Railway → **@kind/api** |
| `SUPPRESSED_DOMAINS` | api | ⚪ optional | EXTRA do-not-contact domains. The employer floor is hard-coded and cannot be switched off from here | Railway → **@kind/api** |
| `TEST_INBOX_EMAIL` | api | ⚪ optional | Destination for the #553 ladder test send | Railway → **@kind/api** |
| `VAPID_PRIVATE_KEY` | api | ⚪ optional | Web-push private key | Railway → **@kind/api** |
| `VAPID_PUBLIC_KEY` | api | ⚪ optional | Web-push public key | Railway → **@kind/api** |
| `VAPID_SUBJECT` | api | ⚪ optional | Web-push contact (mailto:) | Railway → **@kind/api** |
| `VAPI_API_KEY` | api | ⚪ optional | Vapi voice agent | Railway → **@kind/api** |
| `VAPI_ASSISTANT_ID` | api | ⚪ optional | Vapi assistant id | Railway → **@kind/api** |
| `VAPI_PHONE_NUMBER_ID` | api | ⚪ optional | Vapi phone number id | Railway → **@kind/api** |
| `VAPI_WEBHOOK_SECRET` | api | ⚪ optional | Vapi webhook signature | Railway → **@kind/api** |
| `WHATSAPP_PHONE_NUMBER_ID` | api | ⚪ optional | WhatsApp Phone Number ID | Railway → **@kind/api** |
| `WHATSAPP_TOKEN` | api | ⚪ optional | WhatsApp Cloud API — Vida chatbot (apply at developers.facebook.com) | Railway → **@kind/api** |
| `WHATSAPP_VERIFY_TOKEN` | api | ⚪ optional | WhatsApp webhook verify token | Railway → **@kind/api** |

### ⚙️ Platform — Railway and Node set these

Listed for completeness. The startup check deliberately does **not** report them missing — a boot block that nags about `PORT` is a block nobody reads.

| Variable | Apps | Tier | What breaks when unset | Where it is set |
|---|---|---|---|---|
| `NODE_ENV` | admin·api·portal | ⚙️ platform | Set by the runtime | set by Railway — nothing to do |
| `PORT` | api | ⚙️ platform | Set by Railway; defaults to 4000 locally | set by Railway — nothing to do |
| `RAILWAY_GIT_COMMIT_SHA` | api | ⚙️ platform | Deploy identity, used in health/diagnostics | set by Railway — nothing to do |
| `RAILWAY_REPLICA_ID` | api | ⚙️ platform | Replica identity, used by the cron single-run guard (#343) | set by Railway — nothing to do |

### 🅿️ Parked — deliberately UNSET, and **presence is the fault**

For these five, the startup check reports them when they **are** set. See the note under *Notable right now* for why that inversion had to exist.

| Variable | Apps | Tier | What breaks when unset | Where it is set |
|---|---|---|---|---|
| `FLUTTERWAVE_SECRET_KEY` | api | 🅿️ **parked — leave UNSET** | Flutterwave was never wired. Nothing reads it but the env probe — delete it | Railway → **@kind/api** |
| `FLUTTERWAVE_WEBHOOK_HASH` | api | 🅿️ **parked — leave UNSET** | Flutterwave webhook hash — same; delete it | Railway → **@kind/api** |
| `HOUSE_CLIENT_ID` | api | 🅿️ **parked — leave UNSET** | Gates the Instantly step-9 push, PARKED on 30 Jul (#593). Setting it UN-PARKS a path we decided not to run — our own engine sends without it | Railway → **@kind/api** |
| `INSTANTLY_API_KEY` | api | 🅿️ **parked — leave UNSET** | Instantly is a WARMUP UTILITY only since the #577 amendment — the API is not called. A key here is idle, not wrong | Railway → **@kind/api** |
| `PAYSTACK_SECRET_KEY` | api | 🅿️ **parked — leave UNSET** | Paystack was removed in #352. Nothing reads it but the env probe — delete it | Railway → **@kind/api** |

### 🖥 Portal and admin only — the API never reads these

⚠️ **The API's startup check cannot see these.** It runs in the API process, and these live in other Railway services — checking them there would report every one of them missing on a perfectly healthy deploy. They are verified by reading this table, not by the boot log.

| Variable | Apps | Tier | What breaks when unset | Where it is set |
|---|---|---|---|---|
| `ADMIN_ALLOWED_EMAILS` | admin | 🔴 **required** | The admin app lets **nobody** in — every Vida page 401s. It is the allowlist the proxy checks before injecting the admin key. | Railway → **@kind/admin** |
| `ADMIN_SECRET` | admin | ⚪ optional | Legacy alias read as a fallback for `ADMIN_SECRET_KEY`. Set the `_KEY` one instead. | Railway → **@kind/admin** |
| `FEATURE_PORTAL_V2` | portal | ⚪ optional | Portal v2 screens stay off. | Railway → **@kind/portal** |
| `FEATURE_V2_SCREENS` | portal | ⚪ optional | Same switch, server side. | Railway → **@kind/portal** |
| `MILLA_DEV_PREVIEW` | portal | ⚪ optional | Milla preview mode off. Local only — never set in production. | local only |
| `NEXT_PUBLIC_FEATURE_V2_SCREENS` | portal | ⚪ optional | Same switch as seen by the browser (build-time). | Railway → **@kind/portal** (build) |
| `NEXT_PUBLIC_SOCIAL_LOGIN` | portal | ⚪ optional | Social login buttons hidden. | Railway → **@kind/portal** (build) |
| `NEXT_PUBLIC_STRIPE_PRICE_FIGSY_100` | portal | 🟠 important | The 100-credit Buy button has no price. | Railway → **@kind/portal** (build) |
| `NEXT_PUBLIC_STRIPE_PRICE_FIGSY_20` | portal | 🟠 important | The 20-credit Buy button has no price to send to Stripe. | Railway → **@kind/portal** (build) |
| `NEXT_PUBLIC_STRIPE_PRICE_FIGSY_40` | portal | 🟠 important | The 40-credit Buy button has no price. | Railway → **@kind/portal** (build) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | admin·portal | 🔴 **required** | **No client can sign in.** The browser Supabase client cannot be built. | Railway → **@kind/portal** + **@kind/admin** (build) |
| `NEXT_PUBLIC_TRAINING_LIVE` | portal | ⚪ optional | The training surface reads as not-live. | Railway → **@kind/portal** (build) |
| `NEXT_PUBLIC_VAPI_PUBLIC_KEY` | portal | ⚪ optional | In-browser voice widget off. | Railway → **@kind/portal** (build) |
| `NEXT_PUBLIC_ZAR_PER_USD` | admin | ⚪ optional | Admin ZAR conversion falls back to a code default. | Railway → **@kind/admin** (build) |
| `V2_PREVIEW_EMAILS` | portal | ⚪ optional | Nobody is opted into the v2 portal preview. | Railway → **@kind/portal** |
| `VIDA_DEV_PREVIEW` | admin | ⚪ optional | Vida preview mode off. Local only — never set in production. | local only |
| `ZAR_PER_USD` | admin | ⚪ optional | Same, server side. | Railway → **@kind/admin** |

---

## Where to set things

| Service | Holds |
|---|---|
| Railway → **@kind/api** | every 🔴 / 🟠 / ⚪ row above except the portal/admin block |
| Railway → **@kind/portal** | `NEXT_PUBLIC_*` (baked at BUILD time — changing one needs a redeploy, not a restart) + the portal feature flags |
| Railway → **@kind/admin** | `ADMIN_ALLOWED_EMAILS`, `ADMIN_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, the ZAR rate |
| Cloudflare | DNS and the load balancer only — **no application variables live there** |
| local only | `MILLA_DEV_PREVIEW`, `VIDA_DEV_PREVIEW`. Never set these in production |

⚠️ **`NEXT_PUBLIC_*` is compiled into the browser bundle.** Two consequences: changing one requires a **rebuild**, and anything named `NEXT_PUBLIC_*` is **public** — never put a secret behind that prefix.

## Related

- **`apps/api/src/lib/startup-check.ts`** — the runtime half. Boots, classifies, and refuses to start on a missing 🔴.
- **`GET /engine/env`** (admin-gated) — per-key booleans from the *live* deploy, never values. This is how you check what Railway actually has without opening Railway.
- **`docs/CORE-MAP.md`** — which code runs at all.
