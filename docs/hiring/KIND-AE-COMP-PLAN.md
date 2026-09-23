# K.I.N.D — Account Executive Compensation Plan
*Model: built on the Smartsheet FY25 plan structure (dollar quota · ramped · guarantee schedule · accelerators · earned-when-collected), scaled to a real company-deal closer.*
*Reference doc — lives under `/docs/hiring/`. Not a fifth canonical tracker.*

> **Locked scenario:** Base **$67,500** · Variable **$45,000** · **OTE $112,500** (60/40) · target ARPU **$1,500** (multi-seat company deals) · hired at **~$10k/mo collected revenue** ("first hire possible"). Dollar figures below are the working model — localize the base to the hiring market before issuing.

> ⛓️ **23 Sep (checked against main `83e9c1b`):** the deal economics below (seats, monthly ARPU, collected subscription revenue) predate the programme. Clients now buy a programme priced per qualified meeting (**R141**, `packages/shared/src/programme-pricing.ts`), and subscriptions are retired (**R137**). The partner-recruiting half of the role is frozen (**R139**). The comp mechanics have not been re-ruled for the programme, so read the numbers as the June working model.

---

## 1. Role & scope

**Account Executive — Company & Partner Sales.** Closes **multi-seat company deals (#88, ~$1,500 ARPU)** and recruits **partners**. Does **not** sell single-seat or blended-$80 SMB — that converts through the product (Track A / FIGSY dogfood). At a six-figure OTE, this person only makes economic sense on company-scale deals; the salary and the deal size are locked together.

## 2. Target (quota) — dollars, not logos

Quota is **new collected revenue closed (monthly run-rate)**, in dollars, ramped over the first three months like the Smartsheet quarterly ladder. Logos are an output, never the target.

### Quota / target schedule

| Period | New collected-revenue target (monthly) | Annualised collected revenue (×12) | ≈ Company deals |
|---|---|---|---|
| Month 1 — onboarding | $0 | $0 | 0 |
| Month 2 — ramp (50%) | $2,250 | $27,000 | 1–2 |
| Month 3+ — full | **$4,500** | $54,000 | 3 |
| **Q1** (ramped) | $6,750 | $81,000 | 4–5 |
| **Q2 / Q3 / Q4** (each) | $13,500 | $162,000 | 9 |
| **Year 1** (with ramp) | $47,250 | **~$567,000** | 31–32 |
| **Year 2** (steady) | $54,000 | ~$648,000 | 36 |

The full monthly quota ($4,500 new collected revenue) sits at ~4.8× the variable target and ~5× OTE — inside the 4–6× quota-to-OTE band for a closing AE. Annualised collected revenue is *annualized run-rate* (what the book is worth if it sticks), not contracted revenue, since K.I.N.D bills per qualified lead (prepaid credits), no contracts.

## 3. Commission — paid on **collected revenue** (churn-safe)

| Component | Rate | Basis | Timing |
|---|---|---|---|
| **Land** | 20% | New client's first month of collected revenue | One-time, on conversion |
| **Retain** | 5% | The client's collected revenue | Recurring, each month retained past the window |
| **Expansion** | 5% | The collected-revenue *increase* (new − prior month) | One-time, per upsell / added seat |

Mirrors the partner economics plus expansion — an employed closer and a referral partner sit on the same spine. **Multi-seat kicker:** +5% land on deals of 2+ seats (the equivalent of Smartsheet's multi-year incentive — it pulls the AE up-market). **Partner override:** ~5% of revenue from partners the AE recruits.

## 4. Guarantee schedule — from your Smartsheet plan

Greater of the guarantee or actual commission, where the guarantee is a % of the **monthly variable target ($3,750)**.

| Month | Guarantee | $ floor | Condition |
|---|---|---|---|
| 1 | 100% | $3,750 | Gated on completing onboarding objectives |
| 2 | 100% | $3,750 | — |
| 3 | 75% | $2,813 | — |
| 4 | 75% | $2,813 | — |
| 5+ | 0% | — | Pure performance |

## 5. Accelerators — reward overperformance

Applied to the **land** commission, on new-collected-revenue quota attainment. Retention and expansion stay flat-rate. Uncapped.

| Attainment | Multiplier |
|---|---|
| < 100% of quota | 1.0× |
| 100% – 140% | 1.25× |
| > 140% | 1.5× |

## 6. Earned-when-collected & clawback

Commissions are paid as **monthly advances**, **earned** only once the revenue is **collected** and reconciled. A client who churns or refunds simply stops earning future advances — no clawback drama, nothing paid ahead of cash. This is what makes pay-per-lead collected revenue safe to commission.

## 7. Windfall review

Any single deal landing above **~2× the AE's monthly quota (~$9,000 new collected revenue)** is reviewed before the commission earns, so one whale doesn't overpay.

## 8. Base, variable & pay mix

| | Amount | Notes |
|---|---|---|
| Base salary | **$67,500** | Localize to market; the AE's security |
| Variable (at quota) | **$45,000** | Upside |
| **OTE** | **$112,500** | 60/40 base/variable while the motion is young; move toward 50/50 as it matures |

> The base is sized for an experienced SaaS closer ($60–75k band). It only pencils against **$1,500+ company deals** — see §9.

## 9. Hire timing & deal-size floor

- **When:** hire at **~$10k/mo collected revenue**, not pre-revenue. The AE is added on top of an existing book, which funds the base while their own book builds. Pre-revenue, product + FIGSY + partners carry it.
- **Deal-size floor:** below **~$550 ARPU** this AE loses money every year — a $67.5k-base closer on $240 seats is a ~$32k/yr hole. The viable zone is **$1,500+ per account** (6–10 seat companies or bundled multi-product), where the same hire nets **~$150k+ in year one**.
- **Why:** the margin on company deals dwarfs even a six-figure salary; the margin on SMB seats can't cover it. Salary and deal size move together.

## 10. One-line summary

**Dollar new-collected-revenue quota (ramped to $4,500/mo) · 20% land / 5% retain / 5% expansion on collected revenue · +5% multi-seat & partner override · greater-of guarantee 100/100/75/75 (month-1 onboarding-gated) · accelerators above 100% · earned only when collected · windfall review · $67.5k base / $45k variable / $112.5k OTE · hired at ~$10k/mo collected revenue for $1,500+ company deals.**

---
*Use the K.I.N.D AE Commission Calculator (companion file) to flex deal size, churn, and base and watch the target schedule, AE take-home, and net-to-company move live.*
