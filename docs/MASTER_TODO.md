# K.I.N.D — MASTER TO-DO (consolidated, cross-referenced)

> Single source of truth, compiled + reconciled 6 Jun 2026 against the full day's
> work and EVERYTHING.md. Owner: 🧍 Founder · 🤖 Claude · 🤝 Both.
> Status: ⬜ TODO · ⏳ IN PROGRESS · ✅ DONE · 🚫 DELIBERATELY NOT DOING.

---

## 0. ✅ COMPLETED TODAY (6 Jun) — do not redo

- **HTTPS enforced** — `middleware.ts` 308-redirects http→https via `x-forwarded-proto`; `auth/callback` uses forwarded host/proto. Padlock confirmed. (Earlier today.)
- **3 portal bugs fixed** — FIGSY archive 404 (→PATCH), save-settings wrong method/field (→PATCH + `review_required`), ICP suggest JSON-fence crash.
- **Dogfood account live** — hello@get-kind.com: 999,999 credits (both pools), all 4 agents active to 2099, no trial banner. (EVERYTHING.md items 3 & 4 = ✅.)
- **🔑 Apollo key rotated** — the live master key was pasted in chat (TIER-0 exposure) → regenerated. New key live on Railway.
- **Apollo lead sourcing FIXED — 7 stacked issues, all verified live (72k+ pool):**
  1. industries → `q_organization_keyword_tags` (was literal `q_keywords` → near-zero)
  2. tolerant company-size mapping (`toEmployeeRange`) — handles AI-emitted "2–10" etc.
  3. preview count reads `total_entries` (was `pagination.total_entries` → always 0)
  4. endpoint `/mixed_people/api_search` (old `/mixed_people/search` → 422 deprecated)
  5. base URL `/api/v1` (bare `/v1` = internal API → 200-with-0)
  6. **`q_keywords` prose dump removed** — builder emitted "manual outreach pipeline building…" → 0
  7. `tech_stack` dropped from search (auto-gen junk, not valid Apollo UIDs)
- **Run-result banner rendered** — was computed but never shown.
- **Smoke Test 1 · T2 (steps 5–7) PASSED** — ICP built, real leads sourced into People, credits dropped. *(This is one slice of one test in Pass 1 — the rest of Smoke Test 1 and all of Smoke Test 2 are still outstanding, see A1/A2.)*
- **Deploy pipeline root cause found** — `KIND System Audit` CI fails every push; Railway auto-deploy unreliable; required manual GitHub disconnect/reconnect to pull `main`.
- **Docs** — `portal-v2-preview.html` (9 concepts), `portal-v2-layout.md`, this `MASTER_TODO.md`, EVERYTHING.md synced.

---

## 0b. 🚫 DELIBERATE DECISIONS — do NOT do these (and why)

