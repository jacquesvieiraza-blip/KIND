import Anthropic from '@anthropic-ai/sdk'
import { db } from '@kind/db'
import { sendFounderAlert } from './alerts'
import { unscoredOnFailure } from './scoring-failure'
import { BACKGROUND_MODEL } from './models'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

interface IcpCriteria {
  job_titles:       string[]
  seniority_levels: string[]
  industries:       string[]
  company_sizes:    string[]
  geographies:      string[]
  keywords:         string[]
  /**
   * ── 🛑 ⚑ 18 Sep (J5-C13 · FD-2) — THE CLIENT'S OWN WORDS, WHICH THE MODEL HAD NEVER SEEN
   *
   * The prompt below described the ICP with `Industries:` — the CLOSED sixteen-value provider
   * list — and nothing else about what kind of company the client asked for. So the model
   * judging fit had never been told the one fact that defines it: a client who said "digital
   * marketing agencies" reached the scorer as `Industries: Media, Consulting` or, more often,
   * as `Industries: any`.
   *
   * ⚠️ OPTIONAL, SO A LEGACY ICP IS UNCHANGED. Absent means the prompt is byte-identical to
   * what it was and the verdict is `unknown`, which `structurallyEligible` already refuses to
   * count as a match — FD-2's "UNKNOWN never eligible", with no new rule needed.
   */
  target_category?:     string | null
  target_company_type?: string | null
  /** FD-1's sentence, so the model can recognise what the client asked us to leave out. */
  exclusions?:          string | null
}

interface ScoreResult {
  id:        string
  score:     number
  reasoning: string
  /**
   * ⚑ 18 Sep (J5-C13 · FD-2) — the MODEL'S verdict on whether this company is the kind the
   * client asked for. Absent on a legacy reply, which reads as `unknown`.
   */
  category_fit?:        'yes' | 'no' | 'unknown'
  category_fit_reason?: string
}

// Strip markdown code fences that Claude sometimes wraps JSON in
function stripCodeFences(text: string): string {
  return text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim()
}

// Parse Claude's JSON response safely — returns empty array on any failure
function parseScoringResponse(raw: string): ScoreResult[] {
  try {
    const cleaned = stripCodeFences(raw)
    const parsed  = JSON.parse(cleaned)
    if (!Array.isArray(parsed)) {
      console.error('[scoring] Claude returned non-array:', raw.slice(0, 200))
      return []
    }
    return parsed.filter((r): r is ScoreResult =>
      typeof r?.id === 'string' &&
      typeof r?.score === 'number' &&
      typeof r?.reasoning === 'string'
    ).map((r: ScoreResult) => ({
      ...r,
      // ⚠️ AN UNRECOGNISED VERDICT IS `unknown`, NEVER `yes`. The model could return anything;
      // the only two values that may narrow or clear a client's targeting are the two we
      // named, and everything else is an answer we did not understand.
      category_fit: r.category_fit === 'yes' || r.category_fit === 'no' ? r.category_fit : 'unknown',
      category_fit_reason: typeof r.category_fit_reason === 'string'
        ? r.category_fit_reason.slice(0, 300) : undefined,
    }))
  } catch (err) {
    console.error('[scoring] JSON parse failed:', err, '| raw:', raw.slice(0, 200))
    return []
  }
}

