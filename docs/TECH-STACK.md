# 🛠️ K.I.N.D — TECH STACK & TOOLS REGISTER

> The **single ledger of every external tool/vendor we run on** — so none goes missing (the "Zoho Mail wasn't logged" lesson, 22 Jun). Reference register, not a tracker (no status dots). **Seeds the Notion → Command Centre → "Tools" page (item 204).** Update whenever a tool is added/changed.

## ✉️ EMAIL ARCHITECTURE — the part that's easy to get wrong
Two **separate** systems, do not conflate:
- **SEND (machine) = Resend.** The app sends ALL programmatic mail via Resend (`RESEND_API_KEY`): transactional/system email **and** FIGSY cold-outreach sends (cold FROM = `FIGSY_COLD_FROM`, e.g. `hello@gettingkind.com`). Inbound delivery/bounce events come back via the Resend webhook.
- **RECEIVE + human mail = Zoho Mail.** Zoho hosts the **company mailboxes** (MX / receiving + webmail) for our domains. **This is where replies to cold/outreach mail actually land, and where you/the team read and send human email** (e.g. `hello@get-kind.com`, `hello@gettingkind.com`, the founder's address). The in-app unibox/inbox (item 112) is a *product view* of the send-log — **the real mailbox is Zoho.**
- **Deliverability:** SPF / DKIM / DMARC verified on the sending domain; warmup tool (**item 198**, Instantly/Mailreach) still to connect. Cold identity = `gettingkind.com`; product identity = `get-kind.com`.

## 🧱 PRODUCT STACK (the live app)
| Tool | Role |
|------|------|
| **Railway** | hosts the 3 app services: `@kind/api` (Express/TS) · `@kind/portal` (Next.js) · `@kind/admin` (Next.js) |
| **Render** | warm standby / failover for the app (item 51) |
| **Cloudflare** | marketing website hosting + load-balancer/failover · DNS |
| **Supabase** | Postgres database + auth (prod) + a sealed `kind-staging` project |
| **Resend** | programmatic email **sending** (system + FIGSY cold) + inbound webhook |
| **Zoho Mail** | company **mailboxes** — MX/receiving + webmail + human send (where replies land) |
| **Stripe** | primary payments — subscriptions, credit purchases, invoices (USD) |
| **Paystack · Flutterwave** | African payment rails |
| **Apollo · PDL · Hunter** | lead-data enrichment waterfall (Apollo also via MCP) |
| **Anthropic (Claude)** | the agents (FIGSY · Milla · Vida · Denise · Casey) |
| **Vapi** | voice agent infra (future — items 96/144/178) |
| **HubSpot / Pipedrive** | CRM dedup + deal push integration (item 43, built) |
| **Domains** | `get-kind.com` (product) · `gettingkind.com` (cold-send identity) |

## 🏢 BUSINESS / OPS STACK (the company layer)
| Tool | Role | Status |
|------|------|--------|
| **Notion** (free tier) | ops/SOP layer — Business Command Centre · Operating Playbook · hiring/HR · compliance calendar · partner/AE handbooks (item 204) | 🧍 set up this week |
| **Accounting platform** | Xero / QuickBooks / FreeAgent / Sage — feeds HMRC; pairs with the sales ledger (item 196) | 🧍 UNDECIDED |
| **Companies House / HMRC** | UK Ltd filings — corporation tax, annual accounts | active (UK Ltd) |
| **ICO** | data-protection registration — done (C1959926) | ✅ |
| **Warmup tool** | Instantly / Mailreach — cold-email reputation (item 198) | 🧍 to connect |
| **Uptime monitor** | external monitor wired to `/health` (item 199) | 🧍 to wire |
| **Business bank account** | UK Ltd banking | 🧍 confirm/record |

## 🧍 Open tool decisions (founder)
- **Accounting platform** (196) + **reporting currency** (bill USD / file GBP to HMRC) + **VAT** now vs at threshold.
- **CRM for company-ops** — HubSpot (already integrated for the product) or lean on the product's own data.
- **203 repo + auth/hosting** (seller-engine build).

---
*Logged 22 Jun 2026. When Notion is set up (204), this register becomes the Command-Centre "Tools" page; keep ONE home — don't duplicate.*
