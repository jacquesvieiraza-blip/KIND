// ─── User & Auth ────────────────────────────────────────────────────────────

export type UserRole = 'client' | 'admin'

export interface User {
  id: string
  email: string
  full_name: string
  role: UserRole
  created_at: string
}

// ─── Subscription & Billing ──────────────────────────────────────────────────

export type SubscriptionStatus = 'active' | 'inactive' | 'trialing' | 'past_due' | 'cancelled'

export type ProductTier = 'starter' | 'pro' | 'enterprise'

export type ProductType = 'lead_gen' | 'virtual_assistant' | 'chatbot' | 'consulting'

export interface Subscription {
  id: string
  client_id: string
  product: ProductType
  tier: ProductTier
  status: SubscriptionStatus
  paystack_subscription_code: string | null
  paystack_customer_code: string | null
  amount_usd: number
  billing_interval: 'monthly' | 'annual'
  trial_ends_at: string | null
  current_period_start: string
  current_period_end: string
  created_at: string
  updated_at: string
}

// ─── Client ──────────────────────────────────────────────────────────────────

export interface Client {
  id: string
  user_id: string
  company_name: string
  industry: string | null
  country: string
  website: string | null
  phone: string | null
  onboarded_at: string | null
  created_at: string
}

// ─── Lead Gen ────────────────────────────────────────────────────────────────

export type LeadStatus = 'pending' | 'scored' | 'consent_sent' | 'consent_given' | 'exported' | 'rejected'

export interface ICP {
  id: string
  client_id: string
  industries: string[]
  job_titles: string[]
  company_sizes: string[]
  locations: string[]
  keywords: string[]
  created_at: string
  updated_at: string
}

export interface Lead {
  id: string
  client_id: string
  icp_id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  job_title: string | null
  company: string | null
  linkedin_url: string | null
  country: string | null
  score: number | null
  score_reasoning: string | null
  status: LeadStatus
  consent_sent_at: string | null
  consent_given_at: string | null
  exported_at: string | null
  crm_synced: boolean
  created_at: string
}

// ─── Virtual Assistant ────────────────────────────────────────────────────────

export interface VAConversation {
  id: string
  client_id: string
  channel: 'whatsapp' | 'email' | 'web'
  messages: VAMessage[]
  created_at: string
}

export interface VAMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

// ─── Chatbot ─────────────────────────────────────────────────────────────────

export interface ChatbotConfig {
  id: string
  client_id: string
  name: string
  system_prompt: string
  whatsapp_enabled: boolean
  web_enabled: boolean
  escalation_email: string | null
  created_at: string
}

// ─── Analytics ───────────────────────────────────────────────────────────────

export interface UsageMetrics {
  client_id: string
  period_start: string
  period_end: string
  leads_sourced: number
  leads_scored: number
  leads_exported: number
  va_messages: number
  chatbot_conversations: number
  voice_minutes: number
}

// ─── Paystack ────────────────────────────────────────────────────────────────

export interface PaystackWebhookEvent {
  event: string
  data: Record<string, unknown>
}

export interface PaystackCustomer {
  id: number
  customer_code: string
  email: string
  first_name: string
  last_name: string
}

export interface PaystackSubscription {
  subscription_code: string
  status: string
  amount: number
  plan: {
    plan_code: string
    name: string
    interval: string
  }
  customer: PaystackCustomer
  next_payment_date: string
}

// ─── API Responses ───────────────────────────────────────────────────────────

export interface ApiSuccess<T> {
  success: true
  data: T
}

export interface ApiError {
  success: false
  error: string
  code?: string
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError
