# 🗺️ K.I.N.D — DOC MAP (every doc · what it's for · how it stays honest)

> **The index of every doc in the repo.** Three tiers: **LIVING** (maintained — must always match code + the locked model), **ARTIFACT** (dated one-offs — frozen, never updated, read as history), **ARCHIVE** (superseded — do not use). If a doc isn't listed here, it isn't tracked — add it.
> `Last-restructured: 9 Jul 2026` (doc-management reset: status stripped from non-inventory docs, doc-lint firewall added, dead docs archived). Sweep history lives in the KIND-MASTER session log, not here.

## How docs stay honest (the freshness system — RULEBOOK §10)
1. **One owner of truth per fact.** Status → PRODUCT-INVENTORY · today → LAUNCH-PAD · strategy/history → KIND-MASTER · future → V2-TRACKER · pricing → `packages/shared/src/constants/index.ts` mirrored once in `run-costs-and-cashflow.md` §0. A sub-doc may *explain* a fact, never *own* it.
2. **`scripts/doc-lint.sh` is the firewall** — fails any commit where a board drifts, a Status column appears outside the inventory, or a banned stale claim (trial CTAs, agent $/mo, 250M, ARPU/MRR framing) lands on a non-history line. CI runs it on every PR touching `docs/`.
3. **Update-on-change, same session.** When the thing a LIVING doc describes changes, update the doc or flag it stale at the top — never leave it silently wrong.
4. **ARTIFACTS are frozen.** Dated audits, decks, mockups and scripts are point-in-time records — they are *expected* to show old numbers. Never quote one as current.

---

## 🟢 THE 4 CORE — one truth each (always current)
| Doc | Owns | Open it for |
|-----|------|-------------|
| **[LAUNCH-PAD.md](./LAUNCH-PAD.md)** | today's + this week's execution (**no status dots** — 9 Jul) | "what do I do now?" |
| **[PRODUCT-INVENTORY.md](./PRODUCT-INVENTORY.md)** | product STATUS — the script-counted board (the ONLY status home) | "what's built / live / left?" |
| **[KIND-MASTER.md](./KIND-MASTER.md)** | strategy · decisions · history · session log | "why did we decide X?" |
| **[V2-TRACKER.md](./V2-TRACKER.md)** | future detail · roadmap · risks · steals | "the longer-term plan" |

**Always-loaded config:** [`CLAUDE.md`](../CLAUDE.md) (agent rules) · [`RULEBOOK.md`](./RULEBOOK.md) (working rules, §11 preview-before-live) · [`README.md`](./README.md) (signpost) · [`TECH-STACK.md`](./TECH-STACK.md) (vendor register) · [`client-flow-sop.md`](./client-flow-sop.md) (**THE SOP**).

---

## 🔵 LIVING SUPPORT — maintained; each owns unique content
*Columns: unique content · update-when trigger.*

### Money & sales
| Doc | Unique content | Update when |
|-----|----------------|-------------|
| [`run-costs-and-cashflow.md`](./run-costs-and-cashflow.md) | **the financial model** — §0 = the locked per-qualified-lead ladder + real PDL/Hunter unit economics (~91% @ $4); §16 company ops | pricing · data stack · billing changes |
| [`sales-playbook.md`](./sales-playbook.md) | the sales manual — qualification · discovery · objections · proposals (per-lead framing) | agents · pricing · positioning change |
| [`PARTNER-BRIEF.md`](./PARTNER-BRIEF.md) | partner one-pager — trade playbooks · per-lead pricing · 20%+5% terms | pricing / partner terms change |
| [`SALARY-BREAKEVEN-PLAN.md`](./SALARY-BREAKEVEN-PLAN.md) | founder break-even on per-lead revenue; retention treadmill | targets · headcount change |
| [`CHURN-PREVENTION-PLAN.md`](./CHURN-PREVENTION-PLAN.md) | retention levers (190–193, Lena 145) | churn strategy change |
| [`hiring/`](./hiring/) (4 md + 3 calculators) | AE + partner comp (collected-revenue denominated) · Claude-Code brief · seller-engine map | comp / seller-engine change |

