// MBF — SEEDING THE DEMO ACCOUNT (founder-locked 26 Jul).
//
// The cast, the ICP, the sequence and the replies live in demo-mbf-data.ts — pure data, no
// database, unit-tested. This file is the part that writes them.
//
// SAFETY, in layers — this account can never touch a real prospect:
//   • `is_demo = true` is a hard stop inside the send path itself (figsy.ts), not a setting
//     someone can forget: an is_demo client can never email anyone, ever.
//   • Every address is @…mbf-demo.invalid — `.invalid` is reserved by RFC 2606 and can never
//     resolve, so even a bug past every check would die at DNS.
//   • Sourcing for an is_demo client is pool-only at $0, and the nightly cold-check and
//     top-up both skip demos — MBF can sit for months and never cost a cent.

import { db } from '@kind/db'
import {
  MBF_NAME, MBF_MARKER, MBF_CAST, MBF_ICP, MBF_SEQUENCE, MBF_REPLIES, castEmail, canAdoptAsMbf,
} from './demo-mbf-data'

export * from './demo-mbf-data'

/** Days back from "now", so the planted story always reads as recent. */
const ago = (d: number) => new Date(Date.now() - d * 86_400_000).toISOString()
const ahead = (d: number, hour = 10) => {
  const t = new Date(Date.now() + d * 86_400_000)
  t.setUTCHours(hour, 0, 0, 0)
  return t.toISOString()
}

export type SeedResult = {
  client_id: string
  /** Steps that failed. Empty = the demo is fully built. */
  problems: string[]
  leads: number
  approved: number
  waiting: number
  passed: number
  replies: number
  bookings: number
  sent_emails: number
}

/**
 * Find MBF. Returns null when it has never been seeded.
 *
 * Matched on name AND is_demo, so a real client that happens to be called MBF Holdings can
 * never be found, wiped and re-seeded by the reset below. That mistake is unrecoverable.
 */
export async function findMbf(): Promise<{ id: string; user_id: string } | null> {
  const { data } = await db.from('clients')
    .select('id, user_id').eq('company_name', MBF_NAME).eq('is_demo', true).limit(1).maybeSingle()
  return data ? { id: data.id as string, user_id: data.user_id as string } : null
}

export type AdoptCandidate =
  | { kind: 'none' }
  | { kind: 'adoptable'; id: string; user_id: string; name: string }
  | { kind: 'refused'; id: string; name: string; reason: string }

/**
 * Is there an account named "MBF…" that ISN'T the flagged demo, and may we take it over?
 *
 * The live account was called "MBF Demo" and was never flagged `is_demo`, so `findMbf` above
 * could not see it and the demo purge refused to delete it — a row no control in Vida could
 * touch. Rather than mint a duplicate around it, the reset adopts it.
 *
 * The decision itself is `canAdoptAsMbf`, which is pure and tested. This function only
 * gathers the three facts it needs. A refusal is RETURNED, not thrown, so the route can tell
 * the founder which account it declined and why instead of silently creating a second one.
 */
export async function findAdoptableMbf(): Promise<AdoptCandidate> {
  const { isMbfAccount } = await import('./integrity-checks')
  const { data } = await db.from('clients').select('id, user_id, company_name, is_demo').limit(500)
  const cand = ((data ?? []) as { id: string; user_id: string; company_name: string | null; is_demo: boolean | null }[])
    .find(c => isMbfAccount(c.company_name) && c.is_demo !== true)
  if (!cand) return { kind: 'none' }

  const [{ count: purchases }, { count: realEmails }] = await Promise.all([
    db.from('credit_transactions').select('id', { count: 'exact', head: true })
      .eq('client_id', cand.id).in('type', ['purchase', 'credit_purchase', 'wallet_topup']),
    db.from('leads').select('id', { count: 'exact', head: true })
      .eq('client_id', cand.id).not('email', 'ilike', `%${MBF_MARKER}`).not('email', 'is', null),
  ])

  const verdict = canAdoptAsMbf({
    nameMatchesMbf: true,
    purchaseCount: purchases ?? 0,
    realEmailLeadCount: realEmails ?? 0,
  })
  const name = cand.company_name ?? '(unnamed)'
  return verdict.ok
    ? { kind: 'adoptable', id: cand.id, user_id: cand.user_id, name }
    : { kind: 'refused', id: cand.id, name, reason: verdict.reason }
}

