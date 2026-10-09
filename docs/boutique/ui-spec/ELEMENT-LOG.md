# Boutique M&V — every element of both demos, logged

> Walked 9 Oct 2026 in a real browser (Chromium, 1440 wide, the default text size) from the two demos **corrected to R207** in `docs/boutique/`, the reference every Boutique build is checked against (R210 ②). Every presenter step was replayed one by one (Milla 43 steps, Vida 36), and at every step every screen was opened (20 in Milla, 14 in Vida) and every page of Milla's top-right menu (8). Then, at the end state and part-way through, every tab (Context, Coaching), every person (their research and their exact emails), every message preview and every item in the top-right detail panel. Every visible element that carries words or can be clicked was recorded once per screen: **4,224 in Milla and 1,761 in Vida, 5,985 in all**, with its words, kind, type size, weight, colour and the first step it appears at. No page errors. **5,857 are to be built as shown; 128 are demo-only** (presenter and skip-ahead controls) and are never built.

> The demos **as received** (`docs/boutique/received/`, history: they sold a free month) were walked the same way (42 and 36 steps; 4,180 and 1,759 elements). What the correction changed is listed element by element in [`CHANGES-FROM-RECEIVED.md`](./CHANGES-FROM-RECEIVED.md).

> Files: [`milla-elements.json`](./milla-elements.json) and [`vida-elements.json`](./vida-elements.json), one element per line: `view` (the screen, `menu:<page>` for the top-right pages, `chat`, `menu`, `stage rail`), `region`, `kind` (text, heading, control, field), `text`, `size`, `weight`, `color`, `firstStep` (-1 = only seen when a tab, person or item is selected), `status` (build or demo-only) and `card` (the Boutique card that builds it).

> **"Today in the product"** comes from the 9-Oct read-only check of the code. CODE VERIFIED means the code was read; nothing here was walked live (RUNTIME UNVERIFIED).


## Each Boutique card: the screens it builds, and what exists today

