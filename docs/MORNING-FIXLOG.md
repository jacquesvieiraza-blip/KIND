# 🌅 Morning Fix-Log — overnight portal audit + fixes (9→10 Jun)

**What I did:** full data-flow audit of every portal page (4 parallel agents: metric-consistency · leads→campaign→inbox flow · agent/account pages · API counter sweep), then fixed the highest-impact issues in **build-verified batches pushed to `main`**. Each batch was checked with a real `next build` / API typecheck (the thing that would've caught last night's crash).

---

## ✅ FIXED & LIVE ON MAIN (verified)

**Crashes / "looks-fake" (most visible):**
- **Marketplace crash** — server-component `onError` removed (the `/dashboard/marketplace` "Something went wrong").
- **Marketplace fake agents** — Lena & Tony were "buyable" but don't exist → now **"Coming soon"** (non-buyable); FIGSY "Included" → **"Pay per result"**.
- **Agent Grid cards** — added `object-top` + larger avatar (heads were centre-cropped).
- **3 avatar crashes** guarded (`from_email[0]`/`first_name[0]` threw on empty values) — inbox + replies.
- **Fabricated "Suggest Campaigns" counts** — was showing `total×0.4` / `×0.3` made-up numbers → now only real signals.
- **Usage credit-history** showed raw `usage`/`referral_bonus` strings → now proper labels.

**The core disease — numbers not reconciling (your emails-sent + leads-used complaints):**
- **ALL campaign counters now reconcile from source** on `/figsy/campaigns` + `/campaigns/:id` — `emails_sent`, `replies_total`, `replies_interested`, `opted_out`, `meetings_booked`, `leads_enrolled` are corrected up to the real row counts. The Dashboard sums these, so its numbers now match reality.
- **Usage "Leads used: 0" fixed** — two root causes: (1) a billing-period start in the *future* made everything show 0 → now clamped; (2) it excluded opted-out leads you'd already been charged for → now counted.

**Plumbing / links ("information doesn't flow"):**
- `/replies/all` now exposes lead **id + linkedin_url** → the **LinkedIn chip works** (was always blank) and **reply→lead** is possible.
- Added a **reply→campaign link** in the replies detail.

**Correctness:**
- Fixed **5 wrong/insecure API URL fallbacks** (`api.kindai.co.za` wrong domain; `http://` not `https://`) across settings/invite/leads/referral.

---

## 🚩 LAUNCH-CRITICAL — verify before ST1 (only you can)
**Confirm `supabase/migrations/20260603_schema_reconcile.sql` is applied in PROD Supabase.** The reply classifier writes `'hot'`/`'warm'`/`'cold'`; the *original* CHECK constraint rejects those. If the reconcile migration isn't applied, **every reply insert fails → classification silently breaks → "0 replies" everywhere.** This is the SMOKE_TEST pre-flight keystone. (Confirmed in code that `'hot'` is the correct value — not a bug to "fix" in queries.)

---

## 🟡 REMAINING (prioritised — for the daily smoke-test loop, NOT yet done)
1. **`roadmap` page** — ~80 features hardcoded as "Live"/"New" to clients. **Needs your call on what's actually shipped** — I won't guess and mislabel. (Not in the V2 sidebar, so lower reach.) Recommend: gate it, or mark honest statuses.
2. **Leads page tab pills** (Pending Review / In FIGSY) count from the loaded 50-row page, not totals → undercount past page 1. Fix = return per-status counts from `/leads/stats`.
3. **Missing links still open:** campaign→its leads (needs a `campaign_id` filter on `/leads`), lead→its campaign, ICP→its leads.
4. **Analytics** conflates "hot reply" = "meeting booked" (3 different definitions of meetings across pages).
5. **Settings** writing-style / notification prefs are **localStorage-only** (say "Saved" but aren't persisted server-side).
6. **`denise` page ungated** while every sibling agent gates on subscription.
7. **developer vs mcp** pages show two conflicting MCP tool catalogs.
8. **assistant** integrations panel is hardcoded "Connect" buttons that do nothing.
9. **Credit-balance desync risk:** FIGSY per-enrollment deduction swallows errors (figsy.ts) — can drift `figsy_credits_remaining` from the ledger. Recommend switching to the checked `increment_client_credits` RPC.
10. **`INCLUDED_LEADS=100`** hardcoded (usage) — should reflect the client's real plan.

---

## ST1 guidance (fresh signup)
A brand-new account won't hit the billing-period edge cases — focus on: signup→onboarding→ICP→leads sourced+scored→campaign+enroll→drip. Mark anything off and send it; I'll fix in the PM batch before ST2.

_All fixes committed to `main` (commits up to the latest). Branch + main in sync._
