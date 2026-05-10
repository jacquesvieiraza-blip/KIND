import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendConsentEmail({
  to,
  leadFirstName,
  clientName,
  token,
  apiBaseUrl,
}: {
  to: string
  leadFirstName: string
  clientName: string
  token: string
  apiBaseUrl: string
}): Promise<void> {
  const acceptUrl = `${apiBaseUrl}/consent/${token}/accept`
  const declineUrl = `${apiBaseUrl}/consent/${token}/decline`
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@kindai.com'

  const { error } = await resend.emails.send({
    from: `K.I.N.D on behalf of ${clientName} <${fromEmail}>`,
    to,
    subject: `Permission to contact you — ${clientName}`,
    html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f9fafb;margin:0;padding:40px 20px;">
  <div style="max-width:520px;margin:0 auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
    <div style="background:#0066FF;padding:20px 32px;">
      <span style="color:white;font-weight:800;font-size:18px;letter-spacing:-0.5px;">K.I.N.D</span>
    </div>
    <div style="padding:32px;">
      <p style="font-size:16px;font-weight:600;color:#111827;margin:0 0 16px;">Hi ${leadFirstName},</p>
      <p style="font-size:14px;color:#374151;line-height:1.7;margin:0 0 16px;">
        <strong>${clientName}</strong> would like permission to contact you about their products and services.
        This request is managed by <strong>K.I.N.D Intelligence</strong>, a POPIA-compliant B2B lead platform.
      </p>
      <p style="font-size:13px;color:#6B7280;line-height:1.7;margin:0 0 28px;">
        By clicking "Yes, you may contact me", you consent to ${clientName} reaching out to you for legitimate
        business purposes. You may withdraw this consent at any time.
      </p>
      <div style="text-align:center;margin-bottom:28px;">
        <a href="${acceptUrl}" style="display:inline-block;background:#16a34a;color:white;font-weight:600;font-size:14px;padding:14px 28px;border-radius:8px;text-decoration:none;margin-right:8px;">
          ✓ Yes, you may contact me
        </a>
        <a href="${declineUrl}" style="display:inline-block;background:#f3f4f6;color:#374151;font-weight:500;font-size:13px;padding:14px 20px;border-radius:8px;text-decoration:none;">
          No thank you
        </a>
      </div>
      <div style="border-top:1px solid #f3f4f6;padding-top:20px;">
        <p style="font-size:11px;color:#9CA3AF;line-height:1.6;margin:0;">
          This consent request complies with the Protection of Personal Information Act 4 of 2013 (POPIA).
          Your professional contact details were sourced from publicly available B2B directories.
          If you decline, your details will be permanently suppressed and you will not receive further messages.
          <br><br>
          K.I.N.D Intelligence (Pty) Ltd &middot;
          <a href="mailto:privacy@kindai.com" style="color:#0066FF;text-decoration:none;">privacy@kindai.com</a>
        </p>
      </div>
    </div>
  </div>
</body>
</html>`,
  })

  if (error) throw new Error(`Resend error: ${JSON.stringify(error)}`)
}
