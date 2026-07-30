'use client'

// IMPORT LEADS (CSV) — #549, amended 30 Jul.
//
// Client Zero's prospects come out of the founder's own Apollo account as a CSV. Our engine can
// only mail what is in our tables, so without this screen the list lives in a spreadsheet and
// the product cannot reach it.
//
// ── THE TWO RULES THIS UI EXISTS TO HONOUR ───────────────────────────────────────────────
//
// ① EVERY SKIPPED ROW IS NAMED, WITH ITS LINE NUMBER. An import that reports only "imported
//    700" is the #349 defect in file form: the operator uploads a thousand, reads a success,
//    and never learns that three hundred were suppressed. The skipped table is not a detail
//    view — it is the point.
// ② CHECK BEFORE IMPORT. The dry run is offered FIRST and is the primary button, because for a
//    thousand rows "look at what would happen" and "hope" are different operations.
//
// The cap is stated on the screen before the file is chosen, not discovered when the upload is
// refused. A limit the operator cannot see is a trap.

import { useEffect, useState } from 'react'

const MAX_IMPORT_ROWS = 1000

type Client = { id: string; company_name: string | null; house_or_demo?: boolean; is_demo?: boolean }
type Skip = { line: number; outcome: 'duplicate' | 'suppressed' | 'invalid'; email: string | null; why: string }
type Result = {
  dry_run: boolean
  client: string
  headers: string[]
  total: number
  inserted: number
  tally: { imported: number; duplicate: number; suppressed: number; invalid: number }
  skipped: Skip[]
}

const OUTCOME_TONE: Record<string, string> = {
  suppressed: 'bg-red-50 text-red-800 border-red-200',
  duplicate:  'bg-amber-50 text-amber-800 border-amber-200',
  invalid:    'bg-slate-100 text-slate-700 border-slate-300',
}

// What each skipped outcome MEANS, in the operator's terms. "Suppressed" and "duplicate" look
// equally harmless in a count; only one of them is a person who told us to stop.
const OUTCOME_MEANS: Record<string, string> = {
  suppressed: 'Opted out or on the do-not-contact list — deliberately not imported.',
  duplicate:  'Already on this client’s desk, or listed twice in the file.',
  invalid:    'No usable email address, so this row could never be contacted.',
}

