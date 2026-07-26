// THE PROBES — the actual questions the System check asks of the live system.
//
// Split from `system-check.ts` (the row/state vocabulary) so the vocabulary is unit-testable
// without a database or a network, and the probes stay readable as a list of questions.
//
// Every probe is cheap and READ-ONLY. Provider probes use the smallest free endpoint each
// vendor offers — never a paid call, never a send.

import { db } from '@kind/db'
import { ok, broken, unmeasured, probe, type Row, type Section } from './system-check'

/** Short timeout — a hanging provider must not hang the whole report. */
const TIMEOUT_MS = 6000

async function fetchWithTimeout(url: string, init: RequestInit = {}): Promise<Response> {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  try { return await fetch(url, { ...init, signal: ctrl.signal }) }
  finally { clearTimeout(t) }
}

// ── DEPENDENCIES ────────────────────────────────────────────────────────────────
// Key present AND the provider actually answers. A set key that has been revoked looks
// identical to a good one until something calls it, which is why presence alone is never OK.

async function dependencies(): Promise<Section> {
  const rows: Row[] = []

  rows.push(await probe('Database (Supabase)', async () => {
    const { error } = await db.from('clients').select('id', { count: 'exact', head: true })
    return error
      ? broken('Database (Supabase)', `The database did not answer: ${error.message}`, 'Nothing works without this — check Supabase status and SUPABASE_URL / SERVICE_ROLE_KEY.')
      : ok('Database (Supabase)', 'Answered a live query.')
  }))

  rows.push(await probe('Stripe', async () => {
    const key = process.env.STRIPE_SECRET_KEY
    if (!key) return broken('Stripe', 'STRIPE_SECRET_KEY is not set — no client can pay.', 'Set it in Railway → @kind/api → Variables.')
    const r = await fetchWithTimeout('https://api.stripe.com/v1/balance', { headers: { Authorization: `Bearer ${key}` } })
    return r.ok ? ok('Stripe', 'Key is live and Stripe answered.')
      : broken('Stripe', `Stripe rejected the key (HTTP ${r.status}) — payments will fail.`, 'Check the key in the Stripe dashboard.')
  }))

  rows.push(await probe('Resend (transactional + inbound replies)', async () => {
    const key = process.env.RESEND_API_KEY
    if (!key) return broken('Resend', 'RESEND_API_KEY is not set — no transactional mail, and inbound replies cannot be fetched.', 'Set it in Railway.')
    const r = await fetchWithTimeout('https://api.resend.com/domains', { headers: { Authorization: `Bearer ${key}` } })
    return r.ok ? ok('Resend', 'Key is live and Resend answered.')
      : broken('Resend', `Resend rejected the key (HTTP ${r.status}).`, 'Check the key in the Resend dashboard.')
  }))

  rows.push(await probe('Anthropic (scoring + writing)', async () => {
    const key = process.env.ANTHROPIC_API_KEY
    if (!key) return broken('Anthropic', 'ANTHROPIC_API_KEY is not set — no lead scoring and no email writing.', 'Set it in Railway.')
    const r = await fetchWithTimeout('https://api.anthropic.com/v1/models', {
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    })
    return r.ok ? ok('Anthropic', 'Key is live and Anthropic answered.')
      : broken('Anthropic', `Anthropic rejected the key (HTTP ${r.status}).`, 'Check the key.')
  }))

  rows.push(await probe('PDL (sourcing)', async () => {
    const key = process.env.PDL_API_KEY
    if (!key) return broken('PDL', 'PDL_API_KEY is not set — nothing can be sourced.', 'Set it in Railway.')
    return unmeasured('PDL', 'Key is set. Not called: every PDL request costs money, so this report will not spend to prove a key works.',
      'Vida → Engine has a read-only PDL test that spends nothing.')
  }))

  rows.push(await probe('Hunter (email fallback)', async () => {
    const key = process.env.HUNTER_API_KEY
    if (!key) return unmeasured('Hunter', 'HUNTER_API_KEY is not set. Hunter is the fallback when PDL has no email — without it, some approvals will find no address.', 'Optional, but it lowers the dead-email rate.')
    const r = await fetchWithTimeout(`https://api.hunter.io/v2/account?api_key=${encodeURIComponent(key)}`)
    return r.ok ? ok('Hunter', 'Key is live and Hunter answered.')
      : broken('Hunter', `Hunter rejected the key (HTTP ${r.status}).`, 'Check the key.')
  }))

  rows.push(await probe('Instantly (OUR outreach)', async () => {
    const key = process.env.INSTANTLY_API_KEY
    if (!key) return unmeasured('Instantly (OUR outreach)',
      'INSTANTLY_API_KEY is not set. Confirmed 26 Jul: Instantly does not release SMTP credentials, so our own outreach must be driven through their API — which needs this key.',
      'Instantly → Settings → Integrations → API Keys → Create, then store as INSTANTLY_API_KEY in Railway.')
    const r = await fetchWithTimeout('https://api.instantly.ai/api/v2/accounts', { headers: { Authorization: `Bearer ${key}` } })
    return r.ok ? ok('Instantly (OUR outreach)', 'Key is live and Instantly answered.')
      : broken('Instantly (OUR outreach)', `Instantly rejected the key (HTTP ${r.status}).`, 'Regenerate the key in Instantly → Settings → Integrations.')
  }))

  rows.push(await probe('Smartlead (CLIENT sending)', async () => {
    const key = process.env.SMARTLEAD_API_KEY
    if (!key) return unmeasured('Smartlead (CLIENT sending)',
      'SMARTLEAD_API_KEY is not set. Founder-decided 26 Jul: not purchased until a client pays — so this is expected, not a fault.',
      'Nothing to do until the first paying client.')
    const base = process.env.SMARTLEAD_BASE_URL || 'https://server.smartlead.ai/api/v1'
    const r = await fetchWithTimeout(`${base}/email-accounts?api_key=${encodeURIComponent(key)}&limit=1`)
    return r.ok ? ok('Smartlead (CLIENT sending)', 'Key is live and Smartlead answered.')
      : broken('Smartlead (CLIENT sending)', `Smartlead rejected the key (HTTP ${r.status}).`, 'Check the key.')
  }))

  return { title: 'Dependencies — is every service we rely on actually answering?', side: 'both', rows }
}

