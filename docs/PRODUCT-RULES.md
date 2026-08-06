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

---

## Open — the founder has not ruled on these

Written down rather than assumed, per P9.

- ~~**Paystack**~~ — **RULED 27 Jul: *"I confirm: yes, remove."*** Removed (#352). It charged in **ZAR at a hardcoded rate of 19**, its cooldown counted rows and then charged (a real double charge), it could never succeed (needed an auth code #325 made unobtainable), and nothing received the result. The client's saved `auto_topup_*` preferences and all billing history were **kept** — the removal was the charge path only.
- **The three security holes in disabled agent routes** — #359, #369, #360. Delete, or keep disabled?
- **Where this page lives.** It is a *product* rules page, so it does not clash with the four-doc status contract — but the founder may want it merged into `RULEBOOK.md` instead of standing alone.

---

*Approved by the founder 26 Jul ("its good. i agree"). §5a added the same day, after Prompt 4 was reported complete while nothing called it. Updated 27 Jul at the end of Prompts 5–7: O2 corrected (CI has never run), O6–O8 added, D2 marked unproven, D6–D7 added, and the Paystack question ruled and closed.*
