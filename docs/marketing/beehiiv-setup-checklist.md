# beehiiv Setup Checklist

> **Tick these off in order.** Roughly 3 hours end to end, splittable across a week.
> ⚠️ **Pricing is UNVERIFIED.** `beehiiv.com` is blocked by this environment's egress proxy, so no price on this page has been read by the agent. **Check the current tiers yourself before you start** — the plan assumes a free entry tier and that assumption is load-bearing for the "$0 added to the cost floor" claim in [`MARKETING-PLAN.md`](./MARKETING-PLAN.md).

---

## ⛔ STOP — the two rules that can cost you three weeks

Read these before you click anything.

### Rule 1 · NEVER authenticate a warming domain in beehiiv

**Do not put `kindoutreach.com` or `trykind.org` into beehiiv. Ever.**

Those four mailboxes have been warming in Instantly since 4 Aug and finish ~25 Aug. Warm-up works by building a *gradual, consistent* sending reputation — `+1/day`, weekdays only. **One newsletter blast from a warming domain is exactly the volume spike the whole three weeks exists to avoid.** You would burn the domains and reset send-day.

✅ **Use instead:** `news.get-kind.com` (a subdomain, isolated reputation) **or** beehiiv's own sending domain to start. Both are safe.

### Rule 2 · NEVER change `gettingkind.com` MX records

That domain's MX points at **Resend inbound**, which is what catches client replies — the path you proved end-to-end in A18. Changing its MX silently breaks reply capture, and it fails **quietly**: replies just stop arriving.

`get-kind.com` itself is the brand domain and hosts `hello@get-kind.com` on Zoho. A **subdomain** (`news.`) does not affect the parent's mail. That is why `news.get-kind.com` is the recommendation.

---

## 1 · Create the publication

| ☐ | Step | Notes |
|---|---|---|
| ☐ | Sign up at beehiiv, create a publication | Use `jacques@get-kind.com` |
| ☐ | **Check the pricing tiers yourself** and note what the free tier caps at | Subscriber limit · custom domain? · automations? |
| ☐ | Publication name | Decision owed — see below |
| ☐ | Description, one sentence | *"[WHAT YOU HELP WITH], for [YOUR NICHE]. One short email a week."* |
| ☐ | Upload logo / favicon | Reuse the K.I.N.D mark |
| ☐ | Set the timezone to **UK** | Sends fire in local time |
| ☐ | **Set the publish day and NEVER move it** | Thursday recommended |

**Naming — pick a lane, don't agonise:**
- **Describe the value** — e.g. *"The Pipeline Note"*, *"Ten Prospects"*. Easier to grow, works without you.
- **Your own name.** ⚠️ **Blocked by R2** while stealth holds — it is a personal announcement by definition.

**→ Recommendation: a value name.** It survives R2 either way and does not need re-doing when the gate opens.

---

## 2 · The landing page — ONE ask

| ☐ | Step | Notes |
|---|---|---|
| ☐ | Enable beehiiv's landing page | |
| ☐ | **Headline** — the reader's problem, not your product | |
| ☐ | **Subhead** — what they get and how often | |
| ☐ | **One field: email. One button.** | Every extra field costs signups |
| ☐ | **Delete everything else** | No nav, no pricing, no "learn more", no social icons |
| ☐ | Add one line of proof, if you have any | Skip it entirely rather than invent one |
| ☐ | Check it on your phone | Most opens are mobile |

**Copy template — adapt, don't ship verbatim:**

> ### Still chasing pipeline between client work?
> Every week: one short note on building predictable B2B pipeline without turning your senior people into full-time prospectors. Real examples, no theory.
>
> **[ email ] → [ Get it weekly ]**
>
> *One email a week. Unsubscribe whenever.*

⚠️ **What must NOT go on this page** *(R1, 6 Aug — "never pre-built, never in code, never on the site")*:
- ❌ "Get your 10 free prospects"
- ❌ Any free-tier or trial promise
- ❌ Pricing

**The free-10 is offered by you, in a reply or a call, to a named person.** That is the whole ruling.

---

## 3 · Signup forms and popups

