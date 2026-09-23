> # ⚠️ DRAFT — the founder walks this before any client sees it
>
> Written 20 Aug 2026 by reading the code. Every claim below names the file and line that proves
> it, so a buyer can check rather than trust. **Not served to any client yet.**

# THE DATA BOUNDARY — four buckets

**The question this exists to answer:** *"Do you use my data for your other customers?"*
**The answer: no — and here is the grep.**

---

## ① CLIENT-CONFIDENTIAL — never crosses, ever

**What:** CRM data, replies, Meeting-Brief knowledge, uploads, sending credentials, calendar.

**Why it cannot cross:**

| Control | Evidence |
|---|---|
| Every row is `client_id`-scoped, and row-level security is on | RLS migrations carried in the migration runner — `apps/api/src/lib/pending-migrations.ts` (**7** RLS migrations registered), audited by `apps/api/src/lib/rls-audit.test.ts` |
| The **Nexus fence (AR3)** — a client's learned profile can never reach another client's scoring | `apps/api/src/lib/nexus-guard.ts` → `assertSameClient(source, target)` **throws `NexusFenceError`** if the ids differ or either is blank. Called at `apps/api/src/lib/scoring.ts:76`, commented in the code as *"THE FENCE — never another client's brain"* |
| Admin surface reachable only through the proxy, by allow-listed email | `ADMIN_ALLOWED_EMAILS`; pinned by `apps/api/src/lib/admin-proxy-only.test.ts` |
| Sending credentials encrypted at rest | AES-256-GCM — `apps/api/src/lib/inbox-secret.ts:28` |

**Plain words:** your CRM, your replies, your calendar and your uploads are yours. No code path
carries them to another client, and the one place a *learned signal* could have leaked throws an
exception instead.

---

## ② K.I.N.D INDEPENDENTLY SOURCED — the pool, and it is ours

**What:** `lead_pool` — prospect records **K.I.N.D bought** from a licensed provider.

**The proof, and this is the important one:**

```
$ grep -rn "from('lead_pool')" apps/api/src
  routes/icps.ts:261       .select('*')        ← READ  (serve path)
  routes/icps.ts:606       .upsert(...)        ← WRITE (the only one)
  routes/operator.ts:2807  .select('email_norm') ← READ (operator view)
```

⛓️ **23 Sep (checked against main `83e9c1b`):** the grep above is the 20-Aug result and no longer matches `main`: `from('lead_pool')` now appears at 8 non-test sites, with writes at `apps/api/src/lib/cmo.ts:179`, `apps/api/src/routes/lookalike.ts:369` and `apps/api/src/routes/icps.ts:2372` (plus a country backfill at `:2402`). Since **R73** (27 Aug) the pool allowlist is `['pdl', 'apollo']` (`apps/api/src/lib/pool-sourcing.ts:333`); customer data and untagged records stay out. Apollo is the only data provider (FD-6, 17 Sep); PDL and Hunter are retired in `apps/api/src/lib/retired-providers.ts`.

~~**Three sites. Exactly ONE writes.**~~ That write is the PDL-purchase upsert at
**`apps/api/src/routes/icps.ts:606`**, and **two guards** sit in front of it:

1. **`poolWriteAllowed(isDemo, count)`** — `apps/api/src/lib/pool-sourcing.ts:96`. Its own comment:
   *"the pool holds ONLY genuinely bought records"*. A demo run is pool-**read**-only and can
   never write back.
2. **`splitPoolEligible(records)`** — same file, added 20 Aug. Per-record provenance tripwire:
   ⛓️ **23 Sep (checked against main `83e9c1b`):** `pdl` and `apollo` may enter (R73); **untagged** and customer records are refused. ~~only `source: 'pdl'` may enter. Apollo-sourced or **untagged** records are refused~~ and named
   in the log, and the refusal skips the pool write **only** — leads already bought, delivered
   and charged are untouched, because a licensing precaution must never become an outage.

**Reuse is governed by three things, not one:** the law · the provider's licence · our
suppression list.

⚠️ **Said honestly:** the **provider licence is unverified.** The PDL Order Form has never been
located (F13; `EVIDENCE-PACK.md` rows 9 and 17). We believe the terms permit cross-client reuse;
we cannot currently show the paper. **A buyer who asks to see it must be told this.**

**Plain words:** the pool holds people *we* paid for, never people who came from your CRM. One
line of code writes to it, and it only accepts records from the one provider we buy from.

---

## ③ SUPPRESSION / LEGAL EVIDENCE — kept deliberately, outlives everything

**What:** `opt_out_blocklist` — email plus the reason, normalised before storage.

**Evidence:** written at `apps/api/src/lib/reply-ingest.ts:142`; checked before every send at
`apps/api/src/lib/smartlead-send.ts:96`. Email is normalised first
(`normalizeRevealEmail`) — so `John@Acme.com` and `john@acme.com` are **one** record, which was a
real defect once: someone who replied "STOP" got a row no send-path probe matched.

**Why it outlives deletion:** a suppression record must survive the data it suppresses. Deleting
it would let us contact someone who told us to stop. **This is the one bucket where "we still
hold something about you" is the protective answer**, and it is the right way to explain it.

**Global, not per-client:** one opt-out stops every K.I.N.D client reaching that person.

---

## ④ AGGREGATE LEARNING — locked shut today

**What:** cross-client patterns — "what converts in general".

**Status: closed.** The AR3 fence in ① is what closes it: a profile is fetched for one
`client_id` and `assertSameClient` throws if it is used for another. Nothing aggregates across
clients today.

**It opens only by founder ruling, contracts first.** Any future aggregate learning needs a
lawful basis and the contractual right to do it — which means `EVIDENCE-PACK.md` row 17 (the
executed DPAs) lands **before** the code, not after.

⚠️ **The distinction that matters if we ever open it:** *client content and evidence* stay
tenant-fenced; only *routing/performance metadata* could ever aggregate, and only where lawful
and contractually permitted. Those are different things and must never be described as one.

---

## The thirty-second version

> Your data is yours — fenced by `client_id`, by row-level security, and by a fence that throws
> rather than leaks. The shared pool holds only people **we** bought, written by **one** line of
> code with two guards in front of it. Opt-outs are kept forever on purpose, and they protect
> people from us. Nothing learns across customers today, and turning that on is a decision with
> contracts attached — not a feature toggle.
