// ═══════════════════════════════════════════════════════════════════════════════════════
// READING THE DESK FOR MILLA'S CHAT (C06).
//
// `milla-proof-context.ts` is the pure block — what she is told and what she may not do with
// it. This file is the only place that goes to the database for it.
//
// ── 🛑 THE ONE THING THIS FILE MUST NOT BECOME ──────────────────────────────────────────
//
// A SECOND OPINION ABOUT WHO IS ON THE DESK. The band, the capped score and the set-aside
// refusal are all `proof-fit.ts`'s answers — imported, never re-derived — for the reason the
// founder gave when C02 was built: two matchers is one matcher plus a bug. If Milla
// described a card as "Worth a look" while the card beside her said "We'd start here", the
// client would be watching the product disagree with itself in real time.
//
// ⚠️ AND THE ELIGIBILITY FILTERS MUST MATCH `/leads/for-approval` EXACTLY. They are repeated
// here rather than shared, because the desk route builds its query through a conditional
// scope narrowing that cannot be handed out as a value — so `milla-proof-context.test.ts`
// extracts the filter calls from BOTH files and fails when the two sets differ. A comment
// asking the next person to keep them in step would not have survived one edit.
//
// ⚠️ EVERY READ FAILS SOFT TO `null`, WHICH MEANS "COULD NOT BE READ". It never means "there
// is no set" — `describeProofContext(null)` says exactly that to the model, because telling
// a client their examples do not exist because a query failed is the worst answer available.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { db } from '@kind/db'
import { type ProofChatContext, type ProofChatCard } from './milla-proof-context'
import { type CardVerdict } from './proof-calibration'

/**
 * The lifetime maximum a Proof client can have on the desk: two passes of twenty.
 *
 * ⚠️ A BOUND ON THE PROMPT, NOT A VIEW. It is set to the product's own ceiling precisely so
 * it never truncates in practice; if it ever does, the block says so rather than quietly
 * describing a partial desk as the whole one.
 */
export const PROOF_CHAT_CARD_CAP = 40

/**
 * One client's Proof reality, as Milla should see it.
 *
 * @returns null when anything essential could not be read.
 */
export async function readProofChatContext(clientId: string): Promise<ProofChatContext | null> {
  try {
    const [{ readCalibration }, { proofUiState }, fit] = await Promise.all([
      import('./proof-calibration-io'),
      import('./proof-calibration'),
      import('./proof-fit'),
    ])
    const record = await readCalibration(clientId)
    const ui = proofUiState(record, record.phone, !!record.phoneConfirmedAt, record.contactName)

    // ── THE DESK, WITH THE SAME ELIGIBILITY AS `/leads/for-approval` ────────────────────
    //
    // ⚠️ `set_aside_reason IS NULL` IS NOT OPTIONAL HERE EITHER. A set-aside candidate failed
    // a hard criterion the client named; it is kept for an operator to see, and describing
    // one to the client as part of their set would undo the whole structural gate in prose.
    const { data: rows, error } = await db.from('leads')
      .select('id, job_title, company, industry, country, company_size, seniority, score, score_reasoning, first_name, last_name')
      .eq('client_id', clientId)
      .is('set_aside_reason', null)
      .not('delivered_at', 'is', null)
      .not('surfaced_for_approval_at', 'is', null)
      .not('proof_pass', 'is', null)
      .is('revealed_at', null)
      .neq('status', 'passed')
      .order('score', { ascending: false, nullsFirst: false })
      .limit(PROOF_CHAT_CARD_CAP)
    if (error) throw new Error(`the Proof desk for client ${clientId} could not be read — ${error.message}`)

    const ids = (rows ?? []).map(r => (r as { id: string }).id)
    // Their own reaction per card. Best-effort: a card with no reaction is honest, a whole
    // desk we cannot describe is not — so a feedback failure loses the reactions, not the set.
    const reactionOf = new Map<string, CardVerdict>()
    if (ids.length > 0) {
      const { data: fb } = await db.from('lead_feedback')
        .select('lead_id, action').eq('client_id', clientId).in('lead_id', ids)
      for (const f of (fb ?? []) as { lead_id: string; action: string | null }[]) {
        reactionOf.set(f.lead_id, f.action === 'approve' ? 'looks_right' : 'not_a_fit')
      }
    }

    // The client's own targeting — the same single read the desk route makes, for the same
    // reason: the band is derived from what THEY asked for, not from a global idea of good.
    // ⛓️ 18 Sep (J5-C12 · FD-1) — THE SELECT NOW CARRIES EVERY FIELD THE GATE READS.
    // WHAT THIS REPLACED: ~~five columns~~, cast to `FitIcp`. So `target_category` and
    // `target_company_type` were ALWAYS undefined here and their verdicts were
    // unconditionally `yes` — this surface judged with a weaker rule than the structural
    // gate that produced the set, which is how a desk comes to band a candidate the gate
    // would have refused. `exclusions` joins them rather than arriving with the same defect.
    const { data: icpRow } = await db.from('icps')
      .select('geographies, company_sizes, industries, job_titles, seniority_levels, target_category, target_company_type, exclusions')
      .eq('client_id', clientId).order('created_at', { ascending: false }).limit(1).maybeSingle()
    const icp = (icpRow ?? {}) as import('./proof-fit').FitIcp

    // ⚠️ THE NAME IS SCRUBBED OUT OF THE WHY-IT-FITS SENTENCE, exactly as the desk does it.
    // The scoring prompt is fed the lead's name, so its reasoning often echoes it — and a
    // masked card whose explanation names the person is not masked.
    const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const scrub = (why: string | null, first: string | null, last: string | null): string | null => {
      if (!why) return null
      let out = why
      const toks = [first && last ? `${first} ${last}` : null, first, last]
        .filter((t): t is string => !!t && t.trim().length > 1)
      for (const t of toks) out = out.replace(new RegExp(`\\b${esc(t.trim())}\\b`, 'gi'), 'this prospect')
      return out
    }

    const onDesk: ProofChatCard[] = (rows ?? []).map((r: Record<string, any>) => {
      const f = fit.hardFit(r as import('./proof-fit').FitCandidate, icp)
      const band = fit.fitBand(f, r.score ?? null)
      return {
        role: r.job_title ?? 'Decision-maker',
        company: r.company ?? '—',
        industry: r.industry ?? null,
        country: r.country ?? null,
        band,
        bandLabel: fit.BAND_LABEL[band],
        score: fit.displayScore(f, r.score ?? null),
        whyFits: scrub(r.score_reasoning ?? null, r.first_name ?? null, r.last_name ?? null),
        reaction: reactionOf.get(r.id) ?? null,
      }
    })

    return {
      onDesk,
      attempt: record.passesDone,
      attempts: record.attempts,
      whatChanged: ui.whatChanged,
      escalated: record.escalated,
      // 🛑 THE VERDICT IS THE SERVER'S, AND IT IS NOT RE-DECIDED FOR HER. `proofUiState` is
      // the same derivation the client's own controls are drawn from, so what she says is
      // available and what is actually clickable cannot disagree.
      strongerAvailable: ui.showStronger && ui.strongerEnabled,
      strongerHint: ui.strongerHint,
    }
  } catch (e) {
    console.error('[milla proof context] unreadable — answering without the desk', e)
    return null
  }
}
