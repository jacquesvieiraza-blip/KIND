'use client'

// ═══════════════════════════════════════════════════════════════════════════════════════
// XC-5 · NEEDS YOU — the persisted queue, not a derivation
//
// Everything Vida used to call "Needs you" was recomputed from lifecycle facts on every
// read, so it could describe only conditions that were still true and only the ones the
// derivation happened to know. Every other exception in the product was an email to the
// founder, and an email cannot be assigned, deduped, resolved with a reason or counted.
//
// 🛑 THE ONE THING THIS PANEL MUST NEVER DO is show "Nothing needs you" because it could
// not read. That sentence is the most reassuring one this console prints, and a blind read
// producing it is precisely how Northvale sat in an unresolved review while Vida reported
// no action needed. The `failed` state is separate from `empty` for that reason, and the
// decisions live in `@/lib/vida-operator-tasks` where they are unit-tested.
//
// A row leaves this list only when the SERVER says it was resolved. Removing it
// optimistically would tell the operator a live problem had been dealt with.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useState } from 'react'
import {
  loadOperatorTasks,
  resolveTaskPath,
  labelForKind,
  validateResolution,
  TASKS_EMPTY_COPY,
  type TasksView,
} from '@/lib/vida-operator-tasks'

const when = (iso: string) => {
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

const SEVERITY_STYLE: Record<string, string> = {
  critical: 'bg-red-50 border-red-200 text-red-900',
  warn: 'bg-amber-50 border-amber-200 text-amber-900',
  info: 'bg-slate-50 border-slate-200 text-slate-700',
}

export default function OperatorTasksPanel() {
  const [view, setView] = useState<TasksView>({
    state: 'loading', tasks: [], critical: 0, error: null, tableMissing: false,
  })
  const [open, setOpen] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setView(v => ({ ...v, state: 'loading' }))
    setView(await loadOperatorTasks(async path => {
      const r = await fetch(path)
      return r.json()
    }))
  }, [])

  useEffect(() => { void load() }, [load])

  const resolve = useCallback(async (taskId: string, status: 'resolved' | 'dismissed') => {
    if (busy) return
    const verdict = validateResolution(note)
    if (!verdict.ok) { setError(verdict.error); return }
    setBusy(true)
    setError(null)
    try {
      const r = await fetch(resolveTaskPath(taskId), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ note, status }),
      })
      const body = await r.json() as { success?: boolean; error?: string }
      if (body.success !== true) {
        // The row stays exactly where it was, with the server's own sentence beside it.
        setError(body.error ?? 'The task was NOT resolved.')
        return
      }
      setOpen(null)
      setNote('')
      await load()
    } catch (err) {
      setError(`The task was NOT resolved: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setBusy(false)
    }
  }, [busy, note, load])

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-semibold text-slate-900">
          Needs you
          {view.state === 'ok' && (
            <span className="ml-2 text-xs font-normal text-slate-500">
              {view.tasks.length} open{view.critical > 0 ? ` · ${view.critical} critical` : ''}
            </span>
          )}
        </h2>
        <button onClick={() => void load()} className="text-xs text-slate-500 hover:text-slate-900">
          Refresh
        </button>
      </div>

      {view.state === 'loading' && <p className="mt-3 text-sm text-slate-500">Reading the queue…</p>}

      {view.state === 'empty' && <p className="mt-3 text-sm text-slate-500">{TASKS_EMPTY_COPY}</p>}

      {/* NOT "no tasks". The copy for a blind read says so, because the alternative is a
          console that reassures an operator at the exact moment it cannot see. */}
      {view.state === 'failed' && (
        <p className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900">
          {view.error}
        </p>
      )}

      {view.state === 'ok' && (
        <ul className="mt-3 space-y-2">
          {view.tasks.map(t => (
            <li key={t.id} className={`rounded-lg border p-3 ${SEVERITY_STYLE[t.severity] ?? SEVERITY_STYLE.info}`}>
              <div className="flex items-baseline justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide opacity-70">{labelForKind(t.kind)}</p>
                  <p className="mt-0.5 text-sm font-medium">{t.title}</p>
                  {t.detail && <p className="mt-1 text-sm opacity-80">{t.detail}</p>}
                </div>
                <span className="shrink-0 text-xs opacity-60">{when(t.created_at)}</span>
              </div>

              {open === t.id ? (
                <div className="mt-3 space-y-2">
                  <textarea
                    value={note}
                    onChange={e => { setNote(e.target.value); setError(null) }}
                    rows={2}
                    placeholder="What did you do? This is the record."
                    className="w-full rounded-md border border-slate-300 bg-white p-2 text-sm text-slate-900"
                  />
                  {error && <p className="text-xs text-red-700">{error}</p>}
                  <div className="flex gap-2">
                    <button
                      disabled={busy}
                      onClick={() => void resolve(t.id, 'resolved')}
                      className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                    >
                      {busy ? 'Saving…' : 'Resolved'}
                    </button>
                    <button
                      disabled={busy}
                      onClick={() => void resolve(t.id, 'dismissed')}
                      className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 disabled:opacity-50"
                    >
                      Not a problem
                    </button>
                    <button
                      onClick={() => { setOpen(null); setNote(''); setError(null) }}
                      className="px-2 py-1.5 text-xs text-slate-500"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => { setOpen(t.id); setNote(''); setError(null) }}
                  className="mt-2 text-xs underline underline-offset-2 opacity-80 hover:opacity-100"
                >
                  Close this
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
