# K.I.N.D — Run Costs & Cashflow Model
`Rebuilt clean 10 Jul 2026 — every number ties to code (packages/shared pricing · sourcing-fences rate · stripe bundles) or a verified live provider dashboard. One truth per figure; no stale layers.`

> **HONEST STATUS (10 Jul 2026):** pre-revenue. **0 paying clients.** We are at the **SPRINT** (first paying client). The old May–Jul launch dates were the *anticipated* timeline; the real build ran long, so all forecasts below are **re-based to Month-0 = first paying client**, not calendar months. This doc is the single home for money math — pricing, costs, unit economics, CAC, break-even, growth shape. Strategy → KIND-MASTER · execution → LAUNCH-PAD · future detail → V2-TRACKER.

---

## 1. THE MONEY MODEL — $1 reveal + $3 work = $4 (LOCKED)

Leads arrive **masked** (browsing is free). The client pays to unlock value in two steps:

| Step | Charge | Wallet (code) | What happens |
|---|---|---|---|
| **Reveal** | **$1** | `credit_balance` (`try_charge_reveal_credit`) | unmask + verify the contact's email → it lands in their leads |
| **Work** | **+$3** | `figsy_credits_remaining` (`try_charge_figsy_credit`) | FIGSY enrols the revealed lead into a ≤10-step sequence, writes/sends, books the meeting |
| **Fully-worked** | **= $4** | — | reveal **and** work the same lead |

