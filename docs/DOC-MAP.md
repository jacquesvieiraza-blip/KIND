# 🗺️ K.I.N.D — DOC MAP (every doc · what it's for · how it stays honest)

> **The index of every doc in the repo.** Three tiers: **LIVING** (maintained — must always match code + the locked model), **ARTIFACT** (dated one-offs — frozen, never updated, read as history), **ARCHIVE** (superseded — do not use). If a doc isn't listed here, it isn't tracked — add it.
> `Last-restructured: 9 Jul 2026` (doc-management reset: status stripped from non-inventory docs, doc-lint firewall added, dead docs archived). Sweep history lives in the KIND-MASTER session log, not here.
> `Last-reconciled: 21 Aug 2026` — see both boxes below.

> ### ⚠️ RECONCILED 21 AUG — two whole folders existed and were indexed nowhere
> Found by an outside read-only audit of the docs, not by any script. **[`compliance/`](./compliance/) (10 files) and [`runbooks/`](./runbooks/) (2 files) were completely absent from this map** — including `EVIDENCE-PACK.md`, the register that records which legal paper we actually hold. Both folders are now indexed above, one row per file, each description read from the file's own header.
>
> **The 11-Aug audit below was not wrong — it was overtaken.** Every file in both folders was written on **20 Aug**, nine days after that sweep ran, and nothing re-ran it. That is the same rot in a new place: **this map still has no check that compares the folders on disk against the folders on this page.** Until it does, a folder created after any given sweep is invisible by default. *(A disk-vs-map lint is the fix and is **not** built — it does not aid the 25th, so it is post-live per R65.)*

