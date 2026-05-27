export const dynamic = 'force-dynamic'

import { createClient } from '@supabase/supabase-js'
import { Flame, ThermometerSun, Snowflake, Ban, UserX, Plane, HelpCircle, Inbox } from 'lucide-react'
import { ReplyForm } from '@/components/ReplyForm'

interface ReplyRow {
  id: string
  from_email: string
  subject: string | null
  body: string
  classification: string
  classification_reasoning: string | null
  processed_at: string
  client_id: string
  lead_id: string | null
  clients: { company_name: string | null } | null
  leads: { first_name: string | null; last_name: string | null; job_title: string | null; company: string | null } | null
}

type ClassInfo = {
  label: string
  bg: string
  text: string
  border: string
  icon: React.ElementType
  priority: number
}

const CLASS_CONFIG: Record<string, ClassInfo> = {
  hot:           { label: '🔥 Hot',          bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200',    icon: Flame,          priority: 1 },
  interested:    { label: '🔥 Hot',          bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200',    icon: Flame,          priority: 1 },
  warm:          { label: '🌤️ Warm',         bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200',  icon: ThermometerSun, priority: 2 },
  cold:          { label: '❄️ Cold',          bg: 'bg-blue-50',   text: 'text-blue-600',   border: 'border-blue-200',   icon: Snowflake,      priority: 3 },
  not_interested:{ label: '❄️ Cold',          bg: 'bg-blue-50',   text: 'text-blue-600',   border: 'border-blue-200',   icon: Snowflake,      priority: 3 },
  opt_out:       { label: '🚫 Opted out',    bg: 'bg-rose-50',   text: 'text-rose-700',   border: 'border-rose-200',   icon: Ban,            priority: 4 },
  wrong_person:  { label: '👤 Wrong person', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', icon: UserX,          priority: 5 },
  out_of_office: { label: '✈️ OOO',          bg: 'bg-gray-50',   text: 'text-gray-500',   border: 'border-gray-200',   icon: Plane,          priority: 6 },
  other:         { label: '❓ Other',         bg: 'bg-gray-50',   text: 'text-gray-500',   border: 'border-gray-200',   icon: HelpCircle,     priority: 7 },
}

function normaliseClass(c: string): string {
  if (c === 'interested') return 'hot'
  if (c === 'not_interested') return 'cold'
  return c
}

async function getReplies(filter?: string): Promise<ReplyRow[]> {
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  let query = db
    .from('figsy_replies')
    .select('id, from_email, subject, body, classification, classification_reasoning, processed_at, client_id, lead_id, clients(company_name), leads(first_name, last_name, job_title, company)')
    .order('processed_at', { ascending: false })
    .limit(200)

  if (filter && filter !== 'all') {
    // Include legacy equivalents
    if (filter === 'hot')  query = query.in('classification', ['hot', 'interested'])
    else if (filter === 'cold') query = query.in('classification', ['cold', 'not_interested'])
    else query = query.eq('classification', filter)
  }

  const { data } = await query
  return (data ?? []) as unknown as ReplyRow[]
}

async function getCounts(): Promise<Record<string, number>> {
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  const { data } = await db
    .from('figsy_replies')
    .select('classification')

  const counts: Record<string, number> = {}
  for (const row of data ?? []) {
    const key = normaliseClass(row.classification)
    counts[key] = (counts[key] ?? 0) + 1
  }
  return counts
}

const FILTERS = [
  { value: 'all',           label: 'All' },
  { value: 'hot',           label: '🔥 Hot' },
  { value: 'warm',          label: '🌤️ Warm' },
  { value: 'cold',          label: '❄️ Cold' },
  { value: 'opt_out',       label: '🚫 Opted out' },
  { value: 'wrong_person',  label: '👤 Wrong person' },
  { value: 'out_of_office', label: '✈️ OOO' },
  { value: 'other',         label: '❓ Other' },
]

export default async function UniboxPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>
}) {
  const params = await searchParams
  const filter = params.filter ?? 'all'
  const [replies, counts] = await Promise.all([getReplies(filter), getCounts()])

  const totalReplies  = Object.values(counts).reduce((a, b) => a + b, 0)
  const hotCount      = counts['hot'] ?? 0
  const warmCount     = counts['warm'] ?? 0
  const actionable    = hotCount + warmCount

  return (

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Inbox className="w-6 h-6" /> Unibox
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              All FIGSY replies across all clients — {totalReplies} total
            </p>
          </div>
          {actionable > 0 && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">
              <Flame className="w-4 h-4 text-red-600" />
              <span className="text-sm font-semibold text-red-700">
                {actionable} need attention · {hotCount} hot, {warmCount} warm
              </span>
            </div>
          )}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 flex-wrap mb-6">
          {FILTERS.map(f => (
            <a key={f.value} href={`/unibox?filter=${f.value}`}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                filter === f.value
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
              }`}>
              {f.value === 'all'
                ? `All (${totalReplies})`
                : `${f.label}${counts[f.value] ? ` (${counts[f.value]})` : ''}`}
            </a>
          ))}
        </div>

        {/* Reply list */}
        {replies.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <Inbox className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No replies</p>
            <p className="text-sm mt-1">Replies appear here as leads respond to FIGSY campaigns</p>
          </div>
        ) : (
          <div className="space-y-2">
            {replies.map(reply => {
              const cfg = CLASS_CONFIG[reply.classification] ?? CLASS_CONFIG.other
              const Icon = cfg.icon
              const lead = Array.isArray(reply.leads) ? reply.leads[0] : reply.leads
              const client = Array.isArray(reply.clients) ? reply.clients[0] : reply.clients
              const leadName = lead
                ? `${lead.first_name ?? ''} ${lead.last_name ?? ''}`.trim() || reply.from_email
                : reply.from_email
              const companyInfo = [lead?.job_title, lead?.company].filter(Boolean).join(' · ')

              return (
                <details key={reply.id}
                  className={`border rounded-xl overflow-hidden ${cfg.border} bg-white group`}>
                  <summary className="px-4 py-3 flex items-start gap-3 cursor-pointer list-none select-none hover:bg-gray-50/50 transition-colors">
                    <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${cfg.text}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-gray-900">{leadName}</span>
                        {companyInfo && (
                          <span className="text-xs text-gray-400">{companyInfo}</span>
                        )}
                        {client?.company_name && (
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                            {client.company_name}
                          </span>
                        )}
                        <span className={`ml-auto text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>
                          {cfg.label}
                        </span>
                      </div>
                      {reply.subject && (
                        <p className="text-xs text-gray-500 mt-0.5 truncate">{reply.subject}</p>
                      )}
                    </div>
                    <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                      {new Date(reply.processed_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}
                    </span>
                  </summary>

                  <div className={`px-4 pb-4 pt-2 ${cfg.bg} border-t ${cfg.border}`}>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed mb-3">{reply.body}</p>
                    {reply.classification_reasoning && (
                      <p className="text-xs text-gray-400 italic">AI: {reply.classification_reasoning}</p>
                    )}
                    <div className="mt-2 flex items-center gap-4 text-xs text-gray-400">
                      <span>{reply.from_email}</span>
                      {client?.company_name && <span>Client: {client.company_name}</span>}
                    </div>
                    {reply.classification !== 'sent_reply' && (
                      <ReplyForm replyId={reply.id} fromEmail={reply.from_email} />
                    )}
                  </div>
                </details>
              )
            })}
          </div>
        )}
      </div>
  )
}
