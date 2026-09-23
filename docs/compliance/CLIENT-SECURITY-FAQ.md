> # ⚠️ DRAFT — the founder walks this before any client sees it
>
> Written 20 Aug 2026. Answers are in plain words and each points at the document that proves it.
> **If an answer here ever drifts from the document it cites, the document wins.**

# Client security FAQ — the ten questions

## 1. Where is my data?

**Stored in Dublin, Ireland** (Supabase, `eu-west-1`). **Processed on servers in US West**
(Railway, California). Backups sit in the **same region as the database**, retained 7 days.

We say both halves every time. A US compute tier is exactly what an EU buyer is asking about, so
hiding it would be the fastest way to lose their trust.
→ `SA-S72-TRANSFER-MEMO-SKELETON.md` §2 · `apps/website/privacy.html` §4

## 2. Who can see it?

Your team, and the founder. Nobody else has access today — **one person**, which we say plainly
rather than describing a process we do not have. Access is gated by Supabase auth for clients and
an allow-listed email for the operator console.
→ `SECURITY-TOMS.md` rows 2 and 11

## 3. Do you use my data for your other clients?

**No.** Your CRM data, replies, uploads and calendar are fenced to your `client_id` by row-level
security, and the one place a learned signal could have crossed **throws an exception** instead.

Our shared prospect pool holds only people **we bought** from a licensed provider — one line of
code writes to it, with two guards in front.
→ **`DATA-BOUNDARY.md`** — this is the thirty-second answer, with the grep as the receipt

## 4. Who are your sub-processors?

Supabase (database) · Railway (hosting) · Resend (email delivery) · Anthropic (AI) · Stripe
(payments) · ⛓️ **23 Sep (checked against main `83e9c1b`):** Apollo (lead data — Apollo is the only data provider (FD-6, 17 Sep); PDL and Hunter are retired in `apps/api/src/lib/retired-providers.ts`) ~~PeopleDataLabs and Hunter (lead data)~~ · Google (calendar, with your consent) ·
Smartlead (sending).

The list is published at `apps/website/dpa.html`.
⚠️ **Honest gap:** we have **not** collected executed DPAs with all of them yet. If you need them
before signing, that is a fair ask and we will tell you where we stand on each.
→ `EVIDENCE-PACK.md` rows 9 and 17

## 5. What if you're breached?

We contain first, establish scope, and the **founder decides notification on counsel's advice** —
no automation and no contractor makes that call. If **you** are a controller and we are your
processor, our duty runs to **you**, without undue delay, so you can decide.

We also have a branch for when a **vendor** is breached: did our data exist there → which clients
→ which prospects → our role → who must be told.
→ `BREACH-RESPONSE-DRAFT.md` · `docs/legal/it-security-pack.md` §7

## 6. What happens when I leave?

⚠️ **Counsel-pending, and we will not improvise it.** What we can say now: suppression records
are kept deliberately and outlive everything else, because deleting them would let us contact
someone who told us to stop. Everything else follows the retention schedule.

The full termination classification — what is returned, what is deleted, what is kept and why —
is with counsel.
→ `docs/legal/it-security-pack.md` §6 · `TRUST-ROOM.md` item 7

## 7. How do opt-outs work?

Every campaign email carries a one-click unsubscribe header **and** our postal address. An opt-out
is written to a **global** suppression list — not per-client — so once someone opts out, **no
K.I.N.D client can reach them again.** Addresses are normalised first, so a reply from
`John@Acme.com` suppresses `john@acme.com` too.
→ `DATA-BOUNDARY.md` ③ · `reply-ingest.ts:142` · `smartlead-send.ts:96`

## 8. How do I get my data out?

Ask, and we export it. Our stated response window is **30 days**, matching the UK GDPR clock.
⚠️ **Honest gap:** we do not yet have a self-serve export button or a written request runbook —
today it is a person doing it.
→ `docs/legal/it-security-pack.md` §6 · `EVIDENCE-PACK.md` row 13

## 9. Do you train AI on my data?

⚠️ **UNVERIFIED — we cannot evidence an answer to this question, and we will not assert one.**
⛓️ **CORRECTED 21 Aug — and the two halves of the old answer failed in DIFFERENT ways, which is
why they are separated here.** The previous answer opened **"No."** without evidence held in our
vault. **That training/retention claim is therefore UNVERIFIED** — we hold no Anthropic contract or
terms document anywhere in this repository (`EVIDENCE-PACK.md` row 17 — founder to collect into the
vault), so nothing here claims what Anthropic does or does not do with data it receives, **and
nothing here claims the opposite either.** The separate statement that names were not sent was
**factually FALSE: production code proves names are sent.** What we CAN state is what our own
production code proves:

**What reaches Anthropic's Claude API — established from production code, not from policy.**

**① Structured lead paths (scoring · sequence writing · reply classification).** These send lead
**name**, **job title**, **company**, **industry**, **seniority**, **country**, and **up to the
first 1,200 characters of prospect reply text**. **The structured `lead.email` field is NOT sent in
these paths** — it is not selected for the scoring prompt and appears only in server-side log lines
on the send path.
*Evidence:* `apps/api/src/lib/scoring.ts:138,159` → `:176` · `figsy.ts:293-299` → `:327` ·
`figsy.ts:387` → `:410`, invoked at `reply-pipeline.ts:141`.

**② Milla client chat.** This sends the client's **typed messages**, their **prior chat turns**, and
**verbatim excerpts of documents they have uploaded**. **No content filtering, redaction or PII
detection is applied** — the only transformations are a 4,000-character truncation and a filter on
message *role*. **Therefore this path CAN carry personal data, including email addresses, if a
client types or uploads them.** The injected account snapshot carries aggregate counts and a
campaign name only.
*Evidence:* `milla.ts:21-24,135,164-165,191-196,201` → `:207` · `milla-chat-system.ts:35,47-48`.

**So the accurate statement is narrow, and deliberately so:** the structured `lead.email` field is
not sent in the verified scoring, sequence and reply paths — **but this is not a claim that email
addresses are never sent to Anthropic**, because the Milla chat path can carry anything a client
writes or uploads.

## 10. Are you SOC 2 certified?

**No — and the distinction matters, so we never blur it.**

- **We are hosted on SOC 2-certified infrastructure.** Railway and Supabase (AWS) hold their own
  reports, covering *their* controls.
- **K.I.N.D itself is not SOC 2 certified.** We have not been audited.

Saying "SOC 2" without that split is the single most common way a startup misleads a buyer, and
it is the thing a procurement reviewer is most likely to catch.
→ `SECURITY-TOMS.md` row 6

---

## Before you use this with a client

Three things are **NOT YET** and appear in questions 8, and behind 1 and 5:
**no restore has ever been tested · personal data reaches application logs in 105 places and log
retention is unconfirmed · patching is reactive.**

**Volunteer them.** A buyer who finds one themselves stops believing everything else on this page.
→ `SECURITY-TOMS.md` rows 8, 10, 12
