# Your tech costs, and what one same-month client would cost

*Read-only check, 7 Oct. Repo `origin/main` ef83a99. All costs below are your own figures from Money Control Room v3. I checked no invoices: Gmail is not connected and needs authorising in your claude.ai connector settings first. Your file still uses the old $450 price and 30 sends per mailbox. This answer uses the live rules instead.*

## 1. What you pay today

| Service | What it's for | USD/mo | GBP/mo (÷1.34) | Note |
|---|---|---|---|---|
| Railway | Hosts the API, portal, admin and preview site | 10.59 | 7.90 | The code needs it |
| Supabase | Database and logins | 35.00 | 26.12 | The code needs it |
| Claude subscription | Your tool for building K.I.N.D | 119.00 | 88.81 | The product uses a separate, pay-per-use API |
| ChatGPT | — | 20.00 | 14.93 | No product code uses it |
| Google Workspace (4 × $7) | House sending mailboxes | 28.00 | 20.90 | The real send path |
| Apollo (2,500 credits) | Finding people | 65.00 | 48.51 | Our only lead source |
| Instantly Growth | Warm-up only | 47.00 | 35.07 | Does not send (D1) |
| Smartlead Base | — | 39.00 | 29.10 | See "Check these" |
| Zoho | hello@get-kind.com | 3.00 | 2.24 | |
| Domains (4) | | 5.00 | 3.73 | |
| Failover (Render + Cloudflare) | Standby if Railway fails | 12.00 | 8.96 | |
| **Total** | | **383.59** | **≈286** | |
| ICO fee (£47 a year) | Legal requirement | ≈5.25 | 3.92 | |
| **Total with ICO** | | **≈388.84** | **≈290** | |

**Does this match your "300 plus pounds"?** Almost. Your list comes to about £290. Your bank probably shows more, for three reasons:
- If VAT is being added at 20%, £286 becomes about £343.
- Dollar bills are converted at your bank's rate plus any card fee, not at 1.34.
- The pay-per-use AI the product runs on is not on your list.

Your real bank figures: not found.

### Check these (not "cancel", just check)

