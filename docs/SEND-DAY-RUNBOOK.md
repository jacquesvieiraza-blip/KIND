# 🚀 SEND-DAY RUNBOOK — you run this alone

> **Why this exists.** The plan used to be "we write the steps near the date, with the agent watching." **Claude access ends 18 Aug and send-day is ~25 Aug**, so that plan died. Everything below was read out of the actual code before it was written down, and it is written to be followed by one person with no agent.
>
> **How to read it.** One action per line. Tick it, then do the next. Anything the code could not confirm is marked **`CHECK:`** — that means *go look, do not assume*. Nothing here asserts a clock time; do the steps in order, not by the hour.
>
> **The single most important rule:** if something on this page does not match what you actually see, **stop and do not flip the switch**. A day lost is recoverable. A burned domain is not.

---

## 0 · The four things that control sending

Know these before anything else — every step below is one of them.

| What | Where it lives | What it does |
|---|---|---|
| **`AUTO_OUTREACH_ENABLED`** | Railway → the API service → Variables | **The kill-switch.** Must be exactly `true` for anything to send. Anything else = every send is deferred (nothing is lost, it just waits). |
| **`FIGSY_COLD_DAILY_CAP`** | Railway → the API service → Variables | A **hard number** of cold emails per UTC day, across all clients. Overrides the ramp below. Unset or 0 = the ramp decides. |
| **`FIGSY_WARMUP_START`** | Railway → the API service → Variables | A date (`YYYY-MM-DD`). The cap then climbs on its own: **days 1–3 → 10/day · day 4 → 20 · days 5–6 → 30 · days 7–8 → 40 · day 9+ → 50 and stays there.** |
| **Mailbox `status`** | Vida → the client → their inbox | Only `active` and `assigned` mailboxes send. **`warming` mailboxes are refused on purpose** — sending on a warming box is what un-warms it. |

**The send loop itself runs every 2 hours** (`/figsy/send-due-all`, on the UTC clock). So after you flip the switch, **the first send happens on the next 2-hourly run, not instantly.** Do not panic in the first ten minutes and do not flip anything twice.

**Two facts that matter and surprise people:**
- **All four mailboxes are already in the engine.** There is no "2-box limit" in the code — it uses every mailbox that is sendable and has SMTP details saved, spreading across them least-used-first. Boxes 3 and 4 join the moment their **status** changes from `warming`; that is a status change, not a code change.
- **Capping is a ceiling, not a target.** Raising the cap does not create volume. It only ever refuses.

---

## 1 · The warmup week (T-7 → T-1)

- [ ] **Every Monday — the Instantly glance.** All 4 mailbox health scores **rising or steady**, and **zero disconnects**.
  - **Bad looks like:** any score falling two weeks running, or any box showing disconnected/auth-failed.
  - **If a box disconnects:** do NOT flip it to active. Reconnect it in Instantly and let it keep warming. A disconnected box that gets used is a deliverability hit you cannot undo.
  - `CHECK:` the exact Instantly screen name and where the health score appears — write it in the margin the first time you look, so future-you does not hunt for it.
- [ ] **18 Aug — the Google charge (~$28) succeeds.** If the card fails, the mailboxes stop and the warmup is dead. Check the billing email actually arrived.
- [ ] **Confirm `FIGSY_WARMUP_START` is set to the real warmup start date.** If it is wrong, the cap is wrong — either throttling you to 10/day on send-day, or letting 50/day out of boxes that are not ready.
- [ ] **Decide the boxes.** Only mailboxes at `active` (or `assigned`) will send. If boxes 3 and 4 have finished warming and you want them in, change their **status** in Vida. If in doubt, leave them warming — two healthy boxes beat four risky ones.

---

## 2 · Pre-flight (T-0, before you flip anything)

Do all of these **before** the switch. Any one of them failing means **do not flip**.

- [ ] **Kill-switch chip in Vida reads `Kill-switch OFF`.** Top bar of the Vida console. This is your starting state and it confirms the chip is live and telling the truth.
- [ ] **Cap chip shows a number, not `⚠ No send cap set`.** Same top bar. If it says "No send cap set", **stop** — an uncapped first day is exactly how a domain gets burned. Set `FIGSY_WARMUP_START` (or `FIGSY_COLD_DAILY_CAP`) and reload.
- [ ] **Send yourself a test email** from Vida (the campaign test send, with send ON, which goes to your own inbox — it bypasses the kill-switch on purpose so you can test while everything is still off).
  - **It must:** arrive in the **inbox, not spam** · read like a person wrote it · have a working unsubscribe · have **no booking link in the first email** (founder-ruled 5 Aug — email 1 earns a reply, not a booking).
  - If it lands in spam, **stop**. Nothing else on this page matters until that is fixed.
