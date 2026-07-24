# 🛠️ BUILD-STATUS — Milla&Vida live-build tracker

> **What this is:** the running, item-by-item state of the Milla&Vida build — every page and feature, whether the code is merged, and whether it's actually live for the founder. This is the day-to-day "where are we / what's left" board for the M&V rebuild. Status of record for the wider product still lives in **PRODUCT-INVENTORY**; this doc is the focused M&V working list, updated after every build.

**Legend — Main:** ✅ merged · ⚠️ partial · 🟡 open PR · ❌ not built
**Live for you:** 🟢 confirmed seen · 🩷 deployed, not walked · ⏳ merged, ships on next `bash scripts/ship.sh` · ❌ not built

**Deploy:** one command after any merge → `bash scripts/ship.sh` (pulls, stamps, deploys api→portal→admin).

---

## VIDA — operator console (core)
| # | Item | Main | Live for you |
|---|---|:--:|---|
| 483 | Client picker | ✅ | 🩷 |
| 484 | Pipeline board | ✅ | 🩷 |
| 1112 | Lead queue · Suppression · Reports | ✅ | 🩷 |
| 486 | Operator identity + audit | ✅ | 🩷 |
| 485 | Kill-switch + cap + health | ✅ | 🩷 |
| 493 | Send-to-client / gate labels / Booked·$3 | ✅ | 🩷 |
| 493c | Gate chips on board columns (Send/Qualify/Money/$3) | ✅ | 🩷 |
| 501 | Flow ribbon | ✅ | 🟢 |
| 500 | KPI cards | ✅ | 🟢 |
| 498 | Command bar | ✅ | 🟢 |
| 505 | Live blockers strip (real gate counts) | ✅ | 🩷 |
| 496 | Escape hatch (interim) | ✅ | 🩷 |
| 1124 | Board loads a client (proxy client_id fix) | ✅ | 🩷 |
| 494 | Qualify gate ("Mark qualified" on Replied) | ✅ | 🩷 |
| 499 | Bookings page + Mark no-show (state) | ✅ | 🩷 |
| 499m | No-show → **2 rebooks → keep the $3** (founder rule 24 Jul; $3 kept, no refund) | ✅ | 🩷 |
| 498b | One-click sourcing from command bar (**pool-aware cost confirm**) | ✅ | 🩷 |
| 511v | Nexus signals view | ✅ | 🩷 (built — see the 🧠 NEXUS section) |

## VIDA — native rebuilds (kill the dropdown → old-admin exit)
| # | Item | Main | Live |
|---|---|:--:|---|
| 502 | Engine rail in-shell (dropdown → rail Engine section + native routes) | ✅ | 🩷 |
| 530 | Cockpit — Vida-native | ✅ | 🩷 |
| 531 | Clients (admin) — Vida-native | ✅ | 🩷 |
| 532 | Money Path — Vida-native | ✅ | 🩷 |
| 533 | Billing — Vida-native | ✅ | 🩷 |
| 534 | Revenue — Vida-native | ✅ | 🩷 |
| 535 | GTM Hub — Vida-native | ✅ | 🩷 |
| 536 | Unibox — Vida-native | ✅ | 🩷 |
| 537 | Health — Vida-native | ✅ | 🩷 |
| 538 | Ops — Vida-native | ✅ | 🩷 |
| 539 | Founder — Vida-native | ✅ | 🩷 |
| 540 | Outreach — Vida-native | ✅ | 🩷 |
| 541 | Compliance — Vida-native | ✅ | 🩷 |

## MILLA — client console (core)
| # | Item | Main | Live for you |
|---|---|:--:|---|
| 488 | Shell + masked cards + Approve $1 / Not-a-fit | ✅ | 🟢 |
| 488 | Credit ledger | ✅ | 🟢 |
| 489 | Concierge chat | ✅ | 🟢 |
| 1119 | Login lands on /milla | ✅ | 🟢 |
| 497 | Two-panel (chat + cards) | ✅ | 🟢 |
| 503 | KPI cards | ✅ | 🟢 |
| 490 | Rail shell + account dropdown | ✅ | 🟢 |
| 506 | Real-data chat opener | ✅ | 🩷 |
| 510 | Recent-replies rail | ✅ | 🩷 |
| 495 | ICP v1/v2 versioning | ✅ | 🩷 |
| 507 | Meetings tab | ✅ | 🩷 walk it |
| 447 | Reveal-push email deep-link | ✅ | 🩷 |
| 496 | Escape hatch (interim) | ✅ | 🩷 |
| 513 | Conversational onboarding | ✅ | 🟢 (/milla/welcome loaded) |
| 514 | Propose ICP + credit plan | ✅ | 🟢 |
| 1125 | Onboarding wired into signup/login (no more orphan) | ✅ | 🩷 |
| 512 | Client ICP approval gate | ✅ | 🩷 |
| 516 | Client report page (= native Reports) | ✅ | 🩷 |
| 515 | Magic-link + SMS approve | 🚩 | **FLAGGED — needs SMS provider + no-login security decision** |

