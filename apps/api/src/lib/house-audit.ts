// HOUSE-ACCOUNT AUDIT — what is actually in Client Zero, and which of it is debris.
//
// #611, 4 Aug. Client Zero was ADOPTED from the founder's existing account (house-client.ts
// deliberately adopts rather than creating a second row — "a second row for one person is how
// #584 happened"). Adoption brought the account's HISTORY with it: a $3,999,038 wallet, 159
// approved leads, 263 enrollments, a "14 Sending" chip and a "Suspended — no approvals in 39
// days" badge. On ~25 Aug the founder's REAL prospecting flows into this account.
//
// ⚠️ WHY THIS FILE EXISTS RATHER THAN A QUERY. There is no SQL access — no Supabase dashboard,
// no Postgres password, `DATABASE_URL` is a placeholder. Nobody can open a console and look. So
// the audit is built as an INSTRUMENT the founder runs from Vida: the route reads, this module
// judges, and the founder rules on the table. Read-only by construction — this module cannot
// write, and its route is a GET.
//
// The judgement below is deliberately conservative: anything that could be real is reported as
// REVIEW, never as DEBRIS. A cleanup that deletes something real is worse than one that leaves
// junk behind, because the junk is visible and the deletion is not.

/** Everything the route reads, in one shape so the judging is pure and testable. */
export type HouseFacts = {
  clientId: string
  companyName: string | null
  isDemo: boolean | null
  walletBalanceUsd: number
  /** credit_transactions rolled up by type. */
  ledger: Array<{ type: string; count: number; totalUsd: number }>
  leadsTotal: number
  leadsApproved: number        // revealed_at set — these are what the pack counted
  leadsWithClient: number      // surfaced, undecided
  leadsPassed: number
  oldestLeadAt: string | null
  newestLeadAt: string | null
  enrollments: number          // the "Qualified" chip
  sentEmails: number           // figsy_sent_emails — the 0-sent-ever proof
  campaigns: Array<{ status: string; count: number }>
  inboxes: Array<{ email: string; kind: string; status: string; hasSmtp: boolean }>
  lastApprovalAt: string | null
  /** Environment locks, read at request time. */
  autoOutreachEnabled: boolean
  secretKeySet: boolean
}

export type Verdict = 'REAL' | 'DEBRIS' | 'REVIEW'
export type Action = 'keep' | 'zero' | 'delete' | 'founder-rules'

export type AuditRow = {
  what: string
  value: string
  verdict: Verdict
  action: Action
  why: string
}

const money = (n: number) => '$' + Math.round(n).toLocaleString()

/**
 * Would the cold-check cron act on this account tomorrow morning?
 *
 * ⚠️ THE FINDING THIS FUNCTION EXISTS FOR. `cold-check` (internal.ts, cron 08:40 UTC daily)
 * skips `is_demo === true` and nothing else. `house-client.ts` DELIBERATELY un-demos Client
 * Zero — its own comment: *"`is_demo` true would exclude it from every revenue figure AND make
 * the CSV import refuse it (#599)."* Both decisions are individually right, and together they
 * leave the house account inside a rule whose stated purpose is *"a client's sender costs
 * ~$40/month… a bill we pay to keep an inbox warm for nobody."* We ARE the nobody. There is no
 * client to lose and no bill we did not choose.
 *
 * Live impact TODAY is nil: the cron pauses campaigns `WHERE status = 'active'`, and if it
 * pauses none it returns before alerting. The house account has no active campaign.
 *
 * Live impact FROM ~25 AUG is real and dated: if a campaign goes active while the last approval
 * is older than 30 days, the next 08:40 run pauses it and fires a "churn risk" founder alert
 * about ourselves. In the normal flow approvals precede the campaign (and an approval resets
 * the clock), so this is conditional — but it is exactly the kind of thing that eats a morning
 * on send-day, and it is invisible until it fires.
 */
