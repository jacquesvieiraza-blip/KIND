// ═══════════════════════════════════════════════════════════════════════════════════════
// A FRESH CLIENT'S OUTREACH IS WRITTEN BY THE SYSTEM — not by the founder, the night before.
//
// ── THE HIDDEN MANUAL PREREQUISITE ──────────────────────────────────────────────────────
//
// The locked normal flow is: **P1 authorised → source → enrich → qualify → account → prepare**,
// and PREPARE must produce everything the client reviews in Milla. Preparation produced the
// campaign, the schedule, the enrolments and the frozen snapshot — and then refused, because
// the programme had no sequence. For the House launch programme one branch seeded the approved
// copy; for everybody else the honest answer was *"author one"*, and the only person who could
// was the founder. A product that needs its owner to hand-write every client's cold email
// before their money can buy anything is not automatic, it is a queue with one person in it.
//
// ── NOTHING HERE IS A NEW COPYWRITING ENGINE ────────────────────────────────────────────
//
// 🛑 EVERY PIECE OF THIS ALREADY EXISTED. An exhaustive trace found the whole pipeline living
// inside ONE OPERATOR HTTP ROUTE (`POST /operator/sequence/suggest`), where no programme could
// reach it. This module is that route's body, lifted into a library and pointed at a programme:
//
//   `sequencePlan`            (lib/sequence-templates)  — purpose · depth · the real cadence
//   `generateSequence`        (lib/figsy)               — the model call, grounded on the client
//   `getClientKnowledgeForOutreach` (lib/figsy)         — what this client actually sells
//   `briefContextFor`         (lib/meeting-brief-deliver) — the client's APPROVED Meeting Brief
//   `detokenise`              (lib/sequence-tokens)     — one person's email → a template
//   `lintSequence`            (lib/sequence-quality)    — the gate the operator's drafts pass
//   `applyProgrammeSequence`  (lib/programme-sequence)  — the ONLY canonical writer
//
// If a second generator existed, the two would drift, and the copy a customer approved would
// stop being the copy any other surface could explain.
//
// ── WHAT IT IS FORBIDDEN TO DO ──────────────────────────────────────────────────────────
//
//   • never copies House's messaging — that is ONE programme's launch copy, and putting M&V's
//     own pitch in front of a paying customer's prospects is the failure the 8 Sep lock names
//   • never widens `isHouseLaunchProgramme`; it does not consult it at all
//   • never infers "same client, so same programme" — every read is by exact programme id
//   • never overwrites an existing canonical sequence, so an operator's edit survives
//   • never sends, enrols, charges, approves or advances anything
//
// ── AND IT FAILS CLOSED ─────────────────────────────────────────────────────────────────
//
// 🛑 A SEQUENCE THAT CANNOT BE WRITTEN WELL IS NOT WRITTEN AT ALL. The model can return copy
// that breaks the same quality rules an operator's draft is held to — and this copy is not
// going to a review screen with a human in front of it, it is going into a frozen snapshot a
// customer approves. So `lintSequence`'s HARD failures refuse, and preparation reports the
// refusal, rather than a customer approving words the product itself would have rejected.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { db } from '@kind/db'
import type { ProgrammeSequenceStep } from './programme-sequence'

export type GenerateSequenceResult =
  | { ok: true; created: boolean; steps: number; sequenceId: string; name: string; drafted_against: string }
  /** `alreadyPresent` separates "nothing to do" from "could not do it" — retries need both. */
  | { ok: false; alreadyPresent: boolean; reason: string }

/** The person the draft is written against — programme-scoped, never the client's whole pool. */
type SampleLead = {
  id: string
  first_name: string | null
  last_name: string | null
  job_title: string | null
  company: string | null
  industry: string | null
  seniority: string | null
  country: string | null
  tech_stack: string[] | null
  score: number | null
  score_reasoning: string | null
}

