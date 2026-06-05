# GTM Funnel Instrumentation — Scaffold

> 🚧 **DRAFT / SCAFFOLD — NEEDS FOUNDER ANALYTICS DECISIONS.**
> This is the scaffold for Part 1 item **#25** (*Instrument GTM funnel (channel→reply→demo→close, CAC, trial→paid)*, owner 🤝 Both, Week 1 post-launch). It is **blocked on founder analytics decisions** (see §4 Open Decisions). Nothing here should be wired until the founder picks an analytics approach and an attribution model. The stage/event mapping below is grounded in the real schema and routes in `apps/api/src` — but the "where to send the event" half is deliberately left open.

Brand/product context: `apps/api/src/lib/cmo.ts`. Pricing for CAC/LTV math: Lead Gen $1/credit (20/40/100), FIGSY $3/credit (20/40/100), Milla $49/mo, Vida $29/mo, Bundle $69/mo (canonical per EVERYTHING.md). Trial = 14 days + 20 free credits (`auth.ts /onboard`).

---

## 0. The funnel (one line)

```
channel (ad / outreach / referral / organic)
  → signup            (auth.users + clients row)
  → first campaign     (figsy_campaigns active, emails_sent > 0)
  → reply              (figsy_replies, classified)
  → demo booked        (calendar_bookings / demo-request / meetings_booked)
  → close              (paid subscription / credit purchase via Stripe)
```
Plus two ratios layered on top: **CAC** (spend per close) and **trial → paid** conversion.

---

## 1. Stages, metrics, and where each event fires

For each stage: the **metric definition**, the **real place in the system the event would fire** (table/route found in `apps/api/src`), and **capturable today vs needs new instrumentation**.

### Stage 1 — Channel / acquisition
- **Metric:** sessions and signups attributed to a source (paid ad, LinkedIn/FIGSY self-outreach, referral, partner, organic). Channel mix and cost per channel.
- **Where it fires:** first touch is **pre-account** — only partially captured today. `apps/api/src/routes/tracking.ts` `POST /visit` writes `visitor_sessions` (anonymous visit logging). Referral/partner attribution is captured at account creation: `auth.ts /onboard` resolves `referred_by` (client UUID → `clients.referred_by`) or a partner code (→ `partner_referrals`). The playbook lead magnet writes `subscribers` (`subscribe.ts`).
- **Capturable today:** referral source, partner code, and anonymous visits (`visitor_sessions`).
- **Needs new instrumentation:** UTM capture on landing → persisted onto the `clients` row at signup (no `utm_*`/`source` columns on `clients` today); ad spend ingestion (manual or via ad-platform export) for cost-per-channel; tying an anonymous `visitor_session` to the eventual signup (identity stitch).

### Stage 2 — Signup
- **Metric:** count of new accounts; signup → onboard completion rate.
- **Where it fires:** `auth.ts /onboard` — creates the `clients` row (`onboarded_at` set), a `lead_gen` `subscriptions` row (`status='trialing'`, `trial_ends_at` = +14d), and grants 20 trial credits (`credit_transactions.type='trial_bonus'`).
- **Capturable today:** YES — `clients.created_at` / `onboarded_at`, and the trialing subscription row are the durable signup signal. Count of clients = top of the in-product funnel.
- **Needs new instrumentation:** an explicit "signup" / "onboard_completed" analytics event (for funnel tooling), and distinguishing `auth.users` created vs `clients` onboarded (the gap = drop-off between auth and profile).

### Stage 3 — First campaign (activation)
- **Metric:** % of signups that get a FIGSY campaign **live and sending**; time-to-first-campaign.
- **Where it fires:** `figsy.ts` campaign create/activate. Durable signal in `figsy_campaigns` (`status='active'` and `emails_sent > 0`). Leads must exist first (`leads` populated via the Apollo + scoring pipeline; `leads.status` moves `pending → scored`).
- **Capturable today:** YES — `figsy_campaigns` by `client_id` + `status` + `emails_sent`; `leads` count per client. This is the cleanest activation metric we have.
- **Needs new instrumentation:** an "activated" event timestamp for cohort/time-to-value analysis (derivable from `figsy_campaigns.created_at` / first `figsy_sent_emails.sent_at`, but not currently emitted as a funnel event).

