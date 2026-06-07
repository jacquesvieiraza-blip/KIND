# 📅 DAILY ACTION PLAN — MON 8 JUN → FRI 19 JUN 2026

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

#### Owner: 🤖 CLAUDE (me)
| Task | What | File(s) to Edit | Timeline | Blocker? |
|------|------|-----------------|----------|----------|
| **D1–D5** | **List-Unsubscribe header** | `apps/api/src/routes/figsy.ts` line ~378 → add header: `List-Unsubscribe: <https://api.get-kind.com/leads/unsubscribe?email={email}>, <mailto:unsubscribe@get-kind.com?subject={email}>` | Today | **YES — required by Gmail/Yahoo since Feb 2024** |
| **D1–D5** | **One-click unsubscribe endpoint** | New route: `GET /leads/unsubscribe?email=X` → marks lead opted_out (RLS scoped) → returns "You've been unsubscribed" | Today | YES — RFC 8058 compliance |
| **D1–D5** | **Plain-text MIME part** | `figsy.ts` line ~363 → convert HTML template to multipart: `text/plain` + `text/html` (use `nodemailer.createTransport()` or Resend's multipart support) | Today | YES — Gmail/Yahoo require both |
| **D1–D5** | **Fix tracking pixel** | `figsy.ts` line ~363 → instead of raw Railway URL, use custom domain: `https://t.get-kind-outreach.com/p/X.gif` (domain alias to tracking service, not Railway internal) | Today | YES — phishing signal |
| **D1–D5** | **Configurable cold-FROM** | Add env var: `FIGSY_COLD_FROM_DOMAIN` (default = `hello@get-kind-outreach.com`) + `FIGSY_COLD_FROM_NAME` (default = "FIGSY Team"). Read in `figsy.ts` line ~100. | Today | YES — separate cold + transactional |
| **D1–D5** | **Transactional headers** | Add headers to onboarding/support emails: `X-Priority: high`, `Importance: high`, remove tracking pixel from transactional, keep SPF alignment to `get-kind.com` | Today | YES — transactional ≠ cold |
| **Code test** | Quick local test: send to yourself at GmailOrOutlook. Verify: `List-Unsubscribe` header present, plain-text rendering, tracking pixel custom domain. | `curl -X POST http://localhost:4000/figsy/send-test` | Today PM | No (but good to check) |

#### **Status: Mon 8 — 17:00 UTC**
- Deliverability D1–D5: ⬜ Started, coding in progress
- Founder infra D6–D8: ⬜ Domains registered, DNS started (propagation pending), warmup ramp starting
- TIER-0 rotation: ⬜ 9 keys, 2 done, 7 in progress

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

#### **Status: Tue 9 — 17:00 UTC**
- Deliverability D1–D5: ✅ Deployed
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
MON 8 JUN:   D1–D5 ⬜ D6–D8 ⬜ TIER-0×9 ⬜
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
