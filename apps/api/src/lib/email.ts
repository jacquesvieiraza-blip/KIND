import { Resend } from 'resend'
import { htmlToText } from './deliverability'
import { interpretSend } from './resend-checked'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
const FROM = 'K.I.N.D <hello@get-kind.com>'
const DASH = `${process.env.PORTAL_URL || 'https://app.get-kind.com'}/dashboard`

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
async function sendTx(opts: {
  from?: string
  to: string | string[]
  subject: string
  html: string
  text?: string
}) {
  if (!resend) return
  if (!isRealRecipient(opts.to)) {
    console.log(`[email] skipped non-deliverable recipient: ${Array.isArray(opts.to) ? opts.to.join(', ') : opts.to}`)
    return
  }
  const result = await resend.emails.send({
    from:    opts.from ?? FROM,
    to:      opts.to,
    subject: opts.subject,
    html:    opts.html,
    text:    opts.text ?? htmlToText(opts.html),
  } as Parameters<typeof resend.emails.send>[0])
  // #338 (AR-01) — Resend returns { error } instead of throwing. These transactional
  // mails are best-effort (a failure must not break the signup/billing path they ride
  // on), but the failure must at least be VISIBLE — the old code swallowed it entirely.
  const checked = interpretSend(result)
  if (!checked.ok) {
    console.error(`[email] transactional send failed to ${Array.isArray(opts.to) ? opts.to.join(', ') : opts.to} — "${opts.subject}"`, checked.error)
  }
  return checked.ok
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

function digestHeader(companyName: string, totalLeads: number, avgScore: number, pipelineValue: number): string {
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
          <td align="center" style="padding:8px;border-left:1px solid #e8f0fe">
            <p style="margin:0;font-size:1.5rem;font-weight:700;color:#111">$${pipelineValue.toLocaleString()}</p>
            <p style="margin:2px 0 0;font-size:0.75rem;color:#888">Pipeline value</p>
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

export async function sendWelcomeEmail(to: string, companyName: string) {
  if (!resend) return
  await sendTx({
    from: FROM,
    to,
    subject: 'Welcome to K.I.N.D — your 14-day trial has started',
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#111">
        <h1 style="font-size:1.5rem;margin-bottom:8px">Welcome, ${companyName} 👋</h1>
        <p style="color:#555;line-height:1.6">Your 14-day free trial has started. Here's what to do next:</p>
        <ol style="color:#555;line-height:2">
          <li>Sign your <strong>Service Agreement</strong> in the Documents tab</li>
          <li>Set up your <strong>Ideal Customer Profile</strong> so we know who to find</li>
          <li>Your first leads will appear within 24 hours</li>
        </ol>
        <a href="${DASH}"
           style="display:inline-block;margin-top:16px;background:#7C3AED;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600">
          Go to my dashboard →
        </a>
        <p style="color:#999;font-size:0.8rem;margin-top:32px">
          Questions? Reply to this email or book a call at <a href="mailto:hello@get-kind.com">hello@get-kind.com</a>.
        </p>
      </div>
    `,
  })
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

export async function sendConsentEmail(
  to: string,
  firstName: string,
  senderCompanyName: string,
  optOutUrl: string,
) {
  if (!resend) return
  const consentUrl = `${optOutUrl}?consent=true`
  const declineUrl = `${optOutUrl}?consent=false`
  await sendTx({
    from: FROM,
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
  const pipelineValue = topLeads.reduce((s, l) => s + (l.score ?? 0) * 100, 0)

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
        ${digestHeader(companyName, leadCount, avgScore, pipelineValue)}
        <div style="padding:24px 32px">
          <p style="color:#555;line-height:1.6;margin-top:0">
            We've found <strong>${leadCount} leads</strong> matching your ICP — scored, ranked, and ready.
            ${topLeads.length ? `Here are your top ${Math.min(topLeads.length, 5)}:` : ''}
          </p>
          ${leadsHtml}
          <a href="${DASH}/leads"
             style="display:inline-block;margin-top:24px;background:#7C3AED;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:0.9rem">
            View all ${leadCount} leads →
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
  await sendTx({ from: FROM, to, subject, html })
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
    pipeline_value:    number
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
    subject: `Your K.I.N.D weekly leads report — ${weekOf}`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#111;border:1px solid #e8f0fe;border-radius:12px;overflow:hidden">
        ${digestHeader(companyName, stats.total_leads, stats.avg_score, stats.pipeline_value)}
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
