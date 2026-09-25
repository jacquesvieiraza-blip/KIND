// THE PROBES — the actual questions the System check asks of the live system.
//
// Split from `system-check.ts` (the row/state vocabulary) so the vocabulary is unit-testable
// without a database or a network, and the probes stay readable as a list of questions.
//
// Every probe is cheap and READ-ONLY. Provider probes use the smallest free endpoint each
// vendor offers — never a paid call, never a send.

import { findLeadCredits } from './apollo-credits'
// ⛓️ 18 Sep (Batch 1b) — probe hosts from `provider-hosts.ts`; every default is the literal
// that was inlined here, so an unset environment probes production exactly as before.
import { apolloBase, resendBase, stripeBase } from './provider-hosts'
import { db } from '@kind/db'
import { ok, broken, unmeasured, probe, type Row, type Section } from './system-check'
import { PDL_MONTHLY_CAP_KEY } from './app-settings'

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
    const r = await fetchWithTimeout(`${stripeBase()}/v1/balance`, { headers: { Authorization: `Bearer ${key}` } })
    return r.ok ? ok('Stripe', 'Key is live and Stripe answered.')
      : broken('Stripe', `Stripe rejected the key (HTTP ${r.status}) — payments will fail.`, 'Check the key in the Stripe dashboard.')
  }))

  rows.push(await probe('Resend (transactional + inbound replies)', async () => {
    const key = process.env.RESEND_API_KEY
    if (!key) return broken('Resend', 'RESEND_API_KEY is not set — no transactional mail, and inbound replies cannot be fetched.', 'Set it in Railway.')
    const r = await fetchWithTimeout(`${resendBase()}/domains`, { headers: { Authorization: `Bearer ${key}` } })
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

  // ── ⛓️ 17 Sep (FD-6) — WAS TWO PDL ROWS: 'PDL (sourcing)' AND 'PDL tier (R26 — unlock day)'
  //
  // Both are retired with the provider. **"PDL IS NOT A PAID/ACTIVE PROVIDER FOR MVP1. We are
  // not paying for PDL."** A System page that reported `PDL_API_KEY is not set — nothing can be
  // sourced` was stating the opposite of the truth: with FD-6, PDL_API_KEY being unset is the
  // CORRECT state, and a red row for a deliberate absence trains an operator to ignore the
  // page. The R26 tier row described buying a $98/mo plan on unlock day — a plan nobody is
  // buying.
  //
  // What replaces them is the row that actually decides whether anybody gets leads: our Apollo
  // account, and how many lead credits are left in this cycle.

  rows.push(await probe('Apollo (the only lead source)', async () => {
    const key = process.env.APOLLO_API_KEY
    if (!key) {
      return broken('Apollo (the only lead source)',
        'APOLLO_API_KEY is not set. Apollo is the ONLY lead source (FD-6) — nothing can be sourced, for Proof or for a programme.',
        'Set APOLLO_API_KEY in Railway → @kind/api → Variables.')
    }
    // People Search costs NOTHING (the credit is the email reveal), so unlike the retired PDL
    // row this one can actually prove the key works without spending. It asks for one record.
    const r = await fetchWithTimeout(`${apolloBase()}/mixed_people/api_search`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': key },
      body: JSON.stringify({ page: 1, per_page: 1 }),
    })
    if (r.ok) return ok('Apollo (the only lead source)', 'Key is live and Apollo answered. People Search costs no credit; the reveal does.')
    if (r.status === 401 || r.status === 403) {
      return broken('Apollo (the only lead source)', `Apollo rejected the key (HTTP ${r.status}).`,
        'Regenerate it in Apollo → Settings → Integrations → API, then re-paste into Railway.')
    }
    return broken('Apollo (the only lead source)', `Apollo answered HTTP ${r.status}.`,
      'Check status.apollo.io, then the key. Every client run sources zero until this clears.')
  }))

  // ── XC-8 / J14-C1 · THE CREDIT BALANCE, READ-ONLY ───────────────────────────────────
  //
  // The one number that decides whether a Proof set or a programme batch can be delivered,
  // and nothing in the product had ever read it. "Apollo credits ran out" was discoverable
  // only by a run failing.
  //
  // ⚠️ IT REPORTS WHAT IT READ, OR NOT-MEASURED — NEVER A GUESS. If the usage endpoint answers
  // in a shape this code does not recognise, the row says so and names the endpoint. A
  // fabricated balance on this page is worse than no balance: the release checklist reads it.
  rows.push(await probe('Apollo credits (this cycle)', async () => {
    const key = process.env.APOLLO_API_KEY
    if (!key) {
      return unmeasured('Apollo credits (this cycle)',
        'No APOLLO_API_KEY, so the balance cannot be read. See the row above.',
        'Set APOLLO_API_KEY in Railway → @kind/api → Variables.')
    }
    const r = await fetchWithTimeout(`${apolloBase()}/usage_stats/api_usage_stats`, {
      headers: { 'x-api-key': key },
    })
    if (!r.ok) {
      return unmeasured('Apollo credits (this cycle)',
        `Apollo's usage endpoint answered HTTP ${r.status}, so the balance is UNKNOWN — not zero, and not fine.`,
        'Read it by hand at Apollo → Settings → Credits, and note it before any certification run.')
    }
    const body = await r.json().catch(() => null) as unknown
    const found = findLeadCredits(body)
    if (!found) {
      return unmeasured('Apollo credits (this cycle)',
        'Apollo answered, but not in a shape this probe recognises, so no number is reported rather than a wrong one. Endpoint: /api/v1/usage_stats/api_usage_stats.',
        'Read the balance at Apollo → Settings → Credits and note it before any certification run.')
    }
    const left = found.limit - found.used
    if (left <= 0) {
      return broken('Apollo credits (this cycle)',
        `ZERO lead credits left (${found.used} of ${found.limit} used). Every reveal fails, so no Proof set and no programme batch can be delivered.`,
        'Top up at Apollo → Settings → Billing. Until then Vida raises a Needs-you task on every refused run.')
    }
    // ⚑ 25 Sep (R166 ⑥ · P2) — AND WHERE OUR OWN BUDGET STOPS, so the row says both numbers.
    const { APOLLO_BUDGET_SHARE } = await import('./apollo-budget')
    const stopAt = Math.floor(found.limit * APOLLO_BUDGET_SHARE)
    return ok('Apollo credits (this cycle)',
      `${left} lead credit(s) left this cycle (${found.used} of ${found.limit} used). A reveal costs one; People Search costs nothing. Our budget stops paid reveals at ${stopAt} (80%)${found.used >= stopAt ? ' — REACHED: reveals are held until the next cycle.' : '.'}`)
  }))

  // ── ⛓️ 17 Sep — HUNTER IS RETIRED, AND THE ROW SAYS SO INSTEAD OF PROBING IT ────────
  //
  // FD-5: *"Hunter remains LOCKED OFF. Do not silently re-enable Hunter."* The old row read
  // `HUNTER_API_KEY is not set. Hunter is the fallback when PDL has no email` and offered
  // "Optional, but it lowers the dead-email rate" as the action — an invitation to set a key
  // the founder had deliberately removed (workbook APOLLO-011). A System page that recommends
  // undoing a founder lock is worse than one that omits the row.
  //
  // ⚠️ AND IT IS CHECKED-OK, NOT NOT-MEASURED. "Hunter is off" is a fact this page CAN
  // establish, and it is the desired state. Grading a correct configuration as unmeasured
  // would leave a permanent amber row that everybody learns to skip.
  rows.push(await probe('Hunter (retired)', async () => {
    const key = process.env.HUNTER_API_KEY
    if (!key) {
      return ok('Hunter (retired)',
        'HUNTER_API_KEY is unset, which is the CORRECT state. FD-5 locks Hunter off; the enrichment waterfall refuses it in code, so a key would not re-enable it either.')
    }
    return broken('Hunter (retired)',
      'HUNTER_API_KEY IS SET. FD-5 locks Hunter off. The code refuses to call it regardless, so nothing is being spent — but a key nobody expects to exist is a key somebody will act on.',
      'Remove HUNTER_API_KEY from Railway → @kind/api → Variables.')
  }))

  rows.push(await probe('Instantly (OUR outreach)', async () => {
    const key = process.env.INSTANTLY_API_KEY
    if (!key) return unmeasured('Instantly (OUR outreach)',
      'INSTANTLY_API_KEY is not set. Confirmed 26 Jul: Instantly does not release SMTP credentials, so our own outreach must be driven through their API — which needs this key.',
      'Instantly → Settings → Integrations → API Keys → Create, then store as INSTANTLY_API_KEY in Railway.')
    // Uses the real client (#593), so this row and the send path can never disagree about
    // whether Instantly is reachable — and the key is scrubbed from anything rendered.
    const { listAccounts } = await import('./instantly')
    const r = await listAccounts()
    return r.ok
      ? ok('Instantly (OUR outreach)', `Key is live and Instantly answered — ${r.data.length} mailbox(es) connected.`)
      : broken('Instantly (OUR outreach)', r.error,
        r.error.includes('Growth plan')
          ? 'This is a PLAN limit, not a code fault. API v2 needs Instantly Growth or above.'
          : 'Regenerate the key in Instantly → Settings → Integrations.')
  }))

  // MAILBOXES + WARMUP — the prompt asked for these by name. They are the five already-warm
  // AirMail boxes, and whether they are warm is the difference between sending and burning a
  // domain, so the row states what it could and could not establish separately.
  rows.push(await probe('Instantly mailboxes + warmup', async () => {
    const { instantlyConfigured, listAccounts, warmupAnalytics } = await import('./instantly')
    if (!instantlyConfigured()) {
      return unmeasured('Instantly mailboxes + warmup', 'INSTANTLY_API_KEY is not set, so the mailbox list cannot be read.',
        'Instantly → Settings → Integrations → API Keys → Create, then store as INSTANTLY_API_KEY in Railway.')
    }
    const accts = await listAccounts()
    if (!accts.ok) return broken('Instantly mailboxes + warmup', accts.error, 'Check the key and the plan.')
    if (accts.data.length === 0) {
      return broken('Instantly mailboxes + warmup', 'The key works, but NO mailboxes are connected — there is nothing to send from.',
        'Connect the warmed mailboxes in Instantly.')
    }
    const emails = accts.data.map(a => a.email).filter(Boolean)
    const warm = await warmupAnalytics(emails)
    return warm.ok
      ? ok('Instantly mailboxes + warmup', `${emails.length} mailbox(es): ${emails.slice(0, 6).join(', ')}. Warmup analytics answered.`)
      : unmeasured('Instantly mailboxes + warmup',
        `${emails.length} mailbox(es) connected: ${emails.slice(0, 6).join(', ')}. WARMUP could NOT be read (${warm.error}), so do not treat these as warm on this row's say-so.`,
        'Check warmup in the Instantly UI before the first send.')
  }))

  rows.push(await probe('Smartlead (CLIENT sending)', async () => {
    const key = process.env.SMARTLEAD_API_KEY
    // ⚠️ 13 Aug — R25 SUPERSEDED THIS ROW'S TRIGGER. It said "not purchased until a client
    // PAYS (founder-decided 26 Jul)". R25 (12 Aug) moved it earlier and made it unconditional:
    // *"day 1 a client needs to use the system. full stop"* — the plan is bought THE DAY A
    // CLIENT IS IN THE WORKS, before they pay, so month one can send at all.
    if (!key) return unmeasured('Smartlead (CLIENT sending)',
      'SMARTLEAD_API_KEY is not set. Expected until unlock day, not a fault: R25 (12 Aug) buys the plan the day a client is IN THE WORKS — before they pay — so nothing leaks pre-revenue.',
      'On unlock day: docs/UNLOCK-DAY-RUNBOOK.md. ⚠️ Buy the tier WITH API access — the previous key 401d, and a 401 here means the plan, not the key.')
    const base = process.env.SMARTLEAD_BASE_URL || 'https://server.smartlead.ai/api/v1'
    const r = await fetchWithTimeout(`${base}/email-accounts?api_key=${encodeURIComponent(key)}&limit=1`)
    if (r.ok) return ok('Smartlead (CLIENT sending)', 'Key is live and Smartlead answered — month-one client sending can run.')
    // 401 is the DIAGNOSTIC case, not a generic failure: the key exists but the plan tier does
    // not carry API access, which is exactly what blocked #550 and what R25 tells the founder
    // to buy past. Saying "check the key" would send him to re-copy a key that is already right.
    if (r.status === 401 || r.status === 403) {
      return broken('Smartlead (CLIENT sending)',
        `Smartlead refused the key (HTTP ${r.status}). A key IS set, so this is almost certainly the PLAN TIER, not a typo — API access is a paid tier and the old key failed this exact way.`,
        'Upgrade to the Smartlead tier WITH API access, then re-paste the key into Railway → @kind/api → SMARTLEAD_API_KEY. Steps: docs/UNLOCK-DAY-RUNBOOK.md.')
    }
    return broken('Smartlead (CLIENT sending)', `Smartlead rejected the key (HTTP ${r.status}).`, 'Check the key in Smartlead → Settings → API.')
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
  // ADDED AFTER THIS CHECK MISSED IT. The schema section reported all 12 rows green while
  // `figsy_campaigns.copilot_mode` did not exist in production — and the founder found out by
  // pressing Build / reset MBF and getting *"Could not find the 'copilot_mode' column"*. The
  // list is only as good as what is on it, so a green schema section was never a statement
  // about the schema; it was a statement about these twelve lines.
  //
  // These two are the human-in-the-loop gate — they hold a campaign's emails for manual
  // approval. `start-work.ts:50` writes both when work begins for a REAL client, so the same
  // insert would have failed for the first paying client, not only the demo.
  { table: 'figsy_campaigns', column: 'copilot_mode', why: 'holds a campaign\'s emails for manual approval — written for every real client at start-work', migration: '20260726_campaign_copilot_columns' },
  { table: 'figsy_campaigns', column: 'approve_before_send', why: 'the other half of the same gate', migration: '20260726_campaign_copilot_columns' },
  // Added with the work that needs them, rather than after the next time the list is found
  // to be short. Every one of these is a migration whose absence is SILENT in normal use —
  // which is exactly the kind this section exists to catch.
  { table: 'icps', column: 'pdl_scroll_token', why: 'where PDL paging got to — without it every run re-reads page one and a repeat client sources ZERO new people', migration: '20260727_pdl_cursor' },
  // ⚠️ #630 — `column: 'job'` IS LOAD-BEARING, DO NOT DROP IT BACK TO THE DEFAULT.
  // `cron_claims` has a composite primary key `(job, slot)` and **no `id` column** at all, so the
  // `req.column ?? 'id'` default below asks for a column that cannot exist. PostgREST answers
  // that with a COLUMN error — and the old failure branch called every error "MISSING in
  // production". The founder ran all 14 migrations on 6 Aug, watched them succeed, and this row
  // still told him the double-send guard was absent.
  // ⚑ 28 Aug — BUILD-002, ADDED AFTER THE FOUNDER'S LIVE WALKTHROUGH FOUND THEM MISSING.
  // The programme migration registered `settle_programme_batch` in REQUIRED_FUNCTIONS but
  // put neither table here, so System reported the function green while saying nothing at
  // all about the two tables the whole commercial model is stored in. That is this list's
  // recurring failure mode, and the `copilot_mode` note above records the last time: a green
  // schema section is never a statement about the schema, only about the lines on this list.
  //
  // ⚠️ AND THE FUNCTION PROBE DOES NOT COVER THEM EITHER — not even by accident.
  // `settle_programme_batch` is probed with a uuid matching no batch. Its first statement
  // reads `programme_batches`, so a green there does incidentally prove THAT table exists —
  // but it then hits `IF v_prog IS NULL THEN RETURN 0` and returns BEFORE the
  // `UPDATE public.programmes`, so it proves nothing whatsoever about `programmes`.
  // Relying on that would be inferring a table's existence from a code path that never
  // touches it.
  { table: 'programmes', column: 'sourcing_ceiling', why: 'BUILD-002 — the programme itself: price, payment stages and the sourcing authority a client paid for. Without it every programme read fails and no programme can be created', migration: '20260828_programme_money_engine' },
  { table: 'programme_batches', column: 'granted', why: 'BUILD-002 — controlled ~250-lead execution. Without it a reservation can never be settled, so delivered volume is never converted and released entitlement is stranded', migration: '20260828_programme_money_engine' },
  { table: 'cron_claims', column: 'job', why: 'the cron single-run guard — without it two replicas double every email and every charge', migration: '20260727_cron_claims' },
]

/**
 * A uuid that matches no row, used to prove a function EXISTS without changing anything.
 * The all-zero uuid is valid syntax and can never be a real primary key.
 */
const NO_SUCH_ROW_UUID = '00000000-0000-0000-0000-000000000000'

/**
 * Functions the product calls at runtime and cannot see the absence of.
 *
 * #383 — this list exists because a missing FUNCTION was undetectable here while a missing
 * table or column was caught immediately. That asymmetry hid a real defect for a month.
 */
type FunctionProbe = {
  name: string
  why: string
  migration: string
  /** Provably no-op arguments. Null = this function CANNOT be called safely; see `unprobeable`. */
  args: Record<string, unknown> | null
  /** Set when args is null: the reason, printed to the reader instead of a verdict. */
  unprobeable?: string
}

/**
 * EVERY function the product calls at runtime — all 13, verified by grepping `db.rpc(`
 * across apps/api/src on 13 Aug.
 *
 * ⚠️ THIS LIST WAS ONE ENTRY LONG UNTIL TODAY, AND THAT WAS THE WHOLE PROBLEM.
 * #383 added the send counter here after a missing function shipped undetected for 33 days —
 * but the other twelve, including **every function that moves a client's money**, stayed
 * invisible in exactly the same way. Twelve of the thirteen were also never in the runner
 * (`pending-migrations.ts`), so their presence in production rests on manual applies nobody
 * can now verify. This page is where that question gets asked.
 *
 * ── HOW EACH PROBE WAS CHOSEN: I read the function's SQL and picked arguments that cannot
 * write. Two safe shapes, and nothing else was accepted:
 *   1. A GUARD CLAUSE that returns before any write — `IF p_amount <= 0 THEN RETURN` is the
 *      function's own first statement, so 0 can never reach an UPDATE.
 *   2. A WHERE that matches no row — the all-zeros uuid exists nowhere, so the UPDATE affects
 *      zero rows. A successful call proves existence; nothing changes.
 * A function that satisfies neither is NOT probed. It gets a row saying so, following the PDL
 * precedent on this same page ("this report will not spend to prove a key works"). A health
 * check that writes rows or moves money is not a health check.
 */
const REQUIRED_FUNCTIONS: FunctionProbe[] = [
  // ── The send path ────────────────────────────────────────────────────────────────
  {
    name: 'increment_figsy_emails_sent',
    args: { campaign_id: NO_SUCH_ROW_UUID },              // WHERE id = nothing → 0 rows
    why: "the atomic send counter — without it every send falls through to a fallback, and the client's 'emails sent' figure is computed the slow way",
    migration: '20260710_increment_emails_sent',
  },
  // ── The money path. These are the ones that were invisible. ──────────────────────
  {
    name: 'try_charge_figsy_credit',
    args: { p_client_id: NO_SUCH_ROW_UUID },              // UPDATE … WHERE id = nothing → false
    why: 'the atomic enrol charge — the decrement IS the gate, and without it a lead can be enrolled without being paid for',
    migration: '20260707_money_integrity',
  },
  {
    name: 'increment_figsy_credits',
    args: { p_client_id: NO_SUCH_ROW_UUID, p_amount: 0 }, // no matching row, and +0 is identity
    why: 'grants and reversals of FIGSY credits — without it a refund silently does nothing',
    migration: '20260616_billing_correctness',
  },
  {
    name: 'try_charge_wallet',
    args: { p_client_id: NO_SUCH_ROW_UUID, p_amount: 0 }, // guard: `p_amount <= 0 → RETURN false`
    why: "the $4 approval charge — the guarded decrement that stops a client being charged more than their wallet holds. This is the function the client's money actually moves through",
    migration: '20260724_one_wallet',
  },
  {
    name: 'increment_wallet',
    args: { p_client_id: NO_SUCH_ROW_UUID, p_amount: 0 }, // guard: `p_amount = 0 → RETURN`
    why: 'wallet top-ups and reversals — without it a refund never reaches the balance the client reads',
    migration: '20260724_one_wallet',
  },
  {
    name: 'record_reveal_or_refund',
    args: null,
    unprobeable:
      'Its FIRST statement is an INSERT with no guard, and the conflict branch credits a wallet. ' +
      'There is no argument set that proves it exists without writing a row — so this report does not call it. ' +
      'Same rule as the PDL key below: a check that spends or writes is not a check.',
    why: 'the charge-once ledger for revealed contacts — it decides whether a $4 stands or is returned',
    migration: '20260710_charge_once',
  },
  {
    name: 'reveal_is_owned',
    args: { p_client_id: NO_SUCH_ROW_UUID, p_email_norm: 'probe@system-probe.invalid' },
    why: 'the "have they already paid for this contact?" check — without it a client can be charged twice for the same person',
    migration: '20260710_charge_once',
  },
  // ── The sourcing fences — what stops PDL spend running away ──────────────────────
  {
    name: 'try_spend_sourcing',
    args: { p_client_id: NO_SUCH_ROW_UUID, p_requested: 0 },  // guard: `p_requested <= 0 → RETURN 0`
    why: 'the fail-closed sourcing gate — every PDL record we buy passes through it, and without it the monthly cap is unenforced',
    migration: '20260711_sourcing_fences',
  },
  {
    // BUILD-003 PR2 — the atomic batch claim. Probed with a UUID that matches no programme, so
    // the `FOR UPDATE` locks nothing and the INSERT fails its foreign key without ever creating
    // a batch. What is being asked is only "does this function exist?" — if it does not,
    // `openBatch` returns null on every call and programme sourcing silently never starts.
    name: 'claim_programme_batch',
    args: { p_programme_id: NO_SUCH_ROW_UUID, p_requested: 0, p_granted: 0 },
    why: 'the atomic programme batch claim — without it every batch claim fails, programme sourcing never starts, and (if an older read-MAX-then-insert were restored) two workers could open two running batches against one paid ceiling',
    migration: '20260829_programme_delivery_control',
  },
  {
    // HOUSE-009 — the programme-authority reserve, split out of `try_spend_sourcing` so a
    // provider we already paid for (Apollo, on the house path) can reserve entitlement
    // without a fabricated PDL cost row. Probed with a UUID matching no programme, so
    // `IF v_status IS NULL THEN RETURN 0` answers before any UPDATE.
    //
    // ⚠️ ITS ABSENCE IS SILENT AND EXPENSIVE. If the migration has not run, every house
    // reservation returns nothing, `grantedSize` is 0 and house sourcing simply stops — with
    // a log line about programme authority and no other symptom.
    name: 'try_reserve_programme_sourcing',
    args: { p_programme_id: NO_SUCH_ROW_UUID, p_requested: 0 },
    why: 'reserves programme sourcing volume against the ceiling and the 250 batch cap WITHOUT writing PDL money — the house path\'s only accounting, and the single implementation of the ceiling that try_spend_sourcing also calls',
    migration: '20260907_programme_sourcing_authority',
  },
  {
    // HOUSE-009 repair — accounts for prospects a programme was ALREADY delivered while the
    // house path bypassed the accounting. Operator-invoked for ONE named programme; it adds a
    // settled batch and stamps those leads, and deletes nothing.
    //
    // ⚠️ SAFE TO PROBE. With a uuid matching no programme, `SELECT client_id INTO v_client …
    // IF v_client IS NULL THEN RETURN 0` answers before any count, any batch insert or any
    // lead is touched — the same shape as the two probes around it.
    name: 'reconcile_programme_sourcing',
    args: { p_programme_id: NO_SUCH_ROW_UUID },
    why: 'the only way to account for the 246 House prospects delivered before the accounting existed — without it the operator door returns "function does not exist" and the programme keeps reporting 0 used against a run that really happened',
    migration: '20260907_programme_sourcing_authority',
  },
  {
    // BUILD-002 — the reserve/release settle. Probed with a UUID that matches no batch, so
    // the `IF v_prog IS NULL THEN RETURN 0` guard answers without touching any programme.
    name: 'settle_programme_batch',
    args: { p_batch_id: NO_SUCH_ROW_UUID, p_delivered: 0 },
    why: 'converts a programme sourcing reservation into used volume and RELEASES the rest — without it a provider returning nothing permanently burns volume the client paid for',
    migration: '20260828_programme_money_engine',
  },
  {
    name: 'add_sourcing_allowance',
    args: { p_client_id: NO_SUCH_ROW_UUID, p_records: 0 },    // guard: `p_records <= 0 → RETURN 0`
    why: 'the accrual side of the same fence — without it a paying client never earns the allowance their payment bought',
    migration: '20260711_sourcing_fences',
  },
  // ── The free-proof acquisition fence — a SEPARATE budget from the paid one above ──
  // These three are what stop an unpaid prospect costing more than 40 PDL records, and
  // what stops free acquisition eating the paying clients' monthly ceiling. Probed for
  // the same reason as the fences above: if the migration has not run, sourcing for a
  // prospect silently reserves nothing and the fence that is supposed to bound the spend
  // is not there at all.
  // ── ⚑ 12 Sep (S2-AUDIT-001) — THE DURABLE PROOF AUTHORITY LEDGER ────────────────────
  //
  // ⛓️ `try_claim_proof_pass` IS NO LONGER LISTED, AND THAT IS DELIBERATE. It is retained in
  // the database for rollback, but nothing live calls it any more
  // (`proof-authority-bypass.test.ts` asserts zero live callers), and this list's own rule —
  // asserted by `system-probes-functions.test.ts` — is that a function nobody calls must not
  // be probed: "a stale probe is noise". The four below replace it.
  {
    name: 'claim_proof_authority',
    args: { p_client_id: NO_SUCH_ROW_UUID, p_icp_id: null },   // unknown client → refuse, no write
    why: 'the one door to Proof authority — without it a prospect cannot start Proof at all, and the two-pass ceiling and the one calibrated restart have no enforcement',
    migration: '20260912_proof_pass_claims',
  },
  {
    name: 'settle_proof_claim',
    args: { p_claim_id: NO_SUCH_ROW_UUID, p_status: 'released', p_reason: 'probe' },  // no open claim → not_open
    why: 'what RETURNS a Proof attempt after a provider or infrastructure failure — without it every crashed run consumes a client pass again',
    migration: '20260912_proof_pass_claims',
  },
  {
    name: 'classify_legacy_proof_passes',
    args: { p_client_id: NO_SUCH_ROW_UUID, p_passes: 0, p_note: 'probe', p_force: false },  // unknown client → refuse
    why: 'the only way to clear a pre-ledger client whose historical authority is unclassified — without it those clients are refused Proof for ever',
    migration: '20260912_proof_pass_claims',
  },
  {
    name: 'classify_legacy_restart',
    args: { p_client_id: NO_SUCH_ROW_UUID, p_status: 'released', p_note: 'probe' },  // unknown client → refuse
    why: 'the same for a pre-ledger calibrated restart — without it a client whose one restart was burned can never be given it back',
    migration: '20260912_proof_pass_claims',
  },
  {
    name: 'try_reserve_proof_records',
    args: { p_client_id: NO_SUCH_ROW_UUID, p_requested: 0 },   // guard: `p_requested <= 0 → granted 0`
    why: 'the atomic 40-record-per-prospect and monthly acquisition ceiling — without it free proof has no spend fence',
    migration: '20260822_free_proof_acquisition',
  },
  {
    name: 'apply_pending_revision',
    // The all-zeros uuid, like every probe: the function finds no ICP for that client and
    // returns `ok:false, reason:'ICP_NOT_FOUND'` BEFORE writing anything — so this proves it
    // exists without applying a revision to anyone.
    args: { p_icp_id: NO_SUCH_ROW_UUID, p_client_id: NO_SUCH_ROW_UUID, p_campaign_id: NO_SUCH_ROW_UUID },
    why: "K.I.N.D's GO applies a live client's held targeting AND held brief in ONE transaction — without it the route has no atomic way to apply them together, and a half-apply leaves a client live on a new brief with old targeting",
    migration: '20260822_free_proof_acquisition',
  },
  {
    name: 'release_proof_records',
    // Addressed by RESERVATION id, not client id (22 Aug round 2) — release is scoped to
    // one reservation row and reconciles it exactly once, so a replay cannot recreate
    // authority for records that were genuinely bought.
    args: { p_reservation_id: NO_SUCH_ROW_UUID, p_records: 0 },   // guard: `p_records <= 0 → RETURN 0`
    why: 'reconciles ONE proof reservation, once — without it every thin search permanently under-allocates the prospect and the month',
    migration: '20260822_free_proof_acquisition',
  },
  {
    name: 'grant_first_run_credits',
    args: { p_client_id: NO_SUCH_ROW_UUID, p_amount: 0, p_max_balance: 0, p_claim_first_run: false },
    why: 'the first-run credit grant — guarded twice here: no matching row, and a zero ceiling',
    migration: '20260710_grant_first_run_credits',
  },
  // ── Campaigns and seats ──────────────────────────────────────────────────────────
  {
    name: 'figsy_merge_settings',
    args: { p_campaign_id: NO_SUCH_ROW_UUID, p_patch: {} },   // no matching row, and an empty patch
    why: 'the atomic campaign-settings merge — without it concurrent edits overwrite each other',
    migration: '20260710_figsy_merge_settings',
  },
  {
    name: 'allocate_pool_to_rep',
    args: { p_company_id: NO_SUCH_ROW_UUID, p_rep_id: NO_SUCH_ROW_UUID, p_amount: 0 }, // guard: `p_amount <= 0 → false`
    why: "moves credits from a company pool to a seat. Its absence is INVISIBLE at the call site — company.ts fails soft and tells the owner 'not enough in the pool', which is a wrong answer, not an error",
    migration: '20260706_pool_atomic',
  },
  {
    name: 'return_rep_to_pool',
    args: { p_company_id: NO_SUCH_ROW_UUID, p_rep_id: NO_SUCH_ROW_UUID },  // SELECT finds nothing → returns 0
    why: 'reclaims a deactivated seat\'s credits back into the company pool — its absence silently reclaims nothing',
    migration: '20260706_pool_atomic',
  },
]

async function schema(): Promise<Section> {
  const rows: Row[] = []
  for (const req of REQUIRED_SCHEMA) {
    const label = req.column ? `${req.table}.${req.column}` : req.table
    rows.push(await probe(label, async () => {
      const { error } = await db.from(req.table).select(req.column ?? 'id', { count: 'exact', head: true }).limit(1)
      if (!error) return ok(label, `Present — ${req.why}.`)

      // ⚠️ #630 — THIS BRANCH USED TO CALL EVERY ERROR "MISSING IN PRODUCTION".
      //
      // One `if`, one verdict: any error at all — a missing COLUMN, a timeout, an auth failure,
      // a blank message — rendered as *"MISSING in production: . Consequence: …"* with a
      // migration to run. That is the exact law this file's sibling states at the top of
      // `schema-probe.ts`: **a probe that could not run returns UNKNOWABLE, never "missing"** —
      // *"reading any error as 'the column is absent' would turn an outage into a confident,
      // wrong schema verdict."* The #565 class, living on the one page built to end it.
      //
      // It cost a real hour on 6 Aug: 14/14 migrations applied and this row still reported the
      // #343 double-send guard missing. The page even contradicted itself — the replica-count
      // probe asks the SAME table for a column that exists and printed *"the cron_claims
      // single-run guard is in place"* four sections further down.
      //
      // `isMissingTable` is IMPORTED, never re-implemented: #627 hoisted it out of cron-guard's
      // inline copy for precisely this reason, and a third copy is how two call sites come to
      // disagree about what "missing" means.
      const { isMissingTable } = await import('./schema-probe')
      if (isMissingTable(error as never)) {
        return broken(label, `MISSING in production: ${error.message}. Consequence: ${req.why}.`,
          `Run migration ${req.migration} from Vida → Engine → Database migrations.`)
      }
      // NOT a missing table. Say what actually came back and refuse to guess — an empty message
      // is reported as empty rather than dressed up, because "the database said nothing" is a
      // different problem from "the table is not there" and only one of them is fixed by a
      // migration.
      return unmeasured(label,
        `Could NOT establish whether this is present — the check errored, and the error is not "no such table": ${error.message || '(the database returned an error with no message)'}. This is NOT evidence it is absent, and it is NOT a pass. Consequence if it IS absent: ${req.why}.`,
        `Re-run once the database answers. Only run ${req.migration} if a later check actually reports the table missing.`)
    }))
  }

  // ── FUNCTIONS ────────────────────────────────────────────────────────────────
  // #383 — ADDED 12 Aug BECAUSE A MISSING FUNCTION WAS INVISIBLE TO THIS PAGE FOR A MONTH.
  // Every row above asks about a TABLE or a COLUMN. `increment_figsy_emails_sent` was written
  // as a .sql file on 10 Jul, never added to PENDING_MIGRATIONS, and so never created — and
  // nothing here could ask the question. The send path fell through to a racy fallback and
  // undercounted every campaign, silently, on every send this product has ever made.
  //
  // Probed by CALLING it with a uuid that matches no campaign: the function's UPDATE affects
  // zero rows and returns nothing, which is a successful call and proves existence, while
  // changing no data. A read-only existence check that cannot mutate anything.
  // ⚠️ THE FIX INSTRUCTION MUST BE TRUE, AND FOR MOST OF THESE IT WAS NOT.
  // "Run migration X from Vida → Engine → Database migrations" only works for a migration
  // that is actually IN `PENDING_MIGRATIONS` — that array is the only thing Vida executes.
  // Eleven of these thirteen functions live in .sql files that were applied by hand long ago
  // and are NOT in the runner, so telling the founder to run them from Vida sends him to a
  // button that will never list them. The list is read at runtime rather than hardcoded, so
  // this can never drift from the runner again.
  const { PENDING_MIGRATIONS } = await import('./pending-migrations')
  const runnerKeys = new Set(PENDING_MIGRATIONS.map(m => m.key))
  const howToFix = (migration: string) => runnerKeys.has(migration)
    ? `Run migration ${migration} from Vida → Engine → Database migrations.`
    : `⚠️ ${migration} is NOT in the migration runner, so Vida cannot apply it — it was a manual apply. Add it to PENDING_MIGRATIONS (one entry, idempotent) and then run it from Vida.`

  for (const fn of REQUIRED_FUNCTIONS) {
    rows.push(await probe(fn.name, async () => {
      // A function we refuse to call. Reported as NOT MEASURED — never as OK, because we do
      // not know, and never as BROKEN, because we have no evidence it is missing.
      if (fn.args === null) {
        return unmeasured(fn.name,
          `NOT CHECKED, deliberately: ${fn.unprobeable} Consequence if it IS absent: ${fn.why}.`,
          `Verify by hand when the database is reachable: \\df ${fn.name}. ${howToFix(fn.migration)}`)
      }

      const { error } = await db.rpc(fn.name, fn.args)
      const { classifyProbeError } = await import('./schema-probe')
      const verdict = classifyProbeError(error as never, 'function')

      if (verdict.verdict === 'exists') return ok(fn.name, `Present — ${fn.why}.`)
      if (verdict.verdict === 'missing') {
        return broken(fn.name, `MISSING in production: ${verdict.detail}. Consequence: ${fn.why}.`,
          howToFix(fn.migration))
      }
      // Same law as the schema rows above: a probe that could not run says so. An RLS refusal,
      // a paused project or a timeout must never be printed as "run this migration".
      return unmeasured(fn.name,
        `Could NOT establish whether this function exists — the call errored and the error is not "no such function": ${verdict.detail || '(no message)'}. This is NOT evidence it is absent. Consequence if it IS absent: ${fn.why}.`,
        `Re-run once the database answers. Only act if a later check reports it actually missing — then: ${howToFix(fn.migration)}`)
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
  const { PAID_TX_TYPES, fundedVia } = await import('./onboarding-pack')
  const { coldView } = await import('./cold-client')
  const secretOk = secretState().ok

  // #619 — the house account, resolved ONCE for the whole sweep and the one permitted way
  // (`decideHouseClient`, never a company name — #584/#593). Without it this probe called
  // `coldState` raw and reported our own exempt account as BROKEN: *"COLD — 59 days"*, with
  // an instruction to go and contact ourselves. FAILS OPEN — unresolvable leaves it null and
  // nobody is exempt, which is exactly today's behaviour.
  let houseClientId: string | null = null
  try {
    const { decideHouseClient } = await import('./house-client')
    const { resolveHouseUserIds } = await import('./real-clients')
    const { data: allClients } = await db.from('clients').select('id, user_id, company_name, is_demo')
    const decision = decideHouseClient({
      houseUserIds: [...await resolveHouseUserIds()],
      clients: (allClients ?? []) as { id: string; user_id: string | null; company_name: string | null; is_demo: boolean | null }[],
    })
    if (decision.action === 'adopt') houseClientId = decision.clientId
  } catch { /* fails open — no exemption */ }

  for (const c of (cs ?? []) as { id: string; company_name: string | null; is_demo: boolean | null }[]) {
    const name = c.company_name || c.id.slice(0, 8)
    rows.push(await probe(name, async () => {
      const [{ data: ledger }, { count: approved }, { count: awaiting }, boxes, camp, last] = await Promise.all([
        // Rows, not a bare count — #619 needs to tell a payment from a comp, and the rows
        // answer both questions in the one query the count already cost.
        db.from('credit_transactions').select('type, reference').eq('client_id', c.id).in('type', PAID_TX_TYPES),
        db.from('leads').select('id', { count: 'exact', head: true }).eq('client_id', c.id).not('revealed_at', 'is', null),
        db.from('leads').select('id', { count: 'exact', head: true }).eq('client_id', c.id).is('revealed_at', null).neq('status', 'passed'),
        db.from('client_inboxes').select('id, email, kind, status, smtp_host, smtp_port, smtp_secure, smtp_user, smtp_pass_enc, from_name').eq('client_id', c.id),
        db.from('figsy_campaigns').select('status').eq('client_id', c.id).eq('status', 'active').limit(1).maybeSingle(),
        // DAYS SINCE LAST APPROVAL — the founder's spec asked for it by name and the first
        // build left it out. It is the cold-client signal: #538 suspends a client after 30
        // days with no approval, so this is the number that decides whether that fires.
        db.from('leads').select('revealed_at').eq('client_id', c.id)
          .not('revealed_at', 'is', null).order('revealed_at', { ascending: false }).limit(1).maybeSingle(),
      ])
      const via = fundedVia((ledger ?? []) as { type?: unknown; reference?: unknown }[])
      const hasPaid = via !== null
      const pack = packState(hasPaid, approved ?? 0)
      const send = pickSendingInbox((boxes.data ?? []) as never, secretOk)
      // Reuse the SHIPPED rule rather than re-deriving "30 days" here. `coldView` carries the
      // warn/cold thresholds, the guard that an unparseable date must never read as "30 days
      // idle" and suspend a paying client (#538), AND the exemption (#618/#619) — reading the
      // clock without the exemption is what made this probe call our own account broken.
      const cold = coldView({
        lastApprovalAt: (last.data as { revealed_at?: string } | null)?.revealed_at,
        now: new Date(), clientId: c.id, isDemo: c.is_demo, houseClientId,
      })
      const approvalAge = cold.label
      const facts = [
        // #619 — "paid" and "comped" are different sentences and this probe used to say the
        // first for both. Entitlement is not evidence that money arrived.
        via === 'real' ? 'paid' : via === 'comp' ? 'comped (no money in)' : 'NOT paid',
        `${approved ?? 0} approved`,
        pack.active ? `${pack.left}/${pack.included} included left` : 'no pack',
        // #648 — RENAMED 12 Aug. This said "awaiting a decision" while the operator's Lead
        // queue says "awaiting approval" — two operator screens, near-identical wording,
        // entirely different queues. THIS counts LEADS the CLIENT has not yet approved
        // (`leads.revealed_at is null`); the Lead queue counts EMAIL DRAFTS awaiting the
        // OPERATOR (`listPendingDrafts`). During the 12-Aug walk the founder read "5
        // awaiting a decision" here, opened the Lead queue, found it empty, and we lost a
        // step establishing that neither screen was wrong. Named for WHO decides.
        `${awaiting ?? 0} awaiting the CLIENT's approval`,
        camp.data ? 'campaign active' : 'NO active campaign',
        approvalAge,
      ].join(' · ')

      if (c.is_demo) return ok(`${name} (demo)`, `${facts} · demo account — cannot send by design.`)
      if (!hasPaid) return ok(name, `${facts} — nothing owed to them yet.`)
      if (!send.ok) {
        const { refusalLabel } = await import('./sending-inbox')
        return broken(name, `${via === 'real' ? 'PAID' : 'FUNDED'} BUT CANNOT SEND — ${refusalLabel(send.reason)}. ${facts}`, send.detail)
      }
      if ((awaiting ?? 0) === 0 && hasPaid) {
        return broken(name, `${via === 'real' ? 'Paid' : 'Funded'}, can send, but has NOBODY left to approve. ${facts}`, 'Source more for them — a client with an empty desk cannot spend.')
      }
      if (cold.cold) {
        return broken(name, `COLD — ${cold.daysIdle} days since their last approval. ${facts}`,
          'A paying client this quiet is suspended by #538. Contact them.')
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
    // THE SAME EXACT-STRING BUG, sitting directly below the fix for it.
    // This filtered on `!== 'MBF Holdings'` while the live account is named "MBF Demo" — so
    // the one demo we are supposed to keep was itself being reported as a stray to delete.
    // Matched on "contains MBF" now, the same way the readiness probe above does.
    const { isMbfAccount } = await import('./integrity-checks')
    const { data } = await db.from('clients').select('id, company_name').eq('is_demo', true)
    const strays = (data ?? []).filter((c: { company_name: string | null }) => !isMbfAccount(c.company_name))
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

  // ── PROVIDER SPEND AGAINST THE MONTHLY CAP ──────────────────────────────────────────
  //
  // ⛓️ 17 Sep (FD-6) — RE-LABELLED, AND THE READING IS NOW HISTORIC. The row is titled
  // "PDL spend against the monthly cap" in every previous build, and both halves of that
  // label are stale: we are not paying for PDL, and `sourcing_ledger` is the ledger of PDL
  // records bought at $0.28 each. Nothing on any MVP1 path writes to it any more — the
  // programme path reserves entitlement through `try_reserve_programme_sourcing`, which
  // deliberately writes no ledger row because entitlement and provider cost are different
  // facts (HOUSE-009).
  //
  // ⚠️ THE ROW IS KEPT, NOT DELETED, AND IT SAYS WHAT IT IS. Historic spend is real money
  // that was really spent, and a page that silently stops reporting a budget reads as a
  // budget that stopped existing. What it must not do is present a stale figure as the
  // current provider constraint — the current constraint is Apollo credits, two rows up.
  rows.push(await probe('Historic PDL spend against its old monthly cap', async () => {
    const monthStart = new Date(); monthStart.setUTCDate(1); monthStart.setUTCHours(0, 0, 0, 0)
    const [capRow, ledger] = await Promise.all([
      // #626 — the key is a CONSTANT shared with the setter route. Two spellings of one key
      // would let the founder set a cap this probe cannot see, silently.
      db.from('app_settings').select('value').eq('key', PDL_MONTHLY_CAP_KEY).maybeSingle(),
      db.from('sourcing_ledger').select('cost_usd').gte('created_at', monthStart.toISOString()),
    ])
    const spent = ((ledger.data ?? []) as { cost_usd?: number | string }[])
      .reduce((s, r) => s + Number(r.cost_usd ?? 0), 0)
    // ⚠️ #627 — TWO DIFFERENT PROBLEMS USED TO SHARE ONE SENTENCE. This block treated a missing
    // TABLE and a missing ROW identically and said "set pdl_monthly_cap_usd" for both — telling
    // the operator to set a value in a table that does not exist. It said that for months. The
    // founder found it by pressing Save on the #626 card and getting the real error, which the
    // write surfaced only because that write is checked (#349).
    const { isMissingTable } = await import('./schema-probe')
    if (isMissingTable(capRow.error as never)) {
      // ⚠️ STILL `broken`, AND FD-6 DOES NOT SOFTEN IT. A reached PDL cap constrains nothing
      // any more, so that case became `unmeasured` below — but a MISSING TABLE is a schema
      // fact, not a money fact: `app_settings` is where several operator-editable values
      // live, and "there is nowhere to set one" is exactly the state #627 exists to surface.
      // Re-labelling the row must not quietly downgrade the one finding it was written for.
      return broken('Historic PDL spend against its old monthly cap',
        `$${spent.toFixed(2)} spent this month, and the app_settings table DOES NOT EXIST — so no cap can be stored and nothing is guarding sourcing spend but the code default. This row previously said "no usable setting exists", which read as "nobody has set one yet" rather than "there is nowhere to set one".`,
        'Run the 20260806_app_settings migration from Vida → Engine → Run migrations. That needs DATABASE_URL to be the Supabase SESSION POOLER string first (runlist A15).')
    }
    if (capRow.error) {
      return unmeasured('Historic PDL spend against its old monthly cap',
        `$${spent.toFixed(2)} spent this month, but app_settings could not be read (${capRow.error.message}), so whether a cap exists was NOT established.`,
        'Re-run once the database answers.')
    }
    const capRaw = (capRow.data as { value?: unknown } | null)?.value
    const cap = Number(capRaw)
    if (!capRow.data || !Number.isFinite(cap) || cap <= 0) {
      return unmeasured('Historic PDL spend against its old monthly cap',
        `$${spent.toFixed(2)} spent this month, but no usable pdl_monthly_cap_usd setting exists, so there is nothing to measure it against — the code default applies.`,
        'Set it in Vida → Engine → PDL monthly spend cap.')
    }
    const pct = Math.round((spent / cap) * 100)
    // ⚠️ NO LONGER `broken` WHEN THE CAP IS REACHED. Under FD-6 this ledger is historic: a
    // spent PDL cap refuses nothing, because nothing spends PDL. Reporting it red would send
    // an operator to raise a budget that constrains no live path, while the constraint that
    // DOES bite — Apollo credits — sits two rows up in green.
    const line = `$${spent.toFixed(2)} of the old $${cap} PDL cap used this month (${pct}%). HISTORIC: no MVP1 path writes to sourcing_ledger any more (FD-6). The live constraint is Apollo credits.`
    return spent >= cap
      ? unmeasured('Historic PDL spend against its old monthly cap', line, 'No action: this cap constrains nothing. Watch the Apollo credit row instead.')
      : ok('Historic PDL spend against its old monthly cap', line)
  }))

  // DAILY SEND CAPS — read from the environment they are actually enforced from.
  rows.push(await probe('Daily send caps', async () => {
    const caps: Array<[string, string | undefined]> = [
      ['cold sends/day (all clients)', process.env.FIGSY_COLD_DAILY_CAP],
      ['sends/day (all clients)', process.env.FIGSY_DAILY_SEND_LIMIT],
      ['sends/day per client', process.env.FIGSY_PER_CLIENT_DAILY_CAP],
    ]
    const set = caps.filter(([, v]) => v)
    if (set.length === 0) {
      return unmeasured('Daily send caps', 'None of the three cap variables are set, so the code defaults apply and this check cannot state the live numbers.',
        'Set them explicitly in Railway before the kill-switch goes on.')
    }
    return ok('Daily send caps', set.map(([k, v]) => `${k}: ${v}`).join(' · ')
      + (set.length < caps.length ? ` · ${caps.length - set.length} unset (code default).` : '.'))
  }))

  // SEND WINDOW — the live campaign settings, read through the SAME function the send path
  // uses, so this row cannot disagree with what actually happens at send time.
  rows.push(await probe('Send window', async () => {
    const { withinSendWindow, readCampaignGates } = await import('./campaign-settings')
    const { data, error } = await db.from('figsy_campaigns').select('settings').eq('status', 'active').limit(1).maybeSingle()
    if (error) return unmeasured('Send window', `Could not read a campaign to check the window: ${error.message}`)
    if (!data) return unmeasured('Send window', 'No active campaign exists, so there is no window configured to check.', 'This becomes measurable once a client is live.')
    const s = (data as { settings?: unknown }).settings
    const gates = readCampaignGates(s)
    const open = withinSendWindow(s, new Date())
    const desc = gates.send_hour_utc === null && (gates.send_days ?? []).length === 0
      ? 'no window configured — FAILS OPEN by design, so a garbled preference can never silently halt outreach'
      : `from ${gates.send_hour_utc ?? '—'}:00 UTC on ${(gates.send_days ?? []).join('/') || 'any day'}`
    return ok('Send window', `${open ? 'OPEN right now' : 'CLOSED right now'} — ${desc}.`)
  }))

  // THE REPLY PATH — the owed row.
  //
  // The check covered signup → pay → source → approve → send, and then stopped. A reply is
  // the point of the whole product: it is what the client is buying, and it is the one step
  // the client cannot see failing, because a reply that never arrives looks exactly like a
  // prospect who never answered. Three sessions of work went into that spine (R1's per-client
  // fan-out, P2-1's hoisted classifier, P2-2's honest fetch-failure reasons) and **none of it
  // was on this screen**, so a dead reply path would have reported nothing at all.
  //
  // Deliberately does NOT send or receive anything. It checks the three things that must be
  // true for an inbound reply to reach a desk, and says which one is missing.
  // ONE label, defined once and used for both the probe and every verdict it returns — two
  // copies of a row's name is how a rename leaves half the report talking about something else.
  const replyLabel = 'Reply path (inbound → client desk)'
  rows.push(await probe(replyLabel, async () => {
    // #624 — THIS ROW USED TO ANSWER HALF THE QUESTION. It checked the signing secret and
    // counted replies, and never asked WHERE replies are addressed. Outreach carries a
    // `Reply-To` from COLD_REPLY_TO (FIGSY_COLD_REPLY_TO → FIGSY_REPLY_TO → a silent hardcoded
    // default), so this row could report green while every reply went to a mailbox whose
    // inbound was never wired to Resend — a campaign with no return path, invisible until
    // send-day. The judgement is pure (`replyPathVerdict`); this only gathers facts.
    const { replyPathVerdict } = await import('./reply-path')
    const { COLD_REPLY_TO } = await import('./deliverability')
    const label = replyLabel

    const { error } = await db.from('figsy_replies').select('id', { count: 'exact', head: true })
    if (error) return unmeasured(label, `figsy_replies could not be read: ${error.message}`)

    // Newest reply, and whether anything has been sent — a zero reply count means opposite
    // things before and after the first send, so the verdict needs both.
    const [last, sent] = await Promise.all([
      db.from('figsy_replies').select('received_at').order('received_at', { ascending: false }).limit(1).maybeSingle(),
      db.from('figsy_sent_emails').select('id', { count: 'exact', head: true }),
    ])

    // Resend's domain list — the SAME free endpoint the Resend dependency row already calls.
    // Never a paid call, never a send. Unreachable stays null, and null becomes NOT-MEASURED
    // rather than a guess.
    let resendDomains: string[] | null = null
    const key = process.env.RESEND_API_KEY
    if (key) {
      try {
        const r = await fetchWithTimeout(`${resendBase()}/domains`, { headers: { Authorization: `Bearer ${key}` } })
        if (r.ok) {
          const body = await r.json() as { data?: { name?: string }[] }
          resendDomains = (body?.data ?? []).map(d => String(d?.name ?? '')).filter(Boolean)
        }
      } catch { /* unreachable — stays null, reported as NOT-MEASURED */ }
    }

    const v = replyPathVerdict({
      coldReplyTo: process.env.FIGSY_COLD_REPLY_TO,
      replyTo: process.env.FIGSY_REPLY_TO,
      resolved: COLD_REPLY_TO,
      resendDomains,
      lastReplyAt: (last.data as { received_at?: string } | null)?.received_at ?? null,
      hasSent: (sent.count ?? 0) > 0,
      secretSet: !!process.env.RESEND_WEBHOOK_SECRET,
      now: new Date(),
    })

    if (v.state === 'ok') return ok(label, v.detail)
    if (v.state === 'broken') return broken(label, v.detail, v.action)
    return unmeasured(label, v.detail, v.action)
  }))

  // CALENDAR BOOKING — #628, and it is the #624 lesson applied one step further down the funnel.
  //
  // The whole point of the reply path is that an interested prospect books a meeting. That last
  // step had NO row: the three Google OAuth vars are `level: 'optional'` at boot, so nothing
  // complains when they are absent, and with them absent no client can connect a calendar and
  // every booking link resolves to nothing — silently, exactly as a dead reply path did.
  //
  // Env + storage only. No Google call: hitting Google would require a client's refresh token,
  // which means acting on a client's account to draw a picture on our own screen, and this file's
  // standing rule is never a paid call and never a send. The verdict says which question it
  // answered, so "configured" is never mistaken for "a booking would succeed today".
  rows.push(await probe('Calendar booking (Google OAuth)', async () => {
    const { calendarBookingVerdict } = await import('./calendar-probe')
    const label = 'Calendar booking (Google OAuth)'

    // The refresh token is the one durable artefact of a COMPLETED OAuth flow, and the column
    // every booking route already gates on. An unreadable count stays null and becomes
    // NOT-MEASURED — never a rendered zero, which would look calm and mean nothing (#565).
    const c = await db.from('clients')
      .select('id', { count: 'exact', head: true })
      .not('google_calendar_refresh_token', 'is', null)

    const v = calendarBookingVerdict({
      env: {
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        redirectUri: process.env.GOOGLE_REDIRECT_URI,
        portalUrl: process.env.PORTAL_URL,
      },
      connections: c.error ? null : (c.count ?? 0),
      countError: c.error?.message ?? null,
    })

    if (v.state === 'ok') return ok(label, v.detail)
    if (v.state === 'broken') return broken(label, v.detail, v.action)
    return unmeasured(label, v.detail, v.action)
  }))

  // REPLICA COUNT — the founder's spec said "if readable". It is not, and that is the answer.
  //
  // What CHANGED with #343 is what the unreadable number means. It used to be the whole
  // safety story: if replicas > 1, every cron double-fired, and nothing in the product could
  // tell you whether that was happening. Now the guarantee does not depend on knowing the
  // count — each job claims its (job, slot) row and the losers stand down — so this row
  // reports the count as unmeasurable AND says why that is no longer frightening. Leaving
  // the old "if it is >1, every cron double-fires" line up would be a stale claim on the one
  // screen whose whole purpose is not making stale claims.
  rows.push(await probe('Replica count', async () => {
    const id = process.env.RAILWAY_REPLICA_ID
    const { error } = await db.from('cron_claims').select('job', { count: 'exact', head: true })
    const guard = error
      ? `⚠️ the cron_claims guard is NOT in place (${error.message}) — until the 20260727_cron_claims migration is run, more than one replica DOES double every email and charge`
      : 'the cron_claims single-run guard is in place, so extra replicas stand down instead of double-firing (#343)'
    return unmeasured('Replica count',
      `A process can read its OWN replica id${id ? ` (${id.slice(0, 8)}…)` : ' — and this one is not even set'}, never how many replicas exist. Nothing inside the container can answer this, so it is not answered here rather than guessed. However — ${guard}.`,
      'Railway → @kind/api → Settings → Replicas.')
  }))

  return { title: 'Vida — can the operator actually run a client?', side: 'vida', rows }
}

// ── ACTIVITY ────────────────────────────────────────────────────────────────────

async function activity(): Promise<Section> {
  const rows: Row[] = []
  const since = new Date(Date.now() - 7 * 864e5).toISOString()
  // DEMOS ARE EXCLUDED FROM THIS ROW, and this is the bug it was written with.
  //
  // The first live run reported *"95 sent · 29 replies"* while the kill-switch was OFF — a
  // flat contradiction on one screen. Every one of those rows was seeded by `demo-mbf.ts` and
  // `seed-company.ts`, which insert straight into `figsy_sent_emails`. The probe counted the
  // whole table.
  //
  // Same defect as #543, where demo clients were counted in Vida's headline numbers: our own
  // test data reported back to us as if it were the business. A bounce-rate alarm computed
  // over invented `.invalid` addresses is worse than no alarm.
  //
  // `figsy_sent_emails` carries no `client_id` — only `campaign_id` — so demos are excluded
  // via their campaigns. The demo counts are still SHOWN, because those rows do exist and
  // silently dropping them is a different kind of lie; they are just not the headline.
  rows.push(await probe('Sending activity (7 days)', async () => {
    const { data: demos } = await db.from('clients').select('id').eq('is_demo', true)
    const demoIds = (demos ?? []).map((c: { id: string }) => c.id)
    const { data: demoCamps } = demoIds.length
      ? await db.from('figsy_campaigns').select('id').in('client_id', demoIds)
      : { data: [] as { id: string }[] }
    const demoCampIds = (demoCamps ?? []).map((c: { id: string }) => c.id)

    // An empty `in` list is invalid PostgREST, so the filter is only applied when there is
    // something to exclude. Without this guard the probe throws and renders NOT-MEASURED on
    // a perfectly healthy system that simply has no demos.
    const realSent = () => {
      let q = db.from('figsy_sent_emails').select('id', { count: 'exact', head: true }).gte('sent_at', since)
      if (demoCampIds.length) q = q.not('campaign_id', 'in', `(${demoCampIds.join(',')})`)
      return q
    }

    const [{ count: sent }, { count: bounced }, { count: replies }, { count: demoSent }] = await Promise.all([
      realSent(),
      realSent().eq('status', 'bounced'),
      demoIds.length
        ? db.from('figsy_replies').select('id', { count: 'exact', head: true }).gte('received_at', since).not('client_id', 'in', `(${demoIds.join(',')})`)
        : db.from('figsy_replies').select('id', { count: 'exact', head: true }).gte('received_at', since),
      demoCampIds.length
        ? db.from('figsy_sent_emails').select('id', { count: 'exact', head: true }).gte('sent_at', since).in('campaign_id', demoCampIds)
        : Promise.resolve({ count: 0 }),
    ])

    const aside = (demoSent ?? 0) > 0 ? ` (${demoSent} demo row(s) excluded — seeded, never sent)` : ''
    const rate = (sent ?? 0) > 0 ? Math.round(((bounced ?? 0) / (sent ?? 1)) * 1000) / 10 : 0
    if ((sent ?? 0) === 0) {
      return ok('Sending activity (7 days)', `Nothing real sent in the last 7 days — expected while the kill-switch is off.${aside}`)
    }
    return rate >= 3
      ? broken('Sending activity (7 days)', `${sent} sent, ${bounced} bounced (${rate}%) — above 3% is burning the sending domain.${aside}`, 'Pause sending and check the list quality.')
      : ok('Sending activity (7 days)', `${sent} sent · ${bounced} bounced (${rate}%) · ${replies} replies.${aside}`)
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

/**
 * Does a 4xx mean "no such route" rather than "your request was rejected"?
 *
 * Express's default 404 handler answers HTML — `Cannot GET /operator/x` — while every route
 * in this API answers JSON. So a 404 whose body is not JSON is a route that does not exist,
 * and that is a completely different finding from a route declining a request.
 *
 * Exported for the test, because this is the distinction the check was missing and a source
 * scan cannot prove it works.
 */
export function isMissingRoute(status: number, body: string): boolean {
  if (status !== 404) return false
  const b = body.trim()
  if (b.startsWith('{') || b.startsWith('[')) return false   // our JSON — the route answered
  return /cannot get|<!doctype|<html|<pre/i.test(b) || b === ''
}

/** Read-only GETs that need no parameters. Anything requiring an id is listed with a note. */
const OPERATOR_GETS: Array<{ path: string; note?: string }> = [
  { path: '/clients' }, { path: '/worklist' }, { path: '/alerts' }, { path: '/status' },
  { path: '/engine' }, { path: '/audit' }, { path: '/whoami' }, { path: '/health' },
  { path: '/queue' }, { path: '/suppression' }, { path: '/reports' },
  // These three DO exist (verified 27 Jul) and 404 for their own reasons — a missing record
  // rather than a missing parameter. They carried no note at all, so the row read
  // "HTTP 404 — answering." with nothing explaining why a 404 was acceptable, which is a
  // green a reader cannot check. Now they say which it is.
  { path: '/blockers', note: '404 when there is nothing blocking' },
  { path: '/bookings', note: '404 when no booking matches' },
  { path: '/nexus', note: 'expects client_id' },
  { path: '/cockpit', note: 'expects client_id' },
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
        const body = await r.text().catch(() => '')
        if (r.status >= 500) {
          return broken(ep.path, `HTTP ${r.status} — this route is ERRORING. Any Vida screen using it renders empty, which looks identical to "nothing to do". ${body.slice(0, 160)}`,
            'Check the API logs for this route.')
        }
        // A 4xx FROM A ROUTE THAT EXISTS IS NOT A 4xx FROM A ROUTE THAT DOES NOT.
        //
        // This used to count any 2xx-or-4xx as "answering", which cannot tell those apart.
        // Delete a route and Express's default handler returns `Cannot GET /operator/x` —
        // and the check reported it green, "answering". Every route happens to exist today
        // (all twenty verified), so it was right by luck rather than by construction, and
        // this whole screen exists to stop being right by luck.
        //
        // Our routes always answer JSON. Express's fallback answers HTML. That is the tell.
        if (isMissingRoute(r.status, body)) {
          return broken(ep.path, `HTTP ${r.status} and the body is Express's default handler, not ours — THERE IS NO SUCH ROUTE. Any Vida screen calling it is permanently empty.`,
            'The route was removed or never built. This is not a missing parameter.')
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

// ── CLIENT SENDING (Prompt 7) ───────────────────────────────────────────────────────────
//
// Instantly is OURS, Smartlead is the CLIENTS' (#577). The dependency section already asks
// *"does Smartlead answer at all"* once. This asks the question that decides whether a
// PARTICULAR client can send: do they have a mailbox recorded with provider `smartlead-api`,
// what state is it in, and is it warm?
//
// Warmup is reported NOT-MEASURED on purpose. The warmup field names on Smartlead's
// /email-accounts could not be verified (both doc hosts 403 this environment), and a
// confident "warm" rendered from a field name nobody checked is exactly the green this
// screen exists to prevent.
async function clientSending(): Promise<Section> {
  const rows: Row[] = []
  const { SMARTLEAD_SENDING_MODE } = await import('./smartlead-map')

  rows.push(await probe('Smartlead — is it answering?', async () => {
    if (!process.env.SMARTLEAD_API_KEY) {
      return unmeasured('Smartlead — is it answering?',
        'SMARTLEAD_API_KEY is not set. Founder-decided: Smartlead is bought only once a client pays, so this is expected and not a fault.',
        'Nothing to do until the first paying client.')
    }
    const { verifySmartlead } = await import('./smartlead')
    const v = await verifySmartlead()
    return v.ok
      ? ok('Smartlead — is it answering?', `Reachable — ${v.emailAccounts ?? 0} mailbox(es), ${v.campaigns ?? 0} campaign(s) in the workspace.`)
      : broken('Smartlead — is it answering?', v.error ?? 'Smartlead did not answer.',
          'Until this is green, NO client can send through Smartlead — approved leads are held, not delivered.')
  }))

  rows.push(await probe('Client mailboxes on Smartlead', async () => {
    const { data, error } = await db.from('client_inboxes')
      .select('client_id, email, status, provider, warmup_ready_at, clients(company_name)')
      .eq('provider', SMARTLEAD_SENDING_MODE)
    if (error) return unmeasured('Client mailboxes on Smartlead', `client_inboxes could not be read: ${error.message}`)

    const boxes = (data ?? []) as Array<{ status?: string; warmup_ready_at?: string | null; clients?: { company_name?: string } | null }>
    if (boxes.length === 0) {
      // NOT a failure — it is the honest state before the first purchase, and saying "broken"
      // here would put a permanent red on the board for a decision the founder has made.
      return unmeasured('Client mailboxes on Smartlead',
        `No client has a mailbox with provider ${SMARTLEAD_SENDING_MODE}, so no client can send through Smartlead yet. Expected until a SmartSenders mailbox is bought and recorded.`,
        'Vida → Engine → record the purchased mailbox against the client.')
    }
    const live = boxes.filter(b => b.status === 'active').length
    const warming = boxes.filter(b => b.status === 'warming').length
    const names = boxes.map(b => b.clients?.company_name ?? 'unknown').join(', ')
    return ok('Client mailboxes on Smartlead',
      `${boxes.length} mailbox(es) recorded — ${live} active, ${warming} warming (${names}). Warmup STATE itself is not read: Smartlead's warmup fields are unverified, so it is reported here rather than guessed.`)
  }))

  return { title: 'Client sending — can each client send from their own mailbox?', side: 'vida', rows }
}

/** Every section, in report order. Never throws. */
export async function runSystemCheck(): Promise<Section[]> {
  return [
    await dependencies(), await schema(), await clients(),
    await vida(), await clientSending(), await operatorEndpoints(), await activity(),
  ]
}
