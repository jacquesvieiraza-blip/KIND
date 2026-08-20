# 🧾 DSAR & erasure runbook — one person, by email

> **⏱️ YOU HAVE ONE MONTH.** UK/EU GDPR gives a controller **one calendar month** from receipt to respond to a subject access or erasure request (extendable by two further months for complex requests, but only if you tell them inside the first month why). POPIA runs to a "reasonable time". **Start the clock the day the email arrives, not the day you get to it.**
>
> **⚠️ NO TOOLING EXISTS. Every step here is manual**, run by the founder as a one-off against the database. There is no DSAR button, no export job, no delete job. That is stated at the top rather than buried, because a runbook that reads like a feature is how a legal deadline gets missed waiting for a screen that was never built.

*Created 20 Aug 2026 (Prompt 7). Table and column lists were **read from the schema and the live data**, not taken from the prompt — see "What the brief got wrong" at the end.*

---

## 0 · Before you touch anything

1. **Record the date received.** The clock is legal, not internal.
2. **Verify who is asking.** You may ask for reasonable identification, but you may not use that to stall. If they wrote from the address in question, that is normally enough.
3. **Decide which request this is** — they are different jobs:

| They asked for | You owe them | Section |
|---|---|---|
| *"What do you have on me?"* | a copy of the data **and the derived data** | **§2 + §3** |
| *"Delete me"* | erasure, minus what must be kept | **§4** |
| *"Stop emailing me"* | suppression only — **not** erasure | **§5** |
| *"That's wrong, fix it"* | rectification, and tell the recipients | **§4.4** |

⚠️ **"Delete me" and "stop emailing me" are not the same request, and getting them backwards is the classic own-goal** — see §5.

---

## 1 · Where a prospect's data lives — VERIFIED against the schema

Every table below was confirmed by reading `supabase/migrations/*.sql` and the live `leads` export (20 Aug). **This list is longer than the brief's.**

### 1.1 Keyed directly on the person

| Table | Columns holding their data | Notes |
|---|---|---|
| **`leads`** | `email`, `first_name`, `last_name`, `phone`, `job_title`, `company`, `linkedin_url`, `country`, `industry`, `seniority`, `company_size`, `tech_stack`, `apollo_id`, `consent_token` | **40 columns** on the live table — the master record |
| **`lead_pool`** | `email_norm`, `first_name`, `last_name`, `title`, `seniority`, `company`, `industry`, `company_size`, `country`, `linkedin_url`, `source`, `acquisition_cost` | ⚠️ **Cross-client.** Deleting the `leads` row does NOT touch this, and this is the copy that gets re-served to another client |
| **`opt_out_blocklist`** | `email`, `full_name`, `whatsapp_number`, `reason`, `opted_back_in_at` | ⚠️ **KEPT on erasure — see §4.3** |
| **`lead_enrichment`** | `lead_id`, `recent_signal`, `company_context`, `opening_line`, `enrichment_score` | Derived profile text about them |

### 1.2 Keyed on `lead_id`

| Table | Columns |
|---|---|
| **`figsy_enrollments`** | `lead_id`, `status`, `current_step`, `next_send_at` |
| **`figsy_sent_emails`** | `lead_id`, `subject`, `body`, `resend_id`, `sent_at`, `opened_at`, `client_id` |
| **`figsy_replies`** | `lead_id`, `from_email`, `subject`, `body`, `classification`, `classification_reasoning`, `raw_payload` |
| **`figsy_approval_queue`** | `lead_id`, `to_email`, `subject`, `body` |
| **`calendar_bookings`** | `lead_id`, `google_event_id`, `meeting_title`, `meeting_link`, `start_time` |
| **`outcome_events`** | `lead_id`, `event_type`, `payload` |
| **`whatsapp_messages`** | `to_number`, `lead_id`, `message` — *if the table exists; the code writes it best-effort and falls back* |

### 1.3 Free-text tables that may mention them

**No `lead_id`, so these need a text search, not a key lookup.** Easy to miss and easy to under-answer a SAR with.

`operator_audit_log.detail` · `founder_alerts.subject/body` · `dead_letter.payload` · `figsy_chat_messages.content` · `vida_messages.content` · `milla_messages.content` · `credit_transactions.note`

---

## 2 · What a SAR must answer with — beyond rows containing the email

⚠️ **A SAR is not "SELECT * WHERE email = …".** They are entitled to the personal data you hold *and* information about the processing. Ours is heavily derived, and the derived part is the part people actually object to.

