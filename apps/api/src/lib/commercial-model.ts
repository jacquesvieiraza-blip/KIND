// ═══════════════════════════════════════════════════════════════════════════════════════
// THE CLIENT COMMERCIAL MODEL — DECLARED TRUTH, REPLACING AN INFERENCE
//
// ── THE DEFECT THIS MODULE EXISTS TO END ────────────────────────────────────────────────
//
// `authorityFor(null)` returned `{ allowed: true, mode: 'legacy' }`. The ABSENCE of a
// programme row was being read as the positive assertion "this client is legacy", and every
// commercial decision in the product inherited it: the per-lead approve/reveal routes opened,
// the wallet gated enrolment, low-credit emails sent, legacy sourcing and sending were
// authorised, and Vida told the operator the account was on the $299 pack.
//
// 🛑 ABSENCE OF X CANNOT MEAN "IS Y". The same absence describes a programme client before
// their first programme, between two, or after one completes. Founder-locked 3 Sep: House and
// MBF are PROGRAMME-model clients, and having no active programme must not make either legacy.
//
// ── THE THREE STORED STATES, AND WHY NULL IS ONE OF THEM ────────────────────────────────
//
//   'programme'   programme economics, whether or not a programme row is open
//   'legacy'      the retired per-lead model, chosen by a human
//   NULL          UNCLASSIFIED — resolves to EXACTLY the behaviour the product had before
//                 this column existed, so C1 migrated the whole book without classifying anybody
//
// NULL is not a gap to be filled in later by inference. It is the compatibility state, and it
// is what makes this change safe to ship against a live book nobody has reviewed.
//
// ── FAIL-CLOSED IS THE WHOLE POINT ──────────────────────────────────────────────────────
//
// 🛑 AN UNREADABLE MODEL IS NEVER LEGACY. That is the exact mistake this module replaces, one
// level down: treating "we could not tell" as a licence to charge, source, send or enrol. Every
// consequential authority refuses on `unreadable`, and the caller must not paper over it.
//
// ⚠️ AND `legacy` + AN OPEN PROGRAMME IS A CONFLICT, NOT A PREFERENCE. Two contradictory
// truths about one client cannot be resolved by picking the one that lets the work proceed.
// It refuses and asks for a human, because either answer could be the wrong one and one of
// them spends money.
//
// ── WHAT THIS MODULE IS NOT ─────────────────────────────────────────────────────────────
//
// ⚠️ IT IS NOT HOUSE IDENTITY. `isHouseClient` answers "is this our own account", which drives
// INTERNAL P1/P2 authority wording — House authorises rather than pays. That is a different
// question from "which commercial model governs this client", and conflating them would make
// every internally-billed client a programme client by accident, or vice versa. The two are
// used side by side and never as substitutes.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { db } from '@kind/db'
import type { ProgrammeRow } from './programme'

/** What the `clients.commercial_model` column may hold. NULL is the third state. */
export type StoredCommercialModel = 'programme' | 'legacy'

/**
 * The resolved answer, combining the stored model with whether a programme is open.
 *
 * ⚠️ FIVE STATES, NOT TWO, because a caller needs to tell an EXPLICIT programme client from a
 * client who merely has a programme open today, and a compatibility answer from a declared
 * one. Collapsing them to a boolean is how the next inference gets built on top of this one.
 */
export type CommercialModel =
  /** Declared 'programme'. Programme economics apply whether or not a programme is open. */
  | { model: 'programme'; declared: true; openProgramme: ProgrammeRow | null }
  /** Declared 'legacy', with no open programme. The retired per-lead model, legitimately. */
  | { model: 'legacy'; declared: true; openProgramme: null }
  /** NULL + an open programme → today's behaviour, which is programme rules. */
  | { model: 'compat_programme'; declared: false; openProgramme: ProgrammeRow }
  /** NULL + no open programme → today's behaviour, which is legacy rules. */
  | { model: 'compat_legacy'; declared: false; openProgramme: null }
  /**
   * Either the client row or the programme row could not be read, OR the stored model
   * contradicts reality. Never legacy, never programme — a refusal.
   */
  | { model: 'unreadable'; declared: false; openProgramme: null; reason: string }

/** Does this resolution grant the LEGACY per-lead commercial model? */
export function isLegacyModel(m: CommercialModel): boolean {
  return m.model === 'legacy' || m.model === 'compat_legacy'
}

/** Does this resolution place the client under PROGRAMME economics? */
export function isProgrammeModel(m: CommercialModel): boolean {
  return m.model === 'programme' || m.model === 'compat_programme'
}

/**
 * 🛑 THE ONE QUESTION EVERY CONSEQUENTIAL PATH ASKS.
 *
 * Consequential means: it sources, sends, enrols, charges, or grants legacy approval
 * authority. A display surface may render `unreadable` as "we cannot tell"; a path that spends
 * money must refuse.
 */
export function mayUseLegacyCommercialPath(m: CommercialModel): boolean {
  return isLegacyModel(m)
}

