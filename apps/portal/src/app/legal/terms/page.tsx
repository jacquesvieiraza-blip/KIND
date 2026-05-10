export const metadata = { title: 'Terms of Service — K.I.N.D' }

export default function TermsPage() {
  return (
    <div className="prose prose-gray max-w-none">
      <p className="text-xs text-gray-400 mb-2">Last updated: 10 May 2026</p>
      <h1 className="text-3xl font-black text-gray-900 mb-2">Terms of Service</h1>
      <p className="text-gray-500 text-sm mb-10">K.I.N.D Intelligence (Pty) Ltd — Registration pending · South Africa</p>

      <Section title="1. Acceptance of Terms">
        <p>By accessing or using the K.I.N.D AI Intelligence Platform ("Platform"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, you may not use the Platform. These Terms constitute a legally binding agreement between you ("Client") and K.I.N.D Intelligence (Pty) Ltd ("K.I.N.D", "we", "us").</p>
      </Section>

      <Section title="2. Description of Services">
        <p>K.I.N.D provides AI-powered business services including but not limited to:</p>
        <ul>
          <li>AI Lead Generation — sourcing, scoring, and delivery of B2B leads</li>
          <li>Virtual Assistant — AI-driven task automation and knowledge management</li>
          <li>Chatbot Agent — conversational AI for customer engagement</li>
          <li>Voice Agent — AI-powered inbound and outbound call handling</li>
          <li>Monthly Consulting Retainer — AI strategy and implementation support</li>
        </ul>
        <p>Not all services are available simultaneously. Service availability is determined by your subscription plan and K.I.N.D's product launch schedule.</p>
      </Section>

      <Section title="3. Account Registration">
        <p>To access the Platform, you must create an account and provide accurate, complete information. You are responsible for maintaining the confidentiality of your credentials and for all activity under your account. You must notify us immediately of any unauthorised use of your account.</p>
        <p>You must be at least 18 years of age and have the legal authority to enter into these Terms on behalf of yourself or your organisation.</p>
      </Section>

      <Section title="4. Subscription and Payment">
        <p>Access to paid services requires a valid subscription. Subscriptions are billed monthly in US Dollars (USD) via Paystack. Currency conversions shown on the Platform are indicative only — all charges are processed in USD at fixed rates.</p>
        <ul>
          <li><strong>Free Trial:</strong> New accounts receive a 14-day free trial. No credit card is required to start a trial. After the trial period, continued access requires a paid subscription.</li>
          <li><strong>Billing:</strong> Subscriptions renew automatically each month unless cancelled.</li>
          <li><strong>Cancellation:</strong> You may cancel at any time. Cancellation takes effect at the end of the current billing period. No partial refunds are issued.</li>
          <li><strong>Failed Payments:</strong> If payment fails, your account will be downgraded after 7 days. K.I.N.D reserves the right to suspend or terminate accounts with outstanding balances.</li>
        </ul>
      </Section>

      <Section title="5. Acceptable Use">
        <p>You agree not to use the Platform to:</p>
        <ul>
          <li>Violate any applicable law or regulation, including the Protection of Personal Information Act 4 of 2013 (POPIA)</li>
          <li>Send unsolicited communications (spam) to any person</li>
          <li>Process personal information without a lawful basis under POPIA</li>
          <li>Impersonate any person or entity</li>
          <li>Reverse engineer, decompile, or attempt to extract source code from the Platform</li>
          <li>Use the Platform to build a competing product</li>
          <li>Engage in any activity that disrupts or interferes with the Platform</li>
        </ul>
        <p>K.I.N.D reserves the right to suspend or terminate your account immediately if you violate these restrictions.</p>
      </Section>

      <Section title="6. Lead Generation and Data Use">
        <p>When using the Lead Generation service, you acknowledge that:</p>
        <ul>
          <li>All leads are sourced and processed in compliance with POPIA and applicable data protection laws</li>
          <li>Leads delivered to you may only be used for lawful business purposes</li>
          <li>You are responsible for all subsequent communications with leads delivered to you</li>
          <li>You must honour opt-out requests from any lead within 5 business days</li>
          <li>You may not sell, transfer, or share leads with third parties without consent</li>
        </ul>
        <p>Violation of these obligations may result in immediate account termination and potential liability under POPIA.</p>
      </Section>

      <Section title="7. Intellectual Property">
        <p>All content, software, algorithms, and technology underlying the Platform are owned by K.I.N.D and protected by applicable intellectual property laws. These Terms do not grant you any ownership rights in the Platform.</p>
        <p>You retain ownership of all data you upload or generate through the Platform. By using the Platform, you grant K.I.N.D a limited licence to process your data solely to provide the services.</p>
      </Section>

      <Section title="8. Confidentiality">
        <p>Each party agrees to keep the other's confidential information strictly confidential and not to disclose it to third parties without prior written consent. This obligation survives termination of these Terms for a period of 3 years.</p>
      </Section>

      <Section title="9. Limitation of Liability">
        <p>To the maximum extent permitted by law, K.I.N.D shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, data, or business opportunities, arising from your use of or inability to use the Platform.</p>
        <p>K.I.N.D's total liability to you for any claim arising under these Terms shall not exceed the total fees paid by you to K.I.N.D in the 3 months preceding the claim.</p>
      </Section>

      <Section title="10. Disclaimers">
        <p>The Platform is provided "as is" without warranties of any kind, express or implied. K.I.N.D does not warrant that the Platform will be uninterrupted, error-free, or that lead generation results will meet specific targets. Lead volumes and quality are estimates based on ICP criteria and market availability.</p>
      </Section>

      <Section title="11. Termination">
        <p>Either party may terminate these Terms at any time. K.I.N.D may terminate immediately for breach of these Terms. Upon termination, your access to the Platform will cease and K.I.N.D will delete or return your data within 30 days, subject to legal retention obligations.</p>
      </Section>

      <Section title="12. Governing Law and Disputes">
        <p>These Terms are governed by the laws of the Republic of South Africa. Any dispute arising from these Terms shall first be referred to good faith negotiation. If unresolved within 30 days, disputes shall be submitted to binding arbitration in accordance with the Rules of the Arbitration Foundation of Southern Africa (AFSA).</p>
      </Section>

      <Section title="13. Changes to Terms">
        <p>K.I.N.D reserves the right to modify these Terms at any time. We will notify you of material changes via email or a notice on the Platform at least 14 days before they take effect. Continued use of the Platform after changes take effect constitutes acceptance of the revised Terms.</p>
      </Section>

      <Section title="14. Contact">
        <p>For questions about these Terms, contact us at: <a href="mailto:legal@kindai.com" className="text-[#0066FF]">legal@kindai.com</a></p>
      </Section>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-10">
      <h2 className="text-lg font-bold text-gray-900 mb-3">{title}</h2>
      <div className="text-sm text-gray-600 leading-relaxed space-y-3">{children}</div>
    </div>
  )
}
