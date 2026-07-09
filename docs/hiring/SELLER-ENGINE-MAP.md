# K.I.N.D — SELLER & TEAM ENGINE — the full map
*The one place that makes sense of everything the founder assembled 18 Jun: the vision, the two systems it spans, every asset, where each lives, and the open decisions. Reference doc under `/docs/hiring/` — NOT a canonical tracker (status lives in PRODUCT-INVENTORY: 196 · 197 · 200 · 201 · 202).*

> ⚠️ **CORRECTION (23 Jun): there is NO `kind-ops` repo — it was never created (verified: the account has one repo, KIND).** Everywhere below that says "→ `kind-ops` repo" actually means → **Notion** (item 204 — the human/ops layer: SOPs · Business Command Centre · finance/compliance · training). The product (portals, code) stays in **this KIND repo**. All `kind-ops` mentions below are superseded by this note.

---

## 1. The vision (founder, 18 Jun)
> "A **live calculator for our teams. their own portal. all their legal contracts. comp plan. HR documents.**"

Every team member — and every partner — gets **their own portal** holding: a **live comp calculator**, their **comp plan**, their **legal contracts**, and their **HR documents**. Partners and AEs are **the same primitive** (a seller who refers, manages, and earns on retention) on **one foundation** — the only fork is **partner PAYS to use the tool, AE gets it FREE.**

## 2. Two connected systems
The founder's material spans two systems that read the same data but never write to each other (his architecture diagram: *"the two centres never talk to each other directly — each reads the same numbers, so they can never disagree"*).

### A — The SELLER / TEAM ENGINE (product side — THIS repo)
- **One seat primitive, two types:** `partner_paid` | `ae_free`.
- **Three surfaces:** partner portal · AE portal · one admin to manage both.
- **Each portal holds:** live comp calculator · comp plan · **legal contracts + HR docs** · their book (clients) · earnings/payout statements · a **demo environment** · **sell-through-the-product** (ICP→FIGSY→outreach to source their own pipeline).
- **Economics (same spine):** partner **20% acquisition + 5% retention** (197) · AE **20% land / 5% retain / 5% expansion** + 5% multi-seat + 5% partner override (comp plan).
- **Inventory:** 196 ledger · 197 partner model · **200** the portals/foundation · **201** hire AE · **202** the doc/legal pack.

### B — The BUSINESS COMMAND CENTRE (company-ops side — → Notion, item 204; there is NO `kind-ops` repo)
From `getkindbusinesscommandcentre_2.html`. Architecture:
- **Sources of truth:** **Stripe** (payments · VAT · revenue) + **HubSpot CRM** (clients · deals · activity) → **one shared read-only data layer**.
- **Admin Centre** = where you operate daily; **owns** client records, deal pipeline, sales activity, day-to-day; **writes** data.
- **Command Centre** = reference & compliance; **owns** tax rules, deadlines, calculators, compliance checklists, documents, the big-picture; **reads only**.
- **Covers:** how money moves · VAT (B2B SaaS, Stripe Tax) · corporation tax · bookkeeping · compliance tools stack · integrations hub · compliance calendar · business lifecycle · **hiring the AE** · key employment numbers 2026/27 · **salary gross-to-net calculator** · the **complete document checklist**.
- **→ This belongs in Notion (item 204)**, the company-ops/human layer — it's company finance/compliance, not the client product.

**The bridge between A and B = the AE hire.** The comp/portal is System A; the employment, payroll, RTW, compliance is System B. The **document pack (202)** is what both sides share.