| Card | What it builds | Milla screens | Vida screens | Elements to build | Today in the product |
|---|---|---|---|---|---|
| **B1** | Boutique clients start free | — | — | 0 | Not built: free starts are House-only today (`programme.ts`). CODE VERIFIED, 9 Oct read-only check. |
| **B2** | The client's own reply address, and reading replies from it | — | — | 0 | Partly: every send replies to hello@get-kind.com and replies arrive by the Resend inbound webhook; nothing reads the client's mailbox. CODE VERIFIED. |
| **B3** | Mark held, the held count and the $700-per-held bill | — | — | 0 | Not built: `confirmHeld` exists with no callers; no Held button in Vida or Milla. CODE VERIFIED. |
| **B4** | Milla sign-up and Context; Vida Connections | context, signup | connections | 300 | Partly: Milla sign-up and onboarding exist; Vida adds a client mailbox with an app password, stored encrypted (CODE VERIFIED). The Google admin approval and the written OK are not built. |
| **B5** | Objectives: meetings or an event, each with its number | brief | — | 85 | Partly: the Brief sets a meetings goal and direction; events and several objectives are not built. |
| **B6** | People from Clay | — | clay | 173 | Partly: Vida imports a lead CSV (Apollo-style headers, up to 1,000 rows, a dry run first); no Clay link. CODE VERIFIED. |
| **B7** | Research and drafts per person | — | research | 243 | Not built per person: one set of five emails is written per programme today. CODE VERIFIED. |
| **B8** | Quality queue: approve, edit or drop, per person | — | quality | 292 | Partly: the founder approves one set of wording in Vida (FounderWordingApproval); no per-person queue. CODE VERIFIED. |
| **B9** | Proof in Milla: 10 people and the voice | proof | — | 206 | Partly: Milla has a Proof step with example people; not checked against this layout. |
| **B10** | Warm-up: progress to the first email | warmup | — | 68 | Partly: mailbox statuses include warming, and a warming mailbox never sends (CODE VERIFIED); the client-facing progress view is not checked. |
| **B11** | This Week in Milla: one-tap release | week | — | 334 | Partly: the client approves the programme in Milla (CODE VERIFIED); a weekly one-tap release is not checked. |
| **B12** | Sending from the client's mailboxes | — | sending | 58 | Mostly built: sending from client mailboxes, 30 a day per mailbox by default and 50 per client, Monday to Friday, a send run every 2 hours. CODE VERIFIED. |
| **B13** | Conversations: same-day answers; opt-outs the same day | conversations | replies | 153 | Partly: replies show in the Unibox, answers go from the client's mailbox and are sorted by `classifyReply`. CODE VERIFIED. Same-day tracking not checked. |
| **B14** | Meetings: calendar, free prep, 48-hour held rule, "How did it go?", follow-up, the decision after the free meeting | meetings | meetings | 244 | Partly: meetings, calendar booking and the challenge window exist; free prep, "How did it go?" and the follow-up email are not built (R188). |
| **B15** | Moments: 25 / 50 / 75% | objective | moments | 220 | Not built. |
| **B16** | The monthly review (day 30) | day30 | — | 92 | Not built. |
| **B17** | Coaching Phase 1, checked in Vida | coaching | — | 185 | Not built (R188). |
| **B18** | Client intelligence: My ICP, Documents, Conversion, Show the Money | conversion, documents, icp, money | — | 378 | Partly: Your ROI and Documents exist in Milla; the rest not checked. |
| **B19** | Milla's top-right menu | menu:analytics, menu:billing, menu:command, menu:performance, menu:preview, menu:referral, menu:roi, menu:settings | — | 1,857 | Partly: the menu exists (R205 ④); Message preview and the three-pane detail are not built. |
| **B20** | Vida Today board and the new-client handoff | — | handoff, menu, stage rail, today | 217 | Partly: Vida's client list and needs-you tasks exist; not checked against this layout. |
| **B21** | Client health | — | health | 60 | Not checked. |
| **B22** | Money and Capacity in Vida | — | capacity, money | 160 | Not built in Vida (the Money Control Room is a planning page). |
| **B23** | Learning | — | learning | 82 | Not built. |
| **B24** | Event objectives | — | — | 0 | Not built. Shown in the demos inside the Command Centre objective switcher (Vegas expo, User group). |
| **B25** | Milla's shell and Home: the left menu, the stage rail, the header, Home | home, menu, stage rail | — | 254 | Partly: Milla's shell (left menu, chat, header) exists in the redesign look; Home not checked against the demo. |

Not on a card: **chat** (134 messages; Milla's and Vida's words on every screen, which follow the same model, R210 ②) and **later** (66; Always-On and Next Market, shown as "Coming soon"). B1, B2 and B3 change behaviour behind screens the demos already show (Meetings, Billing, Reply queue), so their own element count is small or zero here.


## Milla: every screen

