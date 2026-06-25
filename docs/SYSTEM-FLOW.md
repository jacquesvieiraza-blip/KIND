# 🗺️ K.I.N.D — THE SYSTEM FLOW (one page to see the whole machine)

> **What this is:** the plain-English picture of how the whole thing fits together — where leads come from, how they're processed, how they're sent, and the two engines (Instantly vs Smartlead). Built 25 Jun because the moving parts got hard to hold in one head.
> **Status of record → PRODUCT-INVENTORY** (item IDs in brackets) · **strategy → KIND-MASTER** · **data detail → APOLLO-ENGINE.md** · this is the orientation map only.
> **Last-checked: 25 Jun 2026.** Reconcile when the engine (211), data layer (243), or GTM changes.

---

## 1. THE WHOLE MACHINE — one glance

```
   ┌── DATA (the leads) ──────┐     ┌── BRAIN (FIGSY) ──────┐     ┌── SENDING (two engines) ──────────┐
   │  Apollo  (BYO / optional)│     │                       │     │                                    │
   │  PDL     (discovery ✅)  │────►│  find → reveal email  │────►│  Instantly  = OUR outreach          │
   │  Hunter  (email reveal)  │     │  → score → write      │     │             (win clients)           │
   │  + Cognism/Clearbit/…    │     │  → sequence (212)     │     │  Smartlead  = CLIENTS' sending      │
   │   (item 243 = the stack) │     │                       │     │             (inside the product)    │
   └──────────────────────────┘     └───────────────────────┘     └──────────────┬─────────────────────┘
                                                                                  │
                                                              replies → meetings booked → close
```

**Read it left to right:** find the people → get their email → write + sequence the outreach → send it through the right engine → replies come back → meetings.

---

## 2. THE TWO ENGINES (the bit that confuses — keep them separate)

| | **Instantly** | **Smartlead** |
|---|---|---|
| **Whose outreach** | **OURS** — K.I.N.D selling itself | **CLIENTS'** — inside the product |
| **Purpose** | Win clients (we dogfood FIGSY) | Each client sends their own campaigns |
| **Who runs it** | 🧍 You / founder-led | 🤖 The product, per-client |
| **Item** | 198 (warmup) | 211 (THE ENGINE) |
| **State** | warming (~1–2 wk clock) | Phase 1 done (key verified); Phases 2–6 to build |
| **Rule** | warm before you campaign | 1 domain per client, never shared |

**The one-liner:** *Instantly is how WE get clients. Smartlead is how CLIENTS send. They never touch each other.*

---

## 3. THE DATA LAYER (item 243 = THE FOCUS)

**The job has 3 steps — and the gap is step 2:**

```
①  DISCOVER ──────────►  ②  REVEAL EMAIL ──────►  ③  VERIFY + GATE
   "who matches the ICP"    "get their address"      "deliverable? then send"
   PDL ✅ works             ⚠️ THE GAP — free PDL    bounce-check before the
   (SA 1,360 / US 71,123)   gates the email →        warmed domain; only
   Apollo (BYO), Proxycurl   reveal via Hunter /      campaign verified leads
                             BetterContact / PDL-Enrich
```

- **Apollo = BYO / optional** (reseller under evaluation, ~$7.5k/yr) → day-to-day we run on **PDL + Hunter + the stack**, not Apollo.
- **"Use ALL sources"** = a waterfall: try one, fall through to the next → coverage goes from ~40–60% (one source) to **80%+**. Add: Cognism (EMEA) · Clearbit · Lusha · RocketReach · Proxycurl · **BetterContact** (one integration = 20+).
- **ZoomInfo** = best coverage but enterprise cost (~$15–40k/yr) → later. **Clay** = no embeddable API → our **internal list-builder**, not in-product.
- **Africa reality:** data is real but thinner than the US → go direct as far as data reaches, **partners cover the rest.**

---

## 4. THE TWO GTM TRACKS — mapped onto the flow

```
🅱️ US / UK / EMEA  ── data (PDL+stack) ──► FIGSY ──► INSTANTLY (our outreach) ──► clients   [fast cash]
🅲 AFRICA           ─┬ data (stack, direct) ──► FIGSY ──► INSTANTLY (our outreach) ──► clients  [as far as data reaches]
                    └ PARTNERS (relationships) ──────────────────────────────────► clients   [the residual + moat]
   ↓ once a client signs, THEY send via ↓
                                   SMARTLEAD (the product engine, item 211)
```

- **US/UK/EMEA** = our own direct outreach (data-rich, deliverability-driven). Cold legal in US/UK/IE/FR/NL; avoid DE/PL.
- **Africa** = direct (data-powered) **+** partners — not partners-only.
- **Either way**, once they're a paying client, their campaigns run on **Smartlead**.

---

## 5. WHERE EACH PIECE IS TODAY (status → PRODUCT-INVENTORY)

| Piece | Item | State |
|---|---|---|
| PDL discovery | 244 | 🟢 verified working |
| Email-reveal — boolean-bug fix | 243 | 🟡 SHIPPED + verified live (#740, 8/8 tests) — `email:true` killed |
| Email-reveal — DEPTH (real domain→Hunter) | 243 | 🟡 BUILT (11/11 tests) — Clearbit free autocomplete → real domain → Hunter; live-verify pending |
| More data sources (waterfall) | 243 | 🔴 the focus |
| FIGSY sequences (weak → rebuild) | 212 | 🔴 vital |
| Instantly (our warmup) | 198 | 🟡 warming |
| Smartlead (client engine) | 211 | 🔴 Phase 1 done, 2–6 to build |
| US/UK outreach pack | 127/129 | drafted (`content/our-outreach-us-uk.md`) |
| Partner recruiting | 233 | openers ready (`PARTNER-BRIEF.md`) |

---

## 6. THE BUILD ORDER (so it's never "where do I start?")
1. **Email-reveal fix** (243 step ②) — cheap, unblocks usable leads everywhere.
2. **Stack more sources** (243) — coverage up, Africa-direct viable.
3. **Rebuild sequences** (212) — replies up on every lead.
4. **Engine Phases 2–6** (211) + warmup (198) — the entry ticket to send at scale.
5. **Fire outreach** — US/UK first (data-rich), Africa-direct + partners in parallel.

*That's the whole machine. When in doubt, come back to §1.*
