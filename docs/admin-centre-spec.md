# 🖥️ K.I.N.D — Admin Centre spec (Milestone 3)

> **What this doc is:** the build spec for the rebuilt Admin Centre — the cockpit WE run the business from. **Status of record lives in PRODUCT-INVENTORY** (#270–#276); **daily execution lives in LAUNCH-PAD**; this doc is the *shape we build to*. Locked 1 Jul 2026.
> **Build mode: LIVE.** The Admin Centre is internal (founder + staff only), not client-facing → the preview-first gate (RULEBOOK §11) does **not** apply. We build → push live → founder beta-tests in the live system → verify → next.

Preview mockup (clickthrough): `scratchpad/admin-centre-preview.html`.

---

## The problem it solves
31 fragmented admin pages, no single "what needs me now", no unit economics, no team/partner oversight. Rebuild into **one cockpit + a few sections + an always-there co-pilot.**

## Target shape — 3 layers
1. **PULSE** — 6 tiles: MRR · Cash & runway (Wise) · Clients · This-week (signups/demos/meetings) · System health · Pool stock.
2. **NEEDS YOU NOW** — the Action Queue (the whole point): signup→assign · payment→provision · day-29 switch · pool-low · at-risk.
3. **SECTIONS** — Clients · Finance · GTM/Pipeline · Engine/Deliverability · Compliance · Sales Demo. Plus **Command Centre** (team + partners). Xero + Wise hyperlinked.

## The 31 pages → decision *(23 keep/consolidate + 8 cut = 31, all accounted)*
- **Keep / consolidate (23 → 1 cockpit + 6 sections):** root, founder, status → Cockpit; health → Engine; revenue, cohorts → Finance; clients, clients/[id], activation, activity, agents/[agent] → Clients; compliance, terms-library → Compliance; partners, partners/[id], proposals → GTM + Command Centre; cmo, unibox, messages, visitors, analytics, hubspot → GTM; demo → Sales Demo.
- **Cut from daily (8):** data-moat, scalability (→ quarterly) · roadmap, playbook, docs/[doc] (→ hyperlink) · launch (→ archive) · seed, smoketest (→ dev flag).
- **Build new (8):** Action Queue · Pool-stock tile · Unit economics/margin · Cash/runway + Xero P&L · **Command Centre (per-AE + per-partner, #274)** · Deliverability view · **Nora — admin co-pilot (#275)** · **Per-staff logins + roles (#276)**.

## Build progress (live)
- **Slice 1 — Cockpit (#272): SHIPPED 🩷** (1 Jul) — root `apps/admin/src/app/page.tsx` rebuilt to **Pulse (6 tiles) + Needs-You-Now Action Queue + Unit economics**; nav reshaped to the IA above (`AdminSidebar.tsx`), 8 pages moved to "Dev · not daily"; `/command` placeholder added. Real data: MRR, clients, signups-this-week, at-risk (churn engine). *Needs Jacques (live switches): Wise → cash/runway tile · Smartlead → pool-stock tile + triggers · Xero → real cost stack in unit economics.*
- **Slice 2 — Command Centre (#274): SHIPPED 🩷** (1 Jul) — `apps/admin/src/app/command/page.tsx`: Partners tab **live** (list · referrals · open deals mini-CRM · commission paid/owed — from `/api/proxy/partners/admin/*`), read-only; Team tab = add-AE empty-state + the per-AE panel shape. *Needs Jacques: set per-partner targets (→ 3× coverage) · upload contracts to the vault · AEs appear once #276 logins ship.*
- **Slice 3 — Nora (#275): SHIPPED 🩷** (1 Jul) — right-rail admin co-pilot (`components/NoraRail.tsx`, mounted in the admin layout), context-aware per screen; backend `POST /founder/nora` (`routes/founder.ts`, admin-key gated, Claude Haiku, logs to `founder_agent_logs`). Uses `ANTHROPIC_API_KEY` (already set). Avatar `/agents/Nora.png`. *Live now — walk it by asking Nora on any screen.*
- **Slice 4 — Finance cards (#272): SHIPPED 🩷** (1 Jul) — Finance section (`revenue/page.tsx`) now leads with **Xero (P&L/VAT) + Wise (cash & runway) hyperlinked cards + a Net card** (MRR real, cost stack an estimate). *Needs Jacques: connect Xero + Wise for live P&L / cash / runway.*
- **Slice 5 — Engine / Deliverability (#272): SHIPPED 🩷** (1 Jul) — `health/page.tsx` renamed to Engine + a **Deliverability readiness** checklist (the silent-fail keys: RESEND/ADMIN, cron, bounce events #267, PDL #243). *Needs Jacques: enable Resend bounce events + set PDL_API_KEY (flagged in-page).*
- **Still to build (blocked on founder creds/design):** **triggers #270/#271** (real inbox provision/switch needs Smartlead API access) · **per-staff logins #276** (real multi-user auth — needs a design call; not safe to ship blind to a live admin). Cockpit Action Queue already surfaces these as "soon".

---

## 🎖️ Command Centre (#274) — per-AE + per-partner
The **client Command-Centre shape, applied to our own team and our partners,** rolled up so the founder can watch every play. Two sub-views:

**👤 Our team (AEs)** — staff use K.I.N.D themselves to source + work leads; admin is the founder's window. Access = **read + manage**, plus **＋ Add team member**.
**🤝 Partners** — pay to use K.I.N.D and sell for us. Access = **read-only oversight** (we never operate on their behalf).

**Per person, both types show the same panel:**
- **Money** — Book MRR closed/held · commission earned (AE) / owed (partner).
- **🎯 Targets & tracking** — Monthly MRR · Quarter-to-date · Annual, each vs target with a progress bar + % (green ≥100 · amber ≥60 · red below).
- **📈 Pipeline coverage** — open pipeline · **pipeline needed (3× target)** · coverage ratio with a healthy/under-covered verdict.
- **🗂 Mini-CRM** — open deals: company/prospect · stage · value · next step (partners also show protection-days).
- **Plays** — what's working / not (reply rates, health), green→kill.
- **Contracts & documents** — per-person vault (AE: employment/comp/NDA/data-handling; partner: agreement/payout terms/NDA/DPA).

Shell built now; live per-person data fills in as we hire AEs / onboard partners (so it's **coming-soon** on data, not on the build).

---

## 🤖 Nora — The Keeper (#275)
Right-rail conversational agent inside the Admin Centre. **All-round admin co-pilot** (operations + business), **context-aware to the current screen** — she re-greets and re-suggests starters for whatever section you're on (Finance → runway + "what if I hire an AE?"; Clients → the at-risk account; Command Centre → AEs/partners; Engine → the missing key). Persona: *tidy · secure · in control.*
Admin/founder-only — **distinct** from the client agents (Figsy/Milla/Denise/Vida) and from partner-side **Alex**.

## 🔐 Per-staff logins + roles (#276)
Each hire gets their own login; role-scoped access (founder vs AE vs SDR). Staff operate the product; admin is oversight.

---

## Dependencies (founder-owned, unblock live data)
- **Xero** connected (OAuth) → P&L / VAT cards.
- **Wise** connected → cash & runway.
- **Smartlead** pool access/API (#211) → pool-stock tile + provision/switch triggers.
- **PDL_API_KEY** (#243), **Resend bounce events** (#267) → Engine section shows green.
- **Targets set** per AE / partner → the numbers Nora tracks against.

## Build order (each shipped live, then beta-tested, then next)
1. Cockpit shell (Pulse + section nav) + cut the 8 pages.
2. Action Queue + triggers (#270 signup→assign, #271 payment→provision, day-29 switch).
3. Finance (Xero/Wise cards) + unit economics + pool-stock tile.
4. Command Centre shell (#274) — AE + partner panels (targets · 3× pipeline · mini-CRM · contracts).
5. Nora (#275) — context-aware right rail.
6. Per-staff logins + roles (#276).
