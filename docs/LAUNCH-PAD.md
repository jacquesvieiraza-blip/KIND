# 🚀 LAUNCH PAD — what to do now

> **This page is a LIST, not a book** (founder, 21 Aug: *"tracking docs need to be like lists… i cant read 60 000 words in 5 minutes"*). Item · one line · owner. **Why** lives in KIND-MASTER · **status** in PRODUCT-INVENTORY · **later** in V2-TRACKER · **rulings** in PRODUCT-RULES.
> **🚀 R57: WE LAUNCH 25 AUGUST REGARDLESS OF STATE.** **R65:** pause is the default — silence is never a go; a build starts only on the founder's "go". Anything that does not aid the live state moves post-live to V2-TRACKER.
> The full pre-surgery page is kept verbatim at [`archive/LAUNCH-PAD-2026-08-21.md`](./archive/LAUNCH-PAD-2026-08-21.md).

**Board:** 🟢106 · 🩷308 · 🟣2 · 🟡50 · 🔴187 · ⏸6 · **Σ659** · live count: `scripts/count-inventory.sh`

---

## 🛑 THE 25TH CUT — the only work between here and live

| # | Action | Owner | When |
|---|---|---|---|
| C1 | 📅 Google Calendar runbook steps 3–5 — test connection · Search Console TXT · submit · add client test users. **The 20-Aug token dies ~27 Aug.** [`runbooks/GOOGLE-VERIFICATION.md`](./runbooks/GOOGLE-VERIFICATION.md) | 🧍 | **now** |
| C2 | 📚 Docs reconciliation — ✅ done, PR #1428 | 🤖 | ✅ |
| C2b | 🔒 **Canonical truth** — an outside audit found the canonical layer contradicting itself. Fixed: KIND-MASTER $99→**$299** · inventory intro off-era → managed/Milla-first · README puts PRODUCT-RULES first · DOC-MAP indexes `compliance/`+`runbooks/` (12 files it never listed) · legal-pack's false *"DPAs ✅ in place"* → **not held** · APOLLO-ENGINE banner → **AR5, Apollo is OURS**. Plus V2-TRACKER restored verbatim (690 → 18,138 words). **Two open PRs — #1430 (V2 restore) + this one. Founder merges.** | 🤖 | ⏳ open |
| C2c | 🔒 **AR5 provider boundary** (#699) — four live doors chose Apollo-vs-PDL by which API keys existed, so clients' sourcing spent K.I.N.D's Apollo and house hunting spent the clients' PDL. Now one audience→provider decision, key-blind, fails closed to `client`. Rulings recorded: **AR12** pool-first · **AR13** company-name house-only · **AR14** preview external-only · **AR15** legacy drain. **22 Aug — GPT-5.6 review caught a second open door:** PDL leads carry a `pdl_…` id, which the paid Apollo reveal treated as truthy, so client records still went to our Apollo. Guard added at that door; `lead-delivery.ts` still untouched. **Second round: the AR8 PDL cash fence was gating the HOUSE** — a Client-Zero Milla run with no PDL allowance said *"Sourcing paused"* and never reached Apollo. Audience now resolves before the fence; the client's AR8 path is unchanged. **AR16** — Hunter is fine for the house too. **PR open — founder merges.** | 🤖 | ⏳ open |
| C3 | 💰 J3 money walk + A9 — the $4 seen moving on screen · one clean fresh signup | 🧍 | pre-25 |
| C4 | 🔎 A10 — Instantly glance · Google ~$28 charge · reconcile the #198 25-vs-30 drift | 🧍 | Sun/Mon 24 |
| C5 | 🧾 B2 — company-cost lines checked in a real browser | 🧍 | pre-25 |
| C6 | 🤝 Partner pre-live — H31 lifetime-clause wording · W1 partner walk, one sitting | 🧍 | pre-25 |
| C7 | ⚖️ W18 counsel booked · PDL Order Form found | 🧍 | pre-25 |
| C8 | ⏳ Triggered — A22 unlock pair · A23 pool-first proof · P15/P16 on counsel's word | 🧍 | on trigger |
| C9 | 🗓️ **A14 — SEND DAY: execute [`SEND-DAY-RUNBOOK.md`](./SEND-DAY-RUNBOOK.md), alone** | 🧍 | **25 Aug** |

**Everything else is post-live** → [`V2-TRACKER.md`](./V2-TRACKER.md) § THE 25TH CUT — PARKED POST-LIVE.

---

## 📊 THE FACTS THAT MUST NOT DRIFT — guarded by `cost-floor-drift.test.ts`

| Fact | The number / the order |
|---|---|
| Cost floor | The cost floor is **$352/mo all-in** — $146 platform + $206 company. At $4/approved lead the platform half alone is ~37 approvals a month, roughly one client. *(Model of record: [`CASHFLOW-LAB.html`](./CASHFLOW-LAB.html).)* |
| A12 · Failover teardown | Failover teardown ($12/mo back) — **DNS repoint FIRST**, then tear down; the order is in [`render-cloudflare-failover.md`](./render-cloudflare-failover.md) and getting it backwards breaks production. 🧍 |

---

## 🔮 OPEN QUESTIONS FOR FABLE — one line each, cleared Wednesdays

| # | The question |
|---|---|
| F1 | `pdl_cursor` retry — can a retried sourcing run charge twice? |
| F2 | Does an opt-out stop us re-SCORING that person, or only stop the sends? (GDPR Art. 21) |
| F3 | Booking path: timezone-mismatch behaviour still unverified (the rest was line-read and proved live) |
| F4 | `pending-migrations.ts` header claims the Supabase dashboard cannot be opened — no longer true |
| F5 | Residency — is `aws-0-eu-west-1` the only place client data lives? (backups · PITR · vendor sub-regions) |
| F9 | `opted_back_in_at` applied to 10 of 13 blocklist probes — fails closed, but inconsistent |
| F10 | `suppressOptOut` writes a normalised blocklist row but updates `leads` with the raw address |
| F11 | `figsy.ts:463` drops a read error on the on-reply path — an unreadable campaign keeps sending |
| F12 | Nothing refuses a secret that is obviously not a secret (`UNSUBSCRIBE_SECRET` held a sentence) |
| F13 | PDL licence — cross-client reuse unconfirmed against the Order Form (counsel, W18) |
| F15 | Apollo terms — no Apollo-sourced record delivered to any paying client without a written right |
| F17 | Does any compliance document still rest on the SA precondition R45 invented? |

**Closed:** F6 (R51 — GA gone, pixel off) · F7 (R47 ruled + built) · F8 (repo-side complete) · F14 (P27 — opens never read) · F16 (#683 — scopes narrowed). Detail: KIND-MASTER session log.

---

## 📌 THE RULES THAT GOVERN THIS PAGE

| Rule | In one line |
|---|---|
| R57 | 25 Aug is unconditional — nothing moves the date |
| R65 | Pause is the default · silence is never a go · not-live-aiding → V2 · LAUNCH-PAD updated in the same PR as every merge |
| R64 | Prove which route renders a surface before building into it (`scripts/dead-surfaces.sh`) |
| R62 | The product keeps UK time — Europe/London |
| §11 | Client-facing work is previewed first — the founder approves 🟣 before it goes live |
| O3 | No ad-hoc SQL — migrations run from Vida → Engine only |

*Dates live in git. This page carries no "last updated" stamp by design.*