/**
 * Take the account over: flag it `is_demo` and give it the canonical name.
 *
 * `is_demo` goes on FIRST and on its own. It is the hard stop inside the send path, so it is
 * the one write that must land before anything else touches this account — if the rename
 * succeeded and the flag didn't, we would have an account called "MBF Holdings" that can
 * still email real people, which is worse than what we started with.
 */
export async function adoptAsMbf(clientId: string): Promise<{ ok: boolean; error?: string }> {
  const { error: flagErr } = await db.from('clients').update({ is_demo: true }).eq('id', clientId)
  if (flagErr) return { ok: false, error: `could not flag it as a demo: ${flagErr.message}` }
  const { error: nameErr } = await db.from('clients').update({ company_name: MBF_NAME }).eq('id', clientId)
  if (nameErr) return { ok: false, error: `flagged as a demo, but the rename failed: ${nameErr.message}` }
  return { ok: true }
}

/**
 * Delete everything MBF owns, leaving the client row and its login intact.
 *
 * Scoped to the client id every single time — there is no unscoped delete in this function,
 * because a missing `.eq('client_id', …)` here would empty the production tables.
 */
export async function wipeMbf(clientId: string): Promise<void> {
  const { data: leads } = await db.from('leads').select('id').eq('client_id', clientId).limit(2000)
  const leadIds = (leads ?? []).map((l: { id: string }) => l.id)
  const { data: camps } = await db.from('figsy_campaigns').select('id').eq('client_id', clientId).limit(100)
  const campIds = (camps ?? []).map((c: { id: string }) => c.id)

  // Children first — anything holding a lead_id or campaign_id goes before the parents.
  if (campIds.length > 0) {
    await db.from('figsy_sent_emails').delete().in('campaign_id', campIds).then(() => {}, () => {})
  }
  await db.from('figsy_replies').delete().eq('client_id', clientId).then(() => {}, () => {})
  await db.from('calendar_bookings').delete().eq('client_id', clientId).then(() => {}, () => {})
  await db.from('figsy_enrollments').delete().eq('client_id', clientId).then(() => {}, () => {})
  await db.from('outcome_events').delete().eq('client_id', clientId).then(() => {}, () => {})
  await db.from('figsy_approval_queue').delete().eq('client_id', clientId).then(() => {}, () => {})
  if (leadIds.length > 0) await db.from('leads').delete().in('id', leadIds).then(() => {}, () => {})
  await db.from('figsy_sequences').delete().eq('client_id', clientId).then(() => {}, () => {})
  await db.from('figsy_campaigns').delete().eq('client_id', clientId).then(() => {}, () => {})
  await db.from('icps').delete().eq('client_id', clientId).then(() => {}, () => {})
  await db.from('credit_transactions').delete().eq('client_id', clientId).then(() => {}, () => {})
  await db.from('sourcing_ledger').delete().eq('client_id', clientId).then(() => {}, () => {})
}

/**
 * Build MBF from nothing — or rebuild it to exactly the same state.
 *
 * Idempotent by wipe-then-seed: the reset between demos and the first-ever seed run the
 * same code, so there is no "second run looks different" failure mode. Requires an existing
 * client row (created once by the route below) because `clients.user_id` is NOT NULL and
 * minting auth users is not this function's job.
 */
