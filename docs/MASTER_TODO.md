# K.I.N.D — MASTER TO-DO (consolidated)

> Single source of truth for everything outstanding, compiled 6 Jun 2026.
> Owner key: 🧍 Founder · 🤖 Claude · 🤝 Both. Status: ⬜ TODO · ⏳ IN PROGRESS · ✅ DONE.
> Pulls together: weekend smoke test, this-session findings, cosmetic backlog,
> V2 builds, and the full EVERYTHING.md roadmap.

---

## A. 🔴 IMMEDIATE — finish the weekend smoke test

### A0. Cleanup from the lead-sourcing bug hunt (do FIRST)
| # | Item | Owner | Status |
|---|------|-------|--------|
| A0.1 | Strip debug lines from ICP banner (`diag ·`, `body:`) — must be gone before clients see them | 🤖 | ⬜ |
| A0.2 | Remove API startup `BUILD MARKER` line | 🤖 | ⬜ |
| A0.3 | Fix the deploy pipeline — `KIND System Audit` GitHub check fails on every push and blocks Railway auto-deploy; Railway needed a manual reconnect. Fix the audit so deploys flow automatically | 🤝 | ⬜ |

### A1. Smoke test — remaining steps (`docs/SMOKE_TEST.md`)
| # | Item | Owner | Status |
|---|------|-------|--------|
| A1.1 | **Test 1** — signup gate: abandon-onboarding redirect, logout/login persistence | 🧍 | ⬜ |
| A1.2 | **Test 2** — ✅ ICP → leads sourced + charged (PASSED 6 Jun). Still: 2nd-ICP "Set active" re-sources; CSV export only delivered leads | 🧍 | ⏳ |
| A1.3 | **Test 3** — FIGSY: create campaign, enrol test emails, trigger send from `hello@get-kind.com` w/ booking link, reply → 🔥 hot + sequence paused, paused-campaign stops sending | 🧍 | ⬜ |
| A1.4 | **Test 4** — Booking: connect Google Cal / "Mark as booked" → `meetings_booked` increments | 🧍 | ⬜ |
| A1.5 | **Test 5** — Billing: Stripe bundle (single-charge), webhook idempotency, Milla subscribe → API 403 for non-subscriber | 🧍 | ⬜ |
| A1.6 | **Test 6** — Vida widget: embed renders, purple not blue, replies, captures lead | 🧍 | ⬜ |
| A1.7 | **Test 7** — Milla cron hygiene: non-Milla client gets no morning-brief/anomaly emails | 🧍 | ⬜ |
| A1.8 | Fix any smoke-test failures same-day | 🤖 | ⬜ |

---

## B. 🟠 PRE-LAUNCH — before Monday (from EVERYTHING.md "THIS WEEK")
| # | Item | Owner | Status |
|---|------|-------|--------|
| B1 | **Rotate exposed credentials — TIER 0.** Apollo key rotated 6 Jun ✅. Still: `STRIPE_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `SUPABASE_ANON_KEY`, `ANTHROPIC_API_KEY`, `RESEND_API_KEY`, `RESEND_WEBHOOK_SECRET`, `HUBSPOT_API_KEY`, `ADMIN_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | 🧍 | ⏳ |
| B2 | Move `FEATURE_PORTAL_V2=true` API → Portal service | 🧍 | ⬜ |
| B3 | Denise go-live: create $99/mo Stripe price → `STRIPE_PRICE_DENISE_MONTHLY` on Railway | 🧍 | ⬜ |
| B4 | Run migration `010_crm_dedup.sql` | 🧍 | ⬜ |
| B5 | DNS: `app`/`api`/`admin`/`status`.get-kind.com → then update `NEXT_PUBLIC_API_URL` + Resend webhook | 🧍 | ⬜ |
| B6 | Confirm Calendly `kind-ai-demo/new-meeting` live | 🧍 | ⬜ |
| B7 | **Reconcile DB schema drift** — `product_type` is a Postgres ENUM in prod but text+CHECK in repo migrations | 🤝 | ⬜ |
| B8 | Free cloud + AI credits (Microsoft for Startups, Google for Startups, AWS Activate) | 🧍 | ⬜ |
| B9 | Swap all 4 agent images to Pixar-3D animated (verify FIGSY/Milla/Vida/Denise consistent) | 🤝 | ⬜ |

