# Portal V2 Layout — Month 2 Upgrade

> ⛓️ ⚠️ **HISTORICAL (23 Sep, checked against main `83e9c1b`): a 25 Jun "Month 2" plan for the old `/dashboard` portal. Clients no longer reach that portal — the portal middleware redirects every signed-in `/dashboard/*` (except the partner/developer personas) to Milla at `/milla` (`apps/portal/src/middleware.ts`), and the client product is the six MVP1 stages, Brief → Proof → Programme → Approval → Results → Complete (R127). Kept as a record, not current instructions.**

`Last-checked: 25 Jun 2026`

Inspired by ClickUp Super Agents UX. All items below are post-launch (week 5+).

---

## 1. Agent Card Grid (Dashboard Home)
**Priority: High**

Replace the current tab/list layout with a full card grid.
- Each agent (FIGSY, Milla, Vida, Denise) gets its own card
- Pixar 3D avatar prominent at top of card
- Card shows: agent name, one-line role, status (active/inactive), last activity
- Click card → opens agent workspace
- New client sees locked cards with "Activate" CTA

---

## 2. Agent Thinking / Working State
**Priority: High**

When an agent is running (sourcing leads, drafting emails), show it visually.
- Inline status: "FIGSY is building your lead list…"
- Step indicators: Starting → Processing → Done
- Prevents "did it work?" confusion

---

## 3. Conversational Agent Setup
**Priority: Medium**

Replace the ICP form and FIGSY settings form with a guided chat flow.
- "What kind of companies are you trying to reach?"
- Agent asks 3-4 questions, fills the config behind the scenes
- Form still accessible as "Advanced" for power users

---

## 4. Structured Agent Config Panel
**Priority: Medium**

Break the FIGSY settings page into clear sections:
- **Role** — what this agent does
- **ICP** — who it targets
- **Tone & Messaging** — how it writes
- **Schedule** — when it runs
- **Knowledge** — any docs/context uploaded

---

## 5. Agent Marketplace / Activation Flow
**Priority: Low (month 3)**

New client onboarding screen styled like a marketplace.
- "Meet your AI Revenue Team"
- Pre-built agents, certified and ready
- One-click activate per agent
- Replaces the current onboarding checklist

---

## Tech Notes
- Card grid: CSS Grid, existing Pixar image assets, no new dependencies
- Thinking state: poll existing job/status endpoints, add a `status` field if needed
- Conversational setup: reuse the existing chat component pattern from FIGSY onboard
