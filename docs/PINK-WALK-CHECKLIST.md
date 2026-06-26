# 🩷 PINK WALK — self-walk checklist (58 items)

Pink = **live but not verified.** For each: walk it → if it works it's 🟢, if it's broken it's 🔴 (note it, I'll fix). Make notes in the right column. Come back to me with anything stuck or broken.

**Portal = `app.get-kind.com` · Website = `www.get-kind.com` · Admin = `admin.get-kind.com`**

---

## A. CLICK-WALKABLE NOW — portal screens (do these first)

| # | Item | Where | What to check | Your note |
|---|------|-------|---------------|-----------|
| 112 | Unibox inbox | `/dashboard/inbox` | Loads real replies? Known TODOs: ICP-score "—", archive, "booked" persistence | |
| 113 | A/B subject testing | `/dashboard/figsy` → open campaign → **A/B Test** tab | Makes sense + works? | |
| 114 | Kanban pipeline | `/dashboard/figsy/kanban` | Real cards + drag? | |
| 3 | Vida chatbot | `www.get-kind.com` (chat bubble) + `/dashboard/chatbot` (config) | Replies + captures? | |
| 62 | Vida help bubble | bottom-right bubble on any `/dashboard` page | Opens + answers? | |
| 66 | "Help me reply" | `/dashboard/inbox` → open a reply → Help me reply | Drafts a reply? | |
| 68 | "Why FIGSY wrote this" | inbox / campaign email card | Shows the reasoning card? | |
| 70 | Template library | `/dashboard/templates` | One-click copy works? | |
| 72 | Cmd+K quick actions | press **Cmd+K** anywhere in dashboard | Palette opens + jumps? | |
| 78 | "What's New" feed | `/dashboard/whats-new` | Renders updates? | |
| 80 | Teams Hub | `/dashboard/team` | Overview loads (tabs may say coming-soon) | |
| 83 | Integrations Hub | `/dashboard/integrations` | Status list loads (Connect = coming-soon) | |
| 85 | Slim nav + agent switcher | left sidebar | Switches agents cleanly? | |
| 86 | Profile dropdown hub | top-right avatar menu | All account links work? | |
| 88 | Activity feed page | `/dashboard/activity` | Loads? (orphan — also a Home widget) | |
| 90 | Deliverability dashboard | `/dashboard/deliverability` | Redirects to Performance (intended) | |
| 162 | Prompt Library | `www.get-kind.com` → Resources | Renders + searchable? | |
| 179 | Shareable pipeline view | `/dashboard/figsy` → Share | Public link works? | |
| 183 | Campaign kill-switch | `/dashboard/figsy` (pause-all) | Pauses ALL campaigns? | |
| 91 | Mobile PWA | open `app.get-kind.com` on phone → Add to Home Screen | Icon + installs? | |

## B. CLICK-WALKABLE — needs a COMPANY DEMO ACCOUNT (come to me to provision)
| # | Item | Where | What to check | Your note |
|---|------|-------|---------------|-----------|
| 55 | Command Centre | `/dashboard/company` | Company KPIs + rep rollup | |
| 59 | Admin "Company demo" provisioning | admin | Can spin up a demo company | |
| 106 | Rep invite email | company → invite a rep | Email/link sends | |
| 107 | Owner drill-down | company → open a rep | See rep pipeline/inbox | |
| 108 | Edit/deactivate rep | company → rep settings | Edit budget / remove | |
| 109 | Manager role + notifications | company | Owner↔rep alerts | |
| 110 | Per-rep routing + dedup | company | Leads split per rep | |
| 111 | Per-rep calendars | company | Each rep's calendar | |

## C. NEEDS A TEST CAMPAIGN / EVENTS (can't click — fire on a real run)
*These only prove themselves when a campaign/lead actually flows. Flag for the functional-test pass.*
| # | Item | How it's tested | Your note |
|---|------|-----------------|-----------|
| 60 | R1 demo-bounce guard | send to a synthetic demo mailbox → skipped | |
| 61 | R2 daily client brief | toggle on → brief arrives | |
| 63 | R4 speed-to-lead | hot visitor → scored lead + Denise draft | |
| 64 | R5 milestone cards | hit a milestone → card shows | |
| 65 | R6 onboarding emails | new paid client → day 0/3/7 emails | |
| 67 | R8 saved views | save a leads view → persists (per-browser) | |
| 69 | R10 Goals | set a goal → tracks (per-browser) | |
| 71 | R12 lead-capture forms | embed form → submission → scored lead | |
| 73 | R14 Meeting-Prep | booked meeting → Denise pre-call brief | |
| 76 | R17 spam-score pre-send | compose → spam score shows before send | |
| 77 | R18 multi-model toggle | campaign → switch Haiku/Sonnet | |
| 79 | R20 job-change alerts | lead changes job → alert | |
| 94 | PDL 2nd discovery source | run an ICP → PDL leads appear | |
| 95 | Hunter waterfall enrichment | run an ICP → revealed emails | |
| 193 | Real open-tracking | n/a for cold (no pixel) — warm/transactional only | |
| 194 | Deliverability hardened | inbox-placement test (ties to 198 warmup) | |

## D. VERIFY ON FIRST REAL CHARGE / BACKEND (self-certifies)
*Billing correctness — confirm on your next real payment, not by clicking.*
| # | Item | How it's confirmed | Your note |
|---|------|--------------------|-----------|
| 166 | Double-charge killed | one real FIGSY charge = $3 once, not $4 | |
| 167 | FIGSY-only bundle delivers | FIGSY-only client gets leads | |
| 168 | 3 price tables reconciled | checkout price = displayed price | |
| 169 | clients.plan flag | client billed on correct plan | |
| 170 | Atomic credit RPC | credits never double-count | |
| 171 | "How credits work" panel | panel copy matches reality | |
| 58 | Denise $39 Stripe price | Denise checkout = $39 | |
| 238 | C4 currency | charged in USD | |
| 240 | C6 voice copy | no overstated voice claims | |
| 186 | Signup T&C record | signup writes timestamp + IP | |
| 187 | Sequence apply-to-campaign | applied sequence sends literal copy | |
| 188 | Denise on demo | demo account shows Denise + drafts | |
| 75 | R16 evals harness | admin-only; reads real data | |
| 184 | Public status page | `/status` (built, unlinked) | |

---

**Legend for your notes:** ✅ works (→ I flip 🟢) · ❌ broken (→ I fix) · ❓ unsure (→ ask me).
When done (or stuck), bring me your notes and I'll flip dots + fix the ❌s one at a time.