| Screen | Card | Elements to build | Demo-only | First seen at step | Main type sizes |
|---|---|---|---|---|---|
| home | B25 | 210 | 3 | 0 | 7.5px (41), 9px (40), 7.4px (38) |
| signup | B4 | 86 | 2 | 0 | 8px (21), 9px (20), 7.4px (19) |
| context | B4 | 139 | 3 | 0 | 9px (27), 8px (23), 10px (19) |
| brief | B5 | 85 | 3 | 0 | 8px (22), 9px (15), 7.4px (11) |
| proof | B9 | 206 | 2 | 0 | 9px (60), 8.3px (44), 8px (22) |
| warmup | B10 | 68 | 3 | 0 | 8px (23), 7.5px (11), 9px (9) |
| week | B11 | 334 | 3 | 0 | 9px (123), 8.3px (80), 7.7px (30) |
| conversations | B13 | 69 | 4 | 0 | 8px (23), 9px (10), 7.4px (7) |
| meetings | B14 | 112 | 4 | 0 | 8px (23), 9px (22), 7.4px (22) |
| objective | B15 | 139 | 6 | 0 | 8.3px (36), 8px (24), 13px (24) |
| day30 | B16 | 92 | 2 | 0 | 8px (21), 8.3px (19), 13px (13) |
| icp | B18 | 67 | 2 | 0 | 8px (20), 8.3px (12), 7px (8) |
| documents | B18 | 103 | 2 | 0 | 8.3px (44), 8px (20), 7px (11) |
| coaching | B17 | 185 | 8 | 0 | 9px (38), 7.4px (36), 8.5px (24) |
| conversion | B18 | 89 | 2 | 0 | 8.3px (22), 8px (20), 7.4px (11) |
| money | B18 | 119 | 2 | 0 | 8px (21), 8.3px (21), 7.4px (17) |
| soon_alwayson | later | 31 | 2 | 0 | 8px (20), 9px (3), 10px (3) |
| soon_nextmarket | later | 31 | 2 | 0 | 8px (20), 9px (3), 10px (3) |
| stage rail | B25 | 20 | 14 | 0 | 8.5px (20), 8px (14) |
| menu | B25 | 24 | 0 | 0 | 10px (20), 7.5px (3), 8px (1) |
| chat | chat | 66 | 0 | 0 | 10.5px (63), 7.3px (3) |
| menu:performance | B19 | 134 | 4 | 0 | 9px (31), 7.4px (26), 8px (24) |
| menu:analytics | B19 | 351 | 3 | 0 | 9px (100), 8.3px (68), 7.4px (46) |
| menu:roi | B19 | 302 | 3 | 0 | 9px (68), 8.3px (63), 7.4px (45) |
| menu:command | B19 | 352 | 4 | 0 | 9px (84), 7.4px (74), 8px (44) |
| menu:preview | B19 | 240 | 3 | 0 | 9px (61), 7.4px (41), 8.3px (41) |
| menu:settings | B19 | 115 | 2 | 0 | 7.4px (29), 9px (28), 8px (24) |
| menu:billing | B19 | 262 | 2 | 0 | 9px (71), 7.4px (57), 8.3px (41) |
| menu:referral | B19 | 101 | 2 | 0 | 9px (25), 8px (23), 7.4px (21) |

**Type sizes in Milla** (every element, at the default text size): 9px × 884, 8px × 634, 7.4px × 574, 8.3px × 561, 10px × 293, 7px × 225, 7.5px × 214, 8.5px × 209, 13px × 174, 7.7px × 163, 10.5px × 64, 12px × 55, 14px × 52, 9.5px × 45, 21px × 31, 16px × 26, 11px × 17, 7.3px × 3.

**Weights:** 400 × 1,949, 900 × 1,029, 700 × 645, 650 × 390, 850 × 192, 750 × 19.

**Text colours (most used first):** `rgb(23, 20, 28)` × 1,799, `rgb(118, 111, 126)` × 963, `rgb(162, 154, 169)` × 739, `rgb(77, 34, 182)` × 134, `rgb(23, 117, 82)` × 129, `rgb(255, 255, 255)` × 106, `rgb(94, 86, 100)` × 77, `rgb(95, 86, 103)` × 60, `rgb(81, 73, 88)` × 40, `rgb(149, 100, 20)` × 35, `rgb(0, 0, 0)` × 33, `rgb(111, 61, 244)` × 26, `rgb(52, 46, 59)` × 16, `rgb(87, 79, 93)` × 15.


## Vida: every screen

| Screen | Card | Elements to build | Demo-only | First seen at step | Main type sizes |
|---|---|---|---|---|---|
| today | B20 | 107 | 1 | 0 | 8px (33), 8.3px (20), 7px (14) |
| handoff | B20 | 68 | 1 | 0 | 9px (16), 7.4px (15), 7.7px (9) |
| connections | B4 | 75 | 1 | 0 | 7px (24), 8.3px (20), 13px (7) |
| clay | B6 | 173 | 2 | 0 | 8.3px (108), 7px (17), 13px (9) |
| research | B7 | 243 | 1 | 0 | 7.8px (72), 8.3px (56), 9px (33) |
| quality | B8 | 292 | 5 | 0 | 7.8px (78), 8.3px (78), 9px (33) |
| sending | B12 | 58 | 3 | 0 | 8.3px (9), 8px (8), 9px (7) |
| replies | B13 | 84 | 2 | 0 | 8.3px (24), 7px (12), 8px (10) |
| meetings | B14 | 132 | 2 | 0 | 8.3px (34), 9px (24), 7.4px (21) |
| health | B21 | 60 | 2 | 0 | 8.3px (16), 7px (15), 8px (5) |
| moments | B15 | 81 | 2 | 0 | 8.3px (14), 7.4px (13), 7px (12) |
| money | B22 | 97 | 1 | 0 | 8.3px (23), 9px (16), 7.4px (15) |
| capacity | B22 | 63 | 1 | 0 | 10px (10), 13px (9), 6.8px (7) |
| learning | B23 | 82 | 1 | 0 | 8.3px (16), 7.4px (13), 9px (11) |
| stage rail | B20 | 23 | 11 | 0 | 8.5px (23), 8px (11) |
| menu | B20 | 19 | 0 | 0 | 10px (14), 7.5px (4), 8px (1) |
| chat | chat | 68 | 0 | 0 | 10.5px (66), 7.3px (2) |

