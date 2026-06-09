# 🎯 K.I.N.D — V2 + COMPANY (#88) TRACKER

**The single source of truth for everything not-yet-done. Work top→bottom. Nothing lives only in chat.**
_Last updated: 9 Jun 2026 (late)._

Legend: ✅ done/live · 🟡 partial · 🎨 mockup only (designed, NOT built) · ⬜ not started · 🔴 open issue

---

## A. COSMETIC ISSUES YOU RAISED (this session) — tracked so none are lost
| # | Issue | Status |
|---|-------|--------|
| 1 | Top-right purple dot → name/initials + hover profile | ✅ done |
| 2 | Sidebar agent "lump" → switcher (photos + dropdown) | ✅ done |
| 3 | Dashboard not collating real sent emails | ✅ fixed |
| 4 | **ICP above People (nav flow)** — was People→ICP, backwards | ✅ **fixed** (now ICP Builder→People) |
| 5 | **"This card is not right"** (FIGSY agent image card — crop/quality) | 🔴 **OPEN** — reviewing every agent-image card for full clean portrait (canonical `AgentSidePanel` style, `object-top`, not tight-cropped) |
| 6 | "Inbox isn't right" | 🎨 = multi-channel Smart Inbox (feature, see D) |
| 7 | **Company payment system missing from V2** | 🎨 mockup only — see Section C |
| 8 | Vida help bubble (bottom-right) | ⬜ V2-11, see D |

---

## A2. DESIGN-MATCH GAPS — shipped but does NOT fully match the V2 design (honest downgrade)
| Item | Built | Design wants | Status |
|------|-------|-------------|--------|
| **Profile dropdown** (top-right) | initials chip · My profile / Settings / Sign out | **Usage · Billing · Team · Settings · Developer API · Sign out** | 🟡 partial — missing 4 items |
| **Top-right header** | Credits · Bell · Profile | + **"Invite teammate"** button · **Roadmap** icon | 🟡 partial — missing Invite + Roadmap |
| **Config Panel** | read-only view + edit links | **editable form** (Agent Name · Primary Objective · Problem We Solve · Tone · Schedule · **Save**) | 🟡 partial — not editable |
| **Agent cards** | small cropped avatar | full clean portrait (canonical panel) | 🔴 #5 crop issue |

---

## B. COSMETIC QA — EVERY SCREEN × EVERY STATE (full pass, nothing skipped)
Review each screen in **all states**: empty · loading/thinking · populated · error. Check each agent image, persona role label, status, Certified badge, name consistency.

| Screen | Empty | Loading | Populated | Error | Notes |
|--------|:---:|:---:|:---:|:---:|------|
| Welcome / Onboard (Spotlight) | ⬜ | ⬜ | ✅ | ⬜ | FIGSY head crop fixed; check other states |
| Signup (T&C) | — | ⬜ | ✅ | ⬜ | social parked |
| Dashboard Home (Agent Grid) | ⬜ | ⬜ | 🟡 | ⬜ | **#5 card-image issue** |
| Sidebar (agent switcher) | — | — | ✅ | — | nav order fixed |
| Leads / People | ✅ | ✅ | ✅ | ✅ | ICP card (C1) live |
| ICP Builder | ⬜ | ⬜ | ⬜ | ⬜ | review |
| Config | — | ✅ | ✅ | ⬜ | |
| Marketplace | — | — | ✅ | ⬜ | agent images — check crop (#5) |
| Thinking panel | — | ✅ | — | — | |
| Inbox | ⬜ | ⬜ | 🟡 | ⬜ | old live one; V2 = feature (D) |
| Campaigns / FIGSY | ⬜ | ⬜ | ⬜ | ⬜ | review |
| Agent pages (FIGSY/Milla/Vida/Denise) | ⬜ | ⬜ | ⬜ | ⬜ | image + role consistency |
| Agent side panels / conversations | ⬜ | ⬜ | ⬜ | ⬜ | every conversation state |

---

## C. 🏢 THE COMPANY SYSTEM (#88) — DESIGNED, **NOT BUILT** (the bit I downplayed)
**This is core to the product, not a minor backlog item.** Source: `CLIENT_FLOW.html` Part 2. All exist as mockups (`/dashboard/v2/page.tsx`, sample data — Acme Sales Co etc.); **none are functional.** Requires the workspace→member DB re-architecture. **Target: after 19th (~26–30 Jun).**

| Piece | Status | What it is |
|-------|--------|-----------|
| **One company payment** (owner buys N seats, one bill) | 🎨 mockup | Hybrid pricing: seat per rep + usage |
| **Per-Rep Seats** (each rep own FIGSY/leads/voice/calendar) | 🎨 mockup | 10 reps = 10 autonomous SDRs |
| **Usage & Budget** (allocate credits → rep requests → owner approve/deny) | 🎨 mockup | "Enterprise running Claude" model |
| **Company Command Centre** (leaderboard, every rep's leads/meetings/spend) | 🎨 mockup | Owner oversight on top |
| Per-rep lead **ownership/routing** (no two reps hit same person) | ⬜ | + CRM dedup |

---

## D. DESIGNED, NOT BUILT — other workstreams (post-19th)
| Item | Status | Lands |
|------|--------|-------|
| **#84 Integrations Hub** (HubSpot/Pipedrive/Calendar/WhatsApp/LinkedIn/Apollo/Stripe) | 🎨 mockup | per-rep calendars |
| **#89 Sequence Builder** (templates → visual branching tree, multi-channel) | 🎨 mockup | replaces fixed 3-step |
| **V2-8 AI Notetaker → action items** (Milla extracts from transcript) | 🎨 mockup | Critical |
| **Multi-channel Smart Inbox** (LinkedIn/WhatsApp/SMS + reply-tags + "Help me reply") | 🎨 mockup | = "inbox isn't right" |
| **V2-3 Conversational setup** (chat with Casey, not forms) | ⬜ | |
| **V2-10 Casey** onboarding agent | ⬜ avatar ready | |
| **V2-11 Vida help bubble** (bottom-right) | ⬜ | quick (reuses embed) |
| **V2-13 Multi-provider calendar** (Outlook/Zoho/Calendly) | ⬜ | → #88 |

---

## E. ✅ SHIPPED & LIVE (today)
Agent Grid (V2-1) · Thinking (V2-2) · Config (V2-4) · Marketplace (V2-5) · Slim sidebar + agent switcher + profile chip (V2-6) · Leads C1/C3 · Welcome Spotlight · Signup T&C · Sent-count fix · ICP→People nav order.

---

## F. 🚀 FUTURE / UPGRADES / STEALS (Month 2+)
MCP server (#59) · Milla CRM pull (#47) · Memory v2 pgvector (#46) · Lead-capture Forms (#83) · milestone share-to-LinkedIn (#81) · 2nd data source (Manus) · Alta steals (Touch-Points tree · template gallery · per-agent Train tabs · Performance funnel · Unibox reply-tags) · agent family build-out (Lena · Tony).
