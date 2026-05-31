export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Users, TrendingUp, MessageSquare, Zap } from 'lucide-react'

export default async function TeamPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Get client
  const { data: clientRow } = await supabase
    .from('clients')
    .select('id, credit_balance')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!clientRow) redirect('/dashboard')

  // Get team members
  const { data: members } = await supabase
    .from('client_members')
    .select('id, email, role, accepted_at, invited_at')
    .eq('client_id', clientRow.id)
    .order('invited_at', { ascending: true })

  // Get lead count
  const { count: leadCount } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .eq('client_id', clientRow.id)

  // Get active campaigns
  const { count: activeCampaigns } = await supabase
    .from('figsy_campaigns')
    .select('*', { count: 'exact', head: true })
    .eq('client_id', clientRow.id)
    .eq('status', 'active')

  // Get unread replies
  const { count: hotReplies } = await supabase
    .from('figsy_replies')
    .select('*', { count: 'exact', head: true })
    .eq('client_id', clientRow.id)
    .in('classification', ['interested', 'hot'])

  const activeMembers = members?.filter(m => m.accepted_at) ?? []
  const pendingMembers = members?.filter(m => !m.accepted_at) ?? []

  const stats = [
    { label: 'Team members', value: activeMembers.length, sub: pendingMembers.length > 0 ? `${pendingMembers.length} pending` : 'All active', icon: Users, color: 'purple' },
    { label: 'Total leads', value: leadCount ?? 0, sub: 'Scored & ready', icon: TrendingUp, color: 'blue' },
    { label: 'Hot replies', value: hotReplies ?? 0, sub: 'Need response', icon: MessageSquare, color: 'green' },
    { label: 'Active campaigns', value: activeCampaigns ?? 0, sub: `${clientRow.credit_balance} credits left`, icon: Zap, color: 'amber' },
  ]

  const colorMap: Record<string, string> = {
    purple: 'bg-purple-50 text-purple-600 border-purple-100',
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    green: 'bg-green-50 text-green-600 border-green-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Team Overview</h1>
        <p className="text-gray-500 text-sm mt-0.5">High-level view of your workspace activity</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(s => (
          <div key={s.label} className={`bg-white rounded-2xl border ${colorMap[s.color].split(' ')[2]} shadow-sm p-5`}>
            <div className={`inline-flex items-center justify-center w-9 h-9 rounded-xl border mb-3 ${colorMap[s.color]}`}>
              <s.icon className="w-4 h-4" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
            <p className="text-sm font-medium text-gray-700 mt-0.5">{s.label}</p>
            <p className="text-xs text-gray-400 mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Team members */}
      <div className="bg-white rounded-2xl border border-purple-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900">Team Members</h2>
          <a href="/dashboard/settings#team" className="text-sm text-[#7C3AED] hover:underline">Manage →</a>
        </div>
        <div className="space-y-2">
          {members?.map(m => (
            <div key={m.id} className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-gray-50 border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-[#7C3AED] font-semibold text-sm">
                  {m.email[0].toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800">{m.email}</p>
                  <p className="text-xs text-gray-400">{m.accepted_at ? 'Active' : 'Invitation pending'}</p>
                </div>
              </div>
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                m.role === 'owner' ? 'bg-purple-100 text-purple-700' :
                m.role === 'admin' ? 'bg-blue-100 text-blue-700' :
                m.role === 'viewer' ? 'bg-gray-100 text-gray-600' :
                'bg-green-100 text-green-700'
              }`}>{m.role}</span>
            </div>
          ))}
          {(!members || members.length === 0) && (
            <p className="text-sm text-gray-400 italic py-2">No team members yet. Invite from Settings → Team.</p>
          )}
        </div>
      </div>
    </div>
  )
}
