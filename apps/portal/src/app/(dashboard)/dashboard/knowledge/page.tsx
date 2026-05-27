'use client'

import { useState } from 'react'
import {
  BookOpen, Target, Zap, Ban, MessageSquare, Brain, Settings2,
  Plus, Trash2, Save, CheckCircle2, ChevronDown, ChevronRight,
  Sparkles, Globe, FileText, Upload,
} from 'lucide-react'

type Tab = 'pitch' | 'keywords' | 'signals' | 'dnc' | 'messaging' | 'context' | 'prompts'

interface TrainingUrl {
  id: string
  url: string
  label: string
  status: 'pending' | 'trained' | 'error'
}

interface DNCEntry {
  id: string
  value: string
  type: 'email' | 'domain' | 'company'
}

const TABS: { value: Tab; label: string; icon: React.ElementType; description: string }[] = [
  { value: 'pitch',     label: 'Pitch',     icon: Target,      description: 'Your value proposition and key messages' },
  { value: 'keywords',  label: 'Keywords',  icon: Zap,         description: 'Trigger words and ICP signals to target' },
  { value: 'signals',   label: 'Signals',   icon: Brain,       description: 'Buying signals FIGSY looks for' },
  { value: 'dnc',       label: 'DNC',       icon: Ban,         description: 'Do not contact list — emails, domains, companies' },
  { value: 'messaging', label: 'Messaging', icon: MessageSquare,description: 'Tone, style and persona guidance for FIGSY' },
  { value: 'context',   label: 'Context',   icon: Globe,       description: 'Source URLs for FIGSY to learn from' },
  { value: 'prompts',   label: 'Prompts',   icon: Settings2,   description: 'Per-step prompt overrides for sequences' },
]

function SavedBadge() {
  return (
    <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
      <CheckCircle2 className="w-3.5 h-3.5" /> Saved
    </span>
  )
}

function PitchTab() {
  const [saved, setSaved] = useState(false)
  const [pitch, setPitch] = useState('')
  const [product, setProduct] = useState('')
  const [painPoints, setPainPoints] = useState('')
  const [differentiators, setDifferentiators] = useState('')

  function save() {
    // In production: POST to /figsy/knowledge/pitch
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="space-y-5">
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Company / product name</label>
        <input
          value={product}
          onChange={e => setProduct(e.target.value)}
          placeholder="e.g. K.I.N.D — AI-powered sales & operations platform"
          className="w-full border border-purple-100/80 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
        />
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Core pitch</label>
        <p className="text-xs text-[#9B8EC4] mb-2">What do you do, for whom, and what outcome do you deliver?</p>
        <textarea
          value={pitch}
          onChange={e => setPitch(e.target.value)}
          rows={4}
          placeholder="e.g. K.I.N.D helps South African SMBs replace manual outreach with AI agents that find leads, send personalised sequences, and book meetings — without hiring an SDR."
          className="w-full border border-purple-100/80 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 resize-y"
        />
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Pain points you solve</label>
        <textarea
          value={painPoints}
          onChange={e => setPainPoints(e.target.value)}
          rows={3}
          placeholder="e.g. Manual outreach is too slow. Sales teams don't follow up consistently. No budget for full-time SDR."
          className="w-full border border-purple-100/80 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 resize-y"
        />
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Key differentiators</label>
        <textarea
          value={differentiators}
          onChange={e => setDifferentiators(e.target.value)}
          rows={3}
          placeholder="e.g. POPIA-compliant by design. Transparent per-credit pricing. Africa-native infrastructure. Self-serve — no onboarding calls."
          className="w-full border border-purple-100/80 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 resize-y"
        />
      </div>
      <div className="flex items-center justify-between pt-2">
        {saved ? <SavedBadge /> : <span />}
        <button
          onClick={save}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-sm font-semibold rounded-xl transition-colors"
        >
          <Save className="w-4 h-4" /> Save pitch
        </button>
      </div>
    </div>
  )
}