| Item | What the repo shows | Possible effect |
|---|---|---|
| ChatGPT $20 | There is no OpenAI anywhere in the code. R154 (24 Sep): "nothing goes to gpt anymore". | −$20, unless you use it personally |
| Smartlead $39 | No programme client can reach it: `approve-lead.ts:148-170` refuses them, and every client is on the programme (R124). Programme email goes out through our own Google mailboxes. Its key returned 401 when last checked. It also overlaps Instantly. **But D2/R25 ("Smartlead sends for clients") were never retired, so this needs your ruling.** | −$39 |
| Render failover $12 | `render.yaml` sets up three $7 standby servers, not one. If all three are running, the cost is about $26 including the $5 Cloudflare balancer. Teardown is parked (O14): the DNS must be moved first. Live state: unverified. | +$14, or −$12 |
| Anthropic API (not on your list) | 26 files call it: Sonnet 5 and Haiku 4.5 write, score and classify. It is separate from the $119 subscription unless that also covers API spend. The repo estimates $10 a month; the real figure is not found. It grows with every lead. | +$10 or more |
| Apollo credits | You used 1,190 of 2,500 this cycle. **The other 1,310 expire today** (they don't roll over). 1,190 credits bought 188 emails sent, which is **at least 6 credits per person emailed**. | Paying for credits you don't use |
| Your £0 company costs | The repo's cost model (`cost-floor.ts`) has: accountant $100, Xero $70, insurance $25 and Companies House $6 a month. An accountant is needed at your first year-end. A late Companies House filing costs £150–£1,500. | Up to +$201 a month |
| Resend (not on your list) | Free today. Outreach won't send without it, and it carries every reply. The free tier tops out at about 3,000 a month and about 100 a day. | A paid tier at volume; price not found |
| Stripe (not on your list) | About 5% of every payment. | $4.95 on $99, $14.95 on $299 |
| Hunter, PDL or Clearbit | The code refuses all three, even with a key. | Any charge on your bank is waste |

The repo's own cost model is out of date against your list: it has Apollo $0, Smartlead $0, Instantly $37 and Railway $15.59. I'm reporting this, not fixing it.

## 2. Same-month meetings for ONE client: what it costs

**What the sums assume:**
- **Emails and days:** 5 emails per person, sent over 22 weekdays.
- **Per mailbox:** 50 a day (your R185 ③). That is the top of the safe 30–50 market range. At Instantly's 30, you'd need about 60% more mailboxes.
- **Per domain:** 3 mailboxes, the market norm of 2–3.
- **Mailbox price:** $7. That is the 1-year-commitment price; month-to-month is $8.40.
- **Domain price:** about $11.17 a year from 1 Nov.
- **Warm-up:** your current Instantly Growth plan warms unlimited mailboxes, so $0 extra. R13 says its 5,000-a-month cap most likely applies only to Instantly's own sending, but that is unconfirmed. If the cap does apply, add $50 for Hypergrowth.
- **Apollo:** the code only spends 80% of your credits (`apollo-budget.ts:35`). So credits needed = people ÷ 0.8, at 1 credit per person. The cost shown is the add-on on top of your $65.

| | 10 meetings @ 1 in 250 | 10 @ 1 in 100 | 30 @ 1 in 250 | 30 @ 1 in 100 |
|---|---|---|---|---|
| People | 2,500 | 1,000 | 7,500 | 3,000 |
| Emails (×5) | 12,500 | 5,000 | 37,500 | 15,000 |
| Emails a day (÷22) | ~570 | ~230 | ~1,700 | ~680 |
| Mailboxes (÷50) | 12 | 5 | 34 | 14 |
| Domains (÷3) | 4 | 2 | 12 | 5 |
| Mailboxes $/mo | 84 | 35 | 238 | 98 |
| Domains $/mo | 4 | 2 | 11 | 5 |
| Extra Apollo $/mo | 25 (1k add-on) | 0* | 180 (10k add-on) | 50 (2.5k add-on) |
| **Extra cost a month** | **$113** | **$37** | **$429** | **$153** |
| Cash before the first send (1 month of mailboxes + 1 year of domains) | ~$129 | ~$57 | ~$372 | ~$154 |
| Revenue at $99 / $199 / $299 | 990 / 1,990 / 2,990 | same | 2,970 / 5,970 / 8,970 | same |
| Stripe 5% | 50 / 100 / 150 | same | 149 / 299 / 449 | same |
| **Margin per client** | **828 / 1,778 / 2,728** | **904 / 1,854 / 2,804** | **2,393 / 5,243 / 8,093** | **2,669 / 5,519 / 8,369** |

\*1,000 people fit your current plan only if nothing else uses it. The 80% limit is shared across House and every client.

**What the table leaves out:**
- **Apollo burn.** At this cycle's 6+ credits per person, Apollo becomes about $385 a month for 10 meetings and $930–1,665 for 30. Every price band still makes money: the $99 band at 30 meetings drops to about $970 a month.
- **The year commitment.** At $7 each, every mailbox is a one-year commitment. 12 mailboxes = $1,008 a year; 34 = $2,856 a year.
- **Timing.** Your sequence spans 18 days. Anyone first emailed after about day 10 gets most of their emails next month, so month one falls short. Hitting the target inside the month means sending most first emails in the first fortnight. Mailboxes can't be added after approval (R189 ②), so you'd have to size for that peak, which can be up to about double the table.
- **Not found:** AI writing cost per person, and Resend's paid price.
- **Spam limit.** At ~570 a day, just 2 spam complaints in one day crosses Google's 0.3% limit.

## 3. Can you afford it

**a) Fixed cost:** about $384 a month (≈£290 with the ICO fee). At "£300 plus" for 7 months, that's £2,100+ spent so far.
- If the checks above confirm, ChatGPT and Smartlead save $59, bringing it to about £242.
- The £0 company costs could add up to $201 a month.

**b) Per-client cost:** you only pay this once a client has paid upfront (R166). It is the table above: $37–$429 a month plus 5%.

**c) Cash you front:** mailboxes cost money for 2–3 weeks before they can send.
- If you buy them only after a client pays, that client's first emails go out 2–3 weeks late, and "same month" fails in month one.
- Same-month from day one means keeping a warmed pool ready before anyone pays: about $88 a month for 12 mailboxes, or about $249 a month for 34.