// ── SCHEMA ──────────────────────────────────────────────────────────────────────
// Which migrations are ACTUALLY applied in production. This is the permanent answer to
// "the Engine card said Running… and nobody ever saw what it finished as."

const REQUIRED_SCHEMA: Array<{ table: string; column?: string; why: string; migration: string }> = [
  { table: 'clients', column: 'wallet_balance_usd', why: 'the one wallet — every charge reads it', migration: '20260724_one_wallet' },
  { table: 'clients', column: 'contact_name', why: 'who we are speaking to (flow v2 step 0)', migration: '20260726_client_contact_name' },
  { table: 'client_inboxes', why: 'which mailbox a client sends from — no table, no sending', migration: '20260725_client_inboxes' },
  { table: 'client_inboxes', column: 'smtp_pass_enc', why: 'the encrypted mailbox password', migration: '20260726_inbox_smtp' },
  { table: 'credit_transactions', column: 'reference', why: 'the once-per-lead charge guard', migration: 'baseline' },
  { table: 'leads', column: 'revealed_at', why: 'the atomic approve claim + the pack counter', migration: 'baseline' },
  { table: 'leads', column: 'delivered_at', why: 'whether the client can SEE a surfaced lead', migration: 'baseline' },
  { table: 'figsy_enrollments', why: 'a paid lead must land in a sequence', migration: 'baseline' },
  { table: 'figsy_replies', why: 'inbound replies', migration: 'baseline' },
  { table: 'calendar_bookings', why: 'booked meetings — the outcome the client buys', migration: 'baseline' },
  { table: 'opt_out_blocklist', why: 'never email someone who said stop', migration: 'baseline' },
  { table: 'operator_audit_log', why: 'who did what in Vida', migration: 'baseline' },
]

async function schema(): Promise<Section> {
  const rows: Row[] = []
  for (const req of REQUIRED_SCHEMA) {
    const label = req.column ? `${req.table}.${req.column}` : req.table
    rows.push(await probe(label, async () => {
      const { error } = await db.from(req.table).select(req.column ?? 'id', { count: 'exact', head: true }).limit(1)
      if (!error) return ok(label, `Present — ${req.why}.`)
      return broken(label, `MISSING in production: ${error.message}. Consequence: ${req.why}.`,
        `Run migration ${req.migration} from Vida → Engine → Database migrations.`)
    }))
  }
  return { title: 'Database — which migrations are ACTUALLY applied in production', side: 'both', rows }
}

// ── CLIENTS ─────────────────────────────────────────────────────────────────────
// The question that decides whether a paying client is being delivered.

