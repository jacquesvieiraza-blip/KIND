import Link from 'next/link'
import { Zap } from 'lucide-react'

export const metadata = { title: 'Terms of Service — K.I.N.D', description: 'K.I.N.D Terms of Service' }

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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Terms of Service</h1>
        <p className="text-gray-500 text-sm mb-8">Last updated: May 2026 · Full version at <a href="https://get-kind.com/terms" className="text-[#0066FF] hover:underline" target="_blank" rel="noopener noreferrer">get-kind.com/terms</a></p>

        <div className="prose prose-gray max-w-none space-y-8 text-sm text-gray-700 leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">1. Parties</h2>
            <p>These Terms of Service govern your use of the K.I.N.D AI Platform, operated by Jacques Vieira trading as K.I.N.D ("K.I.N.D", "we", "us"), registered at 33 Townsend Road, Stratford-upon-Avon, CV37 7DE, United Kingdom. By signing an Order Form or accessing the Platform you agree to these Terms.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">2. Services</h2>
            <p>K.I.N.D provides AI-powered outbound sales services including lead generation, ICP profiling, 3-sequence email outreach, and the FIGSY AI SDR. The specific services and pricing for your account are set out in your Order Form.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">3. Credits & Billing</h2>
            <p>Services are charged on a credit basis. Credits are purchased in bundles and are non-refundable. One credit is consumed when a lead responds positively to outreach. Zero credits = outreach pauses. Credits are topped up manually or automatically. Accounts with outstanding balances have 7 days before suspension.</p>
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
            <p>Questions: <a href="mailto:hello@get-kind.com" className="text-[#0066FF] hover:underline">hello@get-kind.com</a></p>
          </section>
        </div>
      </main>
      <footer className="border-t border-gray-100 px-8 py-6 text-center text-xs text-gray-400">
        © 2026 K.I.N.D · <Link href="/privacy" className="hover:text-gray-600">Privacy Policy</Link> · <Link href="/dashboard" className="hover:text-gray-600">Dashboard</Link>
      </footer>
    </div>
  )
}