- [ ] **mail-tester ≥ 9/10.** Go to mail-tester.com, copy the address it gives you, send a test to it from the same mailbox, then read the score.
  - **≥9/10 → proceed. Below 9 → DO NOT LAUNCH.** Fix what it lists (usually SPF/DKIM/DMARC or link reputation) and re-test.
  - `CHECK:` run this once per sending mailbox you intend to use, not just the first one.
- [ ] **Screenshot the baseline.** From the Vida top bar, capture **`N sent`** and **`N to triage`** *before* the flip. Without a before, you cannot tell an hour later whether anything actually changed.
- [ ] **Confirm you can find the kill-switch in Railway in under 30 seconds.** Open the variable now, look at it, close it. On a bad day you do not want to be searching.

---

## 3 · THE FLIP

- [ ] Railway → the **API service** → **Variables** → set **`AUTO_OUTREACH_ENABLED` = `true`** (lower-case, exactly that word — anything else counts as off).
- [ ] Let the service redeploy/restart.
- [ ] **Confirm it took:** reload Vida. The top-bar chip must now read **`Kill-switch ON`**. If it still says OFF, the variable did not apply — do not set it a second time in a different place; fix the one you set.
- [ ] **Now wait for the next 2-hourly run.** Nothing sends the instant you flip. This is normal.

---

## 4 · The first hour, then the first day

Watch these four things, in this order.

- [ ] **`N sent` is climbing** (Vida top bar, against your baseline screenshot). If it is still 0 after two send-cycles, something is refusing — go to the skip line below.
- [ ] **The enrol-skip line** (#620, on the client's cockpit row): `⚠️ last enrol: N enrolled · M skipped — <reasons>`. This is the line that tells you *refused* from *idle*. Two reasons you will see:
  - `copy_rejected: …` — the copy gate refused the draft (#612).
  - `pecr_individual_risk: …` — a UK lead with no company evidence; refused on purpose (#617). **Not a bug.**
- [ ] **Replies / `N to triage`** — the first replies are the point of the whole exercise. Answer them like a person.
- [ ] **Bounces.** `CHECK:` where your bounce count surfaces (Instantly and/or the Vida unibox) — look at it the first day, not the third.

### The three tripwires — each one means STOP

| Tripwire | What you see | What you do |
|---|---|---|
| **Bounces spiking** | More than a handful of bounces in the first day, or any sharp climb | **KILL** (section 5). A bad list burns the domain fast. |
| **Everything refused** | `N sent` stays 0 **and** the skip line shows a large `skipped` with one repeated reason | Do **not** flip anything on. Read the reason — it is the actual problem. |
| **Deliverability collapse** | A follow-up mail-tester test drops well below 9/10, or your own test lands in spam | **KILL**, then re-test before doing anything else. |

---

## 5 · THE KILL — fastest way to stop everything

In this order. The first one alone is enough to stop new sends.

1. **Railway → API service → Variables → `AUTO_OUTREACH_ENABLED` = `false`.** Every send defers immediately. **Nothing is lost** — enrollments stay due and resume when you turn it back on.
2. **Confirm** the Vida chip flips to `Kill-switch OFF`.
3. **If you need it stopped for one client only:** Vida → that client → **pause the campaign**. This leaves everyone else running.

> Deferred is not deleted. Turning the switch back on resumes exactly where it stopped.

---

## 6 · If a real client pays during this window

**This is the money walk** — the one deliberately not done with a test card. When the first $299 lands, check all three, in order:

- [ ] **Stripe dashboard:** a **$299** payment succeeded (not $99, not $299 minus something odd).
- [ ] **The client's billing page in Milla:** shows their pack as active, **100 included leads**.
- [ ] **The wallet:** the pack purchase **does NOT credit the wallet** — that is correct, not a bug (#562). The $299 *buys* the 100 approvals outright. Their wallet funds only what comes *after* the pack. If you see $299 added to the wallet balance, **that is wrong** — write it down and stop taking payments until it is explained.
- [ ] Their Vida flow rail should read **`✓ Paid $299`** — and **`· Comped`** only on our own house account, never on a client who paid (#619).

---

## 7 · Founder-side settings summary (one place, for the day)

| Setting | Where | Value on send-day |
|---|---|---|
| `AUTO_OUTREACH_ENABLED` | Railway → API service → Variables | `true` at the flip · `false` to kill |
| `FIGSY_WARMUP_START` | Railway → API service → Variables | the real warmup start date, `YYYY-MM-DD` |
| `FIGSY_COLD_DAILY_CAP` | Railway → API service → Variables | leave **unset** to use the ramp · set a number only to override it |
| Mailbox status | Vida → client → inbox | `active` for boxes you want sending · leave `warming` alone |

**The ladder, for reference:** days 1–3 → 10/day · day 4 → 20 · days 5–6 → **30** · days 7–8 → 40 · **day 9+ → 50 and holds**. That is A6's "30 → 50" — already in the code, no action needed beyond having the start date right.

---

*Written 5 Aug against the live code (#621). Every env var, screen and threshold above was read out of the repo, not remembered. Anything marked `CHECK:` is yours to confirm on the day.*
