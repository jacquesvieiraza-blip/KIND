# K.I.N.D — Partner Compensation Plan
*The channel-side twin of the AE comp plan — same spine (refer · manage · earn on retention), built for an **external partner who PAYS to use the tool** (vs the AE's free seat). Reference doc under `/docs/hiring/`. Not a canonical tracker; status lives in PRODUCT-INVENTORY (197 model · 200 portal · 202 agreements).*

> ⛓️ **SUPERSEDED 19 Aug 2026 BY R47 — RE-CONFIRMED 26 Aug. THIS PLAN IS HISTORY, NOT CURRENT PARTNER TRUTH.**
>
> ⛓️ **23 Sep (checked against main `83e9c1b`):** partners are frozen (**R139**, 23 Sep — `packages/shared/src/partners-frozen.ts`): every partner door is switched off and nothing is deleted. The "current terms" in the next paragraph are history too: R47's per-lead commission has nothing left to apply to, because the $4 per approved lead is retired (**R137**); the programme's partner rule is **R78** (25% of programme contribution), and it is frozen too.
>
> **The rate below is no longer how a partner is paid.** ~~Current~~ Then-current terms (`docs/PRODUCT-RULES.md` **R47**): **25% of the client's approved-lead spend after their included first 100**, for the **lifetime** of the account, on a **gross** base — **$0 of the $299 pack · $0 on the included first 100 approvals · then 25% of paid approved-lead spend thereafter**, while that attributed client stays **active and spending**. ⚠️ **A wallet payment is a funding event, not a commission event** — money going into the wallet earns nothing by itself, and leads bought with that money commission normally (*"she earns on leads purchased not when they top up"*). At the live **$4** price that is **$1 per paid approved lead**; the approved migration target is **$8 → $2** (**R68**, *not live yet*).
>
> ⚠️ **Nothing on this page may be quoted to a partner.** It is retained because the 19-Jun reasoning and the modelling behind it are still useful history — and because **PR10** (chained) points here as the origin of the superseded structure. **Rebuilding `KIND-partner-calculator.html` on the R47 model is logged as required artifact work in V2-TRACKER §7.2 and is NOT done here.**
>
> ~~✅ **RATE LOCKED (19 Jun):** **Acquisition 20% + Retention 5%**~~ — locked by the founder's authoritative build brief (`KIND-CLAUDE-CODE-BRIEF.md` §3) + the Partner Channel Calculator. Supersedes the earlier "25% + 5%". This plan is now written to **20% + 5%**.

---

## 1. Who this is for
A **Partner** is an external seller who **refers AND manages** K.I.N.D clients and earns on them **staying alive**. Unlike the employed AE, the partner **pays for their own seat/use of the tool** — the comp is pure upside on the revenue they bring and keep. Same primitive as the AE; the fork is paid-vs-free and external-vs-employed.

## 2. Commission — paid on collected revenue (retention-weighted)
| Component | Rate | Basis | Timing |
|---|---|---|---|
| **Acquisition** | **20%** | A new client's **first-month** collected revenue | One-time, on the new client signing |
| **Retention** | **5%** | The partner's **active book** (collected revenue of clients they manage) | Recurring, every month the client stays |

The model deliberately **rewards keeping clients alive**, not one-off sign-ups — a partner earns *more* the longer their clients stay, which aligns the channel with the churn/retention thesis. *(Mirrors the AE's land + retain spine; the partner's "manage & earn" and "refer & earn" are unified into this single retention-based model — item 197.)*

## 3. Earned-when-collected
Commission is **earned only when the underlying revenue is collected** and reconciled. A client who churns or refunds simply stops generating commission — no clawback drama, nothing paid ahead of cash. This is what makes commissioning pay-per-lead collected revenue safe.

## 4. What the partner pays for (the fork vs the AE)
The partner **pays for their seat / use of the platform** — they get the same toolkit as an internal AE:
- their own **portal** (book, earnings, payout statements, documents),
- a **demo environment** to sell with,
- **sell-through-the-product** (ICP → FIGSY → outreach to build their own pipeline).
This is the structural difference from the AE (free seat); everything else is shared.

## 5. The partner document pack (item 202)
Partner Agreement (commission terms · white-label / territory) → NDA → Referral + Payout terms → Data-Processing terms → this Comp Plan → the live Partner Calculator. *(The employee/AE pack — offer, employment contract, restrictive covenants, RTW, new-starter checklist — does not apply to an external partner; the partner agreement replaces it.)*

## 6. Payout & reconciliation
Earnings compute from **collected revenue** → reconcile to the **sales ledger (196)** → accounting → paid out on the agreed cadence, visible in the partner portal.

## 7. One-line summary
**20% acquisition (one-time, new client first-month collected revenue) + 5% retention (recurring on active book) · no base · earned-when-collected · partner pays for their own seat (vs AE free) · same portal + demo + sell-through-product toolkit · refer AND manage, one model (item 197).**

---
*Use the AE/Partner calculators (companion files) to model take-home; this plan is the channel twin of `KIND-AE-COMP-PLAN.md`. Full picture: `SELLER-ENGINE-MAP.md`.*
