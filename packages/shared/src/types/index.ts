export type UserRole = 'client' | 'admin'

export interface User {
  id: string
  email: string
  full_name: string
  role: UserRole
  created_at: string
}

export type SubscriptionStatus = 'active' | 'inactive' | 'trialing' | 'past_due' | 'cancelled'
export type ProductTier = 'starter' | 'pro' | 'advanced' | 'enterprise'
export type ProductType = 'lead_gen' | 'lead_gen_figsy' | 'virtual_assistant' | 'chatbot'

export interface Subscription {
  id: string
  client_id: string
  product: ProductType
  tier: ProductTier
  status: SubscriptionStatus
  billing_interval: 'monthly' | 'annual'
  amount_usd: number
  amount_zar: number
  paystack_subscription_code: string | null
  paystack_customer_code: string | null
  paystack_plan_code: string | null
  trial_ends_at: string | null
  current_period_start: string
  current_period_end: string
  cancelled_at: string | null
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

export interface ICP {
  id: string
  client_id: string
  name: string
  industries: string[]
  job_titles: string[]
  seniority_levels: string[]
  company_sizes: string[]
  geographies: string[]
  tech_stack: string[]
  keywords: string[]
  apollo_only_consented: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

export type LeadStatus =
  | 'pending'
  | 'scored'
  | 'consent_sent'
  | 'consent_given'
  | 'exported'
  | 'rejected'
  | 'opted_out'

export interface Lead {
  id: string
  client_id: string
  icp_id: string | null
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  job_title: string | null
  company: string | null
  linkedin_url: string | null
  country: string | null
  company_size: string | null
  industry: string | null
  seniority: string | null
  tech_stack: string[] | null
  apollo_id: string | null
  apollo_consented: boolean
  score: number | null
  score_reasoning: string | null
  scored_at: string | null
  ai_email_draft: string | null
  outreach_sent_at: string | null
  status: LeadStatus
  consent_sent_at: string | null
  consent_given_at: string | null
  opted_out_at: string | null
  crm_synced: boolean
  crm_contact_id: string | null
  exported_at: string | null
  estimated_deal_value_usd: number | null
  created_at: string
  updated_at: string
}

export interface OptOutBlocklist {
  id: string
  email: string
  linkedin_url: string | null
  full_name: string | null
  reason: string | null
  blocked_by_client_id: string | null
  opted_back_in_at: string | null
  created_at: string
}

export interface LeadStats {
  total: number
  scored: number
  consented: number
  exported: number
  opted_out: number
  avg_score: number
  pipeline_value_usd: number
}

export interface ICPFormData {
  name: string
  industries: string[]
  job_titles: string[]
  seniority_levels: string[]
  company_sizes: string[]
  geographies: string[]
  tech_stack: string[]
  keywords: string[]
  apollo_only_consented: boolean
}

export interface ApiSuccess<T> { success: true; data: T }
export interface ApiError { success: false; error: string; code?: string }
export type ApiResponse<T> = ApiSuccess<T> | ApiError
