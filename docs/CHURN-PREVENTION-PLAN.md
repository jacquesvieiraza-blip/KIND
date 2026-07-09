# 🛡️ K.I.N.D — Churn-Prevention Plan (the retention spine)

> **Plan of record for retention.** Status lives in `PRODUCT-INVENTORY` (items 190–193 + Lena 145). This doc is the *why* and the *sequence*. Strategy conflicts → `KIND-MASTER`.
> **Last-checked:** 23 Jun 2026 (plan still current).

---

## The one-line thesis
**Acquisition is the accelerator. Retention is the brakes + steering.**
A new-logo machine with a leaky bucket doesn't grow — it runs a treadmill. At ~$80 blended ARPU and ~91–92% gross margin, a *saved* client is worth a new-logo win **without paying CAC again**. Every point of churn we remove makes every sales effort compound instead of replace.

### Why this is *the* growth lever (be honest about the maths)
- To net **+10 clients/month** at 5% monthly churn with 50 clients, you must win ~12–13 just to clear the 2–3 you lose. At 10% churn you're winning to stand still.
- Halving churn (5% → 2.5%) is **mathematically identical to doubling new-logo output** — but it's cheaper, faster, and doesn't burn the warm-domain / sending reputation we're protecting for launch.
- Retention is also the **only** path to the agent-family economics (Denise/Tony) and outcome pricing: those gate on margin data that only exists if clients *stay long enough to generate it*.

---

## The six levers (in priority order)

### 1 · Time-to-first-value + expectation-setting  → item **192**
The #1 churn predictor is a client who never reaches first value. Today nothing tracks or rescues a stalled new account.
- Instrument the activation path as explicit milestones: **signup → ICP set → first campaign live → first lead delivered → first reply.**
- If a client stalls at a step beyond a threshold, auto-nudge them **and** flag Lena.
- Set honest expectations at onboarding (cold outbound is a ramp, not day-1 magic) so early quiet days don't read as failure.

### 2 · Deliverability protection  → ties to D9 (item 101) + kill-switch (183)
Churn's silent killer is mail landing in spam — the client sees "no replies" and blames the product.
- Hold D9 at 10/10; keep warmup ramping; never let a client's domain torch its reputation.
- The account-wide **campaign kill-switch (183)** is a retention tool too: one runaway send can burn a domain and the relationship.

### 3 · Proactive customer success (Lena)  → item **145** (elevated)
Reactive support = you only hear from a client when they're already gone. Lena owns the anti-churn stack.
- **At-risk triggers** (no login N days · usage drop · 0 replies in a cycle) surface accounts *before* they cancel.
- A light cadence: activation check-in, first-win celebration, monthly value recap.

### 4 · ROI / value transparency  → items **191** + **193**
Retention dies when the value is invisible. Make it un-ignorable.
- **191 — value dashboard:** per-client totals (leads · meetings · replies · pipeline · $ value) + a monthly "here's your return" recap.
- **193 — REAL data, not fabricated:** ✅ SHIPPED (item 193, 17 Jun): the `× 0.28` guess was removed; analytics now reads real `opened_at`. The pixel `/figsy/track/open/:id` writes `opened_at`; with a branded `TRACKING_URL` the page shows true opens and "—" when tracking is off, never a fake number.

### 5 · Save / pause / win-back  → item **190**
Today cancel is one-way and final — churn is silent and total.
- Offer a graceful **pause** (1–3 month hold: stop billing, keep data + settings warm) on the cancel path instead of a hard exit.
- A **win-back** nudge for lapsed accounts (their data is still warm).

### 6 · Acquisition *quality* (the upstream fix)
The cheapest churn to prevent is the bad-fit client you never sign. Keep ICP discipline — "fast but **sealed**", not "fast and leaky." A wrong-fit logo churns *and* costs CS time that should defend good-fit clients.

---

## Sequence (no client churns before they exist — so build with the funnel)
- **Pre-launch (now):** ✅ the **193 credibility fix** SHIPPED (item 193, 17 Jun) — the `× 0.28` guess was removed; analytics now reads real `opened_at`. Lever 2 (deliverability) is already a launch gate.
- **First clients land (Wk 1–2 post-launch):** turn on **192** activation tracking + nudges and the **at-risk triggers** feeding Lena. This is when the data starts to exist.
- **Month 1:** **191** value dashboard (REAL data) + **190** save/pause/win-back path.
- **As retention data matures:** pull **Lena (145)** forward ahead of the rest of the Month-3 agent family — she is the durable owner of this whole stack.

---

## How we'll know it's working (the only metrics that matter)
- **Activation rate** — % of new clients reaching first reply within 14 days (lever 1).
- **Logo + net-revenue churn** — monthly; net-revenue churn going negative (expansion > loss) is the real win.
- **Time-to-first-value** — trending down.
- **Saves** — accounts pulled back by an at-risk trigger or a pause instead of a cancel.

> **Bottom line:** we will chase new logos hard — but every retention lever above is a multiplier on that effort. Build the brakes and the steering, then floor the accelerator.
