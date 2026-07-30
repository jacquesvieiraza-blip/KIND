export const dynamic = 'force-dynamic'

// SENDING HEALTH — the one glance (#576 / #553).
//
// Client Zero sends through OUR OWN ENGINE (#577, amended 30 Jul), so when a send breaks it is
// our break to see. The founder's condition for that decision, verbatim: *"yes risk is something
// will break. but we fix the break. and we need a way to monitor the break."*
//
// The alerts already exist and are loud — this is the PULL half: a screen you look at, rather
// than an email you wait for.
//
// ── WHY A PAGE, NOT THE SYSTEM SCREEN ────────────────────────────────────────────────────
//
// #576's System screen was the obvious home and is the wrong one: it runs **on a button**,
// makes real network calls to Stripe/Resend/Anthropic, and is slow **on purpose**. That is
// right for "prove everything is wired" and wrong for "is outreach working right now", which
// has to be glanceable. The other candidate, `vida/page.tsx`, is 2,000 lines of worklist.
// A small server-rendered page in the same Vida shell as every other native page is the
// smallest correct change.
//
// ── THE TWO HONESTY RULES IT INHERITS ────────────────────────────────────────────────────
//
// ① A failed load renders as COULD-NOT-LOAD, never as zeros (#565). The API returns 500 on a
//    read failure rather than an empty report, precisely so this page cannot show a calm grid
//    over a broken query.
// ② A number nobody measured is not zero. **Failed sends have no row** — the write path
//    deletes it on failure — so they render NOT-MEASURED with the reason and the fix.

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://kindapi-production-e64c.up.railway.app'

type Metric = { measured: true; value: number } | { measured: false; why: string }
type WindowCounts = {
  sent: Metric; failed: Metric; bounced: Metric; optOuts: Metric; replies: Metric
  repliesByClass: Record<string, number>
}
type Health = {
  today: WindowCounts; last7: WindowCounts
  recentFailures: { at: string; detail: string }[]
  sendingExpected: boolean; sendingExpectedWhy: string
  blocklistIsGlobal: boolean; generated_at: string
}

async function load(): Promise<{ data: Health | null; error: string | null }> {
  const key = process.env.ADMIN_SECRET_KEY
  if (!key) return { data: null, error: 'ADMIN_SECRET_KEY is not set on this deploy — the panel cannot authenticate to the API.' }
  try {
    const res = await fetch(`${API_BASE}/operator/sending-health`, { headers: { 'x-admin-key': key }, cache: 'no-store' })
    const json = (await res.json().catch(() => null)) as { success?: boolean; data?: Health; error?: string } | null
    if (!res.ok || !json?.success || !json.data) {
      return { data: null, error: json?.error || `The API answered ${res.status}.` }
    }
    return { data: json.data, error: null }
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : 'The request failed and gave no reason. Check the API is up.' }
  }
}

/** Judge one window. Mirrors lib/sending-health.ts — the pure version there is unit-tested. */
function severity(w: WindowCounts, expected: boolean): { level: 'ok' | 'amber' | 'red' | 'unmeasured'; message: string } {
  if (!w.sent.measured) return { level: 'unmeasured', message: w.sent.why }
  if (w.sent.value === 0) {
    return expected
      ? { level: 'amber', message: 'Nothing has sent, and sending is expected right now. Check the send cron and the mailbox state before assuming it is a quiet day.' }
      : { level: 'ok', message: 'Nothing sent — and nothing was due, so this is the expected answer.' }
  }
  if (w.bounced.measured && w.bounced.value > 0) {
    const rate = w.bounced.value / w.sent.value
    if (rate >= 0.05) return { level: 'red', message: `${w.bounced.value} bounces on ${w.sent.value} sends (${Math.round(rate * 100)}%). Above 5% the mailbox reputation is burning — pause and investigate.` }
    if (rate >= 0.02) return { level: 'amber', message: `${w.bounced.value} bounces on ${w.sent.value} sends (${Math.round(rate * 100)}%). Watch it.` }
  }
  return { level: 'ok', message: `${w.sent.value} sent.` }
}

const TONE: Record<string, string> = {
  ok:         'bg-emerald-50 border-emerald-200 text-emerald-900',
  amber:      'bg-amber-50 border-amber-300 text-amber-900',
  red:        'bg-red-50 border-red-300 text-red-900',
  unmeasured: 'bg-slate-100 border-slate-300 text-slate-700',
}

