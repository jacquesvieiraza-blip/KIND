# 🗺️ K.I.N.D — DOC MAP (every doc · what it's for · is it fresh)

> **What this is:** the index of *every* doc in the repo — what it holds, which of the 4 core docs it hangs off, and whether it's current. **You live off the 4 core docs; this is how the supporting docs stay honest so they never rot underneath you.**
> **Last full audit:** **23 Jun 2026** — full 47-doc verified sweep (4 parallel agents + code/PR check). **Re-run the sweep at every weekly close (RULEBOOK §10).**
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
| **LAUNCH-PAD.md** | today's + this week's execution | "what do I do now?" |
| **PRODUCT-INVENTORY.md** | product STATUS (one dot, one owner) | "what's built / live / left?" |
| **KIND-MASTER.md** | strategy · decisions · history · session log | "where are we + why decided X?" |
| **V2-TRACKER.md** | future detail · roadmap · risks · steals | "what's the longer-term plan?" |

**Always-loaded config:** `CLAUDE.md` (agent rules) · `docs/RULEBOOK.md` (working rules — incl. **§11 PREVIEW-BEFORE-LIVE**: client-facing builds preview on `staging`/`heartfelt-essence` → founder approves → ship to LIVE) · `docs/README.md` (the doc signpost) · `docs/TECH-STACK.md` (tools/vendors register).

---

## 🔵 SUPPORTING DOCS — reference (live, hold unique content) 
*Each: what's unique in it · STATUS · UPDATE-WHEN trigger.*

### 💷 Sales & money
| Doc | Unique content | Status | Update when |
|-----|----------------|:--:|-------------|
| `run-costs-and-cashflow.md` | the only financial model — fixed stack ~$138/mo · ~99% margin · ARPU tiers · sales-target ladder · 3 scenarios | 🛠️ | pricing · stack · ARPU · launch/billing status changes |
| `SALARY-BREAKEVEN-PLAN.md` | founder-vs-partner break-even; "reaching ≠ holding" churn-treadmill | 🛠️ | currency · targets · headcount change |
| `sales-playbook.md` | the only sales manual — qualification · 5-Q discovery · objection rebuttals · proposal tiers · loss reasons | ✅ | agents · pricing · positioning change |
| `PARTNER-BRIEF.md` | partner one-pager — 5 trade playbooks · pricing · 20% recurring terms | ✅ | partner comp/pricing change |
| `CHURN-PREVENTION-PLAN.md` | retention 6 levers (190–193, Lena 145) | ✅ | churn strategy / item 190s change |
| `drafts/AI_REVENUE_OS_POSITIONING.md` | LOCKED hero ("You close the deals. We'll bring you the meetings… from $20") + anti-copy list | ✅ | positioning change |
| `drafts/GTM_FUNNEL_INSTRUMENTATION.md` | item 131 detail — fire-points · `gtm_events` schema · 10 open decisions | ✅ | when 131 is built |

### 🎬 Product flow · demo · onboarding
| Doc | Unique content | Status | Update when |
|-----|----------------|:--:|-------------|
| `RECORDING-SHOOTING-SCRIPT.md` | the master recording bible (capture-once, cut-everything; 6-beat scenes) — for items 129/134 | ✅ | product UI · pricing in-script change |
| `client-flow-sop.md` | 7 onboarding/billing paths | ✅ | onboarding flow change |
| `drafts/ONBOARDING_V2.md` | 6-step flow + 3 lifecycle emails (Day 0/3/7) — item 30/174–176 | ✅ (draft) | when onboarding ships |
| `demo-walkthrough-script.html` | verbatim 12-scene demo | ✅ | demo/positioning change |
| `setup-dashboard-preview.html` · `portal-v2-*` · `CLIENT_FLOW*.html` · `previews/*` | UI mockups/specs (Casey design, inbox-v2, sequence-builder, etc.) | ✅ ref | design lock change |
| `content/blog-articles.md` · `content/youtube-plan.md` | publish-ready posts + 10-video plan (faceless voice) | ✅ | content cadence |
| `art-of-possible.md` | future-vision / inspiration log (product ideas, competitive reads — explicitly "nothing built unless marked") | ✅ ref | when an idea graduates to a 🔴 item |

### 🛠️ Ops · deploy · infra
| Doc | Unique content | Status | Update when |
|-----|----------------|:--:|-------------|
| `TECH-STACK.md` | the tools/vendors register + email architecture (**cold `gettingkind.com` = Resend send + Resend inbound, NO mailbox · human `get-kind.com` = Zoho** · Smartlead/Instantly = THE ENGINE) | ✅ | a tool is added/changed |
| `DEPLOYMENT_GUIDE.md` | full env-var-per-service · Railway crons · DNS values *(the live deploy reference — replaces the archived `DEPLOY-CHECKLIST`)* | ✅ | env/cron/deploy change (22-Jun corrections banner) |
| `SMOKE_TEST.md` | step-level T1–T10 | ✅ | test flow change |
| `LIVE-FEATURE-WALK.md` | **the verification checklist — every live feature/element to walk 🩷→🟢** *(also covers the company-engine walk — replaces the archived `COMPANY-ENGINE-TEST`)* | ✅ | as items are walked / new features ship |
| `render-cloudflare-failover.md` · `portal-admin-failover.md` | failover setup (Render standby + Cloudflare LB) | ✅ | failover infra change |
| `DELIVERABILITY-D9-CHECKLIST.md` | D9 mail-tester readiness (FIGSY_COLD_FROM, DKIM) | ✅ | deliverability change |