async function clients(): Promise<Section> {
  const rows: Row[] = []
  const { data: cs, error } = await db.from('clients')
    .select('id, company_name, is_demo, wallet_balance_usd').limit(200)
  if (error) return { title: 'Clients', side: 'milla', rows: [unmeasured('Clients', `Could not read the client list: ${error.message}`)] }

  const { pickSendingInbox } = await import('./sending-inbox')
  const { secretState } = await import('./inbox-secret')
  const { packState } = await import('./onboarding-pack')
  const { PAID_TX_TYPES } = await import('./onboarding-pack')
  const secretOk = secretState().ok

  for (const c of (cs ?? []) as { id: string; company_name: string | null; is_demo: boolean | null }[]) {
    const name = c.company_name || c.id.slice(0, 8)
    rows.push(await probe(name, async () => {
      const [{ count: paid }, { count: approved }, { count: awaiting }, boxes, camp] = await Promise.all([
        db.from('credit_transactions').select('id', { count: 'exact', head: true }).eq('client_id', c.id).in('type', PAID_TX_TYPES),
        db.from('leads').select('id', { count: 'exact', head: true }).eq('client_id', c.id).not('revealed_at', 'is', null),
        db.from('leads').select('id', { count: 'exact', head: true }).eq('client_id', c.id).is('revealed_at', null).neq('status', 'passed'),
        db.from('client_inboxes').select('id, email, kind, status, smtp_host, smtp_port, smtp_secure, smtp_user, smtp_pass_enc, from_name').eq('client_id', c.id),
        db.from('figsy_campaigns').select('status').eq('client_id', c.id).eq('status', 'active').limit(1).maybeSingle(),
      ])
      const hasPaid = (paid ?? 0) > 0
      const pack = packState(hasPaid, approved ?? 0)
      const send = pickSendingInbox((boxes.data ?? []) as never, secretOk)
      const facts = [
        hasPaid ? 'paid' : 'NOT paid',
        `${approved ?? 0} approved`,
        pack.active ? `${pack.left}/${pack.included} included left` : 'no pack',
        `${awaiting ?? 0} awaiting a decision`,
        camp.data ? 'campaign active' : 'NO active campaign',
      ].join(' · ')

      if (c.is_demo) return ok(`${name} (demo)`, `${facts} · demo account — cannot send by design.`)
      if (!hasPaid) return ok(name, `${facts} — nothing owed to them yet.`)
      if (!send.ok) {
        const { refusalLabel } = await import('./sending-inbox')
        return broken(name, `PAID BUT CANNOT SEND — ${refusalLabel(send.reason)}. ${facts}`, send.detail)
      }
      if ((awaiting ?? 0) === 0 && hasPaid) {
        return broken(name, `Paid, can send, but has NOBODY left to approve. ${facts}`, 'Source more for them — a paying client with an empty desk cannot spend.')
      }
      return ok(name, `Can send from ${send.inbox.email}. ${facts}`)
    }))
  }
  if (rows.length === 0) rows.push(ok('Clients', 'No clients yet.'))
  return { title: 'Clients — can each one be paid by, and delivered to?', side: 'milla', rows }
}

// ── VIDA ────────────────────────────────────────────────────────────────────────
// If Vida lies, the operator makes the wrong move and the client pays for it.

