# Vida V2 — the UI spec, element by element

> Generated 8 Oct 2026 from `docs/precision/Vida_V2_Deepened_FIXED.html` (the founder's file, byte for byte), opened in a real browser (Chromium, 1440×900, plus a 390-wide phone view). Every step of the clickthrough was rendered, and every element that shows text or can be clicked was recorded with its exact words, position, font, size, weight, colours and corner rounding. **21 views, 1368 distinct elements, 0 script errors.** This is the reference the build is checked against (R204). **R205:** Vida is refined, simpler and better, and the founder approves every screen's layout before it is built.

## 1 · The look

**Font:** Inter (1368)

**Colour tokens declared by the demo** (`:root`):

| Token | Value |
|---|---|
| `--ink` | `#17141c` |
| `--muted` | `#766f7e` |
| `--dim` | `#a29aa9` |
| `--line` | `#e8e3ec` |
| `--line2` | `#ddd5e5` |
| `--page` | `#f6f4f8` |
| `--panel` | `#fff` |
| `--wash` | `#fbf9fd` |
| `--accent` | `#6f3df4` |
| `--accent2` | `#d84ca5` |
| `--deep` | `#4d22b6` |
| `--soft` | `#f3edff` |
| `--good` | `#177552` |
| `--goodbg` | `#eaf7f0` |
| `--warn` | `#956414` |
| `--warnbg` | `#fff4dc` |
| `--red` | `#b43b49` |
| `--redbg` | `#fff0f2` |
| `--shadow` | `0 22px 65px rgba(35,22,52,.10)` |

**Text colours in use** (how many elements):

| Colour | Elements |
|---|---|
| `#17141c` | 674 |
| `#a29aa9` | 233 |
| `#766f7e` | 176 |
| `#4d22b6` | 93 |
| `#5f5667` | 77 |
| `#675e6d` | 33 |
| `#ffffff` | 22 |
| `#177552` | 15 |
| `#aaa1af` | 8 |
| `#706475` | 8 |
| `#956414` | 6 |
| `#514958` | 6 |
| `#5e5664` | 5 |
| `#b43b49` | 4 |
| `#6a6270` | 4 |
| `#000000` | 2 |

**Background colours in use:**

| Colour | Elements |
|---|---|
| `#fcfbfd` | 73 |
| `#ffffff` | 28 |
| `#f3edff` | 23 |
| `#eef5ff` | 20 |
| `#f0edf3` | 20 |
| `#eaf7f0` | 14 |
| `#fff4dc` | 12 |
| `#faf8fc` | 6 |
| `#f0eafd` | 5 |
| `#fff0f2` | 4 |
| `#f8f3ff` | 4 |

**Type sizes** (rendered px, smallest to largest):

| Size | Elements | For example |
|---|---|---|
| 6.8px | 10 | signal · research · claims |
| 7px | 172 | OPERATOR · High risk · Watch |
| 7.3px | 1 | Vida |
| 7.4px | 84 | PRECISION FACTORS ONLY · NO COMMERCIAL CONTAMINATION · Sending stopped |
| 7.5px | 76 | Vida operator · Acorn Digital · Harborline · Juniper |
| 7.6px | 7 | Approved by: Operator · Time: 08 Oct · 0 · Approval record · Approved by: Operator · Time: 08 Oct · 0 |
| 7.7px | 57 | risk factor · not a risk factor · Milla/client |
| 7.8px | 42 | Ridgewell careers lists new service-coor · Aster CRM: closed-lost for timing on 17  · Apollo: Morgan remains Operations Direct |
| 7.9px | 2 | Email 2 · Email 3 |
| 8px | 95 | V2 · Precision + Future execution · VIDA · PRECISION FUTURE V2 · Vida is the internal execution agent. Th |
| 8.3px | 399 | Acorn Digital · Sending stopped 26h · mailbox limit + ch · No |
| 8.5px | 158 | Receive · Context · Find |
| 9px | 81 | Cross-client operating truth · current p · Send · Needs you · live stalls |
| 9.5px | 1 | Message Vida… |
| 10px | 50 | Aster Field Systems Ltd. · Today board · Quality queue |
| 10.5px | 20 | Today Board uses only Precision risk fac · The handoff defines the commercial outco · Connections are capabilities with author |
| 11px | 1 | Vida |
| 12px | 40 | Today Board · Today Board · Outcome Handoff |
| 13px | 62 | 1 · 2 · 7 |
| 14px | 2 | Milla · Vida · &Vida |
| 16px | 8 | V · V · Morgan Lee |

**Weights:** 400 (766), 650 (1), 700 (288), 750 (16), 850 (61), 900 (236)

**Corner rounding:** 999px (76), 9px (31), 8px (31), 13px (20), 7px (7), 10px (2), 11px (1)

## 2 · The process: every step of the clickthrough, in order

| # | Screen | Screen title | Subtitle | Status |
|---|---|---|---|---|
| 1 | home | Today Board | Cross-client operating truth · current priorities | 1 HIGH · 2 WATCH |
| 2 | handoff | Outcome Handoff | Milla → Vida · exact client truth | RECEIVED |
| 3 | connections | Connections | Authorised sources · status and limits | LIVE + PARTIAL |
| 4 | market | Market Map Pre-flight | Approved market × relationship memory | CONTEXTUALISING |
| 5 | market | Ridgewell Relationship Record | Closed-lost timing → changed circumstances | REACTIVATION |
| 6 | identity | Identity Resolution | Northbank Maintenance · Noah Carter everywhere | RESOLVED |
| 7 | signals | Why-Now Signal Store | Dated facts · source · expiry · relationship precedence | SOURCE LINKED |
| 8 | research | Person Research | Company · person · situation · sources | 6 RESEARCHED |
| 9 | quality | Quality Queue | Six people · exact three-email packages · human decisions | 6 HUMAN CHECKS |
| 10 | eligibility | Final Eligibility | All gates immediately before send | READY |
| 11 | mailbox | Mailbox Fleet | Aster-owned Google account · sender Dana Reyes, COO | 5 READY · 1 WARMING |
| 12 | sending | Precision Sending | Six first emails this week · exact approved packages | SENDING |
| 13 | sending | Continuous Eligibility | Alderline · relationship change beats prospecting | FOLLOW-UPS CANCELLED |
| 14 | replies | Reply Queue | All clients · oldest first · same-day target | 5 WAITING |
| 15 | meetings | Meetings | 48-hour held rule · billing truth · free prep | 1 HELD |
| 16 | health | Client Health | Aster first · Acorn risk detail without cross-client table | ASTER HEALTHY |
| 17 | learning | Learning | Client-scoped evidence → proposed changes | CONTROLLED |
| 18 | always | Always-On | Continuous context · selective action · remembered client choices | FUTURE INTELLIGENCE |
| 19 | audit | Audit & Evidence | Joined records · same IDs in Milla and Vida · claim policy | TRACEABLE |
| 20 | audit | Vida V2 Complete | Precision + restored future intelligence | COMPLETE |
## 3 · Every element, screen by screen

Each screen lists its elements in the order they sit on the page (top to bottom, left to right). Position is x, y, width × height in px at 1440 wide. Size/weight is the rendered type. Colours are text on background.

### home (130 elements · first seen: step 1: Today Board)

| Region | Element | Exact text | x, y · w×h | Size · weight | Colour on background | Rounding |
|---|---|---|---|---|---|---|
| body | `div.mark` | V | 18, 15 · 34×34 | 16px · 900 | `#ffffff` on `transparent` | 11px |
| #screenTitle | `b` | Today Board | 232, 19 · 208×14 | 12px · 700 | `#17141c` on `transparent` | 0px |
| body | `div.client` | Aster Field Systems Ltd. | 1271, 22 · 151×20 | 10px · 850 | `#17141c` on `transparent` | 0px |
| body | `b` | Milla · Vida | 61, 24 · 135×16 | 14px · 700 | `#17141c` on `transparent` | 0px |
| body | `span` | &Vida | 99, 24 · 47×16 | 14px · 700 | `#6f3df4` on `transparent` | 0px |
| body | `small` | V2 · Precision + Future execution | 1271, 33 · 151×9 | 8px · 650 | `#766f7e` on `transparent` | 0px |
| #screenSub | `span` | Cross-client operating truth · current priorities | 232, 35 · 208×10 | 9px · 400 | `#766f7e` on `transparent` | 0px |
| #stage | `span.lab` | VIDA · PRECISION FUTURE V2 | 18, 80 · 153×9 | 8px · 900 | `#a29aa9` on `transparent` | 0px |
| #stage | `span.s` | Receive | 183, 80 · 37×10 | 8.5px · 900 | `#4d22b6` on `transparent` | 0px |
| #stage | `span.s` | Context | 250, 80 · 38×10 | 8.5px · 750 | `#aaa1af` on `transparent` | 0px |
| #stage | `span.s` | Find | 318, 80 · 21×10 | 8.5px · 750 | `#aaa1af` on `transparent` | 0px |
| #stage | `span.s` | Research | 369, 80 · 44×10 | 8.5px · 750 | `#aaa1af` on `transparent` | 0px |
| #stage | `span.s` | Check | 443, 80 · 29×10 | 8.5px · 750 | `#aaa1af` on `transparent` | 0px |
| #stage | `span.s` | Send | 501, 80 · 24×10 | 8.5px · 750 | `#aaa1af` on `transparent` | 0px |
| #stage | `span.s` | Convert | 556, 80 · 38×10 | 8.5px · 750 | `#aaa1af` on `transparent` | 0px |
| #stage | `span.s` | Learn | 623, 80 · 27×10 | 8.5px · 750 | `#aaa1af` on `transparent` | 0px |
| #stage | `span.s` | Replenish | 680, 80 · 47×10 | 8.5px · 750 | `#aaa1af` on `transparent` | 0px |
| body | `div.avatar` | V | 203, 119 · 31×31 | 16px · 900 | `#ffffff` on `transparent` | 10px |
| #workTitle | `b` | Today Board | 704, 124 · 83×14 | 12px · 700 | `#17141c` on `transparent` | 0px |
| #workState | `div.state` | 1 HIGH · 2 WATCH | 1330, 124 · 96×21 | 8px · 900 | `#675e6d` on `#f0edf3` | 999px |
| body | `b` | Vida | 243, 126 · 27×13 | 11px · 700 | `#17141c` on `transparent` | 0px |
| body | `div.online` | ● ONLINE | 633, 130 · 44×9 | 8px · 900 | `#177552` on `transparent` | 0px |
| #navIn | `div.navlab` | Vida operator | 10, 131 · 169×15 | 7.5px · 900 | `#a29aa9` on `transparent` | 0px |
| body | `span` | V2 · Precision + Future execution | 243, 140 · 133×9 | 8px · 400 | `#766f7e` on `transparent` | 0px |
| #workSub | `span.sub` | Cross-client operating truth · current priorities | 704, 141 · 185×9 | 8px · 400 | `#766f7e` on `transparent` | 0px |
| #navIn | `button.active (click)` | Today board | 10, 146 · 169×29 | 10px · 900 | `#4d22b6` on `#f0eafd` | 9px |
| #navIn | `button (click)` | Quality queue | 10, 177 · 169×29 | 10px · 400 | `#5e5664` on `transparent` | 9px |
| #thread | `div.who` | Vida | 208, 179 · 428×11 | 7.3px · 900 | `#a29aa9` on `transparent` | 0px |
| #thread | `div.bubble` | Today Board uses only Precision risk factors. Acorn is High because sending stopped 26 hours ago and the checked queue is empty. Harborline and Juniper are Watc | 205, 194 · 431×67 | 10.5px · 400 | `#17141c` on `#eef5ff` | 13px |
| #workspace | `b` | Needs you · live stalls | 716, 195 · 111×10 | 9px · 700 | `#17141c` on `transparent` | 0px |
| #navIn | `button (click)` | Reply queue | 10, 208 · 169×29 | 10px · 400 | `#5e5664` on `transparent` | 9px |
| #workspace | `strong` | Acorn Digital | 716, 222 · 181×11 | 8px · 700 | `#17141c` on `transparent` | 0px |
| #workspace | `span` | mailbox at limit, no checked messages left, nothing sent in 24h | 905, 222 · 289×11 | 8px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `span` | Operator | 1201, 222 · 108×11 | 8px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `span` | today | 1318, 222 · 96×11 | 8px · 400 | `#17141c` on `transparent` | 0px |
| #navIn | `button (click)` | Mailbox fleet | 10, 239 · 169×29 | 10px · 400 | `#5e5664` on `transparent` | 9px |
| #workspace | `strong` | Harborline Consulting | 716, 248 · 181×11 | 8px · 700 | `#17141c` on `transparent` | 0px |
| #workspace | `span` | oldest reply waiting 5h · same-day target at risk | 905, 248 · 289×11 | 8px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `span` | now | 1318, 248 · 96×11 | 8px · 400 | `#17141c` on `transparent` | 0px |
| #navIn | `button (click)` | Client detail | 10, 270 · 169×29 | 10px · 400 | `#5e5664` on `transparent` | 9px |
| #workspace | `div` | can approve messages and answer replies; cannot change prices, mark a client healthy or start new work. | 714, 296 · 428×19 | 8px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `b` | Signed in: Operator | 714, 296 · 100×10 | 9px · 700 | `#17141c` on `transparent` | 0px |
| #workspace | `span.tag` | OPERATOR | 1362, 298 · 54×16 | 7px · 900 | `#4d22b6` on `#f3edff` | 999px |
| #workspace | `span` | High risk | 713, 344 · 156×8 | 7px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `span` | Watch | 896, 344 · 156×8 | 7px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `span` | Healthy | 1079, 344 · 156×8 | 7px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `span` | Review within | 1261, 344 · 156×8 | 7px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `b` | 1 | 713, 356 · 156×15 | 13px · 700 | `#17141c` on `transparent` | 0px |
| #workspace | `b` | 2 | 896, 356 · 156×15 | 13px · 700 | `#17141c` on `transparent` | 0px |
| #workspace | `b` | 7 | 1079, 356 · 156×15 | 13px · 700 | `#17141c` on `transparent` | 0px |
| #workspace | `b` | 48h | 1261, 356 · 156×15 | 13px · 700 | `#17141c` on `transparent` | 0px |
| #workspace | `small` | Acorn Digital | 713, 374 · 156×10 | 7.5px · 400 | `#766f7e` on `transparent` | 0px |
| #workspace | `small` | Harborline · Juniper | 896, 374 · 156×10 | 7.5px · 400 | `#766f7e` on `transparent` | 0px |
| #workspace | `small` | including Aster | 1079, 374 · 156×10 | 7.5px · 400 | `#766f7e` on `transparent` | 0px |
| #workspace | `small` | high-risk client | 1261, 374 · 156×10 | 7.5px · 400 | `#766f7e` on `transparent` | 0px |
| #workspace | `b` | Accounts at Risk | 714, 413 · 94×11 | 10px · 700 | `#17141c` on `transparent` | 0px |
| #workspace | `span` | PRECISION FACTORS ONLY | 1299, 414 · 117×9 | 7.4px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `th` | Client | 704, 435 · 94×31 | 7px · 700 | `#a29aa9` on `#fcfbfd` | 0px |
| #workspace | `th` | Risk tier | 798, 435 · 59×31 | 7px · 700 | `#a29aa9` on `#fcfbfd` | 0px |
| #workspace | `th` | Named reason | 856, 435 · 162×31 | 7px · 700 | `#a29aa9` on `#fcfbfd` | 0px |
| #workspace | `th` | Sending today | 1018, 435 · 69×31 | 7px · 700 | `#a29aa9` on `#fcfbfd` | 0px |
| #workspace | `th` | Sent today | 1088, 435 · 56×31 | 7px · 700 | `#a29aa9` on `#fcfbfd` | 0px |
| #workspace | `th` | Replies waiting | 1144, 435 · 71×31 | 7px · 700 | `#a29aa9` on `#fcfbfd` | 0px |
| #workspace | `th` | Meetings booked / held this week | 1215, 435 · 118×31 | 7px · 700 | `#a29aa9` on `#fcfbfd` | 0px |
| #workspace | `th` | Owner | 1333, 435 · 53×31 | 7px · 700 | `#a29aa9` on `#fcfbfd` | 0px |
| #workspace | `th` | Due | 1386, 435 · 40×31 | 7px · 700 | `#a29aa9` on `#fcfbfd` | 0px |
| #workspace | `td` | Acorn Digital | 704, 466 · 94×39 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Sending stopped 26h · mailbox limit + checked queue empty | 856, 466 · 162×39 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | No | 1018, 466 · 69×39 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | 0 | 1088, 466 · 56×39 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | 3 | 1144, 466 · 71×39 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | 1 / 1 | 1215, 466 · 118×39 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Operator | 1333, 466 · 53×39 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Today | 1386, 466 · 40×39 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `span.tag` | High | 806, 474 · 30×17 | 7px · 900 | `#b43b49` on `#fff0f2` | 999px |
| #workspace | `td` | Harborline Consulting | 704, 505 · 94×39 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Oldest reply 5h vs same-day target | 856, 505 · 162×39 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Yes | 1018, 505 · 69×39 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | 11 | 1088, 505 · 56×39 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | 1 | 1144, 505 · 71×39 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | 1 / 1 | 1215, 505 · 118×39 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Operator | 1333, 505 · 53×39 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Now | 1386, 505 · 40×39 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `span.tag` | Watch | 806, 514 · 37×17 | 7px · 900 | `#956414` on `#fff4dc` | 999px |
| #workspace | `td` | Juniper Labs | 704, 544 · 94×39 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | 1 held meeting has no “How did it go?” answer | 856, 544 · 162×39 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | 8 | 1088, 544 · 56×39 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | 0 | 1144, 544 · 71×39 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | CSM | 1333, 544 · 53×39 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Today | 1386, 544 · 40×39 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Aster Field Systems | 704, 584 · 94×39 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Ridgewell reply 7 min · inside same-day target | 856, 584 · 162×39 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | 6 | 1088, 584 · 56×39 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | 1 · 7 min | 1144, 584 · 71×39 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | 0 / 0 | 1215, 584 · 118×39 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | — | 1386, 584 · 40×39 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `span.tag` | Healthy | 806, 592 · 43×17 | 7px · 900 | `#177552` on `#eaf7f0` | 999px |
| #workspace | `td` | Cedar Vale Services | 704, 623 · 94×39 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Mailboxes clear · no replies waiting | 856, 623 · 162×39 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | 9 | 1088, 623 · 56×39 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Bluehaven Services | 704, 663 · 94×39 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Checked queue available · replies clear | 856, 663 · 162×39 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | 7 | 1088, 663 · 56×39 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Kestrel Building Services | 704, 702 · 94×39 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Sending within limits | 856, 702 · 162×39 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Cobalt Field Operations | 704, 741 · 94×39 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | No live Precision risk factor | 856, 741 · 162×39 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | 10 | 1088, 741 · 56×39 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Larkfield Property Care | 704, 781 · 94×39 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Ashbourne Estate Services | 704, 820 · 94×39 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| body | `div.navfoot` | Vida is the internal execution agent. The right workspace shows the operational consequence of her decisions. | 0, 842 · 189×58 | 8px · 400 | `#766f7e` on `transparent` | 0px |
| #input | `input (click)` | Message Vida… | 202, 857 · 421×33 | 9.5px · 400 | `#000000` on `#ffffff` | 10px |
| #sendBtn | `button (click)` | Send | 630, 860 · 47×28 | 9px · 900 | `#ffffff` on `transparent` | 9px |
| #workspace | `b` | Risk model | 714, 880 · 62×11 | 10px · 700 | `#17141c` on `transparent` | 0px |
| #workspace | `span` | NO COMMERCIAL CONTAMINATION | 1263, 881 · 153×9 | 7.4px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `label` | Sending stopped | 714, 921 · 135×9 | 7.4px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `div.v` | And the real reason why | 859, 921 · 508×13 | 9px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `span.m` | risk factor | 1377, 921 · 39×9 | 7.7px · 400 | `#766f7e` on `transparent` | 0px |
| #workspace | `label` | Reply age | 714, 953 · 135×9 | 7.4px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `div.v` | Oldest reply vs same-day target | 859, 953 · 508×13 | 9px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `label` | Mailbox health | 714, 985 · 135×9 | 7.4px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `div.v` | Limit, bounces, complaints, authentication | 859, 985 · 508×13 | 9px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `label` | Outcome capture | 714, 1017 · 135×9 | 7.4px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `div.v` | Held meetings with no “How did it go?” answer | 859, 1017 · 508×13 | 9px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `label` | Client activity | 714, 1049 · 135×9 | 7.4px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `div.v` | Days since the client last did anything | 859, 1049 · 508×13 | 9px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `label` | Selling more work | 714, 1081 · 135×9 | 7.4px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `div.v` | Never | 859, 1081 · 486×13 | 9px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `span.m` | not a risk factor | 1355, 1081 · 61×9 | 7.7px · 400 | `#766f7e` on `transparent` | 0px |
| #workspace | `button.act (click)` | Open Aster client detail | 703, 1124 · 134×26 | 8.5px · 850 | `#ffffff` on `transparent` | 9px |

### handoff (70 elements · first seen: step 2: Outcome Handoff)

| Region | Element | Exact text | x, y · w×h | Size · weight | Colour on background | Rounding |
|---|---|---|---|---|---|---|
| #screenTitle | `b` | Outcome Handoff | 232, 19 · 140×14 | 12px · 700 | `#17141c` on `transparent` | 0px |
| #screenSub | `span` | Milla → Vida · exact client truth | 232, 35 · 140×10 | 9px · 400 | `#766f7e` on `transparent` | 0px |
| #workTitle | `b` | Outcome Handoff | 704, 124 · 118×14 | 12px · 700 | `#17141c` on `transparent` | 0px |
| #workState | `div.state` | RECEIVED | 1366, 124 · 60×21 | 8px · 900 | `#675e6d` on `#f0edf3` | 999px |
| #workSub | `span.sub` | Milla → Vida · exact client truth | 704, 141 · 124×9 | 8px · 400 | `#766f7e` on `transparent` | 0px |
| #navIn | `button (click)` | Today board | 10, 146 · 169×29 | 10px · 400 | `#5e5664` on `transparent` | 9px |
| #workspace | `button.clientTab (click)` | Outcome | 703, 177 · 60×25 | 8px · 850 | `#4d22b6` on `#f3edff` | 999px |
| #workspace | `button.clientTab (click)` | Connections | 769, 177 · 75×25 | 8px · 850 | `#675e6d` on `#ffffff` | 999px |
| #workspace | `button.clientTab (click)` | Market Map | 851, 177 · 74×25 | 8px · 850 | `#675e6d` on `#ffffff` | 999px |
| #workspace | `button.clientTab (click)` | Identity | 930, 177 · 55×25 | 8px · 850 | `#675e6d` on `#ffffff` | 999px |
| #workspace | `button.clientTab (click)` | Signals | 992, 177 · 53×25 | 8px · 850 | `#675e6d` on `#ffffff` | 999px |
| #workspace | `button.clientTab (click)` | Research | 1051, 177 · 62×25 | 8px · 850 | `#675e6d` on `#ffffff` | 999px |
| #workspace | `button.clientTab (click)` | Eligibility | 1118, 177 · 62×25 | 8px · 850 | `#675e6d` on `#ffffff` | 999px |
| #workspace | `button.clientTab (click)` | Sending | 1187, 177 · 57×25 | 8px · 850 | `#675e6d` on `#ffffff` | 999px |
| #workspace | `button.clientTab (click)` | Meetings | 1249, 177 · 62×25 | 8px · 850 | `#675e6d` on `#ffffff` | 999px |
| #workspace | `button.clientTab (click)` | Health | 1317, 177 · 50×25 | 8px · 850 | `#675e6d` on `#ffffff` | 999px |
| #workspace | `button.clientTab (click)` | Learning | 703, 208 · 60×25 | 8px · 850 | `#675e6d` on `#ffffff` | 999px |
| #workspace | `button.clientTab (click)` | Always-On | 769, 208 · 67×25 | 8px · 850 | `#675e6d` on `#ffffff` | 999px |
| #workspace | `button.clientTab (click)` | Audit & Evidence | 842, 208 · 97×25 | 8px · 850 | `#675e6d` on `#ffffff` | 999px |
| #workspace | `span` | Outcome | 713, 253 · 156×8 | 7px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `span` | Proof | 896, 253 · 156×8 | 7px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `span` | This week | 1079, 253 · 156×8 | 7px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `span` | Price | 1261, 253 · 156×8 | 7px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `b` | A handful of good conversations | 713, 265 · 156×30 | 13px · 700 | `#17141c` on `transparent` | 0px |
| #workspace | `b` | 10 people | 896, 265 · 156×15 | 13px · 700 | `#17141c` on `transparent` | 0px |
| #workspace | `b` | 6 people | 1079, 265 · 156×15 | 13px · 700 | `#17141c` on `transparent` | 0px |
| #workspace | `b` | $1,500 setup + $700 per held meeting (price still to be decided) | 1261, 265 · 156×60 | 13px · 700 | `#17141c` on `transparent` | 0px |
| #navIn | `button.active (click)` | Client detail | 10, 270 · 169×29 | 10px · 900 | `#4d22b6` on `#f0eafd` | 9px |
| #workspace | `small` | same Proof as Milla | 896, 283 · 156×10 | 7.5px · 400 | `#766f7e` on `transparent` | 0px |
| #workspace | `small` | same six as Milla | 1079, 283 · 156×10 | 7.5px · 400 | `#766f7e` on `transparent` | 0px |
| #thread | `div.bubble` | The handoff defines the commercial outcome and guardrails. It does not create a quota or bundle. | 205, 287 · 431×51 | 10.5px · 400 | `#17141c` on `#eef5ff` | 13px |
| #workspace | `small` | not a quota | 713, 298 · 156×10 | 7.5px · 400 | `#766f7e` on `transparent` | 0px |
| #workspace | `small` | working demo | 1261, 328 · 156×10 | 7.5px · 400 | `#766f7e` on `transparent` | 0px |
| #workspace | `b` | Outcome brief | 714, 367 · 81×11 | 10px · 700 | `#17141c` on `transparent` | 0px |
| #workspace | `span` | CLIENT AUTHORITY | 1331, 368 · 86×9 | 7.4px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `label` | Outcome | 714, 408 · 135×9 | 7.4px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `div.v` | Create a handful of qualified conversations with operations leaders at facilities-maintenance firms where there is a real reason to talk now. | 859, 408 · 506×26 | 9px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `span.m` | Milla/client | 1375, 408 · 41×9 | 7.7px · 400 | `#766f7e` on `transparent` | 0px |
| #workspace | `label` | Who | 714, 453 · 135×9 | 7.4px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `div.v` | US facilities-maintenance firms · operations leaders | 859, 453 · 484×13 | 9px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `span.m` | approved profile | 1353, 453 · 63×9 | 7.7px · 400 | `#766f7e` on `transparent` | 0px |
| #workspace | `label` | Claims | 714, 485 · 135×9 | 7.4px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `div.v` | Aster scheduling, live job status and mobile sign-off | 859, 485 · 489×13 | 9px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `span.m` | approved truth | 1358, 485 · 58×9 | 7.7px · 400 | `#766f7e` on `transparent` | 0px |
| #workspace | `label` | Guardrail | 714, 517 · 135×9 | 7.4px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `div.v` | Every person needs a current, sourced reason | 859, 517 · 495×13 | 9px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `span.m` | Precision rule | 1364, 517 · 52×9 | 7.7px · 400 | `#766f7e` on `transparent` | 0px |
| #workspace | `b` | Decision logic | 714, 569 · 78×11 | 10px · 700 | `#17141c` on `transparent` | 0px |
| #workspace | `span` | WHY VIDA DID THIS | 1328, 570 · 88×9 | 7.4px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `b` | No quota | 714, 609 · 110×12 | 8.5px · 700 | `#4d22b6` on `transparent` | 0px |
| #workspace | `span` | Vida does not manufacture a fixed meeting count. | 833, 609 · 583×12 | 8.5px · 400 | `#5f5667` on `transparent` | 0px |
| #workspace | `b` | Same client truth | 714, 638 · 110×12 | 8.5px · 700 | `#4d22b6` on `transparent` | 0px |
| #workspace | `span` | Milla and Vida use the same people, prices and held rule. | 833, 638 · 583×12 | 8.5px · 400 | `#5f5667` on `transparent` | 0px |
| #workspace | `b` | Next | 714, 668 · 110×12 | 8.5px · 700 | `#4d22b6` on `transparent` | 0px |
| #workspace | `span` | Use connected evidence to decide person by person. | 833, 668 · 583×12 | 8.5px · 400 | `#5f5667` on `transparent` | 0px |
| #workspace | `button.act (click)` | Open connected context | 703, 709 · 137×26 | 8.5px · 850 | `#ffffff` on `transparent` | 9px |
| #workspace | `b` | Connected evidence in this decision | 714, 754 · 203×11 | 10px · 700 | `#17141c` on `transparent` | 0px |
| #workspace | `span` | SOURCE → MEANING → EFFECT | 1280, 755 · 136×9 | 7.4px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `th` | Source | 704, 776 · 126×23 | 7px · 700 | `#a29aa9` on `#fcfbfd` | 0px |
| #workspace | `th` | What it told us | 830, 776 · 315×23 | 7px · 700 | `#a29aa9` on `#fcfbfd` | 0px |
| #workspace | `th` | What it changed | 1146, 776 · 280×23 | 7px · 700 | `#a29aa9` on `#fcfbfd` | 0px |
| #workspace | `td` | Milla brief | 704, 798 · 126×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Outcome, audience, claims and guardrails | 830, 798 · 315×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Defined relevance; no send authority | 1146, 798 · 280×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Aster profile | 704, 827 · 126×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Approved product truth | 830, 827 · 315×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Constrained claims | 1146, 827 · 280×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Client decision | 704, 855 · 126×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Precision outcome | 830, 855 · 315×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Set the work to prove | 1146, 855 · 280×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |

### connections (65 elements · first seen: step 3: Connections)

| Region | Element | Exact text | x, y · w×h | Size · weight | Colour on background | Rounding |
|---|---|---|---|---|---|---|
| #screenTitle | `b` | Connections | 232, 19 · 170×14 | 12px · 700 | `#17141c` on `transparent` | 0px |
| #screenSub | `span` | Authorised sources · status and limits | 232, 35 · 170×10 | 9px · 400 | `#766f7e` on `transparent` | 0px |
| #workTitle | `b` | Connections | 704, 124 · 83×14 | 12px · 700 | `#17141c` on `transparent` | 0px |
| #workState | `div.state` | LIVE + PARTIAL | 1341, 124 · 85×21 | 8px · 900 | `#675e6d` on `#f0edf3` | 999px |
| #workSub | `span.sub` | Authorised sources · status and limits | 704, 141 · 151×9 | 8px · 400 | `#766f7e` on `transparent` | 0px |
| #workspace | `button.clientTab (click)` | Outcome | 703, 177 · 60×25 | 8px · 850 | `#675e6d` on `#ffffff` | 999px |
| #workspace | `button.clientTab (click)` | Connections | 769, 177 · 75×25 | 8px · 850 | `#4d22b6` on `#f3edff` | 999px |
| #workspace | `span` | CRM | 713, 253 · 156×8 | 7px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `span` | Calendar | 896, 253 · 156×8 | 7px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `span` | Slack | 1079, 253 · 156×8 | 7px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `span` | WhatsApp | 1261, 253 · 156×8 | 7px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `b` | LIVE | 713, 265 · 156×15 | 13px · 700 | `#17141c` on `transparent` | 0px |
| #workspace | `b` | PARTIAL | 896, 265 · 156×15 | 13px · 700 | `#17141c` on `transparent` | 0px |
| #workspace | `b` | COMING SOON | 1079, 265 · 156×15 | 13px · 700 | `#17141c` on `transparent` | 0px |
| #workspace | `small` | relationship truth | 713, 283 · 156×10 | 7.5px · 400 | `#766f7e` on `transparent` | 0px |
| #workspace | `small` | availability + booking | 896, 283 · 156×10 | 7.5px · 400 | `#766f7e` on `transparent` | 0px |
| #workspace | `small` | Milla team surface | 1079, 283 · 156×10 | 7.5px · 400 | `#766f7e` on `transparent` | 0px |
| #workspace | `small` | Milla mobile surface | 1261, 283 · 156×10 | 7.5px · 400 | `#766f7e` on `transparent` | 0px |
| #workspace | `b` | Connection registry | 714, 322 · 111×11 | 10px · 700 | `#17141c` on `transparent` | 0px |
| #workspace | `span` | STATUS · CAPABILITY · LIMIT | 1288, 323 · 128×9 | 7.4px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `th` | Connection | 704, 344 · 127×23 | 7px · 700 | `#a29aa9` on `#fcfbfd` | 0px |
| #workspace | `th` | Status | 831, 344 · 86×23 | 7px · 700 | `#a29aa9` on `#fcfbfd` | 0px |
| #workspace | `th` | What it does | 917, 344 · 222×23 | 7px · 700 | `#a29aa9` on `#fcfbfd` | 0px |
| #workspace | `th` | Limit / truth | 1139, 344 · 287×23 | 7px · 700 | `#a29aa9` on `#fcfbfd` | 0px |
| #thread | `div.bubble` | Connections are capabilities with authority and failure modes, not logos. Slack and WhatsApp are Coming soon, exactly as Milla shows them. | 205, 364 · 431×51 | 10.5px · 400 | `#17141c` on `#eef5ff` | 13px |
| #workspace | `td` | Aster CRM | 704, 366 · 127×34 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Customers, opportunities, closed-lost, write-back | 917, 366 · 222×34 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | CRM remains system of record | 1139, 366 · 287×34 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `span.tag` | LIVE | 839, 375 · 29×17 | 7px · 900 | `#177552` on `#eaf7f0` | 999px |
| #workspace | `td` | Apollo | 704, 401 · 127×34 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Role, company and contact data | 917, 401 · 222×34 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Cannot prove buying intent alone | 1139, 401 · 287×34 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `span.tag` | LIVE | 839, 409 · 29×17 | 7px · 900 | `#177552` on `#eaf7f0` | 999px |
| #workspace | `td` | Public web / news | 704, 435 · 127×34 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Dated why-now evidence | 917, 435 · 222×34 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Source + date + freshness required | 1139, 435 · 287×34 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Google Workspace / Gmail | 704, 470 · 127×34 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Client-owned sending identity | 917, 470 · 222×34 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Mailbox health gates every send | 1139, 470 · 287×34 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Google Calendar | 704, 504 · 127×34 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Availability and booking | 917, 504 · 222×34 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Cannot prove a meeting was held; held comes from the 48h rule | 1139, 504 · 287×34 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `span.tag` | PARTIAL | 839, 513 · 44×17 | 7px · 900 | `#956414` on `#fff4dc` | 999px |
| #workspace | `td` | Slack | 704, 538 · 127×34 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Milla team working surface | 917, 538 · 222×34 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Not live | 1139, 538 · 287×34 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `span.tag` | COMING SOON | 839, 547 · 70×17 | 7px · 900 | `#956414` on `#fff4dc` | 999px |
| #workspace | `td` | WhatsApp | 704, 573 · 127×34 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Milla client surface | 917, 573 · 222×34 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `b` | One context | 714, 668 · 110×12 | 8.5px · 700 | `#4d22b6` on `transparent` | 0px |
| #workspace | `span` | All live sources resolve into Aster-scoped people, companies and relationships. | 833, 668 · 583×12 | 8.5px · 400 | `#5f5667` on `transparent` | 0px |
| #workspace | `b` | No permission widening | 714, 697 · 110×25 | 8.5px · 700 | `#4d22b6` on `transparent` | 0px |
| #workspace | `span` | A connection cannot bypass human gates. | 833, 697 · 583×25 | 8.5px · 400 | `#5f5667` on `transparent` | 0px |
| #workspace | `b` | Held truth | 714, 739 · 110×12 | 8.5px · 700 | `#4d22b6` on `transparent` | 0px |
| #workspace | `span` | Calendar proves booking/time, not attendance. | 833, 739 · 583×12 | 8.5px · 400 | `#5f5667` on `transparent` | 0px |
| #workspace | `button.act (click)` | Run Market Map pre-flight | 703, 780 · 146×26 | 8.5px · 850 | `#ffffff` on `transparent` | 9px |
| #workspace | `td` | CRM | 704, 870 · 149×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Customer / opportunity / relationship state | 853, 870 · 326×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Protected existing relationships | 1179, 870 · 247×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Calendar | 704, 898 · 149×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Availability and booking only | 853, 898 · 326×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Did not prove held | 1179, 898 · 247×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Slack / WhatsApp | 704, 926 · 149×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Coming soon | 853, 926 · 326×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | No live execution dependency | 1179, 926 · 247×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |

### market (94 elements · first seen: step 4: Market Map Pre-flight)

| Region | Element | Exact text | x, y · w×h | Size · weight | Colour on background | Rounding |
|---|---|---|---|---|---|---|
| #screenTitle | `b` | Market Map Pre-flight | 232, 19 · 185×14 | 12px · 700 | `#17141c` on `transparent` | 0px |
| #screenTitle | `b` | Ridgewell Relationship Record | 232, 19 · 206×14 | 12px · 700 | `#17141c` on `transparent` | 0px |
| #screenSub | `span` | Approved market × relationship memory | 232, 35 · 185×10 | 9px · 400 | `#766f7e` on `transparent` | 0px |
| #screenSub | `span` | Closed-lost timing → changed circumstances | 232, 35 · 206×10 | 9px · 400 | `#766f7e` on `transparent` | 0px |
| #stage | `span.s` | ✓ Receive | 183, 80 · 47×10 | 8.5px · 750 | `#706475` on `transparent` | 0px |
| #stage | `span.s` | Context | 260, 80 · 38×10 | 8.5px · 900 | `#4d22b6` on `transparent` | 0px |
| #workTitle | `b` | Market Map Pre-flight | 704, 124 · 148×14 | 12px · 700 | `#17141c` on `transparent` | 0px |
| #workTitle | `b` | Ridgewell Relationship Record | 704, 124 · 206×14 | 12px · 700 | `#17141c` on `transparent` | 0px |
| #workState | `div.state` | CONTEXTUALISING | 1326, 124 · 100×21 | 8px · 900 | `#675e6d` on `#f0edf3` | 999px |
| #workState | `div.state` | REACTIVATION | 1345, 124 · 81×21 | 8px · 900 | `#675e6d` on `#f0edf3` | 999px |
| #workSub | `span.sub` | Approved market × relationship memory | 704, 141 · 164×9 | 8px · 400 | `#766f7e` on `transparent` | 0px |
| #workSub | `span.sub` | Closed-lost timing → changed circumstances | 704, 141 · 206×9 | 8px · 400 | `#766f7e` on `transparent` | 0px |
| #workspace | `button.clientTab (click)` | Market Map | 851, 177 · 74×25 | 8px · 850 | `#4d22b6` on `#f3edff` | 999px |
| #workspace | `span` | Worked cohort | 713, 253 · 156×8 | 7px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `span` | CRM state | 713, 253 · 156×8 | 7px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `span` | New | 896, 253 · 156×8 | 7px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `span` | Last conversation | 896, 253 · 156×8 | 7px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `span` | Reactivation | 1079, 253 · 156×8 | 7px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `span` | Why now | 1079, 253 · 156×8 | 7px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `span` | Protected | 1261, 253 · 156×8 | 7px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `span` | Opt-out | 1261, 253 · 156×8 | 7px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `b` | 5 accounts | 713, 265 · 156×15 | 13px · 700 | `#17141c` on `transparent` | 0px |
| #workspace | `b` | Closed-lost | 713, 265 · 156×15 | 13px · 700 | `#17141c` on `transparent` | 0px |
| #workspace | `b` | 17 Feb 2026 | 896, 265 · 156×15 | 13px · 700 | `#17141c` on `transparent` | 0px |
| #workspace | `b` | Coordinator hiring | 1079, 265 · 156×15 | 13px · 700 | `#17141c` on `transparent` | 0px |
| #workspace | `b` | No | 1261, 265 · 156×15 | 13px · 700 | `#17141c` on `transparent` | 0px |
| #workspace | `small` | relationship-aware | 713, 283 · 156×10 | 7.5px · 400 | `#766f7e` on `transparent` | 0px |
| #workspace | `small` | timing | 713, 283 · 156×10 | 7.5px · 400 | `#766f7e` on `transparent` | 0px |
| #workspace | `small` | Pinecrest + Northbank | 896, 283 · 156×10 | 7.5px · 400 | `#766f7e` on `transparent` | 0px |
| #workspace | `small` | Aster CRM | 896, 283 · 156×10 | 7.5px · 400 | `#766f7e` on `transparent` | 0px |
| #workspace | `small` | Ridgewell | 1079, 283 · 156×10 | 7.5px · 400 | `#766f7e` on `transparent` | 0px |
| #workspace | `small` | 05 Oct | 1079, 283 · 156×10 | 7.5px · 400 | `#766f7e` on `transparent` | 0px |
| #workspace | `small` | Alderline + Cedar Vale | 1261, 283 · 156×10 | 7.5px · 400 | `#766f7e` on `transparent` | 0px |
| #workspace | `small` | clear | 1261, 283 · 156×10 | 7.5px · 400 | `#766f7e` on `transparent` | 0px |
| #workspace | `b` | Relationship-aware routes | 714, 322 · 149×11 | 10px · 700 | `#17141c` on `transparent` | 0px |
| #workspace | `b` | Evidence chain | 714, 322 · 84×11 | 10px · 700 | `#17141c` on `transparent` | 0px |
| #workspace | `span` | FUTURE INTELLIGENCE · PRECISION FORM | 1229, 323 · 187×9 | 7.4px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `span` | ASTER ONLY | 1362, 323 · 54×9 | 7.4px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `th` | Account | 704, 344 · 154×23 | 7px · 700 | `#a29aa9` on `#fcfbfd` | 0px |
| #workspace | `th` | Relationship memory | 858, 344 · 250×23 | 7px · 700 | `#a29aa9` on `#fcfbfd` | 0px |
| #workspace | `th` | Evidence | 872, 344 · 297×23 | 7px · 700 | `#a29aa9` on `#fcfbfd` | 0px |
| #workspace | `th` | Why now / change | 1107, 344 · 205×23 | 7px · 700 | `#a29aa9` on `#fcfbfd` | 0px |
| #workspace | `th` | Meaning | 1169, 344 · 257×23 | 7px · 700 | `#a29aa9` on `#fcfbfd` | 0px |
| #workspace | `th` | Decision | 1312, 344 · 114×23 | 7px · 700 | `#a29aa9` on `#fcfbfd` | 0px |
| #workspace | `td` | Ridgewell Fire & Security | 704, 366 · 154×34 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Closed-lost · timing · Feb 2026 | 858, 366 · 250×34 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Closed-lost · timing | 872, 366 · 297×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Service-coordinator hiring · 05 Oct | 1107, 366 · 205×34 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Prior commercial relationship | 1169, 366 · 257×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `span.tag` | REACTIVATION | 1320, 375 · 69×17 | 7px · 900 | `#4d22b6` on `#f3edff` | 999px |
| #workspace | `td` | Ridgewell careers | 704, 394 · 168×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Service-coordinator hiring · 05 Oct | 872, 394 · 297×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Current reason to re-open | 1169, 394 · 257×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Pinecrest Facilities | 704, 401 · 154×34 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | No prior Aster relationship | 858, 401 · 250×34 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | New regional service hub | 1107, 401 · 205×34 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `span.tag` | NEW · ELIGIBLE | 1320, 409 · 73×17 | 7px · 900 | `#177552` on `#eaf7f0` | 999px |
| #workspace | `td` | Morgan still Operations Director | 872, 423 · 297×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Identity current | 1169, 423 · 257×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Alderline Services | 704, 435 · 154×34 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Open opportunity · Proposal | 858, 435 · 250×34 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Fresh hiring signal | 1107, 435 · 205×34 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #thread | `div.bubble` | Before outreach, I resolve people against Aster relationship memory. Fresh signals never outrank a customer or an open deal. | 205, 441 · 431×51 | 10.5px · 400 | `#17141c` on `#eef5ff` | 13px |
| #workspace | `span.tag` | PROTECT | 1320, 444 · 48×17 | 7px · 900 | `#b43b49` on `#fff0f2` | 999px |
| #workspace | `td` | Suppression | 704, 451 · 168×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Clear | 872, 451 · 297×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | No outreach prohibition | 1169, 451 · 257×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Cedar Vale Electrical | 704, 470 · 154×34 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Existing customer | 858, 470 · 250×34 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `span.tag` | SUPPRESS | 1320, 478 · 53×17 | 7px · 900 | `#b43b49` on `#fff0f2` | 999px |
| #workspace | `td` | Northbank Maintenance | 704, 504 · 154×34 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Identity ambiguity resolved to Noah Carter | 858, 504 · 250×34 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | New Operations Director | 1107, 504 · 205×34 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #thread | `div.bubble` | Ridgewell fits because the relationship and the current signal line up. The prior timing loss changes the route. | 205, 518 · 431×51 | 10.5px · 400 | `#17141c` on `#eef5ff` | 13px |
| #workspace | `b` | Do not erase history | 714, 540 · 110×12 | 8.5px · 700 | `#4d22b6` on `transparent` | 0px |
| #workspace | `span` | Use the prior relationship in the first message. | 833, 540 · 583×12 | 8.5px · 400 | `#5f5667` on `transparent` | 0px |
| #workspace | `b` | Do not overclaim | 714, 569 · 110×12 | 8.5px · 700 | `#4d22b6` on `transparent` | 0px |
| #workspace | `span` | Hiring is a reason to ask, not proof of pain. | 833, 569 · 583×12 | 8.5px · 400 | `#5f5667` on `transparent` | 0px |
| #workspace | `b` | Client authority | 714, 598 · 110×12 | 8.5px · 700 | `#4d22b6` on `transparent` | 0px |
| #workspace | `span` | If CRM says the relationship is active, stop prospecting. | 833, 598 · 583×12 | 8.5px · 400 | `#5f5667` on `transparent` | 0px |
| #workspace | `b` | Precedence | 714, 599 · 110×12 | 8.5px · 700 | `#4d22b6` on `transparent` | 0px |
| #workspace | `span` | Customer, open deal and opt-out beat timing signals. | 833, 599 · 583×12 | 8.5px · 400 | `#5f5667` on `transparent` | 0px |
| #workspace | `b` | Relationship memory | 714, 628 · 110×12 | 8.5px · 700 | `#4d22b6` on `transparent` | 0px |
| #workspace | `span` | Ridgewell stays a reactivation, never reset to cold. | 833, 628 · 583×12 | 8.5px · 400 | `#5f5667` on `transparent` | 0px |
| #workspace | `button.act (click)` | Resolve identity | 703, 639 · 98×26 | 8.5px · 850 | `#ffffff` on `transparent` | 9px |
| #workspace | `b` | No pool disclosure | 714, 658 · 110×12 | 8.5px · 700 | `#4d22b6` on `transparent` | 0px |
| #workspace | `span` | Client sees decisions and evidence, not raw inventory. | 833, 658 · 583×12 | 8.5px · 400 | `#5f5667` on `transparent` | 0px |
| #workspace | `button.act (click)` | Open Ridgewell record | 703, 699 · 129×26 | 8.5px · 850 | `#ffffff` on `transparent` | 9px |
| #workspace | `td` | Prior relationship / customer / opportunity state | 814, 788 · 333×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Changed route or suppressed outreach | 1148, 788 · 278×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Current role / company match | 814, 817 · 333×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Resolved person/company identity | 1148, 817 · 278×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Public source | 704, 845 · 110×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Created or rejected timing case | 1148, 845 · 278×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |

### identity (53 elements · first seen: step 6: Identity Resolution)

| Region | Element | Exact text | x, y · w×h | Size · weight | Colour on background | Rounding |
|---|---|---|---|---|---|---|
| #screenTitle | `b` | Identity Resolution | 232, 19 · 227×14 | 12px · 700 | `#17141c` on `transparent` | 0px |
| #screenSub | `span` | Northbank Maintenance · Noah Carter everywhere | 232, 35 · 227×10 | 9px · 400 | `#766f7e` on `transparent` | 0px |
| #stage | `span.s` | ✓ Context | 260, 80 · 48×10 | 8.5px · 750 | `#706475` on `transparent` | 0px |
| #stage | `span.s` | Find | 338, 80 · 21×10 | 8.5px · 900 | `#4d22b6` on `transparent` | 0px |
| #workTitle | `b` | Identity Resolution | 704, 124 · 129×14 | 12px · 700 | `#17141c` on `transparent` | 0px |
| #workState | `div.state` | RESOLVED | 1364, 124 · 62×21 | 8px · 900 | `#675e6d` on `#f0edf3` | 999px |
| #workSub | `span.sub` | Northbank Maintenance · Noah Carter everywhere | 704, 141 · 202×9 | 8px · 400 | `#766f7e` on `transparent` | 0px |
| #workspace | `button.clientTab (click)` | Identity | 930, 177 · 55×25 | 8px · 850 | `#4d22b6` on `#f3edff` | 999px |
| #workspace | `span` | Person | 713, 253 · 156×8 | 7px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `span` | Company | 896, 253 · 156×8 | 7px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `span` | Confidence | 1079, 253 · 156×8 | 7px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `span` | Suppression | 1261, 253 · 156×8 | 7px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `b` | Noah Carter | 713, 265 · 156×15 | 13px · 700 | `#17141c` on `transparent` | 0px |
| #workspace | `b` | Northbank Maintenance | 896, 265 · 156×30 | 13px · 700 | `#17141c` on `transparent` | 0px |
| #workspace | `b` | Resolved | 1079, 265 · 156×15 | 13px · 700 | `#17141c` on `transparent` | 0px |
| #workspace | `b` | Clear | 1261, 265 · 156×15 | 13px · 700 | `#17141c` on `transparent` | 0px |
| #workspace | `small` | canonical | 713, 283 · 156×10 | 7.5px · 400 | `#766f7e` on `transparent` | 0px |
| #workspace | `small` | human-safe | 1079, 283 · 156×10 | 7.5px · 400 | `#766f7e` on `transparent` | 0px |
| #workspace | `small` | no inherited opt-out | 1261, 283 · 156×10 | 7.5px · 400 | `#766f7e` on `transparent` | 0px |
| #workspace | `small` | current employer | 896, 298 · 156×10 | 7.5px · 400 | `#766f7e` on `transparent` | 0px |
| #workspace | `b` | Identity evidence | 714, 337 · 98×11 | 10px · 700 | `#17141c` on `transparent` | 0px |
| #workspace | `span` | PERSON + COMPANY GRAPH | 1290, 338 · 126×9 | 7.4px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `th` | Signal | 704, 359 · 162×23 | 7px · 700 | `#a29aa9` on `#fcfbfd` | 0px |
| #workspace | `th` | Value | 866, 359 · 226×23 | 7px · 700 | `#a29aa9` on `#fcfbfd` | 0px |
| #workspace | `th` | Effect | 1092, 359 · 334×23 | 7px · 700 | `#a29aa9` on `#fcfbfd` | 0px |
| #workspace | `td` | Apollo role change | 704, 381 · 162×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Operations Director · 03 Oct | 866, 381 · 226×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Current person/company link | 1092, 381 · 334×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Email / alias match | 704, 409 · 162×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Resolved | 866, 409 · 226×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | One canonical Noah Carter | 1092, 409 · 334×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Prior employer | 704, 438 · 162×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Different | 866, 438 · 226×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Old company relationship does not transfer | 1092, 438 · 334×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Opt-out history | 704, 466 · 162×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | No person-level suppression | 1092, 466 · 334×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `b` | Person memory | 714, 555 · 110×12 | 8.5px · 700 | `#4d22b6` on `transparent` | 0px |
| #workspace | `span` | Can persist across employers inside Aster’s tenant. | 833, 555 · 583×12 | 8.5px · 400 | `#5f5667` on `transparent` | 0px |
| #workspace | `b` | Company state | 714, 584 · 110×12 | 8.5px · 700 | `#4d22b6` on `transparent` | 0px |
| #workspace | `span` | Does not automatically transfer with the person. | 833, 584 · 583×12 | 8.5px · 400 | `#5f5667` on `transparent` | 0px |
| #thread | `div.bubble` | Northbank is resolved to Noah Carter everywhere. Person-level suppression would follow Noah across employers if it existed. | 205, 595 · 431×51 | 10.5px · 400 | `#17141c` on `#eef5ff` | 13px |
| #workspace | `b` | Safe default | 714, 613 · 110×12 | 8.5px · 700 | `#4d22b6` on `transparent` | 0px |
| #workspace | `span` | If unresolved, hold. | 833, 613 · 583×12 | 8.5px · 400 | `#5f5667` on `transparent` | 0px |
| #workspace | `button.act (click)` | Open why-now signals | 703, 654 · 128×26 | 8.5px · 850 | `#ffffff` on `transparent` | 9px |
| #workspace | `td` | Apollo + aliases | 704, 744 · 160×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Possible person match | 864, 744 · 221×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Held Northbank until resolved | 1085, 744 · 341×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Suppression store | 704, 772 · 160×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Person-level opt-out history | 864, 772 · 221×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Prevented loss of suppression | 1085, 772 · 341×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Aster tenant graph | 704, 800 · 160×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Employer relationship | 864, 800 · 221×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Kept company and person memory separate | 1085, 800 · 341×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |

### signals (57 elements · first seen: step 7: Why-Now Signal Store)

| Region | Element | Exact text | x, y · w×h | Size · weight | Colour on background | Rounding |
|---|---|---|---|---|---|---|
| #screenTitle | `b` | Why-Now Signal Store | 232, 19 · 244×14 | 12px · 700 | `#17141c` on `transparent` | 0px |
| #screenSub | `span` | Dated facts · source · expiry · relationship precedence | 232, 35 · 244×10 | 9px · 400 | `#766f7e` on `transparent` | 0px |
| #workTitle | `b` | Why-Now Signal Store | 704, 124 · 151×14 | 12px · 700 | `#17141c` on `transparent` | 0px |
| #workState | `div.state` | SOURCE LINKED | 1338, 124 · 88×21 | 8px · 900 | `#675e6d` on `#f0edf3` | 999px |
| #workSub | `span.sub` | Dated facts · source · expiry · relationship precedence | 704, 141 · 217×9 | 8px · 400 | `#766f7e` on `transparent` | 0px |
| #workspace | `button.clientTab (click)` | Signals | 992, 177 · 53×25 | 8px · 850 | `#4d22b6` on `#f3edff` | 999px |
| #workspace | `span` | Freshness | 1079, 253 · 156×8 | 7px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `span` | Precedence | 1261, 253 · 156×8 | 7px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `b` | 10 | 713, 265 · 156×15 | 13px · 700 | `#17141c` on `transparent` | 0px |
| #workspace | `b` | 6 | 896, 265 · 156×15 | 13px · 700 | `#17141c` on `transparent` | 0px |
| #workspace | `b` | Required | 1079, 265 · 156×15 | 13px · 700 | `#17141c` on `transparent` | 0px |
| #workspace | `b` | CRM first | 1261, 265 · 156×15 | 13px · 700 | `#17141c` on `transparent` | 0px |
| #workspace | `small` | same people as Milla | 713, 283 · 156×10 | 7.5px · 400 | `#766f7e` on `transparent` | 0px |
| #workspace | `small` | Morgan · Priya · Noah · Leah · Ethan · Daniel | 896, 283 · 156×20 | 7.5px · 400 | `#766f7e` on `transparent` | 0px |
| #workspace | `small` | date + expiry | 1079, 283 · 156×10 | 7.5px · 400 | `#766f7e` on `transparent` | 0px |
| #workspace | `small` | protect relationships | 1261, 283 · 156×10 | 7.5px · 400 | `#766f7e` on `transparent` | 0px |
| #workspace | `b` | This week’s signal evidence | 714, 332 · 157×11 | 10px · 700 | `#17141c` on `transparent` | 0px |
| #workspace | `span` | SAME SIX AS MILLA | 1328, 333 · 88×9 | 7.4px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `th` | Person | 704, 354 · 94×23 | 7px · 700 | `#a29aa9` on `#fcfbfd` | 0px |
| #workspace | `th` | Company | 798, 354 · 158×23 | 7px · 700 | `#a29aa9` on `#fcfbfd` | 0px |
| #workspace | `th` | Why now | 956, 354 · 268×23 | 7px · 700 | `#a29aa9` on `#fcfbfd` | 0px |
| #workspace | `td` | Morgan Lee | 704, 376 · 94×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Prior timing loss + service-coordinator hiring | 956, 376 · 268×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Ridgewell careers · 05 Oct 2026 | 1224, 376 · 202×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Priya Shah | 704, 404 · 94×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Company news · 02 Oct 2026 | 1224, 404 · 202×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Noah Carter | 704, 432 · 94×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Apollo role change · 03 Oct 2026 | 1224, 432 · 202×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Leah Morris | 704, 461 · 94×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Beacon Facilities | 798, 461 · 158×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Two service depots acquired | 956, 461 · 268×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Press release · 30 Sep 2026 | 1224, 461 · 202×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Ethan Brooks | 704, 489 · 94×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Summit Maintenance | 798, 489 · 158×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Dispatch-manager hiring | 956, 489 · 268×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Careers page · 06 Oct 2026 | 1224, 489 · 202×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Daniel Ortiz | 704, 517 · 94×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | MetroServe FM | 798, 517 · 158×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | New response-time SLA contract | 956, 517 · 268×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Company news · 29 Sep 2026 | 1224, 517 · 202×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `b` | Signal ≠ intent | 714, 606 · 110×12 | 8.5px · 700 | `#4d22b6` on `transparent` | 0px |
| #workspace | `span` | A dated change justifies research, not a buying claim. | 833, 606 · 583×12 | 8.5px · 400 | `#5f5667` on `transparent` | 0px |
| #workspace | `b` | Freshness | 714, 635 · 110×12 | 8.5px · 700 | `#4d22b6` on `transparent` | 0px |
| #workspace | `span` | Stale evidence expires. | 833, 635 · 583×12 | 8.5px · 400 | `#5f5667` on `transparent` | 0px |
| #workspace | `b` | Protection | 714, 664 · 110×12 | 8.5px · 700 | `#4d22b6` on `transparent` | 0px |
| #workspace | `span` | Open opportunity/customer/suppression still wins. | 833, 664 · 583×12 | 8.5px · 400 | `#5f5667` on `transparent` | 0px |
| #thread | `div.bubble` | Signals are now stored as dated observations with a source and expiry. They can create a review, not automatic outreach. | 205, 672 · 431×51 | 10.5px · 400 | `#17141c` on `#eef5ff` | 13px |
| #workspace | `button.act (click)` | Research the people | 703, 706 · 118×26 | 8.5px · 850 | `#ffffff` on `transparent` | 9px |
| #workspace | `td` | Careers / news | 704, 795 · 191×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Dated change | 895, 795 · 235×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Created why-now candidate | 1130, 795 · 296×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Freshness policy | 704, 823 · 191×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Source date + expiry | 895, 823 · 235×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Blocked stale evidence | 1130, 823 · 296×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | CRM precedence | 704, 851 · 191×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Open deal / customer | 895, 851 · 235×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Overrode prospecting signal | 1130, 851 · 296×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |

### research (51 elements · first seen: step 8: Person Research)

| Region | Element | Exact text | x, y · w×h | Size · weight | Colour on background | Rounding |
|---|---|---|---|---|---|---|
| #screenTitle | `b` | Person Research | 232, 19 · 173×14 | 12px · 700 | `#17141c` on `transparent` | 0px |
| #screenSub | `span` | Company · person · situation · sources | 232, 35 · 173×10 | 9px · 400 | `#766f7e` on `transparent` | 0px |
| #stage | `span.s` | ✓ Find | 338, 80 · 31×10 | 8.5px · 750 | `#706475` on `transparent` | 0px |
| #stage | `span.s` | Research | 399, 80 · 44×10 | 8.5px · 900 | `#4d22b6` on `transparent` | 0px |
| #workTitle | `b` | Person Research | 704, 124 · 113×14 | 12px · 700 | `#17141c` on `transparent` | 0px |
| #workState | `div.state` | 6 RESEARCHED | 1342, 124 · 84×21 | 8px · 900 | `#675e6d` on `#f0edf3` | 999px |
| #workSub | `span.sub` | Company · person · situation · sources | 704, 141 · 154×9 | 8px · 400 | `#766f7e` on `transparent` | 0px |
| #workspace | `button.clientTab (click)` | Research | 1051, 177 · 62×25 | 8px · 850 | `#4d22b6` on `#f3edff` | 999px |
| #workspace | `span` | People | 713, 253 · 156×8 | 7px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `span` | Sources | 896, 253 · 156×8 | 7px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `span` | Claims | 1079, 253 · 156×8 | 7px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `span` | Research risk | 1261, 253 · 156×8 | 7px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `b` | CRM + Apollo + public | 896, 265 · 156×30 | 13px · 700 | `#17141c` on `transparent` | 0px |
| #workspace | `b` | Approved only | 1079, 265 · 156×15 | 13px · 700 | `#17141c` on `transparent` | 0px |
| #workspace | `b` | Visible | 1261, 265 · 156×15 | 13px · 700 | `#17141c` on `transparent` | 0px |
| #workspace | `small` | this week | 713, 283 · 156×10 | 7.5px · 400 | `#766f7e` on `transparent` | 0px |
| #workspace | `small` | Aster truth | 1079, 283 · 156×10 | 7.5px · 400 | `#766f7e` on `transparent` | 0px |
| #workspace | `small` | human checks assumptions | 1261, 283 · 156×10 | 7.5px · 400 | `#766f7e` on `transparent` | 0px |
| #workspace | `small` | joined | 896, 298 · 156×10 | 7.5px · 400 | `#766f7e` on `transparent` | 0px |
| #workspace | `b` | Morgan Lee · research packet | 714, 337 · 167×11 | 10px · 700 | `#17141c` on `transparent` | 0px |
| #workspace | `span` | BEFORE WRITING | 1339, 338 · 77×9 | 7.4px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `label` | Relationship | 714, 378 · 135×9 | 7.4px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `div.v` | Closed-lost for timing · 17 Feb 2026 | 859, 378 · 530×13 | 9px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `span.m` | CRM | 1399, 378 · 17×9 | 7.7px · 400 | `#766f7e` on `transparent` | 0px |
| #workspace | `label` | Current role | 714, 410 · 135×9 | 7.4px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `div.v` | Operations Director | 859, 410 · 451×13 | 9px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `span.m` | Apollo · refreshed 06 Oct | 1320, 410 · 96×9 | 7.7px · 400 | `#766f7e` on `transparent` | 0px |
| #workspace | `label` | Current change | 714, 442 · 135×9 | 7.4px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `div.v` | Service-coordinator hiring | 859, 442 · 446×13 | 9px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `span.m` | Ridgewell careers · 05 Oct | 1315, 442 · 101×9 | 7.7px · 400 | `#766f7e` on `transparent` | 0px |
| #workspace | `label` | Aster relevance | 714, 474 · 135×9 | 7.4px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `div.v` | Job-risk visibility across scheduling, live status and mobile sign-off | 859, 474 · 484×13 | 9px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `span.m` | approved claims | 1353, 474 · 63×9 | 7.7px · 400 | `#766f7e` on `transparent` | 0px |
| #workspace | `label` | Research risk | 714, 506 · 135×9 | 7.4px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `div.v` | Do not assume hiring means buying | 859, 506 · 476×13 | 9px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `span.m` | human judgement | 1345, 506 · 71×9 | 7.7px · 400 | `#766f7e` on `transparent` | 0px |
| #workspace | `b` | Sources stay attached | 714, 598 · 110×12 | 8.5px · 700 | `#4d22b6` on `transparent` | 0px |
| #workspace | `span` | The writer sees exactly what each statement rests on. | 833, 598 · 583×12 | 8.5px · 400 | `#5f5667` on `transparent` | 0px |
| #workspace | `b` | No invented pain | 714, 627 · 110×12 | 8.5px · 700 | `#4d22b6` on `transparent` | 0px |
| #workspace | `span` | Research can suggest a question, not fabricate a problem. | 833, 627 · 583×12 | 8.5px · 400 | `#5f5667` on `transparent` | 0px |
| #workspace | `span` | Write one person-level package, then human-check it. | 833, 657 · 583×12 | 8.5px · 400 | `#5f5667` on `transparent` | 0px |
| #workspace | `button.act (click)` | Open Quality Queue | 703, 698 · 116×26 | 8.5px · 850 | `#ffffff` on `transparent` | 9px |
| #thread | `div.bubble` | Each person now has source-linked research, not a template token set. Morgan is shown here as the worked example. | 205, 748 · 431×51 | 10.5px · 400 | `#17141c` on `#eef5ff` | 13px |
| #workspace | `td` | Public source | 704, 787 · 232×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Company situation | 936, 787 · 201×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Grounded the opener | 1137, 787 · 289×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Role and identity | 936, 816 · 201×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Matched the right person | 1137, 816 · 289×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Aster approved claims | 704, 844 · 232×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | What can be said | 936, 844 · 201×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Prevented unsupported copy | 1137, 844 · 289×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |

### quality (116 elements · first seen: step 9: Quality Queue)

| Region | Element | Exact text | x, y · w×h | Size · weight | Colour on background | Rounding |
|---|---|---|---|---|---|---|
| #screenTitle | `b` | Quality Queue | 232, 19 · 265×14 | 12px · 700 | `#17141c` on `transparent` | 0px |
| #screenSub | `span` | Six people · exact three-email packages · human decisions | 232, 35 · 265×10 | 9px · 400 | `#766f7e` on `transparent` | 0px |
| #workTitle | `b` | Quality Queue | 704, 124 · 96×14 | 12px · 700 | `#17141c` on `transparent` | 0px |
| #workState | `div.state` | 6 HUMAN CHECKS | 1329, 124 · 97×21 | 8px · 900 | `#675e6d` on `#f0edf3` | 999px |
| #workSub | `span.sub` | Six people · exact three-email packages · human decisions | 704, 141 · 236×9 | 8px · 400 | `#766f7e` on `transparent` | 0px |
| #navIn | `button.active (click)` | Quality queue | 10, 177 · 169×29 | 10px · 900 | `#4d22b6` on `#f0eafd` | 9px |
| #workspace | `span` | Queue | 713, 187 · 156×8 | 7px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `span` | Package | 896, 187 · 156×8 | 7px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `span` | Checks | 1079, 187 · 156×8 | 7px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `span` | Reject reasons | 1261, 187 · 156×8 | 7px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `b` | 3 emails each | 896, 199 · 156×15 | 13px · 700 | `#17141c` on `transparent` | 0px |
| #workspace | `b` | 4 | 1079, 199 · 156×15 | 13px · 700 | `#17141c` on `transparent` | 0px |
| #workspace | `b` | 5 | 1261, 199 · 156×15 | 13px · 700 | `#17141c` on `transparent` | 0px |
| #workspace | `small` | one approval | 896, 217 · 156×10 | 7.5px · 400 | `#766f7e` on `transparent` | 0px |
| #workspace | `small` | signal · research · claims · law | 1079, 217 · 156×10 | 7.5px · 400 | `#766f7e` on `transparent` | 0px |
| #workspace | `small` | controlled learning | 1261, 217 · 156×10 | 7.5px · 400 | `#766f7e` on `transparent` | 0px |
| #workspace | `b` | Morgan Lee | 714, 248 · 106×19 | 16px · 700 | `#17141c` on `transparent` | 0px |
| #workspace | `b` | Priya Shah | 1080, 248 · 97×19 | 16px · 700 | `#17141c` on `transparent` | 0px |
| #workspace | `span.tag` | Ridgewell Fire & Security | 825, 253 · 112×16 | 7px · 900 | `#4d22b6` on `#f3edff` | 999px |
| #workspace | `span.tag` | Pinecrest Facilities | 1182, 253 · 87×16 | 7px · 900 | `#4d22b6` on `#f3edff` | 999px |
| #workspace | `div.meta` | Prior timing loss + service-coordinator hiring Ridgewell careers · 05 Oct 2026 | 714, 274 · 336×22 | 7.7px · 400 | `#766f7e` on `transparent` | 0px |
| #workspace | `div.meta` | New regional service hub Company news · 02 Oct 2026 | 1080, 274 · 336×22 | 7.7px · 400 | `#766f7e` on `transparent` | 0px |
| #workspace | `b` | Why now: | 714, 275 · 43×9 | 7.7px · 700 | `#766f7e` on `transparent` | 0px |
| #workspace | `b` | Source: | 714, 286 · 33×9 | 7.7px · 700 | `#766f7e` on `transparent` | 0px |
| #workspace | `div.subjectLine` | Ridgewell service-coordinator hiring | 714, 303 · 336×25 | 8px · 850 | `#17141c` on `#faf8fc` | 8px |
| #workspace | `div.subjectLine` | Pinecrest’s new regional service hub | 1080, 303 · 336×25 | 8px · 850 | `#17141c` on `#faf8fc` | 8px |
| #workspace | `b` | Subject: | 723, 311 · 37×9 | 8px · 900 | `#17141c` on `transparent` | 0px |
| #workspace | `li` | Ridgewell careers lists new service-coordinator roles · 05 Oct 2026. | 730, 335 · 320×11 | 7.8px · 400 | `#5f5667` on `transparent` | 0px |
| #workspace | `li` | Pinecrest announced a new regional service hub · 02 Oct 2026. | 1096, 335 · 320×11 | 7.8px · 400 | `#5f5667` on `transparent` | 0px |
| #workspace | `li` | Aster CRM: closed-lost for timing on 17 Feb 2026; no open deal today. | 730, 346 · 320×11 | 7.8px · 400 | `#5f5667` on `transparent` | 0px |
| #workspace | `li` | Apollo: Priya is Operations Director and remains in role. | 1096, 346 · 320×11 | 7.8px · 400 | `#5f5667` on `transparent` | 0px |
| #workspace | `li` | Apollo: Morgan remains Operations Director; role refreshed 06 Oct 2026. | 730, 358 · 320×11 | 7.8px · 400 | `#5f5667` on `transparent` | 0px |
| #workspace | `li` | CRM/M&V: no prior Aster relationship, customer record or opt-out. | 1096, 358 · 320×11 | 7.8px · 400 | `#5f5667` on `transparent` | 0px |
| #workspace | `div.researchRisk` | Do not assume hiring means buying. | 714, 376 · 336×25 | 7.8px · 400 | `#17141c` on `#fff4dc` | 7px |
| #workspace | `div.researchRisk` | Do not assume a new hub means operational pain. | 1080, 376 · 336×25 | 7.8px · 400 | `#17141c` on `#fff4dc` | 7px |
| #workspace | `b` | Research risk: | 725, 383 · 63×9 | 7.8px · 700 | `#17141c` on `transparent` | 0px |
| #workspace | `div.num` | 1 | 725, 424 · 22×22 | 8px · 900 | `#4d22b6` on `#f3edff` | 7px |
| #workspace | `b` | Exact first email | 755, 427 · 82×10 | 9px · 700 | `#17141c` on `transparent` | 0px |
| #workspace | `small` | human gate before release | 755, 441 · 100×9 | 7.4px · 400 | `#766f7e` on `transparent` | 0px |
| #workspace | `p` | Hi Morgan — when Aster and Ridgewell spoke earlier this year, timing was the blocker. I noticed Ridgewell is now hiring service coordinators, which usually mean | 725, 458 · 314×162 | 9px · 400 | `#514958` on `transparent` | 0px |
| #workspace | `p` | Hi Priya — I saw Pinecrest has opened a new regional service hub. When service coverage expands, it can get harder to see which jobs need attention before custo | 1091, 458 · 314×162 | 9px · 400 | `#514958` on `transparent` | 0px |
| #workspace | `b` | This approval covers all 3 emails | 714, 656 · 148×9 | 8px · 700 | `#17141c` on `transparent` | 0px |
| #workspace | `div.followup` | Morgan — one thing I should have made clearer: I’m not assuming the hiring means you’re changing systems. I only thought the extra coordination load made it wor | 714, 673 · 336×78 | 7.8px · 400 | `#17141c` on `#ffffff` | 8px |
| #workspace | `div.followup` | Priya — I’m not assuming the new hub has created a problem. I reached out because expansion often makes exception visibility worth checking. If your current pro | 1080, 673 · 336×66 | 7.8px · 400 | `#17141c` on `#ffffff` | 8px |
| #workspace | `b` | Email 2 | 723, 682 · 318×11 | 7.9px · 700 | `#17141c` on `transparent` | 0px |
| #workspace | `div.followup` | I’ll close the loop here, Priya. If the new hub prompts a review of how jobs at risk are surfaced, I’m happy to compare notes for 15 minutes. | 1080, 745 · 336×55 | 7.8px · 400 | `#17141c` on `#ffffff` | 8px |
| #workspace | `div.followup` | Last note from me, Morgan. If job-risk visibility is not something you’re reviewing now, no problem. If it is, I’m happy to keep a first conversation to 15 minu | 714, 757 · 336×66 | 7.8px · 400 | `#17141c` on `#ffffff` | 8px |
| #thread | `div.bubble` | Every person has a subject, sourced research, a full three-email package and an approval record. Rejecting requires one of five explicit reasons and feeds Learn | 205, 764 · 431×67 | 10.5px · 400 | `#17141c` on `#eef5ff` | 13px |
| #workspace | `b` | Email 3 | 723, 766 · 318×11 | 7.9px · 700 | `#17141c` on `transparent` | 0px |
| #workspace | `div.approvalRecord` | Approved by: Operator · Time: 08 Oct · 08:55 · Version: v1 Checks passed: | 1080, 807 · 336×57 | 7.6px · 400 | `#17141c` on `#fcfbfd` | 8px |
| #workspace | `div.approvalRecord` | Approved by: Operator · Time: 08 Oct · 08:52 · Version: v1 Checks passed: | 714, 830 · 336×57 | 7.6px · 400 | `#17141c` on `#fcfbfd` | 8px |
| #workspace | `b` | Approval record | 723, 839 · 69×9 | 7.6px · 700 | `#17141c` on `transparent` | 0px |
| #workspace | `span.qaBadge` | signal | 785, 863 · 35×16 | 6.8px · 900 | `#177552` on `#eaf7f0` | 999px |
| #workspace | `span.qaBadge` | research | 823, 863 · 45×16 | 6.8px · 900 | `#177552` on `#eaf7f0` | 999px |
| #workspace | `span.qaBadge` | claims | 871, 863 · 36×16 | 6.8px · 900 | `#177552` on `#eaf7f0` | 999px |
| #workspace | `span.qaBadge` | law lines | 910, 863 · 46×16 | 6.8px · 900 | `#177552` on `#eaf7f0` | 999px |
| #workspace | `button.approve (click)` | Approve | 714, 895 · 55×23 | 7.8px · 850 | `#177552` on `#eaf7f0` | 8px |
| #workspace | `button (click)` | Edit | 774, 895 · 35×23 | 7.8px · 850 | `#000000` on `#ffffff` | 8px |
| #workspace | `button.reject (click)` | Reject | 814, 895 · 46×23 | 7.8px · 850 | `#b43b49` on `#fff0f2` | 8px |
| #workspace | `b` | Noah Carter | 714, 948 · 109×19 | 16px · 700 | `#17141c` on `transparent` | 0px |
| #workspace | `b` | Leah Morris | 1080, 948 · 107×19 | 16px · 700 | `#17141c` on `transparent` | 0px |
| #workspace | `span.tag` | Northbank Maintenance | 828, 953 · 107×16 | 7px · 900 | `#4d22b6` on `#f3edff` | 999px |
| #workspace | `span.tag` | Beacon Facilities | 1192, 953 · 78×16 | 7px · 900 | `#4d22b6` on `#f3edff` | 999px |
| #workspace | `div.meta` | New Operations Director Apollo role change · 03 Oct 2026 | 714, 974 · 336×22 | 7.7px · 400 | `#766f7e` on `transparent` | 0px |
| #workspace | `div.meta` | Two service depots acquired Press release · 30 Sep 2026 | 1080, 974 · 336×22 | 7.7px · 400 | `#766f7e` on `transparent` | 0px |
| #workspace | `div.subjectLine` | New Operations Director at Northbank | 714, 1003 · 336×25 | 8px · 850 | `#17141c` on `#faf8fc` | 8px |
| #workspace | `div.subjectLine` | Beacon’s two new depots | 1080, 1003 · 336×25 | 8px · 850 | `#17141c` on `#faf8fc` | 8px |
| #workspace | `li` | Apollo role change: Noah Carter became Operations Director · 03 Oct 2026. | 730, 1035 · 320×11 | 7.8px · 400 | `#5f5667` on `transparent` | 0px |
| #workspace | `li` | Beacon press release confirms two depot acquisitions · 30 Sep 2026. | 1096, 1035 · 320×11 | 7.8px · 400 | `#5f5667` on `transparent` | 0px |
| #workspace | `li` | Northbank remains inside Aster’s approved facilities-maintenance profile. | 730, 1046 · 320×11 | 7.8px · 400 | `#5f5667` on `transparent` | 0px |
| #workspace | `li` | Apollo: Leah is the operations lead for the enlarged service footprint. | 1096, 1046 · 320×11 | 7.8px · 400 | `#5f5667` on `transparent` | 0px |
| #workspace | `li` | Identity review completed: Noah Carter is the Northbank person everywhere; no inherited opt-out. | 730, 1058 · 320×23 | 7.8px · 400 | `#5f5667` on `transparent` | 0px |
| #workspace | `li` | CRM/M&V: no active opportunity, customer relationship or suppression. | 1096, 1058 · 320×11 | 7.8px · 400 | `#5f5667` on `transparent` | 0px |
| #workspace | `div.researchRisk` | Do not assume acquisition automatically creates integration issues. | 1080, 1076 · 336×36 | 7.8px · 400 | `#17141c` on `#fff4dc` | 7px |
| #workspace | `div.researchRisk` | Do not assume a role change means a technology project. | 714, 1087 · 336×25 | 7.8px · 400 | `#17141c` on `#fff4dc` | 7px |
| #workspace | `p` | Hi Noah — congratulations on the Operations Director move at Northbank. I’m reaching out because role changes like this often come with a fresh look at how fiel | 725, 1169 · 314×162 | 9px · 400 | `#514958` on `transparent` | 0px |
| #workspace | `p` | Hi Leah — I saw Beacon has acquired two service depots. Bringing new depots into the operating rhythm can make job-risk visibility harder if updates sit across  | 1091, 1169 · 314×149 | 9px · 400 | `#514958` on `transparent` | 0px |
| #workspace | `div.followup` | Leah — I’m not assuming the depot acquisitions have created a systems problem. The reason for the note is simply that more locations can make exception visibili | 1080, 1370 · 336×66 | 7.8px · 400 | `#17141c` on `#ffffff` | 8px |
| #workspace | `div.followup` | Noah — I’m not assuming the new role means you are changing tools. I only thought it was a sensible moment to compare how exceptions reach the operations team t | 714, 1384 · 336×66 | 7.8px · 400 | `#17141c` on `#ffffff` | 8px |
| #workspace | `div.followup` | I’ll leave it here, Leah. If bringing the new depots into one operating view is on the agenda, happy to compare what Aster does in a short call. | 1080, 1443 · 336×55 | 7.8px · 400 | `#17141c` on `#ffffff` | 8px |
| #workspace | `div.followup` | Last note, Noah. If job-risk visibility is already working well at Northbank, I’ll leave you to it. If it is on your list, happy to compare approaches briefly. | 714, 1456 · 336×55 | 7.8px · 400 | `#17141c` on `#ffffff` | 8px |
| #workspace | `div.approvalRecord` | Approved by: Operator · Time: 08 Oct · 09:04 · Version: v1 Checks passed: | 1080, 1505 · 336×57 | 7.6px · 400 | `#17141c` on `#fcfbfd` | 8px |
| #workspace | `div.approvalRecord` | Approved by: Operator · Time: 08 Oct · 09:01 · Version: v1 Checks passed: | 714, 1518 · 336×57 | 7.6px · 400 | `#17141c` on `#fcfbfd` | 8px |
| #workspace | `b` | Ethan Brooks | 714, 1636 · 120×19 | 16px · 700 | `#17141c` on `transparent` | 0px |
| #workspace | `b` | Daniel Ortiz | 1080, 1636 · 107×19 | 16px · 700 | `#17141c` on `transparent` | 0px |
| #workspace | `span.tag` | Summit Maintenance | 839, 1641 · 96×16 | 7px · 900 | `#4d22b6` on `#f3edff` | 999px |
| #workspace | `span.tag` | MetroServe FM | 1192, 1641 · 72×16 | 7px · 900 | `#4d22b6` on `#f3edff` | 999px |
| #workspace | `div.meta` | Dispatch-manager hiring Careers page · 06 Oct 2026 | 714, 1662 · 336×22 | 7.7px · 400 | `#766f7e` on `transparent` | 0px |
| #workspace | `div.meta` | New response-time SLA contract Company news · 29 Sep 2026 | 1080, 1662 · 336×22 | 7.7px · 400 | `#766f7e` on `transparent` | 0px |
| #workspace | `div.subjectLine` | Dispatch-manager hiring at Summit | 714, 1692 · 336×25 | 8px · 850 | `#17141c` on `#faf8fc` | 8px |
| #workspace | `div.subjectLine` | MetroServe’s new response-time SLA | 1080, 1692 · 336×25 | 8px · 850 | `#17141c` on `#faf8fc` | 8px |
| #workspace | `li` | Summit careers lists a dispatch-manager vacancy · 06 Oct 2026. | 730, 1724 · 320×11 | 7.8px · 400 | `#5f5667` on `transparent` | 0px |
| #workspace | `li` | MetroServe announced a new response-time SLA contract · 29 Sep 2026. | 1096, 1724 · 320×11 | 7.8px · 400 | `#5f5667` on `transparent` | 0px |
| #workspace | `li` | Apollo: Ethan remains responsible for operations. | 730, 1735 · 320×11 | 7.8px · 400 | `#5f5667` on `transparent` | 0px |
| #workspace | `li` | Apollo: Daniel Ortiz is the operations buyer attached to service delivery. | 1096, 1735 · 320×11 | 7.8px · 400 | `#5f5667` on `transparent` | 0px |
| #workspace | `li` | CRM/M&V: no prior Aster relationship and no suppression. | 730, 1746 · 320×11 | 7.8px · 400 | `#5f5667` on `transparent` | 0px |
| #workspace | `li` | CRM/M&V: no customer, active opportunity or opt-out conflict. | 1096, 1746 · 320×11 | 7.8px · 400 | `#5f5667` on `transparent` | 0px |
| #workspace | `div.researchRisk` | Do not assume hiring means dispatch is failing. | 714, 1765 · 336×25 | 7.8px · 400 | `#17141c` on `#fff4dc` | 7px |
| #workspace | `div.researchRisk` | Do not assume a new SLA means current performance is poor. | 1080, 1765 · 336×25 | 7.8px · 400 | `#17141c` on `#fff4dc` | 7px |
| #workspace | `p` | Hi Ethan — Summit is hiring a dispatch manager, which usually means dispatch and field coordination are getting more attention. I thought it was worth asking ho | 725, 1846 · 314×149 | 9px · 400 | `#514958` on `transparent` | 0px |
| #workspace | `p` | Hi Daniel — I saw MetroServe has won a new response-time SLA contract. When response commitments tighten, the hard part is often seeing the exceptions early eno | 1091, 1846 · 314×162 | 9px · 400 | `#514958` on `transparent` | 0px |
| #workspace | `div.followup` | Ethan — the dispatch hire may simply be growth, so I do not want to over-read it. I reached out because it is a current reason to ask whether exception visibili | 714, 2048 · 336×66 | 7.8px · 400 | `#17141c` on `#ffffff` | 8px |
| #workspace | `div.followup` | Daniel — I’m not assuming the new SLA has exposed a gap. The reason for the note is that tighter response commitments make exception visibility worth checking. | 1080, 2061 · 336×66 | 7.8px · 400 | `#17141c` on `#ffffff` | 8px |
| #workspace | `div.followup` | Last note, Ethan. If dispatch visibility is not a priority, I’ll leave it there. If it is, happy to compare how Aster approaches it. | 714, 2120 · 336×55 | 7.8px · 400 | `#17141c` on `#ffffff` | 8px |
| #workspace | `div.followup` | I’ll close the loop here, Daniel. If the new SLA has prompted any review of how jobs at risk are surfaced, happy to compare notes briefly. | 1080, 2134 · 336×55 | 7.8px · 400 | `#17141c` on `#ffffff` | 8px |
| #workspace | `div.approvalRecord` | Approved by: Operator · Time: 08 Oct · 09:08 · Version: v1 Checks passed: | 714, 2182 · 336×57 | 7.6px · 400 | `#17141c` on `#fcfbfd` | 8px |
| #workspace | `div.approvalRecord` | Approved by: Operator · Time: 08 Oct · 09:11 · Version: v1 Checks passed: | 1080, 2196 · 336×57 | 7.6px · 400 | `#17141c` on `#fcfbfd` | 8px |
| #workspace | `b` | One approval | 714, 2354 · 110×12 | 8.5px · 700 | `#4d22b6` on `transparent` | 0px |
| #workspace | `span` | Covers the first email and follow-ups 2 and 3 for that person. | 833, 2354 · 583×12 | 8.5px · 400 | `#5f5667` on `transparent` | 0px |
| #workspace | `b` | Edit | 714, 2383 · 110×12 | 8.5px · 700 | `#4d22b6` on `transparent` | 0px |
| #workspace | `span` | Creates a new version and requires approval again. | 833, 2383 · 583×12 | 8.5px · 400 | `#5f5667` on `transparent` | 0px |
| #workspace | `b` | Reject | 714, 2412 · 110×12 | 8.5px · 700 | `#4d22b6` on `transparent` | 0px |
| #workspace | `span` | Weak why-now · stale source · wrong person · claim not supported · tone. | 833, 2412 · 583×12 | 8.5px · 400 | `#5f5667` on `transparent` | 0px |
| #workspace | `b` | Exact send | 714, 2442 · 110×12 | 8.5px · 700 | `#4d22b6` on `transparent` | 0px |
| #workspace | `span` | Approved content is not regenerated later. | 833, 2442 · 583×12 | 8.5px · 400 | `#5f5667` on `transparent` | 0px |
| #workspace | `button.act (click)` | Run final eligibility | 703, 2483 · 111×26 | 8.5px · 850 | `#ffffff` on `transparent` | 9px |

### eligibility (50 elements · first seen: step 10: Final Eligibility)

| Region | Element | Exact text | x, y · w×h | Size · weight | Colour on background | Rounding |
|---|---|---|---|---|---|---|
| #screenTitle | `b` | Final Eligibility | 232, 19 · 154×14 | 12px · 700 | `#17141c` on `transparent` | 0px |
| #screenSub | `span` | All gates immediately before send | 232, 35 · 154×10 | 9px · 400 | `#766f7e` on `transparent` | 0px |
| #stage | `span.s` | ✓ Research | 399, 80 · 54×10 | 8.5px · 750 | `#706475` on `transparent` | 0px |
| #stage | `span.s` | Check | 483, 80 · 29×10 | 8.5px · 900 | `#4d22b6` on `transparent` | 0px |
| #workTitle | `b` | Final Eligibility | 704, 124 · 101×14 | 12px · 700 | `#17141c` on `transparent` | 0px |
| #workState | `div.state` | READY | 1380, 124 · 46×21 | 8px · 900 | `#675e6d` on `#f0edf3` | 999px |
| #workSub | `span.sub` | All gates immediately before send | 704, 141 · 137×9 | 8px · 400 | `#766f7e` on `transparent` | 0px |
| #workspace | `button.clientTab (click)` | Eligibility | 1118, 177 · 62×25 | 8px · 850 | `#4d22b6` on `#f3edff` | 999px |
| #workspace | `span` | Relationship | 713, 253 · 156×8 | 7px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `span` | Signal | 896, 253 · 156×8 | 7px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `span` | Identity | 1079, 253 · 156×8 | 7px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `span` | Message | 1261, 253 · 156×8 | 7px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `b` | Fresh | 896, 265 · 156×15 | 13px · 700 | `#17141c` on `transparent` | 0px |
| #workspace | `b` | Approved | 1261, 265 · 156×15 | 13px · 700 | `#17141c` on `transparent` | 0px |
| #workspace | `small` | no customer/open deal | 713, 283 · 156×10 | 7.5px · 400 | `#766f7e` on `transparent` | 0px |
| #workspace | `small` | source-linked | 896, 283 · 156×10 | 7.5px · 400 | `#766f7e` on `transparent` | 0px |
| #workspace | `small` | same person | 1079, 283 · 156×10 | 7.5px · 400 | `#766f7e` on `transparent` | 0px |
| #workspace | `small` | exact version | 1261, 283 · 156×10 | 7.5px · 400 | `#766f7e` on `transparent` | 0px |
| #workspace | `b` | Pre-send gate | 714, 322 · 79×11 | 10px · 700 | `#17141c` on `transparent` | 0px |
| #workspace | `span` | ONE TRUTH | 1365, 323 · 51×9 | 7.4px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `th` | Gate | 704, 344 · 177×23 | 7px · 700 | `#a29aa9` on `#fcfbfd` | 0px |
| #workspace | `th` | State | 1326, 344 · 100×23 | 7px · 700 | `#a29aa9` on `#fcfbfd` | 0px |
| #workspace | `td` | Send authority | 704, 366 · 177×34 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Human approval record | 881, 366 · 445×34 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `span.tag` | PASS | 1334, 375 · 32×17 | 7px · 900 | `#177552` on `#eaf7f0` | 999px |
| #workspace | `td` | Relationship | 704, 401 · 177×34 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | CRM + M&V memory | 881, 401 · 445×34 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `span.tag` | PASS | 1334, 409 · 32×17 | 7px · 900 | `#177552` on `#eaf7f0` | 999px |
| #workspace | `td` | Signal freshness | 704, 435 · 177×34 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Dated source + expiry | 881, 435 · 445×34 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Identity | 704, 470 · 177×34 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Canonical person/company | 881, 470 · 445×34 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Mailbox | 704, 504 · 177×34 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Warm · under limit · auth passing | 881, 504 · 445×34 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Law lines | 704, 538 · 177×34 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Source + privacy + Aster postal + unsubscribe | 881, 538 · 445×34 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `b` | Nothing changed | 714, 633 · 110×12 | 8.5px · 700 | `#4d22b6` on `transparent` | 0px |
| #workspace | `span` | Any changed source after approval sends the record back to review. | 833, 633 · 583×12 | 8.5px · 400 | `#5f5667` on `transparent` | 0px |
| #workspace | `b` | Same truth everywhere | 714, 663 · 110×25 | 8.5px · 700 | `#4d22b6` on `transparent` | 0px |
| #workspace | `span` | Sending yes/no and blocker reason come from one answer. | 833, 663 · 583×25 | 8.5px · 400 | `#5f5667` on `transparent` | 0px |
| #workspace | `button.act (click)` | Open Mailbox Fleet | 703, 716 · 113×26 | 8.5px · 850 | `#ffffff` on `transparent` | 9px |
| #thread | `div.bubble` | Human approval is necessary but not sufficient. I re-check relationship, signal, identity, mailbox and exact version immediately before send. | 205, 780 · 431×51 | 10.5px · 400 | `#17141c` on `#eef5ff` | 13px |
| #workspace | `td` | Current relationship state | 874, 806 · 246×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Allowed / protected / suppressed | 1120, 806 · 306×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Signal store | 704, 834 · 170×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Fresh source | 874, 834 · 246×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Required a real reason now | 1120, 834 · 306×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Human approval | 704, 862 · 170×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Exact message version | 874, 862 · 246×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Released only checked work | 1120, 862 · 306×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |

### mailbox (85 elements · first seen: step 11: Mailbox Fleet)

| Region | Element | Exact text | x, y · w×h | Size · weight | Colour on background | Rounding |
|---|---|---|---|---|---|---|
| #screenTitle | `b` | Mailbox Fleet | 232, 19 · 252×14 | 12px · 700 | `#17141c` on `transparent` | 0px |
| #screenSub | `span` | Aster-owned Google account · sender Dana Reyes, COO | 232, 35 · 252×10 | 9px · 400 | `#766f7e` on `transparent` | 0px |
| #workTitle | `b` | Mailbox Fleet | 704, 124 · 91×14 | 12px · 700 | `#17141c` on `transparent` | 0px |
| #workState | `div.state` | 5 READY · 1 WARMING | 1310, 124 · 116×21 | 8px · 900 | `#675e6d` on `#f0edf3` | 999px |
| #workSub | `span.sub` | Aster-owned Google account · sender Dana Reyes, COO | 704, 141 · 224×9 | 8px · 400 | `#766f7e` on `transparent` | 0px |
| #workspace | `span` | First emails this week | 713, 187 · 156×8 | 7px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `span` | Warm-up today | 896, 187 · 156×8 | 7px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `span` | All traffic today | 1079, 187 · 156×8 | 7px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `span` | Safe daily limit | 1261, 187 · 156×8 | 7px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `b` | 68 | 896, 199 · 156×15 | 13px · 700 | `#17141c` on `transparent` | 0px |
| #workspace | `b` | 74 | 1079, 199 · 156×15 | 13px · 700 | `#17141c` on `transparent` | 0px |
| #workspace | `b` | 135 | 1261, 199 · 156×15 | 13px · 700 | `#17141c` on `transparent` | 0px |
| #workspace | `small` | same as Milla | 713, 217 · 156×10 | 7.5px · 400 | `#766f7e` on `transparent` | 0px |
| #workspace | `small` | separate traffic | 896, 217 · 156×10 | 7.5px · 400 | `#766f7e` on `transparent` | 0px |
| #workspace | `small` | 6 first + 68 warm-up | 1079, 217 · 156×10 | 7.5px · 400 | `#766f7e` on `transparent` | 0px |
| #workspace | `small` | internal only | 1261, 217 · 156×10 | 7.5px · 400 | `#766f7e` on `transparent` | 0px |
| #navIn | `button.active (click)` | Mailbox fleet | 10, 239 · 169×29 | 10px · 900 | `#4d22b6` on `#f0eafd` | 9px |
| #workspace | `b` | Aster mailbox fleet | 714, 256 · 107×11 | 10px · 700 | `#17141c` on `transparent` | 0px |
| #workspace | `span` | ONE REAL SENDER · CLIENT GOOGLE | 1253, 257 · 163×9 | 7.4px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `th` | Mailbox | 704, 278 · 144×39 | 7px · 700 | `#a29aa9` on `#fcfbfd` | 0px |
| #workspace | `th` | Signer | 848, 278 · 48×39 | 7px · 700 | `#a29aa9` on `#fcfbfd` | 0px |
| #workspace | `th` | Lookalike domain | 896, 278 · 90×39 | 7px · 700 | `#a29aa9` on `#fcfbfd` | 0px |
| #workspace | `th` | Warm-up | 986, 278 · 53×39 | 7px · 700 | `#a29aa9` on `#fcfbfd` | 0px |
| #workspace | `th` | First emails today | 1039, 278 · 47×39 | 7px · 700 | `#a29aa9` on `#fcfbfd` | 0px |
| #workspace | `th` | Warm-up today | 1086, 278 · 46×39 | 7px · 700 | `#a29aa9` on `#fcfbfd` | 0px |
| #workspace | `th` | Safe daily limit | 1132, 278 · 40×39 | 7px · 700 | `#a29aa9` on `#fcfbfd` | 0px |
| #workspace | `th` | Bounces | 1172, 278 · 56×39 | 7px · 700 | `#a29aa9` on `#fcfbfd` | 0px |
| #workspace | `th` | Complaints | 1228, 278 · 71×39 | 7px · 700 | `#a29aa9` on `#fcfbfd` | 0px |
| #workspace | `th` | SPF | 1299, 278 · 48×39 | 7px · 700 | `#a29aa9` on `#fcfbfd` | 0px |
| #workspace | `th` | DKIM | 1347, 278 · 48×39 | 7px · 700 | `#a29aa9` on `#fcfbfd` | 0px |
| #workspace | `th` | DMARC | 1395, 278 · 48×39 | 7px · 700 | `#a29aa9` on `#fcfbfd` | 0px |
| #workspace | `td` | dana@asterfieldhq.com | 704, 316 · 144×51 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Dana Reyes, COO | 848, 316 · 48×51 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | asterfieldhq.com | 896, 316 · 90×51 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Ready | 986, 316 · 53×51 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | 2 | 1039, 316 · 47×51 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | 12 | 1086, 316 · 46×51 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | 25 | 1132, 316 · 40×51 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | 0.4% | 1172, 316 · 56×51 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | dana.reyes@asterfieldhq.com | 704, 367 · 144×51 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Dana Reyes, COO | 848, 367 · 48×51 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | asterfieldhq.com | 896, 367 · 90×51 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Ready | 986, 367 · 53×51 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | 12 | 1086, 367 · 46×51 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | 25 | 1132, 367 · 40×51 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | 0.0% | 1172, 367 · 56×51 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | d.reyes@asterfieldhq.com | 704, 417 · 144×51 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | 0.7% | 1172, 417 · 56×51 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | dana@asterfieldops.com | 704, 468 · 144×51 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | asterfieldops.com | 896, 468 · 90×51 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | dana.reyes@asterfieldops.com | 704, 519 · 144×51 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | d.reyes@asterfieldops.com | 704, 569 · 144×51 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Warming · day 12 | 986, 569 · 53×51 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `b` | Open decisions | 714, 640 · 86×11 | 10px · 700 | `#17141c` on `transparent` | 0px |
| #workspace | `span` | FOUNDER DECISION REQUIRED | 1279, 641 · 137×9 | 7.4px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `label` | Mailboxes per client | 714, 681 · 135×9 | 7.4px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `div.v` | OPEN | 859, 681 · 478×13 | 9px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `span.m` | 6–10 is not locked | 1347, 681 · 69×9 | 7.7px · 400 | `#766f7e` on `transparent` | 0px |
| #workspace | `label` | Who pays for mailboxes | 714, 713 · 135×9 | 7.4px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `span.m` | client-owned Google is current recommendation | 1230, 713 · 186×9 | 7.7px · 400 | `#766f7e` on `transparent` | 0px |
| #workspace | `span.tag` | PROPOSED GUARDRAILS | 1308, 765 · 108×16 | 7px · 900 | `#956414` on `#fff4dc` | 999px |
| #workspace | `b` | Internal Capacity | 714, 768 · 97×11 | 10px · 700 | `#17141c` on `transparent` | 0px |
| #thread | `div.bubble` | Aster has six first emails this week. Warm-up traffic is separate so nobody mistakes it for prospecting volume. The 135 safe daily limit stays internal. | 205, 780 · 431×51 | 10.5px · 400 | `#17141c` on `#eef5ff` | 13px |
| #workspace | `span` | All-clients daily limit | 723, 811 · 211×8 | 6.8px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `span` | Per-client limit | 959, 811 · 211×8 | 6.8px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `span` | Per-mailbox limit | 1196, 811 · 211×8 | 6.8px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `b` | 1,350 | 723, 823 · 211×11 | 10px · 700 | `#17141c` on `transparent` | 0px |
| #workspace | `b` | 135 | 959, 823 · 211×11 | 10px · 700 | `#17141c` on `transparent` | 0px |
| #workspace | `b` | 25 | 1196, 823 · 211×11 | 10px · 700 | `#17141c` on `transparent` | 0px |
| #workspace | `span` | Bounce pause | 723, 859 · 211×8 | 6.8px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `span` | Apollo credits | 959, 859 · 211×8 | 6.8px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `span` | People operators can check | 1196, 859 · 211×8 | 6.8px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `b` | 3% · mailbox only | 723, 871 · 211×11 | 10px · 700 | `#17141c` on `transparent` | 0px |
| #workspace | `b` | 720 / 1,500 | 959, 871 · 211×11 | 10px · 700 | `#17141c` on `transparent` | 0px |
| #workspace | `b` | 45 / day | 1196, 871 · 211×11 | 10px · 700 | `#17141c` on `transparent` | 0px |
| #workspace | `div.miniCallout` | · operator quality capacity is close to the proposed daily check ceiling; re-check when the queue clears. | 704, 909 · 722×34 | 8px · 400 | `#17141c` on `#f8f3ff` | 8px |
| #workspace | `span.tag` | HOLD | 891, 917 · 34×18 | 7px · 900 | `#956414` on `#fff4dc` | 999px |
| #workspace | `b` | Can we take another client this week? | 716, 921 · 172×9 | 8px · 700 | `#17141c` on `transparent` | 0px |
| #workspace | `b` | Mailbox-only pause | 714, 1003 · 110×12 | 8.5px · 700 | `#4d22b6` on `transparent` | 0px |
| #workspace | `span` | A bounce threshold pauses only the affected mailbox, not the whole client. | 833, 1003 · 583×12 | 8.5px · 400 | `#5f5667` on `transparent` | 0px |
| #workspace | `b` | Warm-up separated | 714, 1033 · 110×12 | 8.5px · 700 | `#4d22b6` on `transparent` | 0px |
| #workspace | `span` | Warm-up traffic never inflates client outreach numbers. | 833, 1033 · 583×12 | 8.5px · 400 | `#5f5667` on `transparent` | 0px |
| #workspace | `b` | Client identity | 714, 1062 · 110×12 | 8.5px · 700 | `#4d22b6` on `transparent` | 0px |
| #workspace | `span` | Every address signs as Dana Reyes, COO; replies return to Aster. | 833, 1062 · 583×12 | 8.5px · 400 | `#5f5667` on `transparent` | 0px |
| #workspace | `button.act (click)` | Send exact checked messages | 703, 1103 · 166×26 | 8.5px · 850 | `#ffffff` on `transparent` | 9px |

### sending (88 elements · first seen: step 12: Precision Sending)

| Region | Element | Exact text | x, y · w×h | Size · weight | Colour on background | Rounding |
|---|---|---|---|---|---|---|
| #screenTitle | `b` | Precision Sending | 232, 19 · 236×14 | 12px · 700 | `#17141c` on `transparent` | 0px |
| #screenTitle | `b` | Continuous Eligibility | 232, 19 · 221×14 | 12px · 700 | `#17141c` on `transparent` | 0px |
| #screenSub | `span` | Six first emails this week · exact approved packages | 232, 35 · 236×10 | 9px · 400 | `#766f7e` on `transparent` | 0px |
| #screenSub | `span` | Alderline · relationship change beats prospecting | 232, 35 · 221×10 | 9px · 400 | `#766f7e` on `transparent` | 0px |
| #stage | `span.s` | ✓ Check | 483, 80 · 39×10 | 8.5px · 750 | `#706475` on `transparent` | 0px |
| #stage | `span.s` | Send | 552, 80 · 24×10 | 8.5px · 900 | `#4d22b6` on `transparent` | 0px |
| #workTitle | `b` | Precision Sending | 704, 124 · 121×14 | 12px · 700 | `#17141c` on `transparent` | 0px |
| #workTitle | `b` | Continuous Eligibility | 704, 124 · 144×14 | 12px · 700 | `#17141c` on `transparent` | 0px |
| #workState | `div.state` | FOLLOW-UPS CANCELLED | 1296, 124 · 130×21 | 8px · 900 | `#675e6d` on `#f0edf3` | 999px |
| #workState | `div.state` | SENDING | 1369, 124 · 57×21 | 8px · 900 | `#675e6d` on `#f0edf3` | 999px |
| #workSub | `span.sub` | Six first emails this week · exact approved packages | 704, 141 · 210×9 | 8px · 400 | `#766f7e` on `transparent` | 0px |
| #workSub | `span.sub` | Alderline · relationship change beats prospecting | 704, 141 · 197×9 | 8px · 400 | `#766f7e` on `transparent` | 0px |
| #workspace | `button.clientTab (click)` | Sending | 1187, 177 · 57×25 | 8px · 850 | `#4d22b6` on `#f3edff` | 999px |
| #workspace | `span` | Account | 713, 253 · 156×8 | 7px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `span` | Sender | 896, 253 · 156×8 | 7px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `span` | CRM event | 896, 253 · 156×8 | 7px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `span` | Reply-to | 1079, 253 · 156×8 | 7px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `span` | Rule | 1079, 253 · 156×8 | 7px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `span` | Message truth | 1261, 253 · 156×8 | 7px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `span` | Follow-ups | 1261, 253 · 156×8 | 7px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `b` | Alderline Services | 713, 265 · 156×15 | 13px · 700 | `#17141c` on `transparent` | 0px |
| #workspace | `b` | Dana Reyes, COO | 896, 265 · 156×15 | 13px · 700 | `#17141c` on `transparent` | 0px |
| #workspace | `b` | Proposal · 10:42 | 896, 265 · 156×15 | 13px · 700 | `#17141c` on `transparent` | 0px |
| #workspace | `b` | Aster address | 1079, 265 · 156×15 | 13px · 700 | `#17141c` on `transparent` | 0px |
| #workspace | `b` | Open deal beats prospecting | 1079, 265 · 156×30 | 13px · 700 | `#17141c` on `transparent` | 0px |
| #workspace | `b` | Exact approved version | 1261, 265 · 156×30 | 13px · 700 | `#17141c` on `transparent` | 0px |
| #workspace | `b` | 2–3 cancelled | 1261, 265 · 156×15 | 13px · 700 | `#17141c` on `transparent` | 0px |
| #workspace | `small` | relationship changed | 713, 283 · 156×10 | 7.5px · 400 | `#766f7e` on `transparent` | 0px |
| #workspace | `small` | Aster identity | 896, 283 · 156×10 | 7.5px · 400 | `#766f7e` on `transparent` | 0px |
| #workspace | `small` | authoritative | 896, 283 · 156×10 | 7.5px · 400 | `#766f7e` on `transparent` | 0px |
| #workspace | `small` | client-owned | 1079, 283 · 156×10 | 7.5px · 400 | `#766f7e` on `transparent` | 0px |
| #workspace | `small` | immediate | 1261, 283 · 156×10 | 7.5px · 400 | `#766f7e` on `transparent` | 0px |
| #workspace | `small` | precedence | 1079, 298 · 156×10 | 7.5px · 400 | `#766f7e` on `transparent` | 0px |
| #workspace | `small` | no rebuild | 1261, 298 · 156×10 | 7.5px · 400 | `#766f7e` on `transparent` | 0px |
| #workspace | `b` | Exact-send record · Morgan | 714, 337 · 156×11 | 10px · 700 | `#17141c` on `transparent` | 0px |
| #workspace | `b` | Eligibility trace | 714, 337 · 86×11 | 10px · 700 | `#17141c` on `transparent` | 0px |
| #workspace | `span` | NO REBUILD AT SEND TIME | 1296, 338 · 120×9 | 7.4px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `span` | EXPLAINABLE STOP | 1329, 338 · 87×9 | 7.4px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `th` | Time | 704, 359 · 47×23 | 7px · 700 | `#a29aa9` on `#fcfbfd` | 0px |
| #workspace | `th` | Rule | 922, 359 · 179×23 | 7px · 700 | `#a29aa9` on `#fcfbfd` | 0px |
| #workspace | `label` | Message ID | 714, 378 · 135×9 | 7.4px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `div.v` | msg_ridgewell_01_v1 | 859, 378 · 468×13 | 9px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `span.m` | same in Milla + Vida | 1337, 378 · 79×9 | 7.7px · 400 | `#766f7e` on `transparent` | 0px |
| #workspace | `td` | 10:42 | 704, 381 · 47×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Alderline CRM stage → Proposal | 751, 381 · 172×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | An open deal beats prospecting | 922, 381 · 179×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Follow-ups 2–3 cancelled | 1101, 381 · 325×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | 10:42 | 704, 409 · 47×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Fresh hiring signal still exists | 751, 409 · 172×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Signal cannot override open deal | 922, 409 · 179×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Signal attached to Alderline account record / free meeting prep | 1101, 409 · 325×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `label` | Approval | 714, 410 · 135×9 | 7.4px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `div.v` | Operator · 08 Oct 08:52 · v1 | 859, 410 · 431×13 | 9px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `span.m` | signal · research · claims · law | 1300, 410 · 116×9 | 7.7px · 400 | `#766f7e` on `transparent` | 0px |
| #workspace | `label` | From | 714, 442 · 135×9 | 7.4px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `div.v` | Dana Reyes, COO · Aster lookalike domain | 859, 442 · 497×13 | 9px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `span.m` | Aster Google | 1366, 442 · 50×9 | 7.7px · 400 | `#766f7e` on `transparent` | 0px |
| #workspace | `label` | Reply-to | 714, 474 · 135×9 | 7.4px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `div.v` | Aster’s own address | 859, 474 · 492×13 | 9px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `span.m` | honest sender | 1361, 474 · 55×9 | 7.7px · 400 | `#766f7e` on `transparent` | 0px |
| #workspace | `b` | Protect relationships | 714, 498 · 110×12 | 8.5px · 700 | `#4d22b6` on `transparent` | 0px |
| #workspace | `span` | Execution changes when authoritative commercial state changes. | 833, 498 · 583×12 | 8.5px · 400 | `#5f5667` on `transparent` | 0px |
| #workspace | `label` | Footer | 714, 506 · 135×9 | 7.4px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `div.v` | Source notice · privacy link · Aster Field Systems Ltd. · [Aster registered postal address] · unsubscribe | 859, 506 · 508×13 | 9px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `span.m` | first email | 1377, 506 · 39×9 | 7.7px · 400 | `#766f7e` on `transparent` | 0px |
| #workspace | `b` | Keep useful context | 714, 527 · 110×12 | 8.5px · 700 | `#4d22b6` on `transparent` | 0px |
| #workspace | `span` | The signal is not discarded; it moves to the account record/free prep. | 833, 527 · 583×12 | 8.5px · 400 | `#5f5667` on `transparent` | 0px |
| #workspace | `b` | No paid Coaching sale | 714, 557 · 110×12 | 8.5px · 700 | `#4d22b6` on `transparent` | 0px |
| #workspace | `span` | Vida never turns a signal into a paid Coaching offer. | 833, 557 · 583×12 | 8.5px · 400 | `#5f5667` on `transparent` | 0px |
| #workspace | `button.act (click)` | Open Reply Queue | 703, 598 · 109×26 | 8.5px · 850 | `#ffffff` on `transparent` | 9px |
| #workspace | `b` | Few, not many | 714, 598 · 110×12 | 8.5px · 700 | `#4d22b6` on `transparent` | 0px |
| #workspace | `span` | Six person-level sends this week. | 833, 598 · 583×12 | 8.5px · 400 | `#5f5667` on `transparent` | 0px |
| #workspace | `b` | Exact payload | 714, 627 · 110×12 | 8.5px · 700 | `#4d22b6` on `transparent` | 0px |
| #workspace | `span` | Worker uses the approved text/version. | 833, 627 · 583×12 | 8.5px · 400 | `#5f5667` on `transparent` | 0px |
| #workspace | `b` | Continuous eligibility | 714, 657 · 110×12 | 8.5px · 700 | `#4d22b6` on `transparent` | 0px |
| #workspace | `span` | CRM changes can still cancel unsent follow-ups. | 833, 657 · 583×12 | 8.5px · 400 | `#5f5667` on `transparent` | 0px |
| #workspace | `button.act (click)` | Open continuous eligibility | 703, 698 · 149×26 | 8.5px · 850 | `#ffffff` on `transparent` | 9px |
| #thread | `div.bubble` | Alderline changed after the first touch. CRM moved the account to Proposal at 10:42, so open-deal precedence cancelled follow-ups 2 and 3. The hiring signal wen | 205, 748 · 431×83 | 10.5px · 400 | `#17141c` on `#eef5ff` | 13px |
| #thread | `div.bubble` | Six first emails are live this week, the same six Milla shows. Every one maps back to a person, evidence packet and approval record. | 205, 781 · 431×51 | 10.5px · 400 | `#17141c` on `#eef5ff` | 13px |
| #workspace | `td` | Aster Google | 704, 787 · 142×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Sender mailbox and limit | 846, 787 · 280×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Sent from client-owned identity | 1126, 787 · 300×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | CRM event | 704, 816 · 142×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Alderline → Proposal at 10:42 | 846, 816 · 280×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Cancelled follow-ups 2–3 | 1126, 816 · 300×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Audit record | 704, 844 · 142×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Exact message ID | 846, 844 · 280×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Made send reproducible | 1126, 844 · 300×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |

### replies (64 elements · first seen: step 14: Reply Queue)

| Region | Element | Exact text | x, y · w×h | Size · weight | Colour on background | Rounding |
|---|---|---|---|---|---|---|
| #screenTitle | `b` | Reply Queue | 232, 19 · 183×14 | 12px · 700 | `#17141c` on `transparent` | 0px |
| #screenSub | `span` | All clients · oldest first · same-day target | 232, 35 · 183×10 | 9px · 400 | `#766f7e` on `transparent` | 0px |
| #stage | `span.s` | ✓ Send | 552, 80 · 34×10 | 8.5px · 750 | `#706475` on `transparent` | 0px |
| #stage | `span.s` | Convert | 616, 80 · 38×10 | 8.5px · 900 | `#4d22b6` on `transparent` | 0px |
| #workTitle | `b` | Reply Queue | 704, 124 · 86×14 | 12px · 700 | `#17141c` on `transparent` | 0px |
| #workState | `div.state` | 5 WAITING | 1362, 124 · 64×21 | 8px · 900 | `#675e6d` on `#f0edf3` | 999px |
| #workSub | `span.sub` | All clients · oldest first · same-day target | 704, 141 · 163×9 | 8px · 400 | `#766f7e` on `transparent` | 0px |
| #workspace | `span` | Waiting | 713, 187 · 156×8 | 7px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `span` | Oldest | 896, 187 · 156×8 | 7px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `span` | Same-day target | 1079, 187 · 156×8 | 7px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `span` | Ridgewell | 1261, 187 · 156×8 | 7px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `b` | 5 hours | 896, 199 · 156×15 | 13px · 700 | `#17141c` on `transparent` | 0px |
| #workspace | `b` | At risk | 1079, 199 · 156×15 | 13px · 700 | `#17141c` on `transparent` | 0px |
| #workspace | `b` | 7 min | 1261, 199 · 156×15 | 13px · 700 | `#17141c` on `transparent` | 0px |
| #navIn | `button.active (click)` | Reply queue | 10, 208 · 169×29 | 10px · 900 | `#4d22b6` on `#f0eafd` | 9px |
| #workspace | `small` | 1 Harborline · 3 Acorn · 1 Ridgewell | 713, 217 · 156×10 | 7.5px · 400 | `#766f7e` on `transparent` | 0px |
| #workspace | `small` | Harborline | 896, 217 · 156×10 | 7.5px · 400 | `#766f7e` on `transparent` | 0px |
| #workspace | `small` | fifth row | 1261, 217 · 156×10 | 7.5px · 400 | `#766f7e` on `transparent` | 0px |
| #workspace | `b` | Oldest reply first | 714, 256 · 95×11 | 10px · 700 | `#17141c` on `transparent` | 0px |
| #workspace | `span` | EXACT TODAY-BOARD ORDER | 1287, 257 · 129×9 | 7.4px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `th` | Order | 704, 278 · 63×23 | 7px · 700 | `#a29aa9` on `#fcfbfd` | 0px |
| #workspace | `th` | Person / thread | 916, 278 · 158×23 | 7px · 700 | `#a29aa9` on `#fcfbfd` | 0px |
| #workspace | `th` | Waiting | 1074, 278 · 74×23 | 7px · 700 | `#a29aa9` on `#fcfbfd` | 0px |
| #workspace | `th` | Next | 1222, 278 · 204×23 | 7px · 700 | `#a29aa9` on `#fcfbfd` | 0px |
| #workspace | `td` | 1 | 704, 300 · 63×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Harborline Consulting | 767, 300 · 149×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Jamie Cole | 916, 300 · 158×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | 5 hours | 1074, 300 · 74×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Respond now | 1222, 300 · 204×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | 2 | 704, 328 · 63×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Acorn Digital | 767, 328 · 149×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Reply A | 916, 328 · 158×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | 3 hours | 1074, 328 · 74×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Triage | 1222, 328 · 204×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | 3 | 704, 357 · 63×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Reply B | 916, 357 · 158×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | 1h 42m | 1074, 357 · 74×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | 4 | 704, 385 · 63×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Reply C | 916, 385 · 158×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | 22 min | 1074, 385 · 74×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | 5 | 704, 413 · 63×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Morgan Lee · Ridgewell | 916, 413 · 158×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | 7 min | 1074, 413 · 74×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Grounded integration response | 1222, 413 · 204×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `b` | Ridgewell thread | 714, 462 · 96×11 | 10px · 700 | `#17141c` on `transparent` | 0px |
| #workspace | `span` | FULL CONTEXT | 1350, 463 · 66×9 | 7.4px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `label` | Buyer | 714, 503 · 135×9 | 7.4px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `div.v` | “Does this connect to our current job system?” | 859, 503 · 528×13 | 9px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `span.m` | reply | 1397, 503 · 19×9 | 7.7px · 400 | `#766f7e` on `transparent` | 0px |
| #workspace | `label` | Known | 714, 535 · 135×9 | 7.4px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `div.v` | Aster product capability is approved | 859, 535 · 531×13 | 9px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `span.m` | safe | 1400, 535 · 16×9 | 7.7px · 400 | `#766f7e` on `transparent` | 0px |
| #workspace | `label` | Unknown | 714, 567 · 135×9 | 7.4px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `div.v` | Ridgewell’s current system / exact integration path | 859, 567 · 503×13 | 9px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `span.m` | must verify | 1372, 567 · 44×9 | 7.7px · 400 | `#766f7e` on `transparent` | 0px |
| #workspace | `div.v` | Reactivation after prior timing loss | 859, 599 · 530×13 | 9px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `b` | Same-day target | 714, 691 · 110×12 | 8.5px · 700 | `#4d22b6` on `transparent` | 0px |
| #workspace | `span` | Reply age is a risk factor; it is not hidden in a client inbox. | 833, 691 · 583×12 | 8.5px · 400 | `#5f5667` on `transparent` | 0px |
| #workspace | `b` | Oldest first | 714, 720 · 110×12 | 8.5px · 700 | `#4d22b6` on `transparent` | 0px |
| #workspace | `span` | Harborline remains first until answered. | 833, 720 · 583×12 | 8.5px · 400 | `#5f5667` on `transparent` | 0px |
| #workspace | `b` | Grounded reply | 714, 750 · 110×12 | 8.5px · 700 | `#4d22b6` on `transparent` | 0px |
| #workspace | `span` | Unverified integration details stay conditional. | 833, 750 · 583×12 | 8.5px · 400 | `#5f5667` on `transparent` | 0px |
| #thread | `div.bubble` | The queue matches the Today Board: Harborline first at five hours, then Acorn’s three replies, then Ridgewell at seven minutes. | 205, 780 · 431×51 | 10.5px · 400 | `#17141c` on `#eef5ff` | 13px |
| #workspace | `button.act (click)` | Open meeting outcome | 703, 791 · 132×26 | 8.5px · 850 | `#ffffff` on `transparent` | 9px |

### meetings (69 elements · first seen: step 15: Meetings)

| Region | Element | Exact text | x, y · w×h | Size · weight | Colour on background | Rounding |
|---|---|---|---|---|---|---|
| #screenTitle | `b` | Meetings | 232, 19 · 188×14 | 12px · 700 | `#17141c` on `transparent` | 0px |
| #screenSub | `span` | 48-hour held rule · billing truth · free prep | 232, 35 · 188×10 | 9px · 400 | `#766f7e` on `transparent` | 0px |
| #workTitle | `b` | Meetings | 704, 124 · 62×14 | 12px · 700 | `#17141c` on `transparent` | 0px |
| #workState | `div.state` | 1 HELD | 1378, 124 · 48×21 | 8px · 900 | `#675e6d` on `#f0edf3` | 999px |
| #workSub | `span.sub` | 48-hour held rule · billing truth · free prep | 704, 141 · 167×9 | 8px · 400 | `#766f7e` on `transparent` | 0px |
| #workspace | `button.clientTab (click)` | Meetings | 1249, 177 · 62×25 | 8px · 850 | `#4d22b6` on `#f3edff` | 999px |
| #workspace | `span` | Held this month | 896, 253 · 156×8 | 7px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `span` | Setup | 1079, 253 · 156×8 | 7px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `span` | Paid Coaching | 1261, 253 · 156×8 | 7px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `b` | Time passed | 713, 265 · 156×15 | 13px · 700 | `#17141c` on `transparent` | 0px |
| #workspace | `b` | $1,500 | 1079, 265 · 156×15 | 13px · 700 | `#17141c` on `transparent` | 0px |
| #workspace | `b` | After 3rd held | 1261, 265 · 156×15 | 13px · 700 | `#17141c` on `transparent` | 0px |
| #workspace | `small` | 48h rule applies | 713, 283 · 156×10 | 7.5px · 400 | `#766f7e` on `transparent` | 0px |
| #workspace | `small` | $700 working charge | 896, 283 · 156×10 | 7.5px · 400 | `#766f7e` on `transparent` | 0px |
| #workspace | `small` | price still to be decided | 1079, 283 · 156×10 | 7.5px · 400 | `#766f7e` on `transparent` | 0px |
| #workspace | `small` | Milla only | 1261, 283 · 156×10 | 7.5px · 400 | `#766f7e` on `transparent` | 0px |
| #workspace | `b` | Meeting evidence card · MTG-0261 | 714, 322 · 196×11 | 10px · 700 | `#17141c` on `transparent` | 0px |
| #workspace | `span` | HELD RULE | 1367, 323 · 49×9 | 7.4px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `div.v` | Morgan Lee · Operations Director · Ridgewell | 859, 363 · 482×13 | 9px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `span.m` | per_morgan_027 | 1351, 363 · 65×9 | 7.7px · 400 | `#766f7e` on `transparent` | 0px |
| #workspace | `label` | Why now | 714, 395 · 135×9 | 7.4px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `div.v` | Prior timing loss + service-coordinator hiring | 859, 395 · 496×13 | 9px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `span.m` | source-linked | 1365, 395 · 51×9 | 7.7px · 400 | `#766f7e` on `transparent` | 0px |
| #workspace | `label` | Calendar | 714, 427 · 135×9 | 7.4px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `div.v` | Meeting time passed | 859, 427 · 478×13 | 9px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `span.m` | booking/time only | 1347, 427 · 69×9 | 7.7px · 400 | `#766f7e` on `transparent` | 0px |
| #workspace | `label` | Held rule | 714, 459 · 135×9 | 7.4px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `div.v` | Counts as held unless Aster taps Didn’t happen within 48h | 859, 459 · 412×13 | 9px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `span.m` | window closes 10 Oct 2026 · 10:00 | 1281, 459 · 135×9 | 7.7px · 400 | `#766f7e` on `transparent` | 0px |
| #workspace | `label` | Silence | 714, 491 · 135×9 | 7.4px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `div.v` | = held | 859, 491 · 460×13 | 9px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `span.m` | disputes go to founder | 1329, 491 · 87×9 | 7.7px · 400 | `#766f7e` on `transparent` | 0px |
| #workspace | `label` | Billing | 714, 523 · 135×9 | 7.4px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `div.v` | $1,500 setup + $700 per held meeting (price still to be decided) | 859, 523 · 471×13 | 9px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `span.m` | working demo price | 1340, 523 · 76×9 | 7.7px · 400 | `#766f7e` on `transparent` | 0px |
| #workspace | `label` | Held this month | 714, 555 · 135×9 | 7.4px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `div.v` | 1 → $700 | 859, 555 · 457×13 | 9px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `span.m` | price still to be decided | 1326, 555 · 90×9 | 7.7px · 400 | `#766f7e` on `transparent` | 0px |
| #workspace | `label` | Paid Coaching | 714, 587 · 135×9 | 7.4px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `div.v` | +$100 per held meeting after the 3rd held meeting | 859, 587 · 417×13 | 9px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `span.m` | Milla may offer · Vida never offers | 1286, 587 · 130×9 | 7.7px · 400 | `#766f7e` on `transparent` | 0px |
| #workspace | `b` | Didn’t happen | 714, 639 · 80×11 | 10px · 700 | `#17141c` on `transparent` | 0px |
| #workspace | `span` | CLIENT EXCEPTIONS | 1326, 640 · 90×9 | 7.4px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `th` | Meeting | 879, 661 · 97×23 | 7px · 700 | `#a29aa9` on `#fcfbfd` | 0px |
| #workspace | `th` | Reason | 976, 661 · 221×23 | 7px · 700 | `#a29aa9` on `#fcfbfd` | 0px |
| #workspace | `td` | Aster Field Systems | 704, 684 · 175×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | MTG-0261 | 879, 684 · 97×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | — | 976, 684 · 221×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | No exception · counts as held | 1197, 684 · 229×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | MTG-0412 | 879, 712 · 97×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Buyer cancelled before start | 976, 712 · 221×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Not held · not billed | 1197, 712 · 229×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #thread | `div.bubble` | Calendar only tells me the meeting time passed. The meeting counts as held unless Aster taps Didn’t happen within 48 hours. Silence means held; a dispute goes t | 205, 764 · 431×67 | 10.5px · 400 | `#17141c` on `#eef5ff` | 13px |
| #workspace | `b` | Calendar limit | 714, 801 · 110×12 | 8.5px · 700 | `#4d22b6` on `transparent` | 0px |
| #workspace | `span` | Booking/time does not prove attendance. | 833, 801 · 583×12 | 8.5px · 400 | `#5f5667` on `transparent` | 0px |
| #workspace | `b` | Exception window | 714, 830 · 110×12 | 8.5px · 700 | `#4d22b6` on `transparent` | 0px |
| #workspace | `span` | Client has 48 hours to say it did not happen and give a reason. | 833, 830 · 583×12 | 8.5px · 400 | `#5f5667` on `transparent` | 0px |
| #workspace | `b` | Founder disputes | 714, 859 · 110×12 | 8.5px · 700 | `#4d22b6` on `transparent` | 0px |
| #workspace | `span` | Any disputed held status escalates to the founder. | 833, 859 · 583×12 | 8.5px · 400 | `#5f5667` on `transparent` | 0px |
| #workspace | `button.act (click)` | Open Health | 703, 900 · 80×26 | 8.5px · 850 | `#ffffff` on `transparent` | 9px |
| #workspace | `td` | Calendar | 704, 990 · 155×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Booked time | 859, 990 · 282×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Started 48h exception window | 1141, 990 · 285×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Client exception | 704, 1018 · 155×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Didn’t happen reason if supplied | 859, 1018 · 282×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Removed billable held unit | 1141, 1018 · 285×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Milla outcome | 704, 1046 · 155×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | How did it go? answer | 859, 1046 · 282×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Updated CRM / free prep context | 1141, 1046 · 285×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |

### health (117 elements · first seen: step 16: Client Health)

| Region | Element | Exact text | x, y · w×h | Size · weight | Colour on background | Rounding |
|---|---|---|---|---|---|---|
| #screenTitle | `b` | Client Health | 232, 19 · 242×14 | 12px · 700 | `#17141c` on `transparent` | 0px |
| #screenSub | `span` | Aster first · Acorn risk detail without cross-client table | 232, 35 · 242×10 | 9px · 400 | `#766f7e` on `transparent` | 0px |
| #stage | `span.s` | ✓ Convert | 616, 80 · 48×10 | 8.5px · 750 | `#706475` on `transparent` | 0px |
| #stage | `span.s` | Learn | 694, 80 · 27×10 | 8.5px · 900 | `#4d22b6` on `transparent` | 0px |
| #workTitle | `b` | Client Health | 704, 124 · 88×14 | 12px · 700 | `#17141c` on `transparent` | 0px |
| #workState | `div.state` | ASTER HEALTHY | 1338, 124 · 88×21 | 8px · 900 | `#675e6d` on `#f0edf3` | 999px |
| #workSub | `span.sub` | Aster first · Acorn risk detail without cross-client table | 704, 141 · 215×9 | 8px · 400 | `#766f7e` on `transparent` | 0px |
| #workspace | `button.clientTab (click)` | Health | 1317, 177 · 50×25 | 8px · 850 | `#4d22b6` on `#f3edff` | 999px |
| #workspace | `span` | Aster sending | 713, 253 · 156×8 | 7px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `span` | Replies waiting | 896, 253 · 156×8 | 7px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `span` | Held | 1079, 253 · 156×8 | 7px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `span` | Blocker | 1261, 253 · 156×8 | 7px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `b` | Yes | 713, 265 · 156×15 | 13px · 700 | `#17141c` on `transparent` | 0px |
| #workspace | `b` | 0 | 896, 265 · 156×15 | 13px · 700 | `#17141c` on `transparent` | 0px |
| #workspace | `b` | None | 1261, 265 · 156×15 | 13px · 700 | `#17141c` on `transparent` | 0px |
| #workspace | `small` | 6 first emails this week | 713, 283 · 156×10 | 7.5px · 400 | `#766f7e` on `transparent` | 0px |
| #workspace | `small` | Ridgewell handled | 896, 283 · 156×10 | 7.5px · 400 | `#766f7e` on `transparent` | 0px |
| #workspace | `small` | MTG-0261 | 1079, 283 · 156×10 | 7.5px · 400 | `#766f7e` on `transparent` | 0px |
| #workspace | `small` | healthy | 1261, 283 · 156×10 | 7.5px · 400 | `#766f7e` on `transparent` | 0px |
| #workspace | `b` | Aster health factors | 714, 322 · 113×11 | 10px · 700 | `#17141c` on `transparent` | 0px |
| #workspace | `span` | CLIENT ONLY | 1359, 323 · 57×9 | 7.4px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `th` | Factor | 704, 344 · 184×23 | 7px · 700 | `#a29aa9` on `#fcfbfd` | 0px |
| #workspace | `th` | Action | 1333, 344 · 93×23 | 7px · 700 | `#a29aa9` on `#fcfbfd` | 0px |
| #workspace | `td` | Sending | 704, 366 · 184×34 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Yes · checked work available | 888, 366 · 332×34 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | None | 1333, 366 · 93×34 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `span.tag` | Healthy | 1228, 375 · 43×17 | 7px · 900 | `#177552` on `#eaf7f0` | 999px |
| #workspace | `td` | Mailbox health | 704, 401 · 184×34 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Auth passing · below limit | 888, 401 · 332×34 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | None | 1333, 401 · 93×34 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Reply SLA | 704, 435 · 184×34 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | 0 waiting after Ridgewell | 888, 435 · 332×34 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Client activity | 704, 470 · 184×34 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | 1 day since Aster last acted | 888, 470 · 332×34 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Outcome coverage | 704, 504 · 184×34 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Held meetings with an answer: 1 of 1 | 888, 504 · 332×34 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `b` | Acorn Digital · Risk detail | 714, 559 · 144×11 | 10px · 700 | `#17141c` on `transparent` | 0px |
| #workspace | `span` | HIGH RISK · PROPOSED THRESHOLDS | 1249, 560 · 167×9 | 7.4px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `th` | What we see | 840, 581 · 153×23 | 7px · 700 | `#a29aa9` on `#fcfbfd` | 0px |
| #workspace | `th` | Threshold (proposed) | 994, 581 · 241×23 | 7px · 700 | `#a29aa9` on `#fcfbfd` | 0px |
| #workspace | `td` | Sending stopped | 704, 603 · 136×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | 26h · mailbox limit | 840, 603 · 153×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | >24h on active client | 994, 603 · 241×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Fix mailbox today | 1235, 603 · 191×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Checked queue | 704, 632 · 136×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Empty | 840, 632 · 153×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | 0 checked messages | 994, 632 · 241×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Refill checked queue | 1235, 632 · 191×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Replies waiting | 704, 660 · 136×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Any same-day target at risk | 994, 660 · 241×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Answer oldest first | 1235, 660 · 191×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Outcome capture | 704, 688 · 136×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | 1 held · no outcome | 840, 688 · 153×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Any held meeting without answer | 994, 688 · 241×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Ask “How did it go?” once | 1235, 688 · 191×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | 12 days | 840, 716 · 153×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | >10 days | 994, 716 · 241×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Client-safe check-in | 1235, 716 · 191×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `b` | Manual green: not allowed. | 716, 762 · 124×9 | 8px · 700 | `#17141c` on `transparent` | 0px |
| #thread | `div.bubble` | Aster’s client health is its own evidence only. After Ridgewell is handled and held, Aster is sending, has zero replies waiting, one held meeting and no blocker | 205, 764 · 431×67 | 10.5px · 400 | `#17141c` on `#eef5ff` | 13px |
| #workspace | `b` | Acorn intervention | 714, 800 · 106×11 | 10px · 700 | `#17141c` on `transparent` | 0px |
| #workspace | `span` | ONE OWNER · DUE WITHIN 48H | 1277, 801 · 139×9 | 7.4px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `label` | Owner | 714, 841 · 135×9 | 7.4px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `div.v` | Operator | 859, 841 · 498×13 | 9px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `span.m` | single owner | 1367, 841 · 49×9 | 7.7px · 400 | `#766f7e` on `transparent` | 0px |
| #workspace | `label` | Due | 714, 874 · 135×9 | 7.4px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `div.v` | Within 48h | 859, 874 · 497×13 | 9px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `span.m` | high-risk SLA | 1366, 874 · 50×9 | 7.7px · 400 | `#766f7e` on `transparent` | 0px |
| #workspace | `label` | Step 1 | 714, 906 · 135×9 | 7.4px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `div.v` | Fix mailbox limit | 859, 906 · 467×13 | 9px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `span.m` | restore sending gate | 1336, 906 · 80×9 | 7.7px · 400 | `#766f7e` on `transparent` | 0px |
| #workspace | `label` | Step 2 | 714, 938 · 135×9 | 7.4px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `div.v` | Refill checked queue | 859, 938 · 468×13 | 9px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `span.m` | no unchecked sends | 1337, 938 · 79×9 | 7.7px · 400 | `#766f7e` on `transparent` | 0px |
| #workspace | `label` | Step 3 | 714, 970 · 135×9 | 7.4px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `div.v` | Answer 3 replies | 859, 970 · 483×13 | 9px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `span.m` | same-day target | 1352, 970 · 64×9 | 7.7px · 400 | `#766f7e` on `transparent` | 0px |
| #workspace | `label` | Step 4 | 714, 1002 · 135×9 | 7.4px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `div.v` | Recheck in 7 days | 859, 1002 · 482×13 | 9px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `span.m` | recovery window | 1351, 1002 · 65×9 | 7.7px · 400 | `#766f7e` on `transparent` | 0px |
| #workspace | `label` | Client-safe Milla message | 714, 1034 · 135×9 | 7.4px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `div.v` | “We paused new sends while we fix a mailbox limit. Your existing replies are being handled today. Nothing new will go out until the checked queue is healthy aga | 859, 1034 · 499×26 | 9px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `span.m` | nothing sold | 1368, 1034 · 48×9 | 7.7px · 400 | `#766f7e` on `transparent` | 0px |
| #workspace | `b` | Recovery | 714, 1099 · 52×11 | 10px · 700 | `#17141c` on `transparent` | 0px |
| #workspace | `span` | AUTO-CLOSE AFTER STABILITY | 1280, 1100 · 136×9 | 7.4px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `th` | Before | 891, 1121 · 197×23 | 7px · 700 | `#a29aa9` on `#fcfbfd` | 0px |
| #workspace | `th` | Now | 1088, 1121 · 190×23 | 7px · 700 | `#a29aa9` on `#fcfbfd` | 0px |
| #workspace | `td` | Stopped 26h | 891, 1143 · 197×34 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Sending restored | 1088, 1143 · 190×34 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `span.tag` | Recovered | 1286, 1152 · 54×17 | 7px · 900 | `#177552` on `#eaf7f0` | 999px |
| #workspace | `td` | 18 checked ready | 1088, 1178 · 190×34 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `span.tag` | Recovered | 1286, 1186 · 54×17 | 7px · 900 | `#177552` on `#eaf7f0` | 999px |
| #workspace | `td` | Replies | 704, 1212 · 187×34 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | 3 waiting | 891, 1212 · 197×34 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | 0 waiting | 1088, 1212 · 190×34 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | 1 held · no answer | 891, 1247 · 197×34 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Still no answer | 1088, 1247 · 190×34 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `span.tag` | Open | 1286, 1255 · 33×17 | 7px · 900 | `#956414` on `#fff4dc` | 999px |
| #workspace | `td` | 1 day | 1088, 1281 · 190×34 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `div.miniCallout` | Vida: “Not yet – outcome capture still open; it closes by itself after 7 stable days.” | 704, 1324 · 722×58 | 8px · 400 | `#17141c` on `#f8f3ff` | 8px |
| #workspace | `b` | Can I close Acorn now? | 716, 1333 · 104×9 | 8px · 700 | `#17141c` on `transparent` | 0px |
| #workspace | `button.act (click)` | Ask Vida | 1048, 1344 · 63×30 | 8.5px · 850 | `#574f5d` on `#ffffff` | 9px |
| #workspace | `b` | Risk is evidence | 714, 1442 · 110×12 | 8.5px · 700 | `#4d22b6` on `transparent` | 0px |
| #workspace | `span` | No opaque health score. | 833, 1442 · 583×12 | 8.5px · 400 | `#5f5667` on `transparent` | 0px |
| #workspace | `b` | A person cannot mark green | 714, 1471 · 110×25 | 8.5px · 700 | `#4d22b6` on `transparent` | 0px |
| #workspace | `span` | Recovery closes automatically after required factors pass and stay stable. | 833, 1471 · 583×25 | 8.5px · 400 | `#5f5667` on `transparent` | 0px |
| #workspace | `b` | Selling more work | 714, 1513 · 110×12 | 8.5px · 700 | `#4d22b6` on `transparent` | 0px |
| #workspace | `span` | Never a risk factor and never an intervention step. | 833, 1513 · 583×12 | 8.5px · 400 | `#5f5667` on `transparent` | 0px |
| #workspace | `button.act (click)` | Open Learning | 703, 1554 · 90×26 | 8.5px · 850 | `#ffffff` on `transparent` | 9px |
| #workspace | `td` | Operations truth | 704, 1644 · 175×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Sending / replies / mailboxes | 879, 1644 · 268×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Explained risk factor by factor | 1147, 1644 · 279×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Milla activity | 704, 1672 · 175×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Last client action | 879, 1672 · 268×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Added inactivity factor | 1147, 1672 · 279×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Held meeting answers | 879, 1700 · 268×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Prevented false green | 1147, 1700 · 279×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |

### learning (49 elements · first seen: step 17: Learning)

| Region | Element | Exact text | x, y · w×h | Size · weight | Colour on background | Rounding |
|---|---|---|---|---|---|---|
| #screenTitle | `b` | Learning | 232, 19 · 201×14 | 12px · 700 | `#17141c` on `transparent` | 0px |
| #screenSub | `span` | Client-scoped evidence → proposed changes | 232, 35 · 201×10 | 9px · 400 | `#766f7e` on `transparent` | 0px |
| #workTitle | `b` | Learning | 704, 124 · 60×14 | 12px · 700 | `#17141c` on `transparent` | 0px |
| #workState | `div.state` | CONTROLLED | 1350, 124 · 76×21 | 8px · 900 | `#675e6d` on `#f0edf3` | 999px |
| #workSub | `span.sub` | Client-scoped evidence → proposed changes | 704, 141 · 179×9 | 8px · 400 | `#766f7e` on `transparent` | 0px |
| #workspace | `button.clientTab (click)` | Learning | 703, 208 · 60×25 | 8px · 850 | `#4d22b6` on `#f3edff` | 999px |
| #workspace | `span` | Rejections | 713, 253 · 156×8 | 7px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `span` | Reply learning | 896, 253 · 156×8 | 7px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `span` | Held learning | 1079, 253 · 156×8 | 7px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `span` | Cross-client learning | 1261, 253 · 156×8 | 7px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `b` | Blocked | 1261, 265 · 156×15 | 13px · 700 | `#17141c` on `transparent` | 0px |
| #workspace | `small` | weak reason · no date | 713, 283 · 156×10 | 7.5px · 400 | `#766f7e` on `transparent` | 0px |
| #workspace | `small` | specific opener | 896, 283 · 156×10 | 7.5px · 400 | `#766f7e` on `transparent` | 0px |
| #workspace | `small` | Service Director gap | 1079, 283 · 156×10 | 7.5px · 400 | `#766f7e` on `transparent` | 0px |
| #workspace | `small` | tenant scoped | 1261, 283 · 156×10 | 7.5px · 400 | `#766f7e` on `transparent` | 0px |
| #workspace | `b` | Controlled learning | 714, 322 · 109×11 | 10px · 700 | `#17141c` on `transparent` | 0px |
| #workspace | `span` | PROPOSALS, NOT SILENT MUTATION | 1254, 323 · 162×9 | 7.4px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `label` | 2 rejections | 714, 363 · 135×9 | 7.4px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `div.v` | Weak reason · no date | 859, 363 · 418×13 | 9px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `span.m` | proposal: raise the freshness rule | 1287, 363 · 129×9 | 7.7px · 400 | `#766f7e` on `transparent` | 0px |
| #workspace | `label` | 1 reply | 714, 395 · 135×9 | 7.4px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `div.v` | Specific opener got a useful response | 859, 395 · 420×13 | 9px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `span.m` | prefer when evidence supports it | 1289, 395 · 127×9 | 7.7px · 400 | `#766f7e` on `transparent` | 0px |
| #workspace | `label` | 1 held | 714, 427 · 135×9 | 7.4px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `div.v` | Service Director gap surfaced in meeting | 859, 427 · 412×13 | 9px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `span.m` | profile change for Aster to approve | 1281, 427 · 135×9 | 7.7px · 400 | `#766f7e` on `transparent` | 0px |
| #workspace | `label` | Cross-client learning | 714, 459 · 135×9 | 7.4px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `div.v` | Blocked | 859, 459 · 444×13 | 9px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `span.m` | Aster evidence stays Aster | 1313, 459 · 103×9 | 7.7px · 400 | `#766f7e` on `transparent` | 0px |
| #workspace | `b` | Latest quality reasons | 714, 511 · 126×11 | 10px · 700 | `#17141c` on `transparent` | 0px |
| #workspace | `span` | LIVE DEMO MEMORY | 1325, 512 · 91×9 | 7.4px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `li` | weak why-now | 730, 550 · 686×11 | 7.8px · 400 | `#5f5667` on `transparent` | 0px |
| #workspace | `li` | no date | 730, 561 · 686×11 | 7.8px · 400 | `#5f5667` on `transparent` | 0px |
| #workspace | `b` | Human rejection is evidence | 714, 643 · 110×25 | 8.5px · 700 | `#4d22b6` on `transparent` | 0px |
| #workspace | `span` | A rejected message records why it failed quality. | 833, 643 · 583×25 | 8.5px · 400 | `#5f5667` on `transparent` | 0px |
| #workspace | `b` | Proposal, not mutation | 714, 684 · 110×25 | 8.5px · 700 | `#4d22b6` on `transparent` | 0px |
| #workspace | `span` | Vida can propose a tighter freshness rule; Aster/client truth does not change silently. | 833, 684 · 583×25 | 8.5px · 400 | `#5f5667` on `transparent` | 0px |
| #workspace | `b` | Tenant boundary | 714, 726 · 110×12 | 8.5px · 700 | `#4d22b6` on `transparent` | 0px |
| #workspace | `span` | No cross-client optimisation leaks another client’s data. | 833, 726 · 583×12 | 8.5px · 400 | `#5f5667` on `transparent` | 0px |
| #workspace | `button.act (click)` | Open Always-On | 703, 767 · 98×26 | 8.5px · 850 | `#ffffff` on `transparent` | 9px |
| #thread | `div.bubble` | Learning is separate from Audit. It turns quality decisions, replies and held outcomes into proposals. Cross-client learning stays blocked. | 205, 780 · 431×51 | 10.5px · 400 | `#17141c` on `#eef5ff` | 13px |
| #workspace | `td` | Quality decisions | 704, 857 · 162×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Reject reasons | 866, 857 · 225×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Proposed freshness / selection changes | 1091, 857 · 335×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Specific opener response | 866, 885 · 225×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Proposed writing preference | 1091, 885 · 335×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Held outcome | 704, 913 · 162×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Stakeholder gap | 866, 913 · 225×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Proposed Aster profile change | 1091, 913 · 335×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |

### always (95 elements · first seen: step 18: Always-On)

| Region | Element | Exact text | x, y · w×h | Size · weight | Colour on background | Rounding |
|---|---|---|---|---|---|---|
| #screenTitle | `b` | Always-On | 232, 19 · 298×14 | 12px · 700 | `#17141c` on `transparent` | 0px |
| #screenSub | `span` | Continuous context · selective action · remembered client choices | 232, 35 · 298×10 | 9px · 400 | `#766f7e` on `transparent` | 0px |
| #stage | `span.s` | ✓ Learn | 694, 80 · 37×10 | 8.5px · 750 | `#706475` on `transparent` | 0px |
| #stage | `span.s` | Replenish | 761, 80 · 47×10 | 8.5px · 900 | `#4d22b6` on `transparent` | 0px |
| #workTitle | `b` | Always-On | 704, 124 · 71×14 | 12px · 700 | `#17141c` on `transparent` | 0px |
| #workState | `div.state` | FUTURE INTELLIGENCE | 1308, 124 · 118×21 | 8px · 900 | `#675e6d` on `#f0edf3` | 999px |
| #workSub | `span.sub` | Continuous context · selective action · remembered client choices | 704, 141 · 265×9 | 8px · 400 | `#766f7e` on `transparent` | 0px |
| #workspace | `button.clientTab (click)` | Always-On | 769, 208 · 67×25 | 8px · 850 | `#4d22b6` on `#f3edff` | 999px |
| #workspace | `span` | Relationship memory | 713, 253 · 156×8 | 7px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `span` | Signals | 896, 253 · 156×8 | 7px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `span` | Client answer | 1079, 253 · 156×8 | 7px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `span` | Ask again | 1261, 253 · 156×8 | 7px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `b` | Continuous | 713, 265 · 156×15 | 13px · 700 | `#17141c` on `transparent` | 0px |
| #workspace | `b` | Refresh + expire | 896, 265 · 156×15 | 13px · 700 | `#17141c` on `transparent` | 0px |
| #workspace | `b` | Continue · 08 Oct | 1079, 265 · 156×15 | 13px · 700 | `#17141c` on `transparent` | 0px |
| #workspace | `b` | After 05 Nov | 1261, 265 · 156×15 | 13px · 700 | `#17141c` on `transparent` | 0px |
| #workspace | `small` | Aster scoped | 713, 283 · 156×10 | 7.5px · 400 | `#766f7e` on `transparent` | 0px |
| #workspace | `small` | why-now only | 896, 283 · 156×10 | 7.5px · 400 | `#766f7e` on `transparent` | 0px |
| #workspace | `small` | remembered | 1079, 283 · 156×10 | 7.5px · 400 | `#766f7e` on `transparent` | 0px |
| #workspace | `small` | 4-week suppression | 1261, 283 · 156×10 | 7.5px · 400 | `#766f7e` on `transparent` | 0px |
| #workspace | `b` | Continuous operational loop | 714, 322 · 160×11 | 10px · 700 | `#17141c` on `transparent` | 0px |
| #workspace | `span` | READINESS ≠ AUTHORITY | 1302, 323 · 114×9 | 7.4px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `th` | Layer | 704, 344 · 160×23 | 7px · 700 | `#a29aa9` on `#fcfbfd` | 0px |
| #workspace | `th` | Vida behaviour | 864, 344 · 375×23 | 7px · 700 | `#a29aa9` on `#fcfbfd` | 0px |
| #workspace | `th` | Client consequence | 1238, 344 · 188×23 | 7px · 700 | `#a29aa9` on `#fcfbfd` | 0px |
| #workspace | `td` | Relationship map | 704, 366 · 160×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Keep customer / opportunity / suppression state current | 864, 366 · 375×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | No reset to cold | 1238, 366 · 188×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Signal watch | 704, 394 · 160×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Refresh dated changes and expire stale ones | 864, 394 · 375×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Better timing | 1238, 394 · 188×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Research readiness | 704, 423 · 160×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Prepare evidence only when a real reason exists | 864, 423 · 375×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Less noise | 1238, 423 · 188×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Human queue | 704, 451 · 160×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Surface work worth checking | 864, 451 · 375×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Control | 1238, 451 · 188×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Commercial authority | 704, 479 · 160×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Remember client outcome/review answer | 864, 479 · 375×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | No repeat ask for 4 weeks | 1238, 479 · 188×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `b` | Outcome review | 714, 528 · 92×11 | 10px · 700 | `#17141c` on `transparent` | 0px |
| #workspace | `span` | EVIDENCE-BASED · REMEMBER THE ANSWER | 1218, 529 · 198×9 | 7.4px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `label` | Held meetings | 714, 569 · 135×9 | 7.4px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `div.v` | 1 | 859, 569 · 459×13 | 9px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `span.m` | verified under 48h rule | 1328, 569 · 88×9 | 7.7px · 400 | `#766f7e` on `transparent` | 0px |
| #workspace | `label` | Meaningful replies | 714, 601 · 135×9 | 7.4px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `span.m` | specific opener | 1357, 601 · 59×9 | 7.7px · 400 | `#766f7e` on `transparent` | 0px |
| #workspace | `label` | Quality evidence | 714, 633 · 135×9 | 7.4px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `div.v` | 6 person-level checks | 859, 633 · 500×13 | 9px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `span.m` | human gate | 1369, 633 · 47×9 | 7.7px · 400 | `#766f7e` on `transparent` | 0px |
| #workspace | `label` | Aster answer | 714, 665 · 135×9 | 7.4px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `div.v` | Continue | 859, 665 · 499×13 | 9px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `span.m` | 08 Oct 2026 | 1368, 665 · 48×9 | 7.7px · 400 | `#766f7e` on `transparent` | 0px |
| #workspace | `label` | Suppression | 714, 697 · 135×9 | 7.4px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `div.v` | Do not ask again for 4 weeks | 859, 697 · 478×13 | 9px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `span.m` | until 05 Nov 2026 | 1347, 697 · 69×9 | 7.7px · 400 | `#766f7e` on `transparent` | 0px |
| #workspace | `label` | Auto-start | 714, 729 · 135×9 | 7.4px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `span.m` | Vida never starts paid work | 1310, 729 · 106×9 | 7.7px · 400 | `#766f7e` on `transparent` | 0px |
| #thread | `div.bubble` | Always-On means memory and readiness continue; it does not mean continuous blasting. Aster chose Continue on 08 Oct 2026, so I will not ask again for four weeks | 205, 764 · 431×67 | 10.5px · 400 | `#17141c` on `#eef5ff` | 13px |
| #workspace | `b` | Next Market readiness | 714, 781 · 128×11 | 10px · 700 | `#17141c` on `transparent` | 0px |
| #workspace | `span` | PROOF BEFORE EXPANSION | 1293, 782 · 123×9 | 7.4px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `th` | Relationship check | 882, 803 · 202×23 | 7px · 700 | `#a29aa9` on `#fcfbfd` | 0px |
| #workspace | `th` | Proof state | 1252, 803 · 174×23 | 7px · 700 | `#a29aa9` on `#fcfbfd` | 0px |
| #workspace | `td` | Falcon Electrical | 704, 825 · 178×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | No Aster relationship | 882, 825 · 202×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Regional ops hire | 1084, 825 · 168×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Ready for Proof | 1252, 825 · 174×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Redline Services | 704, 854 · 178×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Past contact · inactive | 882, 854 · 202×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Branch expansion | 1084, 854 · 168×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Ready with history | 1252, 854 · 174×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Beacon Electrical | 704, 882 · 178×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Customer | 882, 882 · 202×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Exclude | 1252, 882 · 174×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Argent Compliance | 704, 910 · 178×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Identity conflict | 882, 910 · 202×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Growth event | 1084, 910 · 168×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Hold | 1252, 910 · 174×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `div.miniCallout` | Electrical services can be prepared as a 10-person Proof, but nothing starts without Aster approval. | 704, 947 · 722×28 | 8px · 400 | `#17141c` on `#f8f3ff` | 8px |
| #workspace | `b` | Memory has consequences | 714, 1034 · 110×25 | 8.5px · 700 | `#4d22b6` on `transparent` | 0px |
| #workspace | `span` | Prior answers suppress repeat asks. | 833, 1034 · 583×25 | 8.5px · 400 | `#5f5667` on `transparent` | 0px |
| #workspace | `b` | Readiness only | 714, 1076 · 110×12 | 8.5px · 700 | `#4d22b6` on `transparent` | 0px |
| #workspace | `span` | Vida can prepare evidence without permission to send. | 833, 1076 · 583×12 | 8.5px · 400 | `#5f5667` on `transparent` | 0px |
| #workspace | `b` | No quota milestones | 714, 1105 · 110×12 | 8.5px · 700 | `#4d22b6` on `transparent` | 0px |
| #workspace | `span` | Outcome review is evidence-based, not 25/50/75 bundle logic. | 833, 1105 · 583×12 | 8.5px · 400 | `#5f5667` on `transparent` | 0px |
| #workspace | `button.act (click)` | Open Audit & Evidence | 703, 1147 · 130×26 | 8.5px · 850 | `#ffffff` on `transparent` | 9px |
| #workspace | `td` | Client answer | 704, 1236 · 193×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Continue · 08 Oct 2026 | 897, 1236 · 230×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Suppressed repeat ask for 4 weeks | 1127, 1236 · 299×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Relationship memory | 704, 1264 · 193×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Current state | 897, 1264 · 230×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Kept readiness without blasting | 1127, 1264 · 299×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Proof rules | 704, 1292 · 193×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Adjacent market evidence | 897, 1292 · 230×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Required client approval again | 1127, 1292 · 299×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |

### audit (110 elements · first seen: step 19: Audit & Evidence)

| Region | Element | Exact text | x, y · w×h | Size · weight | Colour on background | Rounding |
|---|---|---|---|---|---|---|
| #screenTitle | `b` | Audit & Evidence | 232, 19 · 253×14 | 12px · 700 | `#17141c` on `transparent` | 0px |
| #screenTitle | `b` | Vida V2 Complete | 232, 19 · 176×14 | 12px · 700 | `#17141c` on `transparent` | 0px |
| #screenSub | `span` | Joined records · same IDs in Milla and Vida · claim policy | 232, 35 · 253×10 | 9px · 400 | `#766f7e` on `transparent` | 0px |
| #screenSub | `span` | Precision + restored future intelligence | 232, 35 · 176×10 | 9px · 400 | `#766f7e` on `transparent` | 0px |
| #workTitle | `b` | Audit & Evidence | 704, 124 · 116×14 | 12px · 700 | `#17141c` on `transparent` | 0px |
| #workTitle | `b` | Vida V2 Complete | 704, 124 · 120×14 | 12px · 700 | `#17141c` on `transparent` | 0px |
| #workState | `div.state` | TRACEABLE | 1358, 124 · 68×21 | 8px · 900 | `#675e6d` on `#f0edf3` | 999px |
| #workState | `div.state` | COMPLETE | 1362, 124 · 64×21 | 8px · 900 | `#675e6d` on `#f0edf3` | 999px |
| #workSub | `span.sub` | Joined records · same IDs in Milla and Vida · claim policy | 704, 141 · 225×9 | 8px · 400 | `#766f7e` on `transparent` | 0px |
| #workSub | `span.sub` | Precision + restored future intelligence | 704, 141 · 156×9 | 8px · 400 | `#766f7e` on `transparent` | 0px |
| #workspace | `button.clientTab (click)` | Audit & Evidence | 842, 208 · 97×25 | 8px · 850 | `#4d22b6` on `#f3edff` | 999px |
| #workspace | `span` | Client | 713, 253 · 156×8 | 7px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `span` | Operator shell | 713, 253 · 156×8 | 7px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `span` | Client intelligence | 896, 253 · 156×8 | 7px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `span` | Meeting | 1079, 253 · 156×8 | 7px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `span` | Commercial model | 1079, 253 · 156×8 | 7px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `span` | Billing | 1261, 253 · 156×8 | 7px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `b` | cli_aster_001 | 713, 265 · 156×15 | 13px · 700 | `#17141c` on `transparent` | 0px |
| #workspace | `b` | 5 items | 713, 265 · 156×15 | 13px · 700 | `#17141c` on `transparent` | 0px |
| #workspace | `b` | per_morgan_027 | 896, 265 · 156×15 | 13px · 700 | `#17141c` on `transparent` | 0px |
| #workspace | `b` | 13 tabs | 896, 265 · 156×15 | 13px · 700 | `#17141c` on `transparent` | 0px |
| #workspace | `b` | mtg_0261 | 1079, 265 · 156×15 | 13px · 700 | `#17141c` on `transparent` | 0px |
| #workspace | `b` | bill_held_2026_10_01 | 1261, 265 · 156×15 | 13px · 700 | `#17141c` on `transparent` | 0px |
| #workspace | `small` | same in Milla + Vida | 713, 283 · 156×10 | 7.5px · 400 | `#766f7e` on `transparent` | 0px |
| #workspace | `small` | today · quality · replies · fleet · client | 713, 283 · 156×10 | 7.5px · 400 | `#766f7e` on `transparent` | 0px |
| #workspace | `small` | Morgan Lee | 896, 283 · 156×10 | 7.5px · 400 | `#766f7e` on `transparent` | 0px |
| #workspace | `small` | all unlocked | 896, 283 · 156×10 | 7.5px · 400 | `#766f7e` on `transparent` | 0px |
| #workspace | `small` | held | 1079, 283 · 156×10 | 7.5px · 400 | `#766f7e` on `transparent` | 0px |
| #workspace | `small` | $700 working line | 1261, 283 · 156×10 | 7.5px · 400 | `#766f7e` on `transparent` | 0px |
| #workspace | `b` | Joined records | 714, 322 · 81×11 | 10px · 700 | `#17141c` on `transparent` | 0px |
| #workspace | `span` | CANONICAL IDS | 1346, 323 · 70×9 | 7.4px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `th` | Message | 993, 344 · 124×23 | 7px · 700 | `#a29aa9` on `#fcfbfd` | 0px |
| #workspace | `th` | CRM opportunity | 1186, 344 · 115×23 | 7px · 700 | `#a29aa9` on `#fcfbfd` | 0px |
| #workspace | `th` | Billing line | 1301, 344 · 125×23 | 7px · 700 | `#a29aa9` on `#fcfbfd` | 0px |
| #workspace | `td` | cli_aster_001 | 704, 366 · 84×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | co_ridgewell_014 | 788, 366 · 104×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | per_morgan_027 | 892, 366 · 102×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | msg_ridgewell_01_v1 | 993, 366 · 124×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | mtg_0261 | 1118, 366 · 69×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | opp_aster_009 | 1186, 366 · 115×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | bill_held_2026_10_01 | 1301, 366 · 125×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `div.miniCallout` | Same IDs are used in Milla and Vida; no screen invents a second record. | 704, 403 · 722×28 | 8px · 400 | `#17141c` on `#f8f3ff` | 8px |
| #workspace | `b` | Nothing thinned | 714, 407 · 110×12 | 8.5px · 700 | `#4d22b6` on `transparent` | 0px |
| #workspace | `span` | Future intelligence is inside Client detail rather than removed. | 833, 407 · 583×12 | 8.5px · 400 | `#5f5667` on `transparent` | 0px |
| #workspace | `b` | Precision form | 714, 436 · 110×12 | 8.5px · 700 | `#4d22b6` on `transparent` | 0px |
| #workspace | `span` | No programmes, quotas or bundles. | 833, 436 · 583×12 | 8.5px · 400 | `#5f5667` on `transparent` | 0px |
| #workspace | `b` | Claim policy | 714, 451 · 68×11 | 10px · 700 | `#17141c` on `transparent` | 0px |
| #workspace | `span` | ALLOWED VS BLOCKED | 1314, 452 · 102×9 | 7.4px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `b` | One truth | 714, 465 · 110×12 | 8.5px · 700 | `#4d22b6` on `transparent` | 0px |
| #workspace | `span` | Six first emails this week, 48h held rule, Slack/WhatsApp Coming soon, same price in both demos. | 833, 465 · 583×12 | 8.5px · 400 | `#5f5667` on `transparent` | 0px |
| #workspace | `label` | Allowed | 714, 492 · 135×9 | 7.4px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `div.v` | “1 held meeting” | 859, 492 · 479×13 | 9px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `span.m` | direct event truth | 1348, 492 · 68×9 | 7.7px · 400 | `#766f7e` on `transparent` | 0px |
| #workspace | `div.v` | “CRM shows 1 opportunity linked” | 859, 524 · 413×13 | 9px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `span.m` | client system-of-record association | 1282, 524 · 134×9 | 7.7px · 400 | `#766f7e` on `transparent` | 0px |
| #workspace | `label` | Blocked | 714, 556 · 135×9 | 7.4px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `div.v` | “M&V caused $X revenue” | 859, 556 · 489×13 | 9px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `span.m` | causal inflation | 1358, 556 · 58×9 | 7.7px · 400 | `#766f7e` on `transparent` | 0px |
| #workspace | `b` | Ridgewell evidence chain | 714, 608 · 143×11 | 10px · 700 | `#17141c` on `transparent` | 0px |
| #workspace | `span` | PROVENANCE | 1356, 609 · 60×9 | 7.4px · 900 | `#a29aa9` on `transparent` | 0px |
| #workspace | `th` | Stage | 704, 630 · 159×23 | 7px · 700 | `#a29aa9` on `#fcfbfd` | 0px |
| #workspace | `th` | Object | 863, 630 · 328×23 | 7px · 700 | `#a29aa9` on `#fcfbfd` | 0px |
| #workspace | `th` | Authority | 1192, 630 · 234×23 | 7px · 700 | `#a29aa9` on `#fcfbfd` | 0px |
| #workspace | `td` | Client truth | 704, 652 · 159×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Aster profile v7 | 863, 652 · 328×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Client-approved | 1192, 652 · 234×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Ridgewell closed-lost · timing | 863, 680 · 328×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | CRM | 1192, 680 · 234×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Signal | 704, 709 · 159×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Coordinator hiring · 05 Oct | 863, 709 · 328×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Research | 704, 737 · 159×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Morgan role + context | 863, 737 · 328×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Apollo + public | 1192, 737 · 234×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #thread | `div.bubble` | The full Precision operating model is preserved: five operator screens, deep client intelligence tabs, risk/recovery, connected context, person-level quality, e | 205, 748 · 431×83 | 10.5px · 400 | `#17141c` on `#eef5ff` | 13px |
| #workspace | `td` | Quality | 704, 765 · 159×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | All 3 emails approved | 863, 765 · 328×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #thread | `div.bubble` | Audit joins the client, company, person, message, meeting, CRM opportunity and billing line. Milla and Vida use the same IDs. | 205, 780 · 431×51 | 10.5px · 400 | `#17141c` on `#eef5ff` | 13px |
| #workspace | `td` | Send | 704, 793 · 159×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | msg_ridgewell_01_v1 | 863, 793 · 328×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Aster mailbox | 1192, 793 · 234×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Reply | 704, 821 · 159×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Integration question | 863, 821 · 328×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Provider thread | 1192, 821 · 234×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Meeting | 704, 849 · 159×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | mtg_0261 · held | 863, 849 · 328×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | 48h rule | 1192, 849 · 234×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Outcome | 704, 878 · 159×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Service Director next | 863, 878 · 328×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Milla / client | 1192, 878 · 234×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | opp_aster_009 · Discovery | 863, 906 · 328×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Aster CRM | 1192, 906 · 234×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Billing | 704, 934 · 159×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | bill_held_2026_10_01 · $700 | 863, 934 · 328×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | working demo price | 1192, 934 · 234×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `b` | One evidence base | 714, 1023 · 110×12 | 8.5px · 700 | `#4d22b6` on `transparent` | 0px |
| #workspace | `span` | Milla, Vida, CRM and billing resolve the same objects. | 833, 1023 · 583×12 | 8.5px · 400 | `#5f5667` on `transparent` | 0px |
| #workspace | `b` | Correctable | 714, 1052 · 110×12 | 8.5px · 700 | `#4d22b6` on `transparent` | 0px |
| #workspace | `span` | Sources and client corrections remain attributable. | 833, 1052 · 583×12 | 8.5px · 400 | `#5f5667` on `transparent` | 0px |
| #workspace | `b` | No causal inflation | 714, 1081 · 110×12 | 8.5px · 700 | `#4d22b6` on `transparent` | 0px |
| #workspace | `span` | Audit supports association, not invented revenue causation. | 833, 1081 · 583×12 | 8.5px · 400 | `#5f5667` on `transparent` | 0px |
| #workspace | `button.act (click)` | Finish Vida V2 | 703, 1123 · 88×26 | 8.5px · 850 | `#ffffff` on `transparent` | 9px |
| #workspace | `td` | Canonical IDs | 704, 1212 · 191×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Client → billing line | 895, 1212 · 261×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Joined Milla and Vida records | 1156, 1212 · 270×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Claim policy | 704, 1240 · 191×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Allowed vs blocked wording | 895, 1240 · 261×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Prevented causal inflation | 1156, 1240 · 270×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Source provenance | 704, 1269 · 191×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Timestamps + authorities | 895, 1269 · 261×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |
| #workspace | `td` | Made audit explainable | 1156, 1269 · 270×28 | 8.3px · 400 | `#17141c` on `transparent` | 0px |

### phone · home (5 elements · first seen: phone: today)

| Region | Element | Exact text | x, y · w×h | Size · weight | Colour on background | Rounding |
|---|---|---|---|---|---|---|
| #mobileNav | `button.on (click)` | Today board | 0, 796 · 78×48 | 7px · 850 | `#4d22b6` on `#f3edff` | 0px |
| #mobileNav | `button (click)` | Quality queue | 78, 796 · 78×48 | 7px · 850 | `#6a6270` on `transparent` | 0px |
| #mobileNav | `button (click)` | Reply queue | 156, 796 · 78×48 | 7px · 850 | `#6a6270` on `transparent` | 0px |
| #mobileNav | `button (click)` | Mailbox fleet | 234, 796 · 78×48 | 7px · 850 | `#6a6270` on `transparent` | 0px |
| #mobileNav | `button (click)` | Client detail | 312, 796 · 78×48 | 7px · 850 | `#6a6270` on `transparent` | 0px |

