import { Resend } from 'resend'
import { htmlToText, COLD_FROM } from './deliverability'
import { interpretSend, type CheckedSend } from './resend-checked'
// A TYPE-ONLY import: erased at compile time, so it cannot create a runtime cycle with the
// dynamic import inside `sendWelcomeEmail`.
import type { WelcomeEmailState } from './welcome-email-state'
import { isDemoClient } from './demo'
import { db } from '@kind/db'
import { normalizeRevealEmail } from './billing-rules'
import { isSuppressed } from './suppression'
// ⚑ 10 Sep (I) — the ONE definition of the kill-switch, imported so the consent seam asks it
// directly instead of trusting six callers to remember. See `sendConsentEmail`.
import { killSwitchBlocks, KILL_SWITCH_REFUSAL } from './outreach-kill-switch'
// ⚑ 12 Sep — the operator notification for a welcome email that needs a human. `alerts.ts`
// imports only `resend` and `@kind/db`, so this creates no cycle with this file.
import { sendFounderAlert } from './alerts'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
const FROM = 'K.I.N.D <hello@get-kind.com>'
const DASH = `${process.env.PORTAL_URL || 'https://app.get-kind.com'}/dashboard`
// ⚑ 10 Sep (C15) — MILLA, THE CLIENT'S OWN WORKSPACE, AND THE FIRST STEP OF THE LOCKED FLOW.
//
// ⚠️ A SEPARATE CONSTANT RATHER THAN REPOINTING `DASH`, which ten other templates below use
// for leads, ICP and billing links. Redirecting all of them to fix one email would be a change
// nobody asked for.
const MILLA = `${process.env.PORTAL_URL || 'https://app.get-kind.com'}/milla`

// Demo/seed clients carry synthetic addresses (e.g. demo-xxxx@kind-demo.internal).
// These are NOT real mailboxes — sending to them generates hard bounces that erode
// the sending domain's reputation. This guard is the last line of defence: any
// transactional send to a non-deliverable address is dropped before it hits Resend.
// (Recipient queries should already exclude is_demo clients — this backstops them.)
export function isRealRecipient(to: string | string[]): boolean {
  const list = Array.isArray(to) ? to : [to]
  if (list.length === 0) return false
  return list.every((addr) => {
    const a = (addr || '').trim().toLowerCase()
    if (!a || !a.includes('@')) return false
    const domain = a.split('@')[1] || ''
    if (domain.endsWith('.internal')) return false        // *.internal — non-routable
    if (domain.startsWith('kind-demo.')) return false      // demo client domain
    if (a.includes('@example.')) return false              // RFC-2606 reserved
    // `.invalid` — RFC 2606, guaranteed never to resolve, and the TLD EVERY MBF demo address
    // uses (`mbf-demo.invalid`, see lib/demo-mbf-data.ts). It was missing from a list whose
    // stated job is "any transactional send to a non-deliverable address is dropped", so the
    // one domain the demo actually uses was the one this backstop let through.
    //
    // It has never bitten because the `is_demo` stop fires earlier on every path — but a
    // backstop that only holds while the thing in front of it holds is not a backstop. This
    // is the last line of defence, and it has to work when it is the ONLY line.
    if (domain === 'invalid' || domain.endsWith('.invalid')) return false
    if (domain === 'test' || domain.endsWith('.test')) return false
    if (domain === 'localhost') return false
    return true
  })
}

// D5: every transactional send carries a text/plain alternative — HTML-only mail
// hurts inbox placement. Derives the text part from the HTML when not supplied.
// These are 1:1 transactional mails (welcome, billing, digests) from the primary
// domain, so they intentionally carry NO List-Unsubscribe header (that's for cold
// bulk outreach only — see lib/deliverability.ts).
// #480 — MASTER SWITCH for automated CLIENT lifecycle mail (nudges, digests, credit
// warnings, nurture, campaign-paused). Defaults ON — set LIFECYCLE_EMAILS_ENABLED=false
// to silence ALL of it in one place (used during the build so a house/demo account isn't
// nudged). This is NOT the outreach kill-switch (that's AUTO_OUTREACH_ENABLED, cold sends)
// and NOT for transactional auth/billing mail (welcome, seat invite, onboarding, consent)
// or founder alerts — those always send.
export function lifecycleEmailsEnabled(): boolean {
  return process.env.LIFECYCLE_EMAILS_ENABLED !== 'false'
}

async function sendTx(opts: {
  from?: string
  to: string | string[]
  subject: string
  html: string
  text?: string
  lifecycle?: boolean   // #480 — true = automated client lifecycle mail, gated by the master switch
  /**
   * ⚑ 10 Sep (I) — 🛑 THIS IS COLD OUTREACH, SO ASK THE KILL-SWITCH.
   *
   * `sendTx` is shared by invoices, password resets, receipts and digests — mail R114 does
   * NOT govern — so the switch cannot live unconditionally in this function. But the cold
   * identity (`COLD_FROM`) leaves through here too, and that mail IS outreach.
   *
   * ⚠️ SO THE SEAM ASKS, AND THE CALLER DECLARES. A caller that forgets the flag is caught by
   * the assertion below rather than sending: any send from `COLD_FROM` without `cold: true`
   * is refused outright, because the only way to reach the cold identity is deliberately.
   */
  cold?: boolean
  /**
   * ⚑ 12 Sep (R120) — RESEND'S `Idempotency-Key`, PASSED THROUGH.
   *
   * When set, the SDK sends it as the `Idempotency-Key` header (resend >= 4.4.1 copies the
   * client headers per request; 4.3.0/4.4.0 set it on the SHARED client object, which with
   * the single module-level client below would have leaked the key onto every subsequent
   * unrelated email and silently suppressed it — which is why the pin is 4.6.0, not "latest"
   * and not the first version that merely has the option).
   *
   * ⚠️ ONLY ONE CALLER PASSES IT. Every other transactional mail is unchanged: no key, no
   * header, no behaviour change.
   */
  idempotencyKey?: string
}): Promise<CheckedSend | null> {
  // ⚠️ `null` MEANS "NOTHING WAS ATTEMPTED", and it is distinct from a failure. The four
  // early exits below return before the provider is called at all, so a caller holding a
  // durable claim must RELEASE it rather than record an outcome — recording `refused` would
  // be false, and recording a send would be the phantom this file already guards against.
  if (!resend) return null
  // ── 🛑 THE COLD SEAM. Kill-switch ON = nothing leaves, whoever asked. ─────────────────
  const from = opts.from ?? FROM
  const isColdIdentity = from === COLD_FROM
  if (opts.cold || isColdIdentity) {
    // ⚠️ THE IDENTITY DECIDES, NOT ONLY THE FLAG. A future caller that reaches COLD_FROM
    // without declaring `cold` is still gated — "a switch each caller must remember is a
    // convention, not a kill-switch" (outreach-kill-switch.ts), and this is that argument
    // applied to the one seam where transactional and cold mail share a function.
    if (killSwitchBlocks('resend_cold', `${opts.subject} → ${Array.isArray(opts.to) ? opts.to.join(', ') : opts.to}`)) return null
  }
  if (opts.lifecycle && !lifecycleEmailsEnabled()) {
    console.log(`[email] lifecycle mail suppressed (LIFECYCLE_EMAILS_ENABLED=false) — "${opts.subject}"`)
    return null
  }
  if (!isRealRecipient(opts.to)) {
    console.log(`[email] skipped non-deliverable recipient: ${Array.isArray(opts.to) ? opts.to.join(', ') : opts.to}`)
    return null
  }
  const result = await resend.emails.send(
    {
      from,
      to:      opts.to,
      subject: opts.subject,
      html:    opts.html,
      text:    opts.text ?? htmlToText(opts.html),
    } as Parameters<typeof resend.emails.send>[0],
    // ⚠️ ONLY when a caller asked for it: `emails.send`'s second argument is the request
    // options, and an absent key means no header and today's exact behaviour.
    opts.idempotencyKey ? { idempotencyKey: opts.idempotencyKey } : undefined,
  )
  // #338 (AR-01) — Resend returns { error } instead of throwing. These transactional
  // mails are best-effort (a failure must not break the signup/billing path they ride
  // on), but the failure must at least be VISIBLE — the old code swallowed it entirely.
  const checked = interpretSend(result)
  if (!checked.ok) {
    console.error(`[email] transactional send failed to ${Array.isArray(opts.to) ? opts.to.join(', ') : opts.to} — "${opts.subject}"`, checked.error)
  }
  // ⛓️ 12 Sep — IT USED TO RETURN `checked.ok`, A BARE BOOLEAN, AND THAT WAS NOT ENOUGH.
  // A caller holding a durable claim has to distinguish "another same-key request is in
  // flight" from "the payload conflicts" from "a 500" from "definitively refused" — four
  // provider verdicts with four different correct actions. A boolean collapses all of them,
  // which is how a 409 got misread as a send in the first draft of this build.
  return checked
}

