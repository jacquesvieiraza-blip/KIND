# K.I.N.D — Run Costs & Cashflow Model
`Last-checked: 10 Jul 2026 — costs re-verified against the LIVE provider dashboards + code (first funded run)`

> ## 💰 THE MONEY MODEL — LOCKED 8 Jul 2026 (read this first; the doc is being re-modelled onto it)
> **$1 to REVEAL a lead + $3 for FIGSY to WORK it = $4 per fully-worked lead.** Two charges, two wallets, two entry points:
> - **$1 — reveal / "the database":** un-retire the `lead_gen` tier. Client pays $1 → we unmask + verify the contact (Hunter) → it lands in their leads. This is the data product on its own.
> - **+$3 — FIGSY works it:** client pays $3 → FIGSY enrols the revealed lead into a sequence (**capped at 10 steps** — no endless sequences), drafts/sends the emails, drops a booking link.
> - **Effectively $4** for a lead we reveal *and* fully work. A client can stop at $1 (data only) or add $3 (full FIGSY). Spec = inventory **#420–#426**.
>
> **Why this replaces the single-$3 model:** we pay to *source* every lead (PDL, at sourcing) and to *reveal* every email (Hunter, at reveal). The old "free browsing, $3 only at enrolment" gave the data away and only charged if the client happened to enrol — so a browsing-only client cost us data for $0 revenue. The $1 reveal charge puts a paid gate in front of the Hunter+visibility cost; PDL (spent earlier, at sourcing) is policed by **quotas**, not the charge (#423).
>
> ### ✅ Verified costs — RE-CHECKED LIVE 10 Jul (real dashboards + code, first funded run; supersedes the 8-Jul estimates where they differ)
> | Cost line | When incurred | Rate | Basis (10-Jul verified) |
> |---|---|---|---|
> | **PDL Person Search** | at **SOURCING** (per record pulled) | **$0.28/record — CONFIRMED exactly** | self-serve sub **$280/mo ÷ 1,000 credits** (dashboard screen). ⚠️ Currently on the **FREE tier (100 recs/mo)** — the paid plan is NOT bought yet (founder call, pending); the free tier died mid-walk on 10 Jul |
> | **Hunter (Growth — the plan we're ON)** | at **REVEAL — FALLBACK ONLY** (code-verified waterfall: PDL search carries `work_email` directly; Hunter fires only when it's missing, ~30% of reveals) | **~$0.011/find → ~$0.003/lead effective** | **£87/mo ÷ 10,000 finds/mo** (120k/yr). 8-Jul doc modelled Scale £175 — **wrong tier; ruling 10 Jul: STAY on Growth** — Scale's extra (email accounts, AI writer, campaigns) is Hunter's sending product, which we don't use; 10k finds ≈ 30k+ reveals/mo of headroom |
> | **AI (Claude Haiku 4.5)** — scoring + up-to-10 emails | at **WORK** | **~$0.05/lead** | **code-verified 10 Jul**: all FIGSY writing + scoring runs Haiku (`figsy.ts`, `scoring.ts`) — never Opus/Sonnet |
> | **Resend** — email sends | at **WORK** | **~$0.009/lead** | ~$0.0009/email |
> | **Google Calendar** (booking) | at **WORK** | **$0 (free API)** | — |
> | **Stripe (bundle-amortised)** | at **CHARGE** | **~$0.17/fully-worked lead** | 2.9% + 30¢ over a **$20 pack** = 4.4% → ~$0.04/reveal + ~$0.13/work. **Bundle pre-purchase is LOAD-BEARING**: a per-lead $1 card charge would lose 33¢/dollar to Stripe — never "simplify" to per-lead billing |
> | **TOTAL per fully-worked lead** | | **~$0.35 pre-fees · ~$0.52 all-in (incl. Stripe)** | |
>
> **Margin: $4 revenue − ~$0.35 = ~91% gross; ~87% all-in with amortised Stripe.** Even at AI 4× estimate it holds ~87%/~83%. The model is sound at $1+$3.
> - **$1 reveal alone:** $1 revenue − ~$0.003 Hunter-fallback = ~99% on the reveal charge itself (PDL sourcing is the separate leak below).
> - **+$3 work alone:** $3 revenue − ~$0.06 AI+Resend = ~98% on the work charge.
>
> **The sourcing-multiplier break-even (the ONE ratio to watch):** real PDL cost per paid lead = $0.28 × (records sourced ÷ leads the client pays for). A client must **reveal ≥ 1-in-~3.5** sourced records for the $1 reveals alone to cover their PDL, or **work ≥ 1-in-14** for the $4 to cover it. Below that, ghost records bleed $0.28 each — which is exactly what the #423 quota (100 recs/client/day ≈ $28/day max exposure) and the #422 mask-until-reveal design cap. Watch metric for admin: per-client sourced-vs-revealed ratio.
>
> **10-Jul live-run findings baked into code (#444):** PDL **402-refuses any batch bigger than the credits remaining** (32 left vs size-50 ask = zero leads, every run) → fixed with a 50→25→10→5→1 size ladder; portal industry labels weren't PDL vocab (ticked industry = guaranteed zero, burned credits on impossible queries) → mapped; out-of-credits now fires a founder alert instead of failing silently.
>
> ### The full ladder (LOCKED 8 Jul ~10pm — one price logic, no subscriptions)
> | Rung | Price | Add'l cost | Margin on the rung |
> |---|---|---|---|
> | $1 reveal | $1 | Hunter ~$0.009 (+PDL sourcing) | ~99% |
> | + $3 FIGSY works it = **$4** | +$3 | AI+Resend ~$0.06 | ~98% |
> | + $1 Milla (intelligence) = **$5** | +$1 | ~one Haiku call ~$0.02–0.05 *(reasons over already-paid PDL data — no new buys)* | ~95%+ |
> | + $1 Denise (action) = **$6** | +$1 | ~one Haiku call ~$0.02–0.05 | ~95%+ |
> | **Vida inbound = $3** (+$1 Milla/+$1 Denise → $4/$5) | $3 | multi-turn chat, still <$0.10 **on qualified**; but LLM cost lands on *all* visitors incl. spam → **qualify-rate is the sensitivity** (a 1-in-20 qualify-rate eats ~20 chats/billable lead → margin toward ~80%). Spam-guard + the "qualified" definition protect it. | ~80–95% |
>
> **Full stack $6 fully-worked lead** ≈ $0.36 + ~$0.10 layers ≈ **~92% margin.** Every agent now earns per qualified lead; **monthly subscriptions are removed from the revenue model** (Milla/Vida/Denise are per-lead layers/engine, not $/mo — kills the subscription-billing surface + defects #340/#341/#342/#357/#386). Milla's account-level VA stays a separate, unpriced, parked product.
>
> ⚠️ **The one real leak to police — PDL is spent at SOURCING, before any charge.** Every record we pull costs ~$0.28 whether the client ever reveals it or not, so unrevealed sourced records are sunk cost. This is why sourcing needs **per-client/day quotas + a regen cap** (#423), NOT just the reveal gate. Reveal ($1) and work ($3) are self-funding; **sourcing is the cost to control.**
>
> ### 🔒 THE MONEY FENCES — sourcing is pre-funded by collected cash (built 10 Jul, #445/#446)
> The leak above is now structurally closed: **every PDL dollar must be pre-funded by a customer dollar already collected.** No client mix — free, paid, malicious, 1 or 1,000 — can make us net-negative on data.
> - **Coverage k=2** — a paid client's sourcing allowance grows by **2 records per $1 collected**, accrued ONLY at the payment webhook (never at reveal/work spend → no double-count). Worst-case paid client (sources + reveals everything, never returns) still leaves ~30–39% margin.
> - **Trial pool** — a never-paid client is seeded **10 records at signup + 2 per reveal, HARD-CAPPED at 20 lifetime** → **≤ $5.60 max exposure per free signup, once, ever.** 100 ghost signups who run an ICP = **$280 ceiling**, vs unbounded before.
> - **Global ceiling** — an admin-editable **$300/mo** platform-wide PDL budget (`money_settings`); alert at 80%, hard pause + honest client banner at 100%. The company's maximum possible data loss is a number the founder sets.
> - **Daily cap** — the existing 100 records/client/day stays as a second fence.
> - **Ask-size = keep-size** — sourcing now asks PDL for exactly the granted batch (was buy-50-keep-20 → ~60% of per-run PDL spend was binned); **+ preview cache** so form-fiddling no longer fires paid PDL calls.
> - Enforced by the atomic fail-closed `try_spend_sourcing` RPC (`20260711_sourcing_fences.sql`); admin **Money Path** page surfaces per-client contribution + the global budget. **FIGSY's $3 is unaffected — it only enrols already-revealed leads, so work can never precede the $1 and carries no data cost.**
>
> **On the body below:** §1 (fixed infra) is still broadly right. §2–§5 and §12 were written on the retired single-$3 / Apollo model — where a section says "Apollo ~$0.008/lead," "$3 all-in," or "double-charge bug," the LOCKED block above supersedes it. Blended-ARPU/scenario tables (§5a–§8) are directional: a fully-worked lead is now **$4**, so per-client ARPU rises accordingly.

> ### 🟢 STATUS NOTES (framing corrections — carried forward)
> - **🚀 LAUNCHED 18 Jun.** Pre-launch language in the body ("gate Fri-19" etc.) is historical.
> - **💵 Currency = USD (locked 22 Jun).** ZAR/£ columns are illustrative; we **bill USD**. UK Ltd files GBP to HMRC (accounting = item 196, open).
> - **Data source = PDL + Hunter (NOT Apollo).** Every "Apollo" cost/plan line in the body is stale — the live stack is **PDL Person Search (sourcing) + Hunter Growth (reveal fallback)**; Apollo is retired from the data path (its 403 payment error on 10 Jul is irrelevant — fail-over worked as designed). (Apollo strategy in §13 is kept as history only. Body mentions of "Hunter Scale" are the 8-Jul model — superseded by the 10-Jul verified block above: we're on Growth and staying.)
> - **Cross-refs:** finance *system* (ledger, accounting, VAT) = item **196**; salary/hiring = `SALARY-BREAKEVEN-PLAN.md` + `docs/hiring/`.
> **The biggest GROWTH lever is the per-rep company engine (#88):** a 10-seat company is ~10× a single-seat client at almost the same cost-to-serve. **Stale-figure note:** older sections (§7/§10/§11) still say "Paystack" — actual processors are **Stripe (global) + Flutterwave (Africa)**; and the "$80 ARPU" is *single-seat* — the per-rep model multiplies it.

---

## 1. Tech Stack — Fixed Monthly Costs

These run whether you have zero clients or one hundred. **Hosting is Railway only — there is no Vercel.** Billing is Stripe (no fixed fee — see §2).

### Group A — Upgrade NOW (launch floor)
| Service | What it does | Plan | Cost/mo |
|---|---|---|---|
| Supabase | Database, auth, file storage **+ daily backups** (Free plan has NO backups) | Pro (af-south-1 Cape Town / POPIA) | $25 |
| Railway | Hosts API + portal + admin + website (all 4 services) | Pro + usage | ~$20 |
| Resend | FIGSY + transactional email — Free caps at 100/day, hits day 1 | Pro | $20 |
| **PDL + Hunter** | Lead data source (Apollo retired). **PDL Person Search** = sourcing ($0.28/record); **Hunter Growth** = email-finder fallback at reveal | **Verified 10 Jul:** Hunter Growth £87/mo (~$110) — on it, staying (Scale unnecessary). PDL: FREE tier now (100 recs/mo — can't run the product); **$280/mo (1,000 recs) pending founder purchase** | ~$110 now → ~$390 with paid PDL |
| **Group A subtotal** | | | **~$114–164/mo** |

### Group B — Soon (first weeks / before real volume)
| Service | What it does | Plan | Cost/mo |
|---|---|---|---|
| **Zoho Mail** | Business email on `@get-kind.com` (**we use Zoho, NOT Google Workspace** — corrected 10 Jun) | Mail Lite / free tier | **~$0–4** |
| Render | API warm standby (crash failover) | Starter | $7 |
| Cloudflare | Load balancer → routes to standby on outage | LB Basic | $5 |
| **2 domains** | **`get-kind.com`** (transactional) + **`gettingkind.com`** (cold sending) | ~$15/yr each | **~$2.50** |
| **Group B subtotal** | | | **~$14–19/mo** |

### Group C — Development
| Service | What it does | Plan | Cost/mo |
|---|---|---|---|
| Claude Code | AI-assisted development of the entire platform | Max | $100–200 |

| **Total** | | |
|---|---|---|
| **Launch floor (Group A only)** | | **~$114/mo** |
| **Launch + email + failover (A + B)** | | **~$139/mo** |
| **All-in incl. Claude Code dev** | | **~$239–395/mo** |

> ### ⚙️ THE ENGINE — new cost line (item 211, decided 23 Jun)
> The deliverability/sending engine (Smartlead) is the product's foundation and a **new, scaling** cost: **~$94/mo (Smartlead Pro API)** + **~$5/mailbox/mo** + **~$29/mo per client (white-label)**.
> - **Managed (SMB):** K.I.N.D carries the mailbox cost (~$5/mailbox; ~10 inboxes per ~350 sends/day) and **marks it up** — it's a billable input, not just overhead.
> - **Connect-your-own (mid/enterprise):** the **client carries their own mailbox cost → near-zero to K.I.N.D.**
> Net: the engine adds a low-hundreds/mo base + a small per-client variable that's largely **passed through / marked up**. Full spec: V2-TRACKER "⚙️ THE ENGINE".

> ⚠️ **Data source = PDL Person Search (sourcing) + Hunter Growth (reveal fallback), NOT Apollo** (§0, 10-Jul verified). PDL $0.28/record ($280/mo ÷ 1,000, purchase pending); Hunter Growth £87/mo (on it, staying). The Apollo plan guide below is **STALE/history** — Apollo is retired from the data path.
> ⚠️ **Supabase Free plan has NO database backups** (confirmed 3 June). One bad query = total data loss. Pro is non-negotiable before onboarding paying clients.
> ℹ️ **Stripe has no fixed monthly cost** — it charges per transaction (~2.9% + 30¢). "Going live" = switch from test to live keys + add price IDs. See §2.

**~~Apollo plan guide~~ (STALE — Apollo retired; kept as history):**
- ~~Basic: $49/mo · Professional: $99/mo · Organization: $149/mo~~ → replaced by PDL Full + Hunter (§0/§2).

**Claude Code plans:**
- Pro: $20/mo — sufficient for light usage
- Max (5×): $100/mo — recommended for active development
- Max (20×): $200/mo — heavy daily builds like the current phase

---

## 2. Variable Costs (scale with usage) — LOCKED 8 Jul on the real PDL+Hunter stack

*Data source is **PDL Full API + Hunter**, not Apollo. Each line notes WHEN the cost lands — this matters because sourcing (PDL) happens before any charge, reveal (Hunter) at the $1 charge, work (AI+Resend) at the $3 charge.*

| Cost | When | Rate | Notes |
|---|---|---|---|
| **PDL Person Search** — sourcing | at SOURCING (per record pulled) | **$0.28/record** (10-Jul verified: $280/mo ÷ 1,000) | The one cost incurred *before* revenue — police with quotas (#423) + the #444 size ladder. |
| **Hunter (Growth)** — email-finder fallback | at REVEAL ($1 charge), only when PDL missed the email (~30%) | **~$0.011/find → ~$0.003/lead** (10-Jul verified: £87/mo ÷ 10k finds) | Waterfall (code-verified): PDL search carries `work_email` → Hunter is fallback, not per-reveal. |
| **Claude Haiku** — lead scoring | at WORK | ~$0.0004/lead | |
| **Claude Haiku** — FIGSY email generation | at WORK | ~$0.005/email (~$0.05 across a 10-step cap) | |
| **Resend** — email send | at WORK | ~$0.0009/email (~$0.009 across 10 steps) | |
| **Google Calendar** — booking | at WORK | **$0** | Free API — booking adds no running cost (#361). |
| **Stripe** — payment processing | at CHARGE | ~2.9% + 30¢ per transaction | Cost of revenue, not a fixed fee. Free until money flows. |

**Total variable cost per fully-worked lead: ~$0.35** (PDL $0.28 + Hunter ~$0.003 + AI ~$0.05 + Resend ~$0.009); **~$0.52 all-in** with bundle-amortised Stripe (~$0.17, §0). Data-only ($1) lead = ~$0.28 (PDL sourcing + Hunter fallback).

---

## 3. Pricing Model

**All pricing is locked. Never changed. Never increased or decreased.**

### Credit Bundles (LOCKED model — source of truth: `packages/shared/src/constants/index.ts`)
*Flat pricing: **Reveal (Lead Gen) $1/credit · FIGSY $3/credit — no volume discounts** (annual plans only). These two tiers ARE the two-charge model (§0): $1 reveals a lead, $3 works it, $4 fully worked. The `lead_gen` tier is being **un-retired as the reveal product** (#420/#394).*

| Product | Credits | Price USD | Price ZAR | Per-lead |
|---|---|---|---|---|
| K.I.N.D AI — Lead Gen Pro | 20 | $20 | R380 | $1.00 |
| K.I.N.D AI — Lead Gen Pro | 40 | $40 | R760 | $1.00 |
| K.I.N.D AI — Lead Gen Pro | 100 | $100 | R1,900 | $1.00 |
| FIGSY Advanced | 20 | $60 | R1,140 | $3.00 |
| FIGSY Advanced | 40 | $120 | R2,280 | $3.00 |
| FIGSY Advanced | 100 | $300 | R5,700 | $3.00 |

**THE TWO-CHARGE MODEL (LOCKED 8 Jul, supersedes the old item-166 "double-charge is a bug" framing):**
- **$1 reveal + $3 work = $4 is INTENTIONAL**, not a bug. The old model treated charging both as the "double-charge bug" (item 166) and killed the $1 side. We are **reversing that** — the two charges are the product (#420).
- **Two wallets, charge-once-per-lead:** reveal draws the `credit_balance` (lead-gen) wallet at $1; work draws the `figsy_credits` wallet at $3. Each lead is charged **once per wallet** — never $1 twice, never $3 twice (per-lead idempotency = #424).
- **Code to wire (money-path build #420–#426):** un-retire `lead_gen` purchase path · atomic `try_charge_reveal_credit` RPC, fail-closed (#421) · reveal gating — mask email until the $1 charge (#422) · sourcing quotas for PDL (#423) · charge-once-per-lead idempotency (#424) · trial credit mix so trials can reveal (#425) · enforce the 10-step sequence cap (#426).

### The AI family — per-qualified-lead layers & engine (coming soon)
> **No monthly subscriptions (#431).** Milla / Vida / Denise price **per qualified lead**, activated on the leads a client chooses — the same wallet logic as FIGSY. FIGSY + Lead-Gen are the live products today; these three are coming soon.

| Product | Price | What it is |
|---|---|---|
| **Milla** (The Brain) | **+$1 / qualified lead** | Intelligence layer — reads the lead so you decide better |
| **Denise** (The Closer) | **+$1 / qualified lead** | Action layer — reply→close: objections, proposals, follow-ups |
| **Vida** (The Connector) | **$3 / qualified inbound lead** | Inbound engine — qualifies website + WhatsApp visitors 24/7 |

**Full stack** = $1 reveal + $3 FIGSY + $1 Milla + $1 Denise = **$6 / fully-worked lead**; Vida inbound $3 (+$1/+$1 → $4/$5). **No $/month anywhere** — the old $29/$49/$69/$39 monthly prices are retired (#431).

---

## 4. Unit Economics Per Lead — TWO-CHARGE MODEL (LOCKED 8 Jul)

*Two charges, flat at every bundle size: **$1 to reveal, $3 to work, $4 fully worked.** Per-lead economics are the same whether a client buys 20 or 100 credits.*

### 4a. Reveal ($1) — the data product
| | Amount |
|---|---|
| You charge to reveal (flat, all bundles) | **$1.00** |
| Hunter email-finder fallback (at the $1 charge; fires ~30% of reveals) | ~$0.003 effective |
| PDL sourcing (spent EARLIER, at sourcing) | $0.28/record sourced |
| **Gross margin on the reveal charge itself** | **~$0.99 (99%)** |
| **…but net of PDL sourcing (if every sourced lead is revealed)** | **~$0.71 (71%)** |

> ⚠️ **The reveal charge nets 99% against Hunter — the PDL sourcing cost is the variable to watch.** If 100% of sourced records get revealed, each $1 reveal carries ~$0.28 PDL → ~71% net. If only 50% are ever revealed, the unrevealed PDL doubles onto the revealed ones (~$0.56) → ~44% net on the $1 tier alone. **Break-even ratio (10 Jul): a client must reveal ≥ 1-in-~3.5 sourced records for their $1 reveals to cover their PDL; 1-in-14 worked covers it on the $4.** **This is why sourcing quotas (#423) matter more than the reveal gate.** The $3 work charge more than absorbs it (below).

### 4b. Work (+$3) — FIGSY on a revealed lead
| | Amount |
|---|---|
| You charge to work (flat, all bundles) | **$3.00** |
| Claude Haiku — scoring + up-to-10 emails | ~$0.05 |
| Resend — sends across the sequence | ~$0.009 |
| Google Calendar — booking | $0 |
| **Variable cost of the work** | **~$0.06** |
| **Gross margin on the work charge** | **~$2.94 (98%)** |

### 4c. Fully-worked lead ($4 = $1 + $3)
| | Amount |
|---|---|
| Total charged (reveal + work) | **$4.00** |
| PDL sourcing | ~$0.28 |
| Hunter reveal | ~$0.009 |
| AI (Haiku) scoring + 10-step emails | ~$0.05 |
| Resend sends | ~$0.009 |
| **Total variable cost** | **~$0.36** |
| **Gross margin per fully-worked lead** | **~$3.64 (91%)** |
| *Stress test — AI 4× my estimate* | cost ≈ $0.53 → **~87%** |

**Even taking PDL sourcing at full whack on a fully-worked lead, margin is ~91%.** The model earns because the $3 work charge dwarfs its ~$0.06 cost and the $1 reveal covers Hunter with room to spare; sourcing efficiency (reveal-rate × quotas) is the only real dial.

### 4d. What a customer actually pays
| Scenario | What they buy | Cost | What they get |
|---|---|---|---|
| **Data only** | Reveal 20 | $20 | 20 revealed leads ($1 each) — the database |
| **Data heavy** | Reveal 100 | $100 | 100 revealed leads ($1 each) |
| **FIGSY entry** | FIGSY 20 | $60 | 20 leads worked ($3 each, on already-revealed leads) |
| **FIGSY heavy** | FIGSY 100 | $300 | 100 leads worked ($3 each) |
| **Fully-worked blend** | Reveal 100 + FIGSY 100 | $400 | 100 leads revealed **and** worked = **$4 each** |
| **Growth blend** | Reveal 100 + FIGSY 20 | $160 | 100 revealed, 20 fully worked |

---

## 5. Unit Economics Summary (two-charge model)

| | Reveal ($1) | Work (+$3) | **Fully worked ($4)** |
|---|---|---|---|
| Charge | $1.00 | $3.00 | **$4.00** |
| Variable cost | Hunter ~$0.009 (+PDL ~$0.28 at sourcing) | AI+Resend ~$0.06 | **~$0.36** |
| **Gross margin** | ~99% on Hunter (~71% net of PDL) | ~98% | **~91%** |

Your real variable cost to police is **PDL sourcing (~$0.28/record, spent before revenue)** — capped by quotas (#423). Everything downstream (reveal, work) is near-pure margin. The fixed stack (~$138/mo, §1) is spread across all clients.

---

## 5a. Client spend tiers (per-qualified-lead — no subscriptions, no MRR)

*Clients buy credits and spend **per qualified lead** — there is no recurring monthly fee. "Spend" below is a typical credit purchase, not an MRR figure.*

| Client type | Typical spend | What they buy |
|---|---|---|
| Data-only | ~$20–100 | Reveal credits ($1/lead) — the database, no outreach |
| FIGSY entry | ~$60 | 20 leads worked ($3 each, on revealed leads) |
| Growth blend | ~$160 | Reveal 100 ($100) + FIGSY 20 ($60) |
| Fully-worked | ~$400 | Reveal 100 + FIGSY 100 → **$4/lead**, 100 leads |
| + layers *(coming)* | +$1/lead each | Milla / Denise add on top per qualified lead |

Revenue scales with **qualified leads delivered**, not seats or months. The growth levers are volume per client (more leads revealed + worked) and the per-lead layers once live — not a monthly upsell. There is no MRR to double; a heavier client simply reveals + works more leads.

---

## 5b. UPDATED CASHFLOW & SALES TARGETS — ACTUAL COSTS (16 Jun corrected)
*Rebuilt on the real locked-in stack, replacing the old $203 / Paystack assumptions. This is the version to set sales targets against.*

### Locked monthly costs (actuals)
| Line | Cost/mo |
|---|---|
| Supabase Pro | $25.00 |
| Railway Pro (+usage) | ~$20.00 |
| Resend Pro | $15.46 |
| PDL Person Search — sourcing ($0.28/record; free tier now, **$280/mo (1,000 recs) pending purchase**) | usage |
| Hunter Growth — email-finder fallback (**verified 10 Jul: £87/mo ≈ $110, on it, staying** — Scale unnecessary) | ~$110 |
| **Operating floor (live now)** | **~$114/mo + data usage** |
| + Render standby $7 + Cloudflare LB $5 + domain $1.25 (failover, soon) | +$13 |
| **Operating floor + failover** | **~$138/mo** |
| Claude Code (build investment, separate) | $100–200 |
| Stripe processing | NOT fixed — ~2.9% + $0.30 per transaction |

### Contribution per fully-worked lead (per-lead model)
Revenue **$4 per fully-worked lead** − variable **~$0.36** (PDL sourcing $0.28 + Hunter $0.009 + AI ~$0.05 + Resend ~$0.009) = **~$3.64 contribution (~91%)**. Stripe takes ~2.9% + 30¢ **per credit purchase** (a $100 pack ≈ $3.20), not per lead. The +$1 Milla / +$1 Denise layers each add ~95%+ margin → the $6 full stack sits at ~92%.

### 🎯 SALES TARGET LADDER — the numbers to hit (per-lead model, $4/fully-worked lead)
*Milestones are **monthly revenue run-rate**; the volume column is fully-worked leads/mo at $4 (layer adoption — $5/$6 stack — hits each rung with fewer leads).*

| Milestone | What it means | Fully-worked leads/mo @ $4 |
|---|---|---|
| **Break-even (infra + failover, ~$138 fixed floor)** | Stack pays for itself | **~35** |
| **Break-even (incl. Claude Code dev)** | Whole operation self-funding | **~70–110** |
| **$1,000 revenue/mo** | Comfortable; reinvest | **≈ 250** |
| **$5,000 revenue/mo** | Founder salary begins | **≈ 1,250** |
| **$10,000 revenue/mo** | First hire possible | **≈ 2,500** |
| **$25,000 revenue/mo** | Series A conversations | **≈ 6,250** |

### 🎯 Your funnel targets — REALISTIC (cold, 6-step sequence, 2–3% reply)
*No trial step — the model is free to start, pay-per-lead: an interested reply goes to a demo, then a first paid credit pack. Base: **reply→paying client ~20%** (~5 interested replies per client). So **prospects/client = 5 ÷ reply-rate.** ⚠️ The old "~60 touches @ 8%" assumed an **unvalidated 8% reply** (see `sales-playbook.md` — never measured). Plan on **2–3%** on a young cold domain. Sequence moves to **6 steps** (was 3) to capture slow responders — **requires a FIGSY product change (currently 3-step Day 0/4/9 — tracked as item 212).***

| Reply rate | Prospects / client | **5–6 clients/mo (goal)** | Sends/mo (6-step, ~5 ea) | ~Sends/day | Warmed mailboxes (~40/day) |
|---|---|---|---|---|---|
| **3%** (target) | ~167 | **~835–1,000** | ~4,200–5,000 | ~190–225 | **~5–6** |
| **2%** (conservative) | ~250 | **~1,250–1,500** | ~6,250–7,500 | ~285–340 | **~7–9** |
| *(8% — optimistic, unvalidated)* | ~60 | ~300–360 | ~1,500–1,800 | ~50–60 | ~2 |

**The conversion chain — per 1 client** *(rate: reply→paying client ~20%)*:
> **~167 prospects** (at 3%) → **~5 interested replies** → **~5 demos/meetings** → **1 paying client** (first credit pack).
> Per-client rates are **fixed** (~5 replies · 1 client); only the **prospect count** moves with reply rate (~167 at 3% · ~250 at 2%). A *"demo"* = the meeting that turns an interested reply into a first paid pack.

**To reach the 5–6 clients/month goal:** **~25–30 demos/meetings · ~835–1,500 prospects** (3%→2%) · **~5–9 warmed mailboxes.** **Shortcut → 1 agency partner ≈ 10 clients/month** (bypasses the cold funnel entirely — see Partner strategy below / item 197).

> **Implication:** cold-only at a real 2–3% needs **~5–9 warmed mailboxes in rotation** (multiple sending domains) — a proper cold rig (Instantly), **not** one mailbox. One agency **partner ≈ 10 clients/month** from a single relationship — far cheaper than ~1,000+ cold prospects. **Lead with partners + warm network + dogfood while the rig warms; cold scales after.**

### Net profit by volume ($4/fully-worked lead · variable ~9% of revenue · fixed $138/mo)
| Leads/mo | Revenue | Variable (~9%) | Fixed | **Net/mo** |
|---|---|---|---|---|
| 25 | $100 | $9 | $138 | **−$47** |
| **~35 (break-even)** | $140 | $13 | $138 | **≈ $0** |
| 100 | $400 | $36 | $138 | **+$226** |
| 250 | $1,000 | $90 | $138 | **+$772** |
| 500 | $2,000 | $180 | $138 | **+$1,682** |
| 1,250 | $5,000 | $450 | $158* | **+$4,392** |
| 2,500 | $10,000 | $900 | $242* | **+$8,858** |
| 6,250 | $25,000 | $2,250 | $298* | **+$22,452** |

\* Fixed floor steps up with Resend/Hunter tiers + monitoring at volume. Stripe (~2.9% + 30¢) lands per credit purchase (~3% of revenue) on top of the ~9% per-lead variable.

**Break-even: ~35 fully-worked leads/mo covers the ~$138 fixed floor.** Past ~250 leads/mo it's 75%+ net margin — almost pure margin once the fixed stack is covered. **The levers that matter are leads per client and layer adoption ($4 → $6/lead).** Push FIGSY work + Milla/Denise layers after first leads land.

---

## 5c. COST PER PRODUCT — what each agent costs to serve (16 Jun corrected)
*The founder's question: "cost per product." Here's the variable cost to actually run each agent for a client. Headline: **only FIGSY's data is a meaningful cost. The other three agents are near-free to serve** on Claude Haiku.*

| Product | What drives the cost | Est. variable cost to serve | What you charge | Gross margin |
|---|---|---|---|---|
| **FIGSY** (AI SDR) | PDL sourcing (~$0.28/record) + Hunter reveal (~$0.009) + Claude Haiku scoring+10-step emails (~$0.05) + Resend (~$0.009) + Google Calendar ($0) | **~$0.36 per fully-worked lead** | **$4.00 fully worked ($1 reveal + $3 work)** | **~91%** |
| **Milla** (Brain/VA) | Claude tokens per question/draft (Haiku/Sonnet) | **~$0.01–0.03 per query** | ~~$49/mo~~ **+$1/qualified lead (#427; VA half unpriced, parked M4)** | **~95%+** |
| **Vida** (Chatbot) | Claude tokens per conversation turn | **~$0.01–0.03 per conversation** | ~~$29/mo~~ **$3/qualified inbound lead (#429; coming soon)** | **~90%+** (a 100-chat/mo client ≈ $1–3 cost) |
| **Denise** (Closer) | Claude tokens per follow-up/proposal draft (longer outputs) | **~$0.02–0.05 per draft** | ~~$39/mo~~ **+$1/qualified lead (#428; coming soon)** | **~95%+** |

**The one cost that matters is PDL sourcing (FIGSY's data).** PDL is spent at sourcing (~$0.28/record, before any charge) so it's the line to police with quotas (#423); Hunter reveal (~$0.009) and everything else is sub-cent Claude/Resend. Keep generation on Haiku (cheap) with prompt caching, cap sequences at 10 steps, and the fully-worked lead sits at **~91% gross margin** ($4 revenue, ~$0.36 cost).
*Numbers are estimates on current Haiku pricing — confirm against real Anthropic + Apollo invoices once volume is live; the structure won't change.*

---

## 5d. FUTURE COSTS & THE SCALING MAP (16 Jun, verified 10 Jun baseline)

> ⚠️ **SUPERSEDED (8 Jul) — the Apollo data-strategy below is moot; the live stack is PDL Full + Hunter (§0). Kept as history.**

*"How we actually start scaling." The cost structure barely moves as you grow — here's what comes online, when, and the one structural decision that decides everything.*

### 🔑 The single biggest cost lever at scale: the Apollo data decision
Verified 10 Jun: reselling Apollo data off one account violates ToS **from client #1** (not at "50 clients" — that figure was wrong). Two compliant structures, with **opposite cost profiles**:
- **(a) Apollo API Reseller / Data-Licensing agreement** (`partners@apollo.io`): a contract (likely higher Apollo spend or a revenue share) — but it legitimises one-account-many-clients and Apollo cost stays on K.I.N.D's books, growing with usage.
- **(b) Client-brings-own-Apollo-key** (Agency sub-accounts): **K.I.N.D's Apollo cost → ~$0** — each client pays Apollo directly. It removes the only meaningful variable cost *and* fixes the ToS. Trade-off: **signup friction** — a deal-killer for self-serve SMB. **For the per-rep company model (a company getting one Apollo account for its seats) this is very natural.** → **REVISED 16 Jun (see §13/§14): NOT a blanket default. Segment it — bundle data for self-serve SMB (friction kills conversion; data is only ~2% of cost), reserve BYO-key for company/partner accounts where it's low-friction and de-risks scale.** Final SMB stance gated on Apollo's partner reply.
- **(c) Multi-source (PDL wired, dormant):** PDL free tier → paid (pay-as-you-go), Hunter ~$49/mo. Cuts single-vendor risk + fills African coverage gaps; not the compliance fix on its own.

### Costs that come online as you grow
| Stage | Clients | New cost online | Monthly impact |
|---|---|---|---|
| **0 · Launch** | 1–10 | Current floor (Supabase/Railway/Resend/Apollo) | **~$138/mo** + Apollo. Break-even 2–5 clients. |
| **1 · Per-rep companies (#88)** | 10–50 | Apollo grows with usage **(or → ~$0 if client-keys)** · slightly more Railway/Supabase compute | Marginal — ARPU jumps far faster (a 10-seat company ≈ 10× a single seat) |
| **2 · Scaling** | 50–100 | Apollo **Organization tier** (or reseller/client-keys resolved) · PDL/Hunter if multi-source on · possibly 1st support hire | Infra still <$300/mo; biggest line becomes **payment fees** (~3% of revenue) |
| **3 · Intelligence + voice** | 100+ | **Vapi** (Denise voice ~$0.05–0.15/min — the next real variable cost) · Memory v2 (pgvector = Supabase compute) · Learning-engine inference (Haiku, cheap) | Still <5% of revenue; voice is the one to meter as it scales |

### How we actually start scaling (the levers, in order)
1. **Partner channel** — 1 good agency partner ≈ 10 clients/month. The single fastest lever; nearly free. (Demmy/Nigeria live.)
2. **Per-rep company engine (#88)** — the ARPU multiplier. Move from selling single seats to selling *teams*. This is the revenue inflection.
3. **Dogfood (FIGSY sells K.I.N.D)** — the warmup campaign already does this; scale it. Near-zero CAC.
4. **ARPU uplift** — push FIGSY + Denise onto Lead-Gen starters after first leads land.

**The scaling truth:** revenue can 10× while monthly costs go from ~$140 to maybe ~$400. **You are not cost-constrained — you are growth-constrained.** Pour energy into partners + the per-rep engine, resolve the Apollo structure (favour client-keys), and the margin takes care of itself.

---

## 6. Three Scenarios — Month by Month (directional, use §5b for current numbers)
*Note: net-profit columns below use the OLD $203 fixed stack — directional only. **Use §5b/§7 for current break-even ($138 fixed)**. Client-growth assumptions still hold.*
*Revenue/mo = clients × avg leads/mo × $4 — no subscriptions; figures directional.*

### 🔵 Conservative
*Assumptions: 30% demo→paid conversion, 5% monthly churn, ~$80/mo avg client spend (~20 fully-worked leads at $4)*

| Month | New Paid | Churned | Total Clients | Revenue/mo (USD) | Net Profit |
|---|---|---|---|---|---|
| May 2026 | 3 | 0 | 3 | $240 | +$37 |
| Jun 2026 | 4 | 0 | 7 | $560 | +$357 |
| Jul 2026 | 6 | 0 | 13 | $1,040 | +$837 |
| Aug 2026 | 7 | 1 | 19 | $1,520 | +$1,295 |
| Sep 2026 | 9 | 1 | 27 | $2,160 | +$1,902 |
| Oct 2026 | 10 | 1 | 36 | $2,880 | +$2,585 |
| Nov 2026 | 12 | 2 | 46 | $3,680 | +$3,341 |
| Dec 2026 | 13 | 2 | 57 | $4,560 | +$4,180 |
| **Year 1 end** | | | **~60 clients** | **~$4,800/mo revenue** | |

**Year 1 total cash collected: ~$22,000**
**Break-even: Month 2**

---

### 🟡 Base
*Assumptions: 40% demo→paid conversion, 3% monthly churn, ~$80/mo avg client spend (~20 fully-worked leads at $4)*

| Month | New Paid | Churned | Total Clients | Revenue/mo (USD) | Net Profit |
|---|---|---|---|---|---|
| May 2026 | 8 | 0 | 8 | $640 | +$437 |
| Jun 2026 | 12 | 0 | 20 | $1,600 | +$1,370 |
| Jul 2026 | 16 | 1 | 35 | $2,800 | +$2,554 |
| Aug 2026 | 20 | 1 | 54 | $4,320 | +$4,029 |
| Sep 2026 | 24 | 2 | 76 | $6,080 | +$5,746 |
| Oct 2026 | 28 | 2 | 102 | $8,160 | +$7,779 |
| Nov 2026 | 32 | 3 | 131 | $10,480 | +$10,044 |
| Dec 2026 | 36 | 4 | 163 | $13,040 | +$12,553 |
| **Year 1 end** | | | **~165 clients** | **~$13,200/mo revenue** | |

**Year 1 annualised revenue (Month 12 × 12): ~$158,000**
**Year 1 total cash collected: ~$72,000**
**Break-even: Month 1**

---

### 🟢 Optimistic
*Assumptions: 50% demo→paid conversion, 2% monthly churn, ~$80/mo avg client spend (~20 fully-worked leads at $4)*
*Requires: Partner channel active, Product Hunt listing, strong word of mouth*

| Month | New Paid | Churned | Total Clients | Revenue/mo (USD) | Net Profit |
|---|---|---|---|---|---|
| May 2026 | 15 | 0 | 15 | $1,200 | +$997 |
| Jun 2026 | 25 | 1 | 39 | $3,120 | +$2,870 |
| Jul 2026 | 35 | 2 | 72 | $5,760 | +$5,472 |
| Aug 2026 | 45 | 2 | 115 | $9,200 | +$8,866 |
| Sep 2026 | 50 | 3 | 162 | $12,960 | +$12,582 |
| Oct 2026 | 60 | 5 | 217 | $17,360 | +$16,927 |
| Nov 2026 | 70 | 6 | 281 | $22,480 | +$21,987 |
| Dec 2026 | 75 | 8 | 348 | $27,840 | +$27,278 |
| **Year 1 end** | | | **~350 clients** | **~$28,000/mo revenue** | |

**Year 1 annualised revenue (Month 12 × 12): ~$334,000**
**Year 1 total cash collected: ~$138,000**
**Break-even: Month 1**

---

## 7. Profitability at Scale (16 Jun audit)

### Net profit by client count (fixed stack $138–242/mo)
*Per-lead framing: "$80/client" ≈ a client buying ~20 fully-worked leads/mo at $4 — there is no ARPU tier, only leads × $/lead.*

| Total Clients | Revenue/mo | Stripe fee | Data cost | Fixed | Total costs | **Net profit** | **Margin** |
|---|---|---|---|---|---|---|---|
| 1 | $80 | $2.62 | $1 | $138 | $141.62 | **−$61.62** | **—** |
| **2** | $160 | $5.24 | $2 | $138 | $145.24 | **+$14.76** | **9%** |
| 3 | $240 | $7.86 | $3 | $138 | $148.86 | **+$91.14** | **38%** |
| 5 | $400 | $13.10 | $5 | $138 | $156.10 | **+$243.90** | **61%** |
| 10 | $800 | $26.20 | $10 | $138 | $174.20 | **+$625.80** | **78%** |
| 20 | $1,600 | $52.40 | $20 | $138 | $210.40 | **+$1,389.60** | **87%** |
| 30 | $2,400 | $78.60 | $30 | $142* | $250.60 | **+$2,149.40** | **90%** |
| 50 | $4,000 | $131.00 | $50 | $222** | $403.00 | **+$3,597.00** | **90%** |
| 75 | $6,000 | $196.50 | $75 | $242 | $513.50 | **+$5,486.50** | **91%** |
| 100 | $8,000 | $262.00 | $100 | $242 | $604.00 | **+$7,396.00** | **92%** |
| 165 | $13,200 | $432.30 | $165 | $242 | $839.30 | **+$12,360.70** | **94%** |
| 350 | $28,000 | $917.00 | $350 | $298*** | $1,565.00 | **+$26,435.00** | **94%** |

\* Add basic monitoring at ~30 clients
\** Data tier step-up (Hunter Scale) at ~50 clients; Resend Pro ($20) at scale
\*** Additional infra costs at 300+ clients

**Break-even: 2 clients** at ~$80/mo spend each (~20 fully-worked leads at $4) / $138 fixed stack — i.e. ~35 fully-worked leads/mo total.
**Break-even: 1 client** if that client works ~40+ leads/mo (Growth blend) or stacks the $5–6 layers.

---

## 8. Revenue Milestones & GTM (16 Jun audit)
*Timelines are directional based on §6 scenarios (per-lead framing: ~$80/mo avg client spend ≈ ~20 fully-worked leads at $4 — no ARPU tiers).*

| Milestone | What it unlocks | Conservative | Base | Optimistic |
|---|---|---|---|---|
| **$1,000 revenue/mo** | Platform pays for itself | Month 7 | Month 3 | Month 2 |
| **$5,000 revenue/mo** | Founder salary begins | Month 12 | Month 5 | Month 3 |
| **$10,000 revenue/mo** | First hire possible | Year 2 | Month 7 | Month 4 |
| **$25,000 revenue/mo** | Series A conversations | Year 2+ | Month 11 | Month 6 |
| **$100,000 revenue/mo** | Market leader across both tracks (US/UK/EMEA + Africa) | Year 3 | Month 24 | Month 15 |

*Note: break-even now hits at Month 1 even in conservative, vs. Month 2 before.*

---

## 9. The 4 Levers That Determine Which Scenario You Land In

| Lever | Impact | Status |
|---|---|---|
| **1. PDL + Hunter data path healthy** | Zero leads without sourcing + reveal = zero product = zero revenue | ⚠️ Police sourcing quotas + regen cap (#423) |
| **2. FIGSY self-outreach running** | Automated pipeline — K.I.N.D finds its own clients every Monday | ⚠️ Needs `FIGSY_KIND_CLIENT_ID` in Railway |
| **3. Partner channel** | 1 good agency partner = 10 new clients/month. Moves conservative → optimistic alone. | ⏳ Pending |
| **4. Leads-per-client + layer adoption** | If the average client works ~40 leads/mo instead of ~20 — or stacks the $4→$6 layers — all scenarios double | Driven by FIGSY + Milla/Denise adoption |

---

## 10. Key Risks to the Model

| Risk | Impact | Mitigation |
|---|---|---|
| PDL sourcing quota unset / exhausted (#423) | **CRITICAL** — runaway sourcing spend or no leads at all | Per-client/day sourcing quotas + regen cap; monitor PDL usage weekly |
| RESEND_API_KEY not set | High — zero emails, no nurture, clients go cold | Confirm set in Railway environment variables |
| Data-vendor licensing/ToS (PDL, Hunter) | High | You sell a managed service on licensed PDL Full data; keep contracts current. Confirm with lawyer at scale. |
| PDL/Hunter API rate limits | Medium | Queue ICP runs — a small code change at 20+ clients |
| Churn — client stops buying leads after the first pack | Medium | Focus on quality of leads. At-risk alerts built in. Onboarding call on day 2. |
| Lead yield below 60% | Low | Hunter verification keeps yield high. Adjust ICP filters if yield drops. |
| Payment processing fees at scale | Low | ~2.9% Stripe / ~3.8% Flutterwave (Africa). At $15,000/mo collected ≈ $440–570/mo. Negotiate a custom rate above $10k/mo. |
| Clients stay reveal-only ($1/lead, no FIGSY/layers) | Medium | Actively upsell FIGSY work + Milla/Denise layers after first leads delivered. Upgrade prompt built into portal. |

---

## 11. Summary (corrected 16 Jun)

| Metric | Value |
|---|---|
| Launch floor (Group A: Supabase+Railway+Resend+PDL+Hunter) | ~$114/mo |
| Launch + email + failover (A + B) | ~$138/mo |
| All-in including Claude Code dev | ~$239–395/mo |
| **Break-even (tech stack, $80 ARPU)** | **2 clients** |
| **Break-even (tech stack, $160 ARPU — Growth)** | **1 client** |
| **Break-even (tech stack, $199 ARPU — Growth+ Denise)** | **1 client** |
| Gross margin per lead (Lead Gen & FIGSY) | ~91% at $4/fully-worked lead (§5c) |
| Margin at 10 clients ($80 ARPU) | ~78% |
| Margin at 50 clients ($80 ARPU) | ~90% |
| Margin at 165 clients (Base Year 1 end) | ~94% |
| Year 1 total cash — Conservative | ~$22,000 |
| Year 1 total cash — Base | ~$72,000 |
| Year 1 total cash — Optimistic | ~$138,000 |

The model scales almost entirely as pure margin past ~35 fully-worked leads/mo. The biggest lever is not cost reduction — it's **per-lead layer stacking**: the same lead climbs the ladder $1 reveal → $4 FIGSY → $5 +Milla → $6 +Denise, so a full-stack client is worth 6× a reveal-only client on every lead, with no extra fixed cost.

The biggest single cost threat at scale is not technology — it's **payment processing** (~2.9% Stripe / ~3.8% Flutterwave of revenue). At $15,000/mo collected that's ~$440–570/mo. Negotiate a custom rate above $10k/mo.

---

**🟢 16 JUN UPDATE SUMMARY (SUPERSEDED by the 8-Jul per-lead lock):** Pricing reconciled to the LOCKED `@kind/shared` constants (founder-confirmed): **Lead Gen $20/$40/$100 ($1 flat) · FIGSY $60/$120/$300 ($3 flat) — no volume discounts**. Stripe ($20/$38/$88, $60/$110/$250) and the portal UI are the bugs to fix Tue 16 (item 168). Denise corrected to $39 (was displaying $99). Double-charge (item 166) to be eliminated (separate pools). All ARPU/break-even/margin restored to the flat model; blended ARPU ~$80, break-even ~2 clients. *(An earlier pass this session wrongly treated Stripe's discounted values as the target — reverted.)*

---

## 12. The $1,000,000 Annual-Revenue Goal — What It Takes

*Annual revenue target: $1M/yr = a real revenue business. (Per-lead model — "annual revenue," not ARR; nothing recurs by contract.)*
*⚠️ **CORRECTED 16 Jun (PM):** an earlier draft of this section had a 10× arithmetic error (divided $1M by `ARPU × 12` but dropped a zero) and a fabricated cost table that wrongly showed a loss. Both fixed below. The truth: **$1M/yr is ~93% gross margin — roughly $900k profit — and the binding constraint is sales volume (logos), NOT margin.***

> ### 💡 Plain-English: do we ever lose money? **No.**
> Costs are almost all **fixed** (~$138/mo) plus a **tiny variable** (~2% of revenue — data + payment fees). So once you pass **2 clients**, every extra client is almost pure profit, and margin climbs toward **~93%** and *stays there*. **There is no point where more revenue turns into a loss** — bigger is always more profit. The only thing that gets harder as you grow is **how many clients you must sign** to hit a target ($1M/yr = ~1,042 clients at $80/mo avg spend, or just 347 at $240/mo). That's a *sales-volume* problem, never a *losing-money* problem. *(The earlier "you lose at $1M" was an arithmetic mistake, now fixed.)*

### How $1M/yr breaks down
**$1M/yr = $83,333/mo revenue.** Clients needed = monthly revenue ÷ avg monthly spend per client. *(All spend is per-lead — clients × avg leads/mo × $/lead; profiles below assume an avg leads/mo per client, e.g. $80 ≈ 20 fully-worked leads at $4.)*

| Spend profile | Avg spend/mo (leads × $/lead) | **Clients for $1M/yr** |
|---|---|---|
| **Blended** (conservative, mostly light/reveal-heavy clients) | $80 | **1,042** |
| **Growth** (Reveal 100 + FIGSY 20) | $160 | **521** |
| **Growth+** (+ $1 Denise layer) | $199 | **419** |
| **Partner-blend** (70% Growth+ / 30% Scale) | $240 | **347** |
| **Scale** (Reveal 100 + FIGSY 100 → $4/lead) | $400 | **208** |
| **Outcome pricing** (per meeting booked) | $500 | **167** |

*Higher spend per client (more leads worked + layers stacked) doesn't change your margin (already ~93%) — it changes how many logos you must close. That's the whole game.*

### Cost Structure at $1M/yr revenue (corrected — costs are % of revenue, so client count doesn't change them)
| Cost category | Annual | % of revenue |
|---|---|---|
| **Stripe payment processing** (2.9% + 30¢/txn) | ~$32,000 | ~3.2% |
| **Data** (PDL + Hunter + Claude Haiku) | ~$20,000 | ~2% |
| **Fixed infra** (Supabase/Railway/Resend/Hunter Scale at scale) | ~$5,000 | ~0.5% |
| **Infra scaling** (compute, pgvector, backups) | ~$15,000 | ~1.5% |
| **Hard costs (pre-payroll)** | **~$72,000** | **~7%** |
| **GROSS PROFIT (pre-payroll)** | **~$928,000** | **~93%** ✅ |
| *Optional: 1–2 support/CS hires* | $60k–144k | 6–14% |
| **Net with 2 hires** | **~$784,000** | **~78%** |

✅ **This reconciles with §7** (94% margin at 165 clients). The single biggest cost line at scale is **Stripe (~3%)**, not data (~2%). Data only matters because it's the one cost that *grows with volume* — which is exactly why PDL sourcing quotas (#423) are the line to police at scale.

### The real lesson: $1M is a SALES-VOLUME problem, not a margin problem
- **At $80/mo avg client spend you must close ~1,042 clients.** At ~20 net new/month that's ~52 months. Slow.
- **At $240/mo avg spend (partners + company engine) only ~347.** At ~20/month via partners that's ~18 months. Viable.
- **At $500 (outcome pricing) only ~167.** The fastest path — but gated on having outcome data first.

**So the three levers for $1M/yr (in priority order):**
1. **Spend-per-client uplift** — fewer logos to sell. The **+$1 Denise layer** + FIGSY upsell turns a reveal-only client into a $160–199/mo client (more leads worked × more layers per lead). This is the cheapest lever (existing base).
2. **Partner channel + company engine (#88)** — sell *teams*, not seats. A 10-seat company at ~$240/mo spend = ~3 single clients' worth, one sale.
3. **Outcome pricing** (gated ≥28% margin, post-launch) — collapses the logo count to ~167. The real inflection.

**Margin is already solved (~93%). The work is leads-per-client + layer adoption, plus a repeatable way to add logos (partners/companies) — not cost control.**

---

## 13. The Apollo / Data-Sourcing Strategy — how we work around the ToS

> ⚠️ **SUPERSEDED (8 Jul) — Apollo retired from the data path (live stack: PDL Full + Hunter, §0); kept as history.**

### The problem (one line)
Reselling Apollo data from ONE K.I.N.D account to many clients may breach Apollo's ToS (§5d, risk from client #1) — and Apollo data is the only cost that *grows with volume*. So we need a data architecture that is **(a) ToS-clean** and **(b) low-friction**.

### What this is NOT
Data is only **~2% of revenue** (§4, §12). Working around Apollo is **not a profit play** — it saves ~2 margin points, not "profits like crazy." It's a **compliance + scale-resilience** play. Don't trade away signup conversion for it where it doesn't matter.

### The decision: SEGMENT BY ACV — don't use one model for everyone
| Segment | ACV | Data model | Friction | Why |
|---|---|---|---|---|
| **Self-serve SMB** (solo, $20–75) | Low | **K.I.N.D bundles the data** (we hold the Apollo/multi-source layer) | **Zero — "just works"** | A $20 client will not go create an Apollo account. Friction kills self-serve. We eat ~2% data cost — trivial. |
| **Company (#88)** (10–50 seats) | High | **BYO Apollo key** — one account per company, like their CRM, wired once at onboarding | Low — they tolerate a setup call | Sophisticated + high-value + already human-onboarded. ToS-clean AND zeroes our cost on the highest-volume accounts. |
| **Partners** (agencies) | High | **BYO Apollo / their own data ops** | Low — they already run data | Agencies have their own stack and expect to use it. Natural fit. |

**→ Your instinct ("a client/partner uses their own Apollo like their own CRM") is right — for companies and partners.** It's the wrong default for self-serve SMB, where BYO-key is a conversion-killer.

### On "free implementation" (the founder's idea)
Smart — **but only for high-ACV.** Wiring a client's Apollo key + CRM in a setup call is worth your time at $240+ ARPU (company/partner). It is **not** affordable on a $20–75 self-serve plan — every white-glove onboarding is human time. *(This is exactly why Alta, which does heavy white-glove onboarding, charges enterprise prices.)*

### What Alta actually does (competitor read, 16 Jun — public info, partly inferred)
- Alta **bundles a multi-source data layer** (50+ sources: BuiltWith, SimilarWeb, StoreLeads, intent signals, CRM, job postings). Clients are told *"you don't need to source your own data."* It is **not just an Apollo wrapper.**
- Alta is **enterprise / custom-priced** with **high-touch onboarding** (dedicated session, ICP + CRM + playbook, live in days). They can afford to bundle costly data + human onboarding because **they charge a lot**.
- **Public info is ambiguous** on whether Alta ever uses a client's own Apollo workspace. Weight of evidence: they bundle their own data layer and integrate a client's existing tools where present — they do **not** primarily make SMB clients BYO-Apollo.
- **Takeaway:** Alta proves *bundled-data + white-glove + premium* works — but that's a **different market** (enterprise) than our SMB/African self-serve. Copy the **bundling** for SMB and the **white-glove** only for high-ACV. Don't bolt enterprise onboarding cost onto $20 plans.

### The structural hedge (already half-built): multi-source waterfall
PDL is wired but dormant; Hunter ~$49/mo (§5d). A **waterfall across PDL → Hunter → Apollo** (the Clay/Alta philosophy) removes single-vendor ToS risk entirely, raises match rates, and fills African coverage gaps. This is the long-term answer that makes us **not hostage to Apollo at all.**

### The gate: wait for Apollo's reply before locking the SMB path
The `partners@apollo.io` email (sent 14 Jun) decides it:
- **If Apollo grants a reseller/partner agreement** → bundle data for SMB **ToS-clean**, keep zero friction. Best of both worlds.
- **If not** → push BYO-key further down-market and/or lean on the multi-source waterfall for SMB.

**RECOMMENDATION:** Bundle for SMB (pending Apollo's terms) · BYO-key for company/partner with free setup · build the multi-source waterfall as the hedge. **Do not force BYO-key on self-serve SMB — it costs more in lost conversions than the ~2% data it saves.**

---

## 14. Onboarding & Segmentation Plan — self-serve SMB vs. white-glove company

> 🚧 **STRATEGY / PLAN (not built). Founder-approved direction 16 Jun; layers on top of the existing onboarding draft (`docs/drafts/ONBOARDING_V2.md`, item #30) and the live Company Engine (#88).** Self-serve SMB flow already drafted; this adds the *company fork* + the data-segmentation rule. Nothing here ships before founder sign-off on a real signup run-through.

### The one rule
**Segment on SEATS REQUESTED, not headcount.** Company size (auto-read at signup) is a *hint* for routing/guessing, never a hard wall.
- **1 seat → self-serve track** (Track A). Zero friction, we bundle the data.
- **2+ seats / "team" intent → concierge track** (Track B). Free white-glove setup; data is PDL+Hunter bundled.

*(Headcount alone lies — a 15-person agency can be your best team customer; a 40-person firm may want one seat. Seats = the true signal.)*

### Shared front door (both tracks)
1. **Client enters their website at signup.** We auto-read their company data (firmographics incl. employee-size) — the existing **ICP website-scan** (per `ONBOARDING_V2.md`) extended to also capture the client's *own* size via **PDL** (`apps/api/src/lib/pdl-search.ts` — wired, has `job_company_size`; keys set 15 Jun).
2. **Auto-route:** size + seats → suggest Track A (self-serve) or Track B (concierge). Client can override.
3. **Everyone starts on K.I.N.D-bundled PDL+Hunter data immediately** — first scored leads in <10 min (the onboarding north-star). **No data account required to start, in either track — free to start, pay-per-lead.**

### Track A — Self-serve SMB (1 seat)
- The existing `ONBOARDING_V2.md` flow verbatim: signup → ICP → first leads (our PDL+Hunter bundled data) → first FIGSY campaign → first reply.
- **Data: always bundled by K.I.N.D (PDL+Hunter).** Client never touches a data vendor. We absorb the ~2% cost — trivial.
- Friction: **zero.** This is the volume engine + the upsell base (push FIGSY/Denise after first leads).

### Track B — Company / Team (2+ seats) — the #88 Company Engine
- **Free to start, pay-per-lead on bundled data — no implementation gate.** They get real leads + value *before* any setup ask (first paid reveals at $1/lead). This is the wedge that lets us "start engaging, onboarding and selling" while the deal warms.
- **After value is shown: free white-glove implementation** (the concierge call) — wire CRM + connections, configure pools/seats (#88's two-pool model: reveal $1 / FIGSY $3). Data stays PDL+Hunter bundled.
- **Implementation is a sales/relationship moment, never a hurdle** — "we build your revenue engine for you, free." It's *why* a company pays ~10× an SMB.

### The data model per track (resolved 8 Jul — Apollo retired)
| Track | Data |
|---|---|
| **A — SMB** | **PDL+Hunter bundled (we hold the data)** |
| **B — Company/Partner** | **PDL+Hunter bundled** — no BYO-key requirement |

*(The old BYO-Apollo-key question is moot — Apollo is retired from the data path; §13 kept as history. PDL Full is licensed for this use; the line to police is sourcing quotas, #423.)*

### Build status (honest — Rule 3)
| Piece | Status | Notes |
|---|---|---|
| SMB self-serve flow (Track A) | 🟡 drafted | `ONBOARDING_V2.md` #30 — gated on launch run-through |
| Company Engine, two-pool, seats (Track B core) | 🟢 live | #88 shipped to prod Mon 15 |
| Website→ICP autofill | 🟡 referenced built | confirm endpoint during run-through |
| Website→**own-firmographics** read for routing | 🔴 new | extend scan / use PDL company enrich |
| Seat-based auto-routing (A vs B) | 🔴 new | the segmentation switch |
| Free-to-start, pay-per-lead company onboarding on bundled data | 🔴 new | credit/wallet logic before implementation |
| White-glove implementation flow (CRM wiring) | 🔴 new | post-launch (company hardening, Month 1) |
| Multi-source waterfall (PDL→Hunter; Apollo retired) | 🟡 half-wired | PDL dormant-capable; keys set 15 Jun |

**Sequence:** ship Track A (self-serve) at launch → add seat-routing + free-to-start, pay-per-lead company onboarding → build white-glove implementation post-launch (already in Month-1 "company hardening"). *(The old "finalise the Apollo default" step is moot — PDL+Hunter bundled everywhere.)*

---

## 15. Execution Tickets — Tue-16 billing + onboarding build

> Derived run-list (pulls from `PRODUCT-INVENTORY.md` items 166–173 + §14). Inventory is the source of truth for status; this is the *do-it order* with file refs. Owners: 🧍 founder · 🤖 Claude · 🤝 both.

### A. BILLING CORRECTNESS — Tue 16 (pre-client blockers, gate Fri-19) — items 166–173
*Build order respects dependencies: the `plan` flag + pool model underpin the charge fixes; price reconciliation + admin visibility follow; multi-currency is a separate phase.*

| # | Ticket | Files | Owner | Order |
|---|---|---|---|---|
| **169** | `clients.plan` flag — migration + backfill (FIGSY campaign/credits → `figsy`, else `lead_gen`); delivery reads it, charges **one** pool | new migration + delivery path | 🤖 | **1** |
| **167** | FIGSY-only bundle can deliver — pool-aware delivery (not capped by lead-gen balance) + FIGSY-pool trial grant | `icps.ts:151-152` | 🤖 | **2** |
| **166** | Kill the double-charge — stop charging lead-gen $1 AND FIGSY $3 on the same lead ($4→$3) | `lead-delivery.ts:64`, `figsy.ts:907-921` | 🤖 | **3** |
| **170** | Atomic FIGSY credit RPC — replace read-modify-write with `increment_figsy_credits` RPC | `figsy.ts:909-912` | 🤖 | **4** |
| **168** | **Reconcile 3 price tables → LOCKED constants** ($20/$40/$100 · $60/$120/$300). Code: portal imports `@kind/shared`. **Founder: recreate the 6 Stripe Price objects at locked values.** *(SUPERSEDED by the 8-Jul per-lead lock)* | `constants/index.ts` (source), `billing/page.tsx:70-74`, `company/page.tsx`, `stripe.ts:26-30` | 🤝 | **5** |
| **171** | "How credits work" panel honesty — fix false "Outreach sent — No credit used" + show FIGSY pool | `billing/page.tsx:303-306` | 🤖 | **6** |
| **173** | Admin FIGSY visibility — surface `figsy_credits_remaining` (admin shows `credit_balance` only) + add top-up | admin client view | 🤖 | **7** |
| **172** | Multi-currency USD/GBP/ZAR — Stripe multi-currency Prices + `clients.preferred_currency`; reconcile w/ Flutterwave. **Own phase — does NOT block 166–171.** | `flutterwave.ts:146-160` | 🤝 | later |

**Founder's two actions for the billing build:** ① recreate the 6 Stripe Price objects at the locked values (item 168); ② decide multi-currency scope (item 172).

### B. ONBOARDING & SEGMENTATION — from §14 (mostly post-launch / Month-1 company hardening)
| Ref | Ticket | Status | Owner |
|---|---|---|---|
| #30 | SMB self-serve flow (Track A) | 🟡 drafted (`ONBOARDING_V2.md`), gated on launch run-through | 🤝 |
| #88 | Company Engine, two-pool, seats (Track B core) | 🟢 live (prod Mon 15) | — |
| **174** | Website → read client's **own firmographics** for routing (PDL company enrich) | 🔴 new | 🤖 |
| **175** | Seat-based auto-routing (1 = self-serve / 2+ = concierge) | 🔴 new | 🤖 |
| **176** | Free-to-start, pay-per-lead company onboarding on bundled data (before any implementation) | 🔴 new | 🤖 |
| **177** | White-glove implementation flow (CRM + **optional** BYO-Apollo) | 🔴 new — Month-1 company hardening | 🤝 |
| 94/95/140 | Multi-source waterfall PDL→Hunter→Apollo (activate) | 🟡 half-wired (keys set 15 Jun) | 🤖 |

*(Inventory IDs 174–177 added 15 Jun. The earlier "O1–O5" labels are retired — these are the canonical numbers across all docs.)*

### C. Gated on Apollo's reply (`partners@apollo.io`, sent 14 Jun)
- **Final SMB data default** — bundle (if Apollo grants reseller/partner terms) vs. lean on multi-source waterfall (if not). Until then: **bundle for SMB, BYO-key optional for company/partner** (§13/§14).

**Critical path to Fri-19:** items **169 → 167 → 166 → 170 → 168 → 171 → 173** (billing correctness). Onboarding A/B and the Apollo default are **post-launch** — they do not gate the 19th.

---

---

## 16. How to Run the Company — Business Training

*Delivered 29 Jun 2026. Operational reference for running K.I.N.D day-to-day — business model, money flow, company ops status, and weekly rhythm.*

### What this business actually is

K.I.N.D is a SaaS platform that sells AI sales automation to SMBs. You make money **one way (LOCKED 8 Jul): per qualified lead — no subscriptions.**

1. **Reveal** — $1 to reveal a verified contact (the database).
2. **FIGSY works it** — +$3 (= $4 fully worked); **+$1 Milla · +$1 Denise** layers; **Vida inbound $3**. Sold as prepaid credit packs, consumed per qualified lead. *(The old "agent subscriptions" model is retired — #431.)*

The model is ~91–92% gross margin. Fixed costs are ~$138/month. Break-even is **2 clients**. After that, almost every dollar of revenue is profit.

### The five products and what they charge

| Product | Type | Price |
|---|---|---|
| Lead Gen (K.I.N.D AI) | Credits | $20 / $40 / $100 bundles ($1/lead flat) (prepaid packs — the price of record is the per-lead ladder §0) |
| FIGSY | Credits | $60 / $120 / $300 bundles ($3/lead flat) (prepaid packs — the price of record is the per-lead ladder §0) |
| Milla (VA / Brain) | ~~Subscription $49/mo~~ | **+$1/qualified lead** (intelligence layer #427 — LOCKED 8 Jul, §0) |
| Vida (Chatbot) | ~~Subscription $29/mo~~ | **$3/qualified inbound lead** (engine #429 + add-ons) |
| Denise (AI Account Executive) | ~~Subscription $39/mo~~ | **+$1/qualified lead** (action layer #428) |

Highest-leverage upsell: the per-lead ladder — $1 reveal → +$3 FIGSY = $4 → +$1 Milla = $5 → +$1 Denise = $6. A full-stack $6/lead client is worth 6× a reveal-only client on every lead.

### Break-even and salary target

- **Break-even (infra only):** ~35 fully-worked leads/mo at $4 (≈ 2 steady clients)
- **Break-even (incl. dev costs):** ~70–110 fully-worked leads/mo (≈ 5 clients)
- **Salary target (£75k/year gross):** ~$5,000/mo revenue run-rate ≈ 1,250 fully-worked leads/mo — ~63 clients at ~20 leads/mo each, fewer with the $5–6 layer stack
- **Churn is the treadmill:** at 5% monthly churn you replace ~3 clients/month forever. Quality of first leads matters more than volume for retention.

### How money flows

```
Client pays → Stripe (global) or Flutterwave (Africa)
                ↓
        Credits land in the client's wallet
                ↓
        Revenue sits in Stripe/Flutterwave balance
                ↓
        Stripe pays out → Wise Business (UK sort code + USD balance)
                ↓
        You pay fixed stack (~$138/mo) from Wise
                ↓
        Profit → withdraw to personal account as salary/dividend
```

### Company ops — current status (29 Jun 2026)

| Item | Status | Next action |
|---|---|---|
| UK Ltd (Companies House) | ✅ Active | File confirmation statement annually |
| ICO registration (data protection) | ✅ C1959926 | Renew annually |
| Business bank account | ✅ Wise Business (primary) | Save sort code + account number |
| Stripe payouts | ✅ → Wise Business | Done |
| Flutterwave (Africa) | ✅ Wired | Confirm payout destination |
| Wise (partner/AE commission payouts) | ✅ Open | Use for partner commissions |
| Accounting platform (item 196) | ⏸ Xero — open on first paying client | Connect Stripe + Wise same day as first client pays |
| Bookkeeping cadence | ⏸ Blocked on Xero | Monthly reconciliation — starts on first client |
| VAT registration | Not yet | Threshold: £90k/year UK turnover — nowhere near it |
| HMRC (corp tax) | Active obligation | Xero + accountant handles this once connected |

**Xero — why it's the right choice and when to open it:**
- Connects directly to Stripe (auto-imports every payment) and to Wise
- Handles USD revenue reconciled to GBP for HMRC filing
- Standard for UK Ltd — most UK accountants work in it
- Start on Xero Starter (~£15/mo) on the day first client pays; it backfills Stripe history from day one

### Weekly numbers rhythm (15 min/week, every Monday)

| Metric | What it tells you | Where to check |
|---|---|---|
| Revenue run-rate (collected/mo) | Is the business growing? | Stripe dashboard |
| New clients this week | Lead indicator | Admin portal |
| Churn (cancellations) | Are you keeping clients? | Admin portal |
| Spend per client (leads × layers) | Are clients upgrading or staying reveal-only? | Admin portal |
| Credits consumed vs. purchased | Are clients active or stalled? | Admin portal |
| Stripe balance / payout | Cash in hand | Stripe + Wise |

If revenue is flat and churn is rising — focus on client success before new sales.

### The three levers that determine which scenario you land in (recap from §5d)

1. **Per-lead layer uplift** — push FIGSY + Milla + Denise after first leads land. Turns a reveal-only client ($1/lead) into a full-stack $6/lead client.
2. **Partner channel** — 1 good agency partner ≈ 10 clients/month. Bypasses the whole cold funnel.
3. **Per-rep company engine (#88)** — sell teams, not seats. A 10-seat company ≈ 10× a single client at almost the same cost to serve.

---

*Document owner: K.I.N.D founding team*
*Last updated: **8 Jul 2026** — **re-modelled onto the LOCKED two-charge money model: $1 reveal + $3 work = $4/fully-worked lead.** New §0 header + §2–§5/§5c rebuilt on the real PDL Full + Hunter Scale costs (Fable-verified: ~$0.36/lead → ~91% margin). Apollo retired from the data path (body Apollo lines flagged stale). Spec = inventory #420–#426.*
*Previous: 29 Jun 2026 — §16 How to Run the Company · 16 Jun 2026 — flat-constants reconciliation + $1M ARR goal + §13/§14/§15.*
*Review this model quarterly as pricing, client mix, and ARPU evolves.*