| What | Where it lives |
|---|---|
| **FIGSY score + the reasoning** | `leads.score`, `leads.score_reasoning` — free text explaining why they were ranked |
| **Profiling / research** | `lead_enrichment.recent_signal`, `.company_context`, `.opening_line`, `leads.research_summary` |
| **Reply classification** | `figsy_replies.classification` + `.classification_reasoning` — an AI judgement about their intent |
| **Suppression status** | `opt_out_blocklist` (present/absent, `reason`, `opted_back_in_at`), `leads.status`, `leads.opted_out_at` |
| **Campaign membership** | `figsy_enrollments`, `leads.smartlead_campaign_id` |
| **What we sent them** | `figsy_sent_emails.subject/body` — every message, verbatim |
| **Who we gave them to** | §3 |
| **Source** | `leads.source`, `lead_pool.source`, `leads.apollo_id` — **where we got them, which is the Art. 14 question they usually mean** |

---

## 3 · The recipient ledger — who else has this person

Under **Art. 19**, on erasure or rectification you must inform each recipient **unless it proves impossible or involves disproportionate effort**, and tell the person who the recipients were if they ask.

| Recipient | How to find it | Who informs them |
|---|---|---|
| **The client** | `leads.client_id` | **K.I.N.D informs the client.** They are a separate controller of their own copy |
| **The client's CRM** | `leads.crm_synced`, `.crm_synced_at`, `.crm_contact_id`, `.crm_deal_id` | K.I.N.D tells the client; **the client deletes in their CRM** — we cannot reach it |
| **Smartlead** | `leads.smartlead_campaign_id` | ⚠️ **Founder removes them by hand in the Smartlead dashboard.** There is no remove API — registered in `smartlead.ts`'s `NOT_POSSIBLE` |
| **Instantly** | parked (`HOUSE_CLIENT_ID` unset) — nothing pushed | n/a today |
| **Hunter / PDL / Apollo** | they are **sources**, not recipients | See `UPSTREAM-DSR-PROPAGATION.md` |
| **CSV exports** | `leads.exported_at` tells you an export happened — ⚠️ **it does not say to whom or which columns** | Founder must recall; see the gap below |

### ⚠️ Two gaps, named rather than glossed

1. **No Smartlead receipt is stored.** `smartlead_campaign_id` (added 20 Aug) records *that* they were pushed and to which campaign. Nothing records *when*, or which fields went. Before that column existed, **nothing recorded it at all** — for anyone pushed before 20 Aug, the honest answer is that we cannot reconstruct it from data.
2. **No export ledger.** `exported_at` is a timestamp with no counterparty. If someone asks "who did you give my data to", an export can be *acknowledged* but not *itemised*.

Both should be said plainly to the person rather than papered over. **An honest "we cannot reconstruct that, and here is why" is a lawful answer; a confident wrong one is not.**

---

## 4 · Erasure — the order to do it in

**Do it in this order.** Deleting `leads` first orphans everything keyed on `lead_id` and you lose the ability to find the rest.

### 4.1 Find and freeze

```
1. leads WHERE lower(email) = <address>      → note every id (there may be several: one per client)
2. lead_pool WHERE email_norm = <normalised> → note it, this is the cross-client copy
3. Add them to opt_out_blocklist FIRST       → so nothing sends mid-erasure
```

⚠️ **Suppress before you delete.** A cron between your delete and your suppression will happily re-source and re-enrol them.

### 4.2 Delete, children first

```
4. figsy_sent_emails, figsy_replies, figsy_approval_queue, figsy_enrollments,
   calendar_bookings, outcome_events, lead_enrichment, whatsapp_messages   WHERE lead_id IN (…)
5. Text-search the free-text tables in §1.3 and redact the mentions
6. leads          WHERE id IN (…)
7. lead_pool      WHERE email_norm = <normalised>     ← the one most likely to be forgotten
```

### 4.3 ⚠️ WHAT IS DELIBERATELY KEPT — and why it is not a loophole

**The `opt_out_blocklist` row stays.**

Deleting it would remove the only record that this person objected — so the next sourcing run would fetch them again, and we would email the person who asked us to stop. **Honouring the objection requires remembering it.**

- **Lawful ground:** Art. 17(3)(b) — processing necessary for compliance with a legal obligation; and Art. 21, which requires us to stop processing for direct marketing, which we cannot do without a suppression record. The ICO's published position on marketing suppression lists is the same.
- **Minimised:** the row holds the address and a reason. Nothing else. It is not used for anything but refusal.
- **Say so in your reply.** *"We have deleted your data. We have kept a record of your email address on our suppression list for the sole purpose of making sure we never contact you again — deleting that record is the one thing that would let it happen."*