**Type sizes in Vida** (every element, at the default text size): 8.3px × 418, 9px × 184, 7px × 175, 7.8px × 150, 8px × 144, 7.4px × 135, 7.7px × 91, 13px × 89, 8.5px × 74, 10px × 73, 7.5px × 67, 10.5px × 66, 14px × 28, 16px × 15, 11px × 15, 12px × 14, 9.5px × 14, 6.8px × 7, 7.3px × 2.

**Weights:** 400 × 1,025, 900 × 329, 700 × 302, 850 × 69, 750 × 22, 650 × 14.

**Text colours (most used first):** `rgb(23, 20, 28)` × 857, `rgb(118, 111, 126)` × 243, `rgb(162, 154, 169)` × 239, `rgb(95, 86, 103)` × 118, `rgb(255, 255, 255)` × 58, `rgb(77, 34, 182)` × 42, `rgb(81, 73, 88)` × 35, `rgb(23, 117, 82)` × 34, `rgb(103, 94, 109)` × 33, `rgb(149, 100, 20)` × 17, `rgb(0, 0, 0)` × 16, `rgb(111, 61, 244)` × 14, `rgb(94, 86, 100)` × 14, `rgb(170, 161, 175)` × 11.


## Demo-only: never built

Presenter notes, skip-ahead buttons, demo dates and the preview labels exist only so the demo can be clicked through. They are not part of the product.

