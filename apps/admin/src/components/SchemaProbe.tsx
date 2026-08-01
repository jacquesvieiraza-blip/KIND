'use client'

// SCHEMA PROBE — #558's questions, asked of the live database (#558 / #599).
//
// ── WHY THIS CARD EXISTS ─────────────────────────────────────────────────────────────────
//
// `docs/SCHEMA-DRIFT.md` shipped eight queries and told the founder to paste them into
// "Vida → Engine → SQL". **That screen does not exist.** The only SQL path is
// `/operator/migrations/run` (reviewed constants only, correct, not to be widened), and
// `DATABASE_URL` is mangled so there is no Postgres connection either. Eight correct queries
// with nowhere to run them is a finding that sits there.
//
// Six of them are answerable without SQL at all: **selecting a column that does not exist is
// an error with a specific code**, so the request IS the probe. This is the button.
//
// ── THE ONE RULE THE RENDERING TURNS ON ──────────────────────────────────────────────────
//
// **❓ UNKNOWABLE IS RED, NOT GREY.** A bad key, a paused project or a dropped connection all
// come back unknowable, and painting that the same calm colour as "exists" would let an
// outage read as a clean schema. Same rule as the sending panel's NOT-MEASURED (#576) and
// the readiness board's tone split (#600): a state we could not determine never wears the
// colour of a state we did.

import { useState } from 'react'

type Verdict = 'exists' | 'missing' | 'unknowable'
type Probe = {
  id: string; kind: 'table' | 'column'; table: string; column?: string
  question: string; ifMissing: string
  verdict: Verdict; detail: string | null; code: string | null
}
type Count = { measured: true; value: number } | { measured: false; why: string }
type Safety = { safe: boolean | null; headline: string; detail: string }
type Data = {
  probes: Probe[]
  ledger_counts: Record<string, Count>
  migration_safety: Safety
  needs_pg_connection: { id: string; question: string; why: string }[]
  generated_at: string
}

const TONE: Record<Verdict, string> = {
  exists:     'bg-emerald-50 border-emerald-200 text-emerald-900',
  missing:    'bg-amber-50 border-amber-300 text-amber-900',
  // RED on purpose — see the header. "We could not tell" must never read as calm.
  unknowable: 'bg-red-50 border-red-300 text-red-900',
}
const LABEL: Record<Verdict, string> = {
  exists: 'EXISTS', missing: 'MISSING', unknowable: 'COULD NOT TELL',
}

