'use client'

// ═══════════════════════════════════════════════════════════════════════════════════════
// SETTINGS — MILLA-NATIVE FORK.
//
// ⚑ 31 Aug (BUILD-004A-2D). This was a 13-line wrapper around the shared `(dashboard)`
// settings page. It is now a fork, because two of its areas had to change for a programme
// customer and `/dashboard` is a LIVE, separately-routed portal that must not change with it.
//
// 🛑 WHAT DID *NOT* CHANGE, WHICH IS MOST OF THIS FILE. Business Profile, the Lead-Capture
// Form, Writing Style, Sign emails as, CRM, Google Calendar, the booking link, Voice Calls,
// Approve-before-send, Agency & white-label and the Team section are carried over verbatim —
// same markup, same classes, same copy, same endpoints. The founder's standing rule is that a
// stale data model is not a reason to remove a branded component, and the audit verified every
// one of these against live code. They are here unchanged on purpose.
//
// ⚠️ EXACTLY TWO AREAS ARE REWORKED, both founder-decided:
//   D1 · NOTIFICATIONS — "Low credits" leaves the programme experience; "Campaign paused" and
//        "Weekly digest" become genuinely live, switchable and PERSISTED.
//   D3 · LEAD DELIVERY — the section, its cards and its density stay; the two customer-editable
//        controls over K.I.N.D's internal sourcing volume and delivery mechanics go, replaced
//        by real programme delivery information.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { api } from '@/lib/api'
import { SUPPORTED_COUNTRIES, MILLA_FAILURE_COPY } from '@kind/shared'
import { Loader2, Save, CheckCircle, XCircle, Link2, Calendar, Phone, Pencil, Eye, EyeOff, AlertTriangle, Bell, Users, Truck } from 'lucide-react'
import { ValueCard, ProgressBar, PreLiveState } from '@/components/milla/ProgrammeStat'
import { type CustomerProgramme } from '@/components/milla/ProgrammeWorkspace'

// ⛓️ 31 Aug (D1) — `low_credits` IS GONE FROM THIS TYPE, not merely hidden in the render.
//
// 🛑 THE FINDING BEHIND THE DECISION. `/milla/billing` tells a programme customer, in as many
// words, that there is no wallet, no pack and no per-lead price — and `/ae/low-credits` emailed
// the same person "top up to keep outreach running" every morning. The API side of this fence
// is `lib/programme-notifications.ts`; this is the client side of the same decision.
//
// ⚠️ THE LEGACY RUNTIME IS NOT SWITCHED OFF. R74 keeps $299/100/$4 live until the coordinated
// migration ships, so a legacy client still gets those warnings from the old portal. What
// changed is that the MILLA PROGRAMME EXPERIENCE no longer contains the control or the email.
const NOTIF_STORAGE_KEY = 'kind_notification_prefs_v1'
const DEFAULT_NOTIF_PREFS = {
  reply_received: true,
}
type NotifPrefs = typeof DEFAULT_NOTIF_PREFS

/** The three switches the SERVER owns. A cron cannot read localStorage — see below. */
type ServerNotifPrefs = {
  daily_brief: boolean | null
  campaign_paused: boolean | null
  weekly_digest: boolean | null
}