## 3. Everything the founder provided — asset inventory
| Asset | What it is | Lives in | Status |
|---|---|---|---|
| **AE Comp Plan v3** | Economics: OTE **$112.5k** ($67.5k base + $45k var, 60/40) · $1,500 ARPU · $4,500/mo new-collected-revenue quota · hire at ~$10k/mo collected revenue · deal-floor ~$550 | `docs/hiring/KIND-AE-COMP-PLAN.md` | ✅ filed (this PR) |
| **AE Commission Calculator (5-yr)** | Live: deal size/churn/base → 5-yr net, compounding book, AE pay curve, break-even | `docs/hiring/KIND-AE-commission-calculator.html` | ✅ filed (this PR) |
| **Team P&L Calculator (5-yr)** | Live: phase the whole GTM team (AE · partner mgr · CSM · support · eng · mid-market AE) → 5-yr contribution | `docs/hiring/KIND-team-pnl-calculator.html` | ✅ filed (this PR) |
| **Partner Comp Plan** | Economics on the same spine (20% acquisition + 5% retention) | `docs/hiring/KIND-PARTNER-COMP-PLAN.md` | ✅ drafted (this PR) |
| **HR / legal pack (5 docs)** | ① Conditional Offer Letter ② Contract of Employment (written statement of particulars) ③ Restrictive Covenants Schedule ④ Right-to-Work Check Record ⑤ New Starter Checklist — UK, K.I.N.D Technologies Ltd | source PDFs → the portal (202) | ⚠️ source PDFs provided; **manifest captured, legal text NOT transcribed** (custom-font cipher + legal accuracy — needs a clean source or careful pass) |
| **Smartsheet FY25 Comp Plan (UK)** | The legal framework the comp plan is modelled on: General · Effective Dates · Definitions (Territory, Base, Commissions, Contingency, Qualified Sale) · Scope/Variable Comp · Eligibility (incl. "repaid excess advances") · Territories · Quota · Comp Overview · Admin/modification | source PDF | structure captured (informs the comp agreement) |
| **Business Command Centre** | Company-ops portal (finance · VAT · tax · compliance · hiring · doc checklist) | → Notion (204) | ⚠️ to set up in Notion |

## 4. The per-seller document pack (what each portal holds) — item 202
**AE (employee):** Conditional Offer Letter → Contract of Employment → Restrictive Covenants Schedule → Right-to-Work Check Record → New Starter Checklist → **Comp Plan + live Calculator** → ongoing HR (payslips, reviews).
**Partner (external):** Partner Agreement (commission · white-label/territory) → NDA → Referral + Payout terms → Data-Processing terms → **Partner Comp Plan + live Calculator**.
*The AE pack derives from the 5 uploaded UK templates + the Smartsheet comp framework; the partner pack mirrors it on the channel side.*

## 5. Build phases (the path — full detail in V2-TRACKER → "THE SELLER ENGINE")
1. **Model & docs lock** (no code): comp plans (AE v3 ✅ + partner) · **draft all agreements/HR pack (202)** · confirm quota.
2. **Discovery & schema:** audit today's partner portal/admin · design the shared seller seat (`partner_paid`|`ae_free`) + payout engine.
3. **Admin first:** one console to onboard / approve / manage / pay both.
4. **Partner portal** + demo provisioning + sell-through.
5. **AE portal** (free seat) + live comp calculator embedded + their document vault (contracts/HR).
6. **Payout reconciliation** → 196 ledger → accounting.
7. **Enablement:** collateral · scripts · training.

## 6. Open decisions (founder) — must resolve before issuing seats
1. **Partner commission rate — ✅ LOCKED 19 Jun = 20% acquisition + 5% retention** (the founder's build brief + calculator; item 197 + partner comp plan updated; old "25%+5%" superseded).
2. **THE BUILD (item 203):** the founder's authoritative **build brief** (`KIND-CLAUDE-CODE-BRIEF.md`) turns all of this into a live system — Stripe → attribution → ONE commission engine → 3 portals → founder-approved payouts. **Founder build priority: ① Admin portal + operating SOP → ② Partner portal → ③ AE portal, account systems right from the start.** **All USD** *(RESOLVED 22 Jun — founder: "we are USD"; matches product pricing)*. Pure commission-engine module built + unit-tested 22 Jun. Still open: repo · auth/hosting.
2. **AE quota:** **$4,500/mo new collected revenue, locked** (v3) — confirmed; corrects the earlier $480/$960 example.
3. **Team roster / timing:** the Team P&L's default start-months (AE+partner mo1, eng mo7, CSM+support mo13, mid-market AE mo25) — confirm.
4. **Legal pack:** transcribe the 5 UK templates into the portal's document vault now, or keep as issued PDFs and have the portal just store/serve them? (Recommend: portal stores/serves the signed PDFs; templates live in Notion (204).)
5. **Calculator → live in portal:** add **saved presets per AE/market** (localStorage → DB) to turn the scratchpad calculators into the in-portal live tool.

## 7. Honest constraints (this session)
- The 5 HR PDFs + the Business Command Centre are the founder's **source artifacts**; the HR PDFs render through a custom-font cipher, so their legal text is **not transcribed here** (accuracy on legal/contract wording matters too much to guess).
- The **Business Command Centre is company-ops → it belongs in Notion (204)**, not a repo. Logged here so the link isn't lost.