function Stat({ label, m }: { label: string; m: Metric }) {
  return (
    <div className={`rounded-xl border px-4 py-3 ${m.measured ? 'bg-white border-slate-200' : 'bg-slate-100 border-slate-300'}`}>
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
      {m.measured
        ? <p className="text-2xl font-extrabold text-slate-900 tabular-nums mt-0.5">{m.value.toLocaleString()}</p>
        : <p className="text-[13px] font-bold text-slate-600 mt-1">NOT MEASURED</p>}
      {!m.measured && <p className="text-[11.5px] text-slate-600 mt-1 leading-snug">{m.why}</p>}
    </div>
  )
}

function Window({ title, w, expected }: { title: string; w: WindowCounts; expected: boolean }) {
  const s = severity(w, expected)
  const classes = Object.entries(w.repliesByClass)
  return (
    <section className="mb-6">
      <h2 className="text-sm font-extrabold uppercase tracking-wide text-slate-700 mb-2">{title}</h2>
      <div className={`rounded-xl border px-4 py-3 mb-3 ${TONE[s.level]}`}>
        <p className="text-[13.5px] font-semibold">{s.message}</p>
      </div>
      <div className="grid gap-2 sm:grid-cols-5">
        <Stat label="Sent" m={w.sent} />
        <Stat label="Failed" m={w.failed} />
        <Stat label="Bounced" m={w.bounced} />
        <Stat label="Opt-outs" m={w.optOuts} />
        <Stat label="Replies" m={w.replies} />
      </div>
      {classes.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {classes.map(([k, n]) => (
            <span key={k} className="text-[12px] rounded-lg border border-slate-200 bg-white px-2 py-1 text-slate-700">
              <b className="tabular-nums">{n}</b> {k}
            </span>
          ))}
        </div>
      )}
    </section>
  )
}

export default async function SendingHealthPage() {
  const { data, error } = await load()

  if (!data) {
    // #565 — a failed load says what it could NOT do. It never renders zeros, because a grid of
    // calm zeroes over a broken query is indistinguishable from a healthy quiet day.
    return (
      <div className="p-6 max-w-3xl">
        <h1 className="text-xl font-extrabold text-slate-900 mb-1">Sending health</h1>
        <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 mt-4">
          <p className="text-sm font-bold text-red-900">Couldn&apos;t load sending health.</p>
          <p className="text-[13px] text-red-800 mt-1">
            This is <b>NOT</b> &ldquo;nothing sent&rdquo; — it means we could not find out. {error}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-xl font-extrabold text-slate-900">Sending health</h1>
      <p className="text-[13px] text-slate-600 mt-1 mb-4">
        Client Zero sends through our own engine. This is the glance; the alerts are the push.
      </p>

      <div className={`rounded-xl border px-4 py-3 mb-5 ${data.sendingExpected ? 'bg-white border-slate-200' : 'bg-slate-100 border-slate-300'}`}>
        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Is sending expected right now?</p>
        <p className="text-[14px] font-semibold text-slate-900 mt-0.5">{data.sendingExpected ? 'Yes' : 'No'}</p>
        <p className="text-[12.5px] text-slate-600 mt-0.5">{data.sendingExpectedWhy}</p>
      </div>

      <Window title="Today" w={data.today} expected={data.sendingExpected} />
      <Window title="Last 7 days" w={data.last7} expected={data.sendingExpected} />

      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-[12.5px] text-slate-600 leading-relaxed">
        <p className="font-bold text-slate-800 mb-1">What these numbers are, and are not</p>
        <p>
          <b>Bounces and opt-outs are house-wide</b>, not per client — the opt-out blocklist is global by
          design, so one person&apos;s opt-out protects every client.
        </p>
        <p className="mt-1">
          <b>Failed sends are not counted anywhere.</b> When a send fails the row is deleted and the
          enrollment rolls back to retry, so nothing survives to count — you are alerted by email instead.
          Showing &ldquo;0 failed&rdquo; would be stating something we never measured.
        </p>
        <p className="mt-1 text-slate-500">Generated {new Date(data.generated_at).toUTCString()}.</p>
      </div>
    </div>
  )
}
