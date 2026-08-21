# 🔬 THE DEEP-AUDIT PROMPT — paste this when you want a real audit

> **Why this file exists.** Every audit I ran by searching the code came back "clean" and then the founder found something within minutes. The reason is mechanical, not attitudinal: **grep only returns what you already suspected.** Every bug that has actually cost us money lived either in a line that reads correctly on its own, or in the gap between two files that are each correct. No keyword joins those. The prompt below forces the method that does find them.
>
> Founder-requested 26 Jul: *"in the future give me the prompt for you to do a deep audit."*

---

## THE PROMPT — copy from here

```
Deep audit. Not a search — a read.

RULES, and breaking any one of them invalidates the audit:

1. NO GREP AS EVIDENCE. Grep is allowed only to build the file list. Every finding
   must come from reading a file top to bottom. If you cannot name the line you
   read, you did not find it.

2. READ THE WHOLE FILE. No skipping to the "relevant" function. The last four real
   bugs were all in lines that look fine in isolation — a default value, a discarded
   response, a hardcoded constant, a status string.

3. TRACE WHAT EACH FILE ASSUMES ANOTHER FILE DID. This is where the expensive bugs
   live. For every file, write down: what does this trust that it does not check?
   Then go open that other file and see whether it is true. Example of the class:
   stripe.ts credits the wallet, onboarding-pack.ts grants the pack from the same
   purchase row — each correct, together they pay out twice.

4. FOR EVERY BUTTON AND EVERY WRITE, ANSWER FOUR QUESTIONS:
     a. Can the endpoint refuse? (400 / 404 / 409 / 500 / a false in the body)
     b. If it refuses, does the operator or client SEE it?
     c. Does the label promise what the endpoint actually does?
     d. Can the control disappear once its condition goes false?
   A "no" to (b) is a finding on its own. It is how "I pressed Run and nothing ran"
   happens.

5. FOR EVERY NUMBER ON A SCREEN: where does it come from, and can it be a capped
   read, a client-side computation, or a different source than the screen next to
   it? Two screens reading different sources for the same fact is a finding.

6. FOR EVERY CATCH AND EVERY .catch(() => {}): what state does the user see when
   this fires? "Nothing" is a finding — a failed load that renders as an empty list
   is indistinguishable from "nothing to do".

7. FOR EVERY DEFAULT VALUE (?? 20, || 587, ?? 5): is it a sensible fallback, or is
   it silently capping real behaviour? The $99 pack sourced 20 people instead of 200
   because of one `?? 20`.

8. CHECK THE DOC AGAINST THE CODE, IN THAT DIRECTION. Find the doc's claim, then go
   prove or disprove it in the code. Never the reverse — reading code and then
   finding a doc that agrees is confirmation bias.

9. REPORT EVERY FINDING WITH: file:line · what it does · what a real user
   experiences · why nobody caught it. If you cannot write the "what a real user
   experiences" sentence, it is not a finding, it is a style opinion — drop it.

10. SAY WHAT YOU DID NOT READ. Name the files and the percentage. An audit that
    does not state its own coverage is a claim, not a result.

SCOPE — audit BOTH sides, because one cannot run without the other:
  • MILLA (apps/portal) — what the paying client sees and touches
  • VIDA (apps/admin) — the console we operate Milla FROM. If Vida lies, the
    operator makes the wrong move and the client pays for it.
  • THE MONEY PATH — stripe.ts, approve-lead.ts, onboarding-pack.ts, figsy.ts,
    start-work.ts, and every RPC they call
  • THE SEND PATH — sending-inbox.ts, mailer.ts, figsy.ts, and every gate on it
  • THE REPLY/BOOK CHAIN — inbound webhook → classify → qualify → book

FORBIDDEN OUTPUTS:
  • "No issues found" without a coverage statement
  • Any finding whose evidence is a grep hit
  • Fixing anything. Report only, unless I say fix.

Report as a table, most severe first. Then stop.
```

## Stop here

---

## Why each rule is in there — the bug that earned it

| Rule | The bug that put it there |
|------|---------------------------|
| **1. No grep as evidence** | Three audits reported "all trust boundaries clean" while `figsy.ts:26` shared one sending address across every client. Nothing I searched for would have named it. |
| **2. Read the whole file** | The billing page's `$4 per approved lead` sits in four separate places, none of them near a keyword I'd have searched. |
| **3. Trace the assumption** | **The $99 double-pay.** `stripe.ts` credits $99 to the wallet; `onboarding-pack.ts` grants 100 free approvals off the same row. Neither file is wrong. Together, $99 buys ~124 leads. |
| **4. Four questions per button** | Vida's **Run** discards the API response — a refused start is invisible, and the operator believes the campaign is live. Also the Delete button that deleted nothing, and the migration card that hid itself once `client_inboxes` existed. |
| **5. Every number's source** | "0 to triage" beside "152 replies to handle" — two screens counting the same fact from different queries. And nine `.limit(20000)` reads presented as totals. |
| **6. Every silent catch** | 15 swallowed writes in the MBF seed reported success. A failed worklist load renders as "nobody needs you". |
| **7. Every default value** | `leads_per_run ?? 20` capped the $99's 200-record target at 20. `daily_drip_rate ?? 5` then trickled even those out. |
| **8. Doc → code, that direction** | `BUILD-STATUS.md` said *"the ONLY items not built: #515 + CI"* while the whole sending spine was 🔴. Reading code first and finding an agreeing doc is how that survived. |
| **9. "What a real user experiences"** | Forces the difference between a real defect and a tidiness note. The founder does not have time for the second. |
| **10. State your coverage** | ~6,000 of 90,458 lines had been read (≈6%) while I was reporting audits as complete. |

## The one-line version

**An audit is a reading exercise. If it was fast, it was a search, and a search only ever confirms what you already believed.**
