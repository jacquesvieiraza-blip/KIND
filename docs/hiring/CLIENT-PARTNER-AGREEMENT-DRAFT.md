# Client Partner — commission agreement → MOVED (16 Aug 2026)

> **This file is a pointer, not a copy.** The agreement now lives in code, with the rest of the
> document pack, at **`apps/api/src/lib/partner-documents.ts`**.

## Why it moved

The founder asked for the contracts to be reachable in Vida under Partners (16 Aug). Her vault
menu named five documents and opened none of them — the labels were a hover state with nothing
behind them.

To serve a document to Vida and to her portal in production, it has to travel with the deployed
apps; the `docs/` folder does not ship. Keeping a markdown copy here **as well** would put the
same clauses in two places, and the moment they disagreed nobody could tell which version a
person had signed. So the code module is the single home and this file points at it.

## What is in the pack

| Document | Signed? |
|---|---|
| Commission agreement — 20% land, seat retain rate | yes |
| Non-disclosure agreement | yes |
| Intellectual property agreement | yes |
| Compensation plan, with worked examples | no |
| Payout statements | derived live from commission rows — no file |

Every rate and price in those documents is **interpolated from the constants the product bills
from** (`RATES` in `comp-engine.ts`, `PACK_PRICE_USD` in `@kind/shared`), so a document cannot
say one number while the engine pays another. A test asserts it.

## Still true, and still important

Every document carries, in its own body, the statement that it was **drafted by Claude Code and
not by a lawyer** — on the founder's instruction of 15 Aug 2026, *"Opus drafts. I have no
counsel"* — and that it is **not legal advice**. A test asserts that sentence is still present,
because it is the one line that must never be quietly removed.

The open points for a reviewing lawyer are listed at the foot of each document. The two that
matter most remain **contractor-versus-employee status under South African law** and **governing
law and forum**.
