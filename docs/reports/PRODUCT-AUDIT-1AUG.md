# 🔍 PRODUCT AUDIT — 1 Aug 2026

> **THIS IS A REPORT, NOT A PURGE.** Nothing in the inventory was removed, re-scoped, archived or re-dotted by this audit. Every finding below that needs a judgement call is written as a **question for the founder**, with the evidence that raised it. The founder rules; a later PR logs the ruling.
>
> **ARTIFACT** — dated one-off, frozen. Read it as the state of the docs on 1 Aug 2026, not as current.

---

## What was actually checked

| | |
|---|---|
| Inventory rows parsed | **579** (matches the script-counted board exactly — both table formats) |
| Docs on disk walked | 90 `.md` / `.html` under `docs/` |
| Claims verified against code | 31 — each finding below cites the file and line that settles it |
| Items flagged for a founder decision | **57**, in 5 groups |
| Items fixed in this PR | **0 inventory items.** 3 doc facts, each with a citation (see the last section) |

Every number here was produced by running a command, not by recalling a previous session.

---

# ⛔ GROUP D — items whose premise the founder has already replaced

These are the ones the founder asked about: *products logged in inventory that don't make sense.* None of them is wrong about the code — they are all **correct records of a decision that a later decision superseded**. The inventory never caught up, so the two locks now sit in the same document contradicting each other.

## D1 · The #420 family — the per-qualified-lead ladder (10 items)

**#420 · #421 · #422 · #423 · #424 · #425 · #427 · #428 · #429** — all 🔴 — plus **#430** (🩷, already shipped).

**What they say.** #420 is founder-locked **8 Jul**: a price ladder of **$1 reveal → +$3 FIGSY = $4 → +$1 Milla = $5 → +$1 Denise = $6**, built on **TWO wallets** (`credit_balance` for reveals, `figsy_credits` for work). #421–#425 are the machinery to build it (a `try_charge_reveal_credit` RPC, reveal gating, sourcing quotas, charge-once-per-lead, a trial credit mix). #427/#428/#429 are the +$1 layers and the $3 Vida inbound engine.

**Why it no longer holds.** The founder replaced this **16 days later**:

- `packages/shared/src/constants/index.ts:161–184` — *"Founder-locked 24–25 Jul (**ONE WALLET**): the first purchase is **$99 = the onboarding pack with 100 approved leads included**, then a flat **$4 per approved lead**."* `PACK_LEADS = 100` · `PACK_PRICE_USD = 99` · `LEAD_PRICE_USD = 4`.
- `docs/run-costs-and-cashflow.md` §1 says it outright: *"This section was stale until 25 Jul — it still described the **retired two-wallet model** ($1 reveal into `credit_balance` + $3 work into `figsy_credits_remaining`). That was **superseded by #492 ONE WALLET on 24 Jul**."*

So the pricing constants and the money doc both record the supersession. **Only the inventory still carries the old ladder as live 🔴 work** — and it carries it as **M0 CRITICAL**, which is the highest priority label in the document.

> **The consequence, stated plainly:** an agent reading the inventory top-down today is told the single most critical thing to build is a two-wallet reveal-charge system that the founder retired in July.

**Not everything in the family falls with it — two survive on their own merits:**

- **#426** (cap sequences at 10 email steps) — a cost control that is true under any price model. **Keep.**
- **#431** (retire the agent-subscription billing machinery) — the *reason* changed but the work didn't: `constants/index.ts:90–94` confirms the Stripe subscription path is still live end-to-end (*"a live Price ID in the Stripe dashboard could still take a payment for a product we do not sell"*). **Keep, and arguably promote.**

**🟣 FOUNDER DECISION — D1.** For #420 · #421 · #422 · #423 · #424 · #425 · #427 · #428 · #429:

**(a) Tombstone them** — leave every row exactly where it is, prepend one line: *"SUPERSEDED 24 Jul by ONE WALLET ($99 pack + $4/approved) — kept as the record of the 8 Jul decision, not as work."* Nothing deleted, CORE-MAP rule 3 respected, and the history of *why* we priced this way survives.
**(b) Re-scope them** to the current model — but most of them (reveal RPC, two-wallet gating, trial credit mix) have **no equivalent** under one wallet, so this would be inventing new work under old numbers.
**(c) Leave as-is.**

*My read: (a).* The ladder is genuinely valuable as history — it is where the $4 came from — but it must stop presenting itself as the top of the build queue.

---

## D2 · The 16 "OUT OF PLAY — FIGSY + Lead-Gen only" items

