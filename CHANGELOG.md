# K.I.N.D Portal — Change Log

All significant product changes across branches. Most recent at top.

---

## Sprint: AI Business Roadmap
**Branch:** `claude/ai-business-roadmap-U3OWJ`
**Commits:** b97cbcf → 16e21f8
**Status:** In progress

---

### Commit `16e21f8` — Visual Sequence Builder + Campaign Detail Page

**New page:** `/dashboard/figsy/[id]` — Campaign detail with three tabs

#### Sequence Tab
- Visual step cards connected by flow lines — each step shows channel badge (Email/LinkedIn/SMS), condition (If no reply / If opened), send day
- Per-step configuration: channel selector, delay (day number), send condition, subject guidance, body guidance, prompt override
- Add/remove steps (up to 7 total)
- Save sequence button (POSTs to `/figsy/campaigns/:id/sequence` when backend supports)

#### Audience Tab
- Min lead score slider (0–100)
- Daily enrollment limit slider (1–50/day) — prevents spike sending
- Source filter pills: All consented / Apollo only / High score 80+ / Specific ICP
- Enrolled stats block showing Enrolled / Sent / Replied

#### Settings Tab
- Campaign name editor
- Auto-Pilot / Co-Pilot mode selector
- Sending window time picker (start + end hour)
- Archive campaign (non-active only)

**Changed:** Campaign cards on `/dashboard/figsy` now link to detail page by clicking the campaign name.

---

### Commit `e6d68a9` — Campaign Templates, Progress Bars, People Tabs, Roadmap Refresh

#### Campaign Templates (figsy/page.tsx)
- "Templates" button opens a modal with 6 pre-built campaign types:
  - Cold Introduction (3 steps, cold outreach)
  - SaaS Trial Push (3 steps, trial-focused)
  - Event Follow-Up (2 steps, warm nurture)
  - Lead Reactivation (2 steps, re-engagement)
  - LinkedIn Warm Intro (3 steps, multi-touch)
  - Enterprise ABM (5 steps, account-based)
- Selecting a template pre-fills the campaign name and records the template config for future use

#### Campaign Progress Bars
- Each campaign card now shows a 3-segment coloured progress bar:
  - Blue segment: leads enrolled
  - Brand blue segment: emails sent (as % of sequence completion)
  - Green segment: interested replies
- Legend below bar: Enrolled / Sent / Interested

#### People Page — Pipeline Stage Tabs
Five tabs above the leads table:
- **All** — total lead count, no filter
- **Pending Review** — leads with high scores (≥ 70) not yet contacted; amber banner shows count + bulk-enroll CTA
- **Consented** — `consent_given` status
- **In FIGSY** — `consent_given` or `consent_sent` + Apollo badge
- **Opted Out** — `opted_out` status

**PipelineStageChip** component: coloured dot + label replaces old icon/badge combo.

**CampaignMicroBar** component on consented leads: 3-segment progress bar derived from `outreach_sent_at` and `crm_synced` fields.

Per-tab empty states with context-appropriate CTAs.

#### Roadmap Page
- Added Platform & Intelligence product section
- All newly shipped features marked with "New" badge: Three-panel inbox, Co-Pilot mode, Reply Assist, Knowledge/Compass, Ask FIGSY, Performance v2, Pipeline stage tabs
- Coming soon grid expanded to 6 items (was 4): added Visual Flow Builder and LinkedIn channel
- Stats strip now shows "Just shipped" counter alongside Live/Building/Planned

#### Dashboard Home
- Added fifth Compass step: "Train FIGSY — add your pitch & keywords" → `/dashboard/knowledge`

---

### Commit `850ac6e` — Three-Panel Inbox, Knowledge/Compass, Performance v2, Co-Pilot, Ask FIGSY

#### Three-Panel Inbox (`/dashboard/figsy/replies`)
Full rebuild of the flat accordion inbox into a three-panel layout:

**Left panel — Folder nav (9 tabs)**
| Tab | Classification | Colour |
|-----|---------------|--------|
| Meeting Booked | `hot` | Red |
| Positive | `interested` | Green |
| Nurturing | `warm` | Amber |
| Bad Timing | `cold` | Blue |
| Irrelevant | `not_interested` | Gray |
| Opted Out | `opt_out` | Rose |
| Wrong Person | `wrong_person` | Purple |
| OOO | `out_of_office` | Gray |
| Need Followup | `other` | Gray |

Live counts per tab. Urgent tabs (Meeting Booked, Positive) show red badge.

**Middle panel — Conversation list**
Each row: avatar initial, name, title/company, time-ago, body preview (100 chars), colour-coded tag dot + label. Selecting highlights with blue left border.

**Right panel — Thread detail**
- Contact header: name, role + company, email, LinkedIn link (if available)
- Classification badge (colour-coded)
- Email body: subject bar + full body text
- FIGSY AI Analysis: classification reasoning text
- **FIGSY Reply Assist panel** (for hot/interested/warm replies):
  - "Help me reply" button → calls `/figsy/replies/:id/suggest`
  - Editable textarea showing AI draft
  - Copy to clipboard + Regenerate buttons
