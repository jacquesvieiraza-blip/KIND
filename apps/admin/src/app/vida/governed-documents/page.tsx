'use client'

/**
 * GOVERNED DOCUMENTS (R46) — the single home for anything the business is governed by.
 *
 * Founder-ruled 17 Aug: *"any documents we need to create hold of be governed get held in Vida
 * operator. on sole truth of source."*
 *
 * ⚠️ THERE IS NO DELETE BUTTON ON THIS SCREEN AND THERE NEVER WILL BE. A governed document is
 * amended by writing a NEW VERSION that names the one it supersedes — the same law the rules
 * register runs on. A superseded document that vanishes takes the evidence that it was ever in
 * force with it, and that evidence is the entire point of governing a document.
 *
 * ⚠️ NOT `terms-library`. That screen holds blank uploadable TEMPLATES (the MSA, the SLA) and
 * legitimately has a delete button, because deleting last year's blank form is a normal thing
 * to want. This screen holds instruments whose TEXT is the record. Both screens say which is
 * which, so "single source of truth" is an answer rather than a question.
 *
 * Operator-only: the whole admin app sits behind the founder email allowlist, and the Vida
 * console stays internal forever (R36). Nothing here is client-facing.
 */

import { useState, useEffect } from 'react'
import { FileText, Plus, Loader2, ArrowLeft, History, ShieldCheck } from 'lucide-react'

type DocRow = {
  id: string
  title: string
  kind: string
  version: number
  supersedes_id: string | null
  created_at: string
  created_by: string
}

type FullDoc = DocRow & { body_md: string }

const KIND_SUGGESTIONS = ['policy', 'agreement', 'procedure', 'notice', 'register']