export function coldCronWouldAct(f: Pick<HouseFacts, 'isDemo' | 'lastApprovalAt' | 'campaigns'>, now: Date): {
  exempt: boolean
  daysIdle: number | null
  hasActiveCampaign: boolean
  wouldPauseToday: boolean
  wouldPauseOnceCampaignActive: boolean
} {
  const exempt = f.isDemo === true
  const active = f.campaigns.find(c => c.status === 'active')
  const hasActiveCampaign = (active?.count ?? 0) > 0

  let daysIdle: number | null = null
  if (f.lastApprovalAt) {
    const then = new Date(f.lastApprovalAt)
    if (!Number.isNaN(then.getTime())) {
      daysIdle = Math.max(0, Math.floor((now.getTime() - then.getTime()) / 86_400_000))
    }
  }
  const cold = daysIdle !== null && daysIdle >= 30
  return {
    exempt,
    daysIdle,
    hasActiveCampaign,
    wouldPauseToday: !exempt && cold && hasActiveCampaign,
    wouldPauseOnceCampaignActive: !exempt && cold,
  }
}

/**
 * The audit table. One row per thing that exists, with a verdict and a proposed action.
 *
 * Nothing here writes. The founder rules line by line; Phase B (if he wants one) is a separate
 * PR built against his rulings.
 */