### B-Legal (before launch)
| # | Item | Owner | Status |
|---|------|-------|--------|
| BL1 | ICO registration — ico.org.uk £40/yr | 🧍 | ⬜ |
| BL2 | SR01 home-address suppression (free) | 🧍 | ⬜ |
| BL3 | Registered office + director service address (~£20–50/yr) | 🧍 | ⬜ |
| BL4 | Domain WHOIS privacy verify | 🧍 | ⬜ |
| BL5 | LinkedIn lockdown / anonymous brand-only; founder stays invisible | 🧍 | ⬜ |
| BL6 | SEIS advance assurance (free, draft ready) | 🧍 | ⬜ |

### B-Launch
| # | Item | Owner | Status |
|---|------|-------|--------|
| B-MON | **MON — LAUNCH both markets (US + Africa), multiple campaigns** | 🤝 | ⬜ |

---

## C. 🎨 COSMETIC — batch after smoke test (logged this session)
| # | Item | Owner | Status |
|---|------|-------|--------|
| C1 | Sidebar: move **ICP Builder above People** in Lead Gen section | 🤖 | ⬜ |
| C2 | **Agent cards** — standardise length + layout across all agents | 🤖 | ⬜ |
| C3 | ICP preview banner — show "20,000+ available · we deliver your 20/run" instead of raw scary count | 🤖 | ⬜ |
| C4 | **Agent panel** — every agent (Milla, Vida, Denise) uses the FIGSY layout: large Pixar portrait, name+role, suggestion chips, intro message, "Ask … anything" input | 🤖 | ⬜ |
| C5 | **Signup screen** — ClickUp-style: "Seconds to sign up!", Continue with Google, clean name/email/password, marketing-consent checkbox + Terms/data-transfer-outside-UK consent | 🤖 | ⬜ |

---

## D. 🟣 V2 BUILDS — Month 2 portal upgrade (`docs/portal-v2-preview.html`)
| # | Concept | Priority | Status |
|---|---------|----------|--------|
| D1 | Agent card grid (dashboard home) — Pixar avatars, status, last activity | High | ⬜ |
| D2 | Agent thinking/working state — live step progress | High | ⬜ |
| D3 | Conversational agent setup — chat-style ICP/campaign builder | Medium | ⬜ |
| D4 | Structured agent config panel — Role/ICP/Tone/Schedule/Knowledge | Medium | ⬜ |
| D5 | Agent marketplace — "Meet your AI Revenue Team", one-click activate | Month 3 | ⬜ |
| D6 | Slim sidebar + top-right header — profile dropdown (Usage/Billing/Settings/Team/API) | High | ⬜ |
| D7 | Invite teammate (header + modal) — growth loop | High | ⬜ |
| D8 | AI Notetaker → action items (Milla) — transcript in, owners+deadlines out | Critical | ⬜ |
| D9 | Teams Hub — create teams, members, who's active, per-person agent usage | Critical | ⬜ |

---

## E. 🟡 POST-LAUNCH ROADMAP (from EVERYTHING.md)

### E1. Week 1 post-launch
| # | Item | Owner |
|---|------|-------|
| E1.1 | 10 warm outreach messages (network) | 🧍 |
| E1.2 | LinkedIn content 1/day via anonymous brand handle | 🧍 |
| E1.3 | Activate LinkedIn outreach — run `20260602_linkedin_queue.sql` + PhantomBuster keys | 🧍 |
| E1.4 | Start Meta/WhatsApp Business API application (3–7 day window) | 🧍 |
| E1.5 | Record real product demo ("shoot once, cut many", 16:9 + 9:16) | 🧍 |
| E1.6 | Replace homepage hero animation with real product loop (blocked on E1.5) | 🤝 |
| E1.7 | Instrument GTM funnel (channel→reply→demo→close, CAC, trial→paid) | 🤝 |
| E1.8 | Activate dogfood self-outreach engine + point FIGSY at competitor-switcher ICP | 🧍 |

### E2. Weeks 2–4
| # | Item | Owner |
|---|------|-------|
| E2.1 | Open 2 design-partner slots (case study + logo) | 🧍 |
| E2.2 | Cut social content from demo footage (9:16) | 🤝 |
| E2.3 | Record 3 onboarding Loom videos | 🧍 |
| E2.4 | Onboarding v2 + day-0/3/7 email sequence | 🤖 |
| E2.5 | Populate proof block with real dogfood numbers (no fabrication) | 🤖 |
| E2.6 | Activate Flutterwave (needs key — ZAR/NGN/KES/GHS) | 🧍 |
| E2.7 | Launch YouTube channel (10-video plan exists) | 🧍 |
| E2.8 | Wire playbook email form (needs ConvertKit/Mailchimp) | 🤝 |
| E2.9 | Performance guarantee clause in terms.html (define "qualified meeting", refund mechanics) | 🤝 |
| E2.10 | Atlas/Revio steals: influencer/community distribution (SA + US); coaching "Revenue Playbook Session" in onboarding | 🧍 |

