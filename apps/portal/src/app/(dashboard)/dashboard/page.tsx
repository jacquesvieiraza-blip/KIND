import { createClient } from '@/lib/supabase/server'
import { api } from '@/lib/api'
import { StatCard } from '@/components/ui/StatCard'
import { ProductCard } from '@/components/ui/ProductCard'
import { Users, Bot, MessageSquare, TrendingUp, Zap } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  let client = null
  let leadStats = null

  if (session) {
    try {
      const res = await api.get<{ data: Record<string, unknown> }>('/clients/me', session.access_token)
      client = res.data
      const statsRes = await api.get<{ data: Record<string, unknown> }>('/leads/stats', session.access_token)
      leadStats = statsRes.data
    } catch {
      // Not onboarded yet
    }
  }

  if (!client) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Zap className="w-12 h-12 text-brand-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Welcome to K.I.N.D</h2>
          <p className="text-gray-500 mb-4">Complete your business profile to get started.</p>
          <a
            href="/onboard"
            className="inline-block bg-brand-500 hover:bg-brand-600 text-white font-medium rounded-lg px-5 py-2.5 text-sm transition-colors"
          >
            Set up my profile
          </a>
        </div>
      </div>
    )
  }

  const stats = leadStats as { total: number; scored: number; consented: number; exported: number; avg_score: number } | null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Good morning, {(client as { company_name: string }).company_name}
        </h1>
        <p className="text-gray-500 text-sm mt-1">Here's what's happening with your AI products today.</p>
      </div>

      {/* Lead Gen Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Leads" value={stats?.total ?? 0} icon={<Users className="w-5 h-5" />} color="blue" />
        <StatCard label="Scored" value={stats?.scored ?? 0} icon={<TrendingUp className="w-5 h-5" />} color="indigo" />
        <StatCard label="POPIA Consented" value={stats?.consented ?? 0} icon={<Zap className="w-5 h-5" />} color="green" />
        <StatCard label="Avg Score" value={stats?.avg_score ?? 0} suffix="/100" icon={<TrendingUp className="w-5 h-5" />} color="purple" />
      </div>

      {/* Product Cards */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Your AI Products</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ProductCard
            title="AI Lead Generation"
            description="Precision-targeted B2B leads, scored and POPIA-compliant."
            icon={<Users className="w-6 h-6" />}
            href="/dashboard/leads"
            status="active"
            metric={`${stats?.total ?? 0} leads this month`}
          />
          <ProductCard
            title="Virtual Assistant"
            description="Scheduling, email drafting, and knowledge queries."
            icon={<Bot className="w-6 h-6" />}
            href="/dashboard/assistant"
            status="active"
            metric="Ready to use"
          />
          <ProductCard
            title="Chatbot Agent"
            description="Web and WhatsApp AI chatbot for your customers."
            icon={<MessageSquare className="w-6 h-6" />}
            href="/dashboard/chatbot"
            status="active"
            metric="Configure your bot"
          />
        </div>
      </div>
    </div>
  )
}
