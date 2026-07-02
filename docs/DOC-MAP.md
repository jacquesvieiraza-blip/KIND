# 🗺️ K.I.N.D — DOC MAP (every doc · what it's for · is it fresh)

> **What this is:** the index of *every* doc in the repo — what it holds, which of the 4 core docs it hangs off, and whether it's current. **You live off the 4 core docs; this is how the supporting docs stay honest so they never rot underneath you.**
> **Last full audit:** **1 Jul 2026** — admin-centre code↔spec reconciliation (all 31 admin `page.tsx` routes verified against `admin-centre-spec.md`; Command Centre / Nora / per-staff logins confirmed NOT built = correctly 🔴) + full docs sweep (115 doc files diffed against this map; 2 untracked added — `DATA-RESIDENCY-PLAYBOOK`, `portal-v2-layout`; hiring bucket count corrected to 7; previews bucket verified = 25). *(Prior: 30 Jun — 2-agent code+docs; 25 Jun — 5-agent doc sweep; 24 Jun — code/PR line-item.)* **Re-run the sweep at every weekly close (RULEBOOK §10).**
>
> **🧹 Hygiene sweep 26 Jun:** verified **no live doc duplicates the canonical-4's ownership** (status/execution/strategy/future) — the 23-Jun archive run already cleared the dead trackers. Residue handled: `apollo-reseller-call-prep` (was 🗄️ but still in `drafts/`) → **archived**. **Recommend-archive (founder call, low priority):** `AUDIT-24JUN-RECONCILIATION.md` (dated snapshot, superseded by `SYSTEM-HEALTH-AUDIT.md`). **Still-open honesty flag (not a tracker dup):** pitch-deck Alta numbers in `KIND_DECK.html`/`kind-pitch-deck.html` (contradiction #3 below). Also rotated: 110 old session-log entries (≤24 Jun) `KIND-MASTER.md` → `archive/KIND-MASTER-ARCHIVE.md` (204KB→96KB).
>
> **🧭 Four-doc contract (canonical):** LAUNCH-PAD = today · PRODUCT-INVENTORY = status · KIND-MASTER = strategy/why · V2-TRACKER = future. No fifth core doc. **The status board is script-generated** — `scripts/count-inventory.sh` (RULEBOOK §4.7). **THE ENGINE** (deliverability/sending engine, item 211) is named in RULEBOOK §12.
>
> **🗄️ PR 2 DONE (23 Jun) — 19 dead docs MOVED to `docs/archive/`:** `DEPLOY-CHECKLIST` · `COMPANY-ENGINE-TEST` · `ADMIN-BOOKKEEPER-AUDIT` · `SMOKE-BILLING-166-173` · `STAGING-REVIEW` · `BOOKMARK-week-plan` · `EVERYTHING` · `MASTER_TODO` · `GETTING_STARTED` · `MORNING-FIXLOG` · `SESSION-HANDOFF-7JUN` · `SESSION-SUMMARY-13JUN` · `LAUNCH-AUDIT-12JUN` · `KIND-MASTER-ARCHIVE` + root `BUILD_STATUS` · `CHANGELOG` · `MASTER`. **`AUDIT.md` + `FULL_CHECK.md`** → methodology folded into **RULEBOOK §13**, originals archived. **Kept at root (evergreen):** `AGENT_AVATARS.md` · `CLAUDE.md` · `README.md`. *(PR 3 = the 3→6-step domain fixes.)*

---

## 🔄 THE FRESHNESS SYSTEM (how docs stop rotting) — RULEBOOK §10
1. **One owner of truth per fact.** Status → PRODUCT-INVENTORY · today/this-week → LAUNCH-PAD · strategy/history → KIND-MASTER · future → V2-TRACKER. A sub-doc may *explain* a fact but never *owns* a status.
2. **Update-on-change.** When a fact changes, its owning doc is updated the **same session** (already the rule for the 4 core). For a **sub-doc**, when the thing it describes changes, either **update it** or **flag it stale at the top + note it here** — never leave it silently wrong.
3. **`Last-checked` line.** Every living sub-doc carries a `Last-checked: <date>` near the top. The **STATUS** column below is the freshness verdict.
4. **Weekly sweep.** At each weekly close I re-verify the sub-docs the week's work touched, bump their `Last-checked`, and update the STATUS column here. Each doc has an **UPDATE-WHEN trigger** (right column) so it's obvious what forces a refresh.
5. **Stale ≠ delete.** A superseded doc gets an archive banner and drops to the ARCHIVE tier — it's never just left to mislead.

