'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { api } from '@/lib/api'
import {
  FileText, Mic, CheckCircle2, Loader2, PlusCircle, ExternalLink,
} from 'lucide-react'

interface ActionItem {
  task: string
  owner: string
  due: string
}

const BRAND = '#7C3AED'

const ITEM_COLORS = ['#7C3AED', '#EC4899', '#10B981', '#F59E0B', '#3B82F6', '#EF4444']

const PLACEHOLDER = `[Jacques]: So the priority this week is finalising the pitch deck.
[Sarah]: I'll own that. Can we have it done by Friday?
[Jacques]: Yes, Friday works. Also, we need to set up the demo environment.
[Marcus]: I can handle the demo setup — I'll target end of day Thursday.
[Sarah]: Great. What about the follow-up emails to the beta users?
[Jacques]: Marcus, can you send those by Wednesday?
[Marcus]: Confirmed, I'll send the beta follow-ups Wednesday.`

export default function NotetakerPage() {
  const [transcript, setTranscript] = useState('')
  const [loading, setLoading]       = useState(false)
  const [items, setItems]           = useState<ActionItem[]>([])
  const [error, setError]           = useState<string | null>(null)
  const [toast, setToast]           = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setTranscript((ev.target?.result as string) ?? '')
    reader.readAsText(file)
    // reset so the same file can be re-selected
    e.target.value = ''
  }

  async function handleExtract() {
    if (!transcript.trim()) return
    setLoading(true)
    setError(null)
    setItems([])

    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      const result = await api.post<{ success: boolean; items: ActionItem[]; error?: string }>(
        '/milla/notetaker',
        { transcript },
        token,
      )

      if (result.success) {
        setItems(result.items ?? [])
      } else {
        setError(result.error ?? 'Failed to extract action items')
      }
    } catch (err: any) {
      if (err?.status === 403) {
        setError('upgrade')
      } else {
        setError(err?.message ?? 'Failed to extract action items')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F5F3FF] p-4 sm:p-6 lg:p-8">

      {/* Toast */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 bg-[#7C3AED] text-white text-sm font-medium px-4 py-2.5 rounded-xl shadow-lg shadow-purple-200 animate-pulse">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm" style={{ background: `${BRAND}18` }}>
            <Mic className="w-5 h-5" style={{ color: BRAND }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#1E1152]">AI Notetaker</h1>
            <p className="text-sm text-[#7C3AED]/60">Paste in a meeting transcript. Milla extracts every action item, owner, and deadline — zero manual notes.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── Left Panel: Input ─────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-purple-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-purple-50">
            <h2 className="text-[13px] font-bold text-[#7C3AED]/60 uppercase tracking-wider">Drop in your meeting</h2>
          </div>

          <div className="p-6 space-y-5">
            {/* Drop zone */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full border-2 border-dashed border-purple-200 rounded-xl p-8 flex flex-col items-center gap-3 hover:border-[#7C3AED] hover:bg-purple-50/50 transition-all group"
            >
              <div className="w-12 h-12 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform" style={{ background: `${BRAND}10` }}>
                <Mic className="w-6 h-6" style={{ color: BRAND }} />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-[#1E1152]">Paste a transcript or upload a .txt file</p>
                <p className="text-xs text-[#9CA3AF] mt-1">Plain-text transcript (.txt) — export it from Zoom, Teams or Google Meet</p>
              </div>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt"
              className="hidden"
              onChange={handleFileChange}
            />

            {/* Textarea */}
            <div>
              <label className="block text-xs font-semibold text-[#7C3AED]/60 mb-2 uppercase tracking-wide">or paste below</label>
              <textarea
                rows={8}
                value={transcript}
                onChange={e => setTranscript(e.target.value)}
                placeholder={PLACEHOLDER}
                className="w-full rounded-xl border border-purple-100 bg-[#F5F3FF]/60 px-4 py-3 text-sm text-[#1E1152] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30 focus:border-[#7C3AED]/40 resize-none transition"
              />
            </div>

            {/* Error */}
            {error && error !== 'upgrade' && (
              <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            {/* Upgrade prompt */}
            {error === 'upgrade' && (
              <div className="rounded-xl border border-purple-200 bg-purple-50 px-4 py-4 text-center">
                <p className="text-sm font-semibold text-[#7C3AED] mb-1">Milla subscription required</p>
                <p className="text-xs text-[#7C3AED]/70 mb-3">The AI Notetaker is part of the Milla Virtual Assistant plan.</p>
                <a
                  href="/dashboard/billing"
                  className="inline-block px-4 py-2 rounded-lg text-xs font-bold text-white transition-opacity hover:opacity-90"
                  style={{ background: BRAND }}
                >
                  Upgrade to Milla →
                </a>
              </div>
            )}

            {/* Extract button */}
            {error !== 'upgrade' && (
              <button
                onClick={handleExtract}
                disabled={loading || !transcript.trim()}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 active:scale-[0.98]"
                style={{ background: BRAND }}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Extracting…
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4" />
                    Extract action items →
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* ── Right Panel: Results ──────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-purple-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-purple-50 flex items-center justify-between">
            <h2 className="text-[13px] font-bold text-[#7C3AED]/60 uppercase tracking-wider">
              Action Items — Extracted by Milla
            </h2>
            {items.length > 0 && (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full text-white" style={{ background: BRAND }}>
                {items.length}
              </span>
            )}
          </div>

          <div className="p-6">
            {items.length === 0 && !loading && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: `${BRAND}10` }}>
                  <CheckCircle2 className="w-8 h-8" style={{ color: `${BRAND}50` }} />
                </div>
                <p className="text-sm font-semibold text-[#1E1152]/40">No action items yet</p>
                <p className="text-xs text-[#9CA3AF] mt-1">Paste a transcript and click Extract to see results</p>
              </div>
            )}

            {loading && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Loader2 className="w-8 h-8 animate-spin mb-3" style={{ color: BRAND }} />
                <p className="text-sm font-semibold text-[#1E1152]/60">Milla is reading your transcript…</p>
              </div>
            )}

            {items.length > 0 && (
              <div className="space-y-3">
                {items.map((item, i) => {
                  const color = ITEM_COLORS[i % ITEM_COLORS.length]
                  return (
                    <div key={i} className="flex items-start gap-3 p-4 rounded-xl border border-purple-50 hover:border-purple-100 transition-colors bg-[#F5F3FF]/30">
                      <div className="shrink-0 mt-0.5">
                        <CheckCircle2 className="w-5 h-5" style={{ color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[#1E1152] leading-snug">{item.task}</p>
                        <p className="text-xs text-[#9CA3AF] mt-1">
                          <span className="font-medium" style={{ color }}>Owner: {item.owner}</span>
                          {item.due && (
                            <> · <span>Due: {item.due}</span></>
                          )}
                        </p>
                      </div>
                    </div>
                  )
                })}

                {/* Action buttons */}
                <div className="flex gap-3 pt-2">
                  {/* Not wired yet — there's no tasks store behind this. Kept as an
                      honest "coming soon" (matches the Slack button) rather than a
                      button that toasts "Added" without adding anything. */}
                  <button
                    onClick={() => showToast('Tasks integration coming soon')}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border border-purple-200 text-[#7C3AED] hover:bg-purple-50 transition-all active:scale-[0.98]"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    Add to Milla&apos;s tasks
                  </button>
                  <button
                    onClick={() => showToast('Slack not connected yet')}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border border-purple-200 text-[#7C3AED] hover:bg-purple-50 transition-all active:scale-[0.98]"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Export to Slack
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Footer note */}
      <p className="mt-6 text-center text-[11px] text-[#9CA3AF]">
        Milla owns this feature. Input: a plain-text (.txt) meeting transcript, pasted or uploaded. Output: structured action items with owner + deadline.
      </p>
    </div>
  )
}