export default function ImportLeads() {
  const [clients, setClients] = useState<Client[] | null>(null)
  const [clientsErr, setClientsErr] = useState<string | null>(null)
  const [clientId, setClientId] = useState('')
  const [csv, setCsv] = useState('')
  const [fileName, setFileName] = useState('')
  const [busy, setBusy] = useState<null | 'check' | 'import'>(null)
  const [result, setResult] = useState<Result | null>(null)
  // Kept SEPARATE from `result` on purpose: a failed import must never render as an empty
  // report, which reads as "nothing to do" (#565). Same separation as the RLS/seed panels.
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/proxy/operator/clients')
      .then(r => r.json())
      .then(j => {
        if (!j?.success) throw new Error(j?.error || 'Could not load clients')
        setClients(j.data as Client[])
      })
      .catch(e => setClientsErr(e instanceof Error ? e.message : 'Could not load clients'))
  }, [])

  // Counted in the browser so the cap is visible BEFORE the upload — the server enforces the
  // same number, but being told "too big" after a wait is a worse experience than being told
  // before. Quoted newlines make this an estimate, hence "about"; the server's count is the
  // one that decides.
  const roughRows = csv.trim() ? Math.max(0, csv.trim().split('\n').length - 1) : 0
  const overCap = roughRows > MAX_IMPORT_ROWS

  async function run(dryRun: boolean) {
    setBusy(dryRun ? 'check' : 'import')
    setError(null)
    setResult(null)
    try {
      const r = await fetch('/api/proxy/operator/import-leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: clientId, csv, dry_run: dryRun }),
      })
      const j = await r.json()
      if (!j?.success) {
        setError(j?.error || `The import failed (${r.status}).`)
        // A PARTIAL failure still carries the true counts. Showing them is the whole point:
        // the operator's next move depends on how many actually landed.
        if (j?.data) setResult({ dry_run: false, client: '', headers: [], total: 0, ...j.data } as Result)
        return
      }
      setResult(j.data as Result)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The request failed and gave no reason.')
    } finally {
      setBusy(null)
    }
  }

  const chosen = clients?.find(c => c.id === clientId)
  const canRun = !!clientId && !!csv.trim() && !overCap && busy === null

  return (
    <div className="bg-white rounded-xl border border-[#ece5fb] p-4 mt-4">
      <b className="text-[13px] text-[#1f1235] block">Import leads (CSV)</b>
      <p className="text-[11.5px] text-[#5c5279] mt-0.5 leading-relaxed">
        Loads a list of prospects onto a client. Every row passes the <b>same gates a sourced lead passes</b> —
        opt-outs, the do-not-contact list, and anything this client already holds are dropped and listed below,
        never silently. Imported leads land as <code className="px-1 bg-[#f8f6fd] rounded">pending</code> exactly
        like sourced ones, so they appear on the desk and flow approve → enrol → send.
        {' '}<b>Nothing is charged on import</b> — money still moves only at approve.
        Up to <b>{MAX_IMPORT_ROWS.toLocaleString()} rows per file</b>.
      </p>

      {clientsErr && (
        <p className="text-[11.5px] font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mt-3">
          Could not load the client list: {clientsErr}
        </p>
      )}

      <div className="flex flex-wrap gap-2 items-center mt-3">
        <select
          value={clientId}
          onChange={ev => { setClientId(ev.target.value); setResult(null); setError(null) }}
          className="text-[12.5px] border border-[#ece5fb] rounded-lg px-2.5 py-1.5 bg-white min-w-[220px]"
        >
          <option value="">{clients ? 'Choose a client…' : 'Loading clients…'}</option>
          {(clients ?? []).map(c => (
            <option key={c.id} value={c.id}>
              {c.company_name || 'Unnamed client'}{c.is_demo || c.house_or_demo ? ' · demo/house' : ''}
            </option>
          ))}
        </select>

        <label className="text-[12.5px] font-bold text-[#5c5279] border border-[#ece5fb] rounded-lg px-3 py-1.5 cursor-pointer hover:bg-[#f8f6fd]">
          {fileName || 'Choose CSV…'}
          <input
            type="file" accept=".csv,text/csv" className="hidden"
            onChange={async ev => {
              const f = ev.target.files?.[0]
              if (!f) return
              setFileName(f.name)
              setCsv(await f.text())
              setResult(null); setError(null)
            }}
          />
        </label>
        {csv.trim() && (
          <span className="text-[11.5px] text-[#5c5279]">about {roughRows.toLocaleString()} row{roughRows === 1 ? '' : 's'}</span>
        )}
      </div>

      {/* A demo account must never hold real people — the next demo would mail them. The API
          refuses this too; saying it here means the operator does not have to try it first. */}
      {chosen && (chosen.is_demo || chosen.house_or_demo) && (
        <p className="text-[11.5px] font-semibold text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-2">
          That is a demo/house account. If it is a <b>demo</b> client the import will be refused — real people in a
          demo account get mailed the next time it is shown.
        </p>
      )}

      {overCap && (
        <p className="text-[11.5px] font-semibold text-red-800 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mt-2">
          That file looks like about {roughRows.toLocaleString()} rows — the cap is {MAX_IMPORT_ROWS.toLocaleString()} per
          file. Split it and upload the parts.
        </p>
      )}

      <div className="flex gap-2 mt-3">
        {/* CHECK IS THE PRIMARY BUTTON. Importing without looking is the version of this screen
            that quietly puts three hundred suppressed people onto a desk. */}
        <button onClick={() => run(true)} disabled={!canRun}
          className="bg-[#1f1235] hover:bg-[#312150] text-white rounded-lg px-3.5 py-2 text-[12.5px] font-bold disabled:opacity-40">
          {busy === 'check' ? 'Checking…' : 'Check the file (writes nothing)'}
        </button>
        <button onClick={() => run(false)} disabled={!canRun}
          className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-lg px-3.5 py-2 text-[12.5px] font-bold disabled:opacity-40">
          {busy === 'import' ? 'Importing…' : 'Import'}
        </button>
      </div>

      {error && (
        <div className="border border-red-300 bg-red-50 rounded-lg px-3 py-2.5 mt-3">
          <b className="text-[12.5px] text-red-900 block">The import did not complete.</b>
          <p className="text-[11.5px] text-red-800 mt-0.5 leading-relaxed">{error}</p>
        </div>
      )}

      {result && (
        <div className="mt-3 border-t border-[#ece5fb] pt-3">
          <p className="text-[12.5px] font-bold text-[#1f1235]">
            {result.dry_run
              ? `Dry run — nothing was written. ${result.tally.imported.toLocaleString()} of ${result.total.toLocaleString()} rows would import.`
              : `${result.inserted.toLocaleString()} lead${result.inserted === 1 ? '' : 's'} imported${result.client ? ` for ${result.client}` : ''}.`}
          </p>

          <div className="flex flex-wrap gap-1.5 mt-2">
            {(['imported', 'duplicate', 'suppressed', 'invalid'] as const).map(k => (
              <span key={k} className={`text-[11.5px] rounded-lg border px-2 py-1 ${k === 'imported' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : OUTCOME_TONE[k]}`}>
                <b className="tabular-nums">{result.tally[k].toLocaleString()}</b> {k}
              </span>
            ))}
          </div>

          {result.headers.length > 0 && (
            <p className="text-[11px] text-[#5c5279] mt-2">
              Columns read: {result.headers.join(' · ')}
            </p>
          )}

          {result.skipped.length > 0 ? (
            <div className="mt-3">
              <p className="text-[11.5px] font-bold text-[#1f1235] mb-1">
                Every row that did not import ({result.skipped.length.toLocaleString()}) — line numbers match your spreadsheet
              </p>
              <div className="max-h-72 overflow-y-auto border border-[#ece5fb] rounded-lg">
                <table className="w-full text-[11.5px]">
                  <tbody>
                    {result.skipped.map(s => (
                      <tr key={`${s.line}-${s.email ?? ''}`} className="border-b border-[#f3eefc] last:border-0">
                        <td className="px-2 py-1.5 text-[#9b8ec4] tabular-nums align-top w-12">{s.line}</td>
                        <td className="px-2 py-1.5 align-top w-24">
                          <span className={`rounded border px-1.5 py-0.5 font-bold ${OUTCOME_TONE[s.outcome]}`}>{s.outcome}</span>
                        </td>
                        <td className="px-2 py-1.5 align-top text-[#1f1235] break-all">{s.email || '—'}</td>
                        <td className="px-2 py-1.5 align-top text-[#5c5279]">{s.why}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <ul className="mt-1.5 space-y-0.5">
                {Array.from(new Set(result.skipped.map(s => s.outcome))).map(o => (
                  <li key={o} className="text-[11px] text-[#5c5279]"><b>{o}</b> — {OUTCOME_MEANS[o]}</li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-[11.5px] text-[#5c5279] mt-2">Every row was usable — nothing was skipped.</p>
          )}
        </div>
      )}
    </div>
  )
}
