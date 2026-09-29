// ⚑ 28 Sep (R173) — EVERY COLUMN THE DEMO WRITES IS ONE THE LIVE DATABASE IS PROVEN TO HAVE.
//
// 🛑 WHAT EARNED THIS. The founder pressed "Programme" on the live Vida minutes after #2405–#2407
// shipped and got: "Could not write milla_sessions: Could not find the 'updated_at' column". The
// demo walk had passed — against the harness schema, which `scripts/realdb/README.md` says in so
// many words is NOT production's (live `milla_sessions` came from `008_milla.sql`, with no
// `updated_at`; the later file that declares one is `create table if not exists`, a no-op there).
//
// ⚠️ SO THIS LIST IS THE PROOF, NOT THE HARNESS. A column is on it only when the REAL product
// already writes or reads it on the live site (the file named beside each table), or it was
// written by the demo build that already ran live (#2403). A new demo column that is not here
// fails this test, and the person adding it must find that live proof first — or not write it.
import { describe, it, expect } from 'vitest'
import { northwindRows, NORTHWIND_STAGES, type NorthwindStage } from './demo-northwind-data'

const LIVE: Record<string, string[]> = {
  // #2403 ran live with these; `signup_terms_accepted_at` — routes/auth.ts (every signup);
  // `proof_passes_legacy` — routes/operator.ts reads it for every client.
  client: ['id', 'user_id', 'company_name', 'is_demo', 'country', 'website', 'industry', 'plan', 'contact_email',
    'onboarded_at', 'signup_terms_accepted_at', 'size_band', 'size_employees', 'size_source', 'size_set_by',
    'size_locked_at', 'size_checked_at', 'proof_started_at', 'proof_passes_done', 'proof_passes_legacy', 'proof_completed_at'],
  // lib/brief-draft.ts COLUMNS (conversation included).
  draft: ['user_id', 'facts', 'conversation', 'confirmed_at', 'promoted_client_id', 'promoted_at'],
  icp: ['id', 'client_id', 'name', 'industries', 'geographies', 'job_titles', 'seniority_levels', 'company_sizes',
    'tech_stack', 'keywords', 'target_category', 'target_company_type', 'exclusions', 'apollo_only_consented',
    'is_active', 'programme_id'],
  // `email_status` — lib/lead-delivery.ts writes it on every reveal.
  leads: ['id', 'client_id', 'icp_id', 'first_name', 'last_name', 'email', 'job_title', 'seniority', 'company',
    'industry', 'country', 'company_size', 'score', 'score_reasoning', 'category_fit', 'status', 'proof_pass',
    'delivered_at', 'surfaced_for_approval_at', 'programme_id', 'qualified_at', 'email_status'],
  // lib/morning-brief-deliver.ts + routes/milla.ts insert exactly (client_id, title) — never `updated_at`.
  session: ['id', 'client_id', 'title', 'created_at'],
  // lib/morning-brief-deliver.ts inserts (session_id, client_id, role, content, sources).
  messages: ['session_id', 'client_id', 'role', 'content', 'created_at'],
  // lib/proof-claim.ts reads the ledger live; the columns are its 20260912 definition.
  proofClaim: ['client_id', 'icp_id', 'authority', 'status', 'claimed_at', 'settled_at'],
  programme: ['id', 'client_id', 'status', 'meeting_target', 'recommended_volume', 'price_per_meeting_cents',
    'price_total_cents', 'first_payment_cents', 'second_payment_cents', 'size_band', 'sourcing_ceiling', 'sourced_used',
    // ⛓️ 29 Sep (R174 ⑧ · PR 8b): ~~'first_authorised_at', 'second_authorised_at'~~ — the demo now reads
    // paid in full. `first_paid_at`, `first_payment_ref`, `second_paid_at`, `second_payment_ref` —
    // lib/programme.ts writes all four on every real Stripe payment (the one-payment branch sets both).
    'recommendation_accepted_at', 'first_paid_at', 'first_payment_ref', 'second_paid_at', 'second_payment_ref',
    'approved_at', 'went_live_at', 'run_at', 'delivered_meetings'],
  campaign: ['id', 'client_id', 'icp_id', 'name', 'status', 'steps_count'],
  sequence: ['id', 'client_id', 'campaign_id', 'name', 'steps'],
  // `programme_id`, `sequence_id` — lib/programme-authority.ts selects both live.
  enrollments: ['client_id', 'campaign_id', 'programme_id', 'sequence_id', 'lead_id', 'status', 'current_step', 'enrolled_at'],
  // lib/client-offer.ts upserts (client_id, kind, data).
  offer: ['client_id', 'kind', 'data'],
  sentEmails: ['campaign_id', 'lead_id', 'step', 'subject', 'body', 'status', 'sent_at'],
  // `meeting_booked_at` — routes/operator.ts selects it for every client's board.
  replies: ['id', 'client_id', 'campaign_id', 'lead_id', 'from_email', 'from_name', 'subject', 'body', 'body_text',
    'classification', 'received_at', 'meeting_booked_at'],
  meetings: ['client_id', 'programme_id', 'campaign_id', 'lead_id', 'state', 'booked_at', 'scheduled_at', 'verified_at',
    'held_confirmed_at', 'qualification', 'qualified_at', 'qualified_by', 'evidence_reply_id', 'evidence_note'],
}

const ids = new Proxy({}, { get: (_t, k) => `00000000-0000-4000-8000-${String(String(k).length).padStart(12, '0')}` }) as never

describe('🛑 the demo writes only columns the live database is proven to have', () => {
  for (const stage of NORTHWIND_STAGES as readonly NorthwindStage[]) {
    for (const meetings of [1, 5, 8]) {
      it(`${stage} at ${meetings} meetings`, () => {
        const rows = northwindRows(stage, ids, new Date('2026-09-28T09:00:00Z'), { meetings }) as unknown as Record<string, unknown>
        for (const [table, value] of Object.entries(rows)) {
          const list = (Array.isArray(value) ? value : value ? [value] : []) as Record<string, unknown>[]
          for (const row of list) {
            if (!row || typeof row !== 'object') continue
            expect(LIVE[table], `the demo writes a table with no live proof: ${table}`).toBeDefined()
            const unproven = Object.keys(row).filter(c => !LIVE[table].includes(c))
            expect(unproven, `${table} writes a column with no live proof`).toEqual([])
          }
        }
      })
    }
  }
})
