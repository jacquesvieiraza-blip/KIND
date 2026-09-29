'use client'
// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 29 Sep (R174 · 5g) — HEALTH'S USEFUL HALF, INSIDE SYSTEM.
//
// The Health page painted its services green from a static list without probing them; System
// already probes every service and says NOT-MEASURED when it cannot. What Health had that
// System lacked was history: the last run of each scheduled job, and the API errors captured
// to `error_events`. Those two live here now. ⚠️ A FAILED READ SAYS SO — Health rendered a
// failed error read as "No errors captured — clean", which is the one thing it must not say.
// ═══════════════════════════════════════════════════════════════════════════════════════
import { useEffect, useState } from 'react'

type CronRun = { job: string; started_at: string | null; finished_at: string | null; ok: boolean | null; note: string | null }
type ErrorEvent = { id: string; route: string | null; method: string | null; status: number | null; message: string | null; created_at: string }
type Read<T> = { state: 'loading' } | { state: 'ok'; data: T } | { state: 'failed'; why: string }

function useAdminRead<T>(path: string, pick: (j: any) => T | undefined): Read<T> {
  const [r, setR] = useState<Read<T>>({ state: 'loading' })
  useEffect(() => {
    let alive = true
    fetch(`/api/proxy/admin/${path}`, { cache: 'no-store' }).then(res => res.json())
      .then(j => { if (!alive) return; const d = j?.success ? pick(j) : undefined; setR(d !== undefined ? { state: 'ok', data: d } : { state: 'failed', why: j?.error || 'the API returned no data' }) })
      .catch(e => { if (alive) setR({ state: 'failed', why: e instanceof Error ? e.message : 'unreachable' }) })
    return () => { alive = false }
  }, [path])  // eslint-disable-line react-hooks/exhaustive-deps
  return r
}

export default function SystemHistory() {
  const crons = useAdminRead<CronRun[]>('cron-runs', j => j.data?.jobs)
  const errors = useAdminRead<ErrorEvent[]>('errors', j => j.data?.errors)
  const box = 'bg-white border border-[#eee7f7] rounded-xl px-4 py-3'
  return (
    <div className="space-y-3" data-testid="system-history">
      <div className={box}>
        <b className="text-[12.5px]">Scheduled jobs — last run</b>
        {crons.state === 'loading' ? <p className="text-[11.5px] text-[#9b8ec4] mt-1">Loading…</p>
          : crons.state === 'failed' ? <p className="text-[11.5px] text-red-600 mt-1">Could not read the job history ({crons.why}). This is not "all fine".</p>
          : crons.data.length === 0 ? <p className="text-[11.5px] text-[#9b8ec4] mt-1">No job has recorded a run yet.</p>
          : crons.data.map(r => (
            <p key={r.job} className="text-[11.5px] text-[#5c5279] mt-1 flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${r.ok === false ? 'bg-red-400' : r.ok ? 'bg-emerald-400' : 'bg-gray-300'}`} />
              <b>{r.job}</b> · {r.started_at ? new Date(r.started_at).toLocaleString() : '—'}{r.ok === false && r.note ? ` · ${r.note}` : ''}
            </p>
          ))}
      </div>
      <div className={box}>
        <b className="text-[12.5px]">Recent API errors</b>
        {errors.state === 'loading' ? <p className="text-[11.5px] text-[#9b8ec4] mt-1">Loading…</p>
          : errors.state === 'failed' ? <p className="text-[11.5px] text-red-600 mt-1">Could not read the error log ({errors.why}). This is not "no errors".</p>
          : errors.data.length === 0 ? <p className="text-[11.5px] text-emerald-700 mt-1">No errors captured.</p>
          : errors.data.map(e => (
            <p key={e.id} className="text-[11.5px] text-[#5c5279] mt-1"><span className="text-red-600">{e.status ?? 500}</span> · {e.method} {e.route} · {e.message} · {new Date(e.created_at).toLocaleString()}</p>
          ))}
      </div>
    </div>
  )
}
