'use client'

// R19 (Glean) — In-product "What's New" feed. Keeps clients aware the product
// is constantly improving (anti-churn). Curated, honest highlights — capability
// descriptions only, no invented metrics. The founder adds an entry here each
// time a release is merged (mirrors "The Drop", inside the app).

import { useState, useEffect } from 'react'
import { Sparkles, Mail, Users, Zap, BarChart, Shield, MessageSquare, LayoutTemplate } from 'lucide-react'

type Entry = {
  id: string
  title: string
  body: string
  tag: string
  icon: React.ElementType
}

// Newest first. Keep descriptions factual — what it does, not how well it does it.
const ENTRIES: Entry[] = [
  { id: 'templates', tag: 'FIGSY', icon: LayoutTemplate, title: 'Sequence template library',
    body: "Browse proven 3-step cold sequences by industry and copy one straight into a campaign — FIGSY personalizes the rest." },
  { id: 'help-reply', tag: 'Inbox', icon: MessageSquare, title: '"Help me reply" in the unibox',
    body: 'Open any reply and get a context-aware draft that reads the prospect\'s actual message — then edit and send.' },
  { id: 'goals', tag: 'Performance', icon: BarChart, title: 'Set goals on your dashboard',
    body: 'Set targets for meetings, reply rate and leads contacted, and watch live progress bars fill toward them.' },
  { id: 'why-figsy', tag: 'FIGSY', icon: Sparkles, title: '"Why FIGSY wrote this"',
    body: 'Every generated email now shows the exact personalization signals FIGSY used — full transparency on your outreach.' },
  { id: 'speed-to-lead', tag: 'Vida', icon: Zap, title: 'Speed-to-lead from website chat',
    body: 'When Vida flags a hot website visitor, they become a scored pipeline lead instantly — with a ready-to-send draft.' },
  { id: 'forms', tag: 'Leads', icon: Users, title: 'Embeddable lead-capture forms',
    body: 'Drop a form on your site from Settings → Integrations. Every submission becomes a scored lead in your pipeline.' },
  { id: 'deliverability', tag: 'Deliverability', icon: Shield, title: 'Pre-send deliverability check',
    body: 'A spam-score check flags anything that could hurt inbox placement before an email goes out.' },
  { id: 'briefs', tag: 'Milla', icon: Mail, title: 'Daily briefings you control',
    body: 'Turn Milla\'s morning brief on or off from Settings → Notifications. Your inbox, your rules.' },
]

const SEEN_KEY = 'kind_whatsnew_seen_v1'

export default function WhatsNewPage() {
  // Mark as seen on view (clears the sidebar dot for the user).
  useEffect(() => {
    try { localStorage.setItem(SEEN_KEY, String(ENTRIES.length)) } catch { /* ignore */ }
  }, [])

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-[#7C3AED]/10 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-[#7C3AED]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">What&apos;s New</h1>
          <p className="text-[#7B6FA0] text-sm">The latest improvements to your K.I.N.D workspace.</p>
        </div>
      </div>

      <div className="relative pl-6">
        {/* Timeline line */}
        <div className="absolute left-[7px] top-2 bottom-2 w-px bg-purple-100" />
        <div className="space-y-5">
          {ENTRIES.map(e => {
            const Icon = e.icon
            return (
              <div key={e.id} className="relative">
                <div className="absolute -left-6 top-1.5 w-3.5 h-3.5 rounded-full bg-[#7C3AED] border-2 border-white shadow" />
                <div className="rounded-2xl border border-purple-100 bg-white shadow-sm p-5">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-[#7C3AED]/70 bg-purple-50 rounded-full px-2 py-0.5">
                      <Icon className="w-3 h-3" /> {e.tag}
                    </span>
                  </div>
                  <h2 className="text-base font-bold text-gray-900">{e.title}</h2>
                  <p className="text-sm text-gray-500 mt-1 leading-relaxed">{e.body}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <p className="text-xs text-center text-[#9B8EC4] pt-2">
        More shipping every week. Spot something you&apos;d love? Tell us at hello@get-kind.com.
      </p>
    </div>
  )
}
