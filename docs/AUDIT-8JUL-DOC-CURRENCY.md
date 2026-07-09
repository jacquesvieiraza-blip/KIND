# 🧭 AUDIT — 8 Jul 2026 (10pm) · DOC-CURRENCY SWEEP vs the per-qualified-lead lock

> **Why:** after tonight's two locks (the **per-qualified-lead ladder** + the **inventory re-dot / M0 phases**) landed in the core docs, the founder called every downstream doc suspect. This is a **3-sweep, read-only audit of all 94 non-backbone docs** in `docs/**` against the locked truth. **6 fan-out agents (Sweep 1) → Fable line-level re-verification of every HIGH finding (Sweep 2) → completeness check (Sweep 3, all 96 files accounted for).**
> **Backbone (held as truth, NOT audited):** `LAUNCH-PAD.md` · `PRODUCT-INVENTORY.md` · `KIND-MASTER.md` (session log) · `MILESTONE-0-CHECKLIST.md`.
> **This is a findings ledger — no doc was changed by the audit.** Supersedes `AUDIT-8JUL-STALE-SWEEP.md` (which was written for the pre-ladder $1+$3 model). Tick items as the fix batches land; archive when the board is green.
> **Scope = `docs/**` only.** The live `apps/website` + `apps/portal` are a separate sweep (M0 Phase 1, #405/#406/#430, preview-first).

## The locked truth (anything contradicting = a finding)
| # | Truth | Stale signature |
|---|-------|-----------------|
| Pricing | **Per qualified lead, no subscriptions.** $1 reveal → +$3 FIGSY = $4 → +$1 Milla = $5 → +$1 Denise = $6; Vida inbound $3 (+$1/+$1 → $4/$5) | monthly subs $49/$29/$39/$69 · single-$3 / $3-all-in · "$1 retired" · "$4 is a double-charge bug" · volume tiers $0.80/$0.60 |
| Data | **PDL Full (sourcing) + Hunter (reveal)** | Apollo as source · "250M/275M contacts" · multi-source waterfall as live |
| Product | FIGSY + Lead-Gen sold; Milla/Vida/Denise/Tony **coming-soon (M4), not deleted** | agents sold/priced as live · "autonomous" · auto-book (booking is a LINK) · fixed 3-step (cap ≤10) |
| Margin | ~91% ($4) / ~92% ($6) | 95% / 97% / 99% (93% = company-level, borderline) |
| Geo | Global | Cape-Town / POPIA-first / Africa-only as the whole market |

## Scary-meter
**~24 CONTRADICT · ~36 STALE · ~34 CLEAN.** The *spine* is sound (backbone + MILESTONE-0 correct). The danger is concentrated in **5 legal/contract/HMRC docs** and **~10 client-facing decks/invoices** that still sell the killed pricing model. All fixable; nothing lost.

---

## 🔴 CONTRADICTS — fix before use (24)

### Legal / contractual / HMRC — highest weight (5) · Fable-verified at source
| Doc | Current says | Should be | Key |
|---|---|---|---|
| `legal.md` | Entire doc = Apollo thesis (ToS, 250M, reseller, 50-client trigger); FIGSY "sends" autonomously | Rewrite on PDL+Hunter; FIGSY drafts; per-lead. Investor/lawyer-facing | L2/12-24/45/88/146-353 |
| `legal/legal-pack.md` | DPA **sub-processor list names Apollo** (L157); stale agent codenames **REEVE/LENA/OTTO** (L151/178) | PDL+Hunter+Flutterwave; Denise/Tony. Published DPA | L60/151/157/178/233 |
| `legal/seis-advance-assurance-draft.md` | "Recurring SaaS **subscriptions**… monthly" (L37) | Per-qualified-lead. **Goes to HMRC** | L31/37-40/88-96 |
| `legal/partner-agreement.md` | Commission on "first-month **MRR**" + "collected MRR" | Per-lead collected revenue (no MRR exists) | L20/28-36 |
| `legal/it-security-pack.md` | Apollo in vendor/key/access registers | PDL+Hunter+Flutterwave | L60/89/114 |

### Core freshness certifier (1)
| Doc | Current says | Should be | Key |
|---|---|---|---|
| `DOC-MAP.md` | "~99% margin"; "$1 retired / refresh to $3-single" as the target | ~91%; the reveal-restored ladder. *The freshness-certifier is itself stale* | L60/63/79-80/134/138 |

### Client-facing decks & sales (5)
| Doc | Current says | Should be | Key |
|---|---|---|---|
| `kind-pitch-deck.html` | $1/$0.80/$0.60 volume tiers; 250M/Apollo; co-pilot (#268 hidden); Cape-Town/POPIA; "active users now" | Ladder; PDL+Hunter; drop co-pilot; global; no traction claims | L1317/1329/1341/1151/1202/1421 |
| `KIND_DECK.html` | $20 + monthly subs $49/$29/$39; 250M | Ladder; PDL+Hunter | L93/172-175 |
| `sales-playbook.md` | "$1 retired→single $3"; bundles + monthly subs; Apollo | Ladder; PDL+Hunter | L3/5/246/333 |
| `PARTNER-BRIEF.md` | Single-$3; monthly agents $117/mo; Denise $99-vs-$39 | Ladder (partner 20/5 terms fine) | L4/38-39/44-56 |
| `content/linkedin-playbook.md` | 250M contacts; Vida on WhatsApp | PDL+Hunter; Vida = web chat | L20/102/112 |

### Flows / onboarding / tech (6)
| Doc | Current says | Should be | Key |
|---|---|---|---|
| `client-flow-sop.md` | "$1 retired→single $3"; subscription billing paths | Ladder; per-lead | L2/113-121/155 |
| `client-flow-visual.html` | Apollo; Unlock Milla $49 / Vida $29 / Denise $39/mo | PDL+Hunter; ladder | L266/400/405/416 |
| `CLIENT_FLOW.html` / `CLIENT_FLOW_PER_REP.html` | Milla/Vida/Denise monthly subs | +$1 per-lead layers | 67-69/132 · 66/98/116 |
| `portal-v2-preview.html` | "247 via Apollo"; fixed 3-step | PDL+Hunter; ≤10-step | L234/822/916/961 |
| `DEPLOYMENT_GUIDE.md` | Creates $49/$29/$39 **monthly Stripe products**; Apollo smoke test | No subs; PDL+Hunter (contradicts its own env block) | L141-143/269-277/365-406 |

### Playbooks + client-facing previews/invoices (7)
| Doc | Current says | Should be | Key |
|---|---|---|---|
| `roadmap-flowchart.html` | Subscriptions + Apollo + MRR roadmap | Obsolete → archive/rewrite | L276/305/399-419 |
| `PINK-WALK-CHECKLIST.md` | "single-$3, zero $1/$20"; **"$4 is a double-charge bug"**; Denise $39 | Ladder; **$4 is legit**; Denise +$1 | L23/90/96 |
| `previews/invoice-v1.html` | FIGSY **$199/mo** + Denise **$39/mo** subscriptions | Per-lead line items | L147-156/171 |
| `previews/invoices-list.html` | Monthly subs $228/$180 | Per-lead invoices | L107-130 |
| `previews/agents-v2.html` | "Add Denise — $39/mo" | Per-lead | L116/139/162 |
| `previews/marketing-the-drop.html` | "autonomous… books meeting autonomously"; full team live; POPIA | Drafts + booking link; coming-soon; global | L122/128-131/162-164 |
| `updates-live/client-journey-flowchart.html` | Two-tier $1/$3 + 250M + POPIA — **and its "correction" banner pushes the retired single-$3** | Ladder; PDL+Hunter; global; banner wrong too | L432/590-594/632/702 |

---

## 🟡 STALE — outdated, not actively contradicting (~36)
- **Core:** `KIND-MASTER` (RESUME-HERE cold-start block lags — calls Milla/Vida/Denise "live"; session log is correct) · `V2-TRACKER` (Apollo-first + R7 "$1+$3 double-charge") · `run-costs` (§0 current; body §3–§16 Apollo/95%/Denise-$39/"Phase 2→subscriptions" L155) · `AUDIT-8JUL-STALE-SWEEP` (capped at $4, missing $5/$6/Vida/subs-retirement) · `AUDIT-8JUL-DEEP` (L93 treats $1 as claim-to-hide).
- **Others:** `SYSTEM-FLOW` (waterfall as focus) · `APOLLO-ENGINE` (playbook keepable, Apollo-vendor stale) · `AFRICA-PLAYBOOK` · `MCP-EXPLAINED` (250M L90) · `SMOKE_TEST` (Milla-subscribe step L43) · `art-of-possible` · `CHURN-PREVENTION` (95% L10) · `LIVE-FEATURE-WALK` · `demo-walkthrough` ($20/"subscription") · `KIND-CLAUDE-CODE-BRIEF` (pricing constants L95) · `content/website-video-plan` (Cape Town) · `setup-dashboard-preview` ("autonomous") · `legal/key-rotation-runbook` (Apollo key L14) · `drafts/*` (3, flagged draft) · ~12 internal `previews/*` (Apollo/POPIA/agents-live).

## 🟢 CLEAN (~34) — no change needed
`MILESTONE-0` · `RULEBOOK` · `README` · `AUDIT-24JUN` · `legal/restore-runbook` · `SYSTEM-HEALTH-AUDIT` · `admin-centre-spec` · `TECH-STACK` · `portal-v2-layout` · `portal-admin-failover` · `pwa-mockup` · `DATA-RESIDENCY` · `DELIVERABILITY-D9` · `render-cloudflare-failover` · `flows/*` (2) · all 7 `hiring/*` comp docs · `RECORDING-SHOOTING-SCRIPT` · `content/{blog-articles,our-outreach-us-uk,youtube-plan}` · `SALARY-BREAKEVEN` · ~7 honest `previews/*` (sequence-builder ×2, welcome-concepts, signup-sso, status-bar, deliverability, activity — minor).

---

## The 5 recurring rots (fix once, everywhere)
1. **Monthly subs $49/$29/$39/$69** → per-qualified-lead ladder.
2. **Apollo / 250M contacts** → PDL Full + Hunter.
3. **"$1 retired / single-$3 / $4-is-a-bug"** → $1 reveal restored; $4 legit; full ladder.
4. **95/99% margin** → ~91–92% (93% company-level borderline).
5. **Cape-Town/POPIA-first + "autonomous"/auto-book** → global; FIGSY drafts + booking link.

## Fix batches (each its own PR — legal + client-facing need founder review / preview-first)
- **Batch 1 — Legal/contract/HMRC** (real exposure): `legal.md` (rewrite onto PDL+Hunter), `legal-pack` (DPA sub-processor list first), `seis` (revenue model), `partner-agreement` (comp basis), `it-security-pack`, `key-rotation`.
- **Batch 2 — Core internal** (safe, no deploy): `DOC-MAP`, `V2-TRACKER`, `run-costs` body, `KIND-MASTER` RESUME-HERE, refresh/retire `AUDIT-8JUL-STALE-SWEEP`.
- **Batch 3 — Client-facing decks/flows/invoices** (preview-first where they deploy): pitch decks, sales/partner briefs, client-flows, invoices, marketing mockups, `linkedin-playbook`, `client-journey-flowchart`.
- **Batch 4 — Internal/tech/drafts + cross-cutting** (margin 95→91, geo, Vida-WhatsApp, co-pilot): `DEPLOYMENT_GUIDE`, `SYSTEM-FLOW`, `APOLLO-ENGINE`, `SMOKE_TEST`, `MCP-EXPLAINED`, drafts, remaining previews; **archive** `roadmap-flowchart` + `roadmap-audit-14-may`.

*Audit run 8 Jul 2026 · 6 read-only agents + Fable line-verification · measured against the reconciled backbone, verified against the actual files.*
