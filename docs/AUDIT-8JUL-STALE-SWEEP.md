# 🧹 AUDIT — 8 Jul 2026 · DOCS STALE-INFO SWEEP (post money-model lock)

> ⛔ **SUPERSEDED (8 Jul 10pm) by [`AUDIT-8JUL-DOC-CURRENCY.md`](./AUDIT-8JUL-DOC-CURRENCY.md).** This ledger was written for the pre-ladder `$1 reveal + $3 work = $4` model — it predates the full **per-qualified-lead ladder** ($4→$5→$6, Vida $3) and the **subscription-retirement**. Use the DOC-CURRENCY audit as the live ledger; this is kept as history.

> **Why:** the money model was locked (`$1 reveal + $3 work = $4`, PDL+Hunter data, FIGSY-only, sequences ≤10 steps, global) and folded into the four canonical docs + cashflow (PR #1001, merged). This is the **deep sweep of every OTHER doc + sub-doc** for stale info that now contradicts it. Read-only audit by 5 parallel agents against the **actual files** (not memory), 8 Jul.
> **Scope:** all of `docs/**` (excl. `archive/`) — 95 files. The **live website (`apps/website`) + portal + admin are NOT in this sweep** — those are Move 1a/1b (separate, client-facing → preview-first). This is docs only.
> **This is a findings ledger, not a canonical doc.** Fix items in batched PRs; tick them here as they land. Then this doc can be archived.

---

## The current truth (anything contradicting = stale)
| # | Truth | Stale signature to hunt |
|---|-------|-------------------------|
| **Pricing** | $1 reveal + $3 work = **$4** per fully-worked lead; two wallets; $1 tier **RESTORED** | "$3 all-in", "single/one $3 FIGSY product", "$1 tier retired", "$4 = double-charge bug", volume-discount ladders |
| **Data** | **PDL Full** (sourcing) + **Hunter** (reveal) | "Apollo" as source/sub-processor, "250M/275M contacts" |
| **Product** | **FIGSY only**; drafts replies (not autonomous); **booking LINK** (not auto-book); Milla/Vida/Denise/Tony = coming soon | "autonomous", "books the meeting", other agents sold/priced as live |
| **Margin** | **~91%** on a fully-worked lead | "~95% / 97% / 99%" |
| **Geo** | **Global** (UK Ltd, USD) | POPIA / Cape-Town / "Africa-first" framing as the whole market |

## The 3 recurring rots (in order of spread)
1. **Apollo-as-data-source + "250M contacts"** — by far the widest; in legal, deployment, decks, flows, previews, tech-stack, drafts, vision docs.
2. **"$1 tier retired / single $3 FIGSY" banners** — now *backwards*; the $1 reveal is restored and $4 is intentional, not a bug.
3. **Coming-soon agents (Milla/Vida/Denise) shown/priced as LIVE** + FIGSY "autonomous / auto-books calendar" overclaims.

---

> ### ✅ FABLE PASS 1 — VERIFIED 8 Jul
> Every 🔴 HIGH finding below was **independently re-checked at its exact file:line** (Fable, not the 5 discovery agents). **All CONFIRMED — none refuted.** One line-ref correction: `legal/key-rotation-runbook.md` Apollo is at **L14** (not L15–16). Safe to action; Batch B (legal) recommended first — `legal/legal-pack.md` L157 (DPA sub-processor list) is the sharpest contractual fix.

## 🔴 TIER 1 — HIGH (client- / partner- / contractual-facing) — fix first · **all CONFIRMED (Fable Pass 1, 8 Jul)**

### Legal / contractual (carry contractual weight)
- [ ] **`legal.md`** — pervasively stale; the *entire doc* assumes Apollo is THE source (250M contacts, 50-client Apollo-partnership trigger, Apollo API key storage, Apollo cost tables). **Recommend rewrite-or-archive**, not line patches. Also L104 "meeting booking" (booking link, not auto-book).
- [ ] **`legal/legal-pack.md`** — L157 the **DPA sub-processor list** names **Apollo**; missing **PDL + Hunter + Flutterwave**. L60 DPA-coverage list incomplete. L233 Apollo enrichment row. *(Contractual — top priority.)*
- [ ] **`legal/it-security-pack.md`** — L60 key list, L89 access register, L114 vendor table all name **Apollo** → PDL + Hunter; add Flutterwave.
- [ ] **`legal/seis-advance-assurance-draft.md`** *(filed to HMRC)* — L31 FIGSY "automated … LinkedIn prospecting" (overstated); L39–40 generic "credit" model doesn't reflect $1 reveal + $3 work.
- [ ] **`legal/key-rotation-runbook.md`** — **L14** lists an active **Apollo** key (stale) alongside the correct PDL/Hunter. *(Internal-ish, but asserts a live Apollo key.)* *(Fable Pass 1: confirmed at L14, not L15–16.)*
- ✅ CLEAN: `legal/partner-agreement.md`, `legal/restore-runbook.md`.
- ⚠️ **Off-repo:** `privacy` / `dpa` / `terms` live on get-kind.com — the on-site DPA almost certainly carries the same stale Apollo sub-processor entry as legal-pack L157. **Check there too** (also the terms §5 refund clause — inventory #413).

### Client / partner decks & sales
- [ ] **`kind-pitch-deck.html`** — L1230 "$3 per lead (single FIGSY credit)"; L1317 "$1/lead FIGSY included"; **L1329/L1341 $0.80/$0.60 volume tiers** (contradict flat $1+$3); L1151/L1475 "Apollo 250M+"; L1118/L1141–42 "booked meeting without lifting a finger / automatically"; L1130/L1134 Vida + "3 AI agents" live; L1201–02 "Co-Pilot review-before-send" (hidden #268); L1289/L1359/L1429 Africa/POPIA/Cape-Town.
- [ ] **`KIND_DECK.html`** — L66 "books the meeting, and closes" (auto-book + Denise); L93 "250M+ contacts".
- [ ] **`PARTNER-BRIEF.md`** — L4 + L38 banner "Lead Gen retired → single $3 FIGSY, do not quote $1" is **now backwards**; L37–38 omits the $1 reveal wallet; L11–12 "books the meeting"; L14–15 Vida/Denise as live.
- [ ] **`sales-playbook.md`** — L3 banner "retired $1 → single $3 FIGSY" (stale; body table L333 is the correct two-product shape — reconcile banner to body); L246 "database … for the African B2B market".
- [ ] **`RECORDING-SHOOTING-SCRIPT.md`** *(drives demo videos)* — L104–105 "FIGSY books it onto your calendar" → booking link; L146 "no reply no charge" (contradicts pay-to-reveal + pay-to-work); L77/L122 POPIA lines.
- [ ] **`content/linkedin-playbook.md`** *(public content)* — L17/L102/L112 "250M+ contacts"; L45/L112 FIGSY "autonomously … books"; L47–49 Milla/Vida/Denise as live family.

### Client flows (mockups clients see)
- [ ] **`client-flow-sop.md`** — L2/L113/L115 "$1 lead-gen retired → single $3 FIGSY" (stale); L216 "all 4 products active".
- [ ] **`client-flow-visual.html`** — L266/L432/L451 "Apollo pulls leads"; L396–421 Milla/Vida "unlock $49/$29" (coming-soon sold as live; also $29 vs $39 self-inconsistency); L479 Milla brief running; L961–962 "Apollo ✓ Connected".
- [ ] **`portal-v2-preview.html`** — L234 "247 matches via Apollo"; L961–962 "Apollo — Connected" → PDL+Hunter; L461 "Lead Gen" label (now "reveal" wallet).
- [ ] **`CLIENT_FLOW.html`** — money model L132/L176 is CORRECT ($1 · $3); stale = L67–69 Milla/Vida/Denise "$49/$29/$39/mo" live; L89/L107/L156 "Denise closes / reply→booked"; L93/L172 Milla digest; L126 "fully autonomous FIGSY".
- [ ] **`CLIENT_FLOW_PER_REP.html`** — money CORRECT; stale = L78 "autonomous FIGSY"; L116/L123–124 Milla/Vida/Denise priced/switched on per rep.

### Other HIGH
- [ ] **`PINK-WALK-CHECKLIST.md`** — L23 "$3/lead only, zero $1/$20, ToS $3-only"; **L90 "$3 once, not $4" frames $4 as a double-charge bug** (it's the correct fully-worked price).
- [ ] **`DEPLOYMENT_GUIDE.md`** — L14/L32/L421 lists **`APOLLO_API_KEY`** as a required key + prerequisite; L366/L383/L406 "Apollo search fires / rate limit". Primary = `PDL_API_KEY` + `HUNTER_API_KEY` (the L121–124 block is already correct — the rest contradicts it).

---

## 🟡 TIER 2 — MED (internal but authoritative / factually contradictory)
- [ ] **`DOC-MAP.md`** — L60 "~99% margin" → ~91%; L62/L80/L134/L138 the whole "$1 tier retired / $3-single is current" thread is backwards.
- [ ] **`V2-TRACKER.md`** — L225 R7 "$1+$3 = double-charge bug" (it's the model); L116/L253/L256 "Apollo-first" data posture → PDL+Hunter. *(L258 pricing line is CORRECT — leave.)*
- [ ] **`APOLLO-ENGINE.md`** — **NOT wholly obsolete** (the outbound-OS playbook, sequence blueprint, PDL/Hunter research are live, vendor-agnostic). **Retitle** (drop "Apollo"), add "Apollo retired from data path" banner, delete the reseller/$7,500-tier/Apollo-BYOK-engine content (L1/L12/L13/L82/L89–91/L143).
- [ ] **`TECH-STACK.md`** — L26 "Apollo · PDL · Hunter waterfall (Apollo BYOK)" → PDL (sourcing) + Hunter (reveal); L27 5-agent roster reads as live.
- [ ] **`MCP-EXPLAINED.html`** — L90 "250M-contact database" → PDL/Hunter coverage, no 250M.
- [ ] **`SYSTEM-FLOW.md`** — L13–16/L52–56/L65–66 multi-source waterfall (Apollo BYO, Cognism, Clearbit, Proxycurl, Lusha, ZoomInfo, Clay) → the real stack is PDL Full + Hunter.
- [ ] **`admin-centre-spec.md`** — L52 'retired "$20 Lead Gen" tier'; L77–78 agent roster reads live.
- [ ] **`art-of-possible.md`** *(vision log)* — L106/L497/L502/L506 "Apollo primary source / 275M contacts / we depend on it" (L489 already says PDL — self-contradiction); L144–145 Milla/Vida "✅ Live"; L445 "handles replies autonomously".
- [ ] **`CHURN-PREVENTION-PLAN.md`** — L10 "~95% gross margin" → ~91%.
- [ ] **`setup-dashboard-preview.html`** — L387–410 Milla/Vida/Denise as active team; L421/L425 "autonomous FIGSY".
- [ ] **`updates-live/client-journey-flowchart.html`** — L432 banner endorses "$3-single / $1-retired" (fix the banner; body is acknowledged pre-launch history — lower).
- [ ] **`previews/marketing-the-drop.html`** *(client-facing marketing)* — L122/L162/L164 "FIGSY autonomous / books meeting autonomously / full agent team / POPIA / African-first".
- [ ] **`LIVE-FEATURE-WALK.md`** — L137 "Apollo sourcing"; L130/L132–134 FIGSY "books" + Milla/Vida/Denise 🟢 (tracks portal-screen liveness, so lower stakes).

---

## 🟢 TIER 3 — LOW (dated snapshots / internal drafts / mockups — fix opportunistically or archive)
- [ ] **`updates-live/roadmap-audit-14-may-2026.md`** — pervasively stale (Apollo, 250M, POPIA, SA-first). **Recommend archive** (dated snapshot, no current-truth caveat).
- [ ] **`drafts/ONBOARDING_V2.md`** — L35/L49/L82 "Apollo BYOK / Apollo blueprint" → PDL+Hunter, sequences ≤10; L26 Milla/Vida at signup.
- [ ] **`drafts/GTM_FUNNEL_INSTRUMENTATION.md`** — L42 "Apollo pipeline"; L6/L61 Milla/Vida/Bundle $69 as canonical live.
- [ ] **`drafts/AI_REVENUE_OS_POSITIONING.md`** — L30–80 "$20 entry number" positioning; full family presented as available.
- [ ] **`AFRICA-PLAYBOOK.md`** — L28 "PDL + Apollo BYOK later" (demote Apollo); L4/L27 pointers to APOLLO-ENGINE.
- [ ] **`roadmap-flowchart.html`** — L304 "run Apollo search" → PDL.
- [ ] **`SALARY-BREAKEVEN-PLAN.md`** L11 + **`hiring/KIND-CLAUDE-CODE-BRIEF.md`** (L16/L48/L57/L84) + **`hiring/*.html` calculators** (default 93%) — "~93% margin": company-level figure, borderline vs ~91% per-lead. Align for consistency (low urgency). *(hiring/KIND-CLAUDE-CODE-BRIEF L95 "$1/$3/Denise $39" is CORRECT.)*
- [ ] **`pwa-mockup.html`** — L504 Milla nav; L519 "Lead Gen" label.
- [ ] **`previews/*`** (agents-v2, v2-utility-screens, inbox-v2, v2-leads-invite, usage/notification/documents-current) — scattered "Apollo", POPIA, "autonomous", "Denise $39" in internal mockups.
- [ ] **`AUDIT-8JUL-DEEP.md`** L93 — lists "#394 $1" as a claim to hide; under the locked model the $1 reveal is real (soft flag; dated).

---

## ✅ CLEAN (verified — no stale money/data/product/geo/margin claims)
`README.md` · `DATA-RESIDENCY-PLAYBOOK.md` · `DELIVERABILITY-D9-CHECKLIST.md` · `SMOKE_TEST.md` · `AUDIT-24JUN-RECONCILIATION.md` · `SYSTEM-HEALTH-AUDIT.md` · `portal-admin-failover.md` · `portal-v2-layout.md` (OK w/ locked-cards caveat) · `legal/partner-agreement.md` · `legal/restore-runbook.md` · `content/our-outreach-us-uk.md` · `content/blog-articles.md` (LOW) · `hiring/KIND-AE-COMP-PLAN.md` · `hiring/KIND-PARTNER-COMP-PLAN.md` · `hiring/SELLER-ENGINE-MAP.md` · `flows/*` · `demo-walkthrough-script.html` (near-clean; L174 legacy 3-step) · `previews/marketing-product-videos.html`

---

## Recommended fix batches (each a separate PR)
- **Batch A — internal markdown docs** (no deploy, safe): DOC-MAP, V2-TRACKER, APOLLO-ENGINE (retitle), TECH-STACK, SYSTEM-FLOW, admin-centre-spec, art-of-possible, CHURN, PINK-WALK, sales-playbook, PARTNER-BRIEF, RECORDING-SCRIPT, content/*, drafts/*, hiring/* margin, AFRICA, DEPLOYMENT_GUIDE, SALARY, archive roadmap-audit.
- **Batch B — LEGAL pack** (contractual, founder-review): legal.md (rewrite/archive), legal-pack.md (sub-processor list ← most important), it-security-pack.md, seis draft, key-rotation-runbook. + check off-repo get-kind.com DPA/terms.
- **Batch C — internal HTML decks/mockups** (`docs/*.html`, not the live site): kind-pitch-deck, KIND_DECK, client-flow-visual, portal-v2-preview, CLIENT_FLOW(_PER_REP), MCP-EXPLAINED, roadmap-flowchart, client-journey-flowchart, marketing-the-drop, previews/*, pwa-mockup, setup-dashboard-preview.
- **Separate (already tracked):** the **live website** `apps/website` reword ($1 section, banner) = Move 1a; the **money-path code** = #420–#426.

*Audit run 8 Jul 2026 · 5 parallel read-only agents · findings verified against the actual files.*
