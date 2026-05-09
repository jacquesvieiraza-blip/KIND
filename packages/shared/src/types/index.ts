export type UserRole = 'client' | 'admin'

export interface User {
  id: string
  email: string
  full_name: string
  role: UserRole
  created_at: string
}

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

export type LeadStatus = 'pending' | 'scored' | 'consent_sent' | 'consent_given' | 'exported' | 'rejected'

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

export interface ApiSuccess<T> { success: true; data: T }
export interface ApiError { success: false; error: string; code?: string }
export type ApiResponse<T> = ApiSuccess<T> | ApiError
