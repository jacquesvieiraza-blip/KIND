export default function FigsyPage() {
  const features = [
    { title: 'Personalised outreach', desc: 'AI-crafted emails tailored to each lead\'s company, role, and context.' },
    { title: '3-step follow-up', desc: 'Automated follow-up sequences that adapt based on engagement signals.' },
    { title: 'Reply detection', desc: 'Instant classification of replies — interested, not now, or out of office.' },
    { title: 'Opt-out handling', desc: 'Automatic opt-out processing and permanent suppression, fully POPIA-compliant.' },
    { title: 'Meeting booking', desc: 'Seamlessly hand off warm leads to your calendar via integrated booking links.' },
  ]

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Hero */}
      <div className="bg-white rounded-2xl border border-gray-100 p-8">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-4xl">🤖</span>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">FIGSY — AI SDR</h1>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-50 text-brand-600 border border-brand-200 mt-1">
                Coming soon
              </span>
            </div>
          </div>
        </div>
        <p className="text-gray-600 leading-relaxed">
          FIGSY is your AI Sales Development Representative — it takes your scored, consented leads and handles
          the entire outreach process end-to-end. From crafting personalised first-touch emails to managing
          multi-step follow-ups and booking meetings, FIGSY works 24/7 so your team can focus on closing.
        </p>
      </div>

      {/* Features */}
      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-3">What's coming</h2>
        <div className="space-y-3">
          {features.map(({ title, desc }) => (
            <div key={title} className="bg-gray-50 rounded-xl border border-gray-100 px-5 py-4 flex items-start gap-4">
              <div className="w-2 h-2 rounded-full bg-brand-400 mt-1.5 shrink-0" />
              <div>
                <p className="font-medium text-gray-900 text-sm">{title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center">
        <p className="text-sm text-gray-600 mb-4">
          Be the first to know when FIGSY launches — get early access and introductory pricing.
        </p>
        <a
          href="mailto:hello@get-kind.com?subject=FIGSY%20Waitlist"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-medium rounded-lg text-sm transition-colors"
        >
          🤖 Get notified when FIGSY launches
        </a>
      </div>
    </div>
  )
}
