'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { api } from '@/lib/api'
import type { ICP, ICPFormData } from '@kind/shared'
import { SUPPORTED_COUNTRIES } from '@kind/shared'
import { Settings2, Plus, Trash2, CheckCircle, Loader2, ArrowLeft, X, Sparkles, Send, Users2, Play, Building2 } from 'lucide-react'
import Image from 'next/image'

// ── FIGSY persistent left-panel ───────────────────────────────────────────────
const FIGSY_GREETING = "Hi! I'm FIGSY — describe who you want to target and I'll build your ICP automatically. Try: \"SaaS founders in South Africa with 10–200 employees\"."

function FigsySidePanel({ token, onFill }: { token: string; onFill: (data: Partial<ICPFormData>) => void }) {
  const [input, setInput]     = useState('')
  const [sending, setSending] = useState(false)
  const [messages, setMessages] = useState<{ role: 'user' | 'ai'; text: string }[]>([
    { role: 'ai', text: FIGSY_GREETING }
  ])
  const [shownChars, setShownChars] = useState(0)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  useEffect(() => {
    if (shownChars >= FIGSY_GREETING.length) return
    const t = setTimeout(() => setShownChars(n => Math.min(n + 2, FIGSY_GREETING.length)), 28)
    return () => clearTimeout(t)
  }, [shownChars])

  async function send(text?: string) {
    const msg = (text ?? input).trim()
    if (!msg || sending) return
    setInput('')
    setMessages(prev => [...prev, { role: 'user', text: msg }])
    setSending(true)
    try {
      const res = await api.post<{ data: Partial<ICPFormData> & { message?: string } }>(
        '/icps/chat-build', { message: msg, history: messages.map(m => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.text })) }, token
      )
      const { message, ...icpFields } = res.data
      const hasFields = Object.values(icpFields).some(v => Array.isArray(v) ? v.length > 0 : !!v)
      if (hasFields) onFill(icpFields)
      setMessages(prev => [...prev, { role: 'ai', text: message || (hasFields ? "Done — I've filled in your ICP form. Review it and adjust anything you need, then save." : "Tell me more about your target customers and I'll fill the form for you.") }])
    } catch {
      setMessages(prev => [...prev, { role: 'ai', text: "Sorry, couldn't connect right now — try again in a moment." }])
    }
    setSending(false)
  }

  const CHIPS = [
    'SaaS founders in South Africa',
    'VP Sales at Fintech, 50–500 staff',
    'Suggest ICP from my website',
  ]

  return (
    <div className="w-full lg:w-64 lg:shrink-0 lg:sticky lg:top-6 rounded-2xl overflow-hidden border border-purple-100 shadow-sm bg-white">
      {/* Photo area */}
      <div className="w-full h-44 overflow-hidden bg-purple-50">
        <img
          src="/agents/figsy.png"
          alt="FIGSY"
          className="w-full h-full object-cover object-[50%_20%]"
        />
      </div>

      {/* Identity bar */}
      <div className="bg-white border-b border-purple-100/60 px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-gray-900 font-bold text-sm leading-tight">FIGSY</p>
          <p className="text-[#7C3AED]/60 text-[11px]">AI SDR · ICP Builder</p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] text-emerald-500 font-medium">Online</span>
        </div>
      </div>

      {/* Suggestion chips */}
      <div className="px-4 pb-3 flex flex-col gap-1.5">
        {CHIPS.map(chip => (
          <button
            key={chip}
            type="button"
            onClick={() => send(chip)}
            className="bg-purple-50 text-purple-700 hover:bg-purple-100 text-xs px-3 py-1.5 rounded-full border border-purple-100 text-left transition-colors"
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Chat messages */}
      <div className="max-h-48 overflow-y-auto px-3 pb-2 space-y-2 bg-[#FAFAFA] border-t border-purple-100/40">
        <div className="pt-2" />
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-1.5 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {m.role === 'ai' && (
              <div className="w-5 h-5 rounded-full overflow-hidden shrink-0 mt-0.5 border border-purple-100">
                <Image src="/agents/figsy.png" alt="FIGSY" width={20} height={20} className="object-cover object-top w-full h-full" />
              </div>
            )}
            <div className={`max-w-[85%] rounded-xl px-2.5 py-1.5 text-xs leading-relaxed ${
              m.role === 'user'
                ? 'bg-[#7C3AED] text-white rounded-br-sm'
                : 'bg-white text-gray-800 rounded-bl-sm border border-purple-100/60 shadow-sm'
            }`}>
              {i === 0 && m.role === 'ai'
                ? <>{FIGSY_GREETING.slice(0, shownChars)}{shownChars < FIGSY_GREETING.length && <span className="inline-block w-0.5 h-3 bg-purple-300 animate-pulse ml-0.5 align-middle" />}</>
                : m.text
              }
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex gap-1.5 justify-start">
            <div className="w-5 h-5 rounded-full overflow-hidden shrink-0 mt-0.5 border border-purple-100">
              <Image src="/agents/figsy.png" alt="FIGSY" width={20} height={20} className="object-cover object-top w-full h-full" />
            </div>
            <div className="bg-white rounded-xl rounded-bl-sm px-2.5 py-1.5 border border-purple-100/60 shadow-sm">
              <Loader2 className="w-3 h-3 text-[#9B8EC4] animate-spin" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input row */}
      <div className="px-3 py-3 border-t border-purple-100/40 flex gap-2 items-center bg-white">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
          placeholder="e.g. SaaS CTOs in South Africa…"
          className="flex-1 bg-gray-50 border border-purple-100/60 rounded-xl text-xs px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30 focus:border-[#7C3AED]"
        />
        <button
          onClick={() => send()}
          disabled={!input.trim() || sending}
          className="w-8 h-8 bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-40 rounded-xl flex items-center justify-center transition-colors shrink-0"
        >
          <Send className="w-3.5 h-3.5 text-white" />
        </button>
      </div>
    </div>
  )
}

