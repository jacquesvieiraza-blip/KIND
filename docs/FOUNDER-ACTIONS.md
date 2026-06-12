# 🧍 FOUNDER ACTIONS — the things only you can do

> Single consolidated checklist of founder-only tasks (API keys, partnerships, legal,
> production deploys). Claude can't do these — they need your credentials/accounts/signature.
> Grouped by urgency. **Last updated: 12 Jun 2026.**

---

## 🔴 COMPANY ENGINE — go live for the client demo (NEW, before 19 Jun)
*The one build going to production before launch. Tested Monday, demoed next week.*

- [ ] **Monday prep (5 min, in this order):** merge `claude/kind-carson-MYhSl` → `staging` → **re-paste `staging-schema.sql`** in kind-staging (adds `enabled_agents`) → **redeploy BOTH** `api-staging` + `heartfelt-essence` → do **NOT** re-run the company seed. *(Detail: `COMPANY-ENGINE-TEST.md` → REFRESH block.)*
- [ ] **Test the engine on staging** (Mon) — follow `docs/COMPANY-ENGINE-TEST.md` end-to-end (invite → accept → allocate → request → approve → per-rep agent unlock).
- [ ] ⚠️ **Stripe: create the NEW $39 Denise price** — the existing `STRIPE_PRICE_DENISE_MONTHLY` price object is still **$99** (changing code does not change Stripe). Create a $39/mo recurring price → update the env var on api/portal → redeploy. Until then, Denise checkout would charge $99.
- [ ] **Decide company billing in Stripe** — confirmed model: free seats · two credit pools (lead-gen $1/unit, FIGSY $3/unit) · agents per rep (Milla $49 · Vida $29 · Denise $39). Create/confirm the Stripe products + price IDs for **pool top-ups** so the owner can actually pay.
- [ ] **Run the company-engine migration on the PRODUCTION Supabase** — `supabase/migrations/20260612_company_engine.sql` (idempotent, additive: companies table, seat columns, nullable user_id, seat_credit_requests, winning_plays, enabled_agents). Safe for existing clients.
- [ ] **Merge to `main`** (you only) — the company-engine branch → production deploy.
- [ ] **Enable `company`** in production `NEXT_PUBLIC_FEATURE_V2_SCREENS` (or just for the demo client).
- [ ] **Fund the demo company's pool** (until Stripe→pool billing is wired, admin-fund it for the demo).
- [ ] **🎬 Demo showcase** — Claude builds a presentable **demo company** (owner + reps, realistic data, agents unlocked) wired into the admin **Demo Envs**, so the **Company Command Centre is populated + impressive** when you demo. *(Founder requirement 12 Jun — Claude build; you just log in and present.)*

## 🔴 INTEGRATIONS / KEYS — critical, you flagged these
- [ ] **Email `partners@apollo.io`** — Apollo **API reseller / partner agreement** (so reselling off one account is ToS-compliant from client #1; ~1 week turnaround). *Primary fix for the data moat.*
- [ ] **Create Hunter.io account → `HUNTER_API_KEY`** (~$49/mo) — lights the enrichment waterfall (Apollo → PDL → Hunter → Clearbit). Code is ready + dormant until the key is set.
- [ ] **Get a free `PDL_API_KEY`** (People Data Labs) — activates the **2nd lead-discovery source** (`searchPeopleWithFallback`). Code wired + dormant until the key is set.
- [ ] *(later, post-revenue)* Clearbit key · Vapi voice key · WhatsApp Meta approval.

## 🔴 LAUNCH-CRITICAL — before Fri 19 Jun
- [ ] **D9 deliverability 10/10** — `docs/DELIVERABILITY-D9-CHECKLIST.md` (inbox-placement test to 10/10).
- [ ] **Legal pack #10–#14** — ICO registration (£40) · SR01 · registered office · WHOIS privacy · LinkedIn lockdown.
- [ ] **Go/No-Go gate** — Thu 18 Jun.
- [ ] **Remaining smoke tests** — T3–T7, T9, T10 (founder runs, Claude fixes same-day).
- [x] ~~Rotate 2 crown-jewel keys~~ — ✅ DONE 11 Jun (Stripe secret + Supabase service-role).

## 🟡 SOON / POST-LAUNCH
- [ ] **Y16** — kill the dead Vercel ↔ GitHub integration.
- [ ] Social login (Batch 2) — parallel, not a blocker.

---

### How this stays current
When you complete one, tell Claude and it'll tick it here. New founder-only tasks get added here as they come up — so this is the one place "stuff I need to do" lives.
