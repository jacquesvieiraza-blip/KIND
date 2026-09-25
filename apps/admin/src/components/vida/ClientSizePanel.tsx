'use client'
// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 25 Sep (R166 ② · P7, board #2353) — THE CLIENT'S COMPANY SIZE, IN VIDA.
//
// The band (Founders 1–50 · Growth 51–200 · Enterprise 200+) sets the client's price per
// meeting, and is set by THEIR company size — found once from Apollo, or by a person when it
// cannot be (free email, no website, not found). Locked once set; changing it needs a reason.
// Same panel style as the meetings panel beside it (R167: no UI redesign).
// ═══════════════════════════════════════════════════════════════════════════════════════
import { useCallback, useEffect, useState } from 'react'
import { SIZE_BANDS, SIZE_REVIEW_REASON_COPY, sizeBandLabel, type SizeBand, type SizeReviewReason } from '@kind/shared'

type Size = {
  size_band: SizeBand | null; size_employees: number | null; size_source: 'apollo' | 'person' | null
  size_review_reason: SizeReviewReason | null; size_checked_at: string | null; size_locked_at: string | null
  size_set_by: string | null; size_note: string | null; website: string | null
}

const when = (s: string | null) => s ? new Date(s).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'

export default function ClientSizePanel({ clientId }: { clientId: string }) {
  const [size, setSize] = useState<Size | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [band, setBand] = useState<SizeBand | ''>('')
  const [employees, setEmployees] = useState('')
  const [note, setNote] = useState('')

  const load = useCallback(async () => {
    try {
      const j = await fetch(`/api/proxy/operator/client-size?client_id=${encodeURIComponent(clientId)}`).then(r => r.json())
      if (!j?.success) throw new Error(j?.error || 'The size could not be loaded.')
      setSize(j.data); setError(null)
    } catch (e) { setError(e instanceof Error ? e.message : 'The size could not be loaded.') }
  }, [clientId])
  useEffect(() => { setSize(null); setBand(''); setEmployees(''); setNote(''); setMsg(null); void load() }, [load])

  const check = useCallback(async () => {
    setBusy(true); setMsg(null)
    try {
      const j = await fetch('/api/proxy/operator/client-size/check', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: clientId }),
      }).then(r => r.json())
      if (!j?.success) throw new Error(j?.error || 'The check did not run.')
      setMsg(j.data?.status === 'set' ? `Found: ${sizeBandLabel(j.data.band)}${j.data.employees ? ` (${j.data.employees} employees)` : ''}. Locked.` : j.data?.message ?? 'Needs a person.')
      await load()
    } catch (e) { setMsg(e instanceof Error ? e.message : 'The check did not run.') }
    finally { setBusy(false) }
  }, [clientId, load])

  const save = useCallback(async () => {
    if (!band) return
    const locked = !!size?.size_locked_at
    if (!confirm(`${locked ? 'Change' : 'Set'} this client's band to ${sizeBandLabel(band)}?\n\nIt sets their price per meeting and is locked.`)) return
    setBusy(true); setMsg(null)
    try {
      const j = await fetch('/api/proxy/operator/client-size', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: clientId, band, employees: employees || null, note }),
      }).then(r => r.json())
      if (!j?.success) throw new Error(j?.error || 'The band was not saved.')
      setMsg(`Set to ${sizeBandLabel(band)}. Locked.`); setBand(''); setNote('')
      await load()
    } catch (e) { setMsg(e instanceof Error ? e.message : 'The band was not saved.') }
    finally { setBusy(false) }
  }, [clientId, band, employees, note, size, load])

  return (
    <div className="border border-[#eee7f7] rounded-xl px-3 py-2.5 mb-3" data-testid="client-size-panel">
      <b className="text-[13px] block mb-1">Company size — sets their price per meeting</b>
      {error && <p className="text-[12px] text-red-700">{error}</p>}
      {!size && !error && <p className="text-[12px] text-[#9b8ec4]">Loading…</p>}
      {size && (
        <>
          {size.size_locked_at && size.size_band ? (
            <p className="text-[12.5px]">
              <b>{sizeBandLabel(size.size_band)}</b>
              {size.size_employees ? <span className="text-[#6b5f8c]"> · {size.size_employees} employees</span> : null}
              <span className="text-[#9b8ec4]"> · {size.size_source === 'apollo' ? 'from Apollo' : `set by ${size.size_set_by}`} · locked {when(size.size_locked_at)}</span>
            </p>
          ) : size.size_review_reason ? (
            <p className="text-[12.5px] text-amber-800">Needs you: {SIZE_REVIEW_REASON_COPY[size.size_review_reason]}</p>
          ) : (
            <p className="text-[12.5px] text-[#9b8ec4]">Not checked yet — it is checked after the Brief.</p>
          )}
          {size.size_note && <p className="text-[11.5px] text-[#9b8ec4]">{size.size_note}</p>}
          {msg && <p className="text-[12px] text-[#5b21b6] mt-1">{msg}</p>}
          <div className="flex flex-wrap items-center gap-2 mt-2 text-[12.5px]">
            {!size.size_locked_at && (
              <button onClick={() => void check()} disabled={busy} className="text-[12px] font-bold text-[#5b21b6] border border-[#d8c8f5] rounded-lg px-2 py-1 disabled:opacity-40">Check with Apollo</button>
            )}
            <select id="size-band" value={band} onChange={e => setBand(e.target.value as SizeBand | '')} className="border border-[#e6dcf7] rounded-lg px-2 py-1 bg-white">
              <option value="">{size.size_locked_at ? 'Change band…' : 'Set band…'}</option>
              {SIZE_BANDS.map(b => <option key={b.key} value={b.key}>{b.label} ({b.max ? `${b.min}–${b.max}` : `${b.min - 1}+`})</option>)}
            </select>
            <input id="size-employees" value={employees} onChange={e => setEmployees(e.target.value)} placeholder="employees (optional)" inputMode="numeric"
              className="w-36 border border-[#e6dcf7] rounded-lg px-2 py-1" />
            <input id="size-note" value={note} onChange={e => setNote(e.target.value)} placeholder={size.size_locked_at ? 'why (required to change)' : 'note (optional)'}
              className="flex-1 min-w-[160px] border border-[#e6dcf7] rounded-lg px-2 py-1" />
            <button onClick={() => void save()} disabled={busy || !band} className="text-[12px] font-bold text-white bg-[#7C3AED] rounded-lg px-2.5 py-1 disabled:opacity-40">Save</button>
          </div>
        </>
      )}
    </div>
  )
}
