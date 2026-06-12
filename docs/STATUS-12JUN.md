# 📊 K.I.N.D — STATUS as of 12 Jun 2026

> Single consolidated status: what's built · what's left · what's needed from the founder and
> from Claude, before and after the 19 Jun launch. Referenced from `KIND-MASTER.md`,
> `V2-TRACKER.md`, `PRODUCT-INVENTORY.md`. Companion checklists: `FOUNDER-ACTIONS.md`,
> `COMPANY-ENGINE-TEST.md`, `STAGING-REVIEW.md`.

**Branch model:** all new work on `claude/kind-carson-MYhSl` → merged to `staging` → founder
reviews on staging → founder merges `staging` → `main` (production). Nothing live until the founder merges.

---

## ✅ 1. EVERYTHING BUILT

### Live on production (`main`) — pre-this-session
- The 4 agents: **FIGSY** (AI SDR), **Milla** (VA), **Vida** (chatbot), **Denise** (closer)
- Lead Gen + ICP builder + Apollo sourcing + AI scoring + consent/POPIA + warmup/deliverability
- Billing (Stripe), credits, the client portal, admin OS

### Built this session — on staging (`claude/kind-carson-MYhSl`), NOT yet on main
**Platform / UX**
- 🧪 **Staging isolation** — separate Supabase (`kind-staging`) + separate API (`api-staging`) + staging portal, STAGING banner, seeded 50 fake leads. Fully sealed from production.
- **Status bar** (#104) — live FIGSY/sent/health pulse in the sidebar
- **Profile dropdown → account hub** (grouped) — *founder approved*
- **Nav redesign** — slim dark rail = work only + agent switcher; account moved to top-right — *founder approved*
- **Mobile PWA icons** (#114) — installable
- **Deliverability dashboard** (#48)
- **Activity feed** (#102) — live timeline
- **Notification centre** (#103) — wired the real bell into the top bar
- **Staging-mode API startup** — boots on DB creds only, no prod secrets

**🏢 Company Engine (#88) — the priority for the demo**
- Per-rep **private workspaces** (each rep = own leads/campaigns/FIGSY)
- **Company + owner-funded pools** (two credit types: lead-gen $1, FIGSY $3)
- Per-seat **budgets** + allocate from pool
- **Request → approve/deny** credit loop
- **Invite a rep → accept → own workspace**
- Per-seat **autonomy** (auto/co-pilot)
- **Winning plays** library + push
- **Real per-rep performance** (contacted · reply % · booked)
- **Per-rep agent unlock** (owner switches Milla/Vida/Denise on per rep → company bill)

**Pricing / collateral**
- **Denise $99 → $39** across portal, website, API + repositioned copy
- **Flow docs** rebuilt as pure HTML/CSS (offline-safe): `CLIENT_FLOW.html`, `CLIENT_FLOW_PER_REP.html`

---

## 🔨 2. WHAT'S LEFT TO BUILD

### Company Engine — to be fully production/demo ready
| Priority | Item |
|----------|------|
| 🔴 Go-live blocker | **Stripe → company pool billing** (owner actually pays → pools funded) |
| 🔴 | **Invite email delivery** (owner clicks invite → rep emailed; today the link is copy-paste) |
| 🟡 | **Owner drill-down** into a rep's pipeline/inbox |
| 🟡 | Edit a rep's budget directly · deactivate / remove a rep (offboarding) |
| 🟡 | **Manager role** fully wired · notifications (owner on request, rep on decision) |
| 🟢 | Per-rep lead routing (item 38) · per-rep calendars (item 41) · first-run empty state |

### Other staging queue (post-launch)
- A/B subject testing UI (#43 — backend ready) · Kanban polish (#100) · configurable triggers (#53, needs backend) · Revenue Mission Control (B1) · FIGSY Memory v2 / pgvector (B2) · Casey onboarding (B3)

---

## 🧍 3. NEEDED FROM THE FOUNDER — BEFORE 19 JUN
*(full detail in `FOUNDER-ACTIONS.md`)*
- **Company Engine go-live:** test on staging Monday (`COMPANY-ENGINE-TEST.md`) · decide + create **Stripe pool products** · run `20260612_company_engine.sql` on **production** Supabase · **merge to main** · enable `company` flag · fund the demo pool
- **Integration keys:** email **`partners@apollo.io`** (reseller) · create **Hunter** key · get free **PDL** key
- **Launch-critical:** **D9** deliverability 10/10 · **legal pack #10–14** · **Go/No-Go** Thu 18 · smoke tests **T3–T7, T9, T10**
- **Review** the staging builds and approve per-feature (`STAGING-REVIEW.md`)

## 🧍 4. NEEDED FROM THE FOUNDER — AFTER 19 JUN
- Wave-4 keys: WhatsApp (Meta approval) · Vapi voice · Clearbit
- Record video content (Drop walkthroughs · onboarding demos)
- **Y16** — kill the dead Vercel↔GitHub integration
- Decide the **outcome-based pricing** rollout (the next pricing evolution)
- Review per-rep agent-unlock billing once Stripe is wired

---

## 🤖 5. NEEDED FROM CLAUDE — BEFORE 19 JUN
- **Build Stripe → company pool billing** (the go-live blocker) — *next up*
- **Invite email delivery** + **owner drill-down** for the demo
- Fix any smoke-test failures **same-day** as the founder runs them
- Support the production migration + merge (provide exact SQL/steps)

## 🤖 6. NEEDED FROM CLAUDE — AFTER 19 JUN
- Finish the Company Engine 🟡/🟢 items (manager role, offboarding, per-rep routing, calendars, notifications)
- Work the staging queue (A/B UI, Kanban, etc.) on branches → staging for review
- Wire Wave-4 channels once the founder provides keys
- Build the video/content hub when content is ready

---

## 🗓️ Bottom line
The **Company Engine is the one push going to production before the 19th** — tested Monday, demoed to the client next week. It's **built and working on staging**; the remaining go-live work is **Stripe → pool billing (Claude)** + the **production deploy steps (founder only)**. Everything else stays on staging for review and ships after launch.
