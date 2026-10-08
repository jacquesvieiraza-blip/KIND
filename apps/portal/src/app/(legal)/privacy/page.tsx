import Link from 'next/link'
import { Zap } from 'lucide-react'

export const metadata = { title: 'Privacy Policy — K.I.N.D', description: 'KIND AI Platform Privacy Policy' }

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-100 px-8 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-gray-900">
          <Zap className="w-5 h-5 text-[#7C3AED]" />K.I.N.D
        </Link>
        <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Back to dashboard →</Link>
      </header>
      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
        <p className="text-gray-500 text-sm mb-8">Last updated: 8 October 2026</p>

        <div className="prose prose-gray max-w-none space-y-8 text-sm text-gray-700 leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">1. Who we are</h2>
            {/* ⛓️ 8 Oct (precision model; founder, 7 Oct: "we target US only as a start") — follows the full Privacy Policy. */}
            <p>K.I.N.D Technologies Ltd (&ldquo;K.I.N.D&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;) operates Milla &amp; Vida. We are registered in England &amp; Wales (Company No. 17260532). We are a data controller under UK GDPR, and act as a data processor on behalf of clients for the business contacts we find and write to. The people we contact for clients are currently in the United States.</p>
            <p className="mt-2">Contact: <a href="mailto:hello@get-kind.com" className="text-[#7C3AED] hover:underline">hello@get-kind.com</a></p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">2. Data we collect</h2>
            <p><strong>Client account data:</strong> name, email, company, country, billing details. Used to provide and bill for the service.</p>
            <p className="mt-2"><strong>Prospect data:</strong> names, work emails, job titles and company details of business contacts, sourced from Apollo.io, and the public business facts that give a dated reason to get in touch, from public sources such as company announcements, news and job postings. Processed on behalf of clients under our Data Processing Agreement.</p>
            <p className="mt-2"><strong>Usage data:</strong> platform activity, API calls, feature usage. Used for service improvement and billing accuracy.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">3. How we use your data</h2>
            <ul className="list-disc ml-4 space-y-1.5">
              <li>Deliver and improve the Platform</li>
              <li>Process payments via Stripe</li>
              <li>Comply with legal obligations (UK GDPR, the CAN-SPAM Act, CCPA)</li>
              <li>Send service communications (not marketing without consent)</li>
              <li>Generate AI-powered features using Anthropic's Claude API</li>
            </ul>
            {/* ⚑ 6 Oct (11b · founder "3 yes", "4 not material") — Google's Limited Use disclosure, required for app verification. */}
            <h3 className="font-semibold text-gray-900 mt-4 mb-2">Google Calendar</h3>
            <p>If you connect your Google Calendar, Milla &amp; Vida uses it only to book the meetings your prospects choose: we read your free/busy times and your calendar&apos;s time zone, create the meeting your prospect picks in your calendar, and read your Google account&apos;s email address so you are invited to it. We do not read the titles, descriptions, attendees or locations of your other events, and we do not change or delete them. Google user data is not sold, not used for advertising, not used to train AI models, and is not shared with anyone except to provide this booking feature. You can disconnect at any time in Milla → Settings, or at myaccount.google.com/permissions. Milla &amp; Vida&apos;s use and transfer of information received from Google APIs adheres to the <a href="https://developers.google.com/terms/api-services-user-data-policy" className="text-[#7C3AED] hover:underline">Google API Services User Data Policy</a>, including the Limited Use requirements.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">4. Data hosting & transfers</h2>
            <p>Client and platform data is stored on <strong>Supabase</strong> in the <strong>eu-west-1 region (Dublin, Ireland)</strong>, and processed by application servers on <strong>Railway</strong> in its <strong>US West region</strong> (SOC 2-audited infrastructure). AI features use <strong>Anthropic&apos;s Claude API</strong> (US-based), which receives only the business-contact details each task needs, such as a prospect&apos;s name, role, company and reply text. Payments are processed by <strong>Stripe</strong> (PCI DSS Level 1 certified).</p>
            <p className="mt-2">Where data crosses borders, K.I.N.D applies appropriate safeguards.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">5. Your rights</h2>
            <p><strong>Under UK GDPR (wherever you live):</strong> right to access, rectification, erasure, portability, restriction, object to processing; right to lodge a complaint with the ICO.</p>
            <p className="mt-2"><strong>If we have emailed you:</strong> right to stop all further email from us, on any client&apos;s behalf, honoured permanently, and to ask where we got your details and why we contacted you.</p>
            <p className="mt-2"><strong>Under CCPA (California, US):</strong> right to know, delete, opt-out of sale of personal information. KIND does not sell personal information.</p>
            <p className="mt-2">To exercise any right: <a href="mailto:hello@get-kind.com" className="text-[#7C3AED] hover:underline">hello@get-kind.com</a> — we respond within 30 days.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">6. Prospect data & opt-outs</h2>
            <p>Prospect contact details come from Apollo.io, a licensed B2B data provider, and the dated reason we get in touch from public sources such as company announcements, news and job postings. Our platform keeps a permanent opt-out list: anyone who asks not to be contacted is blocked across all clients and never contacted again, unless they explicitly opt back in.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">7. Retention</h2>
            <p>Account data: held for the duration of your account and for 90 days after it closes. Prospect personal data: deleted 90 days after it was last used for a client, and in any case no longer than 90 days after the client&apos;s account closes. Billing records: 7 years (UK tax law). Opt-out records: kept permanently, in order to honour the opt-out.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">8. Cookies</h2>
            <p>The Platform uses essential cookies only (session management, authentication). No advertising or tracking cookies are used.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">9. Changes</h2>
            <p>Material changes to this policy are notified to active clients by email at least 14 days before they take effect.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">10. Contact</h2>
            <p>Data protection enquiries: <a href="mailto:hello@get-kind.com" className="text-[#7C3AED] hover:underline">hello@get-kind.com</a><br />
            General enquiries: <a href="mailto:hello@get-kind.com" className="text-[#7C3AED] hover:underline">hello@get-kind.com</a></p>
          </section>
        </div>
      </main>
      <footer className="border-t border-gray-100 px-8 py-6 text-center text-xs text-gray-400">
        © 2026 K.I.N.D AI · <Link href="/terms" className="hover:text-gray-600">Terms & Conditions</Link> · <Link href="/dashboard" className="hover:text-gray-600">Dashboard</Link>
      </footer>
    </div>
  )
}
