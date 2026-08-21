# Google Calendar — the verification path

> **Why this exists.** The founder walked the real booking flow on 20 Aug and hit Google's wall:
> the app is in **Testing**, with **0 test users**, and the OAuth client is registered on
> `kindapi-production-….railway.app` — **a domain nobody can verify**, because Google requires
> proof of domain ownership and nobody owns a `railway.app` subdomain.
>
> His ruling (**R55**): *"we need to book in the clients calendar and see"* · *"this is essential
> to pre 25th."*
>
> 🧍 = the founder does it · 🤖 = done in code, already shipped
> Every step says **how we prove it happened** — a value you can read, not "looks fine".

---

## ⚠️ READ THIS FIRST — the 7-day clock is real, and it is dated

**Settled as fact from Google's own documentation** ([developers.google.com/identity/protocols/oauth2](https://developers.google.com/identity/protocols/oauth2), read 21 Aug 2026 — HTTP 200), not inferred:

> *"A Google Cloud Platform project with an OAuth consent screen configured for an external user
> type and a publishing status of **"Testing"** is issued a **refresh token expiring in 7 days**,
> unless the only OAuth scopes requested are a subset of name, email address, and user profile
> (through the `userinfo.email`, `userinfo.profile`, `openid` scopes, or their OpenID Connect
> equivalents)."*