function KeywordsTab() {
  const [saved, setSaved] = useState(false)
  const [positive, setPositive] = useState('')
  const [negative, setNegative] = useState('')
  const [industries, setIndustries] = useState('')
  const [titles, setTitles] = useState('')

  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-[#F5F0FF] border border-purple-100 px-4 py-3 flex items-start gap-2">
        <Sparkles className="w-4 h-4 text-purple-500 shrink-0 mt-0.5" />
        <p className="text-xs text-[#6D28D9]">FIGSY uses these to filter and score leads. More specific = better targeting.</p>
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Target job titles</label>
        <input
          value={titles}
          onChange={e => setTitles(e.target.value)}
          placeholder="e.g. CEO, Founder, Head of Sales, Sales Director, MD"
          className="w-full border border-purple-100/80 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
        />
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Target industries</label>
        <input
          value={industries}
          onChange={e => setIndustries(e.target.value)}
          placeholder="e.g. SaaS, Professional Services, Recruitment, Financial Services"
          className="w-full border border-purple-100/80 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
        />
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Positive keywords</label>
        <p className="text-xs text-[#9B8EC4] mb-2">Signals that make a lead a great fit</p>
        <textarea
          value={positive}
          onChange={e => setPositive(e.target.value)}
          rows={3}
          placeholder="e.g. scaling, hiring SDRs, growth, Series A, outbound, B2B, SaaS founder"
          className="w-full border border-purple-100/80 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 resize-y"
        />
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Negative keywords</label>
        <p className="text-xs text-[#9B8EC4] mb-2">Signals to disqualify a lead</p>
        <textarea
          value={negative}
          onChange={e => setNegative(e.target.value)}
          rows={3}
          placeholder="e.g. enterprise, government, non-profit, recruiting agency, freelancer"
          className="w-full border border-purple-100/80 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 resize-y"
        />
      </div>
      <div className="flex items-center justify-between pt-2">
        {saved ? <SavedBadge /> : <span />}
        <button
          onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 3000) }}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-sm font-semibold rounded-xl transition-colors"
        >
          <Save className="w-4 h-4" /> Save keywords
        </button>
      </div>
    </div>
  )
}

function SignalsTab() {
  const signals = [
    { id: '1', label: 'Company is hiring salespeople', enabled: true },
    { id: '2', label: 'Recent LinkedIn post about growth', enabled: true },
    { id: '3', label: 'Job posting for marketing roles', enabled: false },
    { id: '4', label: 'Announced a new product or feature', enabled: true },
    { id: '5', label: 'Raised a funding round', enabled: false },
    { id: '6', label: 'Company headcount growing rapidly', enabled: true },
  ]
  const [enabled, setEnabled] = useState<Record<string, boolean>>(
    Object.fromEntries(signals.map(s => [s.id, s.enabled]))
  )

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-amber-50 border border-amber-100 px-4 py-3 flex items-start gap-2">
        <Brain className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-700">Buying signals help FIGSY prioritise leads who are most likely to convert right now.</p>
      </div>
      <div className="space-y-2">
        {signals.map(signal => (
          <div key={signal.id} className="flex items-center justify-between px-4 py-3 bg-white border border-purple-100/60 rounded-xl">
            <span className="text-sm text-gray-700">{signal.label}</span>
            <button
              onClick={() => setEnabled(prev => ({ ...prev, [signal.id]: !prev[signal.id] }))}
              className={`relative w-10 h-5.5 rounded-full transition-colors ${enabled[signal.id] ? 'bg-[#7C3AED]' : 'bg-gray-200'}`}
              style={{ height: '22px', minWidth: '40px' }}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-4.5 h-4.5 rounded-full bg-white shadow transition-transform ${enabled[signal.id] ? 'translate-x-[18px]' : 'translate-x-0'}`}
                style={{ width: '18px', height: '18px' }}
              />
            </button>
          </div>
        ))}
      </div>
      <div className="pt-2 flex justify-end">
        <button className="flex items-center gap-2 px-5 py-2.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-sm font-semibold rounded-xl transition-colors">
          <Save className="w-4 h-4" /> Save signals
        </button>
      </div>
    </div>
  )
}

function DNCTab() {
  const [entries, setEntries] = useState<DNCEntry[]>([
    { id: '1', value: 'competitor.com', type: 'domain' },
    { id: '2', value: 'partner@example.com', type: 'email' },
  ])
  const [newValue, setNewValue] = useState('')
  const [newType, setNewType] = useState<DNCEntry['type']>('email')

  function addEntry() {
    if (!newValue.trim()) return
    setEntries(prev => [...prev, { id: Date.now().toString(), value: newValue.trim(), type: newType }])
    setNewValue('')
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-rose-50 border border-rose-100 px-4 py-3 flex items-start gap-2">
        <Ban className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
        <p className="text-xs text-rose-700">Contacts, emails, or domains on this list will never be contacted by any K.I.N.D agent. POPIA opt-outs are added automatically.</p>
      </div>

      <div className="flex gap-3">
        <select
          value={newType}
          onChange={e => setNewType(e.target.value as DNCEntry['type'])}
          className="border border-purple-100/80 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white"
        >
          <option value="email">Email</option>
          <option value="domain">Domain</option>
          <option value="company">Company</option>
        </select>
        <input
          value={newValue}
          onChange={e => setNewValue(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addEntry()}
          placeholder={newType === 'email' ? 'name@company.com' : newType === 'domain' ? 'company.com' : 'Company name'}
          className="flex-1 border border-purple-100/80 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
        />
        <button
          onClick={addEntry}
          className="px-4 py-2.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-sm font-semibold rounded-xl transition-colors flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" /> Add
        </button>
      </div>

      <div className="space-y-2">
        {entries.map(entry => (
          <div key={entry.id} className="flex items-center justify-between px-4 py-3 bg-white border border-purple-100/60 rounded-xl">
            <div className="flex items-center gap-2.5">
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide ${
                entry.type === 'email' ? 'bg-blue-100 text-[#7C3AED]' :
                entry.type === 'domain' ? 'bg-purple-100 text-purple-600' :
                'bg-orange-100 text-orange-600'
              }`}>
                {entry.type}
              </span>
              <span className="text-sm text-gray-700">{entry.value}</span>
            </div>
            <button
              onClick={() => setEntries(prev => prev.filter(e => e.id !== entry.id))}
              className="text-gray-300 hover:text-red-400 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {entries.length === 0 && (
        <p className="text-center text-sm text-[#9B8EC4] py-6">No DNC entries yet. Add emails, domains, or company names above.</p>
      )}
    </div>
  )
}

