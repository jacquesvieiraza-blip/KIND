import Link from 'next/link'
import { Zap } from 'lucide-react'

export const metadata = { title: 'Terms & Conditions — K.I.N.D', description: 'KIND AI Platform Terms and Conditions' }

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-100 px-8 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-gray-900">
          <Zap className="w-5 h-5 text-[#0066FF]" />K.I.N.D
        </Link>
        <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Back to dashboard →</Link>
      </header>
      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Terms & Conditions</h1>
        <p className="text-gray-500 text-sm mb-8">Last updated: May 2026</p>

        <div className="prose prose-gray max-w-none space-y-8 text-sm text-gray-700 leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">1. Agreement</h2>
            <p>These Terms & Conditions ("Terms") govern your use of the K.I.N.D AI Platform ("Platform"), operated by K.I.N.D AI (Pty) Ltd ("KIND", "we", "us"). By accessing the Platform or signing a Service Order Form, you agree to these Terms.</p>
            <p className="mt-2">Your complete agreement set consists of: the signed Service Order Form, the Master Services Agreement (MSA), the POPIA Compliant Process document, and any applicable Exhibits (including the Chatbot SLA). The Order Form incorporates all of these by reference.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">2. Services</h2>
            <p>KIND provides AI-powered business services including Lead Generation, Virtual Assistant, AI Chatbot Agent, and the FIGSY AI SDR product. The specific services, tiers, and pricing applicable to your account are set out in your Service Order Form.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">3. Payment & Billing</h2>
            <p>Fees are billed monthly or annually as selected. All prices are in USD unless otherwise stated. ZAR billing applies the exchange rate at date of invoice. Payments are processed via Paystack. Subscriptions auto-renew unless cancelled at least 5 business days before the renewal date.</p>
            <p className="mt-2">Trial periods, where offered, are 14 days. At trial end, a subscription must be activated to retain access.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">4. Acceptable Use</h2>
            <p>You may not use the Platform to: (a) contact leads who have opted out; (b) send unsolicited commercial communications in violation of POPIA, GDPR, or CAN-SPAM; (c) reverse engineer any component of the Platform; (d) resell access without written permission.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">5. Data & Privacy</h2>
            <p>KIND processes personal data as a data operator on your behalf. Our data practices are set out in the POPIA Compliant Process document and our Privacy Policy. You remain the responsible party for all leads you contact. You must ensure your use of leads complies with applicable law including POPIA, GDPR, and CAN-SPAM.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">6. Intellectual Property</h2>
            <p>All Platform technology, AI models, and proprietary processes remain KIND's exclusive property. Client data remains the client's property. KIND is granted a licence to process client data solely to deliver the contracted services.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">7. Limitation of Liability</h2>
            <p>To the maximum extent permitted by law, KIND's liability is limited to fees paid in the 3 months preceding any claim. KIND is not liable for indirect, consequential, or lost-profit damages.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">8. Governing Law</h2>
            <p>These Terms are governed by the laws of South Africa. Disputes shall be resolved in the courts of South Africa, or by arbitration if mutually agreed. For GDPR-covered clients, EU law applies to data processing matters.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">9. Contact</h2>
            <p>Questions about these Terms: <a href="mailto:legal@kind.ai" className="text-[#0066FF] hover:underline">legal@kind.ai</a></p>
          </section>
        </div>
      </main>
      <footer className="border-t border-gray-100 px-8 py-6 text-center text-xs text-gray-400">
        © 2026 K.I.N.D AI · <Link href="/privacy" className="hover:text-gray-600">Privacy Policy</Link> · <Link href="/dashboard" className="hover:text-gray-600">Dashboard</Link>
      </footer>
    </div>
  )
}