function scoreBar(score: number): string {
  const filled  = Math.round(score / 20)
  const empty   = 5 - filled
  return '●'.repeat(filled) + '○'.repeat(empty)
}

function scoreColor(score: number): string {
  if (score >= 80) return '#16a34a'
  if (score >= 50) return '#d97706'
  return '#6b7280'
}

interface LeadRow {
  id?:        string
  first_name: string
  last_name:  string
  job_title:  string | null
  company:    string | null
  score:      number | null
  linkedin_url: string | null
}

function leadCard(lead: LeadRow): string {
  const score    = lead.score ?? 0
  const name     = `${lead.first_name} ${lead.last_name}`.trim()
  const subtitle = [lead.job_title, lead.company].filter(Boolean).join(' · ')
  return `
    <tr>
      <td style="padding:12px 0;border-bottom:1px solid #f0f0f0;vertical-align:top">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td>
              <p style="margin:0;font-weight:600;color:#111;font-size:0.9rem">${name}</p>
              <p style="margin:2px 0 0;color:#666;font-size:0.8rem">${subtitle || '—'}</p>
            </td>
            <td align="right" style="white-space:nowrap">
              <p style="margin:0;font-size:1.1rem;font-weight:700;color:${scoreColor(score)}">${score}</p>
              <p style="margin:0;font-size:0.65rem;color:${scoreColor(score)};letter-spacing:1px">${scoreBar(score)}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>`
}

// ⛓️ 31 Aug (BUILD-004A-2D amendment, founder decision) — THE "PIPELINE VALUE" CELL IS GONE.
//
// 🛑 IT WAS NOT A MEASUREMENT. The figure was `SUM(leads.estimated_deal_value_usd)`, a column
// written in exactly one place — `lib/scoring.ts:221`, as `estimated_deal_value_usd:
// r.score * 100`. A prospect scored 85 became "$8,500 of pipeline". It is the fit-scoring
// model wearing a currency symbol, and it was printed in a purple stat cell, in dollars, in a
// customer's inbox, every Monday.
//
// ⚠️ THE SECOND CALLER WAS WORSE AND IS WHY THE PARAMETER HAD TO GO RATHER THAN THE ARGUMENT.
// `sendFirstLeadsReadyEmail` did not even read the column — it computed
// `topLeads.reduce((s, l) => s + (l.score ?? 0) * 100, 0)` inline. One shared header, two
// customer emails, the same invented number. A fix applied to the digest alone would have
// left the identical figure shipping from the same function, and passed a guard while doing
// it. So the header no longer accepts the value at all: there is nowhere for it to re-enter.
//
// ⚠️ NOTHING REPLACED IT, DELIBERATELY. The founder's rule was explicit — do not substitute
// another invented metric, no deal value, no revenue, no ROI. The row is now two real cells
// (a count and a score) instead of two real cells and one fabricated one. Both remain
// centred with their divider, so this is a shorter row and not a gap.
//
// ⚠️ AND THE WRITER AT `scoring.ts:221` IS UNTOUCHED — it stays PARKED as its own defect.
// This removes the customer-facing money claim; it does not pretend to have fixed the column.
function digestHeader(companyName: string, totalLeads: number, avgScore: number): string {
  return `
    <div style="background:#7C3AED;border-radius:12px 12px 0 0;padding:28px 32px">
      <p style="margin:0;color:rgba(255,255,255,0.7);font-size:0.8rem;letter-spacing:1px;text-transform:uppercase">K.I.N.D Lead Report</p>
      <h1 style="margin:6px 0 0;color:#fff;font-size:1.4rem;font-weight:700">${companyName}</h1>
    </div>
    <div style="background:#f8faff;border-left:1px solid #e8f0fe;border-right:1px solid #e8f0fe;padding:16px 32px">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td align="center" style="padding:8px">
            <p style="margin:0;font-size:1.5rem;font-weight:700;color:#111">${totalLeads}</p>
            <p style="margin:2px 0 0;font-size:0.75rem;color:#888">Total leads</p>
          </td>
          <td align="center" style="padding:8px;border-left:1px solid #e8f0fe">
            <p style="margin:0;font-size:1.5rem;font-weight:700;color:#111">${avgScore}</p>
            <p style="margin:2px 0 0;font-size:0.75rem;color:#888">Avg score</p>
          </td>
        </tr>
      </table>
    </div>`
}

