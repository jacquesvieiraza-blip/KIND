# 🔬 K.I.N.D — FULL DOC↔CODE RECONCILIATION (24 Jun 2026)

> **What this is:** the complete, single-source result of a full audit of **every doc (4 canonical + ~40 sub-docs) and all 228 inventory items against the actual code on `main` + git** — plus the non-code/founder workload. Every finding below was produced by a domain auditor **and independently re-verified by hand** against the code (file:line proof). Nothing here is from memory.
>
> **Coverage:** 8 code-domain auditors · 1 non-code work sweep · 3 canonical-docs-vs-code (V2/LAUNCH-PAD/MASTER) · 5 deep sub-doc auditors (money/hiring/legal/product-content/ops-infra) · self-audit of PR #721 · hand re-verification of every load-bearing finding.
>
> **Status: BUILD FROZEN until this is reconciled (founder directive).** This doc drives one fix PR (founder merges).

---

## HEADLINE
1. **The product is MORE built than the board says** — several items marked 🔴/🟡 are live in code.
2. **A few "done" items hide real CODE-vs-canon bugs** — partner rates, Paystack, currency (docs are right; the *code* lags).
3. **The inventory is build-complete but execution-thin** — the video/content engine, the legal-filing calendar, partner-recruiting, and SEIS are ~34 pieces of founder work with no owning item.
4. **Root cause of doc drift:** the RULEBOOK §10 / DOC-MAP "main-4 feed the sub-docs" propagation discipline wasn't enforced — corrected main-4 facts didn't flow down (Milla, rates, dates, ICO).

---

## PART 1 — DOC↔CODE STATUS CORRECTIONS

### 1A · UNDER-CLAIMED (built in code, dot too low → flip UP)
| Item | Current | Reality (proof) | →Correct |
|---|---|---|---|
| **116** activity widget | 🔴 | rendered on home: `dashboard/page.tsx:7,338` + backend `figsy.ts:415` | 🩷 |
| **139** intent/brief/ICP-refine/branching | 🔴 | 4/5 live: `cron.ts:56,80` (morning-brief, intent), `icps.ts:565` (/refine), `figsy.ts:301` (applyReplyBranching). Only contextual-bandit unbuilt | 🟡/split |
| **184** public status page | 🔴 | `apps/website/status.html` exists (live health checks); just unlinked | 🩷 (note: unlinked) |
| **59** company-demo provisioning | 🟡 | fully wired: `admin.ts:140,146` + admin UI `demo/page.tsx` | 🩷 |
| **55a** company RLS | 🔴 | company-table RLS + owner-read policy ARE built: `20260612_company_engine.sql:72-84`. (Rep-data isolation on clients/leads still API-only, not RLS) | partial — clarify, don't leave flat 🔴 |
| **FIGSY voice-calling backend** | *no item* | built + mounted: `voice.ts`+`vapi.ts`, `index.ts:163`, migration `006_voice_calls.sql`, settings UI. Gated on `VAPI_API_KEY` | **NEW item needed** |

### 1B · OVER-CLAIMED (dot too high or contradictory → correct DOWN / fix note)
| Item | Current | Problem (proof) | →Action |
|---|---|---|---|
| **24** Flutterwave | 🟢 | can't be live+verified — its activation **136 is 🔴**; row's own text says "activation ⏸" | → 🟡/🩷 |
| **93** Drop+Watch | 🟣 | names `apps/website/product-videos.html` — **file does not exist** (Watch half is vapor; the-drop.html is real) | drop the dead path / split |
| **165** visitor snippet | 🟡 "all 40 pages" | really **43 of 62** html; 18 (blog, per-agent) lack it | correct the claim |
| **109** manager/notifications | 🩷 | manager role wired; **owner↔rep notifications have no code** | split / caveat |
| **180** admin audit log | 🩷 | backend exists (`admin.ts:603`) but **inline note "verified absent in code" is FALSE**, and there's no frontend | fix note; → 🟡 |

---