Also kept: **`figsy_sent_emails` rows may be retained where you need them as evidence of a legal claim** (Art. 17(3)(e)) — but do not reach for that by default. Deleting is the default; keeping needs a reason you would say out loud.

### 4.4 Rectification

Same find step, then correct the value — and **inform the recipients in §3**, because they are working from the wrong data too.

---

## 5 · ⚠️ "Stop emailing me" is NOT an erasure request

This is the single most dangerous confusion in this document.

If someone says *"unsubscribe"* or *"stop emailing me"*, they have made an **Art. 21 objection**. The correct response is to **add them to `opt_out_blocklist`** and stop.

**Do not delete them.** If you erase a person who only asked to stop hearing from you, you destroy the record of their objection — and the next sourcing run puts them straight back in the book. **You would have "complied" your way into contacting them again.**

Erase only when they actually ask to be erased. If it is genuinely unclear which they meant, **ask them.**

---

## 6 · Data location matrix — everywhere beyond the database

Rows are only half the answer. These are the places data persists that no `DELETE` reaches.

| Location | What is in it | What happens on erasure |
|---|---|---|
| **Supabase backups / PITR** | full row copies | **Cannot be surgically edited.** They age out on the plan's retention window. 🧍 **Founder confirms the tier and the window** — then this line states it, and the reply to the person says it |
| **Railway application logs** | **69 log sites** in `apps/api/src` emit an address or message text (counted 20 Aug — see the note at the end). Reply snippets, prospect emails, refusal reasons | Not individually deletable. **Ages out on Railway's retention.** 🧍 **Founder confirms the window** |
| **Founder alert emails** | `sendFounderAlert` puts **reply snippets and prospect addresses in the founder's inbox** | Delete the alert emails from that mailbox by hand. Nothing else can |
| **Anthropic API** | lead name, company, title and reply text are sent in prompts | Per Anthropic's terms, ~30-day default retention with zero-retention available on request. 🧍 **Founder confirms which applies to our account** |
| **Google Calendar** | booked meetings carry the prospect's name and email | Delete the event in **the client's** calendar — it is their calendar, so the **client** must do it |
| **CSV exports** | whole rows, wherever they were sent | Unrecoverable once sent. See the gap in §3 |
| **Smartlead** | their own copy of the lead | **By hand in their dashboard.** No API — `NOT_POSSIBLE` |
| **Resend / SMTP provider** | delivery metadata and message content | Provider retention; not deletable by us |

⚠️ **Say the ones that age out, in the reply.** *"Your data has been removed from our systems. Copies inside encrypted backups and server logs are not individually deletable and are automatically overwritten within X days."* That is truthful and is normally accepted. **A silent omission is not.**

---

## 7 · Replying

1. Answer inside the month.
2. Say what you deleted, what you kept (§4.3) **and why**, and what ages out (§6).
3. If you cannot reconstruct something (§3's two gaps), **say that** rather than implying completeness.
4. Log it — date received, date answered, what was done. **There is no table for this yet**; use the session log until there is.

---

## ⚠️ What the brief got wrong — corrected, not copied

The prompt asked for this list to be verified rather than trusted. It was, and three things did not survive:

1. **`crm_pushed_at` does not exist.** The live columns are `crm_synced`, `crm_synced_at`, `crm_contact_id`, `crm_deal_id`, `crm_existing`, `crm_match_reason`.
2. **"92 log sites" could not be reproduced.** Counted 20 Aug across `apps/api/src` excluding tests: **69** matching a broad email-or-body pattern, **53** naming an email variable specifically. The figure here is 69, with the method stated so it can be re-run. *(Neither count is a claim about how many entries exist — only about how many places in the code can write one.)*
3. **The table list was incomplete.** `lead_enrichment`, `whatsapp_messages`, and the seven free-text tables in §1.3 were not in the brief, and `lead_pool` — the cross-client copy that survives a `leads` delete — is the one most likely to be missed in practice.

---

## Related

`docs/compliance/UPSTREAM-DSR-PROPAGATION.md` (deletions coming *from* providers) · **R52** · **R49** (PDL licence gates) · **F2** — whether an opt-out stops us re-*scoring* someone, not merely re-*sending*; **that question is unresolved and it bears directly on §5.**
