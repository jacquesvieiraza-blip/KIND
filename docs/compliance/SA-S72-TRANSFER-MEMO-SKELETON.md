> # ⚠️ DRAFT FOR COUNSEL — NOT FILED, NOT PUBLISHED, NOT RELIED ON
>
> **Nothing here has been filed, published or relied on.** The s72(1) basis is left blank
> deliberately: selecting it is counsel's decision, and a draft that guessed would be worse than
> a draft that asks.
>
> Written 20 Aug 2026. Every fact about where data sits was read from the repo or confirmed by
> the founder on the vendor dashboards, and each is cited so counsel can check rather than trust.

# POPIA section 72 — cross-border transfer memo (skeleton)

## 1. The question

South African data subjects' personal information leaves South Africa. POPIA s72 permits that
only on one of the bases in s72(1). **Which basis do we rely on?** — [COUNSEL SELECTS]

## 2. Where the data actually sits

⚠️ **FOUNDER-CONFIRMED 20 AUG 2026.** The prompt for this document asked the founder to check
the region on the Supabase dashboard first. **He did** — he opened his own Supabase and Railway
dashboards and supplied screenshots. This section records what those showed. Counsel may
re-verify; nothing here is inferred.

| Layer | Where | Evidence |
|---|---|---|
| **Database** (all client and lead data, incl. SA data subjects) | **Supabase, eu-west-1 — Dublin, Ireland** | Founder's dashboard, 20 Aug. Now stated on `privacy.html` and `trust.html` |
| **Application servers** (processing, not storage) | **Railway, US West — California, United States** | Founder's dashboard, 20 Aug |
| **Backups** | Daily, same region as the database (Dublin) | Backup screen, 20 Aug — 7 days visible (13–20 Aug) |
| **Email delivery** | Resend | `privacy.html` §4 |
| **AI processing** | Anthropic Claude API (US) | ⛓️ **CORRECTED 21 Aug — this cell said *"`privacy.html` §4 — no personal data in prompts"*, which is FALSE and must not be relied on for an s72 analysis.** **Personal data DOES cross to Anthropic (US).** Structured lead paths send **name, job title, company, industry, seniority, country + up to the first 1,200 characters of prospect reply text** (`scoring.ts:138,159`→`:176` · `figsy.ts:293-299`→`:327` · `figsy.ts:387`→`:410` via `reply-pipeline.ts:141`); the structured `lead.email` field is **not** sent in those paths. **Milla chat** sends client-typed messages, prior turns and **verbatim uploaded-document excerpts with NO filtering or redaction** (`milla.ts:164-165,191-196,201`→`:207`) — so it **can** carry any personal data, including email addresses. ⚠️ **Anthropic's terms are UNVERIFIED — none held** (`EVIDENCE-PACK.md` row 17), so **no agreement-based s72 basis can rest on this vendor** until they are executed and in the vault |
| **Payments** | Stripe | `privacy.html` §4 |

**So an SA data subject's personal information is stored in Ireland and processed in the United
States.** Two jurisdictions, both outside South Africa, both engaging s72.

## 3. What the site claimed, and what it says now

⚠️ **THIS SECTION IS OUT OF DATE IN OUR FAVOUR — CORRECTED BEFORE COUNSEL SAW IT.**

The prompt for this document said to record *"what the site currently claims (Cape Town) vs
reality"* and *"the sentence set that replaces the claim once Prompt 13 phase 2 runs"*. **Both
happened on 20 Aug, before this memo was written.**

| | Before 20 Aug | Now |
|---|---|---|
| Database location | "Cape Town", "af-south-1" | **Dublin, Ireland (eu-west-1)** |
| Compute | not stated | **US West (Railway), stated plainly** |
| Backups | "30-day retention", "geo-redundant" | **7 days, same region as the database** |
| US region | "US region available on request" | **removed — no such capability exists** |

**Verification:** `"Cape Town"` and `"af-south-1"` appear **0 times** in a hosting context across
all 29 site pages, enforced by `apps/api/src/lib/website-residency-claims.test.ts`, which fails
the build if either returns. The live page was fetched and checked after deploy.

**Counsel should therefore assess the CURRENT position, not the old claim.** The old claim
matters only if counsel judges that its period of publication created exposure of its own —
which is a question this memo raises rather than answers.

## 4. The s72(1) bases — for counsel to select among

[COUNSEL: select and justify. Listed neutrally; no recommendation is made here.]

- [ ] The recipient is subject to a law, binding corporate rules or binding agreement providing an adequate level of protection
- [ ] The data subject consents to the transfer
- [ ] The transfer is necessary for the performance of a contract between the data subject and the responsible party
- [ ] The transfer is necessary for the conclusion or performance of a contract concluded in the data subject's interest
- [ ] The transfer is for the benefit of the data subject and consent is not reasonably practicable

**Relevant to that choice, factually:**
- Ireland is in the EU/EEA. [COUNSEL: whether that assists on "adequate level of protection".]
- The United States is not. Our compute tier sits there.
- **We do not hold executed DPAs with our processors** — `EVIDENCE-PACK.md` rows 9 and 17. If the
  basis chosen depends on a binding agreement, **that agreement does not currently exist in our
  hands**, and that is the gating fact for this memo.

## 5. What is outstanding

- [ ] Counsel selects the s72(1) basis
- [ ] Executed DPAs collected (blocks any agreement-based basis)
- [ ] Counsel decides whether the pre-20-Aug claim needs any remedial step
- [ ] Once settled, the position is recorded in `EVIDENCE-PACK.md` row 18