export async function seedMbf(clientId: string): Promise<SeedResult> {
  await wipeMbf(clientId)

  // ⚠️ EVERY WRITE BELOW IS CHECKED. The first version used `.then(() => {}, () => {})`
  // fifteen times, so a step that silently failed left a HALF-SEEDED demo that looked built
  // — and you'd find out mid-pitch. Failures are collected and returned, so the button says
  // "8 of 9 steps" instead of a confident green tick over a broken account.
  const problems: string[] = []
  const step = async (what: string, run: () => PromiseLike<{ error?: unknown } | void>) => {
    try {
      const r = await run()
      const err = (r as { error?: unknown } | undefined)?.error
      if (err) problems.push(`${what}: ${(err as { message?: string }).message ?? String(err)}`)
    } catch (e) {
      problems.push(`${what}: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  // ── Paid, so nothing shows a $99 banner mid-demo ────────────────────────────────
  // A manual_grant counts as paid everywhere (PAID_TX_TYPES) which activates the 100-lead
  // pack — so every approval you make on stage reads "included", not "$4 charged".
  await db.from('credit_transactions').insert({
    client_id: clientId, type: 'manual_grant', amount: 99, plan: 'work_model',
    reference: `mbf_demo_grant_${clientId}`,
    note: 'MBF demo account — onboarding pack, no money moved',
  })

  // ── The ICP, and the campaign born with it ──────────────────────────────────────
  const { data: icp, error: icpErr } = await db.from('icps')
    .insert({ ...MBF_ICP, client_id: clientId, is_active: true }).select('id').single()
  if (icpErr) throw new Error(`MBF icp insert failed: ${icpErr.message}`)

  const approvedCount = MBF_CAST.filter(c => c.state === 'approved').length
  const { data: camp, error: campErr } = await db.from('figsy_campaigns').insert({
    client_id: clientId, icp_id: icp.id, name: 'Ops leaders · Q3', status: 'active',
    // emails_sent is computed below from the rows we actually insert. It was hardcoded to
    // 38 against 24 real rows, so the campaign header and the Engine counters disagreed —
    // and on a demo the first number a prospect distrusts is one that contradicts another.
    leads_enrolled: approvedCount, replies_total: MBF_REPLIES.length,
    meetings_booked: MBF_REPLIES.filter(r => r.booked).length, steps_count: MBF_SEQUENCE.length,
    settings: { review_required: true }, copilot_mode: true, approve_before_send: true,
  }).select('id').single()
  if (campErr) throw new Error(`MBF campaign insert failed: ${campErr.message}`)

  await db.from('figsy_sequences').insert({
    client_id: clientId, name: 'Ops leaders · 3-step', steps: MBF_SEQUENCE,
  })

  // ── The people ──────────────────────────────────────────────────────────────────
  // status/timestamps carry the story: approved = revealed and being worked, waiting =
  // surfaced and masked (this is what you demo), passed = declined at no cost.
  const rows = MBF_CAST.map((c, i) => ({
    client_id: clientId,
    icp_id: icp.id,
    first_name: c.first,
    last_name: c.last,
    email: castEmail(c),
    job_title: c.title,
    company: c.company,
    industry: c.industry,
    country: c.country,
    company_size: c.size,
    score: c.score,
    score_reasoning: `Runs operations at a ${c.size}-person ${c.industry.toLowerCase()} business in ${c.country} — the exact profile in your ICP, and senior enough to sign off.`,
    status: c.state === 'passed' ? 'passed' : c.state === 'approved' ? 'contacted' : 'scored',
    delivered_at: ago(9 - Math.min(8, Math.floor(i / 5))),
    surfaced_for_approval_at: c.state === 'passed' ? null : ago(8 - Math.min(7, Math.floor(i / 6))),
    revealed_at: c.state === 'approved' ? ago(7 - Math.min(6, Math.floor(i / 3))) : null,
  }))
  const { data: leads, error: leadErr } = await db.from('leads').insert(rows).select('id')
  if (leadErr) throw new Error(`MBF leads insert failed: ${leadErr.message}`)
  const leadIds = (leads ?? []).map((l: { id: string }) => l.id)

  // ── The money story: 12 approvals, all inside the pack ──────────────────────────
  // $0 rows, exactly as a real pack approval writes them, so the ledger and the "included"
  // counter agree with each other on screen.
  const packRows = MBF_CAST.map((c, i) => ({ c, i })).filter(x => x.c.state === 'approved')
    .map(({ c, i }, n) => ({
      client_id: clientId, type: 'usage', amount: 0, plan: 'work_model',
      reference: `pack_${leadIds[i]}`,
      note: `Onboarding pack — approval ${n + 1} of 100 · ${c.first} ${c.last} at ${c.company}`,
      created_at: ago(7 - Math.min(6, Math.floor(i / 3))),
    }))
  if (packRows.length) await step('pack ledger rows', () => db.from('credit_transactions').insert(packRows))

  // Sourcing at $0 — a demo never buys data, and the ledger should say so.
  await step('sourcing ledger', () => db.from('sourcing_ledger').insert({
    client_id: clientId, records: MBF_CAST.length, cost_usd: 0,
  }))

  // ── Enrolments + sent history for the approved twelve ───────────────────────────
  const approvedIdx = MBF_CAST.map((c, i) => ({ c, i })).filter(x => x.c.state === 'approved')
  const enrolRows = approvedIdx.map(({ i }) => ({
    client_id: clientId, campaign_id: camp.id, lead_id: leadIds[i],
    current_step: i % 3 === 0 ? 3 : i % 3 === 1 ? 2 : 1,
    status: 'active', enrolled_at: ago(7 - Math.min(6, Math.floor(i / 3))),
  }))
  await step('enrolments', () => db.from('figsy_enrollments').insert(enrolRows))

  // 38 sends across the twelve — step 1 to everyone, step 2 to most, step 3 to a few.
  const sentRows: Array<Record<string, unknown>> = []
  for (const { i } of approvedIdx) {
    const steps = i % 3 === 0 ? 3 : i % 3 === 1 ? 2 : 1
    for (let s = 1; s <= steps; s++) {
      const sentAt = ago(Math.max(1, 7 - s * 2))
      // opened_at on roughly 3 in 5 — the Engine's open rate reads
      // `count(opened_at not null) / count(sent)`, so leaving it null showed 0% opened
      // next to 24 sends, which reads as a broken product rather than a healthy one.
      // Deterministic (every third is left unopened), never random.
      const opened = (i + s) % 3 !== 0
      sentRows.push({
        campaign_id: camp.id, lead_id: leadIds[i], step: s,
        subject: MBF_SEQUENCE[s - 1].subject.replace('Rivo', MBF_CAST[i].company.split(' ')[0]),
        body: MBF_SEQUENCE[s - 1].body
          .replace(/\{\{first_name\}\}/g, MBF_CAST[i].first)
          .replace(/\{\{company\}\}/g, MBF_CAST[i].company),
        status: 'sent', sent_at: sentAt,
        opened_at: opened ? new Date(new Date(sentAt).getTime() + 5 * 3600_000).toISOString() : null,
      })
    }
  }
  if (sentRows.length) await step('sent emails', () => db.from('figsy_sent_emails').insert(sentRows))

  // The campaign header must agree with the rows. Written AFTER the sends exist so it can
  // never drift from them again.
  await step('campaign send counter', () => db.from('figsy_campaigns').update({ emails_sent: sentRows.length }).eq('id', camp.id))

  // ── The inbox ───────────────────────────────────────────────────────────────────
  const replyRows = MBF_REPLIES.map(r => {
    const c = MBF_CAST[r.castIndex]
    return {
      client_id: clientId, campaign_id: camp.id, lead_id: leadIds[r.castIndex],
      from_email: castEmail(c), from_name: `${c.first} ${c.last}`,
      subject: `Re: ${MBF_SEQUENCE[0].subject.replace('Rivo', c.company.split(' ')[0])}`,
      body: r.body, body_text: r.body,
      classification: r.classification,
      qualified_at: r.booked ? ago(r.daysAgo) : null,
      meeting_booked_at: r.booked ? ago(r.daysAgo) : null,
      received_at: ago(r.daysAgo),
    }
  })
  await step('replies', () => db.from('figsy_replies').insert(replyRows))

  // ── Two meetings in the diary, both still ahead ─────────────────────────────────
  const bookingRows = MBF_REPLIES.filter(r => r.booked).map((r, n) => {
    const c = MBF_CAST[r.castIndex]
    return {
      client_id: clientId, lead_id: leadIds[r.castIndex],
      meeting_title: `${MBF_NAME} × ${c.company} — intro`,
      start_time: ahead(n === 0 ? 2 : 4, 9 + n),
      end_time: ahead(n === 0 ? 2 : 4, 9 + n).replace(/T(\d{2})/, (_m, h) => `T${String(Number(h)).padStart(2, '0')}`),
      status: 'confirmed', rebook_count: 0,
    }
  }).map(b => ({ ...b, end_time: new Date(new Date(b.start_time).getTime() + 30 * 60_000).toISOString() }))
  await step('bookings', () => db.from('calendar_bookings').insert(bookingRows))

  // ── The trail the Reports/ROI screens read ──────────────────────────────────────
  const events: Array<Record<string, unknown>> = []
  for (const { i } of approvedIdx) {
    events.push({ client_id: clientId, campaign_id: camp.id, lead_id: leadIds[i],
      event_type: 'lead_delivered', channel: 'email', payload: {}, occurred_at: ago(8) })
    events.push({ client_id: clientId, campaign_id: camp.id, lead_id: leadIds[i],
      event_type: 'email_sent', channel: 'email', payload: { step: 1 }, occurred_at: ago(6) })
  }
  for (const r of MBF_REPLIES) {
    events.push({ client_id: clientId, campaign_id: camp.id, lead_id: leadIds[r.castIndex],
      event_type: 'reply_received', channel: 'email',
      payload: { classification: r.classification }, occurred_at: ago(r.daysAgo) })
    if (r.booked) events.push({ client_id: clientId, campaign_id: camp.id, lead_id: leadIds[r.castIndex],
      event_type: 'meeting_booked', channel: 'email', payload: {}, occurred_at: ago(r.daysAgo) })
  }
  await step('outcome events', () => db.from('outcome_events').insert(events))

  if (problems.length > 0) console.error('[MBF] seeded with problems:', problems)
  return {
    client_id: clientId,
    problems,
    leads: MBF_CAST.length,
    approved: approvedCount,
    waiting: MBF_CAST.filter(c => c.state === 'waiting').length,
    passed: MBF_CAST.filter(c => c.state === 'passed').length,
    replies: MBF_REPLIES.length,
    bookings: MBF_REPLIES.filter(r => r.booked).length,
    sent_emails: sentRows.length,
  }
}

/**
 * PURGE A DEMO CLIENT — actually delete it, rows and all.
 *
 * `DELETE /admin/demos/:id` only ever set `demo_expires_at`, so "Delete" removed nothing:
 * the client row stayed, its leads stayed, and on the legacy Apollo demos that meant real
 * strangers' names and companies stayed in the database — the exact thing the one-demo rule
 * exists to stop. The button said "cannot be undone" over a no-op.
 *
 * REFUSES anything that is not flagged `is_demo`. That check is the whole safety of this
 * function: it is the only place in the codebase that deletes a client row, and a real
 * client deleted here is unrecoverable.
 */
export async function purgeDemoClient(clientId: string): Promise<{ purged: boolean; reason?: string }> {
  const { data: c } = await db.from('clients')
    .select('id, is_demo, user_id, company_name').eq('id', clientId).maybeSingle()
  if (!c) return { purged: false, reason: 'No such client.' }
  if (c.is_demo !== true) return { purged: false, reason: 'Refusing — that client is not a demo account.' }

  // Everything the client owns, children first (same order as the MBF reset).
  await wipeMbf(clientId)
  // Rows wipeMbf does not touch because MBF never has them, but a legacy demo might.
  for (const t of ['figsy_memory', 'client_inboxes', 'subscriptions', 'push_subscriptions', 'milla_messages', 'milla_sessions', 'operator_audit_log']) {
    await db.from(t).delete().eq('client_id', clientId).then(() => {}, () => {})
  }
  const { error } = await db.from('clients').delete().eq('id', clientId).eq('is_demo', true)
  if (error) return { purged: false, reason: error.message }

  // The throwaway auth user goes too, so a deleted demo cannot be signed into.
  if (c.user_id) await db.auth.admin.deleteUser(c.user_id as string).then(() => {}, () => {})
  console.log(`[demo] purged ${c.company_name ?? clientId} — client row and all owned rows deleted`)
  return { purged: true }
}
