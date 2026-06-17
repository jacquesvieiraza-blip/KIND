'use client'

// Item 187 — Sequences (email-first). Create reusable sequences/templates with
// literal copy + merge tokens, save them to a library, and APPLY them to a campaign
// (new or existing). Email steps send; other channels are coming soon.

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { api } from '@/lib/api'
import { Mail, Plus, Trash2, Loader2, Send, Check, X, Library, ArrowRight } from 'lucide-react'

interface EmailStep { subject: string; body: string; wait_days: number; on_reply: 'stop' | 'skip_next' | 'continue' }
interface Sequence { id: string; name: string; steps: Array<{ channel: string; subject?: string; body?: string; wait_days?: number; on_reply?: string }>; created_at: string }
interface Campaign { id: string; name: string; status: string }

const BRAND = '#7C3AED'
const blankStep = (wait: number): EmailStep => ({ subject: '', body: '', wait_days: wait, on_reply: 'stop' })

export default function SequencesPage() {
  const supabase = createClient()
  const [token, setToken] = useState<string | null>(null)
  const [sequences, setSequences] = useState<Sequence[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  // Editor state
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState('')
  const [steps, setSteps] = useState<EmailStep[]>([blankStep(0), blankStep(4)])
  const [saving, setSaving] = useState(false)

  // Apply state
  const [applyFor, setApplyFor] = useState<Sequence | null>(null)
  const [applyMode, setApplyMode] = useState<'new' | 'existing'>('new')
  const [newCampaignName, setNewCampaignName] = useState('')
  const [existingCampaignId, setExistingCampaignId] = useState('')
  const [applying, setApplying] = useState(false)

  const load = useCallback(async (tok: string) => {
    try {
      const [seqRes, campRes] = await Promise.allSettled([
        api.get<{ data: Sequence[] }>('/figsy/sequences', tok),
        api.get<{ data: Campaign[] }>('/figsy/campaigns', tok),
      ])
      if (seqRes.status === 'fulfilled') setSequences(seqRes.value.data ?? [])
      if (campRes.status === 'fulfilled') setCampaigns(campRes.value.data ?? [])
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to load') }
    setLoading(false)
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { setLoading(false); return }
      setToken(session.access_token); load(session.access_token)
    })
  }, [supabase, load])

  function flash(msg: string) { setNotice(msg); setTimeout(() => setNotice(null), 3500) }

  function startNew() {
    setName(''); setSteps([blankStep(0), blankStep(4)]); setEditing(true); setError(null)
  }
  function updateStep(i: number, patch: Partial<EmailStep>) {
    setSteps(prev => prev.map((s, idx) => idx === i ? { ...s, ...patch } : s))
  }
  function addStep() {
    if (steps.length >= 3) return // email-first v1 supports up to 3 email steps
    setSteps(prev => [...prev, blankStep(4)])
  }
  function removeStep(i: number) { setSteps(prev => prev.filter((_, idx) => idx !== i)) }

  async function saveSequence() {
    if (!token) return
    if (!name.trim()) { setError('Give your sequence a name.'); return }
    const filled = steps.filter(s => s.subject.trim() && s.body.trim())
    if (filled.length === 0) { setError('Add at least one email step with a subject and body.'); return }
    setSaving(true); setError(null)
    try {
      await api.post('/figsy/sequences', {
        name: name.trim(),
        steps: filled.map(s => ({ channel: 'email', subject: s.subject.trim(), body: s.body.trim(), wait_days: s.wait_days, on_reply: s.on_reply })),
      }, token)
      setEditing(false)
      flash('Sequence saved to your library.')
      load(token)
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to save') }
    setSaving(false)
  }

  async function deleteSequence(id: string) {
    if (!token) return
    try { await api.delete_(`/figsy/sequences/${id}`, token); load(token); flash('Sequence deleted.') }
    catch (e) { setError(e instanceof Error ? e.message : 'Failed to delete') }
  }

  function openApply(seq: Sequence) {
    setApplyFor(seq); setApplyMode('new'); setNewCampaignName(`${seq.name} campaign`); setExistingCampaignId(''); setError(null)
  }
  async function applySequence() {
    if (!token || !applyFor) return
    setApplying(true); setError(null)
    try {
      const body = applyMode === 'new'
        ? { new_campaign_name: newCampaignName.trim() }
        : { campaign_id: existingCampaignId }
      if (applyMode === 'new' && !newCampaignName.trim()) { setError('Name the new campaign.'); setApplying(false); return }
      if (applyMode === 'existing' && !existingCampaignId) { setError('Pick a campaign.'); setApplying(false); return }
      const res = await api.post<{ data: { created: boolean; email_steps: number } }>(`/figsy/sequences/${applyFor.id}/apply`, body, token)
      setApplyFor(null)
      flash(res.data.created
        ? `Created a new campaign with ${res.data.email_steps} email step(s). Add leads & activate it to send.`
        : `Applied to the campaign (${res.data.email_steps} email step(s)). New enrollments will use this copy.`)
      load(token)
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to apply') }
    setApplying(false)
  }

  const emailCount = (seq: Sequence) => seq.steps.filter(s => s.channel === 'email').length

  if (loading) return <div className="min-h-[50vh] flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin" style={{ color: BRAND }} /></div>

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Library className="w-6 h-6" style={{ color: BRAND }} /> Sequences</h1>
          <p className="text-gray-500 text-sm mt-1">Build a reusable email sequence once, then apply it to any campaign. Use <code className="px-1 rounded bg-purple-50 text-purple-700">{'{{first_name}}'}</code> and <code className="px-1 rounded bg-purple-50 text-purple-700">{'{{company}}'}</code> to personalise.</p>
        </div>
        {!editing && (
          <button onClick={startNew} className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-sm font-bold" style={{ background: BRAND }}>
            <Plus className="w-4 h-4" /> New sequence
          </button>
        )}
      </div>

      {notice && <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-green-50 border border-green-100 text-sm text-green-700"><Check className="w-4 h-4 shrink-0" />{notice}</div>}
      {error && <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700"><X className="w-4 h-4 shrink-0" />{error}</div>}

      {/* Editor */}
      {editing && (
        <div className="rounded-2xl border border-purple-100 bg-white p-5 space-y-4 shadow-sm">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Sequence name (e.g. African Fintech — 2-step)" className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium" />
          {steps.map((s, i) => (
            <div key={i} className="rounded-xl border border-gray-100 bg-gray-50/60 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-600"><Mail className="w-3.5 h-3.5" style={{ color: BRAND }} /> Email step {i + 1}</span>
                <div className="flex items-center gap-3">
                  <label className="text-xs text-gray-500 flex items-center gap-1">Wait
                    <input type="number" min={0} value={s.wait_days} onChange={e => updateStep(i, { wait_days: Math.max(0, Number(e.target.value)) })} className="w-14 px-2 py-1 rounded border border-gray-200 text-xs" /> days
                  </label>
                  {steps.length > 1 && <button onClick={() => removeStep(i)} className="text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>}
                </div>
              </div>
              <input value={s.subject} onChange={e => updateStep(i, { subject: e.target.value })} placeholder="Subject — e.g. Quick idea for {{company}}" className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" />
              <textarea value={s.body} onChange={e => updateStep(i, { body: e.target.value })} placeholder={"Hi {{first_name}},\n\nSaw what {{company}} is doing…"} rows={4} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm resize-y" />
              <label className="text-xs text-gray-500 flex items-center gap-2">On reply:
                <select value={s.on_reply} onChange={e => updateStep(i, { on_reply: e.target.value as EmailStep['on_reply'] })} className="px-2 py-1 rounded border border-gray-200 text-xs">
                  <option value="stop">Stop the sequence</option>
                  <option value="continue">Keep sending</option>
                  <option value="skip_next">Skip the next step</option>
                </select>
              </label>
            </div>
          ))}
          <div className="flex items-center justify-between">
            <button onClick={addStep} disabled={steps.length >= 3} className="inline-flex items-center gap-1.5 text-sm font-medium text-purple-700 disabled:text-gray-300">
              <Plus className="w-4 h-4" /> Add email step {steps.length >= 3 && '(max 3)'}
            </button>
            <span className="text-xs text-gray-400">LinkedIn · voice · WhatsApp steps — coming soon</span>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <button onClick={saveSequence} disabled={saving} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-sm font-bold disabled:opacity-60" style={{ background: BRAND }}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Save sequence
            </button>
            <button onClick={() => { setEditing(false); setError(null) }} className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100">Cancel</button>
          </div>
        </div>
      )}

      {/* Library */}
      {!editing && (
        sequences.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 p-10 text-center text-gray-500">
            <Mail className="w-8 h-8 mx-auto mb-3 text-gray-300" />
            <p className="text-sm">No saved sequences yet. Create one, then apply it to a campaign.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sequences.map(seq => (
              <div key={seq.id} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{seq.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{emailCount(seq)} email step{emailCount(seq) === 1 ? '' : 's'}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => openApply(seq)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-bold" style={{ background: BRAND }}>
                    <Send className="w-3.5 h-3.5" /> Apply to campaign
                  </button>
                  <button onClick={() => deleteSequence(seq.id)} className="p-1.5 text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Apply modal */}
      {applyFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={() => setApplyFor(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl space-y-4" onClick={e => e.stopPropagation()}>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Apply “{applyFor.name}”</h2>
              <p className="text-sm text-gray-500 mt-0.5">Choose a campaign. New enrollments will send this sequence’s email copy.</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setApplyMode('new')} className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border ${applyMode === 'new' ? 'text-white border-transparent' : 'text-gray-600 border-gray-200'}`} style={applyMode === 'new' ? { background: BRAND } : {}}>New campaign</button>
              <button onClick={() => setApplyMode('existing')} className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border ${applyMode === 'existing' ? 'text-white border-transparent' : 'text-gray-600 border-gray-200'}`} style={applyMode === 'existing' ? { background: BRAND } : {}}>Existing campaign</button>
            </div>
            {applyMode === 'new' ? (
              <input value={newCampaignName} onChange={e => setNewCampaignName(e.target.value)} placeholder="New campaign name" className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" />
            ) : (
              <select value={existingCampaignId} onChange={e => setExistingCampaignId(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm">
                <option value="">Select a campaign…</option>
                {campaigns.map(c => <option key={c.id} value={c.id}>{c.name} ({c.status})</option>)}
              </select>
            )}
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex items-center gap-2">
              <button onClick={applySequence} disabled={applying} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-sm font-bold disabled:opacity-60" style={{ background: BRAND }}>
                {applying ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />} Apply
              </button>
              <button onClick={() => setApplyFor(null)} className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