| Demo | Screen | Words |
|---|---|---|
| Milla | brief | Boutique M&V · preview, nothing decided |
| Milla | brief | Example number for this preview. |
| Milla | brief | Milla is the client’s view. K.I.N.D does the work as part of the client’s sales team. Presenter keys, separate from the buttons: SPACE next · ← back · R reset · |
| Milla | coaching | Appears after your first held meeting. |
| Milla | coaching | Boutique M&V · preview, nothing decided |
| Milla | coaching | Coaching follows the meeting past “held” into the deal. |
| Milla | coaching | From the 25 people named in week 1. Small numbers: a signal, not proof. |
| Milla | coaching | Milla is the client’s view. K.I.N.D does the work as part of the client’s sales team. Presenter keys, separate from the buttons: SPACE next · ← back · R reset · |
| Milla | coaching | Practice isn’t saved. |
| Milla | coaching | Skip ahead to 5 held (demo · Thu 5 Nov) |
| Milla | coaching | Skip ahead to 8 held (demo · Thu 12 Nov) |
| Milla | context | Boutique M&V · preview, nothing decided |
| Milla | context | Milla is the client’s view. K.I.N.D does the work as part of the client’s sales team. Presenter keys, separate from the buttons: SPACE next · ← back · R reset · |
| Milla | context | Skip ahead to day 3 (demo) |
| Milla | conversations | Boutique M&V · preview, nothing decided |
| Milla | conversations | Milla is the client’s view. K.I.N.D does the work as part of the client’s sales team. Presenter keys, separate from the buttons: SPACE next · ← back · R reset · |
| Milla | conversations | Skip ahead: Morgan accepts Thursday (demo) |
| Milla | conversations | Skip ahead: our answer at 09:28 (demo) |
| Milla | conversion | Boutique M&V · preview, nothing decided |
| Milla | conversion | Milla is the client’s view. K.I.N.D does the work as part of the client’s sales team. Presenter keys, separate from the buttons: SPACE next · ← back · R reset · |
| Milla | day30 | Boutique M&V · preview, nothing decided |
| Milla | day30 | Milla is the client’s view. K.I.N.D does the work as part of the client’s sales team. Presenter keys, separate from the buttons: SPACE next · ← back · R reset · |
| Milla | documents | Boutique M&V · preview, nothing decided |
| Milla | documents | Milla is the client’s view. K.I.N.D does the work as part of the client’s sales team. Presenter keys, separate from the buttons: SPACE next · ← back · R reset · |
| Milla | home | Boutique M&V · preview, nothing decided |
| Milla | home | M&V · Boutique M&V · preview, nothing decided |
| Milla | home | Milla is the client’s view. K.I.N.D does the work as part of the client’s sales team. Presenter keys, separate from the buttons: SPACE next · ← back · R reset · |
| Milla | icp | Boutique M&V · preview, nothing decided |
| Milla | icp | Milla is the client’s view. K.I.N.D does the work as part of the client’s sales team. Presenter keys, separate from the buttons: SPACE next · ← back · R reset · |
| Milla | meetings | Boutique M&V · preview, nothing decided |
| Milla | meetings | Milla is the client’s view. K.I.N.D does the work as part of the client’s sales team. Presenter keys, separate from the buttons: SPACE next · ← back · R reset · |
| Milla | meetings | Skip ahead 48 hours (demo · Sat 24 Oct) |
| Milla | meetings | Skip ahead to 3 held meetings (demo · Thu 29 Oct) |
| Milla | menu:analytics | Boutique M&V · preview, nothing decided |
| Milla | menu:analytics | Milla is the client’s view. K.I.N.D does the work as part of the client’s sales team. Presenter keys, separate from the buttons: SPACE next · ← back · R reset · |
| Milla | menu:analytics | None yet. |
| Milla | menu:billing | Boutique M&V · preview, nothing decided |
| Milla | menu:billing | Milla is the client’s view. K.I.N.D does the work as part of the client’s sales team. Presenter keys, separate from the buttons: SPACE next · ← back · R reset · |
| Milla | menu:command | 0 of 10 held · Boutique M&V · preview, nothing decided |
| Milla | menu:command | Boutique M&V · preview, nothing decided |
| Milla | menu:command | Milla is the client’s view. K.I.N.D does the work as part of the client’s sales team. Presenter keys, separate from the buttons: SPACE next · ← back · R reset · |
| Milla | menu:command | Nothing yet. |
| Milla | menu:performance | Boutique M&V · preview, nothing decided |
| Milla | menu:performance | Milla is the client’s view. K.I.N.D does the work as part of the client’s sales team. Presenter keys, separate from the buttons: SPACE next · ← back · R reset · |
| Milla | menu:performance | OPEN = not supplied for this preview; live sending fills it in. We never track email opens. |
| Milla | menu:performance | Shaded columns are weekends. Hover a column for the day. |
| Milla | menu:preview | Boutique M&V · preview, nothing decided |
| Milla | menu:preview | Full three-email sequences are written for these two people in this preview. |
| Milla | menu:preview | Milla is the client’s view. K.I.N.D does the work as part of the client’s sales team. Presenter keys, separate from the buttons: SPACE next · ← back · R reset · |
| Milla | menu:referral | Boutique M&V · preview, nothing decided |
| Milla | menu:referral | Milla is the client’s view. K.I.N.D does the work as part of the client’s sales team. Presenter keys, separate from the buttons: SPACE next · ← back · R reset · |
| Milla | menu:roi | Boutique M&V · preview, nothing decided |
| Milla | menu:roi | Milla is the client’s view. K.I.N.D does the work as part of the client’s sales team. Presenter keys, separate from the buttons: SPACE next · ← back · R reset · |
| Milla | menu:roi | No held meetings yet. |
| Milla | menu:settings | Boutique M&V · preview, nothing decided |
| Milla | menu:settings | Milla is the client’s view. K.I.N.D does the work as part of the client’s sales team. Presenter keys, separate from the buttons: SPACE next · ← back · R reset · |
| Milla | money | Boutique M&V · preview, nothing decided |
| Milla | money | Milla is the client’s view. K.I.N.D does the work as part of the client’s sales team. Presenter keys, separate from the buttons: SPACE next · ← back · R reset · |
| Milla | objective | Boutique M&V · preview, nothing decided |
| Milla | objective | Milla is the client’s view. K.I.N.D does the work as part of the client’s sales team. Presenter keys, separate from the buttons: SPACE next · ← back · R reset · |
| Milla | objective | Skip ahead to 3 held (demo · Thu 29 Oct) |
| Milla | objective | Skip ahead to 5 held (demo · Thu 5 Nov) |
| Milla | objective | Skip ahead to 8 held (demo · Thu 12 Nov) |
| Milla | objective | Skip ahead to day 30 (demo · Tue 17 Nov) |
| Milla | proof | Boutique M&V · preview, nothing decided |
| Milla | proof | Milla is the client’s view. K.I.N.D does the work as part of the client’s sales team. Presenter keys, separate from the buttons: SPACE next · ← back · R reset · |
| Milla | signup | Boutique M&V · preview, nothing decided |
| Milla | signup | Milla is the client’s view. K.I.N.D does the work as part of the client’s sales team. Presenter keys, separate from the buttons: SPACE next · ← back · R reset · |
| Milla | soon_alwayson | Boutique M&V · preview, nothing decided |
| Milla | soon_alwayson | Milla is the client’s view. K.I.N.D does the work as part of the client’s sales team. Presenter keys, separate from the buttons: SPACE next · ← back · R reset · |
| Milla | soon_nextmarket | Boutique M&V · preview, nothing decided |
| Milla | soon_nextmarket | Milla is the client’s view. K.I.N.D does the work as part of the client’s sales team. Presenter keys, separate from the buttons: SPACE next · ← back · R reset · |
| Milla | stage rail | BOUTIQUE M&V · PREVIEW |
| Milla | stage rail | Demo date · Mon 19 Oct 2026 |
| Milla | stage rail | Demo date · Mon 26 Oct 2026 |
| Milla | stage rail | Demo date · Mon 28 Sep 2026 |
| Milla | stage rail | Demo date · Sat 24 Oct 2026 |
| Milla | stage rail | Demo date · Sun 18 Oct 2026 |
| Milla | stage rail | Demo date · Thu 12 Nov 2026 |
| Milla | stage rail | Demo date · Thu 29 Oct 2026 |
| Milla | stage rail | Demo date · Thu 5 Nov 2026 |
| Milla | stage rail | Demo date · Tue 17 Nov 2026 |
| Milla | stage rail | Demo date · Tue 20 Oct 2026 |
| Milla | stage rail | Demo date · Wed 21 Oct 2026 |
| Milla | stage rail | Demo date · Wed 30 Sep 2026 |
| Milla | stage rail | Demo date · Wed 7 Oct 2026 |
| Milla | warmup | Boutique M&V · preview, nothing decided |
| Milla | warmup | Milla is the client’s view. K.I.N.D does the work as part of the client’s sales team. Presenter keys, separate from the buttons: SPACE next · ← back · R reset · |
| Milla | warmup | Skip ahead to day 21 (demo) |
| Milla | week | Boutique M&V · preview, nothing decided |
| Milla | week | Milla is the client’s view. K.I.N.D does the work as part of the client’s sales team. Presenter keys, separate from the buttons: SPACE next · ← back · R reset · |
| Milla | week | Skip ahead: a reply arrives (demo · Tue 20 Oct) |
| Vida | capacity | Vida is our console: we run each client’s work here, as part of their sales team. Presenter keys, separate from the buttons: SPACE next · ← back · R reset · P n |
| Vida | clay | Skip ahead: Dana approves in Milla (demo) |
| Vida | clay | Vida is our console: we run each client’s work here, as part of their sales team. Presenter keys, separate from the buttons: SPACE next · ← back · R reset · P n |
| Vida | connections | Vida is our console: we run each client’s work here, as part of their sales team. Presenter keys, separate from the buttons: SPACE next · ← back · R reset · P n |
| Vida | handoff | Vida is our console: we run each client’s work here, as part of their sales team. Presenter keys, separate from the buttons: SPACE next · ← back · R reset · P n |
| Vida | health | Skip ahead to Aster’s 50% mark (demo · Thu 5 Nov) |
| Vida | health | Vida is our console: we run each client’s work here, as part of their sales team. Presenter keys, separate from the buttons: SPACE next · ← back · R reset · P n |
| Vida | learning | Vida is our console: we run each client’s work here, as part of their sales team. Presenter keys, separate from the buttons: SPACE next · ← back · R reset · P n |
| Vida | meetings | Skip ahead 48 hours (demo · Sat 24 Oct) |
| Vida | meetings | Vida is our console: we run each client’s work here, as part of their sales team. Presenter keys, separate from the buttons: SPACE next · ← back · R reset · P n |
| Vida | moments | Skip ahead to day 30 (demo · Tue 17 Nov) |
| Vida | moments | Vida is our console: we run each client’s work here, as part of their sales team. Presenter keys, separate from the buttons: SPACE next · ← back · R reset · P n |
| Vida | money | Vida is our console: we run each client’s work here, as part of their sales team. Presenter keys, separate from the buttons: SPACE next · ← back · R reset · P n |
| Vida | quality | Approve the other 23 (demo) |
| Vida | quality | Approve the other 24 (demo) |
| Vida | quality | For the demo the editor opens with the claim already taken out. |
| Vida | quality | Skip ahead: Dana releases the week (demo · Sun 18 Oct) |
| Vida | quality | Vida is our console: we run each client’s work here, as part of their sales team. Presenter keys, separate from the buttons: SPACE next · ← back · R reset · P n |
| Vida | replies | Skip ahead: Morgan accepts Thursday (demo) |
| Vida | replies | Vida is our console: we run each client’s work here, as part of their sales team. Presenter keys, separate from the buttons: SPACE next · ← back · R reset · P n |
| Vida | research | Vida is our console: we run each client’s work here, as part of their sales team. Presenter keys, separate from the buttons: SPACE next · ← back · R reset · P n |
| Vida | sending | Skip ahead: Dana releases the week (demo · Sun 18 Oct) |
| Vida | sending | Skip ahead: replies arrive (demo · Tue 20 Oct) |
| Vida | sending | Vida is our console: we run each client’s work here, as part of their sales team. Presenter keys, separate from the buttons: SPACE next · ← back · R reset · P n |
| Vida | stage rail | Demo date · Fri 16 Oct 2026 |
| Vida | stage rail | Demo date · Mon 19 Oct 2026 |
| Vida | stage rail | Demo date · Mon 26 Oct 2026 |
| Vida | stage rail | Demo date · Mon 28 Sep 2026 |
| Vida | stage rail | Demo date · Sat 24 Oct 2026 |
| Vida | stage rail | Demo date · Thu 5 Nov 2026 |
| Vida | stage rail | Demo date · Tue 17 Nov 2026 |
| Vida | stage rail | Demo date · Tue 20 Oct 2026 |
| Vida | stage rail | Demo date · Wed 21 Oct 2026 |
| Vida | stage rail | Demo date · Wed 7 Oct 2026 |
| Vida | stage rail | VIDA · BOUTIQUE M&V · PREVIEW |
| Vida | today | Vida is our console: we run each client’s work here, as part of their sales team. Presenter keys, separate from the buttons: SPACE next · ← back · R reset · P n |

## The files this log was made from

- `docs/boutique/Milla_BoutiqueMV_Demo.html` · sha256 `726f5a80a1d9d76d…`
- `docs/boutique/Vida_BoutiqueMV_Demo.html` · sha256 `3d415ec72edb140f…`
- `docs/boutique/received/Milla_BoutiqueMV_Demo.html` · sha256 `e2d92e5157acee2b…`
- `docs/boutique/received/Vida_BoutiqueMV_Demo.html` · sha256 `93b6ee02eccf508a…`
