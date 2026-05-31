import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

const AGENTS = [
  {
    id: 'figsy',
    name: 'FIGSY',
    subtitle: 'The Closer',
    role: 'AI SDR',
    category: 'Outbound Sales Specialist',
    description: 'Reaches out to your leads, writes personalised emails, handles replies, and books meetings. I reach out. You close.',
    href: '/dashboard/figsy-chat',
    accent: '#7C3AED',
    accentLight: '#F5F3FF',
    features: [
      { label: 'Outbound Expert', desc: 'I reach out. You close.' },
      { label: 'Personalised Sequences', desc: 'Tailored outreach that gets replies.' },
      { label: 'Meetings Booked', desc: 'More meetings. More pipeline.' },
      { label: 'Results Driven', desc: "I don't send. I get results." },
    ],
    cta: 'Chat with FIGSY',
    productKey: 'hasFigsy' as const,
  },
  {
    id: 'milla',
    name: 'Milla',
    subtitle: 'The Brain',
    role: 'Virtual Assistant',
    category: 'Business Operations',
    description: 'Knows your business inside and out. Drafts documents, answers questions instantly, and keeps everything organised.',
    href: '/dashboard/assistant',
    accent: '#F472B6',
    accentLight: '#FDF2F8',
    features: [
      { label: 'Business Intelligence', desc: 'I know your business inside and out.' },
      { label: 'Drafts That Move Work Forward', desc: 'Documents, reports, and more — done.' },
      { label: 'Answers That Save Time', desc: 'Instant answers from your knowledge base.' },
      { label: 'Organised Everything', desc: 'Your day, your docs, your priorities.' },
    ],
    cta: 'Chat with Milla',
    productKey: 'hasMilla' as const,
  },
  {
    id: 'vida',
    name: 'Vida',
    subtitle: 'The Connector',
    role: 'Chatbot Agent',
    category: 'Inbound Specialist',
    description: 'Always on — 24/7 conversations trained on your business. Spots good leads and routes them straight to your team.',
    href: '/dashboard/chatbot',
    accent: '#14B8A6',
    accentLight: '#F0FDFA',
    features: [
      { label: '24/7 Conversations', desc: "I'm always here when your visitors need me." },
      { label: 'Smart Answers', desc: 'Trained on your business. Real answers, not scripts.' },
      { label: 'Qualifies Visitors', desc: 'I spot good leads and route them to your team.' },
      { label: 'Fast & Friendly', desc: 'Quick, helpful, and human.' },
    ],
    cta: 'Chat with Vida',
    productKey: 'hasVida' as const,
  },
]

export default async function AgentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: clientRow } = await supabase
    .from('clients')
    .select('id, subscriptions(*)')
    .eq('user_id', user.id)
    .maybeSingle()

  const subs = (clientRow?.subscriptions as { status: string; product?: string }[]) ?? []
  const isLive = (p: string) => subs.some(s => (s.product === p) && (s.status === 'active' || s.status === 'trialing'))

  const access = {
    hasFigsy: isLive('lead_gen_figsy') || isLive('figsy_addon'),
    hasMilla: isLive('virtual_assistant'),
    hasVida:  isLive('chatbot'),
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Your AI Team</h1>
        <p className="text-gray-500 text-sm mt-0.5">Three agents. One revenue machine. Click any agent to open their workspace.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {AGENTS.map(agent => {
          const unlocked = access[agent.productKey]
          return (
            <Link
              key={agent.id}
              href={agent.href}
              className="group block rounded-2xl overflow-hidden border border-purple-100 shadow-sm bg-white hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
            >
              {/* Photo */}
              <div className="relative h-64 overflow-hidden">
                <img
                  src={`/agents/${agent.id}.png`}
                  alt={agent.name}
                  className="w-full h-full object-cover object-top group-hover:scale-[1.02] transition-transform duration-300"
                />
                {/* Feature list overlay */}
                <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-transparent p-4 flex flex-col justify-start gap-2.5">
                  {agent.features.map(f => (
                    <div key={f.label}>
                      <p className="text-white text-[10px] font-bold tracking-wider uppercase">{f.label}</p>
                      <p className="text-white/70 text-[10px] leading-tight">{f.desc}</p>
                    </div>
                  ))}
                </div>
                {/* Online badge */}
                <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-black/40 backdrop-blur-sm rounded-full px-2.5 py-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${unlocked ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'}`} />
                  <span className={`text-[10px] font-medium ${unlocked ? 'text-emerald-400' : 'text-slate-300'}`}>
                    {unlocked ? 'Online' : 'Locked'}
                  </span>
                </div>
              </div>

              {/* Identity bar */}
              <div className="bg-[#0F0929] px-4 py-3">
                <div className="flex items-baseline gap-2">
                  <p className="text-white font-bold text-lg leading-tight">{agent.name}</p>
                  <span className="font-semibold text-sm" style={{ color: agent.accent }}>{agent.subtitle}</span>
                </div>
                <p className="text-[#9B8EC4] text-xs mt-0.5">{agent.role} · {agent.category}</p>
              </div>

              {/* Description + CTA */}
              <div className="px-4 py-3 border-t border-purple-50" style={{ background: agent.accentLight }}>
                <p className="text-xs text-gray-600 leading-relaxed mb-3">{agent.description}</p>
                <div
                  className="w-full text-center text-xs font-semibold py-2 rounded-xl text-white transition-opacity"
                  style={{ background: agent.accent }}
                >
                  {agent.cta} →
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
