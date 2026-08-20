# ⛓️ Upstream DSR propagation — when a provider tells us somebody objected

> **What this document is for.** We buy contact data from other companies. When a person exercises their rights **with that provider** — erasure, objection, opt-out — the provider stops serving their record. **We do not automatically hear about it**, and anything we cached before that moment keeps circulating in our pool.
>
> This is the map of every signal each provider actually exposes, what we do with it today, and — where no tooling exists — the **manual rule** that stands until it does.
>
> **Status: partial.** One signal is handled in code. Everything else on this page is a documented gap with a manual rule, not a built feature. Read the ⚠️ lines; they are the honest part.

*Created 20 Aug 2026 (Prompt 24). Founder-ruled the same day: discard the whole enrichment on a refusal · document `invalid_domain` rather than handle it · record PDL as unverified.*

---

## ⚠️ THE ONE SENTENCE THAT MUST NOT BE MISREAD

**Nothing on this page reaches backwards into data we have already cached.**

What is built catches a refusal **at the moment we ask** a provider about someone. A person who was sourced into `lead_pool` in June and objected to PDL in August is **still in our pool**, and no code anywhere will notice. That is the actual exposure this document exists to name, and the **MANUAL RULE** below is the only thing currently standing in front of it.

Anyone reading this and concluding *"upstream deletions are handled now"* has read it backwards.

---

## 1 · Hunter.io — ✅ one signal handled, verified first-hand

**Evidence status: VERIFIED.** `hunter.io/api-documentation/v2` fetched live on 20 Aug 2026 (HTTP 200). The wording below is theirs, quoted, not paraphrased.

### 1.1 `451 claimed_email` — HANDLED IN CODE

> *"The person owning the email address asked us directly or indirectly to stop the processing of their personal data. **For this reason, you shouldn't process it yourself in any way.**"*

The final clause is the whole point: Hunter is not declining to answer, they are instructing us about **our own** processing.

**What happens now** (`lib/enrichment.ts`):

| | |
|---|---|
| The signal | `tryHunter` reads the 451 on Hunter's own branch and returns a typed `ProviderRefusal` |
| The response | `waterfallEnrich` **discards the entire merged result** and returns `{ source: 'none' }` |
| Why the whole thing | **PDL runs first.** By the time the refusal arrives we already hold a PDL profile — title, company, domain — for that same person. Dropping only Hunter's email would honour the letter of the refusal while handing back a dossier on the same human. Founder-ruled: *"discard all."* |
| Persistence | **None.** Nothing is written for this identity |
| Fall-through | None. No further provider is asked for the same identity |
| Visibility | `console.warn` with `provider_refusal:hunter:claimed_email`, the reason, and the source URL — the `enrol_skips` shape an operator already reads |
| The client's money | Unchanged and correct: `approve-lead.ts` sees "no email", **reverses the $4** and returns `no_email`. A client is never charged for a lead nobody may contact |

**What it does NOT do:** it does not write to `opt_out_blocklist` (that register is *our sending* suppression, a different meaning), and it does not touch `lead_pool`.

### 1.2 `400 invalid_domain` — ⚠️ DOCUMENTED, DELIBERATELY NOT HANDLED

> *"The domain name is invalid, has no MX record **or its owner has asked us to stop the processing of the associated data**."*

A **domain-level** suppression request, conflated with an ordinary bad domain, under one code.

**Why nothing is built:** the two meanings are indistinguishable from outside. Mapping this to a privacy refusal would suppress every typo'd domain as a legal objection; ignoring the privacy half is what we do today. **Founder-ruled 20 Aug: document only.**

**MANUAL RULE:** if Hunter's `invalid_domain` appears repeatedly for a domain that plainly exists and resolves, treat it as a possible suppression request and check with Hunter before sourcing that domain again.

### 1.3 What Hunter does **not** give us

No changelog, no webhook, no bulk suppression feed. A person who objects to Hunter **after** we cached their address produces **no signal at all** — we only learn on the next ask, and we may never ask again.

---

## 2 · People Data Labs — ⚠️ UNVERIFIED-SECONDARY

**Evidence status: UNVERIFIED-SECONDARY.** `docs.peopledatalabs.com` returns a JavaScript-rendered 404 shell to this build container (checked 20 Aug 2026). **Nobody here has read PDL's deletion surface.** Everything below is what this section *must* establish, not what it *has* established.

