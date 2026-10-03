// ═══════════════════════════════════════════════════════════════════════════════════════
// DAILY: EVERY PAID PROGRAMME CHECKOUT IS RECORDED ON ITS PROGRAMME — or the founder is told.
//
// ⚑ 2 Oct (#2561 · 14d). The webhook is the only thing that records a programme payment. If it
// never arrives (Stripe gave up retrying, the endpoint was down, a secret was rotated) the
// client has paid and the programme still says it is waiting for money — and nothing anywhere
// noticed. This compares Stripe (the record of the money) with our rows once a day.
//
// ⚠️ IT RECORDS NOTHING AND REFUNDS NOTHING. A payment we did not record may need recording,
// or may be a second payment that needs refunding (R191 — *"Alert me, I refund by hand"*);
// which one is a person's call. It raises one alert per paid session, deduped, so a payment
// that stays unrecorded is one task, not one a day.
//
// ⚠️ A SESSION UNDER AN HOUR OLD IS SKIPPED — its webhook may simply still be on the way.
// ═══════════════════════════════════════════════════════════════════════════════════════

export type PaidCheckout = {
  sessionId: string; programmeId: string; clientId: string | null; stage: 'first' | 'second'
  amountTotal: number | null; currency: string | null; paymentIntentId: string | null; created: number
}
export type ProgrammeRefs = { id: string; first_payment_ref: string | null; second_payment_ref: string | null }

export type Unrecorded = PaidCheckout & { kind: 'missing' | 'other_payment_on_record' | 'no_programme' }

export const GRACE_SECONDS = 60 * 60

export function findUnrecorded(paid: PaidCheckout[], programmes: ProgrammeRefs[], nowUnix: number): Unrecorded[] {
  const byId = new Map(programmes.map(p => [p.id, p]))
  const out: Unrecorded[] = []
  for (const c of paid) {
    if (nowUnix - c.created < GRACE_SECONDS) continue
    const p = byId.get(c.programmeId)
    if (!p) { out.push({ ...c, kind: 'no_programme' }); continue }
    const ref = c.stage === 'first' ? p.first_payment_ref : p.second_payment_ref
    if (ref === c.sessionId) continue
    out.push({ ...c, kind: ref ? 'other_payment_on_record' : 'missing' })
  }
  return out
}

export function unrecordedAlert(u: Unrecorded, companyName: string | null, livemode: boolean) {
  const who = companyName?.trim() || `client ${u.clientId ?? 'unknown'}`
  const paid = typeof u.amountTotal === 'number' ? `${(u.amountTotal / 100).toFixed(2)} ${(u.currency || 'usd').toUpperCase()}` : 'an amount Stripe did not report'
  const link = u.paymentIntentId ? `https://dashboard.stripe.com/${livemode ? '' : 'test/'}payments/${u.paymentIntentId}` : null
  const what = u.kind === 'missing'
    ? `${who} paid the ${u.stage} payment (${paid}) and it was never recorded on their programme — the programme still looks unpaid.`
    : u.kind === 'other_payment_on_record'
      ? `${who} paid the ${u.stage} payment (${paid}) but their programme already has a different payment for that stage — this looks like a double payment to refund.`
      : `${who} paid ${paid} for programme ${u.programmeId}, which could not be found.`
  return {
    subject: u.kind === 'other_payment_on_record'
      ? `${who} paid twice — refund ${paid} in Stripe`
      : `A paid programme payment is not recorded — ${who}`,
    lines: [
      what,
      link ? `Stripe: ${link}` : `Stripe checkout session ${u.sessionId}.`,
      `Programme ${u.programmeId} · session ${u.sessionId}.`,
      'Nothing was recorded or refunded automatically — decide by hand.',
    ],
    // ⚠️ A DOUBLE PAYMENT USES THE SAME KEY AS THE WEBHOOK'S OWN DOUBLE-PAYMENT ALERT (14b), so a
    // payment the webhook already reported collapses into that task rather than filing a second.
    dedupeKey: u.kind === 'other_payment_on_record' ? `double_payment:${u.sessionId}` : `payment_unrecorded:${u.sessionId}`,
  }
}

/** The daily run. Reads Stripe for the last 3 days, compares, alerts. */
export async function reconcileProgrammePayments(now = new Date()): Promise<{
  ok: boolean; checked: number; unrecorded: number; error?: string
}> {
  const { listPaidProgrammeCheckouts } = await import('./stripe')
  const nowUnix = Math.floor(now.getTime() / 1000)
  const paid = await listPaidProgrammeCheckouts(nowUnix - 3 * 86_400)
  if (!paid) return { ok: false, checked: 0, unrecorded: 0, error: 'Stripe could not be read (or is not configured).' }
  if (paid.rows.length === 0) return { ok: true, checked: 0, unrecorded: 0 }

  const { db } = await import('@kind/db')
  const ids = [...new Set(paid.rows.map(r => r.programmeId))]
  const { data, error } = await db.from('programmes').select('id, first_payment_ref, second_payment_ref').in('id', ids)
  if (error) return { ok: false, checked: paid.rows.length, unrecorded: 0, error: `programmes could not be read: ${error.message}` }

  const found = findUnrecorded(paid.rows, (data ?? []) as ProgrammeRefs[], nowUnix)
  const { sendFounderAlert } = await import('./alerts')
  const livemode = (process.env.STRIPE_SECRET_KEY ?? '').startsWith('sk_live')
  for (const u of found) {
    let companyName: string | null = null
    if (u.clientId) {
      const { data: c } = await db.from('clients').select('company_name').eq('id', u.clientId).maybeSingle()
      companyName = (c as { company_name?: string | null } | null)?.company_name ?? null
    }
    const a = unrecordedAlert(u, companyName, livemode)
    await sendFounderAlert('payment_failed', a.subject, a.lines,
      { clientId: u.clientId, programmeId: u.programmeId, dedupeKey: a.dedupeKey })
  }
  if (paid.truncated) console.error('[payment-reconcile] more than 1,000 checkout sessions in 3 days — only the first 1,000 were checked.')
  return { ok: true, checked: paid.rows.length, unrecorded: found.length }
}