### Stage 4 — Reply
- **Metric:** reply rate (replies / emails sent), and **interested** reply rate. Opens optional.
- **Where it fires:** `figsy.ts` inbound handling writes `figsy_replies` (`classification` in interested / not_interested / opt_out / out_of_office / other) and increments `figsy_campaigns.replies_total` / `replies_interested`. Sends and opens are in `figsy_sent_emails` (`sent_at`, `opened_at`).
- **Capturable today:** YES — replies, classification, and per-campaign counters all persist. Open tracking exists (`figsy_sent_emails.opened_at`, migration `20260531_email_open_tracking.sql`).
- **Needs new instrumentation:** none for the raw funnel — this is well covered. (Note: the append-only raw outcome log, EVERYTHING.md item 17b, is the deeper capture layer and is tracked separately — this funnel reads aggregates, not the moat data.)

### Stage 5 — Demo booked
- **Metric:** demos/meetings booked; reply → demo conversion.
- **Where it fires:** two paths exist —
  1. **FIGSY-driven meeting:** `calendar.ts` writes `calendar_bookings`, sets `figsy_replies.meeting_booked_at`, and increments `figsy_campaigns.meetings_booked` (migration `20260529_meetings_booked.sql`).
  2. **Product demo request (K.I.N.D's own sales):** `demo-request.ts` `POST /demo-request` — currently **emails the founder only, does not persist a row.**
- **Capturable today:** the client's FIGSY-booked meetings (yes, durable). For K.I.N.D's own sales funnel, demo bookings go via Calendly (`kind-ai-demo/new-meeting`).
- **Needs new instrumentation:** (a) persist `demo-request` submissions to a table instead of email-only; (b) capture K.I.N.D's own Calendly bookings (Calendly webhook → a `gtm_events` / demo table) — today they live only in Calendly. Decide whether "demo booked" in this funnel means *the client's* demos (product value) or *K.I.N.D's* sales demos (GTM). They are different funnels and should be labelled separately.

### Stage 6 — Close (paid)
- **Metric:** first paid event — either a paid subscription (Milla $49 / Vida $29 / Bundle $69) or a credit purchase (Lead Gen / FIGSY top-up).
- **Where it fires:** `stripe.ts` webhook — `checkout.session.completed` / subscription events write/update `subscriptions` (`status='active'`) and credit purchases write `credit_transactions` + update `clients.credit_balance` / `figsy_credits_remaining`. Partner commissions fire here too (`partner_commissions`).
- **Capturable today:** YES — Stripe webhook → `subscriptions` and `credit_transactions` are the source of truth for revenue. First non-trial paid row = "close".
- **Needs new instrumentation:** a clean "first paid" / "converted" derived event (first `subscriptions` row going `trialing → active`, or first `credit_transactions` of type purchase). Flutterwave (Phase 2) will need the same event emitted from its webhook (`flutterwave.ts`) for parity once activated.

### Ratio A — CAC (Customer Acquisition Cost)
- **Metric:** total acquisition spend in a period ÷ number of closes in that period. Optionally per channel.
- **Where it fires:** **no spend data exists in the system today.** Closes are countable (Stage 6); spend is not.
- **Capturable today:** the denominator (closes) only.
- **Needs new instrumentation:** a place to record spend (ad spend, partner commission already in `partner_commissions`, tooling cost). Likely a manual monthly input or an ad-platform export — this is a founder-process decision, not just a code task.

### Ratio B — Trial → Paid
- **Metric:** of clients who entered a 14-day trial, % that became paying before/within the trial window.
- **Where it fires:** trial start = `subscriptions` row created at onboard (`status='trialing'`, `trial_ends_at`). Conversion = that client later having an `active` paid `subscriptions` row or a real `credit_transactions` purchase (excluding the `trial_bonus` grant).
- **Capturable today:** YES — both ends are in `subscriptions` / `credit_transactions`. This ratio is computable now with a query; it just needs a defined, agreed definition (see Open Decisions).
- **Needs new instrumentation:** none structurally — just the definition lock + a reporting query/dashboard.

---

## 2. Summary table

| Stage | Durable source today | Capturable now? | New work needed |
|---|---|---|---|
| Channel | `visitor_sessions`, `partner_referrals`, `clients.referred_by` | Partial | UTM capture on `clients`; spend ingestion; visit→signup stitch |
| Signup | `clients`, trialing `subscriptions` | ✅ | Explicit event for funnel tool; auth-vs-onboard gap |
| First campaign | `figsy_campaigns` (active, emails_sent), `leads` | ✅ | Activation event / time-to-value |
| Reply | `figsy_replies`, `figsy_sent_emails`, campaign counters | ✅ | None (well covered) |
| Demo booked | `calendar_bookings`, `figsy_campaigns.meetings_booked`; demo-request = email only | Partial | Persist demo-request; Calendly webhook for K.I.N.D sales demos |
| Close | `subscriptions` (active), `credit_transactions` (Stripe webhook) | ✅ | "First paid" derived event; Flutterwave parity later |
| CAC | closes only | Denominator only | Spend recording (manual or ad export) |
| Trial→Paid | `subscriptions` + `credit_transactions` | ✅ | Definition lock + reporting query |

**Read of it:** the **middle of the funnel (signup → reply → close) is already richly captured** in Postgres. The gaps are at the **edges**: top-of-funnel attribution (UTM/spend) and the K.I.N.D-sales demo step. Most "instrumentation" here is really (a) emitting clean funnel events, (b) one or two small tables, and (c) a reporting layer — not deep rebuilds.

---

## 3. Implementation shape (once decisions are made)

Two broad options, to be chosen in §4:

- **Option A — DB-native (no third-party analytics):** add a single append-only `gtm_events(id, client_id, stage, source, metadata jsonb, occurred_at)` table; emit one insert at each fire-point above; build the funnel in the Admin (which already has analytics/revenue routes). Cheapest, all data stays on the one Cape Town DB, no new vendor/DPA. Weakest at anonymous pre-signup attribution.
- **Option B — Product analytics tool (PostHog / GA4):** fire client-side + server-side events into the tool; get funnels, retention, and session attribution out of the box. Stronger top-of-funnel; adds a sub-processor (POPIA/GDPR review needed — Ring 2) and a cost.
- These are not mutually exclusive: many teams do **Option A for revenue truth + Option B for top-of-funnel behaviour.** Decide deliberately.

---

## 4. OPEN DECISIONS — founder must decide (this item is blocked on these)

1. **Analytics tool: PostHog vs GA4 vs none (DB-native).** Drives everything below. Note the sub-processor/DPA implication of any third-party tool (Ring 2 data-protection). Recommendation to evaluate, not a decision.
2. **Attribution model.** First-touch, last-touch, or multi-touch? And what counts as a "channel" (ad / FIGSY self-outreach / referral / partner / organic / direct)?
3. **Which "demo" is the demo stage?** The client's FIGSY-booked meetings (product value) vs K.I.N.D's own sales demos (GTM). Likely track **both**, clearly separated — confirm.
4. **"Close" definition.** First paid subscription only, first credit purchase only, or either? Does a trial that buys credits but no subscription count as closed?
5. **Trial → paid window.** Convert within the 14-day trial only, or any time after? And does the `trial_bonus` credit grant get excluded from "paid" (it should).
6. **CAC inputs + cadence.** Where does spend come from (manual monthly entry, ad-platform export, include/exclude partner commissions and tooling)? Computed monthly? This is a process decision as much as a build.
7. **UTM persistence.** OK to add `utm_source/medium/campaign` (or a generic `acquisition_source`) columns to `clients` and capture them at signup? (Small migration.)
8. **Persist demo-requests.** Approve moving `demo-request.ts` from email-only to also writing a row (and/or a Calendly webhook). Small build, needs the go-ahead.
9. **Identity stitch.** Do we need anonymous `visitor_sessions` linked to the eventual signup? (Higher effort; only worth it under Option B.)
10. **Where the dashboard lives.** Admin (existing analytics/revenue routes) vs the chosen analytics tool's UI.

---

## 5. Notes / cross-references
- This funnel reads **aggregates**. It is distinct from EVERYTHING.md item **17b** (the append-only raw outcome-event log — the data floor / moat), which captures row-level send/reply/outcome fidelity. Don't conflate: 17b is the irreversible pre-launch capture; #25 is the reporting layer on top.
- Flutterwave (Part 4, blocked on key) must emit the same "close" event as Stripe once live, or the close stage under-counts African payments.
- Partner-sourced closes already have a revenue trail (`partner_referrals` → `partner_commissions`); fold this into channel attribution rather than building it twice.
