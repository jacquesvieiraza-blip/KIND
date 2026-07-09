# 🩺 K.I.N.D — SYSTEM HEALTH AUDIT (evidence)
`Last-checked: 25 Jun 2026`

> **What this is:** the evidence + file:line detail behind the **P0 + T1–T5 fix plan** in `LAUNCH-PAD.md` (the plan is owned there; this doc is the *why/where*). Status of record = `PRODUCT-INVENTORY.md`. Reconcile when a fix lands or a new audit runs.
> **Method (25 Jun):** 12 read-only code-readers (5 portal walkthrough + 7 backend dot-honesty + 5 operational teardown + 5 full-health) + a real `yarn install` + compile check. ✅ = verified by hand · ⚠️ = agent-flagged, verify before fixing.

## Headline
The system is **fundamentally sound and substantially honest** — the inventory rebuild + walkthrough proved the live board is real (zero fake greens). This audit found a **finite, sequenced set of foundation fixes**, no hidden rot.
- ✅ **Safe now:** the founder's own US/EMEA outreach via **Instantly** (🅐, separate warmed domains).
- ⛔ **Not safe yet:** putting **paying clients onto the product's sending path** — see T1/T2/T4.

## Verified corrections to raw agent output (the "check before report" pass)
- ✅ **"Stripe webhook double-charge race" — NOT a real risk.** `UNIQUE INDEX credit_transactions_reference_unique` exists in a prod migration (`supabase/migrations/20260526_credit_race_condition_fix.sql:11`) → a concurrent double-insert fails at the DB.
- ✅ **"Unsubscribe marks all leads with that email" — NOT a bug.** Intended POPIA cross-client suppression (`figsy.ts:51-69`).
- ⚠️ **"7 migrations never run on prod" — overstated.** There is **no auto-migration runner** (api `start` = `node dist/index.js`); migrations are applied **manually**. Folder location doesn't decide what's live → P0 confirms the real prod state. `webhook_endpoints` is confirmed unrun.

## Findings → tier mapping (plan lives in LAUNCH-PAD)
> **PROGRESS (25 Jun):** ✅ **T1 done (#753)** — H1 rate-limits · M3 CRM fail-closed · 611 dup deleted; M5 verified not-a-bug (dropped). ✅ **T2a done (#754)** — M1 region default · C6 voice copy (240). **Remaining:** T2b (C4/C5 + `amount_usd` migration + tier CHECK), T2c (C3 Paystack), M2 (pause-stops-Stripe), then T3/T4/T5. C1/C2 → moved to item 220 (parked).
### 🔴 Must-fix before clients run *on the product*
- **H1 — No rate-limiting on expensive authed endpoints** (`/leads`, `/campaigns/:id/enroll`, `/icps/:id/run`, `/figsy/send-due`) → credit-drain/abuse. ✅ → **T1**
- **H2 — 211 sending engine** — shared, unwarmed Resend sender; no per-client isolation (clients poison each other; nothing lands warmed). ✅ → **T4**
- **H3 — Migration discipline** — manual-run, scattered across `supabase/migrations`, `apps/api/src/migrations`, `packages/db/src/migrations`; dup `company_engine` (20260611 vs 612); `subscriptions.tier` CHECK vs `'monthly'`. ⚠️ → **P0 confirm + T1**
  - **✅ P0 prod-state confirmed (25 Jun):** ran the 3 missing-that-matter — `outcome_events` (data floor, item 48 — was a fake-green; now capturing) · `leads.research_summary` · `figsy_chat_messages`. **Present already:** `webhook_endpoints` (NOT unrun — corrects earlier), `calendar_bookings`, `push_subscriptions`, `companies`, `client_members`, `subscriptions.paused_at`, `crm_dedup_enabled`, `crm_existing`, and `credit_transactions_reference_unique` (double-charge guard live). **Bad dup `611` never ran → deleted the file in T1.** `linkedin_queue` skipped (parked). Still open (T1/T2): `subscriptions.tier` CHECK reconcile.

### 🟠 Real gaps (before scaling / US-EMEA paying clients)
- **M1 — Region/currency** — ✅ **RESOLVED (3 Jul):** no SA default (country is a required onboard field); trial sub writes both `amount_usd: 0` + `amount_zar: 0` (`auth.ts:148-154`) and MRR now uses `amount_usd` as source-of-truth. Only genuinely-open remainder: back-fill of legacy ZAR-only subs (T2b).
- **M2 — Subscription pause doesn't stop Stripe billing** (only Paystack handled; comment flags "Stripe-side pause for founder"). ⚠️ `subscriptions.ts` → **T2**
- **M3 — CRM dedup fails *open*** — `figsy.ts:881-898` proceeds if the CRM check errors. ⚠️ → **T1**
- **M4 — N+1 enrollment loop** (~1k-lead timeout) + **global-only send cap**. ✅ → **T3**
- **M5 — `send-due-all` global count without client_id filter** (`internal.ts:913-938`). ⚠️ verify → **T1**
- **M6 — Currency honesty backlog C1–C6** (items 235–240: ZAR writes, Paystack ×19 rate). ✅ → **T2**

### 🟡 Polish / hygiene → **T5** (code) + doc-health (now)
- Code: `lena.ts` unmounted (230) · 11 dead agent-panel buttons (`AgentColumn.tsx` `onClick:()=>{}`) · `/figsy/stats` called by Team page but missing · marketplace Lena price inconsistency · knowledge/inbox/team stubs (74/112/80).
- Docs (fixed in this pass): KIND-MASTER stale board snapshot + "23 Jun" header + item-204 framing · 8 sub-docs missing `Last-checked` · `SMOKE_TEST`→DEPLOYMENT_GUIDE link · `portal-v2-layout` added to DOC-MAP.
- Compile: ✅ **API type-checks clean.** Portal/admin/shared blocked locally by toolchain/@types drift (not code errors); the trustworthy gate is the prod build (history green). **Recommend a CI type-check** so this is never a guess.

## ✅ Confirmed healthy
Billing atomicity + idempotency · app-layer tenant isolation (no leakage found) · opt-out/DNC/POPIA suppression · auth/token trust · data email-reveal (243) · admin OS · infra · all 58 greens honest · 41 sub-docs content current · USD/partner-terms/Casey consistent across docs.

---
*Plan + sequencing → `LAUNCH-PAD.md` (P0 + T1–T5). Status → `PRODUCT-INVENTORY.md`. This doc is evidence only — no status, no plan duplication.*
