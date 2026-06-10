# 🗺️ K.I.N.D — LAUNCH MAP (the single critical-path view)

**Purpose:** every aspect in one place — what's done, what's open, who owns it, when.
**Launch target:** Fri 19 Jun. **Branch:** `claude/kind-carson-MYhSl` (all work below is here, **nothing is live**).
**Owners:** 🧍 founder · 🤖 Claude · 🤝 both. _Last updated: 10 Jun 2026._

---

## 0) THE GATE (the one rule)

**Nothing reaches the live client site until the founder says "go live."**
Flow for every change: build on branch → `next build` verify → founder reviews → **founder says "go live"** → merge to `main` → smoke test.
Current state: **everything this session is on the branch, build-verified, NOT merged.** The website deploys separately (Cloudflare) — also gated on "go live."

---

## 1) STATUS BOARD — audit fixes (all on the branch, build-verified)

| Area | Item | Status |
|------|------|--------|
| Client portal | Meetings "No data yet" subtitle (Y11) | ✅ |
| Client portal | Leads tab pills count real totals (Y4) | ✅ |
| Client portal | campaign↔leads cross-links, both directions (Y5) | ✅ |
| Client portal | Denise gates on subscription (Y7) | ✅ |
| Client portal | developer MCP catalog matches real tools (Y8) | ✅ |
| Client portal | roadmap now admin-only, clients can't reach it (Y9) | ✅ |
| Client portal | Milla dead "Connect" → "Coming soon" (Y10) | ✅ |
| Client portal | Knowledge/DNC honest preview, no fake rows (R4) | ✅ |
| Website | demo stats labelled "Illustrative" + comparatives dropped (R5) | ✅ |
| API | rate-limit signup/demo-request/subscribe/unsubscribe (Y1) | ✅ |
| API | atomic credit deduction (Y2) | ✅ |
| API | counter-drift bug class killed: recompute-from-source + autopilot crons reconcile-then-decide (Y3 + data-integrity pass) | ✅ |
| Ops docs | failover-doc security fix · key-rotation runbook · restore runbook · D9 deliverability checklist | ✅ |

**Deferred by founder decision (post-launch):** Y6 settings server-persistence · Y15 money-path tests.

---

## 2) RISK REGISTER (ranked, with live status)

| # | Risk | Sev | Status / owner |
|---|------|-----|----------------|
| 1 | **Apollo single-source** (discovery is Apollo-only; ~50-client reselling line; 100+ = key termination kills it for everyone) | 🔴 (later) | Open. Mitigation = multi-source (§4). 🧍 PDL key + Apollo relationship · 🤖 wires |
| 2 | **Rotate 2 keys** (Stripe secret + Supabase service-role) — 4-Jun exposure | 🔴 | Open. Runbook ready → 🧍 this week |
| 3 | **Deliverability D9** (10/10 inbox) | 🟡 | Open. Code ✅, env+DNS → 🧍 before 19th. Checklist ready |
| 4 | **Smartsheet / DNC placeholder** | 🟡 | ✅ code scrubbed. Legal risk accepted (🧍) |
| 5 | **Legal deadlines** (ICO £40 this week; D&O + trademarks Month-2) | 🟡 | Open → 🧍 |
| 6 | **SPOF / failover** (all on Railway; standby may drift; env-var contradiction) | 🟡 | Doc contradiction ✅ fixed. Standby parity → 🧍 verifies |
| 7 | **No rate limiting** | 🟡 | ✅ DONE (Y1) |
| 8 | **Credit/ledger drift** | 🟢 | ✅ DONE (Y2) |
| 9 | **Shared Apollo key + prod DB for demos** | 🟢 | Open → post-launch (staging DB, Batch 2) |

---

## 3) FOUNDER ACTION LIST (everything that needs you)