/**
 * Resolve one client's commercial model.
 *
 * ⚠️ TWO READS, AND BOTH FAIL CLOSED. The client row carries the declaration; the programme
 * lookup decides the compatibility answer and detects the conflict. If either cannot be read,
 * the answer is `unreadable` — not legacy, not programme.
 *
 * ⚠️ A MISSING COLUMN IS ALSO `unreadable`, DELIBERATELY. If C1's migration were somehow not
 * applied, PostgREST answers `42703`/`PGRST204` and this returns unreadable rather than
 * silently behaving as though every client were unclassified. Refusing loudly on a schema that
 * is not what the code expects is the #599 lesson applied at the read.
 */
export async function clientCommercialModel(clientId: string): Promise<CommercialModel> {
  const unreadable = (reason: string): CommercialModel =>
    ({ model: 'unreadable', declared: false, openProgramme: null, reason })

  if (!clientId) return unreadable('no client id')

  let stored: StoredCommercialModel | null
  try {
    const { data, error } = await db.from('clients')
      .select('commercial_model').eq('id', clientId).maybeSingle()
    if (error) return unreadable(`client read failed: ${error.message}`)
    if (!data) return unreadable('no such client')
    const raw = (data as { commercial_model?: string | null }).commercial_model
    // 🛑 A MISSING FIELD IS NOT A NULL, AND THE RESOLVER ITSELF HAS TO SAY SO.
    //
    // `commercial_model: null` is an explicit database value meaning UNCLASSIFIED, and it
    // resolves to the compatibility model. `undefined` means the key was not in the row at all
    // — an absence of truth — and the two were sharing one branch through `raw ?? null`, so a
    // row that never carried the field would have resolved to `compat_legacy` and opened the
    // per-lead paths. That is the C2 defect in miniature, at the innermost point.
    //
    // ⚠️ AND IT IS NOT LEFT TO POSTGREST TO PREVENT. A selected column either comes back or the
    // request errors `42703`, so this is unreachable through the client we use today — which is
    // exactly the argument that stops being true the day something else reads this function. The
    // safe rule belongs in the canonical resolver, not in an assumption about one driver.
    if (raw === undefined) {
      return unreadable('the client row carried no commercial_model field — a missing field is not a NULL')
    }
    if (raw !== null && raw !== 'programme' && raw !== 'legacy') {
      // The CHECK constraint makes this unreachable through the database. It is handled
      // anyway: an unexpected value is exactly the case where guessing is worst.
      return unreadable(`unrecognised commercial model: ${String(raw)}`)
    }
    stored = raw as StoredCommercialModel | null
  } catch (err) {
    return unreadable(err instanceof Error ? err.message : String(err))
  }

  let open: ProgrammeRow | null
  try {
    const { openProgrammeFor } = await import('./programme-authority')
    open = await openProgrammeFor(clientId)
  } catch (err) {
    // `openProgrammeFor` THROWS on a storage error rather than returning null, precisely so
    // this cannot be mistaken for "no programme".
    return unreadable(`programme read failed: ${err instanceof Error ? err.message : String(err)}`)
  }

  if (stored === 'programme') return { model: 'programme', declared: true, openProgramme: open }

  if (stored === 'legacy') {
    // 🛑 CONFLICT. A client declared legacy who nevertheless holds an OPEN programme is two
    // contradictory truths about one account. Choosing programme would spend against a
    // declaration; choosing legacy would charge a client whose programme has been paid for.
    // Neither is safe, so nothing consequential proceeds until a human resolves it.
    if (open) {
      return unreadable(
        `client is declared legacy but holds an open programme (${open.id}) — the two disagree, `
        + 'so no sourcing, sending, enrolment or charge is authorised until an operator resolves it',
      )
    }
    return { model: 'legacy', declared: true, openProgramme: null }
  }

  // NULL — compatibility. Exactly the behaviour the product had before this column existed.
  return open
    ? { model: 'compat_programme', declared: false, openProgramme: open }
    : { model: 'compat_legacy', declared: false, openProgramme: null }
}

/**
 * What is actually STORED in the column, recovered from a resolution.
 *
 * ⚠️ FOR DISPLAY AND FOR THE OPERATOR'S "CHANGE FROM" ONLY. An authority decision asks
 * `mayUseLegacyCommercialPath`, never this — the stored value alone cannot tell a declared
 * programme client from an unclassified one with a programme open, and that difference is the
 * entire point of the module.
 *
 * `'unknown'` rather than `null` on unreadable, deliberately: reporting "not classified" for a
 * client whose row would not read is the same absence-means-a-fact mistake one level up.
 */
export function storedModelFor(m: CommercialModel): StoredCommercialModel | null | 'unknown' {
  if (m.model === 'unreadable') return 'unknown'
  return m.declared ? (m.model as StoredCommercialModel) : null
}

/** Operator-readable label. Used by Vida; never by an authority decision. */
export function commercialModelLabel(m: CommercialModel): string {
  switch (m.model) {
    case 'programme':       return m.openProgramme ? 'Programme' : 'Programme client · no active programme'
    case 'legacy':          return 'Legacy'
    case 'compat_programme': return 'Unclassified · behaving as programme (has an open programme)'
    case 'compat_legacy':   return 'Unclassified · behaving as legacy (no programme)'
    case 'unreadable':      return 'Unresolved — needs an operator'
  }
}
