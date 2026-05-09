import { Router } from 'express'
import { db } from '@kind/db'
import { requireAuth, AuthRequest } from '../middleware/auth'

export const roadmapRouter = Router()

roadmapRouter.use(requireAuth)

type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'cancelled'
type ProductType = 'lead_gen' | 'virtual_assistant' | 'chatbot' | 'consulting'
type ProductTier = 'starter' | 'pro' | 'enterprise'

interface Subscription {
  product: ProductType
  tier: ProductTier
  status: SubscriptionStatus
}

interface UsageMetrics {
  leads_sourced: number
  leads_scored: number
  va_messages: number
  chatbot_conversations: number
}

function tierWeight(tier: ProductTier): number {
  return tier === 'enterprise' ? 3 : tier === 'pro' ? 2 : 1
}

function computeMaturityScore(active: Subscription[], usage: UsageMetrics | null): number {
  let score = 0

  for (const sub of active) {
    if (sub.product === 'lead_gen') score += 10 + tierWeight(sub.tier) * 10
    else if (sub.product === 'virtual_assistant') score += 8 + tierWeight(sub.tier) * 7
    else if (sub.product === 'chatbot') score += 7 + tierWeight(sub.tier) * 6
    else if (sub.product === 'consulting') score += 5 + tierWeight(sub.tier) * 5
  }

  if (usage) {
    if (usage.leads_sourced > 100) score += 5
    if (usage.va_messages > 200) score += 3
    if (usage.chatbot_conversations > 100) score += 2
  }

  return Math.min(score, 100)
}

function computePhase(active: Subscription[]): 'foundation' | 'growth' | 'scale' | 'enterprise' {
  const products = new Set(active.map((s) => s.product))
  const hasEnterpriseTier = active.some((s) => s.tier === 'enterprise')

  if (products.has('consulting') || (hasEnterpriseTier && products.size >= 3)) return 'enterprise'
  if (products.has('chatbot')) return 'scale'
  if (products.has('virtual_assistant')) return 'growth'
  return 'foundation'
}

function getMilestones(active: Subscription[], usage: UsageMetrics | null, leadTotal: number) {
  const products = new Set(active.map((s) => s.product))
  return [
    { id: 'first_lead', label: 'First 50 leads sourced', completed: leadTotal >= 50 },
    { id: 'popia_consent', label: 'POPIA consent flow active', completed: leadTotal > 0 },
    { id: 'va_active', label: 'Virtual Assistant activated', completed: products.has('virtual_assistant') },
    { id: 'chatbot_active', label: 'Chatbot Agent live', completed: products.has('chatbot') },
    { id: 'va_100_msgs', label: '100 VA messages sent', completed: (usage?.va_messages ?? 0) >= 100 },
    { id: 'chatbot_50_conv', label: '50 chatbot conversations', completed: (usage?.chatbot_conversations ?? 0) >= 50 },
    { id: 'consulting', label: 'Consulting retainer secured', completed: products.has('consulting') },
  ]
}

function getNextRecommendation(active: Subscription[]) {
  const products = new Set(active.map((s) => s.product))
  const leadSub = active.find((s) => s.product === 'lead_gen')

  if (!products.has('lead_gen')) {
    return {
      product: 'AI Lead Generation',
      tier: 'Starter',
      rationale: 'Start filling your pipeline with 250 precision-targeted B2B leads/month.',
      estimated_roi: 'R5,700+ per closed deal (avg SA B2B)',
      time_to_value: '2–3 weeks',
    }
  }

  if (leadSub?.tier === 'starter' && !products.has('virtual_assistant')) {
    return {
      product: 'Virtual Assistant',
      tier: 'Starter',
      rationale: 'Automate follow-up emails and scheduling to convert your leads faster.',
      estimated_roi: '4–6 hrs/week saved per sales rep',
      time_to_value: '1 week',
    }
  }

  if (leadSub?.tier === 'starter') {
    return {
      product: 'AI Lead Generation',
      tier: 'Pro',
      rationale: 'Upgrade to 750 leads/month and unlock advanced ICP scoring.',
      estimated_roi: '3× more pipeline opportunities',
      time_to_value: 'Immediate on upgrade',
    }
  }

  if (!products.has('chatbot')) {
    return {
      product: 'AI Chatbot Agent',
      tier: 'Starter',
      rationale: 'Handle inbound queries 24/7 on your website or WhatsApp.',
      estimated_roi: '60% reduction in first-response time',
      time_to_value: '1–2 weeks to configure',
    }
  }

  if (!products.has('consulting')) {
    return {
      product: 'Monthly Consulting Retainer',
      tier: 'Pro',
      rationale: 'Work directly with our AI strategists to maximise ROI across all products.',
      estimated_roi: 'Tailored — avg clients see 40% pipeline growth in 90 days',
      time_to_value: 'Month 1 strategy sprint',
    }
  }

  return {
    product: 'Enterprise Upgrade',
    tier: 'Enterprise',
    rationale: 'Unlock unlimited scale across all products with dedicated support.',
    estimated_roi: 'Custom SLA + priority model fine-tuning',
    time_to_value: 'Onboarding within 5 business days',
  }
}