/**
 * Write this programme's canonical sequence from its own client and audience.
 *
 * ⚠️ IDEMPOTENT AND RETRY-SAFE, WHICH IS NOT OPTIONAL HERE. Preparation runs from a Stripe
 * webhook Stripe may redeliver, and from an operator retry. A second call finds the sequence
 * the first one wrote and returns `alreadyPresent` — it does not write a second row, and it
 * does not regenerate, because regenerating would silently replace copy that may already be
 * inside a customer's frozen review snapshot.
 */
export async function generateProgrammeSequence(
  programmeId: string,
  // ⚑ 24 Sep — ONLY `rewriteProgrammeMessages` passes this, and only after proving the programme
  // is awaiting approval, was never approved and has sent nothing. Every other caller keeps the
  // rule below: an existing sequence is the answer and is never regenerated.
  opts: { replaceExisting?: boolean } = {},
): Promise<GenerateSequenceResult> {
  const id = typeof programmeId === 'string' ? programmeId.trim() : ''
  if (!id) return { ok: false, alreadyPresent: false, reason: 'A programme id is required. Nothing was written.' }

  const { resolveProgrammeChain } = await import('./programme-chain')
  const chainRes = await resolveProgrammeChain(id)
  if (!chainRes.ok) return { ok: false, alreadyPresent: false, reason: chainRes.degraded }
  const { clientId, campaignId, sequenceId, steps: existingSteps } = chainRes.chain

  // 🛑 AN EXISTING SEQUENCE IS THE ANSWER, NOT AN OBSTACLE. Operator-authored, previously
  // generated, or House's — if the chain resolved words with steps in them, those are the words
  // this programme sends and nothing here may touch them.
  if (sequenceId && existingSteps.length > 0 && opts.replaceExisting !== true) {
    return { ok: false, alreadyPresent: true, reason: 'This programme already has a canonical sequence with message steps, so none was generated.' }
  }
  if (!campaignId) {
    return { ok: false, alreadyPresent: false, reason: 'This programme has no campaign yet, so there is nothing to attach a sequence to. Preparation creates the campaign first.' }
  }

  // ── WHO THIS IS WRITTEN FOR ────────────────────────────────────────────────────────────
  //
  // 🛑 THE PROGRAMME'S OWN PEOPLE, BY EXACT PROGRAMME ID. The operator route this is lifted
  // from picked the client's top-scored lead across their whole pool, which is right for a
  // console preview and wrong here: a client's pool can hold a previous programme's audience,
  // and a sequence drafted against last quarter's buyer is aimed at the wrong reader. Scoped to
  // this programme, and to people M&V's own verdict actually QUALIFIED — a draft written
  // against somebody we rejected is written against a person no customer is receiving.
  //
  // ⚠️ AND IT MUST BE SOMEBODY WITH A NAME AND A COMPANY, WHICH IS NOT A COSMETIC PREFERENCE.
  // The model writes against a real person; `detokenise` then turns that person's details back
  // into `{{first_name}}` / `{{company}}`. A sample lead carrying neither gives detokenise
  // nothing to replace, so the saved copy has NO merge tokens — and `lintSequence` hard-fails a
  // step 1 whose opening names nobody, correctly, because that is a blast. The whole programme
  // would then refuse over one anomalous row. Named first, top score within that; the unnamed
  // fallback is kept so a programme is never blocked outright, and if its copy cannot be
  // tokenised the linter still refuses it rather than sending a blast.
  const columns = 'id, first_name, last_name, job_title, company, industry, seniority, country, tech_stack, score, score_reasoning'
  const qualified = () => db.from('leads')
    .select(columns)
    .eq('programme_id', id)
    .eq('client_id', clientId)
    .not('qualified_at', 'is', null)
    .is('disqualified_at', null)
  const named = await qualified()
    .not('first_name', 'is', null)
    .not('company', 'is', null)
    .order('score', { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle()
  const { data: sampleRow, error: sampleErr } = named.data
    ? named
    : await qualified().order('score', { ascending: false, nullsFirst: false }).limit(1).maybeSingle()
  if (sampleErr) {
    return { ok: false, alreadyPresent: false, reason: `This programme's prospects could not be read (${sampleErr.message}). No sequence was written.` }
  }
  const sample = sampleRow as SampleLead | null
  if (!sample) {
    // Not a failure of generation — an ordering fact. Sourcing and qualification come first,
    // and preparation runs after them, so this is a genuine anomaly worth naming plainly.
    return {
      ok: false, alreadyPresent: false,
      reason: 'This programme has no qualified prospect yet, so there is nobody to write to. Sourcing and qualification run before preparation — no sequence was written.',
    }
  }

  const { data: clientRow } = await db.from('clients')
    .select('company_name, industry, signer_name, booking_url').eq('id', clientId).maybeSingle()
  const client = (clientRow ?? {}) as { company_name?: string | null; industry?: string | null; signer_name?: string | null; booking_url?: string | null }

  const { data: campRow } = await db.from('figsy_campaigns')
    .select('name, campaign_intent').eq('id', campaignId).maybeSingle()
  const campaign = (campRow ?? {}) as { name?: string | null; campaign_intent?: string | null }

  // ── THE PLAN ───────────────────────────────────────────────────────────────────────────
  //
  // No purpose, depth or event date is supplied: a programme's promise is MEETING_BOOKED, and
  // with none of them given `sequencePlan` renders R38's shipped meeting-at-depth-5 brief on a
  // real cadence. Inventing a different default here would make a programme's copy differ from
  // an operator's for no reason anybody could state.
  const { sequencePlan } = await import('./sequence-templates')
  const plan = sequencePlan({ industry: sample.industry ?? client.industry ?? null })

  // ── THE GROUNDING ──────────────────────────────────────────────────────────────────────
  //
  // ⚠️ BOTH ARE BEST-EFFORT AND NEITHER MAY THROW. A client with no knowledge digest and no
  // approved brief still gets a sequence — a worse-grounded one, which the linter then judges
  // on its merits. Losing the whole programme because an optional context read failed would
  // trade a real outcome for a nicety.
  const { generateSequence, getClientKnowledgeForOutreach } = await import('./figsy')
  const knowledge = await getClientKnowledgeForOutreach(clientId).catch(() => undefined)
  const briefContext = await import('./meeting-brief-deliver')
    .then(m => m.briefContextFor(clientId)).catch(() => null)

  let draft: Record<string, { subject?: string; body?: string }>
  try {
    draft = await generateSequence(
      sample as never,
      client.company_name ?? '',
      client.industry ?? null,
      campaign.campaign_intent ?? undefined,
      // ⚠️ THE BOOKING LINK IS PASSED AND THE GENERATOR REFUSES TO USE IT IN COLD COPY. P31,
      // 21 Aug: the calendar link enters only AFTER positive intent. Passing it is what turns
      // that instruction on inside the prompt; it never reaches a step.
      client.booking_url ?? null,
      client.signer_name ?? null,
      knowledge as never,
      { briefContext, industry: sample.industry ?? client.industry ?? null },
    ) as unknown as Record<string, { subject?: string; body?: string }>
  } catch (err) {
    return {
      ok: false, alreadyPresent: false,
      reason: `The outreach for this programme could not be drafted (${err instanceof Error ? err.message : String(err)}). Nothing was written, and the programme is unchanged.`,
    }
  }

  // ── ONE PERSON'S EMAIL BACK INTO A TEMPLATE ────────────────────────────────────────────
  //
  // 🛑 WITHOUT THIS EVERY PROSPECT RECEIVES THE SAMPLE LEAD'S NAME. The model is given a real
  // person so the copy has something true to open on; `detokenise` puts the merge tokens back,
  // and `buildDraftStepsFromSequence` fills them per prospect at enrolment. The same shared
  // contract the operator route uses, so the two cannot drift.
  const { detokenise, ensureSignOff } = await import('./sequence-tokens')
  // ⚑ 24 Sep — the sign-off is guaranteed by code, not left to the model. House's
  // version 3 came back with no sign-off at all; R156 says House signs "K.I.N.D".
  const signOff = (client.signer_name ?? '').trim() || (client.company_name ?? '').trim()
  const steps: ProgrammeSequenceStep[] = Array.from({ length: plan.depth }, (_, i) => i + 1)
    .map(n => {
      const st = draft[`step${n}`]
      return {
        step: n,
        subject: detokenise(String(st?.subject ?? '').trim(), sample),
        body: ensureSignOff(detokenise(String(st?.body ?? '').trim(), sample), signOff),
        // `wait_days` is the delay AFTER this step. Taken from the plan, never invented —
        // writing 0 here is how two cold emails land in one morning.
        wait_days: plan.gaps[n - 1] ?? 4,
      }
    })
    .filter(s => s.subject && s.body)

  if (steps.length === 0) {
    return { ok: false, alreadyPresent: false, reason: 'The drafted outreach came back empty, so nothing was written. The programme is unchanged.' }
  }

  // ── 🛑 THE SAMPLE PERSON MUST BE GONE ──────────────────────────────────────────────────
  //
  // ⛓️ 24 Sep — the founder's House walk reached the client's Approval screen with the sample
  // lead's first name and company still in the copy ("christopher, …", "running Rock Strategic
  // as CEO"), because detokenise missed their spelling. Everything downstream would have sent
  // one stranger's name to all 234. `detokenise` now catches those spellings; this is the fail-
  // closed check behind it, for the spelling nobody has thought of yet. Nothing is saved.
  const { leakedIdentity } = await import('./sequence-tokens')
  const leaked = [...new Set(steps.flatMap(s => leakedIdentity(`${s.subject}\n${s.body}`, sample)))]
  if (leaked.length > 0) {
    return {
      ok: false, alreadyPresent: false,
      reason: `The drafted outreach still named the one prospect it was written against (${leaked.length} detail${leaked.length === 1 ? '' : 's'}), so it would have gone to everyone with that person's name or company in it. It was NOT saved. Nothing was written.`,
    }
  }

  // ── THE SAME GATE AN OPERATOR'S DRAFT PASSES ───────────────────────────────────────────
  //
  // 🛑 FAIL CLOSED. #612's rule is that the AI's own draft goes through the same linter, because
  // copy arriving "from the system" carries an authority a hand-typed draft does not — and this
  // copy has no operator between it and a customer's approval. A HARD failure refuses.
  const { lintSequence } = await import('./sequence-quality')
  const { gapsBeforeEachStep } = await import('./sequence-templates')
  // ⛓️ 24 Sep — THE LINTER READS A STEP'S `wait_days` AS THE GAP *BEFORE* IT; THESE STEPS STORE
  // THE GAP *AFTER* IT (the send engine's convention, `sequence-templates.ts`). Handed over raw,
  // the last step's 0 — "nothing follows" — read as "sent the same day as the one before", so
  // EVERY generated 5-step programme sequence ([4, 5, 5, 7, 0]) was refused: the founder's House
  // walk, 24 Sep. Translated here, exactly: step 1 has no gap before it; step n's gap is step
  // n−1's gap after. A real zero between two steps still fails, as it must.
  const quality = lintSequence(gapsBeforeEachStep(steps) as never)
  if (!quality.ok) {
    const why = quality.hardFails.slice(0, 3).map(v => v.why).join(' ')
    return {
      ok: false, alreadyPresent: false,
      reason: `The drafted outreach did not pass the quality rules every sequence must pass, so it was NOT saved: ${why} Nothing was written.`,
    }
  }

  const name = campaign.name ? `${campaign.name} — ${plan.template.name}` : plan.template.name
  const { applyProgrammeSequence } = await import('./programme-sequence')
  const applied = await applyProgrammeSequence(id, steps, name)
  if (!applied.ok) return { ok: false, alreadyPresent: false, reason: applied.reason }

  return {
    ok: true,
    created: applied.created,
    steps: applied.steps,
    sequenceId: applied.sequenceId,
    name,
    drafted_against: [sample.job_title, sample.company].filter(Boolean).join(' at ') || 'a qualified prospect',
  }
}