**Status key:** ✅ current · ⚠️ stale (flagged, fix queued) · 🛠️ being-fixed this sweep · 🗄️ archive (superseded, do not use).

---

## 🟢 THE 4 CORE — you live and breathe off these (always current)
| Doc | Owns | Open it for |
|-----|------|-------------|
| **[LAUNCH-PAD.md](./LAUNCH-PAD.md)** | today's + this week's execution | "what do I do now?" |
| **[PRODUCT-INVENTORY.md](./PRODUCT-INVENTORY.md)** | product STATUS (one dot, one owner) | "what's built / live / left?" |
| **[KIND-MASTER.md](./KIND-MASTER.md)** | strategy · decisions · history · session log | "where are we + why decided X?" |
| **[V2-TRACKER.md](./V2-TRACKER.md)** | future detail · roadmap · risks · steals | "what's the longer-term plan?" |

**Always-loaded config:** [`CLAUDE.md`](../CLAUDE.md) (agent rules) · [`RULEBOOK.md`](./RULEBOOK.md) (working rules — incl. **§11 PREVIEW-BEFORE-LIVE**) · [`README.md`](./README.md) (the doc signpost) · [`TECH-STACK.md`](./TECH-STACK.md) (tools/vendors register) · [`client-flow-sop.md`](./client-flow-sop.md) (**THE SOP** — the locked sending/onboarding operating model).