**The exemption does not save us.** We request `calendar.events`, `calendar.freebusy` and
`calendar.calendars.readonly` (#683). Those are not a subset of name/email/profile, so **every
Testing-mode connection dies after 7 days.**

### What that means for the founder's own connection

| | |
|---|---|
| **Connected** | **20 Aug 2026** |
| **Expires** | **~27 Aug 2026** |
| **Launch** | **25 Aug 2026** |

**The bridge holds for launch day and breaks about two days later.** Not a reason to panic — a
reason to know the date. A client who connects on the 25th loses their calendar link on the 1st,
silently, and the first symptom is a booking that does not appear.

### The check ritual

**On 27 Aug**, and every Monday until the app is verified:

1. 🧍 Open **`https://app.get-kind.com/dashboard/settings`** → the Calendar section.
2. Does it still say **connected**? If it says error or disconnected, the refresh token expired.
3. 🧍 If expired: reconnect (10 seconds), and **write the new date here**. That date + 7 is the
   next deadline.
4. **Also worth knowing** — Google lists other reasons a refresh token dies, so an expiry is not
   automatically the 7-day rule: the user revoked access · unused for six months · password
   changed on an account with Gmail scopes · more than 100 live refresh tokens for that account.

> **Connection log** — append a line each time, so the deadline is never reconstructed from memory.
>
> | Connected on | Expires (+7d) | Verified still working |
> |---|---|---|
> | 20 Aug 2026 | 27 Aug 2026 | *(pending — first check 27 Aug)* |

---

## The bridge: test users (use this BEFORE verification lands)

Verification takes days to weeks. **Test users work today**, and this is the important part:

**A test user gets the FULL product. Nothing is degraded.** Real OAuth, real calendar, real
booking. The only differences are the "unverified app" screen they click through once, the
**100-user cap**, and the **7-day token clock** above.

**SOP — 🧍 founder, 2 minutes per client:**

1. Google Cloud Console → **APIs & Services** → **OAuth consent screen** → **Audience**.
2. Under **Test users**, click **+ Add users**.
3. Enter the client's Google address — **the exact address they will connect with.** A personal
   Gmail added when they connect with a Workspace address will not work.
4. Save. They can connect immediately — no wait, no re-deploy.
5. **Prove it:** the address appears in the Test users list, and they reach the consent screen
   rather than "access blocked".

**Tell them what they will see**, or they will think it is broken: an *"Google hasn't verified
this app"* screen → **Advanced** → **Go to K.I.N.D (unsafe)**. It says unsafe because Google has
not reviewed it yet, not because anything is wrong. Sending that sentence with the invite saves
a support conversation every time.

---

## The five stages, in order

### Stage 1 — DNS record for `api.get-kind.com` 🧍

| | |
|---|---|
| **Who** | 🧍 Founder |
| **Where** | Cloudflare → the `get-kind.com` zone → **DNS** |
| **Do** | Add a **CNAME**: name `api`, target = **the value Railway gives you in Stage 2**. ⚠️ Railway tells you the target, so open Stage 2 first and come back — creating a CNAME pointing at a guess is the usual way this stage fails. Set proxy status per Railway's instruction (Railway normally wants **DNS only**, grey cloud). |
| **Prove it** | `dig +short api.get-kind.com` returns the Railway target. From this machine: `curl -sI https://api.get-kind.com/health` eventually returns **200** — and `curl -s https://api.get-kind.com/health \| jq -r .commit` returns the same short SHA as `git rev-parse --short origin/main`. That is the #673 check: it proves the domain reaches **our** deploy, not merely something. |

### Stage 2 — Railway custom domain 🧍

| | |
|---|---|
| **Who** | 🧍 Founder |
| **Where** | Railway → the **API** service → **Settings** → **Networking** → **Custom Domain** |
| **Do** | Add `api.get-kind.com`. Railway shows the CNAME target — that is the value Stage 1 needs. Wait for Railway to show the domain as **Active** with a certificate issued. |
| **Prove it** | Railway shows ✅ next to the domain, and the `/health` curl in Stage 1 returns 200 over **HTTPS** without a certificate warning. |

### Stage 3 — the three values that must agree 🧍 + 🤖

⚠️ **This is where it breaks if it breaks.** Three places hold a redirect URI, and Google
compares them **character for character**. A trailing slash is a mismatch. `http` vs `https` is a
mismatch.

| Where | Set it to |
|---|---|
| **Railway env var** `GOOGLE_REDIRECT_URI` 🧍 | `https://api.get-kind.com/calendar/callback` |
| **Google Console** → Credentials → your OAuth client → **Authorised redirect URIs** 🧍 | the identical string |
| **Google Console** → OAuth consent screen → **Authorised domains** 🧍 | `get-kind.com` |

| | |
|---|---|
| **The code** 🤖 | **Already done — nothing to change.** `GOOGLE_REDIRECT_URI` is read from the environment (`lib/gcal.ts:13`) and every callback redirect follows `PORTAL_URL` (`routes/calendar.ts`). **No host is hardcoded anywhere in the calendar path**, and `calendar-host-portability.test.ts` fails the build if one ever appears. This move is a Railway variable edit and a deploy — not a code change. |
| **Prove it** | Paste the Railway value and the console value into a plain-text editor on two lines and look at them. They must be identical. Then connect a calendar: a mismatch fails with **`redirect_uri_mismatch`** on Google's own error page, which is unambiguous — you will know immediately. |

### Stage 4 — domain ownership verification 🧍

| | |
|---|---|
| **Who** | 🧍 Founder |
| **Where** | [Google Search Console](https://search.google.com/search-console) — the same Google account that owns the Cloud project |
| **Do** | Add `get-kind.com` as a **Domain** property. Google gives you a **TXT** record. Add it in Cloudflare DNS. Return to Search Console and click **Verify**. |
| **Why** | This is the step the `railway.app` domain made impossible — the whole reason for stages 1–3. You cannot prove ownership of somebody else's subdomain. |
| **Prove it** | Search Console shows the property as **verified**, and `dig +short TXT get-kind.com` shows the token. The Cloud Console's **Authorised domains** field then accepts `get-kind.com` without complaint. |

### Stage 5 — submit for verification 🧍

| | |
|---|---|
| **Who** | 🧍 Founder |
| **Where** | Google Cloud Console → **OAuth consent screen** → **Publishing status** → **Publish app** → submit for verification |
| **Have ready** | The app name and logo · the **homepage** `https://www.get-kind.com` · the **privacy policy** `https://www.get-kind.com/privacy.html` (live, and now honest — P13/P48) · a justification for **each** scope · possibly a **demo video** showing the consent screen and what the app does with the data. |
| **Scope justification** — the four, and why each is needed 🤖 | `calendar.events` — create the meeting on the client's calendar · `calendar.freebusy` — offer only times they are actually free · `calendar.calendars.readonly` — read the calendar's **timezone** so business hours are not drawn in UTC · `userinfo.email` — know which account was connected. ⚠️ **Say plainly that we removed `calendar.readonly` on 20 Aug (#683) because we never read event contents.** A narrowed scope list is the strongest thing you can show a reviewer. |
| **Prove it** | The console shows **"Verification in progress"**, and Google emails a case reference. Keep it — replies come to that thread. |
| **Expect** | Days to weeks, and often a round of questions. **The test-user bridge above carries every client in the meantime**, up to 100. |

---

## What is already true, so nobody re-does it

| | |
|---|---|
| 🤖 **Scopes narrowed** | 20 Aug (#683): `calendar.readonly` removed — we no longer ask to read event contents. Pinned by `gcal-scopes.test.ts`. |
| 🤖 **No hardcoded host** | Verified 21 Aug and guarded: `calendar-host-portability.test.ts`. |
| 🤖 **Redirect URI is env-only** | `lib/gcal.ts:13`. The domain move needs no deploy of changed code. |
| 🧍 **Still to do** | Stages 1–5 above. Nothing in stages 1–5 can be done from a codebase. |

---

## ⚠️ Two limits of this runbook, stated rather than discovered later

1. **A green test suite does not mean the connection works.** The guard proves no host is baked
   into the code. It cannot see whether the Railway variable and the console value agree —
   that is Stage 3's paste-and-compare, and it is a human step on purpose.
2. **Verification is Google's decision, not a checklist outcome.** Submitting well makes approval
   likely, not certain. The test-user bridge is what makes that survivable: it is not a
   contingency, it is the plan until Google says yes.