async function vida(): Promise<Section> {
  const rows: Row[] = []

  rows.push(await probe('Kill-switch (AUTO_OUTREACH_ENABLED)', async () => {
    const on = process.env.AUTO_OUTREACH_ENABLED === 'true'
    return ok('Kill-switch (AUTO_OUTREACH_ENABLED)',
      on ? 'ON — outreach WILL send to real prospects.' : 'OFF — nothing sends to a real prospect. This is the safe default.')
  }))

  rows.push(await probe('Mailbox passwords readable (INBOX_SECRET_KEY)', async () => {
    const { secretState } = await import('./inbox-secret')
    const s = secretState()
    return s.ok ? ok('Mailbox passwords readable', 'INBOX_SECRET_KEY is set and well-formed.')
      : broken('Mailbox passwords readable', `INBOX_SECRET_KEY is ${s.reason} — every SMTP send is refused because the password cannot be decrypted.`,
        'Railway → @kind/api → Variables → INBOX_SECRET_KEY (openssl rand -hex 32).')
  }))

  rows.push(await probe('MBF demo ready', async () => {
    // MATCH ON *ANY* DEMO NAMED MBF, not the exact string `MBF Holdings`.
    // The live account is called "MBF Demo", so an exact-match lookup reported "the MBF demo
    // account does not exist" while it was sitting right there in the client list. The
    // conclusion happened to be useful (it has no leads) but the stated reason was false —
    // and a report that is right by accident is not a report.
    const { isMbfAccount } = await import('./integrity-checks')
    const { data: all } = await db.from('clients').select('id, company_name, is_demo')
    const mbf = ((all ?? []) as { id: string; company_name: string | null; is_demo: boolean | null }[])
      .find(c => isMbfAccount(c.company_name))
    if (!mbf) return broken('MBF demo ready', 'No account with MBF in its name exists — there is nothing to demo with.', 'Vida → Engine → Build / reset MBF.')
    if (!mbf.is_demo) return broken('MBF demo ready', `"${mbf.company_name}" exists but is NOT flagged is_demo — the hard stop that prevents it sending is not in place.`, 'Rebuild it from Vida → Engine.')
    const [{ count: total }, { count: waiting }, { count: real }] = await Promise.all([
      db.from('leads').select('id', { count: 'exact', head: true }).eq('client_id', mbf.id),
      db.from('leads').select('id', { count: 'exact', head: true }).eq('client_id', mbf.id).is('revealed_at', null).neq('status', 'passed'),
      db.from('leads').select('id', { count: 'exact', head: true }).eq('client_id', mbf.id).not('email', 'ilike', '%.invalid'),
    ])
    if ((real ?? 0) > 0) return broken('MBF demo ready', `${real} MBF lead(s) have a REAL email address. A demo must never be able to reach a real person.`, 'Rebuild MBF from Vida → Engine.')
    if ((waiting ?? 0) < 20) return broken('MBF demo ready', `Only ${waiting} people are waiting to be picked — the minimum-20 gate cannot be demonstrated.`, 'Reset MBF before demoing.')
    return ok('MBF demo ready', `${total} invented people, ${waiting} waiting to be picked, every address .invalid. Ready to demo.`)
  }))

  rows.push(await probe('Stray demo / test accounts', async () => {
    const { data } = await db.from('clients').select('id, company_name').eq('is_demo', true)
    const strays = (data ?? []).filter((c: { company_name: string | null }) => c.company_name !== 'MBF Holdings')
    return strays.length === 0
      ? ok('Stray demo / test accounts', 'One demo environment only — MBF, as locked.')
      : broken('Stray demo / test accounts', `${strays.length} demo account(s) besides MBF are cluttering the client list: ${strays.map((s: { company_name: string | null }) => s.company_name ?? '(unnamed)').join(', ')}.`, 'Delete them in Vida → Demo.')
  }))

  rows.push(await probe('Operator audit log', async () => {
    const { data, error } = await db.from('operator_audit_log')
      .select('action, created_at').order('created_at', { ascending: false }).limit(5)
    if (error) return broken('Operator audit log', `Cannot be read: ${error.message} — there is no record of who did what.`)
    if ((data ?? []).length === 0) return unmeasured('Operator audit log', 'No rows yet, so it cannot be confirmed that operator actions are being recorded.', 'Take one action in Vida and re-run this check.')
    return ok('Operator audit log', `Recording. Last ${data!.length}: ${data!.map((r: { action: string }) => r.action).join(', ')}.`)
  }))

  rows.push(await probe('PDL monthly spend cap', async () => {
    const { data } = await db.from('app_settings').select('key, value').eq('key', 'pdl_monthly_cap_usd').maybeSingle()
    return data
      ? ok('PDL monthly spend cap', `Capped at $${(data as { value: unknown }).value} a month — sourcing cannot run away.`)
      : unmeasured('PDL monthly spend cap', 'No pdl_monthly_cap_usd setting found; the code default applies.', 'Confirm the default is what you want before sourcing at volume.')
  }))

  return { title: 'Vida — can the operator actually run a client?', side: 'vida', rows }
}

// ── ACTIVITY ────────────────────────────────────────────────────────────────────

