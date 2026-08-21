> # ⚠️ DRAFT FOR COUNSEL — NOT FILED, NOT PUBLISHED, NOT RELIED ON
>
> **Counsel words both notification thresholds.** They are stated here as *different from each
> other*, which is the operational point, and **not** in legal terms — the wording of each is
> counsel's, and a draft that phrased them would invite someone to act on an unreviewed sentence
> during the one hour when that is most dangerous.
>
> Written 20 Aug 2026. Every detection source named below was read in the repo and is cited.
>
> ⚠️ **This complements, not replaces, `docs/legal/it-security-pack.md` §7**, which already sets
> out five response steps with clocks. §7 is the plan; this one-pager is the decision path and
> the vendor branch §7 does not have.

# Incident response — one-pager

## 1. How we find out

| Source | What it is | Where |
|---|---|---|
| **`error_events`** | Every unhandled API error is written here by the error middleware | `apps/api/src/middleware/error.ts:47` and `:83` · table from `20260703_error_events.sql` |
| **Founder alerts** | Push to the founder by email, plus Slack if `SLACK_WEBHOOK_URL` is set. Best-effort by design: never throws into the caller it rides on. ⚠️ Checks the Resend result rather than only catching throws (#339) — an API-level failure used to be swallowed | `apps/api/src/lib/alerts.ts` |
| **Vendor notices** | Supabase, Railway, Resend, Anthropic, Smartlead, PDL, Hunter status pages and breach notifications to us | External — see §5 |
| **Operator audit gaps** | A persistent audit-write outage now raises a throttled alert (Prompt 11, 20 Aug) | `apps/api/src/lib/operator-audit.ts` |
| **A person telling us** | A client, a prospect, or a researcher | privacy@get-kind.com |

⚠️ **The honest gap:** we have no intrusion detection, no log alerting on anomalous access, and
no third-party monitoring. Detection is *errors, alerts, and being told*. Counsel should know
that when advising on how quickly the clock could start.

## 2. The first hour

1. **Contain.** Rotate exposed credentials (`docs/legal/key-rotation-runbook.md`). Revoke sessions
   if account compromise is suspected. Take the affected service offline if it is ongoing.
2. **Do not delete anything.** Logs, `error_events` rows and audit rows are the evidence.
3. **Write down the time** you learned of it, and from whom. Both regimes' clocks run from a
   defined moment and it must not be reconstructed later from memory.
4. **Establish scope before notifying anyone** — §3. Notifying the wrong scope is its own harm.
5. **Do not communicate externally yet.** §4 says who decides.

## 3. Scope — the four questions, in order

1. **What data?** Categories, not counts — names, work emails, employers, message content, credentials.
2. **Whose?** Which clients, and which of their prospects.
3. **Our role for each?** Controller or processor **differs per client and per data category** — that determines whether we notify a regulator or notify our client so *they* can.
4. **Where did it sit?** Dublin (database), US West (compute) — see `SA-S72-TRANSFER-MEMO-SKELETON.md` §2. More than one regime can be engaged by a single incident.

## 4. Who decides notification

**The founder decides, on counsel's advice. Nobody else, and no automation.** No contractor,
agent or automated process notifies a regulator, a client or a data subject.

## 5. Vendor incident — the branch

⚠️ **This is a chain, not a policy paragraph.** When **Supabase · Railway · Resend · Anthropic ·
Smartlead · PDL · Hunter** reports an incident, the questions run in this order and each one
gates the next:

```
INCIDENT  (vendor tells us, or their status page shows it)
   │
   ▼
DATA MAP   Did OUR data exist there?
           · Supabase   → yes: ALL client and lead personal data (Dublin)
           · Railway    → yes: in-flight processing; per privacy.html §4, no personal data at rest
           · Resend     → yes: recipient addresses + message content
           · Anthropic  → YES, personal data reaches it. ⛓️ CORRECTED 21 Aug — this line said
                          "per privacy.html §4, prompts exclude names/emails", which is FALSE.
                          Structured lead paths send NAME, job title, company, industry,
                          seniority, country + up to the first 1,200 characters of prospect
                          reply text (scoring.ts:138,159→:176 · figsy.ts:293-299→:327 ·
                          figsy.ts:387→:410 via reply-pipeline.ts:141). The structured
                          lead.email field is NOT sent in those paths. Milla chat sends the
                          client's typed messages, prior turns and verbatim uploaded-document
                          excerpts with NO filtering or redaction (milla.ts:164-165,191-196,201
                          →:207) — so it CAN carry anything, including email addresses.
                          ⚠️ Anthropic's own retention/training terms are UNVERIFIED — none held
                          (EVIDENCE-PACK row 17), so this doc states nothing about what happens
                          to the data after it arrives. Scope it per incident from the paths above.
           · Smartlead  → yes: campaign recipients and reply content
           · PDL/Hunter → yes: sourced prospect records
           · Stripe     → payment data; we hold reference IDs only
           If NO → record and close. If YES or UNSURE → continue.
   │
   ▼
CLIENT MAP Which clients? Which of their prospects? Which categories?
           Scope from the data, never from the vendor's summary.
   │
   ▼
ROLE       Controller or processor, PER CLIENT.
           Processor → our duty runs to the CLIENT, without undue delay, so they can decide.
           Controller → the regulator duty may be ours.
   │
   ▼
REGULATOR  Does it meet the threshold? [COUNSEL WORDS EACH]
DECISION   · UK GDPR — risk-based, 72 hours to the ICO
           · POPIA   — security compromise, notification to the Information Regulator and to
                       data subjects; the trigger and timing differ from the UK's
           More than one may apply to one incident. Founder decides on counsel's advice.
```

⚠️ **The gating fact.** Our contractual position with every vendor above is **unconfirmed** — no
executed DPAs are held (`EVIDENCE-PACK.md` rows 9, 17). What a vendor owes us on notification,
and how fast, is currently unknown. **This is the practical reason row 17 matters.**

## 6. Evidence to preserve

`error_events` rows · `operator_audit_log` rows for the window · vendor correspondence and status
pages (screenshot — they get edited) · access logs · the timeline written in §2 step 3 · every
internal decision and who made it.

## 7. Where the record of the incident lives

**The Vida document home** (Prompt 10 — `governed_documents`, `/vida/governed-documents`), which
is append-only with a supersede chain, so an incident record cannot be quietly edited afterwards.
Until an incident record is filed there, `docs/legal/it-security-pack.md` §7.3 names the incident
register as the interim home.
