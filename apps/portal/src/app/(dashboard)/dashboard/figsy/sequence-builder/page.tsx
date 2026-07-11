'use client'

import { useState } from 'react'
import {
  GitBranch,
  Mail,
  Linkedin,
  Phone,
  MessageSquare,
  CheckSquare,
  Webhook,
  Plus,
  Clock,
  ChevronRight,
  Sparkles,
  AlertTriangle,
  Link2,
  UserCheck,
  AlignLeft,
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────

type StepType =
  | 'email'
  | 'linkedin_connect'
  | 'linkedin_message'
  | 'linkedin_like'
  | 'linkedin_view'
  | 'linkedin_voice'
  | 'call'
  | 'sms'
  | 'whatsapp'
  | 'manual_task'
  | 'api_connect'
  | 'branch'
  | 'wait'

interface SequenceStep {
  id: string
  type: StepType
  label: string
  sublabel?: string
  waitDays?: number
  branches?: {
    left: { label: string; color: string; steps: SequenceStep[] }
    right: { label: string; color: string; steps: SequenceStep[] }
  }
}

interface Template {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  outlined?: boolean
  dashed?: boolean
  steps: SequenceStep[]
}

// ── Default step trees per template ──────────────────────────────

function makeId() {
  return Math.random().toString(36).slice(2, 9)
}

const AI_MAGIC_STEPS: SequenceStep[] = [
  {
    id: 'step-1',
    type: 'email',
    label: 'Send email',
    sublabel: 'Intro + specific observation',
  },
  {
    id: 'step-2',
    type: 'linkedin_connect',
    label: 'LinkedIn · connect',
    sublabel: 'Connection request',
    waitDays: 1,
    branches: {
      left: {
        label: 'CONNECTED',
        color: '#16a34a',
        steps: [
          {
            id: 'step-3a',
            type: 'linkedin_message',
            label: 'LinkedIn message',
            sublabel: 'Value-add follow-up',
          },
        ],
      },
      right: {
        label: 'NOT CONNECTED',
        color: '#ea580c',
        steps: [
          {
            id: 'step-3b',
            type: 'email',
            label: 'Follow-up email',
            sublabel: 'Alternative touch',
          },
        ],
      },
    },
  },
]

const EMAIL_ONLY_STEPS: SequenceStep[] = [
  { id: makeId(), type: 'email', label: 'Send email', sublabel: 'Day 0 — Intro email' },
  { id: makeId(), type: 'email', label: 'Send email', sublabel: 'Day 4 — Follow-up', waitDays: 4 },
  { id: makeId(), type: 'email', label: 'Send email', sublabel: 'Day 9 — Breakup email', waitDays: 5 },
]

const LINKEDIN_ONLY_STEPS: SequenceStep[] = [
  { id: makeId(), type: 'linkedin_view', label: 'LinkedIn · view', sublabel: 'Profile view' },
  { id: makeId(), type: 'linkedin_connect', label: 'LinkedIn · connect', sublabel: 'Connection request', waitDays: 1 },
  { id: makeId(), type: 'linkedin_message', label: 'LinkedIn message', sublabel: 'Intro message', waitDays: 2 },
]

const OMNI_STEPS: SequenceStep[] = [
  { id: makeId(), type: 'email', label: 'Send email', sublabel: 'Intro email', },
  { id: makeId(), type: 'linkedin_view', label: 'LinkedIn · view', sublabel: 'Profile view', waitDays: 1 },
  { id: makeId(), type: 'linkedin_connect', label: 'LinkedIn · connect', sublabel: 'Connection request', waitDays: 1 },
  { id: makeId(), type: 'email', label: 'Send email', sublabel: 'Follow-up email', waitDays: 3 },
]

const INBOUND_STEPS: SequenceStep[] = [
  { id: makeId(), type: 'email', label: 'Send email', sublabel: 'Thank you + next steps' },
  { id: makeId(), type: 'call', label: 'Call', sublabel: 'Qualification call', waitDays: 1 },
  { id: makeId(), type: 'email', label: 'Send email', sublabel: 'Recap + proposal', waitDays: 2 },
]

const EVENT_STEPS: SequenceStep[] = [
  { id: makeId(), type: 'email', label: 'Send email', sublabel: 'Pre-event reminder', waitDays: 0 },
  { id: makeId(), type: 'linkedin_connect', label: 'LinkedIn · connect', sublabel: 'Connect before event', waitDays: 1 },
  { id: makeId(), type: 'email', label: 'Send email', sublabel: 'Post-event follow-up', waitDays: 3 },
]

const SOCIAL_STEPS: SequenceStep[] = [
  { id: makeId(), type: 'linkedin_like', label: 'LinkedIn · like', sublabel: 'Like recent post' },
  { id: makeId(), type: 'linkedin_connect', label: 'LinkedIn · connect', sublabel: 'Connection request', waitDays: 1 },
  { id: makeId(), type: 'linkedin_message', label: 'LinkedIn message', sublabel: 'Comment follow-up', waitDays: 2 },
]

const TEMPLATES: Template[] = [
  {
    id: 'ai_magic',
    name: 'AI Magic',
    description: 'AI-powered, adapts as it goes',
    icon: <Sparkles className="w-5 h-5 text-purple-500" />,
    outlined: true,
    steps: AI_MAGIC_STEPS,
  },
  {
    id: 'email_only',
    name: 'Email only',
    description: 'Outbound',
    icon: <Mail className="w-5 h-5 text-blue-500" />,
    steps: EMAIL_ONLY_STEPS,
  },
  {
    id: 'linkedin_only',
    name: 'LinkedIn only',
    description: 'Outbound',
    icon: <Linkedin className="w-5 h-5 text-sky-600" />,
    steps: LINKEDIN_ONLY_STEPS,
  },
  {
    id: 'omni',
    name: 'Omni-channel',
    description: 'Email + LinkedIn + more',
    icon: <GitBranch className="w-5 h-5 text-indigo-500" />,
    steps: OMNI_STEPS,
  },
  {
    id: 'inbound',
    name: 'Inbound form',
    description: 'They filled a form',
    icon: <AlignLeft className="w-5 h-5 text-teal-500" />,
    steps: INBOUND_STEPS,
  },
  {
    id: 'event',
    name: 'Event-driven',
    description: 'Before / after an event',
    icon: <CheckSquare className="w-5 h-5 text-amber-500" />,
    steps: EVENT_STEPS,
  },
  {
    id: 'social',
    name: 'Social signals',
    description: 'Engaged on LinkedIn',
    icon: <UserCheck className="w-5 h-5 text-pink-500" />,
    steps: SOCIAL_STEPS,
  },
  {
    id: 'scratch',
    name: 'Start from scratch',
    description: '',
    icon: <Plus className="w-6 h-6 text-gray-400" />,
    dashed: true,
    steps: [],
  },
]

// ── Action sidebar config ─────────────────────────────────────────

const ACTIONS = [
  { type: 'email' as StepType, label: 'Email', icon: <Mail className="w-4 h-4" />, color: 'text-blue-500' },
  { type: 'linkedin_connect' as StepType, label: 'LinkedIn · connect', icon: <Linkedin className="w-4 h-4" />, color: 'text-sky-600' },
  { type: 'linkedin_message' as StepType, label: 'LinkedIn · message', icon: <Linkedin className="w-4 h-4" />, color: 'text-sky-600' },
  { type: 'linkedin_like' as StepType, label: 'LinkedIn · like', icon: <Linkedin className="w-4 h-4" />, color: 'text-sky-600' },
  { type: 'linkedin_view' as StepType, label: 'LinkedIn · view', icon: <Linkedin className="w-4 h-4" />, color: 'text-sky-600' },
  { type: 'linkedin_voice' as StepType, label: 'LinkedIn · voice', icon: <Linkedin className="w-4 h-4" />, color: 'text-sky-600' },
  { type: 'call' as StepType, label: 'Call', icon: <Phone className="w-4 h-4" />, color: 'text-green-600' },
  { type: 'sms' as StepType, label: 'SMS', icon: <MessageSquare className="w-4 h-4" />, color: 'text-emerald-500', badge: 'Beta' },
  { type: 'whatsapp' as StepType, label: 'WhatsApp', icon: <MessageSquare className="w-4 h-4" />, color: 'text-green-500' },
  { type: 'manual_task' as StepType, label: 'Manual task', icon: <CheckSquare className="w-4 h-4" />, color: 'text-gray-500' },
  { type: 'api_connect' as StepType, label: 'API Connect', icon: <Webhook className="w-4 h-4" />, color: 'text-purple-500' },
]

const CONDITIONS = [
  { type: 'is_connected' as StepType, label: 'Is connected', icon: <Link2 className="w-4 h-4" />, color: 'text-teal-600' },
  { type: 'branch' as StepType, label: 'Branch / condition', icon: <GitBranch className="w-4 h-4" />, color: 'text-indigo-500' },
]

// ── Helpers ───────────────────────────────────────────────────────

function stepIcon(type: StepType) {
  switch (type) {
    case 'email': return <Mail className="w-4 h-4 text-blue-500" />
    case 'linkedin_connect':
    case 'linkedin_message':
    case 'linkedin_like':
    case 'linkedin_view':
    case 'linkedin_voice': return <Linkedin className="w-4 h-4 text-sky-600" />
    case 'call': return <Phone className="w-4 h-4 text-green-600" />
    case 'sms': return <MessageSquare className="w-4 h-4 text-emerald-500" />
    case 'whatsapp': return <MessageSquare className="w-4 h-4 text-green-500" />
    case 'manual_task': return <CheckSquare className="w-4 h-4 text-gray-500" />
    case 'api_connect': return <Webhook className="w-4 h-4 text-purple-500" />
    default: return <ChevronRight className="w-4 h-4 text-gray-400" />
  }
}

// ── Sub-components ────────────────────────────────────────────────

function WaitLabel({ days }: { days: number }) {
  return (
    <div className="flex items-center justify-center gap-1.5 py-1.5 text-xs text-[#7B6FA0]">
      <Clock className="w-3.5 h-3.5 text-[#A78BFA]" />
      <span>wait {days} {days === 1 ? 'day' : 'days'}</span>
      <span className="text-[#C4B5FD]">↓</span>
    </div>
  )
}

function StepCard({ step }: { step: SequenceStep }) {
  return (
    <div className="w-full bg-white border border-[#EDE9FE] rounded-xl px-4 py-3 flex items-center gap-3 shadow-sm hover:border-[#C4B5FD] hover:shadow-md transition-all cursor-pointer group">
      <div className="w-8 h-8 rounded-lg bg-[#F5F0FF] border border-[#EDE9FE] flex items-center justify-center shrink-0 group-hover:bg-purple-50 group-hover:border-purple-100 transition-colors">
        {stepIcon(step.type)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[#1E1152] truncate">{step.label}</p>
        {step.sublabel && <p className="text-xs text-[#9B8EC4] truncate mt-0.5">{step.sublabel}</p>}
      </div>
      <ChevronRight className="w-4 h-4 text-[#C4B5FD] group-hover:text-purple-400 transition-colors shrink-0" />
    </div>
  )
}

function BranchNode({ step }: { step: SequenceStep }) {
  if (!step.branches) return null
  const { left, right } = step.branches
  return (
    <div className="w-full">
      {/* Branch header card */}
      <StepCard step={step} />

      {/* Branch arms */}
      <div className="mt-3 grid grid-cols-2 gap-3 relative">
        {/* vertical connector line */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-full pointer-events-none" />

        {/* Left branch */}
        <div className="flex flex-col items-center gap-2">
          <span
            className="px-3 py-1 rounded-full text-[11px] font-bold border"
            style={{ color: left.color, borderColor: left.color + '55', background: left.color + '11' }}
          >
            ✓ {left.label}
          </span>
          <div className="w-full flex flex-col gap-2">
            {left.steps.map(s => (
              <StepCard key={s.id} step={s} />
            ))}
          </div>
        </div>

        {/* Right branch */}
        <div className="flex flex-col items-center gap-2">
          <span
            className="px-3 py-1 rounded-full text-[11px] font-bold border"
            style={{ color: right.color, borderColor: right.color + '55', background: right.color + '11' }}
          >
            ✗ {right.label}
          </span>
          <div className="w-full flex flex-col gap-2">
            {right.steps.map(s => (
              <StepCard key={s.id} step={s} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function SequenceTree({
  steps,
  onAddStep,
}: {
  steps: SequenceStep[]
  onAddStep: () => void
}) {
  if (steps.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-12">
        <div className="w-16 h-16 rounded-2xl border-2 border-dashed border-[#E4DCFB] flex items-center justify-center">
          <Plus className="w-7 h-7 text-[#C4B5FD]" />
        </div>
        <p className="text-sm text-[#9B8EC4]">No steps yet — click an action in the sidebar to add one</p>
        <button
          onClick={onAddStep}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-dashed border-purple-300 text-purple-600 text-sm font-medium hover:bg-purple-50 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add first step
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-0 w-full max-w-lg mx-auto">
      {steps.map((step, idx) => (
        <div key={step.id} className="w-full">
          {step.waitDays !== undefined && step.waitDays > 0 && (
            <WaitLabel days={step.waitDays} />
          )}
          {step.branches ? (
            <BranchNode step={step} />
          ) : (
            <StepCard step={step} />
          )}
          {idx < steps.length - 1 && !step.branches && (
            <div className="flex justify-center py-1">
              <div className="w-px h-5 bg-[#E4DCFB]" />
            </div>
          )}
        </div>
      ))}

      {/* Connector to Add button */}
      <div className="flex justify-center py-1">
        <div className="w-px h-5 bg-[#E4DCFB]" />
      </div>

      <button
        onClick={onAddStep}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-dashed border-purple-300 text-purple-600 text-sm font-semibold hover:bg-purple-50 hover:border-purple-400 transition-all"
      >
        <Plus className="w-4 h-4" />
        Add step / branch
      </button>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────

export default function SequenceBuilderPage() {
  const [selectedTemplate, setSelectedTemplate] = useState<string>('ai_magic')
  const [nodes, setNodes] = useState<SequenceStep[]>(AI_MAGIC_STEPS)

  function selectTemplate(t: Template) {
    setSelectedTemplate(t.id)
    // Deep-clone to avoid mutation of defaults
    setNodes(JSON.parse(JSON.stringify(t.steps)))
  }

  function addStep(type: StepType = 'email', label = 'New step') {
    const newStep: SequenceStep = {
      id: makeId(),
      type,
      label,
      sublabel: '',
      waitDays: 1,
    }
    setNodes(prev => [...prev, newStep])
  }

  return (
    <div className="min-h-screen bg-[#F5F3FF]">
      {/* ── Preview banner ───────────────────────────────────────── */}
      <div className="bg-[#F3E8FF] border-b border-[#E4DCFB] px-6 py-3 flex items-start gap-3">
        <AlertTriangle className="w-4 h-4 text-[#7C3AED] shrink-0 mt-0.5" />
        <p className="text-sm text-[#6D28D9]">
          <span className="font-semibold">Visual sequence builder</span> — coming live in{' '}
          <span className="font-mono text-xs bg-[#E9D5FF] px-1.5 py-0.5 rounded">#89</span>.
          {' '}Email is live; other channels light up as they ship.
        </p>
      </div>

      <div className="px-6 py-6 max-w-[1400px] mx-auto">
        {/* ── Page header ──────────────────────────────────────────── */}
        <div className="mb-6">
          <div className="flex items-center gap-2.5 mb-1">
            <GitBranch className="w-5 h-5 text-[#7C3AED]" />
            <h1 className="text-2xl font-bold text-[#1E1152]">Sequence Builder</h1>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">Preview</span>
          </div>
          <p className="text-sm text-[#7B6FA0]">
            Choose a template then customise your multi-channel outreach flow.
          </p>
        </div>

        {/* ── Step 1: Template grid ────────────────────────────────── */}
        <section className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#9B8EC4] mb-3">
            Step 1 — Choose a template
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 gap-3">
            {TEMPLATES.map(t => {
              const active = selectedTemplate === t.id
              return (
                <button
                  key={t.id}
                  onClick={() => selectTemplate(t)}
                  className={[
                    'relative flex flex-col items-center gap-2 p-4 rounded-2xl border text-center transition-all',
                    t.dashed ? 'border-dashed' : '',
                    active
                      ? 'border-[#7C3AED] bg-purple-50 shadow-md shadow-purple-100'
                      : t.outlined
                      ? 'border-[#7C3AED]/40 bg-white hover:border-[#7C3AED] hover:bg-purple-50/50'
                      : 'border-[#EDE9FE] bg-white hover:border-purple-300 hover:bg-purple-50/50',
                  ].join(' ')}
                >
                  {active && (
                    <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#7C3AED]" />
                  )}
                  <div className="w-10 h-10 rounded-xl bg-[#F5F0FF] border border-[#EDE9FE] flex items-center justify-center">
                    {t.icon}
                  </div>
                  <div>
                    <p className={`text-xs font-semibold leading-tight ${active ? 'text-[#7C3AED]' : 'text-[#1E1152]'}`}>
                      {t.name}
                    </p>
                    {t.description && (
                      <p className="text-[10px] text-gray-400 mt-0.5 leading-snug">{t.description}</p>
                    )}
                  </div>
                  {t.id === 'ai_magic' && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-600">
                      Beta
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </section>

        {/* ── Step 2: Visual tree + sidebar ────────────────────────── */}
        <section>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#9B8EC4] mb-3">
            Step 2 — Edit the visual tree
          </p>

          <div className="flex gap-5">
            {/* ── Tree canvas ──── tour anchor: step 8 "Review sequence" (#454). ── */}
            <div
              data-tour="sequence-preview"
              className="flex-1 bg-white rounded-2xl border border-[#E4DCFB] shadow-sm p-6 min-h-[500px] overflow-auto"
              style={{
                backgroundImage: 'radial-gradient(#EDE9FE 1px, transparent 1px)',
                backgroundSize: '22px 22px',
              }}
            >
              <SequenceTree
                steps={nodes}
                onAddStep={() => addStep('email', 'Send email')}
              />
            </div>

            {/* ── Sidebar panels ───────────────────────────────────── */}
            <div className="w-64 shrink-0 flex flex-col gap-4">
              {/* Actions panel */}
              <div className="bg-white rounded-2xl border border-[#EDE9FE] shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-[#F3EFFE]">
                  <p className="text-xs font-bold uppercase tracking-widest text-[#7B6FA0]">Actions</p>
                </div>
                <div className="p-2 space-y-0.5">
                  {ACTIONS.map(a => (
                    <button
                      key={a.type}
                      onClick={() => addStep(a.type, a.label)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700 transition-colors group text-left"
                    >
                      <span className={`${a.color} group-hover:scale-110 transition-transform`}>{a.icon}</span>
                      <span className="flex-1 text-[13px]">{a.label}</span>
                      {a.badge && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-600">
                          {a.badge}
                        </span>
                      )}
                      <Plus className="w-3.5 h-3.5 text-gray-300 group-hover:text-purple-400 shrink-0" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Conditions panel */}
              <div className="bg-white rounded-2xl border border-[#EDE9FE] shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-[#F3EFFE]">
                  <p className="text-xs font-bold uppercase tracking-widest text-[#7B6FA0]">Conditions</p>
                </div>
                <div className="p-2 space-y-0.5">
                  {CONDITIONS.map(c => (
                    <button
                      key={c.type}
                      onClick={() => addStep(c.type, c.label)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700 transition-colors group text-left"
                    >
                      <span className={`${c.color} group-hover:scale-110 transition-transform`}>{c.icon}</span>
                      <span className="flex-1 text-[13px]">{c.label}</span>
                      <Plus className="w-3.5 h-3.5 text-gray-300 group-hover:text-purple-400 shrink-0" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Info blurb */}
              <div className="bg-purple-50 rounded-2xl border border-purple-100 px-4 py-4">
                <p className="text-xs font-semibold text-purple-700 mb-1">How branching works</p>
                <p className="text-[11px] text-purple-500 leading-relaxed">
                  Add a condition step to split your sequence. Each branch runs independently — contacts follow the path that matches.
                </p>
                <p className="text-[11px] text-purple-400 mt-2">
                  Full branching execution ships with{' '}
                  <span className="font-mono bg-purple-100 px-1 py-0.5 rounded">#89</span>.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
