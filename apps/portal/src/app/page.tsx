import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Zap, Users, Bot, MessageSquare, ArrowRight, CheckCircle2, MapPin, Shield, TrendingUp } from 'lucide-react'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/dashboard')

  return (
    <div className="min-h-screen bg-white font-sans">
      {/* Nav */}
      <nav className="border-b border-gray-100 sticky top-0 bg-white/90 backdrop-blur-sm z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="text-brand-500 w-5 h-5" />
            <span className="font-bold text-lg text-brand-900 tracking-tight">K.I.N.D</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900 font-medium px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors">
              Sign in
            </Link>
            <Link href="/login" className="text-sm bg-brand-500 hover:bg-brand-600 text-white font-medium px-4 py-2 rounded-lg transition-colors">
              Get started free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-24 text-center">
        <div className="inline-flex items-center gap-2 bg-brand-50 text-brand-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
          <Zap className="w-3.5 h-3.5" />
          Built for African businesses
        </div>
        <h1 className="text-5xl lg:text-6xl font-bold text-brand-900 leading-tight max-w-3xl mx-auto mb-6">
          Turn African markets into{' '}
          <span className="text-brand-500">your pipeline</span>
        </h1>
        <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed">
          K.I.N.D gives ambitious African businesses AI-powered lead generation, virtual assistants, and customer chatbots — in one platform, built for local compliance.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/login"
            className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-semibold px-6 py-3.5 rounded-xl text-base transition-colors"
          >
            Start your 14-day free trial
            <ArrowRight className="w-4 h-4" />
          </Link>
          <p className="text-sm text-gray-400">No credit card required</p>
        </div>

        {/* Social proof strip */}
        <div className="mt-14 flex flex-col sm:flex-row items-center justify-center gap-8 text-sm text-gray-400">
          {[
            { icon: <Shield className="w-4 h-4" />, label: 'POPIA compliant' },
            { icon: <MapPin className="w-4 h-4" />, label: '10 African markets' },
            { icon: <TrendingUp className="w-4 h-4" />, label: 'ZAR & USD billing' },
          ].map(({ icon, label }) => (
            <div key={label} className="flex items-center gap-1.5">
              {icon}
              <span>{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Products */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-brand-900 mb-3">Three AI products. One platform.</h2>
            <p className="text-gray-500 max-w-xl mx-auto">Everything you need to grow — from finding leads to closing deals to keeping customers happy.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: <Users className="w-6 h-6" />,
                title: 'AI Lead Generation',
                description: 'Get 250–2,500 precision-targeted B2B leads every month. Our AI scores each lead against your Ideal Customer Profile and handles the full POPIA consent workflow automatically.',
                features: ['ICP-matched scoring 0–100', 'POPIA consent automation', 'CSV export to any CRM'],
                color: 'bg-blue-50 text-blue-600',
                from: 'From $299/month',
              },
              {
                icon: <Bot className="w-6 h-6" />,
                title: 'Virtual Assistant',
                description: 'Stop spending hours on admin. Your AI assistant handles scheduling, email drafting, research requests, and knowledge queries — so your team focuses on selling.',
                features: ['Email drafting & scheduling', 'Research on demand', 'Knowledge base queries'],
                color: 'bg-violet-50 text-violet-600',
                from: 'From $199/month',
              },
              {
                icon: <MessageSquare className="w-6 h-6" />,
                title: 'AI Chatbot Agent',
                description: 'Never miss an inbound lead. Deploy an AI chatbot on your website and WhatsApp that answers questions, qualifies prospects, and escalates to your team when needed.',
                features: ['Web + WhatsApp channels', 'Automatic escalation', 'Custom personality & tone'],
                color: 'bg-green-50 text-green-600',
                from: 'From $199/month',
              },
            ].map((product) => (
              <div key={product.title} className="bg-white rounded-2xl border border-gray-100 p-7 flex flex-col">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${product.color}`}>
                  {product.icon}
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{product.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed mb-5 flex-1">{product.description}</p>
                <ul className="space-y-2 mb-5">
                  {product.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                      <CheckCircle2 className="w-4 h-4 text-brand-500 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{product.from}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 max-w-6xl mx-auto px-6">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold text-brand-900 mb-3">From setup to pipeline in days</h2>
          <p className="text-gray-500">Most customers see their first qualified leads within a week.</p>
        </div>

        <div className="grid md:grid-cols-4 gap-6">
          {[
            { step: '01', title: 'Define your ICP', desc: 'Tell us your ideal industry, job titles, company size, and locations.' },
            { step: '02', title: 'AI sources leads', desc: 'Our engine finds and scores matching contacts across African markets.' },
            { step: '03', title: 'POPIA consent runs', desc: 'Consent requests go out automatically. We track every event for compliance.' },
            { step: '04', title: 'Export to your CRM', desc: 'Download consented leads as CSV or sync directly to your sales stack.' },
          ].map(({ step, title, desc }) => (
            <div key={step} className="text-center">
              <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-500 font-bold text-lg flex items-center justify-center mx-auto mb-4">
                {step}
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-brand-900 mb-3">Simple, transparent pricing</h2>
            <p className="text-gray-500">Billed in ZAR or USD. No hidden fees.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {[
              {
                tier: 'Starter',
                price: '$299',
                period: '/month',
                description: 'For businesses just getting started with AI-powered lead generation.',
                features: ['250 leads/month', 'AI scoring & POPIA consent', 'CSV export', '14-day free trial'],
                cta: 'Start free trial',
                highlight: false,
              },
              {
                tier: 'Pro',
                price: '$599',
                period: '/month',
                description: 'For growing teams that need higher volume and smarter automation.',
                features: ['750 leads/month', 'Everything in Starter', 'Advanced ICP filters', 'Virtual Assistant add-on'],
                cta: 'Start free trial',
                highlight: true,
              },
              {
                tier: 'Enterprise',
                price: '$1,200',
                period: '/month',
                description: 'For scale-ups that need the full suite with dedicated support.',
                features: ['2,500 leads/month', 'All products included', 'Dedicated account manager', 'Custom integrations'],
                cta: 'Talk to sales',
                highlight: false,
              },
            ].map((plan) => (
              <div
                key={plan.tier}
                className={`rounded-2xl p-7 flex flex-col ${plan.highlight ? 'bg-brand-900 text-white ring-2 ring-brand-500' : 'bg-white border border-gray-100'}`}
              >
                <p className={`text-sm font-semibold mb-1 ${plan.highlight ? 'text-brand-300' : 'text-brand-500'}`}>{plan.tier}</p>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className={`text-4xl font-bold ${plan.highlight ? 'text-white' : 'text-gray-900'}`}>{plan.price}</span>
                  <span className={`text-sm ${plan.highlight ? 'text-brand-300' : 'text-gray-400'}`}>{plan.period}</span>
                </div>
                <p className={`text-sm mb-6 leading-relaxed ${plan.highlight ? 'text-brand-200' : 'text-gray-500'}`}>{plan.description}</p>
                <ul className="space-y-2.5 mb-8 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className={`w-4 h-4 shrink-0 ${plan.highlight ? 'text-brand-400' : 'text-brand-500'}`} />
                      <span className={plan.highlight ? 'text-brand-100' : 'text-gray-600'}>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/login"
                  className={`text-center text-sm font-semibold py-3 rounded-xl transition-colors ${
                    plan.highlight
                      ? 'bg-brand-500 hover:bg-brand-600 text-white'
                      : 'bg-brand-50 hover:bg-brand-100 text-brand-600'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="py-20 max-w-6xl mx-auto px-6 text-center">
        <div className="bg-brand-900 rounded-3xl px-8 py-16">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to build your African pipeline?</h2>
          <p className="text-brand-200 mb-8 max-w-lg mx-auto">
            Join businesses across South Africa, Nigeria, Kenya, and beyond using K.I.N.D to grow faster with AI.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 bg-white text-brand-900 font-semibold px-7 py-3.5 rounded-xl hover:bg-brand-50 transition-colors text-base"
          >
            Start your free trial
            <ArrowRight className="w-4 h-4" />
          </Link>
          <p className="text-brand-400 text-sm mt-4">14 days free · No credit card required</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Zap className="text-brand-500 w-4 h-4" />
            <span className="font-bold text-brand-900 text-sm">K.I.N.D</span>
            <span className="text-gray-400 text-xs ml-2">AI Intelligence Platform</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-gray-400">
            <Link href="/login" className="hover:text-gray-600 transition-colors">Sign in</Link>
            <Link href="/login" className="hover:text-gray-600 transition-colors">Get started</Link>
            <span>© {new Date().getFullYear()} K.I.N.D</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
