export const metadata = { title: 'POPIA Compliance Notice — K.I.N.D' }

export default function PopiaPage() {
  return (
    <div className="prose prose-gray max-w-none">
      <p className="text-xs text-gray-400 mb-2">Last updated: 10 May 2026</p>
      <h1 className="text-3xl font-black text-gray-900 mb-2">POPIA Compliance Notice</h1>
      <p className="text-gray-500 text-sm mb-10">Protection of Personal Information Act 4 of 2013 — K.I.N.D Intelligence (Pty) Ltd</p>

      <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 mb-10 text-sm text-blue-800">
        This notice is issued in compliance with Section 18 of the Protection of Personal Information Act 4 of 2013 (POPIA) and informs you of how K.I.N.D Intelligence (Pty) Ltd collects and processes personal information.
      </div>

      <Section title="1. Identity and Contact Details of the Responsible Party">
        <p><strong>Organisation:</strong> K.I.N.D Intelligence (Pty) Ltd</p>
        <p><strong>Country of Operation:</strong> Republic of South Africa</p>
        <p><strong>Information Officer:</strong> To be appointed upon company registration</p>
        <p><strong>Contact:</strong> <a href="mailto:privacy@kindai.com" className="text-[#0066FF]">privacy@kindai.com</a></p>
      </Section>

      <Section title="2. Purpose of Processing Personal Information">
        <p>K.I.N.D processes personal information for the following purposes:</p>
        <ul>
          <li><strong>Account Management:</strong> Creating and managing client accounts on the Platform</li>
          <li><strong>Lead Generation:</strong> Sourcing, scoring, and delivering B2B leads to clients based on their Ideal Customer Profile (ICP)</li>
          <li><strong>Consent Management:</strong> Sending POPIA-compliant consent requests to data subjects (leads) and recording their responses</li>
          <li><strong>Billing and Payments:</strong> Processing subscription payments via Paystack</li>
          <li><strong>Platform Improvement:</strong> Analysing usage patterns to improve service quality</li>
          <li><strong>Legal Compliance:</strong> Maintaining records as required by applicable law</li>
        </ul>
      </Section>

      <Section title="3. Categories of Personal Information Processed">
        <p><strong>Client Data:</strong></p>
        <ul>
          <li>Full name and email address</li>
          <li>Company name and business details</li>
          <li>Payment and billing information</li>
          <li>Platform usage data and preferences</li>
        </ul>
        <p><strong>Lead Data (processed on behalf of clients):</strong></p>
        <ul>
          <li>Full name and professional email address</li>
          <li>Job title and seniority</li>
          <li>Company name, size, and industry</li>
          <li>LinkedIn profile URL</li>
          <li>Geographic location (country/city)</li>
          <li>Consent status and timestamp</li>
        </ul>
      </Section>

      <Section title="4. Lawful Basis for Processing">
        <p>K.I.N.D relies on the following conditions for lawful processing under POPIA Section 11:</p>
        <ul>
          <li><strong>Consent (Section 11(1)(a)):</strong> Where data subjects have opted in to receive communications</li>
          <li><strong>Contractual necessity (Section 11(1)(b)):</strong> To fulfil subscription agreements with clients</li>
          <li><strong>Legitimate interest (Section 11(1)(f)):</strong> For fraud prevention, security, and service improvement, balanced against data subjects' rights</li>
          <li><strong>Legal obligation (Section 11(1)(c)):</strong> Where required by South African law</li>
        </ul>
      </Section>

      <Section title="5. POPIA Consent Process for Leads">
        <p>K.I.N.D's Lead Generation service implements the following POPIA-compliant consent workflow:</p>
        <ol>
          <li>Leads are sourced from publicly available B2B data sources</li>
          <li>A consent request email is sent to each lead on behalf of the client, clearly identifying both K.I.N.D and the client</li>
          <li>The consent email explains the purpose of processing and the data subject's rights</li>
          <li>Only leads who opt in (consent given) are delivered as actionable to the client</li>
          <li>All consent events are timestamped and stored in an immutable audit log</li>
          <li>Opt-out requests are processed within 5 business days and the lead is suppressed permanently</li>
        </ol>
      </Section>

      <Section title="6. Recipients of Personal Information">
        <p>Personal information may be shared with:</p>
        <ul>
          <li><strong>K.I.N.D clients:</strong> Leads matching their ICP, after consent is obtained</li>
          <li><strong>Sub-processors:</strong> Supabase, Vercel, Railway, Paystack, Anthropic — all bound by data processing agreements</li>
          <li><strong>Law enforcement:</strong> Where required by court order or legal obligation</li>
        </ul>
        <p>We do not sell personal information to third parties.</p>
      </Section>

      <Section title="7. Cross-Border Transfers">
        <p>Personal information may be transferred to countries outside South Africa where our sub-processors operate (United States, European Union). These transfers are governed by appropriate safeguards including contractual obligations equivalent to POPIA's requirements.</p>
      </Section>

      <Section title="8. Retention Periods">
        <ul>
          <li>Client account data: Duration of subscription + 3 years</li>
          <li>Lead data: 12 months from delivery date</li>
          <li>Consent audit logs: 3 years (for regulatory compliance)</li>
          <li>Payment records: 5 years (South African Revenue Service requirements)</li>
          <li>Opt-out/suppression lists: Indefinitely (to prevent re-contacting)</li>
        </ul>
      </Section>

      <Section title="9. Rights of Data Subjects">
        <p>Under POPIA, data subjects have the right to:</p>
        <ul>
          <li><strong>Access:</strong> Request confirmation of whether we hold your personal information and obtain a copy</li>
          <li><strong>Correction:</strong> Request correction of inaccurate, incomplete, or outdated information</li>
          <li><strong>Deletion:</strong> Request erasure of personal information (subject to retention obligations)</li>
          <li><strong>Objection:</strong> Object to processing based on legitimate interests</li>
          <li><strong>Withdraw Consent:</strong> Withdraw consent at any time without penalty</li>
          <li><strong>Complain:</strong> Lodge a complaint with the Information Regulator</li>
        </ul>
        <p>To exercise your rights: <a href="mailto:privacy@kindai.com" className="text-[#0066FF]">privacy@kindai.com</a></p>
        <p>We will respond within 30 days of receiving your request.</p>
      </Section>

      <Section title="10. Information Regulator">
        <p>If you are dissatisfied with how we handle your personal information, you have the right to lodge a complaint with the Information Regulator of South Africa:</p>
        <p>
          <strong>Information Regulator (South Africa)</strong><br />
          Website: <a href="https://www.justice.gov.za/inforeg" className="text-[#0066FF]" target="_blank" rel="noopener noreferrer">www.justice.gov.za/inforeg</a><br />
          Email: <a href="mailto:inforeg@justice.gov.za" className="text-[#0066FF]">inforeg@justice.gov.za</a>
        </p>
      </Section>

      <Section title="11. Security Measures">
        <p>K.I.N.D implements appropriate technical and organisational measures to protect personal information against loss, unauthorised access, disclosure, or destruction. These include:</p>
        <ul>
          <li>Encryption of data at rest and in transit (TLS 1.3)</li>
          <li>Role-based access controls</li>
          <li>Regular security reviews and penetration testing</li>
          <li>Incident response procedures with 72-hour breach notification</li>
        </ul>
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
