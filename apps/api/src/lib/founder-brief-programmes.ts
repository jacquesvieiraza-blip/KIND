// ═══════════════════════════════════════════════════════════════════════════════════════
// THE FOUNDER'S MORNING BRIEF, IN THE PROGRAMME MODEL.
//
// ⚑ 2 Oct (#2547 · 7e, paying-client check). The brief counted revenue from `credit_transactions`
// purchases — the retired wallet — so on the day a client paid for a programme it said R0, and
// it listed programme clients under "low credits" as "0 credits". Now:
//   · revenue = programme payments recorded in the last 24h, in USD, from the payment fields;
//   · no programme client is listed as low on credits;
//   · one line per live programme: sent and replies (24h), meetings, and what is blocking it.
//
// ⚠️ PURE — the route gathers the rows; these rules are RUN by the test.
// ═══════════════════════════════════════════════════════════════════════════════════════

export type PaidProgrammeRow = {
  client_id: string
  first_paid_at: string | null; first_payment_cents: number | null; wallet_applied_cents?: number | null
  second_paid_at: string | null; second_payment_cents: number | null
}

/** Cash received in the window: P1 net of the wallet credit it used, plus P2. Excluded clients (demo, House) count nothing. */
export function programmeRevenueCents(rows: PaidProgrammeRow[], sinceIso: string, excluded: Set<string>): { cents: number; payments: number } {
  let cents = 0
  let payments = 0
  for (const r of rows) {
    if (excluded.has(r.client_id)) continue
    if (r.first_paid_at && r.first_paid_at >= sinceIso) {
      cents += Math.max(0, (r.first_payment_cents ?? 0) - Math.max(0, r.wallet_applied_cents ?? 0)); payments++
    }
    if (r.second_paid_at && r.second_paid_at >= sinceIso) {
      cents += Math.max(0, r.second_payment_cents ?? 0); payments++
    }
  }
  return { cents, payments }
}

export function formatUsd(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export type LiveProgrammeFacts = {
  companyName: string | null
  paused: boolean
  run: boolean
  sent24h: number
  replies24h: number
  meetings: number
  targetMeetings: number | null
  /**
   * ⚑ 3 Oct (review S13) — what the SEND GATE says, in a few words: `null` = it allows sends.
   * Before, only a pause or a missing Run could block, so a programme whose every send was
   * refused (the founder's approval, a changed preparation, an unsafe mailbox) read
   * "nothing blocking" — against R185 ⑥, alerts and logs tell the truth.
   */
  refusal?: string | null
}

/** The gate's refusal, in the founder's words. Outside the sending hours is not a block. */
export function gateRefusalWords(v: { allowed: boolean; reason?: string } | null): string | null {
  if (v === null) return 'could not be checked'
  if (v.allowed) return null
  switch (v.reason) {
    case 'outside_send_window': case 'programme_paused': case 'programme_not_run': return null // said elsewhere
    case 'founder_not_approved': return 'waiting for your approval of the emails in Vida'
    case 'preparation_changed': return 'the approved work changed — it needs approving again'
    case 'sender_unsafe': return 'the sending mailbox is not safe to send from'
    case 'review_required': return 'held for review'
    default: return (v.reason ?? 'refused').replace(/_/g, ' ')
  }
}

/** What stops it, in a few words — or null when nothing does. */
export function liveProgrammeBlocker(f: Pick<LiveProgrammeFacts, 'paused' | 'run' | 'refusal'>): string | null {
  if (f.paused) return 'Paused'
  if (!f.run) return 'Live but not started — press Run in Vida'
  if (f.refusal) return f.refusal
  return null
}

export function liveProgrammeLine(f: LiveProgrammeFacts): string {
  const meetings = f.targetMeetings ? `${f.meetings} of ${f.targetMeetings} meetings` : `${f.meetings} meetings`
  const blocker = liveProgrammeBlocker(f)
  return `${f.companyName?.trim() || 'A client'}: ${f.sent24h} sent · ${f.replies24h} replies (24h) · ${meetings} · ${blocker ? `blocked: ${blocker}` : 'nothing blocking'}`
}