**#26 · #56 · #62 · #63 · #73 · #81 · #96 · #113a · #125 · #188 · #229 · #248** (12 still citing the lock) — all 🔴.
*(#2 · #3 · #4 · #58 also carry the phrase; the 21 Jul audit already retired the lock on #2/#3/#4.)*

**What they say.** Each row's reason is the same sentence: *"**OUT OF PLAY** (FIGSY + Lead-Gen only, locked 8 Jul; code parked M4; portal disable #406)."*

**Why it no longer holds — the lock is dead twice over:**

1. **"Lead-Gen" no longer exists.** #283 (🩷): *"Website $1 Lead-Gen retirement → single $3 FIGSY — LIVE."* #284 (🩷): *"Lead-Gen retired in the product (#911)."*
2. **"FIGSY-only" no longer describes the product.** The pivot founder-locked **22 Jul** (`docs/PRODUCT-INVENTORY.md:33`) says FIGSY is **"No longer sold as a product — it powers the two portals."** The thing we sell is Milla&Vida.

So twelve rows are parked against a boundary drawn between two things that have both since been retired. Several of them were **demoted from 🟢/🩷 to 🔴 by that lock** — #62 was 🟢, #63/#188/#58 were 🩷 — meaning working, shipped code is currently recorded as *not built* on the strength of a rule that no longer applies.

> **This is the one I would flag hardest.** A 🔴 that means "not built" and a 🔴 that means "built, but we decided not to sell it" are different facts, and the ladder has no dot for the second. Twelve rows are currently telling us we have less than we have.

**🟣 FOUNDER DECISION — D2.** Three shapes:

**(a)** Restore the dots these items *actually* earned (🟢/🩷/🟡 per their parenthetical history) and add one line saying **not sold** — status describes the code, sale status is a separate sentence.
**(b)** Introduce a **⚪ BUILT · NOT SOLD** state on the ladder. Cleanest conceptually, but it is a 7th dot and every script, board and header that counts dots has to learn it.
**(c)** Leave at 🔴 and just refresh the reason to cite the 22 Jul pivot instead of the dead 8 Jul lock.

*My read: (a).* It costs nothing, needs no new tooling, and it stops the inventory understating what exists. (b) is correct but expensive — the dot ladder is load-bearing in four scripts.

---

## D3 · The trial machinery — and it is **live in production right now**

**#176** (14-day company trial) · **#270** (trial signup → pooled inbox) · **#271** (payment → branded inbox) · **#425** (trial credit mix) — all 🔴. **#353** (🩷, trial-expiry spam) and **#331** (🩷, free-trial drip) record fixes *to* the trial path.

**Why it doesn't fit.** There is no trial in the money model. `constants/index.ts:161` — the first purchase **is** the $99 pack; `run-costs-and-cashflow.md` §1: *"Nothing sources or sends until it lands."*

**But this is not only a doc problem — the code still runs trials daily:**

| Evidence | What it does |
|---|---|
| `apps/api/src/routes/auth.ts:191` | every signup writes a `subscriptions` row with `status: 'trialing'` |
| `apps/api/src/cron.ts:281` | `cron.schedule('0 6 * * *', … '/ae/nurture')` — daily |
| `apps/api/src/cron.ts:290` | `cron.schedule('0 7 * * *', … '/ae/trial-expiry')` — daily |
| `apps/api/src/routes/status.ts:50` | the live status screen counts `status = 'trialing'` clients |

So a signup today still becomes a trialing client, and two crons still act on that every morning, under a model where the only way in is to pay $99.

**🟣 FOUNDER DECISION — D3.** Two separate calls, and they should not be merged:

**(a) The doc call** — tombstone #176/#270/#271/#425 as superseded by the $99 pack, same treatment as D1.
**(b) The code call** — this one is not a doc question. **Is `trialing` still a real state we intend to have?** If yes, the money model needs to say so. If no, it is a live signup path that grants access without payment, and it deserves its own inventory item at 🔴 rather than being cleaned up quietly inside a doc audit.

*My read: (a) yes; (b) needs your answer before anyone touches it — I did not raise the item, because inventing an item is exactly what "nothing gets actioned until I say go" rules out.*

---

## D4 · The Apollo items (4)

**#103** (⏸ · Apollo data-reseller, ~$7.5k/yr, "under evaluation") · **#242** (🔴 · EPIC — Apollo Outbound OS → FIGSY) · **#247** (🔴 · real lead signals *from Apollo*) · **#450** (🔴 · Apollo free-key discovery supplement).

**Why they don't fit.** #6 was reworded 8 Jul to: *"**PDL primary (keys set) + Hunter email-reveal**; Apollo is an optional BYO-key code path (**no key = not used**)."* #243 (🩷) records Apollo-independence shipping 1 Jul. #481 confirms the one job still calling Apollo *"calls dead Apollo code (no key → throws, **zero spend today**)."*

So a **$7.5k/yr purchase decision** sits at ⏸ "under evaluation" against a vendor the product deliberately made itself independent of a month ago.

**🟣 FOUNDER DECISION — D4.** Is Apollo a **closed** question or a **parked** one? If closed, these four tombstone. If parked (the reseller deal could still make sense at volume), #103 stays ⏸ and the other three tombstone as superseded by PDL+Hunter.

---

## D5 · Agent-era products with no home in Milla&Vida (6)

**#144** (DENISE deep build — auto-book · notetaker · objections · voice) · **#145** (LENA CS agent · TONY ops agent) · **#149** (proposal e-sign · Zoom notetaker) · **#81** (AI Notetaker) · **#125** ("Your AI Family" agents hub, 4 agents + unlock) · **#113a** (5-agent conversational side-panel).

These are products of the **five-agent era**. The 22 Jul map (`PRODUCT-INVENTORY.md:33–37`) has four homes: FIGSY (engine) · VIDA (operator) · MILLA (client) · NEXUS (per-client brain). Denise and Tony are recorded as **absorbing into Milla**; Lena has no home at all in the new map, and #145 is the only row that still asserts her as a product.

**🟣 FOUNDER DECISION — D5.** For each: **fold into Milla** (Denise/Tony work, per the 21 Jul absorption), **tombstone** (Lena, the agents hub, the 5-agent panel — the new map has no place for them), or **keep as future** (the notetaker and e-sign are real features that could land under Milla without the agent framing).

---

# 🔁 GROUP C — two items for one problem

## C1 · #230 and #404 are the same defect

- **#230** 🔴 — *"lena.ts dead code — mount (under 145) or delete"*
- **#404** 🔴 — *"AR-67 MED · Lena agent is dead code — `routes/lena.ts` is a real Anthropic chat but is never imported/mounted in `index.ts` → every call 404s."*

**Verified:** `apps/api/src/routes/lena.ts` exists; `grep "lena" apps/api/src/index.ts` returns **zero** matches. Both rows are true, and they are one problem. #404 is the better-written of the two (it also names the missing #321 rate limiter).

**🟣 FOUNDER DECISION — C1.** Merge into #404 and tombstone #230 pointing at it. *(Note this is downstream of D5 — if Lena is tombstoned as a product, the right resolution to both is "delete the route", not "mount it".)*

## C2 · #237 asks for work that is already done

**#237** 🔴 — *"C3 — Paystack: KILL → Stripe-only (… founder to confirm Paystack deletion — also closes the #325 /verify gap + the legacy auto-topup charge path)"*

**Verified — the deletion happened:**

| Check | Result |
|---|---|
| `grep -rn "charge_authorization" apps/api/src` | only in `paystack-removed.test.ts` (a test **asserting its absence**) and one explanatory comment at `reply-pipeline.ts:297` |
| `grep -n "paystack" apps/api/src/index.ts` | one comment at `:97` — *"the `/webhooks/paystack` raw-body mount was removed"* |
| `apps/api/src/routes/flutterwave.ts` | does not exist |

The four items that *did* the work — #352 · #334 · #325 · #315 — are all correctly 🩷. #237 is the parent asking for it, still 🔴.

**🟣 FOUNDER DECISION — C2.** Flip #237 to 🩷 citing the test that enforces it, or tombstone it as absorbed by #352. *(I did not flip it — the prompt forbids re-dotting on my own judgement, and this is a dot change.)*

## C3 · #211 kept 🔴 beside its own children

**#211** 🔴 — its own text says *"**Broken into buildable parts → #547–#553** (THE SENDING SPINE section above)."* A parent that has been decomposed and still counts as an open 🔴 double-counts the sending spine in the board totals.

**🟣 FOUNDER DECISION — C3.** Convert #211 to a header/epic that does not carry a dot, or leave it as the roll-up. This is a counting question, not a work question — but the board is script-derived, so whichever way it goes, it should go deliberately.

---

# 🕰 GROUP B — stale premise (the item is factually wrong about today's code)

## B1 · #397 is wrong, and the code it calls dead is in the live reply path

**#397** 🔴 — *"AR-51 LOW · HubSpot dead code — platform signup/payment sync functions written but **never called** (`lib/hubspot.ts`). Wire or delete."*

**This is false.** `lib/hubspot.ts` is imported twice, in live code:

```
apps/api/src/lib/reply-pipeline.ts:34   import { syncFigsyInterestedToHubspot } from './hubspot'
apps/api/src/routes/internal.ts:24      import { getHubspotPipelineView } from '../lib/hubspot'
```

`reply-pipeline.ts` is the spine every provider's replies flow through (#589). So the item invites someone to **delete a module that runs when a prospect replies.**

> This is the most dangerous single row in the audit — not because it is high priority (it is marked LOW), but because it is a *"wire or delete"* instruction pointing at live code, and the delete branch is the cheap one.

**🟣 FOUNDER DECISION — B1.** Rewrite #397's premise to what is actually true — *"two of `lib/hubspot.ts`'s exports are live (reply-pipeline, internal); the platform signup/payment sync functions are the unused ones — name them or close the item"* — or close it. **Either way the words "never called" must come off that row.** I did not edit it, because changing an item's premise is a re-scope.

## B2 · #561 still says "69 variables"; the real count is 100

**#561** 🟡 — *"[INFRA] The environment is undocumented — **69 variables**…"*

Superseded by its own delivery: `docs/ENVIRONMENT.md` documents **100**. The 69 undercount had two causes, both now fixed and both recorded in `apps/api/src/lib/env-inventory.ts` — 12 variables reached by indirection, and 4 hidden by a comment-stripper that lost track inside a regex literal and a nested template literal.

**🟣 FOUNDER DECISION — B2.** Update the number in the row (it is the item's own delivered result, so this is arguably a fix, not a re-scope — but it is still an edit to an item, so I left it).

## B3 · #560's repo-size denominator is one of three different figures

**#560** 🟡 says *"~6,000 of **90,458** lines have been read end-to-end (≈6%)"*. `CORE-MAP.md:16` says the repo total is **121,854**. Recounted today by CORE-MAP's own stated method it is **133,180**.

Three numbers for one fact, in two docs — RULEBOOK §10.1 (one owner per fact) says that is a bug by definition. The CORE-MAP figure is now regenerated (below); **#560's 90,458 is not mine to touch.**

**🟣 FOUNDER DECISION — B3.** Restate #560's percentage against the CORE-MAP denominator so the two docs stop disagreeing.

---

# 📄 DOC-LEVEL FINDINGS (not inventory items)

## The one that matters most — two docs claim a CI gate that has never existed

`docs/DOC-MAP.md:8` states: *"`scripts/doc-lint.sh` is the firewall … **CI runs it on every PR touching `docs/`**."*

**It does not, and it never has.** Checked live against the GitHub API on 1 Aug:

| Workflow | Runs, ever |
|---|---|
| `doc-lint.yml` | **0** |
| `test.yml` | **0** |
| `inventory-autoflip.yml` | **0** |

`CLAUDE.md` already carries this correction for itself (*"⚠️ CI DOES NOT RUN IT — this line used to claim it did"*). DOC-MAP was never given the same correction, so the repo's own index of its docs still promises a gate that has never fired. **Fixed in this PR** — this is drift where the deciding fact is already on record in `CLAUDE.md`, and the API confirms it.

## CORE-MAP was stale, and so was the manifest beside it

`CORE-MAP.md:13` claimed **242 files / 56,854 lines**. Running the generator:

```
$ python3 scripts/build-core-map.py
seeds: 58 | core files: 254 | core lines: 61113 | unresolved specs: 0
```

`scripts/core-files.txt` on disk had **247** entries — so the doc and the machine-readable manifest were stale **by different amounts**, and neither matched the generator. The gap is exactly the work of the last five days (the CSV importer, the house-client builder, the env scanner, the drift map, the schema prober, the lead-pattern engine and their tests).

The repo total reproduces exactly at the commit CORE-MAP was written (`git ls-tree` at `ffcb7767` → **552**; at HEAD → **594**), which confirms the method and dates the drift. **Fixed in this PR** by re-running the generator — no hand-typed numbers.

## Docs on disk that DOC-MAP does not name — 84

DOC-MAP's own rule: *"If a doc isn't listed here, it isn't tracked — add it."* By that rule 84 files are untracked. They are not equally interesting:

| Group | Count | Assessment |
|---|---|---|
| `archive/` | 20 | Fine. Superseded by design; DOC-MAP has one ARCHIVE tier and doesn't enumerate. |
| `previews/` + `mv-previews/` | 32 | Fine as ARTIFACTs, but see the warning below. |
| `legal/` | 6 | **Should be tracked** — 4 of them are inventory items (#432–#436) with lawyer sign-off owed. |
| `hiring/` · `content/` · `drafts/` · `flows/` | 19 | Judgement call. |
| **Top-level, untracked** | **7** | `AUDIT-PROMPT.md` · `BACKUP-RESTORE-DRILL.md` · `DESIGN-REFERENCE.md` · `RLS-AUDIT.md` · `SEED-WIPE-PLAN.md` · `onboarding-tour-buildplan.md` · **`DOC-MAP.md` itself** |

**🟣 FOUNDER DECISION.** Add the 7 top-level + 6 legal docs to DOC-MAP (13 rows), and decide whether `previews/` gets enumerated or covered by one blanket ARTIFACT line. *I did not add them — adding 13 rows to the doc index is a structural change, not drift.*

## Two docs that still describe a retired vendor and a retired model

- **`TECH-STACK.md`** (a CORE-tier doc) says at **:11**, **:21** and **:68** that **Smartlead is THE ENGINE** — *"the product's deliverability foundation"*. #577 was **founder-locked 26 Jul** and amended 30 Jul to the opposite architecture: our product gives the orders, the vendors drive the van, with Instantly for our own outreach. A vendor register that names the wrong engine is exactly the doc someone quotes in a client conversation. **Flagged in this PR** with a stale banner citing #577 — *not rewritten*, because choosing the replacement wording is an architecture statement, not drift.
- **`DOC-MAP.md:37`** describes `run-costs-and-cashflow.md` as *"§0 = the locked **per-qualified-lead ladder**"*. That doc's §1 has said *"one wallet · $99 onboarding pack · then $4 a lead (LOCKED 25 Jul)"* since 25 Jul. **Fixed in this PR** — the deciding fact is in the target doc itself.

## One deck that would embarrass us if it were sent

`docs/kind-pitch-deck.html` advertises a **"14-day free trial"**. It is an **ARTIFACT** — frozen by design, so by DOC-MAP's rules this is *not* drift and I have not touched it. Reporting it anyway: it is a deck, decks get sent, and it sells a trial we do not offer at a price we do not charge.

---

# ✅ WHAT THIS PR ACTUALLY CHANGED

Three doc facts, each where the deciding fact was **already on record** before this audit. Nothing judged, nothing scoped, no dots moved.

| Fix | Citation that authorised it |
|---|---|
| `CORE-MAP.md` numbers 242/56,854 → **254/61,113**, and the full table regenerated | `python3 scripts/build-core-map.py` — the doc names this script as its only source (*"Generated, not judged"*) |
| `scripts/core-files.txt` regenerated (247 → 254 entries) | same command; the doc says *"the manifest is written by the script that counts it, so the number in the doc and the list on disk cannot disagree again"* |
| `DOC-MAP.md:8` CI claim, `:22` core count, `:37` money model | `CLAUDE.md` (CI has never run) · the generator · `run-costs-and-cashflow.md` §1 |
| `TECH-STACK.md` stale banner | #577, founder-locked 26 Jul |

**No inventory item was changed; all B/C/D await founder decision.**

---

# 📋 THE DECISION LIST — everything waiting on you

| # | Group | Items | The question |
|---|---|---|---|
| 1 | D1 | #420 #421 #422 #423 #424 #425 #427 #428 #429 | Tombstone the 8 Jul price ladder as superseded by ONE WALLET? *(#426 and #431 survive on their own merits.)* |
| 2 | D2 | 12 "OUT OF PLAY" rows | Restore the dots this code earned + a separate "not sold" line, or add a ⚪ BUILT·NOT SOLD state, or just refresh the reason? |
| 3 | D3a | #176 #270 #271 #425 | Tombstone the trial items? |
| 4 | **D3b** | — | **Is `trialing` still a real state?** Two crons and every signup still create it. Code question, not a doc question. |
| 5 | D4 | #103 #242 #247 #450 | Apollo: closed question or parked one? |
| 6 | D5 | #144 #145 #149 #81 #125 #113a | Fold into Milla · tombstone · or keep as future — one call each. |
| 7 | C1 | #230 #404 | Merge into #404. |
| 8 | C2 | #237 | Paystack is already deleted — flip to 🩷 or absorb into #352? |
| 9 | C3 | #211 | Epic without a dot, or keep as the roll-up? |
| 10 | **B1** | **#397** | **"Never called" is false — it runs in the reply pipeline. Rewrite the premise or close it.** |
| 11 | B2 | #561 | 69 → 100 variables. |
| 12 | B3 | #560 | Restate the % against the CORE-MAP denominator. |
| 13 | Docs | — | Add 13 untracked docs to DOC-MAP; decide how `previews/` is covered. |

**If you only rule on two things, make them #10 and #4** — one invites deleting live code, the other is a payment-free path into the product that is running every morning.