- A client can stop at **$1 (data only)** or add **$3 (full FIGSY)**. Work can never precede reveal (FIGSY only enrols revealed leads), so **$3 is impossible before $1**.
- Charge-once integrity: reveal is charged **once per (client, email) EVER** (#424); work is charged **once per (campaign, lead)** (#426). No accidental double-charge.
- **No monthly subscriptions.** (The agent family Milla/Vida/Denise is parked; when it returns it prices per-qualified-lead, not $/mo — #431. ⚠️ *Code note: `packages/shared` still carries legacy $49/$29/$39 monthly prices for those parked products; reconcile when #431 builds.*)

---

## 2. WHAT IT COSTS US — per lead (verified live 10 Jul)

*Every rate re-checked against the real provider dashboards + code on the first funded run.*

| Cost line | When | Rate | Basis (verified) |
|---|---|---|---|
| **PDL** — sourcing | at SOURCING (per record pulled) | **$0.28/record** | $98 ÷ 350 (or $280 ÷ 1,000) self-serve tier — confirmed on dashboard |
| **Hunter** — email fallback | at REVEAL, only when PDL misses the email (~30%) | **~$0.011/find → ~$0.003/lead** | Growth £87/mo ÷ 10k finds; code-verified it's a fallback behind PDL's own `work_email` |
| **Claude Haiku** — scoring + ≤10 emails | at WORK | **~$0.05/lead** | code-verified all FIGSY writing runs Haiku, never Opus/Sonnet |
| **Resend** — sends | at WORK | **~$0.009/lead** | ~$0.0009/email × ~10 |
| **Google Calendar** — booking | at WORK | **$0** | free API |
| **Stripe** — payment fee | at CHARGE | **~$0.17/fully-worked lead** | 2.9%+30¢ amortised over a $20 pack = 4.4% |

**Per fully-worked lead ($4 revenue):**
| | |
|---|---|
| COGS pre-fee (PDL 0.28 + Hunter 0.003 + Haiku 0.05 + Resend 0.009) | **~$0.34** |
| + Stripe payment fee | ~$0.17 |
| **COGS all-in** | **~$0.51** |
| **Gross margin** | **~87% all-in** (~91% pre-fee) |

> **The bundle is load-bearing.** Credits are sold in $20/$40/$100 packs, so Stripe's fixed 30¢ amortises to ~4.4%. A per-lead $1 card charge would lose 33¢/dollar to Stripe — **never move billing to per-lead charges.**

> ⚠️ **The one cost that lands BEFORE revenue: PDL sourcing.** Every $0.28 record is spent whether the client reveals it or not. This is fenced (§10) so it can never run unfunded — but the **sourced-vs-revealed ratio is the number to watch**: a client must reveal ≥ 1-in-~3.5 sourced records for the $1 reveals alone to cover their PDL.

---

## 3. PRICING (from `packages/shared/src/constants/index.ts` — the source of truth)

| Product | Pack | Price | Per-lead |
|---|---|---|---|
| **Reveal** (Lead-Gen) | 20 · 40 · 100 | $20 · $40 · $100 | **$1.00** flat |
| **FIGSY work** | 20 · 40 · 100 | $60 · $120 · $300 | **$3.00** flat |

Flat pricing, no volume discounts. **Signup grant (welcome mix, no expiry):** 20 reveal credits + 5 FIGSY credits + a 10-record trial sourcing seed (§10).

---

## 4. UNIT ECONOMICS — reveal-only vs fully-worked

| | Reveal-only ($1) | **Fully-worked ($4)** |
|---|---|---|
| Revenue/lead | $1 | $4 |
| COGS/lead (all-in) | ~$0.30 (PDL + Hunter + Stripe) | ~$0.51 |
| **Margin** | ~50% typical (39% floor) | **~87%** |
| **Profit/lead** | **~$0.50** | **~$3.48** |

**A fully-worked lead makes ~7× the profit of a reveal-only lead** — same sourced record, same client; the only difference is whether they press the $3 button (which costs us ~6¢ to deliver). **Reveals keep us safe; FIGSY makes us rich.** Reveal-only clients are a healthy ~50%-margin data business that structurally can't go negative — but the profit engine is the $3 work charge, which is what onboarding (#447) exists to drive.

---

## 5. FIXED MONTHLY COSTS (corrected — reconciled, one number)

| Service | Plan | Cost/mo |
|---|---|---|
| Supabase | Pro (backups, af-south-1) | $25 |
| Railway | Pro + usage (api/portal/admin/site) | ~$20 |
| Resend | Pro | $20 |
| **Hunter** | **Growth £87** | **~$110** |
| **CORE FIXED FLOOR** | | **~$175/mo** |
| + Failover (Render $7 · Cloudflare $5 · domains $2.50) | | ~$15 → **~$190** |
| + PDL tier ($98/350 at ≤5 clients · $280/1,000 at ~10) | | **~$288–470** |

- **PDL is a bought tier, not per-record on our books** — treat it as semi-fixed at each stage (buy $98/350, consume within it).
- **Claude Code** (platform development) $100–200/mo — **separate; a build investment, not an operating cost.**
- **Stripe** is never fixed — ~2.9%+30¢ per transaction (~3% of revenue), a cost *of* revenue.

> **Correction from the old doc:** earlier versions carried "$138" (and elsewhere "$203") as the fixed floor. Both predate the PDL+Hunter reality — **Hunter alone is now $110/mo.** The honest core floor is **~$175–190**, or **~$288** including the entry PDL tier.

---

## 6. BREAK-EVEN (honest)

Contribution per conservative client (~$80/mo = ~20 fully-worked leads) ≈ **~$70/mo** after ~$0.23/lead all-in variable (ex-PDL).

| To cover… | Fixed | Clients needed |
|---|---|---|
| Core floor (no PDL tier, no dev) | ~$190 | **~3 clients** |
| + entry PDL tier ($98) | ~$288 | **~4 clients** |
| + Claude Code dev ($150) | ~$438 | **~6 clients** |

> **Break-even is ~3–4 paying clients for the operating stack (≈$4 more expensive than the old "2 clients" claim, which understated fixed cost). ~6 clients also covers the dev tool.** Above that, every client is ~87% margin — the fixed stack barely moves from 5 to 50 clients.

---

## 7. CAC — what it costs US to get a client

*Channels are alternatives per client — don't sum. Funnel = §8.*

| Channel | Cash CAC | Founder time | Made of |
|---|---|---|---|
| **① FIGSY cold outbound** (dogfood — the machine sells itself) | **~$68** | ~3–4 h (~5 demos) | 200 records × $0.28 = $56 · Haiku+sends ~$12 |
| **② Inbound self-serve trial** | **~$18** | ~0 h | trial COGS ≤ ~$6 (fenced) × ~3 trials/conversion |
| **③ Agency partner** | **~$0 upfront** | relationship time | 20%+5% revenue-share on collected; 1 partner ≈ 10 clients |

- **Payback is inside month 1** on every channel (a $80/mo client returns ~$70/mo).
- **The pool (§10) drops ① toward ~$25–40** once sourced records are reused across clients.
- **The real constraint is founder hours, not cash** — which is why partners (§9) are the scale lever.

---

## 8. THE DOGFOOD UNIT MODEL (what 1 client via our own product actually is)

| Funnel stage | Rate | Count |
|---|---|---|
| Leads sourced (PDL) | — | **200** |
| → emailable | ~92% | ~185 |
| → reply (cold 6-step, young domain) | **2–3%** | ~4–6 |
| → demo | most replies | ~5 |
| → **paying client** | **~20% of replies** | **1** |

**Win rate ≈ 0.4–0.6% of sourced leads → 1 client per ~170–250 leads.** Internal cost **~$68 + 3–4 founder hours.**

⚠️ **The 2–3% reply rate and the 6-month lifetime below are PLANNING numbers — we have zero measured history.** SPRINT line 9 (FIGSY runs our own outreach) is the **calibration run** that makes them real.

### 1 conservative client returns (~$80/mo · ~87% margin)
| Timeline | Revenue | Profit | vs $68 CAC |
|---|---|---|---|
| Month 1 | $80 | ~$70 | **paid back** |
| 6 months *(a guess until real data)* | $480 | ~$418 | **~6×** |
| 12 months | $960 | ~$835 | ~12× |

**LTV:CAC ≈ 6:1 conservative** (3:1 is the healthy benchmark). ⚠️ **Floor case is real:** a one-$20-pack-and-vanish client = **−$51 vs CAC** — there is no contract, revenue is usage, so **usage IS retention.** Onboarding + FIGSY actually delivering replies is the retention mechanism, not a nice-to-have.

### The first 5–10 clients (depth-first — founder-locked: "5–10 GOOD clients over volume")
*PDL counted as the bought tier (no double-count); variable = ~$0.23/fully-worked lead ex-PDL.*

| | 5 clients | 10 clients |
|---|---|---|
| Revenue /mo (~$80 each) | $400 | $800 |
| Variable COGS (ex-PDL, ~$0.23/lead) | −$23 | −$46 |
| Core fixed + failover | −$190 | −$190 |
| PDL tier | −$98 ($98/350) | −$280 ($280/1,000) |
| **Net /mo** | **≈ +$89** | **≈ +$284** |

**5–10 conservative clients = the machine pays for itself, not yet the founder.** What they really buy: **proof** (real reply/retention numbers + case studies for partners), **calibration** (true LTV), and **pool seeds**. The lever is **spend-per-client, not logo count** — the same 10 clients at the **$160 Growth blend ≈ +$930/mo net**; at $400/mo ≈ +$3,000. Growing a retained client is ~87%-margin revenue at ~$0 CAC.

> **The plan in one line:** land 5–10 GOOD clients (~$340–680 + partner intros) → retain by making FIGSY perform → grow them $80 → $160+ → ~$1k/mo net on ten logos + proof in hand → then 3–5 STRONG partners scale it without touching the cost base.

---

## 9. GROWTH SHAPE (illustrative — re-based to Month-0 = first paying client)

*NOT a dated forecast (the old May–Dec tables are retired — see §12). This is the shape once the machine is calibrated. "Month-N" counts from the first paying client, whenever the sprint delivers it.*

| Stage | Clients | ~Revenue/mo | ~Net/mo | What it means |
|---|---|---|---|---|
| **First client** | 1 | $80 | −$110 | proof of the loop; below break-even by design |
| **Break-even** | 3–4 | $240–320 | ~$0 | the stack pays for itself |
| **First-10 depth** | 10 | $800 | ~+$284 | proof + calibration + pool seeds |
| **10 at Growth blend** | 10 | $1,600 | ~+$930 | founder salary conversation begins |
| **Partner-scaled** | 30–50 | $2.4k–4k ($80) · $4.8k–8k ($160) | 75%+ margin | 3–5 strong partners, ~$0 cash CAC |

**The three levers that decide which line you land on:** ① FIGSY reply-rate (calibrated line 9) · ② spend-per-client ($80 → $160+) · ③ partners (1 strong ≈ 10 clients). Cost is not the constraint — logos and retention are.

---

## 10. THE MONEY FENCES — sourcing can never run unfunded (LIVE, battle-proven)

Every PDL dollar is **pre-funded by cash already collected** (`20260711_sourcing_fences.sql`, live in prod):
- **Coverage k=2** — a paid client's sourcing allowance grows by 2 records per $1 collected, accrued **only at the payment webhook** (never at spend → no double-count).
- **Trial pool** — 10 records seeded at signup + 2 per reveal, **hard-capped at 20 lifetime** → **≤$5.60 max exposure per free signup, once ever.**
- **Global ceiling** — admin-editable **$300/mo** platform-wide PDL budget; alert at 80%, hard pause at 100%.
- **Daily cap** — 100 records/client/day.
- **Enforced** by the atomic fail-closed `try_spend_sourcing` RPC; **proven** on the first live run (granted 10 → PDL empty → auto-refunded, $0 lost).

**No client mix — free, paid, malicious, 1 or 1,000 — can make us net-negative on data.** FIGSY's $3 is unaffected (only enrols revealed leads → no data cost).

**THE POOL (#449, building — founder-ruled build-now):** every purchased record lands in a shared `lead_pool`; ICP runs serve pool matches at **$0 marginal** and buy only the remainder. Charge-once is per-(client,email), so one $0.28 record earns $1 from **every** client who reveals it → at scale, effective $/record collapses toward pennies and sourced data becomes owned inventory with a per-record P&L. *(PDL commercial-tier alignment deferred until revenue — Apollo-reseller precedent.)*

---

## 11. KEY RISKS & LEVERS

| Risk | Impact | Mitigation |
|---|---|---|
| PDL exhausted / sourcing down | zero leads = zero revenue | fences + **line-11 multi-engine widening** (Apollo/Cognism/aggregator) so no single vendor can zero us |
| Reply rate below plan (2–3% unproven) | CAC balloons, funnel stalls | line-9 calibration measures it before we scale spend |
| Client churns after one pack | −$51 vs CAC | usage = retention → onboarding (#447) + FIGSY delivering replies |
| Deliverability (young domain) | sends land in spam | warm domain before volume; ≤30 sends/inbox/day |
| Founder hours (not cash) | caps client count | partners (3–5 strong) buy hours back |

**The 3 levers:** FIGSY reply-rate · spend-per-client · partner channel. Margin is already solved (~87%); the work is logos + retention.

---

## 12. ARCHIVED (retired — do not use)

Superseded by this rebuild; kept only in git history (`git log docs/run-costs-and-cashflow.md`):
- **May–Dec 2026 month-by-month scenario tables** — anchored to a launch date we missed; re-based to §9.
- **"$138 / $203 fixed stack"** — understated; corrected to §5 (~$175–190 core).
- **"$1/client data cost"** and **~91%-only margin** — Apollo-era; corrected to §2 (~$0.51/lead all-in, ~87%).
- **Apollo data-sourcing strategy (old §13)** — Apollo retired from the data path; PDL+Hunter is the stack, multi-engine widening is line 11.
- **Milla/Vida/Denise monthly subscription pricing** — replaced by the per-qualified-lead model (#431, parked).
