# 🤝 K.I.N.D — Partner Brief & Sales One-Pager

> ⚠️ **HISTORICAL — partners are frozen (R139, 23 Sep — `packages/shared/src/partners-frozen.ts`), and every price on this page is retired (the $1 ladder, the $299 pack, $4 per lead).** ⛓️ **23 Sep (checked against main `83e9c1b`):** The partner channel is switched off and nothing is deleted. Nothing here may be quoted to a partner or a client; the live model is the **programme, for every account** — **$450 per qualified meeting** on the R81 curve ($450 → $437.50 at 10 → $400 floor from 50), paid 50/50, P1 at start and P2 at approval (**R141**; `packages/shared/src/programme-pricing.ts`); the $299 pack, $4 per approved lead, top-ups, subscriptions and trials are retired in code (**R124 · R137**). Kept as the record, not as current truth.

> # ⚠️ TRUTH BANNER — 6 Aug 2026 (#629). READ BEFORE YOU QUOTE ANYTHING FROM THIS PAGE.
>
> A full sweep of this document against the code on 6 Aug found **9 of 17 factual claims FALSE**. They are being corrected in place, but **this page has been wrong for weeks and may still be wrong in places the sweep missed.**
>
> **The facts that override anything below:**
> | Topic | THE TRUTH (source of record) |
> |---|---|
> | **Price** | **$299** first purchase = the onboarding pack, **100 approved leads included**, then **$4 per approved lead**. Reviewing is FREE. → `packages/shared/src/constants/index.ts` |
> | **No trial, no freebies** | Signup writes `paused` with a **$0 wallet and $0 sourcing allowance**. Nothing sources, approves or sends until the $299 lands. There is **no "free to start"**, no card-free trial, no 14-day clock. → `auth.ts` (#607, 1 Aug) |
> | **The retired ladder** | *$1 reveal → +$3 FIGSY → +$1 Milla → +$1 Denise → Vida $3* is **DEAD** (superseded 24 Jul, price re-locked 3 Aug). Any page still quoting it is describing a model we do not sell. |
> | **Who sends** | **OUR OWN ENGINE**, over SMTP — `figsy.ts` → `lib/mailer.ts` → the inbox from `lib/sending-inbox.ts`. **Instantly = warm-up utility only** (Growth tier). **Smartlead = client sending, deferred and unproven** (key 401s). Resend now carries system mail + the inbound reply webhook only. |
> | **Flutterwave / Paystack** | **Never wired / removed.** Stripe only. |
>
> **Why this banner exists.** The founder, 6 Aug: *"i have not read a doc for 2 weeks because i dont trust it… things slip far to often."* He was right. Locks and rulings now live in **[`PRODUCT-RULES.md`](./PRODUCT-RULES.md)** — read that first, always.


`Last-checked: 25 Jun 2026`

> ⚠️ **PRICING (locked):** per **qualified lead**, no subscriptions. Ladder: **$1 reveal → +$3 FIGSY = $4 → +$1 Milla = $5 → +$1 Denise = $6**; Vida inbound $3 (+$1/+$1 → $4/$5). Quote the ladder — the **$1 reveal is live** (supersedes the old "retire $1 / single $3" note). The old monthly bundles are retired — the packs below are per-lead volume packs on the ladder.

*For approved K.I.N.D partners. Everything you need to sell K.I.N.D to small businesses — the pitch, the trade playbooks, pricing, and how you earn.*

---

## What K.I.N.D is (the 20-second pitch)
**An AI sales team for small businesses.** Four AI agents find leads, draft personalised outreach and follow-ups, and drop a booking link in front of warm replies — so the owner just approves, shows up, and closes.
- **FIGSY — The Opener (AI SDR):** finds qualified leads, drafts a unique email per lead, follows up (a multi-step sequence), and shares a booking link for warm replies.
- **Milla — The Brain (coming soon):** reads the numbers, answers business questions, sends a weekly brief.
- **Vida — The Connector (coming soon):** website chat widget, qualifies inbound 24/7. *(WhatsApp is not a cold channel.)*
- **Denise — The Closer (coming soon):** warm follow-up on quiet prospects, confirms meetings, drafts proposals.

**Why it lands:** outcome pricing (you pay for results, not seats), starts in under 5 minutes, no subscription — $1 to reveal your first leads, compliance built in (GDPR / POPIA).

---

## 🛠️ The trade playbooks (the wedge — sell the outcome, not the software)
Each trade gets a specific funnel + ROI. Lead with these, not features.

| Trade | Who you target | The play | Expected ROI |
|---|---|---|---|
| ⚡ **Electrician** | Property managers / FM in buildings 10+ yrs (aging electrical) | FIGSY books **panel safety audits** | **19:1 – 53:1** @ a ~$240 lead pack |
| 🚰 **Plumber** | Homes 30+ yrs, galvanised piping | Free **video inspection → pipe replacement** (40–60% margin on $2.5–4k jobs) | **37:1 – 75:1** @ a ~$300 lead pack |
| 📸 **Photographer** | Engaged couples / recruiters / estate agents | **Engagement-window** outreach → booked call | **29:1 – 63:1** @ a ~$240 lead pack |
| ❄️ **HVAC tech** | Homeowners with systems 8+ yrs | **Maintenance contracts** ($25–50/mo recurring) → smooth seasonal cash flow | **6:1 → 10:1+ recurring** @ a ~$300 lead pack |
| 🔐 **Locksmith** | Property managers, 10+ multi-unit buildings | **B2B rekeying contracts** ($2–5k/yr, 50–70% margin) | strong, recurring @ a ~$240 lead pack |

**The funnel is the same every time:** FIGSY finds + scores + emails → Vida catches inbound → Denise closes warm replies → Milla reports. *The trade and the target list change; the engine doesn't.* (Full deck: get-kind.com/small-business-playbook)

---

## 💷 Pricing (USD — simple, outcome-based)
**Two things a client buys:**
1. **Reveal a verified contact — $1/lead.** Add **FIGSY** drafted outreach for **+$3 → $4/lead** (a personalised multi-step sequence drafted for approval).
2. **The agents** (per qualified lead — no subscription): **+$1 Milla · +$1 Denise · Vida inbound $3**. So the ladder is $1 reveal → $4 (FIGSY) → $5 (+Milla) → $6 (+Denise). *(⚠️ website `denise.html` still shows a monthly price — reconcile to the per-lead layer and centralise in `packages/shared` PRICING.)*

**Ready-made per-lead volume packs to quote (no monthly fee — e.g. 100 fully-worked leads ≈ $400; +Milla/+Denise layers +$1/lead each):**
| Pack | Price | What's in it |
|---|---|---|
| **Lean** | **~$120** | 20 fully-worked leads ($4/lead) + Milla & Denise layers (+$2/lead) |
| **Recommended** | **~$240–300** | 40–50 fully-worked leads + both layers ($6/lead full stack) |
| **Aggressive** | **~$600** | 100 fully-worked leads + both layers ($6/lead full stack) |
| **Starter (solo)** | **~$50** | 10 fully-worked leads ($4/lead) + Milla layer (+$1/lead) |

**The one-liner:** *"Your best salesperson costs thousands a month before commission. K.I.N.D starts at $1 to reveal a lead and only charges when it finds you a real one."*

---

## 💰 How you earn (partner terms)

> ⛓️ **RECONCILED 26 Aug 2026 — THE TERMS BELOW WERE REPLACED ON 19 AUG (R47). DO NOT QUOTE THE STRUCK LINES TO ANYONE.**
>
> **CURRENT PARTNER TERMS — R47, founder's own words:** *"no 25% does not include the $299 nor the 100 leads we give. its everything after this or above this"* · duration *"lifetime. if they looking after their client its theirs."*
> - **25% of the client's approved-lead spend, after their included first 100** — the only thing that pays.
> - **$0 of the $299 setup pack · $0 on the included first 100 approvals · then 25% of paid approved-lead spend thereafter**, for as long as that attributed client stays **active and spending**.
> - ⚠️ **The funding event is not the commission event.** However a client tops their wallet up, **a payment into the wallet earns nothing by itself** — commission is earned when qualifying **paid approved leads** are taken, after the included first 100. The founder's own words: *"she earns on leads purchased not when they top up… we earn money when they buy leads."* **Leads bought with top-up money still commission normally.**
> - **Recurring for the lifetime of the account**, while that client stays active and spending.
> - Base is **gross** (before card fees), the founder's explicit choice.
> - **At the live $4 price that is $1 per paid approved lead.** ⚠️ **The approved migration target is $8, which makes it $2 — see R68. $8 IS NOT LIVE YET.**
> - The partner **brings and maintains the commercial relationship**; **K.I.N.D owns product quality and delivery.**
>
> ⚠️ **Why the old lines are struck rather than deleted:** the two models both total 25% and are otherwise nothing alike, and a partner who read the old wording would expect to be paid on the $299. They are not. Keeping the old text visible is how that misunderstanding stays traceable.

~~- **Acquisition — 20% one-time** of a new client's **first-month collected spend**, when they sign.~~ ⛓️ *superseded by R47, 19 Aug*
~~- **Retention — 5% recurring** on your **active book** (every client you manage), **every month they stay.**~~ ⛓️ *superseded by R47, 19 Aug*
- **Earned when we collect** — if a client churns, the commission simply stops. **No clawback. No cap. No paperwork.** *(unchanged by R47)*
- **Your own partner dashboard** + an **auto-provisioned demo account** to show prospects live.
- **Unique referral link** — signups are attributed to you automatically (`/partners/ref/<your-code>`).

**Example:** refer 10 clients each buying ~$250 of leads a month (≈ the Recommended pack) → **~$500 in acquisition bonuses** on their first month's spend **+ ~$125/mo recurring** while they keep buying — and the recurring grows every month you keep clients alive.

---

## ▶️ How to start
1. Get approved → receive your partner dashboard + demo account + referral link.
2. Pick a trade, use its playbook, show the demo, quote the bundle.
3. Send your referral link; the client signs up (signup is free; the first purchase is $299 and nothing runs until it lands).
4. ~~On their first paid leads → your **20% acquisition** pays out + your **5% retention** starts, both shown on your dashboard.~~ ⛓️ **CORRECTED 26 Aug (R47):** the $299 pays you **nothing** and their **included first 100 approvals pay nothing**. Your **25%** starts on approval **101** — their first *paid* approved lead — and continues for the lifetime of the account.

*Questions: hello@get-kind.com*

---

## 📣 PARTNER-RECRUITING OPENERS (item 233 · drafted 25 Jun)
> ⚠️ **STEALTH PIVOT (25 Jun): channel changed from founder-LinkedIn → EMAIL, brand-led (faceless K.I.N.D).** The founder cannot be publicly identified (employer-leak risk), so these are **sent by the brand via the warmed domain to a sourced African agency database** — NOT from the founder's LinkedIn. The copy below works as-is for email (drop "saw your LinkedIn"-style lines; lead with the brand). Fill `{{…}}`. Status/action → PRODUCT-INVENTORY 233 · LAUNCH-PAD.

**1 · Warm (someone you know):**
> Hey {{first}} — quick one. I've built **K.I.N.D**: an AI sales team for small businesses — it finds leads, writes & sends the outreach, and books meetings. I'm signing a few partners to resell it to the SMB clients they already have: **20% upfront + 5% every month they stay**, zero build on your side. Worth a 15-min look?

**2 · Cold (agency owner you don't know):**
> Hi {{first}} — saw {{agency}} works with {{client type}}. I run **K.I.N.D**, an AI sales team for small businesses (finds + emails leads, books meetings). I'm bringing on a few agencies to resell it to clients they already have — **20% upfront + 5% recurring**. Open to a quick look?

**3 · Intro ask (to a connector, e.g. Demmy):**
> ⛓️ *(26 Aug: **"20% + 5% recurring" is superseded by R47** — the correct line is **25% of what their clients spend on approved leads, for the lifetime of the account**. Do not send the struck wording.)*
> Hey {{first}} — building out K.I.N.D's partner channel: agencies resell our AI sales team for ~~**20% + 5% recurring**~~ **25% recurring on approved-lead spend**, zero build. You know a lot of agency owners — could you intro me to **2–3** who'd want a recurring revenue line? Happy to send a one-pager you can forward.

**When they reply "tell me more":** send `get-kind.com/small-business-playbook` or offer a 15-min demo. **Follow-up if quiet (~4 days):** *"No worries if the timing's off, {{first}} — want me to send the one-pager so it's there when it's useful?"*
