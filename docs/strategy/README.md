# 🧭 docs/strategy — the founder's strategy corpus, frozen

> **What this folder is.** Twelve files the founder produced with GPT over 8+ hours of product, compliance, legal and website work, committed here **verbatim** on 20 Aug 2026 (Prompt 38). They lived in a ZIP and a wipeable container scratchpad — and were **lost once to a container restart before this PR**, which is precisely why they are now in git. Strategy that can vanish is strategy that gets swept past.

---

## ⚠️ THE SOURCE-OF-TRUTH RULE — read this before quoting anything in here

These files are **direction and audit specifications. They are NEVER proof that a feature exists.**

When they disagree with anything else, this is the order:

| | Source | Why it wins |
|---|---|---|
| 1 | **Founder rulings** (logged in `PRODUCT-RULES.md`) | His decision is the decision |
| 2 | **The repository / runtime** | What the system actually does, provable at a file and line |
| 3 | **The current Ledger / `LAUNCH-PAD.md` / `PRODUCT-INVENTORY.md`** | The verified map of state and open work |
| 4 | **Current regulator / vendor / counsel evidence** | External law and licence facts |
| 5 | **These artifacts** | Direction, history, and the specifications the audits run against |

A marketing page or a strategy artifact **never** overrides code, runtime or legal evidence. Several of these documents describe a target architecture that does not exist yet; several quote counts and states true on **17–19 Aug** and since superseded. That is correct and deliberate — **they are a snapshot, not a live document.**

## ⚠️ THEY ARE FROZEN, AND DELIBERATELY NOT DOC-LINTED

`scripts/doc-lint.sh` checks an explicit `DOCS[]` list; this folder is **not in it, on purpose.**

Every other doc in this repo is linted because an unlinted doc rots unnoticed (the 11-Aug DOC-MAP lesson, R11). **The opposite applies here:** these are the founder's records as written on the day. They quote the retired counts, the pre-fix defect states and the old board numbers — a stale-claim lint would fail them for being *accurate about a past moment*, and "fixing" them would destroy the record.

**So: nothing in this folder is ever edited.** If a fact here is superseded, the correction lives in the Ledger, `PRODUCT-RULES.md` or `KIND-MASTER.md` — never by rewriting a file in this directory.

---

## The twelve files

### Product model & experience

| File | What it is |
|---|---|
| [`get-kind_jack_and_jill_product_model_verification.html`](./get-kind_jack_and_jill_product_model_verification.html) | The differentiated product model: Milla as client intelligence, FIGSY as decision brain, Vida as exception operator · the **Meeting Brief** as one living object · Missions · **calibration before scale** · signals *and* anti-signals · explainable scoring · the Meeting Graph. Its §21 is a complete read-only audit spec (**Prompt 39** runs it). Explicitly *not* an instruction to copy a recruitment marketplace. |
| [`get-kind_milla_website_preview.html`](./get-kind_milla_website_preview.html) | The full Milla-first homepage: *"Meet Milla. Your pipeline, handled."* — hero, live product-state demo, the five-step journey, $4 pricing language, and an **honest proof placeholder that invents no customers**. The basis of **Prompt 30**. |
| [`get-kind_website_positioning_simplicity_verification.html`](./get-kind_website_positioning_simplicity_verification.html) | The positioning audit spec: does the site force a buyer to learn the internal org chart before the outcome? Includes the truthfulness and compliance-claim audits (the HC-5 / §22.5 family) and the public hierarchy Milla → FIGSY → Vida → Nexus. |

### Meetings & yield — the commercial engine

| File | What it is |
|---|---|
| [`get-kind_meeting_booking_engine_strategy.html`](./get-kind_meeting_booking_engine_strategy.html) | The `MEETING_BOOKED` doctrine: sell the response before the meeting · every sequence step earns its place · FIGSY chooses the angle · campaigns as experiments · attribute every booking · **the warm-reply cockpit (§9, Prompt 45)** · `positive_reply_to_booking_rate` as the KPI that finds where interest is lost. |
| [`get-kind_data_sourcing_and_meeting_yield_verification_artifact.html`](./get-kind_data_sourcing_and_meeting_yield_verification_artifact.html) | **The superset.** Sourcing evidence-graph + signal engine (§1–17) **and** the meeting-yield half (§18–32): campaign objective hierarchy, evidence-based personalisation, booking friction, no-show reduction, qualified-meeting definition. **Prompt 40** runs its §31 spec. |
| [`get-kind_data_sourcing_verification_artifact.html`](./get-kind_data_sourcing_verification_artifact.html) | ⚠️ **CONTAINED WITHIN the file above.** This standalone sourcing artifact is §1–17 of the meeting-yield superset — same content, narrower scope. **One audit (Prompt 40) covers both**; it is kept because it is one of the founder's records and nothing here gets deleted. |

### Growth surfaces — post-launch tracks

