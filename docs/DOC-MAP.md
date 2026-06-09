# 🗺️ K.I.N.D — DOC MAP (full audit · every doc accounted for)

**Purpose:** one place that lists every doc in the repo, what it's for, and whether it's authoritative, reference, design, or superseded. **So nothing is lost.**
_Audited 9 Jun 2026. Re-run when docs are added._

## ✅ How you can be sure nothing is lost
The docs form a **clean supersession chain** — every old "master" file explicitly points forward:
`MASTER.md (4 Jun, archive)` → `docs/EVERYTHING.md (8 Jun, superseded)` → **`docs/KIND-MASTER.md` (LIVE)**.
`MASTER_TODO.md` and `SESSION-HANDOFF-7JUN.md` also say "superseded → KIND-MASTER.md". No doc is orphaned; none competes silently.

---

## 🟢 TIER 1 — LIVE / AUTHORITATIVE (read + update these only)
| Doc | Role |
|-----|------|
| **`docs/KIND-MASTER.md`** | THE source of truth — strategy, session log, dated roadmap, status. 203 KB. |
| **`docs/V2-TRACKER.md`** | THE live tracker — V2 cosmetics, company system (#88), full 101-item roadmap by horizon, doc index. |
| **`docs/DOC-MAP.md`** | This file — the doc audit/index. |

## 🔵 TIER 2 — REFERENCE (current & useful, NOT the master)
| Doc | Role |
|-----|------|
| `docs/SMOKE_TEST.md` | T1–T10 test detail |
| `docs/DEPLOY-CHECKLIST.md` | Deploy steps (current) |
| `docs/DEPLOYMENT_GUIDE.md` | Full deploy guide ⚠️ references old MASTER.md — update ref |
| `docs/legal.md` + `docs/legal/*` | Legal pack (it-security, legal-pack, SEIS draft) |
| `docs/GETTING_STARTED.md` | New-user onboarding guide |
| `docs/sales-playbook.md` · `docs/run-costs-and-cashflow.md` | Sales + finance reference |
| `docs/art-of-possible.md` | Future vision / inspiration log |
| `docs/render-cloudflare-failover.md` · `docs/portal-admin-failover.md` | Infra failover runbooks |
| `AGENT_AVATARS.md` | Avatar generation prompts (asset reference) |
| `FULL_CHECK.md` | Audit protocol (process doc) |
| `CHANGELOG.md` | Product change log |
| `docs/content/blog-articles.md` · `docs/content/youtube-plan.md` | Content plans |
| `supabase/seeds/competitor_icps_readme.md` | Seed data notes |

## 🟣 TIER 3 — DESIGN / MOCKUPS (HTML previews — reference for builds, not code)
| Doc | Role |
|-----|------|
| `docs/CLIENT_FLOW.html` · `docs/CLIENT_FLOW_PER_REP.html` | The journey + **#88 per-rep/company-payment design** |
| `docs/portal-v2-preview.html` · `docs/portal-v2-layout.md` | The 8 V2 cosmetic concepts |
| `docs/client-flow-visual.html` · `docs/client-flow-sop.md` | Client flow visuals/SOP |
| `docs/demo-walkthrough-script.html` · `docs/roadmap-flowchart.html` | Demo + roadmap visuals |
| `docs/pwa-mockup.html` · `docs/setup-dashboard-preview.html` | UI mockups |
| `docs/kind-pitch-deck.html` · `docs/KIND_DECK.html` (4.2 MB) | Pitch decks |
| `docs/drafts/*` (AI_REVENUE_OS_POSITIONING · GTM_FUNNEL · ONBOARDING_V2) | Draft writeups |
| `docs/updates-live/*` | Journey flowchart + 14-May roadmap audit |

## ⚫ TIER 4 — SUPERSEDED / ARCHIVE (DO NOT USE — kept for history; each points forward)
| Doc | Status |
|-----|--------|
| `MASTER.md` (root, 8141 lines) | 🗄️ Historical archive (4 Jun) → EVERYTHING → KIND-MASTER |
| `docs/EVERYTHING.md` (982 lines) | ⛔ Superseded (8 Jun) → KIND-MASTER |
| `docs/MASTER_TODO.md` | ⛔ Not source of truth → EVERYTHING/KIND-MASTER |
| `docs/SESSION-HANDOFF-7JUN.md` | ⛔ Superseded (8 Jun) → KIND-MASTER |
| `AUDIT.md` · `BUILD_STATUS.md` | 🗄️ Old sprint snapshots (27 May, stale branch) |
| `docs/archive/*` (KIND_Roadmap, KIND_SOP, README) | 🗄️ Already archived |

## 🧹 TIER 5 — CLEANUP FLAGS
| Doc | Action |
|-----|--------|
| `README.md` (root) | **EMPTY (0 lines)** — add a 1-paragraph repo intro + link to KIND-MASTER |
| `DEPLOYMENT_GUIDE.md` | Update its "see MASTER.md" reference → KIND-MASTER.md |
| TIER 4 docs | Optionally move root `MASTER.md`, `AUDIT.md`, `BUILD_STATUS.md` into `docs/archive/` to de-clutter root |

## 📌 NOT roadmap docs (live site content — leave alone)
`apps/website/*.html` (marketing site), `apps/landing/*.html`, `apps/portal/public/terms.html|privacy.html` — these are **shipped product pages**, not planning docs.

---
**Bottom line:** 2 files to live in (`KIND-MASTER.md` + `V2-TRACKER.md`), everything else is reference/design/archive — and every archive explicitly forwards to the master. Nothing is lost.