// #106 — Rep seat invite. Sent when an owner/manager adds a rep to a company
// seat (POST /company/seats). Carries the rep's accept-invite link, who invited
// them, and a short intro to K.I.N.D. The send is best-effort: the caller wraps
// this so a delivery failure never breaks the invite (the link is still returned
// for copy-paste). Mirrors the transactional tone of the other emails here.
export async function sendSeatInviteEmail(
  to: string,
  inviteUrl: string,
  context: { companyName?: string | null; inviterName?: string | null } = {},
) {
  if (!resend) return
  const company = (context.companyName || '').trim()
  const inviter = (context.inviterName || '').trim()
  const invitedBy = inviter
    ? `<strong>${inviter}</strong>${company ? ` from <strong>${company}</strong>` : ''} has invited you`
    : company
      ? `<strong>${company}</strong> has invited you`
      : `You've been invited`
  await sendTx({
    from: FROM,
    to,
    subject: company
      ? `You've been invited to join ${company} on K.I.N.D`
      : `You've been invited to K.I.N.D`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#111">
        <h1 style="font-size:1.5rem;margin-bottom:8px">You're invited to K.I.N.D 👋</h1>
        <p style="color:#555;line-height:1.6">
          ${invitedBy} to your own workspace on K.I.N.D — your AI sales team that finds,
          scores, and reaches out to leads for you.
        </p>
        <p style="color:#555;line-height:1.6">
          Accept the invite below to claim your seat. You'll get your own pipeline,
          inbox, and FIGSY campaigns, with credits funded by your company.
        </p>
        <a href="${inviteUrl}"
           style="display:inline-block;margin-top:16px;background:#7C3AED;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600">
          Accept invitation →
        </a>
        <p style="color:#999;font-size:0.8rem;margin-top:24px">
          If the button doesn't work, copy and paste this link into your browser:<br>
          <a href="${inviteUrl}" style="color:#7C3AED;word-break:break-all">${inviteUrl}</a>
        </p>
        <p style="color:#999;font-size:0.8rem;margin-top:24px">
          Didn't expect this? You can safely ignore this email — no seat is claimed until you accept.
          Questions? Reply to this email — <a href="mailto:hello@get-kind.com">hello@get-kind.com</a>
        </p>
      </div>
    `,
  })
}

/**
 * The welcome email's body, as a pure function of the only input that varies.
 *
 * ⚠️ EXTRACTED SO A RETRY CAN RE-RENDER IT IDENTICALLY. Resend's idempotency requires the
 * SAME key AND the SAME payload, so the payload has to be reproducible from durable state
 * rather than assembled inline at the call site.
 */
function welcomeEmailHtml(companyName: string): string {
  return `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#111">
        <h1 style="font-size:1.5rem;margin-bottom:8px">Welcome, ${companyName} 👋</h1>
        <p style="color:#555;line-height:1.6">Your workspace is ready. Here's what happens next:</p>
        <ol style="color:#555;line-height:2">
          <li>Open <strong>Milla</strong> and tell her the outcome you want</li>
          <li>She'll show you <strong>real examples</strong> of the people we'd reach for you</li>
          <li>Tell her what's right and what isn't — then you choose your programme</li>
        </ol>
        <a href="${MILLA}"
           style="display:inline-block;margin-top:16px;background:#7C3AED;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600">
          Open Milla →
        </a>
        <p style="color:#999;font-size:0.8rem;margin-top:32px">
          Questions? Reply to this email or book a call at <a href="mailto:hello@get-kind.com">hello@get-kind.com</a>.
        </p>
      </div>
    `
}

/** The one subject line. A source literal, so a copy edit is a deploy and a payload change. */
export const WELCOME_EMAIL_SUBJECT = 'Welcome to K.I.N.D — your workspace is ready'

/**
 * ═══════════════════════════════════════════════════════════════════════════════════════
 * 🛑 ONE AUTOMATIC WELCOME EMAIL PER CLIENT (S1-AUDIT-006 · R120).
 *
 * ── THE DEFECT THIS CLOSES ────────────────────────────────────────────────────────────
 *
 * `routes/auth.ts` called this function OUTSIDE the `if (!existing)` block that guards the
 * founder alert immediately below it. A second `POST /auth/onboard` for the same user takes
 * the UPDATE branch, the draft gate stands aside because the draft is already promoted, and
 * THE WELCOME EMAIL SENT AGAIN. A double-click, a refresh, an offline retry and two
 * concurrent tabs all land there, and nothing anywhere recorded that it had been sent.
 *
 * ── THE AUTHORITY IS A DURABLE CLAIM, NEVER THE SCREEN ────────────────────────────────
 *
 * `clients.welcome_email_claimed_at` is taken by a conditional UPDATE. Zero rows means
 * somebody else holds it; one row means this process may send. Same mechanism as the proof
 * review hand-off — the database decides, not the caller.
 *
 * ⚠️ A CLAIMED ROW IS NOT A PERMANENT "DO NOTHING" (the founder's correction). A first
 * attempt that died before recording anything leaves a claim with no outcome, and that
 * client would otherwise never receive a welcome email at all. Inside Resend's 24-hour
 * window, with a payload PROVEN identical by hash, a later onboarding retry re-calls the
 * provider with the SAME key — which returns the original email id rather than sending again.
 *
 * ⚠️ AND AFTER 24 HOURS IT FAILS CLOSED. The key is gone, so a resend would be unprotected:
 * the state becomes `unresolved_expired`, nothing is sent, THE CLAIM IS NOT RELEASED, and an
 * operator is shown it. A provider's retention expiring is not a reason to risk a duplicate.
 *
 * ⚠️ NO PROVIDER MESSAGE ID MEANS NO `sent`, and the database CHECK enforces it.
 * ═══════════════════════════════════════════════════════════════════════════════════════
 */
export async function sendWelcomeEmail(
  to: string, companyName: string,
  /**
   * 🛑 THE DURABLE IDENTITY THE KEY AND THE CLAIM HANG ON. Required, deliberately: the email
   * address is NOT a safe key (an address can legitimately re-onboard under a new client)
   * and a caller with no client row has nothing to claim against. `auth.ts` has `clientId`
   * in hand by the time it calls this.
   */
  clientId: string,
): Promise<void> {
  if (!resend) return

  const {
    welcomeIdempotencyKey, welcomePayloadHash, decideWelcomeAttempt, recordForSendResult,
  } = await import('./welcome-email-state')

  const html    = welcomeEmailHtml(companyName)
  const payload = { from: FROM, to, subject: WELCOME_EMAIL_SUBJECT, html, text: htmlToText(html) }
  const hash    = welcomePayloadHash(payload)
  const key     = welcomeIdempotencyKey(clientId)
  const now     = Date.now()

  // ── READ THE DURABLE STATE ───────────────────────────────────────────────────────────
  const { data: row, error: readErr } = await db.from('clients')
    .select('welcome_email_claimed_at, welcome_email_sent_at, welcome_email_outcome, welcome_email_message_id, welcome_email_payload_hash')
    .eq('id', clientId).maybeSingle()
  if (readErr) {
    // 🛑 FAIL CLOSED. We do not know whether this client already has their welcome email, and
    // the one thing we must not do with that answer is send one.
    console.error(`[email] welcome state unreadable for client ${clientId} — NOT sending:`, readErr.message)
    return
  }
  const r = (row ?? {}) as Record<string, string | null>
  const state: WelcomeEmailState = {
    claimedAt:   r.welcome_email_claimed_at ?? null,
    sentAt:      r.welcome_email_sent_at ?? null,
    outcome:     (r.welcome_email_outcome ?? null) as WelcomeEmailState['outcome'],
    messageId:   r.welcome_email_message_id ?? null,
    payloadHash: r.welcome_email_payload_hash ?? null,
  }

  const decision = decideWelcomeAttempt(state, hash, now)

  if (decision.action === 'skip') {
    console.log(`[email] welcome email for client ${clientId} not sent — ${decision.reason}.`)
    return
  }

  if (decision.action === 'mark_payload_conflict' || decision.action === 'mark_expired') {
    // ⚠️ NEITHER RELEASES THE CLAIM, AND NEITHER CALLS THE PROVIDER. Both are states a human
    // resolves; the row is the persisted queue and the alert is only a notification of it.
    const outcome = decision.action === 'mark_expired' ? 'unresolved_expired' : 'payload_conflict'
    await db.from('clients').update({ welcome_email_outcome: outcome }).eq('id', clientId)
    console.error(`[email] welcome email for client ${clientId} is ${outcome} — nothing sent, claim kept, operator action required.`)
    void sendFounderAlert('support_escalation', 'A welcome email needs a human — it cannot be retried safely', [
      `Client ${clientId} (${companyName}).`,
      outcome === 'unresolved_expired'
        ? 'The outcome was never resolved and Resend\'s 24-hour idempotency window has passed, so we cannot prove whether the original email was delivered.'
        : 'The welcome email now renders differently from the first attempt, so the idempotency key can no longer protect a retry.',
      'NOTHING has been sent automatically and nothing will be. Their claim is deliberately NOT released, so no duplicate can be created.',
      'ACTION: Vida -> Command Centre -> System -> unresolved welcome emails. Check the Resend log for this client, then send it by hand if it never arrived.',
    ]).catch(() => {})
    return
  }

  // ── THE CLAIM ────────────────────────────────────────────────────────────────────────
  if (decision.action === 'claim_and_send') {
    const { data: claimed, error: claimErr } = await db.from('clients')
      .update({ welcome_email_claimed_at: new Date(now).toISOString(), welcome_email_payload_hash: hash })
      .eq('id', clientId)
      // 🛑 THE COMPARE-AND-SET IS THE WHOLE MECHANISM. Postgres re-evaluates the WHERE after
      // taking the row lock, so of N racing writers exactly one matches and the rest update
      // zero rows. The loser must NOT call the provider.
      .is('welcome_email_claimed_at', null)
      .select('id')
    if (claimErr) {
      console.error(`[email] the welcome-email claim could not be taken for client ${clientId} — NOT sending:`, claimErr.message)
      return
    }
    if ((claimed ?? []).length === 0) {
      console.log(`[email] welcome email for client ${clientId} is already claimed by another request — not sending a second one.`)
      return
    }
  }

  // ── THE PROVIDER CALL — first attempt or a proven-safe retry, same key either way ────
  let sent: CheckedSend | null
  try {
    sent = await sendTx({ ...payload, idempotencyKey: key })
  } catch (thrown) {
    // A throw is AMBIGUOUS, never a refusal: the request may have reached Resend.
    sent = { ok: false, id: null, error: thrown, errorName: null }
  }

  if (sent === null) {
    // Nothing was attempted (no API key, a non-deliverable recipient, the cold kill-switch,
    // the lifecycle switch). RELEASE the claim so a later legitimate attempt can send, and
    // record NO outcome — there is no provider verdict to record.
    await db.from('clients')
      .update({ welcome_email_claimed_at: null, welcome_email_payload_hash: null })
      .eq('id', clientId)
    return
  }

  const verdict = recordForSendResult({ ok: sent.ok, id: sent.id, errorName: sent.errorName })
  if (!verdict.keepClaim) {
    // A DEFINITIVE refusal: nothing was sent, so the claim comes back.
    await db.from('clients')
      .update({ welcome_email_claimed_at: null, welcome_email_payload_hash: null, welcome_email_outcome: 'refused' })
      .eq('id', clientId)
    console.error(`[email] welcome email for client ${clientId} was definitively refused (${sent.errorName}) — the claim is released and a later attempt may send.`)
    return
  }

  await db.from('clients').update({
    welcome_email_outcome: verdict.outcome,
    ...(verdict.storeSend
      ? { welcome_email_sent_at: new Date(now).toISOString(), welcome_email_message_id: sent.id }
      : {}),
  }).eq('id', clientId)

  if (verdict.outcome !== 'sent') {
    console.error(`[email] welcome email for client ${clientId} is ${verdict.outcome} (no provider message id) — the claim is kept and a retry inside 24h uses the same key.`)
  }
}


// R6 (#32) — Onboarding activation sequence for ACTIVATED (paid) clients.
// Distinct from sendNurtureEmail, which is a trial-conversion sequence the
// onboarding cron deliberately skips for paid clients. These three emails drive
// product activation: get set up → set your ICP / launch → first-week recap.
export async function sendOnboardingEmail(
  to: string,
  companyName: string,
  stage: 0 | 3 | 7,
  context: { has_icp: boolean; lead_count: number; has_campaign: boolean },
) {
  if (!resend) return
  const cta = (href: string, label: string) =>
    `<a href="${DASH}${href}" style="display:inline-block;margin-top:16px;background:#7C3AED;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600">${label}</a>`
  const wrap = (inner: string) =>
    `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#111">${inner}
       <p style="color:#999;font-size:0.8rem;margin-top:32px">Questions? Just reply — <a href="mailto:hello@get-kind.com">hello@get-kind.com</a></p>
     </div>`

  const emails: Record<number, { subject: string; html: string }> = {
    0: {
      subject: `You're in 🎉 Let's get K.I.N.D working for ${companyName || 'you'}`,
      html: wrap(`
        <h1 style="font-size:1.5rem;margin-bottom:8px">Welcome aboard, ${companyName} 👋</h1>
        <p style="color:#555;line-height:1.6">You're all set up. Three quick steps and your AI sales team is live:</p>
        <ol style="color:#555;line-height:2.2;padding-left:20px">
          <li><strong>Sign your Service Agreement</strong> — in Documents (2 minutes)</li>
          <li><strong>Build your ICP</strong> — tell FIGSY who to find (our AI pre-fills it from your website)</li>
          <li><strong>Launch your first campaign</strong> — FIGSY starts finding and contacting leads</li>
        </ol>
        ${cta('/leads/icp', 'Start with my ICP →')}`),
    },
    3: {
      subject: context.has_icp
        ? (context.has_campaign ? `Your first leads are flowing — what's next` : `Your ICP is set — time to launch FIGSY`)
        : `Quick nudge: set up who FIGSY should target`,
      html: !context.has_icp
        ? wrap(`
          <p>Hi ${companyName},</p>
          <p style="color:#555;line-height:1.6">You're set up, but FIGSY doesn't know who to look for yet. Building your ICP takes about 60 seconds — our AI pre-fills it from your website, you just confirm.</p>
          ${cta('/leads/icp', 'Build my ICP (60 seconds) →')}`)
        : !context.has_campaign
        ? wrap(`
          <p>Hi ${companyName},</p>
          <p style="color:#555;line-height:1.6">Your ICP is ready and you have <strong>${context.lead_count} scored lead${context.lead_count === 1 ? '' : 's'}</strong>. The next step is to launch a FIGSY campaign so it starts reaching out for you.</p>
          ${cta('/figsy', 'Launch my first campaign →')}`)
        : wrap(`
          <p>Hi ${companyName},</p>
          <p style="color:#555;line-height:1.6">FIGSY is live and working — <strong>${context.lead_count} lead${context.lead_count === 1 ? '' : 's'}</strong> in your pipeline so far. Keep an eye on your Inbox for replies; that's where the conversations start.</p>
          ${cta('/inbox', 'Open my inbox →')}`),
    },
    7: {
      subject: `Your first week with K.I.N.D — ${companyName}`,
      html: wrap(`
        <p>Hi ${companyName},</p>
        <p style="color:#555;line-height:1.6">One week in. Here's where you stand:</p>
        <ul style="color:#555;line-height:2;padding-left:20px">
          <li><strong>${context.lead_count}</strong> lead${context.lead_count === 1 ? '' : 's'} sourced</li>
          <li>ICP ${context.has_icp ? 'set ✅' : 'not set yet — worth doing today'}</li>
          <li>Outreach ${context.has_campaign ? 'running ✅' : 'not launched yet'}</li>
        </ul>
        <p style="color:#555;line-height:1.6">${
          context.has_campaign
            ? 'Want to get more out of FIGSY? Try refining your ICP or adding a second campaign for a different segment.'
            : 'The biggest win this week: launch your first FIGSY campaign so the pipeline starts filling itself.'
        }</p>
        ${cta(context.has_campaign ? '/leads' : '/figsy', context.has_campaign ? 'Review my pipeline →' : 'Launch FIGSY →')}`),
    },
  }

  const email = emails[stage]
  if (!email) return
  await sendTx({ from: FROM, to, subject: email.subject, html: email.html })
}

