'use client'

/** Agent Config Panel. The ICP tab shows the client's LIVE ICP (fetched from
 *  /icps); the Role/Tone/Schedule/Knowledge tabs explain how FIGSY operates and
 *  link to where the editable pieces live — they are descriptions of FIGSY's
 *  behaviour, not stored per-account values. Gated by FEATURE_V2_SCREENS=config. */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { api } from '@/lib/api'
import { v2Enabled } from '@/lib/flags'
import type { ICP } from '@kind/shared'
import { Target, Users, Palette, Clock, BookOpen, Loader2, ArrowRight } from 'lucide-react'

const BRAND = '#7C3AED'
const card = 'bg-white rounded-2xl border border-gray-200 shadow-sm'

const TABS = [
  { id: 'role', label: 'Role', icon: Target },
  { id: 'icp', label: 'ICP', icon: Users },
  { id: 'tone', label: 'Tone', icon: Palette },
  { id: 'schedule', label: 'Schedule', icon: Clock },
  { id: 'knowledge', label: 'Knowledge', icon: BookOpen },
]

export default function ConfigPage() {
  const router = useRouter()
  const supabase = createClient()
  const [tab, setTab] = useState('icp')
  const [icp, setIcp] = useState<ICP | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!v2Enabled('config')) { router.replace('/dashboard'); return }
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.replace('/login'); return }
      try {
        const res = await api.get<{ data: ICP[] }>('/icps', session.access_token)
        const list = res.data ?? []
        setIcp(list.find(i => i.is_active) ?? list[0] ?? null)
      } catch { /* leave empty */ }
      setLoading(false)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const join = (xs?: string[]) => (xs ?? []).join(' · ') || '—'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configure FIGSY</h1>
        <p className="text-sm text-gray-500 mt-0.5">Your live ICP is below. Role, Tone, Schedule &amp; Knowledge explain how FIGSY works — each links to where you change it.</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-[#7C3AED]" /></div>
      ) : (
        <div className={`${card} grid grid-cols-[180px_1fr] overflow-hidden`}>
          <div className="bg-[#faf9ff] border-r border-gray-100 py-3">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors ${tab === t.id ? 'font-bold text-[#7C3AED] bg-[#f3f0ff] border-r-2 border-[#7C3AED]' : 'text-gray-500 hover:text-gray-800'}`}>
                <t.icon className="w-4 h-4" />{t.label}
              </button>
            ))}
          </div>
          <div className="p-6">
            {tab === 'icp' && (
              <>
                <h2 className="font-bold text-gray-900 mb-4">Ideal Customer Profile {icp?.name ? <span className="text-gray-400 font-normal">· {icp.name}</span> : ''}</h2>
                <div className="grid grid-cols-2 gap-4">
                  <Card label="Industries" value={join(icp?.industries)} />
                  <Card label="Job titles" value={join(icp?.job_titles)} />
                  <Card label="Company size" value={join(icp?.company_sizes)} />
                  <Card label="Geographies" value={join(icp?.geographies)} />
                </div>
                <EditLink href="/dashboard/leads/icp" label="Edit ICP in ICP Builder" />
              </>
            )}
            {tab === 'role' && (
              <Single title="Role" value="The Opener — FIGSY finds, qualifies, and books meetings with net-new accounts via personalised cold outreach." href="/dashboard/figsy" hrefLabel="Manage campaigns" />
            )}
            {tab === 'tone' && (
              <Single title="Tone" value="Warm, specific, never pushy. Always references something real about the prospect — written to read like a human, not a template." href="/dashboard/knowledge" hrefLabel="Refine in Knowledge" />
            )}
            {tab === 'schedule' && (
              <Single title="Schedule" value="Mon–Fri, prospect-local business hours. Warmup ramp protects deliverability: starts low and climbs daily, fully automated — no manual sending." href="/dashboard/kpis" hrefLabel="View send performance" />
            )}
            {tab === 'knowledge' && (
              <Single title="Knowledge" value="FIGSY answers and writes using only the documents you attach — it never invents facts about your business." href="/dashboard/knowledge" hrefLabel="Manage documents" />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#faf9ff] border border-gray-100 rounded-xl p-4">
      <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-1">{label}</p>
      <p className="text-sm font-medium text-gray-800">{value}</p>
    </div>
  )
}

function EditLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1.5 mt-5 text-sm font-bold" style={{ color: BRAND }}>
      {label} <ArrowRight className="w-4 h-4" />
    </Link>
  )
}

function Single({ title, value, href, hrefLabel }: { title: string; value: string; href: string; hrefLabel: string }) {
  return (
    <>
      <h2 className="font-bold text-gray-900 mb-3">{title}</h2>
      <div className="bg-[#faf9ff] border border-gray-100 rounded-xl p-4 text-sm text-gray-700">{value}</div>
      <EditLink href={href} label={hrefLabel} />
    </>
  )
}