export async function scoreLeadsForIcp(
  leadIds: string[],
  icp: IcpCriteria,
  clientName: string,
  clientId?: string,   // #511t3 — enables the gated Nexus persona-boost (optional; omitted = today)
): Promise<void> {
  if (!leadIds.length) return

  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('[scoring] ANTHROPIC_API_KEY not set — skipping scoring, leads will stay as "pending"')
    return
  }

  // ── #511t3 NEXUS SOURCING TUNING (GATED — default-deny, money-sensitive) ──────────
  // Nudge scoring toward the persona THIS client actually BOOKS — but ONLY when the client's
  // auto-tune switch is ON and the confidence gate passes. Computed ONCE (not per batch). If
  // the gate isn't 'ready' (the default for every client), nexusBoost is '' → the prompt is
  // byte-identical to today, so which leads score high — and therefore what we spend PDL on —
  // is UNCHANGED until the founder explicitly enables this client. Fenced + best-effort.
  let nexusBoost = ''
  if (clientId) {
    try {
      const { getNexusProfile } = await import('./nexus')
      const { nexusTuneGate, nexusGlobalKill, assertSameClient } = await import('./nexus-guard')
      const prof = await getNexusProfile(clientId)
      assertSameClient(prof.client_id, clientId) // THE FENCE — never another client's brain
      const { data: flag } = await db.from('clients').select('nexus_autotune_enabled').eq('id', clientId).maybeSingle()
      const gate = nexusTuneGate(prof, flag?.nexus_autotune_enabled === true, nexusGlobalKill())
      const persona = [prof.top_persona.job_title, prof.top_persona.seniority, prof.top_persona.industry].filter(Boolean).join(' · ')
      if (gate.allowed && persona) {
        nexusBoost = `\n\nNexus signal (this client's OWN booked-meeting history): they convert best with ${persona}. All else equal, score leads matching that persona higher — but never override a clear ICP mismatch.`
      }
    } catch { /* best-effort — scoring proceeds exactly as today on any Nexus error */ }
  }

  // ── CALIBRATION v1 (P32) — WHAT THIS CLIENT HAS BEEN REJECTING ──────────────────────────
  //
  // Founder-ruled 21 Aug: *"FIGSY's scoring prompt receives the client's recent feedback as
  // context."* Structured codes only — free text never reaches the model, for the same reason
  // it never reaches the sourcing filter: he gated it, and a prompt IS an application.
  //
  // Fenced and best-effort like the Nexus block above: one client's rows, and any failure
  // leaves scoring byte-identical to today.
  let feedbackContext = ''
  if (clientId) {
    try {
      const { scoringFeedbackContext } = await import('./lead-feedback')
      const { data: fb } = await db.from('lead_feedback')
        .select('reason_code, leads!inner(company_size)')
        .eq('client_id', clientId).eq('action', 'pass')
        .order('created_at', { ascending: false }).limit(100)
      const line = scoringFeedbackContext((fb ?? []).map((r: Record<string, unknown>) => ({
        reason_code: r.reason_code as never,
        company_size: (r.leads as { company_size?: string | null } | null)?.company_size ?? null,
      })))
      if (line) feedbackContext = `\n\n${line}`
    } catch { /* best-effort — scoring proceeds exactly as today on any error */ }
  }

  // ── THE MEETING BRIEF (P34) — WHAT THE CLIENT HAS CONFIRMED ABOUT WHO THEY WANT ──
  //
  // The third additive context block on this prompt, built exactly like the two above:
  // fenced to ONE client, best-effort, and byte-identical to today whenever it yields
  // nothing. `briefContextFor` returns null unless there is an APPROVED brief — a draft
  // we assembled but the client has not confirmed never reaches a model.
  //
  // ⚠️ EVIDENCE, NOT PERMISSION. The brief's geography records what the client WANTS to
  // target; it cannot widen the launch allowlist, PECR, suppression or any send gate,
  // none of which this table is wired to. The rendered text says so to the model too.
  let briefContext = ''
  if (clientId) {
    try {
      const { briefContextFor } = await import('./meeting-brief-deliver')
      const line = await briefContextFor(clientId)
      if (line) briefContext = `\n\n${line}`
    } catch { /* best-effort — scoring proceeds exactly as today on any error */ }
  }

  const BATCH_SIZE = 10
  let alertedScoringFailure = false   // #358 — alert at most once per call, not per batch

  for (let i = 0; i < leadIds.length; i += BATCH_SIZE) {
    const batchIds = leadIds.slice(i, i + BATCH_SIZE)

    try {
      const { data: leads, error } = await db
        .from('leads')
        .select('id, first_name, last_name, job_title, company, industry, seniority, country')
        .in('id', batchIds)

      if (error) {
        console.error(`[scoring] batch ${Math.floor(i / BATCH_SIZE) + 1} — leads fetch error:`, error.message)
        continue
      }
      if (!leads?.length) continue

      const icpDescription = [
        // ── 🛑 ⚑ 18 Sep (J5-C13 · FD-2) — THE CLIENT'S OWN WORDS COME FIRST ─────────────
        //
        // They are the requirement; `Industries` below is a provider tag and is EVIDENCE
        // toward it, never the thing itself. Listing the provider tag first (and alone, as
        // this prompt did) is how a model comes to judge "Media" instead of "digital
        // marketing agencies".
        ...(icp.target_category ? [`Kind of company they asked for (THEIR OWN WORDS): ${icp.target_category}`] : []),
        ...(icp.target_company_type ? [`Type of organisation: ${icp.target_company_type}`] : []),
        ...(icp.exclusions ? [`They asked us to LEAVE OUT: ${icp.exclusions}`] : []),
        `Job titles: ${icp.job_titles.join(', ') || 'any'}`,
        `Seniority levels: ${icp.seniority_levels.join(', ') || 'any'}`,
        `Industries (provider tags — evidence only, not the requirement): ${icp.industries.join(', ') || 'any'}`,
        `Company sizes: ${icp.company_sizes.join(', ') || 'any'}`,
        `Geographies: ${icp.geographies.join(', ') || 'any'}`,
        `Keywords: ${icp.keywords.join(', ') || 'none'}`,
      ].join('\n')

      const leadsText = leads
        .map(
          (l: Record<string, string | null>, idx: number) =>
            `${idx + 1}. id="${l.id}" name="${l.first_name} ${l.last_name}" title="${l.job_title || 'unknown'}" company="${l.company || 'unknown'}" industry="${l.industry || 'unknown'}" seniority="${l.seniority || 'unknown'}" country="${l.country || 'unknown'}"`,
        )
        .join('\n')

      // ── 🛑 ⚑ 18 Sep (J5-C13 · FD-2) — THE FOUNDER'S THREE RULES, STATED AS RULES ───────
      //
      // FD-2 is not "score it higher"; it is a THREE-VALUED judgement with two named edges,
      // and both edges exist because the founder was shown a real card that broke them:
      //
      //   · ADJACENT QUALIFIES — a brand agency for "digital marketing agencies" is the same
      //     kind of company. Refusing it throws away the client's actual market for a wording
      //     difference, which is what a word-overlap rule does and why this is a model's job.
      //   · VAGUE DOES NOT — "B2B services", "technology company", "consultancy" establish
      //     nothing. The 72/100 card beside the words "no evidence of digital marketing or
      //     agency focus" was exactly this: a plausible-sounding company admitted on vagueness.
      //   · UNKNOWN IS AN ANSWER — and it is the one to give whenever the evidence is thin.
      //     `structurallyEligible` already refuses to COUNT an unknown as a match, so an
      //     honest "I cannot tell" costs the client nothing and a confident guess costs them
      //     a card they have to read and reject.
      //
      // ⚠️ THE TASK IS OMITTED ENTIRELY WHEN THE CLIENT STATED NO CATEGORY. A legacy ICP gets
      // the byte-identical prompt it got yesterday, and its verdict stays `unknown`.
      const categoryTask = icp.target_category
        ? `\nSEPARATELY from the score, judge ONE thing about each lead's company: is it the KIND of company described above in the client's own words?
- "yes"     — the evidence shows it is that kind of company, INCLUDING an adjacent or differently-worded version of it (a brand agency for "digital marketing agencies" is a yes).
- "no"      — the evidence shows it is a DIFFERENT kind of company, or one the client asked us to leave out.
- "unknown" — the evidence is vague, generic or missing. "B2B services", "technology company" or a bare company name establish NOTHING and are always "unknown", never "yes".
Answer "unknown" whenever you are not sure. An honest "unknown" costs nothing; a confident guess puts a company in front of the client that they have to read and reject.`
        : ''

      const prompt = `You are scoring sales leads for ${clientName} against their Ideal Customer Profile (ICP).

ICP criteria:
${icpDescription}

Score each lead from 0 to 100 based on how well they match the ICP. 100 = perfect match, 0 = no match.${nexusBoost}${feedbackContext}${briefContext}

Leads to score:
${leadsText}

${categoryTask}

Return ONLY a JSON array with no markdown, no code fences, no explanation:
[{"id":"<lead-id>","score":<0-100>,"reasoning":"<one sentence>","category_fit":"yes|no|unknown","category_fit_reason":"<short phrase>"}]`

      const message = await anthropic.messages.create({
        model:      BACKGROUND_MODEL,
        max_tokens: 1024,
        messages:   [{ role: 'user', content: prompt }],
      })

      const raw     = (message.content[0] as { type: string; text: string }).text.trim()
      const results = parseScoringResponse(raw)

      if (!results.length) {
        console.error('[scoring] no valid results from Claude for batch', Math.floor(i / BATCH_SIZE) + 1)
        // #358 (AR-20) — DO NOT fake a 50/$5000 "scored" lead. A fabricated score is
        // indistinguishable from a real one, so the lead would be delivered + charged as
        // if genuinely qualified. Mark the batch DISTINCTLY instead: null score, no fake
        // value, scored_at null, and DON'T flip status to 'scored' — so the lead is not
        // delivered/charged and is re-scored on the next run. Alert once per call so a
        // persistent scoring outage is visible (the alarm is durable now, #339).
        await Promise.all(
          batchIds.map(id =>
            db.from('leads').update(unscoredOnFailure()).eq('id', id)
          )
        )
        if (!alertedScoringFailure) {
          alertedScoringFailure = true
          void sendFounderAlert('api_down', 'FIGSY lead scoring failed — AI returned no usable scores', [
            `Client: ${clientName}`,
            `At least one batch of ${batchIds.length} leads could not be scored and was left UNSCORED (not delivered, not charged).`,
            `They will be re-scored on the next run. If this persists, check ANTHROPIC_API_KEY / the model endpoint.`,
          ])
        }
        continue
      }

      const now = new Date().toISOString()

      // Update each lead individually so one failure doesn't block the rest
      await Promise.allSettled(
        results.map((r) =>
          db
            .from('leads')
            .update({
              score:                    r.score,
              score_reasoning:          r.reasoning,
              scored_at:                now,
              status:                   'scored',
              estimated_deal_value_usd: r.score * 100,
              // ⚑ 18 Sep (J5-C13 · FD-2) — the model's verdict, RECORDED so the gate can read
              // it. A judgement that lives only in the score is a judgement nothing can act
              // on: `proof-fit.ts` needs a fact, not a number it has to re-interpret.
              category_fit:             r.category_fit ?? 'unknown',
              category_fit_reason:      r.category_fit_reason ?? null,
            })
            .eq('id', r.id)
        ),
      )

      console.log(`[scoring] batch ${Math.floor(i / BATCH_SIZE) + 1}: scored ${results.length} leads`)
    } catch (err) {
      console.error(`[scoring] batch ${Math.floor(i / BATCH_SIZE) + 1} failed:`, err)
      // #477 (was #358, half-fixed) — NEVER fake a score on the crash path either. A
      // thrown AI/network error must be treated EXACTLY like the no-results branch above:
      // null score, no fabricated value, scored_at null, status NOT flipped to 'scored'
      // — so the lead is not delivered/charged and is re-scored on the next run. The old
      // code stamped 50/$5000/'scored', which delivered + charged fake leads as real.
      try {
        await Promise.all(
          batchIds.map(id =>
            db.from('leads').update(unscoredOnFailure()).eq('id', id)
          )
        )
      } catch (fallbackErr) {
        console.error('[scoring] unscore-on-failure update also failed:', fallbackErr)
      }
      if (!alertedScoringFailure) {
        alertedScoringFailure = true
        void sendFounderAlert('api_down', 'FIGSY lead scoring failed — AI scoring threw an error', [
          `Client: ${clientName}`,
          `At least one batch of ${batchIds.length} leads could not be scored and was left UNSCORED (not delivered, not charged).`,
          `They will be re-scored on the next run. If this persists, check ANTHROPIC_API_KEY / the model endpoint.`,
        ])
      }
    }
  }
}
