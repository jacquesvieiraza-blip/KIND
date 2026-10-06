# Google app verification: the submission pack

**Why this exists.** When a client connects Google Calendar in Milla, Google shows an **"unverified app"** warning. The warning goes away only when Google verifies the app. The founder decided on 6 Oct (item 11b): *"I prepare the materials now; you submit."* This file is those materials.

It is a working pack for one submission, not a record of status. Status lives on the Operating Board.

Every fact below was checked on 6 Oct against the code or the live site, as marked.

---

## 1. What Google will review

The app asks for four permissions. They're listed in `apps/api/src/lib/gcal.ts`, `SCOPES` (code verified):

| Scope | Google's class | What we use it for (and nothing else) |
|---|---|---|
| `calendar.events` | Sensitive | Create the meeting a prospect books (`events.insert`), and read it back if the create is retried (`events.get`) |
| `calendar.freebusy` | Sensitive | Find free times: busy **times** only, never event titles, attendees or notes (`freebusy.query`) |
| `calendar.calendars.readonly` | Sensitive | Read the calendar's **time zone** (`calendars.get`), so offered times fall in the client's working hours |
| `userinfo.email` | Not sensitive | The client's own address, so they are invited to their own meeting |

No **restricted** scopes are asked for (no Gmail, no Drive). So this is a **sensitive-scope verification**: no paid security assessment, usually a few weeks of review.

On 20 Aug the scopes were narrowed from `calendar.readonly` (full event contents) to the three above. Say so in the justification: it shows least privilege.

---

## 2. The checklist

| # | What Google asks for | Value | State (6 Oct) |
|---|---|---|---|
| 1 | App name on the consent screen | Must match the brand clients see. Suggest **Milla & Vida** | ☐ Founder confirms in Google Cloud Console → OAuth consent screen |
| 2 | App logo | Square, 120×120 px, the Milla & Vida mark | ☐ Founder uploads |
| 3 | Home page | `https://www.get-kind.com/` | ✅ Live (HTTP 200) |
| 4 | Privacy policy | `https://www.get-kind.com/privacy` | ⚠️ Live (HTTP 200), but **it does not mention Google Calendar or Google user data at all**. Google rejects a policy without this. See §4 |
| 5 | Terms of service | `https://www.get-kind.com/terms` | ✅ Live (HTTP 200) |
| 6 | Authorised domain | `get-kind.com` | ☐ Must be verified as yours in **Google Search Console** (same Google account as the Cloud project) |
| 7 | Redirect URI | Must be on the authorised domain: **`https://api.get-kind.com/calendar/callback`** (`api.get-kind.com` is live and serves the API, checked 6 Oct) | ☐ Founder checks that Railway's `GOOGLE_REDIRECT_URI` and the Console's redirect list both use `api.get-kind.com`, not `…up.railway.app` (Google cannot verify a domain you don't own) |
| 8 | Scope justifications | The text in §3, one per scope | ✅ Ready to paste |
| 9 | Demo video | Unlisted YouTube link following the script in §5 | ☐ Founder records |
| 10 | Support email and developer contact | `hello@get-kind.com` | ☐ Founder confirms |

---

## 3. Scope justifications (paste one per scope)

**`https://www.googleapis.com/auth/calendar.events`**
> Milla & Vida books sales meetings for our business clients. When a prospect picks a time on the client's booking page, we create that one meeting in the client's Google Calendar (events.insert), with the client and the prospect as attendees. If the create call is retried, we read back only the event we created (events.get) so the meeting is never booked twice. We never read, change or delete any other event.

**`https://www.googleapis.com/auth/calendar.freebusy`**
> To offer prospects only times when the client is free, we query the client's free/busy information (freebusy.query). This returns busy time ranges only. We never see event titles, descriptions, attendees or locations.

**`https://www.googleapis.com/auth/calendar.calendars.readonly`**
> We read the time-zone setting of the client's primary calendar (calendars.get), so the meeting times we offer fall within the client's own working hours. We read no events with this scope. We chose it in place of calendar.readonly to avoid access to event contents.

**`https://www.googleapis.com/auth/userinfo.email`**
> We read the connected account's email address so the client is added as an attendee on the meetings booked into their calendar.

---

## 4. The privacy policy gap: needs the founder's OK before anything goes live

Google requires the privacy policy to say what Google user data the app reads, how it is used, and that it follows Google's **Limited Use** rules. Our policy is in three copies: `apps/website/privacy.html`, `apps/portal/public/privacy.html` and `apps/portal/src/app/(legal)/privacy/page.tsx`. None of them mentions Google Calendar.

The policy itself says *"Material changes to this policy will be notified to clients by email 30 days before taking effect."* So **this pack does not change the live policy.** Below is the section proposed for all three copies, with its date updated. Once the founder approves it, it goes in as its own PR.

> **Google Calendar.** If you connect your Google Calendar, Milla & Vida uses it only to book the meetings your prospects choose: we read your free/busy times and your calendar's time zone, create the booked meeting in your calendar, and read your Google account's email address so you are invited to it. We do not read the titles, descriptions, attendees or locations of your other events, and we do not change or delete them. Google user data is not sold, not used for advertising, not used to train AI models, and is not shared with anyone except to provide this booking feature. You can disconnect at any time in Milla → Settings, or at myaccount.google.com/permissions. Milla & Vida's use and transfer of information received from Google APIs adheres to the [Google API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy), including the Limited Use requirements.

---

## 5. Demo video script (2–3 minutes, unlisted on YouTube)

Google checks that the video shows the **real consent screen** and **each scope being used**. Record in one take, in English, at a readable size:

1. Show `https://app.get-kind.com` in the address bar and sign in as a client (House is fine).
2. Go to **Milla → Settings → Google Calendar** and press **Connect**.
3. On Google's consent screen, **pause for 3 seconds**. The app name, the four permissions and the address bar (showing the OAuth client ID in the URL) must all be readable.
4. Approve, and show Milla saying the calendar is connected.
5. Open a prospect's booking link. Show the offered times: *"these are your free times (freebusy), in your time zone (calendars.readonly)."*
6. Book a time. Switch to Google Calendar and show the new meeting with the client invited: *"this is the event we created (calendar.events), with your email as attendee (userinfo.email)."*
7. Show disconnecting in Milla → Settings.

---

## 6. Submitting: the founder's steps, one at a time

1. Approve or edit the privacy section in §4. It ships as its own PR, and the client notice follows the policy's 30-day rule.
2. Verify `get-kind.com` in Google Search Console.
3. Check the redirect URI (checklist row 7).
4. Record and upload the video (§5).
5. Google Cloud Console → **OAuth consent screen**: fill rows 1–10, paste §3, add the video link, then **Prepare for verification → Submit**.
6. Answer Google's follow-up emails. Paste them to Claude and an answer is drafted the same day.
