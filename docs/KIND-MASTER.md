# 🟣 K.I.N.D — MASTER SOURCE OF TRUTH

> ✅ **THIS IS THE ONE SOURCE. Read this first, update this first, work off this only.**
> Supersedes `EVERYTHING.md`, `SESSION-HANDOFF-7JUN.md`, and all earlier roadmap fragments.
> Where any other doc disagrees, **THIS document wins.**
>
> **Protocol (LIVING DOC — keep current):**
> 1. **Start of session:** read the **RESUME HERE** block below, then the relevant chapter.
> 2. **During work:** flip item status as it changes (⬜→🔨→🧪→✅) in Chapters 2 & 3.
> 3. **End of session:** update the **RESUME HERE** block + add one line to the **SESSION LOG**, then commit + push. This is what lets a brand-new chat pick up with full context.
>
> **🟢 STATUS KEY — be honest. `✅` is EARNED, not claimed:**
> `⬜` todo · `🔨` **BUILT** (code-complete + typecheck-clean, but **NOT deployed, NOT run, NOT verified**) · `🧪` in test (deployed, being verified) · `✅` **DONE & VERIFIED LIVE** (deployed + actually works) · `⏸` gated/blocked · `🚫` won't build.
> **THE RULE: nothing is `✅` until it has run in a real environment and been checked.** Typecheck ≠ verified.
> **STATUS AS OF 10 JUN:** the sprint **deployed to production 8 Jun** and the system is **LIVE on `main`** — warmup sending, **T8 deliverability + T1 fresh signup PASSED**, core loop verified. **What is NOT yet live:** this session's audit-fix batch (on branch `claude/kind-carson-MYhSl`, build-verified, merges on founder "go live"). _(Earlier "nothing is deployed" notes below are 8-Jun history — superseded by this.)_
>
> **Launch date:** 🚀 **FRIDAY 19 JUNE 2026** (firm — deferred from Mon 8 Jun until deliverability + Smoke Test 2 pass).
> **Last updated:** 12 Jun 2026 (staging isolation complete + founder review mode — see `STAGING-REVIEW.md`).
>
> ### 📍 TWO DOCS ONLY — no more confusion (consolidated 10 Jun)
> - **THIS doc (`KIND-MASTER.md`) = the ONE you work off for launch.** Everything current — status, the dated **MASTER TIMELINE** (Wed 10 → Fri 19, smoke tests + daily recordings + the audit-fix merge), risks, deliverability, legal. _(The separate `LAUNCH-MAP.md` was folded back in here and deleted — it was making it three docs.)_
> - **[`docs/V2-TRACKER.md`](./V2-TRACKER.md)** — **FUTURE roadmap ONLY** (post-launch: company engine #88, V2 experience, the itemised risk/fix register). Not for launch tracking. **RULE (locked 9 Jun): ALL future releases · competitor steals · V2 builds · future enhancements are captured HERE going forward** (V2 cosmetics · company system #88 · 101-item roadmap by horizon · the 15 Pieces · steals catalog · MCP). **Nothing lives only in chat.**
> - **[`docs/DOC-MAP.md`](./DOC-MAP.md)** — full audit/cross-reference of every doc in the repo (authoritative vs reference vs archive).

---

## ▶️ RESUME HERE — LIVE STATUS (a fresh session reads THIS first)

> **This block is the cold-start handoff.** Any new chat/session must read this to know exactly
> where we are. **Keep it current** — update it at the end of every working session before commit.

- **✅ 12 JUN — STAGING ISOLATION COMPLETE. The sealed preview environment is LIVE.**
>   - ✅ **Separate staging Supabase project** `kind-staging` (`ddigrhimalmgymkwuusd`) — full consolidated schema applied (one paste), seeded with MaceyLuxe Staging + **50 fake leads · 2 campaigns · 5 replies · 12.5k credits**. **Zero connection to prod data.**
>   - ✅ **Separate staging API service** `api-staging` (`api-staging-production-2185.up.railway.app`) — Nixpacks, branch `staging`, points at `kind-staging`. Boots on **DB creds only** via new staging-mode startup check (no prod secrets in staging). `/stats/platform` returns the seed numbers (50/2/5) — **isolation proven**.
>   - ✅ **Staging portal** `heartfelt-essence` re-pointed at staging DB + staging API + `NEXT_PUBLIC_IS_STAGING=true` + `NEXT_PUBLIC_FEATURE_V2_SCREENS`. Amber STAGING banner on every page.
>   - ✅ **Hard lesson logged:** Railway variable changes can *restart* the old image without *rebuilding* — server components read `NEXT_PUBLIC_*` at runtime so flags/banner "work", but new **routes/sidebar** need a real **Deployments → ⋮ → Redeploy**. New routes 404'd until forced rebuild.
>   - ✅ **New builds this session (all on `claude/kind-carson-MYhSl` → merged to `staging`):** staging schema+seed+banner · live **status bar (#104)** · full **profile dropdown** · **mobile PWA icons (#114)** · **deliverability dashboard (#48)** · staging-mode API startup · **slim V2 sidebar parity** (now lists every screen).
>   - **▶️ NOW: FOUNDER REVIEW MODE.** Founder walks every new screen on staging, judged **fresh** (no assumed design direction), recording 👍/👎 in **[`docs/STAGING-REVIEW.md`](./STAGING-REVIEW.md)** — the capture doc. Multi-session, at the founder's pace. Initial reaction: **dislikes the full/light sidebar; prefers the slim dark rail.** This is a review job, NOT a one-day job. Nothing merges to `main` until founder signs off per-feature.

- **🌿 11 JUN LATE — STAGING IS LIVE. The whole release train is integrated + deployed for founder preview.**
>   - ✅ **Staging Railway service WORKS** (founder + Claude fixed it together tonight: Root Directory cleared, full monorepo build command set — copied from the proven `render.yaml`). URL: **`heartfelt-essence-production-1434.up.railway.app`**, deploys branch `staging`.
>   - ✅ **All 29 branches merged into `staging`** (R1–R25 + company-preview + company-engine + hotfix) — every conflict resolved by hand keeping all features, TypeScript clean, full `next build` green. Commit `0c4ffd8` (+ docs `66d3351`), 57+ ahead of `main`.
>   - ✅ **Preview test account:** `test@get-kind.com` (staging only — never use `hello@get-kind.com`, that's the real outreach identity).
>   - 💡 **KEY FINDING — no URL guards:** `v2Enabled()` flags only hide *sidebar links*; every new page renders by direct URL. Founder can preview `/dashboard/company` · `/dashboard/team` · `/dashboard/notetaker` · `/dashboard/integrations` · `/dashboard/figsy/sequence-builder` · `/dashboard/whats-new` · `/dashboard/templates` **right now, no flag flip needed.**
>   - ⚠️ **LIMITATION:** staging still shares the **prod Supabase DB** → the new company-engine tables (`seat_credit_requests`, `winning_plays`, `figsy_knowledge`, job-change cols) are **NOT migrated** (deliberately — never run unapproved migrations on prod). Company Engine UI renders; its data calls return empty. **Founder picked the SAFEST path: full staging DB isolation before end-to-end testing** (no rush — no upgrades launch before the 19th).
>   - **▶️ STAGING-ISOLATION PLAN (tomorrow, 12 Jun):** 🧍 create separate staging Supabase project (free tier) → 🤖 Claude delivers one-paste consolidated schema (all 54 migrations) + fake-data seed (1 company · 50 reps · sample credit requests) + a visible STAGING banner → 🧍 paste into staging Supabase SQL editor → 🧍 point Railway *staging* vars at the new DB + set `NEXT_PUBLIC_FEATURE_V2_SCREENS=all` (staging ONLY — prod stays unset/off) → founder tests Command Centre 50-rep approve/top-up flows safely.
>   - ⚠️ Doc-hygiene note: tonight's first docs pass (`66d3351`) accidentally updated the **stale copies on `staging`**; the canonical copies (this file + V2-TRACKER on `claude/kind-carson-MYhSl`) are now reconciled — work off THESE.

- **🚂 11 JUN EVENING — THE RELEASE TRAIN IS BUILT + AUDITED. 20 PRs await the founder.**
>   - ✅ **Waves 1–2 pre-built: PRs #506–#525** (R1 demo-bounce guard → R20 job-change alerts). Every branch **independently re-verified against GitHub**: 1 commit each, only its claimed files, key code present (35/35 marker checks), type-check/build green. **Founder merges = "push go"; merged releases get added to The Drop.**
>   - ✅ **#88 company engine started early** (founder instruction) on branch **`claude/company-engine`** — flag-gated (`v2Enabled('company')`): seat autonomy + per-seat budgets · request/approve credit loop · ★ winning-play library · real Command Centre at `/dashboard/company`. Plus **`claude/company-preview`** = the filmable sales demo (all 8 sub-items visualised). **No PRs opened for these two — founder reviews first.** Still open in the engine: per-rep lead ownership/routing+CRM dedup (38) · per-rep calendars (41).
>   - ✅ All 10 `portalv2preview.html` concepts confirmed present as gated `/v2` previews (gallery at `/v2/gallery`).
>   - ⚠️ Honesty: "verified" = code+build verified, **not click-tested in a running app**; #502 is based on an older `main` (rebase before merging). **Nothing merged, nothing live — founder reviews each.** Full green-tick audit table: `PRODUCT-INVENTORY.md` → AUDIT block.

- **🟢 9 JUN — WARMUP IS LIVE. THE #1 BLOCKER IS DEAD.** The hardest, scariest part of the whole launch — deliverability — is **proven in the real world today**:
>   - ✅ **T8 PASSED** — a real cold email from `gettingkind.com` landed in the **inbox (not spam)**, well-formed, opt-out present. Deliverability works end-to-end.
>   - ✅ **Warmup running** — `FIGSY_WARMUP_START=2026-06-09` (Day 1 = 10/day → ramps to 50). FIGSY's 2-hourly cron sends automatically; **founder does nothing daily.**
>   - ✅ **Signer locked** — `signer_name = "Jack from K.I.N.D"` set in Supabase (real campaign emails sign off correctly).
>   - ✅ **OPTION A SHIPPED + LIVE** (locked by founder) — **Apollo-verified leads are auto campaign-ready, no consent gate**; opt-out/unsubscribe → DNC. One shared rule (`campaignReadyLeadIds`) used by the Enroll button, campaign Activation, AND a **new FIGSY-chat-agent enroll tool**. Verified-only = bounce-safe.
>   - ✅ **First real warmup batch live** — fresh ICP → 60 Apollo-verified African leads → enrolled → sequence saved → FIGSY now drip-sending under the ramp.
>   - 🔧 Fixed along the way: Railway build (vite/Node engine via `.yarnrc`), and a `campaignReadyLeadIds` PostgREST-boolean bug (now JS-filtered).
>   - **🟡 Small loose ends (non-blocking):** no Settings UI for the signer (set via SQL; test-email ignores it) · FIGSY-chat "enrol" button still *navigates* instead of enrolling (the campaign **Enroll Leads** button is the reliable path) · **no Delete-leads button** (cleared via SQL today).
>   - **▶️ NEXT:** watch the **Sent** count climb · then the remaining smoke tests (**T3–T7, T9, T10** — ✅ **T1 fresh signup PASSED 10 Jun**) + **D9 inbox-placement 10/10** before Fri 19.
>
> ### ✅ STATUS TO FRI 19 (updated 9 Jun late — ACCURATE tick)
> **Position is STRONG — foundation built, deployed live, and most smoke checks green. ✅ T1 fresh signup PASSED 10 Jun (the one that had never been run). Remaining: T3–T7, T9, T10 + D9 10/10.**
>
> **GREEN ✅ (verified):** **T1** fresh signup (PASSED 10 Jun) · **T2** ICP→leads · **T3 core** send→reply→🔥Hot · **T8** deliverability/inbox · portal load+login · admin OS + security · **T10 partial** (partner approve + Demmy referral live) · warmup live + auto-ramp · Option A · **all Bucket-A V2 cosmetics LIVE on `main`** (agent-switcher sidebar · profile chip · Config · Marketplace · Thinking · Leads card · Welcome Spotlight · Signup T&C) · **dashboard "0 Sent" bug FIXED** · signup-bug fix (T1 PKCE) · SPF/DKIM/DMARC verified · `staging` branch created.
>
> **🗓️ TOMORROW (Fri 12 Jun) — THREE TRACKS, in priority order (launch-critical first):**
>
> **🔴 TRACK 1 — LAUNCH CRITICAL (the day-by-day plan says Fri 12 = fix + cosmetic; smoke tests are a day behind):**
> ⬜ **T3 pause→no-send** · ⬜ **T4** booking+KPI · ⬜ **T5** billing/Stripe (money path — single-charge, webhook idempotency, Milla 403) · ⬜ **T6** Vida widget · ⬜ **T7** Milla cron leak · ⬜ **T9** team invite · ⬜ **T10 full** partner path (all 🧍, Claude fixes failures same-day). _(✅ T1 passed 10 Jun · ✅ T2/T3-core/T8 already green.)_
> 🤖 Cosmetic batch (7 items, §3 in EVERYTHING/cosmetic backlog) · 🤝 deliverability mid-warmup check (~day 4 of ramp). **Sat 13 = Smoke Test 2 full clean re-run — Track 1 must land tomorrow or the Mon 15 buffer starts eating itself.**
>
> **🟡 TRACK 2 — STAGING ISOLATION + FOUNDER PREVIEW (the V2/company-engine pipeline — not launch-blocking):**
> 🧍 Create staging Supabase project → 🤖 one-paste schema (54 migrations) + 50-rep fake seed + STAGING banner → 🧍 Railway staging vars (new DB + `NEXT_PUBLIC_FEATURE_V2_SCREENS=all`, staging ONLY) → 🧍 review all new screens on staging (can start tonight by direct URL — no flag needed).
>
> **🟢 TRACK 3 — VIDEO / CONTENT → MOVED TO MONDAY 15 JUN (founder call 11 Jun):**
> 🧍 Record the 60-sec **Drop 01 walkthrough** (slot ready in `the-drop.html`) + onboarding demo videos · pages `product-videos.html` ("Watch") + `the-drop.html` exist on `claude/marketing-drops`, YouTube-embed-ready, **founder records → pastes YouTube ID → done**. See V2-TRACKER → GTM & CONTENT ENGINE for the full action plan. **Not tomorrow — Monday.**
>
> **🔵 TRACK 4 — NEXT STAGING QUEUE (review list, then start building — full detail in `PRODUCT-INVENTORY.md` → Part B0b):**
> Founder reviews the list, confirms priority order, then 🤖 Claude starts building in that order — each item goes on its own branch → staging → founder preview before anything merges.
>
> Quick wins (start here):
> - ⬜ **Q1 Status bar** — live pulse in sidebar bottom (FIGSY active · warmup count · credits left). "Near-zero effort" per inventory.
> - ⬜ **Q2 Profile dropdown** — full build (Usage · Billing · Team · Settings · Developer API · Sign out). Currently partial.
> - ⬜ **Q3 Mobile PWA** — manifest.json + service worker. Installable on mobile, Africa-first.
> - ⬜ **Q4 Subscribe-to-the-drop** — email capture → Resend list. Ties the content engine together.
> - ⬜ **Q5 Site nav/footer rewire** — ~40 landing pages: Demo→Watch, add The Drop. Was held post-launch.
>
> Medium builds (after quick wins reviewed):
> - ⬜ **M1 Deliverability dashboard** — warmup progress, bounce rate, spam complaints. All data exists, needs UI.
> - ⬜ **M2 Kanban pipeline view** — drag-card alternative view on leads.
> - ⬜ **M3 Real-time activity feed** — Supabase realtime: "FIGSY sent to Kamau · 2 min ago".
> - ⬜ **M4 A/B subject testing UI** — two variants per step, evals harness already collects data.
> - ⬜ **M5 Configurable agent triggers** — time window, weekends off, reply delay settings.
> - ⬜ **M6 Notification centre** — bell icon + slide-out panel, hooks into existing events.
>
> Bigger builds (confirm direction first):
> - ⬜ **B1 Revenue Mission Control** — 3-col live ops centre (most impressive staging item, ~3–4 days).
> - ⬜ **B2 FIGSY Memory v2 / pgvector** — 🧍 enable pgvector in Supabase (2 min), then 🤖 builds the moat.
> - ⬜ **B3 Casey conversational onboarding** — needs founder voice/tone input before building.
>
> **📋 REST BEFORE 19:** ⬜ **D9** deliverability 10/10 (🧍, due Sun 14) · 🟢 warmup auto-ramp→~50/day (running, no action) · ✅ **2 crown-jewel key rotations DONE 11 Jun** (Stripe-secret + Supabase-service-role, both api+admin confirmed working) · ⬜ **legal pack #10–#14** (🧍, due Sun 14: ICO £40 · SR01 · registered office · WHOIS · LinkedIn lockdown) · ⬜ **Go/No-Go gate Thu 18** · ⏸ **Y16** kill dead Vercel↔GitHub integration (🧍, next week) · 🅿️ Batch 2 (social login — parallel, NOT a blocker; staging-isolation moved UP into Track 2).
>
> ### 🌿 STAGING WORKFLOW (OFFICIAL — all future builds go through here; never test on the client-facing site again)
> **Branches:** `main` = production (client-facing, prod Railway) · **`staging`** = testing (created 9 Jun, = `main`) · `claude/kind-carson-MYhSl` = dev. **Flow:** Claude pushes cosmetic/V2/enhancement work → **`staging`** → staging Railway site auto-deploys → **founder tests on staging** → approves → **Claude merges `staging` → `main`** (prod deploys). Nothing untested touches prod.
> ✅ **Founder one-time setup DONE 11 Jun** — staging Railway service live at `heartfelt-essence-production-1434.up.railway.app` (Branch=`staging`). ⚠️ Config that actually works (learned the hard way): Root Directory must be **EMPTY** (not `apps/portal` — monorepo needs sibling packages) + custom build command `yarn install && yarn workspace @kind/db build && yarn workspace @kind/shared build && yarn workspace @kind/portal build` (from `render.yaml`).
> **Caveat (now):** staging shares **prod API + Supabase** → test signups write to live DB (fine pre-launch, no clients). **NEXT (12 Jun, pulled forward from Batch 2):** separate staging Supabase project for full isolation — see STAGING-ISOLATION PLAN in the resume block above.
- **✅ 10 JUN (late) — INDEPENDENT VERIFICATION PASS (Fable re-checked all of today's work).** All 20 code files re-reviewed line-by-line · **builds green:** shared ✓ · api type-check ✓ · **16/16 unit tests pass** · portal full `next build` ✓ (every route generated, incl. the roadmap redirect). **Security re-check:** the new `campaign_id` filter can't leak cross-client data (leads query still client-scoped) · recompute counters matches the read-side reconcile definitions exactly · credit deduction checked+sequential confirmed. **Docs consistent:** LAUNCH-MAP deleted, no dangling links, master timeline has all 10 days, tracker banner in place. **Two notes (not bugs):** ① arriving at /leads with `?campaign_id=` does one unfiltered fetch before the filtered one (brief flash); ② live sites couldn't be probed from this container (Cloudflare 403 bot-block) — live verification stays in the founder's recorded smoke tests. **Branch `cf2840f` is clean and merge-ready when founder says go.**
- **🗺️ 10 JUN — AUDIT CROSS-REFERENCE PASS (fixed on branch `claude/kind-carson-MYhSl`; the live system on `main` is untouched until the founder merges). See the dated MASTER TIMELINE below for the day-by-day to Fri 19.** Worked the full-system audit section by section. **Fixed & pushed to `claude/kind-carson-MYhSl`:** client portal Y4·Y5·Y7·Y8·Y9·Y10·Y11 + R4 · website R5 (demo stats labelled "illustrative" + every comparative claim dropped) · API Y1 (rate-limit) · Y2 (atomic credits) · **Y3 + data-integrity pass — counter-drift bug class killed** (recompute-from-source + both autopilot crons reconcile-then-decide, so a drifted counter can't wrongly auto-pause a live campaign). **New ops docs:** `legal/key-rotation-runbook.md` · `legal/restore-runbook.md` · `DELIVERABILITY-D9-CHECKLIST.md` · failover-doc security fix. **Deferred (founder call):** Y6 + Y15 → post-launch. **Founder hard blockers for the 19th (only 5):** rotate 2 keys · ICO · D9 · say "go live" · smoke-test ST1/ST2. **Apollo cap clarified:** ~50 *clients* (NOT leads), and that's our estimate in `legal.md`, not Apollo's rule. **Open decisions:** rotation scope (2 vs ~9 keys) · run Apollo-ToS deep-research · get a free PDL key → 🤖 wires the 2nd discovery source.
- **🔥 TRACTION (8 Jun) — REAL DEMAND IS HERE.** Potential **first client** (wants ~10 people on the system) + **first partner signed** (covers **Nigeria**). Validates Africa-first. **Both need the system live — ✅ it deployed 8 Jun and is now live on `main`** (T8+T1 passed); remaining = finish smoke tests + the launch gates. Founder is committed to a day-and-night push to hit **Fri 19**. Good news: the paths they need are **already built** (team invites via `client_members`/`/team/invite`; partner onboarding via `routes/partners.ts` — apply→approve→auto-sandbox→partner portal→commissions) — they just need deploy + verify (new smoke tests **T9 team invites, T10 partner** added).
- **🚀 DEPLOYED 8 Jun — LIVE on `main` (now verifying).** Merged `claude/kind-carson-MYhSl` → `main` (commit `f0eb02b`); Railway deploying api/admin/portal. We hit it a day early.
>   - **✅ DONE TODAY (real, verified actions):** migrations **010/011/012/013** run in Supabase · env vars set (cold-FROM/reply-to/warmup-start · admin key clean, no `NEXT_PUBLIC_ADMIN_KEY` · `FIGSY_COLD_DAILY_CAP` deleted so warmup auto-ramps) · **partner referral fix** (Demmy) · **merged to production**.
>   - **🧪 NOW VERIFYING (deployed, NOT yet smoke-confirmed — still earn their ✅):** D1–D5 deliverability · warmup cap + auto-ramp · P-a signer · admin security fixes · partner referral generation.
>   - **▶️ RESUME 9AM TUE 9 JUN (fresh start) — ⚠️ 9-Jun snapshot, superseded (T8 + T1 have since PASSED; current status is up top):** Step 4 post-deploy smoke mostly ✅ (portal · admin · partner all verified 8 Jun). **Start with: Step 5 + T8 together** — set up a FIGSY campaign that fires a cold send → **starts the warmup** AND verifies **T8 deliverability** (inbox placement from `gettingkind.com` · List-Unsubscribe · plain-text). Then **T1 fresh signup** (never tested). Then T3-13 · T4 · T5 · T6 · T7 · T9 · T10. **1 portal fix queued for next redeploy:** ICP edit auto-scroll (committed, not deployed — workaround: scroll down after Edit). Send Demmy his link: `https://get-kind.com?ref=maceyluxeac16`.
>   - Parked: dormant `/dashboard/v2` (delete vs build-on) · 2 crown-jewel key rotation. **Warmup = Option B (passive auto-ramp 10→50/day).**
- **Today / baseline:** Sprint **active — Mon 8 Jun 2026**. 11-day countdown to **Fri 19 Jun** launch.
- **⚠️ CANONICAL BRANCH = `claude/kind-carson-MYhSl`.** Code + this master now live together here (consolidated 8 Jun). The older copy on `claude/ai-business-roadmap-U3OWJ` is stale — read/update HERE, merge that branch in if needed.
- **🌍 RE-CONFIRMED 10 Jun (founder, after US-now question + ToS/GTM review):** **"We go Africa until it dries up and/or we're big enough to take the risk and volume."** US entry = founder-gated on those two conditions; inbound US signups accepted passively (USD pricing stays), no US outbound GTM. Original decision below stands.
- **🌍 STRATEGY DECISION (8 Jun) — AFRICA-FIRST, US DEFERRED.** Launch and operate **Africa-only** to start. Rationale: (1) steer clear of the US/global competitor cluster (Atlas/Revio/Monday/ClickUp) and play where our POPIA/African-data moat is strongest; (2) reduce exposure to the founder's employer (the founder's employer) conflict-of-interest surface. **US (and other non-African markets) are GATED — only revisit once we have steady recurring African income.** Every "SA + US" / "US equiv" / "US Month 2" item in this doc is hereby **deferred to the US-gate**, not pre-launch scope.
- **🌍 AFRICA GTM — RESEARCH-HARDENED (10 Jun deep-research, ~40 sources; verdicts below are sourced, the tiering held):**
  - **Priority order confirmed: 1) SA · 2) Nigeria · 3) Kenya (fast-follow ~Q4'26) · 4) Ghana (opportunistic via NG partner) · 5) Egypt (defer indefinitely — Arabic-first, EF English "low" → FIGSY's English engine mismatched).** Evidence: SA = Africa's best English (EF #13 globally) + best card rails for recurring billing + most mature SaaS market; Nigeria = largest SMB pool + best-of-Africa Apollo coverage (with SA) + partner-led entry matches how Nigerian B2B actually buys; Kenya = #1 VC funding (~$934M '25) **but energy-skewed (weak sales-tool signal)**, thinner Apollo data, M-Pesa-first billing weak for card recurring.
  - **🟢 THE LANE IS OPEN:** **no African-built AI-SDR/cold-email competitor found**; global tools (Apollo/Instantly/Smartlead) have zero localized African GTM, pricing, payments, or POPIA/NDPR positioning. **Watch: Trembi** (East Africa — positioning as "Apollo alternative for Africa"). **Concrete wedge: Apollo itself doesn't accept African mobile-money/local payments — we do (Flutterwave).**
  - **Data ceiling CONFIRMED:** Apollo strongest (for Africa) in SA + Lagos enterprise/mid-market; **thin in Kenya/Ghana and for SMBs generally**; PDL fallback = breadth not depth. Proprietary African contact graph = the real moat (roadmap). Quantify empirically: the 4-country previewCount test.
  - **Nigeria billing note:** research rates **Paystack subscriptions** the best-fit for NG SaaS billing (bank-transfer/USSD culture, card declines high) — we have Flutterwave; evaluate Paystack as an NG-specific addition when the first NG client lands.
  - **Deliverability:** no evidence African-origin mail is penalised *when sent from reputable infra with SPF/DKIM/DMARC* (which we do); risk attaches to IP/domain reputation, not nationality. Action: seed-list placement tests into Gmail/Outlook ZA/NG/KE post-launch.
  - **Runway honesty (estimate):** at $29–99/seat, ~$10k MRR ≈ 100–300 seats ≈ 10–30 SMB clients ≈ plausibly **6–12 months post-launch** on trust-led African sales — **unless the partner channel produces multi-client batches → the partner motion is the highest-leverage GTM decision of the year** (pattern evidence: Flutterwave/Salesforce-Africa scaled via partners; Yoco shows direct works only where physically present → SA-direct + NG-via-Demmy is exactly right).
  - **🇺🇸 US VERDICT: US-LATER, CLEARLY (sourced):** ~110 AI-SDR vendors, $400M+ VC, median vendor revenue only ~$2.2M; 11x scandal (fake customers, ~$3M real vs ~$14M claimed ARR, "70–80% churn" per employee — TechCrunch Mar'25); US cold-email replies degraded to **~3.4% average ('26)**; Gmail/Yahoo 0.1% working spam ceiling; premature multi-market scaling = best-documented startup killer (Startup Genome ~70%). US arguments (USD revenue, data depth) are capturable WITHOUT US GTM: price in USD (we do), US-grade infra (we do). **Tripwires to revisit US (founder-gated):** (a) ~$10–20k MRR / 25+ paying clients across SA+NG, (b) >85% 6-month logo retention, (c) FIGSY African reply rates beating the 3.4% US average. Low-cost middle path then: serve African companies selling *into* the US.
  - *(Original directional tiering below, kept for the record:)*
  - **Tier 1 engines: 🇿🇦 South Africa** (best Apollo coverage — dogfood ICP proved ~72k · POPIA built = category-of-one compliance claim · English · cards work · home turf) **+ 🇳🇬 Nigeria** (largest SMB market · **partner Demmy already live** · Flutterwave solves payments · watch: thinner data, NDPR ⏸ until first NG client, sender-reputation care).
  - **Tier 2: 🇰🇪 Kenya** (East-Africa hub, fintech-adoption culture, ODPC ⏸ until first KE client) · **🇬🇭 Ghana** (easy English entry — partner-led, not HQ focus).
  - **Tier 3 (defer): 🇪🇬 Egypt / 🇲🇦 Morocco** (Arabic/French localisation we don't have) · 🇷🇼🇲🇺🇧🇼 (tiny volume, opportunistic).
  - **How we target:** ① dogfood — FIGSY sells K.I.N.D (warmup campaign IS this; scale it) · ② replicate the Demmy partner model per country (1 partner each KE+GH in month 1–2; trust-broker markets) · ③ lead with compliance as marketing (POPIA/NDPR = claims competitors can't make) · ④ open low per-seat pricing as the weapon vs $500+/mo US tools · ⑤ **before pushing any country, run `previewCount` on the canonical ICP — if Apollo returns thin, that market waits for the PDL/multi-source layer (now wired, key-gated).**
  - **The volume ceiling is DATA, not demand:** Apollo thins fast outside SA → runway to first 10–50 clients ≈ same-or-faster than a US launch (warm market, no AI-SDR noise, partner channel); runway to 500+ needs the multi-source/African-data moat. **Founder action: run the 4-country previewCount test (prompts provided 10 Jun) — the best free market-sizing data we can get.**
- **🚀 POST-19TH VELOCITY — THE FAST-FOLLOW IMPERATIVE + GLEAN STEALS (founder strategic call, 10 Jun):** the market moves fast (~110 AI-SDR vendors, growing) → **shipping fast-follow updates weekly after launch is a competitive NECESSITY, not a luxury. For a small team, VELOCITY is the moat** — the window between launch and the intelligence layer is where competitors close in. Item-level placement lives in `V2-TRACKER.md`; the strategic set is consolidated here so it stays visible. **Glean steals — 4 demos studied 10 Jun (the SMB-Africa version of a $7B playbook; steal the workflow-decomposition + context-moat logic, NOT the enterprise surface):**
  - **① Agent-per-workflow + research-driven personalization** [sales-lifecycle demo] — FIGSY does a per-prospect research pass (web+internal) BEFORE drafting (copy upgrade → Train-FIGSY RAG + Manus). New agent candidate: **Call-Coaching agent** (score a rep's call → next-call guidance = augment thesis → per-rep engine #88). **CRM-auto-update-from-transcript** → Milla Notetaker V2-8 + #47. *Skip:* legal-redline (enterprise).
  - **② AI-assisted agent setup** [Auto Mode demo] — describe goal in plain language → AI builds the agent → **= Casey V2-3/V2-10, the highest-value V2 build.** Principle: **Workflow (control) vs Auto (flexibility)** for our autonomy modes (autopilot vs gated copilot). **Permission-safety at create AND run** = guardrail for #88 per-rep + the cross-segment recall moat. *Validates (don't rebuild):* Thinking panel · gated approval queue · agent chips.
  - **③ Context-backed MCP** [MCP Gateway demo] — context-backed MCP beat bare MCP **2.5× / −30% tokens** → build **#59 backed by client CONTEXT (Train-FIGSY · #46 Memory · outcome data), NOT thin wrappers** (wrappers = commodity anyone clones; context = the moat). Per-tool entitlements + usage dashboard → #88 owner controls (2b/2c/2d). *Skip:* MDM/SSO/50k-user rollout (Year-2). OAuth 2.1 = enterprise-later.
  - **④ ★ SHARED/CURATED WINNING-PLAY LIBRARY** [prompt-library demo — THE standout] — owner/power-rep perfects a play → **every seat inherits it → new reps onboard at top-performer level day 1.** The **user-facing form of cross-segment recall** (ship it VISIBLE, not a hidden algorithm). **K.I.N.D edge Glean structurally can't match:** ship curated best-practice templates learned from **cross-CLIENT African outcome data** to every new client day 1 (theirs = per-company; ours = network-compounding = the moat doing visible work). Plus from the deep-dive:
    - **Positioning line to steal verbatim: "level up your whole team to your top performer."**
    - **Two-audience framing:** the rep feels TIME saved; the **owner pays for VISIBILITY** (accurate pipeline/forecast without chasing reps) → sell to both; owner = budget holder = 2c command centre.
    - **Headline KPI/ROI: sell in TIME SAVED PER SEAT** (e.g. "~8h/rep/month") — surface it on the dashboard; it's the number the owner renews on.
    - **Meeting-Prep agent GAP:** nothing preps the human for the booked meeting (last-call summary + suggested questions) → clean **Denise #54** addition ("FIGSY opens, Denise preps you to close").
    - **Mobile-first** (#15 PWA) is a stronger play in Africa than for Glean.
    - **DON'T copy the blank-canvas "build your own"** — opinionated defaults that just work = our SMB edge vs enterprise tools. Curated templates + *optional* customization only.
  - **Through-line:** context + memory + shared learning is the whole game, and **African cross-client outcome data is the one input no competitor can replicate.** **Sequencing:** most of this is #88-era (post-30 Jun, needs multi-rep clients) — NOT launch scope. **Launch generates the outcome data that powers all of it.**
- **🛡️ SAFETY DONE (8 Jun) — EMPLOYER REFERENCES SCRUBBED.** ✅ All 3 buckets complete: suppression guard hardened (base64 floor, protection byte-for-byte intact), planning docs genericised, `docs/chat-archive/` (410 files) removed. Real name kept only in `docs/legal/legal-pack.md` (your legal evidence). Residual: name still in past git history — optional history-rewrite available on request. See Chapter 4 "Employer-Reference Scrub".
- **What's already shipped (verified on `main`, deployed to Railway):**
  - Apollo email enrichment (bulk_match by id) — real emails delivered
  - FIGSY inbound reply pipeline — end-to-end, 🔥 Hot classification verified live
  - Compliance suppression guard — hard-coded at all 6 outreach paths
  - ICP run async · schema drift (lead_status ENUM) reconciled · auto-outreach gated (`AUTO_OUTREACH_ENABLED` default OFF)
  - Outcome-event data floor (#17b) — append-only log live
  - 🧪 **Deliverability D1–D5 (8 Jun)** — **DEPLOYED to prod** (`f0eb02b`) + env vars live. Verifying via post-deploy smoke + inbox test (T8). Earns ✅ once T8 passes.
- **THE #1 BLOCKER (now de-risked):** Deliverability (mail → spam). Code ✅ + deployed 🧪 + cold domain `gettingkind.com` verified ✅ + warmup auto-ramp armed ✅. Remaining: verify inbox placement (T8) + the warmup clock runs from 9 Jun.
- **NEXT ACTIONS:**
  - ✅ 🤖 Claude: Deliverability code **D1–D5** DONE (new `lib/deliverability.ts` + `lib/figsy.ts` + `routes/figsy.ts` + `email.ts`). Detail: Chapter 2, Mon 8 (status rows updated).
  - ✅ 🧍 **Founder — Railway env vars SET (8 Jun): `FIGSY_COLD_FROM`, `FIGSY_COLD_REPLY_TO`, `FIGSY_WARMUP_START=2026-06-09`.** They activate on the Tue 9 deploy. (`TRACKING_URL` deferred until `api.get-kind.com` live.) Original list: **Cold domain = `gettingkind.com`** (Cloudflare DNS, Resend EU-west, verified 8 Jun — **API-only, no mailbox**; replies land in portal Unibox): set `FIGSY_COLD_FROM` = `K.I.N.D <hello@gettingkind.com>` · `FIGSY_COLD_REPLY_TO` = `hello@gettingkind.com` · `FIGSY_WARMUP_START` = `2026-06-09` (auto-ramps the cold cap by date: ≤10 days 1–3, 20 Fri 12, →50 by launch — no daily editing; optional `FIGSY_COLD_DAILY_CAP` overrides) · `TRACKING_URL` (branded tracking/api domain — **open-tracking stays OFF until set**) · optional `FIGSY_UNSUB_MAILTO`, `UNSUBSCRIBE_SECRET`. (Step 5 of the live walkthrough.)
  - 🟡 🧍 Founder: **D6–D8 in progress** — ✅ cold domain bought (`gettingkind.com`, API-only) · ✅ SPF/DKIM/DMARC in Cloudflare + Resend **verified** · 🔄 **warmup clock STARTED 8 Jun** (ramp 5–10→30–50/day over 11 days, now **enforced** by `FIGSY_COLD_DAILY_CAP`) · ⬜ verify `API_URL` + get-kind.com auth. **#1 credential rotation → DE-PRIORITISED to Week 2** (repo scan clean 8 Jun; 2 crown-jewels maybe sooner — see Ch.4, awaiting call).
  - 🤖 Claude: next code = Tue 9 batch (deploy D1–D5, strip BUILD MARKER P-b, CAL-min `booking_url`, P-a sign-as, delete dormant Portal-V2 #2, fix deploy pipeline).
- **Smoke status (current, 10 Jun):** ✅ confirmed — **T1 fresh signup** (PASSED 10 Jun) · T2 ICP→Leads · T3 send→reply→🔥Hot · **T8 deliverability/inbox** · portal loads+login · admin OS + security · partner approved + Demmy referral (T10 partial). ⬜ **LEFT (recorded daily):** T3-13 pause→no-send · T4 booking+KPI · T5 billing · T6 Vida widget · T7 Milla cron hygiene · T9 team invites · T10 full partner path · **D9 mail-tester 10/10.** Detail: `docs/SMOKE_TEST.md`.
- **Go/No-Go gates (Thu 18):** deliverability 10/10 · Smoke Test 2 green · legal #10–#14 done · warmup ~50/day. Any red → slip to Mon 22 (no half-baked launch).

### 🔍 HONEST STATUS — be critical (8 Jun, end of session)
> ⚠️ **SUPERSEDED — 8-Jun historical snapshot, kept for the record.** Most of this was resolved 8–10 Jun: the system **deployed + is live**, **T8 + T1 passed**, a **16-test vitest suite exists**, P-a/CAL-min portal fields shipped, migration 012 ran. For CURRENT status read the RESUME-HERE block + MASTER TIMELINE at the top. The hard truths below were true on 8 Jun.
>
> Cuts through the green ticks above. A lot of code shipped today; **almost none of it
> is deployed or verified in a real environment.** Read this before assuming we're "on track."

**The hard truths:**
1. **Nothing is deployed; nothing is end-to-end tested.** There is **no automated test suite** (no `test` script). All of D1–D5 (List-Unsubscribe, plain-text, cold-FROM), the warmup cap, P-a signer, and the admin fixes are **typecheck-clean only** — never run against a real DB, Resend, or inbox. **Typecheck ≠ working.** First real proof comes only at the Tue 9 deploy + Smoke Tests.
2. **P-a + CAL-min are backend-only → currently INERT.** No portal field exists to set `signer_name` / `booking_url`, so clients can't use them. "Done" = misleading; they're *backend-ready*, gated on UI + migration 012.
3. **Warmup cap has a blind spot.** It counts `figsy_sent_emails`, but the **day-1 batch path inserts NULL enrollment/campaign ids into NOT-NULL columns → those inserts fail → day-1 sends are never counted.** The cap reliably guards the *sequence* path only. (Pre-existing constraint bug — needs a fix or the cap to count from `outcome_events`.)
4. **`signer_name` is a latent landmine.** If the portal sends it before migration 012 runs, the `PATCH /me` upsert fails → **breaks ALL settings saves.** Migration 012 MUST run before any UI sends it.
5. **Admin still bypasses RLS.** The admin frontend uses the `service_role` key across ~13 pages — the biggest architectural security gap, **unfixed** (Week 1–2 refactor).
6. **Launch rests entirely on one un-rehearsed Tue 9 deploy** going perfectly: merge→main, run migrations 010 + 012, set/verify env vars (cold-FROM, admin key), nothing else breaks. No dry run yet.
7. **Smoke tests T1–T7 not started.** The real end-to-end verification hasn't begun. T1 (fresh signup) has never been run, ever.

**Fair risk read for Fri 19:** the *code* is in good shape and progressing fast; the **gap is verification + deploy choreography, not features.** Date is still plausible **only if** the Tue 9 deploy is clean AND Smoke Test 2 passes first try — neither is proven. Realistic buffer is thin: the day-1 cap fix, the admin RLS refactor, and any smoke-test failures all compete for the same 2–3 days. If the deploy slips or smoke tests find real breaks, **Mon 22 is the honest fallback.**

**Most valuable next moves (in order):** (1) do a **dry-run deploy to a staging/throwaway** to de-risk Tue 9; (2) **run Smoke Test T1 fresh-signup** ASAP — it's never been tested; (3) fix the day-1 cap blind spot; (4) build the P-a/CAL-min portal fields *with* migration 012 so they're actually usable.

### 🔨 BUILT THIS SPRINT (8 Jun) — at-a-glance progress
> `🔨` = code-complete on branch, **NOT live/verified** (proven only at Tue 9 deploy + smoke tests). `✅` = genuinely done (real-world / repo state).
- 🔨 D1–D5 deliverability (List-Unsubscribe + one-click · plain-text · tracking-pixel guard · cold-FROM)
- 🔨 Warmup cold-send cap + date **auto-ramp** (`FIGSY_WARMUP_START`)
- 🔨 Day-1 cap **blind-spot fix** + migration 013
- 🔨 **P-a** configurable email signer (backend) + migration 012
- 🔨 **Admin security:** 3 criticals (key exposure · demo backdoor · timing compare) + zod/credit-audit mediums
- 🔨 Dynamic build marker · "Est. pipeline value" relabel (C7)
- ✅ **Employer scrub** (repo): suppression hardened · docs genericised · 410 chat logs removed
- ✅ **Cold domain `gettingkind.com`** bought + DNS **verified in Resend** (real)
- ✅ **Railway cold-send env vars set** (real)
- ✅ Strategy logged: Africa-first · rotation deferred · implementation maps · this honesty fix
- 🧪 **16 automated tests PASSING** (vitest, `npm test` in apps/api) — unit-verifies the pure logic: unsubscribe tokens · htmlToText · D3 tracking guard · suppression matcher · warmup ramp. *First tests in the repo — attacks the "zero tests" gap. (Unit-verified ≠ live-verified.)*
- ✅ **DEPLOYED 8 Jun** (a day early) — migrations 010/011/012/013 run · env set · merged to `main` (`f0eb02b`) · Railway deploying.
- ⬜ **OWED before the above 🔨→✅:** post-deploy smoke (Step 4) → Smoke Tests **T1–T10** → inbox-placement test (T8).

## ▶️ EXECUTION ROADMAP — HOW IT ALL SEQUENCES (the one integrated view, updated 8 Jun)
> The single place that shows how **launch + per-rep (#88) + the rest of V2 + everything** stack up.
> Each block has a gate — don't start a block before its prereq. Detail lives in the chapters; this is the spine.

**① THIS WEEK (now → Fri 19) — LAUNCH THE CURRENT BUILD.** Deploy (`DEPLOY-CHECKLIST.md`) → Smoke `T1–T10` → go live on the **shared-workspace model**. Serves solo founders, small centralised teams, the **partner's pipeline**. First client onboards here as a **pilot**. No per-rep yet.

**② THIS WEEK / WEEKEND — STAGING (HARD PREREQ for ③ and ④).** Supabase staging + Railway staging + `staging` branch auto-deploy. Per-rep and V2 are a re-architecture — never build them on prod with a live client.

**③ NEXT WEEK (~Jun 22–26) — #88 PER-REP MVP (the expansion engine).** 4 slices: per-rep identity (calendar/booking/signer → member) · per-rep ownership (leads/campaigns owner + routing) · **seat + budget (request/approve, hybrid)** · owner command centre. **⚠️ This ABSORBS / pulls forward 3 V2 items** → **V2-7** (invite, ~built), **V2-9** (Teams Hub = the owner command centre), **V2-13** (per-rep multi-provider calendars). 10-rep client = **early-access** here. Target ~Fri 26.

**④ LATE JUN – JUL — REST OF V2 (portal redesign, ON the per-rep foundation).** The V2 items NOT absorbed by #88: V2-1 card grid · V2-2 thinking state · V2-3 conversational setup · V2-4 config panel · V2-6 slim sidebar · V2-8 Milla notetaker · V2-10 Casey · V2-11 Vida bubble · V2-12 dashboards · #83 Forms · #84 Integrations Hub. (Map: Ch.3 V2 section + Ch.5 V2 map.)

**⑤ MONTH 2+ (gated 10+ clients) — INTELLIGENCE + GROWTH.** Intelligence layer #37–53 · **MCP #59** (distribution) · Product Hunt/G2. (Ch.5 §5.1, §5.4.)

**⑥ MONTH 3+ — AGENT FAMILY + PRICING.** Denise deep build #54 + **per-proposal pricing #85** · Lena/Tony · outcome pricing #60. (Ch.5 §5.3–5.4.)

**↔ PARALLEL / ONGOING:** Week-1 GTM (#19–28) · admin RLS refactor (Wk 1–2) · legal rings · deliverability monitoring · the 2 crown-jewel key rotation.

**🔧 RECONCILIATION (resolves the overlap the audit found):** **#88 pulls V2-7 / V2-9 / V2-13 forward from Month 2 → next week** — they ARE the per-rep team/calendar features, so they ship as part of the per-rep MVP, not later. All *other* V2 items stay as the Month-2 portal-redesign layer that sits **on top of** the per-rep foundation. (V2-9/V2-13 rows in Ch.3/Ch.5 tagged accordingly.)

---

### 🎯 V2 MONTH-END PLAN — LIVE BY 30 JUN (locked 8 Jun by founder)
> Founder set the target + chose the scope: **"Per-rep + company OS."** This is THE core that must be in production by 30 Jun. It is a *scoped* V2, not all 18 sections — forcing everything would build the half-baked system we refuse to ship.
>
> **🚦 GATE (day 1, non-negotiable):** V1 in prod is NOT verified yet — warmup/T8 deliverability never tested. We do **not** build per-rep on an unverified base. **9am: Step 5 (first FIGSY warmup campaign) + T8 (deliverability), then T1–T10.** Foundation must be green before staging build starts.
>
> **IN by 30 Jun (the durable money engine):**
> - **#88 per-rep** — each rep their own autonomous FIGSY (identity · calendar · booking · leads scoped to the member, not the workspace).
> - **Owner Command Centre** (V2-9) — one company dashboard over all reps.
> - **Seats** + **Usage & Budget** (request → approve/deny, hybrid seat+usage) — one company payment, N FIGSYs. *(Founder: "vital.")*
> - **Performance funnel** (§17) — per-rep + company rollup (per-rep is meaningless without the rollup).
>
> **SLIPS to July (designed, not month-end — layer ON the per-rep foundation):** full branching sequence builder (#89) · multi-channel LinkedIn/WhatsApp/SMS · Train-FIGSY (§18) · Integrations Hub (#84) · §16 Smart Inbox rich taxonomy · the V2 cosmetic redesign items (V2-1/2/3/4/6/8/10/11/12).
>
> **DATED CRITICAL PATH (22 days):**
> - **Wk0 · Mon 8 – Fri 12 — VERIFY + STABILISE.** 9am smoke gate (Step 5 + T8 → T1–T10). Warmup ramping. First client onboarded on shared model as pilot. Partner solid. **Finalise #88 schema design + stand up staging (hard prereq).**
> - **Wk1 · Mon 15 – Fri 19 — PER-REP FOUNDATION (staging).** Slice 1 per-rep identity (calendar/booking/signer/leads → `client_members`). Slice 2 per-rep ownership (campaigns/sent-emails owned + meeting routing to the right rep's calendar). Migrations written + dry-run.
> - **Wk2 · Mon 22 – Fri 26 — COMPANY OS (staging).** Slice 3 seat billing (per-seat wallets + company budget + request/approve usage). Slice 4 Owner Command Centre + Performance funnel rollup. End-to-end integrate on staging.
> - **Wk3 · Mon 29 – Tue 30 — HARDEN + SHIP.** Migration dry-run on a staging clone, full per-rep smoke (new T11 per-rep flow), deploy to prod **30 Jun**. Mon 29 is the buffer for slippage.
>
> **Risks:** (1) the smoke gate finds real deliverability/prod breakage → eats Wk0, pushes everything right; (2) the workspace→member migration on a live client's data is the single riskiest step — staging dry-run is mandatory; (3) scope creep back toward "everything" — hold the line, July layers the rest.

## 📎 COMPANION DOCS (live reference — always link new artifacts here)
> The separate visuals + runbooks that sit alongside this master. Links target the canonical branch `claude/kind-carson-MYhSl`. **Process rule (8 Jun): any new doc/visual created outside this master MUST be added to this index — one always-current reference.**

**Visuals — open in a browser:**
- [CLIENT_FLOW.html](https://github.com/jacquesvieiraza-blip/KIND/blob/claude/kind-carson-MYhSl/docs/CLIENT_FLOW.html) — full client journey (Part 1) **+ the company / per-rep model (Part 2)**
- [CLIENT_FLOW_PER_REP.html](https://github.com/jacquesvieiraza-blip/KIND/blob/claude/kind-carson-MYhSl/docs/CLIENT_FLOW_PER_REP.html) — the per-rep model, standalone
- [portal-v2-preview.html](https://github.com/jacquesvieiraza-blip/KIND/blob/claude/kind-carson-MYhSl/docs/portal-v2-preview.html) — V2 portal concepts **+ per-rep §11–13** (Command Centre · Seats · Usage&Budget) · §14 sequence builder · §15 integrations hub · §16 smart inbox · **§17 performance funnel · §18 train FIGSY**
- [setup-dashboard-preview.html](https://github.com/jacquesvieiraza-blip/KIND/blob/claude/kind-carson-MYhSl/docs/setup-dashboard-preview.html) — onboarding/setup **+ per-rep company setup**
- [portal-v2-layout.md](https://github.com/jacquesvieiraza-blip/KIND/blob/claude/kind-carson-MYhSl/docs/portal-v2-layout.md) — V2 design spec (text)

**Runbooks — read:**
- [DEPLOY-CHECKLIST.md](https://github.com/jacquesvieiraza-blip/KIND/blob/claude/kind-carson-MYhSl/docs/DEPLOY-CHECKLIST.md) — the launch deploy sequence (migrations → env → merge → smoke)
- [SMOKE_TEST.md](https://github.com/jacquesvieiraza-blip/KIND/blob/claude/kind-carson-MYhSl/docs/SMOKE_TEST.md) — T1–T10 verification (incl. deliverability, team, partner)

*(HTML files show source on GitHub — download/open to view rendered, or I can send them in chat anytime.)*

### 🔄 SESSION LOG (newest first — append one line per working session)
- **11 Jun:** 🔐 **Deliverability-evidence morning + a live bug caught & fixed.** ✅ Postmaster Tools registered (`gettingkind.com`) · ✅ Resend confirmed real cold mail **Delivered** to real prospects (~0% real bounce; the only bounces are demo `@kind-demo.internal` fake addresses — hygiene fix offered). 🐞 **Caught the autopilot wrongly auto-pausing the live warmup campaign** (day 3, 0 replies = expected) → shipped **hotfix PR #505** (age+volume guard on check-performance + a Resume button for auto-paused campaigns) — **founder merged it; warmup resumed.** ✅ **2 crown-jewel keys ROTATED** (Stripe-secret + Supabase-service-role, both api+admin working) → **launch RED cleared** + neutralises any stale secret in the dead Vercel projects. Vercel↔GitHub dead integration logged Y16 (next week). Seed-list inbox test deferred to 12 Jun (today's warmup cap already spent — system protecting the ramp, working as designed).
- **10 Jun:** 🚀 **Post-19th velocity principle locked + all 4 Glean-demo steals consolidated into the master** (founder: market moves fast → weekly fast-follow updates are a competitive necessity; velocity = the moat for a small team). Steals span FIGSY research-personalization · Call-Coaching agent (#88) · CRM-from-transcript (V2-8) · Casey AI-setup (V2-3/10) · context-backed MCP (#59) · the ★ shared winning-play library (#88 + cross-segment recall, network-compounding) · "level up your whole team" positioning · two-audience (rep=time/owner=visibility) · time-saved-per-seat KPI · Meeting-Prep gap (Denise #54). Item-level detail in V2-TRACKER; strategic set kept visible in master.
- **10 Jun:** 🌍 **Africa GTM research-hardened + US question settled.** Deep-research (~40 sources) confirmed the tiering: **SA → Nigeria → Kenya (Q4 fast-follow) → Ghana (partner-led) → Egypt (defer, language mismatch)**. Key finds: **no African-built AI-SDR competitor exists (lane open; watch Trembi)** · Apollo data ceiling confirmed (SA+Lagos OK, Kenya/Ghana thin) · Apollo doesn't take African payments = our wedge · partner motion = highest-leverage GTM decision (pattern: Flutterwave/Salesforce-Africa) · **US-later verdict decisive** (~110 vendors, 11x scandal, 3.4% avg replies, premature-scaling evidence) with founder-gated tripwires (~$10–20k MRR / 25+ clients / >85% retention / beat 3.4%). Founder re-confirmed: **"Africa until it dries up and/or we're big enough to take the risk and volume."** Logged in master GTM section. Founder to run the 4-country previewCount test.
- **10 Jun:** 🌐 **Multi-source wired + Apollo ToS corrected.** (1) 🤖 **PDL wired as a 2nd lead-discovery source** (`lib/pdl-search.ts` → `searchPeopleWithFallback`): Apollo-fail/empty → PDL, **dormant until `PDL_API_KEY` set** (byte-identical today), typecheck+16 tests green. (2) 🔍 **Apollo-ToS research (sourced):** the **~50/100-client thresholds were INVENTED, not Apollo policy** — reselling off one account violates ToS **from client #1**; enforcement discretionary; fix is **structural** = (a) API Reseller agreement (`partners@apollo.io`, ~1 wk) [primary] or (b) client-brings-own-key. Corrected in master MULTI-SOURCE section + `legal.md` + tracker R6. **Founder next:** email `partners@apollo.io` + drop a free PDL key.
- **10 Jun:** ✅ **T1 (fresh signup, end-to-end) PASSED** — the single biggest verification unknown (had literally never been run). Smoke Test 1 new-client path now green on signup→onboard→dashboard. Remaining smoke: T3–T7, T9, T10 + D9 10/10.
- **10 Jun:** 🗺️ **Full-system audit cross-reference — worked Fable's findings section by section, all fixed branch-only on `claude/kind-carson-MYhSl` (nothing live).** Client portal (Y4·Y5·Y7·Y8·Y9·Y10·Y11·R4) · website R5 (illustrative labels + comparatives dropped) · API Y1/Y2/Y3 · **data-integrity pass killing the counter-drift bug class** (recompute-from-source + autopilot crons reconcile-then-decide). New ops docs (key-rotation · restore · D9 deliverability; failover security fix). Deferred Y6+Y15 to post-launch. Apollo cap clarified (~50 *clients*, our estimate not Apollo's rule). **Consolidated everything back into THIS master timeline + retired `LAUNCH-MAP.md` (was making it 3 confusing docs → now 2: master = launch, V2-TRACKER = future).** Remaining to 19th: finish smoke tests (T1·T3–T7·T9·T10, recorded daily) · D9 10/10 · legal #10–14 · rotate 2 keys · onboarding videos · then merge the audit-fix PR. Open: rotation scope, Apollo-ToS research, PDL key → wire 2nd discovery source.
- **9 Jun (late):** 🚀 **WENT FULLY LIVE — all Bucket-A cosmetics merged to `main` + `staging` flow set up.** No clients yet, so founder chose to go live with everything today and smoke-test the real system tomorrow. **Live now (flag `NEXT_PUBLIC_FEATURE_V2_SCREENS=all`):** ① Onboarding/Welcome (Spotlight on `/onboard`) · ② Dashboard Home (Agent Grid) · ③ Slim sidebar **+ agent switcher** (active-agent card + "Switch agent" dropdown w/ photos, replaces flat lump) **+ profile chip** (initials + hover menu, replaces bare dot) · ④ **Config Panel** (`/dashboard/config`, real ICP) · ⑤ Leads C1/C3 (active-ICP card above People) · ⑦ **Marketplace** (`/dashboard/marketplace`, real owned/available) · ⑧ **Thinking panel** (shows during ICP runs) · Signup T&C (required). Each gated `v2Enabled(screen)`; `all` on. **#6 Invite skipped.** **🐞 FIXED — dashboard "0 Sent":** `/figsy/campaigns` now reconciles `emails_sent` against the real `figsy_sent_emails` log (source of truth) + fixed the `increment_figsy_emails_sent` RPC fallback (supabase returns errors, doesn't throw). **🅿️ Social login PARKED → Batch 2:** Google/Microsoft buttons decoupled behind `NEXT_PUBLIC_SOCIAL_LOGIN` (default off) so signup stays clean + **no Supabase setup needed now**; flip the env + do Google OAuth in Batch 2 (no code change). **🌿 STAGING FLOW (founder's idea, set up):** `staging` branch created (= `main`). Next: founder provisions a **2nd Railway portal service watching `staging`** with its own domain (e.g. `staging.get-kind.com`) → future V2 work pushes to `staging` → auto-deploys → founder tests → approve → merge `staging` → `main` (live). Staging shares prod Supabase for now (no clients); split later. **Tomorrow:** ST1 fresh signup + ST2 `hello@get-kind.com`.
- **9 Jun:** 🔐 **🔒 SIGNUP REQUIREMENTS — (a) required T&C checkbox · (b) social login.** Founder: at signup a client MUST tick **"I agree to the Terms & Conditions and Privacy Policy"** (link to `terms.html`) — account can't be created without it (legal). Plus **social login** ("Continue with Google / Microsoft") — **easy via Supabase Auth** (already the auth layer): founder enables the Google provider in Supabase → Auth → Providers (paste Google OAuth client id/secret from Google Cloud, ~10 min one-time); Claude adds the button (`supabase.auth.signInWithOAuth({ provider:'google' })`). Passwordless signup → higher conversion. Both shown in the `/v2/signup` preview; wire into the real `(auth)/onboard` + `login` pages on promotion (behind the `signup` flag). **Founder action:** set up Google OAuth creds + enable in Supabase.
- **9 Jun:** 🐞 **KNOWN ISSUE (logged, NOT actioned) — campaign "0 sent" while warmup IS sending.** Dashboard home + "Warmup test" show **0 sent / 0% of 60 contacted**, but the Activity Feed shows FIGSY sent Day-1 emails (Nicci/Moamen/Darren… 5h ago) → emails ARE going out (warmup works fine), the **counter just isn't updating**. **Root cause:** `sendSequenceEmail` (`lib/figsy.ts:471-483`) bumps `figsy_campaigns.emails_sent` via `db.rpc('increment_figsy_emails_sent')` inside a `try/catch` — but supabase-js RPCs **return** errors (don't **throw**), so if that RPC is missing in the DB the `catch` never fires and the fallback direct-update never runs → counter stays 0. The Activity Feed reads `outcome_events` (separate source) so it shows the truth. **Fix (post-T1):** check the rpc `error` and run the fallback, or just always do the direct `emails_sent + 1` update. Same class as the `campaignReadyLeadIds` "supabase returns errors, doesn't throw" bug. **Not blocking** — warmup is sending; cosmetic counter discrepancy that's visible on the demo.
- **9 Jun:** 🎬 **🧍 FOUNDER ACTION (starts 10 Jun) — record the 60-sec onboarding demo videos.** Founder records the per-step "Watch 60-sec demo" clips for the onboarding flow (Confirm ICP · Connect email · Review leads · Launch campaign · Invite team) — ties to **#29 (onboarding video content, 3 Looms)** + the onboarding screen's demo buttons. Will advise V2 changes once the onboarding preview finishes deploying.
- **9 Jun:** 🎨 **🔒 V2 promotion split — BUCKET A (cosmetic) before 19th · BUCKET B (per-rep #88) AFTER 19th.** Founder wants the live product slick for the 19th launch + demo, promoted **one screen at a time, approval-gated, behind per-screen flags** (off by default → founder tests with real data → on, or instant rollback). **BUCKET A (cosmetic, no data-model change — before 19th, ranked):** ① Onboarding/Setup redesign · ② Dashboard home / Agent Grid · ③ Slim sidebar · ④ Config Panel · ⑤ Leads/People polish (C1 ICP-above-People + C2–C5) · ⑥ Invite Teammate · ⑦ Marketplace · ⑧ Thinking State. **UI-DONE-BUT-NEEDS-FEATURE (design-only, NOT launch cosmetic):** Sequence Builder (#89) · Smart Inbox (multi-channel) · Integrations Hub (#84) · Train FIGSY (M3) · AI Notetaker (M2) · Conversational Setup (needs Casey #V2-10). **BUCKET B — AFTER 19th (needs staging + workspace→member DB re-arch, target 30 Jun per V2 MONTH-END PLAN):** Company Command Centre · Per-Rep Seats · Usage & Budget · Performance rollup (all #88). **Flag landmine:** existing `FEATURE_PORTAL_V2` is all-or-nothing → redirects whole dashboard to OLD dormant `/dashboard/v2`; DO NOT flip it — replace with clean per-screen flags on first promotion. **Process:** founder approves each `/v2` screen → Claude rebuilds it on the live route wired to real data behind its own off-by-default flag → founder tests → on, or instant off.
- **9 Jun:** 🟢 **WARMUP WENT LIVE — #1 blocker (deliverability) proven; Option A shipped.** (1) **T8 PASSED** — real cold email from `gettingkind.com` → inbox, not spam. (2) Warmup ramp live from `FIGSY_WARMUP_START=2026-06-09` (10/day → 50; FIGSY auto-sends via 2h cron — zero daily founder work). (3) Signer `Jack from K.I.N.D` set in Supabase. (4) **🔒 OPTION A** locked + built + deployed: Apollo-verified leads = auto campaign-ready (no consent click), opt-out/unsub → DNC; one shared rule `campaignReadyLeadIds` wired into Enroll button + Activation + a **new FIGSY-chat enroll tool** (`runEnrollLeadsTool`). (5) First batch live: fresh ICP → 60 verified African leads → enrolled → sequence saved → drip-sending. Fixes: Railway build (`.yarnrc --ignore-engines`; vitest@4→vite@8 needed Node≥20.19) + a `campaignReadyLeadIds` PostgREST-boolean bug (returned 0 verified → now JS-filtered). Loose ends (non-blocking): signer Settings UI, FIGSY-chat enrol button navigates instead of enrolling, no Delete-leads button. Next: watch Sent climb → T1/T3–T7/T9/T10 + D9 inbox 10/10.
- **8 Jun (late):** 🔁 **🔒 HARD REQUIREMENT — CRM dedup (never duplicate a client's leads/contacts).** Founder: we must connect to the client's CRM so FIGSY never reaches a contact already in their pipeline; opt-in (can't promise if they don't connect) but the **strong default**. Mirrors Alta (two-way Salesforce sync + do-not-contact list). **TWO dedup layers required:** **(1) Against client CRM** — on connect (HubSpot/Salesforce/Pipedrive via Integrations Hub #84) pull existing contacts/accounts into a **suppression list** (extends our existing `suppression.ts` spine, not from scratch) → no outreach to owned/in-pipeline contacts; push new leads+replies+booked meetings *back* to CRM so their side isn't duplicated either. **(2) Internal cross-rep (#88)** — even with no CRM, two reps' FIGSYs in the same company must NOT hit the same person → company-level lead **ownership/claim layer** so each lead belongs to exactly one rep (critical or the company looks spammy + reps collide). Framing: CRM connect opt-in + pushed hard at onboarding; connected → guarantee no CRM dupes; not connected → layer 2 still protects internally, external dedup explicitly needs the connection. Ties #84 (Integrations Hub) + #88 (per-rep) + suppression. (Confirm scope: contacts/leads — check if founder also wants deal/"contract" dedup.)
- **8 Jun (late):** 🌍 **DATA-SOURCE candidate — Manus AI as a SECOND lead source (founder flag).** Directly addresses the Apollo-only gap surfaced in the Alta intel (Alta = 50+ source waterfall). **Why it matters for US specifically:** Apollo/ZoomInfo under-cover African SMBs — the exact companies an Africa-first platform most wants — so a web-mastering agent could fill our market's biggest data hole = potential **moat**, not just parity. **Architecture (don't swap, waterfall):** Apollo first (structured, instant **API**) → **Manus as async deep-research fallback** for leads Apollo can't see (esp. African SMBs). Key design caveats: Manus is an *autonomous agent*, not a real-time data API → slower/async, less-structured output, needs dedup + email verification + cost-per-run controls on the way out. **Status: candidate, not committed.** Slots into Ch.5 §5.5 (data moat) / the enrichment-waterfall roadmap; revisit after the 30 Jun per-rep push. NOT a launch blocker.
- **8 Jun (late):** 🏗️ **BUILT the gated V2 shell — Company Command Centre is now a clickable real screen (Layer 1).** New route `apps/portal/src/app/(dashboard)/dashboard/v2/company/page.tsx` — a real Next.js client page (not HTML mock) with 4 in-page tabs: **Command Centre** (company KPIs · per-rep leaderboard · funnel snapshot · pending budget requests), **Seats** (per-rep cards + add-seat + credit bars), **Usage & Budget** (company budget bar + approve/deny request queue), **Performance** (full funnel + per-rep table + company rollup). Brand purple #7C3AED, matches existing portal card style, lucide icons. **GATED + SAFE:** reachable only by URL `/dashboard/v2/company` (not linked from live nav → prod untouched), top banner reads "V2 PREVIEW · sample data" so it's never confused with live. Typechecks clean. Real per-rep data still waits on the staging DB re-architecture (block ②). Founder wakes to a clickable screen to refine. Next slices: Sequence Builder (#89), Train-FIGSY (§18), then wire real data on staging.
- **8 Jun (late):** 🖼️ **LENA avatar added (founder uploaded via GitHub).** Warm Pixar-3D portrait — green blazer, holding a tablet showing a "CUSTOMER SUCCESS · Driving value. Building relationships" dashboard (Health 98 · Adoption · Engagement · Milestones: Onboarded/Training/Goals/Value). On-brand for the CS agent. Renamed `Lena.png` → convention: `apps/website/lena.png` + `apps/portal/public/agents/lena.png`. **All 7 agents now have avatars** (figsy·denise·milla·vida·casey·tony·lena).
- **8 Jun (late):** 🖼️ **TONY avatar added (founder uploaded via GitHub).** Warm Pixar-3D portrait of the founder's father — the agent's face. Founder committed it as `DAD.png` at app roots; **renamed to convention** → `apps/website/tony.png` + `apps/portal/public/agents/tony.png` (matches casey/denise/figsy/milla/vida). Now every named/back agent has an avatar slot. *(Minor TODO later: image is ~2.5MB — optimise for web; a transparent `tony-cut.png` variant like `denise-cut.png` would help for overlays. Not urgent.)*
- **8 Jun (late):** 🧪 **🔒 LOCKED the V2 BUILD-ISOLATION approach (founder confirmed: build V2 separately, never break prod, test, then push).** Two honest layers by risk: **Layer 1 — V2 UI screens build NOW on the gated `/dashboard/v2` route** (already scaffolded: `dashboard/v2/layout.tsx` + 17KB `page.tsx` + `SidebarV2.tsx`/`SidebarV2Preview.tsx`). Presentational dashboards (Command Centre · Seats · Usage/Budget · Performance funnel · sequence builder) ship but stay **feature-flag-hidden** → live dashboard untouched → founder gets a clickable URL **this week** to see+refine. **This resolves the old "delete-vs-build /dashboard/v2" decision → BUILD on it.** **Layer 2 — #88 per-rep needs TRUE separate staging** (destructive workspace→member DB migrations can't touch the live client): separate **Railway service + Supabase project** on a `staging` branch, own DB + own URL (e.g. staging.app.get-kind.com); migrate there first, merge to prod only when smoke-passed = roadmap block ②. **Split of work:** me = build gated V2 screens + create `staging` branch + prep configs/migrations + feature-flag; founder = create staging Supabase project + Railway service pointed at `staging` + hand over keys (~40 min guided, can't be done from here). **Sequencing:** staging setup is Wk0 and INDEPENDENT of the 9am prod smoke gate → runs in PARALLEL, doesn't slow the gate.
- **8 Jun (late):** 👔 **🔒 RENAMED the operations agent OTTO → TONY, after the founder's father.** #56 (was OTTO) = **TONY — The Operations agent**: closes the operations loop behind the revenue agents (pipeline hygiene, handoffs, CRM cleanliness, follow-through, back-office). Beautiful family symmetry now locked: **DENISE** = founder's *mother* (the closer, warm relationship-seller) · **TONY** = founder's *father* (the steady operator who makes sure everything gets done). Renamed across master (#56 rows, roadmap ⑥, decisions, Ch.5). Still Month 3, builds after LENA. **🔒 LENA (#55) FUNCTION LOCKED = Customer Success** — a "back agent" like Casey (non-family, support-tier, not a personally-named family agent). Owns post-sale: retention · renewals · upsell/expansion · churn prevention. Completes the full lifecycle: FIGSY books → DENISE closes → **LENA retains & grows** → TONY keeps ops clean. (Founder noted he's out of direct family names — fine, only DENISE/TONY carry family meaning; the rest are just good names.)
- **8 Jun (late):** 📞 **🔒 DECIDED — DENISE owns VOICE (Vapi) + WhatsApp closing; she's "the goer". Corrected my error: we DO have a calling agent.** I'd wrongly said we have no calling capability — we do, it's just not switched on. **Built but inactive:** Vapi voice (`lib/vapi.ts` + `routes/voice.ts` + `figsy_calls` table — create/webhook/transcript/outcomes) and WhatsApp send (`lib/whatsapp.ts` text+template via Meta Cloud API + Vida inbound). Both gated on unset env (`VAPI_API_KEY`, `WHATSAPP_TOKEN`). The Vapi voice was labelled **FIGSY's** (post-email follow-up caller); **Denise is text-only today** (`draftFollowUp`/`draftProposal`). **Founder's call: Denise = the closer = she owns the phone.** Clean split locked → **FIGSY** = SDR (finds/qualifies/books, email+LinkedIn+WhatsApp outreach); **DENISE** = closer (Vapi calls + WhatsApp to confirm/handle objections/close). Consequence: **we do NOT need a separate "Alex" agent** — our family already maps cleaner than Alta's: Katie→FIGSY · Alex(calling)→**DENISE** · Luna→Milla · lead-magnet→Vida. Action: re-attribute Vapi voice FIGSY→Denise inside the #54 Denise deep build (Month 3); WhatsApp = shared channel. Updated #48 rows accordingly.
- **8 Jun (late):** 🕵️ **FULL ALTA DECK + DEMO TRANSCRIPT mined (29-pg deck + 26-min call).** Biggest competitive intel drop yet. **① The augment-vs-replace VERDICT got hard real-world proof (#8):** Alta's *deck* claims 4X meetings / 15% win / 150% pipeline, but the rep's *live* numbers told the truth — UK LinkedIn 6,538→87 replies(~2.2%)→**12 meetings**; "Deal" event 3,387→50 replies(~1.5%); Netherlands 29 replies→7 meetings; 158 mtgs/90d total. The #1 "AI Revenue Workforce" on full autopilot books **~0.18% of contacted** on cold LinkedIn. And they run themselves as *"12 AEs, NO BDRs/SDRs, the tool does everything"* — the literal REPLACE model we rejected. Cold autonomous volume converts thin → per-rep human-augmented relationship is where meetings come from. **② Architecture map:** Katie (AI SDR)=our FIGSY ✅ · Alex (AI Calling, "flows not campaigns / lists not prospects", inbound+outbound calls, demos, routing, renewal reminders)=GAP we don't have, possible future agent · Luna (AI RevOps brain, Salesforce sync + ICP recs + strategy→execution→measure→learn loop)=our owner Command Centre/Milla. **③ New steals (beyond the 7 screenshots):** (a) ENRICHMENT WATERFALL — 50+ sources fallback cascade (Apollo·ZoomInfo·PeopleDataLabs·FullEnrich·EXA); we're Apollo-only → data-depth gap to note. (b) TRAIN-AGENT fields sharpen §18: pitch·pain points·value props·**proof points**·signals·do-not-contact(CRM+unsub)·**context**(one-pagers/white-papers/use-cases)·global messaging rules·**per-rep example emails** for tone. (c) COPILOT vs AUTOPILOT + Reply Assistant — copilot="waiting for review" approve/reject each step → maps to our #88 usage approve/deny. (d) ENTERPRISE SECURITY checklist (their upmarket moat / our future roadmap): SOC2 Type 2·ISO 27001·GDPR·SSO Okta/Azure/SAML·single-tenant warehouse. (e) Positioning line: "#1 Data-Driven AI Revenue Workforce", ex-monday.com team (BigBrain), "first Sales-focused LLM". Smartsheet refs in the transcript = founder's cover story on the call, ignored. **TODO (not tonight):** fold proof-points + context-upload + example-emails into §18 visual; note 50-source waterfall + SOC2 as upmarket roadmap items; decide if an Alex-style calling agent joins the family.
- **8 Jun (late):** 🎯 **Founder set the target: V2 LIVE BY MONTH END (30 Jun) + chose scope = "Per-rep + company OS."** Completed the V2 mockup deck — added **§17 Performance funnel** (Contacted→Opened→Replied→Positive→Booked + per-rep leaderboard, rolls each rep up to the company #88) and **§18 Train FIGSY** (Alta's "Train Katie" → per-rep persona/knowledge/guardrails/approvals/test tabs). V2 visual deck now end-to-end complete (§1–18). **Locked the dated 22-day critical path in EXECUTION ROADMAP → "V2 MONTH-END PLAN":** Wk0 verify+staging · Wk1 per-rep foundation · Wk2 company OS (seats/budget/command-centre/funnel) · Wk3 harden+ship 30 Jun. Sequence builder/multi-channel/Train-FIGSY/Integrations slip to July (layer on the per-rep base). **Gate before any build = the 9am smoke tests (Step 5 + T8 first); we don't build V2 on an unverified base.**
- **8 Jun (late):** 🎨 **Added §15 Integrations Hub (#84) + §16 Smart Inbox to V2 preview, + flow chart section** — from Alta Connectors + Inbox frames. Integrations adapted to OUR stack (HubSpot/Pipedrive · Google/Outlook/Zoho calendar per-rep · WhatsApp/LinkedIn · Apollo · Stripe — no ERP/ticketing sprawl). Smart Inbox = channel filters + rich auto-tags + conversation + 'Help me reply'. Noted: I can't read video; founder to paste Fathom transcript for full demo mining.
- **8 Jun (late):** 🔭 **Alta UI/UX steals logged + #89 visuals upgraded.** Founder fed 7 Alta demo screens — captured all as steals (Touch Points tree+action-library, template gallery, 'Train [agent]' training tabs, Performance dashboard + Prospect-Status funnel, Unibox rich reply-tags + 'Help me reply', Campaigns saved-views + Reps column + Suggest Campaigns), each mapped to V2-3/4/12 · #88 · #89 · Unibox. Upgraded the #89 sequence-builder visuals (CLIENT_FLOW + V2 preview) to the Alta tree + multi-channel library + template gallery model. Steal layouts/taxonomies, keep augment positioning.
- **8 Jun:** 🚀 **DEPLOYED TO PRODUCTION (a day early).** Founder ran migrations 010/011/012/013 + the Demmy referral SQL · confirmed env (cold-FROM/reply/warmup-start present, admin key clean, **deleted `FIGSY_COLD_DAILY_CAP=10`** so the warmup auto-ramps 10→50) · said "go". Merged `claude/kind-carson-MYhSl` → `main` via FF push (`b35351f..f0eb02b`; local main was unrelated-history, so pushed the ref directly). Railway auto-deploying. **All sprint code now 🧪 deployed-verifying** (not ✅ until smoke). Next: Step 4 post-deploy smoke → Step 5 first FIGSY campaign (warmup starts) → T1–T10.
- **8 Jun:** 🤝 **First partner referral-link bug found + fixed.** First live partner (Demmy Oshodi / MaceyLuxe, Nigeria, white-label 30%, active+signed) showed **empty referral link** — diagnosed: the DB `referral_code` not-null default didn't fire in prod (schema drift), so the partner couldn't refer anyone. Fixed: approve handler now **guarantees a referral code** (generates one if missing) rather than trusting the DB default. Immediate fix for Demmy = set their `referral_code` via Supabase, or re-approve after deploy. Also: added per-rep company setup to `setup-dashboard-preview.html` + a linked **COMPANION DOCS index** (process rule: always link new artifacts).
- **8 Jun:** 🗺️ **Added the integrated EXECUTION ROADMAP** (one spine: launch → staging → #88 per-rep MVP → rest of V2 → intelligence → agent family). Audit found the pieces existed but were scattered + #88 overlapped V2-7/9/13 with no reconciliation. Fixed: roadmap sequences it all and explicitly **pulls V2-7/9/13 into the #88 sprint** (~Fri 26); other V2 = Month-2 layer on the per-rep foundation.
- **8 Jun:** 🏛️ **🔒 LOCKED Design Principle #8 — AUGMENT, never REPLACE (gut + deep research).** Ran multi-source research: "replace the sales org" is premature/dangerous (11x scandal + fake customers + 75–90% churn; AI outbound underperforms humans + craters deliverability; 50–70% AI-SDR churn; consensus = augment/human-led). Pricing: pure per-seat declining (21%→15%) → HYBRID (seat+usage) wins — which our model already is. Verdict + sources logged. Built two visuals: merged per-rep model into `CLIENT_FLOW.html` + rebuilt `portal-v2-preview.html` around it (V2 = expansion-critical).
- **8 Jun:** 🔭 **Competitive read — Alta (AI BDR) works OPPOSITE to our #88.** Researched (web): Alta = centralised "AI Revenue Workforce" — 3 shared agents for the whole co (Katie SDR · Alex caller/books-to-rep-calendar · Luna centralised RevOps dashboard); **platform license, NOT per-seat** ("reduce headcount" pitch). So Alta = "AI replaces the team"; **K.I.N.D #88 = "AI per human rep, per-seat" — a differentiated bet** (augment + scale revenue with the customer's headcount). **Validated 2 of our slices:** Luna ⇒ our owner command centre (slice 4); Alex's route-meeting-to-the-right-rep's-calendar ⇒ slice 2. **Decision surfaced:** per-seat (our instinct) vs platform-license (market norm) — recommend per-seat (augment-not-replace, Africa-first teams, revenue scales with seats). Logged to Ch.1 competitive.
- **8 Jun:** 🏢 **🔒 LOCKED #88 — PER-REP AUTONOMOUS MODEL is the product direction.** Owner with N reps → each rep gets own autonomous FIGSY (own calendar/booking/leads/identity) → then centralised owner rollup dashboard. Monetisation engine (N× revenue). Discovery confirmed everything is workspace-scoped today (no per-member ownership) → real re-architecture. **Agreed: ship Fri 19 on current shared model; per-rep MVP target end of next week (~Fri 26).** Scoped 4 slices (per-rep identity · per-rep ownership · seat billing · owner rollup); build on staging. Supersedes #86/#87 framing.
- **8 Jun:** 👥 **#86 multi-seat billing gap surfaced.** Founder: first client's 10 members should each pay ("multiple of 10"). Verified: `credit_balance` is **per-workspace (one shared wallet)** — no per-seat/per-member billing exists. Usage still scales (10 active members ≈ 10× credit burn ≈ 10× spend) but it's a shared pot, not guaranteed per-seat recurring. Logged as open commercial decision (#86): per-seat vs usage-only vs hybrid — resolve before quoting the client; NOT a deploy blocker (client starts on shared workspace).
- **8 Jun:** 🔥 **First client + first partner (Nigeria) same day → day-and-night push to Fri 19.** Discovery: team-of-10 (`client_members` + `/team/invite`/accept) and partner onboarding (`routes/partners.ts`: apply→approve→auto-sandbox→`/dashboard/partner`→commissions) are **already built, just undeployed/untested**. Added smoke **T9 (team invites) + T10 (partner)**. Reframe: the bottleneck is purely the DEPLOY, not features — that's the night's #1 move. Updated bookmark to "kick off the deploy tonight."
- **8 Jun:** 🔒 **LOCKED Design Principle #7 — deliverability is K.I.N.D's job, NEVER the client's.** Clients never warm a domain / touch DNS / see "spam filters" — it's invisible by design (founder felt the warmup confusion firsthand; SMB clients would churn on it). Today = Model A (all clients ride K.I.N.D's shared `gettingkind.com`, warm nothing). At scale = Model B (K.I.N.D auto-provisions + warms a dedicated per-client domain — better deliverability + their brand + isolated reputation = a moat). Per-client domain logic NOT built yet; logged as the deliverability architecture path. Added as Ch.1 Design Principle #7.
- **8 Jun:** 📭 **Warmup decision = Option B (passive).** Founder (busy + stealth from employer — can't use personal network for seed inboxes, and `gettingkind.com` is API-only/no mailbox) chose **no manual warmup**. FIGSY's capped auto-ramp (10→50/day) + warm Resend shared IPs + perfect SPF/DKIM/DMARC warm the domain organically through real low-volume sends post-launch. Content is FIGSY-generated (personalised 3-email sequences from lead data + outreach angle), founder approves via the gated approval queue before send. Watch bounce/spam post-launch; add active warmup only if needed. (The earlier "daily Broadcast to friendly inboxes" plan is dropped.)
- **8 Jun:** 📋 **Deploy + smoke runbooks (de-risking the verification day).** New `docs/DEPLOY-CHECKLIST.md` — exact Tue-9 order (migrations 010/012/013 before merge · env vars · merge · 5-min post-deploy smoke · full verify · rollback plan). Updated `docs/SMOKE_TEST.md` — fixed cold-FROM→`gettingkind.com`, added **TEST 8 Deliverability (D1–D5)** so the never-tested deliverability path gets verified end-to-end (SPF/DKIM align · List-Unsubscribe one-click · plain-text part · tracking guard · P-a signer · inbox placement). When you're free, the work waiting is *verification*, not unproven code.
- **8 Jun:** 🧪 **First automated test suite (vitest).** Recommended attacking verification debt over building more unverified UI. Set up vitest + wrote **16 passing tests** for the security-critical pure logic (unsubscribe token round-trip/tamper, htmlToText, D3 tracking guard, suppression matcher incl. env additions, warmup ramp schedule — extracted `warmupRampCap` to a pure clock-injectable fn). vitest = devDep (no prod bloat); tests excluded from build; full typecheck clean. Turns those pieces from 🔨→🧪 unit-verified. Next recommended: smoke-test runbook + deploy checklist (held the visual UI work until a verified baseline).
- **8 Jun:** 🩹 **Honesty pass on status (founder caught it).** `nothing was verified` yet many rows read `✅ DONE/verified`. Added a STATUS KEY (`🔨` BUILT = code-done-not-live vs `✅` = verified live) + the rule "nothing is ✅ until run in a real env". Demoted all today's runtime code (D1–D5, cap, P-a, admin fixes) from ✅→🔨 across timeline, Ch.3 table, burndown, deliverability + admin sections. Added "BUILT THIS SPRINT" at-a-glance scan. Also shipped **#3 cap blind-spot fix** (migration 013 + day-1 data-floor logging).
- **8 Jun:** 🔍 **Self-review + honest status added** (see "HONEST STATUS" block above). Re-ran full API typecheck (clean) + tree clean. Surfaced 3 real issues I'd glossed: (a) **no automated tests** — all work is typecheck-only, unverified in a real env; (b) **warmup cap blind spot** — day-1 batch inserts NULL into NOT-NULL figsy_sent_emails cols → fail → uncounted; (c) **P-a/CAL-min inert** without portal UI; plus the signer_name pre-migration landmine + admin RLS bypass still open. Honest launch read: code's fine, verification/deploy choreography is the risk; Mon 22 is the real fallback.
- **8 Jun:** 🤖 **Autonomous batch 2 (cracking on).** (1) **Admin hardening mediums:** zod validation + magnitude cap (±500) + audit-note (action/time/IP) on credit grants; zod + future-date checks on demo create/extend. (2) **P-a — configurable email signer DONE (backend):** threaded `senderName` through all 3 FIGSY generators so it signs as the client's set name instead of inventing one; guarded reads = safe pre-migration; added **migration 012** (`clients.signer_name` + `booking_url`). (3) Confirmed **CAL-min booking_url** is already fully wired in FIGSY — only the portal settings field remains. **🧍 Tue 9 deploy:** run migration 012 (alongside 010). Remaining autonomous (needs visual review / migration): portal settings fields for signer_name + booking_url, cosmetics C1–C6, Vida bubble, admin service-role refactor. API typecheck clean throughout.
- **8 Jun:** 🔐🤖 **Admin audit + autonomous quick-wins (cracking on).** Hard-checked admin portal → fixed 3 🔴 critical issues (browser-exposed `NEXT_PUBLIC_ADMIN_KEY`, hardcoded demo backdoor, non-timing-safe key compare); logged remaining 🟠/🟢 in new "Admin Portal Hardening" section (founder owes one Railway env check). Also: stripped stale BUILD MARKER → dynamic commit-SHA (P-b), relabelled "Pipeline Value"→"Est. pipeline value" (C7). Confirmed deploy-pipeline task **already done** (daily-audit.yml no longer push-triggered — master item stale). Confirmed onboarding video content **is captured** (#29 + #21/#23). API typecheck clean, pushed.
- **8 Jun:** 🗺️ **Implementation maps added.** V2 build-map (staging prereq, 5 phases A–E, effort sizes, deps, 4 open decisions) inserted into the V2 section (Ch.3). New **Chapter 5 — Implementation Maps** added with the same how/what-it-takes format for all other future workstreams: §5.1 Intelligence Layer · §5.2 Steals · §5.3 Agent Family (Denise deep) · §5.4 Pricing/Growth · §5.5 Platform/Data moat · §5.6 Year-2 enterprise. Each = when/gate · items · effort · founder inputs · deps · decisions. TOC updated.
- **8 Jun:** 🔐 **TIER-0 rotation de-prioritised → Week 2.** Scanned repo + full git history (incl. 410 deleted chat logs): no `.env` committed, no real secret patterns — keys never exposed via repo. Flagged: master claimed "some pasted in chat" (unverifiable outside repo); recommended rotating the 2 crown-jewels (`STRIPE_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) sooner — awaiting founder call. Today's founder list otherwise CLEAR (env vars set, warmup ready). Next pivot: V2 upgrade planning.
- **8 Jun:** 📈 **Cap now auto-ramps by date.** Added `FIGSY_WARMUP_START` (YYYY-MM-DD) to `lib/figsy.ts` — cold cap auto-steps ≤10 (days 1–3) → 20 (day 4) → 30 → 40 → 50 (day 9+), no daily Railway edits. `FIGSY_COLD_DAILY_CAP` still works as a manual override. Founder sets `FIGSY_WARMUP_START=2026-06-09`. Schedule runtime-verified. Typecheck clean.
- **8 Jun:** 🚦 **Warmup cap wired + cold-domain = API-only.** Added env-controlled `FIGSY_COLD_DAILY_CAP` to `lib/figsy.ts` — caps cold sends per UTC day at both chokepoints (`sendSequenceEmail` + day-1 batch); over-cap sends are deferred (enrollment stays due, retries next cron), never dropped. Unset/0 = no cap (unchanged default). Founder chose **API-only** for `gettingkind.com` (no Google Workspace/Zoho mailbox — replies arrive in portal Unibox via inbound webhook). Typecheck clean.
- **8 Jun:** 📨 **Cold-domain deliverability infra LIVE.** Bought `gettingkind.com` (Cloudflare DNS). Added to Resend (EU-west): DKIM + SPF (send subdomain MX/TXT) + DMARC (`p=none`) all **Verified**; inbound MX (`@`) added (webhook wiring later). Planned env: `FIGSY_COLD_FROM`=`FIGSY <hello@gettingkind.com>`, `FIGSY_COLD_REPLY_TO`=`hello@gettingkind.com`. **Warmup clock started** (11-day ramp 5–10→30–50/day to Fri 19). Decision pending: API-only (recommended, replies → portal Unibox) vs real mailbox. Next: wiring an env-controlled daily cold-send cap to enforce the ramp.
- **8 Jun:** 🛡️ **Employer-reference scrub bucket 1 (safety guard) DONE.** Founder: "whatever it takes to protect." Kept `suppression.ts` floor hard-coded + unconditional (never env-dependent), base64-encoded the 4 domains + genericised comments → no plaintext employer name in source, protection verified byte-for-byte identical. Buckets 2 (active docs) + 3 (chat archive) still open — suggestion sent.
- **8 Jun:** 🌍🛡️ **Two strategy decisions logged.** (1) **Africa-first, US deferred** — launch Africa-only, US/global gated on steady African income (de-risks competitor overlap + employer exposure); flipped launch-scope lines + targets + deferred all "SA+US"/"US Month 2" items. (2) **Employer-reference scrub** — new Chapter 4 workstream to remove employer references without weakening the do-not-contact guard (3 buckets, awaiting founder sign-off on the safety-code + archive calls). No code/safety/legal files touched yet.
- **8 Jun:** 🚀 **Shipped Deliverability D1–D5** — new `apps/api/src/lib/deliverability.ts` (cold-FROM, signed unsubscribe tokens, tracking-pixel guard, htmlToText); wired into both cold-send sites in `lib/figsy.ts`; added public `GET/POST /figsy/unsubscribe/:token` in `routes/figsy.ts`; `email.ts` `sendTx()` adds plain-text to all transactional mail; manual Unibox reply now sends from cold domain. App typechecks clean (had to `npm install` + build `@kind/db`/`@kind/shared`; fixed 2 own TS7030 errors). Committed `96456ac`, pushed. **Founder owes env vars (see NEXT ACTIONS).** Consolidated master + code onto `claude/kind-carson-MYhSl` (canonical).
- **7 Jun:** ClickUp "More" grid review → logged **#83** (lead-capture Forms) + **#84** (Integrations Hub), folded Goals into V2-12, bumped V2-3 to High, added Ch.1 Read #6 **DESIGN PRINCIPLE: portal stays narrow (≤5 revenue tiles), reject the generalist app-grid.** Total 99→101.
- **7 Jun:** Logged Ch.1 WATCH note on **monday Vibe** (AI vibe-coding app builder, verified via web search) → reinforces specialisation lane; prompt-to-build UX validates V2-3 conversational setup (bump priority).
- **7 Jun:** Added Ch.1 strategic takeaway: Monday converging on our look + tactics → defend depth + velocity (specialisation + speed), not the design lane.
- **7 Jun:** Logged **#81** (milestone outcome share-to-LinkedIn) + **#82** (Certified Partner badge) — Monday growth-loop steals. Added Ch.1 WATCH note: Monday now uses Pixar-3D agent characters (warmth window closing). Total 97→99.
- **7 Jun:** Logged new build **#80** (speed-to-lead: Vida → instant FIGSY/Denise handoff, Atlas steal) in Ch.3 Phase 2.
- **7 Jun:** Consolidated all roadmap docs into this single `KIND-MASTER.md`. Marked `EVERYTHING.md` superseded. Sprint begins tomorrow (Mon 8).

---

## 📑 TABLE OF CONTENTS

- **CHAPTER 1 — STRATEGY & COMPETITIVE** (landscape, 5 reads, moat, funding, what to steal)
- **CHAPTER 2 — DAILY ACTION PLAN** (Mon 8 → Fri 19, day-by-day, owner-by-owner)
- **CHAPTER 3 — ALL 96 BUILDS** (every item #1–96, timeline, owner, status, gates)
- **CHAPTER 4 — OPERATIONS, LEGAL, INFRA & BUILT INVENTORY** (4 legal rings, staging, recurring ops, blocked-on-creds, full inventory, financials)
- **CHAPTER 5 — IMPLEMENTATION MAPS** (how/what-it-takes for every future workstream: Intelligence, Steals, Agent Family, Pricing/Growth, Platform/Data, Year-2 — V2's map lives in Ch.3)

---


# ═══════════════════════════════════════════════════════════════
# CHAPTER 1 — STRATEGY & COMPETITIVE
# ═══════════════════════════════════════════════════════════════


> **Source of truth for competitive positioning, future builds, and strategic priorities.**
> Synthesises EVERYTHING.md, SESSION-HANDOFF-7JUN.md, and 5 Jun competitive research.
> Supersedes scattered planning documents. All items, all detail, all priorities.

---

## 🌍 THE COMPETITIVE LANDSCAPE (What the World Shipped in May–Jun 2026)

### THE BIG PLAYERS — What They Shipped

| Company | What | Strategic Signal | K.I.N.D Response |
|---------|------|-----------------|------------------|
| **Glean** ($7.2B) | Enterprise Graph (memory + connectors + personal/org graphs + governance). "Enterprise AI coworker" — proactively manages tasks, runs multiple workstreams, personalises per employee. Agent Development Lifecycle (ADLC) framework. Full MCP adoption. | **Context always wins.** The agent with the most context beats on quality every time. | We *can't* compete on enterprise context (not 7.2B ARR). But we own outcome data (who replied/converted by angle/vertical). That's a *different* moat. Build it at 10+ clients (L2 learning). |
| **Monday.com** | Full relaunch as "AI Work Platform." Native agents any team member can configure — draft campaigns, qualify leads, close support, onboard, process POs, 24/7. Claude + OpenAI + MS365 Copilot via single AI Platform Gateway. | "Agents sit inside a single structured platform with context across the entire business." General-purpose, context-native. | Monday is platform-first (agents inside the workspace). We're product-first (agents *are* the product). Different bet. Hold specialisation: named family, POPIA, $20 entry, outcome focus. |
| **ClickUp** | Acquired Codegen (Cursor competitor). "Super Agents" — autonomous project completion, 500+ work skills, human-level memory that learns from every interaction. 3,000 internal AI agents at 3:1 AI:human ratio. **Laid off 22% of staff.** Million-dollar bands for 100x humans who manage AI systems. | Most aggressive "agents replace headcount" bet. General-purpose. | We're not trying to replace ClickUp's users. We're replacing the SDR/AE for *one specific job* (outbound + close). Narrow moat = defensible. |
| **Notion** | Custom Agents (team-wide bots on schedules + triggers). MCP-native: Linear, HubSpot, Figma, Slack, Attio CRM. "Notion Workers" hosted runtime — agents run sandboxed custom code, no server needed. | Workspace = the agent runtime. MCP is the wiring. | **CRITICAL:** MCP is now distribution, not just product. Pulled forward to Month 2. K.I.N.D exposes one MCP endpoint: "Start a FIGSY campaign." Notion/Linear/Slack agents call it — no K.I.N.D UI needed. Free distribution. |
| **Linear** | Linear Agent: triages new work, assesses it, routes to the right team, Code Intelligence (controlled codebase access). The PM tool becomes the intelligence layer that directs work. | Product intelligence, not just tracking. | Linear is inside Linear. We're a standalone revenue team. Different positioning. No conflict. |
| **Salesforce** | AgentExchange — agent marketplace. "$6 trillion digital labour market." $2/AI conversation (vs $30–50 human agent cost). Agentforce on Slack up 300% since Jan 2026. | Outcome pricing at enterprise scale. Pricing by result, not seat. | Outcome pricing is validated (item #60). Build when we have margin data (Month 3+). Salesforce market ≠ our market ($2/conversation is enterprise math; we're SMB). |
| **Intercom Fin** | $0.99 per fully-resolved support ticket. Zero cost if unresolved. Pure outcome model. Working. | **The clearest pricing proof point in the market — outcome pricing is proven and live.** | This is the moat signal. Outcome pricing de-risks the buyer ("pay only for results"). We're already on the right curve (credit wallets, per-action). Outcome is the next step once we have 5+ clients + margin data. |

### MACRO NUMBERS (5 Jun 2026)
- **40%** of enterprise apps will have task-specific agents by end of 2026 (was <5% in 2025)
- **50%+** of B2B sales teams will be smaller than in 2025 (agents replacing SDRs/AEs)
- **AI handling 40–60% of initial customer interactions**
- **Outcome-based pricing:** <10% adoption today → **dominant model by 2027**
- **Credit wallets + usage-based:** 43% of SaaS on hybrid models → 61% projected by year end

### INDIRECT COMPETITORS SHIPPING NOW

#### **Atlas (youratlas.com)** — Done-for-You AI Revenue Engine
- **What:** $5,000+ setup, 7–14-day white-glove build, 90-day perf guarantee. Agency model.
- **Two agents:** (1) Demand Creation (CTV ads), (2) Demand Response (voice AI + iMessage at 92% open rate)
- **Team:** ~74 employees. Pre-seed (BDev Ventures). Founder: Omer Jamal (3rd-time, ex-Scotiabank).
- **Distribution:** Dan Martell (SaaS Academy). His endorsement = their acquisition engine.
- **Claimed:** 10,000+ businesses. Law firm: $28K in 90 days. Plumbing: 28% no-shows → 6% in 60 days.
- **Where they beat us:** Voice AI, iMessage novelty, CTV ads, 90-day guarantee, DFY removes friction.
- **Where we beat them:** $29/mo vs $5,000+. Self-serve. Multi-agent + shared memory. DENISE. Full revenue lifecycle. Live in minutes not 14 days.
- **Strategic read:** Different buyer (appointment-driven services). Not direct competition. BUT: their messaging (ROI calculator, 90-day guarantee, coaching bundled) is worth stealing. Items #61a–61g capture this.
- **What we're stealing:** Atlas's performance guarantee framing (#61a), 90-day language (#61g), influencer distribution channel (find our Dan-Martell equivalent for SA/US SMBs — #61e).

#### **Revio (getrevio.com)** — AI Social Selling CRM
- **What:** Instagram/Facebook DM automation for creators/coaches. Scores leads, auto-sends DMs, AI co-pilot suggests replies from closed-won transcripts. Bundled human coaching (group calls, 1:1 setup).
- **Pricing:** ~$500/mo (no public pricing). High-touch sales.
- **ICP:** Solopreneurs + small teams (1–10) in creator economy with existing followings.
- **Claimed:** 50% conversion increase. 30,065 IG leads in 1 month (case study). $60K/month in 7 months.
- **Distribution:** Dan Martell (same as Atlas).
- **Where they beat us:** Depth of social workflow. Coaching layer. Tight niche. Battle-tested replies from deals.
- **Where we beat them:** Autonomous agents (vs co-pilot). Cold outbound without audience. Full lifecycle. $29 vs $500. SA market. Broader ICP.
- **Watch signal:** LinkedIn outreach on roadmap. If they ship B2B cold outreach, they enter FIGSY's territory.
- **Strategic read:** Different buyer (creator economy vs SMB). NOT direct threat yet. BUT: their coaching model (bundled onboarding, 1:1 setup) + case study specificity are worth stealing. Items #62a–62e capture this.
- **What we're stealing:** Coaching layer in onboarding (Revenue Playbook Session bundled, #62b). Case study specificity (measured outcomes, not vanity metrics — #62c–62e). Revio's "trained on closed-won deals" credibility hook (#62a).

---

## 🎯 FIVE STRATEGIC READS FOR K.I.N.D (5 Jun 2026)

### **1. We launched on the right pricing curve.**
Credit wallets, usage-based, per-action — **every major player is migrating toward this.** We launched there on day 1. Outcome pricing (#60) is the right next step. It stays gated until we have margin data (≥28% gross), but the direction is confirmed by Salesforce, Intercom, and Stripe themselves.

**Action:** Don't second-guess pricing. Stay on the curve.

### **2. The warmth window is narrow — use it now.**
Monday/Notion/ClickUp all now talk about "agents as team members." We've had named personalities and a family narrative since Day 1 (Pixar 3D, family names). That emotional layer is *stronger* than corporate "agent platform" language — **but the window where we look differentiated (not just different) is shrinking** as everyone humanises their UX.

**Action:** Differentiate on warmth *now*. Record real demo (Week 1 / item #21). Use the Pixar family in every asset. When everyone has agents, personality is the moat.

> 🔴 **WATCH (7 Jun) — Monday is now in our exact design lane.** Monday's in-app
> "Certified AI Agent Creator" badge uses **warm Pixar-3D human characters** (stylish,
> diverse, "your team") on a premium dark card — the same aesthetic as FIGSY/Milla/Vida/Denise.
> A general-purpose platform has adopted our differentiator. This **accelerates** the action above:
> our warmth/family narrative looks differentiated *today* but won't for long. Ship the real
> demo + family storytelling fast. Also worth stealing their **share-to-LinkedIn growth loop**
> (logged #81 client-outcome version, #82 partner-cert version) — but anchored to OUTCOMES, not
> a vanity "creator" badge (wrong audience for our SMB buyer).
>
> **🎯 Strategic takeaway (the synthesis of both Monday screenshots):** Monday is converging
> on our aesthetic (Pixar agents) *and* our growth tactics (share-to-LinkedIn loop). **Our edge
> is no longer the look — it's (1) specialisation (a focused revenue team, not a general-purpose
> platform they can't out-niche) and (2) speed (ship the warmth story while it still reads as
> ours).** Don't defend the design lane; defend the depth + velocity. The share-loops are worth
> grabbing as free distribution, but the real moat move is shipping specialisation faster than
> the generalists can copy warmth.
>
> 🟡 **WATCH (7 Jun) — monday Vibe (verified via web search).** Monday shipped **"Vibe"**: AI
> *vibe-coding* — describe an app in plain language → it generates a working custom app
> (dashboards, trackers, forms, portals, calculators) that runs on monday's infra, connects to
> live boards, and can call AI actions. Pricing: **$10 / published app / month** (draft free,
> pay on publish). **Strategic read:** this is the general-purpose platform play at its limit —
> *build any tool yourself.* It **reinforces our specialisation lane (Read #4):** Vibe hands you
> an empty shell you must design + source data for + make compliant; K.I.N.D hands you FIGSY who
> *already* does outbound (Apollo sourcing + enrichment + scoring + POPIA/GDPR + warmed domain).
> Someone can vibe a basic lead tracker; they cannot vibe a trained SDR with our data +
> deliverability + compliance moat. **Transferable idea:** Vibe's prompt-to-build UX validates
> **V2-3 (conversational agent setup with Casey)** — "describe your ICP, the agent configures
> itself." Bump V2-3's priority. Source: monday.com/w/vibe.

### **3. MCP is being pulled forward — it's distribution, not just product.**
Glean, Notion, Linear, Salesforce are all wiring MCP natively. Item #59 (MCP server) was Month 3. **Given this market signal, it moves to Month 2.** Being MCP-compatible means other tools' agents can call K.I.N.D without a K.I.N.D sales team. That is **free distribution.**

**Action:** Month 2, build one MCP endpoint: "Start a FIGSY campaign." A Notion/Linear bot can trigger a K.I.N.D outreach campaign by calling one tool. No UI, no sales call needed.

### **4. Our defensible lane is specialisation, not breadth.**
Monday and ClickUp are building general-purpose platforms. We're building a specialised revenue team: African market data, POPIA compliance, $20 entry point, named family agents. **They cannot replicate the data moat or compliance posture without years of presence.**

**Action:** Hold specialisation. Don't try to match Monday's breadth. Own the revenue-team lane so deeply that generalists can't catch up.

### **5. The risk is speed, not direction.**
K.I.N.D's product direction is correct — the market is validating it in real time. **The danger is the window where a small fast team can build what the big players haven't yet shipped into our market. That window is shrinking.** DENISE (#54) is the highest-value next build because she extends the existing FIGSY pipeline (no new front opened, max leverage).

**Action:** Build deep, not wide. One agent at a time, fully. DENISE first (Month 3).

### **6. DESIGN PRINCIPLE — the portal stays a narrow revenue surface (locked 7 Jun).**
ClickUp's "More" launcher is **10 tiles** (Spaces, Chat, Docs, Dashboards, Whiteboards, Forms,
Clips, Goals, Timesheets, Apps). Monday/ClickUp/Notion all sprawl into general-purpose tool
grids. **That breadth is the generalists' trap, not a target.** Six of ClickUp's ten tiles are
in our WILL NOT BUILD list or aren't our product. If K.I.N.D ever ships a "More" grid, it is
**≤5 tiles, all revenue: Agents · Leads · Campaigns · Inbox · Dashboards** (+ Integrations).
The narrowness **is** the product — a 10-tile grid would make us a worse ClickUp. Steal only the
revenue-relevant tiles (Forms → lead capture #83, Apps → Integrations Hub #84, Goals → folded
into dashboards V2-12); skip Docs/Whiteboards/Clips/Timesheets/Chat/Spaces.

**Action:** Reject the app-grid. Every new portal surface must answer "does this directly help
the client get a meeting/close?" If not, it doesn't belong in the portal.

### **7. DESIGN PRINCIPLE — deliverability is K.I.N.D's job, NEVER the client's (locked 8 Jun).**
Cold-email deliverability (sending domains, SPF/DKIM/DMARC, **warmup**, reputation, spam
avoidance) is hard and confusing — the founder hit the full confusion firsthand setting up
`gettingkind.com`. **Our SMB clients will be even more lost.** So this is invisible to them,
by design. **The client NEVER warms a domain, configures DNS, or thinks about spam filters.**
- **Client's job:** describe who to reach → approve emails → take meetings.
- **K.I.N.D's job (hidden under the hood):** sending domains, warmup, reputation, deliverability.
- **Today:** all clients send from K.I.N.D's shared cold domain (`gettingkind.com`, `FIGSY_COLD_FROM`)
  → **clients warm nothing** (Model A — simplest, ships now; shared reputation is the trade-off).
- **At scale (build later, not now):** K.I.N.D **provisions + auto-warms a dedicated domain per
  client** (Model B) → better deliverability + their own brand + isolated reputation. This is a
  **moat** — competitors dump warmup on the user; we never do. *(Not built — per-client domain
  logic doesn't exist yet. Logged as the deliverability architecture path.)*

**Action:** Any feature that would make a client touch warmup/DNS/deliverability is wrong by
default. If a client ever sees the word "warmup", we've failed. Make it invisible.

### **8. DESIGN PRINCIPLE — AUGMENT every rep, never REPLACE the team (locked 8 Jun, gut + data).**
K.I.N.D **enhances each salesperson's capability** and makes them more efficient. We do NOT
position as "fire your sales org." (Long run, a company may reach the same output with fewer
reps — but that's their outcome, never our pitch.) **Verdict backed by research (logged below):**
the flagship "replace the SDR" player (11x) imploded publicly (fake-customer claims, ZoomInfo
said it "performed significantly worse than our SDR employees," ~75–90% 3-month churn, "AI's
Theranos moment"); autonomous AI outbound underperforms humans (reply ~4.1% vs 5.2%, spam-flag
8% vs 3%, ~38-pt domain-reputation drop in 90 days) and AI-SDR tools churn 50–70%; market
consensus = **human-led, AI-powered (augment)**. No African company (or Smartsheet) is firing
its sales org. **Pricing corollary:** pure per-seat is *declining* (21%→15%) — go **HYBRID
(seat + usage)**, which K.I.N.D's seats + credit-allocation + request/approve model already is.

**Action:** Positioning line = *"We don't replace your sales team — we give every rep their own
AI, and you control the budget. You pay for the seats you use and the work they do."* Sell
augment + hybrid (seat + usage), never "replace" and never "flat per-seat." "Replace" not viable
until ~2027+ (deliverability/trust/regulation must mature) — watch, don't bet on it.

---

## 📅 MASTER TIMELINE — EVERY BUILD, DATED

Owner: 🧍 Founder · 🤖 Claude · 🤝 Both

### **PHASE 1: PRE-LAUNCH (Mon 8 → Fri 19 Jun)**

**Status legend:** ✅ done/verified · 🔄 in progress · ⬜ to do · 🔁 changed/superseded — *(updated 9 Jun)*

| Date | Item # | Status | What | Owner | Why |
|------|--------|--------|------|-------|-----|
| **Mon 8** | **D1–D5** | ✅ | **Deliverability fixes — DEPLOYED + VERIFIED (T8 passed 9 Jun: real cold email from `gettingkind.com` → inbox).** List-Unsubscribe + one-click unsubscribe · plain-text MIME · tracking-pixel guard · configurable cold-FROM · transactional plain-text. In `lib/deliverability.ts` + `lib/figsy.ts` + `routes/figsy.ts` + `email.ts`. | 🤖 | Mail→spam was the #1 launch risk. **Now proven dead.** |
| **Mon 8** | **Cold domain + warmup** | ✅ | Cold domain `gettingkind.com` bought · SPF/DKIM/DMARC verified green in Resend · **warmup LIVE** (`FIGSY_WARMUP_START=2026-06-09`, ramps 10→50/day, FIGSY auto-sends). | 🧍 | `get-kind.com` = transactional only; cold = separate domain. **Done + sending.** |
| **Mon 8** | **#1** | 🔄 | **TIER-0 credential rotation** (Stripe secret, Supabase service-role, DATABASE_URL, anon, Anthropic, Resend×2, HubSpot, Admin secret, Stripe webhook). Apollo ✅ done; repo scan clean; **2 crown-jewels still to rotate.** | 🧍 | Security. De-prioritised to Wk2; 2 keys sooner. |
| **Tue 9** | **#6** | ✅ | Migration `010_crm_dedup.sql` (CRM dedup fields live in `clients` + enforced in `autoEnrollLead`). | 🧍 | CRM deduping before real clients. |
| **Tue 9** | **#7** | ✅ | Denise Stripe $99/mo price → `STRIPE_PRICE_DENISE_MONTHLY` set on Railway. | 🧍 | Needed for T5 smoke test (billing). |
| **Tue 9** | **#7/8** | ✅ | DNS: `app`/`api`/`admin`.get-kind.com live (Railway) — all 4 services online. | 🧍 | Routing. (`status.` subdomain optional.) |
| **Tue 9** | **#2** | 🔁 | ~~Delete dormant Portal-V2~~ → **CHANGED:** we are **building** V2 on the gated `/dashboard/v2` route (Command Centre shell shipped). Superseded by the V2 month-end plan. | 🤖 | Decision reversed — V2 is the expansion engine, not dead weight. |
| **Tue 9** | **Deploy pipeline** | ✅ | "KIND System Audit" Action **fixed** — push-trigger already removed (no per-commit check / no deploy gating); now **report-only** (no red badge), stale checklist refreshed. Railway auto-deploys from `main` working. | 🤖 | CI/CD reliability. |
| **Tue 9** | **CAL-min** | ✅ | **Booking-link field LIVE in Settings** (Calendly/Cal.com) → saves `booking_url`. Backend + migration were already done. | 🤖 | T3/T4 smoke tests need this. |
| **Tue 9** | **P-a** | ✅ | **"Sign emails as" — DONE 9 Jun:** Settings field built + saves to `signer_name` + test-email honours it (stops AI-invented signers). | 🤖 | UX. Founder set `Jack from K.I.N.D`. |
| **Tue 9** | **P-b** | ✅ | Stripped stale `BUILD MARKER` (dynamic commit-sha marker now). | 🤖 | Debug cleanup. |
| **Tue 9** | **Smoke Test 1A** | ✅ | **T2 ✅** (ICP→leads, re-verified 9 Jun) · **T8 ✅** (deliverability/inbox) · **T1 ✅ PASSED 10 Jun** (fresh signup→onboard→dashboard) · **T3 ⬜** (pause→no-send). | 🧍 | Paid-path verification. |
| **Wed 10** | **🗺️ Audit cross-ref** | 🔄 | **Full-system audit fixed branch-only (`claude/kind-carson-MYhSl`):** client portal Y4·Y5·Y7·Y8·Y9·Y10·Y11·R4 · website R5 (illustrative labels + comparatives dropped) · API Y1·Y2·Y3 + **data-integrity pass** (counter-drift class killed; autopilot crons reconcile-then-decide) · ops runbooks (key-rotation·restore·D9·failover fix). **PR opens → merges to `main` on founder "go live".** | 🤖 | Pre-launch hardening. |
| **Wed 10** | **Founder quick-wins** | ⬜ | **ICO £40** · get a **free PDL key** (→🤖 wires 2nd lead-discovery source) · decide key-rotation scope (rec: 2) · **start onboarding videos #29**. | 🧍 | Launch admin. |
| **Wed 10** | **Smoke 1B (recorded)** | 🔄 | ✅ **T1 fresh signup PASSED.** Remaining recorded: **T3-13** pause→no-send · **T4** booking+KPI · **T5** billing · **T6** Vida widget · **T7** Milla cron leak. | 🧍 | Finish Smoke Test 1. |
| **Thu 11** | **📬 DELIVERABILITY EVIDENCE TEST** | ⬜ | The "is my mail REALLY landing in client inboxes?" verification (~1 hr, founder peace-of-mind): **① Google Postmaster Tools** — register `gettingkind.com` at postmaster.google.com (DNS TXT, 15 min) → Gmail's own domain/spam scorecard, accumulates as volume ramps. **② Seed-list test (the real answer)** — enroll 3–5 own inboxes across providers (personal Gmail · Workspace · Outlook · Yahoo) as leads in a test campaign → check each lands in **Primary** (not Promotions/Spam). **③ mail-tester.com → 10/10** (D9 pulled forward from Sun 14). **④ Set `TRACKING_URL=https://api.get-kind.com`** in Railway (open tracking is OFF — why the campaign feels silent) + **check Resend bounce rate <2–3%**. _Context: zero replies at day 2 of warmup is the statistically expected outcome — ~10–20 sends, steps 2/3 (day 4/9) haven't fired; judge replies only after ~day 9–11._ | 🧍 (🤖 supports fixes same-day) | Founder peace-of-mind + the D9 gate. |
| **Thu 11** | **Rotate 2 keys** | ⬜ | Stripe secret (api) + Supabase service-role (api **AND** admin) — `legal/key-rotation-runbook.md`. + daily smoke (recorded). | 🧍 | Security red. |
| **Thu 11** | **Multi-source** | 🔄 | ✅ PDL discovery fallback **wired** (dormant) · ✅ Apollo-ToS **researched** (no 50-client rule — reselling violates from client #1; fix is structural). **Founder:** email `partners@apollo.io` (reseller agreement) + drop a free `PDL_API_KEY` to activate. | 🤝 | Eggs-in-one-basket. |
| **Fri 12** | **C1–C7 + VIDA-11** | 🔄 | agent-card consistency · banner copy · Vida help bubble. + daily smoke (recorded). | 🤖 | Polish + self-serve support. |
| **Fri 12** | **D9 part 1** | ⬜ | Confirm `FIGSY_COLD_FROM` + SPF/DKIM/DMARC — `DELIVERABILITY-D9-CHECKLIST.md`. | 🧍 | Deliverability prep. |
| **Sat 13** | **Smoke Test 2** | ⬜ | Full recorded re-run T1–T7 green. | 🤝 | Verification. |
| **Sun 14** | **Legal #10–14** | ⬜ | ICO (if not done) · SR01 suppression · registered office + service address · WHOIS privacy · LinkedIn lockdown · Calendly verify. | 🧍 | Compliance + safety. |
| **Sun 14** | **D9 mail-tester** | ⬜ | mail-tester.com → verify **10/10** → fix gaps. *(Basic inbox passed 9 Jun; formal 10/10 owed.)* | 🤝 | Deliverability gate. |
| **Mon 15** | **Review PR + buffer** | ⬜ | Founder reviews the audit-fix PR ("Files changed") · slip absorption / re-runs. | 🤝 | Risk mitigation. |
| **Tue 16** | **Dress rehearsal** | ⬜ | Fresh (non-dogfood) signup → ICP → leads → campaign → reply, recorded · re-run mail-tester 10/10 · check warmup. | 🤝 | Live test. |
| **Wed 17** | **Final fixes** | ⬜ | Any remaining issues · prep launch campaigns (ramp strategy) · pre-flight the merge. | 🤝 | Spillover. |
| **Thu 18** | **Go/No-Go + MERGE** | ⬜ | Gates: D9 10/10 · Smoke Test 2 green · 2 keys rotated · legal #10–14 done · warmup ~50/day → **founder says "go live" + merges the audit-fix PR (GitHub UI).** | 🤝 | Release gate. |
| **Fri 19** | 🚀 **LAUNCH** | ⬜ | **Africa-only** (US deferred) — transactional live from `get-kind.com`; cold ramped from warmup domain · final recorded smoke pass · monitor. | 🚀 | **THE DAY.** |

---

## 🌐 DATA SOURCES — MULTI-SOURCE PLAN (the #1 strategic risk: "eggs in one basket")

> **Tracked here so it can't get lost.** This is a live workstream, not a someday item. Detail/roadmap also in `V2-TRACKER.md` (§ DATA-SOURCE STRATEGY) — but THIS is the authoritative status.

**THE REALITY (verified in code 10 Jun):** there are TWO different things, and only one has a backup today:
- **Lead DISCOVERY (finding net-new prospects)** = **🔴 Apollo ONLY.** Both the search (`lib/apollo.ts` → `searchPeopleWithFallback`) AND the email reveal (`bulkMatchEmails`) go to Apollo. **If Apollo cuts the key, lead-gen stops for EVERY client at once.** This is the basket.
- **Lead ENRICHMENT (filling missing fields on a lead already found)** = a waterfall **exists** in `lib/enrichment.ts` (Apollo→**PDL→Hunter→Clearbit**→Claude) — **but it's DORMANT** (no `PDL_API_KEY`/`HUNTER_API_KEY`/`CLEARBIT_API_KEY` set, so it does nothing today). And enrichment ≠ discovery — it can't *find* new people.

**So multi-source is NOT done.** The enrichment hedge is off, and discovery has zero backup.

**⚠️ THE APOLLO CAP — CORRECTED 10 Jun (ToS research, sourced):** the ~50/100-client thresholds we'd been using are **NOT real Apollo policy — they were invented/internal. Drop them.** Apollo's actual rule is **qualitative, not numeric**: their ToS forbids "resell, distribute, disclose, sublicense… or make available the Contributor Database to any third party," and the API license is "internal business purposes" only, "not sublicensable." **Sourcing leads on ONE K.I.N.D Apollo account and delivering that data to even ONE external client is the violation — from client #1, not client #50.** Enforcement is **discretionary** ("sole discretion / reasonably suspect"), so a tiny operation may not get noticed — but there is no safe number. _(Separately: "leads produced" is just a **credit/quota** meter — buying more credits is fine and unrelated; it does NOT buy reselling rights.)_
**✅ THE TWO COMPLIANT STRUCTURES (must pick one before scaling client intake):**
- **(a) Apollo API Reseller / Data-Licensing agreement** — the purpose-built contract to embed Apollo data in a platform "for anyone to access, Apollo user or not." Email **`partners@apollo.io`** → trial key → sign (most partners ~1 week). **This is the structure that fits our one-account-many-clients model — the primary path.**
- **(b) Client-brings-own-Apollo-key / Agency sub-accounts** — each client holds their own Apollo licence; K.I.N.D operates it (Apollo supports this via "Partner Seats"). Clean, no custom data contract. Good fallback/interim.
- **(c) Multi-source (PDL etc.)** reduces single-VENDOR risk but does NOT by itself make Apollo redistribution compliant — still need (a) or (b) for the Apollo-sourced portion.
_(Demo note: seeded Showcase Demo does NOT hit Apollo; live-ICP demos DO. Source: ToS research 10 Jun — `apollo.io/terms`, `/terms/api`, `/partners/api-reseller`; verbatim clause wording to be eyeballed at the live URLs before any legal/investor doc.)_

### The plan (status-tracked)
| Step | Trigger | Action | Owner | Status |
|------|---------|--------|-------|--------|
| 0 | **Now (client-#1 issue, not a 50-client one)** | **Email `partners@apollo.io` to start the API Reseller / Data-Licensing agreement (a)** — ~1 wk, the structure that legitimises our model. Interim/fallback = **(b) client-brings-own-key**. | 🧍 | ⬜ **start this week** |
| 1 | Code done | 🤖 **wired PDL as a 2nd discovery source** in `searchPeopleWithFallback` — Apollo-fail/empty → PDL. **Dormant until founder drops a free `PDL_API_KEY`.** Also lights the enrichment waterfall. | 🤖 code · 🧍 key | 🔄 **CODE READY — needs PDL key to activate** |
| 2 | First paying clients | Add `PDL_API_KEY` to Railway → multi-source goes live; monitor Apollo credit burn | 🤝 | ⬜ |
| 3 | Scaling client intake | Reseller agreement signed OR all clients on own keys — **before** taking many external clients | 🧍 | ⬜ |
| 4 | Post-revenue | Add Hunter (~$49/mo) + later Cognism reseller (~$15–25k/yr); Manus async deep-research for African SMBs = potential moat (#42) | 🤝 | ⬜ |

**Reality (ToS research 10 Jun):** there is **no safe client number** — reselling off one account is a violation from client #1; the fix is **structural** (reseller agreement or client-keys), not a threshold. Not a hard launch blocker at 1–2 clients (enforcement is discretionary), but the structure conversation should **start now** since the agreement takes ~a week and the first client + Nigeria partner are imminent.
**✅ Done today:** PDL discovery code wired (dormant) · Apollo-ToS verified.
**Next move (🧍):** (1) email `partners@apollo.io`; (2) drop a free `PDL_API_KEY` to activate the 2nd source.

---

### **PHASE 2: WEEK 1 POST-LAUNCH (Jun 19–28)**

*(Status: ✅ done · 🔄 in progress · ⬜ to do — all post-launch, not started yet)*

| Item # | Status | What | Owner | Why |
|--------|--------|------|-------|-----|
| **#17** | ⬜ | 10 warm outreach messages (network) | 🧍 | Seed launches, accelerate launches. |
| **#18** | ⬜ | LinkedIn content 1/day via anonymous brand handle | 🧍 | Thought leadership. |
| **#19** | ⬜ | Activate LinkedIn outreach — run `20260602_linkedin_queue.sql` + PhantomBuster keys (backend built) | 🧍 | Distribution unlock. |
| **#20** | ⬜ | Start Meta/WhatsApp Business API application (3–7 day window) | 🧍 | Pipeline for Month 2. |
| **#21** | ⬜ | Record real product demo ("shoot once, cut many", 16:9 + 9:16) | 🧍 | Asset for social + website. Use Pixar family prominently (warmth moat). |
| **#22** | ⬜ | #44 Replace homepage hero animation with real product loop | 🤖 (blocked on #21) | Authenticity > animation. |
| **#23** | ⬜ | Instrument GTM funnel (channel→reply→demo→close, CAC, trial→paid) | 🤝 | Data for Month 2 strategy. |
| **#24** | ⬜ | Activate dogfood self-outreach engine + point FIGSY at competitor-switcher ICP | 🧍 | Eat our own dogfood. Prove the product. |
| **#25** | ⬜ | Daily client briefing email (Apex steal) | 🤖 | Quick win. Apex insight. |
| **#26** | ⬜ | One pre-launch fresh-signup check (smoke test used dogfood) | 🧍 | Verify real onboarding path. |

### **PHASE 3: WEEKS 2–4 (Jun 29 – Jul 19)**

| Item # | Status | What | Owner | Why |
|--------|--------|------|-------|-----|
| **#27** | ⬜ | Open 2 design-partner slots (case study + logo) | 🧍 | Social proof + revenue. |
| **#28** | ⬜ | Cut social content from demo footage (9:16) | 🤖 | TikTok/Reels asset. |
| **#29** | ⬜ | **Onboarding VIDEO content** — 3 Looms (product walkthrough · per-agent setup · first campaign) | 🧍 | Customer education + anti-churn. |
| **#30** | ⬜ | Onboarding v2 + day-0/3/7 email sequence | 🤖 | Reduce churn (Revio insight). **Claude can build solo.** |
| **#31** | ⬜ | Populate proof block + homepage outcome numbers with REAL data (#62c) | 🤖 | No fabrication. Wait for first results. |
| **#32** | ⬜ | Activate Flutterwave (needs key — ZAR/NGN/KES/GHS) | 🧍 | Africa-first revenue. |
| **#33** | ⬜ | Launch YouTube channel (10-video plan exists) | 🧍 | Long-tail SEO. |
| **#34** | ⬜ | Wire playbook email form (ConvertKit/Mailchimp) | 🤖 | Lead magnet. |
| **#35** | ⬜ | #61a/g Performance-guarantee clause in terms.html + ToS update | 🤖 | Atlas steal. "90-day results or you don't pay". |
| **#36** | ⬜ | #61e Atlas steal — influencer/community distribution | 🧍 | Distribution moat. |
| **#37** | ⬜ | #61g Atlas steal — sharpen guarantee language | 🤖 | Messaging. |
| **#38** | ⬜ | #62b Revio steal — bundle "Revenue Playbook Session" (30-min) into onboarding | 🤖 | Coaching layer. Reduces churn. |
| **#39** | ⬜ | Scheduled report emails (S4 steal) | 🤖 | Weekly digest. Engagement. |

### **PHASE 4: MONTH 2 (Late Jul – Aug, GATED: 10+ clients)**

**PREREQUISITE:** Set up staging environment before any V2 touches main (Part 4B — Supabase `kind-staging`, Railway staging services, `staging` branch, auto-deploy on push).

#### **Intelligence Layer (#37–53 + #59)** — *Status: ⬜ to do · 🔄 partial (Month 2, gated on 10+ clients)*
| Item # | Status | What | Why | Competitive Signal |
|--------|--------|------|-----|-------------------|
| **#37** | ⬜ | Intent signal detection | Signal which leads are *ready to buy* (not just interested). | Amplemarket moat. Reduce wasted outreach. |
| **#38** | ⬜ | A/B subject testing | Test subject lines (FIGSY picks the winner automatically). | Monday/ClickUp testing. Personalisation = conversion. |
| **#39** | ⬜ | Client morning-brief email | Daily summary: lead activity, reply rates, anomalies. | Engagement hook. Brings clients back to portal. |
| **#40** | ⬜ | ICP auto-refinement (L2 learning layer) | Monthly AI review of which verticals/sizes replied → refine ICP automatically. | Glean's "context wins" + our outcome data moat. |
| **#41** | ⬜ | Conditional sequence branching | "If no reply in 5 days, branch to escalation." | Monday/ClickUp automation. (Note: basic on_reply branching already live.) |
| **#42** | ⬜ | Waterfall enrichment (Apollo → PDL → Hunter → Clearbit + **Manus**) | Fallback pipeline when Apollo returns <200 / unverified (esp. Africa). | Clay insight. Enterprise richness for SMB price. |
| **#43** | ⬜ | Deliverability dashboard (SPF/DKIM/DMARC + bounce + blacklist) | Real-time deliverability monitoring. | Monday insight. Transparency = trust. |
| **#44** | ⬜ | Email score pre-send | AI scores subject + body for spam signal before send. | MailerLite moat. Reduce complaints. |
| **#45** | ⬜ | Adaptive send volume | Ramp sends based on reply rate (not fixed). | Instantly moat. Responsive to feedback. |
| **#46** | ⬜ | **FIGSY Memory v2 (pgvector)** | Semantic embeddings (episodic / long-term / preference). | Our moat. L2 learning needs pgvector. **→ full architecture: "AGENT TRAINING & INTELLIGENCE — THE LEARNING ENGINE" in `V2-TRACKER.md` (reward schema · contextual bandits · recall · 2a→2c path).** |
| **#47** | ⬜ | Milla full-context CRM pull | Milla reads client's Pipedrive/HubSpot history when writing. | Glean moment. Context always wins. |
| **#48** | 🔄 | Vapi voice calling → **DENISE owns it** — **code built** (`lib/vapi.ts`), not live; re-attribute FIGSY→Denise in #54. | Denise (closer) dials to confirm/close. | Atlas/Revio moat. Denise = our "Alex". |
| **#49** | ⬜ | Product Hunt launch (with proof) | Launch with 2–3 design-partner case studies. | Proof moat. Network effect. |
| **#50** | ⬜ | G2 listing (5 reviews) | Build social proof. | SMB buying signal. |
| **#51** | ⬜ | Configurable agent triggers | "Send after X days." "Escalate if human reply." | Monday/ClickUp. Power users unlock value. |
| **#52** | ⬜ | Multi-model toggle per campaign | "Use Opus for this ICP, Sonnet for this one." | Experimentation. Cost optimisation. (Note: model_preference field exists.) |
| **#53** | ⬜ | Inbox rotation / multiple sending domains (Instantly steal) | Auto-rotate sending domain (evades spam filters). | Instantly moat. Deliverability on steroids. |
| **#59 (pulled fwd)** | ⬜ | **MCP server** (distribution unlock) | One endpoint: "Start a FIGSY campaign." Notion/Linear/Slack agents call it. | **MCP is distribution.** Month 2. |

#### **V2 Portal Redesign (#V2-1 through #V2-13)** — *visual deck §1–18 complete; gated build on `/dashboard/v2` (Command Centre shell shipped 8–9 Jun). Target: per-rep core live 30 Jun.*
| Item | Status | What | Why | Competitive Signal |
|------|--------|------|-----|-------------------|
| **V2-1** | 🔄 | Agent card grid (dashboard home) — scaffolded in `/dashboard/v2/page.tsx`. | Show all agents in a card grid. | Monday/ClickUp clean layout. |
| **V2-2** | ⬜ | Agent thinking/working state ("Writing 17 emails…"). | Transparency. | ClickUp "Super Agents". |
| **V2-3** | ⬜ | Conversational agent setup (chat with Casey instead of forms). | Prompt-to-build direction. | ClickUp/Notion + Revio. |
| **V2-4** | ⬜ | Structured agent config panel (Role/ICP/Tone/Schedule/Knowledge). | Clean cards per setting. | Monday/ClickUp. |
| **V2-5** | ⬜ | Agent marketplace ("Meet your AI Revenue Team"). | Cross-sell. | Salesforce AgentExchange. Month 3. |
| **V2-6** | ⬜ | Slim sidebar + top-right header. | Cleaner nav. | Notion/Linear. |
| **V2-7** | 🔄 | Invite teammate (growth loop) — team invite backend built (`client_members`/`/team/invite`). | Referral growth. | Monday growth. → folds into #88. |
| **V2-8** | ⬜ | **AI Notetaker → action items (Milla)** — nightly "here's what your team did + 3 actions". | AI reads activity, tells you what to do. | Glean moment. |
| **V2-9** | ⬜ | **Teams Hub** (members, activity, per-person usage). | Admin oversight. | Linear/Notion. → folds into #88 owner command centre. |
| **V2-10** | ⬜ | **Casey — Onboarding agent** (portal-only). Guides setup. Avatar `casey.png` ✅. | Specialist-per-role onboarding. | ClickUp + Revio. |
| **V2-11** | 🔄 | **Vida in-portal help bubble** (basic pre-launch; deep Month 2). | Support moat, reduces TTSR. | Support moat. |
| **V2-12** | 🔄 | **Strong client dashboards (Monday-style)** — Command Centre/funnel shell built in `/dashboard/v2/company`. | Dense, useful dashboards. | Monday density. V2 priority. |
| **V2-13** | ⬜ | **Multi-provider calendar** (Outlook/Zoho/Calendly OAuth + Casey-guided). | Non-Google clients unlocked. | → folds into #88 per-rep calendars. |

### **PHASE 5: MONTH 3 (Late Aug – Sep, GATED: family build + margin data)**

*(All ⬜ — gated on family build + margin data. Agent avatars ready: denise/lena/tony ✅.)*

| Item # | Status | What | Why | Competitive Signal |
|--------|--------|------|-----|-------------------|
| **#54** | ⬜ | **DENISE deep build (#1 next agent)** — Calendly auto-book · call-join notetaker · objection extraction · proposal-from-transcript · pipeline follow-up · **Vapi voice** (#48). | Closes FIGSY → booked seam. Max leverage. | DENISE = our answer to "booked → revenue". #1. |
| **#55** | ⬜ | **LENA — Customer Success** (back agent) — retention · renewals · upsell · churn prevention. After DENISE. | Closes the lifecycle. | Alta's CS column. Cheapest revenue. |
| **#56** | ⬜ | **TONY — Operations** (named after founder's father) — pipeline hygiene · handoffs · CRM cleanliness. After LENA. | The dependable backbone. | Ops loop. |
| **#57** | ⬜ | Multi-agent orchestration (shared memory) — FIGSY → DENISE → Milla handoff. | Platform moat. | Monday/ClickUp orchestration. |
| **#58** | ⬜ | 500+ FIGSY skill library. | Depth. | ClickUp 500+ skills. |
| **#60** | ⬜ | **Outcome pricing** (per meeting) — GATED on ≥28% gross margin. | Pure outcome model. | Salesforce + Intercom proved it. |
| **#61** | ⬜ | Mobile app (iOS + Android) — if MRR >£8K. | Competitive hygiene. | Month 3+. |
| **#62** | ⬜ | Built-in CRM (Kanban deal view). | FIGSY stores every prospect. | Monday/ClickUp/Linear. |
| **V2-5** | ⬜ | Agent marketplace ("Meet your AI Revenue Team"). | Cross-sell. | Salesforce AgentExchange. |
| **#63** | ⬜ | Pan-African design partners (NG/KE/GH/EG/RW). | Regional presence. | Our specialisation lane. |
| **#64** | ⬜ | Platform-level cross-client intelligence (L4 moat) — vertical benchmarks. | Long-term differentiation. | Glean's enterprise moat. Year 2+. |
| **#65** | ⬜ | Data licensing marketplace (anonymised outcome data). | New revenue stream. | Year 2+. Gated on volume + ethics. |
| **#66** | ⬜ | ICP auto-refinement advanced (L3, real-time). | Data moat. | Year 2+. |
| **#67** | ⬜ | Pipeline forecasting. | Product intelligence. | Linear insight. Year 2+. |
| **#68** | ⬜ | In-portal messaging (Slack-style). | Team chat. | Monday/Notion. Year 2+. |
| **#69** | ⬜ | Proposal + e-sign (DENISE drafts, client signs). | Close in-portal. | Salesforce moat. Year 2+. |
| **#70** | ⬜ | Meeting notetaker (auto-transcribe, live objections). | Capture every call. | Glean/Linear. Year 2+. |

### **PHASE 6: YEAR 2 (Enterprise)**

| Item # | What | Why |
|--------|------|-----|
| **#71–74** | ISO 27001 + 42001 + SOC 2 Type II via Vanta | Enterprise compliance. ~£70K total. | 
| **#75** | 3-type memory model (episodic / long-term / preference) | Sophistication (after pgvector foundation, Month 2). |
| **#76** | Visitor de-anonymisation (Clearbit) | See who's on the website before they sign up. |
| **#77–79** | Churn-risk scoring · revenue forecasting · call intelligence | Data layer sophistication. |

---

## 🔐 THE MOAT — What Actually Defends K.I.N.D

Three layers, in order of defensibility:

### **Layer 1: Specialisation (RIGHT NOW)**
- African market data (POPIA + NDPR + DPA + CCPA compliance baked in from day 1)
- $20 entry point (lowest price in market)
- Named family agents (Pixar 3D, founded-by-family storyline)
- **Moat:** Generalists (Monday/ClickUp) can't replicate this without years of regional presence

### **Layer 2: Outcome Data (Month 2–3, GATED: 10+ clients)**
- Append-only raw log of every send, reply, deal outcome, by angle/vertical/region
- L2 learning (monthly ICP auto-refinement based on actual replies)
- L3 adaptive (real-time A/B per campaign)
- **Moat:** This data is *cross-client* (unlike Glean, which is per-customer). Every client makes the platform smarter for the next one in their vertical. Network effect.

### **Layer 3: Platform Intelligence (Year 2, GATED: 50+ clients)**
- L4 benchmarks ("Your reply rate is 8.2%, SA average is 6.4%")
- Predictive ICP ("Given your deal size + reply rate, you'll close X in Q3")
- Revenue forecasting
- **Moat:** Nobody else has outcome data + SMB vertical penetration + compliance depth. Unique.

---

## 💰 FUNDING STRATEGY (Decided 5 Jun, DO NOT CHANGE)

**THE DECISION: Bootstrap to traction first. Do not chase funding yet.**

Why: K.I.N.D is lean, software-only, $29/mo self-serve, near-zero marginal cost. Atlas runs 74 employees burning hard *pre-revenue* — only works because they raised. We can reach ramen-profitability without diluting.

**Routes, in priority order:**
1. **F1 (NOW):** Free cloud/AI credits (Microsoft/Google/AWS) — tens of $K, zero downside. Extends runway. Do this week.
2. **F2 (5–10 clients):** SA ecosystem (Grindstone, Startupbootcamp AfriTech, Endeavor) — low/no equity. Cape Town base is advantage.
3. **F3 (paying clients):** YC / remote accelerators — ~7% standard. We fit thesis.
4. **F4 (predictable MRR):** Revenue-based financing (no dilution, debt model) — better SaaS fit than VC.
5. **F5 (ongoing):** Influencer lever (find our Dan-Martell equivalent) — worth more than seed round.

**Tension to resolve:** Fundraising requires reputation. You can pitch under your real name in investor meetings while keeping the K.I.N.D brand faceless. Do not try to raise while invisible to *everyone*. Separate the two: invisible to customers, visible to investors (when/if needed).

**Revisit decision at 20–30 paying clients.** From leverage, not need.

---

## 🚨 CRITICAL PATHS (CANNOT SHIP WITHOUT THESE)

1. **Deliverability (long pole, Mon 8 – Sun 14)** — mail to spam = launch failure. Warmup domain + DNS + code fixes + 10/10 inbox-placement test. Non-negotiable.

2. **Smoke Test 1 + 2 (Tue 9 – Sat 13)** — one real failure un-fixed = launch blocker. T1 fresh signup (never tested), T2–T7 full path. Must be green.

3. **MCP Month 2 (ASAP after 10 clients)** — market signal is strong. Glean/Notion/Linear all wired it. We need it or we're leaving distribution on the table.

4. **DENISE Month 3 (#54)** — extends FIGSY pipeline at the seam (booked → close). Highest leverage next agent. Build deep or don't ship.

---

## 🎯 SUCCESS CRITERIA (What "Done" Looks Like)

### **Launch (Fri 19 Jun)**
- ✅ Deliverability 10/10 (mail-tester score)
- ✅ Smoke Test 2 green (T1–T7 all pass)
- ✅ Fresh signup path works end-to-end
- ✅ FIGSY sends + prospect replies + reply classified 🔥 Hot
- ✅ Founder can onboard & demo to a real prospect

### **Month 1 (by mid-Jul)**
- ✅ 5 clients (break-even all-in)
- ✅ ~£2.5K MRR from design partners
- ✅ Real demo recorded (Week 1 item #21)
- ✅ LinkedIn content live (1/day)

### **Month 2 (by mid-Aug)**
- ✅ 10+ clients (gated: Intelligence Layer + MCP + V2 portal start)
- ✅ ~£12K MRR
- ✅ Product Hunt launch
- ✅ MCP server live (one endpoint: "Start FIGSY campaign")
- ✅ V2 portal redesign 50% complete

### **Month 3 (by mid-Sep)**
- ✅ 50 clients
- ✅ ~£40K MRR
- ✅ DENISE deep build complete (Calendly + notetaker + proposal + follow-up)
- ✅ L2 learning live (ICP auto-refinement working)
- ✅ Data shows ≥28% gross margin (outcome pricing unlocked)

---

## 📋 EVERYTHING BUILT (don't rebuild)

**Platform:** Supabase RLS, auth (no email-confirm), 16 crons, TSC clean.
**Lead Gen:** ICP builder, AI ICP Suggest, website scan, Apollo 3-pass, Claude scoring, opt-out blocklist, POPIA consent, first-leads email, weekly digest, drip 10/day, CRM dedup (HubSpot/Pipedrive).
**FIGSY:** 19 API endpoints, campaign CRUD, 3-step sequences, reply classification, FIGSY Memory, Unibox two-way, opt-out, CRM push, escalation, identity card, weekly digest, paused_low_performance, self-outreach cron. **Inbound reply pipeline:** Resend inbound, Svix auth, body fetch, classification to 🔥 Hot.
**Milla:** doc RAG + source attribution (subscription wired).
**Vida:** config/embed/WhatsApp (subscription wired).
**Billing:** Stripe credit + subscriptions, auto-topup, trial overlay, credits-at-delivery, overspend fix, low-credit warning.
**Admin (13 routes)** + **Portal (15 routes)** + **Website (30+ pages)** + **PWA**.
**LinkedIn outreach backend:** Built, activates Week 1.

---

## 🚫 WILL NOT BUILD

Collaborative docs · whiteboards · self-hosted · custom emoji · internal team chat · multi-year contracts · 50+ data sources (before 50+ clients) · African-language (after WhatsApp).

---

## 🔄 WHAT TO STEAL (ITEMS #61–62, COMPETITIONS' PLAYBOOKS)

### **Atlas Steals (#61a–g)**
| # | What | How | Your Edge |
|---|------|-----|-----------|
| **#61a** | 90-day performance guarantee ("results or don't pay") | Put it in terms.html + ToS. Founder signs off visibly. | Ours is credit-based (less risk than DFY). Messaging is confidence. |
| **#61b** | "$20" as the one number you own | Entry price everyone remembers. Landing pages, pricing, deck, everywhere. | True entry price (pay-per-result). Atlas is $5,000. Ours is 250x cheaper. |
| **#61c** | "Clone yourself" narrative | FIGSY learns your voice → writes emails like you. | Original copy. Atlas positioning. We've had it since day 1. Use it more. |
| **#61d** | Cold CRM re-engagement angle | "The list you gave up on is still worth money. FIGSY warms them." | Revio's list freshness insight. We own it better (autonomous, not co-pilot). |
| **#61e** | Influencer distribution (find our Dan-Martell) | Atlas + Revio both grew on 1 person (Dan Martell: SaaS Academy, Buy Back Your Time). | Find the **SA/African equiv** (5–10 person network who know SMB leaders). US equiv deferred to US-gate. Worth more than seed round. |
| **#61f** | ROI calculator | User enters own leads + deal value → calculator shows revenue lost to slow follow-up + upside if FIGSY closes 8%. | Atlas tool. We have it (`pipeline-calculator.html`). Use it on landing pages. Lead magnet. |
| **#61g** | Guarantee sharpened from 30d to 90d | "90 days gives enough campaign data to show results. Stronger signal than 30 days." | Revio insight (outcomes take time to measure). |

### **Revio Steals (#62a–e)**
| # | What | How | Your Edge |
|---|------|-----|-----------|
| **#62a** | "Trained on closed-won deals" credibility hook | FIGSY: "trained on your business, your ICP, every campaign." Denise: "trained on relationship selling + your closed-won deals." | Original copy. Real training (no fake numbers). Populate real numbers as data comes in. |
| **#62b** | Coaching layer bundled into onboarding | "Revenue Playbook Session" (30-min call): founder or Casey guides client through campaign setup, ICP, first sequence. Reduces churn (Revio's insight). | Revio = human coaching ($500/mo). Ours = AI (Casey) + optional founder call. Scales better. |
| **#62c** | Homepage outcome numbers | 2–3 concrete stats: "30,065 leads last month" specificity. Do NOT fabricate — hold the slot, populate when real. | Revio case study detail. We're honest (no fakes). Population with real data Month 2+. |
| **#62d** | "Revenue Blueprint Session" demo framing | Renamed all 29 demo CTAs: "Book a Demo" → "Book a Revenue Blueprint Session." | ✅ Already done. Messaging shift. |
| **#62e** | Vertical landing pages + case studies | Estate agents, insurance brokers, financial advisers (**Africa only for now** — US equivalents deferred to US-gate). Each with pain + FIGSY solution + compliance note. | ✅ Already done (Africa: 3 verticals). ~~US Month 2~~ → US deferred. Revio strategy (own the niche). |

---

## 🎬 FINAL NOTE: WHAT'S DIFFERENT ABOUT K.I.N.D

In a market where:
- **Glean** = enterprise context layer ($7.2B — not for us)
- **Monday/ClickUp** = general-purpose agent platforms (we can't compete on breadth)
- **Atlas/Revio** = done-for-you / creator-specific (different buyers)

**K.I.N.D** is:
- **Specialised revenue team** (not a platform that does everything)
- **$29/mo self-serve** (not $5,000+ or $500+)
- **Outcome-driven** (not seat-based)
- **Regional moat** (African market data + compliance)
- **Warm + human** (named family agents, Pixar, founded-by-family) — while everyone else talks about "AI coworkers," we talk about "your sales team"
- **Data moat** (cross-client outcome learning, not per-customer isolation)

**The window is closing.** Big players are humanising agents. Get the warmth + specialisation right *now*, before that becomes table stakes.

---

**Document Version:** 7 Jun 2026, 12:00 UTC
**Next Update:** After Smoke Test 2 passes (expected Sat 13 Jun)
**Audience:** Founder, Claude (session context), occasional investors / accelerators / advisors

# ═══════════════════════════════════════════════════════════════
# CHAPTER 2 — DAILY ACTION PLAN (MON 8 → FRI 19 JUN)
# ═══════════════════════════════════════════════════════════════


> **Working document.** Updated daily. What you do, what Claude does, blocking order.
> Assume we are starting **Mon 8 Jun** at 08:00 UTC.
> Launch date: **Fri 19 Jun** (firm, 12-day countdown).

---

## 🗺️ CURRENT STATE (as of end of 7 Jun / start of Mon 8 Jun)

### ✅ SHIPPING (verified on `main` / deployed to Railway)
- Apollo email enrichment (bulk_match by id) — real emails now delivered
- FIGSY inbound reply pipeline — end-to-end working, 🔥 Hot classification verified live
- Compliance suppression guard — hard-coded at all 6 outreach paths
- ICP run async — portal 15s timeout fixed
- Schema drift — lead_status ENUM reconciled on live DB
- Auto-outreach gating — `AUTO_OUTREACH_ENABLED=true` default OFF

### 🔴 BLOCKING NEXT 5 DAYS
1. **Deliverability (D1–D5 code + D6–D8 founder infra) — THE LONG POLE**
   - Code: List-Unsubscribe header + one-click unsubscribe · plain-text MIME · tracking pixel fix · cold-FROM config · transactional headers
   - Founder: Buy cold domain(s) · SPF/DKIM/DMARC · start warmup (5–10 → 30–50/day) · verify `API_URL` + get-kind.com auth
   - Gate: Nothing launches without 10/10 inbox-placement test (Sun 14 evening)

2. **Smoke Test 1A (Tue 9) — T1, T2, T3 partial**
   - Gate: BLOCKING Tue 9. Cannot wait.
   - Needs: `booking_url` paste field (CAL-min, Tue 9), Denise Stripe price (Tue 9)

3. **TIER-0 credential rotation (Mon 8 → Tue 9)**
   - Gate: Finish all 9 keys by Tue 9 (Apollo already rotated 6 Jun)

### ⬜ NOT DONE YET (Smoke Test 1 / 2)
- T1 fresh signup (never run end-to-end — used dogfood account so far)
- T3 step 13 (pause campaign → verify no send)
- T4 booking + KPI increment
- T5 Stripe billing (single charge, webhook idempotency, Milla 403)
- T6 Vida widget
- T7 Milla cron hygiene
- Full Smoke Test 2 (complete re-run)

---

## 📋 DAILY BREAKDOWN (Mon 8 → Fri 19)

### **🚨 MON 8 JUN — START**

#### Owner: 🧍 YOU (founder)
| Task | What | File/Action | Timeline | Blocker? |
|------|------|------------|----------|----------|
| **D6–D8** | **Buy 1–2 cold domains** (lookalikes for outreach) | E.g., `get-kind-outreach.com` or similar. Register on GoDaddy/Namecheap. | Today | **YES — warmup ramp starts NOW (2–3 wks before Fri 19)** |
| **D6–D8** | **SPF record for cold domain** | `v=spf1 include:_spf.resend.com ~all` | Today | YES — DNS propagation takes 24h |
| **D6–D8** | **DKIM for cold domain** | Ask Resend for DKIM public key, add to DNS `resend._domainkey.get-kind-outreach.com` → Verify in Resend | Today | YES — DNS |
| **D6–D8** | **DMARC for cold domain** | `v=DMARC1; p=none; rua=mailto:dmarc@...` (start in monitoring mode) | Today | YES — DNS |
| **D6–D8** | **Verify `get-kind.com` auth** (transactional domain) | Check Resend shows `get-kind.com` verified for both SPF + DKIM | Today | YES — no sending until confirmed |
| **D6–D8** | **Verify `API_URL` environment variable** | Check Railway API service: `NEXT_PUBLIC_API_URL` = `https://api.get-kind.com` (or whatever DNS resolves to) | Today | YES — portal routing |
| **#1 cred rotation** | Rotate: `STRIPE_SECRET_KEY` | New key from Stripe dashboard → add to Railway API service | Today | YES (9 keys) — finish by Tue 9 |
| **#1 cred rotation** | Rotate: `SUPABASE_SERVICE_ROLE_KEY` | New key from Supabase project settings → Railway | Today | YES (9 keys) |
| **#1 cred rotation** | Rotate: `DATABASE_URL` password | Supabase `Connection pooling` tab → get new password string → update Railway `DATABASE_URL` | Today | YES (9 keys) |
| **#1 cred rotation** | Rotate: `SUPABASE_ANON_KEY` | New from Supabase settings → Railway + Portal service | Today | YES (9 keys) |
| **#1 cred rotation** | Rotate: `ANTHROPIC_API_KEY` | New from console.anthropic.com → Railway | Today | YES (9 keys) |
| **#1 cred rotation** | Rotate: `RESEND_API_KEY` (live key) | New from Resend dashboard → Railway | Today | YES (9 keys) |
| **#1 cred rotation** | Rotate: `RESEND_WEBHOOK_SECRET` | New secret from Resend webhook config → Railway | Today | YES (9 keys) |
| **#1 cred rotation** | Rotate: `HUBSPOT_API_KEY` | New from HubSpot settings → Railway | Today | YES (9 keys) |
| **#1 cred rotation** | Rotate: `ADMIN_SECRET_KEY` | Generate new UUID → Railway API service | Today | YES (9 keys) |
| **#1 cred rotation** | Rotate: `STRIPE_WEBHOOK_SECRET` | New from Stripe webhook settings → Railway | Today | YES (9 keys) |
| **D6–D8** | **START warmup** | Configure email service to ramp cold domain: Day 1 = 5/day, Day 2 = 7/day, Day 3 = 10/day, ... Day 21 = 50/day. Monitor bounce rate + spam complaints. | **Start 8 Jun — run for 11 days** (until Fri 19) | **CRITICAL — determines launch deliverability** |
| **D6–D8** | **Log all actions** | Create a checklist file: `deliverability-checklist-mon8.txt` (which domains, which DNS records added, warmup volume by day) | EOD | No |

#### Owner: 🤖 CLAUDE (me) — 🔨 BUILT 8 Jun, NOT verified (commit `96456ac`, branch `claude/kind-carson-MYhSl`)
> ⚠️ The `✅` in the per-task rows below mean "code written for this sub-item", NOT "verified working". The whole block is `🔨` — never deployed or run against real Resend/Gmail.
> Implementation differs from the original guesses below in three ways (the doc's
> guesses were wrong; this is what actually shipped): unsubscribe lives under
> `/figsy/unsubscribe/:token` (signed HMAC token, **not** a raw `?email=` URL — no
> enumeration); the cold-FROM env is a single `FIGSY_COLD_FROM` ("Name <addr>")
> + `FIGSY_COLD_REPLY_TO` (**not** `_DOMAIN`/`_NAME`); the tracking pixel is
> **suppressed entirely** until a branded `TRACKING_URL`/`API_URL` is set (rather
> than hard-coding a `t.get-kind-outreach.com` alias). All logic centralised in the
> new `apps/api/src/lib/deliverability.ts`.

| Task | Status | What shipped | File(s) |
|------|--------|--------------|---------|
| **D1** List-Unsubscribe + one-click | ✅ | `List-Unsubscribe` + `List-Unsubscribe-Post: List-Unsubscribe=One-Click` (RFC 8058) on both cold-send sites + a visible footer link | `lib/deliverability.ts` (`unsubscribeHeaders`/`unsubscribeFooterHtml`), `lib/figsy.ts` |
| **D1** Unsubscribe endpoint | ✅ | Public `GET` + `POST /figsy/unsubscribe/:token` (before `requireAuth`), signed token verified with no DB lookup, funnels into existing `opt_out_blocklist` + marks leads/enrollments opted_out + logs outcome event | `routes/figsy.ts` (`recordUnsubscribe`) |
| **D2** Plain-text MIME | ✅ | `text:` part on both cold sends (raw body + unsub line) **and** all transactional mail via new `sendTx()` wrapper (`htmlToText`) | `lib/figsy.ts`, `lib/email.ts`, `lib/deliverability.ts` |
| **D3** Fix tracking pixel | ✅ | Pixel no longer embeds a bare platform host (railway/render/vercel/heroku) — suppressed unless `TRACKING_URL`/`API_URL` is a branded domain. **Open-tracking is OFF until founder sets that.** | `lib/deliverability.ts` (`trackingPixelHtml`/`trackingBaseUrl`), `lib/figsy.ts` |
| **D4** Configurable cold-FROM | ✅ | `FIGSY_COLD_FROM` + `FIGSY_COLD_REPLY_TO` env (warns in prod if unset). Both cold sites + the manual Unibox reply now use it (reply threading stays on the cold domain, transactional domain never leaks). | `lib/deliverability.ts`, `lib/figsy.ts`, `routes/figsy.ts` |
| **D5** Transactional plain-text | ✅ | Every transactional send carries a `text/plain` part; intentionally **no** List-Unsubscribe (that's cold-bulk only). | `lib/email.ts` (`sendTx`) |
| **Typecheck only** | 🔨 | Full app `tsc --noEmit` clean — **this is the ONLY verification done. No runtime test, no real send.** | — |
| **🔴 Founder env (blocks go-live)** | ⬜ | Set on Railway: `FIGSY_COLD_FROM`, `FIGSY_COLD_REPLY_TO`, `TRACKING_URL` (branded), optional `FIGSY_UNSUB_MAILTO`, `UNSUBSCRIBE_SECRET`. Until set: cold still sends from `get-kind.com` + open-tracking off. | 🧍 |
| **Deploy + live test** | ⬜ | Tue 9: deploy to Railway, then send to a Gmail/Outlook test box → confirm `List-Unsubscribe` header, plain-text rendering, one-click works. (Original `/figsy/send-test` curl idea.) | Tue 9 |

#### **Status: Mon 8**
- Deliverability D1–D5: 🔨 **BUILT + typecheck-clean** (commit `96456ac`) — NOT deployed/verified. Awaiting founder env vars + Tue 9 deploy/live-test.
- Founder infra D6–D8: ⬜ Domains registered, DNS started (propagation pending), warmup ramp starting
- Founder env vars (cold-FROM / tracking domain): ⬜ **blocks D1–D5 going live**
- TIER-0 rotation: ⬜ 9 keys

---

### **🚨 TUE 9 JUN — SMOKE TEST 1A + CRITICAL INFRA**

#### Owner: 🧍 YOU (founder)
| Task | What | File/Action | Timeline | Blocker? |
|------|------|------------|----------|----------|
| **#1 finish** | Finish 9 TIER-0 key rotations | Last 3 keys (if not done Mon PM) | Morning | YES — unrotated keys = security risk |
| **#6** | Run migration `010_crm_dedup.sql` | Supabase SQL editor → `packages/db/src/migrations/010_crm_dedup.sql` → run in production DB | Morning | YES — T5 smoke test (billing) needs CRM dedup |
| **#7** | Create Denise Stripe price | Stripe dashboard → Products → KIND → create new price: `$99 USD / month, recurring` → note the price ID (e.g., `price_1QkXxxx`) | Morning | YES — T5 needs `STRIPE_PRICE_DENISE_MONTHLY` |
| **#7** | Add Denise price to Railway | Railway `@kind/api` service → Env vars → add `STRIPE_PRICE_DENISE_MONTHLY=price_1QkXxxx` → redeploy | Morning | YES — billing test needs this |
| **#7/8** | DNS: `app.get-kind.com` | GoDaddy: create CNAME `app` → Railway `<railway-url>` (ask Railway for production domain target) | Morning | YES — portal routing |
| **#7/8** | DNS: `api.get-kind.com` | GoDaddy: create CNAME `api` → Railway `<railway-url>` | Morning | YES — API routing |
| **#7/8** | DNS: `admin.get-kind.com` | GoDaddy: create CNAME `admin` → Railway `<railway-url>` | Morning | YES — Admin routing |
| **#7/8** | DNS: `status.get-kind.com` | GoDaddy: create CNAME `status` → Railway `<railway-url>` | Morning | YES — Status page routing |
| **#7/8** | Update `NEXT_PUBLIC_API_URL` Portal | Railway `@kind/portal` service → Env vars → `NEXT_PUBLIC_API_URL=https://api.get-kind.com` → redeploy | Morning | YES — portal API calls |
| **#7/8** | Update `NEXT_PUBLIC_API_URL` Admin | Railway `@kind/admin` service → Env vars → `NEXT_PUBLIC_API_URL=https://api.get-kind.com` → redeploy | Morning | YES — admin API calls |
| **#7/8** | Update Resend inbound webhook URL | Resend → Incoming email → Webhook → change URL from old to `https://api.get-kind.com/figsy/replies/inbound` → save | Morning | YES — reply routing |
| **Warmup check** | Verify warmup ramp Mon 8 → Tue 9 (should be at ~10/day by Tue AM) | Check email service logs (if available) or test mailbox. Monitor bounce rate. | Morning | No (monitoring only) |
| **Pre-test comms** | Send yourself a test email from `get-kind-outreach.com` to verify delivery (should go to inbox, not spam) | Use any email testing tool | Morning | No (verification) |

#### Owner: 🤖 CLAUDE (me)
| Task | What | File(s) to Edit | Timeline | Blocker? |
|------|------|-----------------|----------|----------|
| **CAL-min** | Add `booking_url` paste field | `apps/portal/src/app/(dashboard)/agents/[agentId]/settings.tsx` → add text input: "Your booking link (Calendly/Zoho/etc.)" → stores in agent settings `booking_url` → update Supabase schema if needed | Morning | **YES — T3/T4 tests need this** |
| **P-a** | "Sign emails as {name}" setting | `apps/portal/src/app/(dashboard)/agents/[agentId]/settings.tsx` → add text input: "Email signature name" (default = agent name) → pass to FIGSY prompt | Morning | No (cosmetic, but nice) |
| **P-b** | Strip `BUILD MARKER` debug | `apps/api/src/index.ts` line 165 → delete or comment out the `BUILD MARKER` console.log | Morning | No (cleanup) |
| **#2** | Delete dormant Portal-V2 build + flag | Delete `apps/portal/src/app/(dashboard)/v2/` folder (or mark 🚫 in README) · Remove `FEATURE_PORTAL_V2` env var from Railway. Check codebase for any references to the flag. | Morning | YES — if flag is on, it breaks live portal |
| **Deploy pipeline** | Investigate `KIND System Audit` GitHub Action | `.github/workflows/daily-audit.yml` → why does it fail on every push? Run locally, debug. Either fix it or make it non-blocking (doesn't stop deploy). | Morning | **YES — causes stale builds** |
| **Code review** | All D1–D5 changes (List-Unsubscribe, MIME, tracking, cold-FROM, headers) → test locally, push to branch. | Branches in PR, request review | Morning | No (parallel to Founder D6–D8) |
| **Deploy D1–D5 + CAL-min + P-a + P-b + #2** | Once all code merged, Railway auto-deploy or manual trigger | Verify on Railway logs that new code is live | Lunch time | YES — Smoke Test 1A needs all this |

#### **SMOKE TEST 1A — TUE 9 PM (or Wed 10 AM)**
| Test | What | Owner | Timeline | Pass/Fail? |
|------|------|-------|----------|-----------|
| **T1** | Fresh email signup → onboard → dashboard loads | 🧍 | Tue evening or Wed AM | ⬜ Not done yet |
| **T2 steps 8–9** | Set active ICP · CSV export | 🧍 | Tue evening | ⬜ Not done yet |
| **T3 steps 10–13** | FIGSY send campaign · recipient replies · reply arrives 🔥 Hot · pause campaign → send again → verify NO emails | 🧍 | Tue evening (or splits to Wed) | ⬜ Mostly done, step 13 todo |

#### **Status: Tue 9 — 17:00 UTC (TARGET)**
- Deliverability D1–D5: code ✅ since Mon 8 (`96456ac`) → **target Tue 9 = deployed + live-tested** (founder env vars must be set first)
- Founder infra D6–D8: ✅ DNS live, warmup ramping, Denise price added
- CAL-min: ✅ Deployed
- Smoke Test 1A: ⬜ In progress or complete

---

### **🚨 WED 10 JUN — SMOKE TEST 1B + FIXES**

#### Owner: 🧍 YOU (founder)
| Task | What | Timeline |
|------|------|----------|
| **T4** | Book a meeting (connect Google Cal or "Mark as booked") → verify `meetings_booked` increments | All day |
| **T5** | Stripe: buy credit bundle (test mode) → verify credits added once · replay webhook → verify no double-charge · Milla subscribe → verify unlock · non-subscriber → verify 403 | All day |
| **T6** | Vida widget: copy embed snippet → paste in test page → verify purple bubble renders · send test message → verify lead captured | All day |
| **T7** | Check Milla cron: non-Milla client should NOT receive morning briefs | All day |
| **Log results** | Document T4–T7 results: "T4-Step-14: ✅ Booked, meetings_booked=1" etc. | EOD |

#### Owner: 🤖 CLAUDE (me)
| Task | What | Timeline | Blocker? |
|------|------|----------|----------|
| **#17** | Fix any Smoke Test 1 failures **same-day** (speed is critical) | As failures reported | YES — cannot move forward if red |
| **Code commit** | Commit all Tue work (D1–D5, CAL-min, P-a, P-b, #2, deploy-pipeline) | Wed AM | No |
| **Prepare cosmetics** | Review C1–C7 (Fri 12 batch). Sketch code changes needed. | Wed PM | No (prep only) |

#### **Status: Wed 10 — 17:00 UTC**
- Smoke Test 1: ⬜ Mostly complete (failures being fixed in parallel)
- Fixes: 🔁 Rolling (as issues surface)

---

### **🚨 THU 11 JUN — BUFFER + FINAL PREP**

#### Owner: 🧍 YOU (founder)
| Task | What | Timeline |
|------|------|----------|
| **Verify all fixes** | Rerun any failed Smoke Test 1 tests | Morning |
| **Check warmup progress** | Verify ramp at ~30–40/day by Thu (should be on track for 50/day by Fri) | Morning |
| **DNS cache flush** | Verify all four domains (`app`, `api`, `admin`, `status`) resolve to Railway | Morning |
| **Prepare launch strategy** | Decide: which 2–3 design partners to approach first? Which LinkedIn contacts to warm outreach? | All day |

#### Owner: 🤖 CLAUDE (me)
| Task | What | Timeline | Blocker? |
|------|------|----------|----------|
| **Cosmetics C1–C7** | Implement all 7: ICP-above-People · agent card consistency · ICP banner · agent panels · ClickUp signup · New-ICP scroll · "Est. Pipeline Value" | All day | No (not blocking launch, but nice) |
| **VIDA-11** | Vida in-portal help bubble (bottom-right, reuse embed) | All day | No |
| **Code commit** | Commit cosmetics + VIDA-11 | EOD | No |

#### **Status: Thu 11 — 17:00 UTC**
- Smoke Test 1: ✅ All green
- Cosmetics: ⬜ Implemented, deployed
- Warmup: 🔄 On track

---

### **🚨 FRI 12 JUN — COSMETICS DEPLOYMENT**

#### Owner: 🤖 CLAUDE (me)
| Task | What | Timeline |
|------|------|----------|
| **Deploy cosmetics** | Merge C1–C7 + VIDA-11 to `main` → Railway auto-deploys | Morning |
| **Verify UI** | Portal load → check: ICP above People, agent cards, "Est. Pipeline", Vida bubble all live | Morning |
| **Test Vida bubble** | Click Vida bubble → chatbot opens → ask test question → Vida responds | Morning |

#### **Status: Fri 12 — 17:00 UTC**
- Cosmetics: ✅ Live
- Portal UX: ✅ Polished

---

### **🚨 SAT 13 JUN — SMOKE TEST 2 (FULL RE-RUN)**

#### Owner: 🧍 YOU (founder)
| Task | What | Timeline | Pass gate? |
|------|------|----------|-----------|
| **Fresh email** | Sign up with NEW email (not dogfood) | Morning | YES — must be new email (T1) |
| **Full path T1–T7** | Signup → onboard → dashboard → build ICP → source leads → FIGSY send → recipient reply → book meeting → buy credits → Vida widget → verify Milla cron | All day | YES — all tests must be green |
| **Log results** | "Smoke Test 2: T1 ✅, T2 ✅, T3 ✅, T4 ✅, T5 ✅, T6 ✅, T7 ✅" | EOD | YES — go/no-go gate |

#### **Status: Sat 13 — 17:00 UTC**
- Smoke Test 2: ✅ GREEN (gate passed)

---

### **🚨 SUN 14 JUN — LEGAL + DELIVERABILITY FINAL**

#### Owner: 🧍 YOU (founder)
| Task | What | Timeline |
|------|------|----------|
| **#10** | ICO registration (ico.org.uk £40) | Morning |
| **#11** | SR01 home-address suppression (free form) | Morning |
| **#12** | Registered office + director service address (~£20–50) | Morning |
| **#13** | WHOIS privacy verify (GoDaddy) | Morning |
| **#14** | LinkedIn lockdown (private, no K.I.N.D on profile) | Morning |
| **#9** | Verify Calendly `kind-ai-demo/new-meeting` live + `version.txt` deploy marker | Morning |
| **Warmup check** | Verify ~50/day by Sun (ready for full launch) | Morning |
| **Backup plan** | If warmup not ready, shift launch date to Mon 22 (but don't) — should be ready | EOD |

#### Owner: 🤖 CLAUDE (me)
| Task | What | Timeline | Blocker? |
|------|------|----------|----------|
| **D9** | Inbox-placement test (mail-tester.com or GlockApps) | Morning | **MUST BE 10/10** |
| **Fix gaps** | If test <10/10, fix remaining issues (headers, auth alignment, etc.) | Morning → Afternoon | YES — go/no-go gate |
| **Final commit** | Commit all Sun changes → push to `main` | EOD | No |

#### **Status: Sun 14 — 17:00 UTC**
- Legal: ✅ All items done
- Deliverability: ✅ 10/10 verified
- **GO/NO-GO GATE: PASS**

---

### **🚨 MON 15 JUN — BUFFER (slip absorption)**

#### Owner: 🤝 Both
| Task | What | Timeline |
|------|------|----------|
| **Spillover** | Any remaining fixes from Sun evening | Morning |
| **Final check** | Redeploy if any last-minute code pushed | Morning |
| **Plan Wed launch** | If any issues, what's the mitigation? (delay to Mon 22? unlikely) | All day |

#### **Status: Mon 15 — 17:00 UTC**
- All tests: ✅ Green
- All legal: ✅ Done
- Deliverability: ✅ Verified

---

### **🚨 TUE 16 JUN — DRESS REHEARSAL**

#### Owner: 🤝 Both
| Task | What | Timeline | Owner |
|------|------|----------|-------|
| **Fresh signup** | Founder signs up with NEW email (not dogfood, not test) | Morning | 🧍 |
| **Full campaign** | Build real ICP → source leads → send FIGSY → verify reply arrives → book meeting | All day | 🤝 |
| **Warmup review** | Check bounce rate, spam complaints. If >5% bounce, investigate. | Morning | 🧍 |
| **Set AUTO_OUTREACH_ENABLED** | Turn to `true` on Railway (default OFF → ON for launch) | Lunch | 🧍 |
| **Final checklist** | Go/No-Go gates: deliverability ✅, Smoke Test 2 ✅, legal ✅, warmup ✅, AUTO_OUTREACH ✅ | EOD | 🤝 |

#### **Status: Tue 16 — 17:00 UTC**
- **GO/NO-GO DECISION READY**

---

### **🚨 WED 17 JUN — FINAL FIXES + LAUNCH PREP**

#### Owner: 🤝 Both
| Task | What | Timeline | Owner |
|------|------|----------|-------|
| **Fix any rehearsal issues** | Anything found in dress rehearsal → fix same-day | All day | 🤖 |
| **Prep launch campaigns** | Decide: Week 1 outreach list (10 warm contacts) + LinkedIn schedule (1/day posts) | All day | 🧍 |
| **Verify all systems** | Portal, API, website all live and responsive | Morning | 🤖 |
| **Currency check** | Verify all pricing in USD, not Rand, not mixed | Morning | 🤖 |

#### **Status: Wed 17 — 17:00 UTC**
- Ready for launch

---

### **🚨 THU 18 JUN — GO/NO-GO FINAL DECISION**

#### Owner: 🤝 Both
| Decision Point | Criteria | Status | Decision |
|---|---|---|---|
| **Deliverability** | Mail-tester 10/10 OR inbox consistently Inbox (not Spam/Promotions) | ✅ | GO |
| **Smoke Test 2** | All T1–T7 green | ✅ | GO |
| **Legal** | All #10–#14 done | ✅ | GO |
| **Warmup** | ~50/day ramped, bounce <5%, complaints <0.5% | ✅ | GO |
| **Schema** | No enum errors, CRM dedup working | ✅ | GO |
| **Founder sign-off** | "I'm confident we launch Fri 19" | ⬜ PENDING | ??? |

#### **DECISION: GO/NO-GO (Founder + Claude consensus)**

If ALL green: **LAUNCH FRI 19 ✅**
If ANY red: **DELAY TO MON 22** (no half-baked launch)

#### **Status: Thu 18 — 17:00 UTC**
- **LAUNCH DECISION MADE**

---

### **🚀 FRI 19 JUN — LAUNCH DAY**

#### Owner: 🤝 Both
| Task | What | Timeline | Owner |
|------|------|----------|-------|
| **Final deploy** | Verify latest code on Railway (no pending commits) | 08:00 | 🤖 |
| **Monitor systems** | API / Portal / Website all responsive (no 500 errors) | 08:00 | 🤖 |
| **Set AUTO_OUTREACH_ENABLED=true** | Cold emails now go out (if not already set Tue 16) | 08:00 | 🧍 |
| **Day 1 warmup check** | First warm outreach (10 network contacts) | 09:00 | 🧍 |
| **Monitor replies** | Watch for inbound prospects + Portal notifications | All day | 🧍 |
| **Commit launch marker** | Git commit: "🚀 Launch: Fri 19 Jun 2026" → push to main | 17:00 | 🤖 |
| **Celebrate** | You earned it | Evening | 🤝 |

#### **Status: Fri 19 — 17:00 UTC**
- 🚀 **LIVE**

---

## 🚨 CRITICAL DEPENDENCIES (do not skip)

| Blocker | Why | Caused By | If Missed |
|---------|-----|-----------|-----------|
| **D6–D8 (cold domain + DNS + warmup)** | Mail goes to spam without proper setup | Founder infra | Launch fails (all mail bounces) |
| **D1–D5 (List-Unsubscribe + plain-text + tracking pixel fix)** | Gmail/Yahoo auto-spam since Feb 2024 | Code | Launch fails (mail filtered) |
| **CAL-min (`booking_url` paste field)** | T3/T4 tests need non-Google calendar support | Code | Smoke Test 1 hangs on T3/T4 |
| **#6 (CRM dedup migration)** | T5 billing test needs clean data | DB | Smoke Test 1 fails on T5 |
| **#7 (Denise Stripe price)** | T5 needs the price ID | Founder + code | Smoke Test 1 fails on T5 |
| **#7/8 (DNS: app/api/admin/status + NEXT_PUBLIC_API_URL)** | Portal routing breaks without proper DNS | Founder infra | Portal 404s when accessing from new domains |
| **Smoke Test 1A (Tue 9)** | Must run before Smoke Test 2 | Tests | Cannot proceed to T4–T7 if T1–T3 fail |
| **Smoke Test 2 (Sat 13)** | Go/No-Go gate for launch | Tests | If red, delay launch to Mon 22 |
| **D9 (inbox-placement 10/10)** | Final deliverability verification | Code + founder | If <10/10, fix gaps Sun morning or delay |
| **Warmup ramp (2–3 wks, started Mon 8)** | Mail reputation takes time to build | Founder ops | If ramp not done by Fri 19, mail still goes to spam |

---

## 📊 TRACKING (tick off daily)

```
MON 8 JUN:   D1–D5 🔨(built,unverified) D6–D8 ⬜ TIER-0 deferred FounderEnv ✅set
TUE 9 JUN:   #1✅ #6✅ #7✅ #7/8✅ CAL-min✅ P-a⬜ P-b⬜ #2⬜ Deploy⬜ T1-3⬜
WED 10 JUN:  T4⬜ T5⬜ T6⬜ T7⬜ #17⬜
FRI 12 JUN:  C1-C7⬜ VIDA-11⬜ Deploy✅
SAT 13 JUN:  SMOKE TEST 2 ⬜
SUN 14 JUN:  Legal✅ D9⬜
MON 15 JUN:  Buffer⬜
TUE 16 JUN:  Dress rehearsal⬜
THU 18 JUN:  GO/NO-GO ⬜
FRI 19 JUN:  🚀 LAUNCH ⬜
```

---

## 🎯 SUCCESS METRICS

- ✅ Deliverability: Mail-tester 10/10
- ✅ Smoke Test 2: All T1–T7 green
- ✅ Fresh email works end-to-end
- ✅ FIGSY sends + prospect replies + reply lands 🔥 Hot
- ✅ Founder can demo to real prospect without errors
- ✅ All legal done (ICO, SR01, registered office, WHOIS, LinkedIn)
- ✅ Warmup: ~50/day ramped, bounce <5%, complaints <0.5%

---

**Document Version:** 7 Jun 2026
**Last Updated:** (you update this daily as you progress)
**Audience:** Founder + Claude (session context)

# ═══════════════════════════════════════════════════════════════
# CHAPTER 3 — ALL 96 BUILDS (#1–96)
# ═══════════════════════════════════════════════════════════════


> **Master reference for every build, item, owner, timeline, and status.**
> Review this to see the full 18-month roadmap at a glance.
> Owner: 🧍 Founder · 🤖 Claude · 🤝 Both.
> Status: ⬜ TODO · 🔨 BUILT (code-done, NOT deployed/verified) · 🧪 IN TEST · ✅ DONE & VERIFIED LIVE · ⏸ GATED · 🚫 WON'T BUILD

---

## 🚀 PHASE 0 — PRE-LAUNCH (Mon 8 Jun → Fri 19 Jun)

| # | Item | What | Owner | Status | Timeline | Blocked By |
|---|------|------|-------|--------|----------|-----------|
| **D1–D5** | Deliverability code fixes | List-Unsubscribe + one-click · plain-text MIME · tracking pixel fix · cold-FROM config · transactional plain-text | 🤖 | 🔨 BUILT (commit `96456ac`; NOT deployed/verified) | Mon 8 | None |
| **D6–D8** | Deliverability founder infra | Buy cold domain(s) · SPF/DKIM/DMARC · verify Resend · start warmup (5→50/day) · verify `API_URL` + get-kind.com auth | 🧍 | 🔄 | Mon 8–Sun 14 | None |
| **D9** | Inbox-placement test | mail-tester.com / GlockApps → verify 10/10 score | 🤖 | ⬜ | Sun 14 | D1–D5 + D6–D8 |
| **#1** | TIER-0 credential rotation | Stripe secret · Supabase service-role · DATABASE_URL · anon · Anthropic · Resend×2 · HubSpot · Admin secret · Stripe webhook (Apollo ✅) | 🧍 | 🔄 | Mon 8 – Tue 9 | None |
| **#2** | Delete Portal-V2 + flag | Remove dormant `FEATURE_PORTAL_V2` build + flag (breaks if flipped) | 🤖 | ⬜ | Tue 9 | None |
| **#3** | Dogfood account (hello@get-kind.com) | ✅ DONE 6 Jun — all 4 agents, 999,999 credits, subscriptions to 2099 | ✅ | ✅ | ✅ | — |
| **#4** | Grant FIGSY + credits (dogfood) | ✅ DONE 6 Jun via SQL | ✅ | ✅ | ✅ | — |
| **#6** | Migration `010_crm_dedup.sql` | Run in Supabase (before real clients) | 🧍 | ⬜ | Tue 9 | None |
| **#7** | Denise Stripe price ($99/mo) | Create product + recurring price → `STRIPE_PRICE_DENISE_MONTHLY` env var + redeploy | 🤖 + 🧍 | ⬜ | Tue 9 | None |
| **#7/8** | DNS: app/api/admin/status.get-kind.com | Railway CNAMEs + update `NEXT_PUBLIC_API_URL` (Portal/Admin) + Resend webhook | 🧍 | ⬜ | Tue 9 | None |
| **#9** | Confirm Calendly + `version.txt` | Verify `kind-ai-demo/new-meeting` live · ensure deploy marker works | 🧍 | ⬜ | Sun 14 | None |
| **#10** | ICO registration (£40) | ico.org.uk before launch | 🧍 | ⬜ | Sun 14 | None |
| **#11** | SR01 suppression | Home-address removal (free) | 🧍 | ⬜ | Sun 14 | None |
| **#12** | Registered office + service address | ~£20–50/yr (e.g., Speednames) | 🧍 | ⬜ | Sun 14 | None |
| **#13** | WHOIS privacy verify | Hide director name on GoDaddy | 🧍 | ⬜ | Sun 14 | None |
| **#14** | LinkedIn lockdown | Private profile, no K.I.N.D, no outreach requests | 🧍 | ⬜ | Sun 14 | None |
| **#15** | Smoke Test 1 (57-step) | T1–T7 full run: signup, ICP, leads, FIGSY send, reply, booking, billing, Vida, Milla | 🧍 | ⬜ | Tue 9 – Wed 10 | #7, CAL-min |
| **#16** | Smoke Test 2 (full re-run) | Clean T1–T7 with fresh email | 🧍 | ⬜ | Sat 13 | #15 green |
| **#17** | Fix smoke failures same-day | Any red from #15 or #16 → fix immediately | 🤖 | ⬜ | Wed 10 (if needed) | #15 results |
| **#17b** | Outcome-event data floor | ✅ DONE — append-only log (send/reply/opt_out/meeting_booked), fire-and-forget | ✅ | ✅ | ✅ | — |
| **#18** | LAUNCH **Africa-only** (US deferred) | Transactional live from `get-kind.com`, cold ramped from warmup domain | 🤝 | ⬜ | **Fri 19 Jun** | All above green |
| **CAL-min** | `booking_url` paste field | Non-Google calendar clients (pre-launch min) | 🤖 | ⬜ | Tue 9 | None |
| **P-a** | "Sign emails as {name}" setting | Stop AI-invented signers (Thandeka/Thabo) | 🤖 | ⬜ | Tue 9 | None |
| **P-b** | Strip `BUILD MARKER` debug | API startup log cleanup | 🤖 | ⬜ | Tue 9 | None |
| **C1–C7** | Cosmetics batch (Fri 12) | ICP-above-People · agent cards · ICP banner · agent panels · ClickUp signup · New-ICP scroll · "Est. Pipeline Value" | 🤖 | ⬜ | Fri 12 | None |
| **VIDA-11** | Vida in-portal help bubble | Bottom-right, reuses existing embed (basic pre-launch) | 🤖 | ⬜ | Fri 12 | None |
| **Deploy pipeline** | Fix `KIND System Audit` GitHub Action | Failing on every push, blocks Railway auto-deploy | 🤖 | ⬜ | Tue 9 | None |

**PRE-LAUNCH TOTAL:** 28 items, all critical.

---

## 📍 PHASE 1 — WEEK 1 POST-LAUNCH (Jun 19–28)

| # | Item | What | Owner | Status | Timeline | Notes |
|---|------|------|-------|--------|----------|-------|
| **#19** | 10 warm outreach messages | Network → seed launches + accelerators | 🧍 | ⬜ | Week 1 | Quick wins |
| **#20** | LinkedIn content 1/day | Anonymous brand handle | 🧍 | ⬜ | Week 1 ongoing | Thought leadership |
| **#21** | LinkedIn outreach activation | Run `20260602_linkedin_queue.sql` + PhantomBuster keys | 🧍 | ⬜ | Week 1 | Distribution unlock |
| **#22** | Meta/WhatsApp API application | Start 3–7 day approval window | 🧍 | ⬜ | Week 1 | Pipeline |
| **#23** | Record real product demo | "Shoot once, cut many" (16:9 + 9:16) — use Pixar family prominently | 🧍 | ⬜ | Week 1 | Warmth moat |
| **#24** | Replace homepage hero animation | Real product loop (blocked on #23) | 🤖 | ⏸ | Week 1 | Authenticity |
| **#25** | Instrument GTM funnel | Channel → reply → demo → close · CAC · trial→paid | 🤝 | ⬜ | Week 1 | Data for Month 2 |
| **#26** | Dogfood self-outreach + competitor ICP | Eat own dogfood, prove product | 🧍 | ⬜ | Week 1 | Proof |
| **#27** | Daily client briefing email | Apex steal · quick win | 🤖 | ⬜ | Week 1 | Engagement |
| **#28** | Pre-launch fresh-signup check | Verify real onboarding (smoke test used dogfood) | 🧍 | ⬜ | Week 1 | Validation |

**WEEK 1 TOTAL:** 10 items.

---

## 📍 PHASE 2 — WEEKS 2–4 (Jun 29 – Jul 19)

| # | Item | What | Owner | Status | Timeline | Notes |
|---|------|------|-------|--------|----------|-------|
| **#29** | 2 design-partner slots | Case study + logo (early proof) | 🧍 | ⬜ | Weeks 2–4 | Social proof |
| **#30** | Cut 9:16 social content | TikTok/Reels from demo footage | 🤖 | ⬜ | Weeks 2–4 | Distribution |
| **#31** | Record 3 onboarding Looms | Customer education | 🧍 | ⬜ | Weeks 2–4 | Reduce churn (Revio moat) |
| **#32** | Onboarding v2 + day-0/3/7 email | Reduce churn | 🤖 | ⬜ | Weeks 2–4 | Engagement |
| **#33** | Populate proof block with real data | Do NOT fabricate — hold slot, populate with real results | 🤖 | ⬜ | Weeks 2–4 (wait for results) | Honesty |
| **#34** | Activate Flutterwave | Needs key (ZAR/NGN/KES/GHS) | 🧍 | ⏸ | Weeks 2–4 | Africa-first revenue |
| **#35** | Launch YouTube channel | 10-video plan exists | 🧍 | ⬜ | Weeks 2–4 | Long-tail SEO |
| **#36** | Wire playbook email form | ConvertKit/Mailchimp | 🤖 | ⬜ | Weeks 2–4 | Lead magnet |
| **#61a** | Performance-guarantee clause | Terms.html + ToS: "90-day results or you don't pay" (Atlas steal) | 🤖 | ⬜ | Weeks 2–4 | Confidence signal |
| **#61e** | Influencer/community distribution | Find SA + US equivalents of Dan Martell (Worth more than seed round) | 🧍 | ⬜ | Weeks 2–4 ongoing | Distribution moat |
| **#61g** | Guarantee sharpened to 90d | Messaging adjustment | 🤖 | ⬜ | Weeks 2–4 | Messaging |
| **#62b** | "Revenue Playbook Session" bundled | 30-min call during onboarding (Revio moat + coaching layer) | 🤖 | ⬜ | Weeks 2–4 | Churn reduction |
| **#62c** | Homepage outcome numbers | Specific client results (real data only) | 🤖 | ⏸ | Weeks 2–4 (wait for data) | Proof |
| **#62d** | "Revenue Blueprint Session" CTAs | ✅ DONE — 29 CTAs renamed | ✅ | ✅ | ✅ | — |
| **#62e** | Vertical landing pages | Estate agents, brokers, advisers (SA + US) + case studies (Revio moat) | ✅ | ✅ (Africa) | Weeks 2–4 (US) | Specialisation |
| **#80** | **Speed-to-lead: Vida → instant FIGSY/Denise handoff** (Atlas steal) | When Vida captures an inbound lead, auto-hand it to FIGSY (or Denise) immediately — no manual seam. Atlas's core principle: conversion drops ~80% if a lead isn't contacted within 5 min; 40% of leads arrive nights/weekends. Build: on Vida lead-capture event → trigger instant FIGSY enrol / first-touch (respecting suppression + opt-out + AUTO_OUTREACH gate). Inbound path, NOT cold outbound. | 🤖 | ⬜ | Weeks 2–4 (needs inbound traffic + Vida configured) | Atlas's one operating principle that upgrades our funnel. Vida + FIGSY both already built — this is the wiring between them. |
| **#81** | **Milestone/outcome share-to-LinkedIn cards** (Monday growth-loop steal) | Celebratory shareable card on real client milestones ("FIGSY booked your 10th meeting 🎉", "1,000 leads sourced this month") with a **Share on LinkedIn** button. Reuses existing **shareable dashboards**. Adapt Monday's loop: trigger on OUTCOMES, not a vanity "creator" badge (wrong audience for SMB owners). Premium dark card, warm Pixar-family styling. Free distribution that fits the invisible-founder model (brand spreads via clients, not founder). Feeds #62c real outcome numbers. | 🤖 | ⬜ | Weeks 2–4 (needs real client results) | V2-7 growth-loop family. Monday validated the mechanic. |
| **#82** | **"Certified K.I.N.D Partner" badge + LinkedIn share** (Monday steal, partner-adapted) | The cert mechanic done for the audience it actually works on: agencies/resellers in the **Partner Programme** get a shareable "Certified K.I.N.D Partner" badge → Share on LinkedIn. Partners genuinely want credentials to sell with. Premium dark card, Pixar-family styling. | 🤖 | ⬜ | Weeks 2–4 / Month 2 (needs Partner Programme active) | Right audience for a cert (vs end-clients). Distribution via partner networks. |

**WEEKS 2–4 TOTAL:** 17 items.

---

## 📍 PHASE 3 — MONTH 2 (Late Jul – Aug, GATED: 10+ clients)

**PREREQUISITE:** Set up staging environment (Part 4B) before any V2 touches main.

### Intelligence Layer (#37–53)

| # | Item | What | Owner | Status | Timeline | Why / Signal |
|---|------|------|-------|--------|----------|--------------|
| **#37** | Intent signal detection | Which leads are ready to buy (not just interested) | 🤖 | ⬜ | Month 2 | Amplemarket moat · reduce wasted outreach |
| **#38** | A/B subject testing | Auto-pick winning subject line per campaign | 🤖 | ⬜ | Month 2 | Monday/ClickUp testing · personalization = conversion |
| **#39** | Client morning-brief email | Daily summary: lead activity, reply rates, anomalies (Apex/S4 steal) | 🤖 | ⬜ | Month 2 | Engagement hook |
| **#40** | ICP auto-refinement (L2 learning) | Monthly AI review: refine ICP based on actual replies (no user touching builder) | 🤖 | ⬜ | Month 2 | Glean "context wins" + our outcome data moat |
| **#41** | Conditional sequence branching | "If no reply in 5d, escalate." Auto-responses. | 🤖 | ⬜ | Month 2 | Monday/ClickUp automation |
| **#42** | Waterfall enrichment | Apollo → PDL → Hunter → Clearbit (needs keys) | 🤖 | ⏸ | Month 2 | Clay moat · enterprise richness for SMB price |
| **#43** | Deliverability dashboard | SPF/DKIM/DMARC + bounce + blacklist (live monitoring) | 🤖 | ⬜ | Month 2 | Transparency = trust |
| **#44** | Email score pre-send | AI scores subject + body for spam signal before send | 🤖 | ⬜ | Month 2 | MailerLite moat · reduce complaints |
| **#45** | Adaptive send volume | Ramp based on reply rate (not fixed 20/day) | 🤖 | ⬜ | Month 2 | Instantly moat · responsive to feedback |
| **#46** | FIGSY Memory v2 (pgvector) | Semantic embeddings (episodic / long-term / preference) | 🤖 | ⬜ | Month 2 | **Our moat.** L2 learning needs pgvector. |
| **#47** | Milla full-context CRM pull | Milla reads Pipedrive/HubSpot history when writing | 🤖 | ⬜ | Month 2 | Glean moment · context always wins |
| **#48** | Vapi voice calling → **DENISE's channel** | **DENISE** (closer) dials to confirm/close (built `lib/vapi.ts`, re-attribute from FIGSY → Denise) | 🔨 | ⬜ | Month 3 (with #54 Denise) | Voice = higher conversion · Denise = our "Alex" |
| **#49** | Product Hunt launch | With 2–3 design-partner case studies | 🤖 | ⬜ | Month 2 | Proof · network effect |
| **#50** | G2 listing (5 reviews) | Social proof · SMB buying signal | 🤖 | ⬜ | Month 2 | Competitive hygiene |
| **#51** | Configurable agent triggers | "Send after X days" "Escalate if human reply" — power users unlock value | 🤖 | ⬜ | Month 2 | Monday/ClickUp depth |
| **#52** | Multi-model toggle per campaign | "Use Opus for this ICP, Sonnet for that" — cost optimization | 🤖 | ⬜ | Month 2 | Experimentation · margin |
| **#53** | Inbox rotation / multiple sending domains | Auto-rotate domains to evade spam filters (Instantly steal) | 🤖 | ⬜ | Month 2 | Deliverability on steroids |
| **#59 (pulled fwd)** | **MCP server** (distribution unlock) | Expose one endpoint: "Start FIGSY campaign." Notion/Linear/Slack agents call it. | 🤖 | ⬜ | Month 2 | **MCP is distribution.** Glean/Notion/Linear all wired it. (Was Month 3, moved to M2.) |

### V2 Portal Redesign (#V2-1 through #V2-13)

| # | Item | What | Owner | Status | Timeline | Priority |
|---|------|------|-------|--------|----------|----------|
| **V2-1** | Agent card grid | Dashboard home: replace left-nav + empty space with card grid (all 4 agents) | 🤖 | ⬜ | Month 2 | High |
| **V2-2** | Agent thinking state | Show when working ("Writing 17 emails…") — transparency | 🤖 | ⬜ | Month 2 | High |
| **V2-3** | Conversational agent setup | Chat with Casey instead of forms ("Tell me your ICP" → agent clarifies). **Priority bumped Medium→High** — monday Vibe validated prompt-to-build as the market direction. | 🤖 | ⬜ | Month 2 | **High** |
| **V2-4** | Structured agent config panel | Clean cards: Role/ICP/Tone/Schedule/Knowledge (replace dense text) | 🤖 | ⬜ | Month 2 | Medium |
| **V2-5** | Agent marketplace | "Meet your AI Revenue Team" (Month 3+, gated on volume) | 🤖 | ⏸ | Month 3 | Medium |
| **V2-6** | Slim sidebar + top-right header | Profile/Billing/Settings/Team in dropdown (Notion/Linear style) | 🤖 | ⬜ | Month 2 | High |
| **V2-7** | Invite teammate / growth loop | "Invite your co-founder" modal in header (referral structure) | 🤖 | ⬜ | **PULLED → #88 sprint (~Fri 26)** | High |
| **V2-8** | **AI Notetaker → action items (Milla)** | Milla reads all portal activity → nightly: "Here's what happened, 3 actions" (Glean moment) | 🤖 | ⬜ | Month 2 | **Critical** |
| **V2-9** | **Teams Hub** = the #88 **owner command centre** | Members, activity, per-person usage (admin oversight) | 🤖 | ⬜ | **PULLED → #88 sprint (~Fri 26)** | **Critical** |
| **V2-10** | **Casey — Onboarding agent** | Non-family support bot (ClickUp-style + Revio coaching model). Portal only. Warm Pixar 3D. | 🤖 | ⬜ | Month 2 | High |
| **V2-11** | **Vida in-portal help bubble** | Bottom-right, context-aware, pulls live data (basic pre-launch Fri 12, deep Month 2) | 🤖 | ⬜ | Month 2 | **Critical** |
| **V2-12** | **Strong client dashboards** | Monday-style: ICP cards · campaign perf · pipeline value · credit usage · trends. **+ Goals (ClickUp steal):** client KPI targets with progress ("book 10 meetings this month") folded in — NOT a standalone module. | 🤖 | ⬜ | Month 2 | Critical |
| **V2-13** | **Multi-provider calendar** (→ #88 **per-rep calendars**) | **(a)** Outlook/Zoho/Calendly OAuth · **(b)** agent-led onboarding (Casey asks "Google or Outlook?") · **(c)** each rep connects their OWN calendar | 🤖 | ⬜ | **PULLED → #88 sprint (~Fri 26)** | Critical |
| **#83** | **Embeddable lead-capture Forms** (ClickUp steal, revenue-adapted) | A simple embeddable lead-capture form (NOT a survey tool). A submission is another inbound trigger that hands straight to FIGSY/Denise — pairs with Vida + **#80 speed-to-lead**. Stays on-strategy (revenue surface, not generic forms). | 🤖 | ⬜ | Month 2 | Feeds funnel |
| **#84** | **Integrations Hub** (ClickUp "Apps" steal) | One clean screen for all connections: HubSpot · Pipedrive · Calendar (Google/Outlook/Zoho) · WhatsApp · LinkedIn. Today they're scattered. This is where V2-13 calendar OAuth naturally lives. | 🤖 | ⬜ | Month 2 | UX consolidation |

**MONTH 2 TOTAL:** 38 items (Intelligence 18 + MCP 1 + V2 17 + Forms/Integrations 2).

#### 🏗️ V2 IMPLEMENTATION MAP — how we actually build it
> Not starting from zero: a V2 design doc (`docs/portal-v2-layout.md`), a `(v2)/v2`
> route scaffold, and a `FEATURE_PORTAL_V2` flag already exist. Effort: S≈1d, M≈2–3d, L≈4–5d.
> 🤖 = Claude builds the code · 🧍 = founder input/asset. **Same map format used for every
> other future workstream in Chapter 5.**

**⚠️ Hard prerequisite — STAGING ENV (before any V2 touches prod):** Supabase staging
project + Railway staging services + a `staging` branch auto-deploying there. You can't
rebuild the cockpit under live clients. ~1 day (🧍 provisions Supabase/Railway, 🤖 wires branch+deploy).

| Phase | Items | Size | Needs from 🧍 |
|-------|-------|------|--------------|
| **A — Shell (unblocks all)** | V2-6 slim sidebar+header · V2-1 agent card grid · V2-12 strong dashboards | M·M·L | — |
| **B — Wow/engagement** 🔴 | V2-2 thinking states · **V2-8 Milla notetaker→actions** · **V2-11 Vida bubble (deep)** | S·L·M | — |
| **C — Onboarding (anti-churn)** | V2-10 Casey agent · V2-3 conversational setup · V2-4 config panel | M·M·M | **`casey.png` avatar** |
| **D — Team & growth** 🔴 | V2-7 invite teammate · **V2-9 Teams Hub** | S·M | — |
| **E — Integrations** 🔴 | **V2-13 multi-provider calendar (Outlook/Zoho OAuth)** · #83 Forms · #84 Integrations Hub | L·M·M | **OAuth app creds (MS/Zoho)** |
| **(Month 3)** | V2-5 agent marketplace | M | — |

**Build order:** A → B → C → D → E (Phase A unblocks everything). **~5–6 wks** at one focused agent = fits the Month-2 window.
**Dependencies:** V2-3 needs V2-10 (Casey) · V2-9 needs V2-7 · everything needs the shell (A).
**Open decisions (founder):** (1) dormant `/dashboard/v2` build — delete + rebuild fresh *(lean)* vs assess & build on it? (2) staging — provision now vs at the 10-client gate? (3) pull any V2 item forward to sharpen the launch demo (V2-1/V2-12 are high-visibility)? (4) sequencing — is A→E right, or Teams Hub first if chasing agencies?

---

## 📍 PHASE 4 — MONTH 3 (Late Aug – Sep, GATED: family build + margin data)

| # | Item | What | Owner | Status | Timeline | Gated By | Why |
|---|------|------|-------|--------|----------|----------|-----|
| **#54** | **DENISE deep build (#1 agent)** | Calendly auto-book · call-join transcription/notetaker · live objection extraction · proposal-from-transcript · pipeline follow-up · persona/system prompt · admin card. **Build deep or don't ship.** | 🤖 | ⏸ | Month 3 | 10+ clients + margin data | Closes FIGSY → booked seam. Max leverage (extends existing pipeline, no new front). |
| **#55** | **LENA — Customer Success** (back agent, like Casey) | Post-sale: retention · renewals · upsell · churn prevention. Once DENISE solid | 🤖 | ⏸ | Month 3 | DENISE complete | Closes the lifecycle (Alta's CS column) |
| **#56** | **TONY** | Once LENA solid | 🤖 | ⏸ | Month 3 | LENA complete | Operations loop |
| **#57** | Multi-agent orchestration (shared memory) | FIGSY → DENISE → Milla handoff + context | 🤖 | ⏸ | Month 3 | DENISE + LENA + TONY | Platform moat |
| **#58** | 500+ FIGSY skill library | Prompt library: "Open doors with competitive intel" "Negotiate discounts" etc. | 🤖 | ⏸ | Month 3 | FIGSY stable | ClickUp 500+ work skills depth |
| **#60** | **Outcome pricing** (per meeting booked) — GATED | Build only after margin data proves ≥28% gross. Pure outcome model ($40/meeting, K.I.N.D eats failed outreach). | 🤖 | ⏸ | Month 3+ | ≥28% gross margin data | Salesforce + Intercom proved the model. (Was blocked, now gated on margin.) |
| **#61** | Mobile app (iOS + Android) | Nice-to-have if MRR >£8K | 🤖 | ⏸ | Month 3+ | Volume | Competitive hygiene |
| **#62** | Built-in CRM (persistent prospect DB / Kanban deal view) | FIGSY stores every prospect she touches. Clients see Kanban (leads → replied → booked → closed). | 🤖 | ⏸ | Month 3+ | Volume | Monday/ClickUp/Linear CRM (nice-to-have) |
| **#63** | Pan-African design partners | Deepen regional presence (NG/KE/GH/EG/RW) | 🧍 | ⏸ | Month 3 | Volume | Our specialisation lane |
| **#64** | Platform-level cross-client intelligence (L4 moat) | Benchmarks: "You're 80th percentile" + predictive ICP. | 🤖 | ⏸ | Year 2+ | 50+ clients + L2/L3 working | **Glean's enterprise moat, adapted to SMB.** Real long-term differentiation. |
| **#65** | Data licensing marketplace | Sell anonymised outcome data (reply rates, angles, verticals, regions). | 🤖 | ⏸ | Year 2+ | Data volume + ethics review | New revenue stream |
| **#66** | ICP auto-refinement advanced (L3) | Real-time: as replies come in, refine ICP automatically. | 🤖 | ⏸ | Year 2+ | Data moat | Data moat |
| **#67** | Pipeline forecasting | "Given reply rate + deal size, close X by Q4." | 🤖 | ⏸ | Year 2+ | Data depth | Linear insight (product intelligence) |
| **#68** | In-portal messaging | Slack-style chat for team (FIGSY, Milla, humans, clients). | 🤖 | ⏸ | Year 2+ | Volume | Monday/Notion collab |
| **#69** | Proposal + e-sign | DENISE drafts → client signs in portal. | 🤖 | ⏸ | Year 2+ | DENISE complete | Salesforce moat |
| **#70** | Meeting notetaker | Auto-transcribe Zoom (client + prospect). Extract objections live. | 🤖 | ⏸ | Year 2+ | Volume | Glean/Linear moat |

**MONTH 3 TOTAL:** 17 items.

---

## 📍 PHASE 5 — YEAR 2 (Enterprise, Certifications)

| # | Item | What | Owner | Status | Timeline | Gated By |
|---|------|------|-------|--------|----------|----------|
| **#71** | ISO 27001 | Enterprise compliance (~£15–25k) | 🧍 | ⏸ | Year 2 | Enterprise sales signal |
| **#72** | ISO 42001 (AI Governance) | Enterprise compliance (~£10–15k) | 🧍 | ⏸ | Year 2 | Enterprise + AI regulation |
| **#73** | SOC 2 Type II | Enterprise compliance (~$50k, Vanta) | 🧍 | ⏸ | Year 2 | Enterprise sales signal |
| **#74** | Vanta triple-cert | ISO 27001 + 42001 + SOC 2 (~70% shared controls) | 🧍 | ⏸ | Year 2 | Enterprise sales signal |
| **#75** | 3-type memory model | Episodic / long-term / preference (sophistication after pgvector M2) | 🤖 | ⏸ | Year 2 | pgvector + volume |
| **#76** | Visitor de-anonymisation | Clearbit (see who's on website before signup) | 🤖 | ⏸ | Year 2 | Key needed |
| **#77** | Churn-risk scoring | Predict which clients will churn | 🤖 | ⏸ | Year 2 | Data depth |
| **#78** | Revenue forecasting | Predict pipeline close timing | 🤖 | ⏸ | Year 2 | Data depth |
| **#79** | Call intelligence | Auto-transcribe + analyze calls | 🤖 | ⏸ | Year 2 | Volume + Vapi integration |

**YEAR 2 TOTAL:** 9 items.

---

## 🔒 ONGOING / PARALLEL (trigger-based, non-phase)

| Item | What | Owner | Timeline |
|------|------|-------|----------|
| **Legal (Part 2)** | D&O insurance (~£500–1k M2) · ODPC Kenya / NDPR (first NG/KE client) · AI Risk Register (start now) · pen test (~£2–5k M3) · trademarks K.I.N.D+FIGSY+Milla+Vida (~£320 M2–3) · IR35/contractor IP (first hire) · SeedLegals IP (~£600 at raise) · VAT at £90k · annual filings | 🧍 | Ongoing |
| **Funding (Part 5C)** | F1 cloud credits (NOW) → F2 SA ecosystem (5–10 clients) → F3 YC (paying clients) → F4 revenue financing (predictable MRR) → F5 influencer (ongoing). Revisit at 20–30 clients. | 🧍 | Ongoing |
| **Tech-debt** | Delete Portal-V2 · Apollo keyword picker · tighten ICP prompt · admin proxy URL · commit signing | 🤖 | Ongoing |
| **MASTER.md cleanup** | 15 contradictions (Part 8) — Vercel refs, launch-day, Vida price, pricing tables, cron count, LinkedIn "never" (built!), duplicates, Calendly link, done/pending, cashflow, us.app, eu-west-1, fake "built" routes, old smoke test | 🤖 | After launch |
| **Competitive watch** | Monitor Revio (B2B cold outbound roadmap). Hold specialisation lane. Use warmth window NOW. | 🧍 | Ongoing |

---

## 🚫 WILL NOT BUILD

Collaborative docs · whiteboards · self-hosted · custom emoji · internal team chat · multi-year contracts · 50+ data sources (before 50+ clients) · African-language (after WhatsApp).

---

## 📊 SUMMARY BY PHASE

| Phase | Count | Timeline | Status |
|-------|-------|----------|--------|
| **Phase 0** (pre-launch) | 28 | Mon 8 – Fri 19 Jun | 🔄 In progress |
| **Phase 1** (Week 1) | 10 | Jun 19–28 | ⬜ Pending |
| **Phase 2** (Weeks 2–4) | 17 | Jun 29 – Jul 19 | ⬜ Pending |
| **Phase 3** (Month 2) | 38 | Late Jul – Aug | ⏸ Gated on 10+ clients |
| **Phase 4** (Month 3) | 17 | Late Aug – Sep | ⏸ Gated on margin data |
| **Phase 5** (Year 2) | 9 | 2027 | ⏸ Enterprise only |
| **Ongoing** | 5 | Parallel | 🔄 Continuous |
| **Won't build** | — | — | 🚫 Out of scope |
| **TOTAL** | **101** | — | — |

---

## 🎯 CRITICAL DEPENDENCY MAP

```
LAUNCH (Fri 19) ←
  ├─ Smoke Test 2 green (Sat 13) ←
  │   ├─ Smoke Test 1A green (Tue 9–Wed 10) ←
  │   │   ├─ CAL-min (#booking_url) (Tue 9)
  │   │   ├─ #7 (Denise Stripe price) (Tue 9)
  │   │   ├─ #6 (migration 010) (Tue 9)
  │   │   └─ D1–D5 deployed (Tue 9)
  │   └─ T4–T7 all pass
  ├─ D9 (inbox-placement 10/10) (Sun 14) ←
  │   ├─ D1–D5 deployed
  │   └─ D6–D8 (warmup ramp started Mon 8)
  ├─ Legal #10–#14 (Sun 14)
  └─ AUTO_OUTREACH_ENABLED=true (Fri 19)

MONTH 2 INTELLIGENCE (37–53) ←
  └─ 10+ clients (gated)

MONTH 2 V2 PORTAL (V2-1 through V2-13) ←
  └─ Staging environment set up

MONTH 3 DENISE (#54, #1 next) ←
  └─ 10+ clients + margin data (≥28% gross)

MONTH 3 OUTCOME PRICING (#60) ←
  └─ Margin data ≥28%

YEAR 2 ENTERPRISE (#71–79) ←
  └─ 50+ clients + revenue stable
```

---

## 🔄 HOW TO USE THIS DOCUMENT

1. **Review before each phase:** "What's next? What are the gates?"
2. **Track progress:** Mark items ✅ as they complete, update `Status` column
3. **Watch for gates:** If a downstream item is blocked, find the upstream item that's red
4. **Align with team:** "This phase needs X from founder, Y from Claude. Which week?"
5. **Quarterly review:** Every 3 months, reconcile this against EVERYTHING.md + SESSION-HANDOFF

---

**Document Version:** 7 Jun 2026
**Next Update:** After Smoke Test 2 passes (Sat 13 Jun)
**Audience:** Founder + Claude (session context)

# ═══════════════════════════════════════════════════════════════
# CHAPTER 4 — OPERATIONS, LEGAL, INFRA & BUILT INVENTORY
# ═══════════════════════════════════════════════════════════════


> **The 4th reference doc.** Covers what the roadmap docs deliberately leave out:
> Legal rings (full detail), staging environment (step-by-step), recurring operations,
> blocked-on-credentials inventory, full built inventory, and the financial targets.
>
> **Companion to:**
> - `STRATEGIC-ROADMAP-19JUN-2026.md` (strategy + competitive)
> - `DAILY-ACTION-PLAN-TO-LAUNCH.md` (day-by-day tactical)
> - `ALL-BUILDS-TIMELINE-96-ITEMS.md` (every build #1–96)
>
> Source: EVERYTHING.md Parts 2, 3, 4, 4B, 7 + NUMBERS table.

---

# PART A — ⚖️ LEGAL & COMPLIANCE (4 RINGS, FULL DETAIL)

> The legal posture is structured as 4 concentric "rings" — from the founder's personal
> shield outward to contractual/IP. Each ring has what's ✅ locked and what's ⬜ still open.

## 🔵 RING 1 — Corporate & Personal Shield

**Purpose:** Protect the founder personally. Limit liability. Keep the founder's identity
out of the customer-facing brand (deliberate "invisible founder" decision).

### ✅ LOCKED
- **Ltd company formed** — Company number **17260532**, England & Wales
- **Limited-liability shield** in place (company, not founder, bears liability)
- **Employment ring-fence** — after-hours / personal-kit separation; the founder's employer employment
  clause 17.2 reviewed + accepted (no conflict with current employment)
- **`docs/legal/legal-pack.md`** exists

### ⬜ OPEN (before launch — Sun 14 Jun in the daily plan)
| Item | What | Cost | When |
|------|------|------|------|
| **SR01 home-address suppression** | File SR01 with Companies House to remove home address from public record | Free | Sun 14 |
| **Registered office + director service address** | Replace home address with a service address (e.g., a formation agent's address) | ~£20–50/yr | Sun 14 |
| **WHOIS privacy** | Verify domain registration hides the founder's name (GoDaddy privacy) | Included | Sun 14 |
| **LinkedIn lockdown** | Personal profile private; no K.I.N.D mention; don't accept "Bradley-type" connection requests (competitor recon) | Free | Sun 14 |
| **All public contact = business email** | `hello@get-kind.com` everywhere; never personal email | Free | ✅ mostly done |
| **Press attributed to "K.I.N.D team"** | Never founder's name in press/PR | Free | Policy |
| **D&O insurance** | Directors & Officers liability insurance | ~£500–1,000/yr | **Month 2** |

### 📌 HARD FLOOR (cannot be changed)
**PSC (Person of Significant Control) director name is permanently public** — Companies House
requires it, cannot be removed. The "invisible founder" is brand/customer-facing only; the
legal record will always show the director. (This is fine for fundraising — investors meet you
under your real name; customers see only K.I.N.D.)

---

## 🟢 RING 2 — Data Protection

**Purpose:** Compliance across every market K.I.N.D touches (UK, EU, SA, Nigeria, Kenya, US).
This is a genuine moat — generalist competitors can't match the multi-jurisdiction posture.

### ✅ LOCKED
- **UK GDPR + DPA 2018 + Data Use & Access Act 2025** — compliant
- **POPIA** (South Africa) — compliant
- **NDPR (Nigeria) + Kenya DPA 2019** — compliant
- **CCPA/CPRA + US state laws** — `dpa-us.html` catch-all published
- **DPA published** + **DPA-US** published
- **Data residency locked** — Cape Town (Supabase af-south-1); US enterprise on request
- **Data classification T1–T4** — tiered data sensitivity model in place
- **Sub-processor register** — consistent (fixed 4 Jun: Paystack/Vercel → Stripe/Railway)

### ⬜ OPEN
| Item | What | Cost | When |
|------|------|------|------|
| **ICO registration** | UK Information Commissioner's Office registration (legal requirement to process personal data) | £40/yr | **Before launch — Sun 14** |
| **ODPC Kenya / NDPR DPCO** | Kenya Office of Data Protection + Nigeria DPCO registration | TBD | **First NG/KE client** (gated) |

---

## 🟠 RING 3 — Information Security

**Purpose:** Protect client data + the platform. Foundation for future enterprise certs (Year 2).

### ✅ LOCKED
- **RLS (Row-Level Security)** on all tables (credit_transactions fixed)
- **API auth** — `requireAuth` + `requireAdminKey` middleware
- **Strict CORS** — allowlist only (get-kind.com domains + localhost + Railway/Vercel previews)
- **JWT refresh** — token rotation in place
- **TLS 1.3 / AES-256** — encryption in transit + at rest
- **Secrets in Railway env only** (hard rule — never in code/repo)
- **Incident response plan + register** (logged 4 Jun)
- **BCP (Business Continuity Plan)** — RTO 4h / RPO 24h / daily backups 30-day retention
- **`docs/legal/it-security-pack.md`** exists

### 🟡 DE-PRIORITISED → WEEK 2 POST-LAUNCH — TIER-0 CREDENTIAL ROTATION
> **Decision (8 Jun, founder):** de-prioritised to **Week 2 post-launch**.
> **Repo scan (8 Jun):** no `.env` ever committed; **no real secret-key patterns** in the
> current tree OR full git history (incl. the 410 now-deleted chat logs) — only `xxxxx`
> placeholders. Keys are **not** exposed via the repo.
> ⚠️ **Flag:** the original note below claimed "some pasted in chat." A repo scan can't see
> chats *outside* the repo (live Claude.ai sessions, screenshots, shares). IF that happened,
> the two crown-jewels warrant rotating sooner: **`STRIPE_SECRET_KEY`** (live payments) +
> **`SUPABASE_SERVICE_ROLE_KEY`** (full DB access). Recommendation: rotate those two this week,
> defer the rest to Week 2. **Awaiting founder call (rotate-2 vs all-Week-2).**
> Apollo ✅ already rotated 6 Jun. Original "rotate ALL now" plan retained below for reference.

| Key | Where | Priority |
|-----|-------|----------|
| `STRIPE_SECRET_KEY` (sk_live) | Stripe dashboard → Railway API | 1st (live payment key) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase settings → Railway | 2nd (full DB access) |
| `DATABASE_URL` (password exposed) | Supabase connection pooling → Railway | 3rd (DB password) |
| `SUPABASE_ANON_KEY` | Supabase settings → Railway + Portal | 4th |
| `ANTHROPIC_API_KEY` | console.anthropic.com → Railway | 5th |
| `RESEND_API_KEY` | Resend dashboard → Railway | 6th |
| `RESEND_WEBHOOK_SECRET` | Resend webhook config → Railway | 7th |
| `APOLLO_API_KEY` | ✅ **DONE 6 Jun** | — |
| `HUBSPOT_API_KEY` | HubSpot settings → Railway | 8th |
| `ADMIN_SECRET_KEY` | Generate new UUID → Railway | 9th |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook settings → Railway | 10th |
| Paystack test keys | Hygiene (Paystack removed) | optional |

### ⬜ OPEN — Future security
| Item | What | Cost | When |
|------|------|------|------|
| **AI Risk Register** | Start now — foundation for ISO 42001 | Free | Start now |
| **Pen test** | Third-party penetration test | ~£2–5k | **Month 3** |
| **SOC 2 / ISO 27001 / ISO 42001** | Enterprise certs | ~£70k total | **Year 2** |

---

## 🟣 RING 4 — Contractual & IP

**Purpose:** Protect the company's contracts with clients + own all IP (code, brand, agents, data).

### ✅ LOCKED
- **Client T&Cs** — liability capped at 3-months fees; no-refund; England & Wales jurisdiction
- **AAA arbitration** for US clients (§12)
- **IP ownership** — company owns all code, brand, agent names (FIGSY/Milla/Vida/Denise), dataset

### ⬜ OPEN
| Item | What | Cost | When |
|------|------|------|------|
| **SEIS advance assurance** | Tax relief scheme for investors — draft ready, file soon | Free | **Soon (parallel)** |
| **Trademarks** | K.I.N.D + FIGSY + Milla + Vida | ~£320 | **Month 2–3, before PR** |
| **IR35 / contractor IP-assignment** | When first contractor hired | TBD | **First hire** |
| **SeedLegals IP assignment** | Formal IP assignment at fundraise | ~£600 | **At raise** |
| **VAT registration** | At £90k revenue threshold | Free | **At £90k** |
| **Annual confirmation statement + accounts + CT return** | Companies House + HMRC filings | TBD | **Annual** |

### ⚠️ Performance-Guarantee Clause (links to #61a/g — Weeks 2–4)
The pricing page shows a **"90-Day Pipeline Guarantee"** band. **The matching ToS clause is NOT
yet written.** Founder TODO: add a clause to terms.html that defines:
- What counts as a "qualified meeting"
- Refund mechanics ("results or you don't pay")
- Minimum lead volume the client must run for the guarantee to apply

Currently the guarantee copy points to ToS that doesn't yet contain it. **Close this gap before
making the guarantee a headline marketing claim.**

---

# PART B — 🧪 STAGING ENVIRONMENT (PART 4B — FULL CHECKLIST)

> **Why:** Once real clients are live on production, every V2 feature + future launch MUST be
> built + smoke-tested on staging before touching `main`. **Clients cannot be the ones who find
> the bugs.** ~$10–15/mo extra on Railway, ~20 min one-time setup.
>
> **When:** Set up BEFORE the first V2 work post-launch (i.e., before Month 2 Intelligence/V2 builds).

## Architecture

```
feature branch → auto-deploy → staging (staging.app.get-kind.com)
                                  ↓ smoke test passes
                              merge to main → production (app.get-kind.com)
```

**Three isolated pieces — staging never shares data or keys with production:**
- **Railway staging services** (Portal + API, pointing at `staging` branch)
- **Supabase `kind-staging` project** (separate DB — no client data, no cross-contamination)
- **Stripe test-mode keys** (staging always test mode; production always live mode)

## Setup Checklist (one-time, ~20 min)

### Step 1 — Supabase staging project
- [ ] Create new project: `kind-staging` in Supabase (af-south-1, same region)
- [ ] Run all migrations (001 → latest) in the staging SQL editor
- [ ] Save staging-only values: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`

### Step 2 — Railway staging services
- [ ] Duplicate `@kind/api` → rename `kind-api-staging`
  - Source branch: `staging`
  - Env vars → staging values (staging Supabase URL/keys, Stripe **test** keys, `NODE_ENV=staging`)
  - Custom domain: `api-staging.get-kind.com` (or Railway-generated URL)
- [ ] Duplicate `@kind/portal` → rename `kind-portal-staging`
  - Source branch: `staging`
  - `NEXT_PUBLIC_API_URL` → staging API URL
  - `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` → staging values
  - All `NEXT_PUBLIC_STRIPE_PRICE_*` → Stripe **test-mode** price IDs
  - Custom domain: `staging.app.get-kind.com`

### Step 3 — Create `staging` branch in GitHub
- [ ] `git checkout -b staging && git push -u origin staging`
- [ ] On Railway: both staging services watch this branch (auto-deploy on push to `staging`)

### Step 4 — Verify
- [ ] Push a harmless change to `staging` → both Railway staging services rebuild
- [ ] Visit `staging.app.get-kind.com` → sign up with test email → dashboard loads
- [ ] Confirm production DB untouched (check Supabase production project — zero new rows)

## Development Workflow (every V2 feature from here)

```
1. Build on a feature branch  (e.g. claude/v2-agent-cards)
2. Push feature branch → open PR into `staging`
3. Staging Railway auto-deploys
4. Run smoke test on staging.app.get-kind.com
5. Pass → merge staging → main → production auto-deploys
```

## Hard Rules (never break)
- **Production = `main` only.** No direct pushes to main for V2 work.
- **Staging DB is throwaway.** Wipe/re-seed any time — no client data ever lives there.
- **Stripe always test-mode on staging.** No live charges on staging, ever.
- **Hotfix path:** security/broken-live-path fix goes `hotfix/branch` → test on staging →
  fast-merge to main. Never patch production directly.

## Cost
- 2 extra Railway services (~$10–15/mo, sleep when idle)
- 1 extra Supabase project (free tier covers staging)
- **Total: ~$10–15/mo — cheaper than one client churn event.**

---

# PART C — 🔄 RECURRING OPERATIONS (PART 7)

> The operational cadence once clients are live. This is the "running the business" layer,
> separate from the build roadmap.

## Daily
- Open **Admin dashboard** + **/unibox** (two-way inbox) + **/founder brief**
- **TTFL (Time To First Lead) > 4h → intervene** (a client waiting too long for leads is a churn risk)
- Founder morning brief arrives **07:05 SAST** (already built)

## Before Every Sales Call
- Create a **demo environment** (isolated demo data)
- Review the **demo playbook** (11-scene script)
- Bookmark the **magic link** (instant demo login)
- **Pre-demo setup S1–S12:** real signup · onboard · unlock SQL · 10,000 credits · real ICP ·
  Demo Campaign · Milla doc loaded · Vida configured · clean browser

## After Every Demo
- Clear test leads
- Archive the campaign
- Check credits
- Note any breaks/bugs
- Log objections (feeds sales SOP + product priorities)

## Weekly (Friday)
- KPI check
- Clients review
- Roadmap milestones review
- Scalability check
- HubSpot deals review
- **MRR behind target → HubSpot follow-up**
- **Past-due accounts → email**

## Sales SOP (6 phases)
```
Qualification → Discovery (5 questions) → Demo → Proposal → Payment → Onboarding
```

---

# PART D — ⏸ BLOCKED ON CREDENTIALS (PART 4 — NO BUILD NEEDED)

> These features are **code-complete**. They just need an API key / approval to switch on.
> No engineering work — purely a credential/access gate.

| Feature | Blocked On | Unlocks | Phase |
|---------|-----------|---------|-------|
| **Milla + Vida subscriptions** | Stripe price IDs (verify in T5 smoke test) | Subscription billing for both agents | Pre-launch (verify) |
| **Flutterwave** | API key | ZAR/NGN/KES/GHS payments (Africa) | Weeks 2–4 |
| **HubSpot CRM sync** | `HUBSPOT_API_KEY` | CRM dedup + push | Week 1 |
| **Voice (Vapi)** | Vapi keys | FIGSY voice calling | Month 2 |
| **WhatsApp** | Meta approval + number | WhatsApp outreach channel | Week 1 (apply) → Month 2 (live) |
| **Google Calendar OAuth** | `GOOGLE_CLIENT_ID/SECRET/REDIRECT` | Auto-booking into Google Calendar | Month 2 (V2-13) |
| **Clearbit visitor de-anon** | `CLEARBIT_API_KEY` | See who's on the website before signup | Year 2 (#76) |
| **LinkedIn auto-dispatch** | PhantomBuster keys | LinkedIn cold outreach (backend built) | Week 1 (#21) |
| **Cloudflare CDN failover** | `CLOUDFLARE_API_TOKEN` / `ACCOUNT_ID` | CDN + WAF (AS46582 block rule) | Post-launch |
| **Render standbys + UptimeRobot** | Setup | Failover hosting + uptime monitoring | Post-launch |

---

# PART E — 📦 FULL BUILT INVENTORY (PART 3 — DO NOT REBUILD)

> Everything that already ships and works. Cross-reference before building anything to avoid
> duplicating existing functionality.

## Platform
- Supabase + RLS (Row-Level Security on all tables)
- Auth (no email-confirm flow — instant signup)
- **16 cron jobs** live (NOT 19 — the 3 status-snapshot crons were planned, never built)
- TSC (TypeScript) clean — no type errors

## Lead Gen
- ICP builder
- AI ICP Suggest (auto-suggest ICP from a prompt)
- ICP website scan (extract ICP from a company URL)
- Apollo 3-pass search
- Claude scoring (Haiku 4.5)
- Leads table
- Opt-out blocklist
- POPIA consent
- First-leads email
- Weekly digest
- Drip 10/day
- CRM dedup (HubSpot + Pipedrive — needs migration 010)
- **Apollo email enrichment** (bulk_match by id — fixed 7 Jun, real emails now delivered)
- **`enrichAndDeliverLeads()`** — only charges credits for leads that get a real email

## FIGSY (The Opener · AI SDR)
- 19 API endpoints
- Campaign CRUD
- 3-step sequences
- Reply classification (🔥 Hot / Warm / etc.)
- FIGSY Memory (L1 per-client: best subjects, winning angles, reply rates)
- Unibox two-way
- Opt-out
- CRM push
- Escalation
- Identity card
- Weekly digest
- `paused_low_performance` (auto-pause underperforming campaigns)
- Self-outreach cron (dogfood)
- **🔴 Inbound reply pipeline (built + verified live 7 Jun):** Resend inbound subdomain
  `reply.get-kind.com` → Svix HMAC-SHA256 webhook auth → body fetch via `/emails/receiving/{id}`
  → classification → 🔥 Hot in portal Inbox
- **Compliance suppression guard (7 Jun):** hard-coded floor (the-employer-domain, brandfolder.com,
  outfit.io, slopeapp.com) + `SUPPRESSED_DOMAINS` env, enforced at all 6 outreach paths

## Milla (The Brain · VA · $49/mo)
- Doc RAG + source attribution
- Subscription billing wired (awaiting price-ID confirm in T5)

## Vida (The Connector · Chatbot · $29/mo)
- Config / embed / WhatsApp
- Subscription wired

## Denise (The Closer · AI AE · $99/mo) — LIVE & transactional as of 5 Jun
- Own dedicated page (denise.html)
- Billing ($99/mo)
- Workspace
- API routes
- ⚠️ **Go-live needs 2 founder actions:** (1) Stripe $99/mo price → `STRIPE_PRICE_DENISE_MONTHLY`;
  (2) migration `011_denise.sql` (✅ done)

## Billing
- Stripe credit + subscriptions
- Auto-topup
- Trial overlay
- Credits-at-delivery (charge when lead delivered, not when sourced)
- Overspend fix
- Low-credit warning
- Subscription-lapse handling

## Admin (13 routes)
`/` · clients · clients/[id] · demo · launch · roadmap · cmo · founder · playbook ·
terms-library · hubspot · scalability · unibox (+ analytics, revenue, compliance, partners)

## Portal (15 routes)
login · onboard · dashboard · leads · figsy (+ LinkedIn queue UI) · assistant · chatbot ·
documents · kpis · usage · billing · billing/confirm · roadmap · referral · settings

## Website (30+ pages)
homepage · about · pricing · support · terms · privacy · trust · dpa · dpa-us · use-cases ·
partners · story · values · blog · playbook · figsy · chatbot-agent · virtual-assistant ·
demo · demo-video · figsy-video · platform-video (+standalone) · vs-apollo · vs-outreach ·
vs-salesloft · vs-hiring-an-sdr · vs-prospecting-manually · denise.html · 3 vertical landing
pages (estate-agents, insurance-brokers, financial-advisers) · pipeline-calculator.html

## Other
- PWA (install banner, push-ready)
- Demo Environments
- 7 internal Founder Agent endpoints
- Partner Programme
- Founder morning brief (07:05 SAST)
- Cloudflare Pages CDN (built, needs activation)
- Portal V2 (built, **dormant** — `FEATURE_PORTAL_V2`, DO NOT enable, delete it)
- **LinkedIn outreach backend** — built (`lib/linkedin.ts`, 4 routes, queue migration, portal UI),
  needs PhantomBuster keys + SQL run. *(Supersedes old "never build LinkedIn" decision.)*

---

# PART F — 📈 FINANCIAL TARGETS & UNIT ECONOMICS

## Pricing (canonical — supersedes any stale value)
| Product | Price |
|---------|-------|
| **Lead Gen** | $1/credit (20/40/100 bundles = $20/$40/$100) |
| **FIGSY** | $3/credit (20/40/100 = $60/$120/$300) |
| **Milla** | $49/mo |
| **Vida** | **$29/mo** (NOT $39 — common stale value) |
| **Denise** | **$99/mo** (premium closer, decided 5 Jun) |
| **Bundle** | $69/mo |
| **The "one number"** | **"$20"** — true entry price (pay-per-result) on homepage hero |

## Unit Economics
- **Run cost floor:** ~$125/mo
- **Break-even:** 2 clients (infra) / 5 clients (all-in)
- **Margin:** 95%+
- **Models:** Sonnet 4.6 (Milla, FIGSY) + Haiku 4.5 (scoring, scraping)

## Growth Targets
| When | Clients | MRR | Milestone |
|------|---------|-----|-----------|
| **Launch (Fri 19 Jun)** | 0 | £0 | **Africa-only** live (US gated on steady African income) |
| **Week 2–3** | 2–3 design partners | ~£2,500 | Case studies + logos |
| **Month 1** | 5 (break-even all-in) | ~£4,000 | Sustainable |
| **Month 2** | 20 + Product Hunt | ~£12,000 | Intelligence layer + MCP + V2 |
| **Month 3** | 50 + agent family | ~£40,000 | DENISE deep build live |
| **Month 3+** | 100+ + platform intelligence | £100,000+ | L4 cross-client moat |

## Outcome Pricing (#60 — gated, NOT live)
- **Gate:** ≥28% gross margin data required before enabling
- **The unlock number:** *average credits consumed to produce one booked meeting*
  - ~8 credits → cost ≈ $24 → charge $40 → ~40% margin ✅
  - ~20 credits → cost ≈ $60 → charge $40 → lose $20/meeting ❌ (bankrupts at scale)
- **Model:** separate menu (client picks ONE: credit OR outcome, never both)
  - Lead Gen (outcome): $15 / qualified reply
  - FIGSY (outcome): $40 / confirmed meeting (calendar event = billable, no-shows not refunded)
- **Proven by:** Intercom Fin ($0.99/resolved ticket), Salesforce ($2/AI conversation)

---

# PART G — 🚫 WILL NOT BUILD / PARKED (PART 6)

**Never:** Collaborative docs · whiteboards · self-hosted · custom emoji · internal team chat ·
multi-year contracts

**Gated:** 50+ data sources (only at 50+ clients) · African-language support (after WhatsApp)

⚠️ **Note:** "LinkedIn automation — never build" is **SUPERSEDED.** The backend is built and
activates Week 1. Remove the contradictory "never" lines from MASTER.md.

---

# PART H — ⚠️ MASTER.md CONTRADICTIONS TO CLEAN (PART 8 — post-launch hygiene)

> None block launch. All should be cleaned so the historical MASTER.md stops contradicting itself.
> (EVERYTHING.md is the source of truth; MASTER.md is archive.)

1. **Vercel still listed as a host** → Railway only
2. **Launch day printed 3 ways** (Mon/Tue/historical) → was Monday, **now Fri 19 Jun**
3. **Vida price $39 vs $29** → $29
4. **Pricing tables disagree** ($20/$38/$88 vs $1/credit flat) → $1/credit canonical
5. **Cron count 16 vs 19** → 16 (3 status crons never built)
6. **DENISE/LENA/TONY Month 3 vs Year 2** → DENISE #1 next build; LENA/TONY Month 3
7. **LinkedIn "never build" vs built** → built, activating Week 1
8. **Duplicate sections** (24–28 twice; 5-day plan twice) → delete duplicates
9. **Calendly personal link** (`jacques-vieiraza/30min`) → neutral `kind-ai-demo/new-meeting` (name-exposure risk)
10. **"Done vs pending" conflicts** → reconcile to actual Railway/Supabase state
11. **Cashflow §14** ("Vercel Pro $20" + "Apollo Basic $99") → ~$125 floor, Apollo $49–65
12. **us.app / separate-stack remnants** → single URL/DB
13. **eu-west-1 stale note** → af-south-1
14. **Admin cohort analytics "Built" vs "route doesn't exist"** → not built
15. **15-step smoke test vs 57-step** → 57-step `docs/SMOKE_TEST.md`

---

# 🔐 ADMIN PORTAL HARDENING (security audit 8 Jun)
Full hard-check of `apps/admin` + admin/internal API routes done 8 Jun.

**🔨 FIXED IN CODE 8 Jun (committed, branch only — NOT deployed/verified):**
- 🔴 **Browser-exposed admin secret** — removed `NEXT_PUBLIC_ADMIN_KEY` fallback from the admin proxy + the dead client-side key in `BriefSection` (the proxy injects the secret server-side). Was a full auth-bypass risk.
- 🔴 **Hardcoded demo backdoor** — `/admin/setup-demo` no longer defaults to `demo@get-kind.com` / `KindDemo2025!`; now 400s without explicit creds.
- 🔴 **Timing-safe admin-key compare** — `crypto.timingSafeEqual` in `admin.ts` + `internal.ts` (was plain `!==`).

**🧍 FOUNDER (one-time, Railway):** on the **admin** service ensure `ADMIN_SECRET_KEY` is set, and **DELETE any `NEXT_PUBLIC_ADMIN_KEY`** variable if it exists (that var shipped the secret to browsers).

**⬜ REMAINING (tracked, NOT launch-blocking):**
| Sev | Finding | Fix | When |
|-----|---------|-----|------|
| 🟠 | Admin frontend uses `SUPABASE_SERVICE_ROLE_KEY` (bypasses RLS) across ~13 pages | Route admin DB through the API gateway, or a minimal-perms role | Wk 1–2 (refactor) |
| 🟠 | No Zod validation on admin POST/PATCH (demos, credits, extend) | Add schemas (uuid, datetime, length caps) | Week 1 |
| 🟠 | Credit grants (≤500) have no audit trail | Log granting admin + reason + recipient | Week 1 |
| 🟢 | Proxy accepts all HTTP methods · hardcoded API base URL · demo-extend date unvalidated | method allowlist · env URL · future-date check | Week 2 |

**✅ Solid:** every `/admin` + `/internal` route is behind the admin key · demo creation is isolated/transactional · credit grant hard-capped at 500 · "cohort analytics route missing" was a **false alarm** (route is fine).

---

# 🛡️ EMPLOYER-REFERENCE SCRUB (safety — ✅ buckets 1–3 DONE 8 Jun)

**Goal:** remove all references to the founder's current employer from product +
committed repo, **without weakening the do-not-contact protection.** Three buckets:

| Bucket | Files | Risk | Outcome | Status |
|--------|-------|------|---------|--------|
| **1. Safety guard** | `apps/api/src/lib/suppression.ts` | 🔴 Removing the name naively could disable the guard that stops FIGSY emailing colleagues. | ✅ **DONE.** Founder ruled "whatever it takes to protect" → kept the floor **hard-coded + unconditional** (NOT env-dependent, can never be disabled); the 4 domains are now **base64-encoded** + decoded at load; comments genericised. Protection runtime-verified byte-for-byte identical (employer email/subdomain/company-name/LinkedIn/sister-domain still blocked, unrelated allowed, env-additions work). No plaintext name left. | ✅ done |
| **2. Active internal docs** | root `MASTER.md`, `docs/EVERYTHING.md`, `docs/KIND-MASTER.md`, `docs/art-of-possible.md` | 🟠 `legal-pack.md` is the **legal record** — must NOT lose it. | ✅ **DONE.** Genericised the employer name → "the founder's employer" across all four planning docs (incl. domain lists). **`docs/legal/legal-pack.md` kept intact** (the one controlled place the real name belongs — it's the clause-17.2 evidence). | ✅ done |
| **3. Chat archive** | was ~410 files in `docs/chat-archive/` | 🟢 Historical logs, not shipped. | ✅ **DONE.** `git rm -r docs/chat-archive` — folder removed from the repo (biggest source of the name). ⚠️ Still present in **past git history**; full erase needs a history rewrite (`git filter-repo`) — optional, flagged. | ✅ done |

**Residual (optional):** the name still exists in (a) `docs/legal/legal-pack.md` (kept
deliberately), and (b) past git commit history / reflog (incl. one of my earlier commit
messages). Erasing (b) requires a history rewrite + force-push — say the word if you want it.
**Previously done:** pitch deck scrubbed; legal pages name only the company. **Open:**
Cloudflare WAF AS46582 block (gated on site being proxied through Cloudflare).

---

# 📅 TIMELINE REVIEW — WHEN EACH OPERATIONAL ITEM LANDS

| Item | Phase | Date | Owner |
|------|-------|------|-------|
| TIER-0 credential rotation (Ring 3) | Pre-launch | Mon 8 – Tue 9 | 🧍 |
| ICO registration (Ring 2) | Pre-launch | Sun 14 | 🧍 |
| SR01 + registered office + WHOIS + LinkedIn (Ring 1) | Pre-launch | Sun 14 | 🧍 |
| SEIS advance assurance (Ring 4) | Parallel | Soon | 🧍 |
| Performance-guarantee ToS clause (Ring 4) | Weeks 2–4 | Jun 29+ | 🤖 |
| **Staging environment (Part B)** | **Before Month 2** | **Late Jul** | 🤝 |
| HubSpot key (Part D) | Week 1 | Jun 19–28 | 🧍 |
| LinkedIn PhantomBuster keys (Part D) | Week 1 | Jun 19–28 | 🧍 |
| Flutterwave key (Part D) | Weeks 2–4 | Jun 29+ | 🧍 |
| D&O insurance (Ring 1) | Month 2 | Late Jul | 🧍 |
| Trademarks (Ring 4) | Month 2–3 | Aug | 🧍 |
| Google Calendar OAuth (Part D) | Month 2 | Late Jul | 🧍 |
| Vapi voice keys (Part D) | Month 2 | Late Jul | 🧍 |
| WhatsApp Meta approval (Part D) | Week 1 apply → Month 2 live | Jun 19 → Aug | 🧍 |
| Pen test (Ring 3) | Month 3 | Sep | 🧍 |
| ODPC Kenya / NDPR (Ring 2) | First NG/KE client | Gated | 🧍 |
| VAT registration (Ring 4) | At £90k | Gated | 🧍 |
| ISO 27001 / 42001 / SOC 2 (Ring 3) | Year 2 | 2027 | 🧍 |
| MASTER.md cleanup (Part H) | Post-launch | After Fri 19 | 🤖 |
| **the founder's employer scrub (safety)** | **Decided 8 Jun** | Buckets 1–2 before launch, bucket 3 = founder's call | 🤝 |
| **US market launch** | **GATED** | Only after steady recurring African income | 🧍 |

---

# ═══════════════════════════════════════════════════════════════
# CHAPTER 5 — IMPLEMENTATION MAPS (HOW WE BUILD THE FUTURE ROADMAP)
# ═══════════════════════════════════════════════════════════════

> The "what" is in Chapters 1–3. This is the **"how / what it takes."** Same format
> for every workstream: **when/gate · items · phasing + effort (S≈1d · M≈2–3d · L≈4–5d) ·
> what it takes (🧍 founder input/creds) · dependencies · decisions.** 🤖 = Claude builds.
> **V2's own map lives in its section (Ch.3, Phase 3 → "V2 IMPLEMENTATION MAP").**
>
> **Cross-cutting prerequisites** (gate most of the below): ① **Staging env** (Month 2) ·
> ② **#46 pgvector memory** (foundation for all learning/intelligence) · ③ **outcome-data
> volume** (10+ clients for L2, 50+ for L4) · ④ **founder creds** (enrichment, Vapi,
> Flutterwave, Clearbit, transcription). Build foundations before the features that need them.

## §5.1 — INTELLIGENCE LAYER (#37–53, #59) · Month 2, gated 10+ clients
*Makes FIGSY self-optimising. Prereq: staging + #46 pgvector.*

| Sub-group | Items | Size | Needs 🧍 |
|-----------|-------|------|---------|
| Sending intelligence | #38 A/B subjects · #44 pre-send spam score · #45 adaptive volume *(partly built)* · #53 inbox rotation · #43 deliverability dashboard | M each | — |
| Targeting intelligence | #37 intent signals · #40 ICP auto-refine (L2) · #42 waterfall enrichment | L·L·M | enrichment keys (PDL/Hunter/Clearbit); 10+ clients of data for L2 |
| Workflow | #41 conditional branching · #51 configurable triggers · #52 multi-model toggle | M·M·S | — |
| Context/memory | **#46 Memory v2 (pgvector)** *(foundational)* · #47 Milla CRM pull | L·M | HubSpot/Pipedrive read scope |
| Voice (optional) | #48 Vapi calling | L | Vapi keys |
| **Distribution** | **#59 MCP server** *(pulled fwd — free distribution)* | M | — |

**Order:** #46 memory + #59 MCP + sending-intelligence first (foundation + ROI); #37/#40 need data → late-month.
**Decision:** confirm #59 MCP as the first Month-2 build (distribution leverage).

## §5.2 — COMPETITOR STEALS (#61, #62, #80–84) · Weeks 2–4 → Month 2
*Tactical lifts from Atlas/Revio/Monday/ClickUp.*

| Group | Items | Size | Needs 🧍 |
|-------|-------|------|---------|
| Messaging/ToS (Wk 2–4) | #61a/g guarantee clause · #61b "$20" anchor · #61c clone-yourself · #61d cold re-engagement · #62a "trained on closed-won" hook | S each | founder sign-off on guarantee/ToS |
| Proof (GATED on real data) | #62c homepage outcome numbers | S | **real outcomes only — no fabrication** |
| Coaching | #62b Revenue Playbook Session (onboarding) | M | ties to Casey (V2-10) |
| Distribution | #61e influencer (Africa equiv only now) · #81 share-to-LinkedIn outcome loop · #82 partner-cert badge | 🧍·M·M | founder outreach |
| Product surfaces (Month 2) | #80 speed-to-lead (Vida→FIGSY/Denise) · #83 Forms · #84 Integrations Hub | M each | — |

**Decision:** legal sign-off on guarantee wording; which steals are Wk-2 quick wins vs Month-2.

## §5.3 — AGENT FAMILY DEEP BUILDS (#54–58) · Month 3, gated (family + margin data)
*The next agents after FIGSY. Build deep or don't ship.*

| Item | Sub-builds / notes | Size | Needs 🧍 |
|------|--------------------|------|---------|
| **#54 DENISE (the #1)** | Calendly auto-book · call-join notetaker · live objection extraction · proposal-from-transcript · pipeline follow-up · persona · admin card | **L+ (~3–4 wks)** | **transcription provider (Recall.ai/Vapi)** · Calendly creds |
| #55 LENA / #56 TONY | broaden family, only once prior is solid | M–L each | — |
| #57 orchestration | shared memory FIGSY→DENISE→Milla | L | depends on #46 memory |
| #58 skill library | 500+ prompt skills, incremental | M | — |

**Decision:** Denise scope (deep vs MVP — master says **deep or don't ship**); transcription vendor choice.

## §5.4 — PRICING & GROWTH (#27, #33–36, #49–50, #60, #63) · Month 2–3
| Item | Size | Needs 🧍 |
|------|------|---------|
| #60 outcome pricing (per meeting) — **GATED ≥28% gross margin** | L (billing+attribution rework) | margin data |
| #49 Product Hunt (with proof) · #50 G2 (5 reviews) | M·S | 2–3 case studies · reviews |
| #27 design partners · #63 pan-African partners | 🧍 | founder sales motion |
| #33 Flutterwave (Africa payments) · #34 YouTube · #35 playbook email form | M·🧍·S | Flutterwave key · content |

**Decision:** confirm 28%-margin gate for outcome pricing; PH timing (needs real proof first).

### 💵 #85 — DENISE PER-PROPOSAL PRICING ($99 flat → $20/proposal usage-based)
**Status (8 Jun): ⏸ PARKED — "get to it when we're there" (pairs with #54 Denise deep build, ~Month 3).** Step-1 DISCOVERY DONE (preserved below) · Step-2 plan + Step-3 build await founder go + the 3 decisions. NO billing code written. Discovery-first, approval-before-billing discipline (founder brief).
**Billable event:** each *unique* proposal Denise generates (NOT leads, NOT closed-won — closed-won out of scope; add a stubbed `marked_won` flag only). **Price = $20/proposal**, stored as ONE config constant.
**Discovery findings (verified in repo):**
- ✅ **Meterable:** proposals are generated **server-side** — `lib/denise.ts:draftProposal()` ← `POST /denise/draft-proposal`, stored in `denise_drafts` (kind='proposal'). We can meter the generation.
- 🔴 **Dedup gap:** `denise_drafts` has **no stable proposal/opportunity id** — every generation inserts a NEW row, so regenerations of the SAME proposal are indistinguishable from new ones. The brief requires dedup on a stable `proposal_id` → **needs a schema change** (introduce an opportunity/proposal ref, or link drafts to the separate `proposals` table which *does* have stable ids + e-sign).
- **Two proposal concepts** exist: `denise_drafts` (AI outlines — the billable thing) vs `proposals` (manual formal docs for e-sign, `routes/proposals.ts`). Must not conflate.
- **No metered billing exists yet** — Milla/Vida/Denise are flat subs (`lib/stripe.ts STRIPE_SUBSCRIPTIONS`, denise `priceUsd: 99`). Stripe metered would be net-new.
- 💡 **K.I.N.D already has a usage mechanism:** the credits wallet (`credit_transactions`, debit-on-delivery, idempotent, audit trail). **Plan should weigh Stripe-metered (per brief) vs reusing the existing credit-debit infra** (simpler, already idempotent).
- ⚠️ Trial: a 14-day trial exists (welcome flow) but not found in billing — confirm where it's tracked for the "trial proposals free/capped" rule.
- Config home for the $20 constant: `apps/api/src/lib/stripe.ts`.
- Ties to **#54 Denise deep build** (she's currently a thin add-on) and **#60 outcome pricing**.
**Awaiting founder:** (1) approve Step-2 plan before any billing code; (2) **flat $20/proposal vs base (~$29) + $15/proposal** (revenue floor) — founder chose flat $20, can swap.

### 👥 #86 — MULTI-SEAT / PER-MEMBER BILLING (open decision — surfaced 8 Jun by first 10-person client)
**The gap:** `client_members` lets a workspace have N users (team-of-10 works), but **`credit_balance` is per-WORKSPACE (one shared wallet) — there is NO per-member/per-seat billing.** So a 10-person team is **not** billed 10× by default.
- **Usage still scales:** 10 active members burn ~10× credits from the shared pool → client buys ~10× → ~10× revenue **via usage** (not seats).
- **Founder intent:** "each member pays for leads → multiple of 10" = true per-seat/per-member billing → **NOT built** (model + code change).
**Decision needed (commercial — before quoting the first client a price):** per-seat pricing (clean, guaranteed 10× recurring) **vs** usage-only (shared pot, scales with activity) **vs** hybrid (per-seat base + usage). Ties to #85 Denise pricing + overall pricing model.
**Not a deploy blocker** — first client can start on the shared-workspace model tonight; resolve the model this week before pricing is locked. Claude to prep options (discovery-first, like #85).

### 🗓️ #87 — PER-MEMBER IDENTITY / CALENDAR (foundational — surfaced 8 Jun, same root as #86)
**The gap:** calendar, booking link, AND signer/sending identity are ALL on the `clients` (workspace) row — verified workspace-level, never tied to `client_members`. So **one calendar + one booking link + one sending persona per workspace.** FIGSY **cannot** book into each member's own calendar today; per-member calendars/identities are **not built**.
**The foundational decision (rolls up #86 + #87): is K.I.N.D a "shared team workspace" or a "team of individual reps"?**
- **Shared workspace (built today):** one company identity/calendar/booking link/wallet; 10 members run ONE outreach op. Fits centralised outreach (founder + VAs, one pipeline).
- **Per-rep (NOT built):** each member = own calendar + booking link + signature + sending identity + billing; FIGSY runs N personalised ops, routes each booking/reply to the right rep. Fits a real sales team. **Big architecture change** (move calendar/booking/identity/billing workspace→member + routing).
**Blocking question for the first client:** are they 10 reps each booking their own meetings (→ per-rep, real gap, can't fully satisfy this week) or a centralised outreach team (→ shared model fine, onboard tonight)? Resolve BEFORE over-promising. Deploy still proceeds regardless.

### 🏢 #88 — PER-REP AUTONOMOUS MODEL (🔒 LOCKED PRODUCT DECISION, 8 Jun — supersedes #86/#87 framing)
**Founder decision (not client-specific — THE model):** an owner with N sales reps → **each rep gets their own FIGSY working autonomously for them** (own calendar, own bookings, own leads, own identity), then the **owner gets a centralised dashboard** rolling up all reps/people/leads/performance. NOT a centralised booking system. **Rationale: this is the monetisation engine — N autonomous FIGSYs = N× value = N× revenue.**
- ✅ **Already built:** company account + members (`client_members`), one company wallet/billing, one company dashboard.
- 🔨 **The re-architecture (weeks, NOT Fri):** move calendar + booking_url + signer/sending identity + leads + campaigns from `clients` (workspace) → `client_members` (per-rep); route every reply/booking to the right rep; seat-quantity billing ("buy 10 FIGSYs" = 10× on one company invoice); owner rollup dashboard. The whole product is workspace-level today — this is foundational.
- **Phasing (as founder framed):** Phase 1 = per-rep autonomy (each rep's own FIGSY/calendar/leads) → Phase 2 = centralised owner rollup dashboard → seat-quantity billing alongside.
- **Timeline reality (honest):** ~weeks, not 4 days. **Friday 19 launch proceeds on the CURRENT shared model** (serves solo founders, small centralised teams, the partner pipeline). **Per-rep MVP target = end of NEXT week (~Fri 26 Jun)** — agreed 8 Jun. Do NOT promise the 10-rep client per-rep by Fri 19 — position as early-access / pilot on current model until ~26 Jun.

**BUILD PLAN (scoped from discovery — all data is workspace-level today; no per-member ownership exists):**
| Slice | What | Touches | Size |
|-------|------|---------|------|
| **1. Per-rep identity** | move calendar OAuth + `booking_url` + `signer_name`/sending identity from `clients` → `client_members`; each rep connects own calendar | 007 calendar cols, `routes/calendar.ts`, `figsy.ts` signer/booking reads | M–L |
| **2. Per-rep ownership** | add `owner_member_id` to `leads` + `figsy_campaigns`; each rep's FIGSY works their own leads/campaigns; route each reply/booking to the owning rep | `leads`, `figsy_campaigns`, `figsy.ts`, `routes/figsy.ts`, reply webhook | L |
| **3. Seat billing + budget control (the "Smartsheet/Claude" model — LOCKED 8 Jun)** | Company = one account + one payment, **owns the budget pool**. Each seat = its own FIGSY + its own **per-seat credit allocation**. Rep runs low → **requests more credits** → owner **approves/denies** (allocates from company pool). Company tops up pool with one payment. | `lib/stripe.ts`, per-member credit balances, NEW request/approval table + endpoints + admin UI | M–L |
| **4. Owner command centre** | company admin sees all reps · their usage · leads · performance · **pending credit requests** to approve/deny | portal dashboard, new aggregate endpoints | M (Phase 2) |
**Usage & budget model (locked):** mirrors how an enterprise uses Claude — company license, per-seat, **request-more-on-approval**. Admin controls the purse; reps run autonomously within their allocation; centralised visibility + approval.
**Order:** Slices 1+2 = core "each rep autonomous" MVP (target ~26 Jun) · 3 (seats + request/approve) alongside · 4 right after.
**⚠️ Prereq:** build on **staging**, not prod-with-a-live-client (set up staging first — the V2 staging prereq now applies here). Firm day-by-day + risk after the Fri 19 deploy gives a stable base.

### 🪜 #89 — CONFIGURABLE CAMPAIGN SEQUENCES (client maps their own steps — founder 8 Jun, Alta steal)
**Gap:** FIGSY runs a **hardcoded 3-step sequence** (Day 0 / 4 / 9, fixed `STEP_FOLLOWUP_DELAYS`). Not every campaign should be 3 touches — clients must define their own.
**Define — a per-campaign sequence builder:**
- **Step count:** 1 → N (single touch · 3-touch · 5-touch · break-up, etc.)
- **Per step:** delay (days) · angle/intent (instruction to FIGSY) · channel (email now; LinkedIn/WhatsApp/voice later) · optional condition ("if no reply")
- **Presets + custom:** pick a template or build from scratch — Alta does this well (configurable multi-channel sequences)
**Current code:** `generateSequence` returns fixed step1/2/3 · delays in `STEP_FOLLOWUP_DELAYS` · `sendSequenceEmail(step 1|2|3)`. **Build = store a sequence definition per campaign (steps array) + generation + sending respect it.**
**Ties to:** V2-4 (config panel) · #41 (conditional branching) · #51 (configurable triggers). **Status:** defined 8 Jun · ⬜ to build · slot with the campaign-UX / V2 work (not pre-launch). Define the detail before building.

### 🔭 ALTA UI/UX STEALS (demo, 8 Jun — founder captured 7 screens)
Steal the **layouts + richer taxonomies**; keep our augment-not-replace + Africa-first positioning.
| Alta screen | The steal | Maps to |
|-------------|-----------|---------|
| **Touch Points builder** | visual branching **tree** + multi-channel **action library** (Email · LinkedIn connect/message/like/voice · Call · SMS · WhatsApp · Manual task · API) + conditions + wait nodes | **#89** ✅ in visuals |
| **Template gallery** | presets by use-case (AI Magic · Email-only · LinkedIn-only · Omni-channel · Inbound form · Event-driven · Social signals · Start from scratch), all editable | **#89** ✅ |
| **"Train [agent] about your business"** | structured agent-training **tabs: Pitch · Keywords · Signals · DNC list · Context · Messaging · Connectors · Prompts**; agent crafts value-prop + ICP from the website; Knowledge KB builders (competitor analysis · success stories · sales ebook) | **V2-3** (conversational setup) + **V2-4** (config panel) + **#58** skill/knowledge library |
| **Performance dashboard** | multi-channel **time-series** (sent/opened/clicked/replied/bounced + LinkedIn requests/accepted/messages/replied) + **Prospect Status funnel** (New → Pending Outreach → Pending Reply → Interested → Meeting Booked → No Response → Bounced) + Campaign Performance | **V2-12** dashboards + **#88** owner command centre |
| **Inbox / Unibox** | multi-channel filter (email/LinkedIn/SMS/WhatsApp) + rich **reply tags** (Meeting Booked · Positive · Nurturing · Bad Timing · Reply Needed · Irrelevant · OOO · need followup · Auto Reply) + full conversation thread + **"Help me reply" / "Use next message"** AI assist | our **FIGSY Unibox** + reply classification (richer tags) + AI reply suggest (F2-3) |
| **Campaigns list** | **saved views** (named filters) · **filter by rep** · per-campaign **Engaged%/Replied%** · **Reps column** (per-rep) · Source icons (HubSpot/CSV) · **"Suggest Campaigns"** (AI) | **#88** (reps) + **V2-12** + AI campaign suggestions (new) |
**Cross-cutting:** Alta is **omni-channel everywhere** (email · LinkedIn · SMS · WhatsApp · voice) → reinforces **#89** multi-channel + our channel roadmap. *Reference screens saved by founder; build mockups on request.*

## §5.5 — PLATFORM & DATA MOAT (#46, #64–70) · Month 3 → Year 2
| Item | Size | Needs 🧍 |
|------|------|---------|
| **#64 cross-client intelligence (L4 benchmarks)** — the real long-term moat | L | 50+ clients data · **ethics/consent + legal review** |
| #65 data licensing marketplace | L | Year 2 · ethics/legal gate |
| #66 ICP refine L3 · #67 pipeline forecasting · #68 in-portal messaging · #69 proposal+e-sign · #70 meeting notetaker | M·M·M·M·L | #69/#70 tie to Denise |

**Decision:** cross-client data ethics/consent model (legal) before any L4/licensing build.

## §5.6 — YEAR 2: ENTERPRISE & COMPLIANCE (#71–79) · 2027
| Item | Size | Needs 🧍 |
|------|------|---------|
| #71–74 ISO 27001 + ISO 42001 + SOC 2 Type II via Vanta | L (mostly process, not code) | **~£70k budget + auditor** |
| #75 3-type memory · #76 visitor de-anon · #77 churn-risk · #78 revenue forecasting · #79 call intelligence | M·M·M·M·L | Clearbit key (#76); #79 after Denise notetaker |

**Decision:** trigger to start certs (enterprise pipeline demand); budget timing.

---

**Document Version:** 8 Jun 2026 (Africa-first + the founder's employer-scrub decisions; D1–D5 logged)
**Companion docs:** STRATEGIC-ROADMAP-19JUN-2026.md · DAILY-ACTION-PLAN-TO-LAUNCH.md · ALL-BUILDS-TIMELINE-96-ITEMS.md
**Source:** EVERYTHING.md Parts 2, 3, 4, 4B, 7 + NUMBERS
**Next Update:** After Smoke Test 2 (Sat 13 Jun)
