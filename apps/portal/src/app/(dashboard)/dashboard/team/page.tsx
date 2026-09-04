'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { api } from '@/lib/api'
import {
  Users,
  UserPlus,
  UserCheck,
  BarChart3,
  Activity,
  Shield,
  Zap,
  Loader2,
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface TeamMember {
  id: string
  email: string
  role: string
  invited_at: string
  accepted_at: string | null
}

interface Subscription {
  status: string
  product?: string
}

interface ClientRow {
  id: string
  subscriptions: Subscription[]
}

interface AgentDef {
  name: string
  color: string
  productKey: string
}

// ── Constants ──────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  'bg-purple-500',
  'bg-pink-500',
  'bg-blue-500',
  'bg-teal-500',
  'bg-amber-500',
  'bg-green-500',
  'bg-indigo-500',
  'bg-rose-500',
]

// FIGSY-only cut 10 Jul — Milla/Vida/Denise seat rows removed until the agents return.
const AGENTS: AgentDef[] = [
  { name: 'FIGSY',  color: '#7C3AED', productKey: 'lead_gen_figsy' },
]

const TABS = [
  { id: 'overview',     label: 'Overview',     Icon: Users },
  { id: 'analytics',   label: 'Analytics',    Icon: BarChart3 },
  { id: 'activity',    label: 'Activity',     Icon: Activity },
  { id: 'permissions', label: 'Permissions',  Icon: Shield },
] as const

type TabId = typeof TABS[number]['id']

// ── Helpers ────────────────────────────────────────────────────────────────────