function getRoiProjection(active: Subscription[], leadTotal: number) {
  const leadSub = active.find((s) => s.product === 'lead_gen')
  const leadsPerMonth = leadSub?.tier === 'enterprise' ? 2500 : leadSub?.tier === 'pro' ? 750 : 250
  const conversionRate = 0.04 // 4% B2B avg
  const avgDealZar = 85000

  const m3Leads = leadsPerMonth * 3 + leadTotal
  const m6Leads = leadsPerMonth * 6 + leadTotal
  const m12Leads = leadsPerMonth * 12 + leadTotal

  return {
    months_3: {
      leads: m3Leads,
      revenue_impact_zar: Math.round(m3Leads * conversionRate * avgDealZar),
    },
    months_6: {
      leads: m6Leads,
      revenue_impact_zar: Math.round(m6Leads * conversionRate * avgDealZar),
    },
    months_12: {
      leads: m12Leads,
      revenue_impact_zar: Math.round(m12Leads * conversionRate * avgDealZar),
    },
  }
}

// GET /roadmap — personalised AI business roadmap for the authenticated client
roadmapRouter.get('/', async (req: AuthRequest, res) => {
  try {
    const { data: client, error } = await db
      .from('clients')
      .select('id, company_name, industry, subscriptions(*), usage_metrics(*)')
      .eq('user_id', req.userId!)
      .single()

    if (error || !client) {
      res.status(404).json({ success: false, error: 'Client not found' })
      return
    }

    const allSubs = (client.subscriptions as Subscription[]) ?? []
    const active = allSubs.filter((s) => s.status === 'active' || s.status === 'trialing')

    const usageRows = (client.usage_metrics as UsageMetrics[]) ?? []
    const usage: UsageMetrics | null = usageRows.length
      ? usageRows.reduce(
          (acc, row) => ({
            leads_sourced: acc.leads_sourced + (row.leads_sourced ?? 0),
            leads_scored: acc.leads_scored + (row.leads_scored ?? 0),
            va_messages: acc.va_messages + (row.va_messages ?? 0),
            chatbot_conversations: acc.chatbot_conversations + (row.chatbot_conversations ?? 0),
          }),
          { leads_sourced: 0, leads_scored: 0, va_messages: 0, chatbot_conversations: 0 }
        )
      : null

    const { count: leadTotal } = await db
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('client_id', client.id)

    const totalLeads = leadTotal ?? 0
    const maturityScore = computeMaturityScore(active, usage)
    const currentPhase = computePhase(active)
    const milestones = getMilestones(active, usage, totalLeads)
    const nextRecommendation = getNextRecommendation(active)
    const roiProjection = getRoiProjection(active, totalLeads)

    const phases = [
      {
        id: 'foundation',
        name: 'Foundation',
        description: 'Establish AI-powered lead generation and start building a compliant pipeline.',
        products_required: ['AI Lead Generation'],
        milestones: milestones.filter((m) => ['first_lead', 'popia_consent'].includes(m.id)),
        status:
          currentPhase === 'foundation'
            ? 'current'
            : ['growth', 'scale', 'enterprise'].includes(currentPhase)
              ? 'completed'
              : 'upcoming',
      },
      {
        id: 'growth',
        name: 'Growth',
        description: 'Layer in the Virtual Assistant to automate outreach and accelerate conversion.',
        products_required: ['AI Lead Generation', 'Virtual Assistant'],
        milestones: milestones.filter((m) => ['va_active', 'va_100_msgs'].includes(m.id)),
        status:
          currentPhase === 'growth'
            ? 'current'
            : ['scale', 'enterprise'].includes(currentPhase)
              ? 'completed'
              : 'upcoming',
      },
      {
        id: 'scale',
        name: 'Scale',
        description: 'Deploy the AI Chatbot to handle inbound 24/7 across web and WhatsApp.',
        products_required: ['AI Lead Generation', 'Virtual Assistant', 'AI Chatbot Agent'],
        milestones: milestones.filter((m) => ['chatbot_active', 'chatbot_50_conv'].includes(m.id)),
        status: currentPhase === 'scale' ? 'current' : currentPhase === 'enterprise' ? 'completed' : 'upcoming',
      },
      {
        id: 'enterprise',
        name: 'Enterprise',
        description: 'Maximise with consulting-led strategy, enterprise tiers, and dedicated AI support.',
        products_required: ['All products', 'Consulting Retainer'],
        milestones: milestones.filter((m) => m.id === 'consulting'),
        status: currentPhase === 'enterprise' ? 'current' : 'upcoming',
      },
    ]

    res.json({
      success: true,
      data: {
        company_name: client.company_name,
        industry: client.industry,
        maturity_score: maturityScore,
        current_phase: currentPhase,
        active_products: active.map((s) => s.product),
        phases,
        next_recommendation: nextRecommendation,
        roi_projection: roiProjection,
        usage: usage ?? { leads_sourced: 0, leads_scored: 0, va_messages: 0, chatbot_conversations: 0 },
      },
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, error: 'Failed to generate roadmap' })
  }
})
