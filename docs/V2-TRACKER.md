# 🎯 V2-TRACKER — everything post-live

> **A LIST, not a book** (founder, 21 Aug). Item · one line · trigger. Narrative moved verbatim to
> [`archive/V2-NARRATIVE-2026-08-21.md`](./archive/V2-NARRATIVE-2026-08-21.md) — nothing deleted.
> **Status** lives in PRODUCT-INVENTORY · **why** in KIND-MASTER · **now** in LAUNCH-PAD.

---

## 🗺️ THE POST-LAUNCH BUILD PHASES — phased by evidence, not by date

| Phase / shelf | What is in it | Trigger |
|---|---|---|
| **Phase 0 — THE CURRENT VERSION'S OWN WORK (not a phase gate — it ships before/with client #1)** | #651 — the industry/purpose sequencing engine.** R38-amended + R39: sequencing is **core to all three products and serves the client**, never an add-o… | — |
| **Phase 1 — PROVE IT** | The unlock chain A22→A23→#550 (runbooked) · **#452/#450/#451 multi-engine sourcing** (line-11 ruling: "fires the moment line 10 ticks") · **flip `TRAI… | client #1 in the works → paying |
| **Phase 2 — DEEPEN IT** | #191 value dashboard ("here's your return") · #190 pause-instead-of-cancel + win-back · **WhatsApp client pings (§2b below — opt-in clients only, neve… | client #1 retained, proof accumulating |
| **Phase 3 — COMPOUND IT** | First hire = customer success (R16)** → #276 per-staff logins + #204 Notion trigger · **Lena pulled forward** #145/#293 (both the churn plan and the s… | 4 clients · ~400 approvals/mo (the R15/R16 line) |
| **Phase 4 — SCALE IT** | The intelligence layer #37–53/#143/#120 (RAG → evals → outcome feedback → contextual bandit → pgvector — the reward signal is already logged) · **#476… | ~10 clients, real outcome data flowing |
| **The clean-up shelf — settle, don't build (raises doc-trust, the org-migration's own goal)** | Deletes wearing red dots: #431's subscription retirement · #404 lena.ts (mount or delete) · the parked WhatsApp/Vapi routes whose deletion closes secu… | — |
| **Decisions only the founder can make (each blocks one phase item, none block launch)** | Advanced tier price/shape (safely held by "sell before build") · R2 public posting + channel · analytics provider (or log-to-DB until volume) · inbox… | — |

---

---

# ░ 📌 THE 25TH CUT — PARKED POST-LIVE *(moved here 21 Aug evening, founder-ordered: "if the build or the fix is not to aid the live state it moves post live")* ░

> Every item below was on the launch artifact's board and failed the one test — *does it aid the live state on the 25th?* None is forgotten; none is worked before launch. The artifact mirrors this list until the 25th, then dies; this page is the home.

## Parked builds *(each already has a verified prompt in the launch artifact — reuse it when its day comes)*
- **P34's screens — PR #1427, OPEN and PARKED.** The merged half (#1426: table, routes, prompt consumers) is verified **inert** in production — the brief only reaches a prompt once a client approves one, and without the screens nobody can. Decision on merge day: merge #1427 as-is (was gate-green 21 Aug) or rebuild against then-current main.
- **P35 — the Proof Pack** (founder-only outcomes report in `vida/reports`; HTML only — no PDF lib exists).
- **P36 — Social Intent v1** (client-owned inbound; the "employer floor" term correction is already in its prompt).
- **P37 — CRM v1 — HELD** harder than parked: requires the founder to first record R-CRM-DOWNSTREAM in PRODUCT-RULES (verified absent, 21 Aug).
- **P45 — the Warm-Reply Cockpit** (upgrades the live `/milla/replies` + `/vida/unibox`; must reuse the freebusy LIB, not the two dead calendar routes).
- **P46 — the Bad-Egg Log** (alert taxonomy pinned at 9 kinds; ships WITH its nav link).
- **W1 phases 2–3** — the other 23 site pages · the Drop's 4:3 crop risk · the Nexus sub-brand-or-converge decision.
- **Welcome-transcript capture** (P34 follow-on; own privacy surface).
- **The brief-message removal control** (one stale "3 prospects" line sits in the founder's own thread; O3 forbids a hand delete).
- **The email morning-brief's two defects** — `en-ZA` date locale (contradicts R62) and its button pointing at the retired `/dashboard`.

## Cleanups from the 21-Aug full-system verification *(zero broken clicks found; these are the two structural findings)*
- **Retire or fence the old `/dashboard` page family** — fully functional, reachable only by typed URL since login redirects to `/milla`; it is the layer that keeps misleading build prompts (the figsy-chat near miss).
- **Review the ~40 orphan endpoints** no screen calls (`scripts/dead-surfaces.sh` is the catalogue; webhooks/cron rows are legitimate).
