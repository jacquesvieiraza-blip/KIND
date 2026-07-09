# Onboarding v2 + Loom slots + day-0/3/7 email sequence

> 🚧 **DRAFT — FOUNDER REVIEW REQUIRED. DO NOT ACTIVATE.**
> This is the draft for Part 1 item **#30** (*Onboarding v2 + Loom slots + day-0/3/7 email sequence*).
> Per EVERYTHING.md, #30 is **gated on the launch run-through** (depends on the 57-step smoke suite passing and #29 — the 3 onboarding Looms — being recorded). Nothing here ships until the founder signs off after a real signup→first-value run-through.
> Brand voice is the authoritative `KIND_BRAND` block in `apps/api/src/lib/cmo.ts`: direct, confident, no fluff, specific numbers, concrete outcomes, active voice. Core line: **"You are not buying software. You are hiring a team."** Avoid: corporate jargon, excessive exclamation marks, "revolutionary"/"game-changing", vague promises, calling it "AI-powered" — just show the outcome.

---

## 0. Goal of onboarding v2

Get a new client from **signup → first scored leads in the dashboard** as fast as possible, then from **first leads → first FIGSY campaign sending**. The single north-star promise from the brand voice is live in the copy: *first leads in under 10 minutes*. Everything below is built to make that promise true and visible.

The flow maps onto the real product surface that already exists (Portal routes per EVERYTHING.md Part 3): `login → onboard → dashboard → leads → figsy`. Onboarding v2 layers how-to cards and a progress checklist over those existing screens — it is not a new product, it is guided activation of what's already built.

---

## 1. Post-signup onboarding flow (step by step)

### Step 1 — Signup
**What the client sees:** the signup form (Portal `/login` → signup). No email-confirmation gate (per Part 3: "auth (no email-confirm)"), so they land straight in. On submit, a `clients` row and trialing `subscriptions` row are created.

**How-to card (inline, top of screen):**
> **Welcome to your AI revenue team.**
> You're not setting up software — you're hiring a team. FIGSY finds the people today; Milla (back office) and Vida (website) are coming soon. Let's get FIGSY her first list. Two minutes.

### Step 2 — Tell us who you sell to (ICP build) — Portal `/onboard`
**What the client sees:** the ICP builder (writes an `icps` row). They can type their target customer in plain language and use **AI ICP Suggest** / **ICP website scan** (both already built, Part 3) to auto-fill industries, job titles, seniority, company sizes, geographies.

**How-to card:**
> **Who do you want in the room?**
> Tell FIGSY who your best customer looks like — industry, role, country. Not sure? Paste your website and we'll draft it for you. You can change it any time; this just gives FIGSY a place to start.

### Step 3 — Get your first leads — Portal `/dashboard` → `/leads`
**What the client sees:** a "Get first leads" action that runs the data waterfall (PDL discovery + Hunter; Apollo BYOK-optional — item 243) + Claude scoring pipeline against their ICP, then populates the `leads` table. Scored, POPIA-compliant leads appear with a score (0–100) and reasoning. The **first-leads email** (already built) also fires.

**How-to card:**
> **Your first leads are landing now.**
> FIGSY pulled people who match your ICP, scored each one, and told you why. Green = go. This is the same work that used to eat your afternoon — done in minutes. Open a lead to see the score reasoning.

### Step 4 — Review & approve the consent-compliant list
**What the client sees:** leads with status (`pending → scored → consent_sent → consent_given`). POPIA consent handling is built in. The client reviews the top-scored leads.

**How-to card:**
> **You stay compliant by default.**
> Every lead is handled POPIA/NDPR-compliant — consent is tracked per contact, opt-outs are permanent. You don't have to think about it. Just pick who's worth a conversation.

### Step 5 — Start your first FIGSY campaign — Portal `/figsy`
**What the client sees:** campaign creation (writes a `figsy_campaigns` row, `status='draft'`), a client-built multi-step sequence (up to 10 steps) FIGSY drafts for them (item 212), and enrollment of selected leads (`figsy_enrollments`). On activate, `status='active'` and FIGSY begins sending (`figsy_sent_emails`), classifying replies (`figsy_replies`), and following up.

**How-to card:**
> **Now hand it to FIGSY.**
> She writes the email, sends it, follows up, and reads the replies so you don't have to. You do one thing: book the meeting when someone's interested. Review her drafts, hit activate, and your pipeline starts running.

### Step 6 — First value reached ✅
**What the client sees:** a campaign in `active` with `emails_sent > 0`, and an onboarding checklist showing complete. The Unibox (two-way, built) is where interested replies surface.

**How-to card:**
> **Your team is on the clock.**
> FIGSY is sending and watching for replies. When one comes in classified "interested," it lands in your Unibox. That's your cue. Everything before the meeting is handled.

### Onboarding progress checklist (persistent UI element)
A small checklist visible until complete:
- [ ] Account created
- [ ] ICP defined
- [ ] First leads delivered
- [ ] First FIGSY campaign activated
- [ ] First reply received

> *Implementation note for founder:* progress can be derived from existing rows — `clients.onboarded_at`, presence of an `icps` row, count of `leads`, a `figsy_campaigns` row with `status='active'`, and `figsy_replies` count. No new tables required to render the checklist.

---

## 2. Loom video slots

