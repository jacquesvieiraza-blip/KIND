import type { Metadata } from 'next'

// Dynamic public route with no auth. Data is resolved by share_token via the
// public API endpoint (service-role lookup) — the portal's anon client can't
// read these tables under RLS, so we go through the API like the consent page.

export const dynamic = 'force-dynamic'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://kindapi-production-e64c.up.railway.app'

interface PageProps {
  params: Promise<{ token: string }>
}

interface ReportData {
  companyName: string
  emailsSent: number
  totalReplies: number
  interestedLeads: number
  activeCampaigns: number
  daily: { date: string; count: number }[]
  lastUpdated: string
}

async function fetchReport(token: string): Promise<ReportData | null> {
  try {
    const res = await fetch(`${API_URL}/share/${encodeURIComponent(token)}`, { cache: 'no-store' })
    if (!res.ok) return null
    const body = await res.json()
    return body?.success ? (body.data as ReportData) : null
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { token } = await params
  return {
    title: 'KIND Campaign Report',
    description: 'Shared outreach report powered by K.I.N.D',
    openGraph: {
      title: 'KIND Campaign Report',
      description: 'Live outreach metrics — powered by K.I.N.D',
      images: [`/share/${token}/opengraph-image`],
    },
  }
}

// ── Simple bar-chart (SVG, no library) — real daily sends ───────────────────
function ActivityBars({ bars }: { bars: { date: string; count: number }[] }) {
  const W = 360
  const H = 80
  const GAP = 8
  const barW = (W - GAP * (bars.length - 1)) / bars.length
  const max = Math.max(...bars.map(b => b.count), 1)
  const dayLabel = (s: string) =>
    new Date(`${s}T00:00:00Z`).toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' })

  return (
    <svg
      viewBox={`0 0 ${W} ${H + 20}`}
      width="100%"
      style={{ maxWidth: W }}
      aria-label="7-day activity chart"
    >
      {bars.map((b, i) => {
        const x      = i * (barW + GAP)
        const barH   = Math.round((b.count / max) * H)
        const y      = H - barH
        const isTall = b.count === max && b.count > 0
        return (
          <g key={b.date}>
            <rect
              x={x} y={y} width={barW} height={Math.max(barH, b.count > 0 ? 2 : 0)}
              rx="4" ry="4"
              fill={isTall ? '#7C3AED' : '#C4B5FD'}
              opacity={isTall ? 1 : 0.7}
            />
            <text
              x={x + barW / 2} y={H + 14}
              textAnchor="middle"
              fontSize="9"
              fill="#9CA3AF"
              fontFamily="system-ui, sans-serif"
            >
              {dayLabel(b.date)}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

// ── Metric card ─────────────────────────────────────────────────────────────
function MetricCard({
  label,
  value,
  accent = false,
}: {
  label: string
  value: string | number
  accent?: boolean
}) {
  return (
    <div
      className={`rounded-2xl border p-5 flex flex-col gap-1 ${
        accent
          ? 'bg-[#7C3AED] border-[#6D28D9] text-white shadow-lg shadow-purple-400/30'
          : 'bg-white/80 backdrop-blur border-purple-100/60'
      }`}
    >
      <p className={`text-[11px] font-medium uppercase tracking-wide ${accent ? 'text-purple-200' : 'text-slate-400'}`}>
        {label}
      </p>
      <p className={`text-3xl font-bold tracking-tight leading-none ${accent ? 'text-white' : 'text-[#1E0A5C]'}`}>
        {value}
      </p>
    </div>
  )
}

// ── Not-found state ──────────────────────────────────────────────────────────
function ReportNotFound() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 text-center"
      style={{ background: 'linear-gradient(135deg, #FFF5EE 0%, #FAF0FF 55%, #EDE6FF 100%)' }}
    >
      <div className="flex items-center gap-1.5 mb-6">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-black text-sm shadow-md shadow-purple-400/30"
          style={{ background: 'linear-gradient(135deg, #7C3AED, #A855F7)' }}
        >
          K
        </div>
        <span className="font-black text-[#1E0A5C] text-lg tracking-tight">K.I.N.D</span>
      </div>
      <h1 className="text-xl font-bold text-[#1E0A5C] mb-2">Report not found</h1>
      <p className="text-sm text-slate-400 max-w-sm">
        This share link is invalid or has expired. Ask whoever sent it for an up-to-date link.
      </p>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default async function SharePage({ params }: PageProps) {
  const { token } = await params
  const data = await fetchReport(token)

  if (!data) return <ReportNotFound />

  const period = new Date(data.lastUpdated).toLocaleString('en-ZA', { month: 'long', year: 'numeric' })
  const replyRate = data.emailsSent > 0
    ? `${((data.totalReplies / data.emailsSent) * 100).toFixed(1)}%`
    : '—'

  const formattedUpdate = new Date(data.lastUpdated).toLocaleString('en-ZA', {
    day:    'numeric',
    month:  'short',
    year:   'numeric',
    hour:   '2-digit',
    minute: '2-digit',
  })

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'linear-gradient(135deg, #FFF5EE 0%, #FAF0FF 55%, #EDE6FF 100%)' }}
    >
      {/* ── Header ── */}
      <header className="px-6 py-5 flex items-center justify-between max-w-3xl mx-auto w-full">
        <div className="flex items-center gap-3">
          {/* K.I.N.D wordmark */}
          <div className="flex items-center gap-1.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-black text-sm shadow-md shadow-purple-400/30"
              style={{ background: 'linear-gradient(135deg, #7C3AED, #A855F7)' }}
            >
              K
            </div>
            <span className="font-black text-[#1E0A5C] text-lg tracking-tight">K.I.N.D</span>
          </div>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#7C3AED]/10 text-[#7C3AED] border border-[#7C3AED]/20">
            Shared Report
          </span>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold text-[#1E0A5C]">{data.companyName}</p>
          <p className="text-[11px] text-slate-400">{period}</p>
        </div>
      </header>

      {/* ── Body ── */}
      <main className="flex-1 px-6 pb-12 max-w-3xl mx-auto w-full space-y-6">

        {/* Section title */}
        <div>
          <h1 className="text-2xl font-bold text-[#1E0A5C]">Outreach Performance</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Live snapshot for <span className="font-medium text-[#7C3AED]">{data.companyName}</span> · {period}
          </p>
        </div>

        {/* Metric cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MetricCard label="Emails Sent"       value={data.emailsSent.toLocaleString()} />
          <MetricCard label="Reply Rate"        value={replyRate} accent />
          <MetricCard label="Interested Leads"  value={data.interestedLeads} />
          <MetricCard label="Campaigns Active"  value={data.activeCampaigns} />
        </div>

        {/* Bar chart */}
        <div className="bg-white/80 backdrop-blur rounded-2xl border border-purple-100/60 p-5">
          <p className="text-sm font-semibold text-[#1E0A5C] mb-4">Last 7 days — emails sent</p>
          <ActivityBars bars={data.daily} />
        </div>

        {/* Last updated */}
        <p className="text-[11px] text-center text-slate-400">
          Last updated {formattedUpdate}
        </p>
      </main>

      {/* ── Footer ── */}
      <footer className="py-6 flex flex-col items-center gap-1">
        <p className="text-xs text-slate-400">
          Powered by{' '}
          <a
            href="https://get-kind.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#7C3AED] font-semibold hover:underline"
          >
            K.I.N.D
          </a>{' '}
          ·{' '}
          <a
            href="https://get-kind.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#7C3AED] hover:underline"
          >
            get-kind.com
          </a>
        </p>
      </footer>
    </div>
  )
}
