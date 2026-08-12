# 📜 THE REGISTER OF LOCKS — every ruling the founder has made, one page

> **READ THIS FIRST, EVERY SESSION** (CLAUDE.md § Session start). This is the founder's memory, externalised. It exists because on **6 Aug** he said: *"i cant remember everything fable. and i am struggling here. because things slip far to often."*
>
> **What this is.** Every decision the founder has locked, with **his own words where they exist**, the source it came from, and — stated honestly — what actually enforces it. Not strategy, not a roadmap, not status: those have their own homes. A rule nobody enforces is a wish, and this page says which is which.
>
> ## ⛓️ THE CHAIN RULE — the one that earned this rewrite
> **A superseded decision is NEVER deleted. It is chained: `old → amended`, both dated, and the LATEST WINS.**
>
> On 6 Aug I contradicted the founder's own #577 amendment within hours of him relying on it — and **the cause was sitting on this very page**: rule **D1** still read *"Instantly sends for US… by API"*, the **26-Jul** lock, with no sign that the founder had amended it on **30 Jul**. I read the stale half, paraphrased it, and it merged. Every automated check stayed green, because doc-lint verifies counts and copies, **never whether a sentence is true**. The only check that fired was the founder's memory — which is precisely the thing this page is meant to replace.
>
> **So: an un-chained supersession on this page is a live trap.** If you amend a rule, the old text stays, struck and dated, directly above the new one.
>
> ## The rules about these rules
> 1. **Cite by date.** No sentence about a locked decision may be written anywhere — doc, PR body or chat — without re-reading the lock here and citing its date (CLAUDE.md, the citation law).
> 2. **This is a REGISTER, not a new home for truth.** Every row cites its source. **Status lives only in PRODUCT-INVENTORY.** If a row here and its source disagree, that is a bug — fix it at the source, the same session.
> 3. **Same-session capture.** A ruling the founder makes in chat becomes a row here **that session** (CLAUDE.md ritual 4b). A ruling that lives only in a transcript is a ruling that will be contradicted — transcripts are not read at session start and cannot be grepped.
> 4. **Verbatim beats paraphrase.** Where the founder's words exist, they are quoted. My summary of his words is not his ruling.

---

## 1 · MONEY

| # | Rule | Where it came from | Enforced by |
|---|---|---|---|
| M1 | **The $299 pack is 100 approvals included. Not 99, not 124.** *(price re-locked 3 Aug; the 100 never moved)* | founder-locked 24 Jul · price 3 Aug, #541 | `PACK_LEADS = 100` · `PACK_PRICE_USD = 299` |
| M2 | **After the included 100, it is a flat $4 per approved lead. FINAL** — no $1/$3 split shown, no hold, no capture-at-booking. | founder-locked 24 Jul (supersedes the 23-Jul re-time) | `LEAD_PRICE_USD = 4` |
| M3 | **The pack purchase buys the pack ONLY — never wallet credit as well.** One payment must not pay out twice. ⛓️ *Written 26 Jul as "the $99"; the price became **$299** on 3 Aug (M1). The RULE never changed — only the figure in its wording, which is why it is now stated without a number.* | #562 · re-worded 6 Aug | `stripe.ts` skips `increment_wallet` on first purchase |
| M4 | **ONE WALLET.** One dollar wallet per client. No parallel credit columns. | founder-locked 24–25 Jul, #492 | `wallet_balance_usd`, `try_charge_wallet` |
| M5 | **A lead is charged at most once, ever.** | #566/#569 | the atomic `revealed_at` claim |
| M6 | **Repeat business is wallet top-ups, not a second pack.** *(Costed 25 Jul when a renewing pack lost money at ~$105 against $99. ⚠️ At the 3-Aug price of **$299** a second pack would no longer lose money — but the rule stands on its own logic: a repeat client already has a warmed inbox and a sourced pool, so charging them a second onboarding fee bills them for onboarding twice.)* | #567, costed 25 Jul · re-checked 3 Aug | — |
| M7 | **Money the client is owed is never silently lost.** A failed write returns the money, releases the claim, and alerts. | #568 | rollback + alert on every money write |

## 1b · PRICING — *(new 6 Aug: this section did not exist, and the $299 lock was nowhere on this page)*