| ☐ | Step | Notes |
|---|---|---|
| ☐ | Generate the embeddable form | For later use |
| ☐ | ⚠️ **Do NOT embed on `get-kind.com` yet** | The site is founder-locked (P12). Flag it, don't edit it |
| ☐ | Popup: **exit-intent only**, desktop | Timed popups on a site with no traffic annoy the few visitors you have |
| ☐ | Add the link to your LinkedIn **company** page | R2 permits the company page |
| ☐ | Add it to your email signature | Free, permanent, works today |

---

## 4 · The welcome sequence — 4 emails

Fires automatically on signup. **This is the highest-leverage thing on this page**: it runs while you sleep and it is the same four emails for the next year.

| ☐ | # | Timing | Job | Structure |
|---|---|---|---|---|
| ☐ | 1 | **Immediate** | Confirm + deliver something now | Thanks · what to expect · **one useful thing immediately** · what day it lands |
| ☐ | 2 | **Day 2** | Why you built this | Short founder story · the problem you saw · what you believe. **No pitch** |
| ☐ | 3 | **Day 5** | Show the machine thinking | One real example: a prospect it picked and *why*. **This is your differentiator** |
| ☐ | 4 | **Day 9** | The soft ask | *"Reply and tell me what you're working on."* ⭐ A reply is the goal — not a click |

### Email 1 — placeholder copy

> **Subject:** You're in — here's the first one
>
> Thanks for subscribing.
>
> Every [DAY] you'll get one short note on [YOUR NICHE]. Real examples from real pipeline work. No theory, no "AI is changing everything."
>
> To start, one thing worth knowing today:
>
> **[ONE GENUINELY USEFUL INSIGHT — 3 sentences]**
>
> That's it. See you [DAY].
>
> — Jacques

### Email 4 — the one that matters

> **Subject:** What are you working on?
>
> You've had a few of these now, so a quick question.
>
> What's the pipeline problem you're actually trying to solve right now?
>
> Hit reply and tell me. I read every one, and it shapes what I write about.
>
> — Jacques

⚠️ **Do not put the free-10 in email 4.** When someone replies, *then* you offer it — personally, to a named human. **The reply is the qualifier.** That is R1 working as designed, and it is also just better selling.

---

## 5 · The weekly issue template

| ☐ | Step |
|---|---|
| ☐ | Build one reusable template |
| ☐ | Same structure every week — the reader learns where to look |
| ☐ | **300–500 words.** If it takes longer than 3 minutes, cut it |
| ☐ | **One CTA. One.** |
| ☐ | Plain text look — designed newsletters read like marketing |

**The structure:**

```
SUBJECT     specific, no clickbait, under 50 characters

HOOK        one or two sentences. The problem, or what happened this week.

THE MEAT    200-350 words. ONE idea. A real example beats an opinion.

THE TAKE    2-3 lines. What you'd actually do about it.

CTA         one line. Usually "hit reply and tell me X"

SIGN-OFF    your name. That's it.
```

**Tone:** how you'd explain it to a founder in a pub. Short sentences. No "leverage", "synergy", "unlock", "game-changer". If you wouldn't say it out loud, cut it.

---

## 6 · Before you send issue #1

| ☐ | Check |
|---|---|
| ☐ | Sending domain is **NOT** `kindoutreach.com` or `trykind.org` |
| ☐ | `gettingkind.com` MX **untouched** |
| ☐ | SPF / DKIM verified for whatever domain you did use |
| ☐ | Sent yourself a test — checked on **phone and desktop** |
| ☐ | Every link clicked |
| ☐ | Unsubscribe link present and working *(legally required — ICO/PECR)* |
| ☐ | Physical address in the footer *(also required)* |
| ☐ | Welcome sequence tested with a **real** second email address |
| ☐ | Publish day set and diarised |

---

## 7 · Standing checks

| Cadence | Check |
|---|---|
| **Weekly** | Issue sent on the right day · open rate logged · every reply answered personally |
| **Monthly** | Prune hard bounces and 90-day non-openers · confirm the plan is still $0 · re-read the one-page plan |

---

## Decisions owed

| # | Decision | Recommendation |
|---|---|---|
| 1 | Publication name | A **value name**, not your own — survives R2 either way |
| 2 | Sending domain | `news.get-kind.com` |
| 3 | Publish day | Thursday. Never moves |
| 4 | Confirm the free tier covers what you need | **Check this first** — it is the only unverified number here |
