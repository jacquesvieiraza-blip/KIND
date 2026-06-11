'use client'

// R11 (Lemlist/Alta) — Sequence-template library by ICP/use-case. A curated
// gallery of proven 3-step cold-email sequences clients can browse, filter by
// category, and copy into a campaign. Static, self-contained (no backend) — the
// templates are reusable patterns, not invented metrics.

import { useState } from 'react'
import { LayoutTemplate, Copy, CheckCircle, Filter } from 'lucide-react'

type Step = { day: number; subject: string; body: string }
type Template = { id: string; name: string; category: string; bestFor: string; steps: Step[] }

const CATEGORIES = ['All', 'SaaS / Tech', 'Professional Services', 'Agencies', 'Fintech', 'Logistics', 'General'] as const

const TEMPLATES: Template[] = [
  {
    id: 'saas-pain',
    name: 'The specific-pain opener',
    category: 'SaaS / Tech',
    bestFor: 'Reaching technical buyers who hate fluffy outreach',
    steps: [
      { day: 0, subject: 'noticed something about {{company}}', body: `Hi {{first_name}},\n\nSaw {{company}} is scaling the team fast — usually that's when {{pain}} starts eating into everyone's week.\n\nWe help teams like yours fix exactly that without adding headcount. Worth a quick 15 minutes to see if it fits?\n\nReply STOP to opt out.` },
      { day: 4, subject: 'quick follow up', body: `Hi {{first_name}},\n\nKnow inboxes are brutal — one stat that might land: most teams your size lose ~6 hours a week to {{pain}}.\n\nHappy to show how we claw that back. Open to a short call?\n\nReply STOP to opt out.` },
      { day: 9, subject: 'last one from me', body: `Hi {{first_name}},\n\nI'll leave it here so I'm not cluttering your inbox. If {{pain}} ever moves up the priority list, I'm one reply away.\n\nAll the best either way.\n\nReply STOP to opt out.` },
    ],
  },
  {
    id: 'services-referral',
    name: 'The peer-proof intro',
    category: 'Professional Services',
    bestFor: 'Consultants & advisors where trust is everything',
    steps: [
      { day: 0, subject: 'helping firms like {{company}}', body: `Hi {{first_name}},\n\nWe've been working with a few {{industry}} firms on {{outcome}} and your name kept coming up as someone who'd care about this.\n\nCould I share what's been working in a quick call?\n\nReply STOP to opt out.` },
      { day: 4, subject: 're: helping firms like {{company}}', body: `Hi {{first_name}},\n\nNo pressure at all — just thought the approach we're using might save {{company}} some time on {{outcome}}.\n\nWould a 15-minute chat this week work?\n\nReply STOP to opt out.` },
      { day: 9, subject: 'closing the loop', body: `Hi {{first_name}},\n\nLast note from me. If the timing's off, totally understand — feel free to reach back whenever {{outcome}} is on your radar.\n\nWishing you a strong quarter.\n\nReply STOP to opt out.` },
    ],
  },
  {
    id: 'agency-results',
    name: 'The show-don\'t-tell',
    category: 'Agencies',
    bestFor: 'Agencies selling on outcomes, not promises',
    steps: [
      { day: 0, subject: 'idea for {{company}}', body: `Hi {{first_name}},\n\nI had a specific idea for how {{company}} could lift {{outcome}} — took us about a week to pull off for a similar team.\n\nWant me to walk you through it? 15 minutes, no pitch deck.\n\nReply STOP to opt out.` },
      { day: 4, subject: 're: idea for {{company}}', body: `Hi {{first_name}},\n\nStill happy to share that idea — it's pretty specific to where {{company}} is right now.\n\nGrab a slot whenever suits?\n\nReply STOP to opt out.` },
      { day: 9, subject: 'final note', body: `Hi {{first_name}},\n\nI'll stop here. The idea's not going anywhere — reply any time and I'll send it over.\n\nCheers.\n\nReply STOP to opt out.` },
    ],
  },
  {
    id: 'fintech-trust',
    name: 'The compliance-aware approach',
    category: 'Fintech',
    bestFor: 'Regulated buyers who need to trust you fast',
    steps: [
      { day: 0, subject: 'quick question on {{company}}', body: `Hi {{first_name}},\n\nWorking with a few {{industry}} teams on {{outcome}} while staying fully compliant — a balance I know matters a lot in your world.\n\nOpen to comparing notes for 15 minutes?\n\nReply STOP to opt out.` },
      { day: 4, subject: 're: quick question on {{company}}', body: `Hi {{first_name}},\n\nKeeping this short. The approach is built compliance-first, so there's no trade-off on {{outcome}}.\n\nWorth a short call?\n\nReply STOP to opt out.` },
      { day: 9, subject: 'wrapping up', body: `Hi {{first_name}},\n\nLast one. If {{outcome}} becomes a focus, I'd love to help — just reply.\n\nAll the best.\n\nReply STOP to opt out.` },
    ],
  },
  {
    id: 'logistics-efficiency',
    name: 'The time-and-cost angle',
    category: 'Logistics',
    bestFor: 'Ops leaders who live and die by efficiency',
    steps: [
      { day: 0, subject: 'cutting {{pain}} at {{company}}', body: `Hi {{first_name}},\n\nMost ops teams I speak to are quietly losing margin to {{pain}}. We help fix that without ripping out what already works.\n\nWorth 15 minutes to see the numbers?\n\nReply STOP to opt out.` },
      { day: 4, subject: 're: cutting {{pain}} at {{company}}', body: `Hi {{first_name}},\n\nQuick nudge — even a small dent in {{pain}} compounds fast at your volume.\n\nHappy to show how. Free this week?\n\nReply STOP to opt out.` },
      { day: 9, subject: 'last check-in', body: `Hi {{first_name}},\n\nI'll leave it here. When {{pain}} starts costing too much, reply and we'll take a look together.\n\nSafe travels out there.\n\nReply STOP to opt out.` },
    ],
  },
  {
    id: 'general-curiosity',
    name: 'The honest curiosity opener',
    category: 'General',
    bestFor: 'Any industry — leads with a genuine question',
    steps: [
      { day: 0, subject: 'are you the right person', body: `Hi {{first_name}},\n\nQuick one — are you the right person at {{company}} to talk to about {{outcome}}? If not, no worries, a nudge in the right direction helps.\n\nReply STOP to opt out.` },
      { day: 4, subject: 're: are you the right person', body: `Hi {{first_name}},\n\nJust floating this back up. We've been helping teams with {{outcome}} and thought {{company}} might benefit.\n\nWorth a quick chat?\n\nReply STOP to opt out.` },
      { day: 9, subject: 'last try', body: `Hi {{first_name}},\n\nPromise this is the last one. If {{outcome}} matters down the line, my inbox is open.\n\nTake care.\n\nReply STOP to opt out.` },
    ],
  },
]