| # | Rule | The founder's words | Source | Enforced by |
|---|---|---|---|---|
| **PR1** | ⛓️ **The first purchase is $299** — the fully-onboarded pack, 100 approved leads included, then $4 each. ~~*24–25 Jul: $99*~~ → **3 Aug: $299**. At $99 he personally funded ~$78 of every engine-acquired client and carried the churn bet; at $299 day one is +$18.50 after full CAC. He chose $299 over $199 deliberately. | *"you can always discount down from $299 in your own mouth; you cannot quietly raise from $199 without punishing the early clients who took the risk on you"* (his reasoning, recorded) | 3 Aug · #609 | `PACK_PRICE_USD` · `pack-price-single-source.test.ts` · `pricing-copy.test.ts` |
| **PR2** | **Discounts are founder discretion, by hand in Stripe — NEVER in code, on the site, or in the product.** | none | 3 Aug | nothing — words only |
| **PR3** | **Base + Advanced — two packages, ONE engine.** Not two products, not two codebases; what differs is entitlement and attention. **Advanced is sold before it is built, deliberately.** ⚠️ **Price points and the feature split are explicitly NOT decided** — the 31-Jul sketch figures are brainstorming, and he said so at the time. | *"I know from my own sales experience selling a 1 product model is not strong enough… I think we need to have 2 offerings min."* · *"Do not just agree with me"* | locked 31 Jul, logged 2 Aug · #608 | nothing — words only |
| **PR4** | **Coaching stays as-is and stays FREE** — a value-add on a booked meeting, which makes it a retention lever rather than another thing to price. #601 is parked on founder hold: not cancelled, not merged. | none | 31 Jul / 2 Aug · #601 | nothing — words only |
| **PR5** | **The funnel model stays at 1,000:1** contacts-to-win. It does not move on vendor marketing (Apollo's 50,000 is one rep's sends; Alta's 159 is "influenced", not closed-won). | none | 4 Aug · #612 | nothing — words only |
| **PR6** | **`CASHFLOW-LAB.html` is the money model of record**, in the repo — two needles at the top, every cost line an editable box. If it and the workings disagree, **the lab wins**. | *"we can refine numbers but the layout I understand."* | 25 Jul · #556 | `cost-floor-drift.test.ts` binds it to `cost-floor.ts` |
| **PR7** | ⛓️ **The cost floor: what was cut, and what deliberately was NOT.** Resend → free · Apollo → free from 3 Sep · Claude Code downgraded (~$152 → ~$23). **Google Workspace ($28) and Instantly Growth ($37) kept on purpose** — cutting the sending path saves ~$65 and pushes first revenue further away. ⛓️ *Floor chain: $138 "verified" (never checked against a bill; real $50.59) → … → ~$146 (3 Aug) → **corrected 6 Aug: $146 is the PLATFORM half; all-in is $352**.* | *"i cant afford 470/month… without income coming in this is impossible to maintain"* | 3 Aug · corrected 6 Aug | `cost-floor.ts` · `cost-floor-drift.test.ts` |
| **PR8** | **NO real-money $299 walkthrough.** The money walk splits: a $0 `manual_grant` proves the pack tiles, the wallet staying $0 and the sourcing gate; the live Stripe webhook is proven by the first real client's $299. | *"i am not running the real money walkthrough as i dont have that money"* · *"i am not buying $299 now."* | 4–5 Aug | `manual_grant` in `PAID_TX_TYPES` |
| **PR9** | **A7 is VOID — there is no Stripe dashboard product to fix.** His own catalogue screenshot: 9 active products, 0 archived, **nothing at $99**. The pack checkout renders no dashboard product at all (inline `price_data`). | *"we never did it and never had to do it"* | 5 Aug · #619 | `lib/stripe.ts:113-132` |
| **PR10** | **Partner comp: 20% acquisition + 5% retention = 25%.** ⚠️ The retired Settings page advertised **"30% recurring"** against this ledger — a number a prospect could have quoted back at us (#628, removed 6 Aug). | none | 19 Jun | `docs/hiring/KIND-PARTNER-COMP-PLAN.md` · `routes/partners.ts` |

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
| D1 | ⛓️ **CHAINED — read the whole chain before writing one word about Instantly.** ~~**26 Jul:** *Instantly sends for US — our own outreach, from the 5 already-warm mailboxes, by API.*~~ → **30 Jul, AMENDED BY THE FOUNDER (this is the live rule):** **OUR OWN ENGINE sends our outreach** — FIGSY writes, `mailer.ts` + `sending-inbox.ts` deliver over SMTP, our unibox catches replies. **Instantly is a WARMUP UTILITY on the GROWTH tier** — and Growth is **sufficient**, permanently: *"the $97 HyperGrowth tier was required only for the API to integrate with a sender we no longer use."* **⚠️ Instantly is LOAD-BEARING FOR CLIENTS, not just for us** — client mailboxes are Google-direct (our engine needs SMTP credentials; vendor boxes expose none) and start **cold**, so the Growth warm-up network warms them too. That is why the per-client cost carries no separate warm-up line. **⚠️ THIS ROW IS WHY THE WHOLE PAGE WAS REWRITTEN:** it stood un-chained until 6 Aug and I paraphrased the dead 26-Jul half into a merged PR. | founder-locked 26 Jul → **founder-amended 30 Jul**, #577 · chained 6 Aug |
| D2 | **Smartlead sends for CLIENTS** — mailbox bought per client **only when they pay**. **Built 27 Jul (#550) and NOT PROVEN**: the key returns 401 and the sequence *step shape* is unverified. Check it in Smartlead's UI after the first push. | founder-locked 26 Jul, #577 |
| D6 | **The two routes are mutually exclusive by construction.** `canPushToInstantly` refuses anything that is not the house account; `canPushToSmartlead` refuses anything that is. A test asserts at most one route accepts any lead — so the money path attempts both with no `if/else`, keeping routing out of the money path. | 27 Jul, #550 |
| D7 | **A reply belongs to the mailbox that received it.** Routing is inbox → client → lead → thread. An unknown inbox falls back to the fan-out; a known inbox with no matching lead alerts rather than falling back, because falling back hands one client's mail to another. | 27 Jul, #551 |
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
| P10 | **READ THE PATH END TO END. Do not grep and move on.** Grep can prove a thing exists; it can never prove a thing is **missing**. Before touching a path, read that whole file — not the function being edited. If grep was used, say so and say what it could not have shown. | founder, 26 Jul |
| P11 | **Every prompt is answered with a CLAUSE TABLE — built before the work, reported after it.** See §5a. A prompt is never "done" without one. | founder, 26 Jul |
| P12 | **🔒 THE WEBSITE DOES NOT CHANGE. EVER. Without the founder's explicit, clear command.** Verbatim: *"lock in the site does not change after this. without my command and clear command. if it in the future requires a website change you make it very clear then i approve."* Any future website change is (1) stated to the founder in plain words, (2) approved by him, and only then (3) built + `bash scripts/freeze-website.sh` rerun. **Enforced, not honorary:** `website-freeze.test.ts` hashes every file under `apps/website` against `scripts/website-freeze.json` and fails the gate on ANY drift — one whitespace character fails it. The rule exists because #560 shrank the site 28→12 pages under a launch-path item and the founder experienced his own website changing in ways he had not pictured (restored by #604). A red freeze test is the rule working — never regenerate the manifest to silence it. | **founder-locked 1 Aug (#605)** |

### 5a · THE CLAUSE TABLE — the rule that exists because I kept getting this wrong

> **Why this is a required artifact and not a promise.** A behaviour I undertake, I forget: I committed to a clause-by-clause read after Prompt 1 and had dropped it by Prompt 4, where I reported an integration complete while **nothing called it**. An artifact is different — if it is missing from the PR, the founder sends it back without reading a line of code, exactly as the pasted-red rule already works.
>
> **Every miss this week was invisible to grep**: a module nothing imported, a generator writing to a scratchpad, a green test *requiring* the broken value, a refusal rendered in the success colour. Grep only ever returns what you already suspected.

**Paste this BEFORE the work prompt. It governs the message that follows it.**

```
BEFORE YOU BUILD ANYTHING. This governs the prompt in my NEXT message, and
every report you make about it.

1. READ, DON'T GREP. Before you touch a path, read that path end to end —
   the whole file, not the function you intend to edit. Grep can tell you a
   thing exists; it can never tell you a thing is missing. If you use grep,
   say so and say what it could not have shown you.

2. BUILD THE CLAUSE TABLE FIRST. Break my next prompt into every separate
   clause, QUOTED FROM MY WORDS — not paraphrased. Paraphrasing is how "every
   /operator endpoint" became "the System screen". Show me that table before
   you start building, so I can correct the reading before you write code.

3. REPORT AGAINST THAT TABLE. Your final report and your PR must open with:

   | Clause (my words) | Built | Verified how |

   "Verified how" must name the command you ran or the file you read end to
   end. "I built it" is not verification. "grepped for callers — nothing
   calls it" is.

4. ANY ❌ GOES IN THE FIRST LINE of the report and the PR title. Not the
   bottom. If a clause is partly built, it is ❌ with the gap named — there
   is no ✅ with an asterisk.

5. NEVER SAY A PROMPT IS DONE WITHOUT THAT TABLE. If you catch yourself
   about to, stop and build the table instead.

6. IF A CLAUSE CANNOT BE BUILT, say NOT-POSSIBLE and why. Do not work around
   it silently and do not substitute something easier.

Confirm you have read this, then wait for my next message.
```

**The two clauses that were earned, not designed:**

- **Clause 2 (table BEFORE the work)** would have caught Prompt 4. *"on approved leads, the product creates the campaign in Instantly, pushes the lead"* would have sat there as a row from the start, and its missing ✅ would have been visible at the end instead of surviving into a PR that read as complete.
- **Clause 4 (❌ at the top)** exists because the NOT-POSSIBLE items went in a tidy section near the bottom while the report led with what worked. The founder had to ask.

## 6 · OPERATIONS

| # | Rule | Where it came from |
|---|---|---|
| O1 | **Deploy is always `bash scripts/ship.sh`.** Merging does not deploy; Railway is not automatic. | verified 26 Jul |
| O2 | **A red gate cannot deploy.** `check.sh` runs first and refuses, and **it is the ONLY gate.** ⛓️ ~~*27 Jul: "CI has never run — 0 runs, ever."*~~ → **6 Aug, CORRECTED:** Actions ran **788 times from 25 May to 3 Jul**, then the account flag killed it; the 27-Jul check that minted the old claim was **blind** (the API returns 0 where the founder's own Actions tab shows 788). **The operative truth is unchanged and permanent** — nothing has run since 3 Jul and GitHub support is unresponsive (D2 = dead end). `check.sh` is not a belt over CI. | #574 · corrected 6 Aug |
| O3 | **No new SQL** beyond committed, reviewed, **idempotent** migrations run from Vida → Engine. | founder-locked (the SQL editor is unreachable) |
| O4 | **Secrets go in Railway, never pasted in chat.** | founder, standing |
| O5 | **Nothing shows green unless it was actually probed.** NOT-MEASURED is a real answer; treating it as green is the failure this exists to stop. | #576 |
| O6 | **Check the live database, not the repo.** Three migration directories and two schema snapshots disagree with each other and none describes production (#558). A verdict read off a file is a verdict about a file — the RLS audit predicted five exposed tables, production had three, and **none of them were the five**. | 27 Jul, #554b |
| O7 | **A failed check must never render as a pass.** Not an empty list, not a calm zero, not silence. Five instances this week: `count-inventory --check` exiting 0 without running · the ledger row advising a migration already run · eleven applied migrations shown as one failure · an RLS verdict from stale files · **CI reporting nothing because it has never run.** | 27 Jul, standing |
| O8 | **A guard asserts the INTENT, not the literal.** A test pinned the exact SQL of a migration; fixing the migration broke the test written to protect it. A guard that freezes the defect is worse than none. | 27 Jul, #554c |

## 7 · THE 6 AUGUST RULINGS — captured the same session, per ritual 4b

*Every row below was ruled by the founder in chat on 6 Aug. **Where the words are his, they are quoted. Where a formulation is mine, it says so** — his ruling and my summary of it are not the same artifact, and confusing the two is the failure this whole page exists to stop.*

| # | Rule | The founder's words | Enforced by |
|---|---|---|---|
| **A1** | **NOTHING about how we work changes before live.** The GitHub board/issues migration was examined at length on 6 Aug and **parked whole** — no process change, no tooling change, until the product is live. | *"i say dont change how we work at all till we go live."* | nothing — words only |
| **A2** | **The company-GitHub migration is the FIRST post-live project.** An org owned by the Ltd, work as issues/board/milestones, knowledge docs retained. Full plan: **V2-TRACKER → "PROJECT 1 POST-LIVE"**. | *"on the 26 August I want to run this like a PRO. and the system with 4 docs is insane. so i want to migrate post live."* · and the reason: *"the docs drift and i have to constantly remind you to fix the docs. i have not read a doc for 2 weeks because i dont trust it."* | V2-TRACKER section |
| **A3** | **18 Aug is an ACCESS CHECKPOINT, not a cliff.** Agent access can be renewed. **No deadline pressure may be derived from that date** — LAUNCH-PAD's "🤖 items die on 18 Aug" framing was wrong and is corrected. | *"if i need you i keep you. this is not hard rule i can pay for you to stay."* | LAUNCH-PAD 🟠 band heading |
| **A4** | **D2 — the GitHub flag appeal is a DEAD END. Nothing may queue behind it.** Support is unresponsive and the problem is not ours alone. The escape route (a company org) is **post-live only**, because re-authorizing Railway's deploy connection is exactly what the flag blocks. | *"github does not respond at all… ive been on comunity boards and over 3000 people have the same issue."* | LAUNCH-PAD D2 row |
| **A5** | **C5 — seat removal DEACTIVATES. Permanently. No delete will ever be built.** A seat's sent mail, replies and meetings are the client's own record and are never destroyed. | *"lets go through C5 - dactivate."* | `seat-cap-screen.test.ts` asserts no delete endpoint exists **and** that the client-facing card states the policy |
| **A6** | **A16 — CLOSED, no risk.** The 9 Instantly mailboxes are **4 Google on 2 domains warming** (the ladder's) **+ 5 older AirMail boxes, paused**. The ladder maths was right all along. The paused set is never picked for a send. | *"on a16 the other inboxes were the airtable. they are paused no concern. close off."* | nothing — words only · the paused state lives in Instantly, which no code can see |
| **A7** | **Growth is sufficient, and Instantly is load-bearing for clients — permanently.** See **D1**, where the full chain lives. Raised by the founder *from memory* against a merged PR that said otherwise; he was right. | *"we use instantly even later for clients because of the way we set up. you confirmed to me growth was enough. this was a lcoked decision. i need the truth please."* | D1 chain · #577 |
| **A8** | **Docs keep a place — for KNOWLEDGE, not status.** Things with a finish line become work items; things you consult but never finish stay documents (the cashflow model, competitive research, steal analysis, runbooks). | *"i think again the items worth stealing become actual items. but things like cashflow etc they cant live as items. so docs have a place."* ⚠️ **The shorthand *"if it has a done it's a card; if it has no done it's a doc"* is MY formulation of his ruling, not his words** — it is used in V2-TRACKER as the migration's sorting rule, and it is recorded as mine so nobody later quotes it back to him as his. | V2-TRACKER sorting rule |
| **A9** | ⚠️ **NOT A RULING — an agent working practice, recorded here so it is never mistaken for one.** *"Trust screens, not files"* (Vida → System probes the live product; agent reports are live-counted; the docs are the archive) was **proposed by me** on 6 Aug and the founder **did not explicitly rule on it**. It stands as my operating default until he does. | none — the founder has not ruled | nothing — and it is not a rule |


### 7b · THE 6 AUGUST RULINGS, PART TWO — four open questions closed in one message

> **The founder, 6 Aug:** *"all with your recomendfaion. lets close these off."* Four questions that had each been open for days or weeks. His word closed all four; the reasoning below each is mine, recorded so it can be argued with later.

| # | Ruling | What it amends |
|---|---|---|
| **A10** | **THE SEQUENCE CAP IS 7.** The 8-Jul lock said 10 (*"no it is 10. we know this"*). The 7 came from deliverability practice and has been the enforced number since 4 Aug; the 10 predates the **22-Jul managed-service pivot** (AR1) and was written for a product we no longer sell. **The #612 gate's HARD block IS the enforcement — there is no separate cap to build.** | ⛓️ chains **D14** · supersedes **#426** · the Vida editor now stops at 7 too, bound by test |
| **A11** | **THE 2 STRANDED PAID LEADS GET ENROLLED** — *"enrol — they were paid for."* Approved on Client Zero during the 5-Aug walk, charged, never enrolled, because #625's gate did not yet exist. ⚠️ **And the alert telling us to fix it named a control that did not exist** — both messages end *"enrol it from Vida"* and no operator enrol route was ever built (#626's defect, again). Now built (#631), through the **same `autoEnrollLead` machinery** as a real approval, charging nothing. | closes the register's open item · builds **#631** |
| **A12** | **#301 IS MOOT.** The Denise $39-vs-$99 conflict has been open since **3 Jul**, waiting on a price for a product that stopped having one when Denise stopped being sold (**AR1**, 22 Jul · **AR2**, 1 Aug). | ⛓️ closes **#301** — kept as history, not deleted |
| **A13** | **#630 goes 🩷** — the probe fix is live and verified on the founder's own System screen (`cron_claims.job` CHECKED-OK). | bookkeeping |


## 8 · ARCHITECTURE — *(new 6 Aug: this section did not exist)*

| # | Rule | The founder's words | Source | Enforced by |
|---|---|---|---|---|
| **AR1** | ⛓️ **The company trades as Milla&Vida — one engine, two portals.** K.I.N.D is the registered company. **FIGSY is the ENGINE** under it (no longer sold standalone), **Milla = the client portal**, **Vida = our operator console**. Neither is a subscription. ⛓️ *Supersedes the FIGSY-as-product model and the 9-Jul "sell FIGSY only" reset.* | *"we cant look cheap"* | founder-locked 22 Jul | nothing — words only |
| **AR2** | **Milla and Vida are CONSOLES; the intelligence belongs to FIGSY.** 14 agent-era brain items moved into THE BRAIN under THE ENGINE. | *"Milla and Vida are console chats… the brain, the tool we need to develop for FIGSY"* | 1 Aug · #606 | inventory structure |
| **AR3** | 🔒 **THE NEXUS LOCK — no cross-client learning, EVER.** What one client's data teaches may never reach another. #150 arrived scope-cut to per-client only; the cross-client half is dead unless he re-opens it. | none | standing, re-applied 1 Aug | `nexus-guard.assertSameClient` throws `NexusFenceError` |
| **AR4** | **Nexus auto-tune is DEFAULT-DENY, per client** — and even enabled, needs a confident profile (3+ booked meetings, 40+ worked leads). The website's five "gets sharper" claims were rewritten to what it does: **it remembers**. | gate's own words: *"auto-tune off for this client (default — founder must enable)"* | 1 Aug · #603 | `nexusTuneGate` · 11 tests bind site copy to the gate two-way |
| **AR5** | ⚠️ **Apollo is OURS. PDL + Hunter are the CLIENTS'.** The same mirror as Instantly/Smartlead. A 1-Aug audit tagged Apollo "retired" and he **overruled it** — rows relabelled **[OUR HUNTING]** so no future audit repeats the mistake. | none | locked 30 Jul, re-affirmed 1 Aug · #606 | `[OUR HUNTING]` labels · a guard pins the legal-page wording |
| **AR6** | ⛓️ **CHAINED — THE SCHEMA IS NO LONGER FROZEN.** ~~*30 Jul → 5 Aug: "never build anything that ends 'now press Run migrations' — declare it NOT-POSSIBLE before starting." The dashboard was unreachable, there was no Postgres password, and `DATABASE_URL` resolved to a host literally named `base`.*~~ → **6 Aug, RETIRED by A15:** the founder pasted Supabase's **session-pooler** string into Railway, redeployed, and **14 of 14 migrations applied** — verified live at `aws-0-eu-west-1.pooler.supabase.com:5432`. **Running a migration is now an ordinary founder step.** A build MAY now end in "run the migration", provided the migration is committed to **both** homes (`supabase/migrations/` + `pending-migrations.ts`), is `IF NOT EXISTS`-idempotent, and the PR says so. ⚠️ **What did NOT change:** `PENDING_MIGRATIONS` is still the only thing that executes — there is still no SQL editor, and no ad-hoc SQL path exists or should be built (O3 stands). | *(A15, 6 Aug)* | 30 Jul → **retired 6 Aug** | `PENDING_MIGRATIONS` · `migration-home.test.ts` · proven by 14/14 applied |
| **AR7** | **THE CORE MAP — work happens inside the core, and coverage is stated as % of it.** Fenced code is not in play: never deleted, never edited without a stated reason. | *"nothing gets deleted"* | founder-locked 26 Jul · #573 | `scripts/build-core-map.py` → `CORE-MAP.md` · `scripts/core-files.txt` |
| **AR8** | **Every PDL dollar is pre-funded by collected cash.** Sourcing spends only against an allowance accrued from money actually banked (k=2, accrued at the Stripe webhook only, never at spend). | none | founder-locked 10 Jul · #445 | `try_spend_sourcing` / `add_sourcing_allowance` · `money_settings` $300/mo cap |
| **AR9** | **The client revises their own ICP with NO gate** — it goes live immediately, but alerts us, because anyone already enrolled was picked against the old profile. | *"no gate on their own change"* | founder-locked 25 Jul · #536 | shipped |
| **AR10** | ⚖️ **Build the lead pool now, WITHOUT waiting for the PDL-licence legal review.** Risk accepted deliberately — **revisit at the first paid client.** | none | founder ruling 10 Jul · #449 | nothing legal — words only. Time-bound by decision |
| **AR11** | **Jack&Jill patterns: STEAL ONLY, do not build.** Logged as 7 red items + a STEALS CATALOG line. | none | 10 Jul | STEALS CATALOG in the inventory |

## 9 · MORE SENDING — the rules that were never on this page

| # | Rule | The founder's words | Source | Enforced by |
|---|---|---|---|---|
| **D8** | 🔒 **Option B: WE press send, through the mailbox the provider warmed.** He overruled my Option-A recommendation and was right — warming is a property of the **mailbox**, not of who presses send, and A would put a second brain in charge of *when* mail goes out. It also wins the client who says *"use my own Google Workspace"*. | (my wrong advice, recorded) *"A, because deliverability is reputation and theirs is warm"* | founder chose 26 Jul · #548 | `mailer.ts` (per-send transport) · `inbox-secret.ts` AES-256-GCM · **`INBOX_SECRET_KEY` unset = no send, by design** |
| **D9** | ⚠️ **NO CAMPAIGNS IN INSTANTLY. EVER.** It is a warm-up utility. A campaign there sends outside our engine, our approval gate, our opt-out list and our record. | none | 4 Aug | nothing — words only |
| **D10** | **Warm-up daily cap is 25, deliberately ABOVE Instantly's suggested 10.** A box warmed to 10/day has reputation for 10/day; the jump to ~30 real sends is the spike that flags a domain. | none | 4 Aug | recorded as *"the first number to revisit"* if deliverability disappoints |
| **D11** | **Instantly connects by OAuth, NOT App Password** — reversing my advice. App passwords are *"more prone to disconnects"*, and a silent disconnect stops warm-up without pausing it. App Passwords are what OUR engine uses; the two connections are independent. | Instantly's note: *"more prone to disconnects"* | 4 Aug | Instantly's client ID trusted at Google org level |
| **D12** | ⛓️ **The booking link LEAVES email 1 — Option A: the gate is right, the prompt was wrong.** The repo carried two live opposite instructions. **Step 3 keeps its link.** | *"the first email's job is to earn a reply, not a booking."* | ruled 5 Aug · #612B | both prompt sites changed **with the reason carried in the instruction**; the tests that pinned the old ruling were **rewritten, not silently flipped** |
| **D13** | **"Our sequence and outreach must be world class."** A copy gate before a warm box ever sends. HARD rules block **activation** (not saving); WARN never blocks; pausing is never gated; fails OPEN on a read error. | *"our sequence and outreach must be world class. shit emails out = zero meetings booked. for all clients"* | 4 Aug · #612 | `lib/sequence-quality.ts` · `sequenceGateFor` at all three activation routes · 75 tests |
| **D14** | ⛓️ **RULED 6 Aug — THE CAP IS 7.** ~~*8 Jul: "sequences cap at 10 email steps" — the founder's own words, "no it is 10. we know this", set when we sold FIGSY as a standalone product and the concern was per-lead work cost (~$0.06/step).*~~ → **6 Aug, founder-ruled: 7, and the #612 quality gate's HARD block IS the enforcement — there is no separate cap to build.** Two reasons recorded: the 7 came from deliverability practice (beyond a handful of touches it reads as harassment, and these are boxes we are warming to a permanent reputation), and the 10 predates the **22-Jul managed-service pivot** (AR1) — it was written for a product we no longer sell. **This closes the only live contradiction the 6-Aug register sweep found:** the locked number and the enforced number had disagreed since 4 Aug and nothing reconciled them. | founder, 6 Aug: *"all with your recomendfaion"* | 8 Jul → **ruled 6 Aug** · #426 superseded, #612 enforces | `MAX_STEPS = 7` in `sequence-quality.ts` · HARD-blocks activation · 75 tests |
| **D15** | **A reply belongs to the mailbox that received it.** An unknown inbox falls back to the fan-out; a **known** inbox with no matching lead **alerts** rather than falling back — falling back hands one client's mail to another. | none | 27 Jul · #551 | `smartlead-inbound` route test pins the two-clients-one-prospect case |
| **D16** | **Build reply/opt-out logic PROVIDER-AGNOSTIC**, in a shared spine — otherwise each provider grows its own copy of the same five bugs. | *"build them provider-agnostic"* | ~27 Jul · #589 | `lib/reply-pipeline.ts` · a test asserts the route DELEGATES rather than re-inlining |

## 10 · MORE SAFETY, PROCESS & OPERATIONS

| # | Rule | The founder's words | Source | Enforced by |
|---|---|---|---|---|
| **S7** | **PECR — never cold-email a UK sole trader.** A UK lead that cannot be **proven** corporate is refused. **Fails SAFE** (the opposite direction from the cold-check, deliberately): over-suppressing loses a prospect, under-suppressing is a legal breach. | *"Salted Foods"* (the failure case — must not pass on `ltd`) | 5 Aug · #617 | pure `lib/pecr.ts`, asked at **all three** enrol paths, every one **before the charge** |
| **S8** | **VAT + company registration captured at onboarding, for ALL clients.** "Not registered" is an **explicit recorded answer**, not a blank — an invented tax ID is worse than a blank. **It gates onboarding completion and NOTHING else.** | *"as part of onboarding we capture their company information… all clients."* | ruled 4 Aug · #615 | `NOT_REGISTERED` sentinel · **a test enforces that no approval, payment or send consults it** |
| **S9** | **Remove ALL speed and time-to-result promises. No "guarantee".** No replacement number until one is proven. | *"remove all — we have not proofed this, so how do we know"* | founder-locked 8 Jul · #411/#348 | website freeze manifest |
| **S10** | **No fake logos, quotes or numbers ship.** The whole social-proof system ships **hidden** until real data exists. Unbuilt features are labelled *"coming soon"* — **never deleted, never faked**. | none | 8 Jul / 28 Jun · #253/#405 | the hide itself |
| **S11** | **Honest-label beats fake capability.** Where the portal claimed what it could not do, he chose **labelling it honestly** over building it. | none — recorded as *"Founder chose honest-label"* | 6 Jul · #318 | diff-verified |
| **S12** | **Admin gets a real auth gate** — Supabase login + founder-email allowlist, on **both** the pages and the `/api/proxy` route. Admin had no auth at all. | none | 6 Jul · #308 | `ADMIN_ALLOWED_EMAILS` · `admin-proxy-only.test.ts` sweeps for direct `/operator/` fetches |
| **S13** | **The go-live seed wipe is FOUNDER-ONLY, and exclusion beats deletion.** Four protections checked in order — **real money outranks `is_demo`** — and MBF is kept deliberately: a literal wipe at go-live deletes the sales tool on the day it is most needed. | *"executed only on my go"* · *"when we flip over live we clean everything"* | 7/27 Jul · #329 | `SEED_WIPE_ARMED` = today's UTC date **plus** a typed phrase (`FOUNDER_FLIP=1` explicitly ruled insufficient — "fine for a reversible dot, this is not reversible") |
| **P13** | **Report, don't purge. Nothing gets actioned until I say go.** The 1-Aug audit read 579 rows and 90 docs, re-verified 31 claims against code, and **changed nothing**. | *"noting gets actioned until i say go and remove"* | 1 Aug · #602 | discipline only — it held |
| **P14** | **Don't report back unless it's green.** Fixes are proven, not claimed — red-proved against the old code first. | *"do not report back unless all are green"* · *"you claim stuff but it is never done"* | 26 Jul · #598/#580 | red-proof discipline in every row since |
| **P15** | **A change to a fenced file needs its reason stated OUT LOUD, before the change.** | *"before you change it the reason needs to be stated and you didnt do this. so stop."* | 27 Jul | nothing — words only |
| **P16** | **One method for every model.** The Fable/Opus split is retired; the discipline lives in CLAUDE.md for whoever runs. ⚠️ Includes: **the founder's screenshots are production evidence and outrank the gate.** | *"i am tired of working in fable. give opus the correct method for this in the future."* | 4 Aug | CLAUDE.md agent config |
| **P17** | **"I will not merge any open PR until I can measure the product."** BLOCK M's four instruments came first. **Discharged** — all four built and in daily use. | *"I will not merge any open PR until I can measure the product."* | 26 Jul | `/vida/system` (#576) — nothing green unless probed |
| **O9** | **31 Aug is the outside edge.** | *"on 31 aug if this is not all done i stop."* | founder-locked 26 Jul | nothing — words only |
| **O10** | **Selling is the founder's, and it stays OFF the board.** Not forgotten — deliberately absent. He uses his own prices. | *"leave the 20 messages out of this list all together. i know how to sell. i will use my own prices"* | 4 Aug | nothing — words only |
| **O11** | **IDLE TOOLS BILL NOTHING.** The cost register records **actual current spend**, and every $0 line carries the trigger that switches it back on — because *a $0 line with no trigger reads as "this tool is free."* | *"IDLE TOOLS BILL NOTHING"* | 30 Jul · #556 | 17 drift tests |
| **O12** | **Railway `@kind/api` runs 1 replica** — guarded by the billing tier, not by discipline. **Re-check the day Railway goes Pro.** | Railway's screen: *"Multi-region replicas are only available on the Pro plan."* | 4 Aug | the plan tier · recorded **with its own expiry** |
| **O13** | **DNS: EDIT the existing `_dmarc` record, never ADD a second.** GoDaddy pre-seeds one, and a domain publishing two has **NO DMARC at all**. Found only by counting rows rather than trusting the save. | none | 4 Aug | nothing — words only |
| **O14** | **The failover teardown is PARKED, founder-agreed** — $12/mo against a launch blocked on mailboxes, and step ⓐ risks dropping the portal mid-DNS-edit. Safe to park because #199 monitoring landed the same day. **DNS repoint FIRST, always.** | none | 3 Aug | a test asserts the three steps stay in DNS-first order |


## 11 · REPORTING — the standings report is a LOCKED FORMAT *(founder-locked 6 Aug)*

> **What earned this.** On 6 Aug the morning standings report had one shape and the evening one had another — sections renamed, tables missing their Owner and When columns, items dropped between reports. The founder: *"i need a full detailed breakwon. and here i am seeing 2 columns with no owner or timeline either. this is not good enough. and we working one way at one point and changing another. again. we have rules in place… i cant trust the docs at the moment. and i cant trust this source. so give me a way to work."* Then, on the proposed rules: **"lock this."** A report whose shape drifts is a report the founder has to re-learn how to read every time — which is the same defect as a doc that drifts.

| # | Rule | The founder's words | Source | Enforced by |
|---|---|---|---|---|
| **RPT1** | **One report shape, forever.** The standings report is ALWAYS the same template — numbered sections (✅ shipped & closed · 🔴 critical band · 🚶 walks owed · 🙋 rulings queue · 👁 watch · ⚪ open-not-blocking · 📅 dates · bottom line), and **every table ends in Owner · When. No exceptions, no redesigns.** A report missing either column is defective and the founder should reject it on sight. | *"lock this."* | 6 Aug | nothing — words only, so every model must re-read this section before writing a standings report (the citation law) |
| **RPT2** | **The report states what is on `main` versus what is waiting on the founder** — two board lines. Nothing pushed counts as done until his merge, and no report may lead with "merge this" ahead of the report itself. | *"im not merging anything"* (6 Aug, after a report led with a merge ask) | 6 Aug | nothing — words only |
| **RPT3** | **No item ever silently disappears between reports.** Anything in the previous report appears in the next — closed, moved, or still open — until the founder says drop it. | *"there is a lot more items sorry"* | 6 Aug | nothing — words only |
| **RPT4** | **The founder's saved prompt below IS the request** — when he pastes it, RPT1–RPT3 bind the answer, and every number in it is verified live (`git fetch` before any ref, `list_pull_requests` before naming any PR, counts run fresh) — nothing from memory, per the working method. | — | 6 Aug | this row is what the prompt cites |

**THE SAVED PROMPT (RPT4) — the founder pastes exactly this:**

```
FULL STANDINGS REPORT — locked format, register §11 (RPT1–RPT4, 6 Aug).
Sections 1–9, every table ends Owner · When. Two board lines: on main vs
awaiting my merge. Carry every item from the previous report — closed, moved,
or open. Verify everything live before writing: git fetch, real counts, PR
states via list_pull_requests. Nothing from memory. End with the bottom line
and my next steps.
```

## 12 · THE 6 AUGUST RULINGS — SECOND SESSION *(captured same-session, ritual 4b)*

> Ten decisions the founder made in one pass, going down the standings report line by line. Where he asked *"what is this?"* the row records the answer he was given as well as the ruling, because a ruling made on a misunderstanding is the thing that gets reversed later.

| # | Rule | The founder's words | Source | Enforced by |
|---|---|---|---|---|
| **R1** | **The free-10 entry offer is a SALES TOOL, not a product rule.** It is offered on the fly in a call or demo and **built only when a real client needs it** — never pre-built, never in code, never on the site. The **no-freebies lock (24 Jul) stands unchanged** in the product. ⛓️ Sits alongside **PR2** (discounts are founder discretion, by hand in Stripe), which already said the same thing about money. | *"I will do this if needed on a sales call or demo. this is on the fly. not a rule now. just when and how i need it."* · *"we may need to get the client up and running in the system with a discount. but we build what is needed when we get there yes."* | 6 Aug | nothing — words only |
| **R2** | **Stealth is NARROWED, not lifted.** A LinkedIn **company page** is allowed. **No personal announcement.** Outreach goes to friends personally — visible inside a trust circle, not to the market. ⛓️ Amends the 25-Jun stealth lock rather than replacing it. | *"dont worry about me stealth. i wont publicy announce on linkdein. i will create a linkdein company page. and also reach out personally to friends. this way i am stealth within a trust circle"* | 6 Aug | nothing — words only |
| **R3** | ⛓️ **AMENDED 6 Aug, SAME DAY — THE AUDIT FOUND IT WAS NOT FOUR PAGES AND NOT ONLY COPY.** ~~*As ruled: four live pages promise sequences the product refuses to run.*~~ **The truth, verified by grep across every app:** the claim sat in **six** places (`figsy.html:591` · `vida.html:370` · `pricing.html:400` · `:460` · `terms.html:330` · `apps/landing/index.html:395`), and the copy was the SYMPTOM. **Four different limits were live at once:** `sequence-quality.ts` blocked activation at **7**, `operator.ts` let an operator SAVE **10**, the Vida and client editors each hard-coded a bare **7**, and the client-facing Sequences page — linked in BOTH portal sidebars — capped at **3** and told the client *"(max 3)"*. A prospect could read 10, a client be shown 3, and the system enforce 7. **Fixed by giving the number ONE home** (`MAX_SEQUENCE_STEPS` in `@kind/shared`, which all four apps can read — it was in `apps/api`, which `apps/admin` cannot import from, and that gap is exactly why the copies existed). ⚠️ A comment in the Vida editor cited `sequence-cap-agreement.test.ts` as *"the only thing making the copy safe"* — **that file has never existed.** A safety net asserted in a comment and never built. *(Original ruling below, kept per the chain rule.)* **THE SITE'S "up to 10 steps" IS A FALSE CLAIM AND IS COMMANDED FIXED.** Four live pages promise sequences the product refuses to run — `figsy.html:591`, `pricing.html:400` and `:460`, `terms.html:330` — while `MAX_STEPS = 7` hard-blocks activation. The Terms one is inside a POPIA legitimate-interest paragraph, so it is a legal sentence, not marketing copy. **The P12 website freeze is overridden for this change only.** | *"fix"* · *"A3 fix"* | 6 Aug · #612/#426 | `sequence-quality.ts` `MAX_STEPS = 7`; the site copy needs a test binding it to that constant |
| **R4** | ⛓️ **RULEBOOK §11 (preview-before-live) IS OVERRIDDEN FOR R3 ONLY.** The site fix **ships without a `staging` preview**, because it DELETES an overclaim rather than adding design, and the founder had already commanded it. **The rule itself is untouched** — every other client-facing change still previews first. Recorded because a silent exception is how a rule dies. | *"b"* (choosing override over refreshing staging) | 6 Aug | RULEBOOK §11 stands for everything else |
| **R5** | **Kevin is UNCERTAIN — not committed, not rejected.** No agreement, no access, no counsel spend until the founder decides. **The post-launch GitHub operating-model fix is ESSENTIAL and unchanged** — it does not depend on Kevin. ⛓️ Reinforces A1 (nothing changes before live) and A2 (company GitHub is the first post-live project). | *"I am unsure i am going to use Kevin."* · *"not sure about friends and business."* · *"post launch day we fix everything in github… this is essential. but nothing changes."* | 6 Aug | nothing — words only |
| **R6** | **IDs #632–#636 ARE RESERVED AND MUST NOT BE RE-USED** — #632 marketing playbook · #633 owner's manual · #634 IP pack · #635 hiring map · #636 the site 10-steps fix. **They are NOT minted as inventory rows yet**, on the founder's hold. ⚠️ **#636's subject is now R3**, so if it is ever minted it must not duplicate that work. | *"A5 make sure this is logged though"* | 6 Aug | this row is the reservation — `count-inventory` would not otherwise know |
| **R7** | **A9 (the money walk) and A19 (the till walk) are re-dated to "WHEN FUNDS ALLOW", not "before 18 Aug".** Both require real money to move and the founder has none to spend on a test. Neither is a discipline problem and neither may be reported as slipping. ⛓️ Consistent with **PR8** (no real-money $299 walkthrough). | *"when i get paid"* | 6 Aug | nothing — words only |
| **R8** | **🩷 IS A CRITICAL STATE, NOT A BACKLOG STATE — and A11 moves to the CRITICAL band.** 281 items are live in production that no human has ever walked. **ALL 281 get walked, in sessions, RANKED most-critical first** — money and send path before the rest — and all are treated as vital. Every defect found on 6 Aug (#599, #637–#641, and A18's blocker) was a 🩷 that turned out to be broken. | *"this is essential. all pink items must be in critical. because if they pink and never walked to green before a client comes its unsure it holds."* · *"customer facing we screwed"* · *"all 281. but we do it in sessions. rank most critical first then to least. critical. but all are vital yes."* | 6 Aug | LAUNCH-PAD §4; 🟢 stays founder-only (`FOUNDER_FLIP=1`) |
| **R9** | **The M&V brand hierarchy on the site is KILLED** — not parked, not deferred. Cosmetic, adds nothing pre-revenue, and carrying it on a list forever is worse than deleting it. *(The M&V logo lock of 24 Jul is untouched — this kills only the proposed "K.I.N.D, an M&V company" site hierarchy.)* | *"kill it"* | 6 Aug | deleted — nothing to enforce |
| **R10** | **#426 IS SUPERSEDED AND LEAVES THE 🔴 COUNT.** It asked for a **10**-step cap; the founder ruled **7**, and 7 is enforced. An item answered by a different answer than it asked is done — leaving it 🔴 overstates what is unbuilt. Kept as a tombstone, never deleted. | *"correct"* | 6 Aug · #612 | `count-inventory.sh` / the board mirror |
| **R11** | **ALL DOCS MUST BE CURRENT — the ~70 false claims are fixed NOW, not after launch.** They do not touch the site, so nothing gates them. Examples: `CORE-MAP.md:167` still says *"THE $99 ONBOARDING PACK"* (it has been $299 since 3 Aug); `ENVIRONMENT.md:122` prices Milla at $49/mo, a product that is not sold. | *"all docs need to be up to date. they dont hinder site so fix now."* | 6 Aug | `doc-lint.sh` checks counts and copies, **never whether a sentence is true** — this needs human reading |

### 12b · What the founder's own screenshot settled *(Instantly, 6 Aug)*

| # | Rule | Source | Enforced by |
|---|---|---|---|
| **R12** | ✅ **"Unlimited email warmup" IS included on Instantly GROWTH — vendor-confirmed, not our note.** The founder's screenshot of Instantly's own comparison table ticks it under Growth. **The ~25 Aug warm-up ladder maths holds and Growth was the correct purchase.** The same table shows **API / webhooks / integrations are HyperGrowth-only**, which is independent vendor proof of the 30-Jul #577 amendment: #549 is genuinely tier-blocked, and it does not matter because we send through our own SMTP (Option B, 26 Jul). Unibox and the global block list are also HyperGrowth-only; we built our own of both. | founder screenshot, 6 Aug | the ladder itself |
| **R13** | ⚠️ **TWO GROWTH CAPS ARE NOW KNOWN, AND WHETHER THEY BIND US IS NOT.** The same screenshot shows Growth at **5,000 emails/month** and **1,000 uploaded contacts**. Because we send by our own SMTP and only warm through Instantly, these most likely meter Instantly's own campaigns and warm-up traffic rather than our sends — **"most likely" is a guess and is recorded as one.** 4 mailboxes × 30/day × 30 days ≈ 3,600 sits under 5,000 but not by much, and it is a platform-wide number as clients are added. **Confirm on send-day before scaling mailbox count.** *(This is written as uncertain on purpose: a confident guess about an Instantly tier is exactly what produced the #549 error.)* | founder screenshot, 6 Aug | nothing — a question for send-day |

---

## 13 · THE 11 AUGUST RULINGS *(captured same-session, ritual 4b)*

> Six rulings, five of them about **who we hire and when** — the first decisions on this page that are about the company rather than the product. Recorded verbatim because a hiring plan remembered from a chat transcript is a hiring plan that gets contradicted.

| # | Rule | The founder's words | Source | Enforced by |
|---|---|---|---|---|
| **R14** | **THE AIRMAIL MAILBOXES ARE OUT OF SCOPE — stop reconciling them.** Instantly shows 9 boxes; **only the 4 Google ladder boxes matter** (`jacques@` + `hello@` on `kindoutreach.com` and `trykind.org`). The 5 AirMail boxes are not part of the warm-up clock, not part of the ladder maths, and are never picked for a send. ⛓️ Supersedes the reconciliation work in **A16/§7 A6**: that row asked *which* domains the AirMail set sits on, and the answer is **no longer a question anyone needs to answer.** ⚠️ The standing safety fact is unchanged and is the only part that survives: **a box you did not mean to warm must never send.** Our send path reads `client_inboxes` and requires `smtp_host && smtp_user && smtp_pass_enc` (`sending-inbox.ts:63`), which AirMail boxes do not expose — so they **cannot** be picked, by construction. | *"ignore airmail. not relevant"* | 11 Aug | `sending-inbox.ts:63` — the SMTP requirement makes it structural, not a policy |
| **R15** | **THE VA HIRE TRIGGER IS 4 CLIENTS AND 400 ACCEPTED LEADS A MONTH — and the second half is a CONCENTRATION rule, not a volume rule.** The founder rejected a pure lead-count trigger himself: the same 400 leads sitting inside one client is not a hire signal, it is a single point of failure. **The test is: lose any one client and the VA is still covered.** First role is **customer success**. | *"so simple. 376 accepted leads. but risky because if all 367 leads are in 1 client and client stops i loose money so no."* · *"when can i hire a VA. real maths"* | 11 Aug | nothing — words only; LAUNCH-PAD hiring card states it |
| **R16** | **FOUR AREAS GET HIRED. EVERYTHING ELSE IS OUTSOURCED OR AN AI AGENT.** The four: **Account Executives · Customer Success · Engineering · Marketing.** Finance, legal, HR, admin and ops support are **outsourced or run by AI agents** — they are never headcount. ⛓️ This is why the roles table on the operating-rhythm artifact splits hats into *hired* and *held*. | *"on the hiring. 4 areas i would hire. Account Executives... Customer success... and a engineering person. lastly marketing. the rest we outsource. VA and or get AI Agents"* | 11 Aug | nothing — words only |
| **R17** | **THE TARGET ORG IS 13 HIRES, AND LEAD ROLES COME LAST.** 4 Account Executives · 4 Customer Success managers · 2 Vida Operators · 2 Engineers · 1 Marketing. **The founder holds CEO, CFO, CMO, COO and Sales Manager himself.** ⚠️ **No lead/manager role is hired until the business is stable** — the founder's own condition, and the thing that stops this becoming an org chart that hires managers before it has anyone to manage. *(Agent recommendation the founder accepted in full: hand the COO hat over first, at roughly person 7.)* | *"the goal is to have 4 Account Executives. 4 Customer Success managers. 2 Vida Operators. 2 Engineers. 1 Marketing. I am the CEO< - CFO AND CMO. and COO. plus the Sales manager. we only hire lead roles when i know we are stable."* · *"i go with your recomendations on all."* | 11 Aug | nothing — words only |
| **R18** | **HIRING GOES IN CRITICAL STAGES — never a SaaS peak-and-cut.** Past 45–50 clients and still growing, hire to match, but **deliberately under-hire rather than over-hire.** The founder named the failure mode himself and it is the rule: a company that hires ahead of proven load is a company that lets people go. **Capacity-led, pod-shaped, one stage at a time.** | *"again if we get to more than 45 - 50 cleitns and growing is a good problem we hire according. but i dont want to peak to much and be a typical SaaS company that hires and lets go. we do this is proper critical stages"* | 11 Aug | nothing — words only |
| **R19** | **DEPTH BEATS BREADTH — this is the operating principle, not a growth preference.** Ten clients accepting 200 leads beats a hundred accepting 20. Identical revenue ($8,000/mo at $4/lead), **one tenth the operational load**, and ten relationships that can actually be known. ⚠️ The arithmetic that makes it binding: at 20 accepted a client sits **at the #538 minimum** — that gate is their floor, not their habit — and most drift to the 30-day cold-check and suspend. **One client at 200 covers the entire cost floor ($634 contribution vs $468 — ⛓️ *the phrase "once-live floor" is RETIRED 12 Aug: $468 is the lab's fixed boxes with Smartlead+Hunter typed in, not a floor; the founder was thrown by the word twice and the lab's four-box view is the format of record*); three clients at the 20-lead minimum do not even gross it ($240 vs $352).** ⛓️ This is what makes **customer success** the expansion engine rather than a support function, and it is why R15's hire trigger is client-count-and-depth rather than client-count alone. | *"10 clients accepting 200 leads is better than 100 clients accepting 20 leads"* · *"Vida operator is honestly a lot more than what you stared. because the more Milla accepts the more we work. thats the model here. Milla working is Vida working."* | 11 Aug | `MIN_BATCH_APPROVALS = 20` (`apps/api/src/lib/approval-batch.ts`) + `COLD_DAYS = 30` (`apps/api/src/lib/cold-client.ts`) are the gates the arithmetic rests on *(corrected same day: first written as "in `@kind/shared`" — a location asserted from memory, which is the exact failure the working method forbids)* |

| **R20** | ⛓️ **R2 IS RE-AFFIRMED, NOT LIFTED — and the marketing system ships with its public half switched OFF.** Asked directly whether to lift stealth for founder-led marketing, the founder chose **warm first**: LinkedIn **company** page yes, personal posting no, paid ads no. **The reasoning is recorded because it is the useful part, and it is not "stealth beats growth":** warm outreach is the only channel that can produce a paying client inside 20 days, it costs **$0**, it needs **no ruling from anyone** — and **a warm contact who hits a broken button tells you, where a stranger closes the tab.** With **281 items live and unwalked**, arriving strangers are a risk and not a win. **~80% of the marketing system runs with R1, R2 and R7 all fully in force.** ⚠️ **The gate reopens on a CONDITION, not a date:** client #1 exists **and** A11's money journeys are walked. ⚠️ **This also settles the founder's own M&V playbook against the register** — its section 06 makes the free-10 the public entry offer *"everywhere"*, which **R1 forbids**; the public magnet is therefore the **newsletter**, and the free-10 stays what R1 says it is: offered by the founder, in a reply or a call, to a named person. | *"Keep R2 — warm first"* (11 Aug, choosing it over "lift R2 — go public now" and a 1-Sept delay) · original: *"i wont publicy announce on linkdein"* | 11 Aug · #632 | nothing — words only; the gated sections of `docs/marketing/` are written and marked 🔒 |

---

## 14 · THE 12 AUGUST RULINGS — the Cowork marketing bundle reconciled *(captured same-session, ritual 4b)*

> The founder ran a parallel marketing build in another chat weeks earlier and brought the bundle home. It was verified against this register — the other chat had never read it — and four collisions went to the founder. His answers, verbatim.

| # | Rule | The founder's words | Source | Enforced by |
|---|---|---|---|---|
| **R21** | **R1 STANDS — the free-10 is discretionary, personal, and stays OFF the site.** The bundle's public free-10 landing page does not go live as designed; the free offer remains something the founder deploys by hand when luring a specific person. ⚠️ The landing page itself is KEPT (parked in the repo as source material) — the design is good; only the public offer is vetoed. | *"the free offer is my call when i need it. dont change anthing. i am trying to lure people in is all. an attempty"* | 12 Aug | R1 + the `doc-lint` banned-claims list ("no card required" is on it) |
| **R22** | ⛓️ **CORRECTED SAME DAY — I read the founder's ruling upside down, and the LIVE SITE proved it.** My first write-up of *"M&V is the brand under KIND"* concluded *"K.I.N.D leads all public copy"*. **Wrong.** The founder: *"our website … is M&V. the logo and everything is this … the[y] are registered as KIND Technologies but trade as Milla and Vida."* Verified against the frozen site itself: the masthead is `logo-mv-v2.png`, alt **"M&V"**; "Milla & Vida" appears throughout; K.I.N.D appears as the company (*"About K.I.N.D"*). **THE RULING AS IT ACTUALLY IS: M&V (= Milla & Vida) is the TRADING BRAND — the name and logo the public sees. K.I.N.D Technologies is the REGISTERED COMPANY behind it.** "Under KIND" = a trading name under the registered entity, not K.I.N.D on the masthead. **So the Cowork bundle's M&V-led copy was RIGHT all along**, and R9 is untouched by any of this — it killed only the proposed *"K.I.N.D, an M&V company"* PARENT-company framing, never the M&V trading mark (whose 24-Jul logo lock stands). ~~*(First write-up, kept per the chain rule: M&V sits under K.I.N.D; K.I.N.D leads all public copy; all bundle copy gets re-led with K.I.N.D before use.)*~~ | *"M&V is the brand under KIND."* + the correction quoted above | 12 Aug, corrected same day | the site masthead itself (P12-frozen) — the logo IS the ruling |
| **R23** | **THE LAUNCH ICP IS GLOBAL** — US/UK primary, agencies & consultancies ~5–30 staff, referral-dependent. Supersedes the UK-only table in `MARKETING-PLAN.md` §1 (now corrected) and aligns with the 25-Jun two-track GTM ruling and the founder's own *"no we go international."* | *"Global"* | 12 Aug | MARKETING-PLAN §1 (corrected this session) |
| **R24** | **PAID ADS AND THE ACTRESS ARE PARKED UNTIL REVENUE — R7 stands.** The bundle's ~£400/mo plan and on-camera actress wait for the existing gates (client #1+, floor covered, message proven). The plan's detail is merged into the GATED `paid-ads-phase-plan.md` so nothing is lost and nothing is spent. | chose *"Park both until revenue"* | 12 Aug | R7 · the gates in `paid-ads-phase-plan.md` |

---

## Open — the founder has not ruled on these

Written down rather than assumed, per P9.

- ~~**Paystack**~~ — **RULED 27 Jul: *"I confirm: yes, remove."*** Removed (#352). It charged in **ZAR at a hardcoded rate of 19**, its cooldown counted rows and then charged (a real double charge), it could never succeed (needed an auth code #325 made unobtainable), and nothing received the result. The client's saved `auto_topup_*` preferences and all billing history were **kept** — the removal was the charge path only.
- ~~**C5 — seat removal: delete or deactivate?**~~ — **RULED 6 Aug: deactivate only, permanently.** See §7 A5.
- ~~**D4 — refresh `staging`, or keep previewing from branches?**~~ — **RULED 6 Aug: refresh.** `staging` was 131 commits behind and is now level with `main`.
- **The three security holes in disabled agent routes** — #359, #369, #360. Delete, or keep disabled?
- **#549 — the dogfooding item.** Its original form (push our leads into an Instantly campaign by API) was superseded by the 30-Jul amendment, not blocked. Retire it, or pay for HyperGrowth to dogfood? *Agent recommendation: retire after launch, keep the code parked as the revival path.* ⚠️ **Retiring the ITEM never means retiring Instantly** — see D1.
- **Does VAT evidence gate anything BEYOND onboarding?** (#615) — deliberately not taken in code.
- **Is 50 the right lead-desk window, or should the panel page?** (#570) — *"a founder call, not code"*, and the only thing keeping that row 🟡.
- **The share-link generator** (#560) — retiring it would break links clients have already sent.
- **A paid PDL plan** (#444) — *"founder money call, pending."*
- **Instantly Growth mailbox cap — UNVERIFIED.** "Unlimited warmup" is our own 26-Jul research note, not a vendor confirmation. If Growth caps warmed mailboxes, that cap is the client ceiling and nothing in the product would warn us. One founder glance before client #1.
- **Where this page lives.** It is a *product* rules page, so it does not clash with the four-doc status contract — but the founder may want it merged into `RULEBOOK.md` instead of standing alone.

---

*Approved by the founder 26 Jul ("its good. i agree"). §5a added the same day, after Prompt 4 was reported complete while nothing called it. Updated 27 Jul at the end of Prompts 5–7: O2 corrected (CI has never run), O6–O8 added, D2 marked unproven, D6–D7 added, and the Paystack question ruled and closed.*