## PART 2 — CODE-vs-CANON BUGS (real product fixes, NOT doc edits)
*Docs are correct; the live code is the laggard. These are the actual build backlog.*
| # | Bug | Proof | Canon |
|---|---|---|---|
| C1 | **Partner rates live-wrong** — pays/shows old 20/25/30% tiered "recurring" | `partners.ts:447-449`, `partner/page.tsx:273-275`, partner pricing page | locked 20% acq + 5% retention (`comp-engine.ts:45,47`) |
| C2 | **Partner dashboard renders ZAR** | `partner/page.tsx` `fmtZAR` | USD everywhere |
| C3 | **Paystack still live** — 6 files POST in ZAR | `paystack.ts`, `subscriptions.ts`, `credits.ts`, `figsy.ts`, `internal-briefs.ts`, `index.ts` | Stripe + Flutterwave only |
| C4 | **Subscriptions store ZAR, never USD** | `subscriptions.ts:45` `amount_zar: Math.round(amountUsd*19)` | USD ledger |
| C5 | **Non-Stripe price tables 2-tier ZAR** | `flutterwave.ts:20-23`, `credits.ts` BUNDLES | `@kind/shared` 3-tier USD |
| C6 | **Settings copy overstates automation** | `settings/page.tsx:900` "FIGSY will call leads on day 4" — no cron auto-calls `createCall` | manual `/voice/calls` only |

---

## PART 3 — UNDOCUMENTED CODE
- **FIGSY voice-calling backend** (`voice.ts`/`vapi.ts`, mounted `index.ts:163`) — built, no item (→ new item, gated on `VAPI_API_KEY`).
- **`lena.ts`** — a full `/lena/chat` endpoint that is **never mounted** (dead code); item 145 is 🔴. Either mount or remove; log it.
- **Company RLS policies** (`20260612:72-84`) — built, undocumented (ties to 55a).
- `status.html` (item 184, above).

---