function templateToText(t: Template): string {
  return t.steps.map(s => `--- Day ${s.day} ---\nSubject: ${s.subject}\n\n${s.body}`).join('\n\n')
}

export default function TemplatesPage() {
  const [category, setCategory] = useState<string>('All')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const filtered = category === 'All' ? TEMPLATES : TEMPLATES.filter(t => t.category === category)

  async function copy(t: Template) {
    try {
      await navigator.clipboard.writeText(templateToText(t))
      setCopiedId(t.id)
      setTimeout(() => setCopiedId(null), 2500)
    } catch { /* ignore */ }
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-[#7C3AED]/10 flex items-center justify-center">
          <LayoutTemplate className="w-5 h-5 text-[#7C3AED]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sequence Templates</h1>
          <p className="text-[#7B6FA0] text-sm">Proven 3-step cold sequences. Copy one, paste it into a campaign, and let FIGSY personalize the <code className="text-xs">{'{{tokens}}'}</code>.</p>
        </div>
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap items-center gap-2">
        <Filter className="w-4 h-4 text-[#9B8EC4]" />
        {CATEGORIES.map(c => (
          <button key={c} onClick={() => setCategory(c)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              category === c ? 'bg-[#7C3AED] text-white' : 'bg-purple-50 text-[#7C3AED] hover:bg-purple-100'
            }`}>
            {c}
          </button>
        ))}
      </div>

      {/* Template cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {filtered.map(t => (
          <div key={t.id} className="rounded-2xl border border-purple-100 bg-white shadow-sm overflow-hidden flex flex-col">
            <div className="p-5 border-b border-purple-50">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[#7C3AED]/60">{t.category}</p>
                  <h2 className="text-base font-bold text-gray-900">{t.name}</h2>
                </div>
                <button onClick={() => copy(t)}
                  className="shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold rounded-lg px-3 py-1.5 bg-[#7C3AED] text-white hover:bg-[#6D28D9] transition-colors">
                  {copiedId === t.id ? <><CheckCircle className="w-3.5 h-3.5" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1.5">{t.bestFor}</p>
            </div>
            <div className="p-5 space-y-3 flex-1">
              {t.steps.map(s => (
                <div key={s.day} className="text-xs">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 rounded-full bg-purple-50 text-[#7C3AED] font-semibold">Day {s.day}</span>
                    <span className="font-semibold text-gray-700">{s.subject}</span>
                  </div>
                  <p className="text-gray-500 whitespace-pre-wrap leading-relaxed line-clamp-4">{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
