# K.I.N.D — Build Brief for Claude Code (the live Comp Engine + P&L + portals)
> **Provenance:** authored by the founder, pasted 19 Jun 2026. The full artifact set (this brief + the xlsx tracker + ~15 HTML calculators + diagram + playbook + written docs) lives in the **`kind handoff` zip in the founder's Documents** — NOT yet in any repo. This file captures the brief text so the spec isn't lost. **STATUS: logged for the NEXT-WEEK build — do NOT build yet (founder: "don't build, just add to our list").** Tracked as PRODUCT-INVENTORY item **203**.

---

Read this file first. It is the authoritative spec for turning the attached design artifacts into a live system.

## 0. What to do with this folder
- Put this whole folder into a fresh git repo (KIND is "GitHub-everything").
- Read this brief top to bottom.
- Open `KIND-Live-System-Blueprint.html` (data-flow diagram) and `KIND-Operating-Playbook.html` (how the business runs) for context.
- Treat `KIND-Sales-Commission-Tracker.xlsx` as the **maths spec & test oracle** — the commission engine must reproduce its numbers exactly. It is NOT the product; do not ship the spreadsheet as the app.
- Build in the phases in §6. **Confirm the plan with the founder before writing code.**

## 1. What KIND is
AI-SDR SaaS for B2B SMBs (LIVE since 18 Jun). **GTM = two tracks (25 Jun):** US/UK/EMEA via our own direct outreach + Africa via direct (data, item 243) + partners. Solo, stealth, faceless brand. UK-registered limited company. **All money in USD** (the original brief said £/GBP — superseded by the 22-Jun USD lock; see the §3 footer). ~91–92% gross margin. Payments on Stripe. The artifacts model sales compensation + company P&L; the job is to make them **live**.

## 2. The system (one paragraph)
Stripe webhooks in → **attribute** each customer (partner code / AE tag / no code → agent) → **one commission engine** applies the comp rules → write to **one database** → **three read-only-ish portals** (AE, partner, admin) → owner approves payouts → Stripe/payroll pays out. (See `KIND-Live-System-Blueprint.html`.)

**Three disciplines (do not violate):**
1. **Stripe is the single source of truth for money.** Every figure ties back to Stripe. Never reconcile by hand.
2. **Attribution is captured once, at sign-up** — a partner referral code, an AE deal tag, or neither.
3. **The comp rules live in exactly ONE engine.** Never reimplement 20/5/5 in multiple places. All portals read the same engine.

## 3. The compensation model (engine must match EXACTLY — validate vs the xlsx `Plan Settings` tab)
**Commission ("20/5/5"):**
- **Land 20%** — one-time, when a NEW client signs: 20% × first-month collected revenue.
- **Retain 5%** — recurring, every month a client stays: 5% × that rep’s active book (collected revenue).
- **Expand 5%** — one-time, when an EXISTING client upgrades: 5% × collected-revenue increase.

**AE base + ramp guarantee:**
- Variable target from base via 60/40 mix: variable = base × (1 − mix)/mix (mix 0.6 → variable = base × 0.667). Monthly base = base/12.
- Ramp guarantee (AEs only, months 1–4): **100% / 100% / 75% / 75%** of monthly variable.
- Monthly pay = monthly base + MAX(earned commission, guarantee-that-month). Months 5+: monthly base + earned commission (guarantee 0).

**AE tiers (pay mix 60/40 all):**
| Tier | Base $/yr | Variable $/yr | OTE $/yr | Avg deal $/mo (collected) | Churn %/mo |
|---|---|---|---|---|---|
| Enterprise | 67,500 | 45,000 | 112,500 | 1,500 | 3% |
| Mid-Market | 45,000 | 30,000 | 75,000 | 700 | 4% |
| SMB | 30,000 | 20,000 | 50,000 | 400 | 5% |

**Partners (no base, no guarantee, no expand):** Acquisition **20%** (one-time, new client first-month collected revenue) + Retention **5%** (recurring, active book). Partner tiers by avg client collected revenue/mo: SMB $250, Mid $500, Enterprise $750. Churn 4%/mo. Credited via referral code captured at sign-up.

**KIND Agent (self-serve / direct / house):** no partner code & no AE tag → credited to the house. **Revenue only — no base, no commission, no payout.** Modelled avg deal ~$120/mo collected, churn ~6%/mo (editable).

**Margin & P&L:** Gross margin ~91–92%. Net@margin = gross book × ~0.915. Net after sales pay = Net@margin − sales payout. Net after ALL costs = Net after sales pay − operating-team costs.

**Operating team (cost only, non-sales):** flat monthly = annual/12 from each role's start month. Defaults (editable): Customer Success $40k, Tech Eng $60k, Payroll & Accounts $35k, HR (outsourced) $12k, Partner Manager $40k.

**Start-month logic:** every source (rep/partner/agent) + operating role has a start month; before it: $0. start = 0/blank = not hired/active.

## 4. The portals
- **AE portal** (one login per AE, read-only): live book, deals, commission, base, guarantee, total pay. Mirror `KIND-commission-statement.html`.
- **Partner portal** (one login per partner, read-only): referral code, clients, retention, earnings (20% + 5%).
- **Admin portal** (founder) = the **live company P&L** (the Master view, live): total sales/new collected revenue · gross sales (book) · net @ ~91–92% · sales payout (commission + base + guarantee) · operating expenses · net after everything · exit book / run-rate. Plus controls: who's hired, start dates, salaries, **approve-payouts** button.
- **Payouts:** engine calculates → **founder approves (human gate)** → Stripe/payroll pays. **Never auto-pay.**

