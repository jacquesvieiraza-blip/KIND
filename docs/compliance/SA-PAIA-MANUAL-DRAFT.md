> # ⚠️ DRAFT FOR COUNSEL — NOT FILED, NOT PUBLISHED, NOT RELIED ON
>
> **Nothing in this document has been filed with any authority, published to any client, or
> acted on.** It exists so counsel has a starting draft instead of a blank page. Every bracketed
> field is a decision counsel makes, not a gap to be filled in by anyone else.
>
> Written 20 Aug 2026 by reading the repo. Where this document states a fact about our systems,
> the file it came from is cited so counsel can check it rather than trust it.
>
> **⚠️ TWO THINGS COUNSEL DECIDES BEFORE THIS GOES ANYWHERE.**
> **(1) Does PAIA apply to us at all?** K.I.N.D Technologies Ltd is a **UK company**. Whether a
> foreign private body operating into South Africa is a "private body" under PAIA s1 is a legal
> question this draft does not answer and must not be read as answering.
> **(2) Does this match the Regulator's template?** The Information Regulator publishes a
> section-51 manual template. **We do not hold a copy and could not read one** — the structure
> below is built from the prescribed contents of the Act as understood, and **must be checked
> against the Regulator's published template before filing.** No claim of conformity is made.

# PAIA Section 51 Manual — DRAFT

## 1. Particulars of the private body

| Field | Detail |
|---|---|
| Registered name | K.I.N.D Technologies Ltd |
| Company number | 17260532 (United Kingdom) |
| Registered office | 33 Townsend Road, CV37 7DE, United Kingdom |
| Nature of business | Managed B2B outbound lead generation and meeting booking |
| SA presence | [COUNSEL: describe — no SA registered entity; team members resident in SA] |
| Postal address for requests | As above |
| Email for requests | privacy@get-kind.com |
| Website | https://www.get-kind.com |

## 2. Information Officer

| Field | Detail |
|---|---|
| Information Officer | The head of the private body — **the founder** (see `SA-INFORMATION-OFFICER-CHECKLIST.md`) |
| Contact | privacy@get-kind.com |
| Deputy Information Officer(s) | [COUNSEL: whether any are required] |
| Registered with the Information Regulator? | **Not yet** — see the checklist document |

## 3. Guide under section 10

The Information Regulator has published a guide on how to use PAIA. [COUNSEL: confirm the
current location and how we are required to reference it.]

## 4. Records held, by category

⚠️ **SOURCE NOTE.** The prompt for this document said to use "the DSAR runbook's table list".
**There is no DSAR runbook file** — verified when building `EVIDENCE-PACK.md` row 13 (searched
`docs/legal/` and `docs/*.md`; the hits are references, not a procedure). The table below is
therefore taken from **`docs/legal/it-security-pack.md` §6**, which is the only real per-category
record table we hold, read end to end. Counsel should treat the categories as ours and the
retention periods as our stated policy.

| Category of record | Held where | Retention (stated policy) |
|---|---|---|
| Lead personal data (name, role, employer, work email) | `leads` — Supabase eu-west-1 | Active campaign + 12 months |
| Client account data | `clients` and related | Contract + 24 months |
| Email content of sent campaigns | Campaign tables + Smartlead | 12 months |
| Suppression / opt-out records | `opt_out_blocklist` (email + reason) | Retained — a suppression record must outlive the data it suppresses |
| Operator action audit | `operator_audit_log` | [COUNSEL: no period stated in §6] |
| Billing records | Stripe + local reference IDs | 7 years (UK tax law) |
| System logs | `error_events` and platform logs | 90 days |
| Auth tokens / sessions | Supabase auth | 1 hour inactivity / 30 days absolute |

⚠️ **Written policy, not verified enforcement.** §6 describes auto-purge for email content; that
job has **not** been verified to run. Do not represent these periods as enforced.

## 5. How to request access

1. Request in writing to **privacy@get-kind.com**, on the prescribed form once counsel confirms which.
2. State the record sought, the right being exercised, and the form of access wanted.
3. Provide proof of identity. [COUNSEL: what we may lawfully require.]
4. We respond within the period the Act prescribes. [COUNSEL: state it.]

## 6. Fees

[COUNSEL: the prescribed request fee and access fee, and whether we charge them.]

## 7. Grounds for refusal

[COUNSEL: the Chapter 4 grounds we may rely on — third-party privacy, commercial information,
legal privilege — stated in the Act's terms.]

## 8. Remedies

[COUNSEL: internal remedy, complaint to the Information Regulator, application to court.]

---

**Availability once approved:** published on the website and provided on request.
**Review:** annually, or on any material change to the records held.