// ── #547 DECIDED, 29 Jul: THE CONSENT EMAIL STAYS OURS — it is NOT a per-client send. ────
//
// #547 moved every prospect send onto the client's own mailbox, and this one is deliberately
// exempt. It was left undecided until now, which is worse than either answer, so:
//
// WHY IT STAYS ON THE HOUSE DOMAIN — four reasons, and the last is the one that settles it:
//
//  ① It is genuinely OUR mail. K.I.N.D is the processor asking permission on the client's
//    behalf, and the footer says exactly that: "sent on behalf of X via K.I.N.D". A POPIA
//    consent request from the client's own mailbox makes that sentence a lie.
//  ② The audit trail belongs to the entity holding the data — us. Consent that arrives from
//    somewhere else is weaker evidence, not stronger.
//  ③ Every link in it (consent, decline, opt-out) resolves on OUR domain. From-domain and
//    link-domain alignment is a deliverability positive; splitting them is a spam signal.
//  ④ THE DECIDING ONE: this is the one message that goes out BEFORE consent exists. Putting
//    pre-consent mail on a client's freshly-warmed branded mailbox is precisely what un-warms
//    it — the same reasoning that makes `warming` a non-sendable status in sending-inbox.ts.
//    It also fires at SOURCING time, before a client necessarily has a mailbox at all, so
//    routing it per-client would block consent collection for exactly the new clients who
//    need it most.
//
// RULEBOOK 12.2 is not violated: its harm is "one client's complaints poison the REST". Here
// the sender is us, identified as us — a complaint lands on the party that actually sent it.
//
// ⛓️ THE OPEN SUB-QUESTION ABOVE IS CLOSED — HC-4, 20 Aug. It read: *"this sends from `FROM`,
// the TRANSACTIONAL identity (hello@get-kind.com)… the right home is arguably FIGSY_COLD_FROM.
// That is a live deliverability change… so it needs its own PR and the founder's call, not a
// quiet edit inside this one."* That was correct on both counts. This is that PR, and the
// founder made that call: send via `COLD_FROM`, and make `FIGSY_COLD_FROM` boot-critical so the
// rule cannot silently regress to the transactional domain (see `startup-check.ts`).
//
// ── HC-4 — WHY THE GATES LIVE IN THIS FUNCTION AND NOT IN ITS CALLERS ──────────────────────
//
// **S5 (founder-locked 26 Jul): "Never cold-email from the primary domain."** A permission
// request to a stranger is a cold send. It went out from `hello@get-kind.com` — the domain
// every invoice, password reset and receipt also leaves from — so a spam complaint on a
// prospect who never asked to hear from us landed on the reputation of our billing mail.
//
// **S6 (verified 26 Jul): "Opt-outs are global, checked at sourcing, across every client."**
// They were not checked here at all.
//
// ⚠️ SIX CALL SITES, AND THEY DISAGREED WITH EACH OTHER. `autoConsentScoredLeads` in
// `routes/icps.ts`, and five more in `routes/leads.ts` (711, 1001, 1026, 1064, 1320). **NOT ONE
// of the six checked the blocklist.** Two checked `isSuppressed`; four did not. One had no
// gate of any kind. Fixing the caller the defect was reported against would have left five
// doors open and made the next reader conclude that consent sends were covered — the min-20
// shape exactly (18 green unit tests behind a bypassable route), and #617's (present in two
// functions, absent from a third, which every occurrence count reads as "handled").
//
// So the gates live HERE, beside the demo stop, where all six funnel through and a SEVENTH
// door inherits them for free.
//
// ⚠️ RETURNS A RESULT NOW, and that is not cosmetic. It used to return `void`, so
// `autoConsentScoredLeads` flipped the lead to `status: 'consent_sent'` whether or not
// anything was sent. A suppressed person would have been recorded as having been asked for
// consent — a false entry in the one record that proves we asked. Callers that ignore the
// return behave exactly as before.
export type ConsentSendResult =
  | { sent: true }
  /** ⚑ 10 Sep (I) — `kill_switch` joins the refusals. It is a REFUSAL, not an error: nothing
   *  was sent and nothing is wrong, so callers that log a reason keep working unchanged. */
  | { sent: false; reason: 'not_configured' | 'is_demo' | 'opted_out' | 'do_not_contact' | 'kill_switch'; detail: string }