## 5. Target roster (admin must hold each as an individual record, own login/actuals)
2 Enterprise AEs · 5 Mid-Market AEs · 5 SMB AEs · 5 SMB Partners · 5 Mid-Market Partners · 5 Enterprise Partners · 1 KIND Agent · the operating team.

## 6. Suggested build order (confirm with founder first)
1. **Data model + Stripe:** customers, subscriptions, events (new/upgrade/churn), reps, partners, attribution (code/tag/none), payouts. Wire Stripe webhooks; capture attribution at checkout.
2. **Commission engine** (single module): implement §3 exactly. Unit-test against the tracker.
3. **Admin P&L portal:** the live Master view (§4) + controls.
4. **AE + partner portals:** read-only personal views.
5. **Payout approval flow:** calculate → founder approves → pay.
6. **Metrics + reconciliation:** revenue run-rate/repeat-purchase retention/NRR; monthly Stripe ↔ books reconciliation.

## 7. Guardrails
All currency USD. One repo. Clean small commits. One commission engine, one source of truth (the DB). Rep/partner portals read-only; only the founder writes. Human approval gate before money moves. The HTML calculators + spreadsheet are spec/reference, not the production app. Verify the engine reproduces the tracker's figures before a phase is "done." The spreadsheet stays the founder's planning sandbox — keep it usable.

## 8. File map (in the `kind handoff` zip)
**Spec & context:** `KIND-CLAUDE-CODE-BRIEF.md` (this) · `KIND-Live-System-Blueprint.html` (data-flow) · `KIND-Operating-Playbook.html` (how the business runs) · `KIND-Sales-Commission-Tracker.xlsx` (maths spec + oracle: tabs Plan Settings, Master — Owner View, 28 source tabs, Operating Team).
**Comp calculators (match maths):** `KIND-AE-commission-calculator.html`, `KIND-AE-earnings-calculator.html`, the 6 tier calculators (enterprise/midmarket/smb × internal/earnings), `KIND-partner-calculator.html`, `KIND-partner-earnings-calculator.html`, `KIND-team-PnL-calculator.html`, `KIND-commission-statement.html` (model the AE/partner portal on this).
**Hub:** `KIND-Command-Center.html` (launcher; model the admin home on it) · `KIND-Compensation-Command-Center.html` (superseded; ignore).
**Written docs:** `KIND-AE-COMP-PLAN.md` · `KIND-HIRING-SCALING-ROADMAP.md` · `KIND-FOUNDING-AE-ONBOARDING.md` · `KIND-OPERATING-PROMPT.md` · `KIND-Cheat-Sheet.md`.

## 9. Out of scope for Claude (founder handles)
Auth provider, hosting, visual design system — founder's call (propose options). Per-rep/partner login is expected; build the app it plugs into.

---
*Model: Land 20% / Retain 5% / Expand 5% · ramp guarantee 100/100/75/75 · ~91–92% gross margin · **all USD (founder decision 22 Jun)**. © the founder. Current as of June 2026.*

---
## 🎯 Founder build priority (19 Jun — overrides §6 portal order)
Build the **portals in this order**, account/auth systems done right from the start:
1. **Admin portal + operating SOP** (the live company P&L Master view + the how-we-run-it SOP).
2. **Partner portal.**
3. **AE portal.**
*(The data model + Stripe wiring + the single commission engine are the shared foundation under all three — built before/with the admin portal. "All account systems" = the per-rep/partner login + roles done properly from day one, not bolted on later.)*

## ⚠️ Reconcile notes (for when this is picked up — Claude, 19 Jun)
- **Currency = USD — RESOLVED 22 Jun (founder: "we are USD").** The brief's earlier "all £ GBP" is overridden. The calculators + comp plans already filed in `docs/hiring/` are in **USD (correct, locked 22 Jun)** — consistent with the live product's locked pricing: per qualified lead, no subscriptions — $1 reveal → +$3 FIGSY = $4 → +$1 Milla = $5 → +$1 Denise = $6.
- ~~**Partner rate = 20% + 5%** (this brief is authoritative) → item 197's "25% + 5%" is superseded.~~ ⛓️ **THIS LINE IS ITSELF SUPERSEDED — 19 Aug 2026, R47.** This brief was authoritative on 19 Jun; it is not authoritative on partner comp now. **Current: 25% of approved-lead spend after the included first 100, lifetime, gross, $0 of the $299 pack and $0 on the 100 included approvals.** Retained as the origin of the superseded structure (see **PR10**, chained).
- **This brief operationalizes** items 196 (Stripe = money source-of-truth ledger), 197 (partner comp), 200 (the 3 portals), 201 (AE hire), 202 (HR/legal pack) — it's the concrete build spec for the whole seller engine.
- **Repo question:** the brief says "fresh git repo." Decide: a new repo (like `kind-ops`) vs a module in the KIND product. The Stripe/attribution wiring overlaps the live product, so likely the KIND product (or a tightly-linked service), not fully standalone.
- **Artifacts not yet in any repo** — they're in the founder's `kind handoff` zip. Add them when accessible.
