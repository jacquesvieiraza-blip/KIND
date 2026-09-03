export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/Sidebar'
import { SidebarSlim } from '@/components/layout/SidebarSlim'
import { TrialExpiredOverlay } from '@/components/ui/TrialExpiredOverlay'
import { LowCreditsNotice } from '@/components/ui/LowCreditsNotice'
import { OnboardingProvider } from '@/components/onboarding/OnboardingProvider'
import { OnboardingOrchestrator } from '@/components/onboarding/OnboardingOrchestrator'
import { KeepFigsyFundedNudge } from '@/components/onboarding/KeepFigsyFundedNudge'
import { CommandPalette } from '@/components/ui/CommandPalette'
import { VidaHelpBubble } from '@/components/ui/VidaHelpBubble'
import { MilestoneCelebration } from '@/components/ui/MilestoneCelebration'
import { AgentColumn } from './AgentColumn'
import { ProfileMenu } from '@/components/layout/ProfileMenu'
import { v2Enabled } from '@/lib/flags'
import { NotificationBell } from '@/components/ui/NotificationBell'
import { Zap, FlaskConical } from 'lucide-react'

const IS_STAGING = process.env.NEXT_PUBLIC_IS_STAGING === 'true'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  let trialExpired      = false
  let creditBalance     = 0
  let figsyCredits      = 0
  let hasFigsy          = false
  let hasMilla          = false
  let hasVida           = false
  let hasDenise         = false
  let leadCount         = 0
  let companyName       = ''
  let isPartner         = false
  let partnerStatus     = ''
  let partnerDealCount  = 0

  // Check partner status via API — the only reliable method since the partners
  // table RLS uses a subquery that fails with the session client in server components
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token) {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://kindapi-production-e64c.up.railway.app'
      const partnerRes = await fetch(`${apiUrl}/partners/me`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
        signal: AbortSignal.timeout(4000),
      })
      if (partnerRes.ok) {
        isPartner = true
        try {
          const pData = await partnerRes.json()
          partnerStatus    = pData?.partner?.status ?? 'active'
          partnerDealCount = (pData?.deals ?? []).length
        } catch { /* non-critical */ }
      }
    }
  } catch { isPartner = false }

  let clientRowExists = false
  let clientQueryFailed = false
  try {
    const { data: clientRow, error: clientErr } = await supabase
      .from('clients')
      .select('id, credit_balance, figsy_credits_remaining, company_name, company_id, seat_role, enabled_agents, subscriptions(*)')
      .eq('user_id', user.id)
      .maybeSingle()

    // A query ERROR (e.g. a transient PostgREST schema-cache miss right after a
    // migration adds columns) is NOT the same as "no account". Treating it as
    // "no account" bounced real users to /onboard, which redirected back to
    // /dashboard → infinite loop. Record the failure so the onboarding gate below
    // only fires on a confirmed-empty result.
    if (clientErr) {
      clientQueryFailed = true
      console.error('[dashboard-layout] clients lookup failed:', clientErr.message)
    }

    if (clientRow) {
      clientRowExists = true
      creditBalance = clientRow.credit_balance ?? 0
      figsyCredits = (clientRow as { figsy_credits_remaining?: number }).figsy_credits_remaining ?? 0
      companyName = (clientRow as { company_name?: string }).company_name ?? ''
      const subs = (clientRow.subscriptions as { status: string; product?: string; trial_ends_at?: string }[]) ?? []

      const isLive = (p: string) => subs.some(s => s.product === p && (s.status === 'active' || s.status === 'trialing'))
      // Company reps get their agent access from the owner-controlled enabled_agents
      // list (per-rep unlock). Solo accounts keep the subscription-based gating —
      // so existing production clients are completely unaffected.
      const isRep = !!(clientRow as { company_id?: string; seat_role?: string }).company_id && (clientRow as { seat_role?: string }).seat_role === 'rep'
      const enabled = ((clientRow as { enabled_agents?: string[] }).enabled_agents) ?? []
      hasFigsy  = isLive('lead_gen_figsy') || isLive('figsy_addon') || (isRep && enabled.includes('figsy'))
      hasMilla  = isLive('virtual_assistant') || (isRep && enabled.includes('milla'))
      hasVida   = isLive('chatbot') || (isRep && enabled.includes('vida'))
      hasDenise = isLive('denise') || isLive('denise_addon') || (isRep && enabled.includes('denise'))

      const hasAny = subs.some((s) => s.status === 'active')
      if (!hasAny) {
        const trialing = subs.find((s) => s.status === 'trialing')
        if (trialing?.trial_ends_at) {
          const daysLeft = Math.ceil((new Date(trialing.trial_ends_at).getTime() - Date.now()) / 86400000)
          trialExpired = daysLeft <= 0
        }
      }

      // Lead count for FIGSY context messages
      const { count } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', clientRow.id)
      leadCount = count ?? 0
    }
  } catch (e) {
    clientQueryFailed = true
    console.error('[dashboard-layout] clients lookup threw:', e)
  }

  // Onboarding gate: a logged-in user with NO client row (and who isn't a
  // partner) has abandoned onboarding — send them back to finish it instead of
  // stranding them on a half-broken dashboard. Redirect MUST be outside the
  // try/catch above (it throws NEXT_REDIRECT which the empty catch would eat).
  // CRITICAL: only redirect on a CONFIRMED-empty result (query succeeded, no row).
  // Never redirect when the lookup failed — that caused an onboard⇄dashboard loop.
  if (!clientRowExists && !clientQueryFailed && !isPartner) redirect('/onboard')

  const isNewUser = leadCount === 0

  // ── 🛑 3 Sep (C2) · ONE RULE: THE RETIRED WALLET CHROME IS NOT SHOWN TO A PROGRAMME CLIENT
  //
  // WHAT IS ACTUALLY REACHABLE HERE. `middleware.ts` redirects every signed-in user away from
  // `/dashboard` and `/dashboard/*` into the matching `/milla` screen — EXCEPT the three
  // persona sub-trees it keeps: `partner`, `developer` and `client-partner`. So this layout is
  // still rendered, and `(milla)/layout.tsx` actively SENDS a seat holder here. A client on the
  // programme model who holds a partner or developer seat therefore reads, in this shell:
  // "Low credits: 3 remaining · Top up now", "Your wallet is empty … a flat $4 per approved
  // lead", "Add credits to continue using K.I.N.D", and a wallet chip whose tooltip says
  // "$4 per approved lead". Every one of those is the retired per-lead model.
  //
  // ⚠️ ONE BOOLEAN, COMPUTED ONCE, rather than a condition per sentence. Scattered copy
  // conditions are how one of them gets missed on the next edit; a single gate on the shell is
  // the rule, and the pieces below simply obey it.
  //
  // ⚠️ NOTHING CHANGES FOR A LEGACY OR UNCLASSIFIED CLIENT. `commercial_model` is NULL for the
  // entire live book, so every element below renders exactly as it does today for all of them.
  // Only a client somebody has DECLARED `programme` stops seeing it.
  //
  // ⚠️ AND AN UNREADABLE MODEL SUPPRESSES, which is the same direction as every other C2
  // decision: "we could not tell" is never permission to teach retired economics. The cost of
  // suppressing is a missing funding nudge on one of two persona pages; the cost of showing it
  // is telling a paying programme client they owe money they do not.
  //
  // ⚠️ ITS OWN ISOLATED READ, DELIBERATELY. Adding the column to the big select above would
  // make a PostgREST schema-cache miss blank `hasFigsy`/`hasMilla`/the whole sidebar. This one
  // can only ever fail into "suppress".
  let retiredWalletChrome = false
  try {
    const { data: modelRow, error: modelErr } = await supabase
      .from('clients').select('commercial_model').eq('user_id', user.id).maybeSingle()
    retiredWalletChrome = !modelErr && !!modelRow
      && (modelRow as { commercial_model: string | null }).commercial_model !== 'programme'
  } catch { retiredWalletChrome = false }

  // Shared content (same for both layouts) — avoids duplication.
  // The OnboardingProvider wraps the dashboard so the guided tour (#454) + the
  // "keep FIGSY funded" nudge can read /onboarding/progress and follow the client
  // across routes. Partners have no client row → the tour simply never starts.
  const mainContent = (
    <OnboardingProvider>
      {/* "Add credits to continue using K.I.N.D" — a credit sentence, so it obeys the gate. */}
      {retiredWalletChrome && <TrialExpiredOverlay expired={trialExpired} />}
      <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 items-stretch lg:items-start max-w-7xl mx-auto w-full">
        <div className="flex-1 min-w-0 space-y-4">
          {/* "Low credits: N remaining · Top up now" */}
          {retiredWalletChrome && <LowCreditsNotice balance={creditBalance} />}
          {!isPartner && <MilestoneCelebration leadCount={leadCount} companyName={companyName} />}
          {children}
        </div>
        <AgentColumn
          hasFigsy={hasFigsy}
          hasMilla={hasMilla}
          hasVida={hasVida}
          hasDenise={hasDenise}
          leadCount={leadCount}
          creditBalance={creditBalance}
          isNewUser={isNewUser}
          partnerStatus={partnerStatus}
          partnerDealCount={partnerDealCount}
        />
      </div>
      {!isPartner && <OnboardingOrchestrator />}
      {/* "Your wallet is empty … a flat $4 per approved lead" */}
      {!isPartner && retiredWalletChrome && <KeepFigsyFundedNudge />}
    </OnboardingProvider>
  )

  const stagingBanner = IS_STAGING ? (
    <div className="flex items-center justify-center gap-2 bg-amber-400 text-amber-900 text-xs font-bold py-1.5 px-4 shrink-0">
      <FlaskConical className="w-3.5 h-3.5" />
      STAGING — test data only — changes here never affect production
    </div>
  ) : null

  // #496 — ESCAPE HATCH: a client here came from a Milla rail link (Insights/Company/etc.).
  // Never trap them in the old portal — always give the way back to Milla. (Partners have
  // their own portal and no Milla shell, so they don't get this.)
  const millaBanner = !isPartner ? (
    <a href="/milla" className="block shrink-0 text-center bg-gradient-to-r from-[#7C3AED] to-[#EC4899] text-white text-[13px] font-bold py-2 hover:opacity-90">
      ← Back to Milla
    </a>
  ) : null

  // ── SLIM LAYOUT (V2) — gated by FEATURE_V2_SCREENS=layout. OFF by default,
  //    so the live product is unchanged until the flag is flipped. ──────────────
  if (v2Enabled('layout')) {
    return (
      <div className="flex h-screen overflow-hidden bg-[#FAFAFE]">
        <SidebarSlim
          userEmail={user.email || ''}
          hasFigsy={hasFigsy}
          hasMilla={hasMilla}
          hasVida={hasVida}
          hasDenise={hasDenise}
          isPartner={isPartner}
        />
        <div className="flex-1 flex flex-col overflow-hidden">
          {stagingBanner}
          {millaBanner}
          <header className="h-14 bg-white border-b border-gray-100 flex items-center justify-end gap-3 px-6 shrink-0">
            {/* One wallet — a single $ balance. $4 per approved lead, final. Its own tooltip
                states the retired per-lead price, so it obeys the gate like everything else. */}
            {retiredWalletChrome && (
              <span className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1.5 rounded-full text-[#7C3AED] bg-purple-50" title="Wallet — $4 per approved lead">
                <Zap className="w-3.5 h-3.5" /> ${creditBalance.toLocaleString()} <span className="font-semibold text-[#7C3AED]/70">wallet</span>
              </span>
            )}
            <NotificationBell />
            <ProfileMenu name={companyName} email={user.email || ''} />
          </header>
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">{mainContent}</main>
        </div>
        <CommandPalette />
        <VidaHelpBubble />
      </div>
    )
  }

  // ── CURRENT LAYOUT (default, live today) ─────────────────────────────────────
  return (
    <div className="flex h-screen overflow-hidden bg-[#FAFAFE] flex-col">
      {stagingBanner}
      {millaBanner}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          userEmail={user.email || ''}
          creditBalance={creditBalance}
          figsyCredits={figsyCredits}
          hasFigsy={hasFigsy}
          hasMilla={hasMilla}
          hasVida={hasVida}
          hasDenise={hasDenise}
          isNewUser={isNewUser}
          isPartner={isPartner}
          showWallet={retiredWalletChrome}
        />
        <main className="flex-1 overflow-y-auto p-4 pt-[4.5rem] sm:p-6 sm:pt-[4.75rem] lg:p-8 lg:pt-8">
          {mainContent}
        </main>
      </div>
      <CommandPalette />
      <VidaHelpBubble />
    </div>
  )
}
