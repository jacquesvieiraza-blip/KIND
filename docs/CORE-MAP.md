# 🗺️ THE CORE MAP — the code that actually runs the product

> **Why this exists.** The repo is ~113,000 lines. Audits kept reporting coverage like *"8.5% of 90k"* — a number that is both discouraging and meaningless, because most of those lines never execute. Worse, work and attention leaked into code that no running system ever touches. This map draws the line.
>
> **Generated, not judged.** `scripts/build-core-map.py` starts at the REAL entry points — the API's `index.ts` and `cron.ts`, every Milla page, every Vida page, both middlewares, both in-app API proxies — and follows every `import` and dynamic `import()` transitively until the graph closes. **Zero imports failed to resolve**, so nothing was quietly dropped. Re-run it any time; it is deterministic — `python3 scripts/build-core-map.py` rewrites `scripts/core-files.txt` in place and now **exits non-zero if any import fails to resolve**, so a graph that did not close can never be read as a clean map.
>
> ⚠️ **That sentence was not true when this map first shipped, and the fix is worth recording.** The script hardcoded `ROOT = '/home/user/KIND'` — a container path that does not exist on the founder's Mac, so it could not run there at all (the same family as **#578** `declare -A` on bash 3.2 and **#579** BSD awk) — and it **never wrote `scripts/core-files.txt`**: it printed its counts and dumped a trace into a scratchpad that dies with the container. So the manifest could not be regenerated, and it was stale by **exactly the five files the measurement system itself added** — `vida/system/page.tsx`, `integrity.ts`, `integrity-checks.ts`, `system-check.ts`, `system-probes.ts`. **The map was fencing out the instruments it shipped beside.** `ROOT` is now derived from the script's own location, and the manifest is written by the script that counts it, so the number in the doc and the list on disk cannot disagree again.

## The numbers

| | Files | Lines | Share |
|---|---:|---:|---:|
| **CORE — reachable from an entry point** | **255** | **61,089** | **45%** |
| FENCED — `.ts`/`.tsx` not reachable | 182 | 36,727 | 27% |
| *(remainder: `.sql`, `.html`, and test files)* | 165 | 36,569 | 27% |
| **Repo total (ts/tsx/sql/html under `apps/` + `packages/`)** | 602 | **134,385** | 100% |

**— THE 27 JUL REGENERATION, KEPT AS ITS OWN RECORD (everything from here to the ⚠️ total note below describes THAT run, not the current table) —**

**REASON FOR THAT REGENERATION, stated out loud because rule 1 below requires it — and because the first version of it did not state it, which the founder caught.** Prompts 5–7 added code to the operational core: the RLS audit and its live reader, the backup manifest and its live reader, the constraint reader, the seed-wipe classification, the cron single-run guard, the PDL cursor, the subscription status + lapse logic, the Smartlead integration (map · network · hand-off) and the reply routing. Every one is reachable from a real entry point, so every one belongs inside the fence and inside the audit denominator. **Leaving the map stale would have fenced out the work of three prompts** — exactly the failure recorded in the ⚠️ note above, where the map fenced out the instruments it shipped beside.