| Item | Why NOT | 
|------|---------|
| **Enable `FEATURE_PORTAL_V2=true`** | ⚠️ The flag swaps the live portal for a **dormant, incomplete V2 build** (EVERYTHING.md line 312). It would break the exact V1 flow we just tested and fixed. **Launch on V1.** The V2 *redesign* (section D) is new Month-2 work, unrelated to this dead flag. → Recommend deleting the dormant V2 + flag during Wednesday cleanup so it can't be flipped by accident. |
| Send `tech_stack` to Apollo search | Auto-generated values ("Email outreach tools", "CRM") aren't valid Apollo UIDs → zeroes the search. Dropped on purpose. |
| Put `icp.keywords` in literal `q_keywords` | Builder emits descriptive prose → literal full-text match → 0 results. Removed on purpose. |
| Upgrade the Apollo plan | Basic plan is fine — today's 0-results was an endpoint/key/query bug, not a plan limit. No upgrade needed. |
| Build outcome pricing (#60) now | Gated pre-revenue — needs real margin data (≥28% gross floor). Decision stands. |
| Build memory smart layers (pgvector / L2–L4) | Worthless below ~10 clients; capture raw `outcome_events` now, build smart layers at volume. |
| Chase funding now | Bootstrap to traction first (20–30 paying clients), then decide from leverage. |
| Will-not-build list | Collaborative docs · whiteboards · self-hosted · custom emoji · internal team chat · multi-year contracts · 50+ data sources · African-language (all parked per EVERYTHING.md Part 6). |

---

## A. 🔴 IMMEDIATE — finish the weekend smoke test

### A0. Cleanup from today's bug hunt (do FIRST)
| # | Item | Owner | Status |
|---|------|-------|--------|
| A0.1 | Strip debug lines from ICP banner (`diag ·`, `body:`) — must be gone before clients see them | 🤖 | ⬜ |
| A0.2 | Remove API startup `BUILD MARKER` line | 🤖 | ⬜ |
| A0.3 | Fix deploy pipeline — repair/neutralise the failing `KIND System Audit` check so Railway auto-deploys `main` (no more manual reconnect) | 🤝 | ⬜ |
| A0.4 | Tighten the conversational ICP-builder prompt so it stops emitting prose keywords + non-standard size labels (defended in code, but fix at source) | 🤖 | ⬜ |

### A1. SMOKE TEST 1 — first full pass (Saturday, 57-step `docs/SMOKE_TEST.md`)
> Status: barely started. Only the ICP-build + lead-sourcing slice of Test 2 is done.
> **Test 1 was NOT run** — we used the pre-set-up dogfood account and started from the
> dashboard, so fresh signup / onboarding / gate has never been exercised.

| Test | Steps | What it proves | Status |
|------|-------|----------------|--------|
| **T1 — Signup → Onboarding → gate** | 1–4 | Fresh signup lands on `/onboard`; onboarding completes → dashboard, 20 credits; abandon-onboarding redirects back; logout/login persists | ⬜ **NOT DONE** (skipped — used dogfood) |
| **T2 — ICP → Leads** | 5–9 | 5 Suggest-AI ✅ · 6 Find Leads appear+scored ✅ · 7 credits drop ✅ · 8 2nd ICP "Set active" re-sources ⬜ · 9 CSV exports only delivered leads ⬜ | ⏳ **PARTIAL** (5–7 ✅, 8–9 ⬜) |
| **T3 — FIGSY → reply → hot** | 10–13 | Campaign + enrol test emails; send from `hello@get-kind.com` w/ booking link; reply → 🔥 hot + sequence paused; paused campaign stops sending | ⬜ NOT DONE |
| **T4 — Booking + KPI** | 14 | Google Cal / "Mark as booked" → `meetings_booked`++ | ⬜ NOT DONE |
| **T5 — Billing** | 15–17 | Stripe bundle single-charge · webhook idempotency · Milla subscribe → non-sub 403 | ⬜ NOT DONE |
| **T6 — Vida widget** | 18 | Embed renders · purple not blue · replies · captures lead | ⬜ NOT DONE |
| **T7 — Milla/cron hygiene** | 19 | Non-Milla client gets no morning-brief/anomaly emails | ⬜ NOT DONE |
| **Fixes** | — | Claude fixes any failures same-day | 🤖 ⬜ |

### A2. SMOKE TEST 2 — second full pass (Sunday)
| # | Item | Owner | Status |
|---|------|-------|--------|
| A2.1 | Re-run **all** of T1–T7 to confirm Pass-1 fixes held — green on every front | 🧍 | ⬜ NOT STARTED |
| A2.2 | Fix any new failures same-day | 🤖 | ⬜ |

---

## B. 🟠 PRE-LAUNCH — before Monday
| # | Item | Owner | Status |
|---|------|-------|--------|
| B1 | **Rotate remaining TIER-0 creds** (Apollo ✅ done today). Still: `STRIPE_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `SUPABASE_ANON_KEY`, `ANTHROPIC_API_KEY`, `RESEND_API_KEY`, `RESEND_WEBHOOK_SECRET`, `HUBSPOT_API_KEY`, `ADMIN_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | 🧍 | ⏳ |
| B2 | Denise go-live: $99/mo Stripe price → `STRIPE_PRICE_DENISE_MONTHLY` on Railway | 🧍 | ⬜ |
| B3 | Run migration `010_crm_dedup.sql` | 🧍 | ⬜ |
| B4 | DNS: `app`/`api`/`admin`/`status`.get-kind.com → then update `NEXT_PUBLIC_API_URL` + Resend webhook | 🧍 | ⬜ |
| B5 | Confirm Calendly `kind-ai-demo/new-meeting` live | 🧍 | ⬜ |
| B6 | **Reconcile DB schema drift** — `product_type` ENUM (prod) vs text+CHECK (repo) | 🤝 | ⬜ |
| B7 | **Verify** all 4 agent images are Pixar-3D (FIGSY confirmed Pixar by founder; check Milla/Vida/Denise — only swap any that are photoreal) | 🤝 | ⬜ |
| B8 | Free cloud + AI credits (Microsoft/Google/AWS) | 🧍 | ⬜ |
| ~~B-x~~ | ~~Move `FEATURE_PORTAL_V2=true`~~ → **REMOVED — see 0b. Would break the working portal.** | — | 🚫 |

### B-Legal (before launch)
ICO £40 · SR01 suppression · registered office + service address · WHOIS privacy · LinkedIn lockdown (founder invisible) · SEIS advance assurance (free, draft ready). — all 🧍 ⬜

### B-Launch
**MON — LAUNCH both markets, multiple campaigns** — 🤝 ⬜

---

## C. 🎨 COSMETIC — batch after smoke test (logged today)
| # | Item | Owner | Status |
|---|------|-------|--------|
| C1 | Sidebar: **ICP Builder above People** | 🤖 | ⬜ |
| C2 | **Agent cards** — consistent length + layout across all agents | 🤖 | ⬜ |
| C3 | ICP banner — "20,000+ available · we deliver your 20/run" instead of raw count | 🤖 | ⬜ |
| C4 | **Agent panel** — every agent (Milla/Vida/Denise) uses the FIGSY layout (portrait, role, chips, intro, input) | 🤖 | ⬜ |
| C5 | **Signup screen** — ClickUp-style: "Seconds to sign up!", Continue with Google, clean fields, marketing + data-transfer-outside-UK consent checkboxes | 🤖 | ⬜ |

---

## D. 🟣 V2 BUILDS — Month 2 portal redesign (`docs/portal-v2-preview.html`)
> NB: this is a **new redesign**, NOT the dead `FEATURE_PORTAL_V2` flag (see 0b).

| # | Concept | Priority |
|---|---------|----------|
| D1 | Agent card grid (dashboard home) | High |
| D2 | Agent thinking/working state | High |
| D3 | Conversational agent setup | Medium |
| D4 | Structured agent config panel (Role/ICP/Tone/Schedule/Knowledge) | Medium |
| D5 | Agent marketplace ("Meet your AI Revenue Team") | Month 3 |
| D6 | Slim sidebar + top-right header (profile dropdown) | High |
| D7 | Invite teammate (growth loop) | High |
| D8 | AI Notetaker → action items (Milla) | Critical |
| D9 | Teams Hub (members, activity, per-person usage) | Critical |

---

## E. 🟡 POST-LAUNCH ROADMAP (from EVERYTHING.md)

**E1 — Week 1:** 10 warm outreach · LinkedIn 1/day (anon brand) · activate LinkedIn outreach (PhantomBuster + SQL) · WhatsApp Business API application · record real demo · replace hero animation · instrument GTM funnel · dogfood self-outreach engine.

**E2 — Weeks 2–4:** 2 design-partner slots · social cuts from demo · 3 onboarding Looms · onboarding v2 + day-0/3/7 emails · real proof numbers · Flutterwave · YouTube · playbook email form · perf-guarantee terms clause · Atlas/Revio steals (influencer distribution + coaching session).

**E3 — Month 2 (10+ clients, intelligence layer):** intent signals · A/B subjects · client morning brief · ICP auto-refine · conditional branching · waterfall enrichment · deliverability dashboard · email pre-send score · adaptive send volume · **FIGSY Memory v2 (pgvector)** · Milla full-context CRM · Vapi voice · Product Hunt · G2 · configurable triggers · multi-model toggle · inbox rotation · **MCP server (pulled fwd — distribution unlock)**. Keep the append-only `outcome_events` data floor at full fidelity (✅ built).

**E4 — Month 3:** **DENISE first** (Calendly auto-book · notetaker transcription · live objection extraction · proposal draft · pipeline follow-up · persona prompt · admin card) → then LENA · OTTO · multi-agent orchestration · 500+ skill library · **outcome pricing #60 (GATED)** · mobile app · built-in CRM/Kanban · pan-African partners · cross-client intelligence · data licensing · forecasting · in-portal messaging · proposal+e-sign.

**E5 — Year 2:** ISO 27001 · ISO 42001 · SOC 2 (Vanta) · 3-type memory · visitor de-anon · churn scoring · revenue forecasting · call intelligence.

---

## F. ⚖️ LEGAL & COMPLIANCE (4 rings)
- **R1 Corporate/Personal:** SR01 · registered office · WHOIS · LinkedIn lockdown · D&O insurance (~£500–1k, M2).
- **R2 Data:** ICO £40 (pre-launch) · ODPC Kenya/NDPR (first NG/KE client).
- **R3 InfoSec:** rotate TIER-0 (Apollo ✅) · AI Risk Register (free, now) · pen test (M3) · SOC2/ISO (Y2).
- **R4 Contract/IP:** SEIS (free) · trademarks K.I.N.D+FIGSY+Milla+Vida (~£320, M2–3) · VAT at £90k · annual confirmation statement.

---

## G. 🧰 TECH DEBT / KNOWN ISSUES (from today)
| # | Item | Owner |
|---|------|-------|
| G1 | Deploy pipeline: `KIND System Audit` fails every push; Railway needs manual reconnect (ties to A0.3) | 🤝 |
| G2 | DB schema drift: `product_type` ENUM vs text+CHECK (ties to B6) | 🤝 |
| G3 | Delete dormant Portal-V2 build + `FEATURE_PORTAL_V2` flag so it can't be enabled by accident | 🤝 |
| G4 | Apollo: consider a validated keyword/tech picker for power users (currently dropped) | 🤖 |
| G5 | Remove preview-count diagnostics once stable (ties to A0.1) | 🤖 |
| G6 | Admin proxy hardcoded URL fix (deferred) | 🤖 |
| G7 | Commit signing — commits show Unverified (stop-hook warns) | 🧍 |

---

## H. ⏸ BLOCKED — needs credentials only (no build)
Milla/Vida Stripe price IDs · Flutterwave · HubSpot · Vapi · WhatsApp (Meta) · Google Calendar OAuth · Clearbit · PhantomBuster · Cloudflare CDN · Render standbys + UptimeRobot.
