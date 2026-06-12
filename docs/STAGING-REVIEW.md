# 🔍 K.I.N.D — STAGING REVIEW LOG

> **Purpose:** the founder walks every new feature on the isolated staging environment and records
> reactions — what works, what doesn't — one screen at a time, over multiple sessions. This is the
> single capture doc so nothing is lost across days. Worked through at the founder's pace.
>
> **Judgment stance:** each screen judged **fresh** — no assumed design direction (slim V2 vs
> default). We decide the target look *from* the review, not before it.
>
> **Started:** 12 Jun 2026 · **Last updated:** 12 Jun 2026

---

## 🧱 BUILD LEDGER — what's built vs what's queued (12 Jun)

### ✅ Built + on staging this session
| Item | Status |
|------|--------|
| Staging isolation (DB + API + portal + banner) | ✅ live |
| Status bar #104 (FIGSY active · sent today · health) | ✅ built |
| Profile dropdown → **account hub** (grouped) | ✅ **founder approved ("much better")** |
| Mobile PWA icons #114 | ✅ built |
| Deliverability dashboard #48 | ✅ built |
| Staging-mode API startup (boots on DB creds only) | ✅ built |
| **Nav redesign** (rail = work only + agent switcher; account → top-right) | ✅ **founder approved** |

### ✅ Built this round (real data — awaiting founder re-review)
| Item | Status |
|------|--------|
| **Activity feed #102** | ✅ `/dashboard/activity` — live timeline of real sends/replies/meetings, polls 30s. In rail under Company. |
| **Notification centre #103** | ✅ Wired the real `NotificationBell` into the V2 top bar (was a dead dummy button). Bell now opens the panel. |
| **🏢 COMPANY ENGINE #88 — foundation** | ✅ **Per-rep workspaces, owner-funded, REAL data.** Architecture confirmed by founder (private per-rep workspace · owner pays w/ per-seat budgets + request/approve · 10–50 reps). New `companies` table + clients seat columns + `seat_credit_requests` + `winning_plays`. Backend rewritten: `/company/overview` returns real per-rep contacted/reply%/booked; invite reps, allocate from pool, request→approve loop, pool top-up, plays. Seed: MaceyLuxe + 3 reps w/ own data + 2 requests + 2 plays. |

