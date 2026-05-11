import Link from 'next/link'
import { Zap } from 'lucide-react'

export const metadata = { title: 'Privacy Policy — K.I.N.D', description: 'KIND AI Platform Privacy Policy' }

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-100 px-8 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-gray-900">
          <Zap className="w-5 h-5 text-[#0066FF]" />K.I.N.D
        </Link>
        <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Back to dashboard →</Link>
      </header>
      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
        <p className="text-gray-500 text-sm mb-8">Last updated: May 2026</p>

        <div className="prose prose-gray max-w-none space-y-8 text-sm text-gray-700 leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">1. Who we are</h2>
            <p>K.I.N.D AI (Pty) Ltd ("KIND") operates the KIND AI Platform. We are a responsible party under POPIA and, where applicable, a data controller under GDPR. Registered address: South Africa.</p>
            <p className="mt-2">Contact: <a href="mailto:privacy@kind.ai" className="text-[#0066FF] hover:underline">privacy@kind.ai</a></p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">2. Data we collect</h2>
            <p><strong>Client account data:</strong> name, email, company, country, billing details. Used to provide and bill for the service.</p>
            <p className="mt-2"><strong>Lead data:</strong> names, emails, job titles, company details of B2B leads sourced via Apollo. Processed on behalf of clients in accordance with the POPIA Compliant Process document.</p>
            <p className="mt-2"><strong>Usage data:</strong> platform activity, API calls, feature usage. Used for service improvement and billing accuracy.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">3. How we use your data</h2>
            <ul className="list-disc ml-4 space-y-1.5">
              <li>Deliver and improve the Platform</li>
              <li>Process payments via Paystack</li>
              <li>Comply with legal obligations (POPIA, GDPR, ECTA)</li>
              <li>Send service communications (not marketing without consent)</li>
              <li>Generate AI-powered features using Anthropic's Claude API</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">4. Data hosting & transfers</h2>
            <p>Client and platform data is hosted on <strong>Supabase</strong> (PostgreSQL database hosted on AWS in the EU region — <strong>eu-west-1, Ireland</strong>). AI features use <strong>Anthropic's API</strong> (US-based). Payments are processed by <strong>Paystack</strong> (Nigeria/South Africa).</p>
            <p className="mt-2">Where data is transferred outside South Africa or the EU, KIND ensures appropriate safeguards are in place (SCCs for GDPR, POPIA section 72 conditions for cross-border transfers).</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">5. Your rights</h2>
            <p><strong>Under POPIA:</strong> right to access, correct, delete your personal information; right to object to processing; right to lodge a complaint with the Information Regulator (South Africa).</p>
            <p className="mt-2"><strong>Under GDPR (EU/UK users):</strong> right to access, rectification, erasure, portability, restriction, object to processing; right to lodge a complaint with your national supervisory authority.</p>
            <p className="mt-2"><strong>Under CCPA (California, US):</strong> right to know, delete, opt-out of sale of personal information. KIND does not sell personal information.</p>
            <p className="mt-2">To exercise any right: <a href="mailto:privacy@kind.ai" className="text-[#0066FF] hover:underline">privacy@kind.ai</a> — we respond within 30 days.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">6. Lead data & opt-outs</h2>
            <p>Lead data is sourced via Apollo.io, which maintains its own consent infrastructure. KIND's platform enforces a permanent opt-out blocklist — any lead who requests to not be contacted is blocked across all clients and never re-surfaced, unless they explicitly opt back in.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">7. Retention</h2>
            <p>Client account data: retained for the duration of the contract + 5 years for legal compliance. Lead data: retained while the client account is active + 1 year. Opt-out blocklist: permanent (by law — deleted data cannot serve as a blocklist). Signed agreements: permanent record.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">8. Cookies</h2>
            <p>The Platform uses essential cookies only (session management, authentication). No advertising or tracking cookies are used.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">9. Changes</h2>
            <p>Material changes to this policy will be notified to clients by email 30 days before taking effect.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">10. Contact</h2>
            <p>Data protection enquiries: <a href="mailto:privacy@kind.ai" className="text-[#0066FF] hover:underline">privacy@kind.ai</a><br />
            General enquiries: <a href="mailto:hello@kind.ai" className="text-[#0066FF] hover:underline">hello@kind.ai</a></p>
          </section>
        </div>
      </main>
      <footer className="border-t border-gray-100 px-8 py-6 text-center text-xs text-gray-400">
        © 2026 K.I.N.D AI · <Link href="/terms" className="hover:text-gray-600">Terms & Conditions</Link> · <Link href="/dashboard" className="hover:text-gray-600">Dashboard</Link>
      </footer>
    </div>
  )
}