export function auditRows(f: HouseFacts, now: Date): AuditRow[] {
  const rows: AuditRow[] = []
  const cron = coldCronWouldAct(f, now)

  // ── The wallet ────────────────────────────────────────────────────────────────────────────
  // A balance this size cannot have been bought: at the $299 pack it is ~13,000 purchases. It
  // is test grants. But it is NOT harmless — `approve-lead` spends the wallet once the pack is
  // used, so a real approval on this account would silently draw from fake money and the
  // revenue figures would count it.
  rows.push({
    what: 'Wallet balance',
    value: money(f.walletBalanceUsd),
    verdict: f.walletBalanceUsd > 10_000 ? 'DEBRIS' : 'REVIEW',
    action: f.walletBalanceUsd > 10_000 ? 'zero' : 'founder-rules',
    why: f.walletBalanceUsd > 10_000
      ? `Not purchasable — ${money(f.walletBalanceUsd)} is ~${Math.round(f.walletBalanceUsd / 299)} packs. Test grants. ⚠️ NOT cosmetic: once the pack is used, approvals spend the wallet, so real approvals here would draw on fake money and land in revenue figures.`
      : 'Plausible as a real balance — the founder should say.',
  })

  for (const l of f.ledger) {
    rows.push({
      what: `Ledger · ${l.type}`,
      value: `${l.count} row(s) · ${money(l.totalUsd)}`,
      verdict: l.type === 'manual_grant' ? 'REAL' : 'REVIEW',
      action: l.type === 'manual_grant' ? 'keep' : 'founder-rules',
      why: l.type === 'manual_grant'
        ? 'Manual grants are how the house account is comped — this is the mechanism working as designed (PAID_TX_TYPES). Keep at least the comping grant or sourcing is refused.'
        : 'Deleting ledger rows rewrites the audit trail. Zeroing the balance is reversible thinking; deleting history is not.',
    })
  }

  // ── The leads ─────────────────────────────────────────────────────────────────────────────
  rows.push({
    what: 'Leads — total',
    value: String(f.leadsTotal),
    verdict: 'REVIEW',
    action: 'founder-rules',
    why: `Sourced ${f.oldestLeadAt ? `between ${f.oldestLeadAt.slice(0, 10)} and ${f.newestLeadAt?.slice(0, 10)}` : 'at unknown dates'}. These were bought with real credits at the time — deleting them destroys data we paid for. Keeping them means the first real run starts on a desk that is not empty.`,
  })
  rows.push({
    what: 'Leads — approved (revealed)',
    value: String(f.leadsApproved),
    verdict: 'REVIEW',
    action: 'founder-rules',
    why: '⚠️ These drive TWO things: the pack counter (the first 100 approvals are "included"), and the cold-client clock (the newest one is the last-approval date). Whatever is decided here changes both.',
  })
  rows.push({
    what: 'Leads — awaiting decision',
    value: String(f.leadsWithClient),
    verdict: f.leadsWithClient > 0 ? 'REVIEW' : 'REAL',
    action: f.leadsWithClient > 0 ? 'founder-rules' : 'keep',
    why: f.leadsWithClient > 0
      ? 'These sit on the desk as if waiting for a decision today. On 25 Aug they would be mixed in with real prospects and indistinguishable at a glance.'
      : 'Nothing pending — the desk is clear.',
  })
  rows.push({
    what: 'Enrollments (the "Qualified" chip)',
    value: String(f.enrollments),
    verdict: 'DEBRIS',
    action: 'founder-rules',
    why: 'Rows in `figsy_enrollments` from old sequence runs. They inflate the Qualified counter on the operator board and mean nothing today.',
  })

  // ── The locks — evidence, not assumption ──────────────────────────────────────────────────
  rows.push({
    what: 'Emails actually sent',
    value: String(f.sentEmails),
    verdict: f.sentEmails === 0 ? 'REAL' : 'REVIEW',
    action: 'keep',
    why: f.sentEmails === 0
      ? '✅ ZERO rows in `figsy_sent_emails` for this client. This is the evidence that nothing has ever been emailed from this account — not an assumption.'
      : '⚠️ NON-ZERO. Something has sent from this account. Read the rows before anything else happens.',
  })
  rows.push({
    what: 'Send switch (AUTO_OUTREACH_ENABLED)',
    value: f.autoOutreachEnabled ? 'ON ⚠️' : 'off',
    verdict: f.autoOutreachEnabled ? 'REVIEW' : 'REAL',
    action: 'keep',
    why: f.autoOutreachEnabled
      ? '⚠️ The master send switch is ON. It should be off until the 25 Aug ladder.'
      : '✅ Off, as it must be until the send ladder runs.',
  })
  for (const i of f.inboxes) {
    rows.push({
      what: `Mailbox · ${i.email}`,
      value: `${i.kind} · ${i.status}${i.hasSmtp ? ' · credentials set' : ' · NO credentials'}`,
      verdict: 'REAL',
      action: 'keep',
      why: i.status === 'warming'
        ? '✅ Warming — `pickSendingInbox` refuses to send from a warming box ("sending on a warming mailbox is what un-warms it"). This is a hard refusal in the send path, not a label.'
        : `Status is "${i.status}" — anything other than warming means this box is eligible to send once the switch is on.`,
    })
  }

  // ── The cold-client collision ─────────────────────────────────────────────────────────────
  rows.push({
    what: 'Cold-client suspension',
    value: cron.daysIdle === null ? 'no approvals on record' : `${cron.daysIdle} days idle`,
    verdict: 'REVIEW',
    action: 'founder-rules',
    why: cron.exempt
      ? 'Exempt — this account is flagged is_demo, which the cron skips.'
      : cron.wouldPauseToday
        ? '🚨 THE CRON WOULD PAUSE A CAMPAIGN TONIGHT. `cold-check` runs 08:40 UTC daily, skips only `is_demo === true`, and `house-client.ts` deliberately un-demos Client Zero so revenue figures and CSV import work. Both decisions right; together they put us inside a rule meant for clients whose senders we pay for.'
        : cron.wouldPauseOnceCampaignActive
          ? '⚠️ DATED LANDMINE. Nothing happens today (no active campaign, and the cron returns silently when it pauses none). But the moment a campaign goes active while the last approval is >30 days old, the next 08:40 run pauses it and alerts the founder about "churn risk" on his own account. An approval resets the clock, so the normal flow (approve, then run) avoids it — this is a trap for the abnormal order, on send-day.'
          : '✅ Inside the window — the cron would not act.',
  })

  return rows
}

/** One-line summary for the top of the panel. */
export function auditHeadline(rows: AuditRow[]): string {
  const debris = rows.filter(r => r.verdict === 'DEBRIS').length
  const review = rows.filter(r => r.verdict === 'REVIEW').length
  if (debris === 0 && review === 0) return 'Nothing found that needs a ruling.'
  return `${debris} clearly debris · ${review} need your ruling · nothing here has been changed.`
}
