'use client'

import { useState, useEffect, useRef, KeyboardEvent } from 'react'
import { api } from '@/lib/api'
import {
  Target, Plus, X, ChevronDown, ChevronUp, Loader2, Check,
  Pencil, Trash2, Zap, CheckCircle2, AlertCircle, Clock, Send, XCircle,
} from 'lucide-react'

type IcpStatus = 'draft' | 'pending_review' | 'approved' | 'rejected'

interface ICP {
  id: string
  industries: string[]
  job_titles: string[]
  company_sizes: string[]
  locations: string[]
  keywords: string[]
  status: IcpStatus
  review_notes: string | null
  created_at: string
}

interface GenerationJob {
  id: string
  icp_id: string
  status: 'running' | 'completed' | 'failed'
  total_found: number
  total_scored: number
  total_consent_sent: number
  error_message: string | null
  created_at: string
  completed_at: string | null
}

const COMPANY_SIZE_OPTIONS = ['1–10', '11–50', '51–200', '201–500', '500+']

function TagInput({
  label,
  placeholder,
  tags,
  onChange,
}: {
  label: string
  placeholder: string
  tags: string[]
  onChange: (tags: string[]) => void
}) {
  const [input, setInput] = useState('')

  function addTag() {
    const val = input.trim()
    if (val && !tags.includes(val)) onChange([...tags, val])
    setInput('')
  }

  function handleKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag() }
    if (e.key === 'Backspace' && !input && tags.length) onChange(tags.slice(0, -1))
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      <div className="flex flex-wrap gap-1.5 p-2.5 border border-gray-200 rounded-lg min-h-[42px] focus-within:ring-2 focus-within:ring-brand-500 focus-within:border-brand-500 bg-white">
        {tags.map((t) => (
          <span key={t} className="inline-flex items-center gap-1 bg-brand-50 text-brand-700 text-xs font-medium px-2 py-1 rounded-md">
            {t}
            <button type="button" onClick={() => onChange(tags.filter((x) => x !== t))} className="text-brand-400 hover:text-brand-700">
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          onBlur={addTag}
          placeholder={tags.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[120px] text-sm outline-none bg-transparent placeholder-gray-400"
        />
      </div>
      <p className="text-xs text-gray-400 mt-1">Press Enter or comma to add</p>
    </div>
  )
}

function CompanySizeSelector({ selected, onChange }: { selected: string[]; onChange: (s: string[]) => void }) {
  function toggle(size: string) {
    onChange(selected.includes(size) ? selected.filter((s) => s !== size) : [...selected, size])
  }
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">Company Size</label>
      <div className="flex flex-wrap gap-2">
        {COMPANY_SIZE_OPTIONS.map((size) => {
          const active = selected.includes(size)
          return (
            <button
              key={size}
              type="button"
              onClick={() => toggle(size)}
              className={`text-sm px-3 py-1.5 rounded-lg border font-medium transition-colors ${
                active
                  ? 'bg-brand-500 text-white border-brand-500'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-brand-500 hover:text-brand-600'
              }`}
            >
              {size}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function JobStatusBanner({ job, onDone }: { job: GenerationJob; onDone: () => void }) {
  useEffect(() => {
    if (job.status !== 'running') onDone()
  }, [job.status, onDone])

  if (job.status === 'running') {
    return (
      <div className="flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-sm">
        <Loader2 className="w-4 h-4 text-blue-500 animate-spin shrink-0" />
        <div>
          <p className="font-medium text-blue-800">Generating leads…</p>
          <p className="text-xs text-blue-600 mt-0.5">
            Found {job.total_found} · Scored {job.total_scored} · Consent sent {job.total_consent_sent}
          </p>
        </div>
      </div>
    )
  }

  if (job.status === 'completed') {
    return (
      <div className="flex items-center gap-3 bg-green-50 border border-green-100 rounded-xl px-4 py-3 text-sm">
        <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
        <div>
          <p className="font-medium text-green-800">Generation complete</p>
          <p className="text-xs text-green-600 mt-0.5">
            {job.total_found} found · {job.total_scored} scored · {job.total_consent_sent} consent emails sent
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm">
      <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
      <div>
        <p className="font-medium text-red-800">Generation failed</p>
        <p className="text-xs text-red-600 mt-0.5">{job.error_message ?? 'An error occurred. Please try again.'}</p>
      </div>
    </div>
  )
}

const EMPTY_FORM = {
  industries: [] as string[],
  job_titles: [] as string[],
  company_sizes: [] as string[],
  locations: [] as string[],
  keywords: [] as string[],
}

export function IcpBuilder({ token, onLeadsRefresh }: { token: string; onLeadsRefresh?: () => void }) {
  const [icps, setIcps] = useState<ICP[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [generating, setGenerating] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState<string | null>(null)
  const [jobs, setJobs] = useState<Record<string, GenerationJob>>({})
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  async function fetchIcps() {
    try {
      const res = await api.get<{ data: ICP[] }>('/icps', token)
      setIcps(res.data ?? [])
      if (res.data?.length === 0) setOpen(true)
    } catch { /* ignore */ }
    setLoading(false)
  }

  useEffect(() => { fetchIcps() }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  async function pollJob(icpId: string) {
    try {
      const res = await api.get<{ data: GenerationJob[] }>(`/icps/${icpId}/jobs`, token)
      const latest = res.data?.[0]
      if (!latest) return
      setJobs((prev) => ({ ...prev, [icpId]: latest }))
      if (latest.status !== 'running') {
        setGenerating(null)
        clearInterval(pollRef.current!)
        pollRef.current = null
        onLeadsRefresh?.()
      }
    } catch { /* ignore */ }
  }

  async function handleSubmitForReview(icpId: string) {
    setSubmitting(icpId)
    try {
      await api.post(`/icps/${icpId}/submit`, {}, token)
      setIcps((prev) => prev.map((i) => i.id === icpId ? { ...i, status: 'pending_review' } : i))
    } catch { /* ignore */ }
    setSubmitting(null)
  }

  async function handleGenerate(icpId: string) {
    setGenerating(icpId)
    try {
      await api.post(`/icps/${icpId}/generate`, {}, token)
      pollRef.current = setInterval(() => pollJob(icpId), 3000)
      pollJob(icpId)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to start generation'
      setJobs((prev) => ({
        ...prev,
        [icpId]: {
          id: 'temp',
          icp_id: icpId,
          status: 'failed',
          total_found: 0,
          total_scored: 0,
          total_consent_sent: 0,
          error_message: msg,
          created_at: new Date().toISOString(),
          completed_at: null,
        },
      }))
      setGenerating(null)
    }
  }

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current) }, [])

  function startEdit(icp: ICP) {
    setEditingId(icp.id)
    setForm({
      industries: icp.industries,
      job_titles: icp.job_titles,
      company_sizes: icp.company_sizes,
      locations: icp.locations,
      keywords: icp.keywords,
    })
    setOpen(true)
  }

  function startCreate() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setOpen(true)
  }

  async function handleSave() {
    if (!form.industries.length || !form.job_titles.length) return
    setSaving(true)
    try {
      if (editingId) {
        await api.patch(`/icps/${editingId}`, form, token)
      } else {
        await api.post('/icps', form, token)
      }
      setOpen(false)
      setEditingId(null)
      setForm(EMPTY_FORM)
      fetchIcps()
    } catch { /* ignore */ }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    setDeleting(id)
    try {
      await api.delete(`/icps/${id}`, token)
      setIcps((prev) => prev.filter((i) => i.id !== id))
    } catch { /* ignore */ }
    setDeleting(null)
  }

  const isValid = form.industries.length > 0 && form.job_titles.length > 0

  return (
    <div className="bg-white rounded-xl border border-gray-100">
      {/* Header */}
      <div className="p-5 flex items-center justify-between border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-brand-500" />
          <div>
            <h2 className="font-semibold text-gray-900">Ideal Customer Profile</h2>
            <p className="text-xs text-gray-400 mt-0.5">Define who your AI should find leads for</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {icps.length > 0 && (
            <button
              onClick={startCreate}
              className="flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-700 font-medium px-3 py-2 rounded-lg hover:bg-brand-50 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New ICP
            </button>
          )}
          <button
            onClick={() => setOpen((v) => !v)}
            className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* ICP cards */}
      {!loading && icps.length > 0 && (
        <div className="px-5 pt-4 pb-2 space-y-3">
          {icps.map((icp) => {
            const job = jobs[icp.id]
            const isGenerating = generating === icp.id
            const isSubmitting = submitting === icp.id
            const status = icp.status ?? 'draft'

            const STATUS_BADGE: Record<string, string> = {
              draft: 'bg-gray-100 text-gray-500',
              pending_review: 'bg-amber-50 text-amber-700',
              approved: 'bg-green-50 text-green-700',
              rejected: 'bg-red-50 text-red-600',
            }
            const STATUS_LABEL: Record<string, string> = {
              draft: 'Draft',
              pending_review: 'Pending Review',
              approved: 'Approved',
              rejected: 'Rejected',
            }

            return (
              <div key={icp.id}>
                <div className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap gap-1 mb-1">
                      {icp.industries.slice(0, 2).map((i) => (
                        <span key={i} className="text-xs bg-brand-50 text-brand-700 px-2 py-0.5 rounded-md font-medium">{i}</span>
                      ))}
                      {icp.industries.length > 2 && (
                        <span className="text-xs text-gray-400">+{icp.industries.length - 2}</span>
                      )}
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-md ${STATUS_BADGE[status]}`}>
                        {STATUS_LABEL[status]}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 truncate">
                      {icp.job_titles.slice(0, 3).join(', ')}{icp.job_titles.length > 3 ? ` +${icp.job_titles.length - 3}` : ''}
                    </p>
                    {status === 'rejected' && icp.review_notes && (
                      <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                        <XCircle className="w-3 h-3 shrink-0" />
                        {icp.review_notes}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {status === 'approved' && (
                      <button
                        onClick={() => handleGenerate(icp.id)}
                        disabled={!!generating}
                        className="flex items-center gap-1.5 text-xs font-semibold bg-brand-500 hover:bg-brand-600 text-white px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                        {isGenerating ? 'Running…' : 'Generate'}
                      </button>
                    )}
                    {(status === 'draft' || status === 'rejected') && (
                      <button
                        onClick={() => handleSubmitForReview(icp.id)}
                        disabled={isSubmitting}
                        className="flex items-center gap-1.5 text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                        {isSubmitting ? 'Submitting…' : 'Submit for Review'}
                      </button>
                    )}
                    {status === 'pending_review' && (
                      <span className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg font-medium">
                        <Clock className="w-3.5 h-3.5" />
                        Under Review
                      </span>
                    )}
                    <button onClick={() => startEdit(icp)} className="text-gray-300 hover:text-brand-500 transition-colors p-1.5" title="Edit">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(icp.id)}
                      disabled={deleting === icp.id}
                      className="text-gray-300 hover:text-red-500 transition-colors p-1.5 disabled:opacity-40"
                    >
                      {deleting === icp.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
                {job && (
                  <div className="mt-2">
                    <JobStatusBanner job={job} onDone={() => setJobs((prev) => ({ ...prev, [icp.id]: { ...prev[icp.id], status: job.status } }))} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Last job history hint */}
      {!loading && icps.length > 0 && Object.keys(jobs).length === 0 && (
        <div className="px-5 pb-3">
          <p className="text-xs text-gray-400 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            Click Generate to start sourcing leads from your ICP criteria
          </p>
        </div>
      )}

      {/* Form */}
      {open && (
        <div className="p-5 space-y-5 border-t border-gray-50">
          {icps.length === 0 && !loading && (
            <p className="text-sm text-gray-500 bg-brand-50 border border-brand-100 rounded-lg px-4 py-3">
              No ICP set yet. Define your ideal customer below and our AI will start sourcing matching leads.
            </p>
          )}

          <div className="grid md:grid-cols-2 gap-5">
            <TagInput label="Industries *" placeholder="e.g. Financial Services, Retail…" tags={form.industries} onChange={(v) => setForm({ ...form, industries: v })} />
            <TagInput label="Job Titles *" placeholder="e.g. CFO, Head of Sales…" tags={form.job_titles} onChange={(v) => setForm({ ...form, job_titles: v })} />
            <TagInput label="Locations" placeholder="e.g. Johannesburg, Lagos…" tags={form.locations} onChange={(v) => setForm({ ...form, locations: v })} />
            <TagInput label="Keywords" placeholder="e.g. SaaS, B2B, scale-up…" tags={form.keywords} onChange={(v) => setForm({ ...form, keywords: v })} />
          </div>

          <CompanySizeSelector selected={form.company_sizes} onChange={(v) => setForm({ ...form, company_sizes: v })} />

          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={handleSave}
              disabled={saving || !isValid}
              className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-medium px-4 py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {editingId ? 'Update ICP' : 'Save ICP'}
            </button>
            {(editingId || icps.length > 0) && (
              <button
                onClick={() => { setOpen(false); setEditingId(null); setForm(EMPTY_FORM) }}
                className="text-sm text-gray-500 hover:text-gray-700 px-3 py-2.5"
              >
                Cancel
              </button>
            )}
            {!isValid && <p className="text-xs text-gray-400">Industries and Job Titles are required</p>}
          </div>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-brand-500" />
        </div>
      )}
    </div>
  )
}