- Opt-out notice for opt_out replies

Full-height layout (takes full screen within dashboard).

#### Knowledge & Compass (`/dashboard/knowledge`)
New page. 7 tabs in left sidebar nav:

| Tab | Purpose |
|-----|---------|
| **Pitch** | Company name, core pitch, pain points, differentiators |
| **Keywords** | Job titles, industries, positive/negative signals |
| **Signals** | Toggle buying signals on/off |
| **DNC** | Do Not Contact list (email / domain / company) |
| **Messaging** | Tone selector, email length, persona override |
| **Context** | Source URLs for FIGSY to train on (with training status) |
| **Prompts** | Per-step prompt overrides for Steps 1, 2, 3 |

DNC entries are displayed with type badge (email/domain/company) and delete button. Opt-outs from POPIA flow are added automatically by the backend.

Knowledge added to FIGSY sidebar nav (Brain icon).

#### Performance Page v2 (`/dashboard/kpis`)
Rebuilt with 10 metrics across 3 sections:

**Email Outreach (5 cards)**
- Emails sent
- Unique contacted (leads reached)
- Reply rate (with industry benchmark, accent/warn colouring)
- Positive replies (count + % of sent)
- Opt-outs

**Lead Pipeline (4 cards)**
- Total leads
- Avg lead score
- POPIA consented (with consent rate %)
- Pipeline value (estimated)

**LinkedIn Outreach (4 cards, Coming Soon)**
- Connection requests / Accepted / Messages sent / Replies
- Shown with muted styling + "Coming soon" badge

**Funnel:** 6-step visual funnel with percentage bars (Total → Scored → Consented → Contacted → Replied → Interested)

**Benchmarks:** Reply rate and interested rate vs B2B industry averages

**Refresh button** — re-fetches all data without page reload.

#### Co-Pilot Mode (campaigns page)
Mode toggle above campaign list:
- **Auto-Pilot**: FIGSY runs fully autonomously — generates, enrolls, follows up
- **Co-Pilot**: FIGSY drafts every email for your review before send

Amber confirmation banner when Co-Pilot is active. Mode stored in React state (backend persistence coming).

#### Ask FIGSY (global)
Floating button (bottom-right, all dashboard pages):
- Opens chat panel with FIGSY avatar + green online indicator
- Message thread with user/FIGSY bubbles
- Text input with Enter to send
- Typing indicator while loading
- First-person FIGSY responses (connects to `/figsy/chat` endpoint when built)

Added to `(dashboard)/layout.tsx` as `<AskFigsyButton />`.

---

### Commit `b97cbcf` — Sidebar Redesign + Home Page Hero

#### Sidebar (`Sidebar.tsx`)
- Deepened background to `#001228`
- **Agent persona card** at top: gradient avatar (F/M/V initial), name, role, chevron
- **Agent switcher dropdown**: shows all 3 agents with "Soon" badges for Milla/Vida
- **Context-aware nav per agent:**
  - FIGSY: Home / Campaigns / People / Inbox / Performance / Knowledge
  - Milla: Home / Assistant / Documents
  - Vida: Home / Chatbot
- Secondary nav (Usage/Roadmap/Billing/Settings) de-emphasised in smaller type below divider
- Credit balance + Notification bell in bottom strip
- SystemStatus component pings `/health` and shows operational/degraded dot

#### Home Dashboard (`dashboard/page.tsx`)
- **FIGSY hero**: "Who should we target today?" — gradient avatar + green pulse dot + time-based greeting
- **CRM suggestion chips**: dynamically generated from live data (consented leads count, interested reply count, campaign count)
- **Stats bar**: 5 metrics — Total leads / Enrolled / Emails sent / Reply rate % / Interested
- **Setup Compass**: 5 steps with CheckCircle2/Circle states, links to relevant pages
- **AI Team card**: FIGSY (active), Milla (soon), Vida (soon) with gradients + descriptions
- **FIGSY at-a-glance**: campaign summary (active count / enrolled / sent / hot replies) — only shown if campaigns exist

---

## File Map