**Key operating docs (promoted):**
- 📋 **SOP** — [`client-flow-sop.md`](./client-flow-sop.md): the locked Sending & Onboarding Model (M1/M2/M3) + 7 client paths.
- 🖥️ **Admin Centre spec** — [`admin-centre-spec.md`](./admin-centre-spec.md): the M3 cockpit build spec — Pulse + Action Queue + sections · **Command Centre (per-AE + per-partner: targets · 3× pipeline · mini-CRM · contracts)** · **Nora (admin co-pilot)** · build-LIVE. (#272/#274/#275/#276)
- 🖼️ **Flow visuals** — [`flows/new-client-flow.html`](./flows/new-client-flow.html) · [`flows/our-outreach-flow.html`](./flows/our-outreach-flow.html) (download + open in a browser) · [`flows/new-client-flow.mmd`](./flows/new-client-flow.mmd). *(The new-client flow also renders inline inside the SOP as a Mermaid diagram.)*
- 💷 **Business / finance (the company + Xero side)** — [`run-costs-and-cashflow.md`](./run-costs-and-cashflow.md): the financial model + **company ops (§16)**; **Xero/banking/HMRC** = the M3 Admin-Centre finance view (Xero itself is item 196, parked until first paying client).

---

## 🔵 SUPPORTING DOCS — reference (live, hold unique content) 
*Each: what's unique in it · STATUS · UPDATE-WHEN trigger.*

### 🗺️ Orientation
| Doc | Unique content | Status | Update when |
|-----|----------------|:--:|-------------|
| [`DOC-MAP.md`](./DOC-MAP.md) *(this doc)* | the index of every doc + freshness — start here to find anything | ✅ | a doc is added / archived |
| [`PINK-WALK-CHECKLIST.md`](./PINK-WALK-CHECKLIST.md) | the founder self-walk aid — grouped A (click-walk) / B (demo company) / C (test campaign) / D (first charge) / **E (new 1-Jul pinks)**. **Reconciled 2 Jul to the board's 43 🩷** = 35 from the 30-Jun walk + 7 new (#260/#265/#267/#243/#272/#274/#275) + #15 re-dotted (audit) | ✅ *(synced 2 Jul)* | as pinks are walked / new pinks appear |
| [`SYSTEM-FLOW.md`](./SYSTEM-FLOW.md) | **the one-page visual of the whole machine** — data → FIGSY → sending (Instantly vs Smartlead) · the data layer (243) · two GTM tracks · build order. The "where do I start / how does it fit" map. | ✅ *(new 25 Jun)* | engine (211) / data (243) / GTM change |
| [`AFRICA-PLAYBOOK.md`](./AFRICA-PLAYBOOK.md) | **the one-click Africa GTM** — thesis (direct-data + partners) · how we source African leads · the stealth email/brand partner motion · markets SA→NG→KE→GH. Consolidates V2/APOLLO-ENGINE/PARTNER-BRIEF (points to them for status). | ✅ *(new 25 Jun)* | two-track / 233 / 243 / stealth change |
| [`SYSTEM-HEALTH-AUDIT.md`](./SYSTEM-HEALTH-AUDIT.md) | **the evidence behind the P0+T1–T5 fix plan** (LAUNCH-PAD) — full code+doc+operational health audit (25 Jun): verified findings, file:line detail, what's safe vs not. Plan lives in LAUNCH-PAD; this is the *why/where*. | ✅ *(new 25 Jun)* | a fix lands / a new health audit runs |

### 💷 Sales & money
| Doc | Unique content | Status | Update when |
|-----|----------------|:--:|-------------|
| [`run-costs-and-cashflow.md`](./run-costs-and-cashflow.md) | the only financial model — fixed stack ~$138/mo · ~99% margin · ARPU tiers · sales-target ladder · 3 scenarios | 🛠️ | pricing · stack · ARPU · launch/billing status changes |
| [`SALARY-BREAKEVEN-PLAN.md`](./SALARY-BREAKEVEN-PLAN.md) | founder-vs-partner break-even; "reaching ≠ holding" churn-treadmill | 🛠️ | currency · targets · headcount change |
| [`sales-playbook.md`](./sales-playbook.md) | the only sales manual — qualification · 5-Q discovery · objection rebuttals · proposal tiers · loss reasons | ✅ | agents · pricing · positioning change |
| [`PARTNER-BRIEF.md`](./PARTNER-BRIEF.md) | partner one-pager — 5 trade playbooks · pricing · 20%+5% terms | ⚠️ | **stale pricing (flagged 30 Jun): shows old Lead Gen $1 tier — banner added; fix post-Wed Lead-Gen retirement** |
| [`CHURN-PREVENTION-PLAN.md`](./CHURN-PREVENTION-PLAN.md) | retention 6 levers (190–193, Lena 145) | ✅ | churn strategy / item 190s change |
| [`drafts/AI_REVENUE_OS_POSITIONING.md`](./drafts/AI_REVENUE_OS_POSITIONING.md) | LOCKED hero ("You close the deals. We'll bring you the meetings… from $20") + anti-copy list | ✅ | positioning change |
| [`drafts/GTM_FUNNEL_INSTRUMENTATION.md`](./drafts/GTM_FUNNEL_INSTRUMENTATION.md) | item 131 detail — fire-points · `gtm_events` schema · 10 open decisions | ✅ | when 131 is built |
| [`archive/apollo-reseller-call-prep.md`](./archive/apollo-reseller-call-prep.md) | 17-Jun Apollo reseller call prep (historical — see item 103) | 🗄️ | ✅ archived 26 Jun (was in `drafts/`) |
| **[`APOLLO-ENGINE.md`](./APOLLO-ENGINE.md)** | **THE outbound-OS playbook** (Apollo-learned) → FIGSY: 6-stage loop (target→enrich→sequence→send→measure→optimise) · endpoint ref · BYOK/PDL-Hunter data architecture · source-labeling decision · the 212/139/140 build spec. **Items 242/243/244.** | ✅ *(new 24 Jun)* | 211/212/139/140/103 change · Apollo deck/Zoom lands · 242/243 ships |

### 🎬 Product flow · demo · onboarding
| Doc | Unique content | Status | Update when |
|-----|----------------|:--:|-------------|
| [`RECORDING-SHOOTING-SCRIPT.md`](./RECORDING-SHOOTING-SCRIPT.md) | the master recording bible (capture-once, cut-everything; 6-beat scenes) — for items 129/134 | ✅ | product UI · pricing in-script change |
| [`client-flow-sop.md`](./client-flow-sop.md) | **THE SOP** — the locked **Sending & Onboarding Model** (M1 our-outreach · M2 pool→branded client sending · M3 ops/triggers) + the 7 onboarding/billing paths | ✅ *(1 Jul)* | sending/onboarding model or a client path changes |
| [`admin-centre-spec.md`](./admin-centre-spec.md) | **Admin Centre spec (M3)** — Cockpit (Pulse + Action Queue) + sections · **Command Centre (per-AE + per-partner: targets · 3× pipeline · mini-CRM · contracts)** · **Nora** admin co-pilot · build-LIVE (#272/#274/#275/#276) | ✅ *(1 Jul)* | admin structure / Command Centre / Nora scope changes |
| [`drafts/ONBOARDING_V2.md`](./drafts/ONBOARDING_V2.md) | 6-step flow + 3 lifecycle emails (Day 0/3/7) — item 30/174–176 | ✅ (draft) | when onboarding ships |
| [`portal-v2-layout.md`](./portal-v2-layout.md) | Portal V2 layout — Month-2 upgrade (ClickUp Super-Agents-inspired UX); all post-launch (week 5+) | ✅ *(Last-checked 25 Jun)* | portal V2 layout direction change |
| [`demo-walkthrough-script.html`](./demo-walkthrough-script.html) | verbatim 12-scene demo | ✅ | demo/positioning change |
| UI mockups/preview HTML → folders: [`previews/`](./previews/) (25 screens) · [`setup-dashboard-preview.html`](./setup-dashboard-preview.html) · [`portal-v2-preview.html`](./portal-v2-preview.html) · [`CLIENT_FLOW.html`](./CLIENT_FLOW.html)/[`_PER_REP`](./CLIENT_FLOW_PER_REP.html) · [`MCP-EXPLAINED.html`](./MCP-EXPLAINED.html) · [`pwa-mockup.html`](./pwa-mockup.html) · [`updates-live/`](./updates-live/) *(⚠️ `updates-live/client-journey-flowchart.html` = 14-May artifact with retired $1 pricing — staleness banner added 2 Jul, do not use for pricing)* | ✅ ref | design lock change |
| [`client-flow-visual.html`](./client-flow-visual.html) · [`roadmap-flowchart.html`](./roadmap-flowchart.html) | old client-flow + roadmap visuals — **historical, contain stale pricing** (physically in `docs/` root, not `archive/`) | ⚠️ stale | archive or refresh with $3 pricing |
| [`content/blog-articles.md`](./content/blog-articles.md) · [`youtube-plan`](./content/youtube-plan.md) · [`website-video-plan`](./content/website-video-plan.md) | publish-ready posts + 10-video plan (faceless voice) + the website video plan | ✅ | content cadence |
| [`content/our-outreach-us-uk.md`](./content/our-outreach-us-uk.md) | **OUR own US/UK outreach pack** (the 🅱️ fast-cash track) — ICP · channels · offer · 4-step dogfood sequence · compliance — items 127/129/132/242 | ✅ *(new 25 Jun)* | offer/ICP/pricing change |
| [`art-of-possible.md`](./art-of-possible.md) | future-vision / inspiration log (product ideas, competitive reads — explicitly "nothing built unless marked") | ✅ ref | when an idea graduates to a 🔴 item |

### 🛠️ Ops · deploy · infra
| Doc | Unique content | Status | Update when |
|-----|----------------|:--:|-------------|
| [`TECH-STACK.md`](./TECH-STACK.md) | the tools/vendors register + email architecture (**cold `gettingkind.com` = Resend send + Resend inbound, NO mailbox · human `get-kind.com` = Zoho** · Smartlead/Instantly = THE ENGINE) | ✅ | a tool is added/changed |
| [`DEPLOYMENT_GUIDE.md`](./DEPLOYMENT_GUIDE.md) | full env-var-per-service · Railway crons · DNS values *(the live deploy reference — replaces the archived `DEPLOY-CHECKLIST`)* | ⚠️ | **Last-checked 2 Jun — stale (flagged 30 Jun); verify env/cron/admin-service deploy + bump** |
| [`SMOKE_TEST.md`](./SMOKE_TEST.md) | step-level T1–T10 | ✅ | test flow change |
| [`LIVE-FEATURE-WALK.md`](./LIVE-FEATURE-WALK.md) | **the verification checklist — every live feature/element to walk 🩷→🟢** *(also covers the company-engine walk — replaces the archived `COMPANY-ENGINE-TEST`)* | ✅ | as items are walked / new features ship |
| [`render-cloudflare-failover.md`](./render-cloudflare-failover.md) · [`portal-admin-failover.md`](./portal-admin-failover.md) | failover setup (Render standby + Cloudflare LB) | ✅ | failover infra change |
| [`DATA-RESIDENCY-PLAYBOOK.md`](./DATA-RESIDENCY-PLAYBOOK.md) | same-day US/UK go-live runbook — framework built now, regional DB provisioned the day the first US/UK client signs (item 258) | ✅ *(Last-checked 30 Jun)* | residency framework / regional DB change |
| [`DELIVERABILITY-D9-CHECKLIST.md`](./DELIVERABILITY-D9-CHECKLIST.md) | D9 mail-tester readiness (FIGSY_COLD_FROM, DKIM) | ✅ | deliverability change |
| [`AUDIT-24JUN-RECONCILIATION.md`](./AUDIT-24JUN-RECONCILIATION.md) | the 24-Jun doc↔code reconciliation snapshot (findings + remediation) — **historical record** | ✅ ref *(snapshot 24 Jun)* | n/a — dated snapshot |

### ⚖️ Legal · compliance · hiring
| Doc | Unique content | Status | Update when |
|-----|----------------|:--:|-------------|
| [`legal.md`](./legal.md) | Apollo ToS exposure + 4 structural options (correction: risk from client #1) | ✅ (maintained) | Apollo decision |
| [`legal/legal-pack.md`](./legal/legal-pack.md) | Co.No 17260532 · ICO · DPAs · trademark plan · VAT £90k threshold | ✅ | compliance milestone |
| [`legal/it-security-pack.md`](./legal/it-security-pack.md) | data classification · incident register · RTO/RPO | ✅ | security incident/policy |
| [`legal/seis-advance-assurance-draft.md`](./legal/seis-advance-assurance-draft.md) | registered office · SEIS conditions · trademark table | ✅ | funding step |
| [`legal/partner-agreement.md`](./legal/partner-agreement.md) | partner agreement — 20% acquisition + 5% retention (item 197), USD, no clawback | ✅ | partner comp/terms change |
| [`legal/key-rotation-runbook.md`](./legal/key-rotation-runbook.md) · [`legal/restore-runbook.md`](./legal/restore-runbook.md) | key-rotation + DB-restore runbooks | ✅ | infra/security procedure change |
| [`hiring/`](./hiring/) (7 files = 4 md + 3 .html) | [AE comp plan](./hiring/KIND-AE-COMP-PLAN.md) (OTE $112.5k) · [partner comp](./hiring/KIND-PARTNER-COMP-PLAN.md) · [Claude-Code brief](./hiring/KIND-CLAUDE-CODE-BRIEF.md) (203) · [SELLER-ENGINE-MAP](./hiring/SELLER-ENGINE-MAP.md) + 3 calculators ([AE-commission](./hiring/KIND-AE-commission-calculator.html) · [partner](./hiring/KIND-partner-calculator.html) · [team-pnl](./hiring/KIND-team-pnl-calculator.html)) | ✅ | comp/seller-engine change |
| [`SALARY-BREAKEVEN-PLAN.md`](./SALARY-BREAKEVEN-PLAN.md) | (see Sales & money) | 🛠️ | — |

### 📁 Root-level files (were untracked — now indexed)
| Doc | Unique content | Status | Disposition |
|-----|----------------|:--:|-------------|
| [`README.md`](../README.md) (root) | repo front door → pointer to the 4 core + DOC-MAP | ✅ | keep (PR 1 made it a pointer) |
| [`CLAUDE.md`](../CLAUDE.md) | agent operating config (four-doc contract, rules) | ✅ | keep — always-loaded |
| [`AGENT_AVATARS.md`](../AGENT_AVATARS.md) | avatar/art-direction generation prompts | ✅ ref | keep (evergreen) |
| [`AUDIT.md`](./archive/AUDIT.md) | 27-May sprint snapshot | 🗄️ | ✅ archived → `docs/archive/` |
| [`FULL_CHECK.md`](./archive/FULL_CHECK.md) | audit protocol | 🗄️ | ✅ methodology folded into **RULEBOOK §13**; original archived |
| [`BUILD_STATUS.md`](./archive/BUILD_STATUS.md) | 27-May sprint status (pre-launch) | 🗄️ | ✅ archived → `docs/archive/` |
| [`CHANGELOG.md`](./archive/CHANGELOG.md) | 27-May change log (pre-launch) | 🗄️ | ✅ archived → `docs/archive/` |
| [`MASTER.md`](./archive/MASTER.md) (root) | old stale master (known-broken) | 🗄️ | ✅ archived → `docs/archive/` |

---

## 🗄️ ARCHIVE — superseded, DO NOT USE (all now physically in `docs/archive/`)
**Moved to `docs/archive/` in PR 2 (23 Jun):** `EVERYTHING` · `MASTER_TODO` · `GETTING_STARTED` · `MORNING-FIXLOG` · `SESSION-HANDOFF-7JUN` · `SESSION-SUMMARY-13JUN` · `LAUNCH-AUDIT-12JUN` · `KIND-MASTER-ARCHIVE` · `STAGING-REVIEW` · `BOOKMARK-week-plan` · `SMOKE-BILLING-166-173` · `DEPLOY-CHECKLIST` · `COMPANY-ENGINE-TEST` · `ADMIN-BOOKKEEPER-AUDIT` · `AUDIT` · `FULL_CHECK` · `BUILD_STATUS` · `CHANGELOG` · `MASTER`.
*Already in `docs/archive/`:* `KIND_Roadmap.md` · `KIND_SOP.md` (pre-pivot). *(Note: `docs/updates-live/roadmap-audit-14-may-2026.md` physically lives under `docs/updates-live/`, not `docs/archive/` — it's a 14-May pre-launch audit carrying its own "do not build from this" banner; treat as archive/historical, superseded by the canonical four.)*

**Unique nuggets still only in archive (pointer, don't resurrect the doc):** Alta deep-audit numbers (the pitch-deck "6% reply/53% revival" = **Alta's**, not ours — honesty flag) → `EVERYTHING.md`/root `MASTER.md`; #60 outcome-pricing math (28% floor, $15/reply, $40/meeting) → `EVERYTHING.md`; F1–F5 funding table → `EVERYTHING.md`.

---

## 🧹 OPEN CONTRADICTIONS (audited 22 Jun — most were themselves stale)
1. ✅ **Denise $99** — FALSE/already-fixed: the reference files (`CLIENT_FLOW.html`/`CLIENT_FLOW_PER_REP.html`) already show **Denise $39**; no `$99` exists in text (the old claim was the stale one).
2. ✅ **Vida $39** — fixed: corrected to **$29** in the only two files that had it (`client-flow-visual.html`, `roadmap-flowchart.html` — both archive); reference files already showed $29.
3. ✅ **Pitch deck Alta numbers** — RESOLVED (audit 1 Jul): `kind-pitch-deck.html:1214` now reads "Industry benchmarks & our targets" + `$3` (`:1229`); `KIND_DECK.html` has no `6%/53%/Alta` match. Flag closed.
4. ✅ ~~README empty~~ (now the doc signpost) · ✅ ~~NEXT_PUBLIC_ADMIN_KEY in failover doc~~ (verified — the doc warns *against* it).

---
*This map is the freshness index. If a doc isn't listed here, it isn't tracked — add it. (Code-adjacent READMEs such as `supabase/seeds/competitor_icps_readme.md` document seed data, not project status — out of scope here.) Last full sweep: **1 Jul 2026** (3 parallel agents — code machinery + outreach front + docs consistency, every claim verified at file:line). Earlier: 24 Jun (5-agent line-by-line). PR 1 ✅ four-doc contract + script-counted board + 136a fix. PR 2 ✅ 19 dead docs filed to `docs/archive/`, FULL_CHECK protocol → RULEBOOK §13, archive README de-staled. PR 3 ✅ 3→6-step resolved honestly: the 6-step is now **tracked item 212** (🔴, not built — product is still 3-step); client/demo docs say "multi-step," internal docs cross-ref 212. **Board → Σ293 (script-counted, 2 Jul): 🟢92 · 🩷43 · 🟣4 · 🟡22 · 🔴127 · ⏸5.** (2 Jul: #15 re-dotted 🟢→🩷 — audit refuted its review-gate, see #268; M3 board corrected — vault/plays/per-person-targets/finance-kit rows → 🔴.) (Full 4-surface audit 1 Jul: fixed inventory section-header drift; +#283 website/ToS still sell retired $1 tier / FIGSY mispriced; tracked `client-flow-visual.html` + `roadmap-flowchart.html`; pitch-deck honesty flag closed.) (M3 admin: Cockpit/Sales-Channel/Finance/Nora shipped 🩷; course-correct to adopt the client-portal design system = #277, + #278 GTM · #279 Engine graph · #280 Ops · #281 Clients · #282 dedup; spec in `admin-centre-spec.md`.) (1 Jul M2 sweep: 🟢 #266 /team auth · #261 ownership+RLS · #263 CI · #262 pause-migration-applied; 🩷 #260 blocklist · #265 Stripe grant · #267 bounce · #243 Apollo-independence (env/webhook actions owed); carved #269 rate-limits + #273 schema-consolidation; **Milestone 3: #270/#271/#272 + #274 Command Centre · #275 Nora · #276 per-staff logins** — spec in `admin-centre-spec.md`, builds LIVE; flows in the SOP.)*
