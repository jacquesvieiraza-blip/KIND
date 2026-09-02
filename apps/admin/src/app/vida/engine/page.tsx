'use client'

// V7 ENGINE (item 211) + V9 inbox SOP (#270/#271).
//
// RULEBOOK 12.2: you cannot share a sender across clients — one client's complaints poison
// the rest. So every client needs their OWN warmed inbox, and we need to see that it is
// healthy. This page is that: deliverability at a glance, every live inbox with its warm-up
// state, and the queue of clients who have NO sender yet (nothing can go out for them).
//
// The locked SOP: trial signup → assign a PRE-WARMED POOLED inbox (instant, sends day 1) →
// on conversion record their BRANDED inbox (warms ~14d while they keep sending on the pool,
// so there is NO gap) → ~day 29 switch branded live and release the pooled one.

import { useCallback, useEffect, useState } from 'react'
import ImportLeads from '@/components/ImportLeads'
import AddMailbox from '@/components/AddMailbox'
import HouseClient from '@/components/HouseClient'
import HouseAudit from '@/components/HouseAudit'
import SchemaProbe from '@/components/SchemaProbe'

type Inbox = {
  id: string; client_id: string; company_name: string | null; email: string
  kind: 'pooled' | 'branded'; status: string; provider: string | null; daily_cap: number | null
  warmup_started_at: string | null; warmup_ready_at: string | null; warmup_day: number | null
  // #611 — the warm-up LENGTH, derived from this row's own dates. Null when there is no ready
  // date, and then the fraction is not rendered at all: a guessed denominator is the false
  // precision that made a 21-day box read "14/14 · ready" a week early.
  warmup_days: number | null
  warmup_ready: boolean | null; assigned_at: string | null
  // #552 — how this mailbox is reached. `smtp_secret` is a fingerprint, NEVER the password:
  // the API strips `smtp_pass_enc` before it leaves the process.
  from_name: string | null
  smtp_host: string | null; smtp_port: number | null; smtp_secure: boolean | null; smtp_user: string | null
  smtp_secret: string; has_smtp: boolean
  // #611 — can THIS mailbox send, asked of `pickSendingInbox` itself. The chip used to render
  // `has_smtp`, which is a different question: a warming box with credentials showed a green
  // "can send" while the send path refused it.
  can_send: boolean; send_block: string | null
}
/** #552 ③ — one client's send verdict, stated whether it passes or fails. */
type Readiness = {
  client_id: string; company_name: string | null
  can_send: boolean; reason: string | null
  why: string; detail: string
  tone: 'ok' | 'amber' | 'red'
  next_step: string
}

/** Readiness colours. RED is deliberately not "worse amber": it means the problem is not
    this client's — a missing key kills everyone, and an unknown state is not a to-do. */
const READY_TONE: Record<string, string> = {
  ok:    'bg-emerald-50 border-emerald-200 text-emerald-900',
  amber: 'bg-amber-50 border-amber-300 text-amber-900',
  red:   'bg-red-50 border-red-300 text-red-900',
}

type Engine = {
  totals: { sent_7d: number; sent_today: number; opened_7d: number; bounced_7d: number; opt_outs_total: number; bounce_rate: number; open_rate: number }
  inboxes: Inbox[]
  /** Clients who cannot send — and WHY, which is not always "no mailbox". */
  needs_inbox: { client_id: string; company_name: string | null; reason?: string; why?: string; detail?: string }[]
  /** EVERY client's verdict, pass or fail. `needs_inbox` is this list filtered. */
  readiness?: Readiness[]
  migration_pending?: boolean
  /** Every committed migration the runner will apply. Always sent. */
  migrations?: { key: string; title: string }[]
  /** #548 — without INBOX_SECRET_KEY the saved passwords cannot be read, so NOTHING sends. */
  secret_key_set?: boolean
}

/** #554 — the live RLS verdict, as returned by GET /operator/rls-audit. */
type RlsAudit = {
  verdicts: { tablename: string; verdict: string; finding: string; offenders: string[] }[]
  summary: { exposed: number; unprotected: number; denyAll: number; scoped: number; review: number; safe: boolean }
  tables_read: number
  host: string
  checked_at: string
}

/** #329 — the seed-data report, as returned by GET /operator/seed-report. */
type SeedReport = {
  classifications: { clientId: string; companyName: string; disposition: string; reason: string }[]
  eligible: { clientId: string; companyName: string }[]
  protectedCount: number
  clean: boolean
  checked_at: string
}

/** #298 — the backup manifest, as returned by GET /operator/backup/manifest. Counts only. */
type BackupManifest = {
  takenAt: string
  host: string
  tables: { table: string; rows: number }[]
  totalRows: number
  totalTables: number
}

/** The mailbox-details form. Kept out of the component so a re-render can't reshape it. */
type CredForm = {
  inboxId: string; clientId: string
  host: string; port: string; secure: boolean; user: string; pass: string; fromName: string
}

