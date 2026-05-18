'use client'

import { useState } from 'react'
import { CheckCircle, Circle, ExternalLink, AlertTriangle, Rocket } from 'lucide-react'

interface CheckItem {
  id: string
  label: string
  detail: string
  link?: { text: string; url: string }
  critical: boolean
}

const SECTIONS: { title: string; items: CheckItem[] }[] = [
  {
    title: '1. Supabase — Migrations',
    items: [
      { id: 'sb-schema',      label: 'Run schema.sql',                            detail: 'packages/db/src/schema.sql → Supabase SQL Editor', critical: true },
      { id: 'sb-001',         label: 'Run 001_icps_last_run_at.sql',               detail: 'packages/db/src/migrations/001_icps_last_run_at.sql', critical: true },
      { id: 'sb-002',         label: 'Run 002_figsy.sql',                          detail: 'packages/db/src/migrations/002_figsy.sql', critical: true },
      { id: 'sb-003',         label: 'Run 003_crm_integration.sql',                detail: 'packages/db/src/migrations/003_crm_integration.sql', critical: true },
      { id: 'sb-004',         label: 'Run 004_figsy_crm_deal.sql',                 detail: 'packages/db/src/migrations/004_figsy_crm_deal.sql', critical: true },
      { id: 'sb-005',         label: 'Run 005_partners.sql',                       detail: 'packages/db/src/migrations/005_partners.sql', critical: true },
      { id: 'sb-006',         label: 'Run 006_voice_calls.sql',                    detail: 'packages/db/src/migrations/006_voice_calls.sql', critical: false },
      { id: 'sb-007',         label: 'Run 007_calendar.sql',                       detail: 'packages/db/src/migrations/007_calendar.sql', critical: false },
      { id: 'sb-008',         label: 'Run 008_milla.sql',                          detail: 'packages/db/src/migrations/008_milla.sql', critical: false },
      { id: 'sb-009',         label: 'Run 009_vida.sql',                           detail: 'packages/db/src/migrations/009_vida.sql', critical: false },
      { id: 'sb-credits',     label: 'Run 20260513_credit_transactions.sql',       detail: 'supabase/migrations/20260513_credit_transactions.sql', critical: true },
      { id: 'sb-referral',    label: 'Run 20260513_referral_credits.sql',          detail: 'supabase/migrations/20260513_referral_credits.sql', critical: true },
      { id: 'sb-terms',       label: 'Run 20260514_terms_acceptance.sql',          detail: 'supabase/migrations/20260514_terms_acceptance.sql', critical: true },
      { id: 'sb-contact',     label: 'Run 20260517_contact_requests.sql',          detail: 'supabase/migrations/20260517_contact_requests.sql', critical: false },
      { id: 'sb-waitlist',    label: 'Run 20260517_product_waitlist.sql',          detail: 'supabase/migrations/20260517_product_waitlist.sql', critical: false },
      { id: 'sb-rls',         label: 'Run 20260518_enable_rls.sql ✅ done',        detail: 'supabase/migrations/20260518_enable_rls.sql — re-enables RLS on clients + icps', critical: true },
      { id: 'sb-demo',        label: 'Run 20260518_demo_environments.sql ✅ done', detail: 'supabase/migrations/20260518_demo_environments.sql — adds demo columns to clients', critical: true },
      { id: 'sb-credits-rls', label: 'Run 20260518_credit_transactions_rls.sql — CRITICAL, run now', detail: 'supabase/migrations/20260518_credit_transactions_rls.sql — enables RLS on credit_transactions', critical: true },
      { id: 'sb-reg',         label: 'Run 20260518_company_registration.sql',      detail: 'supabase/migrations/20260518_company_registration.sql — adds company_registration + vat_number to clients', critical: false },
      { id: 'sb-site-url',    label: 'Set Site URL → https://app.get-kind.com',   detail: 'Supabase → Auth → URL Configuration', critical: true },
      { id: 'sb-redirect',    label: 'Add redirect URL → https://app.get-kind.com/auth/callback', detail: 'Same page as Site URL', critical: true },
      { id: 'sb-bucket',      label: 'Create storage bucket: agreement-templates (public)', detail: 'Supabase → Storage → New bucket', critical: true },
    ],
  },
  {
    title: '2. Google Workspace',
    items: [
      { id: 'gws-create',   label: 'Create Google Workspace account for get-kind.com', detail: 'workspace.google.com → Get started → Business Starter → verify get-kind.com domain', link: { text: 'Start setup', url: 'https://workspace.google.com/intl/en/landing/partners/referral/gmailforwork.html' }, critical: true },
      { id: 'gws-mx',       label: 'Add Google MX records to your DNS', detail: 'Domain registrar → DNS → add the 5 MX records Google provides during setup. Propagation takes up to 48h', critical: true },
      { id: 'gws-verify',   label: 'Verify domain ownership with TXT record', detail: 'Google Workspace setup gives you a TXT record → add to DNS → click Verify', critical: true },
      { id: 'gws-hello',    label: 'Create hello@get-kind.com mailbox', detail: 'Google Admin Console → Users → Add user — this is your primary support + sales inbox', critical: true },
      { id: 'gws-privacy',  label: 'Create privacy@kind.ai (or alias to hello@get-kind.com)', detail: 'Required for POPIA privacy requests — referenced in the Privacy Policy', critical: true },
      { id: 'gws-spf',      label: 'Add SPF record for Google', detail: 'DNS TXT record: v=spf1 include:_spf.google.com ~all — add alongside any existing SPF (merge into one record)', critical: true },
      { id: 'gws-dkim',     label: 'Enable DKIM signing in Google Admin', detail: 'Google Admin → Apps → Gmail → Authenticate email → Generate DKIM key → add to DNS', critical: true },
      { id: 'gws-dmarc',    label: 'Add DMARC record', detail: 'DNS TXT record on _dmarc.get-kind.com: v=DMARC1; p=none; rua=mailto:hello@get-kind.com — prevents spoofing', critical: true },
      { id: 'gws-figsy',    label: 'Do NOT send FIGSY outreach from Google Workspace', detail: 'FIGSY uses Resend (replies@get-kind.com) — keep separate to protect your domain reputation', critical: false },
    ],
  },
  {
    title: '3. Railway — Environment Variables',
    items: [
      { id: 'rv-supabase-url',      label: 'SUPABASE_URL',              detail: 'Supabase → Settings → API → Project URL', critical: true },
      { id: 'rv-supabase-key',      label: 'SUPABASE_SERVICE_ROLE_KEY', detail: 'Supabase → Settings → API → service_role key', critical: true },
      { id: 'rv-anthropic',         label: 'ANTHROPIC_API_KEY',         detail: 'console.anthropic.com → API Keys', critical: true },
      { id: 'rv-apollo',            label: 'APOLLO_API_KEY',            detail: 'app.apollo.io → Settings → Integrations → API Keys', critical: true },
      { id: 'rv-resend',            label: 'RESEND_API_KEY',            detail: 'resend.com → API Keys', critical: true },
      { id: 'rv-paystack-secret',   label: 'PAYSTACK_SECRET_KEY',       detail: 'dashboard.paystack.com → Settings → API Keys (use LIVE key after KYC)', critical: true },
      { id: 'rv-paystack-webhook',  label: 'PAYSTACK_WEBHOOK_SECRET',   detail: 'dashboard.paystack.com → Settings → Webhooks', critical: true },
      { id: 'rv-admin-key',         label: 'ADMIN_SECRET_KEY',          detail: 'Generate with: openssl rand -hex 32', critical: true },
      { id: 'rv-founder-email',     label: 'FOUNDER_EMAIL',             detail: 'Your hello@get-kind.com address (after Workspace set up)', critical: true },
      { id: 'rv-figsy-reply-to',    label: 'FIGSY_REPLY_TO=replies@get-kind.com', detail: 'Must match Resend inbound routing domain', critical: true },
      { id: 'rv-figsy-limit',       label: 'FIGSY_DAILY_SEND_LIMIT=20', detail: 'Increase after domain warming (week 2: 50, week 3: 100)', critical: true },
      { id: 'rv-portal-url',        label: 'PORTAL_URL=https://app.get-kind.com', detail: 'Used for magic links and email redirects', critical: true },
      { id: 'rv-google-id',         label: 'GOOGLE_CLIENT_ID',          detail: 'console.cloud.google.com → APIs → Credentials → OAuth 2.0', critical: false },
      { id: 'rv-google-secret',     label: 'GOOGLE_CLIENT_SECRET',      detail: 'Same as above', critical: false },
      { id: 'rv-google-redirect',   label: 'GOOGLE_REDIRECT_URI=https://kindapi-production-e64c.up.railway.app/calendar/callback', detail: 'Must match Google Console redirect URI', critical: false },
      { id: 'rv-vapi-key',          label: 'VAPI_API_KEY',              detail: 'app.vapi.ai → Account → API Keys', critical: false },
      { id: 'rv-vapi-phone',        label: 'VAPI_PHONE_NUMBER_ID',      detail: 'Vapi dashboard → Phone Numbers → copy ID of your Twilio SA number', critical: false },
      { id: 'rv-vapi-assistant',    label: 'VAPI_ASSISTANT_ID',         detail: 'Vapi dashboard → Assistants → FIGSY → copy ID', critical: false },
      { id: 'rv-vapi-webhook',      label: 'VAPI_WEBHOOK_SECRET',       detail: 'Vapi dashboard → Webhooks → set a secret', critical: false },
      { id: 'rv-wa-token',          label: 'WHATSAPP_TOKEN',            detail: 'Meta Business Manager → WhatsApp → API Setup → token', critical: false },
      { id: 'rv-wa-phone',          label: 'WHATSAPP_PHONE_NUMBER_ID',  detail: 'Meta Business Manager → WhatsApp → API Setup → Phone number ID', critical: false },
      { id: 'rv-wa-verify',         label: 'WHATSAPP_VERIFY_TOKEN',     detail: 'Choose any string — set in Meta webhook config and Railway', critical: false },
    ],
  },
  {
    title: '4. Railway — Cron Jobs',
    items: [
      { id: 'cron-nurture', label: 'POST /internal/ae/nurture — 0 8 * * *',        detail: 'Trial nurture emails (days 1, 3, 5, 7, 10)', critical: true },
      { id: 'cron-at-risk', label: 'POST /internal/ae/at-risk — 0 8 * * *',        detail: 'At-risk client alerts (no ICP after 3 days)', critical: true },
      { id: 'cron-expiry',  label: 'POST /internal/ae/trial-expiry — 0 8 * * *',   detail: 'Trial expiry emails (day 10, 12, 14)', critical: true },
      { id: 'cron-figsy',   label: 'POST /figsy/send-due — 0 8 * * *',             detail: 'FIGSY step 2 + 3 send queue', critical: true },
      { id: 'cron-digest',  label: 'POST /internal/digest/weekly — 0 7 * * 1',     detail: 'Weekly leads digest to clients (Monday 7am)', critical: true },
      { id: 'cron-cro',     label: 'POST /internal/cro/weekly-digest — 0 7 * * 1', detail: 'Weekly founder dashboard digest (Monday 7am)', critical: true },
    ],
  },
  {
    title: '5. Paystack',
    items: [
      { id: 'ps-kyc',     label: 'Complete Paystack KYC verification',   detail: 'dashboard.paystack.com → Settings → Compliance — required to accept live payments', link: { text: 'Open Paystack', url: 'https://dashboard.paystack.com/#/settings/compliance' }, critical: true },
      { id: 'ps-live',    label: 'Switch to LIVE key after KYC approval', detail: 'Paystack → Settings → API Keys → copy Live Secret Key → update PAYSTACK_SECRET_KEY in Railway', critical: true },
      { id: 'ps-webhook', label: 'Set webhook URL',                       detail: 'dashboard.paystack.com → Settings → Webhooks → https://kindapi-production-e64c.up.railway.app/webhooks/paystack', link: { text: 'Open Paystack', url: 'https://dashboard.paystack.com/#/settings/developer' }, critical: true },
    ],
  },
  {
    title: '6. Resend',
    items: [
      { id: 'resend-domain',   label: 'Verify get-kind.com domain in Resend',          detail: 'Add DKIM + SPF DNS records from Resend to your domain registrar', critical: true },
      { id: 'resend-inbound',  label: 'Configure inbound routing for replies@get-kind.com', detail: 'resend.com → Domains → Inbound → add route → webhook: https://kindapi-production-e64c.up.railway.app/figsy/replies/inbound', link: { text: 'Open Resend', url: 'https://resend.com/domains' }, critical: true },
    ],
  },
  {
    title: '7. Vercel — Portal (app.get-kind.com)',
    items: [
      { id: 'v-portal-url',    label: 'NEXT_PUBLIC_API_URL=https://kindapi-production-e64c.up.railway.app', detail: 'Vercel → portal project → Environment Variables', critical: true },
      { id: 'v-portal-sb-url', label: 'NEXT_PUBLIC_SUPABASE_URL',       detail: 'Supabase → Settings → API → Project URL', critical: true },
      { id: 'v-portal-sb-anon',label: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',  detail: 'Supabase → Settings → API → anon key', critical: true },
      { id: 'v-portal-branch', label: 'Production branch set to: main',  detail: 'Vercel → portal → Settings → Environments → Production → Branch Tracking', critical: true },
      { id: 'v-portal-domain', label: 'Custom domain: app.get-kind.com', detail: 'Vercel → portal → Domains → add app.get-kind.com', critical: true },
    ],
  },
  {
    title: '8. Vercel — Admin (admin.get-kind.com)',
    items: [
      { id: 'v-admin-sb-url',  label: 'NEXT_PUBLIC_SUPABASE_URL',       detail: 'Supabase → Settings → API → Project URL', critical: true },
      { id: 'v-admin-sb-key',  label: 'SUPABASE_SERVICE_ROLE_KEY',      detail: 'Supabase → Settings → API → service_role key', critical: true },
      { id: 'v-admin-secret',  label: 'ADMIN_SECRET_KEY',               detail: 'Same value as Railway ADMIN_SECRET_KEY', critical: true },
      { id: 'v-admin-branch',  label: 'Production branch set to: main', detail: 'Vercel → admin → Settings → Environments → Production → Branch Tracking', critical: true },
    ],
  },
  {
    title: '9. Book a Demo — Booking Link',
    items: [
      { id: 'demo-link', label: 'Create calendar booking page (Calendly or Cal.com)', detail: 'Set up a 30-min demo slot — update all "Book a Demo" buttons on the website and portal locked screens to point to your booking URL', critical: true },
    ],
  },
  {
    title: '10. Google Cloud Console (for Calendar Integration)',
    items: [
      { id: 'gc-project',      label: 'Create a Google Cloud project', detail: 'console.cloud.google.com → New Project → K.I.N.D', link: { text: 'Open Google Console', url: 'https://console.cloud.google.com' }, critical: false },
      { id: 'gc-calendar-api', label: 'Enable Google Calendar API',    detail: 'APIs & Services → Enable APIs → search Calendar API → Enable', critical: false },
      { id: 'gc-oauth',        label: 'Create OAuth 2.0 credentials',  detail: 'APIs & Services → Credentials → Create → OAuth client ID → Web Application', critical: false },
      { id: 'gc-redirect',     label: 'Add redirect URI: https://kindapi-production-e64c.up.railway.app/calendar/callback', detail: 'In the OAuth client config', critical: false },
      { id: 'gc-consent',      label: 'Configure OAuth consent screen', detail: 'App name: K.I.N.D · Scopes: calendar.events, calendar.readonly, userinfo.email', critical: false },
    ],
  },
  {
    title: '11. Vapi.ai + Twilio (for Voice)',
    items: [
      { id: 'vapi-account',       label: 'Create Vapi.ai account',                  detail: 'vapi.ai → sign up', link: { text: 'Open Vapi.ai', url: 'https://vapi.ai' }, critical: false },
      { id: 'vapi-twilio',        label: 'Create Twilio account + buy SA +27 number', detail: 'twilio.com → buy number → South Africa → voice capable', link: { text: 'Open Twilio', url: 'https://www.twilio.com/console' }, critical: false },
      { id: 'vapi-twilio-connect',label: 'Connect Twilio to Vapi',                  detail: 'Vapi → Phone Numbers → Import → Twilio → enter SID + Auth Token', critical: false },
      { id: 'vapi-assistant',     label: 'Create FIGSY assistant in Vapi',           detail: 'Vapi → Assistants → New → name it FIGSY → note the Assistant ID', critical: false },
      { id: 'vapi-webhook-url',   label: 'Set Vapi webhook URL',                    detail: 'Vapi → Settings → Webhooks → https://kindapi-production-e64c.up.railway.app/voice/webhook', critical: false },
    ],
  },
  {
    title: '12. Meta WhatsApp Business API',
    items: [
      { id: 'meta-account',   label: 'Create Meta Business Manager account', detail: 'business.facebook.com → create account', link: { text: 'Open Meta Business', url: 'https://business.facebook.com' }, critical: false },
      { id: 'meta-app',       label: 'Create a Meta App → WhatsApp product', detail: 'developers.facebook.com → My Apps → Create App → Business', link: { text: 'Open Meta Developers', url: 'https://developers.facebook.com' }, critical: false },
      { id: 'meta-phone',     label: 'Add a phone number to WhatsApp Business', detail: 'Must be a number not previously used with WhatsApp', critical: false },
      { id: 'meta-webhook',   label: 'Set webhook URL in Meta App', detail: 'WhatsApp → Configuration → Webhook → https://kindapi-production-e64c.up.railway.app/whatsapp/webhook · Verify token = WHATSAPP_VERIFY_TOKEN', critical: false },
      { id: 'meta-subscribe', label: 'Subscribe to messages webhook field', detail: 'Meta App → WhatsApp → Webhook fields → messages → Subscribe', critical: false },
    ],
  },
  {
    title: '13. Smoke Test (do last)',
    items: [
      { id: 'sm-signup',    label: 'Sign up at get-kind.com',                   detail: 'Click Sign Up → redirects to app.get-kind.com/login → fills email + password → signs up', critical: true },
      { id: 'sm-onboard',   label: 'Complete onboarding',                       detail: 'No email confirmation — lands directly on /onboard → fills company name, industry, country, website → Start free trial', critical: true },
      { id: 'sm-dashboard', label: 'Dashboard loads with company name + stats', detail: 'Greeting shows company name, stat cards visible, credit balance shown, no empty screen', critical: true },
      { id: 'sm-icp',       label: 'Create ICP — try AI Suggest button',        detail: 'Click "Suggest ICP with AI" → fields auto-fill → review → Save & Find Leads', critical: true },
      { id: 'sm-leads',     label: 'Leads appear within minutes',               detail: 'Leads table shows scored leads with Apollo data', critical: true },
      { id: 'sm-consent',   label: 'Send POPIA consent to one lead',            detail: 'Email arrives, lead status updates to consent_sent', critical: true },
      { id: 'sm-export',    label: 'Export leads as CSV',                       detail: 'File downloads with correct columns', critical: true },
      { id: 'sm-billing',   label: 'Billing → buy credits',                    detail: 'Paystack opens (live key), returns, credit balance updates', critical: true },
      { id: 'sm-locked',    label: 'FIGSY / VA / Chatbot locked screens',       detail: 'Each shows Upgrade + Book a demo buttons', critical: true },
      { id: 'sm-health',    label: 'Sidebar shows green system health dot',     detail: '"All systems operational" at bottom of sidebar', critical: true },
      { id: 'sm-demo',      label: 'Create a demo environment in admin',        detail: 'Admin → Demo Envs → New Demo → leads appear → Open Demo opens portal in new tab', critical: true },
      { id: 'sm-credits',   label: 'Admin client page — grant credits',         detail: 'Admin → Clients → pick client → enter amount → Apply Credits → balance updates', critical: true },
      { id: 'sm-figsy',     label: 'Create a FIGSY campaign + enroll one lead', detail: 'Email sends, enrollment status = in_progress', critical: true },
      { id: 'sm-signout',   label: 'Sign out → sign back in',                  detail: 'Redirects to /login, signs back in, dashboard loads (no empty loop)', critical: true },
    ],
  },
]

export default function LaunchPage() {
  const [checked, setChecked] = useState<Record<string, boolean>>({})

  function toggle(id: string) {
    setChecked(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const allItems = SECTIONS.flatMap(s => s.items)
  const criticalItems = allItems.filter(i => i.critical)
  const doneCount = allItems.filter(i => checked[i.id]).length
  const criticalDone = criticalItems.filter(i => checked[i.id]).length
  const allCriticalDone = criticalDone === criticalItems.length

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Rocket className="w-6 h-6 text-indigo-600" /> Pre-Launch Checklist
          </h1>
          <p className="text-gray-500 text-sm mt-1">Complete before going live. Critical items must all be done first.</p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-black text-gray-900">{doneCount}/{allItems.length}</div>
          <div className="text-xs text-gray-400">items complete</div>
          {allCriticalDone && (
            <div className="mt-1 text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded-full">
              All critical done — ready to launch
            </div>
          )}
        </div>
      </div>

      <div className="w-full bg-gray-100 rounded-full h-2">
        <div className="bg-indigo-600 h-2 rounded-full transition-all" style={{ width: `${(doneCount / allItems.length) * 100}%` }} />
      </div>

      {!allCriticalDone && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">{criticalItems.length - criticalDone} critical items remaining</p>
            <p className="text-xs text-amber-600 mt-0.5">Complete all critical items before going live.</p>
          </div>
        </div>
      )}

      {SECTIONS.map(section => (
        <div key={section.title} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-50 bg-gray-50/50">
            <h2 className="font-semibold text-gray-800">{section.title}</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {section.items.map(item => (
              <div key={item.id} onClick={() => toggle(item.id)}
                className="flex items-start gap-4 px-6 py-4 cursor-pointer hover:bg-gray-50/60 transition-colors">
                <div className="mt-0.5 shrink-0">
                  {checked[item.id] ? <CheckCircle className="w-5 h-5 text-green-500" /> : <Circle className="w-5 h-5 text-gray-300" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`text-sm font-medium ${checked[item.id] ? 'line-through text-gray-400' : 'text-gray-800'}`}>{item.label}</p>
                    {item.critical && !checked[item.id] && (
                      <span className="text-xs font-semibold text-red-500 bg-red-50 px-1.5 py-0.5 rounded shrink-0">required</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{item.detail}</p>
                  {item.link && (
                    <a href={item.link.url} target="_blank" rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 mt-1">
                      <ExternalLink className="w-3 h-3" /> {item.link.text}
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <p className="text-center text-xs text-gray-400 pb-8">
        Progress resets on page refresh — this is a reference checklist, not persistent state.
      </p>
    </div>
  )
}
