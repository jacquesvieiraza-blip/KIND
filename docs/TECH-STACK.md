# 🛠️ K.I.N.D — TECH STACK & TOOLS REGISTER
`Last-checked: 25 Jun 2026`

> The **single ledger of every external tool/vendor we run on** — so none goes missing (the "Zoho Mail wasn't logged" lesson, 22 Jun). Reference register, not a tracker (no status dots). **Seeds the Notion → Command Centre → "Tools" page (item 204).** Update whenever a tool is added/changed.

## ✉️ EMAIL ARCHITECTURE — the part that's easy to get wrong
Two **separate** systems, do not conflate:
> ⚠️ **CORRECTED 23 Jun** — the earlier version of this section was wrong (it said Zoho receives the cold replies). The truth, verified in code:
- **COLD domain `gettingkind.com` = Resend, end-to-end.** Sends via Resend (`RESEND_API_KEY`, FROM `FIGSY_COLD_FROM = hello@gettingkind.com`). **Replies are captured via Resend INBOUND** — its **MX points to Resend**, which webhooks each reply to the app (`/figsy/replies/inbound`, then fetches the body). **There is NO mailbox on `gettingkind.com`** — it's send + inbound-webhook only. The product unibox/inbox (item 112) is the view of these.
- **HUMAN / company mail `get-kind.com` = Zoho Mail.** Zoho hosts the real mailbox (`hello@get-kind.com`, founder's address) — where you read/send human email. *(This is the ONLY Zoho mailbox; there is no `gettingkind.com` Zoho mailbox.)*
- **Deliverability / warmup (item 198) + ⚙️ THE ENGINE (item 211):** SPF/DKIM/DMARC set on the cold domain. **The in-app FIGSY "warmup" (`FIGSY_WARMUP_START`) is only a daily SEND-CAP, NOT reputation warmup** — earlier docs mislabeled it. **🚨 THE ENGINE (the product's foundation — RULEBOOK §12):** the warmed-sending layer for K.I.N.D's *and every client's* cold email. **DECIDED 23 Jun: integrate Smartlead** (both modes via one API + white-label — managed mailboxes for SMB · connect-your-own for enterprise) · **Instantly** = our own-outreach warmup now / engine fallback. The current **Resend-shared** cold path doesn't scale across clients (reputation poisoning) → migrating to per-client isolated warmed sending via Smartlead. **Full spec: V2-TRACKER "⚙️ THE ENGINE".**

## 🧱 PRODUCT STACK (the live app)
| Tool | Role |
|------|------|
| **Railway** | hosts the 4 app services: `@kind/api` (Express/TS) · `@kind/portal` (Next.js) · `@kind/admin` (Next.js) · `@kind/website` (static/Express) |
| **Render** | warm standby / failover for the app (item 51) |
| **Cloudflare** | marketing website hosting + load-balancer/failover · DNS |
| **Supabase** | Postgres database + auth (prod) + a sealed `kind-staging` project |
| **Resend** | programmatic email **sending** (system + FIGSY cold *today*) + inbound webhook *(cold send migrating to the ENGINE — item 211)* |
| **⚙️ Smartlead** | **THE ENGINE (item 211, decided 23 Jun)** — per-client warmed sending infrastructure: provision+warm mailboxes (SMB) · connect client's own (enterprise) · white-label + `client_id` isolation. The product's deliverability foundation. |
| **Instantly** | cold-email warmup/send for **K.I.N.D's OWN outreach** now (item 198) · ENGINE fallback (no white-label) |
| **Zoho Mail** | company **mailboxes** — MX/receiving + webmail + human send (`get-kind.com` only) |
| **Stripe** | primary payments — subscriptions, credit purchases, invoices (USD) |
| **Stripe · Flutterwave** | payments — Stripe (US/EMEA, primary, USD) + Flutterwave (Africa). *Paystack KILLED 25 Jun (no ZAR).* |
| **Apollo · PDL · Hunter** | lead-data waterfall (Apollo BYOK/optional). *Planned adds per item 243: Cognism · Clearbit · Lusha · RocketReach · Proxycurl + BetterContact aggregator.* |
| **Anthropic (Claude)** | the agents (FIGSY · Milla · Vida · Denise · Casey) |
| **Vapi** | voice agent infra — ⏸ **PARKED 25 Jun** (items 96/144/178; not on the revenue path) |
| **HubSpot / Pipedrive** | CRM dedup + deal push integration (item 43, built) |
| **Domains** | `get-kind.com` (product) · `gettingkind.com` (cold-send identity) |

## 🗄️ DATABASE MIGRATIONS — canonical source-of-truth (#273)
> There are **three** migration folders + one consolidated snapshot, historically out of sync. This is the map. **Do NOT delete or move any migration** — several are already applied to prod; deleting them loses the audit trail. This is documentation only.

**Applied truth (what the DB actually is):** the live/staging Supabase database. `supabase/staging-schema.sql` is a **consolidated, idempotent snapshot** (generated 2026-06-12) that rebuilds a fresh Supabase project in one paste — use it as the diff baseline, but note it predates every migration dated after 2026-06-12.

**Canonical dir going forward = `supabase/migrations/`.** It is the Supabase-CLI-convention folder, the most complete (60 files), and the only one still receiving new work (dated through 2026-07-02, incl. RLS, RPCs, billing-correctness). New migrations go here.

| Folder | Role | Rule |
|--------|------|------|
| **`supabase/migrations/`** | **CANONICAL.** Date-prefixed (`YYYYMMDD_*.sql`), current, actively maintained. | All new migrations land here. |
| `packages/db/src/migrations/` | **Legacy.** Numbered `001`–`013`, seeded the original core tables (figsy_*, milla_*, vida_*, denise_*, partners). Superseded for new work. | Keep (historical/applied); don't add to. |
| `apps/api/src/migrations/` | **App-run set.** 7 files (2026-06-02 → 06-22). Hand-applied, tracked separately from the canonical dir. | Fold future changes into `supabase/migrations/`. |

**Known discrepancies (as of 3 Jul 2026):**
- **7 tables live ONLY in `apps/api/src/migrations/`** and are absent from `supabase/migrations/`: `calendar_bookings`, `figsy_chat_messages`, `figsy_approval_queue`, `figsy_linkedin_queue`, `push_subscriptions`, `outcome_events`, `webhook_endpoints`.
- **`webhook_endpoints` is FLAGGED as not-yet-applied to the live DB** — see the note in `apps/api/src/routes/developer.ts` (`20260622_webhook_endpoints.sql`). Those routes degrade gracefully until it is run.
- **`calendar_bookings`** is defined in **two** dirs (`packages/db/.../007_calendar.sql` and `apps/api/.../20260602_calendar_bookings.sql`) but not in the canonical dir.
- **No exact-content duplicate files** exist across the three folders (verified by md5) — the overlaps are same-table / different-file, not literal copies.

## 🏢 BUSINESS / OPS STACK (the company layer)
| Tool | Role | Status |
|------|------|--------|
| **Notion** (free tier) | ops/SOP layer — Business Command Centre · Operating Playbook · hiring/HR · compliance calendar · partner/AE handbooks (item 204) | 🧍 set up this week |
| **Accounting platform** | Xero / QuickBooks / FreeAgent / Sage — feeds HMRC; pairs with the sales ledger (item 196) | 🧍 UNDECIDED |
| **Companies House / HMRC** | UK Ltd filings — corporation tax, annual accounts | active (UK Ltd) |
| **ICO** | data-protection registration — done (C1959926) | ✅ |
| **⚙️ THE ENGINE** | **Smartlead** (per-client warmed sending, item 211 — the product foundation) + **Instantly** (own-outreach warmup, item 198) | ✅ Instantly ordered (24h warm) · ✅ Smartlead key live + Phase 1 verified (24 Jun) → 🤖 Phase 2 next |
| **Uptime monitor** | external monitor wired to `/health` (item 199) | 🧍 to wire |
| **Business bank account** | UK Ltd banking | 🧍 confirm/record |

## 🧍 Open tool decisions (founder)
- **Accounting platform** (196) + **reporting currency** (bill USD / file GBP to HMRC) + **VAT** now vs at threshold.
- **CRM for company-ops** — HubSpot (already integrated for the product) or lean on the product's own data.
- **203 repo + auth/hosting** (seller-engine build).

---
*Logged 22 Jun 2026. When Notion is set up (204), this register becomes the Command-Centre "Tools" page; keep ONE home — don't duplicate.*