function avatarColor(email: string): string {
  let hash = 0
  for (let i = 0; i < email.length; i++) hash = email.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function initials(email: string): string {
  const parts = email.split('@')[0].split(/[._-]/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return email[0].toUpperCase()
}

function displayName(email: string): string {
  return email
    .split('@')[0]
    .split(/[._-]/)
    .map(p => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ')
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function StatBox({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="bg-purple-50 border border-purple-100 rounded-xl p-4 flex flex-col gap-1">
      <p className="text-2xl font-bold text-[#7C3AED]">{value}</p>
      <p className="text-xs font-medium text-gray-500">{label}</p>
    </div>
  )
}

function ComingSoon({ tab }: { tab: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-3">
      <div className="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center">
        <Zap className="w-6 h-6 text-[#7C3AED]" />
      </div>
      <p className="text-base font-semibold text-gray-700">{tab} — Coming soon</p>
      <p className="text-sm text-gray-400 max-w-xs text-center">
        This section is part of Month 2 development. Check back soon.
      </p>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function TeamsHubPage() {
  const supabase = createClient()

  const [loading, setLoading]             = useState(true)
  const [error, setError]                 = useState<string | null>(null)
  const [tab, setTab]                     = useState<TabId>('overview')
  const [members, setMembers]             = useState<TeamMember[]>([])
  const [clientRow, setClientRow]         = useState<ClientRow | null>(null)
  const [leadsToday, setLeadsToday]       = useState(0)
  const [emailsSent, setEmailsSent]       = useState(0)
  const [campaignsLive, setCampaignsLive] = useState(0)

  useEffect(() => {
    async function load() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) { setLoading(false); return }
        const token = session.access_token

        // 1. Client row + subscriptions
        const { data: cr } = await supabase
          .from('clients')
          .select('id, subscriptions(*)')
          .eq('user_id', session.user.id)
          .maybeSingle()

        if (!cr) { setLoading(false); return }
        setClientRow(cr as ClientRow)

        // 2. Team members via existing /team/members endpoint
        const membersRes = await api
          .get<TeamMember[]>(`/team/members?client_id=${cr.id}`, token)
          .catch(() => [] as TeamMember[])
        setMembers(membersRes ?? [])

        // 3. Aggregate stats — graceful fallback to 0
        const [leadsRes, emailsRes, campaignsRes] = await Promise.allSettled([
          api.get<{ data: { total?: number } }>('/leads/stats', token),
          // #384 — the real endpoint is /figsy/kpis (figsy.ts:709); /figsy/stats 404'd, so
          // "Emails sent" was always 0.
          // ⛓️ 4 Sep — ~~`{ data: { emails_sent?: number } }`~~. THE KEY DOES NOT EXIST.
          // `/figsy/kpis` returns `totalSent`; nothing has ever returned `emails_sent`, so
          // this box has rendered 0 on every account since #384 fixed the ENDPOINT and left
          // the field name wrong. A typed shape that names a field the API never sends is
          // invisible to the compiler — `emails_sent?: number` is satisfied by `undefined`.
          // ⚠️ NO METRIC IS FABRICATED HERE: `totalSent` is the value the endpoint already
          // computes, and it is now current-work bounded on the server.
          api.get<{ data: { totalSent?: number } }>('/figsy/kpis', token),
          api.get<{ data: Array<{ status: string }> }>('/figsy/campaigns', token),
        ])

        if (leadsRes.status === 'fulfilled') {
          setLeadsToday(leadsRes.value?.data?.total ?? 0)
        }
        if (emailsRes.status === 'fulfilled') {
          setEmailsSent(emailsRes.value?.data?.totalSent ?? 0)
        }
        if (campaignsRes.status === 'fulfilled') {
          const camps = campaignsRes.value?.data ?? []
          setCampaignsLive(
            Array.isArray(camps) ? camps.filter(c => c.status === 'active').length : 0
          )
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load team data.')
      }
      setLoading(false)
    }
    load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Derived values ──────────────────────────────────────────────────────────

  const activeMembers  = members.filter(m => m.accepted_at)
  const pendingMembers = members.filter(m => !m.accepted_at)
  const activeNow      = activeMembers.length

  const subs   = (clientRow?.subscriptions ?? []) as Subscription[]
  const isLive = (key: string) =>
    subs.some(s => s.product === key && (s.status === 'active' || s.status === 'trialing'))

  const agentRows = AGENTS.map(a => {
    const active = isLive(a.productKey) || (a.productKey === 'lead_gen_figsy' && isLive('figsy_addon'))
    return { ...a, active, memberCount: active ? activeMembers.length : 0 }
  })

  const maxAgentMembers = Math.max(...agentRows.map(a => a.memberCount), 1)

  // ── Loading / error ─────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-[#7C3AED]" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-600 font-medium mb-2">Could not load team data</p>
          <p className="text-sm text-gray-500">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-[#7C3AED] text-white rounded-lg text-sm hover:bg-[#6D28D9] transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  // ── Overview Tab ────────────────────────────────────────────────────────────

  function OverviewTab() {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* Left panel — Members */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-purple-100 shadow-sm p-6">
          <p className="text-[11px] font-bold tracking-widest text-gray-400 uppercase mb-4">
            Members
          </p>

          {members.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
              <Users className="w-8 h-8 text-purple-200" />
              <p className="text-sm text-gray-400">No team members yet.</p>
              <p className="text-xs text-gray-400">
                Use the Add member button to invite your first teammate.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {members.map(m => {
                const isActive  = Boolean(m.accepted_at)
                const isPending = !isActive
                const col       = avatarColor(m.email)
                const init      = initials(m.email)
                const name      = displayName(m.email)

                return (
                  <div
                    key={m.id}
                    className="flex items-center justify-between px-4 py-3 rounded-xl bg-gray-50 border border-gray-100 hover:border-purple-100 transition-colors"
                  >
                    {/* Avatar + identity */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative shrink-0">
                        <div
                          className={`w-9 h-9 rounded-full ${col} flex items-center justify-center text-white font-semibold text-sm select-none`}
                        >
                          {init}
                        </div>
                        {isActive && (
                          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-400 border-2 border-white" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{name}</p>
                        <p className="text-xs text-gray-400 truncate">
                          {m.email} · {m.role}
                        </p>
                      </div>
                    </div>

                    {/* Right side — agent badges + status */}
                    <div className="flex items-center gap-3 shrink-0 ml-3">
                      {isActive && (
                        <div className="hidden sm:flex items-center gap-1">
                          {agentRows.filter(a => a.active).map(a => (
                            <span
                              key={a.name}
                              className="text-[10px] font-bold px-1.5 py-0.5 rounded text-white leading-none"
                              style={{ backgroundColor: a.color }}
                            >
                              {a.name}
                            </span>
                          ))}
                        </div>
                      )}

                      {isPending ? (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-100 whitespace-nowrap">
                          Pending
                        </span>
                      ) : (
                        <p className="text-xs font-medium text-gray-400 whitespace-nowrap">
                          — not joined
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Right panel — Team Analytics */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-purple-100 shadow-sm p-6 space-y-6">
          <p className="text-[11px] font-bold tracking-widest text-gray-400 uppercase">
            Team Analytics
          </p>

          {/* 2x2 stat grid */}
          <div className="grid grid-cols-2 gap-3">
            {/* ── 🛑 4 Sep (D4) — "LEADS TODAY" WAS NEVER TODAY, AND IT IS NOT "ALL TIME" EITHER
                ⛓️ FIRST: ~~`label="Leads today"`~~. The value is `/leads/stats` → `data.total`,
                which was a LIFETIME delivered count printed under the word "today".

                ⛓️ THEN, SAME DAY: ~~`label="Leads delivered (all time)"`~~. That was true of
                the number BEFORE the server boundary landed and false immediately after it —
                for a programme customer the value is now their CURRENT PROGRAMME's delivered
                count, so "(all time)" re-introduced the same class of falsehood pointing the
                other way. Founder-corrected: **use the smallest truthful wording.**

                ⚠️ SO THE LABEL IS THE BARE NOUN, and it is truthful under BOTH models: legacy
                sees their whole book (which is their current work), a programme customer sees
                their programme. Neither is given a time claim the number cannot support.

                ⚠️ AND THE NUMBER IS NEVER CHANGED TO FIT A LABEL — the correction has always
                run the other way. */}
            <StatBox label="Leads delivered" value={leadsToday} />
            <StatBox label="Emails sent"     value={emailsSent} />
            <StatBox label="Campaigns live" value={campaignsLive} />
            <StatBox label="Active now"     value={activeNow} />
          </div>

          {/* Members per agent — the bars show how team members are distributed
              across agents (real member counts), NOT usage/activity this week. */}
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-3">Members per agent</p>
            <div className="space-y-3">
              {agentRows.map(agent => {
                const pct = agent.active
                  ? Math.round((agent.memberCount / maxAgentMembers) * 100)
                  : 0

                return (
                  <div key={agent.name}>
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded text-white leading-none"
                        style={{ backgroundColor: agent.color }}
                      >
                        {agent.name}
                      </span>
                      <span className="text-xs text-gray-400">
                        {agent.active
                          ? `${agent.memberCount} member${agent.memberCount !== 1 ? 's' : ''}`
                          : 'not active'}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.max(pct, agent.active ? 6 : 0)}%`,
                          backgroundColor: agent.color,
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

      </div>
    )
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 pb-12">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Teams Hub</h1>
        <p className="text-sm text-[#7B6FA0] mt-0.5">
          Create teams, add members, see who&apos;s active, and track per-person agent usage.
        </p>
      </div>

      {/* Top bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-gray-600 bg-white border border-gray-100 rounded-xl px-4 py-2.5 shadow-sm">
          <UserCheck className="w-4 h-4 text-green-500 shrink-0" />
          <span>
            <span className="font-semibold text-gray-900">
              {members.length} member{members.length !== 1 ? 's' : ''}
            </span>
            {activeNow > 0 && (
              <span className="text-gray-400"> · {activeNow} active now</span>
            )}
            {pendingMembers.length > 0 && (
              <span className="text-amber-500"> · {pendingMembers.length} pending</span>
            )}
          </span>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {/* #406 — was `onClick={() => alert('Create team — coming soon')}`. The words were
              honest; a browser alert box in a paid product is not how we say them, and it was
              the last alert() left in the portal. Disabled + labelled, matching how Settings
              and Billing already render their unbuilt toggles. */}
          <button
            disabled
            title="Create team — coming soon"
            aria-label="Create team (coming soon)"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-200 text-gray-400 text-sm font-medium cursor-not-allowed"
          >
            <span className="text-base leading-none">+</span>
            Create team
            <span className="ml-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Soon</span>
          </button>
          <button
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#7C3AED] text-white text-sm font-medium hover:bg-[#6D28D9] transition-colors shadow-sm"
            /* #616 — this pointed at '/milla/settings#team'. That page handles no `#team`
               section at all, so "Add member" navigated to a settings screen and did nothing —
               a button whose only effect was to make the user think they had missed something.
               The REAL invite flow (a seat, an email, a token) is the Command Centre. */
            onClick={() => (window.location.href = '/milla/command-centre')}
          >
            <UserPlus className="w-4 h-4" />
            Add member
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100 gap-0.5">
        {TABS.map(({ id, label, Icon }) => {
          const active = tab === id
          return (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
                active
                  ? 'border-[#7C3AED] text-[#7C3AED] bg-purple-50/40'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      {tab === 'overview'     && <OverviewTab />}
      {tab === 'analytics'   && <ComingSoon tab="Analytics" />}
      {tab === 'activity'    && <ComingSoon tab="Activity" />}
      {tab === 'permissions' && <ComingSoon tab="Permissions" />}

    </div>
  )
}
