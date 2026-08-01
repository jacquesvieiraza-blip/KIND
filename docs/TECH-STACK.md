# 🛠️ K.I.N.D — TECH STACK & TOOLS REGISTER
`Last-checked: 9 Jul 2026 (reconciled to the per-qualified-lead model)`

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
| **Cloudflare** | DNS + CDN / load-balancer failover. **The website itself is hosted on Railway** (service `KIND`, `apps/website` Express) |
| **Supabase** | Postgres database + auth (prod) + a sealed `kind-staging` project |
| **Resend** | programmatic email **sending** (system + FIGSY cold *today*) + inbound webhook *(cold send migrating to the ENGINE — item 211)* |
| **⚙️ Smartlead** | **THE ENGINE (item 211, decided 23 Jun)** — per-client warmed sending infrastructure: provision+warm mailboxes (SMB) · connect client's own (enterprise) · white-label + `client_id` isolation. The product's deliverability foundation. |
| **Instantly** | cold-email warmup/send for **K.I.N.D's OWN outreach** now (item 198) · ENGINE fallback (no white-label) |
| **Zoho Mail** | company **mailboxes** — MX/receiving + webmail + human send (`get-kind.com` only) |
| **Stripe** | primary payments — per-qualified-lead credit purchases ($1 reveal · $3 FIGSY), invoices (USD). **No subscriptions** — legacy `_MONTHLY` price vars in `stripe.ts` pending removal (#431) |
| **Stripe · Flutterwave** | payments — Stripe (US/EMEA, primary, USD) + Flutterwave (Africa). *Paystack KILLED 25 Jun (no ZAR).* |
| **PDL Full (sourcing) + Hunter (reveal)** | the live data stack — Apollo retired from the data path (BYO/optional only; ⚠️ code still runs Apollo-primary in `enrichment.ts`/`apollo.ts`, cleanup owed). *Planned adds per item 243: Cognism · Clearbit · Lusha · RocketReach · Proxycurl + BetterContact aggregator.* |
| **Anthropic (Claude)** | the agents (FIGSY · Milla · Vida · Denise · **Tony**) + **Nora** (admin co-pilot) + **Alex** (partner). *Casey retired.* |
| **Vapi** | voice agent infra — ⏸ **PARKED 25 Jun** (items 96/144/178; not on the revenue path) |
| **HubSpot / Pipedrive** | CRM dedup + deal push integration (item 43, built) |
| **Domains** | `get-kind.com` (product) · `gettingkind.com` (cold-send identity) |

## 🗄️ DATABASE MIGRATIONS — canonical source-of-truth (#273)
> There are **three** migration folders + one consolidated snapshot, historically out of sync. This is the map. **Do NOT delete or move any migration** — several are already applied to prod; deleting them loses the audit trail. This is documentation only.

**Applied truth (what the DB actually is):** the live/staging Supabase database. `supabase/staging-schema.sql` is a **consolidated, idempotent snapshot** (generated 2026-06-12) that rebuilds a fresh Supabase project in one paste — use it as the diff baseline, but note it predates every migration dated after 2026-06-12.

**One home: `supabase/migrations/` — 127 files (#273, 31 Jul 2026).** The three-directory split is gone. Nothing was deleted (CORE-MAP rule 3): the other two are **tombstoned**, each file carrying a header pointing at its canonical copy, each directory a README explaining why it is there.

| Folder | Role | Rule |
|--------|------|------|
| **`supabase/migrations/`** | **THE home.** 127 files — the 94 already here, 32 consolidated in, 1 recovered from the runner. | Every migration lands here. |
| `packages/db/src/migrations/` | 🪦 **Tombstoned.** 13 files, numbered `001`–`013`, the oldest set (figsy_*, milla_*, vida_*, denise_*, partners). ⚠️ **#554c found most of these tables were probably never created in production at all.** | Do not add. Do not edit. |
| `apps/api/src/migrations/` | 🪦 **Tombstoned.** 19 files. | Do not add. Do not edit. |

⚠️ **This row said "7 files" and there were 19.** A doc describing a directory that had almost tripled is how a stale mental model survives — it is the small version of the same defect #558 records at scale.

**⚠️ Recording a migration and RUNNING one are two different acts.** Nothing applies this directory. There is no `supabase/config.toml`, so the Supabase CLI was never wired up, and the Supabase SQL editor is unreachable (flagged account). The only mechanism the product has is **`PENDING_MIGRATIONS`** in `apps/api/src/lib/pending-migrations.ts` — a TypeScript constant, deliberately not read from disk (`.sql` files are not copied into `dist/` by `tsc`). Vida → Engine → **Run migrations** executes that constant.

| I want to… | Change |
|---|---|
| record a migration | `supabase/migrations/` |
| make the product **run** it | `apps/api/src/lib/pending-migrations.ts` |

Do **both** for anything that must reach production. `migration-home.test.ts` fails the gate if a runner entry has no canonical file, or if a tombstoned copy drifts from its canonical one.

**Known state (31 Jul 2026):**
- **One migration had no file at all.** `20260726_campaign_copilot_columns` existed only as a string inside `pending-migrations.ts` — the product could apply it to production while nothing in the migration record said it existed. Recovered verbatim.
- **`webhook_endpoints` is still FLAGGED as not-yet-applied** to the live DB — see `apps/api/src/routes/developer.ts`. Those routes degrade gracefully until it runs.
- **Which of the 127 production actually has is unknown**, and consolidating does not answer it — the three sets were hand-pasted over months in an unrecorded order. See **[`SCHEMA-DRIFT.md`](./SCHEMA-DRIFT.md)**, and Vida → Engine → **Schema probe (#558)** for the six questions that can be answered live.

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