| File | What changed |
|------|-------------|
| `apps/portal/src/components/layout/Sidebar.tsx` | Full rebuild — agent switcher, persona card, context nav |
| `apps/portal/src/components/ui/AskFigsyButton.tsx` | New — floating FIGSY chat widget |
| `apps/portal/src/app/(dashboard)/layout.tsx` | Added `<AskFigsyButton />` |
| `apps/portal/src/app/(dashboard)/dashboard/page.tsx` | Full rebuild — FIGSY hero, stats bar, Compass, AI team |
| `apps/portal/src/app/(dashboard)/dashboard/figsy/page.tsx` | Co-pilot toggle, template library, progress bars, detail links |
| `apps/portal/src/app/(dashboard)/dashboard/figsy/[id]/page.tsx` | New — campaign detail with sequence builder |
| `apps/portal/src/app/(dashboard)/dashboard/figsy/replies/page.tsx` | Full rebuild — three-panel inbox |
| `apps/portal/src/app/(dashboard)/dashboard/knowledge/page.tsx` | New — Knowledge/Compass 7-tab training page |
| `apps/portal/src/app/(dashboard)/dashboard/kpis/page.tsx` | Full rebuild — 10 metrics, LinkedIn placeholders, funnel v2 |
| `apps/portal/src/app/(dashboard)/dashboard/leads/page.tsx` | Pipeline stage tabs, Pending Review banner, micro progress bars |
| `apps/portal/src/app/(dashboard)/dashboard/roadmap/page.tsx` | New sections, New badges, Platform product, 6-item upcoming |
| `apps/portal/public/agents/` | Placeholder — drop `figsy.png`, `milla.png`, `vida.png` for avatar swap |
| `AGENT_AVATARS.md` | Midjourney + DALL-E 3 prompts for all 3 agent avatars |

---

## Pending / Still to build

### Functional (backend-dependent)
- [ ] `/figsy/campaigns/:id/sequence` — save sequence steps
- [ ] `/figsy/chat` — Ask FIGSY conversational endpoint
- [ ] `/figsy/knowledge/pitch` etc — persist Knowledge/Compass tab data
- [ ] Meeting booking detection + calendar push
- [ ] LinkedIn outreach channel

### Frontend (can build now)
- [ ] Social signals panel in ICP builder (trend badges on leads)
- [ ] AI enrichment columns on People table (technographics, job postings)
- [ ] Audience source tabs in ICP builder (Apollo / LinkedIn / CSV / Manual)
- [ ] Waiting for Review notifications on home dashboard (live reply count badge)
- [ ] Billing page improvements — credit usage chart
- [ ] Usage page — spending timeline chart

---

## Smoke Test Checklist (T1–T8)

| ID | Test | Status |
|----|------|--------|
| T1 | Login → redirect to /dashboard | ⬜ |
| T2 | Sidebar agent switcher — toggle FIGSY/Milla/Vida | ⬜ |
| T3 | FIGSY Campaigns — create, activate, pause | ⬜ |
| T4 | Campaign detail — configure sequence steps, save | ⬜ |
| T5 | Inbox three-panel — navigate tabs, open reply, Help me reply | ⬜ |
| T6 | Knowledge page — fill Pitch, add DNC entry, save | ⬜ |
| T7 | Performance — all metric cards load, refresh works | ⬜ |
| T8 | People — tab switching, Pending Review banner | ⬜ |
| T9 | Ask FIGSY button — opens, send message, receive response | ⬜ |
| T10 | Roadmap page — "New" badges visible | ⬜ |

---

## Environment Variables

| Variable | Where set | Purpose |
|----------|-----------|---------|
| `NEXT_PUBLIC_API_URL` | Railway → Portal env | K.I.N.D API base URL |
| `NEXT_PUBLIC_SUPABASE_URL` | Railway → Portal env | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Railway → Portal env | Supabase anon key |

**Security note:** Never paste API keys or secrets in chat. Add directly to Railway environment variables.

---

## Architecture Notes

### Portal stack
- **Framework:** Next.js 14 App Router
- **Auth:** Supabase Auth (server + client helpers)
- **Styling:** Tailwind CSS (brand colours: `#0066FF` blue, `#001f4d` navy, `#001228` sidebar)
- **Icons:** Lucide React
- **API calls:** `@/lib/api` wrapper (GET/POST/PATCH/DELETE with Bearer token)

### Agent identity
| Agent | ID | Colour | Role |
|-------|-----|--------|------|
| FIGSY | `figsy` | `#0066FF` blue | AI SDR — outbound prospecting |
| Milla | `milla` | `#7c3aed` purple | Virtual Assistant — email, scheduling |
| Vida | `vida` | `#0d9488` teal | Chatbot — website + WhatsApp inbound |

### API base URL
- Production: `https://kindapi-production-e64c.up.railway.app`
- Set via `NEXT_PUBLIC_API_URL` in Railway
- Fallback in `SystemStatus` component health check

### Authentication flow
- `(dashboard)/layout.tsx` — server component, gates all dashboard routes
- `createClient()` from `@/lib/supabase/server` (server) or `@/lib/supabase/client` (client)
- All API calls pass `session.access_token` as `Authorization: Bearer`

### Knowledge/Compass data (future backend)
When persistence is added, Knowledge tabs will POST to:
- `POST /figsy/knowledge/pitch`
- `POST /figsy/knowledge/keywords`
- `POST /figsy/knowledge/signals`
- `POST /figsy/knowledge/dnc`
- `POST /figsy/knowledge/messaging`
- `POST /figsy/knowledge/context`
- `POST /figsy/campaigns/:id/sequence` (step overrides)
