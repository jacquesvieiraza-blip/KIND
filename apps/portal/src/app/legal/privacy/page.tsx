export const metadata = { title: 'Privacy Policy — K.I.N.D' }

export default function PrivacyPage() {
  return (
    <div className="prose prose-gray max-w-none">
      <p className="text-xs text-gray-400 mb-2">Last updated: 10 May 2026</p>
      <h1 className="text-3xl font-black text-gray-900 mb-2">Privacy Policy</h1>
      <p className="text-gray-500 text-sm mb-10">K.I.N.D Intelligence (Pty) Ltd — South Africa</p>

      <Section title="1. Who We Are">
        <p>K.I.N.D Intelligence (Pty) Ltd ("K.I.N.D", "we", "us") operates the K.I.N.D AI Intelligence Platform. We are a Responsible Party as defined under the Protection of Personal Information Act 4 of 2013 (POPIA).</p>
        <p>Information Officer contact: <a href="mailto:privacy@kindai.com" className="text-[#0066FF]">privacy@kindai.com</a></p>
      </Section>

      <Section title="2. Information We Collect">
        <p><strong>Account Information:</strong> Name, email address, company name, and billing details when you register.</p>
        <p><strong>Usage Data:</strong> How you interact with the Platform, features used, pages visited, and session duration.</p>
        <p><strong>ICP Data:</strong> Ideal Customer Profile criteria you define (industries, job titles, locations, company sizes).</p>
        <p><strong>Lead Data:</strong> Contact information of business leads sourced on your behalf, including names, email addresses, job titles, company details, and LinkedIn profiles.</p>
        <p><strong>Payment Data:</strong> Billing transactions processed by Paystack. We do not store full card numbers.</p>
        <p><strong>Communications:</strong> Any messages you send to K.I.N.D support or through the Platform.</p>
      </Section>

      <Section title="3. How We Use Your Information">
        <ul>
          <li>To provide, operate, and improve the Platform and its services</li>
          <li>To process payments and manage your subscription</li>
          <li>To source and deliver leads matching your ICP criteria</li>
          <li>To send service-related communications (invoices, alerts, product updates)</li>
          <li>To comply with legal obligations under POPIA and other applicable laws</li>
          <li>To detect and prevent fraud and security incidents</li>
        </ul>
      </Section>

      <Section title="4. Legal Basis for Processing">
        <p>We process your personal information under the following lawful grounds as defined by POPIA:</p>
        <ul>
          <li><strong>Contract:</strong> Processing necessary to perform our services under your subscription agreement</li>
          <li><strong>Legitimate Interest:</strong> Platform security, fraud prevention, and service improvement</li>
          <li><strong>Legal Obligation:</strong> Compliance with South African law</li>
          <li><strong>Consent:</strong> Marketing communications (you may withdraw consent at any time)</li>
        </ul>
      </Section>

      <Section title="5. Lead Data and POPIA Compliance">
        <p>The Lead Generation service processes personal information of third-party contacts. K.I.N.D operates as a Processor on behalf of you (the Responsible Party) when delivering leads. All leads are sourced with POPIA-compliant consent mechanisms. Full details are set out in our <a href="/legal/popia" className="text-[#0066FF]">POPIA Compliance Notice</a> and <a href="/legal/dpa" className="text-[#0066FF]">Data Processing Agreement</a>.</p>
      </Section>

      <Section title="6. Third-Party Service Providers">
        <p>We share data with the following sub-processors to deliver our services:</p>
        <ul>
          <li><strong>Supabase</strong> — Database and authentication (US/EU)</li>
          <li><strong>Vercel</strong> — Platform hosting (US/EU)</li>
          <li><strong>Railway</strong> — API infrastructure (US)</li>
          <li><strong>Paystack</strong> — Payment processing (Nigeria/US)</li>
          <li><strong>Anthropic</strong> — AI processing for lead scoring and analysis (US)</li>
        </ul>
        <p>All sub-processors are bound by data processing agreements and implement appropriate security measures.</p>
      </Section>

      <Section title="7. Cross-Border Data Transfers">
        <p>Some of our sub-processors are located outside South Africa. Where personal information is transferred internationally, we ensure adequate protection through contractual safeguards and by only using processors that meet equivalent data protection standards.</p>
      </Section>

      <Section title="8. Data Retention">
        <ul>
          <li><strong>Account data:</strong> Retained for the duration of your subscription plus 3 years</li>
          <li><strong>Lead data:</strong> Retained for 12 months from delivery, then purged unless you export</li>
          <li><strong>Payment records:</strong> Retained for 5 years as required by South African tax law</li>
          <li><strong>Audit logs:</strong> Retained for 3 years for POPIA compliance</li>
        </ul>
      </Section>

      <Section title="9. Your Rights Under POPIA">
        <p>You have the right to:</p>
        <ul>
          <li>Access the personal information we hold about you</li>
          <li>Request correction of inaccurate information</li>
          <li>Request deletion of your personal information (subject to legal retention obligations)</li>
          <li>Object to processing of your personal information</li>
          <li>Withdraw consent where processing is based on consent</li>
          <li>Lodge a complaint with the Information Regulator of South Africa</li>
        </ul>
        <p>To exercise any of these rights, contact us at <a href="mailto:privacy@kindai.com" className="text-[#0066FF]">privacy@kindai.com</a>. We will respond within 30 days.</p>
      </Section>

      <Section title="10. Security">
        <p>We implement industry-standard technical and organisational measures to protect your personal information, including encryption at rest and in transit, access controls, and regular security reviews. However, no system is completely secure and we cannot guarantee absolute security.</p>
      </Section>

      <Section title="11. Cookies">
        <p>The Platform uses essential cookies for authentication and session management. We do not use tracking or advertising cookies. By using the Platform, you consent to essential cookies.</p>
      </Section>

      <Section title="12. Changes to This Policy">
        <p>We may update this Privacy Policy from time to time. We will notify you of material changes via email at least 14 days before they take effect.</p>
      </Section>

      <Section title="13. Contact Us">
        <p>Information Officer: <a href="mailto:privacy@kindai.com" className="text-[#0066FF]">privacy@kindai.com</a><br />
        Information Regulator of South Africa: <a href="https://www.justice.gov.za/inforeg" className="text-[#0066FF]" target="_blank" rel="noopener noreferrer">www.justice.gov.za/inforeg</a></p>
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