// P3-2: FIGSY Vertical Modes — pre-trained ICP templates per industry
const VERTICAL_TEMPLATES: Array<{
  id: string
  label: string
  emoji: string
  description: string
  data: Partial<ICPFormData>
}> = [
  {
    id: 'fintech',
    label: 'Fintech',
    emoji: '💳',
    description: 'CFOs, CTOs, and Heads of Product at payment and lending companies',
    data: {
      name: 'Fintech Decision Makers',
      industries: ['Fintech', 'Banking', 'Insurance'],
      seniority_levels: ['C-Suite', 'VP / Director', 'Head of'],
      company_sizes: ['11–50', '51–200', '201–500'],
      geographies: ['South Africa', 'Nigeria', 'Kenya', 'Ghana'],
      keywords: ['payments', 'lending', 'fintech', 'digital banking', 'neo-bank'],
      intent_signals: ['recently_funded', 'hiring_sdrs', 'new_executive'],
    },
  },
  {
    id: 'property',
    label: 'Property',
    emoji: '🏢',
    description: 'MDs and Sales Directors at property developers and estate agencies',
    data: {
      name: 'Property Developers & Agencies',
      industries: ['Real Estate'],
      seniority_levels: ['C-Suite', 'VP / Director', 'Head of', 'Manager'],
      company_sizes: ['11–50', '51–200', '201–500'],
      geographies: ['South Africa', 'Zimbabwe', 'Botswana'],
      keywords: ['property developer', 'real estate', 'residential', 'commercial property', 'estate agent'],
      intent_signals: ['hiring_sdrs', 'headcount_growth'],
    },
  },
  {
    id: 'healthtech',
    label: 'Healthtech',
    emoji: '🏥',
    description: 'Founders and CMOs at digital health platforms and medical software companies',
    data: {
      name: 'Healthtech Leaders',
      industries: ['Healthtech'],
      seniority_levels: ['C-Suite', 'VP / Director', 'Head of'],
      company_sizes: ['1–10', '11–50', '51–200'],
      geographies: ['South Africa', 'Kenya', 'Nigeria'],
      keywords: ['digital health', 'telemedicine', 'health tech', 'medical software', 'patient management'],
      intent_signals: ['recently_funded', 'new_executive'],
    },
  },
  {
    id: 'saas',
    label: 'SaaS',
    emoji: '☁️',
    description: 'VP Sales and Growth leads at B2B software companies',
    data: {
      name: 'B2B SaaS Growth Leaders',
      industries: ['SaaS'],
      seniority_levels: ['C-Suite', 'VP / Director', 'Head of', 'Manager'],
      company_sizes: ['11–50', '51–200', '201–500'],
      geographies: ['South Africa', 'Nigeria', 'Kenya', 'Egypt'],
      keywords: ['SaaS', 'B2B software', 'cloud platform', 'subscription software', 'API'],
      intent_signals: ['recently_funded', 'hiring_sdrs', 'headcount_growth', 'new_executive'],
    },
  },
  {
    id: 'logistics',
    label: 'Logistics',
    emoji: '🚚',
    description: 'COOs and Supply Chain Directors at logistics and freight companies',
    data: {
      name: 'Logistics & Supply Chain',
      industries: ['Logistics'],
      seniority_levels: ['C-Suite', 'VP / Director', 'Head of'],
      company_sizes: ['51–200', '201–500', '501–1,000'],
      geographies: ['South Africa', 'Nigeria', 'Kenya', 'Ethiopia'],
      keywords: ['logistics', 'freight', 'supply chain', 'last mile', 'warehousing', 'fleet management'],
      intent_signals: ['headcount_growth', 'new_executive'],
    },
  },
  {
    id: 'ecommerce',
    label: 'E-commerce',
    emoji: '🛒',
    description: 'Founders and Heads of Growth at online retail and marketplace businesses',
    data: {
      name: 'E-commerce Growth Leaders',
      industries: ['E-commerce', 'Retail'],
      seniority_levels: ['C-Suite', 'VP / Director', 'Head of', 'Manager'],
      company_sizes: ['11–50', '51–200', '201–500'],
      geographies: ['South Africa', 'Nigeria', 'Kenya', 'Egypt', 'Ghana'],
      keywords: ['e-commerce', 'online retail', 'marketplace', 'D2C', 'Shopify'],
      intent_signals: ['recently_funded', 'hiring_sdrs', 'headcount_growth'],
    },
  },
]

const INDUSTRIES = [
  'Fintech', 'Healthtech', 'E-commerce', 'SaaS', 'Logistics', 'Agriculture',
  'Education', 'Manufacturing', 'Real Estate', 'Media', 'Consulting', 'Retail',
  'Banking', 'Insurance', 'Telecoms', 'Energy', 'NGO / Non-profit', 'Government',
]

const SENIORITY_LEVELS = ['C-Suite', 'VP / Director', 'Head of', 'Manager', 'Senior', 'Individual Contributor']

const COMPANY_SIZES = ['1–10', '11–50', '51–200', '201–500', '501–1,000', '1,000+']

const INTENT_SIGNALS = [
  { value: 'recently_funded',  label: '💰 Recently funded',    desc: 'Seed, Series A–D rounds' },
  { value: 'hiring_sdrs',      label: '📣 Hiring sales reps',  desc: 'Actively posting SDR/AE roles' },
  { value: 'headcount_growth', label: '📈 Growing headcount',  desc: 'Team size increasing' },
  { value: 'new_executive',    label: '👔 New executive hire',  desc: 'New C-suite or VP in last 90 days' },
]

const TECH_STACK_OPTIONS = [
  'Salesforce', 'HubSpot', 'Pipedrive', 'Zoho', 'Slack', 'Microsoft 365', 'Google Workspace',
  'Shopify', 'WooCommerce', 'AWS', 'Azure', 'GCP', 'Stripe', 'Paystack', 'Intercom', 'Zendesk',
]