*Regenerated **2 Aug** (#608) — `python3 scripts/build-core-map.py`, **58 seeds**, **0 unresolved imports**: `core files: 255 | core lines: 61089`. The table above is that run.*

**⚠️ THESE NUMBERS WERE NEARLY COPIED INSTEAD OF MEASURED.** A doc-fix written on 1 Aug (PR #1240) carried **254 / 61,113 / 594 / 133,180**. Pasting those in would have looked identical to doing the work and been wrong in four places — six days of merges moved every figure. The rule the map already states is the one that saved it: *generated, not judged*. **Never transcribe a count from another branch; re-run the generator.**

**REASON FOR THE 2 AUG REGENERATION.** No new decision — the map had gone stale against six days of shipped work (the trial retirement, the site restore and freeze, the portal sweep, the paper pass, the money-write remainder and their tests). Every new file is reachable from a real entry point, so every one belongs inside the fence and inside the audit denominator.

*Regenerated 27 Jul — `python3 scripts/build-core-map.py`, 57 seeds, **0 unresolved imports**, manifest rewritten in place.*

**The core GREW by 21 files and 5,384 lines this session**, and that is the map working rather than a problem: Prompts 5–7 added the RLS audit, the backup manifest, the seed report, the cron guard, the Smartlead integration and the reply routing — every one of them reachable from a real entry point, so every one of them is now inside the fence and inside the audit denominator.

⚠️ **The repo TOTAL fell (613 → 552) and that is a counting-method difference, not deletions.** Nothing was deleted (founder-locked). This walk excludes `node_modules`, `dist` and `.next`; the 26 Jul figure was derived a different way and evidently swept some build output in. **The core numbers come straight from the generator and are the ones to trust**; the total is a denominator, and its method is now written down so the next recount can be compared rather than guessed at.

**The rules this map exists to enforce:**

1. **Work happens inside the core.** A change to a fenced file needs a reason stated out loud.
2. **Audit coverage is stated as a % of the CORE**, never of the repo. 100% is now a reachable, meaningful target.
3. **Nothing is deleted.** Fenced means *not in play* — it stays exactly where it is (founder-locked 26 Jul: *"nothing gets deleted"*).

## What this map does NOT prove — read this before trusting it

- **Reachable ≠ used.** It proves a file is *imported* from an entry point, not that every function in it is called. **The worked example resolved on 1 Aug, and it proves the point harder than the original guess did.** This doc used to say *"inventory #397 says its functions are never actually called"* — **#397's premise was FALSE**: reading `lib/hubspot.ts` end to end found **2 of its 5 exports live on the reply path** (`syncFigsyInterestedToHubspot` via `reply-pipeline.ts`, `getHubspotPipelineView` via `internal.ts`) and **3 genuinely dead**, which were removed. So a CORE file really did contain dead code — and it also contained code that a *"wire or delete"* instruction would have deleted out of the live reply pipeline. **This map cannot settle dead-code questions in either direction; only reading can.**
- **Mounted ≠ intended.** `routes/voice.ts` and `routes/whatsapp.ts` are CORE because `index.ts` mounts them. They carry the known security holes #369 and #359 — and being in the core is exactly *why* those matter: they are reachable in production today, whatever the roadmap says about the agents being parked.
- **Runtime-only references are invisible.** Anything reached by a string path, a route table or a DB value rather than an `import` will not appear here.
- **`(dashboard)` is CORE, and that is not a mistake.** Eleven pages of the retired self-serve portal are imported directly by Milla's own pages — e.g. Milla's billing page is a 13-line wrapper around `(dashboard)/dashboard/billing/page.tsx`. **Deleting that tree would break Milla.**

## Spot-check — the evidence, run 26 Jul

**5 core files, each with a named importer:**

| File | Imported by |
|---|---|
| `apps/api/src/lib/sending-inbox.ts` (161L) | `figsy.ts` |
| `apps/api/src/lib/mailer.ts` (114L) | `figsy.ts` |
| `apps/api/src/lib/approve-lead.ts` (231L) | `leads.ts` |
| `apps/portal/src/app/(dashboard)/dashboard/billing/page.tsx` (487L) | Milla's `billing/page.tsx` |
| `apps/api/src/routes/voice.ts` (156L) | `index.ts` |

**5 fenced files, checked for core importers:**

| File | Result |
|---|---|
| `apps/api/src/routes/lena.ts` (70L) | FENCED — 0 core importers ✓ *(confirms #404: never mounted)* |
| `apps/portal/src/app/(v2)/layout.tsx` (40L) | FENCED — 0 ✓ |
| `apps/portal/src/app/partner-preview/page.tsx` (370L) | FENCED — 0 ✓ |
| `apps/portal/src/app/(dashboard)/dashboard/marketplace/page.tsx` (84L) | FENCED — 0 ✓ |
| `apps/api/src/lib/hubspot.ts` (458L) | **IN CORE** — the spot-check caught my own assumption; see the caveat above |

*(The first attempt at this spot-check grepped bare filename stems like `page` and `layout`, which matched everything and produced nonsense. It was redone against resolved import specifiers. Recorded because a check that can produce a false green is worth knowing about.)*

## Both send modes are in the core, on purpose

**Direct SMTP** — live today: `lib/sending-inbox.ts` (which mailbox, or refuse) → `lib/mailer.ts` (nodemailer) → `lib/inbox-secret.ts` (AES-256-GCM at rest), called from `lib/figsy.ts`.

**Provider API** — not built; both vendors confirmed in writing (26 Jul) that they do **not** release SMTP credentials, so our product will instruct their senders instead. When built, `lib/instantly.ts` (ours) and `lib/smartlead-send.ts` (clients') join the core beside the SMTP pair, and this map is regenerated. The integration points already exist: `lib/figsy.ts` (the send decision) and `lib/sending-inbox.ts` (which sender, and the refusal when there is none).

---

# THE CORE, FILE BY FILE

## API ROUTES — every mounted endpoint — 44 files, 21,353 lines

| File | Lines | What it does |
|---|---:|---|
| `apps/api/src/routes/admin.ts` | 1016 | Constant-time admin-key check — avoids the char-by-char timing side-channel of `!==`. |
| `apps/api/src/routes/auth.ts` | 229 | ── SIGNUP — bypass email confirmation via admin SDK ────────────────────────── |
| `apps/api/src/routes/calendar.ts` | 588 | Guard: if Google OAuth is not configured, every route returns gracefully. |
| `apps/api/src/routes/casey.ts` | 76 | Casey — The Guide (onboarding agent, 113a). Casey greets new clients, walks |
| `apps/api/src/routes/clients.ts` | 419 | Lightweight profile check — used by onboard page to skip if already onboarded |
| `apps/api/src/routes/company.ts` | 614 | #88 Company Engine — backend (per-rep workspaces under an owner-funded company). |
| `apps/api/src/routes/credits.ts` | 42 | ── GET balance + transaction history ───────────────────────────────────────── |
| `apps/api/src/routes/demo-request.ts` | 61 | — |
| `apps/api/src/routes/denise.ts` | 248 | Denise — The Closer (AI Account Executive). Client-facing endpoints that turn |
| `apps/api/src/routes/developer.ts` | 236 | ── API-KEY AUTH (public event API #185) ────────────────────────────────────── |
| `apps/api/src/routes/engine.ts` | 224 | THE ENGINE (item 211) — admin-only diagnostic surface. PHASE 1: read-only. |
| `apps/api/src/routes/figsy-tasks.ts` | 104 | #321 — per-user cap on the Claude-backed task extractor (keyed by userId; sits |
| `apps/api/src/routes/figsy.ts` | 3126 | Generous DoS backstop for the public, token-gated unsubscribe routes. The limit |
| `apps/api/src/routes/forms.ts` | 83 | R12 (#83, ClickUp) — Embeddable lead-capture forms. |
| `apps/api/src/routes/founder.ts` | 365 | Founder Agent Stack — support, CS, and AE agents running KIND's own business |
| `apps/api/src/routes/icps.ts` | 1159 | PR-A — record ONE honest outcome row per ICP run so the client learns WHY a run |
| `apps/api/src/routes/integrations.ts` | 131 | GET /integrations/status — Auth required. |
| `apps/api/src/routes/internal-briefs.ts` | 280 | Internal Briefs Router |
| `apps/api/src/routes/internal.ts` | 2959 | Internal agent routes — AE + CRO agents (INT-1 to INT-7) |
| `apps/api/src/routes/leads.ts` | 1853 | ── PUBLIC: POPIA consent callback (no auth — lead clicks link in email) ─────── |
| `apps/api/src/routes/linkedin.ts` | 120 | GET /api/linkedin/queue — list pending LinkedIn steps for this client |
| `apps/api/src/routes/lookalike.ts` | 157 | #345 (AR-08) — lookalike is an ADMIN-ONLY growth tool (the admin "Clone my best |
| `apps/api/src/routes/mcp.ts` | 208 | #306: validate a client's developer API key (mirrors /developer requireApiKey |
| `apps/api/src/routes/milla.ts` | 485 | Stateless side-panel chat persona (113a). Distinct from the session-backed |
| `apps/api/src/routes/money-path.ts` | 343 | THE MONEY PATH (#448 / #449 p1-2) — admin-only surface over the sourcing economy. |
| `apps/api/src/routes/onboarding.ts` | 117 | Allowed onboarding statuses — the client may only PATCH into one of these. |
| `apps/api/src/routes/operator.ts` | 2185 | #483–#487 — VIDA OPERATOR CONSOLE API. |
| `apps/api/src/routes/order-forms.ts` | 70 | GET /order-forms/me — get my order form + agreement templates |
| `apps/api/src/routes/outreach.ts` | 102 | FOUNDER OUTREACH SCOREBOARD (cashflow §7B) — admin-only surface over the founder's |
| `apps/api/src/routes/partners.ts` | 915 | Partner programme routes |
| `apps/api/src/routes/proposals.ts` | 165 | GET /proposals/sign/:token — public view for signing (no auth) — must be BEFORE /:id |
| `apps/api/src/routes/share.ts` | 68 | ── PUBLIC: shared campaign report (no auth — resolved by share_token) ───────── |
| `apps/api/src/routes/signals.ts` | 110 | ── HELPER: fire-and-forget signal emission for any agent ───────────────────── |
| `apps/api/src/routes/stats.ts` | 51 | Public platform stats endpoint — no auth required. |
| `apps/api/src/routes/status.ts` | 163 | POST /internal/status/snapshot |
| `apps/api/src/routes/stripe.ts` | 818 | Also add: app.use('/webhooks/stripe', express.raw({ type: 'application/json' })) BEFORE app.use(express.json()) |
| `apps/api/src/routes/subscribe.ts` | 56 | Try to insert into Supabase — don't fail if table doesn't exist |
| `apps/api/src/routes/subscriptions.ts` | 189 | #325 — Paystack fully removed (Stripe-only). Subscriptions now start via |
| `apps/api/src/routes/support.ts` | 123 | #321 — per-user cap on the Claude-backed support chat (keyed by userId). |
| `apps/api/src/routes/team.ts` | 139 | #266 SECURITY: every /team route requires auth, and the caller's workspace is |
| `apps/api/src/routes/tracking.ts` | 88 | Constant-time admin-key check against the SHARED admin secret (ADMIN_SECRET_KEY |
| `apps/api/src/routes/vida.ts` | 520 | R3 (V2-11): Vida in-portal help bubble. Vida answers the CLIENT's own |
| `apps/api/src/routes/voice.ts` | 156 | ── INITIATE A CALL ─────────────────────────────────────────────────────────── |
| `apps/api/src/routes/whatsapp.ts` | 192 | ── WEBHOOK VERIFICATION (public) ──────────────────────────────────────────── |

## API LIB — the engine: money, send, reply, sourcing — 68 files, 11,533 lines

| File | Lines | What it does |
|---|---:|---|
| `apps/api/src/lib/alerts.ts` | 89 | Founder alerting (#285/#286) — the admin's first sense. The business ran on |
| `apps/api/src/lib/apollo.ts` | 464 | Apollo.io people search — maps ICP criteria to API params and normalises results |
| `apps/api/src/lib/approval-batch.ts` | 73 | THE MINIMUM-20 GATE (founder-locked 25 Jul) — a client has to commit, or we carry them. |
| `apps/api/src/lib/approve-lead.ts` | 231 | ONE WALLET — the work model (founder-locked 24 Jul, supersedes #492). |
| `apps/api/src/lib/billing-rules.ts` | 95 | ───────────────────────────────────────────────────────────────────────────── |
| `apps/api/src/lib/booking-token.ts` | 104 | #368 / #361b — HMAC-signed, self-verifying tokens for the calendar feature. |
| `apps/api/src/lib/campaign-settings.ts` | 145 | figsy_campaigns.settings is a JSONB grab-bag, and the send path reads the gates from |
| `apps/api/src/lib/client-step.ts` | 131 | WHERE IS THIS CLIENT, AND WHAT IS THE ONE NEXT THING? |
| `apps/api/src/lib/cmo.ts` | 89 | K.I.N.D brand voice + messaging config — update this file to change how the CMO agent writes |
| `apps/api/src/lib/cold-client.ts` | 63 | COLD CLIENTS — 30 days without an approval and we suspend (founder-locked 25 Jul). |
| `apps/api/src/lib/consent.ts` | 31 | Generate a cryptographically-secure consent token. |
| `apps/api/src/lib/crm.ts` | 316 | — |
| `apps/api/src/lib/db-connection.ts` | 128 | WHY THIS EXISTS — "connect ENETUNREACH …:5432" |
| `apps/api/src/lib/deliverability.ts` | 239 | ───────────────────────────────────────────────────────────────────────────── |
| `apps/api/src/lib/demo-mbf-data.ts` | 141 | MBF — THE DEMO CAST (founder-locked 26 Jul). "5 demos = 1 sale." |
| `apps/api/src/lib/demo-mbf.ts` | 309 | MBF — SEEDING THE DEMO ACCOUNT (founder-locked 26 Jul). |
| `apps/api/src/lib/demo.ts` | 23 | #453 — DEMO MODE resolver. A client flagged `is_demo` (clients.is_demo) is a |
| `apps/api/src/lib/denise.ts` | 260 | DENISE — The Closer (Autonomous AI Account Executive) |
| `apps/api/src/lib/email-hygiene.ts` | 16 | Pure email-hygiene helpers — NO db/network imports so they stay unit-testable in |
| `apps/api/src/lib/email.ts` | 814 | Demo/seed clients carry synthetic addresses (e.g. demo-xxxx@kind-demo.internal). |
| `apps/api/src/lib/enrichment.ts` | 262 | P2-5: Waterfall enrichment — Apollo → PDL → Hunter → Clearbit → Claude fallback |
| `apps/api/src/lib/figsy.ts` | 1670 | ONE WALLET (24 Jul): no holds — money is a single $4 charged at approve. The old |
| `apps/api/src/lib/gcal.ts` | 239 | Google Calendar OAuth2 + API integration — loaded dynamically to avoid |
| `apps/api/src/lib/hubspot.ts` | 458 | HubSpot CRM sync library — KIND platform integration |
| `apps/api/src/lib/inbox-secret.ts` | 100 | MAILBOX PASSWORDS AT REST — AES-256-GCM, one key, held only in the environment. |
| `apps/api/src/lib/lead-delivery.ts` | 124 | Enrich + deliver + charge — the single delivery path for BOTH the on-run |
| `apps/api/src/lib/linkedin.ts` | 96 | — |
| `apps/api/src/lib/mailer.ts` | 114 | THE THING THAT ACTUALLY SPEAKS TO A MAILBOX — the gap behind #547. |
| `apps/api/src/lib/manual-reply.ts` | 68 | MANUAL PROSPECT REPLY — one implementation, two callers. |
| `apps/api/src/lib/milla.ts` | 205 | ── Text chunking ───────────────────────────────────────────────────────────── |
| `apps/api/src/lib/money-path-math.ts` | 107 | SPRINT 8a·③ (#448/#449) — Money Path arithmetic, DB-free so it can be unit-tested. |
| `apps/api/src/lib/nexus-guard.ts` | 69 | #511 NEXUS · Phase 3 — GUARDRAILS. Pure, dependency-free, unit-testable. These land BEFORE |
| `apps/api/src/lib/nexus.ts` | 135 | #511 NEXUS · Phase 0/1 — the per-client learning brain (compute + read). |
| `apps/api/src/lib/onboarding-pack.ts` | 116 | THE $99 ONBOARDING PACK — 100 approvals included, then $4 a lead. |
| `apps/api/src/lib/operator-audit.ts` | 60 | #486 — the one place an operator action gets written to operator_audit_log. |
| `apps/api/src/lib/operator-queue.ts` | 103 | #487 — Vida operator draft-queue actions (the "Needs approval" column). |
| `apps/api/src/lib/outcomes.ts` | 65 | THE DATA FLOOR (EVERYTHING.md #17b). |
| `apps/api/src/lib/page-rows.ts` | 81 | PAGE, DON'T TRUNCATE. |
| `apps/api/src/lib/pdl-search.ts` | 289 | ───────────────────────────────────────────────────────────────────────────── |
| `apps/api/src/lib/pending-migrations.ts` | 222 | PENDING MIGRATIONS — runnable from Vida, because the Supabase SQL editor is unreachable. |
| `apps/api/src/lib/pool-sourcing.ts` | 116 | ───────────────────────────────────────────────────────────────────────────── |
| `apps/api/src/lib/push.ts` | 52 | Web Push helper — sends PWA push notifications to a client's subscribed |
| `apps/api/src/lib/rate-limit.ts` | 56 | In-memory IP rate limiter factory — no external dependency. For the public, |
| `apps/api/src/lib/real-clients-logic.ts` | 45 | ───────────────────────────────────────────────────────────────────────────── |
| `apps/api/src/lib/real-clients.ts` | 74 | ───────────────────────────────────────────────────────────────────────────── |
| `apps/api/src/lib/reply-risk.ts` | 20 | E7 — legal / reputational RISK filter for inbound replies. Pure + dependency-free (no DB, |
| `apps/api/src/lib/resend-checked.ts` | 25 | M0 · #338 (AR-01) — PHANTOM SENDS. resend.emails.send() RETURNS { data, error } |
| `apps/api/src/lib/run-outcome.ts` | 41 | PR-A — honest ICP-run outcome status + client-facing copy. |
| `apps/api/src/lib/scoring-failure.ts` | 13 | #477/#358 — the ONE payload written when a batch of leads can't be scored (the AI threw, |
| `apps/api/src/lib/scoring.ts` | 211 | Strip markdown code fences that Claude sometimes wraps JSON in |
| `apps/api/src/lib/scrape.ts` | 66 | — |
| `apps/api/src/lib/seed-company.ts` | 164 | Seeds a DEMO COMPANY (Company Engine #88) onto an existing demo client so the |
| `apps/api/src/lib/seed-showcase.ts` | 250 | Seeds a DEMO/SHOWCASE client with impressive, internally-consistent fake data |
| `apps/api/src/lib/sending-inbox.ts` | 161 | WHOSE MAILBOX DOES THIS EMAIL LEAVE FROM? — the answer #547 exists to give. |
| `apps/api/src/lib/sequence-apply.ts` | 137 | Item 187 — applying a saved sequence/template to a campaign (email-first). |
| `apps/api/src/lib/sequence-tokens.ts` | 82 | ONE contract for sequence merge-tokens, shared by the two halves of the launch path: |
| `apps/api/src/lib/smartlead.ts` | 110 | THE ENGINE (item 211) — Smartlead client · PHASE 1: READ-ONLY connectivity only. |
| `apps/api/src/lib/sourcing-fences.ts` | 44 | #445 — money-fence maths, extracted pure so the granted-size ladder is unit-tested |
| `apps/api/src/lib/start-work.ts` | 157 | PAYMENT STARTS THE WORK — the step-3 collapse from flow v2 (founder-locked 25 Jul). |
| `apps/api/src/lib/startup-check.ts` | 147 | Startup environment variable check. |
| `apps/api/src/lib/stripe.ts` | 287 | ── Credit bundle price IDs (one-time payments) — prices LOCKED to @kind/shared ── |
| `apps/api/src/lib/suggest-times.ts` | 97 | "NO CALENDAR → SUGGEST TIMES" (flow v2, step 8 — founder-locked 25 Jul). |
| `apps/api/src/lib/suppression.ts` | 56 | ── DO-NOT-CONTACT SUPPRESSION ─────────────────────────────────────────────── |
| `apps/api/src/lib/vapi.ts` | 155 | Initiates a Vapi voice call for a FIGSY follow-up. |
| `apps/api/src/lib/vida.ts` | 260 | — |
| `apps/api/src/lib/webhook-idempotency.ts` | 45 | #264 — inbound-webhook idempotency guard. |
| `apps/api/src/lib/webhooks.ts` | 160 | OUTBOUND WEBHOOKS + ZAPIER/MAKE-FRIENDLY EVENT PUSH (PRODUCT-INVENTORY #182, #185). |
| `apps/api/src/lib/whatsapp.ts` | 158 | ── SEND TEXT MESSAGE ───────────────────────────────────────────────────────── |

## API ENTRY — index, cron, middleware — 4 files, 573 lines

| File | Lines | What it does |
|---|---:|---|
| `apps/api/src/cron.ts` | 216 | Run-history: record one row per cron execution into cron_runs so the admin |
| `apps/api/src/index.ts` | 230 | Option A (verified leads campaign-ready) + Railway build fix — deploy trigger. |
| `apps/api/src/middleware/auth.ts` | 15 | — |
| `apps/api/src/middleware/error.ts` | 112 | #290 — lightweight error tracking (NO new npm dep — this is the no-Sentry option; |

## MILLA — the client portal — 20 files, 1,707 lines

| File | Lines | What it does |
|---|---:|---|
| `apps/portal/src/app/(milla)/layout.tsx` | 11 | #488 — Milla owns its OWN full-screen shell, OUTSIDE the (dashboard) route group, so it |
| `apps/portal/src/app/(milla)/milla/analytics/page.tsx` | 13 | Milla-native — renders the REAL analytics page inside the Milla shell (no old-portal chrome, |
| `apps/portal/src/app/(milla)/milla/billing/page.tsx` | 13 | Milla-native — renders the REAL billing page inside the Milla shell (no old-portal chrome, |
| `apps/portal/src/app/(milla)/milla/campaign/page.tsx` | 179 | M5 — "My campaign" is READ-ONLY for the client (founder-locked north star: "we do the |
| `apps/portal/src/app/(milla)/milla/chat/page.tsx` | 105 | #489 — MILLA CONCIERGE CHAT. Re-uses the EXISTING Milla sessions backend verbatim |
| `apps/portal/src/app/(milla)/milla/coaching/page.tsx` | 122 | M9 — COACHING. We booked the meeting; the client still has to win it. We hold the context |
| `apps/portal/src/app/(milla)/milla/command-centre/page.tsx` | 13 | Milla-native — renders the REAL company page inside the Milla shell (no old-portal chrome, |
| `apps/portal/src/app/(milla)/milla/documents/page.tsx` | 13 | Milla-native — renders the REAL documents page inside the Milla shell (no old-portal chrome, |
| `apps/portal/src/app/(milla)/milla/icp/page.tsx` | 251 | #512 — CLIENT ICP APPROVAL GATE. The client reviews their targeting (current ICP) and, |
| `apps/portal/src/app/(milla)/milla/meetings/page.tsx` | 73 | #507 — MILLA MEETINGS tab: the client's booked meetings (their calendar), from live |
| `apps/portal/src/app/(milla)/milla/page.tsx` | 444 | #497/#503/#506/#495 — MILLA HOME (docs/mv-previews/milla2.html): KPI cards row + Milla |
| `apps/portal/src/app/(milla)/milla/performance/page.tsx` | 13 | Milla-native — renders the REAL kpis page inside the Milla shell (no old-portal chrome, |
| `apps/portal/src/app/(milla)/milla/pipeline/page.tsx` | 103 | M10 — CLIENT PIPELINE. The gap between "I approved this lead" and "a meeting appeared": |
| `apps/portal/src/app/(milla)/milla/referral/page.tsx` | 13 | Milla-native — renders the REAL referral page inside the Milla shell (no old-portal chrome, |
| `apps/portal/src/app/(milla)/milla/reports/page.tsx` | 121 | #516 — MILLA CLIENT REPORT. The client-facing "what happened" page: meetings booked, |
| `apps/portal/src/app/(milla)/milla/roi/page.tsx` | 13 | Milla-native — renders the REAL roi page inside the Milla shell (no old-portal chrome, |
| `apps/portal/src/app/(milla)/milla/settings/page.tsx` | 13 | Milla-native — renders the REAL settings page inside the Milla shell (no old-portal chrome, |
| `apps/portal/src/app/(milla)/milla/teams/page.tsx` | 13 | Milla-native — renders the REAL team page inside the Milla shell (no old-portal chrome, |
| `apps/portal/src/app/(milla)/milla/usage/page.tsx` | 13 | Milla-native — renders the REAL usage page inside the Milla shell (no old-portal chrome, |
| `apps/portal/src/app/(milla)/milla/welcome/page.tsx` | 168 | #513/#514 — MILLA CONVERSATIONAL ONBOARDING. Milla-led, no forms: the client describes |

## PORTAL (dashboard) — REACHED BY MILLA, so it is CORE — 11 files, 5,386 lines

| File | Lines | What it does |
|---|---:|---|
| `apps/portal/src/app/(dashboard)/dashboard/analytics/page.tsx` | 560 | ── Types ───────────────────────────────────────────────────────────────────── |
| `apps/portal/src/app/(dashboard)/dashboard/billing/page.tsx` | 487 | ── Sparkline chart (pure SVG, no library) ─────────────────────────────────── |
| `apps/portal/src/app/(dashboard)/dashboard/company/page.tsx` | 859 | #88 Company / Per-Rep Engine — the real Owner Command Centre / Teams Hub. |
| `apps/portal/src/app/(dashboard)/dashboard/documents/page.tsx` | 221 | #136a — Stripe-issued invoices, pulled & displayed read-only (USD). |
| `apps/portal/src/app/(dashboard)/dashboard/kpis/DeliverabilityHealth.tsx` | 93 | Sender-health + warmup-pacing — the two signals that used to live on the standalone |
| `apps/portal/src/app/(dashboard)/dashboard/kpis/page.tsx` | 908 | — |
| `apps/portal/src/app/(dashboard)/dashboard/referral/page.tsx` | 210 | Fetch client id |
| `apps/portal/src/app/(dashboard)/dashboard/roi/page.tsx` | 322 | ── Item 191 — ROI / value dashboard ("What K.I.N.D did for you") ────────────── |
| `apps/portal/src/app/(dashboard)/dashboard/settings/page.tsx` | 991 | R2 (#27): the daily brief drives a real server-side email cron, so it's |
| `apps/portal/src/app/(dashboard)/dashboard/team/page.tsx` | 451 | ── Types ───────────────────────────────────────────────────────────────────── |
| `apps/portal/src/app/(dashboard)/dashboard/usage/page.tsx` | 284 | ── Bar chart (weekly usage) — pure SVG ──────────────────────────────────────── |

## PORTAL shared — lib, middleware, components — 5 files, 494 lines

| File | Lines | What it does |
|---|---:|---|
| `apps/portal/src/components/ProductTour.tsx` | 132 | THE PRODUCT WALKTHROUGH (flow v2, step 1 — founder-locked 25 Jul). |
| `apps/portal/src/components/milla/MillaShell.tsx` | 180 | #490/#510 — the Milla client shell (docs/mv-previews/milla2.html): slim top bar (brand + |
| `apps/portal/src/lib/api.ts` | 49 | — |
| `apps/portal/src/lib/supabase/client.ts` | 8 | — |
| `apps/portal/src/middleware.ts` | 125 | #488 — DEV-ONLY Milla preview bypass (never in production). Lets the screenshot harness |

## VIDA — the operator console — 24 files, 3,739 lines

| File | Lines | What it does |
|---|---:|---|
| `apps/admin/src/app/vida/audit/page.tsx` | 147 | #486 — OPERATOR AUDIT VIEWER (read-only). |
| `apps/admin/src/app/vida/billing/page.tsx` | 5 | Vida-native — renders the real billing page inside the Vida shell (no old-admin chrome, no exit). |
| `apps/admin/src/app/vida/bookings/page.tsx` | 235 | #499 — VIDA BOOKINGS. The operator's meetings view for a client: every confirmed meeting |
| `apps/admin/src/app/vida/clients-admin/[id]/page.tsx` | 9 | Vida-native — renders the real per-client detail page inside the Vida shell (no old-admin |
| `apps/admin/src/app/vida/clients-admin/page.tsx` | 5 | Vida-native — renders the real clients page inside the Vida shell (no old-admin chrome, no exit). |
| `apps/admin/src/app/vida/cockpit/page.tsx` | 5 | Vida-native — renders the real Cockpit inside the Vida shell (no old-admin chrome). |
| `apps/admin/src/app/vida/compliance/page.tsx` | 5 | Vida-native — renders the real compliance page inside the Vida shell (no old-admin chrome, no exit). |
| `apps/admin/src/app/vida/demo/page.tsx` | 203 | ONE DEMO ENVIRONMENT, ALWAYS: MBF (founder-locked 26 Jul). |
| `apps/admin/src/app/vida/engine/page.tsx` | 334 | V7 ENGINE (item 211) + V9 inbox SOP (#270/#271). |
| `apps/admin/src/app/vida/founder/page.tsx` | 5 | Vida-native — renders the real founder page inside the Vida shell (no old-admin chrome, no exit). |
| `apps/admin/src/app/vida/gtm/page.tsx` | 5 | Vida-native — renders the real GTM Hub inside the Vida shell. |
| `apps/admin/src/app/vida/health/page.tsx` | 5 | Vida-native — renders the real health page inside the Vida shell (no old-admin chrome, no exit). |
| `apps/admin/src/app/vida/layout.tsx` | 210 | #485 — the Vida operator shell. Full-screen, light theme, matching |
| `apps/admin/src/app/vida/money-path/page.tsx` | 5 | Vida-native — renders the real money-path page inside the Vida shell (no old-admin chrome, no exit). |
| `apps/admin/src/app/vida/nexus/page.tsx` | 223 | #511 NEXUS · Phase 1 — the per-client learning brain, surfaced for the operator. Pick a |
| `apps/admin/src/app/vida/ops/page.tsx` | 5 | Vida-native — renders the real ops page inside the Vida shell (no old-admin chrome, no exit). |
| `apps/admin/src/app/vida/outreach/page.tsx` | 5 | Vida-native — renders the real outreach page inside the Vida shell (no old-admin chrome, no exit). |
| `apps/admin/src/app/vida/page.tsx` | 1870 | #483–#485 — VIDA OPERATOR CONSOLE (working area). |
| `apps/admin/src/app/vida/queue/page.tsx` | 126 | Vida LEAD QUEUE — the operator's single inbox: every FIGSY-written draft awaiting a human |
| `apps/admin/src/app/vida/record/page.tsx` | 117 | #517 — UNIFIED OPERATING RECORD. One lead's whole story on a page: the money state, every |
| `apps/admin/src/app/vida/reports/page.tsx` | 103 | Vida REPORTS & billing — per-client essentials the operator reads: wallet balance ($), |
| `apps/admin/src/app/vida/revenue/page.tsx` | 5 | Vida-native — renders the real revenue page inside the Vida shell (no old-admin chrome, no exit). |
| `apps/admin/src/app/vida/suppression/page.tsx` | 102 | Vida SUPPRESSION — the REAL do-not-contact / opt-out list (opt_out_blocklist): the |
| `apps/admin/src/app/vida/unibox/page.tsx` | 5 | Vida-native — renders the real unibox page inside the Vida shell (no old-admin chrome, no exit). |

## ADMIN shared — proxy, layout, nervous-system pages — 35 files, 5,344 lines

| File | Lines | What it does |
|---|---:|---|
| `apps/admin/src/app/api/clients/[id]/order-form/route.ts` | 5 | Order forms are no longer used — clients accept T&Cs via checkbox at Paystack checkout. |
| `apps/admin/src/app/api/clients/route.ts` | 25 | — |
| `apps/admin/src/app/api/proxy/[...path]/route.ts` | 69 | #308 defense-in-depth: this route injects ADMIN_SECRET_KEY into upstream calls, |
| `apps/admin/src/app/api/reply/route.ts` | 68 | — |
| `apps/admin/src/app/api/seed-leads/route.ts` | 136 | — |
| `apps/admin/src/app/api/templates/[id]/route.ts` | 36 | — |
| `apps/admin/src/app/api/templates/route.ts` | 42 | — |
| `apps/admin/src/app/api/templates/upload/route.ts` | 71 | — |
| `apps/admin/src/app/billing/page.tsx` | 179 | BILLING LEDGER (#295 invoices/receipts · #296 refunds · #297 renewals). |
| `apps/admin/src/app/clients/CloneBestClientButton.tsx` | 89 | Step 1: find the best client |
| `apps/admin/src/app/clients/[id]/page.tsx` | 443 | — |
| `apps/admin/src/app/clients/page.tsx` | 422 | — |
| `apps/admin/src/app/cockpit/page.tsx` | 420 | ── Action Queue: at-risk clients are REAL (from /admin/churn-risk); the trigger |
| `apps/admin/src/app/compliance/page.tsx` | 312 | — |
| `apps/admin/src/app/founder/page.tsx` | 170 | — |
| `apps/admin/src/app/gtm/page.tsx` | 193 | M3 · Admin GTM hub (#278 + #291). Strategy · Results · Winning plays · Content |
| `apps/admin/src/app/health/page.tsx` | 370 | #279 — deliverability timeseries (real, from /admin/deliverability/timeseries) |
| `apps/admin/src/app/money-path/CapEditor.tsx` | 81 | Founder action — edit the global monthly PDL budget. PATCHes through the admin |
| `apps/admin/src/app/money-path/DemoToggle.tsx` | 59 | #453 — founder action: flag/unflag a client as a demo account. PATCHes through the |
| `apps/admin/src/app/money-path/page.tsx` | 282 | THE MONEY PATH (#448 / #449 p1-2) — admin view over the sourcing economy. Reads the |
| `apps/admin/src/app/ops/page.tsx` | 90 | M3 · Admin Ops (#280). Inbox pool management + Onboarding ops. |
| `apps/admin/src/app/outreach/OutreachBoard.tsx` | 198 | The editable weekly grid + the "what's working" verdict (cashflow §7B). Each cell |
| `apps/admin/src/app/outreach/page.tsx` | 76 | FOUNDER OUTREACH SCOREBOARD (cashflow §7B) — type your real weekly numbers, and after |
| `apps/admin/src/app/revenue/MrrOverTime.tsx` | 152 | #287 — MRR over time + movement (new / churned / expansion / contraction). |
| `apps/admin/src/app/revenue/page.tsx` | 484 | Revenue-at-risk: at-risk clients from the churn engine (same source as the cockpit). |
| `apps/admin/src/app/unibox/page.tsx` | 224 | — |
| `apps/admin/src/components/ClientsTabs.tsx` | 45 | Clients hub tab bar (#281) — folds the formerly-loose sidebar rows |
| `apps/admin/src/components/MarkdownLite.tsx` | 124 | MarkdownLite — a tiny, zero-dependency markdown renderer. |
| `apps/admin/src/components/ReplyForm.tsx` | 69 | — |
| `apps/admin/src/components/ui.tsx` | 162 | Admin UI kit — one source of truth for the preview look. |
| `apps/admin/src/lib/fx.ts` | 54 | Single source of truth for ZAR→USD conversion. |
| `apps/admin/src/lib/revenue-exclusions.ts` | 54 | ───────────────────────────────────────────────────────────────────────────── |
| `apps/admin/src/lib/supabase/client.ts` | 8 | — |
| `apps/admin/src/lib/supabase/server.ts` | 34 | called from a Server Component — safe to ignore (middleware refreshes the session) |
| `apps/admin/src/middleware.ts` | 98 | #308 — the admin OS had NO authentication: every page and the key-injecting |

## PACKAGES — db + shared — 5 files, 265 lines

| File | Lines | What it does |
|---|---:|---|
| `packages/db/src/client.ts` | 20 | Node 20 has no native WebSocket. Supabase Realtime needs it before createClient runs. |
| `packages/db/src/index.ts` | 1 | — |
| `packages/shared/src/constants/index.ts` | 82 | ───────────────────────────────────────────────────────────────────────────── |
| `packages/shared/src/index.ts` | 2 | — |
| `packages/shared/src/types/index.ts` | 160 | — |

---

## Regenerating

```
python3 scripts/build-core-map.py     # rewrites scripts/core-files.txt
```

Re-run it whenever a new entry point appears (a new Vida page, a new mounted route) or an integration lands. If the file count moves and nobody added a feature, that is worth understanding rather than accepting.
