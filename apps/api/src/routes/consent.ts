import { Router, Request, Response } from 'express'
import { db } from '@kind/db'

export const consentRouter = Router()

function page(title: string, emoji: string, message: string, bg: string) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${title} — K.I.N.D</title>
</head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f9fafb;margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px;">
  <div style="text-align:center;max-width:420px;background:white;border-radius:20px;padding:48px 32px;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
    <div style="font-size:48px;margin-bottom:20px;">${emoji}</div>
    <h1 style="font-size:22px;font-weight:700;color:#111827;margin:0 0 12px;">${title}</h1>
    <p style="color:#6B7280;font-size:14px;line-height:1.7;margin:0 0 32px;">${message}</p>
    <div style="background:${bg};border-radius:10px;padding:14px;margin-bottom:24px;">
      <p style="font-size:11px;color:#6B7280;margin:0;">POPIA Compliant · Your preference has been recorded.</p>
    </div>
    <p style="font-size:11px;color:#9CA3AF;margin:0;">
      K.I.N.D Intelligence (Pty) Ltd ·
      <a href="mailto:privacy@kindai.com" style="color:#0066FF;text-decoration:none;">privacy@kindai.com</a>
    </p>
  </div>
</body>
</html>`
}

// GET /consent/:token/accept
consentRouter.get('/:token/accept', async (req: Request, res: Response) => {
  try {
    const { data: lead } = await db
      .from('leads')
      .select('id, client_id, status, first_name')
      .eq('consent_token', req.params.token)
      .maybeSingle()

    if (!lead) {
      res.status(404).send(page('Link not found', '🔍', 'This consent link is invalid or has already expired.', '#fee2e2'))
      return
    }

    if (lead.status !== 'consent_sent') {
      res.send(page('Already recorded', '✓', 'Your response has already been recorded. Thank you.', '#dbeafe'))
      return
    }

    await db.from('leads').update({
      status: 'consent_given',
      consent_given_at: new Date().toISOString(),
    }).eq('id', lead.id)

    await db.from('consent_log').insert({
      lead_id: lead.id,
      client_id: lead.client_id,
      event: 'given',
      channel: 'email',
      ip_address: req.ip ?? null,
    })

    res.send(page(
      'Thank you!',
      '✅',
      'Your consent has been recorded. You may now be contacted by the company who requested to connect with you. You can withdraw consent at any time by emailing privacy@kindai.com.',
      '#dcfce7'
    ))
  } catch (err) {
    console.error('Consent accept error:', err)
    res.status(500).send(page('Error', '⚠️', 'Something went wrong. Please try again or contact privacy@kindai.com.', '#fee2e2'))
  }
})

// GET /consent/:token/decline
consentRouter.get('/:token/decline', async (req: Request, res: Response) => {
  try {
    const { data: lead } = await db
      .from('leads')
      .select('id, client_id, status')
      .eq('consent_token', req.params.token)
      .maybeSingle()

    if (!lead) {
      res.status(404).send(page('Link not found', '🔍', 'This consent link is invalid or has already expired.', '#fee2e2'))
      return
    }

    if (lead.status === 'rejected') {
      res.send(page('Already recorded', '✓', 'Your opt-out has already been recorded.', '#dbeafe'))
      return
    }

    await db.from('leads').update({ status: 'rejected' }).eq('id', lead.id)

    await db.from('consent_log').insert({
      lead_id: lead.id,
      client_id: lead.client_id,
      event: 'withdrawn',
      channel: 'email',
      ip_address: req.ip ?? null,
    })

    res.send(page(
      'Opt-out confirmed',
      '🛡️',
      'Your preference has been recorded. You will not be contacted further. Your details have been permanently suppressed in compliance with POPIA.',
      '#dcfce7'
    ))
  } catch (err) {
    console.error('Consent decline error:', err)
    res.status(500).send(page('Error', '⚠️', 'Something went wrong. Please try again or contact privacy@kindai.com.', '#fee2e2'))
  }
})