This is the same treatment **R49** and **F15** give PDL's and Apollo's contract terms, and for the same reason: a compliance page that states an unchecked vendor fact confidently is worse than one that admits the gap.

**PDL is our PRIMARY sourcing provider and the only writer into `lead_pool`** (`routes/icps.ts` tags every pooled record `source: 'pdl'`). So this is the gap that matters most, and it is the one we cannot close from here.

### 🧍 What has to be answered — against the founder's own Order Form, not the public docs

1. Does PDL expose a **changelog / delta feed** identifying records removed since a given date?
2. Does PDL expose a **Subject Request / suppression API** we can poll or receive?
3. What does the contract **require** of us when a record is withdrawn — delete, suppress, or nothing?
4. On subscription termination, what must happen to cached PDL data? *(R49 gate ③ records this as deletion with a signed acknowledgement — also unverified.)*

Counsel line **W18**; blocked on the same Order Form as R49.

### The design, once those answers exist

A scheduled job pulls the delta, and for each withdrawn identity: mark the `lead_pool` row suppressed (never hard-delete — the row is the evidence we acted), suppress derived `leads` rows for every client, stop any live FIGSY enrollment, and leave `figsy_sent_emails` intact as the record of what was already sent. **None of this is built.**

### ⚠️ MANUAL RULE until it is

**Nothing automatic exists, so this is the whole of our propagation for PDL today:**

1. If PDL notifies us of a withdrawal by any channel — email, portal, account manager — the founder or an operator **suppresses the `lead_pool` row and every derived client lead by hand, the same day**, and records it in the session log.
2. Any person who contacts us directly asking to be removed is handled through `opt_out_blocklist` **and** has their pool row suppressed by hand. The blocklist alone stops sending; it does not stop the record being re-served to another client.
3. Before client #2 is ever served a cached record, R49's gate ② must be cleared **and this section must be filled in with verified answers.**

---

## 3 · Apollo — not in the day-to-day stack

`APOLLO_API_KEY` is graded **`optional`** in `startup-check.ts`, and the live stack is **PDL + Hunter**. The 166 legacy Client-Zero leads came through Apollo's search API (see R50), so Apollo data **is** in the book, but nothing sources from it today.

**Evidence status: UNVERIFIED-SECONDARY** — Apollo's terms were read by GPT, not from this container (**F15**).

**MANUAL RULE:** Apollo-sourced records are already fenced from `lead_pool` by construction (only the PDL path writes there). If Apollo is ever revived — including a client's own BYO key — this section must be completed **before** the first request, not after.

---

## 4 · The signals we will never receive

Stated so the limit is visible rather than assumed away:

- A person who objects to a provider **after** we cached them, where that provider has no delta feed, generates **no signal ever**. Section 2's manual rule is the entire mitigation.
- A person who objects **directly to us** is covered by `opt_out_blocklist` for sending — but that is a *different register*, and it does not remove them from `lead_pool` or stop them being re-served to another client. **That is a real gap**, and until pool suppression is built it is closed by hand.
- Providers do not tell each other. A Hunter refusal says nothing about PDL's copy of the same person, and vice versa.

---

## 5 · Adding a provider — the rule that must not be skipped

**A status code has no inherent privacy meaning.**

HTTP 451 means "unavailable for legal reasons". That covers a copyright takedown, a geo-block, a sanctions listing and a data-subject erasure request. **Hunter's 451 means do-not-process only because Hunter's documentation says so, in those words.**

So: read the new provider's own documentation, quote it into `enrichment.ts`'s refusal table with a source and a date, and add the section here. **Never inherit a mapping because the number matches.** `enrichment-dsr.test.ts` fails the build if a mapping has no quoted basis, and if `451` is read anywhere outside a provider-specific function.

---

## Where this is enforced

| | |
|---|---|
| Code | `apps/api/src/lib/enrichment.ts` — the refusal table, `hunterRefusal`, the discard in `waterfallEnrich` |
| Guard | `apps/api/src/lib/enrichment-dsr.test.ts` — including that this document exists and still carries its gaps |
| Register | **R52** in `docs/PRODUCT-RULES.md` · item **#667** |
| Related | **R49** (PDL's three licence gates) · **F15** (Apollo provenance) · **F2** (whether opt-outs stop re-scoring, not merely re-sending) · counsel **W18** |
