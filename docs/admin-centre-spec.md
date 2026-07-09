# 🖥️ K.I.N.D — Admin Centre spec (Milestone 3)

> **What this doc is:** the build spec for the rebuilt Admin Centre — the cockpit WE run the business from. **Status of record lives in PRODUCT-INVENTORY** (#270–#284); **daily execution lives in LAUNCH-PAD**; this doc is the *shape we build to*. Locked 1 Jul 2026.
> **Build mode: LIVE.** The Admin Centre is internal (founder + staff only), not client-facing → the preview-first gate (RULEBOOK §11) does **not** apply. We build → push live → founder beta-tests in the live system → verify → next.

*(The approved clickthrough preview was a session artifact shared in-chat — not stored in the repo. This spec is the durable record of what was approved.)*

---

## The problem it solves
31 fragmented admin pages, no single "what needs me now", no unit economics, no team/partner oversight. Rebuild into **one cockpit + a few sections + an always-there co-pilot.**

## Target shape — 3 layers
1. **PULSE** — 6 tiles: Revenue (per-lead collected) · Cash & runway (Wise) · Clients · This-week (signups/demos/meetings) · System health · Pool stock.
2. **NEEDS YOU NOW** — the Action Queue (the whole point): signup→assign · payment→provision · day-29 switch · pool-low · at-risk.
3. **SECTIONS** — Clients · Finance · GTM/Pipeline · Engine/Deliverability · Compliance · Sales Demo. Plus **Command Centre** (team + partners). Xero + Wise hyperlinked.

## The 31 pages → decision *(23 keep/consolidate + 8 cut = 31, all accounted)*
- **Keep / consolidate (23 → 1 cockpit + 6 sections):** root, founder, status → Cockpit; health → Engine; revenue, cohorts → Finance; clients, clients/[id], activation, activity, agents/[agent] → Clients; compliance, terms-library → Compliance; partners, partners/[id], proposals → GTM + Command Centre; cmo, unibox, messages, visitors, analytics, hubspot → GTM; demo → Sales Demo.
- **Cut from daily (8):** data-moat, scalability (→ quarterly) · roadmap, playbook, docs/[doc] (→ hyperlink) · launch (→ archive) · seed, smoketest (→ dev flag).
- **Build new (8):** Action Queue · Pool-stock tile · Unit economics/margin · Cash/runway + Xero P&L · **Command Centre (per-AE + per-partner, #274)** · Deliverability view · **Nora — admin co-pilot (#275)** · **Per-staff logins + roles (#276)**.

## Build progress (live)
- **Slice 1 — Cockpit (#272): SHIPPED 🩷** (1 Jul) — root `apps/admin/src/app/page.tsx` rebuilt to **Pulse (6 tiles) + Needs-You-Now Action Queue + Unit economics**; nav reshaped to the IA above (`AdminSidebar.tsx`), 8 pages moved to "Dev · not daily"; `/command` placeholder added. Real data: per-lead revenue, clients, signups-this-week, at-risk (churn engine). *Needs Jacques (live switches): Wise → cash/runway tile · Smartlead → pool-stock tile + triggers · Xero → real cost stack in unit economics.*
- **Slice 2 — Command Centre (#274): SHIPPED 🩷** (1 Jul) — `apps/admin/src/app/command/page.tsx`: Partners tab **live** (list · referrals · open deals mini-CRM · commission paid/owed — from `/api/proxy/partners/admin/*`), read-only; Team tab = add-AE empty-state + the per-AE panel shape. *Needs Jacques: set per-partner targets (→ 3× coverage) · upload contracts to the vault · AEs appear once #276 logins ship.*
- **Slice 3 — Nora (#275): SHIPPED 🩷** (1 Jul) — right-rail admin co-pilot (`components/NoraRail.tsx`, mounted in the admin layout), context-aware per screen; backend `POST /founder/nora` (`routes/founder.ts`, admin-key gated, Claude Haiku, logs to `founder_agent_logs`). Uses `ANTHROPIC_API_KEY` (already set). Avatar `/agents/Nora.png`. *Live now — walk it by asking Nora on any screen.*
- **Slice 4 — Finance cards (#272): SHIPPED 🩷** (1 Jul) — Finance section (`revenue/page.tsx`) now leads with **Xero (P&L/VAT) + Wise (cash & runway) hyperlinked cards + a Net card** (per-lead revenue real, cost stack an estimate). *Needs Jacques: connect Xero + Wise for live P&L / cash / runway.*
- **Slice 5 — Engine / Deliverability (#272): SHIPPED 🩷** (1 Jul) — `health/page.tsx` renamed to Engine + a **Deliverability readiness** checklist (the silent-fail keys: RESEND/ADMIN, cron, bounce events #267, PDL #243). *Needs Jacques: enable Resend bounce events + set PDL_API_KEY (flagged in-page).*
- **Still to build (blocked on founder creds/design):** **triggers #270/#271** (real inbox provision/switch needs Smartlead API access) · **per-staff logins #276** (real multi-user auth — needs a design call; not safe to ship blind to a live admin). Cockpit Action Queue already surfaces these as "soon".

## ⚠️ Course-correction (1 Jul, founder) — adopt the client-portal design system
The ad-hoc slices above shipped but the admin reads **inconsistent** (layout drift, weak Nora, duplicated metrics). Root cause: the admin **hand-rolls UI** instead of reusing the polished **client portal** (`apps/portal`). Decision:
- **Adopt the portal's design system into `apps/admin` — copy only; the live client portal is NEVER touched.** (#277)
  - Theme tokens (violet `#7C3AED` · Inter · gradients · dark) → admin Tailwind + globals
  - Components: `StatCard` · `Card` · `Button` · `Pill` · `MarkdownLite` · Recharts wrappers
  - **Slim collapsible sidebar** (portal look — icon rail expands to labels on hover/pin)
  - **Rebuild Nora on the portal `AgentSidePanel`** (avatar header · bubble thread · chips · live endpoint) — the current bespoke `NoraRail` is the weak version
- **Single source of truth for metrics** (#282): each metric has ONE detailed home; the Cockpit only *glances* + links.
  - Cohorts → `/cohorts` only · churn/at-risk → Clients · MRR → Finance.

### ▶ #277 build progress (build-live, one slice per PR)
- **Slice A — design-system foundation: MERGED #887** (tsc + `next build` green). Admin Tailwind adopted the portal violet ramp (`brand.50–900`) + `kind-gradient` + Inter + `darkMode:'class'` (was `brand=#0066FF` blue); `globals.css` gained the portal token system + `.ds-card/.ds-text-*`; `ui.tsx` is now the real shared kit — **Button** + portal-parity **StatCard** added, **MarkdownLite** copied + re-exported; **recharts** installed. Slim collapsible violet sidebar already existed → no rebuild. *(Invisible plumbing by design — the admin was already violet via hardcoded hex.)*
- **Slice B — Nora + gradient + Cockpit: MERGED #888, founder saw it live.** Nora rebuilt in the `AgentSidePanel` design language (photo header · dark identity bar · avatar bubbles · **MarkdownLite** · typing dots), admin `main` on the **`kind-gradient`** backdrop, Cockpit on frosted portal cards.
- **Slice C — honesty + defect sweep: MERGED #890** (fake Sales-Channel charts gated to sample lenses · cut HubSpot · real `/health` probe · dead `KpiTargetsSection` deleted · Cockpit MRR `amount_usd` fix · Nora float/fallback). **Slice C.2 — chrome parity: MERGED #893** (docked-rail Nora + slim-default sidebar; #892 closed).
- **Slices D → Ops — ALL MERGED 2 Jul (one PR each, machine-gated, honest wire-in shells / NO fake data):** **D #896** #282 cohorts dedup (Finance sample table removed, `/cohorts` sole home) · **E #897** #281 Clients rebuild (**🔴→🩷** — kit + At-risk tile + Activity/Activation/Messages folded into `ClientsTabs`) · **F #898** #277 Finance→kit (16 cards frosted) · **G #899** #278 GTM Hub shells (`/gtm`) · **H #900** #279 Engine graph shell · **I #901** #274 Sales Channel shells (Contracts/Winning-plays/per-person targets) · **Ops #902** #280 Ops shells (`/ops`). *(Note: actual slice→item map is F = Finance #277, I = Sales Channel #274, Ops = #280.)*

### 📊 Admin build audit (updated 2 Jul PM — Fable regroup)
- 🩷 **live, not verified (walk these):** Cockpit (#888) · **Clients rebuild (#897)** · Sales Channel (partners live, AE/overall sample) · **Finance → kit (#898)** · cohorts dedup (#896) · **docked-rail Nora (#893)** · design-system foundation (#887)
- 🟢 **live + verified:** Sales Demo · Compliance · Terms
- 🩷 **wired-in + deployed 3 Jul (via `railway up` — auto-deploy was down):** #279 Engine deliverability graph now LIVE (real bounce/complaint per day from `figsy_sent_emails` + `opt_out_blocklist`) · #291 GTM Funnel tab (visitor→signup→trial→paid) · #295/#296/#297 Billing ledger · #286 failed-payment follow-up (per-charge — no recurring dunning) Cockpit rows · #292 per-client usage trend · #288 real Sales-Channel analytics + #294 hardcoded-coverage lie removed · #282 single-homing complete · #299 dead imports removed
- 🔴 **still shell / blocked:** #278 GTM Strategy/Results/plays/calendar tabs (sign-off · M1 live · feeds) · #274 per-person targets + contracts vault + winning plays (need AE data #276) · #280 Ops pool/onboarding (Smartlead) · #270/#271 Cockpit triggers (Smartlead) · #276 per-AE logins (auth design call)
- ✅ **defects FIXED (were flagged 2 Jul, resolved by 3 Jul):** Finance revenue (per-lead) now uses `amount_usd` source-of-truth (`revenue/page.tsx:126-127`) · retired "$20 Lead Gen" ARPU tier cards removed (`revenue/page.tsx:294-296`) · 6 dead `AdminSidebar` icon imports removed (#299)
- ⏸ **blocked on founder:** Xero/Wise/Stripe connects · Smartlead (pool + triggers) · #276 auth decision · PDL key · Resend events
- 🔌 **needs reporting endpoint (live data):** AE/Overall analytics · Engine graph · content calendar · winning plays

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
