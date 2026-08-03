# 🛠️ K.I.N.D — TECH STACK & TOOLS REGISTER
`Last-checked: 9 Jul 2026 (reconciled to the per-qualified-lead model)`

> The **single ledger of every external tool/vendor we run on** — so none goes missing (the "Zoho Mail wasn't logged" lesson, 22 Jun). Reference register, not a tracker (no status dots). **Seeds the Notion → Command Centre → "Tools" page (item 204).** Update whenever a tool is added/changed.

> ## 🚨 STALE — THE SENDING ARCHITECTURE IN THIS REGISTER IS OUT OF DATE (flagged 2 Aug, #608)
> **Three places below still say *"Smartlead = THE ENGINE, the product's deliverability foundation"*** — the ⚙️ THE ENGINE line in the email-architecture section, the Smartlead row in the product-stack table, and the ⚙️ THE ENGINE row in the summary. That was **decided 23 Jun** and has been superseded **twice**:
>
> 1. **#577, founder-locked 26 Jul** — settled by two vendor answers in writing: *our product gives the orders, the vendors drive the van.* Smartlead is one vendor under that model, not its foundation.
> 2. **The Client Zero lock, founder 30 Jul** — of Instantly's bundle we lack exactly one thing, the **warmup network**; its sequencer, sender and unibox duplicate the product we built. So **Instantly drops to Growth (~$37), warmup only**, and **FIGSY + our own send path + our own unibox do the outreach**. **Smartlead is deferred entirely until a client is in the works** — it is not bought, and its API key returns 401.
>
> **FLAGGED, DELIBERATELY NOT REWRITTEN.** Choosing the replacement wording is an architecture statement and belongs to the founder, not to a doc sync. **Until it is rewritten, read #577 and the 30 Jul lock (LAUNCH-PAD HONEST STATE), not the three lines below.** A vendor register that names the wrong engine is exactly the doc someone quotes in a client conversation.
>
> *(Also stale in the table below and left for the same reason: the **Stripe** row still describes "$1 reveal · $3 FIGSY" — the money model has been $99-pack + $4-per-approved since 24 Jul — and the **Stripe · Flutterwave** row names two processors that were both removed, Flutterwave in #314 and Paystack in #352.)*


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
| **PDL Full (sourcing) + Hunter (reveal)** | the **CLIENT-facing** data stack (locked 30 Jul). Both confirmed **$0** on 3 Aug — but free PDL is ~100 records/month, **half of one client's 200-name pack**, so it is a volume ceiling, not a free lunch. *Planned adds per item 243: Cognism · Clearbit · Lusha · RocketReach · Proxycurl + BetterContact aggregator.* |
| **Apollo** | **OUR hunting only** — the paid source we prospect with. **Basic Monthly, $65/mo**, 2,500 credits/month, **0 used**, renews 3 Sep. ⚠️ **THIS ROW ONCE SAID "RETIRED" AND THAT WAS WRONG** — the 1 Aug audit read *"retired from the client data path"* as *"retired"* and recommended deleting four inventory rows; the founder caught it. Apollo is live, paid and in use. *(⚠️ separately true: `enrichment.ts`/`apollo.ts` still run Apollo-primary in the **client** path, which the 30 Jul lock says should be PDL+Hunter — cleanup owed, tracked in the inventory.)* |
| **Anthropic (Claude)** | the agents (FIGSY · Milla · Vida · Denise · **Tony**) + **Nora** (admin co-pilot) + **Alex** (partner). *Casey retired.* |
| **Vapi** | voice agent infra — ⏸ **PARKED 25 Jun** (items 96/144/178; not on the revenue path) |
| **HubSpot / Pipedrive** | CRM dedup + deal push integration (item 43, built) |
| **Domains** | `get-kind.com` (product — invoices, client mail, **never cold outreach**) · `gettingkind.com` (Resend cold-send identity; **send + inbound webhook only, no mailbox exists on it**) · **`kindoutreach.com` + `trykind.org`** — the two throwaway cold-send domains, **bought 3 Aug, £20.45 one-off at GoDaddy**. Two rather than one so a burned reputation on either does not cost another 2–3 week warmup from zero |
| **Google Workspace** | the **4 sending mailboxes** the engine sends over SMTP from — **signed up 3 Aug on `kindoutreach.com` as primary**, with `trykind.org` added afterwards as a **secondary domain in the same subscription** (one bill, one admin login). ~$28/mo, Business Starter × 4. ⏳ **domain verification takes ~48h — pending until ~5 Aug.** ⚠️ **Bought direct from Google, never a vendor's done-for-you box**: #577 records both vendors confirming in writing that they keep the mailbox password, and our engine needs that password to send. ⚠️ Each box needs an **App Password**, not the login password |

## 🗄️ DATABASE MIGRATIONS — canonical source-of-truth (#273)
> There are **three** migration folders + one consolidated snapshot, historically out of sync. This is the map. **Do NOT delete or move any migration** — several are already applied to prod; deleting them loses the audit trail. This is documentation only.

**Applied truth (what the DB actually is):** the live/staging Supabase database. `supabase/staging-schema.sql` is a **consolidated, idempotent snapshot** (generated 2026-06-12) that rebuilds a fresh Supabase project in one paste — use it as the diff baseline, but note it predates every migration dated after 2026-06-12.

**One home: `supabase/migrations/` — 128 files** *(127 at #273, 31 Jul 2026; +1 on 1 Aug — #607's `20260801_retire_trial_status`)*. The three-directory split is gone. Nothing was deleted (CORE-MAP rule 3): the other two are **tombstoned**, each file carrying a header pointing at its canonical copy, each directory a README explaining why it is there.

| Folder | Role | Rule |
|--------|------|------|
| **`supabase/migrations/`** | **THE home.** 128 files — the 94 already here, 32 consolidated in, 1 recovered from the runner, 1 added since (#607). | Every migration lands here. |
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
| **Uptime monitor** | **UptimeRobot free tier, wired to `/health`** (item 199) — a **keyword** monitor, not HTTP-status: `/health` always returns 200 by design so Railway's deploy check passes, and the real state is in the body | ✅ live 3 Aug |
| **Business bank account** | UK Ltd banking | 🧍 confirm/record |

## 🧍 Open tool decisions (founder)
- **Accounting platform** (196) + **reporting currency** (bill USD / file GBP to HMRC) + **VAT** now vs at threshold.
- **CRM for company-ops** — HubSpot (already integrated for the product) or lean on the product's own data.
- **203 repo + auth/hosting** (seller-engine build).

---
*Logged 22 Jun 2026. When Notion is set up (204), this register becomes the Command-Centre "Tools" page; keep ONE home — don't duplicate.*