### ⚖️ Legal · compliance · hiring
| Doc | Unique content | Status | Update when |
|-----|----------------|:--:|-------------|
| `legal.md` | Apollo ToS exposure + 4 structural options (correction: risk from client #1) | ✅ (maintained) | Apollo decision |
| `legal/legal-pack.md` | Co.No 17260532 · ICO · DPAs · trademark plan · VAT £90k threshold | ✅ | compliance milestone |
| `legal/it-security-pack.md` | data classification · incident register · RTO/RPO | ✅ | security incident/policy |
| `legal/seis-advance-assurance-draft.md` | registered office · SEIS conditions · trademark table | ✅ | funding step |
| `hiring/` (5 docs) | AE comp plan (OTE $112.5k) · partner comp · Claude-Code build brief (203) · SELLER-ENGINE-MAP · calculators | ✅ | comp/seller-engine change |
| `SALARY-BREAKEVEN-PLAN.md` | (see Sales & money) | 🛠️ | — |

### 📁 Root-level files (were untracked — now indexed)
| Doc | Unique content | Status | Disposition |
|-----|----------------|:--:|-------------|
| `README.md` (root) | repo front door → pointer to the 4 core + DOC-MAP | ✅ | keep (PR 1 made it a pointer) |
| `CLAUDE.md` | agent operating config (four-doc contract, rules) | ✅ | keep — always-loaded |
| `AGENT_AVATARS.md` | avatar/art-direction generation prompts | ✅ ref | keep (evergreen) |
| `AUDIT.md` | 27-May sprint snapshot | 🗄️ | ✅ archived → `docs/archive/` |
| `FULL_CHECK.md` | audit protocol | 🗄️ | ✅ methodology folded into **RULEBOOK §13**; original archived |
| `BUILD_STATUS.md` | 27-May sprint status (pre-launch) | 🗄️ | ✅ archived → `docs/archive/` |
| `CHANGELOG.md` | 27-May change log (pre-launch) | 🗄️ | ✅ archived → `docs/archive/` |
| `MASTER.md` (root) | old stale master (known-broken) | 🗄️ | ✅ archived → `docs/archive/` |

---

## 🗄️ ARCHIVE — superseded, DO NOT USE (all now physically in `docs/archive/`)
**Moved to `docs/archive/` in PR 2 (23 Jun):** `EVERYTHING` · `MASTER_TODO` · `GETTING_STARTED` · `MORNING-FIXLOG` · `SESSION-HANDOFF-7JUN` · `SESSION-SUMMARY-13JUN` · `LAUNCH-AUDIT-12JUN` · `KIND-MASTER-ARCHIVE` · `STAGING-REVIEW` · `BOOKMARK-week-plan` · `SMOKE-BILLING-166-173` · `DEPLOY-CHECKLIST` · `COMPANY-ENGINE-TEST` · `ADMIN-BOOKKEEPER-AUDIT` · `AUDIT` · `FULL_CHECK` · `BUILD_STATUS` · `CHANGELOG` · `MASTER`.
*Already in `docs/archive/`:* `KIND_Roadmap.md` · `KIND_SOP.md` (pre-pivot) · `updates-live/roadmap-audit-14-may-2026.md`.

**Unique nuggets still only in archive (pointer, don't resurrect the doc):** Alta deep-audit numbers (the pitch-deck "6% reply/53% revival" = **Alta's**, not ours — honesty flag) → `EVERYTHING.md`/root `MASTER.md`; #60 outcome-pricing math (28% floor, $15/reply, $40/meeting) → `EVERYTHING.md`; F1–F5 funding table → `EVERYTHING.md`.

---

## 🧹 OPEN CONTRADICTIONS (audited 22 Jun — most were themselves stale)
1. ✅ **Denise $99** — FALSE/already-fixed: the reference files (`CLIENT_FLOW.html`/`CLIENT_FLOW_PER_REP.html`) already show **Denise $39**; no `$99` exists in text (the old claim was the stale one).
2. ✅ **Vida $39** — fixed: corrected to **$29** in the only two files that had it (`client-flow-visual.html`, `roadmap-flowchart.html` — both archive); reference files already showed $29.
3. ⚠️ **Pitch deck Alta numbers** presented as ours → relabel/remove (`KIND_DECK.html`/`kind-pitch-deck.html`). *(Still open — honesty flag.)*
4. ✅ ~~README empty~~ (now the doc signpost) · ✅ ~~NEXT_PUBLIC_ADMIN_KEY in failover doc~~ (verified — the doc warns *against* it).

---
*This map is the freshness index. If a doc isn't listed here, it isn't tracked — add it. Last full sweep: **23 Jun 2026**. PR 1 ✅ four-doc contract + script-counted board + 136a fix. PR 2 ✅ 19 dead docs filed to `docs/archive/`, FULL_CHECK protocol → RULEBOOK §13, archive README de-staled. **PR 3 (next) = domain 3→6-step fixes** (PARTNER-BRIEF · RECORDING-SHOOTING-SCRIPT · LIVE-FEATURE-WALK).*