## PART 4 — SCHEMA / MIGRATION HYGIENE
- **Duplicate** `20260611_company_engine.sql` **vs** `20260612_company_engine.sql` — 611 is stale/wrong (keys by `member_id`; code uses 612's `company_id`/`rep_client_id`). Remove/neutralize 611.
- **`amount_usd` drift** — present in `staging-schema.sql` (×2) + `20260601_partners.sql`, but `20260525_fix_subscriptions_schema.sql` drops it; no code writes USD for subscriptions.
- **`crm_dedup_enabled`/`leads.crm_existing`** — only in `staging-schema.sql`, **no numbered migration** (item 110 reads them, degrades to `?? false`).
- **`tier` CHECK** (`staging-schema.sql`: starter/advanced/pro/enterprise) vs inserts `'monthly'` (`subscriptions.ts:42`) / `'leadgen_20'` (`flutterwave.ts`) — latent insert-failure risk if the CHECK is live in prod.

---

## PART 5 — SUB-DOC STALENESS & BROKEN REFS (propagation failures)
| Doc | Finding | Proof |
|---|---|---|
| `blog-articles.md:159` | **Milla mis-described as "lead generation"** (the #721 Milla fix never reached this file) | quoted line 159 |
| `run-costs-and-cashflow.md` | PDL/Hunter still "wired but dormant / half-built" — now LIVE (94/95/140 🩷) | L289,548-549,606 |
| `run-costs` | Resend cost conflict $20 (L30) vs $15.46 (L206) | internal |
| `AI_REVENUE_OS_POSITIONING.md` | "$20 = AI revenue team" anchor vs $29 agent-sub floor; "✅ live" claims inside a "nothing is live" draft | L29-46 |
| `GTM_FUNNEL_INSTRUMENTATION.md` | broken ref to `EVERYTHING.md` (archive-only) + "item 17b" (should be item 48) | L6,50,123 |
| `ONBOARDING_V2.md` | 3× refs to `EVERYTHING.md` + old IDs #29/#30/#35 (don't map to inventory 135/129) | confirmed |
| `website-video-plan.md` | "Tomorrow (12 Jun)" / "By Jun 29" framed as future (now past); 11-Jun stamp | L84-86,98 |
| `DOC-MAP.md` | **3 docs on disk unindexed**: `MCP-EXPLAINED.html`, `pwa-mockup.html`, `updates-live/client-journey-flowchart.html` (violates its own "if not listed, not tracked") | confirmed exist + absent |
| `TECH-STACK.md:15` | "3 app services" → should be **4** (Website omitted) | L15 |
| `AGENT_AVATARS.md` | documents **3 agents**; **8 avatars** on disk (Denise/Casey/Alex/Lena/Tony undocumented) | grep 3 vs 8 |
| `it-security-pack.md:185` | incident register "Pending rotation" — keys rotated 11 Jun (`730dc5e`) | L185 |
| `it-security-pack.md:49,196` | claims Supabase Pro + PITR; `restore-runbook.md:5-6` says "No PITR, not Pro" — reconcile | both |
| `legal-pack.md:192` | **"Trademark filed … Check is clear" is FALSE** — same doc L305 says "File UK trademark 🟡 Month 2-3" | L192 vs L305 |
| `legal-pack.md` vs `seis-draft.md` | trademark class mismatch — 35/42/**45** vs 35/42/**38** | both |
| `legal.md` vs `it-security-pack.md` | Apollo DPA: "in place" vs "open question to lawyer" — reconcile | L114 vs L198 |

---

## PART 6 — FRESHNESS (`Last-checked` discipline, RULEBOOK §10)
Missing/stale `Last-checked`: `legal-pack.md`, `it-security-pack.md`, `seis-advance-assurance-draft.md` (none at all), `restore-runbook.md`, `key-rotation-runbook.md`, `DELIVERABILITY-D9-CHECKLIST.md` (none); stale stamps not bumped after 24-Jun edits: `DEPLOYMENT_GUIDE.md`, `LIVE-FEATURE-WALK.md` (both "22 Jun").

---

## PART 7 — UNTRACKED WORK (no owning item → must be logged) ≈34
- 🎬 **Video/content engine:** 8 vertical re-shoots · per-agent cuts · vs-competitor cuts · the **Drop reel cadence (ongoing)** · the **"Working AI" podcast** · website videos V3–V7 · **YouTube episodes 1–10** · embedded agent-page clips · recording tooling/setup.
- ✍️ **Content:** publish the **3 ready blog articles** · AI-Revenue-OS repositioning + **pitch deck** · lead magnets (swipe file, ICP template) · "Watch the demo" CTA cards.
- 📣 **GTM:** **partner-recruiting motion** (recruit ~10/yr) · Ireland/Kenya/Ghana channels · **populate social profiles** (gate for 164).
- ⚖️ **Legal calendar:** **SEIS advance assurance** · ARIPO + clearance search · Corp Tax · VAT · **Shareholders' Agreement** · ODPC (Kenya) + NDPR (Nigeria) · pen test · trust.html + footer links · EU adequacy · review cycles · D&O.
- 🛠️ **Ops:** Calendly link · lifecycle send infra (Resend vs Zoho) · **GTM analytics decision-set (10, blocks 131)** · 4-country market test · Paystack-NG · training-day SOP.
- 👥 **Seller:** the **partner agreement** draft.
- ⚠️ **Plus:** founder's brain-dump of work not in any doc (still owed — an audit can't find what was never written).

---

## PART 8 — THE PROPAGATION FIX (why this drifted)
RULEBOOK §10 / DOC-MAP freshness system says the **4 canonical docs are the source of truth and must feed the sub-docs** (one fact, one home; update-on-change same session; every living sub-doc carries `Last-checked`). The drift above (Milla-as-lead-gen surviving in `blog-articles.md`, old rates/dates in sub-docs, ICO "pending") is that discipline not being enforced. **Remediation:** every sub-doc gets a `Last-checked` line; when a main-4 fact changes, the DOC-MAP freshness sweep reconciles the sub-docs that hang off it the same session. Make the sweep part of the end-of-session ritual, not ad-hoc.

---

## PART 9 — REMEDIATION PLAN (founder merges)
**(A) Doc-fix PR** — correct Part 1 dots (with proof), fix Part 5 stale/broken sub-docs, add Part 6 `Last-checked` lines, fix the DOC-MAP gap, add the **"never work off memory"** rule to RULEBOOK §1.
**(B) New inventory items** — log the Part 7 untracked work as new rows grouped into epics (Content/Recording Engine · Legal-Filing Calendar · Partner-Recruiting · SEIS/Investor Prep) + the undocumented code (voice backend; lena dead-code). Board re-counted via `--check`.
**(C) Code-fix backlog (after freeze lifts)** — Part 2 bugs (partner rates→20/5+USD; Paystack decision; subscription USD migration; price-table unify; settings copy) + Part 4 migration hygiene. Each its own item.
**(D) Propagation** — Part 8.

---

### Appendix — corrections caught during hand re-verification
- **55a**: first re-grep (uppercase) returned 0 → false negative; case-insensitive confirmed the RLS exists (`20260612:72-84`). Auditor was right.
- "#721" is the doc-audit-fix PR (`c59f1c2`, merged) — referenced by commit, not by number inside the docs (some auditors noted "no #721 in docs"; expected).