export async function sendConsentEmail(
  to: string,
  firstName: string,
  senderCompanyName: string,
  optOutUrl: string,
  clientId?: string | null,
): Promise<ConsentSendResult> {
  if (!resend) return { sent: false, reason: 'not_configured', detail: 'RESEND_API_KEY is not set, so nothing can be sent.' }

  // ── 🛑 10 Sep (I) — THE KILL-SWITCH, ASKED HERE RATHER THAN BY WHOEVER CALLS ──────────
  //
  // ⛓️ WHAT THIS CLOSES. Every other cold seam asks the switch at the seam itself — SMTP
  // inside `mailer.sendAs`, and each provider push (Smartlead, Instantly, LinkedIn). This
  // path does not go through `mailer`: it reaches `sendTx` → `resend.emails.send` with
  // `COLD_FROM`, and `sendTx` is the TRANSACTIONAL seam that invoices and password resets
  // share, so the switch cannot live there without stopping mail R114 does not govern.
  //
  // So the six callers each remembered instead — `coldMailAllowed()` in `leads.ts` and a
  // direct `process.env.AUTO_OUTREACH_ENABLED` read in `icps.ts`. All six were correct on
  // 10 Sep. A switch that each caller must remember is a convention, and the seventh caller
  // is the one that will not: this function IS the cold seam for consent mail, so the
  // question is asked here, once, where a new caller cannot route around it by not knowing.
  //
  // ⚠️ A CONSENT REQUEST IS OUTREACH. It is an unsolicited first contact with a real
  // prospect, by name, from the cold identity — the founder's rule names no exception for it.
  if (killSwitchBlocks('resend_cold', `consent request to ${to}`)) {
    return { sent: false, reason: 'kill_switch', detail: KILL_SWITCH_REFUSAL }
  }

  // #453 — DEMO MODE: a consent email is an OUTBOUND prospect send. A demo client must
  // never email a real person, so suppress it when the sending client is is_demo. (The
  // clientId is passed by every caller; if omitted this behaves exactly as before.)
  if (clientId && await isDemoClient(clientId)) {
    console.log(`[demo] prospect send suppressed for client ${clientId} — consent email to ${to} NOT sent (demo).`)
    return { sent: false, reason: 'is_demo', detail: 'Demo account — a demo can never reach a real person.' }
  }

  // S6 — OPT-OUTS ARE GLOBAL, AND THIS IS THE PATH WHERE THAT MATTERS MOST.
  //
  // A person who opted out of client A's outreach gets freshly sourced for client B a week
  // later, scores over 60, and is asked for permission by name. That is not a technicality:
  // asking someone for consent AFTER they have refused is the most direct contradiction of an
  // opt-out the product can produce, and it arrives looking like a polite first contact.
  //
  // HC-1 — probe with the NORMALISED address. `leads.email` is stored raw and the blocklist
  // normalised, so an exact compare between the two is a coin toss on letter case.
  //
  // ⚠️ FAILS CLOSED. A rejected read returns `data: null`, which reads as "not opted out" and
  // sends. There is no second gate behind this function — it IS the send — so an unanswerable
  // question is treated as a NO. Over-refusing costs one permission request that a later run
  // re-attempts; under-refusing emails somebody who told us to stop.
  // Named `consentKey` rather than `key`: the HC-1 guard allowlists probe VARIABLES by name,
  // and allowlisting a name as generic as `key` would let any future `const key = anything`
  // through the guard unnoticed. A specific name keeps the allowlist meaningful.
  const consentKey = normalizeRevealEmail(to)
  if (consentKey) {
    const { data: blocked, error: blockErr } = await db.from('opt_out_blocklist')
      .select('id').eq('email', consentKey).is('opted_back_in_at', null).maybeSingle()
    if (blockErr) {
      console.error(`[consent] blocklist read FAILED — NOT sending to ${to} (fail-closed)`, blockErr.message)
      return { sent: false, reason: 'opted_out', detail: `Could not establish whether this person has opted out (${blockErr.message}). Refused rather than sent.` }
    }
    if (blocked) {
      console.warn(`[consent] ${to} is on the opt-out blocklist — consent email NOT sent (S6: opt-outs are global)`)
      return { sent: false, reason: 'opted_out', detail: 'This person is on the global opt-out blocklist. Asking them for consent would contradict the opt-out they already gave us.' }
    }
  }

  // DO-NOT-CONTACT — the founder's employer and anyone connected to it. A hard stop on every
  // path. Two of the six callers checked this and four did not; now none of them has to.
  if (isSuppressed({ email: to })) {
    console.warn(`[consent] ${to} is on the do-not-contact list — consent email NOT sent`)
    return { sent: false, reason: 'do_not_contact', detail: 'This address is on the do-not-contact list.' }
  }

  const consentUrl = `${optOutUrl}?consent=true`
  const declineUrl = `${optOutUrl}?consent=false`
  await sendTx({
    // S5 — NOT `FROM`. This is the only send in this file that goes to a COLD PROSPECT, and
    // `FROM` is the transactional identity every invoice and password reset uses. `COLD_FROM`
    // resolves to `FIGSY_COLD_FROM`, which `startup-check.ts` now grades CRITICAL — so the
    // fallback to the transactional domain in `deliverability.ts` can no longer be reached in
    // production without the API refusing to boot and saying why.
    from: COLD_FROM,
    to,
    subject: `[Action required] ${senderCompanyName} would like to connect`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#111">
        <p style="line-height:1.6">Hi ${firstName},</p>
        <p style="color:#555;line-height:1.6">
          <strong>${senderCompanyName}</strong> would like your permission to send you B2B communication.
          Under POPIA, they need your consent before reaching out further.
        </p>
        <p style="color:#555;line-height:1.6">
          If you're open to hearing from them, click the button below. You can withdraw consent at any time.
        </p>
        <a href="${consentUrl}"
           style="display:inline-block;margin-top:8px;background:#16a34a;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600">
          Give Consent
        </a>
        <p style="margin-top:24px">
          <a href="${declineUrl}" style="color:#888;font-size:0.875rem">No thanks, I'd prefer not to be contacted</a>
        </p>
        <p style="color:#bbb;font-size:0.75rem;margin-top:32px;border-top:1px solid #eee;padding-top:16px">
          This email was sent on behalf of ${senderCompanyName} via K.I.N.D.
          If you did not expect this, you can safely ignore it.
        </p>
      </div>
    `,
  })
  return { sent: true }
}

// D4 — First leads email now includes top 5 leads inline
export async function sendFirstLeadsReadyEmail(
  to: string,
  companyName: string,
  leadCount: number,
  topLeads: LeadRow[] = [],
) {
  if (!resend) return

  const avgScore = topLeads.length
    ? Math.round(topLeads.reduce((s, l) => s + (l.score ?? 0), 0) / topLeads.length)
    : 0
  // ⛓️ 31 Aug — `const pipelineValue = topLeads.reduce((s, l) => s + (l.score ?? 0) * 100, 0)`
  // WAS HERE, and it is the clearest statement of the defect anywhere in the repo: a fit score
  // multiplied by a hundred, summed, and printed to a customer with a dollar sign. Deleted
  // rather than left unused — an unread variable reads as live to the next person.

  const leadsHtml = topLeads.length
    ? `
      <h2 style="font-size:1rem;font-weight:600;color:#111;margin:24px 0 8px">Your top leads</h2>
      <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #f0f0f0">
        ${topLeads.slice(0, 5).map(leadCard).join('')}
      </table>`
    : ''

  await sendTx({
    from: FROM,
    to,
    subject: `Your first ${leadCount} leads are ready — K.I.N.D`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#111;border:1px solid #e8f0fe;border-radius:12px;overflow:hidden">
        ${digestHeader(companyName, leadCount, avgScore)}
        <div style="padding:24px 32px">
          <p style="color:#555;line-height:1.6;margin-top:0">
            We've found <strong>${leadCount} leads</strong> matching your ICP — scored, ranked, and ready.
            ${topLeads.length ? `Here are your top ${Math.min(topLeads.length, 5)}:` : ''}
          </p>
          ${leadsHtml}
          ${(() => {
            // #447 — reveal-push CTA: deep-link straight to the top lead so the
            // client's first action is the $1 reveal (the money-model entry point).
            const topId = topLeads[0]?.id
            const revealHref = topId ? `${DASH}/leads?highlight=${topId}` : `${DASH}/leads`
            return `
          <a href="${revealHref}"
             style="display:inline-block;margin-top:24px;margin-right:12px;background:#7C3AED;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:0.9rem">
            Reveal your top lead →
          </a>`
          })()}
          <a href="${DASH}/leads"
             style="display:inline-block;margin-top:24px;color:#7C3AED;text-decoration:none;padding:12px 8px;font-weight:600;font-size:0.9rem">
            View all ${leadCount} leads
          </a>
          <p style="color:#999;font-size:0.8rem;margin-top:32px;border-top:1px solid #f5f5f5;padding-top:16px">
            Questions? Reply to this email — we're here to help.
          </p>
        </div>
      </div>
    `,
  })
}

