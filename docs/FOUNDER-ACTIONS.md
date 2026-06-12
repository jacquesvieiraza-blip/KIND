# 🚀 K.I.N.D — ONE LAUNCH CHECKLIST (Mon 15 company ship · Fri 19 launch)

> **📅 THE PLAN (locked 12 Jun — supersedes "one combined launch"):**
> 1. **Mon 15** — Company Command Centre + payment system → **production** (the ONLY early ship)
> 2. **Fri 19** — **LAUNCH** (the proven core already live on `main`)
> 3. **Post-19** — everything else (the 25 release PRs · shell redesign · Alta inbox · review queue)
>
> This is the single founder tick-list. Full status of every item: `PRODUCT-INVENTORY.md`.
> Monday test script: `COMPANY-ENGINE-TEST.md`. Per-screen review log: `STAGING-REVIEW.md`.

**Owner key:** 🧍 founder · 🤖 Claude · 🤝 both

---

## 1 · THIS WEEKEND (~20 min, from your phone)
- [ ] 🧍 Email **`partners@apollo.io`** — API reseller / partner agreement (~1 wk lead time)
- [ ] 🧍 Sign up **hunter.io** → save the API key somewhere safe
- [ ] 🧍 Sign up **peopledatalabs.com** (free) → save the API key

## 2 · MONDAY 15 — THE COMPANY SHIP (~45 min at your desk)
- [ ] 🧍 **Merge** `claude/kind-carson-MYhSl` → `staging` (GitHub PR, base `staging`)
- [ ] 🧍 **Re-paste `staging-schema.sql`** in `kind-staging` SQL editor → Run *(adds `enabled_agents`)*
- [ ] 🧍 **Redeploy BOTH** `api-staging` + `heartfelt-essence` · do **NOT** re-run the company seed
- [ ] 🧍 **Test the Command Centre** — `COMPANY-ENGINE-TEST.md` top to bottom (incl. new Test 7 agent toggles)
- [ ] 🧍 **Stripe:** create the **$39 Denise price** → `STRIPE_PRICE_DENISE_MONTHLY` on Railway *(else checkout charges $99)*
- [ ] 🧍 **Stripe:** create the **pool-topup products** once Claude's billing lands (lead-gen $1 · FIGSY $3)
- [ ] 🧍 **Ship to production:** run `20260612_company_engine.sql` on prod Supabase *(idempotent, additive)* → merge `staging` → `main` → set `NEXT_PUBLIC_FEATURE_V2_SCREENS` to include **`company` ONLY** *(everything else stays flag-hidden until post-19 review)* → fund the demo pool → smoke-check `/dashboard/company` live

## 3 · CLAUDE BUILDS (🤖 — nothing needed from you)
- [ ] 🤖 **Stripe → company pool billing** (single pool first, two-pool right after) — *building now, needed for Monday*
- [ ] 🤖 Fix any smoke-test failures same-day as you run them
- *(Moved post-19: invite email delivery · owner drill-down — Monday's demo uses the copy-paste invite link, which works.)*

## 4 · LAUNCH-CRITICAL GATE (🧍, before Fri 19)
- [ ] 🧍 **D9 deliverability 10/10** — `DELIVERABILITY-D9-CHECKLIST.md`
- [ ] 🧍 **Legal pack #10–14** — ICO (£40) · SR01 · registered office · WHOIS privacy · LinkedIn lockdown
- [ ] 🧍 **Smoke tests** T3–T7, T9, T10 (you run, Claude fixes same-day)
- [ ] 🤝 **Go/No-Go gate — Thu 18 Jun** → 🚀 **LAUNCH Fri 19**

## 5 · DEMO PREP (🧍, before the multi-rep client demo)
- [ ] 🧍 Admin → Demo Envs → tick "Company demo" → Open → `/dashboard/company` populated
- [ ] 🧍 If demoing before Monday's prod ship, demo on **staging** (live + working)

---

## ✅ Already done (12 Jun)
Staging isolation · status bar · account-hub dropdown · nav redesign · PWA icons · deliverability dashboard · activity feed · notification centre · **Company Engine** (per-rep workspaces · pools · budgets · request→approve · invite→accept · autonomy · winning plays · per-rep agent unlock · admin Company-demo) · **Denise $99→$39 in code** · offline flow docs · key rotations (11 Jun) · **docs consolidated → ONE inventory** (`PRODUCT-INVENTORY.md`).

## ▶️ After the 19th (parked, not launch-blocking)
The entire staging review queue (R1–R25 PRs · shell redesign · `STAGING-REVIEW.md` walkthrough) · **Alta-style inbox rebuild** (your 👎 12 Jun, logged) · invite email delivery · owner drill-down · manager role/offboarding/routing/calendars · Wave-4 keys (WhatsApp/Vapi/Clearbit) · record videos · Y16 (kill Vercel↔GitHub) · outcome-based pricing.