## MILLA — native rebuilds (kill the rail/account → old-portal exit)
| # | Item | Main | Live |
|---|---|:--:|---|
| 508 | My campaign — Milla-native | ✅ | 🩷 |
| 520 | Insights · Performance — Milla-native | ✅ | 🩷 |
| 521 | Insights · Analytics — Milla-native | ✅ | 🩷 |
| 522 | Insights · Your ROI — Milla-native | ✅ | 🩷 |
| 523 | Company · Command Centre — Milla-native | ✅ | 🩷 |
| 524 | Company · Teams Hub — Milla-native | ✅ | 🩷 |
| 525 | Account · My profile / Settings — Milla-native | ✅ | 🩷 |
| 526 | Account · Billing — Milla-native | ✅ | 🩷 |
| 527 | Account · Usage — Milla-native | ✅ | 🩷 |
| 528 | Account · Documents — Milla-native | ✅ | 🩷 |
| 529 | Account · Referral — Milla-native | ✅ | 🩷 |

## COMBINED — engine, money, gates, off-ramps, infra
| # | Item | Main | Live for you |
|---|---|:--:|---|
| 492 | Money $1+$3 hold/capture/release | ✅ | 🩷 (213 tests, not walked to the cent) |
| — | Money migration (`credit_holds`) | ✅ SQL run | 🟢 |
| — | Client money gate · Operator send gate | ✅ | 🩷 |
| — | Charge model ($0/$1/$3) | ✅ | 🩷 |
| — | FIGSY sourcing · ICP builder · campaigns · sequences · inbox | ✅ | 🩷 |
| — | classifyReply + logging | ✅ | 🩷 |
| 44/361 | Calendar + `/book` | ✅ | 🩷 |
| 26 | $3-on-booking capture | ✅ | 🩷 |
| 498 | Command endpoint (Vida bar backend) | ✅ | 🩷 |
| 494 | Qualification gate (built — see VIDA core) | ✅ | 🩷 |
| — | No-show → 2 rebooks → keep the $3 (#499m) | ✅ | 🩷 |
| 511 | Nexus learning loop | ✅ | 🩷 COMPLETE — all 12 items, see the 🧠 NEXUS section |
| 517 | Unified operating record (per-lead timeline: sends·replies·bookings·ops·money — `/vida/record`) | ✅ | 🩷 |
| 504 | Milla↔Vida toggle | ✅ decided: two apps | — |
| — | Deploy pipeline `scripts/ship.sh` | 🟡 PR #1126 | ❌ merge to use |
| — | Auto-deploy · CI | ⏸ flagged | ⏸ |
| E1 | TTL expiry → release $3 (**daily stale-hold sweep** — fail-safe backstop, cron 03:30 UTC) | ✅ | 🩷 |
| E2 | Client rejects → pass | ✅ | 🩷 |
| E3 | Insufficient $1 → top-up | ✅ | 🩷 |
| E4 | Bounce → $1 refund | ✅ | 🩷 |
| E5 | Wrong person → **KEEP REFUNDING** (founder ruling 24 Jul — current auto-refund IS the rule) | ✅ decided | 🩷 |
| E6 | Duplicate → suppressed | ✅ | 🩷 |
| E7 | Risky reply → escalate (**legal/complaint filter → founder alert + record**, `isRiskyReply` +3 tests) | ✅ | 🩷 |
| E8 | Reviewer rejects draft | ✅ | 🩷 |
| E9 | Booking fails → retry ladder (**3-attempt backoff** in performBooking; auth-fail breaks fast) | ✅ | 🩷 |
| E10 | Kill-switch | ✅ | 🩷 |
| E11 | No-show → keep (**built via #499m** — keep + 2 rebooks; auto-detection future) | ✅ | 🩷 |
| E12 | Payment fail → webhook | ✅ | 🩷 |

## COMBINED · 🧠 NEXUS — per-client learning brain (#511, full build, phased)
> Each client's **private** learning brain — learns on that client's results ONLY, **never shared across clients** (the fence IS the product). Builds on what already exists: `figsy_memory` (per-client), the `/internal/evals` math, the `outcome_events` data floor, and the `#517` per-lead record. **5 PRs, in order — the money-sensitive sourcing tune lands AFTER the guardrails.** Everything below is 🔴 not built.

| # | Phase | Item | Main | Live |
|---|---|---|:--:|---|
| 511a | 0 · Foundation | `nexus_profiles` table (migration) — one fenced-by-client row: reply/meeting rate, best subjects, winning angle, best-converting persona, objection patterns, sample size + confidence | ✅ | 🩷 |
| 511b | 0 · Foundation | `computeNexusProfile(clientId)` — deterministic, bounded per-client aggregator (enrollments + replies + bookings + sent_emails); **no LLM** (cheap); honest `confidence` on thin data | ✅ | 🩷 |
| 511c | 0 · Foundation | Nightly cron `/internal/nexus/recompute-all` (04:00 UTC) — refresh every client's profile | ✅ | 🩷 |
| 511v | 1 · Signals (read) | `GET /operator/nexus?client_id=` + **Vida Nexus panel** (`/vida/nexus`, rail link live) — what's converting, with honest confidence | ✅ | 🩷 |
| 511m | 1 · Signals (read) | **Milla "why this lead fits"** — ✅ **already live** (masked card renders `why_fits` from name-scrubbed `score_reasoning`, `leads.ts:245` + `milla/page.tsx:190`); Nexus persona-match badge = optional later | ✅ | 🩷 |
| 511g1 | 3 · Guardrails | **Per-client fence** — `assertSameClient` chokepoint (throws `NexusFenceError` cross-client) + fence tests; every write-back MUST call it | ✅ | 🩷 |
| 511g2 | 3 · Guardrails | **Confidence gate** + off/learning/ready state — `autoTuneReady` (confident + ≥3 meetings + ≥40 worked) +tests; shown in the panel | ✅ | 🩷 |
| 511g3 | 3 · Guardrails | **Founder kill-switch** — per-client `nexus_autotune_enabled` (default OFF) + global `NEXUS_AUTOTUNE_KILL`; toggle in the Vida panel; deterministic compute = cost guard (no LLM) | ✅ | 🩷 |
| 511t1 | 2 · Auto-tune | **Widened learning writers** — persona-that-books, objection patterns, meeting-weighted rates captured in `nexus_profiles` (realized there, not bolted onto figsy_memory) | ✅ | 🩷 |
| 511t2 | 2 · Auto-tune | **Sequences auto-tune (GATED)** — `generateSequenceWithMemory` injects the client's persona + objection-preempt guidance **only when `nexusTuneGate` is ready**; default-deny = byte-identical to today; `assertSameClient` fence-checked. No spend change | ✅ | 🩷 |
| 511t3 | 2 · Auto-tune | **Sourcing auto-tune (GATED)** 💳 — `scoreLeadsForIcp` nudges scoring toward the client's booked-meeting persona **only when `nexusTuneGate` is ready** (per-client switch, `assertSameClient`-fenced); default-deny = scoring/PDL spend byte-identical to today until you enable it | ✅ | 🩷 |
| 511f | 4 · Flywheel | **Milla "What Milla's learning for you"** — client-facing `GET /leads/nexus-summary` (safe, fenced) + dashboard card; dogfood inherent (Client-Zero compute) | ✅ | 🩷 |

**Nexus build order (each = one PR):** ✅ **① 511a·511b·511c·511v·511m — Phase 0+1 BUILT** (compute + surface, zero money risk) → ✅ **② 511g1·511g2·511g3 — Phase 3 guardrails BUILT** (fence + confidence gate + kill-switch, all before any write-back) → ✅ **③ 511t1·511t2·511f — Phase 2-copy + Phase 4 BUILT** → ✅ **④ 511t3 — sourcing tune BUILT (gated, default-off).** 🎉 **NEXUS COMPLETE** — all 12 items built; every tuning path is default-deny behind the per-client kill-switch + confidence gate + fence.
**Load-bearing risks:** unit economics (LLM compute vs $4 margin — batch nightly) · the fence is the product (one cross-client leak breaks the promise — tested) · auto-tune touches spend (sourcing changes = PDL spend — co-pilot-gated) · cold start (thin data reads "still learning," never a confident-but-wrong signal).

---

## What's left (the ❌ / 🚩 list)
- **Milla:** ✅ all reds built **except 🚩 #515 magic-link + SMS** — flagged: no SMS provider configured, and no-login money approve needs a security decision.
- **Vida:** ✅ built — #502 Engine rail · all 12 native pages (#530–#541) · #494 Qualify gate · #499 Bookings + Mark no-show · #493c gate chips · #505 blockers strip · **#499m no-show → 2 rebooks → keep the $3** · **#498b one-click sourcing w/ pool-aware confirm** · **🧠 Nexus signals panel (#511v)**. Nothing left.
- **Combined:** ✅ E1 stale-hold sweep · E9 booking retry · E7 risky-reply escalate · #517 operating record · E5 ruled (keep refunding). **🧠 NEXUS COMPLETE** — all 12 items (511a–511f) built, every tuning path default-off behind kill-switch + confidence gate + fence.
- **The ONLY items not built:** **🚩 #515** Milla magic-link + SMS approve (needs an SMS provider + a no-login security decision — both founder calls) · **⏸ Auto-deploy / CI** (blocked — GitHub account flagged since 3 Jul).

**Milla old-portal exit: CLOSED** — all 11 rail/account links point to `/milla/*` native routes. **Vida old-admin exit: CLOSED** — the account-dropdown nervous-system + the rail Engine section both point to `/vida/*` native routes (12 real engine pages inside the Vida shell), and the Bookings rail link is now live.