export default function VidaEnginePage() {
  const [e, setE] = useState<Engine | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [form, setForm] = useState<{ clientId: string; email: string } | null>(null)
  const [brandFor, setBrandFor] = useState<{ clientId: string; email: string } | null>(null)
  const [migMsg, setMigMsg] = useState<string | null>(null)
  const [demoMsg, setDemoMsg] = useState<string | null>(null)
  // #552 — the mailbox-details form, and the result of asking the mailbox whether it will
  // let us in. Keyed by inbox id so two open cards can't overwrite each other's answer.
  const [cred, setCred] = useState<CredForm | null>(null)
  const [checked, setChecked] = useState<Record<string, { ok: boolean; message: string }>>({})
  // #553 — which mailbox row has its test-send box open, and the address typed into it.
  // Opening is a separate act from sending, so a real message is never one stray click away.
  const [testFor, setTestFor] = useState<string | null>(null)
  const [testTo, setTestTo] = useState<Record<string, string>>({})
  // Shown only after the database REJECTS a password: the escape hatch for "the stored
  // password is stale and the Supabase dashboard that could reset it is unreachable" (GitHub
  // removed the Supabase OAuth app entirely). Used for one run, never stored anywhere.
  const [dbPw, setDbPw] = useState('')
  const [needsPw, setNeedsPw] = useState(false)
  // #554 — the live RLS verdict. `rls` and `rlsErr` are kept SEPARATE deliberately: a failed
  // audit must never render as an empty (and therefore reassuring) table. On a security
  // screen, "nothing found" because the query died is the worst lie available.
  const [rls, setRls] = useState<RlsAudit | null>(null)
  const [rlsErr, setRlsErr] = useState<string | null>(null)
  // #329 — same separation, same reason: a report that FAILED must never render as
  // "nothing to clean". That is the reading that gets somebody to arm a wipe on bad
  // information, and this one is not reversible.
  const [seed, setSeed] = useState<SeedReport | null>(null)
  const [seedErr, setSeedErr] = useState<string | null>(null)
  // #611 — which eligible row has its remove form open, and what has been typed into it.
  const [wipeFor, setWipeFor] = useState<{ clientId: string; companyName: string } | null>(null)
  const [wipeTyped, setWipeTyped] = useState('')
  const [wipeMsg, setWipeMsg] = useState<string | null>(null)
  const [wipeErr, setWipeErr] = useState<string | null>(null)
  // #298 — same separation again. A manifest that FAILED to build must never be saved as a
  // reference: an empty manifest makes an empty database compare clean, which is the exact
  // false all-clear a restore drill exists to prevent.
  const [man, setMan] = useState<BackupManifest | null>(null)
  const [manErr, setManErr] = useState<string | null>(null)

  async function runManifest() {
    setBusy('manifest'); setMan(null); setManErr(null)
    try {
      const j = await fetch('/api/proxy/operator/backup/manifest').then(r => r.json())
      if (!j?.success) throw new Error(j?.error || 'Could not take a manifest')
      setMan(j.data as BackupManifest)
    } catch (err) {
      setManErr(err instanceof Error ? err.message : 'Could not take a manifest')
    }
    setBusy(null)
  }

  // #611 — REMOVING A TEST ACCOUNT. The row being removed is held by id together with the
  // name typed into the box, so an open form cannot be pointed at a different row by a
  // re-render: the id and the confirmation travel as one object.
  async function wipeClient(clientId: string, companyName: string) {
    setBusy(`wipe-${clientId}`); setWipeErr(null); setWipeMsg(null)
    try {
      const j = await fetch('/api/proxy/operator/seed-data/wipe-client', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: clientId, confirm_company_name: wipeTyped }),
      }).then(r => r.json())
      if (!j?.success) throw new Error(j?.error || 'The account was not removed.')
      setWipeMsg(`${companyName} and every row it owned were deleted.`)
      setWipeFor(null); setWipeTyped('')
      await runSeedReport()
    } catch (err) {
      setWipeErr(err instanceof Error ? err.message : 'The account was not removed.')
    } finally { setBusy(null) }
  }

  async function runSeedReport() {
    setBusy('seed'); setSeed(null); setSeedErr(null)
    try {
      const j = await fetch('/api/proxy/operator/seed-report').then(r => r.json())
      if (!j?.success) throw new Error(j?.error || 'Could not build the seed report')
      setSeed(j.data as SeedReport)
    } catch (err) {
      setSeedErr(err instanceof Error ? err.message : 'Could not build the seed report')
    }
    setBusy(null)
  }

  async function runRlsAudit() {
    setBusy('rls'); setRls(null); setRlsErr(null)
    try {
      const j = await fetch('/api/proxy/operator/rls-audit').then(r => r.json())
      if (!j?.success) throw new Error(j?.error || 'Could not read RLS state')
      setRls(j.data as RlsAudit)
    } catch (err) {
      setRlsErr(err instanceof Error ? err.message : 'Could not read RLS state')
    }
    setBusy(null)
  }

  // The Supabase SQL editor is unreachable (GitHub OAuth + flagged account), so the
  // migration runs from here instead. Only reviewed, committed, idempotent statements —
  // the endpoint ignores any body, so this is not an arbitrary-SQL hole.
  // #626 — the PDL monthly cap. The System check told the operator to set this and there was no
  // way to: it needed SQL, and the Supabase dashboard is locked. Now it is an input box.
  const [pdlCap, setPdlCap] = useState<number | null>(null)
  const [pdlInput, setPdlInput] = useState('')
  const [pdlMsg, setPdlMsg] = useState<string | null>(null)
  const [pdlErr, setPdlErr] = useState<string | null>(null)

  const loadPdlCap = useCallback(async () => {
    try {
      const j = await fetch('/api/proxy/operator/settings/pdl-cap').then(r => r.json())
      if (j?.success) setPdlCap(j.data?.cap_usd ?? null)
    } catch { /* the card renders "not set" — never a false number */ }
  }, [])
  useEffect(() => { void loadPdlCap() }, [loadPdlCap])

  async function savePdlCap() {
    setBusy('pdlcap'); setPdlMsg(null); setPdlErr(null)
    try {
      const j = await fetch('/api/proxy/operator/settings/pdl-cap', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ cap_usd: pdlInput.trim() }),
      }).then(r => r.json())
      if (!j?.success) throw new Error(j?.error || 'The cap was not saved')
      // Trust the DATABASE, not the echo — re-read before telling the founder it is set.
      await loadPdlCap()
      setPdlMsg(`Saved. Sourcing is now capped at $${j.data?.cap_usd} a month.`)
      setPdlInput('')
    } catch (e) { setPdlErr(e instanceof Error ? e.message : 'The cap was not saved') }
    setBusy(null)
  }

  async function runMigration(withPassword?: string) {
    setBusy('migration'); setMigMsg(null); setError(null)
    try {
      const j = await fetch('/api/proxy/operator/migrations/run', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify(withPassword ? { db_password: withPassword } : {}),
      }).then(r => r.json())
      if (!j?.success) throw new Error(j?.error || 'Migration failed')
      const failed = (j.data.results ?? []).filter((r: { ok: boolean }) => !r.ok)
      const ran = (j.data.results ?? []).filter((r: { ok: boolean }) => r.ok).length
      // Say WHERE it connected. The first run died with ENETUNREACH because Supabase's direct
      // host is IPv6-only and Railway has no IPv6 route; the runner now falls back to the IPv4
      // pooler, and the founder should know that so DATABASE_URL can be fixed for good.
      const via = j.data.host ? ` (via ${j.data.host})` : ''
      if (failed.length) {
        // A PARTIAL SUCCESS IS NOT A FAILURE, AND MUST NOT READ AS ONE.
        //
        // This line used to print only the failures. The runner opens a FRESH CONNECTION PER
        // MIGRATION and catches per migration, so one bad statement stops nothing — but the
        // screen said `Failed: …` and nothing else, so eleven applied migrations rendered as
        // a flat red failure. The founder could not tell whether the one that mattered had
        // gone in, on the screen whose entire job is telling him what the database now has.
        //
        // Same defect class as #565 and the leads-page banner: a real outcome collapsed into
        // the scariest available word.
        setMigMsg(
          `${ran} of ${ran + failed.length} applied${via}. ` +
          `FAILED: ${failed.map((f: { key: string; error: string }) => `${f.key} — ${f.error}`).join('; ')}. ` +
          `The rest DID apply — each migration runs on its own connection, so one failure does not stop the others.`,
        )
      } else {
        setMigMsg(`${ran} migration${ran === 1 ? '' : 's'} applied${via}. Inbox tracking is live.${j.data.hint ? ` — ${j.data.hint}` : ''}`)
        setNeedsPw(false); setDbPw('')
        await load()
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Migration failed'
      setMigMsg(msg)
      // Only offer the password box when the server actually rejected credentials — offering
      // it on a network failure would send you chasing the wrong problem.
      if (/password|credential|authentication|Tenant or user not found/i.test(msg)) setNeedsPw(true)
    }
    setBusy(null)
  }

  // MBF — the demo account. Builds it the first time, and rebuilds it to the identical
  // state every time after, which is the reset you run between demos. Invented people on
  // .invalid addresses, is_demo so nothing can ever send, no money moved.
  async function resetDemo() {
    if (!confirm('Rebuild MBF to its starting state?\n\nEverything currently in the demo account is wiped and replaced with the fixed cast. Real clients are untouched.')) return
    setBusy('demo'); setDemoMsg(null)
    try {
      const j = await fetch('/api/proxy/operator/demo/mbf/reset', { method: 'POST' }).then(r => r.json())
      setDemoMsg(j?.success ? j.message : (j?.error || 'Could not reset the demo'))
    } catch (err) {
      setDemoMsg(err instanceof Error ? err.message : 'Could not reset the demo')
    }
    setBusy(null)
  }

  const load = useCallback(async () => {
    try {
      const j = await fetch('/api/proxy/operator/engine').then(r => r.json())
      if (!j?.success) throw new Error(j?.error || 'Failed to load the engine')
      setE(j.data)
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to load the engine') }
  }, [])
  useEffect(() => { load() }, [load])

  async function post(path: string, body: object, tag: string) {
    setBusy(tag); setError(null)
    try {
      const j = await fetch(`/api/proxy/operator/${path}`, {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
      }).then(r => r.json())
      if (!j?.success) throw new Error(j?.error || 'That did not work')
      setForm(null); setBrandFor(null); setCred(null); await load()
    } catch (err) { setError(err instanceof Error ? err.message : 'That did not work') }
    setBusy(null)
  }

  // #552 — ask the mailbox whether it will actually let us in. Authenticates, sends nothing.
  // Finding a wrong password here costs a click; finding it when a real prospect's email
  // fails on a warmed mailbox costs the mailbox.
  async function verify(inbox: Inbox) {
    setBusy(`v-${inbox.id}`); setError(null)
    try {
      const j = await fetch(`/api/proxy/operator/inboxes/${inbox.id}/verify`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ client_id: inbox.client_id }),
      }).then(r => r.json())
      if (!j?.success) throw new Error(j?.error || 'Could not check the mailbox')
      setChecked(prev => ({ ...prev, [inbox.id]: j.data }))
    } catch (err) {
      setChecked(prev => ({ ...prev, [inbox.id]: { ok: false, message: err instanceof Error ? err.message : 'Could not check the mailbox' } }))
    }
    setBusy(null)
  }

  // #553 — SEND ONE DIAGNOSTIC THROUGH THIS EXACT MAILBOX.
  //
  // `verify` above proves the password and nothing else. The ladder wants a message that
  // LANDS, per mailbox — and the campaign test-send cannot answer that, because it goes out
  // through Resend/COLD_FROM rather than the Google box FIGSY will use.
  //
  // ⚠️ The mailbox id is the sender. No rotation, no ranking — on a two-box client the
  // ranked picker would answer the branded/active box however hard you tried to test the
  // other one, which is exactly the mistake this control exists to make impossible.
  async function testSend(inbox: Inbox) {
    const to = (testTo[inbox.id] ?? '').trim()
    setBusy(`t-${inbox.id}`); setError(null)
    try {
      const j = await fetch(`/api/proxy/operator/inboxes/${inbox.id}/test-send`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ client_id: inbox.client_id, to_email: to }),
      }).then(r => r.json())
      if (!j?.success) throw new Error(j?.error || 'Could not send the test')
      // Same panel the verify result uses, so a mailbox never shows two verdicts at once.
      setChecked(prev => ({ ...prev, [inbox.id]: { ok: !!j.data?.sent, message: j.data?.message ?? 'Sent.' } }))
      if (j.data?.sent) setTestFor(null)
    } catch (err) {
      setChecked(prev => ({ ...prev, [inbox.id]: { ok: false, message: err instanceof Error ? err.message : 'Could not send the test' } }))
    }
    setBusy(null)
  }

  const kpi = (label: string, value: string, sub: string, tone = '#1f1235') => (
    <div className="bg-white border border-[#eee7f7] rounded-xl px-4 py-3">
      <div className="text-[9.5px] font-bold uppercase tracking-wide text-[#b3a9cc]">{label}</div>
      <div className="text-[20px] font-extrabold leading-tight mt-0.5" style={{ color: tone }}>{value}</div>
      <div className="text-[10.5px] text-[#9b8ec4] mt-0.5">{sub}</div>
    </div>
  )

  // A bounce rate over ~3% is the classic "you are burning the domain" signal.
  const bounceTone = !e ? '#1f1235' : e.totals.bounce_rate >= 3 ? '#dc2626' : e.totals.bounce_rate >= 1.5 ? '#b45309' : '#059669'

  return (
    <div className="h-full overflow-y-auto px-6 py-5">
      <div className="mb-4">
        <h1 className="text-[19px] font-extrabold">Engine</h1>
        <p className="text-[12.5px] text-[#9b8ec4] mt-0.5">
          Warmed sending, per client. Each client sends from their own inbox — a shared sender would let one
          client&apos;s complaints poison everyone.
        </p>
      </div>

      {error && <div className="text-[12.5px] text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 mb-4">{error}</div>}
      {!e && !error && <p className="text-[13px] text-[#9b8ec4] py-10 text-center">Loading…</p>}

      {/* #549 — GETTING PROSPECTS IN. Rendered OUTSIDE the `{e && …}` block on purpose: it does
          not depend on the engine snapshot, and a panel that disappears while inboxes are
          loading is a control you cannot find when you need it (the migration-card lesson,
          #564). Its own component because this page is already 700 lines. */}
      {/* #549/#593 — Client Zero's account, and the mailboxes it sends from. Rendered
          OUTSIDE the `{e && …}` block for the same reason as the import panel: neither
          depends on the engine snapshot, and a control that is missing while the page loads
          is a control you cannot find when you need it (#564). */}
      {/* #558 — mounted directly above the house-client card and near the migrations
          control on purpose: its ledger count is what tells you whether "Run migrations" is
          safe to press, and the pairing is the whole point. */}
      <SchemaProbe />
      <HouseClient onDone={load} />
      {/* #611 — mounted directly under the house card: the account this audits is the one the
          card above sets up, and reading them apart is how the debris went unnoticed. */}
      <HouseAudit />
      <AddMailbox secretKeySet={e?.secret_key_set} onSaved={load} />
      <ImportLeads />

      {/* ── DATABASE — ALWAYS HERE ───────────────────────────────────────────────
          This control used to live inside the amber "inbox tracking is waiting on one
          migration" banner, which only rendered when `migration_pending` was true — a flag
          derived purely from whether `client_inboxes` exists. The moment that migration ran,
          the button disappeared and took every LATER migration with it: two were owed and
          there was no way in the product to run them. A control that hides itself once the
          first job is done is not a control.
          Every statement is committed, reviewed and idempotent, so pressing this when
          nothing is outstanding is a no-op. */}
      <div className="border border-[#e4dcf7] bg-white rounded-xl px-4 py-3 mb-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div>
            <b className="text-[13px] text-[#1f1235] block">Database migrations</b>
            <p className="text-[11.5px] text-[#5c5279] mt-0.5">
              {(e?.migrations?.length ?? 0) === 0
                ? 'Nothing committed to apply.'
                : `${e!.migrations!.length} committed statement${e!.migrations!.length === 1 ? '' : 's'} — safe to re-run, applying an already-applied one does nothing.`}
            </p>
          </div>
          <button onClick={() => runMigration()} disabled={busy === 'migration'}
            className="ml-auto bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-lg px-3.5 py-2 text-[12.5px] font-bold disabled:opacity-60">
            {busy === 'migration' ? 'Running…' : 'Run migrations'}
          </button>
        </div>
        {(e?.migrations?.length ?? 0) > 0 && (
          <ul className="mt-2 space-y-0.5">
            {e!.migrations!.map(m => (
              <li key={m.key} className="text-[11.5px] text-[#5c5279]">
                <code className="px-1 bg-[#f8f6fd] rounded">{m.key}</code> — {m.title}
              </li>
            ))}
          </ul>
        )}
        {migMsg && <p className="text-[11.5px] font-semibold text-[#5b21b6] mt-2 leading-relaxed">{migMsg}</p>}
      </div>

      {/* #626 — PDL MONTHLY CAP. Sits beside the migrations card because both are "things only
          the founder can set, that the System check keeps asking for". A ceiling with no way to
          set it is a instruction nobody can follow. */}
      <div className="border border-[#e4dcf7] bg-white rounded-xl px-4 py-3 mb-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div>
            <b className="text-[13px] text-[#1f1235] block">PDL monthly spend cap</b>
            <p className="text-[11.5px] text-[#5c5279] mt-0.5">
              {pdlCap === null
                ? 'Not set — only the code default guards sourcing spend.'
                : `Currently $${pdlCap} a month. Sourcing is refused once the month's spend reaches it.`}
            </p>
          </div>
          <div className="ml-auto flex gap-2 items-center">
            <input value={pdlInput} onChange={ev => setPdlInput(ev.target.value)}
              inputMode="decimal" placeholder="e.g. 100"
              className="w-28 text-[12.5px] border border-[#ece5fb] rounded-lg px-2.5 py-1.5" />
            <button onClick={savePdlCap} disabled={busy === 'pdlcap' || !pdlInput.trim()}
              className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-lg px-3.5 py-2 text-[12.5px] font-bold disabled:opacity-60">
              {busy === 'pdlcap' ? 'Saving…' : 'Save cap'}
            </button>
          </div>
        </div>
        {pdlMsg && <p className="text-[11.5px] font-semibold text-[#5b21b6] mt-2">{pdlMsg}</p>}
        {pdlErr && <p className="text-[11.5px] font-semibold text-red-700 mt-2">{pdlErr}</p>}

        {/* Only when the database actually rejected the stored password. */}
        {needsPw && (
          <form onSubmit={ev => { ev.preventDefault(); if (dbPw.trim()) runMigration(dbPw.trim()) }}
            className="mt-3 border-t border-[#ece5fb] pt-3">
            <label className="block text-[11.5px] font-bold text-[#1f1235] mb-1">Try a different Postgres password</label>
            <p className="text-[11px] text-[#5c5279] mb-1.5 leading-relaxed">
              The route is fine — the database answered and rejected the stored password. Used for this
              one run and never saved. If it works, put the same password into <code className="px-1 bg-[#f8f6fd] rounded">DATABASE_URL</code> in
              Railway → @kind/api → Variables.
            </p>
            <div className="flex gap-2">
              <input type="password" value={dbPw} onChange={ev => setDbPw(ev.target.value)}
                placeholder="Postgres password"
                className="flex-1 text-[12.5px] border border-[#ece5fb] rounded-lg px-2.5 py-1.5" />
              <button type="submit" disabled={busy === 'migration' || !dbPw.trim()}
                className="bg-[#1f1235] text-white rounded-lg px-3 py-1.5 text-[12.5px] font-bold disabled:opacity-50">Try it</button>
            </div>
          </form>
        )}
      </div>

      {/* #554 — RLS AUDIT, READ FROM THE LIVE DATABASE.
          The repo has three migration directories and two disagreeing schema snapshots, and
          #558 is the standing finding that none of them describes production. So a verdict
          read off a file is a verdict about a file. This asks pg_policies directly.
          Read-only — two SELECTs against pg_catalog, it changes nothing. */}
      <div className="bg-white rounded-xl border border-[#ece5fb] p-4 mt-4">
        <div className="flex items-start gap-3">
          <div>
            <b className="text-[13px] text-[#1f1235] block">Row-level security</b>
            <p className="text-[11.5px] text-[#5c5279] mt-0.5 leading-relaxed">
              Reads every policy out of the live database and gives a verdict per table. A policy with no{' '}
              <code className="px-1 bg-[#f8f6fd] rounded">TO</code> clause applies to <b>everyone</b> — including anyone
              holding the public key — and permissive policies combine with OR, so one{' '}
              <code className="px-1 bg-[#f8f6fd] rounded">USING (true)</code> defeats every careful policy on that table.
            </p>
          </div>
          <button onClick={runRlsAudit} disabled={busy === 'rls'}
            className="ml-auto shrink-0 bg-[#1f1235] hover:bg-[#312150] text-white rounded-lg px-3.5 py-2 text-[12.5px] font-bold disabled:opacity-60">
            {busy === 'rls' ? 'Reading…' : 'Run RLS audit'}
          </button>
        </div>

        {rlsErr && (
          <p className="text-[11.5px] font-semibold text-red-700 mt-2 leading-relaxed">
            Could not read RLS state: {rlsErr}. This is NOT a pass — nothing was checked.
          </p>
        )}

        {rls && (
          <div className="mt-3">
            <p className={`text-[12px] font-bold ${rls.summary.safe ? 'text-[#0e7c86]' : 'text-red-700'}`}>
              {rls.summary.safe
                ? `No exposed tables. ${rls.summary.denyAll} deny-all · ${rls.summary.scoped} scoped · ${rls.tables_read} tables read.`
                : `${rls.summary.exposed} table(s) readable with the PUBLIC key · ${rls.summary.unprotected} with RLS off.`}
            </p>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full text-[11.5px]">
                <tbody>
                  {rls.verdicts
                    .filter(v => v.verdict === 'exposed' || v.verdict === 'unprotected')
                    .map(v => (
                      <tr key={v.tablename} className="border-b border-[#f4eefe]">
                        <td className="py-1 pr-3 align-top whitespace-nowrap">
                          <code className="px-1 bg-red-50 text-red-800 rounded font-bold">{v.tablename}</code>
                        </td>
                        <td className="py-1 text-[#5c5279] leading-relaxed">
                          {v.finding}
                          {v.offenders.length > 0 && <> <span className="text-red-700 font-semibold">({v.offenders.join(', ')})</span></>}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-[#8b82a8] mt-2">
              Only exposed / RLS-off tables are listed — a healthy table needs no row. Full written verdict:{' '}
              <code className="px-1 bg-[#f8f6fd] rounded">docs/RLS-AUDIT.md</code>. Read {rls.host} at{' '}
              {new Date(rls.checked_at).toLocaleString()}.
            </p>
          </div>
        )}
      </div>

      {/* #329 — SEED DATA. READ-ONLY, ALWAYS SAFE TO PRESS.
          The plan is docs/SEED-WIPE-PLAN.md. Nothing here deletes anything: this reports
          what a wipe WOULD touch, and the execution path is armed by an env var that
          expires the same day. Most likely outcome is "clean" — exclusion (#543) already
          does the job the item was raised for. */}
      <div className="bg-white rounded-xl border border-[#ece5fb] p-4 mt-4">
        <div className="flex items-start gap-3">
          <div>
            <b className="text-[13px] text-[#1f1235] block">Seed data</b>
            <p className="text-[11.5px] text-[#5c5279] mt-0.5 leading-relaxed">
              What a go-live wipe would touch — and what it would refuse to. <b>Read-only.</b> A client with a
              real payment or real leads is protected whatever it is labelled, and the demo and house accounts
              are kept on purpose.
            </p>
          </div>
          <button onClick={runSeedReport} disabled={busy === 'seed'}
            className="ml-auto shrink-0 bg-[#1f1235] hover:bg-[#312150] text-white rounded-lg px-3.5 py-2 text-[12.5px] font-bold disabled:opacity-60">
            {busy === 'seed' ? 'Reading…' : 'Seed data report'}
          </button>
        </div>

        {seedErr && (
          <p className="text-[11.5px] font-semibold text-red-700 mt-2 leading-relaxed">
            Could not build the report: {seedErr}. This is NOT &quot;nothing to clean&quot; — nothing was checked.
          </p>
        )}

        {seed && (
          <div className="mt-3">
            <p className={`text-[12px] font-bold ${seed.clean ? 'text-[#0e7c86]' : 'text-[#5b21b6]'}`}>
              {seed.clean
                ? `Clean — nothing eligible. ${seed.protectedCount} client(s), all protected. #329 closes without deleting anything.`
                : `${seed.eligible.length} eligible · ${seed.protectedCount} protected. Read every eligible row by name before arming anything.`}
            </p>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full text-[11.5px]">
                <tbody>
                  {seed.classifications.map(v => (
                    <tr key={v.clientId} className="border-b border-[#f4eefe]">
                      <td className="py-1 pr-3 align-top whitespace-nowrap font-bold text-[#1f1235]">{v.companyName}</td>
                      <td className="py-1 pr-3 align-top whitespace-nowrap">
                        <span className={`px-1.5 py-0.5 rounded text-[10.5px] font-bold ${
                          v.disposition === 'eligible' ? 'bg-amber-50 text-amber-800' : 'bg-[#f0fdfa] text-[#0e7c86]'
                        }`}>
                          {v.disposition === 'eligible' ? 'eligible' : 'protected'}
                        </span>
                      </td>
                      <td className="py-1 text-[#5c5279] leading-relaxed">{v.reason}</td>
                      {/* #611 — the remove control renders ONLY on an eligible row. A protected
                          row has no button at all, rather than a button that refuses: a control
                          you can press on the demo account is a control somebody presses. */}
                      <td className="py-1 pl-3 align-top text-right whitespace-nowrap">
                        {v.disposition === 'eligible' && (
                          <button onClick={() => { setWipeFor({ clientId: v.clientId, companyName: v.companyName }); setWipeTyped(''); setWipeErr(null); setWipeMsg(null) }}
                            className="text-[11px] font-bold text-red-700 border border-red-200 rounded-lg px-2 py-0.5 hover:bg-red-50">
                            Remove
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* THE CONFIRMATION. Typed, not clicked — a dialog is dismissed by muscle memory
                and a phrase has to be read. Same shape as SEED_WIPE_ARMED and FOUNDER_FLIP. */}
            {wipeFor && (
              <div className="border border-red-300 bg-red-50 rounded-lg px-3 py-2.5 mt-3">
                <b className="text-[12.5px] text-red-900 block">
                  Delete {wipeFor.companyName} — the account, its leads, its ledger and its login.
                </b>
                <p className="text-[11.5px] text-red-800 mt-0.5 leading-relaxed">
                  This cannot be undone and there is no restore. The API re-checks the classification before it
                  acts: a client with a real payment or real leads is refused, and the house and demo accounts are
                  refused by id even if the classifier would have allowed them. Type the company name to confirm.
                </p>
                <div className="flex items-center gap-2 flex-wrap mt-2">
                  <input value={wipeTyped} onChange={e => setWipeTyped(e.target.value)} placeholder={wipeFor.companyName}
                    className="text-[12px] border border-red-300 rounded-lg px-2.5 py-1.5 w-[260px] max-w-full" />
                  <button onClick={() => wipeClient(wipeFor.clientId, wipeFor.companyName)}
                    disabled={busy === `wipe-${wipeFor.clientId}` || wipeTyped.trim().toLowerCase() !== wipeFor.companyName.trim().toLowerCase()}
                    className="bg-red-700 hover:bg-red-800 text-white rounded-lg px-3 py-1.5 text-[12px] font-bold disabled:opacity-40">
                    {busy === `wipe-${wipeFor.clientId}` ? 'Removing…' : 'Delete permanently'}
                  </button>
                  <button onClick={() => { setWipeFor(null); setWipeTyped('') }}
                    className="text-[12px] font-bold text-[#1f1235] border border-[#e4dcf7] rounded-lg px-3 py-1.5 hover:bg-white">
                    Cancel
                  </button>
                </div>
                {wipeErr && <p className="text-[11.5px] font-semibold text-red-800 mt-2 leading-relaxed">{wipeErr}</p>}
              </div>
            )}
            {wipeMsg && !wipeFor && (
              <p className="text-[11.5px] font-semibold text-emerald-800 mt-2 leading-relaxed">{wipeMsg}</p>
            )}
            <p className="text-[11px] text-[#8b82a8] mt-2">
              Plan and runbook: <code className="px-1 bg-[#f8f6fd] rounded">docs/SEED-WIPE-PLAN.md</code>. Execution needs{' '}
              <code className="px-1 bg-[#f8f6fd] rounded">SEED_WIPE_ARMED</code> set to today&apos;s UTC date AND a typed
              confirmation — a value left set from a previous day cannot fire.
            </p>
          </div>
        )}
      </div>

      {/* #298 — BACKUP MANIFEST. Counts only, no data. The piece a restore drill cannot
          work without: press restore, get a green tick, and without a prior manifest there
          is no way to tell whether you got everything, half of it, or last week's copy. */}
      <div className="bg-white rounded-xl border border-[#ece5fb] p-4 mt-4">
        <div className="flex items-start gap-3">
          <div>
            <b className="text-[13px] text-[#1f1235] block">Backup manifest</b>
            <p className="text-[11.5px] text-[#5c5279] mt-0.5 leading-relaxed">
              Every table and its exact row count, right now. <b>Save it off this system</b> — a manifest stored
              only in the database it describes is worthless in the one situation it exists for. Take another
              after any restore and compare: that comparison is the only thing that ever proves a restore worked.
            </p>
          </div>
          <button onClick={runManifest} disabled={busy === 'manifest'}
            className="ml-auto shrink-0 bg-[#1f1235] hover:bg-[#312150] text-white rounded-lg px-3.5 py-2 text-[12.5px] font-bold disabled:opacity-60">
            {busy === 'manifest' ? 'Counting…' : 'Take manifest'}
          </button>
        </div>

        {manErr && (
          <p className="text-[11.5px] font-semibold text-red-700 mt-2 leading-relaxed">
            Could not take a manifest: {manErr}. Do NOT save this as a reference — an empty manifest makes an
            empty database compare clean.
          </p>
        )}

        {man && (
          <div className="mt-3">
            <p className="text-[12px] font-bold text-[#0e7c86]">
              {man.totalTables} tables · {man.totalRows.toLocaleString()} rows · {new Date(man.takenAt).toLocaleString()}
            </p>
            <button
              onClick={() => {
                const blob = new Blob([JSON.stringify(man, null, 2)], { type: 'application/json' })
                const a = document.createElement('a')
                a.href = URL.createObjectURL(blob)
                a.download = `kind-manifest-${man.takenAt.slice(0, 10)}.json`
                a.click()
                URL.revokeObjectURL(a.href)
              }}
              className="mt-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-lg px-3 py-1.5 text-[12px] font-bold">
              Download JSON
            </button>
            <p className="text-[11px] text-[#8b82a8] mt-2">
              Plan and drill runbook: <code className="px-1 bg-[#f8f6fd] rounded">docs/BACKUP-RESTORE-DRILL.md</code>.
              Counts only — no data leaves the database. Read {man.host}.
            </p>
          </div>
        )}
      </div>

      {/* MBF — one button, before a demo or after you've broken it mid-pitch. */}
      <div className="border border-[#e4dcf7] bg-[#faf8ff] rounded-xl px-4 py-3 mb-4">
        <b className="text-[13px] text-[#1f1235] block">MBF — the demo account</b>
        <p className="text-[11.5px] text-[#5c5279] mt-1 leading-relaxed">
          40 invented people, 12 already being worked, 22 waiting to be picked, 6 replies and 2 meetings booked.
          The same cast every time, so the script never changes. Nothing can send — the account is
          flagged demo and every address is <code className="px-1 bg-white rounded">.invalid</code>.
        </p>
        <button onClick={resetDemo} disabled={busy === 'demo'}
          className="mt-2.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-lg px-3.5 py-2 text-[12.5px] font-bold disabled:opacity-60">
          {busy === 'demo' ? 'Rebuilding…' : 'Build / reset MBF'}
        </button>
        {demoMsg && <p className="text-[11.5px] font-semibold text-[#5b21b6] mt-2 leading-relaxed">{demoMsg}</p>}
      </div>

      {/* Kept as an EXPLANATION only — the Run control lives in the always-present card
          above, so it can never disappear with the condition that spawned it. */}
      {e?.migration_pending && (
        <div className="border border-amber-300 bg-amber-50 rounded-xl px-4 py-3 mb-4">
          <b className="text-[13px] text-amber-900 block">Inbox tracking is waiting on a migration.</b>
          <p className="text-[11.5px] text-amber-800 mt-1">
            Deliverability below is live. The inbox list and the &ldquo;needs an inbox&rdquo; queue switch on once
            <code className="mx-1 px-1 bg-white rounded">20260725_client_inboxes</code> has been applied —
            press <b>Run migrations</b> above.
          </p>
        </div>
      )}

      {e && (<>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-5">
          {kpi('Sent today', String(e.totals.sent_today), 'across all clients')}
          {kpi('Sent · 7 days', String(e.totals.sent_7d), 'total volume')}
          {kpi('Open rate · 7d', `${e.totals.open_rate}%`, 'tracked opens')}
          {kpi('Bounce rate · 7d', `${e.totals.bounce_rate}%`, e.totals.bounce_rate >= 3 ? '⚠ over 3% — burning' : 'healthy under 1.5%', bounceTone)}
          {kpi('Opt-outs', String(e.totals.opt_outs_total), 'do-not-contact list')}
        </div>

        {/* #548 — no key, no send, and it says so BEFORE you spend an afternoon wondering why
            the outbox is silent. Placed above everything because it disables the whole page's
            purpose. */}
        {e.secret_key_set === false && (
          <div className="border-2 border-red-300 bg-red-50 rounded-xl px-4 py-3 mb-4">
            <b className="text-[13px] text-red-900 block">Nothing can send — the API cannot read mailbox passwords</b>
            <p className="text-[11.5px] text-red-800 mt-1 leading-relaxed">
              <code className="px-1 bg-white rounded border border-red-200">INBOX_SECRET_KEY</code> is not set on{' '}
              <b>@kind/api</b>. Mailbox passwords are encrypted with it, so without it they cannot be decrypted and
              every send is refused — deliberately, because the alternative is falling back to a shared sender and
              burning every client&apos;s deliverability at once.
              <br />
              Fix: Railway → @kind/api → Variables → add <code className="px-1 bg-white rounded border border-red-200">INBOX_SECRET_KEY</code>.
              Generate the value with <code className="px-1 bg-white rounded border border-red-200">openssl rand -hex 32</code>.
              Keep it — changing it means re-entering every mailbox password.
            </p>
          </div>
        )}

        {/* V9 + #552 — clients who cannot send. The reason is NOT always "no mailbox": a row
            with no SMTP details, or one that is still warming, is equally unable to send, and
            this list used to count those clients as covered. */}
        {/* #552 ③ — SEND READINESS FOR EVERY CLIENT, NOT ONLY THE FAILURES.
            This page previously listed only clients who could NOT send. A client that COULD
            appeared nowhere at all, so "everything is fine" and "this client is missing for
            some other reason" rendered identically — absence read as health, which is the
            #565 shape. The verdict is now stated either way, and the colour separates
            "a job for you" from "not this client's problem": a missing INBOX_SECRET_KEY
            kills EVERY client, and an unknown state is never painted calm. */}
        {(e.readiness?.length ?? 0) > 0 && (
          <>
            <h2 className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#b3a9cc] mb-2">
              Send readiness · {e.readiness!.filter(r => r.can_send).length}/{e.readiness!.length} can send
            </h2>
            <div className="space-y-1.5 mb-6">
              {e.readiness!.map(r => (
                <div key={r.client_id} className={`rounded-xl border px-3.5 py-2 ${READY_TONE[r.tone]}`}>
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <b className="text-[12.5px]">{r.company_name || 'Unnamed client'}</b>
                    <span className="text-[11.5px] font-bold">{r.why}</span>
                  </div>
                  <p className="text-[11.5px] mt-0.5 leading-snug opacity-90">{r.detail}</p>
                  {!r.can_send && <p className="text-[11px] mt-0.5 font-semibold">Next: {r.next_step}</p>}
                </div>
              ))}
            </div>
          </>
        )}

        <h2 className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#b3a9cc] mb-2">Cannot send · {e.needs_inbox.length}</h2>
        {e.needs_inbox.length === 0 ? (
          <div className="border border-emerald-200 bg-emerald-50 rounded-xl px-4 py-3 mb-6 text-[12.5px] font-semibold text-emerald-800">
            Every active client can send from their own mailbox. Nothing waiting on you.
          </div>
        ) : (
          <div className="mb-6 space-y-2">
            {e.needs_inbox.map(c => (
              <div key={c.client_id} className="border border-amber-200 bg-amber-50 rounded-xl px-4 py-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="min-w-0">
                    <b className="text-[13px] text-amber-900 block">{c.company_name || 'Unnamed client'}</b>
                    <span className="text-[11.5px] font-bold text-amber-900 block">{c.why || 'No sending mailbox assigned'}</span>
                    <span className="text-[11.5px] text-amber-700 block">
                      {c.detail || 'Nothing can go out for them. Assign a pre-warmed pooled inbox and they send today.'}
                    </span>
                  </div>
                  {/* Only offer "assign" when there is genuinely nothing assigned. Offering it
                      for a mailbox that merely lacks a password would create a SECOND row and
                      leave the real problem untouched — the fix for those is below, on the
                      mailbox itself. */}
                  {(c.reason ?? 'no_inbox') === 'no_inbox' ? (
                    <button onClick={() => setForm({ clientId: c.client_id, email: '' })}
                      className="ml-auto shrink-0 bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-lg px-3.5 py-2 text-[12.5px] font-bold">
                      Assign pooled inbox
                    </button>
                  ) : (
                    <span className="ml-auto shrink-0 text-[11.5px] font-bold text-amber-800">
                      Fix it on their mailbox below ↓
                    </span>
                  )}
                </div>
                {form?.clientId === c.client_id && (
                  <div className="flex gap-2 mt-3">
                    <input autoFocus value={form.email} onChange={ev => setForm({ ...form, email: ev.target.value })}
                      placeholder="pooled inbox address from Smartlead"
                      className="flex-1 border border-[#ece5fb] rounded-lg px-3 py-2 text-[12.5px] bg-white outline-none focus:border-[#7C3AED]" />
                    <button onClick={() => post('inboxes/assign', { client_id: c.client_id, email: form.email }, c.client_id)}
                      disabled={busy === c.client_id || !form.email.includes('@')}
                      className="bg-[#7C3AED] text-white rounded-lg px-4 text-[12.5px] font-bold disabled:opacity-40">
                      {busy === c.client_id ? 'Saving…' : 'Save'}
                    </button>
                    <button onClick={() => setForm(null)} className="border border-[#ece5fb] rounded-lg px-3 text-[12.5px] font-bold text-[#5c5279]">Cancel</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <h2 className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#b3a9cc] mb-2">Live inboxes · {e.inboxes.length}</h2>
        {e.inboxes.length === 0 ? (
          <div className="border border-[#eee7f7] bg-white rounded-xl px-4 py-8 text-center text-[13px] text-[#9b8ec4]">
            No inboxes recorded yet.
          </div>
        ) : (
          <div className="space-y-2">
            {e.inboxes.map(i => (
              <div key={i.id} className="bg-white border border-[#eee7f7] rounded-xl px-4 py-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="min-w-0">
                    <b className="text-[13px] block truncate">{i.company_name || 'Unnamed client'}</b>
                    <span className="text-[11.5px] text-[#9b8ec4] truncate block">{i.email}</span>
                  </div>
                  {/* #610 — the per-box daily cap, shown on the row so the founder can see the
                      rotation's arithmetic without opening the form. ⚠️ NOT "sent today": that
                      cannot be shown, because `figsy_sent_emails` has no column naming the
                      mailbox that sent it. Showing a today-count we cannot compute would be
                      worse than showing none — see #610. */}
                  <span className="shrink-0 text-[10.5px] font-bold rounded-full border border-[#ece5fb] bg-[#f8f6fd] text-[#5c5279] px-2 py-0.5">
                    {i.daily_cap == null ? 'no cap' : `cap ${i.daily_cap}/day`}
                  </span>
                  <span className={`shrink-0 text-[10.5px] font-extrabold rounded-full border px-2 py-0.5 ${i.kind === 'branded' ? 'text-[#7C3AED] bg-[#f3ecff] border-[#e4d4fb]' : 'text-[#0369a1] bg-[#e0f2fe] border-[#bae6fd]'}`}>
                    {i.kind}
                  </span>
                  <span className={`shrink-0 text-[10.5px] font-extrabold rounded-full border px-2 py-0.5 ${i.status === 'active' ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-[#b45309] bg-[#fffbeb] border-[#fcd34d]'}`}>
                    {i.status}
                  </span>
                  {/* #611 — the fraction counts to THIS row's ready date. It was hardcoded
                      `/14` while these Google boxes warm for 21 days, so around 18 Aug it would
                      have read "14/14 · ready" a full week before the row's own ready date. */}
                  {i.kind === 'branded' && i.warmup_day != null && (
                    <span className="shrink-0 text-[11.5px] font-bold text-[#5c5279]">
                      warm-up {i.warmup_day}{i.warmup_days != null ? `/${i.warmup_days}` : ''}{i.warmup_ready ? ' · ready' : ''}
                    </span>
                  )}
                  {/* #552/#611 — can this mailbox actually send? Asked of the SEND PATH, not of
                      "does it have credentials". Those are different questions, and the chip
                      answered the wrong one: a warming box with credentials saved rendered a
                      green "can send" while `pickSendingInbox` refuses it outright, because
                      sending on a warming mailbox is what un-warms it. */}
                  <span className={`shrink-0 text-[10.5px] font-extrabold rounded-full border px-2 py-0.5 ${i.can_send ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-[#b45309] bg-[#fffbeb] border-[#fcd34d]'}`}>
                    {i.can_send ? 'can send' : (i.send_block ?? 'cannot send')}
                  </span>
                  <div className="ml-auto shrink-0 flex items-center gap-2">
                    <button onClick={() => setCred({
                      inboxId: i.id, clientId: i.client_id,
                      host: i.smtp_host ?? '', port: String(i.smtp_port ?? 587),
                      secure: i.smtp_secure ?? (i.smtp_port ?? 587) === 465,
                      user: i.smtp_user ?? i.email, pass: '', fromName: i.from_name ?? '',
                    })}
                      className="text-[11.5px] font-bold text-[#1f1235] border border-[#e4dcf7] rounded-lg px-2.5 py-1 hover:bg-[#f7f4fd]">
                      {i.has_smtp ? 'Mailbox details' : 'Add mailbox details'}
                    </button>
                    {i.has_smtp && (
                      <button onClick={() => verify(i)} disabled={busy === `v-${i.id}`}
                        className="text-[11.5px] font-bold text-[#7C3AED] border border-[#e4dcf7] rounded-lg px-2.5 py-1 hover:bg-[#f7f4fd] disabled:opacity-50">
                        {busy === `v-${i.id}` ? 'Checking…' : 'Test connection'}
                      </button>
                    )}
                    {/* #553 — "Test connection" authenticates and sends nothing; this sends a
                        real message THROUGH THIS MAILBOX, which is the only way to answer the
                        ladder's "did it land in the inbox?" per box. Shown wherever credentials
                        exist, INCLUDING a warming box: a mailbox cannot be proven while warming
                        and cannot leave warming until it is proven. */}
                    {i.has_smtp && i.status !== 'released' && i.status !== 'retired' && (
                      <button onClick={() => setTestFor(testFor === i.id ? null : i.id)}
                        className="text-[11.5px] font-bold text-[#7C3AED] border border-[#e4dcf7] rounded-lg px-2.5 py-1 hover:bg-[#f7f4fd]">
                        {testFor === i.id ? 'Cancel test' : 'Send test'}
                      </button>
                    )}
                    {i.kind === 'pooled' && (
                      <button onClick={() => setBrandFor({ clientId: i.client_id, email: '' })}
                        className="text-[11.5px] font-bold text-[#7C3AED] border border-[#e4dcf7] rounded-lg px-2.5 py-1 hover:bg-[#f7f4fd]">
                        They paid — add branded
                      </button>
                    )}
                    {/* ⚑ 2 Sep — ACTIVATION ELIGIBILITY IS `status`, AND ONLY `status`. Both halves
                        of the old gate (`kind === 'branded' && … && warmup_ready`) were stale, and
                        each was stale for its own reason.

                        🛑 `kind` — written when `pooled` could only mean a RENTED VENDOR box,
                        released back to a pool as the client switched onto their branded domain
                        around day 29. You would never promote one of those. **#610 redefined
                        `pooled` on 4 Aug** — *"inbox x 2 yes for now but volume is key"* — so it now
                        ALSO means the client's SECOND slot, even when it is our own Google box on
                        our own domain. This line was never revisited, so a mailbox we bought and
                        warmed ourselves sat in the one class the product would never offer to promote.

                        🛑 `warmup_ready` — advisory, and the repo already says so. `client-flow-sop.md`:
                        *"THE WARM-UP CLOCK IS A REMINDER, NOT A GATE… every reader displays it."*
                        `house-client.ts`: *"It is still only a REMINDER. #553's ladder decides when a
                        mailbox sends — not a date arithmetic produced."* Nothing in the send path
                        reads it, and `POST /inboxes/:id/status` never consults a date. It also
                        measures the wrong thing: the clock starts when the row is typed into Vida,
                        not when the mailbox actually began warming, and its two writers disagree
                        (14 days vs 21). Enforcing it here made the ONE date-based read in the
                        product the thing standing between an operator and a proven mailbox.

                        ⚠️ WHAT REMAINS, AND WHY IT IS ENOUGH. `status === 'warming'` keeps this a
                        promotion rather than a general status editor. Pressing it stays an explicit
                        human act — nothing promotes on verify, on the diagnostic send, on Instantly
                        health or on a date. Send eligibility is still `SENDABLE_STATUSES`, which
                        excludes `warming`, so a mailbox sends only once a person has decided it
                        should. The readiness EVIDENCE is #553's ladder, which is deliberately not
                        encoded here: it is an operator judgement, not a checkbox. */}
                    {i.status === 'warming' && (
                      <button onClick={() => post(`inboxes/${i.id}/status`, { client_id: i.client_id, status: 'active' }, i.id)} disabled={busy === i.id}
                        className="text-[11.5px] font-bold text-white bg-emerald-600 rounded-lg px-2.5 py-1 disabled:opacity-50">
                        Switch live
                      </button>
                    )}
                    {i.status !== 'released' && (
                      <button onClick={() => post(`inboxes/${i.id}/status`, { client_id: i.client_id, status: 'released' }, i.id)} disabled={busy === i.id}
                        className="text-[11.5px] font-bold text-[#9b8ec4] disabled:opacity-50">Release</button>
                    )}
                  </div>
                </div>

                {/* #553 — THE TEST SEND. A real email leaves from THIS mailbox, so the
                    address is typed deliberately and the button says what will happen. */}
                {testFor === i.id && (
                  <div className="mt-2 rounded-lg border border-[#e4dcf7] bg-[#faf8fe] px-2.5 py-2">
                    <p className="text-[11px] text-[#5c5279] leading-relaxed mb-1.5">
                      Sends <b>one</b> plain diagnostic email from <b>{i.smtp_user ?? i.email}</b>. No campaign, no
                      enrolment, no outreach is enabled. Send it somewhere you can read the result — your own inbox,
                      or the address mail-tester.com gives you.
                    </p>
                    <div className="flex items-center gap-2">
                      <input
                        value={testTo[i.id] ?? ''}
                        onChange={ev => setTestTo(prev => ({ ...prev, [i.id]: ev.target.value }))}
                        placeholder="you@yourdomain.com"
                        className="flex-1 text-[12px] border border-[#e4dcf7] rounded-lg px-2.5 py-1.5 bg-white" />
                      <button onClick={() => testSend(i)}
                        disabled={busy === `t-${i.id}` || !(testTo[i.id] ?? '').trim()}
                        className="shrink-0 text-[11.5px] font-bold text-white bg-[#7C3AED] rounded-lg px-3 py-1.5 disabled:opacity-50">
                        {busy === `t-${i.id}` ? 'Sending…' : 'Send test email'}
                      </button>
                    </div>
                  </div>
                )}

                {/* The result of asking the mailbox. Kept until the next check so a long error
                    can be read, and never auto-cleared by a reload. */}
                {checked[i.id] && (
                  <p className={`text-[11.5px] font-semibold mt-2 leading-relaxed rounded-lg px-2.5 py-2 border ${checked[i.id].ok ? 'text-emerald-800 bg-emerald-50 border-emerald-200' : 'text-red-800 bg-red-50 border-red-200'}`}>
                    {checked[i.id].message}
                  </p>
                )}

                {/* #552 — WHERE THE MAILBOX DETAILS GO.
                    Before this, "Assign pooled inbox" wrote an address and nothing else, and
                    there was nowhere in the product to type the connection details — so the
                    board showed a covered client who still could not email anyone. */}
                {cred?.inboxId === i.id && (
                  <form onSubmit={ev => { ev.preventDefault(); post(`inboxes/${i.id}/credentials`, {
                    client_id: cred.clientId, smtp_host: cred.host, smtp_port: Number(cred.port),
                    smtp_secure: cred.secure, smtp_user: cred.user, from_name: cred.fromName,
                    ...(cred.pass ? { smtp_pass: cred.pass } : {}),
                  }, `c-${i.id}`) }}
                    className="mt-3 border-t border-[#ece5fb] pt-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <label className="block">
                        <span className="text-[11px] font-bold text-[#1f1235] block mb-1">SMTP host</span>
                        <input value={cred.host} onChange={ev => setCred({ ...cred, host: ev.target.value })}
                          placeholder="smtp.zoho.com" autoFocus
                          className="w-full text-[12.5px] border border-[#ece5fb] rounded-lg px-2.5 py-1.5 outline-none focus:border-[#7C3AED]" />
                      </label>
                      <label className="block">
                        <span className="text-[11px] font-bold text-[#1f1235] block mb-1">Port</span>
                        <div className="flex gap-2">
                          {/* 465 and 587 are not interchangeable — 465 is implicit TLS, 587 is
                              STARTTLS, and mismatching them is the classic way SMTP hangs rather
                              than failing. Two buttons instead of a free-text box + a checkbox. */}
                          {[{ p: '465', l: '465 · SSL', s: true }, { p: '587', l: '587 · STARTTLS', s: false }].map(o => (
                            <button key={o.p} type="button" onClick={() => setCred({ ...cred, port: o.p, secure: o.s })}
                              className={`text-[11.5px] font-bold rounded-lg px-2.5 py-1.5 border ${cred.port === o.p ? 'bg-[#1f1235] text-white border-[#1f1235]' : 'text-[#5c5279] border-[#ece5fb]'}`}>
                              {o.l}
                            </button>
                          ))}
                        </div>
                      </label>
                      <label className="block">
                        <span className="text-[11px] font-bold text-[#1f1235] block mb-1">Username</span>
                        <input value={cred.user} onChange={ev => setCred({ ...cred, user: ev.target.value })}
                          placeholder={i.email}
                          className="w-full text-[12.5px] border border-[#ece5fb] rounded-lg px-2.5 py-1.5 outline-none focus:border-[#7C3AED]" />
                      </label>
                      <label className="block">
                        <span className="text-[11px] font-bold text-[#1f1235] block mb-1">
                          Password {i.has_smtp && <span className="font-normal text-[#9b8ec4]">· {i.smtp_secret}</span>}
                        </span>
                        <input type="password" value={cred.pass} onChange={ev => setCred({ ...cred, pass: ev.target.value })}
                          placeholder={i.has_smtp ? 'leave blank to keep the saved one' : 'app password'}
                          className="w-full text-[12.5px] border border-[#ece5fb] rounded-lg px-2.5 py-1.5 outline-none focus:border-[#7C3AED]" />
                      </label>
                      <label className="block sm:col-span-2">
                        <span className="text-[11px] font-bold text-[#1f1235] block mb-1">
                          Display name <span className="font-normal text-[#9b8ec4]">· optional, shown as &ldquo;Name &lt;{i.email}&gt;&rdquo;</span>
                        </span>
                        <input value={cred.fromName} onChange={ev => setCred({ ...cred, fromName: ev.target.value })}
                          placeholder="who the prospect sees this from"
                          className="w-full text-[12.5px] border border-[#ece5fb] rounded-lg px-2.5 py-1.5 outline-none focus:border-[#7C3AED]" />
                      </label>
                    </div>
                    <p className="text-[11px] text-[#5c5279] mt-2 leading-relaxed">
                      The password is encrypted before it is stored and is never shown or sent back — only the
                      fingerprint above. <b>Google mailboxes need an App Password</b> (Security → App Passwords,
                      2-Step Verification on), not the account password. <b>Microsoft/Outlook needs SMTP AUTH enabled</b> for
                      the mailbox. Both refuse an ordinary password by default and say only that the login was wrong.
                    </p>
                    <div className="flex gap-2 mt-2">
                      <button type="submit" disabled={busy === `c-${i.id}` || !cred.host.trim() || !cred.user.trim()}
                        className="bg-[#7C3AED] text-white rounded-lg px-4 py-1.5 text-[12.5px] font-bold disabled:opacity-40">
                        {busy === `c-${i.id}` ? 'Saving…' : 'Save details'}
                      </button>
                      <button type="button" onClick={() => setCred(null)}
                        className="border border-[#ece5fb] rounded-lg px-3 py-1.5 text-[12.5px] font-bold text-[#5c5279]">Cancel</button>
                    </div>
                  </form>
                )}

                {brandFor?.clientId === i.client_id && (
                  <div className="flex gap-2 mt-3">
                    <input autoFocus value={brandFor.email} onChange={ev => setBrandFor({ ...brandFor, email: ev.target.value })}
                      placeholder="their own branded address (warms ~14 days, no gap)"
                      className="flex-1 border border-[#ece5fb] rounded-lg px-3 py-2 text-[12.5px] outline-none focus:border-[#7C3AED]" />
                    <button onClick={() => post('inboxes/brand', { client_id: i.client_id, email: brandFor.email }, `b-${i.id}`)}
                      disabled={busy === `b-${i.id}` || !brandFor.email.includes('@')}
                      className="bg-[#7C3AED] text-white rounded-lg px-4 text-[12.5px] font-bold disabled:opacity-40">
                      {busy === `b-${i.id}` ? 'Saving…' : 'Start warming'}
                    </button>
                    <button onClick={() => setBrandFor(null)} className="border border-[#ece5fb] rounded-lg px-3 text-[12.5px] font-bold text-[#5c5279]">Cancel</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </>)}
    </div>
  )
}
