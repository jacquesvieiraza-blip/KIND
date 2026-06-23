# K.I.N.D Build Status — Sprint: AI Business Roadmap

**Branch:** `claude/ai-business-roadmap-U3OWJ`
**Last updated:** 2026-05-27
**TypeScript:** ✅ Clean on all commits

---

## 34-Item Build List — Status

### 🟢 Done — Shipped

| # | Item | Commit | Notes |
|---|------|--------|-------|
| 1 | Sidebar redesign — agent switcher, persona card, context nav | b97cbcf | |
| 4 | Home page hero — FIGSY "who to target" with live chips | b97cbcf | |
| 5 | Setup Compass — 5-step checklist with completion state | b97cbcf | |
| 3 | Co-pilot / Auto-pilot mode toggle on campaigns | 850ac6e | React state; backend persistence pending |
| 6 | Three-panel inbox — folder nav, conversation list, thread detail | 850ac6e | |
| 7 | 9 reply classification tags (Meeting Booked, Positive, Nurturing, etc.) | 850ac6e | |
| 8 | AI Reply Assist panel — "Help me reply" + regenerate + copy | 850ac6e | |
| 9 | Help me reply / Use next message buttons | 850ac6e | |
| 10 | Knowledge/Compass page — 7-tab training layer | 850ac6e | |
| 11 | DNC list (email/domain/company, permanent block) | 850ac6e | |
| 16 | Messaging tab — tone, length, persona | 850ac6e | |
| 17 | Source URL training / Context tab | 850ac6e | |
| 23 | Knowledge prompts — per-step overrides for sequence steps | 850ac6e | |
| 27 | Performance page — 10 metrics, LinkedIn placeholders, funnel, benchmarks | 850ac6e | |
| 31 | Ask FIGSY persistent button — chat widget on all dashboard pages | 850ac6e | |
| 15 | Campaign template library — 6 templates with modal chooser | e6d68a9 | |
| 28 | People page — pipeline stage tabs (Pending Review, Consented, In FIGSY, Opted Out) | e6d68a9 | |
| 29 | Pending Review banner + bulk-enroll CTA | e6d68a9 | |
| 30 | Campaign progress bar (Enrolled/Sent/Interested segments) on campaign cards | e6d68a9 | |
| 12 | Visual sequence builder — step cards with channel, delay, condition | 16e21f8 | New /figsy/[id] page |
| 13 | Per-node prompt config (per-step prompt overrides in sequence builder) | 16e21f8 | |
| 14 | Full action menu — activate, pause, sequence configure, audience, settings | 16e21f8 | |
| 19 | Daily volume slider (enrollment rate control) | 16e21f8 | In Audience tab |
| 33 | Campaign banner (active campaign status in campaigns list) | existing | |

---

### 🟡 Partially Done — Frontend only (backend needed)

| # | Item | What's built | What's missing |
|---|------|-------------|----------------|
| 2 | Co-pilot approval queue — "Waiting for Review" tab | Co-pilot mode toggle on campaigns | Backend: draft queue endpoint, Inbox filter for drafts |
| 24 | Messaging tab content | UI built in Knowledge page | Backend: POST /figsy/knowledge/messaging |
| 25 | DNC list UI | Built in Knowledge/DNC tab | Backend: POST /figsy/knowledge/dnc + enforcement |
| 26 | Pitch/Keywords/Signals training | UI built in Knowledge tabs | Backend: POST /figsy/knowledge/* endpoints |
| 32 | Ask FIGSY chat | UI + widget built | Backend: POST /figsy/chat endpoint |
| 34 | Multi-metric progress bar | Built on campaign cards | Accurate % needs backend sequence tracking |

---

### 🔴 Not yet built

| # | Item | Priority | Notes |
|---|------|----------|-------|
| 18 | Audience source picker tabs (Apollo / LinkedIn / CSV / Manual) | Medium | Add to ICP builder or campaign Audience tab |
| 20 | Social signals panel on leads | Medium | LinkedIn buying signal badges on lead cards |
| 21 | Three-panel audience builder | Low | Complex — ICP builder already functional |
| 22 | AI enrichment columns (technographics, job postings) | Medium | Need Apollo enrichment API integration |

---

## Files Changed This Sprint

```
apps/portal/src/
├── app/
│   └── (dashboard)/
│       ├── layout.tsx                          ← Added AskFigsyButton
│       └── dashboard/
│           ├── page.tsx                         ← FIGSY hero, Compass, stats bar
│           ├── figsy/
│           │   ├── page.tsx                     ← Co-pilot, templates, progress bars
│           │   ├── [id]/
│           │   │   └── page.tsx                 ← NEW: Sequence builder
│           │   └── replies/
│           │       └── page.tsx                 ← THREE-PANEL REBUILD
│           ├── knowledge/
│           │   └── page.tsx                     ← NEW: 7-tab training page
│           ├── kpis/
│           │   └── page.tsx                     ← Rebuilt: 10 metrics + LinkedIn
│           ├── leads/
│           │   └── page.tsx                     ← Pipeline stage tabs
│           └── roadmap/
│               └── page.tsx                     ← New sections + New badges
└── components/
    ├── layout/
    │   └── Sidebar.tsx                          ← Full rebuild
    └── ui/
        └── AskFigsyButton.tsx                   ← NEW: Chat widget
```

---

## Next Actions

### Immediate (frontend, no backend needed)
1. Audience source picker tabs on `/dashboard/leads/icp` — add Apollo/LinkedIn/CSV tabs
2. Social signals section on People table — buying signal badges on lead rows
3. AI enrichment column UX — add column with placeholder enrichment data
4. Billing page — credit usage chart with sparkline
5. Usage page — spending timeline chart

### Needs backend
1. `POST /figsy/knowledge/*` — persist Knowledge/Compass training data
2. `POST /figsy/campaigns/:id/sequence` — save sequence step config
3. `POST /figsy/chat` — Ask FIGSY conversational endpoint
4. Co-pilot draft queue — drafts endpoint for approval workflow
5. LinkedIn metrics — connect LinkedIn tracking to Performance page

### Smoke tests (before outreach)
Run T1–T10 from CHANGELOG.md smoke test checklist.

---

## Commit History

| SHA | Message |
|-----|---------|
| `16e21f8` | Visual sequence builder, campaign detail page with 3-tab layout |
| `e6d68a9` | Campaign templates, progress bars, People tabs, Roadmap refresh, Compass Knowledge step |
| `850ac6e` | Three-panel inbox, Knowledge/Compass, Performance v2, Co-pilot mode, Ask FIGSY button |
| `b97cbcf` | Sidebar redesign + Home page hero |
