import Link from 'next/link'
import { Zap } from 'lucide-react'

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
        <p className="text-gray-500 text-sm mb-8">Last updated: 25 September 2026 · Full version at <a href="/terms.html" className="text-[#7C3AED] hover:underline">the full terms</a></p>

        <div className="prose prose-gray max-w-none space-y-8 text-sm text-gray-700 leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">1. Parties</h2>
            <p>These Terms of Service govern your use of the K.I.N.D AI Platform, operated by K.I.N.D Technologies Ltd, a company registered in England and Wales (company number 17260532) trading as K.I.N.D ("K.I.N.D", "we", "us"). By signing an Order Form or accessing the Platform you agree to these Terms.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">2. Services</h2>
            <p>K.I.N.D runs outbound programmes for businesses that sell to other businesses. You tell Milla the outcome you want and who you want to reach; we find real people who match, show you a free Proof sample before you pay, prepare the outreach, and &mdash; once you approve the exact package &mdash; send it on your behalf and work towards booked meetings.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">3. Programmes &amp; Billing</h2>
            <p>There is <strong>no free trial</strong>, and there is <strong>no subscription</strong>. Your Brief and your Proof &mdash; up to 20 real people who match your targeting, shown masked &mdash; are free. You choose the number of booked meetings your programme aims for. It is priced at a fixed amount per meeting set by your company&rsquo;s size &mdash; Founders (1&ndash;50 employees), Growth (51&ndash;200) or Enterprise (more than 200), at the rates on our Pricing page &mdash; and its price is shown before you commit. It is paid <strong>in one payment, in full</strong>, when you accept it: that payment authorises sourcing and preparation only, and outreach begins only after you approve the prepared package. A programme accepted under our earlier terms continues on them: <strong>Payment 1</strong> authorises sourcing and preparation only, and <strong>Payment 2</strong> is taken when you approve the prepared package and authorises outreach. If you pause before your programme goes live, Payment 2 is never charged.</p>
            <p className="mt-2">If your programme ends having delivered fewer booked meetings than your target, the difference, at the price per meeting you bought at, is <strong>credited to your K.I.N.D account</strong> towards the payment for a future programme. This credit is given <strong>once per client</strong> and <strong>expires 90 days</strong> after it is credited (credit owed on a programme under our earlier terms does not expire). Account credit is not paid back to your card. Programme payments are non-refundable.</p>
            <p className="mt-2">K.I.N.D makes <strong>no guarantee</strong> of meetings booked, replies, conversion rates or sales outcomes. Any figure we give for expected prospects or results is a planning estimate based on our current experience, not a promise.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">4. Acceptable Use</h2>
            <p>You may not use the Platform to contact leads who have opted out, send communications violating POPIA, GDPR, or CAN-SPAM, reverse-engineer any component, or resell access without written permission.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">5. Data & Privacy</h2>
            <p>K.I.N.D processes personal data on your behalf as a data processor. You remain the data controller responsible for ensuring your use of leads complies with POPIA, GDPR, CAN-SPAM, and all applicable laws. Our Privacy Policy is available at get-kind.com/privacy.</p>
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