> **⚠️ To see the Company Engine on staging you must re-apply schema + seed:**
> 1. Paste the updated **`supabase/staging-schema.sql`** in the staging SQL editor → Run (adds `companies`, seat columns, etc. — idempotent, safe to re-run).
> 2. Paste the updated **`supabase/staging-seed.sql`** → Run (adds the company + 3 reps). *(The first seed block will conflict on the existing client — that's fine; the new COMPANY ENGINE block at the bottom is what matters. If it errors on the duplicate, just run the part from the `-- COMPANY ENGINE SEED` comment down.)*
> 3. Set `NEXT_PUBLIC_FEATURE_V2_SCREENS` to include `company` (or `all`) so it shows in the rail. It's already reachable at `/dashboard/company`.

### 🏗️ Company Engine — increments (updated 12 Jun late)
| Piece | Status |
|-------|--------|
| Rep **invite-accept** flow | ✅ **BUILT** — `/invite/accept` tries company seat first; binds user_id to the pre-created workspace |
| **"Add a rep"** UI | ✅ **BUILT** — Seats tab form → `POST /company/seats` → copyable invite link |
| Staging **pool top-up** | ✅ **BUILT** — staging-only test button (+10k); endpoint refuses on prod |
| **Per-rep agent unlock** | ✅ **BUILT** (commit `7f1e02c`, ⚠️ not yet merged to staging) — owner toggles Milla/Vida/Denise per rep; rep's sidebar gates off `enabled_agents`; solo accounts untouched |
| Company **billing → pool** (Stripe) | 🔴 **THE go-live blocker** — owner pays → webhook funds the two pools. Next build. |
| Invite **email delivery** · owner **drill-down** | ⬜ next after billing |

### 💲 Also this session (12 Jun late)
- **Denise repriced $99 → $39** across portal, website, API, deck, flow docs (⚠️ 🧍 Stripe price object still $99 — see the FOUNDER CHECKLIST in `KIND-MASTER.md`)
- **Flow docs rebuilt** as pure HTML/CSS (Mermaid broke on the founder's phone) — `CLIENT_FLOW.html` + `CLIENT_FLOW_PER_REP.html`, offline-safe

### 🔨 Still queued
| Item | Status / blocker |
|------|------------------|
| **A/B subject testing UI #43** | Backend **is real** (winner-check cron + multi-variant selection). Buildable — but shows empty on staging until a campaign has variants. Build on founder go. |
| **Configurable agent triggers #53** | ⏸ **No backend** (no send-window/weekend/reply-delay fields). Needs backend first — would be fake controls otherwise. |
| Kanban pipeline #100 | Already exists at `/dashboard/figsy/kanban` — review + polish only. |
| Activity feed → Home widget | Optional: surface the feed on the Home dashboard. Touches a core screen → hold for founder design review. |

### ⏸ Blocked — needs founder before building
| Item | Needs |
|------|-------|
| Subscribe-to-the-drop #122 · Site nav rewire #123 | Website/Drop content + touches landing pages |
| Revenue Mission Control B1 | Confirm direction (big, ~3-4 days) |
| FIGSY Memory v2 / pgvector B2 | Founder flips pgvector switch in Supabase (2 min) |
| Casey onboarding B3 | Founder's voice/tone input |

---

## 🌐 The environment being reviewed

| Piece | Value |
|-------|-------|
| Staging portal | `https://heartfelt-essence-production-1434.up.railway.app` |
| Test login | `test@get-kind.com` |
| Staging API | `https://api-staging-production-2185.up.railway.app` |
| Staging DB | Supabase `kind-staging` (`ddigrhimalmgymkwuusd`) — seeded: MaceyLuxe + 50 leads, 2 campaigns, 5 replies |
| Isolation | ✅ Fully sealed — separate DB + API + portal. Cannot touch production. |
| Banner | 🟡 STAGING banner on every page |

**How to review:** open a screen → tell Claude what you like 👍 and don't like 👎 (rough is fine) →
Claude logs it here → changes get batched, built on a branch, merged to staging for re-review.

---

## 📊 Status key
`⬜` not reviewed yet · `🔄` reviewing · `📝` feedback captured · `🔨` changes being built · `✅` reviewed + signed off · `🗑️` cut

---

## 🟣 FIGSY — the AI SDR

| # | Screen | URL | Status | 👍 Like | 👎 Don't like | Action |
|---|--------|-----|--------|---------|--------------|--------|
| F1 | Campaigns | `/dashboard/figsy` | ⬜ | | | |
| F2 | Chat with FIGSY | `/dashboard/figsy-chat` | ⬜ | | | |
| F3 | Templates (R11) | `/dashboard/templates` | ✅ | Clean card grid, good copy, category filters | — | **Approved as-is 12 Jun** |
| F4 | Sequence Builder (R23) | `/dashboard/figsy/sequence-builder` | ⬜ | | | |
| F5 | Kanban pipeline | `/dashboard/figsy/kanban` | ⬜ | | | |
| F6 | Replies | `/dashboard/figsy/replies` | ⬜ | | | |
| F7 | LinkedIn queue | `/dashboard/figsy/linkedin` | ⬜ | | | |
| F8 | Webhooks | `/dashboard/figsy/webhooks` | ⬜ | | | |
| F9 | Unibox / smart inbox (R7) | `/dashboard/inbox` | ✅📝 | Gmail-style redesign **locked** 12 Jun | Old one "not great" | **Design LOCKED** → `docs/previews/inbox-v2.html` (inventory 112). Build to this preview when the batch is pushed. |
| F10 | Performance | `/dashboard/kpis` | ⬜ | | | |
| F11 | Deliverability (#48) | `/dashboard/deliverability` | ⬜ | | | |
| F13 | Activity feed (#102) | `/dashboard/activity` | 🔨 | _(new — awaiting review)_ | | |
| F12 | Knowledge / Train FIGSY (R15) | `/dashboard/knowledge` | ⬜ | | | |

## 🟢 Other agents

| # | Screen | URL | Status | 👍 Like | 👎 Don't like | Action |
|---|--------|-----|--------|---------|--------------|--------|
| A1 | Milla — Assistant | `/dashboard/assistant` | ⬜ | | | |
| A2 | Documents | `/dashboard/documents` | ✅ | Clean legal page, acceptance-record banner, ECTA note, brand-correct | — | **Approved as-is 12 Jun** (preview: `previews/documents-current.html`) |
| A3 | AI Notetaker (R22) | `/dashboard/notetaker` | ✅ | Clean 2-col input/results, owner+due extraction, export buttons | — | **Approved as-is 12 Jun** (preview: `previews/notetaker-current.html`) |
| A4 | Vida — Chatbot | `/dashboard/chatbot` | ⬜ | | | |
| A5 | Denise — Closer | `/dashboard/denise` | ⬜ | | | |
| A6 | Your AI Family (agents) | `/dashboard/agents` | ✅🎨 | Redesign approved | "AI Team"→**"AI Family"** | **LOCKED** → `previews/agents-v2.html` (inv 125); rename in 3 files when pushed |

## 🔵 Company Engine (#88)

| # | Screen | URL | Status | 👍 Like | 👎 Don't like | Action |
|---|--------|-----|--------|---------|--------------|--------|
| C1 | Command Centre (50-rep, credit approve) | `/dashboard/company` | ⬜ | | | _(note: sample data — real wiring = M1)_ |
| C2 | Teams Hub (R21) | `/dashboard/team` | ⬜ | | | |

## 🟠 Lead Gen

| # | Screen | URL | Status | 👍 Like | 👎 Don't like | Action |
|---|--------|-----|--------|---------|--------------|--------|
| L1 | Home / dashboard | `/dashboard` | ⬜ | | | |
| L2 | People | `/dashboard/leads` | ⬜ | | | |
| L3 | ICP Builder | `/dashboard/leads/icp` | ⬜ | | | |
| L4 | Leads Overview | `/dashboard/leads/overview` | ⬜ | | | |
| L5 | LinkedIn Import | `/dashboard/leads/linkedin` | ⬜ | | | |
| L6 | Prospects | `/dashboard/prospects` | ⬜ | | | |

## ⚙️ Account / Growth

| # | Screen | URL | Status | 👍 Like | 👎 Don't like | Action |
|---|--------|-----|--------|---------|--------------|--------|
| G1 | Integrations Hub (R24) | `/dashboard/integrations` | ⬜ | | | |
| G2 | Roadmap | `/dashboard/roadmap` | ⬜ | | | |
| G3 | What's New (R19) | `/dashboard/whats-new` | ✅ | Tidy timeline, brand-correct | — | **Approved as-is 12 Jun** |
| G4 | Usage | `/dashboard/usage` | ⬜ | | | |
| G5 | Billing | `/dashboard/billing` | ⬜ | | | |
| G6 | Settings | `/dashboard/settings` | ⬜ | | | |
| G7 | MCP Connect | `/dashboard/mcp` | ⬜ | | | |
| G8 | Developer API | `/dashboard/developer` | ⬜ | | | |
| G9 | Proposals | `/dashboard/proposals` | ⬜ | | | |
| G10 | Messages | `/dashboard/messages` | ⬜ | | | |
| G11 | Referral | `/dashboard/referral` | ⬜ | | | |
| G12 | Marketplace | `/dashboard/marketplace` | ⬜ | | | |
| G13 | Configure FIGSY | `/dashboard/config` | ⬜ | | | |
| G14 | Analytics | `/dashboard/analytics` | ⬜ | | | |
| G15 | Partner Hub (+ deck/pricing/onboarding) | `/dashboard/partner` | ⬜ | | | |

## 🧩 Shell / chrome (the frame around every page)

| # | Element | Status | 👍 Like | 👎 Don't like | Action |
|---|---------|--------|---------|--------------|--------|
| S1 | Sidebar — slim dark rail (V2) | 🔨 | Dark colour OK; chose (a) fixed expand-on-hover | Was overloaded (30 links) | **Rebuilt:** rail = work only (Home · Workspace · AI Team+photos · Company). Account moved out. Awaiting re-review. |
| S2 | Sidebar — full/default (light) | 📝 | Lists everything | Colour; not fixed; "hate this look" | Reject this look |
| S3 | Status bar (bottom of sidebar) | ⬜ | | | |
| S4 | Profile dropdown (top-right) → ACCOUNT HUB | 🔨 | Wanted account items here | — | **Rebuilt:** grouped hub (Account · Connect · Grow · Product · Settings/Sign out). Awaiting re-review. |
| S8 | Agent switcher + photos | 🔨 | Wants it prominent | Was buried in clutter | Now stands out — clutter removed around it. Awaiting re-review. |
| S9 | Top bar (thin, top-right user details) | 🔨 | Wants this | — | Profile chip now shows name+avatar; dropdown is the account hub. Awaiting re-review. |
| S5 | STAGING banner | ⬜ | | | |
| S6 | Agent column (right rail — FIGSY card) | ⬜ | | | |
| S7 | Mobile PWA / install prompt | ⬜ | | | |

## 🎨 Full V2 redesign mockups (standalone — design exploration)

| # | Screen | URL | Status | 👍 Like | 👎 Don't like | Action |
|---|--------|-----|--------|---------|--------------|--------|
| V1 | Shell | `/v2/shell` | ⬜ | | | |
| V2 | Onboarding | `/v2/onboarding` | ⬜ | | | |
| V3 | Company | `/v2/company` | ⬜ | | | |
| V4 | Leads | `/v2/leads` | ⬜ | | | |
| V5 | Sequences | `/v2/sequences` | ⬜ | | | |
| V6 | Gallery | `/v2/gallery` | ⬜ | | | |
| V7 | Welcome A/B/C | `/v2/welcome/a` · `/b` · `/c` | ⬜ | | | |
| V8 | Setup · Train · Thinking | `/v2/setup` · `/train` · `/thinking` | ⬜ | | | |
| V9 | Agents · Inbox · Config · Marketplace | `/v2/agents` · `/inbox` · `/config` · `/marketplace` | ⬜ | | | |
| V10 | Milla · Vida · Figsy (V2) | `/v2/milla` · `/vida` · `/figsy` | ⬜ | | | |

---

## 📌 Cross-cutting decisions (resolve once, applies everywhere)

| Decision | Options | Verdict |
|----------|---------|---------|
| House sidebar style | slim dark rail · full light · hybrid | ⬜ open |
| Brand colour usage | purple-heavy · toned down · — | ⬜ open |
| Density | compact · roomy | ⬜ open |
| Sample vs real data on previews | acceptable · must be real | ⬜ open |

---

## 🗒️ Running notes (free-form, newest first)

- **12 Jun:** Staging environment went fully live + isolated. Founder began first look. Initial reaction to the **full/default light sidebar = dislike** ("hate this look", colour, not fixed). Likes the **slim dark rail** look but it was missing screens → fixed (slim now lists all features, commit `2054cbc`). Review to proceed feature-by-feature over multiple sessions, judged fresh.
