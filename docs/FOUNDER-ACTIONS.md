# 🚀 K.I.N.D — ONE LAUNCH CHECKLIST (target: Fri 19 Jun)

> **Decision (12 Jun):** ONE combined launch — the full staging batch **+** the Company Engine ship
> together by the 19th. No separate Command-Centre track. Path = `staging → main` (one merge).
> This is the single source for founder actions. Companion detail: `LAUNCH-AUDIT-12JUN.md`,
> `COMPANY-ENGINE-TEST.md`, `STATUS-12JUN.md`. Tick items here as you go.

**Owner key:** 🧍 founder · 🤖 Claude · 🤝 both

---

## 1 · GET STAGING CURRENT + TESTED (this weekend / Mon)
- [ ] 🧍 **Merge** `claude/kind-carson-MYhSl` → `staging` (PR, base `staging`)
- [ ] 🧍 **Re-paste `staging-schema.sql`** in `kind-staging` SQL editor *(adds `enabled_agents`)*
- [ ] 🧍 **Redeploy BOTH** `api-staging` + `heartfelt-essence` (watch a real build) · do **NOT** re-run the company seed
- [ ] 🧍 **Test the Company Engine** end-to-end on staging — `COMPANY-ENGINE-TEST.md` (Command Centre · approve a request · seat agent toggles · admin "Company demo")
- [ ] 🧍 **Review the V2 batch** on staging — walk the screens, log 👍/👎 in `STAGING-REVIEW.md`. *(Launching everything means these go live too — flag anything that must change before the 19th.)*

## 2 · CLAUDE BUILDS BEFORE LAUNCH (🤖 — in progress)
- [ ] 🤖 **Stripe → company pool billing** — owner pays → pool funded. **Build order (Claude's call): single pool first, two-pool split right after — both before the 19th.** *Building now.*
- [ ] 🤖 **Invite email delivery** (owner clicks invite → rep emailed) + **owner drill-down** into a rep
- [ ] 🤖 Fix any **smoke-test failures** same-day as you run them

## 3 · INTEGRATION KEYS — data moat (🧍, do soon, ~1 wk lead time on Apollo)
- [ ] 🧍 **Email `partners@apollo.io`** — Apollo API reseller / partner agreement *(ToS-compliant reselling; ~1 week)*
- [ ] 🧍 **Create Hunter.io account → `HUNTER_API_KEY`** (~$49/mo) — lights the enrichment waterfall (code dormant, ready)
- [ ] 🧍 **Get a free `PDL_API_KEY`** — activates the 2nd lead-discovery source (code dormant, ready)

## 4 · PRICING (🧍)
- [ ] 🧍 **Create the $39 Denise Stripe price** → update `STRIPE_PRICE_DENISE_MONTHLY` on api + portal → redeploy. *(Code is $39; Stripe object still $99 until you do this — else checkout charges $99.)*
- [ ] 🧍 **Create Stripe pool-topup products** (lead-gen $1/unit · FIGSY $3/unit) once Claude's billing lands.

## 5 · LAUNCH-CRITICAL GATE (🧍, before Fri 19)
- [ ] 🧍 **D9 deliverability 10/10** — `DELIVERABILITY-D9-CHECKLIST.md`
- [ ] 🧍 **Legal pack #10–14** — ICO (£40) · SR01 · registered office · WHOIS privacy · LinkedIn lockdown
- [ ] 🧍 **Smoke tests** T3–T7, T9, T10 (you run, Claude fixes same-day)
- [ ] 🤝 **Go/No-Go gate — Thu 18 Jun**

## 6 · THE PRODUCTION LAUNCH (🧍, on go — the 19th)
- [ ] 🧍 **Run `20260612_company_engine.sql` on PRODUCTION Supabase** *(idempotent, additive, safe for existing clients)*
- [ ] 🧍 **Merge `staging` → `main`** *(you only — after review + Go/No-Go)*
- [ ] 🧍 **Set production flags** — `NEXT_PUBLIC_FEATURE_V2_SCREENS` to the approved set (include `company`; add `layout` etc. for whatever V2 screens you approved)
- [ ] 🧍 **Smoke-check production** — login, a real send, the Command Centre, billing

## 7 · DEMO PREP (🧍, before the client demo)
- [ ] 🧍 Create a **Company demo** in the admin portal (Demo Envs → tick "Company demo") → Open → `/dashboard/company` is populated
- [ ] 🧍 If demoing before the prod launch, demo on **staging** (already live + working)

---

## ✅ Already done (12 Jun)
Staging isolation · status bar · account-hub dropdown · nav redesign · PWA icons · deliverability dashboard · activity feed · notification centre · **Company Engine** (per-rep workspaces · pools · budgets · request→approve · invite→accept · autonomy · winning plays · per-rep agent unlock · opt-in provision · admin Company-demo) · **Denise $99→$39** · offline flow docs · MCP explainer · key rotations (11 Jun).

## ▶️ After the 19th (separate, not launch-blocking)
Wave-4 keys (WhatsApp/Vapi/Clearbit) · record videos · Y16 (kill Vercel↔GitHub) · outcome-based pricing · finish company-engine 🟡 items (manager role, offboarding, calendars, routing) · the staging review queue (A/B, Kanban…).