// ── Tag input ─────────────────────────────────────────────────────────────────
function TagInput({ label, tags, onChange, placeholder, suggestions }: {
  label: string; tags: string[]; onChange: (t: string[]) => void
  placeholder?: string; suggestions?: string[]
}) {
  const [input, setInput] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)

  const addTag = (tag: string) => {
    const clean = tag.trim()
    if (clean && !tags.includes(clean)) onChange([...tags, clean])
    setInput('')
  }

  const filteredSuggestions = suggestions?.filter(s =>
    s.toLowerCase().includes(input.toLowerCase()) && !tags.includes(s)
  ) ?? []

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <div className="flex flex-wrap gap-2 min-h-10 p-2 border border-purple-100/80 rounded-lg bg-white focus-within:ring-2 focus-within:ring-[#7C3AED] focus-within:border-transparent">
        {tags.map(tag => (
          <span key={tag} className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#F5F0FF] text-[#5B21B6] rounded-md text-sm font-medium">
            {tag}
            <button onClick={() => onChange(tags.filter(t => t !== tag))} className="hover:text-red-500 transition-colors">
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        <div className="relative flex-1 min-w-32">
          <input
            type="text" value={input}
            placeholder={tags.length === 0 ? placeholder : ''}
            onChange={e => { setInput(e.target.value); setShowSuggestions(true) }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            onKeyDown={e => {
              if ((e.key === 'Enter' || e.key === ',') && input.trim()) {
                e.preventDefault(); addTag(input)
              }
              if (e.key === 'Backspace' && !input && tags.length > 0) {
                onChange(tags.slice(0, -1))
              }
            }}
            className="w-full border-none outline-none text-sm bg-transparent"
          />
          {showSuggestions && filteredSuggestions.length > 0 && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-purple-100/80 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto min-w-48">
              {filteredSuggestions.map(s => (
                <button key={s} onMouseDown={() => { addTag(s); setShowSuggestions(false) }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors">
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <p className="text-xs text-[#9B8EC4]">Press Enter or comma to add. {suggestions ? 'Or pick from suggestions.' : ''}</p>
    </div>
  )
}

// ── Checkbox group ────────────────────────────────────────────────────────────
function CheckboxGroup({ label, options, selected, onChange }: {
  label: string; options: string[]; selected: string[]; onChange: (v: string[]) => void
}) {
  const toggle = (opt: string) => {
    selected.includes(opt) ? onChange(selected.filter(s => s !== opt)) : onChange([...selected, opt])
  }
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map(opt => (
          <button key={opt} type="button" onClick={() => toggle(opt)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              selected.includes(opt)
                ? 'bg-[#7C3AED] text-white border-[#7C3AED]'
                : 'bg-white text-gray-600 border-purple-100/80 hover:border-gray-400'
            }`}>
            {opt}
          </button>
        ))}
      </div>
    </div>
  )
}

const emptyForm = (): ICPFormData => ({
  name: '',
  industries: [],
  job_titles: [],
  seniority_levels: [],
  company_sizes: [],
  geographies: [],
  tech_stack: [],
  keywords: [],
  apollo_only_consented: true,
  intent_signals: [],
})

export default function ICPPage() {
  const supabase = createClient()
  const [token, setToken] = useState<string | null>(null)
  const [icps, setIcps] = useState<ICP[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<ICPFormData>(emptyForm())
  const [saved, setSaved] = useState(false)
  const [showSavedBanner, setShowSavedBanner] = useState(false)
  const [runBannerMsg, setRunBannerMsg] = useState<string | null>(null)
  const [prefillNotice, setPrefillNotice] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [nameSuggestion, setNameSuggestion] = useState<string | null>(null)
  const [aiSuggesting, setAiSuggesting]     = useState(false)
  const [aiSuggestError, setAiSuggestError] = useState<string | null>(null)
  const [runningId, setRunningId] = useState<string | null>(null)
  const [refiningId, setRefiningId] = useState<string | null>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)
  const [previewCount, setPreviewCount] = useState<number | null>(null)
  const [previewSamples, setPreviewSamples] = useState<Array<{ first_name: string; last_name: string; title: string | null; company: string | null; linkedin_url: string | null }>>([])
  const [previewLoading, setPreviewLoading] = useState(false)
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ABM mode
  const [abmMode, setAbmMode] = useState(false)
  const [abmCompanies, setAbmCompanies] = useState('')

  // P2-14: Social signals
  const [socialSignals, setSocialSignals] = useState<{ hashtags: string; competitor_pages: string; engagement_types: string[] }>({
    hashtags: '',
    competitor_pages: '',
    engagement_types: [],
  })

  useEffect(() => {
    if (form.name.trim()) { setNameSuggestion(null); return }
    const parts: string[] = []
    if (form.seniority_levels.length) parts.push(form.seniority_levels[0])
    if (form.geographies.length)      parts.push(form.geographies[0])
    if (form.industries.length)       parts.push(form.industries[0])
    else if (form.job_titles.length)  parts.push(form.job_titles[0])
    setNameSuggestion(parts.length >= 2 ? parts.join(' · ') : null)
  }, [form.name, form.seniority_levels, form.geographies, form.industries, form.job_titles])

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { setLoading(false); return }
      setToken(session.access_token)
      try {
        const res = await api.get<{ data: ICP[] }>('/icps', session.access_token)
        setIcps(res.data || [])
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : 'Failed to load ICPs — please refresh.')
      }
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  // Debounced preview count — fires 800ms after last form change
  const fetchPreviewCount = useCallback(async (currentForm: ICPFormData, currentToken: string, orgNames?: string[]) => {
    if (!currentToken) return

    // ABM mode: only requires organization_names
    if (orgNames && orgNames.length > 0) {
      setPreviewLoading(true)
      try {
        const res = await api.post<{ data: { count: number; samples: Array<{ first_name: string; last_name: string; title: string | null; company: string | null; linkedin_url: string | null }> } }>(
          '/icps/preview-count',
          { ...currentForm, organization_names: orgNames },
          currentToken
        )
        setPreviewCount(res.data.count)
        setPreviewSamples(res.data.samples ?? [])
      } catch {
        // Silently fail
      }
      setPreviewLoading(false)
      return
    }

    const hasAnyCriteria = currentForm.industries.length > 0 || currentForm.job_titles.length > 0 ||
      currentForm.seniority_levels.length > 0 || currentForm.geographies.length > 0
    if (!hasAnyCriteria) { setPreviewCount(null); setPreviewSamples([]); return }

    setPreviewLoading(true)
    try {
      const res = await api.post<{ data: { count: number; samples: Array<{ first_name: string; last_name: string; title: string | null; company: string | null; linkedin_url: string | null }> } }>('/icps/preview-count', currentForm, currentToken)
      setPreviewCount(res.data.count)
      setPreviewSamples(res.data.samples ?? [])
    } catch {
      // Silently fail — count is a nice-to-have
    }
    setPreviewLoading(false)
  }, [])

  useEffect(() => {
    if (!showForm || !token) return
    if (previewTimerRef.current) clearTimeout(previewTimerRef.current)
    previewTimerRef.current = setTimeout(() => fetchPreviewCount(form, token), 800)
    return () => { if (previewTimerRef.current) clearTimeout(previewTimerRef.current) }
  }, [form, showForm, token, fetchPreviewCount])

  function startCreate() {
    setEditingId(null)
    const base = emptyForm()

    const raw = localStorage.getItem('kind_icp_prefill')
    if (raw) {
      try {
        const prefill = JSON.parse(raw) as Partial<ICPFormData>
        setForm({ ...base, ...prefill })
        setPrefillNotice(true)
        localStorage.removeItem('kind_icp_prefill')
      } catch {
        setForm(base)
      }
    } else {
      setForm(base)
    }

    setShowForm(true)
  }

  function startEdit(icp: ICP) {
    setEditingId(icp.id)
    setForm({
      name:                  icp.name,
      industries:            icp.industries,
      job_titles:            icp.job_titles,
      seniority_levels:      icp.seniority_levels,
      company_sizes:         icp.company_sizes,
      geographies:           icp.geographies,
      tech_stack:            icp.tech_stack,
      keywords:              icp.keywords,
      apollo_only_consented: icp.apollo_only_consented,
      intent_signals:        icp.intent_signals ?? [],
    })
    // P2-14: load social signals from ICP settings
    const ss = (icp as any).settings?.social_signals
    if (ss) {
      setSocialSignals({
        hashtags: (ss.hashtags ?? []).join(', '),
        competitor_pages: (ss.competitor_pages ?? []).join(', '),
        engagement_types: ss.engagement_types ?? [],
      })
    } else {
      setSocialSignals({ hashtags: '', competitor_pages: '', engagement_types: [] })
    }
    setPrefillNotice(false)
    setShowForm(true)
  }

  async function runIcp(icpId: string) {
    if (!token) return
    setRunningId(icpId)
    setRunBannerMsg(null)
    try {
      const res = await api.post<{ data: { inserted: number; skipped: number; total: number; relaxed: string | null } }>(
        `/icps/${icpId}/run`, {}, token
      )
      const { inserted, relaxed } = res.data
      if (inserted > 0) {
        setRunBannerMsg(`✅ ${inserted} lead${inserted !== 1 ? 's' : ''} found and being scored — go to Lead Gen to see them.`)
      } else {
        setRunBannerMsg(
          relaxed
            ? `⚠️ ${relaxed}`
            : '⚠️ No leads found. Try broadening your criteria — more industries, more geographies, or fewer company size restrictions.'
        )
      }
    } catch (err) {
      setRunBannerMsg(`❌ ${err instanceof Error ? err.message : 'Failed to run ICP — please try again.'}`)
    }
    setRunningId(null)
  }

  async function handleSave() {
    if (!token) return
    // Auto-use the name suggestion if name is still blank
    // In ABM mode, default name to first company name if blank
    const abmDefaultName = abmMode
      ? abmCompanies.split('\n').map(s => s.trim()).filter(Boolean)[0] ?? ''
      : null
    const finalName = form.name.trim() || (nameSuggestion ?? abmDefaultName ?? '')
    if (!finalName) {
      setSaveError('Please enter a name for this ICP — e.g. "SA Fintech CTOs"')
      nameInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      nameInputRef.current?.focus()
      return
    }
    if (finalName !== form.name) setForm(f => ({ ...f, name: finalName }))
    setSaving(true)
    setSaveError(null)
    const abmOrgNames = abmMode
      ? abmCompanies.split('\n').map(s => s.trim()).filter(Boolean)
      : undefined
    // P2-14: build social_signals for settings merge
    const socialSignalsPayload = {
      hashtags: socialSignals.hashtags.split(',').map(s => s.trim()).filter(Boolean),
      competitor_pages: socialSignals.competitor_pages.split(',').map(s => s.trim()).filter(Boolean),
      engagement_types: socialSignals.engagement_types,
    }
    const hasSocialSignals = socialSignalsPayload.hashtags.length > 0 ||
      socialSignalsPayload.competitor_pages.length > 0 ||
      socialSignalsPayload.engagement_types.length > 0
    const payload = {
      ...form,
      name: finalName,
      ...(abmOrgNames?.length ? { organization_names: abmOrgNames } : {}),
      ...(hasSocialSignals ? { settings: { social_signals: socialSignalsPayload } } : {}),
    }
    try {
      let savedIcp: ICP
      if (editingId) {
        const res = await api.patch<{ data: ICP }>(`/icps/${editingId}`, payload, token)
        savedIcp = res.data
        setIcps(prev => prev.map(i => i.id === editingId ? savedIcp : i))
      } else {
        const res = await api.post<{ data: ICP }>('/icps', payload, token)
        savedIcp = res.data
        setIcps(prev => [savedIcp, ...prev])
      }
      setSaved(true)
      setShowForm(false)
      // Auto-run the ICP immediately after save
      await runIcp(savedIcp.id)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      const msg = err instanceof Error
        ? err.message
        : typeof (err as { message?: string })?.message === 'string'
          ? (err as { message: string }).message
          : 'Failed to save ICP — please try again.'
      setSaveError(msg || 'Failed to save ICP — please try again.')
    }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!token || !confirm('Delete this ICP?')) return
    try {
      await api.delete_(`/icps/${id}`, token)
      setIcps(prev => prev.filter(i => i.id !== id))
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to delete ICP — please try again.')
    }
  }

  async function handleActivate(id: string) {
    if (!token) return
    try {
      await api.patch(`/icps/${id}/activate`, {}, token)
      setIcps(prev => prev.map(i => ({ ...i, is_active: i.id === id })))
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to activate ICP — please try again.')
    }
  }

  async function handleRefine(id: string) {
    if (!token) return
    setRefiningId(id)
    try {
      const res = await api.post<{ data: { suggestions: Array<{ type: string; action: string; value: string; reason: string }> | null; summary: string; reason?: string } }>(
        `/icps/${id}/refine`, {}, token
      )
      if (res.data.reason) {
        setSaveError(res.data.reason)
        return
      }
      setIcps(prev => prev.map(i => i.id === id ? {
        ...i,
        settings: { refinement_suggestions: res.data.suggestions ?? undefined, refinement_summary: res.data.summary, refined_at: new Date().toISOString() }
      } : i))
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'ICP refinement failed — please try again.')
    } finally {
      setRefiningId(null)
    }
  }

  async function handleAiSuggest() {
    if (!token) return
    setAiSuggesting(true)
    setAiSuggestError(null)
    try {
      const res = await api.post<{ data: Partial<ICPFormData> }>('/clients/me/suggest-icp', {}, token)
      setForm(f => ({ ...f, ...res.data }))
    } catch (err) {
      setAiSuggestError(err instanceof Error ? err.message : 'AI suggestion failed — please try again.')
    }
    setAiSuggesting(false)
  }

  const set = (field: keyof ICPFormData) => (val: unknown) => setForm(f => ({ ...f, [field]: val }))

  // Ensure a value from AI is actually a string array (AI sometimes returns strings or objects)
  function toStringArray(val: unknown): string[] | null {
    if (!val) return null
    if (Array.isArray(val)) {
      const arr = val.map(v => (typeof v === 'string' ? v : typeof v === 'object' && v && 'label' in v ? String((v as { label: unknown }).label) : String(v))).filter(Boolean)
      return arr.length ? arr : null
    }
    if (typeof val === 'string') {
      // e.g. "11-50, 51-200" → ["11-50", "51-200"]
      const arr = val.split(/[,;|]/).map(s => s.trim()).filter(Boolean)
      return arr.length ? arr : null
    }
    return null
  }

  function handleAiFill(data: Partial<ICPFormData> & Record<string, unknown>) {
    if (!showForm) { setShowForm(true); setEditingId(null) }

    const industries      = toStringArray(data.industries)
    const job_titles      = toStringArray(data.job_titles)
    const seniority_levels = toStringArray(data.seniority_levels)
    const company_sizes   = toStringArray(data.company_sizes)
    const geographies     = toStringArray(data.geographies)
    const tech_stack      = toStringArray(data.tech_stack)
    const keywords        = toStringArray(data.keywords)
    const name            = typeof data.name === 'string' && data.name.trim() ? data.name.trim() : null

    setForm(f => ({
      ...f,
      ...(data.industries?.length       ? { industries:       data.industries       } : {}),
      ...(data.job_titles?.length        ? { job_titles:        data.job_titles        } : {}),
      ...(data.seniority_levels?.length  ? { seniority_levels:  data.seniority_levels  } : {}),
      ...(data.company_sizes?.length     ? { company_sizes:     data.company_sizes     } : {}),
      ...(data.geographies?.length       ? { geographies:       data.geographies       } : {}),
      ...(data.tech_stack?.length        ? { tech_stack:        data.tech_stack        } : {}),
      ...(data.keywords?.length          ? { keywords:          data.keywords          } : {}),
      ...(data.name                      ? { name:              data.name              } : {}),
      ...(data.intent_signals?.length    ? { intent_signals:    data.intent_signals    } : {}),
    }))
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-[#7C3AED]" /></div>

  if (loadError) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <p className="text-red-600 font-medium mb-2">Could not load ICPs</p>
        <p className="text-sm text-[#7B6FA0]">{loadError}</p>
        <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-[#7C3AED] text-white rounded-lg text-sm hover:bg-[#6D28D9] transition-colors">
          Retry
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 items-stretch lg:items-start">
      <div className="flex-1 min-w-0 space-y-6">
        {/* Error banner — shown for delete/activate errors when form is not open */}
        {saveError && !showForm && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center justify-between">
            <p className="text-sm text-red-700">{saveError}</p>
            <button onClick={() => setSaveError(null)} className="ml-4 text-red-400 hover:text-red-600 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Saved banner */}
        {showSavedBanner && (
          <div className="bg-[#F5F0FF] border border-purple-200 rounded-xl px-4 py-3 flex items-center justify-between">
            <p className="text-sm text-blue-800">
              ✅ ICP saved — K.I.N.D is searching for your leads now. Check back in a few minutes.
            </p>
            <button onClick={() => setShowSavedBanner(false)} className="ml-4 text-blue-400 hover:text-[#7C3AED] transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <a href="/dashboard/leads" className="text-[#9B8EC4] hover:text-gray-600 transition-colors">
                <ArrowLeft className="w-4 h-4" />
              </a>
              <h1 className="text-2xl font-bold text-gray-900">ICP Builder</h1>
            </div>
            <p className="text-[#7B6FA0] text-sm">Define who your ideal customers are. KIND uses this to source and score matching leads.</p>
          </div>
          <button onClick={startCreate}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#7C3AED] text-white text-sm font-medium hover:bg-[#6D28D9] transition-colors">
            <Plus className="w-4 h-4" />New ICP
          </button>
        </div>

        {/* ICP list */}
        {icps.length === 0 && !showForm && (
          <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-purple-100/60 p-12 text-center">
            <Settings2 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="font-medium text-gray-700 mb-1">No ICPs yet</p>
            <p className="text-sm text-[#9B8EC4] mb-4">Build your first Ideal Customer Profile to start receiving matched leads.</p>
            <button onClick={startCreate}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#7C3AED] text-white text-sm font-medium hover:bg-[#6D28D9] transition-colors">
              <Plus className="w-4 h-4" />Build first ICP
            </button>
          </div>
        )}

        {icps.map(icp => (
          <div key={icp.id} className={`bg-white rounded-xl border p-5 ${icp.is_active ? 'border-[#7C3AED] ring-1 ring-[#7C3AED]' : 'border-purple-100/60'}`}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-3">
              <div className="flex items-center gap-3">
                <h3 className="font-semibold text-gray-900">{icp.name}</h3>
                {icp.is_active && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[#F5F0FF] text-[#6D28D9]">
                    <CheckCircle className="w-3 h-3" />Active
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => runIcp(icp.id)}
                  disabled={runningId === icp.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-60 transition-colors"
                >
                  {runningId === icp.id
                    ? <><Loader2 className="w-3 h-3 animate-spin" />Running…</>
                    : <><Play className="w-3 h-3" />Run ICP</>
                  }
                </button>
                {!icp.is_active && (
                  <button onClick={() => handleActivate(icp.id)}
                    className="text-xs text-[#6D28D9] hover:text-[#5B21B6] font-medium transition-colors">
                    Set active
                  </button>
                )}
                <button onClick={() => startEdit(icp)} className="text-xs text-[#7B6FA0] hover:text-gray-700 transition-colors">Edit</button>
                <button onClick={() => handleDelete(icp.id)} className="p-1.5 hover:bg-red-50 rounded-md text-[#9B8EC4] hover:text-red-500 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
              {[
                ['Industries', icp.industries],
                ['Job Titles', icp.job_titles],
                ['Seniority', icp.seniority_levels],
                ['Company Size', icp.company_sizes],
                ['Geographies', icp.geographies],
                ['Tech Stack', icp.tech_stack],
              ].map(([label, vals]) => (vals as string[]).length > 0 && (
                <div key={label as string}>
                  <span className="text-[#9B8EC4] text-xs">{label as string}: </span>
                  <span className="text-gray-700">{(vals as string[]).join(', ')}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-2">
              <span className={`text-xs px-2 py-0.5 rounded-full ${icp.apollo_only_consented ? 'bg-[#F5F0FF] text-[#7C3AED]' : 'bg-gray-50 text-[#7B6FA0]'}`}>
                {icp.apollo_only_consented ? '✓ Consented only' : 'All Apollo leads'}
              </span>
              {icp.last_run_at && (
                <span className="text-xs text-[#9B8EC4]">
                  Last run {new Date(icp.last_run_at).toLocaleDateString('en-ZA', { dateStyle: 'medium' })}
                </span>
              )}
              {icp.intent_signals?.length > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-purple-50 text-[#7C3AED]">
                  🎯 {icp.intent_signals.length} signal{icp.intent_signals.length > 1 ? 's' : ''}
                </span>
              )}
            </div>

            {/* P2-10 — ICP auto-refinement suggestions */}
            <div className="mt-4 pt-4 border-t border-gray-50">
              {icp.settings?.refinement_suggestions?.length ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-gray-700">✨ AI Refinement Suggestions</p>
                    <span className="text-[11px] text-[#9B8EC4]">{icp.settings.refined_at ? `Updated ${new Date(icp.settings.refined_at).toLocaleDateString('en-ZA', { dateStyle: 'short' })}` : ''}</span>
                  </div>
                  {icp.settings.refinement_summary && (
                    <p className="text-xs text-[#7B6FA0] italic">{icp.settings.refinement_summary}</p>
                  )}
                  {icp.settings.refinement_suggestions.map((s, i) => (
                    <div key={i} className="flex items-start gap-2 bg-purple-50 rounded-lg px-3 py-2 border border-purple-100">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-200 text-purple-800 uppercase shrink-0 mt-0.5">{s.action}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-900">{s.value}</p>
                        <p className="text-[11px] text-[#9B8EC4]">{s.reason}</p>
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={() => handleRefine(icp.id)}
                    disabled={refiningId === icp.id}
                    className="text-xs text-[#9B8EC4] hover:text-[#7C3AED] transition-colors"
                  >
                    {refiningId === icp.id ? 'Refreshing…' : '↻ Refresh suggestions'}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => handleRefine(icp.id)}
                  disabled={refiningId === icp.id}
                  className="flex items-center gap-1.5 text-xs font-medium text-[#7C3AED] hover:text-[#6D28D9] transition-colors disabled:opacity-50"
                >
                  {refiningId === icp.id
                    ? <><Loader2 className="w-3 h-3 animate-spin" />Analysing reply data…</>
                    : <><Sparkles className="w-3 h-3" />Get AI refinement suggestions</>
                  }
                </button>
              )}
            </div>
          </div>
        ))}

        {/* Form */}
        {showForm && (
          <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-purple-100/60 p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">{editingId ? 'Edit ICP' : 'New ICP'}</h3>
              <button type="button" onClick={handleAiSuggest} disabled={aiSuggesting}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-purple-50 text-purple-700 hover:bg-purple-100 disabled:opacity-60 transition-colors border border-purple-200">
                {aiSuggesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                {aiSuggesting ? 'Thinking…' : 'Suggest ICP with AI'}
              </button>
            </div>

            {/* P3-2: FIGSY Vertical Mode picker */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Start with a vertical template</p>
              <div className="flex flex-wrap gap-2">
                {VERTICAL_TEMPLATES.map(vt => (
                  <button
                    key={vt.id}
                    type="button"
                    title={vt.description}
                    onClick={() => {
                      setForm(f => ({ ...f, ...vt.data }))
                      setAbmMode(false)
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border border-purple-200 bg-white text-[#7C3AED] hover:bg-purple-50 hover:border-[#7C3AED] transition-colors"
                  >
                    <span>{vt.emoji}</span>{vt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* ABM / Standard toggle */}
            <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
              <button
                type="button"
                onClick={() => { setAbmMode(false); setPreviewCount(null); setPreviewSamples([]) }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold transition-all ${
                  !abmMode ? 'bg-white text-gray-900 shadow-sm' : 'text-[#7B6FA0] hover:text-gray-700'
                }`}
              >
                Standard Search
              </button>
              <button
                type="button"
                onClick={() => { setAbmMode(true); setPreviewCount(null); setPreviewSamples([]) }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold transition-all ${
                  abmMode ? 'bg-white text-gray-900 shadow-sm' : 'text-[#7B6FA0] hover:text-gray-700'
                }`}
              >
                <Building2 className="w-4 h-4" />
                ABM — Named Accounts
              </button>
            </div>
            {aiSuggestError && <p className="text-xs text-red-500">{aiSuggestError}</p>}

            {prefillNotice && (
              <div className="flex items-start justify-between bg-[#F5F0FF] border border-purple-200 rounded-xl px-4 py-3">
                <p className="text-sm text-blue-800">✨ We pre-filled your ICP from your website — review and adjust as needed.</p>
                <button onClick={() => setPrefillNotice(false)} className="ml-3 text-blue-400 hover:text-[#7C3AED] transition-colors shrink-0">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* ABM — Named Accounts form */}
            {abmMode && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ICP Name <span className="text-[#9B8EC4] font-normal text-xs">(optional)</span></label>
                  <input ref={nameInputRef} type="text" value={form.name} onChange={e => set('name')(e.target.value)}
                    placeholder="e.g. ABM — SA Banks"
                    className="w-full border border-purple-100/80 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Target Company Names</label>
                  <textarea
                    value={abmCompanies}
                    onChange={e => {
                      setAbmCompanies(e.target.value)
                      setPreviewCount(null)
                      setPreviewSamples([])
                    }}
                    rows={6}
                    placeholder={'Naspers\nMTN Group\nDiscovery Health'}
                    className="w-full border border-purple-100/80 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED] resize-y font-mono"
                  />
                  <p className="text-xs text-[#9B8EC4] mt-1">Enter one company name per line.</p>
                </div>
                <button
                  type="button"
                  disabled={!abmCompanies.trim() || !token}
                  onClick={() => {
                    if (!token) return
                    const orgNames = abmCompanies.split('\n').map(s => s.trim()).filter(Boolean)
                    if (orgNames.length === 0) return
                    fetchPreviewCount(form, token, orgNames)
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  <Users2 className="w-4 h-4" />
                  Find contacts at these companies
                </button>
              </div>
            )}

            {/* Live count banner */}
            {showForm && (previewLoading || previewCount !== null) && (
              <div className={`px-4 py-3 rounded-xl border transition-all ${
                previewLoading
                  ? 'bg-gray-50 border-gray-100'
                  : previewCount === 0
                  ? 'bg-amber-50 border-amber-100'
                  : 'bg-[#F5F0FF] border-purple-200'
              }`}>
                {previewLoading ? (
                  <div className="flex items-center gap-3">
                    <Loader2 className="w-4 h-4 text-[#9B8EC4] animate-spin shrink-0" />
                    <p className="text-sm text-[#9B8EC4]">Searching Apollo database…</p>
                  </div>
                ) : previewCount === 0 ? (
                  <div className="flex items-center gap-3">
                    <Users2 className="w-4 h-4 text-amber-500 shrink-0" />
                    <p className="text-sm text-amber-700">No exact matches yet — try broadening your filters.</p>
                  </div>
                ) : (
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Users2 className="w-4 h-4 text-[#7C3AED] shrink-0" />
                      <p className="text-sm text-[#7C3AED] font-semibold">
                        <span className="text-lg font-bold">{previewCount!.toLocaleString()}</span> matching leads found
                      </p>
                      <span className="ml-auto text-xs text-[#9B8EC4]">Live · Apollo</span>
                    </div>
                    {previewSamples.length > 0 && (
                      <div className="flex flex-col gap-1.5">
                        {previewSamples.map((s, i) => (
                          <div key={i} className="flex items-center gap-2 bg-white/70 rounded-lg px-3 py-2">
                            <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
                              <span className="text-[10px] font-bold text-[#7C3AED]">{s.first_name?.[0] ?? '?'}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-gray-900 truncate">{s.first_name} {s.last_name}</p>
                              <p className="text-[11px] text-[#9B8EC4] truncate">{[s.title, s.company].filter(Boolean).join(' · ')}</p>
                            </div>
                            {s.linkedin_url && (
                              <a href={s.linkedin_url} target="_blank" rel="noopener noreferrer"
                                className="text-[10px] font-bold px-1.5 py-0.5 bg-[#0077B5]/10 text-[#0077B5] rounded border border-[#0077B5]/20 shrink-0">in</a>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {!abmMode && (
              <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ICP Name *</label>
              <input ref={nameInputRef} type="text" value={form.name} onChange={e => set('name')(e.target.value)}
                placeholder="e.g. SA Fintech CTOs"
                className="w-full border border-purple-100/80 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]" />
              {nameSuggestion && (
                <button type="button" onClick={() => { set('name')(nameSuggestion); setNameSuggestion(null) }}
                  className="mt-1.5 text-xs text-[#6D28D9] hover:text-[#5B21B6] flex items-center gap-1">
                  ✨ Use: <span className="font-medium">{nameSuggestion}</span>
                </button>
              )}
            </div>

            <CheckboxGroup label="Industries" options={INDUSTRIES} selected={form.industries} onChange={set('industries')} />
            <TagInput label="Job Titles" tags={form.job_titles} onChange={set('job_titles')} placeholder="e.g. CTO, Head of Sales…" />
            <CheckboxGroup label="Seniority Levels" options={SENIORITY_LEVELS} selected={form.seniority_levels} onChange={set('seniority_levels')} />
            <CheckboxGroup label="Company Sizes" options={COMPANY_SIZES} selected={form.company_sizes} onChange={set('company_sizes')} />
            <TagInput label="Geographies" tags={form.geographies} onChange={set('geographies')} placeholder="e.g. South Africa, Nigeria…" suggestions={[...SUPPORTED_COUNTRIES]} />
            <TagInput label="Tech Stack Signals" tags={form.tech_stack} onChange={set('tech_stack')} placeholder="e.g. Salesforce, HubSpot…" suggestions={TECH_STACK_OPTIONS} />
            <TagInput label="Keywords" tags={form.keywords} onChange={set('keywords')} placeholder="e.g. Series A, hiring, expansion…" />

            {/* Intent Signals — W3 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Intent Signals <span className="text-[#9B8EC4] font-normal text-xs">(optional)</span></label>
              <p className="text-xs text-[#9B8EC4] mb-3">Only surface leads showing active buying signals right now.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {INTENT_SIGNALS.map(sig => {
                  const active = form.intent_signals?.includes(sig.value)
                  return (
                    <button key={sig.value} type="button"
                      onClick={() => {
                        const current = form.intent_signals ?? []
                        set('intent_signals')(active ? current.filter(s => s !== sig.value) : [...current, sig.value])
                      }}
                      className={`text-left px-3 py-2.5 rounded-xl border transition-colors ${
                        active
                          ? 'bg-[#7C3AED] text-white border-[#7C3AED]'
                          : 'bg-white text-gray-700 border-purple-100/80 hover:border-[#7C3AED]/40'
                      }`}>
                      <p className="text-xs font-semibold">{sig.label}</p>
                      <p className={`text-[11px] mt-0.5 ${active ? 'text-white/70' : 'text-[#9B8EC4]'}`}>{sig.desc}</p>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* P2-14 — Social Signals */}
            <div className="border border-purple-100/80 rounded-xl p-4 bg-white">
              <label className="block text-sm font-medium text-gray-700 mb-1">Social Signals <span className="text-[#9B8EC4] font-normal text-xs">(optional)</span></label>
              <p className="text-xs text-[#9B8EC4] mb-3">LinkedIn engagement filters to identify high-intent leads in your ICP.</p>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">LinkedIn hashtags to target (comma-separated)</label>
                  <input
                    type="text"
                    value={socialSignals.hashtags}
                    onChange={e => setSocialSignals(s => ({ ...s, hashtags: e.target.value }))}
                    placeholder="e.g. fintech, saas, b2bsales"
                    className="w-full border border-purple-100/80 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED] bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Competitor pages your ICP follows (comma-separated)</label>
                  <input
                    type="text"
                    value={socialSignals.competitor_pages}
                    onChange={e => setSocialSignals(s => ({ ...s, competitor_pages: e.target.value }))}
                    placeholder="e.g. Salesforce, HubSpot, Outreach.io"
                    className="w-full border border-purple-100/80 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED] bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-2">Engagement types</label>
                  <div className="flex flex-col gap-2">
                    {[
                      { value: 'liked_tech_posts', label: 'Liked tech posts' },
                      { value: 'commented_industry', label: 'Commented on industry content' },
                      { value: 'followed_competitors', label: 'Followed competitor accounts' },
                    ].map(opt => (
                      <label key={opt.value} className="flex items-center gap-2 text-xs text-gray-700">
                        <input
                          type="checkbox"
                          checked={socialSignals.engagement_types.includes(opt.value)}
                          onChange={e => {
                            const types = socialSignals.engagement_types
                            setSocialSignals(s => ({
                              ...s,
                              engagement_types: e.target.checked
                                ? [...types, opt.value]
                                : types.filter(t => t !== opt.value),
                            }))
                          }}
                          className="rounded border-purple-200 text-[#7C3AED] focus:ring-[#7C3AED]"
                        />
                        {opt.label}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-[#F5F0FF] rounded-xl">
              <input type="checkbox" id="apollo-consent" checked={form.apollo_only_consented}
                onChange={e => set('apollo_only_consented')(e.target.checked)}
                className="mt-0.5 rounded border-gray-300 text-[#7C3AED] focus:ring-[#7C3AED]" />
              <label htmlFor="apollo-consent" className="text-sm">
                <span className="font-medium text-gray-900">Apollo consented leads only (recommended)</span>
                <p className="text-[#7B6FA0] text-xs mt-0.5">Only surface leads who have already opted in on Apollo. Faster compliance, fewer rejections.</p>
              </label>
            </div>
              </>
            )}

            {saveError && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
                {typeof saveError === 'string' ? saveError : JSON.stringify(saveError)}
              </div>
            )}

            <div className="flex items-center gap-3">
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-medium rounded-lg text-sm transition-colors disabled:opacity-60">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle className="w-4 h-4" /> : null}
                {saved ? 'Saved!' : saving ? 'Saving…' : 'Save & Find Leads'}
              </button>
              <button onClick={() => { setShowForm(false); setSaveError(null) }}
                className="px-5 py-2.5 border border-purple-100/80 text-sm font-medium rounded-lg hover:border-gray-400 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
      {token && <FigsySidePanel token={token} onFill={handleAiFill} />}
    </div>
  )
}