// M-2 — Trial nurture sequence (day 1, 3, 5, 7, 10)
// ⚠️ #607 — NOT CALLED. Its only caller was POST /internal/ae/nurture, retired 1 Aug: there
// is no trial to nurture, and this template's first line was "Your K.I.N.D trial is live."
// Kept, not deleted (CORE-MAP rule 3) — but it is a builder for a sequence we do not send.
// If you are here to wire it up, the copy needs rewriting for the $99 pack model first.
export async function sendNurtureEmail(
  to: string,
  companyName: string,
  stage: 1 | 3 | 5 | 7 | 10,
  context: { has_icp: boolean; lead_count: number; consented_count: number },
) {
  if (!resend) return

  const emails: Record<number, { subject: string; html: string }> = {
    1: {
      subject: `Get your first leads in the next 2 hours — K.I.N.D`,
      html: `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#111">
          <p>Hi ${companyName},</p>
          <p style="color:#555;line-height:1.6">Your K.I.N.D trial is live. Here's how to get leads in the next 2 hours:</p>
          <ol style="color:#555;line-height:2.2;padding-left:20px">
            <li><strong>Go to the ICP Builder</strong> — takes 60 seconds with our AI pre-fill</li>
            <li>Our AI scrapes your website and suggests your ideal customer profile</li>
            <li>Confirm the fields — the search fires automatically</li>
            <li>Pre-consented leads land in your pipeline within the hour</li>
          </ol>
          <a href="${DASH}/leads/icp"
             style="display:inline-block;margin-top:16px;background:#7C3AED;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600">
            Build my ICP now →
          </a>
          <p style="color:#999;font-size:0.8rem;margin-top:32px">
            Questions? Reply to this email — <a href="mailto:hello@get-kind.com">hello@get-kind.com</a>
          </p>
        </div>`,
    },
    3: {
      subject: context.has_icp
        ? `Your leads are scored and waiting — K.I.N.D`
        : `You haven't built your ICP yet — here's why that matters`,
      html: context.has_icp
        ? `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#111">
          <p>Hi ${companyName},</p>
          <p style="color:#555;line-height:1.6">
            You have <strong>${context.lead_count} scored leads</strong> waiting in your pipeline.
            ${context.consented_count > 0
              ? `<strong>${context.consented_count}</strong> have already given consent — they're ready to contact right now.`
              : `The next step is to send consent emails to your top leads.`}
          </p>
          <a href="${DASH}/leads"
             style="display:inline-block;margin-top:16px;background:#7C3AED;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600">
            Review my leads →
          </a>
        </div>`
        : `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#111">
          <p>Hi ${companyName},</p>
          <p style="color:#555;line-height:1.6">
            You signed up 3 days ago but haven't built your ICP yet.
            No ICP = no leads. It takes 60 seconds — our AI pre-fills it from your website.
          </p>
          <p style="color:#555;line-height:1.6">
            Clients who build their ICP on day 1 get their first leads within 2 hours.
            Clients who wait get leads much later — or not at all.
          </p>
          <a href="${DASH}/leads/icp"
             style="display:inline-block;margin-top:16px;background:#7C3AED;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600">
            Build my ICP (60 seconds) →
          </a>
        </div>`,
    },
    5: {
      subject: `What does a 90-score lead look like? — K.I.N.D`,
      html: `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#111">
          <p>Hi ${companyName},</p>
          <p style="color:#555;line-height:1.6">
            Every lead in K.I.N.D is scored 0–100 against your ICP by our AI. Here's what the scores mean:
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #f0f0f0;border-radius:8px;overflow:hidden;margin:16px 0">
            <tr style="background:#f9fafb">
              <td style="padding:10px 16px;font-weight:600;font-size:0.85rem;color:#16a34a">80–100 ●●●●●</td>
              <td style="padding:10px 16px;font-size:0.85rem;color:#555">Strong ICP match — title, industry, company size all fit. Contact these first.</td>
            </tr>
            <tr>
              <td style="padding:10px 16px;font-weight:600;font-size:0.85rem;color:#d97706">50–79 ●●●○○</td>
              <td style="padding:10px 16px;font-size:0.85rem;color:#555">Partial match — worth contacting, lower priority.</td>
            </tr>
            <tr style="background:#f9fafb">
              <td style="padding:10px 16px;font-weight:600;font-size:0.85rem;color:#6b7280">0–49 ●○○○○</td>
              <td style="padding:10px 16px;font-size:0.85rem;color:#555">Weak match — included for volume, not ideal first contacts.</td>
            </tr>
          </table>
          <p style="color:#555;line-height:1.6">
            Filter your pipeline to 80+ scores and send consent emails to those first.
            That's where your highest-value conversations start.
          </p>
          <a href="${DASH}/leads"
             style="display:inline-block;margin-top:16px;background:#7C3AED;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600">
            View my scored leads →
          </a>
        </div>`,
    },
    7: {
      subject: `One week in — your pipeline snapshot`,
      html: `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#111">
          <p>Hi ${companyName},</p>
          <p style="color:#555;line-height:1.6">Here's where your pipeline stands at the end of week 1:</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f7ff;border-radius:8px;overflow:hidden;margin:16px 0">
            <tr>
              <td align="center" style="padding:16px 12px">
                <p style="margin:0;font-size:1.5rem;font-weight:700;color:#111">${context.lead_count}</p>
                <p style="margin:4px 0 0;font-size:0.75rem;color:#888">Total leads</p>
              </td>
              <td align="center" style="padding:16px 12px;border-left:1px solid #d0e8ff">
                <p style="margin:0;font-size:1.5rem;font-weight:700;color:#16a34a">${context.consented_count}</p>
                <p style="margin:4px 0 0;font-size:0.75rem;color:#888">Consented</p>
              </td>
              <td align="center" style="padding:16px 12px;border-left:1px solid #d0e8ff">
                <p style="margin:0;font-size:1.5rem;font-weight:700;color:#7C3AED">${Math.max(0, context.lead_count - context.consented_count)}</p>
                <p style="margin:4px 0 0;font-size:0.75rem;color:#888">Pending</p>
              </td>
            </tr>
          </table>
          ${context.consented_count === 0 && context.lead_count > 0 ? `
          <p style="color:#d97706;line-height:1.6">
            <strong>You haven't sent any consent emails yet.</strong>
            Consented leads are the ones you can actually reach out to.
            Send consent emails to your top 10 this week.
          </p>` : ''}
          <a href="${DASH}/leads"
             style="display:inline-block;margin-top:16px;background:#7C3AED;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600">
            Open my pipeline →
          </a>
        </div>`,
    },
    10: {
      subject: `4 days left on your trial — here's what you'd lose`,
      html: `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#111">
          <p>Hi ${companyName},</p>
          <p style="color:#555;line-height:1.6">Your K.I.N.D trial ends in <strong>4 days</strong>.</p>
          ${context.lead_count > 0 ? `
          <p style="color:#555;line-height:1.6">
            Right now you have <strong>${context.lead_count} leads</strong> in your pipeline
            ${context.consented_count > 0 ? `and <strong>${context.consented_count} contacts who've consented</strong>` : ''}.
            If your trial ends without a subscription, your pipeline pauses — no new leads, no consent tracking, no outreach.
          </p>` : `
          <p style="color:#555;line-height:1.6">
            Your leads, ICP, and all your settings are still here.
            Subscribe to keep them running.
          </p>`}
          <p style="color:#555;line-height:1.6">
            FIGSY is <strong>$3 per qualified lead</strong> — start from <strong>$60</strong> (a bundle of 20 scored, POPIA-compliant leads). Pay for results, no monthly lock-in.
          </p>
          <a href="${DASH}/billing"
             style="display:inline-block;margin-top:16px;background:#7C3AED;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600">
            Subscribe now →
          </a>
          <p style="color:#999;font-size:0.8rem;margin-top:24px">
            Questions about pricing? Reply to this email.
          </p>
        </div>`,
    },
  }

  const { subject, html } = emails[stage]
  await sendTx({ from: FROM, to, subject, html, lifecycle: true })  // #480
}

