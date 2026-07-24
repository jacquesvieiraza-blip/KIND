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
| 511v | Nexus signals view | 🚩 | **FLAGGED — no Nexus backend = would be a shell** |

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
| 511 | Nexus learning loop | ❌ | ❌ |
| 517 | Unified operating record | ❌ | ❌ |
| 504 | Milla↔Vida toggle | ✅ decided: two apps | — |
| — | Deploy pipeline `scripts/ship.sh` | 🟡 PR #1126 | ❌ merge to use |
| — | Auto-deploy · CI | ⏸ flagged | ⏸ |
| E1 | TTL expiry → release $3 (release primitive exists; **no cron sweep** — needs building) | ⚠️ | ❌ |
| E2 | Client rejects → pass | ✅ | 🩷 |
| E3 | Insufficient $1 → top-up | ✅ | 🩷 |
| E4 | Bounce → $1 refund | ✅ | 🩷 |
| E5 | Wrong person → no-refund rule (**`wrong_person` classification exists**; explicit rule/handler not built) | ❌ | ❌ |
| E6 | Duplicate → suppressed | ✅ | 🩷 |
| E7 | Risky reply → escalate (**no reply-risk escalation path**; hot_reply alert exists, not this) | ❌ | ❌ |
| E8 | Reviewer rejects draft | ✅ | 🩷 |
| E9 | Booking fails → retry ladder (**no retry logic** in calendar.ts/gcal.ts — needs building) | ❌ | ❌ |
| E10 | Kill-switch | ✅ | 🩷 |
| E11 | No-show → keep (**built via #499m** — keep + 2 rebooks; auto-detection future) | ✅ | 🩷 |
| E12 | Payment fail → webhook | ✅ | 🩷 |

---

## What's left (the ❌ / 🚩 list)
- **Milla:** ✅ all reds built **except 🚩 #515 magic-link + SMS** — flagged: no SMS provider configured, and no-login money approve needs a security decision.
- **Vida:** ✅ built — #502 Engine rail · all 12 native pages (#530–#541) · #494 Qualify gate · #499 Bookings + Mark no-show · #493c gate chips · #505 blockers strip · **#499m no-show → 2 rebooks → keep the $3** · **#498b one-click sourcing w/ pool-aware confirm**. **🚩 Still flagged (not built — no backend = shell):** #511v Nexus signals.
- **Combined (audited 24 Jul vs code — still to build):** **E1** TTL-expiry $3 release (needs a cron sweep — release primitive exists) · **E9** booking-fail retry ladder (no retry logic today) · **E7** risky-reply → escalate (no path) · **E5** wrong-person no-refund rule (classification exists, rule doesn't) · **#511** Nexus learning loop (no backend) · **#517** unified operating record (doc-only). **Already done:** E11 no-show → keep is built via #499m. **Blocked:** auto-deploy/CI (GitHub account flagged).

**Milla old-portal exit: CLOSED** — all 11 rail/account links point to `/milla/*` native routes. **Vida old-admin exit: CLOSED** — the account-dropdown nervous-system + the rail Engine section both point to `/vida/*` native routes (12 real engine pages inside the Vida shell), and the Bookings rail link is now live.