export default function SchemaProbe() {
  const [busy, setBusy] = useState(false)
  const [d, setD] = useState<Data | null>(null)
  // Kept SEPARATE from `d` deliberately: a failed run must never render as an empty (and
  // therefore reassuring) list. Same separation as the RLS and seed-report panels.
  const [error, setError] = useState<string | null>(null)

  async function run() {
    setBusy(true); setError(null); setD(null)
    try {
      const j = await fetch('/api/proxy/operator/schema-probe').then(r => r.json())
      if (!j?.success) throw new Error(j?.error || 'The probe could not run')
      setD(j.data as Data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The probe could not run and gave no reason.')
    } finally {
      setBusy(false)
    }
  }

  const safetyTone = d?.migration_safety.safe === true
    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
    : d?.migration_safety.safe === false
      ? 'bg-amber-50 border-amber-300 text-amber-900'
      : 'bg-red-50 border-red-300 text-red-900'

  return (
    <div className="bg-white rounded-xl border border-[#ece5fb] p-4 mt-4">
      <div className="flex items-start gap-3">
        <div>
          <b className="text-[13px] text-[#1f1235] block">Schema probe (#558)</b>
          <p className="text-[11.5px] text-[#5c5279] mt-0.5 leading-relaxed">
            Asks the <b>live database</b> the six questions <code className="px-1 bg-[#f8f6fd] rounded">SCHEMA-DRIFT.md</code> could
            only write down. No SQL — selecting a column that does not exist is an error with a specific code, so the
            request <i>is</i> the probe. <b>Read-only</b>: every call is <code className="px-1 bg-[#f8f6fd] rounded">limit 0</code> with
            a head count, so nothing is written and no row is read. Safe to press any time.
          </p>
        </div>
        <button onClick={run} disabled={busy}
          className="ml-auto shrink-0 bg-[#1f1235] hover:bg-[#312150] text-white rounded-lg px-3.5 py-2 text-[12.5px] font-bold disabled:opacity-60">
          {busy ? 'Probing…' : d ? 'Probe again' : 'Run the probe'}
        </button>
      </div>

      {error && (
        <div className="border border-red-300 bg-red-50 rounded-lg px-3 py-2.5 mt-3">
          <b className="text-[12.5px] text-red-900 block">Couldn&apos;t run the probe.</b>
          <p className="text-[11.5px] text-red-800 mt-0.5 leading-relaxed">
            This is <b>NOT</b> &ldquo;the schema is fine&rdquo; — it means we could not find out. {error}
          </p>
        </div>
      )}

      {d && (
        <div className="mt-3 border-t border-[#ece5fb] pt-3 space-y-2">
          {d.probes.map(p => (
            <div key={p.id} className={`rounded-lg border px-3 py-2 ${TONE[p.verdict]}`}>
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-[10.5px] font-extrabold tracking-wide">{LABEL[p.verdict]}</span>
                <b className="text-[12.5px]">{p.question}</b>
              </div>
              {/* The consequence is shown only when it applies. A "what if it were missing"
                  paragraph under a green row is noise that teaches you to skim the card. */}
              {p.verdict === 'missing' && <p className="text-[11.5px] mt-1 leading-relaxed">{p.ifMissing}</p>}
              {p.verdict === 'unknowable' && (
                <p className="text-[11.5px] mt-1 leading-relaxed">
                  The probe reached an error we can&apos;t read as an answer, so this is <b>not</b> evidence the column
                  is absent: {p.detail}{p.code ? ` (${p.code})` : ''}
                </p>
              )}
            </div>
          ))}

          <div className={`rounded-lg border px-3 py-2 ${safetyTone}`}>
            <b className="text-[12.5px] block">{d.migration_safety.headline}</b>
            <p className="text-[11.5px] mt-0.5 leading-relaxed">{d.migration_safety.detail}</p>
            <p className="text-[11px] mt-1 opacity-80">
              {Object.entries(d.ledger_counts).map(([t, c]) => (
                <span key={t} className="mr-3">
                  <b>{t}</b>: {c.measured ? c.value.toLocaleString() : `not counted — ${c.why}`}
                </span>
              ))}
            </p>
          </div>

          {/* The gap travels WITH the answers. Discovering later that a doc never covered
              something is how it gets trusted for what it does not say. */}
          <div className="rounded-lg border border-[#ece5fb] bg-[#faf8ff] px-3 py-2">
            <b className="text-[12px] text-[#1f1235] block">Two questions this cannot answer</b>
            <p className="text-[11.5px] text-[#5c5279] mt-0.5 leading-relaxed">
              PostgREST exposes tables, not the catalogue — so these need a real Postgres connection, which means
              fixing <code className="px-1 bg-white rounded border border-[#ece5fb]">DATABASE_URL</code> in
              Railway → @kind/api. That one paste also unblocks <b>Run migrations</b>, the RLS audit and the backup manifest.
            </p>
            <ul className="mt-1.5 space-y-1">
              {d.needs_pg_connection.map(n => (
                <li key={n.id} className="text-[11.5px] text-[#5c5279]">
                  <b className="text-[#1f1235]">{n.question}</b> — {n.why}
                </li>
              ))}
            </ul>
          </div>

          <p className="text-[11px] text-[#9b8ec4]">Probed {new Date(d.generated_at).toUTCString()}.</p>
        </div>
      )}
    </div>
  )
}
