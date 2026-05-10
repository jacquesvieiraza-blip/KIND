export const metadata = { title: 'Data Processing Agreement — K.I.N.D' }

export default function DpaPage() {
  return (
    <div className="prose prose-gray max-w-none">
      <p className="text-xs text-gray-400 mb-2">Last updated: 10 May 2026</p>
      <h1 className="text-3xl font-black text-gray-900 mb-2">Data Processing Agreement</h1>
      <p className="text-gray-500 text-sm mb-10">Between K.I.N.D Intelligence (Pty) Ltd and Platform Clients</p>

      <div className="bg-amber-50 border border-amber-100 rounded-xl p-5 mb-10 text-sm text-amber-800">
        This Data Processing Agreement ("DPA") forms part of the Terms of Service between K.I.N.D Intelligence (Pty) Ltd ("Processor") and the subscribing client ("Responsible Party"). By accepting the Terms of Service, you also accept this DPA.
      </div>

      <Section title="1. Definitions">
        <ul>
          <li><strong>"Responsible Party"</strong> — the K.I.N.D client who determines the purpose and means of processing personal information (you)</li>
          <li><strong>"Processor"</strong> — K.I.N.D Intelligence (Pty) Ltd, which processes personal information on behalf of the Responsible Party</li>
          <li><strong>"Data Subject"</strong> — an identified or identifiable natural person whose personal information is processed</li>
          <li><strong>"Personal Information"</strong> — as defined in POPIA Section 1</li>
          <li><strong>"Processing"</strong> — any operation performed on personal information</li>
          <li><strong>"POPIA"</strong> — Protection of Personal Information Act 4 of 2013</li>
        </ul>
      </Section>

      <Section title="2. Scope and Purpose of Processing">
        <p>K.I.N.D (as Processor) processes personal information on behalf of the Client (as Responsible Party) for the following purposes:</p>
        <ul>
          <li>Sourcing B2B lead data matching the Client's Ideal Customer Profile</li>
          <li>Sending POPIA consent requests to leads on behalf of the Client</li>
          <li>Scoring, enriching, and delivering consented leads to the Client</li>
          <li>Maintaining consent audit logs</li>
          <li>Processing Client account and usage data to provide Platform services</li>
        </ul>
        <p>Processing is carried out only on documented instructions from the Responsible Party (via ICP configuration and service settings), except where required by law.</p>
      </Section>

      <Section title="3. Obligations of the Responsible Party (Client)">
        <p>The Client agrees to:</p>
        <ul>
          <li>Ensure they have a lawful basis under POPIA for requesting K.I.N.D to process personal information on their behalf</li>
          <li>Use leads delivered by K.I.N.D only for lawful business purposes consistent with the consent obtained</li>
          <li>Honour opt-out requests from leads within 5 business days</li>
          <li>Not share, sell, or transfer lead data to third parties without appropriate consent</li>
          <li>Implement appropriate security measures when storing or using lead data</li>
          <li>Notify K.I.N.D immediately of any data breach involving lead data delivered by K.I.N.D</li>
          <li>Comply with all applicable data protection laws in their use of the Platform</li>
        </ul>
      </Section>

      <Section title="4. Obligations of K.I.N.D (Processor)">
        <p>K.I.N.D agrees to:</p>
        <ul>
          <li>Process personal information only on documented instructions from the Responsible Party</li>
          <li>Ensure that persons authorised to process the personal information are bound by confidentiality obligations</li>
          <li>Implement appropriate technical and organisational security measures</li>
          <li>Assist the Responsible Party in responding to data subject requests under POPIA</li>
          <li>Notify the Responsible Party of any personal data breach within 72 hours of becoming aware</li>
          <li>Delete or return all personal information upon termination of services</li>
          <li>Make available all information necessary to demonstrate compliance with this DPA</li>
        </ul>
      </Section>

      <Section title="5. Sub-processors">
        <p>The Client authorises K.I.N.D to engage the following sub-processors:</p>
        <ul>
          <li><strong>Supabase Inc.</strong> — Database storage and authentication</li>
          <li><strong>Vercel Inc.</strong> — Platform hosting and deployment</li>
          <li><strong>Railway Corp.</strong> — API infrastructure</li>
          <li><strong>Paystack Inc.</strong> — Payment processing</li>
          <li><strong>Anthropic PBC</strong> — AI processing for lead scoring</li>
        </ul>
        <p>K.I.N.D will notify the Responsible Party of any intended changes to sub-processors with at least 14 days' notice, giving the Responsible Party the opportunity to object.</p>
        <p>All sub-processors are bound by data processing agreements that impose obligations equivalent to those in this DPA.</p>
      </Section>

      <Section title="6. POPIA Consent Management">
        <p>For the Lead Generation service, K.I.N.D manages the consent process as follows:</p>
        <ol>
          <li>Consent emails are sent on behalf of the Client, identifying both K.I.N.D and the Client</li>
          <li>Consent emails include the Client's name, the purpose of contact, and opt-out instructions</li>
          <li>Consent responses are recorded with timestamp, IP address (where available), and method</li>
          <li>Only opt-in (consented) leads are delivered as actionable</li>
          <li>Opt-out records are maintained permanently to prevent re-contacting</li>
          <li>The Client may request a full consent audit report at any time</li>
        </ol>
        <p>The Client acknowledges that K.I.N.D's consent process satisfies the requirements of POPIA Section 11(1)(a) for the initial contact. The Client remains responsible for all subsequent communications.</p>
      </Section>

      <Section title="7. Security Measures">
        <p>K.I.N.D implements the following technical and organisational measures:</p>
        <ul>
          <li>Encryption of all personal information at rest (AES-256) and in transit (TLS 1.3)</li>
          <li>Role-based access controls limiting data access to authorised personnel</li>
          <li>Regular security assessments and vulnerability scanning</li>
          <li>Incident response plan with defined escalation procedures</li>
          <li>Employee confidentiality agreements and data protection training</li>
        </ul>
      </Section>

      <Section title="8. Data Subject Rights">
        <p>Where a data subject exercises their rights under POPIA directly with K.I.N.D, K.I.N.D will promptly notify the Responsible Party and assist with responding to the request. The Responsible Party remains responsible for responding to data subjects in relation to their use of lead data.</p>
      </Section>

      <Section title="9. Data Breach Notification">
        <p>In the event of a personal data breach affecting data processed under this DPA:</p>
        <ul>
          <li>K.I.N.D will notify the Responsible Party within 72 hours of becoming aware</li>
          <li>Notification will include the nature of the breach, categories and volume of data affected, likely consequences, and measures taken</li>
          <li>K.I.N.D will cooperate with the Responsible Party in managing the breach and required notifications to the Information Regulator</li>
        </ul>
      </Section>

      <Section title="10. Retention and Deletion">
        <p>Upon termination of services or written request:</p>
        <ul>
          <li>K.I.N.D will delete all personal information processed on behalf of the Responsible Party within 30 days</li>
          <li>The Responsible Party may request a data export before deletion</li>
          <li>Consent audit logs and suppression lists will be retained for 3 years after termination for legal compliance</li>
          <li>Deletion confirmation will be provided in writing upon request</li>
        </ul>
      </Section>

      <Section title="11. Duration">
        <p>This DPA is effective from the date the Client accepts the Terms of Service and remains in force for the duration of the subscription. Obligations relating to confidentiality and data security survive termination.</p>
      </Section>

      <Section title="12. Governing Law">
        <p>This DPA is governed by the laws of the Republic of South Africa. Disputes shall be resolved in accordance with the dispute resolution provisions in the Terms of Service.</p>
      </Section>

      <Section title="13. Contact">
        <p>For all DPA-related matters: <a href="mailto:privacy@kindai.com" className="text-[#0066FF]">privacy@kindai.com</a></p>
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