Three Looms back the onboarding flow (ties to Part 1 item **#29 — Record 3 onboarding Loom videos**, owner 🧍 Founder). Embed each at the matching step.

### [LOOM PLACEHOLDER 1] — "From signup to your first leads" (target 90s)
Embed at Step 1–3. Should cover: the signup landing, building/auto-suggesting your ICP, and watching the first scored leads appear. End on the score + reasoning so the viewer sees *why* a lead is good, not just that it exists. Tone: "here's the afternoon of work we just did for you."

### [LOOM PLACEHOLDER 2] — "Launching your first FIGSY campaign" (target 2 min)
Embed at Step 5. Should cover: creating a campaign, reviewing FIGSY's multi-step sequence drafts (client-built, up to 10 steps — item 212), enrolling leads, and hitting activate. Show one real draft email so the viewer sees the quality and personalisation. Make the human/AI split explicit: FIGSY writes and sends; you approve and book.

### [LOOM PLACEHOLDER 3] — "Where your replies land + what to do next" (target 90s)
Embed at Step 6 and link from the day-7 email. Should cover: the Unibox two-way inbox, reply classification (interested / not interested / opt-out), and the exact moment to step in and book the meeting. End on the booking link / Calendly handoff so the client knows the one action they own.

---

## 3. Day-0 / Day-3 / Day-7 email sequence

> Voice check: written in the `KIND_BRAND` tone. Sender persona is the AI team (FIGSY speaks in first person where natural — consistent with the example hook *"This email was written by FIGSY. The next one can be about your pipeline."*). Keep subject lines lowercase-leaning and specific. No emoji in body copy. From name: **FIGSY at K.I.N.D**.

### DAY 0 — Welcome + get first leads
**Trigger:** immediately on signup.
**Subject:** You just hired a team. Here's their first job.
**Preview text:** First leads in under 10 minutes.

> Hi {{first_name}},
>
> Welcome. You didn't buy software today — you hired a team. I'm FIGSY, your SDR. Here's how the first hour goes.
>
> **1. Tell me who you sell to.** Industry, role, country. Not sure how to phrase it? Paste your website and I'll draft your ideal customer for you.
> **2. I'll find them and score them.** You'll have your first scored, POPIA-compliant leads in the dashboard — usually in under ten minutes. Each one comes with a reason it scored the way it did.
> **3. You pick who's worth a conversation.** That's it for today.
>
> The afternoon you used to spend building a list that goes cold? That's the part I take off your plate.
>
> [ Build my ICP and get my first leads → ]
>
> — FIGSY
> *Your AI SDR at K.I.N.D*

### DAY 3 — Nudge if no campaign started + what FIGSY does
**Trigger:** day 3, **only if** the client has no `figsy_campaigns` row in `active` status (i.e. leads may exist, but no campaign is sending). Suppress if a campaign is already active.
**Subject:** Your leads are sitting there. I can start the conversation.
**Preview text:** You close. I do everything before that.

> Hi {{first_name}},
>
> You've got leads in the dashboard — good ones. But a list doesn't book meetings. A conversation does. That's my job.
>
> Here's exactly what I do once you start a campaign:
>
> - **I write the email.** Personalised to each person, not a blast.
> - **I send it, then follow up.** A full sequence, spaced properly, so nothing falls through the cracks.
> - **I read every reply and classify it.** Interested, not interested, opt-out — sorted for you.
> - **The interested ones land in your inbox.** You step in to book the meeting.
>
> You close the deal. I find the people, start the conversation, and tee up the meeting. That's the whole split.
>
> Starting your first campaign takes about two minutes — most of it is just reviewing drafts I've already written.
>
> [ Start my first campaign → ]
>
> — FIGSY
> *Your AI SDR at K.I.N.D*

### DAY 7 — Check-in + book a setup call / show early results
**Trigger:** day 7. **Two variants**, branch on whether a campaign is active and has sent.
**Subject (variant A — campaign live):** Week one. Here's what's moving.
**Subject (variant B — still not live):** Want me to set this up with you? 15 minutes.
**Preview text:** Either way, you shouldn't be doing this alone.

> **Variant A — campaign is active and sending:**
>
> Hi {{first_name}},
>
> One week in. Here's where your pipeline stands:
>
> - Emails sent: **{{emails_sent}}**
> - Replies in: **{{replies_total}}**
> - Interested: **{{replies_interested}}**
>
> {{#if replies_interested}}You've got interested replies waiting. The only thing standing between them and a booked meeting is you opening the Unibox. Here's the 90-second walkthrough of exactly what to do: [ How replies work → ]{{/if}}
>
> If you want a second set of eyes on your sequence or your ICP, grab a slot and we'll tune it together.
>
> [ Book a 15-minute setup call → ]
>
> — FIGSY
> *Your AI SDR at K.I.N.D*

> **Variant B — no active campaign yet:**
>
> Hi {{first_name}},
>
> You signed up a week ago and your team is still on the bench. That's usually not because the product is hard — it's because you're busy being the whole sales team. Which is the exact problem we're here to fix.
>
> So let's just do it together. Fifteen minutes, screen share, and you'll walk away with a campaign live and FIGSY sending. No prep needed.
>
> [ Book a 15-minute setup call → ]
>
> Or if you'd rather do it solo, here's the 2-minute version: [ Start my first campaign → ]
>
> — FIGSY
> *Your AI SDR at K.I.N.D*

---

## 4. Open items for founder before activation

- Confirm the booking link used in day-7 CTAs (per EVERYTHING.md the neutral link is `calendly.com/kind-ai-demo/new-meeting`; the personal `jacques-vieiraza/30min` link is flagged as a name-exposure risk in Part 8 #9 — do not use it here).
- Confirm send infrastructure for lifecycle emails (Resend is wired for transactional/first-leads; decide whether day-0/3/7 send via Resend or a lifecycle provider — note Part 1 #35 uses Zoho for the playbook form + lifecycle sends).
- Record [LOOM 1–3] (#29) before embedding placeholders.
- Verify the day-3 and day-7 suppression/branch logic against the real campaign-state query during the launch run-through.
- Founder sign-off on voice for each email.
