// Item 187 — applying a saved sequence/template to a campaign (email-first).
//
// A sequence's EMAIL steps carry literal copy with merge tokens. When a campaign
// has an applied sequence, enrolling a lead substitutes the tokens and writes the
// copy into the enrollment's step{1,2,3}_subject/body — the same shape the existing
// AI path produces — so the send engine carries it with no further changes.

export type SequenceChannel = 'email' | 'linkedin' | 'call' | 'whatsapp'

export interface SequenceStep {
  channel: SequenceChannel
  subject?: string
  body?: string
  wait_days?: number
  on_reply?: 'stop' | 'skip_next' | 'continue'
}

export interface DraftStep { subject: string; body: string }
export interface SequenceDraft {
  step1: DraftStep
  step2: DraftStep
  step3: DraftStep
}

/** #212/#426 — the max email steps a single sequence may run. */
export const MAX_SEQUENCE_STEPS = 10

/** A ready-to-send step: tokenised copy + the wait before the NEXT step fires. */
export interface DraftStepFull { subject: string; body: string; wait_days: number }

/** Lead fields available as merge tokens. */
export interface TokenLead {
  first_name?: string | null
  last_name?: string | null
  company?: string | null
  job_title?: string | null
  industry?: string | null
}

/**
 * Substitutes {{token}} placeholders with lead/sender values. Unknown tokens and
 * missing values collapse to a sensible neutral ('there' for a name, '' otherwise)
 * so we never send a literal "{{first_name}}". Case-insensitive, tolerant of spaces.
 */
export function applyTokens(text: string, lead: TokenLead, senderCompany?: string | null): string {
  if (!text) return ''
  const map: Record<string, string> = {
    first_name: (lead.first_name || '').trim(),
    last_name:  (lead.last_name || '').trim(),
    name:       [lead.first_name, lead.last_name].filter(Boolean).join(' ').trim(),
    company:    (lead.company || '').trim(),
    job_title:  (lead.job_title || '').trim(),
    title:      (lead.job_title || '').trim(),
    industry:   (lead.industry || '').trim(),
    sender_company: (senderCompany || '').trim(),
  }
  return text.replace(/\{\{\s*([\w]+)\s*\}\}/g, (_m, raw: string) => {
    const key = raw.toLowerCase()
    const val = map[key]
    if (val) return val
    // Graceful fallbacks for the most common name tokens when we have no value.
    if (key === 'first_name' || key === 'name') return 'there'
    return ''
  })
}

/** Only email steps send today; keep them in order. */
export function emailSteps(steps: SequenceStep[]): SequenceStep[] {
  return (steps || []).filter(s => s && s.channel === 'email')
}

/**
 * Builds the {step1,step2,step3} enrollment draft from a sequence's email steps.
 * Up to 3 email steps are used (the enrollment schema has three slots); any unused
 * slot is left empty, and the send engine safely skips empty steps. Returns null if
 * the sequence has no usable (subject+body) email steps.
 */
export function buildDraftFromSequence(
  steps: SequenceStep[],
  lead: TokenLead,
  senderCompany?: string | null,
): SequenceDraft | null {
  const emails = emailSteps(steps)
    .filter(s => (s.subject || '').trim() && (s.body || '').trim())
    .slice(0, 3)
  if (emails.length === 0) return null

  const empty: DraftStep = { subject: '', body: '' }
  const draft: SequenceDraft = { step1: empty, step2: empty, step3: empty }
  emails.forEach((s, i) => {
    const slot = `step${i + 1}` as 'step1' | 'step2' | 'step3'
    draft[slot] = {
      subject: applyTokens(s.subject || '', lead, senderCompany),
      body:    applyTokens(s.body || '', lead, senderCompany),
    }
  })
  return draft
}

/** The wait-days for each email step (used to set the campaign's send cadence). */
export function emailWaitDays(steps: SequenceStep[]): number[] {
  return emailSteps(steps).slice(0, 3).map(s => Math.max(0, Math.round(s.wait_days ?? 0)))
}

/**
 * #212 — builds the FULL ordered step array (up to MAX_SEQUENCE_STEPS = 10) from a
 * client-built sequence's email steps, tokens substituted. `wait_days` is the delay
 * before the NEXT step (default 4 if unset). Returns [] if no usable email step.
 * This is what an enrollment stores in its `steps` jsonb — the send engine walks it.
 */
export function buildDraftStepsFromSequence(
  steps: SequenceStep[],
  lead: TokenLead,
  senderCompany?: string | null,
): DraftStepFull[] {
  return emailSteps(steps)
    .filter(s => (s.subject || '').trim() && (s.body || '').trim())
    .slice(0, MAX_SEQUENCE_STEPS)
    .map(s => ({
      subject:   applyTokens(s.subject || '', lead, senderCompany),
      body:      applyTokens(s.body || '', lead, senderCompany),
      wait_days: Math.max(0, Math.round(s.wait_days ?? 4)),
    }))
}

/** Turn a 3-step AI draft into the same full-step array shape (default cadence 4/5). */
export function draftToSteps(draft: SequenceDraft): DraftStepFull[] {
  const out: DraftStepFull[] = []
  const defaults = [4, 5, 0]
  for (const [i, key] of (['step1', 'step2', 'step3'] as const).entries()) {
    const s = draft[key]
    if (s && (s.subject || '').trim() && (s.body || '').trim()) {
      out.push({ subject: s.subject, body: s.body, wait_days: defaults[i] ?? 4 })
    }
  }
  return out
}
