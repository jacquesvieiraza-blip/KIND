import Link from 'next/link'
import { Zap } from 'lucide-react'
import { PRECISION_SETUP_FEE_GBP, PRECISION_PER_HELD_MEETING_GBP, PRECISION_CLIENT_NOTICE_HOURS, formatGbpWhole } from '@kind/shared'

export const metadata = { title: 'Terms of Service — K.I.N.D', description: 'K.I.N.D Terms of Service' }

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-100 px-8 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-gray-900">
          <Zap className="w-5 h-5 text-[#7C3AED]" />K.I.N.D
        </Link>
        <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Back to dashboard →</Link>
      </header>
      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Terms of Service</h1>
        <p className="text-gray-500 text-sm mb-8">Last updated: 8 October 2026 · Full version at <a href="/terms.html" className="text-[#7C3AED] hover:underline">the full terms</a></p>

        <div className="prose prose-gray max-w-none space-y-8 text-sm text-gray-700 leading-relaxed">
          {/* ⛓️ 8 Oct (precision model, founder GO) — this summary follows the full Terms: a £1,000 setup fee by card,
              then £500 per held meeting charged to the card on file, nothing for a meeting that does not happen.
              Figures come from @kind/shared, never typed here. Programmes on the earlier terms keep them. */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">1. Parties</h2>
            <p>These Terms of Service govern your use of Milla &amp; Vida, a trading name of K.I.N.D Technologies Ltd, a company registered in England and Wales (company number 17260532) (&ldquo;we&rdquo;, &ldquo;us&rdquo;). By using your account, paying the setup fee or using any service you agree to these Terms.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">2. Services</h2>
            <p>A managed email service, paid per meeting that takes place. Each month we find the few companies with a real, dated reason to talk to you now, research each person and write to each one individually. A real person checks every message before it goes, and nothing is sent until you have approved it in Milla. Emails go out in your name, from your own mailboxes. The service is email only.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">3. Pricing &amp; Payment</h2>
            <p>There is <strong>no free trial</strong>, and there is <strong>no subscription</strong>. Free Proof on your own market costs nothing. We charge two things, in pounds sterling: a one-off setup fee of <strong>{formatGbpWhole(PRECISION_SETUP_FEE_GBP)}</strong>, paid by card before work begins, and <strong>{formatGbpWhole(PRECISION_PER_HELD_MEETING_GBP)}</strong> for each held meeting, charged to the card on file after the meeting takes place. If a meeting doesn&rsquo;t happen, you don&rsquo;t pay for it; if you cancel or don&rsquo;t attend without at least {PRECISION_CLIENT_NOTICE_HOURS} hours&rsquo; notice, it is charged as held. The setup fee is not refundable once work has begun. Anything you agreed with us before 8 October 2026 continues on the terms agreed at the time.</p>
            <p className="mt-2">We make <strong>no guarantee</strong> of meetings, replies, conversion rates or sales outcomes. A held meeting meets all seven conditions in our full Terms.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">4. Acceptable Use</h2>
            <p>You may not use the Platform to contact people who have opted out, send spam or communications that break UK GDPR, CAN-SPAM or any other applicable law, reverse-engineer any component, or resell access without written permission.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">5. Data &amp; Privacy</h2>
            <p>We process the personal data of the people we contact for you as a data processor. Their contact details come from Apollo.io, a licensed B2B data provider, and the dated reason we get in touch from public sources such as company announcements, news and job postings. Our Privacy Policy is available at get-kind.com/privacy.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">6. Intellectual Property</h2>
            <p>All Platform technology, AI models, and processes remain K.I.N.D's property. Client data remains the client's property. K.I.N.D is licensed to process client data solely to deliver contracted services.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">7. Limitation of Liability</h2>
            <p>K.I.N.D's total liability is capped at the fees paid in the 3 months preceding any claim. K.I.N.D is not liable for indirect, consequential, or lost-profit damages.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">8. Governing Law</h2>
            <p>These Terms are governed by the laws of England and Wales. Disputes are subject to the exclusive jurisdiction of the courts of England and Wales.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">9. Contact</h2>
            <p>Questions: <a href="mailto:hello@get-kind.com" className="text-[#7C3AED] hover:underline">hello@get-kind.com</a></p>
          </section>
        </div>
      </main>
      <footer className="border-t border-gray-100 px-8 py-6 text-center text-xs text-gray-400">
        © 2026 K.I.N.D · <Link href="/privacy" className="hover:text-gray-600">Privacy Policy</Link> · <Link href="/dashboard" className="hover:text-gray-600">Dashboard</Link>
      </footer>
    </div>
  )
}
