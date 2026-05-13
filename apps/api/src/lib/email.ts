import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
const FROM = 'K.I.N.D <hello@get-kind.com>'
const DASH = 'https://app.get-kind.com/dashboard'

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
    <div style="background:#0066FF;border-radius:12px 12px 0 0;padding:28px 32px">
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

export async function sendWelcomeEmail(to: string, companyName: string) {
  if (!resend) return
  await resend.emails.send({
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
           style="display:inline-block;margin-top:16px;background:#0066FF;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600">
          Go to my dashboard →
        </a>
        <p style="color:#999;font-size:0.8rem;margin-top:32px">
          Questions? Reply to this email or book a call at <a href="mailto:hello@get-kind.com">hello@get-kind.com</a>.
        </p>
      </div>
    `,
  })
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
  await resend.emails.send({
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

  await resend.emails.send({
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
             style="display:inline-block;margin-top:24px;background:#0066FF;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:0.9rem">
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
) {
  if (!resend) return

  const weekOf = new Date().toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })

  await resend.emails.send({
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
            <p style="margin:0;font-size:0.9rem;color:#0066FF;font-weight:600">
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

          <a href="${DASH}/leads"
             style="display:inline-block;margin-top:24px;background:#0066FF;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:0.9rem">
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