| File | What it is |
|---|---|
| [`get-kind_social_intent_feasibility_verification.html`](./get-kind_social_intent_feasibility_verification.html) | The social-intent architecture: signal → intent classification → identity resolution → enrichment → **permission gate** → FIGSY → campaign. The lead-class ladder (Cold ICP → Signal ICP → Social Intent → Inbound Social), approved APIs only, **scraping explicitly refused**, and the rule that social engagement is *never* automatic permission to contact. **Prompt 36** builds the client-owned inbound v1; **Prompt 42** audits the full architecture. |
| [`get-kind_crm_expansion_reengagement_feasibility.html`](./get-kind_crm_expansion_reengagement_feasibility.html) | Client CRM as system of record, K.I.N.D as system of action. Closed-won → expansion candidates · closed-lost → re-engagement, with hard exclusions and cool-downs, and the standing rule **"Closed Lost does not mean safe to contact"**. **Prompt 37** builds the CSV-first v1. |
| [`get-kind_vida_post_10_client_autonomy_verification.html`](./get-kind_vida_post_10_client_autonomy_verification.html) | Vida's autonomy ladder (Levels 1–4, target **3 not 4**), the bounded tool registry, per-tool policy limits, hard human-approval boundaries, reversibility, the **bad-egg log** (§11 — built as **Prompt 46**) and the readiness gates. Deliberately post-10-clients: *do not automate unknown behaviour*. **Prompt 41** audits it. |

### Market & context

| File | What it is |
|---|---|
| [`get-kind_competitive_market_benchmark_verification_log.html`](./get-kind_competitive_market_benchmark_verification_log.html) | The 17-Aug market snapshot — Alta · 11x · Artisan · Regie.ai · Unify · Amplemarket · Apollo · Clay · Outreach · 6sense — and the spec for verifying where K.I.N.D actually stands, with **executable production evidence only**. **Prompt 43** runs it. Source of eight steals now logged as items **655–662**. |
| [`MASTER_CONTEXT.md`](./MASTER_CONTEXT.md) | The reconstructed handoff of the whole GPT conversation: company/launch context, the Milla/FIGSY/Vida model, global compliance architecture, the HC-1…HC-6 findings, UK/US/SA posture, controller-processor mapping, provider licence rights, rights propagation, data locations, sensitive data, Trust Room, contracts, the AI authority ceiling and the privacy-change gate. ⚠️ Its own header states it is a **reconstruction, not a byte-for-byte ChatGPT export**. |
| [`CURRENT_CROSSCHECK.md`](./CURRENT_CROSSCHECK.md) | The independent cross-check after the 19-Aug ledger update: the PDL escalation, the Apollo provenance rule, the removal of *"nothing unlawful has happened"*, provider-specific 451 handling, controller-to-controller documentation, OAuth scope minimisation, and the email-pixel wording. **Every item was adjudicated in the ledger; every one was adopted.** |

---

## What is NOT here, and where it went

The founder's handoff bundle also contained material this folder deliberately does not carry, so the omission is visible rather than silent:

- **PDF renderings** of the ten HTML artifacts — identical content, larger files. The HTML is the source.
- **9 website-preview screenshots** (18 Aug) — images of the Milla preview, whose HTML *is* here.
- **5 earlier source ledgers** (`Pasted markdown(4)…(9).md`) — superseded by the current Ledger and the four canonical docs.
- **4 compliance source documents** (`global_compliance_v2`, `v2_1_verified`, and the "how a company becomes compliant" PDF) — earlier baselines; the operative compliance position lives in the Ledger, `MASTER_CONTEXT.md` §4–14 and the counsel pack.
- **`START_HERE.html`, `ARTIFACT_MANIFEST.md`, `FILES.txt`, `README_FOR_FABLE.md`, `PASTE_TO_FABLE.txt`** — navigation for the ZIP; this README replaces them.

If any of that is later needed in git, it is a bounded founder-authorised addition — not something to re-derive.

---

## The audits these files drive

Five read-only audits run **against the repository, using these documents as the specification** — each one instructs Opus to open the named file, read it completely, and execute *its own* embedded instruction verbatim rather than a summary of it:

| Prompt | Artifact | Produces |
|---|---|---|
| **39** | Jack & Jill | Meeting Brief / Missions / calibration gap map |
| **40** | Sourcing & meeting yield | Sourcing gaps + yield gaps, split commercial vs compliance |
| **41** | Vida autonomy | Which autonomy level the code safely supports, and what is missing |
| **42** | Social intent | GO / GO-WITH-PREREQUISITES verdict + first-source recommendation |
| **43** | Competitive benchmark | Where K.I.N.D genuinely stands, capability by capability |

---

*Committed 20 Aug 2026 by Prompt 38, verbatim and checksum-verified against the founder's handoff bundle. Twelve files, sha256-matched at copy time. Nothing in this folder is edited — corrections live in the Ledger, `PRODUCT-RULES.md` or `KIND-MASTER.md`.*