### Product flow · demo · onboarding
| Doc | Unique content | Update when |
|-----|----------------|-------------|
| [`client-flow-sop.md`](./client-flow-sop.md) | **THE SOP** — sending & onboarding model (M1/M2/M3) + client paths (per-lead wallets) | sending/onboarding model change |
| [`admin-centre-spec.md`](./admin-centre-spec.md) | Admin Centre (M3) spec — Cockpit · Command Centre · Nora | admin structure change |
| [`MILESTONE-0-CHECKLIST.md`](./MILESTONE-0-CHECKLIST.md) | ⭐ the M0 punch-list — money model spine + sweeps + reliability fixes | each batch swept / fix landed |
| [`SYSTEM-FLOW.md`](./SYSTEM-FLOW.md) | one-page machine map (data → FIGSY → sending; Resend today, engines future) | engine / data / GTM change |
| [`flows/`](./flows/) | canonical flow visuals (new-client · our-outreach) | flow changes |
| [`CLIENT_FLOW.html`](./CLIENT_FLOW.html) · [`CLIENT_FLOW_PER_REP.html`](./CLIENT_FLOW_PER_REP.html) | client-facing flow decks (per-lead ladder — verified 9 Jul) | pricing / flow change |
| [`RECORDING-SHOOTING-SCRIPT.md`](./RECORDING-SHOOTING-SCRIPT.md) · [`demo-walkthrough-script.html`](./demo-walkthrough-script.html) | recording bible + verbatim demo script | UI / pricing in-script change |
| [`drafts/`](./drafts/) (3 specs) | positioning hero (LOCKED) · GTM funnel instrumentation (#131) · onboarding V2 | when each ships |
| [`portal-v2-layout.md`](./portal-v2-layout.md) | Portal V2 layout direction (post-launch) | V2 direction change |
| [`content/`](./content/) (5 packs) | blog posts · LinkedIn playbook · our US/UK outreach pack · video plans | content cadence |
| [`AFRICA-PLAYBOOK.md`](./AFRICA-PLAYBOOK.md) | Africa GTM — direct-data + partners motion | GTM change |
| [`art-of-possible.md`](./art-of-possible.md) | inspiration log ("nothing built unless marked") | an idea graduates to a 🔴 item |

### Ops · deploy · infra
| Doc | Unique content | Update when |
|-----|----------------|-------------|
| [`DEPLOYMENT_GUIDE.md`](./DEPLOYMENT_GUIDE.md) | env-vars per service · Railway crons · DNS (website = Railway `KIND`; Cloudflare = DNS/CDN) | env / cron / deploy change |
| [`SMOKE_TEST.md`](./SMOKE_TEST.md) | step-level T1–T10 (reveal-charge aware) | test flow change |
| [`LIVE-FEATURE-WALK.md`](./LIVE-FEATURE-WALK.md) | the 🩷→🟢 verification checklist (28-Jun snapshot + banner) | as items are walked |
| [`PINK-WALK-CHECKLIST.md`](./PINK-WALK-CHECKLIST.md) | founder self-walk aid (A–E groups) | as pinks are walked |
| [`render-cloudflare-failover.md`](./render-cloudflare-failover.md) · [`portal-admin-failover.md`](./portal-admin-failover.md) | failover runbooks (Render standby + Cloudflare LB) | failover infra change |
| [`DATA-RESIDENCY-PLAYBOOK.md`](./DATA-RESIDENCY-PLAYBOOK.md) | same-day US/UK go-live runbook (#258) | residency framework change |
| [`DELIVERABILITY-D9-CHECKLIST.md`](./DELIVERABILITY-D9-CHECKLIST.md) | D9 mail-tester readiness | deliverability change |
| [`APOLLO-ENGINE.md`](./APOLLO-ENGINE.md) | the vendor-agnostic outbound-OS playbook (filename historical; vendor is not) | 211/212/139/140 change |

### Legal · compliance
| Doc | Unique content | Update when |
|-----|----------------|-------------|
| [`legal.md`](./legal.md) | data-rights exposure + structural options (SUPERSEDE banner on Apollo thesis) | lawyer review lands |
| [`legal/`](./legal/) (6 files) | legal pack · IT-security pack · SEIS draft · partner agreement · key-rotation + restore runbooks — factually per-lead since 9 Jul; **⚖️ sign-off owed before external use (#432–#436)** | compliance milestone / sign-off |

### Root-level (evergreen)
[`README.md`](../README.md) (repo front door) · [`CLAUDE.md`](../CLAUDE.md) · [`AGENT_AVATARS.md`](../AGENT_AVATARS.md).

---

## 🟠 ARTIFACTS — dated one-offs, frozen (read as history, never as current)
| Artifact | What it is |
|----------|-----------|
| [`AUDIT-8JUL-DEEP.md`](./AUDIT-8JUL-DEEP.md) | ⭐ the current-audit evidence pack behind M0 (67 findings #338–#404, §D prod-SQL, §O launch scopes) — frozen 8-Jul snapshot; findings live on as inventory items |
| [`kind-pitch-deck.html`](./kind-pitch-deck.html) · [`KIND_DECK.html`](./KIND_DECK.html) | pitch decks (point-in-time) |
| [`previews/`](./previews/) (25) · [`setup-dashboard-preview.html`](./setup-dashboard-preview.html) · [`portal-v2-preview.html`](./portal-v2-preview.html) · [`pwa-mockup.html`](./pwa-mockup.html) | UI mockups / design snapshots |
| [`MCP-EXPLAINED.html`](./MCP-EXPLAINED.html) | static explainer |

---

## 🗄️ ARCHIVE — superseded, do not use → [`docs/archive/`](./archive/)
Everything in `docs/archive/` (30+ files). **Moved 9 Jul:** `AUDIT-24JUN-RECONCILIATION` · `SYSTEM-HEALTH-AUDIT` (superseded by AUDIT-8JUL-DEEP) · `client-flow-visual.html` · `roadmap-flowchart.html` · `client-journey-flowchart.html` · `roadmap-audit-14-may-2026.md` (all carried retired subscription/Apollo pricing; the `updates-live/` folder was collapsed).
**Nuggets still only in archive (pointer, don't resurrect):** Alta deep-audit numbers → `EVERYTHING.md` · #60 outcome-pricing math → `EVERYTHING.md` · F1–F5 funding table → `EVERYTHING.md`.
