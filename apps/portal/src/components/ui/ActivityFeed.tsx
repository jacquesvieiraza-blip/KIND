export interface ActivityEvent {
  id: string
  type:
    | 'lead_added'
    | 'email_sent'
    | 'reply_received'
    | 'credit_used'
    | 'campaign_created'
    | 'campaign_paused'
  description: string
  timestamp: string // ISO string
  metadata?: Record<string, string | number>
}

interface Props {
  events?: ActivityEvent[]
  loading?: boolean
  maxItems?: number
}

const DOT_COLOURS: Record<ActivityEvent['type'], string> = {
  lead_added:       'bg-blue-400',
  email_sent:       'bg-purple-400',
  reply_received:   'bg-green-400',
  credit_used:      'bg-amber-400',
  campaign_created: 'bg-[#7C3AED]',
  campaign_paused:  'bg-gray-400',
}

function formatRelative(iso: string): string {
  const diffMs   = Date.now() - new Date(iso).getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1)    return 'Just now'
  if (diffMins < 60)   return `${diffMins} min ago`
  const diffHrs = Math.floor(diffMins / 60)
  if (diffHrs < 24)    return `${diffHrs} hour${diffHrs === 1 ? '' : 's'} ago`
  const diffDays = Math.floor(diffHrs / 24)
  if (diffDays === 1)  return 'Yesterday'
  if (diffDays < 7)    return `${diffDays} days ago`
  return new Date(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })
}

export function ActivityFeed({ events = [], loading = false, maxItems = 8 }: Props) {
  const visible = events.slice(0, maxItems)

  return (
    <div className="bg-white/80 backdrop-blur rounded-xl border border-purple-100/60 p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 rounded-lg bg-[#7C3AED]/10 flex items-center justify-center">
          {/* activity icon: vertical dots */}
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="4"  cy="4"  r="1.5" fill="#7C3AED" />
            <circle cx="4"  cy="9"  r="1.5" fill="#7C3AED" opacity=".5" />
            <rect x="7" y="3" width="5" height="1.5" rx=".75" fill="#7C3AED" />
            <rect x="7" y="8" width="5" height="1.5" rx=".75" fill="#7C3AED" opacity=".5" />
          </svg>
        </div>
        <h2 className="font-semibold text-[#1E0A5C] text-sm">Activity Feed</h2>
      </div>

      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3 animate-pulse">
              <div className="mt-1.5 w-2.5 h-2.5 rounded-full bg-slate-200 shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 bg-slate-100 rounded w-3/4" />
                <div className="h-2.5 bg-slate-100 rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && visible.length === 0 && (
        <div className="flex flex-col items-center py-8 gap-2 text-center">
          <div className="w-9 h-9 rounded-xl bg-[#F5F0FF] flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <circle cx="9" cy="9" r="8" stroke="#7C3AED" strokeOpacity=".3" strokeWidth="1.5" />
              <circle cx="9" cy="9" r="2.5" fill="#7C3AED" fillOpacity=".3" />
            </svg>
          </div>
          <p className="text-sm text-slate-400">No activity yet — leads and emails will appear here</p>
        </div>
      )}

      {!loading && visible.length > 0 && (
        <ol className="relative space-y-0">
          {visible.map((event, idx) => {
            const isLast = idx === visible.length - 1
            return (
              <li key={event.id} className="flex items-start gap-3 relative">
                {/* vertical connector line */}
                {!isLast && (
                  <div className="absolute left-[4px] top-[14px] w-px h-[calc(100%-4px)] bg-purple-100/80" />
                )}
                {/* dot */}
                <span
                  className={`mt-1 w-2.5 h-2.5 rounded-full shrink-0 ring-2 ring-white ${DOT_COLOURS[event.type]}`}
                />
                {/* content */}
                <div className="pb-4 flex-1 min-w-0">
                  <p className="text-sm text-[#1E0A5C] leading-snug">{event.description}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{formatRelative(event.timestamp)}</p>
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}