function MessagingTab() {
  const [tone, setTone] = useState('professional')
  const [length, setLength] = useState('concise')
  const [persona, setPersona] = useState('')
  const [saved, setSaved] = useState(false)

  return (
    <div className="space-y-5">
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Tone of voice</label>
        <div className="grid grid-cols-3 gap-2">
          {['professional', 'conversational', 'direct'].map(t => (
            <button
              key={t}
              onClick={() => setTone(t)}
              className={`py-2.5 px-3 rounded-xl text-sm font-medium border transition-colors capitalize ${
                tone === t
                  ? 'bg-[#7C3AED] text-white border-[#7C3AED]'
                  : 'bg-white text-gray-600 border-purple-100/80 hover:border-gray-300'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Email length preference</label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { value: 'brief', label: 'Brief (2–3 lines)' },
            { value: 'concise', label: 'Concise (4–6 lines)' },
            { value: 'detailed', label: 'Detailed (7+ lines)' },
          ].map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setLength(value)}
              className={`py-2.5 px-3 rounded-xl text-sm font-medium border transition-colors ${
                length === value
                  ? 'bg-[#7C3AED] text-white border-[#7C3AED]'
                  : 'bg-white text-gray-600 border-purple-100/80 hover:border-gray-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Persona instruction</label>
        <p className="text-xs text-[#9B8EC4] mb-2">How should FIGSY present itself? (optional)</p>
        <textarea
          value={persona}
          onChange={e => setPersona(e.target.value)}
          rows={3}
          placeholder="e.g. Write as a senior business development manager. Never mention AI. Sound like a real human reaching out."
          className="w-full border border-purple-100/80 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 resize-y"
        />
      </div>
      <div className="flex items-center justify-between pt-2">
        {saved ? <SavedBadge /> : <span />}
        <button
          onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 3000) }}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-sm font-semibold rounded-xl transition-colors"
        >
          <Save className="w-4 h-4" /> Save messaging
        </button>
      </div>
    </div>
  )
}

function ContextTab() {
  const [urls, setUrls] = useState<TrainingUrl[]>([
    { id: '1', url: 'https://get-kind.com', label: 'Main website', status: 'trained' },
  ])
  const [newUrl, setNewUrl] = useState('')
  const [newLabel, setNewLabel] = useState('')

  function addUrl() {
    if (!newUrl.trim()) return
    setUrls(prev => [...prev, {
      id: Date.now().toString(),
      url: newUrl.trim(),
      label: newLabel.trim() || newUrl.trim(),
      status: 'pending'
    }])
    setNewUrl('')
    setNewLabel('')
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-[#F5F0FF] border border-purple-100 px-4 py-3 flex items-start gap-2">
        <Globe className="w-4 h-4 text-purple-500 shrink-0 mt-0.5" />
        <p className="text-xs text-[#6D28D9]">Add URLs for FIGSY to learn from. This could be your website, case studies, product docs, or competitor pages.</p>
      </div>

      <div className="space-y-2">
        <input
          value={newLabel}
          onChange={e => setNewLabel(e.target.value)}
          placeholder="Label (e.g. Product page, Case study)"
          className="w-full border border-purple-100/80 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
        />
        <div className="flex gap-2">
          <input
            value={newUrl}
            onChange={e => setNewUrl(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addUrl()}
            placeholder="https://"
            className="flex-1 border border-purple-100/80 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
          <button
            onClick={addUrl}
            className="px-4 py-2.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-sm font-semibold rounded-xl transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Add URL
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {urls.map(url => (
          <div key={url.id} className="flex items-center gap-3 px-4 py-3 bg-white border border-purple-100/60 rounded-xl">
            <Globe className="w-4 h-4 text-[#9B8EC4] shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{url.label}</p>
              <p className="text-xs text-[#9B8EC4] truncate">{url.url}</p>
            </div>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
              url.status === 'trained' ? 'bg-green-100 text-green-600' :
              url.status === 'error'   ? 'bg-red-100 text-red-600' :
                                         'bg-gray-100 text-[#7B6FA0]'
            }`}>
              {url.status === 'trained' ? 'Trained' : url.status === 'error' ? 'Error' : 'Pending'}
            </span>
            <button
              onClick={() => setUrls(prev => prev.filter(u => u.id !== url.id))}
              className="text-gray-300 hover:text-red-400 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

function PromptsTab() {
  const steps = [
    { step: 1, label: 'Step 1 — First touch', default: 'Write a personalised cold outreach email. Reference their company and role. Keep it under 80 words. No fluff.' },
    { step: 2, label: 'Step 2 — Follow-up (Day 4)', default: 'Write a brief follow-up referencing the first email. Add a soft value point. Keep it under 60 words.' },
    { step: 3, label: 'Step 3 — Final touch (Day 9)', default: 'Write a final breakup email. Acknowledge they may be busy. Leave the door open. Under 50 words.' },
  ]
  const [overrides, setOverrides] = useState<Record<number, string>>({})
  const [expanded, setExpanded] = useState<number | null>(1)

  return (
    <div className="space-y-3">
      <div className="rounded-xl bg-amber-50 border border-amber-100 px-4 py-3 flex items-start gap-2">
        <Settings2 className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-700">Override FIGSY's default prompts for each sequence step. Leave blank to use the default.</p>
      </div>
      {steps.map(({ step, label, default: def }) => (
        <div key={step} className="border border-purple-100/60 rounded-xl overflow-hidden bg-white">
          <button
            onClick={() => setExpanded(expanded === step ? null : step)}
            className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors"
          >
            <div>
              <p className="text-sm font-semibold text-gray-900">{label}</p>
              <p className="text-xs text-[#9B8EC4] mt-0.5">
                {overrides[step] ? 'Custom prompt set' : 'Using FIGSY default'}
              </p>
            </div>
            {expanded === step
              ? <ChevronDown className="w-4 h-4 text-[#9B8EC4]" />
              : <ChevronRight className="w-4 h-4 text-[#9B8EC4]" />}
          </button>
          {expanded === step && (
            <div className="px-4 pb-4 border-t border-gray-50">
              <p className="text-xs text-[#9B8EC4] mt-3 mb-2 font-medium">Default prompt:</p>
              <p className="text-xs text-[#7B6FA0] bg-[#F5EEFF]/60 rounded-lg px-3 py-2 mb-3 italic">{def}</p>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Your override (optional):</label>
              <textarea
                value={overrides[step] ?? ''}
                onChange={e => setOverrides(prev => ({ ...prev, [step]: e.target.value }))}
                rows={4}
                placeholder="Leave blank to use default…"
                className="w-full border border-purple-100/80 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 resize-y"
              />
            </div>
          )}
        </div>
      ))}
      <div className="pt-2 flex justify-end">
        <button className="flex items-center gap-2 px-5 py-2.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-sm font-semibold rounded-xl transition-colors">
          <Save className="w-4 h-4" /> Save prompts
        </button>
      </div>
    </div>
  )
}

const TAB_CONTENT: Record<Tab, React.ReactNode> = {
  pitch:     <PitchTab />,
  keywords:  <KeywordsTab />,
  signals:   <SignalsTab />,
  dnc:       <DNCTab />,
  messaging: <MessagingTab />,
  context:   <ContextTab />,
  prompts:   <PromptsTab />,
}

export default function KnowledgePage() {
  const [activeTab, setActiveTab] = useState<Tab>('pitch')

  const current = TABS.find(t => t.value === activeTab)!

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#7C3AED] to-[#6D28D9] flex items-center justify-center shrink-0">
          <BookOpen className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Knowledge & Compass</h1>
          <p className="text-sm text-[#7B6FA0] mt-0.5">
            Train FIGSY on your pitch, ICP, messaging style, and what to avoid.
            Better training → better outreach.
          </p>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Sidebar tabs */}
        <div className="w-52 shrink-0">
          <nav className="space-y-1">
            {TABS.map(({ value, label, icon: Icon, description }) => (
              <button
                key={value}
                onClick={() => setActiveTab(value)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors text-left ${
                  activeTab === value
                    ? 'bg-[#7C3AED] text-white font-semibold shadow-md shadow-purple-200'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 bg-white/80 backdrop-blur-sm rounded-2xl border border-purple-100/60 p-6">
          <div className="mb-5">
            <h2 className="text-base font-bold text-gray-900">{current.label}</h2>
            <p className="text-sm text-[#9B8EC4] mt-0.5">{current.description}</p>
          </div>
          {TAB_CONTENT[activeTab]}
        </div>
      </div>
    </div>
  )
}
