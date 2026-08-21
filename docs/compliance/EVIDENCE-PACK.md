# EVIDENCE PACK — the accountability register

> **What this is.** The register of every document K.I.N.D must be able to hand over if a
> regulator, a client, or a DPA audit asks for evidence — per the **Global Compliance
> Baseline V2 §19 and §6** *(founder-held; not in this repo)*.
>
> **Populated by reading the repo, not from memory.** Every row citing a file, line or table was
> verified by opening it. Where a thing does not exist, the row says **no** — never "partially",
> never softened. Three rows below are *better* than expected and two are *worse*; both
> directions are marked ⚠️ so the difference is visible rather than buried.
>
> **Owner column:** 🤖 = in the repo, maintained with the code · 🧍 = the founder holds it, and
> no amount of reading this codebase can verify it.

**Related, and deliberately not duplicated here:** `docs/legal/` holds the documents themselves —
`it-security-pack.md`, `legal-pack.md`, `key-rotation-runbook.md`, `restore-runbook.md`,
`partner-agreement.md`. This file is the *register*; those are the *evidence*.

---

| # | WHAT IT IS | EXISTS? | WHERE HELD | OWNER |
|---|-----------|---------|-----------|-------|
| 1 | **RoPA** — record of processing activities (UK GDPR Art. 30) | **no** — mentioned in `KIND-MASTER.md` and `PRODUCT-RULES.md` as a thing we owe; no document exists | — | 🧍 |
| 2 | **LIA** — legitimate interests assessment | **no** — in motion with counsel. Load-bearing: `privacy.html:252` and the site now state a **legitimate-interest basis**, so the assessment behind that sentence is owed | — | 🧍 counsel |
| 3 | **Privacy notice + Art. 14 first-contact text** | **Privacy notice: YES** — `apps/website/privacy.html`, live, 29-page site. **Art. 14 text: no** — searched the page, **0 occurrences** of "Article 14" / "Art. 14" | `apps/website/privacy.html` | 🧍 counsel (Art. 14) |
| 4 | **Per-jurisdiction channel-permission evidence** | **YES, two parts.** UK PECR logic: `apps/api/src/lib/pecr.ts`. ⚠️ **And the launch allowlist is now MERGED** — `packages/shared/src/launch-countries.ts` (`LAUNCH_SEND_COUNTRIES`, US · UK · South Africa), which was pending when this prompt was written | `lib/pecr.ts` · `packages/shared/src/launch-countries.ts` | 🤖 |
| 5 | **Suppression / opt-out records** | **YES** — `opt_out_blocklist`, upserted on every opt-out with a **named reason**. Write path read end to end at `apps/api/src/lib/reply-ingest.ts:142`; email normalised first (`normalizeRevealEmail`) so `John@Acme.com` and `john@acme.com` are one record. Failures are collected and surfaced, not swallowed | `opt_out_blocklist` · `lib/reply-ingest.ts:142` · `lib/smartlead-send.ts:96` | 🤖 |
| 6 | **Source provenance per lead** | **PARTIAL — and the gap is named.** `sourcing_ledger` records a run; `leads.source` is a **flat string** written at the point of sourcing (`routes/icps.ts:583` → `source: 'pdl'`). **THE GAP:** one string per lead, no timestamp of acquisition, no licence reference, no per-field lineage — so "which provider gave us this person's email, under what terms, on what date" **cannot be answered per lead** from the record. The Apollo pool tripwire (`lib/pool-sourcing.ts`) refuses untagged records going *in*, but does not backfill what is already there | `sourcing_ledger` · `leads.source` · `routes/icps.ts:583` | 🤖 |
| 7 | **Operator action audit** | **YES** — `operator_audit_log`, written at `apps/api/src/lib/operator-audit.ts:171`. ⚠️ **Best-effort caveat, deliberately:** `writeOperatorAudit` swallows its own failures so a lost audit line can never fail a client-facing action. **Prompt 11's fix (20 Aug):** a dropped row now raises a throttled alert on both the returned-error and thrown paths (`auditAlertDue`, 15-min throttle per action), so a persistent audit outage is visible instead of silent — which the header comment previously *claimed* and did not do | `operator_audit_log` · `lib/operator-audit.ts:171` | 🤖 |
| 8 | ⚠️ **Refusal evidence** | **YES — but NOT where this row expected.** There is **no `enrol_skips` table**; `lib/enrol-skips.ts` is a pure formatter. The durable record is `operator_audit_log` with `action='enrol_skips'`, carrying the **raw reason map and a human summary** (`lib/operator-audit.ts:246-268`), written **only when somebody was skipped**. Reasons are named, not counted — `copy_rejected:…`, `pecr_individual_risk:…`. Inherits row 7's best-effort caveat | `operator_audit_log` (`action='enrol_skips'`) · `lib/operator-audit.ts:246` | 🤖 |
| 9 | **DPAs / processor contracts + sub-processor register** | **Register: YES** — `apps/website/dpa.html` lists the vendors. **Contracts: NOT HELD IN A VAULT.** The list is a claim; the signed contracts behind it are the evidence. **Founder to collect into the vault.** F13 records that the PDL Order Form has not been located | `dpa.html` (list) · contracts: 🧍 | 🧍 |
| 10 | **International transfer terms (SCCs / IDTA)** | **Claimed on site, contracts to collect.** `dpa.html:296` commits us to *"appropriate safeguards including Standard Contractual Clauses"*; **no executed SCC/IDTA is held in the repo.** Every marketing page is guarded against naming SCCs precisely because the paper is unconfirmed (`website-residency-claims.test.ts`, H30 routes the DPA's own clause to counsel) | `dpa.html:296` · executed terms: 🧍 | 🧍 counsel |
| 11 | ⚠️ **Breach / incident response plan** | **YES — better than this row expected.** `docs/legal/it-security-pack.md` **§7**, read end to end: incident definition, five response steps with clocks (**contain 0–2h · assess 2–24h · notify within 72h · recover · review within 7 days**), explicit **ICO / client / data-subject** notification triggers, and an incident register at §7.3 | `docs/legal/it-security-pack.md` §7 | 🤖 |
| 12 | ⚠️ **Retention policy** | **YES — better than this row expected.** `it-security-pack.md` **§6**, read end to end: a per-data-type table (lead data, client account, email content, billing 7yr, logs 90d, tokens, Stripe) with retention period **and deletion method** for each, plus SAR and right-to-erasure clocks. ⚠️ **Written, not yet enforced in code** — the "auto-purge via scheduled cron" for email content is a policy statement, not a verified job | `docs/legal/it-security-pack.md` §6 | 🤖 |
| 13 | **DSAR workflow + log** | **Workflow: PARTIAL.** `it-security-pack.md` §6 states the 30-day SAR and erasure obligations. **No standalone DSAR runbook file exists** — searched `docs/legal/` and `docs/*.md`; hits are references in `KIND-MASTER.md` / `PRODUCT-INVENTORY.md`, not a procedure. **Request log: no** — none exists, and none is owed until a first request arrives | `it-security-pack.md` §6 | 🤖 + 🧍 |
| 14 | **ICO registration** | **DONE 5 Aug** (founder holds confirmation) | 🧍 founder's records | 🧍 |
| 15 | **Consent records (token flow)** | **YES** — per-lead token minted and stored on `leads.consent_token` (`lib/consent.ts:23`), redeemed by token lookup (`routes/leads.ts:36`), outcome recorded as `leads.status = 'consent_given'` (or `'opted_out'`) at `routes/leads.ts:42`; send time on `consent_sent_at`. ⚠️ **Read this row with row 2:** consent is captured where given, but it is **not** the lawful basis for delivery — legitimate interest is | `leads.consent_token` · `consent_sent_at` · `status='consent_given'` · `lib/consent.ts:23` · `routes/leads.ts:36,42` | 🤖 |
| 16 | **Per-send legal decision snapshot** (`campaign_compliance_snapshot`) | **no** — no such table in `supabase/migrations/`, no code path. Post-launch; rides **L1** | — | 🤖 |
| 17 | **Vendor DPAs / processor terms — to collect** | **no** — none executed and held. The eight that matter: **Supabase** (all personal data, Dublin) · **Railway** (compute, US West) · **Resend** (recipient addresses + content) · **Anthropic** — ⚠️ *including its no-training-on-API-data terms, which `privacy.html` §4 relies on when it says prompts exclude personal data* · **Stripe** · **PeopleDataLabs** — *F13: the Order Form has never been located* · **Hunter** · **Google** (Calendar OAuth). ⚠️ **This row gates others:** `SA-S72-TRANSFER-MEMO-SKELETON.md` cannot rely on an agreement-based s72 basis without these, and `BREACH-RESPONSE-DRAFT.md` §5 cannot say what a vendor owes us on notification | founder to collect into the vault | 🧍 |
| 18 | **POPIA s72 cross-border transfer memo** | **DRAFT, unfiled** — `docs/compliance/SA-S72-TRANSFER-MEMO-SKELETON.md`. Facts confirmed 20 Aug (Dublin eu-west-1 storage, US West compute, founder's dashboards). **The s72(1) basis is blank — counsel selects**, and any agreement-based basis is blocked by row 17 | `docs/compliance/` | 🧍 counsel |
| 19 | **US data-broker screen (CA Delete Act · VT · TX · OR)** | **no — and it is a question, not a document.** Counsel question 17 from the founder's own V2 baseline: do we meet the definition of a *data broker* in California (Delete Act / DROP), Vermont, Texas or Oregon, given we source B2B contact data from licensed providers and deliver it to clients? ⚠️ **Answer BEFORE selling data about those states' residents.** Bears directly on `LAUNCH_SEND_COUNTRIES` — the United States is on the launch list (`packages/shared/src/launch-countries.ts`), so this is live-fire, not theoretical | — | 🧍 counsel |

---

## What this register says, read as a whole

**Machine evidence is strong; paper evidence is thin.** Everything the code does — suppression,
refusals, operator actions, consent tokens, jurisdiction checks — is recorded and citable
(rows 4, 5, 7, 8, 15). Almost everything a lawyer would ask to *see* — RoPA, LIA, executed DPAs,
transfer terms, Art. 14 wording — is not yet held (rows 1, 2, 3, 9, 10).

**The two that matter most before the 25th:** row 2 (**LIA**) because the live site now asserts a
legitimate-interest basis and the assessment behind that sentence is owed, and row 9 (**executed
DPAs**) because `dpa.html` already lists the vendors publicly.

**Row 6 is the quiet one.** Provenance is the question a regulator asks *first* about cold
outreach — "where did you get this person?" — and today the honest answer is one flat string.

---

*This register is the FIRST governed document to move into the Vida document home (Prompt 10) when it ships.*
