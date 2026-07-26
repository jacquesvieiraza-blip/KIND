# 📜 THE PRODUCT RULES — one page, the founder's word

> **What this is.** The non-negotiables the product must obey. Not strategy, not a roadmap, not status — those have their own homes. This exists so nobody has to guess and the founder does not have to re-explain the same rule every session.
>
> **DRAFT — every line below is taken from a decision the founder has already made.** Each rule names where it came from and, where it is enforced in code, the constant that enforces it. **Cut, correct and add.** Nothing here is agreed until the founder says so.
>
> **The rule about these rules:** if a rule here and the code disagree, that is a bug — fix one of them the same session. A rule nobody enforces is a wish.

---

## 1 · MONEY

| # | Rule | Where it came from | Enforced by |
|---|---|---|---|
| M1 | **The $99 pack is 100 approvals included. Not 99, not 124.** | founder-locked 24 Jul, #541 | `PACK_LEADS = 100` |
| M2 | **After the included 100, it is a flat $4 per approved lead. FINAL** — no $1/$3 split shown, no hold, no capture-at-booking. | founder-locked 24 Jul (supersedes the 23-Jul re-time) | `LEAD_PRICE_USD = 4` |
| M3 | **The $99 buys the pack ONLY — never wallet credit as well.** One payment must not pay out twice. | #562 | `stripe.ts` skips `increment_wallet` on first purchase |
| M4 | **ONE WALLET.** One dollar wallet per client. No parallel credit columns. | founder-locked 24–25 Jul, #492 | `wallet_balance_usd`, `try_charge_wallet` |
| M5 | **A lead is charged at most once, ever.** | #566/#569 | the atomic `revealed_at` claim |
| M6 | **Repeat business is wallet top-ups, not a second pack.** A renewing pack loses money at ~$105 against $99. | #567, costed 25 Jul | — |
| M7 | **Money the client is owed is never silently lost.** A failed write returns the money, releases the claim, and alerts. | #568 | rollback + alert on every money write |

## 2 · SAFETY — the rules that protect a real person

| # | Rule | Where it came from | Enforced by |
|---|---|---|---|
| S1 | **A demo account can NEVER touch a real prospect.** `is_demo` is a hard stop inside the send path, and every demo address is `.invalid`. | founder-locked | `figsy.ts:543` |
| S2 | **The kill-switch is OFF until the founder says otherwise.** Nothing reaches a real prospect while it is off — including consent sends. | #344, the five consent doors | `AUTO_OUTREACH_ENABLED !== 'true'` |
| S3 | **Minimum 20 approvals before work starts.** A lifetime commitment, not per batch. | #538 | `MIN_BATCH_APPROVALS = 20`, resolved against the DB |
| S4 | **A paying client with no approvals for 30 days is suspended** (warned at 23). | #538 | `COLD_DAYS = 30`, `WARN_DAYS = 23` |
| S5 | **Never cold-email from the primary domain.** | founder, 26 Jul | — |
| S6 | **Opt-outs are global**, checked at sourcing, across every client. | verified 26 Jul | — |

## 3 · SENDING — who drives the van

| # | Rule | Where it came from |
|---|---|---|
| D1 | **Instantly sends for US** — our own outreach, from the 5 already-warm mailboxes, by API. | founder-locked 26 Jul, #577 |
| D2 | **Smartlead sends for CLIENTS** — mailbox bought per client **only when they pay**. | founder-locked 26 Jul, #577 |
| D3 | **Enterprise later** — a client's own mailbox, sent directly by our product over SMTP. | #577 |
| D4 | **Our product decides who, what and whether. Their engine executes the schedule.** Every safety gate sits upstream of the hand-off. | #577 |
| D5 | **We do not build mail infrastructure.** Both vendors confirmed in writing they release no SMTP credentials. | 23 Jun, re-confirmed 26 Jul |

## 4 · THE DEMO

| # | Rule | Where it came from |
|---|---|---|
| X1 | **One demo environment, always: MBF.** The demo factory is gone. | founder-locked |
| X2 | **The stage never moves.** *"5 demos = 1 sale"* only holds if demo fifty shows the same people as demo one. No randomness anywhere in the seed. | founder-locked |
| X3 | **No real people in a demo.** Real names on a sales call is the thing being prevented. | founder-locked |

## 5 · PROCESS — how work reaches the founder

| # | Rule | Where it came from |
|---|---|---|
| P1 | **Nobody builds without the founder's go.** Anything outside the authorised list: report it, do not build it. | Prompt 1, R1 |
| P2 | **NOTHING GETS DELETED.** Out-of-play code is fenced, labelled, and left exactly where it is. | founder-locked 26 Jul |
| P3 | **The founder merges. Claude does not.** | RULEBOOK 2.2 |
| P4 | **Client-facing work is previewed before it goes live.** On this repo, merging to `main` IS shipping. | RULEBOOK §11 |
| P5 | **🟢 is founder-only** and means verified live in production. Live-but-unwalked is 🩷. | CLAUDE.md |
| P6 | **Every claim is proven by pasted command output, or labelled UNVERIFIED.** Memory is not a source. | RULEBOOK 1.0, Prompt 1 R3 |
| P7 | **A full audit states its coverage** as a % of the core. *"No issues found"* without a coverage statement is not a result. | #573, Prompt 1 |
| P8 | **One PR = one shippable change.** | CLAUDE.md |
| P9 | **If unsure, ask. Do not just build. Flag it.** | founder, standing |

## 6 · OPERATIONS

| # | Rule | Where it came from |
|---|---|---|
| O1 | **Deploy is always `bash scripts/ship.sh`.** Merging does not deploy; Railway is not automatic. | verified 26 Jul |
| O2 | **A red gate cannot deploy.** `check.sh` runs first and refuses. | #574 |
| O3 | **No new SQL** beyond committed, reviewed, **idempotent** migrations run from Vida → Engine. | founder-locked (the SQL editor is unreachable) |
| O4 | **Secrets go in Railway, never pasted in chat.** | founder, standing |
| O5 | **Nothing shows green unless it was actually probed.** NOT-MEASURED is a real answer; treating it as green is the failure this exists to stop. | #576 |

---

## Open — the founder has not ruled on these

Written down rather than assumed, per P9.

- **Paystack** — `charge_authorization` can still charge a card in ZAR on a retired processor (#352). Delete, or keep?
- **The three security holes in disabled agent routes** — #359, #369, #360. Delete, or keep disabled?
- **Where this page lives.** It is a *product* rules page, so it does not clash with the four-doc status contract — but the founder may want it merged into `RULEBOOK.md` instead of standing alone.

---

*Draft prepared 26 Jul from decisions already on record. Not in force until the founder approves it.*