> ### ⚠️ RECONCILED 11 AUG — this page was missing 9 docs and 5 folders, and carried a false price
> The founder asked whether this map actually held *"all relevant docs and links"*. Audited by script rather than by eye — every `.md`/`.html` in `docs/` compared against every link on this page:
>
> - **9 docs existed and were listed nowhere**, including **[`SEND-DAY-RUNBOOK.md`](./SEND-DAY-RUNBOOK.md) — the document the founder executes alone on send-day (A14)**, plus the backup drill, the RLS audit and the seed-wipe plan. All added below.
> - **5 folders were unlisted**: `marketing/` · `design-reference/` · `mv-previews/` · `reports/` · `assets/`.
> - **The `run-costs-and-cashflow.md` row said the money model was a `$99` onboarding pack** — it has been **$299 since 3 Aug** (PR1 · #609), and the target doc's own §1 has said `$299` the whole time. **This page was describing a price the repo abandoned five weeks ago.**
> - ✅ **0 broken links** — every target on the page resolves.
>
> **Why it rotted: `DOC-MAP.md` was not in `doc-lint`'s `DOCS[]` list.** That is the identical failure to `sales-playbook.md` on 6 Aug (R11) — the index of every doc was itself unchecked. **Added to the lint in the same commit.** A map nothing verifies is a map that quietly stops matching the territory.

## How docs stay honest (the freshness system — RULEBOOK §10)
1. **One owner of truth per fact.** Status → PRODUCT-INVENTORY · today → LAUNCH-PAD · strategy/history → KIND-MASTER · future → V2-TRACKER · pricing → `packages/shared/src/constants/index.ts` mirrored once in `run-costs-and-cashflow.md` §0. A sub-doc may *explain* a fact, never *own* it.
2. **`scripts/doc-lint.sh` is the firewall** — fails any commit where a board drifts, a Status column appears outside the inventory, or a banned stale claim (trial CTAs, agent $/mo, 250M, ARPU/MRR framing) lands on a non-history line. **⚠️ CORRECTED 2 Aug (#608) — this line used to end "CI runs it on every PR touching `docs/`". It does not. ⚠️ RE-CORRECTED 6 Aug — the 2-Aug correction over-corrected:** "never has" was false. Actions ran **788 times, 25 May → 3 Jul** (though `doc-lint.yml` itself, created 9 Jul, genuinely never ran — it was born six days after the flag killed Actions). The 27 Jul API check behind "0 runs ever" was blind: it reads 0 where the Actions tab shows 788. Present truth unchanged: nothing runs since 3 Jul, support is unresponsive, **`scripts/check.sh` run by hand IS the only gate**, and `scripts/ship.sh` is the only deploy.
3. **Update-on-change, same session.** When the thing a LIVING doc describes changes, update the doc or flag it stale at the top — never leave it silently wrong.
4. **ARTIFACTS are frozen.** Dated audits, decks, mockups and scripts are point-in-time records — they are *expected* to show old numbers. Never quote one as current.

---

## 🟢 THE 4 CANONICAL (CLAUDE.md) + 3 STANDING INSTRUMENTS — one truth each (always current)

*⚠️ **Renamed 6 Aug (#628). This heading said "THE 4 CORE" over a table of SEVEN rows** — so the repo's own index of its docs could not count its own core, and a reader looking for the four canonical docs had to guess which three were the extras. **The four canonical docs are the ones `CLAUDE.md` names** — LAUNCH-PAD · PRODUCT-INVENTORY · KIND-MASTER · V2-TRACKER — and `CLAUDE.md` is founder-locked, so the four are not this doc's to redefine. **CASHFLOW-LAB · CORE-MAP · PRODUCT-RULES are standing instruments:** each owns a fact nothing else owns, none of them is a fifth status doc, and that distinction is exactly what rule 1 and the `BUILD-STATUS` retirement below are about.*

| Doc | Owns | Open it for |
|-----|------|-------------|
| **[LAUNCH-PAD.md](./LAUNCH-PAD.md)** | today's + this week's execution. **Structure (rebuilt 6 Aug, #628):** title → a **5-line honest state** → **THE RUNLIST** (visible inside the first ~30 lines) → legend → standing notes. ⚠️ **The "no status dots — 9 Jul" note here was WRONG and is corrected:** the page carries a dot beside every `#id`, and has since 5 Aug. They are **script-stamped** from the inventory by `scripts/mirror-launchpad.sh` (chained inside `update-board.sh`) and **never hand-typed** — the inventory remains the only status of record, and LAUNCH-PAD mirrors it so the two cannot drift. | "what do I do now?" |
| **[PRODUCT-INVENTORY.md](./PRODUCT-INVENTORY.md)** | product STATUS — the script-counted board (the ONLY status home) | "what's built / live / left?" |
| **[KIND-MASTER.md](./KIND-MASTER.md)** | strategy · decisions · history · session log | "why did we decide X?" |
| **[V2-TRACKER.md](./V2-TRACKER.md)** | future detail · roadmap · risks · steals | "the longer-term plan" |
| **[CASHFLOW-LAB.html](./CASHFLOW-LAB.html)** | **the money model of record** — two needles (clients · avg approvals/client/month), every cost line an editable box, live recompute. Founder-locked 25 Jul (#556). `run-costs-and-cashflow.md` is its **workings**; if the two disagree, the lab wins. | "can we scale? what does one more client actually do?" |
| **[CORE-MAP.md](./CORE-MAP.md)** | **which code actually RUNS** — 255 files reachable from a real entry point, out of 602 *(regenerated 2 Aug; CORE-MAP owns these numbers, this row only points at them)*. Everything else is FENCED: present, never deleted, never edited without a stated reason. Generated by `scripts/build-core-map.py`, never judged by hand. | "does this file even execute?" · "what % of the core has been audited?" |
| **[PRODUCT-RULES.md](./PRODUCT-RULES.md)** | **the non-negotiables** — money · safety · sending · demo · process · operations, each naming the founder decision it came from and the constant that enforces it. Includes **§5a**, the discipline block pasted before each work prompt. | "what is the rule?" · "may I do X?" |

> **🛑 Retired 26 Jul — `BUILD-STATUS.md` → [`archive/BUILD-STATUS-26JUL.md`](./archive/BUILD-STATUS-26JUL.md) (#555).** It had become a **fifth status doc**, which rule 1 above exists to prevent, and it went wrong in exactly the predicted way: its summary read *"the ONLY items not built: #515 + CI · Nothing left"* while **#211 — the entire per-client sending spine — was 🔴** and no paying client could be delivered. That line is what made the founder stop trusting the docs. **Status has one home. When a doc starts holding status, retire it, don't maintain it.**

**Always-loaded config:** [`CLAUDE.md`](../CLAUDE.md) (agent rules) · [`RULEBOOK.md`](./RULEBOOK.md) (working rules, §11 preview-before-live) · [`README.md`](./README.md) (signpost) · [`TECH-STACK.md`](./TECH-STACK.md) (vendor register) · [`client-flow-sop.md`](./client-flow-sop.md) (**THE SOP**).

---

## 🔵 LIVING SUPPORT — maintained; each owns unique content
*Columns: unique content · update-when trigger.*

### Marketing *(new 11 Aug — #632, the id R6 reserved. Operational docs, not a fifth core doc)*
| Doc | Unique content | Update when |
|-----|----------------|-------------|
| [`marketing/MARKETING-PLAN.md`](./marketing/MARKETING-PLAN.md) | ⭐ **the marketing master** — strategy, the growth loop, the **daily/weekly/monthly action tables**, and the two locks that gate the public half (R1 · R2/R20) | a lock changes · a channel is added/killed · monthly review |
| [`marketing/README-marketing.md`](./marketing/README-marketing.md) | what each marketing file is for · reading order · revisit cadence | a file is added/retired |
| [`marketing/founder-led-marketing-system.md`](./marketing/founder-led-marketing-system.md) | the strategy in plain language + the 30-day plan | strategy genuinely changes |
| [`marketing/beehiiv-setup-checklist.md`](./marketing/beehiiv-setup-checklist.md) | tickable beehiiv build — publication · landing page · welcome sequence · weekly template. ⚠️ carries the two hard rules: **never authenticate the warming domains · never touch `gettingkind.com` MX** | beehiiv setup changes |
| [`marketing/founder-content-playbook.md`](./marketing/founder-content-playbook.md) | POV · four pillars · **the content bank** · 10 post ideas · newsletter template. Public half 🔒 R2 | R2 lifts · a pillar dies |
| [`marketing/paid-ads-phase-plan.md`](./marketing/paid-ads-phase-plan.md) | 🔒 gated on R2+R7 — prerequisites · Meta-first reasoning · 4-week test · kill rules | the gates open |
| [`marketing/marketing-metrics-and-iteration.md`](./marketing/marketing-metrics-and-iteration.md) | the 7 metrics · the Monday review · More→Better→New · kill/double-down rules | a metric is added/dropped |
| [`marketing/GTM-STRATEGY.md`](./marketing/GTM-STRATEGY.md) | ⭐ **the STRATEGY** — the two engines (acquisition + depth), the 10× arithmetic, the control wedge, evidence-triggered stages | a stage exits · the wedge changes |
| [`marketing/GTM-ONE-PAGE.md`](./marketing/GTM-ONE-PAGE.md) | ⭐ **"what do I do daily for GTM"** — one avatar · one offer · the Core Four · the daily numbers · the money in four boxes. Holds **no status and no dates-as-promises**; links to GTM-STRATEGY once for the *why* | the offer, cadence or channel set changes |
| [`marketing/voice.md`](./marketing/voice.md) | ⭐ **THE brand voice** — locked brand facts · banned words · the content pillars · output specs (post · **monthly stats post** · **carousel** · video · cold outreach) | a lock changes · a new output format is needed |
| [`marketing/warm-outreach-kit.md`](./marketing/warm-outreach-kit.md) | the actual messages — openers · follow-ups · referral ask (personal, free-10 allowed per R1/R21) + the brand-voiced public posts | the offer or the ICP changes |
| [`marketing/CLAUDE-PROJECT-INSTRUCTIONS.md`](./marketing/CLAUDE-PROJECT-INSTRUCTIONS.md) | ⭐ **the marketing Project's constitution** — the paste block of record for the founder's separate "M&V Marketing" Claude Project: brand facts · voice · the hard rules · the five seats. **Lives here so the other workspace's rules are version-controlled and linted** | any ruling that changes what the Project may write — then the founder re-pastes it |
| [`marketing/DAILY-PLAYBOOK.md`](./marketing/DAILY-PLAYBOOK.md) | the one file the marketing Project works from — the calendar + every finished post, DM and format in one place. ⚠️ **GENERATED by `scripts/build-playbook.sh` — never hand-edit it**; edit the source docs (MARKETING-PLAN §3b, founder-content-playbook §6b, warm-outreach-kit) and re-run | automatically, whenever a source doc changes |
| [`marketing/bundle-source/README.md`](./marketing/bundle-source/README.md) | ⚠️ **HISTORICAL** — the raw Cowork marketing bundle, parked verbatim. Includes the R21-parked free-10 landing page and the DNS warning | only when reviving a parked piece |

### Strategy *(new 20 Aug — Prompt 38. FROZEN founder records, not living docs)*
| Doc | Unique content | Update when |
|-----|----------------|-------------|
| [`strategy/README.md`](./strategy/README.md) | ⭐ **the index of the folder** — the founder's 12-file GPT strategy corpus committed verbatim 20 Aug: Jack & Jill product model · the Milla website preview · website positioning · the meeting-booking doctrine · sourcing & meeting-yield (+ the standalone sourcing artifact, which is §1–17 of it) · social intent · CRM expansion · Vida autonomy · competitive benchmark · MASTER_CONTEXT · CURRENT_CROSSCHECK. Carries the **source-of-truth rule** (repo/runtime > Ledger > these artifacts — never proof a feature exists) and names what the bundle held that was deliberately left out | ⚠️ **NEVER** — the 12 files are frozen founder records, deliberately outside `doc-lint`'s `DOCS[]`; a stale-claim lint would fail them for being accurate about 17–19 Aug. Corrections live in the Ledger / PRODUCT-RULES / KIND-MASTER, never by editing them. This README updates only if a file is ADDED to the folder |

### Money & sales
| Doc | Unique content | Update when |
|-----|----------------|-------------|
| [`run-costs-and-cashflow.md`](./run-costs-and-cashflow.md) | **the financial model** — §1 = the locked money model (**one wallet · $299 onboarding pack, 100 leads included · then $4 per approved lead**) + real PDL/Hunter unit economics; §16 company ops. ⚠️ **CORRECTED 11 Aug: this row said `$99` and called it "founder-locked 25 Jul".** The price was **re-locked to $299 on 3 Aug** (PR1 · #609) and the target doc's own §1 heading has read `$299` ever since — so the index was contradicting the document it indexes. *(Also corrected 2 Aug: it previously said "§0 = the locked per-qualified-lead ladder" — that two-wallet ladder was superseded 24 Jul.)* **The cost floor is `cost-floor.ts`; [`CASHFLOW-LAB.html`](./CASHFLOW-LAB.html) wins any disagreement.** | pricing · data stack · billing changes |
| [`sales-playbook.md`](./sales-playbook.md) | the sales manual — qualification · discovery · objections · proposals (per-lead framing) | agents · pricing · positioning change |
| [`PARTNER-BRIEF.md`](./PARTNER-BRIEF.md) | partner one-pager — trade playbooks · per-lead pricing · 20%+5% terms | pricing / partner terms change |
| [`SALARY-BREAKEVEN-PLAN.md`](./SALARY-BREAKEVEN-PLAN.md) | founder break-even on per-lead revenue; retention treadmill | targets · headcount change |
| [`CHURN-PREVENTION-PLAN.md`](./CHURN-PREVENTION-PLAN.md) | retention levers (190–193, Lena 145) | churn strategy change |
| [`hiring/`](./hiring/) (6 md + 3 calculators) | AE + partner comp (collected-revenue denominated) · Claude-Code brief · seller-engine map | comp / seller-engine change |
| [`hiring/CLIENT-PARTNER-JD.md`](./hiring/CLIENT-PARTNER-JD.md) | The Client Partner role (R40) — sells from her own network, onboards, retains. No demos; the founder demos. | 15 Aug |
| [`hiring/CLIENT-PARTNER-AGREEMENT-DRAFT.md`](./hiring/CLIENT-PARTNER-AGREEMENT-DRAFT.md) | ⚠️ **DRAFT, not legal advice** — commission agreement written without counsel at the founder's instruction (R40). Lawyer review before signature. | 15 Aug |

### Product flow · demo · onboarding
| Doc | Unique content | Update when |
|-----|----------------|-------------|
| [`client-flow-sop.md`](./client-flow-sop.md) | **THE SOP** — sending & onboarding model (M1/M2/M3) + client paths (per-lead wallets) | sending/onboarding model change |
| [`admin-centre-spec.md`](./admin-centre-spec.md) | Admin Centre (M3) spec — Cockpit · Command Centre · Nora | admin structure change |
| [`MILESTONE-0-CHECKLIST.md`](./MILESTONE-0-CHECKLIST.md) | ⭐ the M0 punch-list — money model spine + sweeps + reliability fixes | each batch swept / fix landed |
| [`SYSTEM-FLOW.md`](./SYSTEM-FLOW.md) | one-page machine map (data → FIGSY → sending; Resend today, engines future) | engine / data / GTM change |
| [`flows/`](./flows/) | canonical flow visuals (new-client · our-outreach) | flow changes |
| [`CLIENT_FLOW.html`](./CLIENT_FLOW.html) · [`CLIENT_FLOW_PER_REP.html`](./CLIENT_FLOW_PER_REP.html) | client-facing flow decks (per-lead ladder — verified 9 Jul) | pricing / flow change |
| [`RECORDING-SHOOTING-SCRIPT.md`](./RECORDING-SHOOTING-SCRIPT.md) · [`demo-walkthrough-script.html`](./demo-walkthrough-script.html) | recording bible + verbatim demo script | UI / pricing in-script change |
| [`drafts/`](./drafts/) (3 specs) | positioning hero (LOCKED) · GTM funnel instrumentation (#131) · onboarding V2 | when each ships |
| [`portal-v2-layout.md`](./portal-v2-layout.md) | Portal V2 layout direction (post-launch) | V2 direction change |
| [`onboarding-tour-buildplan.md`](./onboarding-tour-buildplan.md) | the onboarding-tour build plan | the tour ships or changes |
| [`client-onboarding-training.html`](./client-onboarding-training.html) | client onboarding training deck | onboarding flow changes |
| [`DESIGN-REFERENCE.md`](./DESIGN-REFERENCE.md) + [`design-reference/`](./design-reference/) (12 screenshots) | how K.I.N.D looks — locked 9 Jul; the screenshots are the visual record | a founder-approved redesign lands |
| [`mv-previews/`](./mv-previews/) (README + 3 flow HTMLs) | the Milla/Vida pivot flow previews | pivot flows change |
| [`content/`](./content/) (5 packs) | blog posts · LinkedIn playbook · our US/UK outreach pack · video plans | content cadence |
| [`AFRICA-PLAYBOOK.md`](./AFRICA-PLAYBOOK.md) | Africa GTM — direct-data + partners motion | GTM change |
| [`art-of-possible.md`](./art-of-possible.md) | inspiration log ("nothing built unless marked") | an idea graduates to a 🔴 item |

### Ops · deploy · infra
| Doc | Unique content | Update when |
|-----|----------------|-------------|
| [`supabase/migrations/README.md`](../supabase/migrations/README.md) *(+ tombstone READMEs in `apps/api/src/migrations/` and `packages/db/src/migrations/`)* | **where migrations live and what actually runs them** — the single home since #273, the conventions, and the distinction that is easiest to get wrong: recording a migration is not running one (the runner reads a TS constant, never the directory) | a migration convention changes · the runner changes · a new directory appears |
| [`SCHEMA-DRIFT.md`](./SCHEMA-DRIFT.md) | **what the repo can prove about the database, and what it cannot** — 77 tables × migrations vs three snapshots vs what the code writes, one verdict each (agree / drift / ❓ unknowable), plus the read-only queries only production can answer. Derived by `schema-drift.ts`; `schema-drift.test.ts` fails the gate if `schema.sql` falls behind its own migrations again (#558) | a migration adds a column · a new write path appears · a founder query comes back answered |
| [`ENVIRONMENT.md`](./ENVIRONMENT.md) | **every environment variable the three apps read (100)** — tier · what breaks when unset · which Railway service holds it. The written half of `startup-check.ts`; `env-doc-drift.test.ts` fails the gate on drift in either direction (#561) | a `process.env` read is added or removed · a variable changes service or tier |
| [`DEPLOYMENT_GUIDE.md`](./DEPLOYMENT_GUIDE.md) | deploy steps · Railway crons · DNS (website = Railway `KIND`; Cloudflare = DNS/CDN). **Its env-var reference moved to `ENVIRONMENT.md` on 30 Jul** — it was a partial copy that had gone wrong | cron / deploy / DNS change |
| [`SMOKE_TEST.md`](./SMOKE_TEST.md) | step-level T1–T10 (reveal-charge aware) | test flow change |
| [`LIVE-FEATURE-WALK.md`](./LIVE-FEATURE-WALK.md) | the 🩷→🟢 verification checklist (28-Jun snapshot + banner) | as items are walked |
| [`PINK-WALK-CHECKLIST.md`](./PINK-WALK-CHECKLIST.md) | founder self-walk aid (A–E groups) | as pinks are walked |
| [`SEND-DAY-RUNBOOK.md`](./SEND-DAY-RUNBOOK.md) | ⭐ **the send-day script (#621 · A14)** — every step the founder executes alone on ~25 Aug, code-verified. *(Was missing from this map entirely — the most execution-critical doc in the repo, unlisted. Added 11 Aug.)* | the send path changes · after each dry-run finding |
| [`UNLOCK-DAY-RUNBOOK.md`](./UNLOCK-DAY-RUNBOOK.md) | 🔑 **the day a client is IN THE WORKS** (R25/R26) — buy Smartlead **with API access** (a 401 is the plan, not the key) · the key into Railway · the PDL $98 tier · the four System rows in order · the mailbox pair · **and the backfill nobody would remember**, without which every lead approved before that day never reaches the client's mailbox | the unlock steps or the vendors change |
| [`BACKUP-RESTORE-DRILL.md`](./BACKUP-RESTORE-DRILL.md) | the backup/restore drill plan (#298) — the monthly manifest that has never been taken (LAUNCH-PAD's monthly ops row owes it) | the drill runs · backup infra changes |
| [`RLS-AUDIT.md`](./RLS-AUDIT.md) | RLS verdict per table (#554) — first answered against production 6 Aug via A15: *"No exposed tables. 39 deny-all · 43 scoped · 82 read"* | a table is added · a policy changes |
| [`SEED-WIPE-PLAN.md`](./SEED-WIPE-PLAN.md) | the seed-data wipe plan (#329) — what demo/seed rows exist and the order they die before real clients | seed data changes · the wipe runs |
| [`AUDIT-PROMPT.md`](./AUDIT-PROMPT.md) | the deep-audit prompt — pasted when a real audit is wanted; produced the 6-Aug batch (#637–#643) | the audit method improves |
| [`render-cloudflare-failover.md`](./render-cloudflare-failover.md) · [`portal-admin-failover.md`](./portal-admin-failover.md) | failover runbooks (Render standby + Cloudflare LB) | failover infra change |
| [`DATA-RESIDENCY-PLAYBOOK.md`](./DATA-RESIDENCY-PLAYBOOK.md) | same-day US/UK go-live runbook (#258) | residency framework change |
| [`DELIVERABILITY-D9-CHECKLIST.md`](./DELIVERABILITY-D9-CHECKLIST.md) | D9 mail-tester readiness | deliverability change |
| [`APOLLO-ENGINE.md`](./APOLLO-ENGINE.md) | the vendor-agnostic outbound-OS playbook (filename historical; vendor is not) | 211/212/139/140 change |

### Legal · compliance
| Doc | Unique content | Update when |
|-----|----------------|-------------|
| [`legal.md`](./legal.md) | data-rights exposure + structural options (SUPERSEDE banner on Apollo thesis) | lawyer review lands |
| [`legal/`](./legal/) (6 files) | legal pack · IT-security pack · SEIS draft · partner agreement · key-rotation + restore runbooks — factually per-lead since 9 Jul; **⚖️ sign-off owed before external use (#432–#436)** | compliance milestone / sign-off |

### Compliance evidence → [`compliance/`](./compliance/) *(10 files — added to this map 21 Aug; the folder existed and was **not indexed here at all**)*
> ⚠️ **Read the state banner on each file before quoting it.** Most are **DRAFT FOR COUNSEL — not filed, not published, not relied on**; that state is the point, not a defect. `EVIDENCE-PACK.md` is the register that says which paper we actually hold.

| Doc | Unique content | Update when |
|-----|----------------|-------------|
| [`EVIDENCE-PACK.md`](./compliance/EVIDENCE-PACK.md) | **the accountability register** — every document we must be able to hand a regulator/client/DPA audit, and honestly whether we hold it (rows 9/17: vendor DPAs listed on `dpa.html` but **not executed/held**) | any evidence is collected or a claim changes |
| [`DATA-BOUNDARY.md`](./compliance/DATA-BOUNDARY.md) | DRAFT — what data crosses which boundary, **written by reading the code**, every claim naming file + line | the data path changes |
| [`SECURITY-TOMS.md`](./compliance/SECURITY-TOMS.md) | DRAFT — technical + organisational measures, written from the code; three states, rows marked **FOUNDER-CONFIRMS** | a control is added or confirmed |
| [`TRUST-ROOM.md`](./compliance/TRUST-ROOM.md) | DRAFT — the client-facing trust surface (counsel blesses the legal rows; founder walks the FAQ first) | before anything is served to a client |
| [`CLIENT-SECURITY-FAQ.md`](./compliance/CLIENT-SECURITY-FAQ.md) | DRAFT — plain-words answers to client security questions, each pointing at the doc that proves it | a client asks something new |
| [`BREACH-RESPONSE-DRAFT.md`](./compliance/BREACH-RESPONSE-DRAFT.md) | DRAFT FOR COUNSEL — breach response; **counsel words both notification thresholds** | counsel returns wording |
| [`UPSTREAM-DSR-PROPAGATION.md`](./compliance/UPSTREAM-DSR-PROPAGATION.md) | when a data provider's own subject exercises rights, we are **not told** — how cached records get caught | a sourcing vendor changes |
| [`SA-INFORMATION-OFFICER-CHECKLIST.md`](./compliance/SA-INFORMATION-OFFICER-CHECKLIST.md) | DRAFT FOR COUNSEL — SA Information Officer duties; **nothing filed with the Regulator** | counsel / filing happens |
| [`SA-PAIA-MANUAL-DRAFT.md`](./compliance/SA-PAIA-MANUAL-DRAFT.md) | DRAFT FOR COUNSEL — PAIA manual; **not filed or published** | counsel / filing happens |
| [`SA-S72-TRANSFER-MEMO-SKELETON.md`](./compliance/SA-S72-TRANSFER-MEMO-SKELETON.md) | DRAFT FOR COUNSEL — s72 transfer basis, **left blank** pending the vendor DPAs (gated by EVIDENCE-PACK row 17) | the DPAs are executed |

### Runbooks → [`runbooks/`](./runbooks/) *(2 files — added to this map 21 Aug; the folder existed and was **not indexed here at all**)*
| Doc | Unique content | Update when |
|-----|----------------|-------------|
| [`DSAR-ERASURE.md`](./runbooks/DSAR-ERASURE.md) | **⏱️ one calendar month** — handling a subject access / erasure request for one person, by email, start to finish | the data path or the deadline law changes |
| [`GOOGLE-VERIFICATION.md`](./runbooks/GOOGLE-VERIFICATION.md) | the Google Calendar OAuth verification path — the app is in **Testing** with the token expiry that follows | Google's app state changes |

### Root-level (evergreen)
[`README.md`](../README.md) (repo front door) · [`CLAUDE.md`](../CLAUDE.md) · [`AGENT_AVATARS.md`](../AGENT_AVATARS.md).

---

## 🟠 ARTIFACTS — dated one-offs, frozen (read as history, never as current)
| Artifact | What it is |
|----------|-----------|
| [`AUDIT-8JUL-DEEP.md`](./AUDIT-8JUL-DEEP.md) | ⭐ the current-audit evidence pack behind M0 (67 findings #338–#404, §D prod-SQL, §O launch scopes) — frozen 8-Jul snapshot; findings live on as inventory items |
| [`kind-pitch-deck.html`](./kind-pitch-deck.html) · [`KIND_DECK.html`](./KIND_DECK.html) | pitch decks (point-in-time) |
| [`previews/`](./previews/) (25) · [`setup-dashboard-preview.html`](./setup-dashboard-preview.html) · [`portal-v2-preview.html`](./portal-v2-preview.html) · [`pwa-mockup.html`](./pwa-mockup.html) | UI mockups / design snapshots |
| [`MCP-EXPLAINED.html`](./MCP-EXPLAINED.html) | static explainer |
| [`reports/PRODUCT-AUDIT-1AUG.md`](./reports/PRODUCT-AUDIT-1AUG.md) | the 1-Aug product audit — frozen snapshot; findings live on as inventory items |
| [`assets/`](./assets/) | doc images (currently one: the 75k you-vs-partner chart) |
| *this file* — [`DOC-MAP.md`](./DOC-MAP.md) | the index itself. In `doc-lint`'s DOCS list since 11 Aug — an unchecked index is how it carried a five-week-dead price |

---

## 🗄️ ARCHIVE — superseded, do not use → [`docs/archive/`](./archive/)
Everything in `docs/archive/` (30+ files). **Moved 9 Jul:** `AUDIT-24JUN-RECONCILIATION` · `SYSTEM-HEALTH-AUDIT` (superseded by AUDIT-8JUL-DEEP) · `client-flow-visual.html` · `roadmap-flowchart.html` · `client-journey-flowchart.html` · `roadmap-audit-14-may-2026.md` (all carried retired subscription/Apollo pricing; the `updates-live/` folder was collapsed).
**Nuggets still only in archive (pointer, don't resurrect):** Alta deep-audit numbers → `EVERYTHING.md` · #60 outcome-pricing math → `EVERYTHING.md` · F1–F5 funding table → `EVERYTHING.md`.