export default function GovernedDocumentsPage() {
  const [rows, setRows] = useState<DocRow[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loadDetail, setLoadDetail] = useState<string | null>(null)

  const [open, setOpen] = useState<{ current: FullDoc; chain: FullDoc[] } | null>(null)
  const [composing, setComposing] = useState<null | { supersedes: DocRow | null }>(null)
  const [title, setTitle] = useState('')
  const [kind, setKind] = useState('policy')
  const [body, setBody] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => { void load() }, [])

  async function load() {
    setLoading(true); setLoadError(null)
    try {
      const j = await fetch('/api/proxy/operator/governed-documents').then(r => r.json())
      // ⚠️ A FAILED READ MUST NOT RENDER AS AN EMPTY LIBRARY. "There are no governed documents"
      // and "we could not ask" are opposite facts, and only one of them is calm.
      //
      // ⚠️ AND THE FALLBACK MUST NOT WEAR THE SERVER'S WORDS. It used to read "Could not read
      // the governed documents" — the SAME sentence the API returns — so the screen looked
      // identical whether the API had answered with a reason or never answered at all. That
      // ambiguity cost four round-trips on the first real walk of this page.
      if (!j.success) { setLoadDetail(j.detail ?? null); throw new Error(j.error || 'The API answered, but without a reason.') }
      setRows(j.data ?? [])
      setLoadDetail(null)
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Could not reach the API at all — it did not answer.')
    }
    setLoading(false)
  }

  async function openDoc(id: string) {
    const j = await fetch(`/api/proxy/operator/governed-documents/${id}`).then(r => r.json())
    if (j.success) setOpen(j.data)
    else setLoadError(j.error || 'Could not open that document')
  }

  function startNew(supersedes: DocRow | null) {
    setComposing({ supersedes })
    setTitle(supersedes?.title ?? '')
    setKind(supersedes?.kind ?? 'policy')
    setBody('')
    setSaveError(null)
  }

  async function save() {
    setSaving(true); setSaveError(null)
    try {
      const j = await fetch('/api/proxy/operator/governed-documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title, kind, body_md: body,
          supersedes_id: composing?.supersedes?.id ?? null,
        }),
      }).then(r => r.json())
      if (!j.success) throw new Error(j.error || 'Could not save the document')
      setComposing(null); setOpen(null)
      await load()
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Could not save the document')
    }
    setSaving(false)
  }

  /** Only the newest link of each chain is a "current" document; the rest are its history. */
  const superseded = new Set(rows.map(r => r.supersedes_id).filter(Boolean) as string[])
  const current = rows.filter(r => !superseded.has(r.id))

  return (
    <div className="max-w-5xl mx-auto p-8">
      <div className="flex items-start justify-between gap-6 mb-2">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <ShieldCheck className="w-6 h-6" /> Governed documents
          </h1>
          <p className="text-sm text-gray-500 mt-1 max-w-2xl">
            The single source of truth for documents the business is governed by. Documents are
            never edited or deleted — an amendment is a <strong>new version</strong> that records
            the one it replaces, so the history stays readable.{' '}
            <span className="text-gray-400">
              Looking for a blank template to send someone? That is Terms Library.
            </span>
          </p>
        </div>
        <button
          onClick={() => startNew(null)}
          className="shrink-0 inline-flex items-center gap-2 px-3 py-2 rounded bg-black text-white text-sm">
          <Plus className="w-4 h-4" /> New document
        </button>
      </div>

      {loading && <div className="flex items-center gap-2 text-gray-500 mt-8"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>}

      {loadError && (
        <div className="mt-6 p-4 rounded border border-red-200 bg-red-50 text-sm text-red-800">
          <span className="block">{loadError}</span>
          <span className="block mt-1 text-red-700/80">Nothing was changed.{' '}
            <button onClick={() => void load()} className="underline">Try again</button>
          </span>
          {/* The raw database message, kept for the operator. This console is internal (R36) and
              the person reading it is the person who can fix it. */}
          {loadDetail && <span className="block mt-2 font-mono text-xs text-red-700/70 break-all">{loadDetail}</span>}
        </div>
      )}

      {!loading && !loadError && current.length === 0 && (
        <div className="mt-8 p-6 rounded border border-dashed text-sm text-gray-500">
          No governed documents yet. The first one you add becomes version 1.
        </div>
      )}

      {!loading && !loadError && current.length > 0 && (
        <ul className="mt-6 divide-y border rounded">
          {current.map(r => (
            <li key={r.id} className="p-4 flex items-center justify-between gap-4">
              <button onClick={() => void openDoc(r.id)} className="text-left flex items-start gap-3 min-w-0">
                <FileText className="w-4 h-4 mt-0.5 shrink-0 text-gray-400" />
                <span className="min-w-0">
                  <span className="font-medium block truncate">{r.title}</span>
                  <span className="text-xs text-gray-500">
                    {r.kind} · version {r.version} · {new Date(r.created_at).toLocaleDateString()} · {r.created_by}
                  </span>
                </span>
              </button>
              <button onClick={() => startNew(r)} className="shrink-0 text-sm underline text-gray-600">
                New version
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* ── Reader, with the whole chain ── */}
      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-start justify-center p-8 overflow-auto">
          <div className="bg-white rounded-lg max-w-3xl w-full p-6">
            <button onClick={() => setOpen(null)} className="text-sm text-gray-500 inline-flex items-center gap-1 mb-4">
              <ArrowLeft className="w-4 h-4" /> Close
            </button>
            <h2 className="text-xl font-semibold">{open.current.title}</h2>
            <p className="text-xs text-gray-500 mt-1">
              {open.current.kind} · version {open.current.version} · added by {open.current.created_by}
            </p>
            <pre className="mt-4 whitespace-pre-wrap text-sm border rounded p-4 bg-gray-50 overflow-x-auto">{open.current.body_md}</pre>

            {open.chain.length > 1 && (
              <div className="mt-6">
                <h3 className="text-sm font-semibold flex items-center gap-2"><History className="w-4 h-4" /> Earlier versions</h3>
                <ul className="mt-2 text-sm text-gray-600 space-y-1">
                  {open.chain.slice(0, -1).map(v => (
                    <li key={v.id}>version {v.version} — {new Date(v.created_at).toLocaleDateString()} · {v.created_by}</li>
                  ))}
                </ul>
                <p className="text-xs text-gray-400 mt-2">Kept permanently. A superseded document is history, not rubbish.</p>
              </div>
            )}

            <button onClick={() => startNew(open.current)} className="mt-6 px-3 py-2 rounded bg-black text-white text-sm">
              New version of this
            </button>
          </div>
        </div>
      )}

      {/* ── Composer ── */}
      {composing && (
        <div className="fixed inset-0 bg-black/40 flex items-start justify-center p-8 overflow-auto">
          <div className="bg-white rounded-lg max-w-3xl w-full p-6">
            <h2 className="text-lg font-semibold">
              {composing.supersedes
                ? `New version of "${composing.supersedes.title}" (becomes version ${composing.supersedes.version + 1})`
                : 'New governed document (version 1)'}
            </h2>
            {composing.supersedes && (
              <p className="text-xs text-gray-500 mt-1">
                The current version is kept and linked to this one. Nothing is overwritten.
              </p>
            )}

            <label className="block mt-4 text-sm">Title
              <input value={title} onChange={e => setTitle(e.target.value)}
                className="mt-1 w-full border rounded px-3 py-2 text-sm" />
            </label>

            <label className="block mt-3 text-sm">Kind
              <input value={kind} onChange={e => setKind(e.target.value)} list="governed-doc-kinds"
                className="mt-1 w-full border rounded px-3 py-2 text-sm" />
              <datalist id="governed-doc-kinds">
                {KIND_SUGGESTIONS.map(k => <option key={k} value={k} />)}
              </datalist>
            </label>

            <label className="block mt-3 text-sm">Document (Markdown)
              <textarea value={body} onChange={e => setBody(e.target.value)} rows={14}
                className="mt-1 w-full border rounded px-3 py-2 text-sm font-mono" />
            </label>

            {saveError && <p className="mt-3 text-sm text-red-700">{saveError}</p>}

            <div className="mt-5 flex items-center gap-3">
              <button onClick={() => void save()} disabled={saving || !title.trim() || !body.trim()}
                className="px-3 py-2 rounded bg-black text-white text-sm disabled:opacity-40">
                {saving ? 'Saving…' : composing.supersedes ? 'Save new version' : 'Save document'}
              </button>
              <button onClick={() => setComposing(null)} className="text-sm text-gray-600 underline">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
