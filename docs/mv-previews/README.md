# 🎨 Milla&Vida — design references (22 Jul pivot)

> **What this is:** the self-contained HTML mockups that anchor the **22-Jul managed-service pivot** (full decision → KIND-MASTER session log; build tickets → PRODUCT-INVENTORY #477–#490; the 14-day map → LAUNCH-PAD). These are **design references, not the product** — open them in a browser to see the intended look/flow. They are not wired to any code and do not deploy. Status of record lives only in PRODUCT-INVENTORY.

## The model in one line
**FIGSY** = the engine (no longer sold standalone) · **Vida** = the operator console (WE run ICP → source → draft → approve → send → triage → book) · **Milla** = the client portal (client reviews **masked** leads and clicks 👍 approve / ✕ pass) · **Nexus** = the per-client private learning brain. The **$4 fires only on the client's 👍 approve** ($1 reveal + $3 work); reviewing is free; leads stay masked until approved (approve-then-reveal).

## Files
| File | What it shows |
|------|---------------|
| `home.html` | Milla&Vida homepage concept on the current site framework — the managed-service story (approve-then-reveal, agents' new roles, Nexus per-client). |
| `milla2.html` | **Milla** — the client portal. Masked lead desk with 👍/✕ approve-to-pursue, concierge chat, meetings, reports; keeps the current top-bar credits + account dropdown + left nav. |
| `vida2.html` | **Vida** — the operator console. The full run-the-loop surface with the **client-picker** and the admin "nervous system" folded in as the **top-right dropdown**. |
| `flow-milla.html` | Visual flow of the **client's** side — what a client sees and does in Milla. |
| `flow-vida.html` | Visual flow of the **operator's** side — the end-to-end loop we run in Vida. |
| `flow-dogfood.html` | **Client Zero** — how we find our own leads with our own system (our outreach IS the demo). |
| `roadmap.html` | The **2-week build**: Website → Vida (the real part) → Milla, aligned to payday; reuse (~70%) vs re-skin vs new. |

## Superseded / not included
Earlier single-version mockups (`milla.html`, `vida.html`) are superseded by `milla2.html` / `vida2.html` and were intentionally left out to avoid confusion. The older `docs/previews/` directory holds the pre-pivot portal previews — kept for history, unrelated to this pivot.