async function activity(): Promise<Section> {
  const rows: Row[] = []
  const since = new Date(Date.now() - 7 * 864e5).toISOString()
  rows.push(await probe('Sending activity (7 days)', async () => {
    const [{ count: sent }, { count: bounced }, { count: replies }] = await Promise.all([
      db.from('figsy_sent_emails').select('id', { count: 'exact', head: true }).gte('sent_at', since),
      db.from('figsy_sent_emails').select('id', { count: 'exact', head: true }).gte('sent_at', since).eq('status', 'bounced'),
      db.from('figsy_replies').select('id', { count: 'exact', head: true }).gte('received_at', since),
    ])
    const rate = (sent ?? 0) > 0 ? Math.round(((bounced ?? 0) / (sent ?? 1)) * 1000) / 10 : 0
    if ((sent ?? 0) === 0) return ok('Sending activity (7 days)', 'Nothing sent in the last 7 days — expected while the kill-switch is off.')
    return rate >= 3
      ? broken('Sending activity (7 days)', `${sent} sent, ${bounced} bounced (${rate}%) — above 3% is burning the sending domain.`, 'Pause sending and check the list quality.')
      : ok('Sending activity (7 days)', `${sent} sent · ${bounced} bounced (${rate}%) · ${replies} replies.`)
  }))
  return { title: 'Activity — what the machine actually did', side: 'both', rows }
}

// ── EVERY OPERATOR ENDPOINT — answering, or erroring? ───────────────────────────
//
// The founder's spec asked for this and the first build skipped it. If a Vida endpoint 500s,
// the page that uses it renders EMPTY — and an empty page is indistinguishable from "nothing
// to do" (#565). So the console can look calm while half of it is dead.
//
// It calls each one for real, over HTTP, against this same process. Read-only GETs ONLY —
// never a POST, so nothing can be started, sent, charged or changed by running this check.
//
// What counts as answering: any 2xx or 4xx. A 400 for a missing `client_id` is the route
// working correctly — it received the request and made a decision. Only a 5xx, a timeout or
// a refused connection means broken.

/** Read-only GETs that need no parameters. Anything requiring an id is listed with a note. */
const OPERATOR_GETS: Array<{ path: string; note?: string }> = [
  { path: '/clients' }, { path: '/worklist' }, { path: '/alerts' }, { path: '/status' },
  { path: '/engine' }, { path: '/audit' }, { path: '/whoami' }, { path: '/health' },
  { path: '/queue' }, { path: '/suppression' }, { path: '/reports' }, { path: '/blockers' },
  { path: '/bookings' }, { path: '/nexus' }, { path: '/cockpit', note: 'expects client_id' },
  { path: '/board', note: 'expects client_id' }, { path: '/people', note: 'expects client_id' },
  { path: '/asks', note: 'expects client_id' }, { path: '/record', note: 'expects client_id' },
  { path: '/source-preview', note: 'expects client_id' },
]

async function operatorEndpoints(): Promise<Section> {
  const rows: Row[] = []
  const port = process.env.PORT || '3001'
  const key = process.env.ADMIN_SECRET_KEY
  if (!key) {
    return { title: 'Vida endpoints — is every operator route answering?', side: 'vida', rows: [
      unmeasured('Operator endpoints', 'ADMIN_SECRET_KEY is not set, so these routes cannot be called even by us.',
        'Set it in Railway → @kind/api → Variables.'),
    ] }
  }

  for (const ep of OPERATOR_GETS) {
    rows.push(await probe(ep.path, async () => {
      const ctrl = new AbortController()
      const t = setTimeout(() => ctrl.abort(), 8000)
      try {
        const r = await fetch(`http://127.0.0.1:${port}/operator${ep.path}`, {
          headers: { 'x-admin-key': key }, signal: ctrl.signal,
        })
        if (r.status >= 500) {
          const body = await r.text().catch(() => '')
          return broken(ep.path, `HTTP ${r.status} — this route is ERRORING. Any Vida screen using it renders empty, which looks identical to "nothing to do". ${body.slice(0, 160)}`,
            'Check the API logs for this route.')
        }
        return ok(ep.path, `HTTP ${r.status} — answering${ep.note ? ` (${ep.note}, so a 4xx here is correct)` : ''}.`)
      } catch (e) {
        return broken(ep.path, `Did not answer at all: ${e instanceof Error ? e.message : String(e)}`,
          'The route is unreachable or hung — Vida screens using it will be blank.')
      } finally { clearTimeout(t) }
    }))
  }
  return { title: 'Vida endpoints — is every operator route answering?', side: 'vida', rows }
}

/** Every section, in report order. Never throws. */
export async function runSystemCheck(): Promise<Section[]> {
  return [
    await dependencies(), await schema(), await clients(),
    await vida(), await operatorEndpoints(), await activity(),
  ]
}
