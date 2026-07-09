# K.I.N.D — Partner Agreement (DRAFT TEMPLATE)

`Last-checked: 23 Jun 2026` · **⚠️ DRAFT — commercial terms are locked; the legal language needs founder + solicitor review before any partner signs. This captures the STRUCTURE + the agreed commercial terms, not finished legal drafting.**

> **Source of truth for the commercial terms:** item **197** (PRODUCT-INVENTORY) + `docs/hiring/KIND-PARTNER-COMP-PLAN.md` + `comp-engine.ts` (`PARTNER_ACQUISITION 0.20`, `PARTNER_RETENTION 0.05`). If those change, this changes.

This is the **partner-side twin of the AE pack** (item 202). An AE is an employee on a free seat; a **partner is an external party who pays for their own seat** and earns on the clients they refer + manage. The employment contract / restrictive covenants / RTW do **not** apply — this agreement replaces them.

The full pack a partner signs (4 parts):
1. **Partner Agreement** (this doc — commercial + commission + white-label/territory)
2. **Mutual NDA**
3. **Referral & Payout Terms**
4. **Data-Processing Addendum (DPA)** — POPIA / UK-GDPR

---

## 1. Parties & purpose
- **K.I.N.D Technologies (UK Ltd)** ("K.I.N.D") and the **Partner**.
- Purpose: the Partner refers and manages small-business clients onto the K.I.N.D platform and earns commission on the revenue those clients generate, for as long as they stay.

## 2. Partner tiers *(matches the portal: `referral` / `agency` / `white-label`)*
| Tier | Who | What they get |
|---|---|---|
| **Referral** | individual referrer | referral link + dashboard + demo account |
| **Agency** | agency managing a book of SMB clients | the above + deal registration + managed-book retention earnings |
| **White-label** | reseller presenting K.I.N.D under their own brand | the above + white-label surface + (optional) territory |

## 3. Commission — the LOCKED model (USD)
> ⚠️ **Base updated 8 Jul (⚖️ needs legal sign-off before signing partners):** K.I.N.D bills **per qualified lead — no MRR/subscriptions**. Commission is therefore on **collected per-lead revenue**, not "MRR." Rates/cadence unchanged.
| Component | Rate | Base | Cadence |
|---|---|---|---|
| **Acquisition** | **20%** | a new client's **first-period collected revenue** (per-lead spend) | one-time, on the client's first purchase |
| **Retention** | **5%** | the Partner's **active book** (collected per-lead revenue of clients they manage) | recurring, while the client keeps spending |

- **No base. No expansion. No cap** on referrals or earnings.
- **Earned-when-collected:** commission is earned only when K.I.N.D **collects** the underlying revenue and reconciles it. A client who churns or refunds simply stops generating commission — **no clawback**, nothing paid ahead of cash.
- Deliberately rewards **keeping clients alive**, not one-off sign-ups.

## 4. Attribution & deal registration
- Each Partner gets a **unique referral link** (`get-kind.com?ref=<code>`); signups through it are attributed automatically.
- **Deal registration** with **60-day protection** (already in the portal): a registered deal is the Partner's for 60 days.
- Attribution is captured **once at sign-up** and is the basis for all commission.

## 5. The Partner's seat & toolkit
- The Partner **pays for their own K.I.N.D seat** (unlike an AE).
- They receive: their **portal** (book · earnings · payout statements · documents), an **auto-provisioned demo/sandbox account** to show prospects live, and the **trade playbooks** + deck.

## 6. Payout & reconciliation
- Commission is calculated by the comp engine, **reconciled to collected MRR** (the sales ledger, item 196), and **paid on a stated cycle** (e.g. monthly, in arrears) **[founder to set: cycle, minimum threshold, method]**.
- The Partner sees pending vs paid in their portal.

## 7. White-label / territory *(white-label tier only)*
- **[founder to set:** brand-use limits · any territory exclusivity · term · what happens to the book on termination**]**

## 8. Term, termination & what happens to the book
- **[legal review:** notice period · termination for cause · on termination, does retention commission continue on the existing book or stop? · non-solicit of K.I.N.D clients**]**

## 9. Compliance & data (→ the DPA)
- The Partner must use the platform within POPIA / UK-GDPR; client data is processed under the **DPA**. Outreach must honour the platform's consent + unsubscribe rules.

## 10. Standard legal *(skeleton — for the solicitor)*
- Confidentiality (→ NDA) · IP (K.I.N.D owns the platform) · no employment/agency relationship · limitation of liability · governing law (England & Wales) · entire agreement · variation.

---
**🧍 Founder decisions to fill before this goes to a solicitor:** payout cycle + threshold + method (§6) · white-label/territory terms (§7) · book-on-termination treatment (§8). **Then: solicitor review → this becomes the signable agreement (item 202).**
