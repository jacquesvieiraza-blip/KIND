> # ⚠️ DRAFT — counsel blesses the legal rows; the founder walks the FAQ before any client sees it
>
> **Nothing here has been served to a client, filed, or published.** Written 20 Aug 2026 by
> reading the repo. On merge these become governed documents in the **Vida document home**
> (Prompt 10, `/vida/governed-documents`) — **one copy**, per the founder's own rule.
> ⚠️ Merging does **not** move them automatically: filing them in Vida is a manual step.

# THE TRUST ROOM — index and walk-through

## The presentation rule

**We never say "compliant."** Compliance is a regulator's conclusion, not a claim we award
ourselves. What we do instead, in this order:

> **what we process · why · where it goes · the basis · the controls · the rights process · the evidence**

Every row below either cites the file, line, table or lock that proves it — or says it has no
evidence yet. **A trust pack that asserts without citing is worse than no trust pack**, because
the first thing a serious buyer does is check one claim at random.

## The twelve items

| # | Item | Status | Where it lives | Owner |
|---|---|---|---|---|
| 1 | **RoPA** — record of processing activities | **OPEN** | not written | 🧍 |
| 2 | **Role / data-sharing map** — controller vs processor, per client and per data category | **OPEN** | Partly in `BREACH-RESPONSE-DRAFT.md` §3, which needs it. Not a standalone map | 🧍 counsel |
| 3 | **DPIA / impact assessment** | **OPEN** | Not started. POPIA also requires a personal information impact assessment (`SA-INFORMATION-OFFICER-CHECKLIST.md` §3) | 🧍 counsel |
| 4 | **Data boundary** — what is client-confidential, what is ours, what never crosses | ✅ **VERIFIED** | `DATA-BOUNDARY.md` — every bucket cited to code | 🤖 |
| 5 | **TOMs** — technical and organisational measures | ✅ **VERIFIED (per row)** | `SECURITY-TOMS.md` — 12 control families, each VERIFIED / FOUNDER-CONFIRMS / NOT YET | 🤖 + 🧍 |
| 6 | **Incident pack** | ✅ **VERIFIED (draft)** | `BREACH-RESPONSE-DRAFT.md` + `docs/legal/it-security-pack.md` §7. ⚠️ Thresholds unworded — counsel | 🧍 counsel |
| 7 | **Rights system** — access, correction, deletion, opt-out | **PARTIAL** | Opt-out is real and cited (`DATA-BOUNDARY.md` ③). Access/correction/deletion clocks are stated in `it-security-pack.md` §6; **no runbook, no request log** (`EVIDENCE-PACK.md` row 13) | 🤖 + 🧍 |
| 8 | **Retention schedule** | ✅ **VERIFIED (written)** | `docs/legal/it-security-pack.md` §6 — per-category table. ⚠️ **Written, not verified as enforced** | 🤖 |
| 9 | **OAuth / platform audit** | ✅ **VERIFIED** | Google scopes narrowed 20 Aug — `apps/api/src/lib/gcal.ts`; pinned by `gcal-scopes.test.ts`. We no longer ask to read event contents | 🤖 |
| 10 | **Sensitive-data policy** — special-category data | **OPEN** | No written rule that we do not target or store special-category data. **A buyer will ask** | 🧍 counsel |
| 11 | **Sub-processor file** | **PARTIAL / COUNSEL** | The **list** is published (`apps/website/dpa.html`). The **contracts** are not held — `EVIDENCE-PACK.md` rows 9 and 17 | 🧍 |
| 12 | **Privacy change gate** — no silent change to what we claim | ✅ **VERIFIED** | Site claims are guard-enforced: `website-residency-claims.test.ts` (banned literals incl. residency + consent claims), `website-money-claims.test.ts`, and the freeze manifest `website-freeze.test.ts` (#605 — any website change fails the gate until re-frozen as a post-approval act) | 🤖 |

**Score, stated plainly: 5 VERIFIED · 3 PARTIAL · 4 OPEN.** The machine-side is strong; the
paper-side is thin. That is the honest shape of this business today, and saying so is more
persuasive to a serious buyer than a page of green ticks.

## How to walk it

1. **Open with the rule above.** Say we do not claim compliance; say we show evidence.
2. **Item 4 first** — `DATA-BOUNDARY.md`. It answers *"do you use my data for other customers?"*
   in thirty seconds with a grep as the receipt. It is the question behind most others.
3. **Item 5** — `SECURITY-TOMS.md`, control by control. Do not skip the NOT YET rows: reading
   them aloud is what makes the VERIFIED rows believable.
4. **Item 6** — what happens if it goes wrong, including when a *vendor* is breached.
5. **`CLIENT-SECURITY-FAQ.md`** for the ten questions they will actually ask.
6. **Say what is open.** Items 1, 2, 3, 10 are open. A buyer who finds one you hid stops
   believing the eleven you showed.