export async function sendZeroCreditsWarning(
  to: string,
  companyName: string,
  daysAtZero: number,
) {
  if (!resend) return

  const subject =
    daysAtZero <= 1 ? `Your K.I.N.D credits have run out — top up to keep leads flowing` :
    daysAtZero <= 4 ? `Reminder: your K.I.N.D outreach is paused (${daysAtZero} days)` :
                      `Final reminder — top up credits or your account will be suspended`

  const urgency =
    daysAtZero <= 1 ? `Your credits just ran out.` :
    daysAtZero <= 4 ? `Your credits have been at zero for ${daysAtZero} days.` :
                      `It's been ${daysAtZero} days with zero credits.`

  await sendTx({
    from: FROM,
    to,
    lifecycle: true,   // #480
    subject,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#111">
        <p>Hi ${companyName},</p>
        <p style="color:#555;line-height:1.6">
          ${urgency} All outreach is currently paused — no new leads are being contacted on your behalf.
        </p>
        <p style="color:#555;line-height:1.6">
          Top up your credits now to resume. Your ICP, lead pipeline, and all settings are saved and ready to go.
        </p>
        ${daysAtZero >= 7 ? `
        <p style="color:#dc2626;line-height:1.6">
          <strong>⚠️ Your account will be suspended if no top-up is received in the next 24 hours.</strong>
        </p>` : ''}
        <a href="${DASH}/billing"
           style="display:inline-block;margin-top:16px;background:#7C3AED;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600">
          Top up credits now →
        </a>
        <p style="color:#999;font-size:0.8rem;margin-top:24px">
          Questions? Reply to this email — <a href="mailto:hello@get-kind.com">hello@get-kind.com</a>
        </p>
      </div>
    `,
  })
}

// #337② — low FIGSY credits warning. Sent while the client still has credits
// (1–5 left) so FIGSY keeps selling — a heads-up to top up BEFORE outreach stalls,
// modelled on sendZeroCreditsWarning above.
export async function sendLowCreditsWarning(
  to: string,
  companyName: string,
  remaining: number,
) {
  if (!resend) return

  const subject = `Only ${remaining} credit${remaining === 1 ? '' : 's'} left — top up to keep FIGSY selling`

  await sendTx({
    from: FROM,
    to,
    lifecycle: true,   // #480
    subject,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#111">
        <p>Hi ${companyName},</p>
        <p style="color:#555;line-height:1.6">
          You're down to <strong>${remaining} FIGSY credit${remaining === 1 ? '' : 's'}</strong>. FIGSY keeps
          working your prospects and booking replies right up until your credits run out — but once they hit
          zero, new outreach stops and warm prospects go cold.
        </p>
        <p style="color:#555;line-height:1.6">
          Top up now to keep the pipeline moving. Your ICP, leads, and campaigns stay exactly as they are.
        </p>
        <a href="${DASH}/billing"
           style="display:inline-block;margin-top:16px;background:#7C3AED;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600">
          Top up credits now →
        </a>
        <p style="color:#999;font-size:0.8rem;margin-top:24px">
          Questions? Reply to this email — <a href="mailto:hello@get-kind.com">hello@get-kind.com</a>
        </p>
      </div>
    `,
  })
}