function NotificationPreferences({ server, onServerToggle }: {
  server: ServerNotifPrefs
  onServerToggle: (key: keyof ServerNotifPrefs, next: boolean) => void
}) {
  const [prefs, setPrefs] = useState<NotifPrefs>(DEFAULT_NOTIF_PREFS)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(NOTIF_STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<NotifPrefs>
        setPrefs(prev => ({ ...prev, ...parsed }))
      }
    } catch { /* ignore */ }
  }, [])

  function flash() {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  // ⚑ 31 Aug (D1) — THREE SWITCHES ARE SERVER-PERSISTED NOW, AND THE REASON IS THE WHOLE FIX.
  //
  // 🛑 #326 badged four of these "Soon" because their toggles genuinely did nothing — they
  // wrote localStorage and nothing read it. THE EMAILS WERE BUILT AFTERWARDS AND NOBODY CAME
  // BACK TO THE SWITCH. By the 4A-2D audit, `/digest/weekly` had been running every Monday and
  // `/figsy/check-performance` every morning: a client was receiving mail this panel told them
  // did not exist yet, from a control they could see and could not press. That is #628's shape
  // exactly — the copy outlived the problem and became the opposite lie.
  //
  // ⚠️ AND THIS IS WHY THEY CANNOT BE localStorage. The thing that must obey a notification
  // preference is a CRON. A cron cannot open a browser. `daily_brief_enabled` was already a
  // column for exactly this reason (R2/#27); these two now sit beside it.
  const items: {
    key: keyof ServerNotifPrefs | keyof NotifPrefs
    label: string
    desc: string
    live: boolean
  }[] = [
    { key: 'daily_brief',     label: 'Daily brief',     desc: 'Morning update on active campaigns and replies.',                    live: true },
    // ⚠️ NOT RENAMED TO "PROGRAMME PAUSED", AND THAT IS A FACTUAL DECISION RATHER THAN A
    // STYLISTIC ONE. This fires when ONE `figsy_campaigns` row crosses the <1% reply-rate
    // floor. A programme pause is `programmes.paused_at` — a different row with its own locked
    // copy. Calling this a programme pause would tell a client their whole engagement had
    // stopped because a single campaign underperformed.
    { key: 'campaign_paused', label: 'Campaign paused', desc: 'When a campaign is auto-paused because replies dropped away.',       live: true },
    { key: 'weekly_digest',   label: 'Weekly digest',   desc: 'Summary of your outreach results every Monday.',                     live: true },
    // The one row where "Soon" is still TRUE — verified: `reply_received` exists only as an
    // internal signal in `lib/reply-pipeline.ts`. No client notification is built, so there is
    // nothing here to switch on and nothing arriving in their inbox.
    { key: 'reply_received',  label: 'Reply received',  desc: 'When a lead replies to your outreach.',                              live: false },
  ]

  const isServerKey = (k: string): k is keyof ServerNotifPrefs =>
    k === 'daily_brief' || k === 'campaign_paused' || k === 'weekly_digest'

  // ⚠️ `null` FROM THE SERVER MEANS "NEVER CHOSE", WHICH IS ON. The columns are nullable with
  // no DEFAULT (the #599 precedent: a DEFAULT stamps historic rows with a claim nobody made),
  // so an untouched client reads null — and null must render as the behaviour they have today.
  const valueOf = (k: string): boolean =>
    isServerKey(k) ? server[k] !== false : prefs[k as keyof NotifPrefs]

  function toggle(k: string) {
    if (isServerKey(k)) {
      onServerToggle(k, server[k] === false)
      flash()
      return
    }
    setPrefs(prev => {
      const next = { ...prev, [k]: !prev[k as keyof NotifPrefs] }
      try { localStorage.setItem(NOTIF_STORAGE_KEY, JSON.stringify(next)) } catch { /* ignore */ }
      return next
    })
    flash()
  }

  return (
    <div className="border-t border-gray-100 pt-6">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-[#9B8EC4]" />
          <h2 className="font-semibold">Notification Preferences</h2>
        </div>
        {saved && (
          <span className="flex items-center gap-1 text-xs text-green-600">
            <CheckCircle className="w-3 h-3" /> Saved
          </span>
        )}
      </div>
      <p className="text-sm text-[#9B8EC4] mb-4">Choose which notifications you receive from M&amp;V.</p>
      <div className="space-y-3">
        {items.map(({ key, label, desc, live }) => (
          <div key={key} className="flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 flex items-center gap-2">
                {label}
                {!live && (
                  <span className="text-[10px] font-bold uppercase tracking-wide text-amber-600 bg-amber-50 border border-amber-100 rounded px-1.5 py-0.5">Soon</span>
                )}
              </p>
              <p className="text-xs text-[#9B8EC4]">{desc}</p>
            </div>
            <button
              onClick={() => { if (live) toggle(key) }}
              disabled={!live}
              aria-label={`Toggle ${label}`}
              title={live ? undefined : 'Coming soon'}
              className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#7C3AED] focus:ring-offset-2 ${
                !live ? 'bg-gray-100 cursor-not-allowed' : valueOf(key) ? 'bg-[#7C3AED]' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 rounded-full shadow transform transition-transform duration-200 mt-0.5 ${
                  !live ? 'bg-gray-300 translate-x-0.5' : valueOf(key) ? 'bg-white translate-x-4' : 'bg-white translate-x-0.5'
                }`}
              />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * ── D3 · LEAD DELIVERY ────────────────────────────────────────────────────────────────
 *
 * ⛓️ 31 Aug — THE SECTION SURVIVES; THE CONTROLS DO NOT. Founder decision, quoted: *"KEEP the
 * Lead Delivery section and its visual treatment. Do NOT strip the cards. Customers must NOT
 * control M&V internal sourcing quantity or internal delivery mechanics."*
 *
 * 🛑 WHAT WAS ON THIS SCREEN. Two number inputs — "Leads per ICP run (max)" and "Daily lead
 * delivery rate" — plus the line *"Must have enough credits."* Both were levers on K.I.N.D's
 * own machinery: `leads_per_run` feeds `sourcingTarget()`, and `daily_drip_rate` feeds the
 * nightly `/leads/drip` cron. In the managed programme model neither is the customer's
 * decision, and one of them is not even reachable for them — `start-work.ts` stamps
 * `delivered_at` at surfacing, so a programme client's leads never trickle at N a day.
 *
 * ⚠️ EVERY FIGURE HERE IS ALREADY-APPROVED PROGRAMME TRUTH, READ FROM `/my/programme` — the
 * same `readCustomerProgramme` row the workspace and Reports render. No new metric was
 * invented: "People sourced of N authorised" and "Meetings booked" are the founder-approved
 * labels from 4A-2B/2C, used verbatim, and `null` is still a dash rather than a zero.
 */
function LeadDeliverySection({ p, failed }: { p: CustomerProgramme | null; failed: boolean }) {
  return (
    <div className="border-t border-gray-100 pt-6">
      <div className="flex items-center gap-2 mb-0.5">
        <Truck className="w-4 h-4 text-[#9B8EC4]" />
        <h2 className="text-lg font-semibold text-gray-900">Lead Delivery</h2>
      </div>
      {/* ⛓️ 31 Aug — FOUNDER-APPROVED COPY, exact. It replaces "Control how many leads you
          receive and how fast they arrive", which described a control the customer no longer
          has. My draft read "K.I.N.D runs sourcing and delivery for you"; the founder's
          wording says "We", which is how the rest of this product speaks to a customer. */}
      <p className="text-gray-500 text-sm mt-0.5 mb-5">How your programme is being delivered. We handle sourcing and delivery for you.</p>

      {failed && (
        <div className="border border-red-200 bg-red-50/60 rounded-xl px-4 py-3">
          <p className="text-[13.5px] font-semibold text-red-800">{MILLA_FAILURE_COPY.pipelineFailed}</p>
        </div>
      )}

      {!failed && p && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <ValueCard
              value={p.progress.delivered}
              label={`People sourced of ${p.progress.authorised.toLocaleString()} authorised`}
            />
            <ValueCard
              value={p.progress.outcomesAchieved}
              label={p.progress.outcomesAchieved === null ? 'Meetings — not available right now' : 'Meetings booked'}
              tone="emerald"
            />
          </div>

          {/* The bar draws a ratio of two real numbers and nothing else — no benchmark input,
              so there is nowhere for a made-up comparison to enter. Only drawn when sourcing
              has actually been authorised: a 0/0 bar is a picture of nothing. */}
          {p.progress.authorised > 0 && (
            <div className="mt-5">
              <ProgressBar
                label="Sourcing"
                value={p.progress.delivered}
                max={p.progress.authorised}
              />
            </div>
          )}

          {/* Pause rides alongside delivery rather than replacing it, and the sentence is the
              server's locked copy — never re-worded here. */}
          {p.paused && p.pausedCopy && (
            <div className="mt-5 border border-amber-300 bg-amber-50/70 rounded-xl px-4 py-3">
              <p className="text-[13.5px] font-semibold text-amber-900">{p.pausedCopy}</p>
            </div>
          )}

          {p.progress.authorised === 0 && !p.paused && (
            <div className="mt-5">
              <PreLiveState
                what="Sourcing has not been authorised on your programme yet. When it is, this is where delivery against it appears."
                measures={['People sourced', 'Sourcing authorised', 'Meetings booked']}
              />
            </div>
          )}
        </>
      )}

      {!failed && !p && (
        <p className="text-sm text-[#9B8EC4]">Loading your programme…</p>
      )}
    </div>
  )
}

// #326 — the "approve before send" control is not wired (the send scheduler never
// gated on it), so this is a static, honest "coming soon" panel — no state, no
// localStorage that pretends to save a preference nothing reads.
function FigsyOutreachSettings() {
  return (
    <div className="border-t border-gray-100 pt-6">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-[#9B8EC4]" />
          <h2 className="font-semibold">FIGSY — Outreach Control</h2>
        </div>
      </div>
      <p className="text-sm text-[#9B8EC4] mb-4">Control how FIGSY sends outbound emails on your behalf.</p>
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 flex items-center gap-2">
            Approve emails before sending
            <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-700 bg-emerald-50 border border-emerald-100 rounded px-1.5 py-0.5">Available</span>
          </p>
          {/* #326 made this honest when the gate genuinely did not exist — the toggle wrote
              localStorage and the send path never read it. ⚠️ #628 — THE COPY OUTLIVED THE
              PROBLEM AND BECAME THE OPPOSITE LIE. The hold is REAL now: when a campaign has
              `settings.review_required`, `sendSequenceEmail` enqueues the draft into
              figsy_approval_queue and PAUSES the enrollment instead of sending — verified in
              figsy.ts, with the release queue built in Vida. Telling a client "FIGSY sends
              autonomously; there is no approval hold" understates our own safety control, in
              the one direction that costs trust.
              THE TOGGLE STAYS UNWIRED HERE ON PURPOSE: the hold is PER CAMPAIGN
              (PATCH /figsy/campaigns/:id takes review_required) and this switch is global, so
              wiring it would mean inventing fan-out semantics across a client's campaigns —
              on the send path, unasked. Tracked as its own item rather than half-built.
              ⚑ 31 Aug (4A-2D) — RE-VERIFIED AND KEPT. The founder confirmed this is a genuine
              outreach approval preference, NOT the retired paid per-lead approval model. */}
          <p className="text-xs text-[#9B8EC4]">
            Available — every email can be held for your approval before it goes out, instead of FIGSY sending autonomously. It is set per campaign: ask us to switch yours to co-pilot and nothing sends without your yes.
          </p>
        </div>
        <button
          type="button"
          disabled
          aria-label="Approve before send (coming soon)"
          title="Approve before send is coming soon"
          className="relative inline-flex h-5 w-9 shrink-0 rounded-full bg-gray-100 cursor-not-allowed"
        >
          <span className="inline-block h-4 w-4 rounded-full bg-gray-300 shadow transform mt-0.5 translate-x-0.5" />
        </button>
      </div>
    </div>
  )
}

// R12 (#83) — Embeddable lead-capture form. Shows a copy-paste snippet that
// posts to the public /forms/:clientId/submit endpoint → a scored pipeline lead.
function LeadCaptureFormSection({ clientId }: { clientId: string }) {
  const [copied, setCopied] = useState(false)
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://kindapi-production-e64c.up.railway.app'

  const snippet = `<!-- K.I.N.D lead-capture form -->
<form id="kind-lead-form" style="max-width:380px;font-family:sans-serif;display:flex;flex-direction:column;gap:10px">
  <input name="name" placeholder="Your name" style="padding:10px;border:1px solid #ddd;border-radius:8px" />
  <input name="email" type="email" required placeholder="Email" style="padding:10px;border:1px solid #ddd;border-radius:8px" />
  <input name="company" placeholder="Company" style="padding:10px;border:1px solid #ddd;border-radius:8px" />
  <textarea name="message" placeholder="How can we help?" style="padding:10px;border:1px solid #ddd;border-radius:8px"></textarea>
  <input name="_hp" style="display:none" tabindex="-1" autocomplete="off" />
  <button type="submit" style="padding:11px;background:#7C3AED;color:#fff;border:0;border-radius:8px;font-weight:600;cursor:pointer">Send</button>
  <p id="kind-form-msg" style="font-size:13px;margin:0"></p>
</form>
<script>
(function(){
  var f=document.getElementById('kind-lead-form'),m=document.getElementById('kind-form-msg');
  f.addEventListener('submit',function(e){
    e.preventDefault();
    var d={};new FormData(f).forEach(function(v,k){d[k]=v;});
    m.textContent='Sending…';
    fetch('${apiUrl}/forms/${clientId}/submit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(d)})
      .then(function(r){return r.json();})
      .then(function(r){m.style.color=r.success?'#16a34a':'#dc2626';m.textContent=r.success?'Thanks — we\\'ll be in touch!':(r.error||'Something went wrong.');if(r.success)f.reset();})
      .catch(function(){m.style.color='#dc2626';m.textContent='Network error — please try again.';});
  });
})();
</script>`

  return (
    <div className="border-t border-gray-100 pt-6">
      <div className="flex items-center gap-2 mb-1">
        <Link2 className="w-4 h-4 text-[#9B8EC4]" />
        <h2 className="font-semibold">Lead-Capture Form</h2>
      </div>
      <p className="text-sm text-[#9B8EC4] mb-4">
        Paste this into your website. Every submission becomes a scored lead in your pipeline (source: web form) — deduped by email, spam-protected with a honeypot.
      </p>
      <div className="relative">
        <pre className="text-xs bg-[#1E1B2E] text-gray-200 rounded-lg p-4 overflow-x-auto max-h-64 leading-relaxed"><code>{snippet}</code></pre>
        <button
          onClick={() => { navigator.clipboard.writeText(snippet).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2500) }) }}
          className="absolute top-2 right-2 flex items-center gap-1.5 text-xs font-semibold bg-white/10 hover:bg-white/20 text-white rounded-lg px-2.5 py-1.5 transition-colors"
        >
          {copied ? <><CheckCircle className="w-3.5 h-3.5" /> Copied</> : 'Copy'}
        </button>
      </div>
    </div>
  )
}

function TeamSection({ clientId, userRole }: { clientId: string; userRole: string }) {
  const [members, setMembers] = useState<{id:string;email:string;role:string;accepted_at:string|null}[]>([])
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('member')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [inviteError, setInviteError] = useState('')   // #478 — real invite failure feedback
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://kindapi-production-e64c.up.railway.app'
  const supabase = createClient()

  // #266: /team is now authenticated — send the session token; the API derives the
  // workspace from it (no more client_id passed in the URL/body).
  async function authHeader(): Promise<Record<string, string>> {
    const { data } = await supabase.auth.getSession()
    return data.session ? { Authorization: `Bearer ${data.session.access_token}` } : {}
  }
  async function loadMembers() {
    const h = await authHeader()
    fetch(`${apiUrl}/team/members`, { headers: h })
      .then(r => r.ok ? r.json() : []).then(d => setMembers(Array.isArray(d) ? d : [])).catch(() => setMembers([]))
  }

  useEffect(() => { loadMembers() }, [clientId])

  async function invite(e: React.FormEvent) {
    e.preventDefault()
    setSending(true)
    const h = await authHeader()
    // #478 — don't claim "invite sent" unless it actually was. The endpoint is real
    // (/team/invite, role-validated per #402); surface a real failure instead of a lie.
    let ok = false
    try {
      const res = await fetch(`${apiUrl}/team/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...h },
        body: JSON.stringify({ email, role }),
      })
      ok = res.ok
    } catch { ok = false }
    setSending(false)
    if (ok) {
      setSent(true)
      setEmail('')
      loadMembers()
      setTimeout(() => setSent(false), 3000)
    } else {
      setInviteError('Could not send the invite — please try again.')
      setTimeout(() => setInviteError(''), 4000)
    }
  }

  const canInvite = userRole === 'owner' || userRole === 'admin'

  return (
    <div className="bg-white rounded-2xl border border-purple-100 shadow-sm p-6">
      <div className="flex items-center gap-2 mb-1">
        <Users className="w-4 h-4 text-[#9B8EC4]" />
        <h2 className="text-base font-semibold text-gray-900">Team</h2>
      </div>
      <p className="text-sm text-gray-500 mb-4">Invite teammates to access this workspace.</p>

      {/* Member list */}
      <div className="space-y-2 mb-5">
        {members.map(m => (
          <div key={m.id} className="flex items-center justify-between py-2 px-3 rounded-xl bg-gray-50 border border-gray-100">
            <div>
              <p className="text-sm font-medium text-gray-800">{m.email}</p>
              <p className="text-xs text-gray-400">{m.accepted_at ? 'Active' : 'Invited — pending'}</p>
            </div>
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
              m.role === 'owner' ? 'bg-purple-100 text-purple-700' :
              m.role === 'admin' ? 'bg-blue-100 text-blue-700' :
              m.role === 'viewer' ? 'bg-gray-100 text-gray-600' :
              'bg-green-100 text-green-700'
            }`}>{m.role}</span>
          </div>
        ))}
        {members.length === 0 && <p className="text-sm text-gray-400 italic">No team members yet.</p>}
      </div>

      {/* Invite form */}
      {canInvite && (
        <form onSubmit={invite} className="flex gap-2">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="teammate@company.com"
            required
            className="flex-1 px-3 py-2 text-sm rounded-xl border border-purple-100 bg-white focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20"
          />
          <select
            value={role}
            onChange={e => setRole(e.target.value)}
            className="px-2 py-2 text-sm rounded-xl border border-purple-100 bg-white focus:outline-none"
          >
            <option value="member">Member</option>
            <option value="admin">Admin</option>
            <option value="viewer">Viewer</option>
          </select>
          <button
            type="submit"
            disabled={sending}
            className="px-4 py-2 text-sm font-semibold rounded-xl bg-[#7C3AED] text-white hover:bg-[#6D28D9] disabled:opacity-50 transition-colors"
          >
            {sent ? 'Sent!' : sending ? '…' : 'Invite'}
          </button>
        </form>
      )}
      {inviteError && <p className="text-xs text-red-500 mt-2">{inviteError}</p>}
    </div>
  )
}

interface ClientData {
  company_name: string
  industry: string
  country: string
  website: string
  phone: string
  company_registration: string
  vat_number: string
  crm_type: string
  crm_api_key: string
  crm_sync_enabled: boolean
  crm_dedup_enabled: boolean
}

interface CalendarStatus {
  connected: boolean
  email: string | null
}

export default function MillaSettingsPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  // ⛓️ 31 Aug (D3) — `leads_per_run` and `daily_drip_rate` ARE GONE FROM THIS FORM STATE, not
  // merely hidden from the markup. A field left in state is a field the next edit re-renders,
  // and this PATCHes `/clients/me`: keeping them here would mean every profile save still sent
  // K.I.N.D's internal sourcing volume back from a customer's browser.
  const [form, setForm] = useState({ company_name: '', industry: '', country: 'South Africa', website: '', phone: '', company_registration: '', vat_number: '' })
  const [crm, setCrm] = useState({ crm_type: 'none', crm_api_key: '', crm_sync_enabled: false, crm_dedup_enabled: false })
  const [crmSaving, setCrmSaving] = useState(false)
  const [crmSaved, setCrmSaved] = useState(false)
  const [crmTesting, setCrmTesting] = useState(false)
  const [crmTestResult, setCrmTestResult] = useState<{ success: boolean; error?: string } | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [crmSaveError, setCrmSaveError] = useState<string | null>(null)
  const [calendarStatus, setCalendarStatus] = useState<CalendarStatus | null>(null)
  const [vapiStatus, setVapiStatus] = useState<{ configured: boolean } | null>(null)
  const [writingStyle, setWritingStyle]             = useState('')
  const [writingStyleSaving, setWritingStyleSaving] = useState(false)
  const [writingStyleSaved, setWritingStyleSaved]   = useState(false)
  const [writingStyleError, setWritingStyleError]   = useState<string | null>(null)
  const [signerName, setSignerName]                 = useState('')
  const [signerSaving, setSignerSaving]             = useState(false)
  const [signerSaved, setSignerSaved]               = useState(false)
  const [signerError, setSignerError]               = useState<string | null>(null)
  const [bookingUrl, setBookingUrl]                 = useState('')
  const [bookingSaving, setBookingSaving]           = useState(false)
  const [bookingSaved, setBookingSaved]             = useState(false)
  const [bookingError, setBookingError]             = useState<string | null>(null)
  const [calConnecting, setCalConnecting]           = useState(false)
  const [calConnectError, setCalConnectError]       = useState<string | null>(null)
  const [showCrmKey, setShowCrmKey]                 = useState(false)
  const [unsavedProfile, setUnsavedProfile]         = useState(false)
  const [unsavedCrm, setUnsavedCrm]                 = useState(false)
  const [clientId, setClientId]                     = useState<string | null>(null)
  const [userRole, setUserRole]                     = useState<string>('owner')
  const [notif, setNotif] = useState<ServerNotifPrefs>({ daily_brief: null, campaign_paused: null, weekly_digest: null })
  // D3 — the programme, read once, rendered by the Lead Delivery section.
  const [programme, setProgramme]     = useState<CustomerProgramme | null>(null)
  const [programmeFailed, setProgFail] = useState(false)

  // #361b — start the Google OAuth flow. The API endpoint requires the bearer
  // token, so this MUST be an authenticated fetch that returns the consent URL,
  // then a browser navigation to it. (A plain <a href> to the API can't carry
  // the Authorization header — that shipped 401 "Missing auth token" for everyone.)
  async function handleConnectCalendar() {
    setCalConnecting(true)
    setCalConnectError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await api.get<{ success: boolean; url?: string; error?: string }>('/calendar/connect', session?.access_token)
      if (res.url) { window.location.href = res.url; return }
      setCalConnectError(res.error ?? 'Could not start Google connect — please try again.')
    } catch (err) {
      setCalConnectError(err instanceof Error ? err.message : 'Could not start Google connect — please try again.')
    }
    setCalConnecting(false)
  }

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      try {
        const res = await api.get<{ data: ClientData & { id: string } }>('/clients/me', session.access_token)
        const c = res.data
        setForm({ company_name: c.company_name || '', industry: c.industry || '', country: c.country || 'South Africa', website: c.website || '', phone: c.phone || '', company_registration: c.company_registration || '', vat_number: c.vat_number || '' })
        setCrm({ crm_type: c.crm_type || 'none', crm_api_key: c.crm_api_key || '', crm_sync_enabled: c.crm_sync_enabled ?? false, crm_dedup_enabled: c.crm_dedup_enabled ?? false })
        setSignerName((c as { signer_name?: string | null }).signer_name || '')
        setBookingUrl((c as { booking_url?: string | null }).booking_url || '')
        // R2 (#27) + D1 — the three server-backed notification switches. `null` is preserved
        // as null rather than coerced to a boolean: it means "never chose", which the panel
        // renders as ON without ever having written a preference the client did not make.
        const row = c as unknown as Record<string, boolean | null | undefined>
        setNotif({
          daily_brief:     row.daily_brief_enabled ?? null,
          campaign_paused: row.campaign_paused_emails_enabled ?? null,
          weekly_digest:   row.weekly_digest_enabled ?? null,
        })
        if (c.id) {
          setClientId(c.id)
          // Fetch the user's role in this team (#266: authenticated; API derives the workspace)
          const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://kindapi-production-e64c.up.railway.app'
          fetch(`${apiUrl}/team/members`, { headers: { Authorization: `Bearer ${session.access_token}` } })
            .then(r => r.ok ? r.json() : Promise.resolve([]))
            .then((members: { email: string; role: string }[]) => {
              const me = members.find(m => m.email === session.user.email)
              if (me) setUserRole(me.role)
            })
            .catch(() => {})
        }
      } catch (e: any) {
        // Partner accounts may not have a client row — treat as empty profile, not an error
        if (e?.status !== 404) setSaveError('Failed to load your profile. Please refresh.')
      }

      // D3 — the programme behind Lead Delivery. A failed read is NOT "no programme": it
      // renders the locked failure sentence, never an empty or zeroed delivery panel.
      try {
        const pr = await api.get<{ data: CustomerProgramme }>('/my/programme', session.access_token)
        setProgramme(pr.data)
      } catch {
        setProgFail(true)
      }

      // Integration statuses — graceful, these endpoints may not be configured
      try {
        const cal = await api.get<CalendarStatus>('/calendar/status', session.access_token)
        setCalendarStatus(cal)
      } catch {
        setCalendarStatus({ connected: false, email: null })
      }
      try {
        const vapi = await api.get<{ configured: boolean }>('/voice/status', session.access_token)
        setVapiStatus(vapi)
      } catch {
        setVapiStatus({ configured: false })
      }

      // Load writing style from localStorage
      const savedStyle = localStorage.getItem('kind_writing_style')
      if (savedStyle) setWritingStyle(savedStyle)

      setLoading(false)
    }
    load()
  }, [])

  // When navigated here with a hash (e.g. Teams Hub "Add member" → #team), the
  // target section renders only after data loads, so the browser's native
  // hash-scroll fires before the element exists and leaves you at the top.
  // Re-run the scroll once content is ready.
  useEffect(() => {
    if (loading) return
    const hash = window.location.hash
    if (!hash) return
    const el = document.querySelector(hash)
    if (el) requestAnimationFrame(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }, [loading])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSaveError(null)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setSaving(false); return }
    try {
      await api.patch('/clients/me', form, session.access_token)
      setSaved(true)
      setUnsavedProfile(false)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save — please try again.')
    }
    setSaving(false)
  }

  async function handleSaveWritingStyle() {
    setWritingStyleSaving(true)
    setWritingStyleError(null)
    try {
      localStorage.setItem('kind_writing_style', writingStyle)
      setWritingStyleSaved(true)
      setTimeout(() => setWritingStyleSaved(false), 3000)
    } catch {
      setWritingStyleError('Failed to save — please try again.')
    }
    setWritingStyleSaving(false)
  }

  async function handleSaveSigner() {
    setSignerSaving(true)
    setSignerError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setSignerSaving(false); return }
      await api.patch('/clients/me', { signer_name: signerName.trim() }, session.access_token)
      setSignerSaved(true)
      setTimeout(() => setSignerSaved(false), 3000)
    } catch (err) {
      setSignerError(err instanceof Error ? err.message : 'Failed to save — please try again.')
    }
    setSignerSaving(false)
  }

  async function handleSaveBooking() {
    setBookingSaving(true)
    setBookingError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setBookingSaving(false); return }
      await api.patch('/clients/me', { booking_url: bookingUrl.trim() }, session.access_token)
      setBookingSaved(true)
      setTimeout(() => setBookingSaved(false), 3000)
    } catch (err) {
      setBookingError(err instanceof Error ? err.message : 'Failed to save — check it\'s a valid URL.')
    }
    setBookingSaving(false)
  }

  // D1 — one handler for all three server-backed switches. Optimistic, and it REVERTS on
  // failure: a switch that flips and silently does not persist is the same class of lie as a
  // toggle nothing reads, which is the defect this whole section exists to end.
  const NOTIF_COLUMN: Record<keyof ServerNotifPrefs, string> = {
    daily_brief:     'daily_brief_enabled',
    campaign_paused: 'campaign_paused_emails_enabled',
    weekly_digest:   'weekly_digest_enabled',
  }
  async function handleNotifToggle(key: keyof ServerNotifPrefs, next: boolean) {
    const prev = notif[key]
    setNotif(n => ({ ...n, [key]: next }))
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setNotif(n => ({ ...n, [key]: prev })); return }
      await api.patch('/clients/me', { [NOTIF_COLUMN[key]]: next }, session.access_token)
    } catch {
      setNotif(n => ({ ...n, [key]: prev }))
    }
  }

  async function handleCrmSave(e: React.FormEvent) {
    e.preventDefault()
    setCrmSaving(true)
    setCrmTestResult(null)
    setCrmSaveError(null)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setCrmSaving(false); return }
    try {
      await api.patch('/clients/me', crm, session.access_token)
      setCrmSaved(true)
      setUnsavedCrm(false)
      setTimeout(() => setCrmSaved(false), 3000)
    } catch (err) {
      setCrmSaveError(err instanceof Error ? err.message : 'Failed to save CRM settings — please try again.')
    }
    setCrmSaving(false)
  }

  async function handleCrmTest() {
    if (crm.crm_type === 'none' || !crm.crm_api_key) return
    setCrmTesting(true)
    setCrmTestResult(null)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    try {
      const res = await api.post<{ success: boolean; error?: string }>(
        '/clients/me/crm/test',
        { crm_type: crm.crm_type, crm_api_key: crm.crm_api_key },
        session.access_token,
      )
      setCrmTestResult(res)
    } catch {
      setCrmTestResult({ success: false, error: 'Connection test failed' })
    }
    setCrmTesting(false)
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-[#7C3AED]" /></div>

  return (
    <div className="h-full overflow-y-auto p-5 sm:p-6">
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-[#7B6FA0] text-sm mt-1">Manage your business profile and integrations.</p>
      </div>

      {(unsavedProfile || unsavedCrm) && (
        <div className="flex items-center gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
          <p className="text-sm text-amber-700">You have unsaved changes — scroll down and click Save before leaving this page.</p>
        </div>
      )}

      {/* Business Profile */}
      <div className="border-t border-gray-100 pt-6">
        <h2 className="font-semibold mb-4">Business Profile</h2>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
            <input type="text" value={form.company_name} onChange={(e) => { setForm({ ...form, company_name: e.target.value }); setUnsavedProfile(true) }}
              className="w-full border border-purple-100/80 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
            <input type="text" value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })}
              className="w-full border border-purple-100/80 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
            <select value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })}
              className="w-full border border-purple-100/80 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]">
              {SUPPORTED_COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
              <input type="url" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })}
                className="w-full border border-purple-100/80 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full border border-purple-100/80 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company Registration No.</label>
              <input type="text" value={form.company_registration} onChange={(e) => setForm({ ...form, company_registration: e.target.value })}
                placeholder="e.g. 2023/123456/07"
                className="w-full border border-purple-100/80 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">VAT Number <span className="text-[#9B8EC4] font-normal">(optional)</span></label>
              <input type="text" value={form.vat_number} onChange={(e) => setForm({ ...form, vat_number: e.target.value })}
                placeholder="e.g. 4123456789"
                className="w-full border border-purple-100/80 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]" />
            </div>
          </div>
          {saved && <p className="text-green-600 text-sm">Saved!</p>}
          {saveError && <p className="text-red-600 text-sm">{saveError}</p>}
          <button type="submit" disabled={saving}
            className="flex items-center gap-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-medium rounded-lg px-5 py-2.5 text-sm transition-colors disabled:opacity-60">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save changes
          </button>
        </form>
      </div>

      {/* Lead Delivery — D3 */}
      <LeadDeliverySection p={programme} failed={programmeFailed} />

      {/* Integrations heading */}
      <div className="border-t border-gray-100 pt-6">
        <h2 className="text-lg font-semibold text-gray-900">Integrations</h2>
        <p className="text-[#7B6FA0] text-sm mt-0.5">Connect external tools to supercharge FIGSY.</p>
      </div>

      {/* Lead-Capture Form — R12 */}
      {clientId && <LeadCaptureFormSection clientId={clientId} />}

      {/* Writing Style — W14 */}
      <div className="border-t border-gray-100 pt-6">
        <div className="flex items-center gap-2 mb-1">
          <Pencil className="w-4 h-4 text-[#9B8EC4]" />
          <h2 className="font-semibold flex items-center gap-2">
            FIGSY Writing Style
            <span className="text-[10px] font-bold uppercase tracking-wide text-amber-600 bg-amber-50 border border-amber-100 rounded px-1.5 py-0.5">Soon</span>
          </h2>
        </div>
        {/* #326 — the pasted style is saved on-device but not yet sent to the
            server-side sequence generator, so FIGSY doesn't apply it yet. Say so. */}
        <p className="text-sm text-[#9B8EC4] mb-4">
          Paste 2–3 of your best-performing cold emails below. Applying your custom tone to FIGSY's generated sequences is coming soon — for now this is saved on your device only.
        </p>

        {/* Sign emails as — the name every cold email signs off with */}
        <div className="mb-5 p-4 bg-[#faf9ff] border border-purple-100/80 rounded-lg">
          <label className="block text-sm font-medium text-gray-900 mb-1">Sign emails as</label>
          <p className="text-xs text-[#9B8EC4] mb-2.5">The name every prospect sees at the bottom of your emails. Leave blank and FIGSY picks one.</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={signerName}
              onChange={e => setSignerName(e.target.value)}
              maxLength={120}
              placeholder="e.g. Jack from K.I.N.D"
              className="flex-1 border border-purple-100/80 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
            />
            <button
              type="button"
              disabled={signerSaving}
              onClick={handleSaveSigner}
              className="flex items-center gap-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-medium rounded-lg px-4 py-2 text-sm transition-colors disabled:opacity-60 shrink-0"
            >
              {signerSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save
            </button>
          </div>
          {signerSaved && <p className="text-green-600 text-xs font-medium mt-2">✓ Saved — every email now signs off as “{signerName.trim() || 'FIGSY'}”</p>}
          {signerError && <p className="text-red-600 text-xs mt-2">{signerError}</p>}
        </div>

        <div className="space-y-3">
          <textarea
            value={writingStyle}
            onChange={e => setWritingStyle(e.target.value)}
            rows={8}
            placeholder={`Paste your best emails here. Example:\n\nSubject: quick question\n\nHi Sarah,\n\nI noticed Acme recently expanded into fintech — we work with companies at exactly that inflection point...\n\n---\n\nPaste another email below`}
            className="w-full border border-purple-100/80 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED] resize-none font-mono text-xs leading-relaxed"
          />
          {writingStyleSaved && <p className="text-green-600 text-xs font-medium">✓ Saved on this device — applying it to FIGSY sequences is coming soon</p>}
          {writingStyleError && <p className="text-red-600 text-xs">{writingStyleError}</p>}
          <button
            type="button"
            disabled={writingStyleSaving}
            onClick={handleSaveWritingStyle}
            className="flex items-center gap-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-medium rounded-lg px-4 py-2 text-sm transition-colors disabled:opacity-60"
          >
            {writingStyleSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save writing style
          </button>
        </div>
      </div>

      {/* CRM Integration */}
      <div className="border-t border-gray-100 pt-6">
        <div className="flex items-center gap-2 mb-1">
          <Link2 className="w-4 h-4 text-[#9B8EC4]" />
          <h2 className="font-semibold">CRM Integration</h2>
        </div>
        <p className="text-sm text-[#9B8EC4] mb-5">
          When a lead gives consent, they're automatically pushed to your CRM.
        </p>
        <form onSubmit={handleCrmSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">CRM</label>
            <select
              value={crm.crm_type}
              onChange={e => setCrm({ ...crm, crm_type: e.target.value, crm_api_key: '', crm_sync_enabled: false })}
              className="w-full border border-purple-100/80 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
            >
              <option value="none">No CRM — not connected</option>
              <option value="hubspot">HubSpot</option>
              <option value="pipedrive">Pipedrive</option>
            </select>
          </div>

          {crm.crm_type !== 'none' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {crm.crm_type === 'hubspot' ? 'HubSpot Private App Token' : 'Pipedrive API Key'}
                </label>
                <div className="relative">
                  <input
                    type={showCrmKey ? 'text' : 'password'}
                    value={crm.crm_api_key}
                    onChange={e => { setCrm({ ...crm, crm_api_key: e.target.value }); setCrmTestResult(null); setUnsavedCrm(true) }}
                    placeholder={crm.crm_type === 'hubspot' ? 'pat-na1-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' : 'Your Pipedrive API key'}
                    className="w-full border border-purple-100/80 rounded-lg px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED] font-mono"
                  />
                  <button type="button" onClick={() => setShowCrmKey(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                    {showCrmKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-[#9B8EC4] mt-1">
                  {crm.crm_type === 'hubspot'
                    ? 'Create a Private App in HubSpot → Settings → Integrations → Private Apps. Scopes needed: crm.objects.contacts.write'
                    : 'Find your API key in Pipedrive → Settings → Personal preferences → API'}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleCrmTest}
                  disabled={crmTesting || !crm.crm_api_key}
                  className="px-4 py-2 border border-purple-100/80 hover:bg-gray-50 disabled:opacity-50 text-sm text-gray-700 rounded-lg transition-colors"
                >
                  {crmTesting ? <span className="flex items-center gap-1.5"><Loader2 className="w-3.5 h-3.5 animate-spin" />Testing…</span> : 'Test connection'}
                </button>
                {crmTestResult && (
                  <span className={`flex items-center gap-1.5 text-sm font-medium ${crmTestResult.success ? 'text-green-600' : 'text-red-500'}`}>
                    {crmTestResult.success
                      ? <><CheckCircle className="w-4 h-4" /> Connected</>
                      : <><XCircle className="w-4 h-4" /> {crmTestResult.error ?? 'Failed'}</>}
                  </span>
                )}
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={crm.crm_sync_enabled}
                  onChange={e => setCrm({ ...crm, crm_sync_enabled: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-[#7C3AED] focus:ring-[#7C3AED]"
                />
                <span className="text-sm text-gray-700">
                  Auto-sync consented leads to {crm.crm_type === 'hubspot' ? 'HubSpot' : 'Pipedrive'}
                </span>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={crm.crm_dedup_enabled}
                  onChange={e => setCrm({ ...crm, crm_dedup_enabled: e.target.checked })}
                  className="w-4 h-4 mt-0.5 rounded border-gray-300 text-[#7C3AED] focus:ring-[#7C3AED]"
                />
                <span className="text-sm text-gray-700">
                  Never contact people already in my {crm.crm_type === 'hubspot' ? 'HubSpot' : 'Pipedrive'}
                  <span className="block text-xs text-[#9B8EC4] mt-0.5">
                    Before FIGSY reaches out, we check your CRM. Existing contacts (or companies already in your account) are skipped — so we never cold-email your customers.
                  </span>
                </span>
              </label>
            </>
          )}

          {crmSaved && <p className="text-green-600 text-sm">CRM settings saved!</p>}
          {crmSaveError && <p className="text-red-600 text-sm">{crmSaveError}</p>}
          <button
            type="submit"
            disabled={crmSaving}
            className="flex items-center gap-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-medium rounded-lg px-5 py-2.5 text-sm transition-colors disabled:opacity-60"
          >
            {crmSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save integration
          </button>
        </form>
      </div>

      {/* Google Calendar */}
      <div className="border-t border-gray-100 pt-6">
        <div className="flex items-center gap-2 mb-1">
          <Calendar className="w-4 h-4 text-[#9B8EC4]" />
          <h2 className="font-semibold">Google Calendar</h2>
          {calendarStatus?.connected && (
            <span className="ml-2 flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
              <CheckCircle className="w-3 h-3" /> Connected
            </span>
          )}
        </div>
        <p className="text-sm text-[#9B8EC4] mb-5">
          {/* #628 — this said only "generate a calendar booking link", which undersold what is
              actually built (gcal.ts): real free/busy, a public booking page, events.insert
              into their own calendar, a Meet link and invites both ways. */}
          Connect your calendar and prospects book straight into it — they see only your free slots, the meeting lands in your calendar with a Google Meet link, and you both get the invite. FIGSY shares the link when a reply comes in interested.
        </p>
        {calendarStatus?.connected ? (
          <div className="text-sm text-gray-600">
            Connected as <span className="font-medium">{calendarStatus.email}</span>
          </div>
        ) : (
          <div>
            <button
              type="button"
              onClick={handleConnectCalendar}
              disabled={calConnecting}
              className="inline-flex items-center gap-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-medium rounded-lg px-5 py-2.5 text-sm transition-colors disabled:opacity-60"
            >
              <Calendar className="w-4 h-4" /> {calConnecting ? 'Opening Google…' : 'Connect Google Calendar'}
            </button>
            {calConnectError && <p className="mt-2 text-xs text-red-600">{calConnectError}</p>}
          </div>
        )}

        {/* Booking link — for clients who don't use Google Calendar (Calendly, etc.) */}
        <div className="mt-5 pt-5 border-t border-gray-100">
          <label className="block text-sm font-medium text-gray-900 mb-1">Or paste a booking link</label>
          <p className="text-xs text-[#9B8EC4] mb-2.5">Using Calendly, Cal.com, or another scheduler? Paste it here and FIGSY will share this link instead.</p>
          <div className="flex gap-2">
            <input
              type="url"
              value={bookingUrl}
              onChange={e => setBookingUrl(e.target.value)}
              placeholder="https://calendly.com/your-name/30min"
              className="flex-1 border border-purple-100/80 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
            />
            <button
              type="button"
              disabled={bookingSaving}
              onClick={handleSaveBooking}
              className="flex items-center gap-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-medium rounded-lg px-4 py-2 text-sm transition-colors disabled:opacity-60 shrink-0"
            >
              {bookingSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save
            </button>
          </div>
          {bookingSaved && <p className="text-green-600 text-xs font-medium mt-2">✓ Booking link saved</p>}
          {bookingError && <p className="text-red-600 text-xs mt-2">{bookingError}</p>}
        </div>
      </div>

      {/* Voice (Vapi) — only show when active */}
      {vapiStatus?.configured && (
        <div className="border-t border-gray-100 pt-6">
          <div className="flex items-center gap-2 mb-1">
            <Phone className="w-4 h-4 text-[#9B8EC4]" />
            <h2 className="font-semibold">Voice Calls (FIGSY)</h2>
            <span className="ml-2 flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
              <CheckCircle className="w-3 h-3" /> Active
            </span>
          </div>
          <p className="text-sm text-[#9B8EC4] mb-3">
            FIGSY places follow-up calls using Vapi.ai — leaving voicemails, qualifying interest, and booking meetings.
          </p>
          <p className="text-sm text-green-600">Vapi is connected. Voice calls are available on demand — automatic in-sequence calling isn&apos;t enabled yet.</p>
        </div>
      )}

      {/* FIGSY — Outreach Control */}
      <FigsyOutreachSettings />

      {/* Notification Preferences */}
      <NotificationPreferences server={notif} onServerToggle={handleNotifToggle} />

      {/* P2-12 — White-label / Agency Mode.
          ⚠️ #628 — REWRITTEN 6 Aug, FOUNDER-RULED (Option B). This block advertised four
          features with a live call-to-action and a COMMERCIAL NUMBER: "Revenue share — 30%
          recurring on every client you onboard", under a "Scale plan" chip.
          VERIFIED AGAINST THE CODE: none of it exists — no white-label, no sub-client portals,
          no custom branding, no kit; "Scale plan" appears in no pricing constant; and the
          partner system that DOES exist (routes/partners.ts) pays agency partners 25%, not 30%.
          The interest CTA is kept because the demand is real; every claim and figure is gone. */}
      <div className="border-t border-gray-100 pt-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-base">🏷️</span>
          <h2 className="font-semibold">Agency &amp; white-label</h2>
          <span className="ml-2 text-xs font-medium text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-200">
            In development
          </span>
        </div>
        <p className="text-sm text-[#9B8EC4] mb-3">
          Running M&amp;V for your own clients, under your own brand, is something we are building — it is not available yet.
        </p>
        <p className="text-xs text-[#9B8EC4]">
          Want to be told when it is ready? Email <span className="text-[#7C3AED]">hello@get-kind.com</span> with subject &quot;Agency partnership&quot; and we will come back to you with terms when there are terms to give.
        </p>
      </div>

      {/* Team */}
      {clientId && (
        <div className="border-t border-gray-100 pt-6" id="team">
          <TeamSection clientId={clientId} userRole={userRole} />
        </div>
      )}
    </div>
    </div>
  )
}