**Break-even:** after Stripe and about $11 of tool cost per meeting, each meeting brings in about $83 / $178 / $273 at the three prices.
- That covers your fixed cost with **5 / 3 / 2 paid meetings a month**.
- One client at 10 meetings a month covers the whole stack at any price.
- Under today's rules (2 mailboxes, 100 a day), one client gets about 1.8 meetings a month at 1 in 250. You'd then need 3 Founders, 2 Growth or 1 Enterprise client.

**What is unproven: the hit rate, and every number above depends on it.**
- **House so far:** 188 sent, 1 reply (an opt-out), 3 opt-outs, 0 meetings, and sending has stalled. At 1 in 250, 188 emails predict less than one meeting, so 0 neither proves nor disproves anything.
- **1 in 250 (0.4%):** the bottom of an agency's "average" band (LeadHaste: 0.4–0.8%). That makes it a fair planning number, not a cautious one. Large, high-volume campaigns do worse: Hunter measured 2.1–2.4% replies for big lists against a 4.5% average.
- **1 in 100:** the agency's "good" band. Don't plan on it from a cold start.
- **No neutral source:** there is no independent meeting-rate benchmark, only the agency figures.
- **If the real rate is half:** you need twice the people, emails, mailboxes and Apollo credits.

## 4. Can we build it

**Already there (code verified):**
- One client's emails already spread across any number of its mailboxes. Each new person goes to the least-used mailbox, and follow-ups always come from the same mailbox.
- Each mailbox's daily limit is checked before every send.
- Vida's Add Mailbox has no count limit.
- Sending speed is not the bottleneck: about 142 emails per 2-hour run at 1,700 a day, roughly 5–10 minutes. That is an estimate; runtime unverified.

**What must change:**

| What | Size |
|---|---|
| **Your rules:** R189 ② (2 mailboxes) becomes mailboxes sized to the target. R185 ③ (100 per client) becomes a limit worked out from the client's own mailboxes. The R189 ③ brake of 1,000 a day only matters at 30 meetings. Hand-approving every ~250 batch (R185 ⑤ / R186 ③). Optionally a shorter sequence (R195). | Your decision |
| Railway settings: per-client cap, the all-client brake, the cold cap and warm-up ramp switched off, and 50 a day on every mailbox | S |
| Per-mailbox default from 30 to 50. The code defaults are 30 / 50 / 200 against your rules' 50 / 100 / 1,000; live values unverified | S |
| Each client's limit worked out from its own mailboxes | S–M |
| Claim N mailboxes at payment, not 2 | M |
| A proper mailbox table and a Vida screen to bulk-add, test and track warm-up. Today mailboxes live in one Railway setting with plain-text passwords, which doesn't scale | M–L |
| Sourcing faster than ~250 people a day: fine for 10 meetings, not for 30 | S–M plus a rule change |

**Biggest risks:**
1. **Mailbox supply is all manual:** 20–40 minutes of hands-on work per mailbox, plus about 3 weeks of warm-up. Instantly's own ready-made or pre-warmed mailboxes won't work: they only run inside Instantly, and our sender needs direct (SMTP) access.
2. **Apollo:** the 80% limit is shared across all clients, and we are burning at least 6 credits per person.
3. **Two possible bugs at volume (unconfirmed):** at 50 a day, the bounce check may fail and stop a mailbox, and two reads undercount above 1,000 rows.
4. **House is stalled.** R185 records `FIGSY_DAILY_SEND_LIMIT=20` on 1 Oct, and that you paused House on 2 Oct until your approved emails were on. Whether that is still the cause: not checked.

## 5. Straight answer

You can afford the tools. Today's stack is about £286 a month. One 10-meeting client costs about $113 a month extra against $990–$2,990 of revenue, and it still makes money at every price even if Apollo keeps burning credits six times as fast. It can be built: the engine already shares one client's sending across many mailboxes. 10 meetings a month needs your rule changes, a few settings, a proper mailbox screen and 3 weeks of warm-up. 30 a month also needs faster sourcing and a higher brake. What you can't afford yet is buying capacity for a hit rate you have never seen: 188 emails, 0 meetings, and sending has stopped. The one thing that decides it is whether your emails turn into meetings at anything like 1 in 250. So first get House sending again and run about 1,000 people (5,000 emails, about 5 weeks on your 4 mailboxes at 50 a day, if all four are live), where 1 in 250 predicts about 4 meetings. Buy mailboxes for scale only after that.