// Sent when FIGSY auto-pauses a campaign for low performance (reply rate < 1%)
export async function sendCampaignPausedEmail(
  to: string,
  companyName: string,
  campaignName: string,
  replyRate: number,
) {
  if (!resend) return

  const replyPct = (replyRate * 100).toFixed(1)

  await sendTx({
    from: FROM,
    to,
    lifecycle: true,   // #480
    subject: `Your campaign "${campaignName}" was paused — let's fix it`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#111">
        <p>Hi ${companyName},</p>
        <p style="color:#555;line-height:1.6">
          I've paused your campaign <strong>"${campaignName}"</strong>. Its reply rate dropped to
          <strong>${replyPct}%</strong> — below the 1% threshold — so I stopped sending to protect your
          sender reputation and avoid wasting credits on a sequence that isn't landing.
        </p>
        <p style="color:#555;line-height:1.6">
          This is usually a quick fix. The most common causes are off-target leads or messaging that
          needs a sharper hook. Tweak your targeting or copy, then reactivate — I'll pick it straight back up.
        </p>
        <a href="${DASH}/figsy"
           style="display:inline-block;margin-top:16px;background:#7C3AED;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600">
          Review &amp; reactivate campaign →
        </a>
        <p style="color:#999;font-size:0.8rem;margin-top:24px">
          Want a hand improving it? Reply to this email — <a href="mailto:hello@get-kind.com">hello@get-kind.com</a>
        </p>
      </div>
    `,
  })
}

// D5 — Weekly leads digest (send every Monday)
export async function sendWeeklyLeadsDigest(
  to: string,
  companyName: string,
  stats: {
    total_leads:       number
    new_this_week:     number
    avg_score:         number
    // ⛓️ 31 Aug — `pipeline_value` REMOVED FROM THE TYPE, not merely unrendered. A field the
    // signature still accepts is a field the next edit can put back on the screen; a field
    // that is not there cannot be. Same reasoning as removing `wallet_balance_usd` from the
    // Milla home's Summary type in 4A-1.
    consented:         number
  },
  topLeads: LeadRow[],
  figsy?: {
    emails_sent:         number
    total_replies:       number
    interested_replies:  number
    active_campaigns:    number
  },
) {
  if (!resend) return

  const weekOf = new Date().toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })

  const replyRatePct = figsy && figsy.emails_sent > 0
    ? Math.round((figsy.total_replies / figsy.emails_sent) * 100)
    : 0

  const figsySection = figsy ? `
          <h2 style="font-size:0.9rem;font-weight:600;color:#111;margin:24px 0 8px">FIGSY Outreach This Week</h2>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:8px;overflow:hidden;margin-bottom:8px">
            <tr>
              <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0">
                <span style="font-size:0.8rem;color:#888">Emails sent</span>
                <p style="margin:2px 0 0;font-weight:700;color:#111">${figsy.emails_sent}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0">
                <span style="font-size:0.8rem;color:#888">Reply rate</span>
                <p style="margin:2px 0 0;font-weight:700;color:#111">${replyRatePct}% <span style="font-weight:400;font-size:0.75rem;color:#888">(industry avg: 3%)</span></p>
              </td>
            </tr>
            <tr>
              <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0">
                <span style="font-size:0.8rem;color:#888">Interested replies</span>
                <p style="margin:2px 0 0;font-weight:700;color:#16a34a">${figsy.interested_replies}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:10px 14px">
                <span style="font-size:0.8rem;color:#888">Active campaigns</span>
                <p style="margin:2px 0 0;font-weight:700;color:#111">${figsy.active_campaigns}</p>
              </td>
            </tr>
          </table>` : ''

  await sendTx({
    from: FROM,
    to,
    lifecycle: true,   // #480
    subject: `Your K.I.N.D weekly leads report — ${weekOf}`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#111;border:1px solid #e8f0fe;border-radius:12px;overflow:hidden">
        ${digestHeader(companyName, stats.total_leads, stats.avg_score)}
        <div style="padding:24px 32px">
          <p style="color:#888;font-size:0.8rem;margin-top:0">Week of ${weekOf}</p>

          ${stats.new_this_week > 0 ? `
          <div style="background:#f0f7ff;border-radius:8px;padding:12px 16px;margin-bottom:20px">
            <p style="margin:0;font-size:0.9rem;color:#7C3AED;font-weight:600">
              +${stats.new_this_week} new lead${stats.new_this_week !== 1 ? 's' : ''} this week
            </p>
          </div>` : ''}

          <div style="display:grid;gap:8px;margin-bottom:24px">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:8px 12px;background:#f9fafb;border-radius:8px">
                  <span style="font-size:0.75rem;color:#888">Consented &amp; contactable</span>
                  <p style="margin:2px 0 0;font-weight:700;color:#16a34a">${stats.consented}</p>
                </td>
                <td width="8"></td>
                <td style="padding:8px 12px;background:#f9fafb;border-radius:8px">
                  <span style="font-size:0.75rem;color:#888">Avg ICP score</span>
                  <p style="margin:2px 0 0;font-weight:700;color:#111">${stats.avg_score}/100</p>
                </td>
              </tr>
            </table>
          </div>

          ${topLeads.length ? `
          <h2 style="font-size:0.9rem;font-weight:600;color:#111;margin:0 0 8px">Top leads by score</h2>
          <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #f0f0f0">
            ${topLeads.slice(0, 10).map(leadCard).join('')}
          </table>` : ''}

          ${figsySection}

          <a href="${DASH}/leads"
             style="display:inline-block;margin-top:24px;background:#7C3AED;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:0.9rem">
            Open my leads dashboard →
          </a>
          <p style="color:#bbb;font-size:0.75rem;margin-top:24px;border-top:1px solid #f5f5f5;padding-top:16px">
            You're receiving this because you have an active K.I.N.D subscription.
            <a href="${DASH}/settings" style="color:#bbb">Manage notifications</a>
          </p>
        </div>
      </div>
    `,
  })
}


/**
 * 🛑 THE ONE COLD-EMAIL DOOR FOR CALLERS OUTSIDE THIS MODULE (I, 10 Sep).
 *
 * ── WHY IT EXISTS ────────────────────────────────────────────────────────────────────────
 *
 * `operator.ts`'s campaign test built its OWN Resend client and called `resend.emails.send`
 * directly with `COLD_FROM` — real cold mail, on the cold identity, to an address the request
 * could name. It checked the kill-switch at the top of the route, which was correct on the
 * day it was written and is exactly the shape R114 calls a convention: the check and the send
 * are twenty lines apart, and nothing makes the second depend on the first.
 *
 * Routing it through here makes the gate structural — the send cannot happen without the
 * question being asked, because they are the same call.
 *
 * @returns false when the kill-switch refused. Never throws: callers already have a refusal
 *          shape and an exception here would escape paths that exist to avoid phantom "sent"
 *          rows.
 */
export async function sendColdEmail(opts: {
  to: string
  subject: string
  text: string
  html?: string
  replyTo?: string
}): Promise<boolean> {
  if (killSwitchBlocks('resend_cold', `${opts.subject} → ${opts.to}`)) return false
  await sendTx({
    from: COLD_FROM,
    to: opts.to,
    subject: opts.subject,
    html: opts.html ?? `<pre style="font:14px/1.5 ui-monospace,monospace;white-space:pre-wrap">${opts.text}</pre>`,
    text: opts.text,
    cold: true,
  })
  return true
}
