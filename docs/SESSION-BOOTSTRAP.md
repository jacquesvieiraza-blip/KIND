# 🧭 SESSION BOOTSTRAP — read this first, then stop reading

**You are joining K.I.N.D mid-flight. This page is the entry point, not the truth.** Read it, then open only what your task needs.

## The five facts you cannot get wrong
1. ⛓️ **23 Sep (checked against main `83e9c1b`):** **launch day (4 Sep) has passed — the product is live with production clients** (**R135**, **R138**). ~~**Launch is Friday 4 September 2026** — unconditional (**R76**; supersedes R57's 25 Aug, which is now history).~~
2. ⛓️ **23 Sep (checked against main `83e9c1b`):** **LIVE commercial truth: the programme, for every account.** **$450 per QUALIFIED meeting** (**R141**) on the curve $450 → $437.50 at 10 → $400 floor from 50 (**R81**), paid **50/50 — P1 at start, P2 at approval**. Source: `packages/shared/src/programme-pricing.ts`. The $299 pack, $4 per approved lead, top-ups, subscriptions and trials are **retired in code** (**R124 · R137** — `apps/api/src/lib/commercial-model.ts:99`; Stripe `/checkout` + `/subscribe` return 410). ~~**LIVE commercial truth: $299 onboarding pack · first 100 approved leads included · $4 per approved lead thereafter.** Reviewing is free. One wallet. Source: `packages/shared/src/constants/index.ts`.~~
3. ⛓️ **23 Sep (checked against main `83e9c1b`):** **the programme model is built and live** (fact 2). 250 leads per meeting is still the **expected** rate; **400 is the limit, never shown to a client**, and a shortfall is **credited to the wallet** (**R136**). ~~**APPROVED BUT UNBUILT: the programme model** — priced per targeted booked meeting on a locked curve (**R81**), 250 recommended leads per targeted meeting (**R77**), contribution defined (**R78**). **Nothing of it is built. None of it may be quoted** to a client, a partner or the website.~~
4. **NO OUTCOME GUARANTEE and NO FREE TRIAL.** Meetings are targets and planning estimates, never promises. Signup writes `paused` with a $0 wallet.
5. **MERGE IS NEVER CLAUDE'S.** The founder merges, after independent review. Claude's own self-review is never merge authorisation.

## The four founder decisions of 28 Aug
- **R77 (FD-01)** — **250** recommended leads per targeted booked meeting. Supersedes R69's ~150 *as the planning figure*. ⚠️ **R69's 250–300-with-no-meeting campaign-review trigger survives** — different rule, still live.
- **R78 (FD-02)** — programme contribution = programme revenue − directly attributable acquisition and delivery costs. **Fixed overhead excluded.** Partner = 25% of contribution. ⚠️ Contribution is **not** net profit. ⛓️ **23 Sep (checked against main `83e9c1b`):** **partners are frozen** (**R139**, `packages/shared/src/partners-frozen.ts`) — the channel is switched off and nothing is deleted, so the 25% rule stands but pays no one while frozen.
- **R79 (FD-03)** — Milla, Vida and the website launch as **one finished, premium, conversational experience**. **Quality is NOT V2.**
- **R80 (FD-04)** — client-configurable retention is **post-launch**. The phrase *"retention settings"* stays absent. **Retention ≠ contactability (R67 untouched).**

## The open blocker
**#704 — the retention duration.** Four live surfaces state four different clocks (90 days / 12 months / 24 months; the DPA inverts the privacy policy). **No authoritative basis exists in the repo. Do not choose one.** Founder + counsel (W18).

## Who decides what
- **The founder** decides. Everything commercial, legal or strategic is his.
- **GPT** reviews independently — twice: once on Scout findings, once on Builder output. It classifies and verifies; **it is not a source of product truth**.
- **Scout** investigates and returns evidence. Changes nothing.
- **Builder** builds a **frozen** scope. Does not renegotiate it, does not merge.

## Where the work is right now
⛓️ **23 Sep (checked against main `83e9c1b`):** the bullets below are the **29-Aug** record. Open PRs re-checked on GitHub: **#1739 · #1644 · #1629 · #1625 · #1463 · #1436** (**#1596** and **#1427** are merged). Current work lives in LAUNCH-PAD. Also current and easy to get wrong: **Apollo is the only data provider** (FD-6, 17 Sep — PDL, Hunter and Clearbit are retired in `apps/api/src/lib/retired-providers.ts`) · **Vida is the operator console with two workspaces, Clients and Command Centre** (**R116**) · **six stages: Brief / Proof / Programme / Approval / Results / Complete** (**R127**, `packages/shared/src/mvp1-stage.ts`) · **Milla and Vida are conversations, not forms** (**R121**) · **the kill switch is absolute** (**R114**).
- **Current Builder task:** none open. **BUILD-002 · Programme Commercial + Money Engine** closed **COMPLETE** 29 Aug → `docs/founder/tasks/BUILD-002.md`. ⚠️ **COMPLETE under a zero-money evidence boundary:** pre-payment half **RUNTIME VERIFIED**, post-payment half **CODE VERIFIED / RUNTIME UNVERIFIED** until a real customer payment (packet §9). ⛓️ **23 Sep (checked against main `83e9c1b`):** every client is now on the programme (R124 · R137). ~~**It did not make the programme model client-facing — `$299 / first 100 included / $4` is still what clients get.**~~
- **Current Scout task:** none open — BUILD-002's scouting completed and was consumed by the build.
- **Next READY task:** **NONE.** The queue is empty.
- ~~**Open PRs (verified live 29 Aug):** **#1596** · **#1463** parked, do not merge as-is · **#1436** · **#1427**. BUILD-002's three PRs — **#1466**, **#1595**, **#1597** — are all **merged** (`main` at `1769e18c`), as are **#1464** and **#1465**.~~
- ⚠️ **Never name a PR number you have not just re-verified is open.**

## Two laws that override your instincts
- **UNKNOWN STAYS UNKNOWN.** If the evidence does not prove it, say so and leave it unresolved. Do not publish a guess to close a gap. Distinguish **CODE VERIFIED · RUNTIME VERIFIED · RUNTIME UNVERIFIED**, and never infer runtime truth from code alone.
- **SUPERSEDED HISTORY IS NOT CURRENT TRUTH.** This repo chains history instead of deleting it, so a search *will* return struck, quoted and superseded text. Finding it does not make it current. Read the chain marker before you quote the line.

## Then go deeper — in this order, only as far as your task needs
| For | Open |
|---|---|
| What needs the founder today | `docs/FOUNDER-OPERATING-TRUTH.md` |
| Every ruling, **wins every conflict** | `docs/PRODUCT-RULES.md` |
| Where a given truth lives (194 subjects, CMP IDs) | `docs/FOUNDER-TRUTH-REGISTER.md` |
| Today's execution list | `docs/LAUNCH-PAD.md` |
| Status of record (the dots) | `docs/PRODUCT-INVENTORY.md` |
| Strategy, decisions, session log | `docs/KIND-MASTER.md` |
| How to operate this repo | `CLAUDE.md` → `docs/RULEBOOK.md` |

**Authority order: PRODUCT-RULES > LAUNCH-PAD > PRODUCT-INVENTORY > KIND-MASTER > V2-TRACKER.**
**Pause is the default (R65).** No build, edit, PR or external write before the founder's explicit go.