### 🔴 A. Launch-critical — this week (the ONLY hard blockers for the 19th)
- **A1. Rotate the 2 keys** — `docs/legal/key-rotation-runbook.md`. _Service-role on BOTH api + admin; Stripe api-only._
- **A2. ICO registration** — ico.org.uk, £40, ~10 min.
- **A3. D9 deliverability → 10/10** — `docs/DELIVERABILITY-D9-CHECKLIST.md` (verify `FIGSY_COLD_FROM` + SPF/DKIM/DMARC, run mail-tester).
- **A4. Say "go live"** — after reviewing the branch, so 🤖 merges to main + ships the website.
- **A5. Smoke tests ST1/ST2** — verify the real loop after go-live.

### 🟠 B. Unblocks 🤖 — when you can
- **B1. Get a free-tier PDL key** → 🤖 wires the 2nd lead-discovery source (kills the single-source risk for ~$0). Optional Hunter key → enrichment waterfall.
- **B2. Verify Render standby env parity** — `docs/legal/restore-runbook.md` + `portal-admin-failover.md`.

### 🟡 C. Apollo relationship — watch & trigger
- **C1. Email partnerships@apollo.io before ~client 50** (proactively at ~20–30). Secure partner agreement OR client-key structure.

### 🟢 D. Post-launch / Month 2
- **D1. D&O insurance** (~£500–1k) + **trademarks** (UK IPO → ARIPO).
- **D2. Staging/demo Supabase DB** (🤖 preps, 🧍 creates project).
- **D3. Supabase Pro** (PITR, better RPO) once there's client data.

---

## 4) DATA-SOURCE / APOLLO MAP

**The cap = CLIENTS, not leads.** ~50 active clients served from one Apollo account triggers a likely reselling review; ~100+ unresolved risks key termination. _Leads produced_ is a separate **credit/quota** line — you just buy more credits, no ToS risk. **The 50/100 are K.I.N.D's own estimate in `legal.md`, not Apollo's published rule.**
**Demo note:** Showcase Demo (seeded data) does NOT hit Apollo — keep demos seeded to stay off the counter. Live-ICP demos DO count toward the pattern.

| Step | Trigger | Action | Owner | Cost |
|------|---------|--------|-------|------|
| 0 | Now | Apollo-only. Decide structure: (a) Apollo partner/reseller agreement OR (b) clients bring own Apollo key | 🧍 decide | $0 |
| 1 | Now | Add free-tier **PDL** (+ Hunter) key → 🤖 wires enrichment waterfall + **PDL as 2nd discovery source** (dormant hedge) | 🧍 key · 🤖 | ~$0 |
| 2 | First paying clients (~5–10) | Monitor Apollo credit burn; right-size plan; turn on real PDL/Hunter usage only if needed | 🤝 | $50–200/mo if used |
| 3 | ~20–30 clients | Proactively email Apollo partnerships; lock structure (a)/(b); budget paid 2nd source | 🧍 | — |
| 4 | ~50 clients | **HARD LINE** — structure resolved before crossing | 🧍 | — |
| 5 | 100+ clients | Fully diversified / partnered | 🤝 | reseller tier if chosen |

**Pending:** deep-research Apollo's actual 2026 ToS to replace the 50/100 estimate with their real terms.

---

## 5) DECISIONS PENDING (founder)
- **Key-rotation scope:** 2 crown-jewels only, or all ~9 keys from the 4-Jun incident?
- **Apollo ToS research:** run it now to harden the 50/100 numbers? (recommended)
- **PDL key:** get the free-tier key so 🤖 can wire Step 1?

---

## 6) POST-LAUNCH ROADMAP (sequenced — from the tracker)
**P0 Launch** (now→19th: proven loop) → **P1 Company Engine #88** (~30 Jun: per-rep model) → **P2 V2 Experience** (July: Vida bubble · Casey · Notetaker · dashboards · Integrations Hub · Sequence Builder · Smart Inbox) → **P3 Intelligence/Moat** (M2+: MCP · Memory v2 · ICP-that-learns).

---

**Bottom line:** the only hard blockers to the 19th are **A1–A5** (yours). Everything else is done on the branch, waiting on a key, or post-launch.
