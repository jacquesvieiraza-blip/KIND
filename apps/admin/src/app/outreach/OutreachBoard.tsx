'use client'

import { useMemo, useRef, useState } from 'react'
import { Card, SectionLabel, Pill } from '@/components/ui'

// The editable weekly grid + the "what's working" verdict (cashflow §7B). Each cell
// writes back through the admin proxy (PUT /api/proxy/outreach/:week) on change,
// debounced; the verdict recomputes live from the totals. No secret ever touches the
// browser — the proxy injects the admin key server-side.

const CHANNELS = [
  { k: 'warm', label: 'Warm intros' },
  { k: 'dm', label: 'LinkedIn DMs' },
  { k: 'email', label: 'Emails' },
  { k: 'call', label: 'Calls' },
] as const

export type WeekRow = {
  week_start: string
  warm_sent: number; warm_demos: number
  dm_sent: number; dm_demos: number
  email_sent: number; email_demos: number
  call_sent: number; call_demos: number
  closes: number
}

type Field = Exclude<keyof WeekRow, 'week_start'>

function fmtWeek(iso: string): string {
  const d = new Date(iso + 'T00:00:00Z')
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' })
}

export default function OutreachBoard({ initialWeeks }: { initialWeeks: WeekRow[] }) {
  const [weeks, setWeeks] = useState<WeekRow[]>(initialWeeks)
  const [savingWeek, setSavingWeek] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  function save(week: string, row: WeekRow) {
    clearTimeout(timers.current[week])
    timers.current[week] = setTimeout(async () => {
      setSavingWeek(week)
      setError(null)
      const { week_start, ...nums } = row
      try {
        const res = await fetch(`/api/proxy/outreach/${week_start}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(nums),
        })
        const json = await res.json().catch(() => ({}))
        if (!res.ok || !json.success) throw new Error(json.error || `Save failed (${res.status})`)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Save failed')
      } finally {
        setSavingWeek((w) => (w === week ? null : w))
      }
    }, 600)
  }

  function edit(week: string, field: Field, value: string) {
    const n = Math.max(0, parseInt(value.replace(/[^0-9]/g, ''), 10) || 0)
    setWeeks((prev) => {
      const next = prev.map((w) => (w.week_start === week ? { ...w, [field]: n } : w))
      const row = next.find((w) => w.week_start === week)!
      save(week, row)
      return next
    })
  }

  const totals = useMemo(() => {
    const t: Record<Field, number> = {
      warm_sent: 0, warm_demos: 0, dm_sent: 0, dm_demos: 0,
      email_sent: 0, email_demos: 0, call_sent: 0, call_demos: 0, closes: 0,
    }
    for (const w of weeks) for (const f of Object.keys(t) as Field[]) t[f] += Number(w[f]) || 0
    return t
  }, [weeks])

  // Verdict: rank channels by demos-per-touch (fewest touches per demo = best).
  const verdict = useMemo(() => {
    const stats = CHANNELS.map((c) => {
      const sent = totals[`${c.k}_sent` as Field]
      const demos = totals[`${c.k}_demos` as Field]
      return { label: c.label, sent, demos, perDemo: demos > 0 ? sent / demos : Infinity }
    }).filter((s) => s.sent > 0)
    stats.sort((a, b) => a.perDemo - b.perDemo)
    const demosAll = CHANNELS.reduce((a, c) => a + totals[`${c.k}_demos` as Field], 0)
    const closeRate = demosAll > 0 ? Math.round((totals.closes / demosAll) * 100) : null
    return { stats, demosAll, closeRate }
  }, [totals])

  const inputCls =
    'w-14 text-center text-sm font-semibold bg-purple-50/60 border border-purple-100 rounded-lg px-1 py-1.5 tabular-nums focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/40'

  return (
    <div className="space-y-5">
      <Card>
        <SectionLabel right={savingWeek ? <span className="text-xs text-[#7C3AED]">Saving…</span> : error ? <span className="text-xs text-red-600">{error}</span> : <span className="text-xs text-gray-400">Auto-saves as you type</span>}>
          Your weekly numbers
        </SectionLabel>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="text-[11px] font-bold uppercase tracking-wide text-gray-400">
                <th className="text-left px-2 py-2">Week of</th>
                {CHANNELS.map((c) => (
                  <th key={c.k} colSpan={2} className="px-2 py-2 text-center border-l border-purple-50">{c.label}</th>
                ))}
                <th className="px-2 py-2 text-center border-l border-purple-50">Closes</th>
              </tr>
              <tr className="text-[10px] font-semibold uppercase text-gray-400">
                <th></th>
                {CHANNELS.map((c) => (
                  <>
                    <th key={c.k + 's'} className="px-1 pb-2 text-center border-l border-purple-50">sent</th>
                    <th key={c.k + 'd'} className="px-1 pb-2 text-center">demos</th>
                  </>
                ))}
                <th className="px-1 pb-2 text-center border-l border-purple-50">won</th>
              </tr>
            </thead>
            <tbody>
              {weeks.map((w) => (
                <tr key={w.week_start} className="border-t border-purple-50">
                  <td className="px-2 py-2 font-bold text-gray-700 whitespace-nowrap">{fmtWeek(w.week_start)}</td>
                  {CHANNELS.map((c) => (
                    <>
                      <td key={c.k + 's'} className="px-1 py-1.5 text-center border-l border-purple-50">
                        <input inputMode="numeric" className={inputCls} value={w[`${c.k}_sent` as Field] || ''} placeholder="0"
                          onChange={(e) => edit(w.week_start, `${c.k}_sent` as Field, e.target.value)} />
                      </td>
                      <td key={c.k + 'd'} className="px-1 py-1.5 text-center">
                        <input inputMode="numeric" className={inputCls} value={w[`${c.k}_demos` as Field] || ''} placeholder="0"
                          onChange={(e) => edit(w.week_start, `${c.k}_demos` as Field, e.target.value)} />
                      </td>
                    </>
                  ))}
                  <td className="px-1 py-1.5 text-center border-l border-purple-50">
                    <input inputMode="numeric" className={inputCls} value={w.closes || ''} placeholder="0"
                      onChange={(e) => edit(w.week_start, 'closes', e.target.value)} />
                  </td>
                </tr>
              ))}
              <tr className="border-t-2 border-purple-100 font-bold text-gray-800">
                <td className="px-2 py-2.5">Total</td>
                {CHANNELS.map((c) => (
                  <>
                    <td key={c.k + 's'} className="px-1 py-2.5 text-center tabular-nums border-l border-purple-50">{totals[`${c.k}_sent` as Field]}</td>
                    <td key={c.k + 'd'} className="px-1 py-2.5 text-center tabular-nums">{totals[`${c.k}_demos` as Field]}</td>
                  </>
                ))}
                <td className="px-1 py-2.5 text-center tabular-nums border-l border-purple-50">{totals.closes}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-400 mt-3">Per channel: how many touches you <b>sent/did</b>, and how many <b>demos</b> came from them. Then the week's <b>closes</b>.</p>
      </Card>

      <Card>
        <SectionLabel>What's working</SectionLabel>
        {verdict.stats.length === 0 ? (
          <p className="text-sm text-gray-500">Fill in a week or two above and the ranking appears here.</p>
        ) : (
          <div className="space-y-2">
            {verdict.stats.map((s, i) => (
              <div key={s.label} className="flex items-center justify-between text-sm py-1.5 border-b border-purple-50 last:border-0">
                <span className="font-medium text-gray-700">{i === 0 && s.demos > 0 ? '🏆 ' : ''}{s.label}</span>
                <span className="flex items-center gap-2">
                  <b className="tabular-nums">{s.demos > 0 ? `1 demo per ${Math.round(s.perDemo)}` : 'no demos yet'}</b>
                  <span className="text-xs text-gray-400">{s.demos} demos from {s.sent}</span>
                </span>
              </div>
            ))}
            {verdict.demosAll > 0 && (
              <div className="flex items-center justify-between text-sm pt-2 font-bold text-gray-800">
                <span>Demos → clients</span>
                <span className="flex items-center gap-2">
                  <b className="tabular-nums">{totals.closes} of {verdict.demosAll} ({verdict.closeRate}%)</b>
                  <Pill tone={verdict.closeRate !== null && verdict.closeRate >= 20 ? 'green' : 'amber'}>plan: 20–25%</Pill>
                </span>
              </div>
            )}
          </div>
        )}
        <p className="text-xs text-gray-400 mt-3">Close-rate and reply-rate are planning guesses until you run 2–3 weeks. If demos aren't closing, fix the demo or the offer — not the volume.</p>
      </Card>
    </div>
  )
}
