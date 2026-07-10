# Onboarding Tour System — Build Plan

`Status: PLAN ONLY — nothing built. For Fable review before any code starts.`
`Not a core doc (see CLAUDE.md — LAUNCH-PAD/PRODUCT-INVENTORY/KIND-MASTER/V2-TRACKER stay the four). This is a scoped feature spec, same shelf as RULEBOOK.md / MILESTONE-0-CHECKLIST.md.`

## Why this exists

K.I.N.D is a self-serve product with **no live-onboarding call, no forced demo, no technical support** in the loop. A new client signs up and has to get themselves from a blank dashboard to a launched campaign alone. Today, nothing in the product actually walks them there — see §2. The founder's ruling (10 Jul): **this is critical before onboarding or demoing any new client** — it's not a nice-to-have polish item, it's the thing that makes "self-serve" true instead of aspirational.

---

## 1. Architecture decisions (already made, recapped for Fable)

- **Custom tour engine, not a library.** No Shepherd/Joyride/Driver.js/Radix/Floating-UI anywhere in `package.json`. The portal has zero design-system primitives (`Modal`/`Dialog`/`Popover` don't exist — every modal today is bespoke, page-local). A 4-component custom implementation (Overlay, Spotlight, Popover, step-state hook) is small enough to own outright and won't fight conventions the codebase doesn't have yet.
- **Persistence is per-client, not per-user.** Confirmed from schema: `clients.onboarded_at`, `clients.first_icp_run_at` already exist and are per-client. Team roles (`owner`/`admin`/`member`/`viewer` — `apps/api/src/routes/team.ts`) exist, so a later "who completed onboarding" nuance is possible, but the MVP tracks state on `clients`, matching every other state flag in this codebase (`is_demo`, `sourcing_allowance`, etc.).
- **Step list is config, not code.** A typed array, not hardcoded screens. Adding step 10 or 30 later is a content PR, never a rebuild. (Demonstrated visually in the mockup artifact shared 10 Jul.)

## 2. What exists today — the honest inventory

| Component | File | What it actually is |
|---|---|---|
| `OnboardingBanner.tsx` | `apps/portal/src/components/ui/` | Static banner, no logic — **still imported live** in `dashboard/page.tsx` |
| `OnboardingChecklist.tsx` | same | Older static checklist — **superseded, still live** |
| `FirstRunChecklist.tsx` + `TwoWalletExplainer.tsx` | same | Newest (#447, 10 Jul) — 4-step checklist lit from a real `/onboarding/progress` endpoint. Best of the four, but still a static card — doesn't follow the client off the homepage. |
| `(v2)/v2/onboarding/page.tsx` | `apps/portal/src/app/(v2)/v2/onboarding/` | A separate 6-step mockup page, sample data, narrated by an agent ("Casey") that doesn't exist elsewhere in the product. Gated fully off (`NEXT_PUBLIC_FEATURE_V2_SCREENS`), not linked from live nav. Dead weight, not a live risk. |

**None of these is a tour.** None follows the client across a route change, none requires an action before advancing, none explains the $1/$3 charges in the moment they happen. This build replaces all four with one system.

## 3. Recommended architecture

### 3a. Step config schema
```ts
type OnboardingStep = {
  id: string                    // e.g. 'reveal-lead'
  required: boolean             // required steps can't be skipped mid-flow; optional ones can
  route: string                 // '/dashboard/leads' — the tour will navigate here if the client isn't
  target: string                // a data-attribute anchor, e.g. '[data-tour="reveal-btn"]'
                                 // NEVER a raw CSS selector — components register their own anchors
                                 // (data-tour="x") so a later redesign can't silently break the tour.
  title: string
  body: string                  // FIGSY's voice
  placement: 'top' | 'bottom' | 'left' | 'right' | 'center'
  completionCondition: 'action' | 'route-reached' | 'data-check'
  completionCheck?: string      // key into /onboarding/progress's response, when data-check
  analyticsEvent: string
  mobilePresentation: 'popover' | 'bottom-sheet'
}
```

### 3b. Backend
- **Extend `GET /onboarding/progress`** (exists, #447) to return `current_step`, `completed_steps[]`, `skipped`, `onboarding_version` — not just the 4 booleans it has today.
- **New `PATCH /onboarding/progress`** — client calls this on Next/Skip/Back so state survives a refresh or a second device. Mirrors the `add_sourcing_allowance` guarded-write pattern already in this codebase (never trust the client's local step count as authoritative).
- No new billing/reveal endpoints needed — see §5, that surface is already solid.

### 3c. Data model change
```sql
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS onboarding_version    int NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS onboarding_step       text,          -- current step id, null = not started
  ADD COLUMN IF NOT EXISTS onboarding_completed  text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS onboarding_status     text DEFAULT 'not_started',
    -- not_started | in_progress | skipped | completed
  ADD COLUMN IF NOT EXISTS onboarding_started_at    timestamptz,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at  timestamptz;
```
Same shape as every other money-fence column added this session — idempotent, additive, no destructive change to existing rows.

### 3d. Component tree
```
OnboardingProvider          — loads /onboarding/progress once, holds step state
  OnboardingOrchestrator    — owns the step machine, route-watching, PATCH-on-advance
    OnboardingOverlay       — the dimmed scrim (portal, high z-index)
    OnboardingSpotlight     — cuts a hole around the registered target
    OnboardingPopover       — the card (title/body/Next/Back/Skip), positions off the target
    OnboardingProgressRail  — the numbered step bar (only for required steps, not optional ones)
RevealLeadConfirmation      — already exists in spirit (the reveal modal) — tour just points at it,
                               doesn't replace the money logic
WelcomeVideoCard            — first-login video, homepage
LearningCentre              — the permanent "Learn with FIGSY" grid
  LearningVideoCard
```

## 4. The full step list

*(Visual reference: the mockup artifact shared 10 Jul — same 9 required + 5 optional split.)*

| # | Step | Route | Target anchor | Required action | Fallback if target missing |
|---|---|---|---|---|---|
| 1 | Welcome | `/dashboard` | `[data-tour="figsy-card"]` | none — informational | show anyway, centered |
| 2 | Create ICP | `/dashboard/leads/icp` | `[data-tour="icp-template-picker"]` | ICP saved | skip to step 3 if an ICP already exists (edge case §7) |
| 3 | Run ICP | `/dashboard/leads/icp` | `[data-tour="run-icp-btn"]` | run started | — |
| 4 | Review leads | `/dashboard/leads` | `[data-tour="lead-list"]` | leads visible (`data-check`: `hasLeads`) | wait state if the async run hasn't landed yet — see §6 |
| 5 | Reveal a lead | `/dashboard/leads` | `[data-tour="reveal-btn"]` | reveal confirmed (`data-check`: `hasReveal`) | — |
| 6 | Select leads | `/dashboard/leads` | `[data-tour="lead-checkbox"]` | ≥1 selected | reuses the **existing** `selectedIds` Set already on this page — no new selection UI needed |
| 7 | Enroll in campaign | `/dashboard/figsy` | `[data-tour="enroll-btn"]` | enrollment created (`data-check`: `hasEnrollment`) | — |
| 8 | Review sequence | `/dashboard/figsy/sequence-builder` | `[data-tour="sequence-preview"]` | route reached | — |
| 9 | Launch campaign | `/dashboard/figsy` | `[data-tour="launch-btn"]` | campaign status = active | — |
| opt | Inbox / Analytics / Assign-to-FIGSY / Integrations / Invite team | respective routes | — | route reached | offered as a post-completion "want the rest of the tour?" prompt, never forced |

**"Use an example ICP" (step 2 anti-empty-form):** the ICP page already has a `kind_icp_prefill` localStorage mechanism (`icp/page.tsx:491`) used elsewhere to pre-fill the form. The tour reuses this exact hook — no new prefill system needed, just a tour-triggered write to that key before navigating to step 2.

## 5. Paid lead-reveal safety — re-confirmed for this build

No fixes needed before exposing this step in the tour. Verified directly against the live code this session, not assumed:
- Server-side atomic claim (`leads.ts` — `.eq('revealed_at', null)` conditional update is the idempotency lock)
- Charge-once-per-person-ever (`client_reveals`, keyed by normalized email)
- Auto-refund on a failed email resolution
- Repeated clicks / multiple tabs: the losing request's `UPDATE` matches zero rows — no double-charge, verified this session under real fence testing (§10 money fences, 10 Jul)

**The tour's job here is presentation only** — it points at the existing `Reveal lead for $1` button and existing balance display. It must not introduce a second, tour-owned confirmation UI that duplicates or races the real one.

## 6. Handling the async ICP run (step 3→4)

`runIcpJob` is fire-and-forget — `POST /icps/:id/run` returns instantly, sourcing happens in the background. The tour **must not block** on this. Step 4's `completionCondition: 'data-check'` polls `/onboarding/progress`'s `hasLeads` flag (already exists) on a light interval while showing: *"FIGSY's searching — I'll let you know the moment leads land. Feel free to keep going."* If zero leads return (empty-ICP edge case), the tour needs a distinct copy branch — not built today, flagged as a gap.

## 7. Edge cases (scoped from the original 30 — only the ones that change the build)

| Case | Handling |
|---|---|
| Client already has an ICP/leads/campaign | Each step's `completionCondition` is a **data check**, not a forced action — an experienced client sails through steps already satisfied by real data, tour never re-asks them to redo work. |
| Client has 0 credits at step 5 | Reveal button already shows the real, low, honest balance — no tour-specific handling needed, the existing UI is already correct. |
| Client is not the account owner | Gate the tour's billing-adjacent copy (the "keep FIGSY funded" prompt) on `role === 'owner' \| 'admin'` — team.ts already has the role field to check. |
| Client closes browser mid-tour | State is server-persisted (§3c) — resumes at `onboarding_step` on next login, not lost to localStorage. |
| Onboarding version changes after a client started | `onboarding_version` column exists for exactly this — a version bump can force-restart or gracefully continue; decide when it's actually needed, not speculatively now. |

## 8. Video / Learning Centre — genuinely new infra

Confirmed: **no video player, no host, no CSP entry exists anywhere in this codebase.** This is a from-scratch build, not a wire-up. Two open questions the founder needs to answer before this phase starts (can't be resolved from code):
1. Existing video host, or a vendor decision?
2. Hard-coded config for the video list (simplest, fine at this stage) vs a DB table (only worth it once there are enough videos that non-engineers need to reorder them)?

**Recommendation:** ship Phase 6 with a hard-coded array first — six videos, matching the mockup's categories. A DB-backed CMS is over-engineering at zero videos recorded.

## 9. Phased build plan

| Phase | Scope | Depends on | Ships as |
|---|---|---|---|
| **0** | Delete `OnboardingBanner`, `OnboardingChecklist`, retire `(v2)/v2/onboarding`. Keep `FirstRunChecklist`/`TwoWalletExplainer` as the interim homepage state until Phase 2 replaces it. | nothing | one small PR |
| **1** | Migration (§3c) · step-config type · the 4 tour primitives, no real steps wired | Phase 0 | one PR, backend+shared only, no visible change yet |
| **2** | Wire steps 1–4 (Welcome → Review Leads) — routes/targets that already fully exist | Phase 1 | preview-first (client-facing) |
| **3** | Wire step 5 (Reveal) — presentation only, per §5 | Phase 2 | preview-first |
| **4** | Wire steps 6–9 (Select → Launch) | Phase 3 | preview-first |
| **5** | Optional-step prompts (Inbox/Analytics/Assign/Integrations/Invite) + the triggered "keep FIGSY funded → billing" popup | Phase 4 | preview-first |
| **6** | Video infra + Learning Centre (§8) | independent — can run parallel to 1–5 | preview-first |
| **7** | Analytics events (`onboarding_started`, `_step_completed`, `lead_reveal_confirmed`, etc.) — **no provider exists yet**, so this phase starts with a provider decision, not a wire-up | independent | backend+shared |
| **8** | Accessibility pass (keyboard nav, focus trap/restore, screen-reader labels, reduced-motion) + responsive (mobile bottom-sheet variant per §3d) | after real DOM targets exist (Phase 4) | polish PR |

Each client-facing phase (2–5) follows the standing rule: **preview → founder walks it → merge → live.**

## 10. Where this sits in the SPRINT — a call for the founder, not a decision I've made

**FOUNDER RULING 10 Jul: this is SPRINT line 8c** (before line 9), and the **video / Learning-Centre (Phase 6) is IN the sprint scope** — the founder wants to record an onboarding video and drop it into the "Learn with FIGSY" section as part of this build, not later. So the sprint scope is **Phases 0–4 (core tour) + Phase 6 (video + Learning Centre)**. Only Phases 7–8 (analytics events, full a11y/mobile polish) stay post-sprint.

**Phase 6 build contract (so the founder gets exactly what was asked):**
- **First-login video card** on `/dashboard` — shown the first time a client signs in, skippable, resumable (persists watch-progress; localStorage is fine for progress, the "seen" flag rides on the onboarding state).
- **Permanent "Learn with FIGSY" section** below the dashboard — the 6-card grid from the reference image (thumbnail · title · one-line description · duration · Watch button · optional New badge).
- **One config file** (`apps/portal/src/lib/onboarding-videos.ts` or similar) — a typed array; each entry `{ id, title, description, url, duration, category, isNew, publishedAt }`. Adding a video = adding one array entry (newest first). NO CMS, NO DB table — hard-coded config, per §8 (correct for this stage).
- **A video player component** — play/pause/skip/restart, shows duration, resume-where-left-off. Accepts the `url` from config (works with an unlisted YouTube/Vimeo embed URL or a direct file URL — the founder provides the link; the build does not pick a host).
- **CSP allowance** — add the founder's chosen video host to the portal's Content-Security-Policy so the player isn't silently blocked. If the host isn't decided at build time, the player is built host-agnostic and the CSP entry is a one-line follow-up when the first real URL lands.

**The only founder input Phase 6 needs (not a build blocker):** record the videos and host them somewhere with a link (unlisted YouTube / Vimeo / file host). The 6 topics = the reference-image categories. Everything else is built and waiting for those URLs.

## 11. Acceptance criteria (Phases 0–4, the sprint-candidate core)

- A brand-new client, zero prior state, can go from `/dashboard` to a launched campaign touching nothing but the tour's own Next/Skip/Back controls.
- Every required step's completion is a **real data check**, never a client-trusted flag.
- The $1 and $3 charges are never bundled, never hidden, never auto-confirmed — the tour points at, never replaces, the existing money UI.
- Closing the browser mid-tour and returning resumes at the correct step, server-side.
- An experienced client with existing ICPs/leads/campaigns is never re-asked to redo real work.
- The three legacy onboarding widgets no longer exist in the codebase.

## 12. Open questions (cannot be resolved from code)

1. Video host — existing account or new vendor?
2. Analytics provider — wire something real now, or log to DB/console until volume justifies cost?
3. Confirm Phase 0–4 sprint placement (§10).

## 13. Recommended next action

**Phase 0**, as its own PR — delete the dead onboarding surfaces first. It's small, it's safe, and it stops the real build from launching into a codebase fighting itself.