### E3. Month 2 — intelligence layer (10+ clients)
Intent signal detection · A/B subject testing · client morning-brief email · ICP auto-refinement · conditional sequence branching · waterfall enrichment (Apollo→PDL→Hunter→Clearbit) · deliverability dashboard (SPF/DKIM/DMARC) · email score pre-send · adaptive send volume · **FIGSY Memory v2 (pgvector)** · Milla full-context CRM · Vapi voice · Product Hunt · G2 listing · configurable agent triggers · multi-model toggle · inbox rotation / multiple sending domains · **MCP server (pulled fwd from M3 — distribution unlock)**.
- **Data floor (the moat):** keep the append-only `outcome_events` log at full fidelity (✅ built; capture send/reply/opt_out/meeting_booked).

### E4. Month 3 — agent family + platform
**DENISE (the closer — #1 build after launch stabilises):** Calendly auto-book · call-join transcription (notetaker) · live objection extraction · proposal draft from transcript · pipeline follow-up sequencer · persona/system prompt · admin identity card.
Then: LENA · OTTO · multi-agent orchestration (shared memory) · 500+ FIGSY skill library · MCP server · **outcome pricing (#60 — GATED on margin data, ≥28% gross floor)** · mobile app · built-in CRM/Kanban · pan-African design partners · cross-client intelligence · data licensing · pipeline forecasting · in-portal messaging · proposal + e-sign · meeting notetaker.

### E5. Year 2 — certifications + enterprise
ISO 27001 · ISO 42001 (AI governance) · SOC 2 Type II (Vanta) · 3-type memory model · visitor de-anonymisation · churn-risk scoring · revenue forecasting · call intelligence.

---

## F. ⚖️ LEGAL & COMPLIANCE (4 rings — ongoing)
- **Ring 1 (Corporate/Personal):** SR01 · registered office · WHOIS · LinkedIn lockdown · D&O insurance (~£500–1k/yr, M2).
- **Ring 2 (Data):** ICO £40 (pre-launch) · ODPC Kenya / NDPR (first NG/KE client).
- **Ring 3 (InfoSec):** rotate TIER 0 creds · AI Risk Register (free, start now) · pen test (~£2–5k, M3) · SOC2/ISO (Y2).
- **Ring 4 (Contract/IP):** SEIS advance assurance (free) · trademarks K.I.N.D+FIGSY+Milla+Vida (~£320, M2–3) · VAT at £90k · annual confirmation statement.

---

## G. 🧰 KNOWN ISSUES / TECH DEBT (from this session)
| # | Item | Owner | Status |
|---|------|-------|--------|
| G1 | Deploy pipeline: `KIND System Audit` check fails on every push; Railway auto-deploy unreliable, needed manual reconnect | 🤝 | ⬜ |
| G2 | DB schema drift: `product_type` ENUM (prod) vs text+CHECK (repo) | 🤝 | ⬜ |
| G3 | Apollo integration hardening: `q_keywords`/`tech_stack` no longer dumped into literal search; consider a validated keyword/tech picker for power users | 🤖 | ⬜ |
| G4 | Conversational ICP builder emits prose keywords + non-standard company-size labels — now defended in `buildSearchBody`; consider tightening the builder prompt | 🤖 | ⬜ |
| G5 | Remove temporary preview-count diagnostics once stable (ties to A0.1) | 🤖 | ⬜ |
| G6 | Admin proxy hardcoded URL fix (deferred) | 🤖 | ⬜ |
| G7 | Commit signing — stop-hook warns commits show as Unverified | 🧍 | ⬜ |

---

## H. ⏸ BLOCKED — needs credentials only (no build)
Milla/Vida Stripe price IDs · Flutterwave key · HubSpot key · Vapi voice · WhatsApp (Meta approval) · Google Calendar OAuth · Clearbit · PhantomBuster (LinkedIn) · Cloudflare CDN failover · Render standbys + UptimeRobot.
