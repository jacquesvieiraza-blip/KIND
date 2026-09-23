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
  | { model: 'compat_programme'; declared: false; openProgramme: ProgrammeRow | null }
  /** NULL + no open programme → today's behaviour, which is legacy rules. */
  | { model: 'compat_legacy'; declared: false; openProgramme: null }
  /**
   * Either the client row or the programme row could not be read, OR the stored model
   * contradicts reality. Never legacy, never programme — a refusal.
   */
  | { model: 'unreadable'; declared: false; openProgramme: null; reason: string }

/** Does this resolution grant the LEGACY per-lead commercial model? */
export function isLegacyModel(_m: CommercialModel): boolean {
  // 🛑 ⚑ 23 Sep (R137) — NOTHING GRANTS THE LEGACY MODEL ANY MORE, INCLUDING A VALUE THAT SAYS
  // IT. Founder: *"the 299/4 is retired/ this must go."* The resolver no longer produces a
  // legacy state; this answers `false` even for one built by hand, so no caller, fixture or
  // future resolver can reopen the per-lead path by constructing the old shape.
  // ⛓️ WAS: `m.model === 'legacy' || m.model === 'compat_legacy'`.
  return false
}

/** Does this resolution place the client under PROGRAMME economics? */
export function isProgrammeModel(m: CommercialModel): boolean {
  // ⚑ 23 Sep (R137) — every resolvable client. Only "we could not tell" is not programme,
  // because an unreadable model must still refuse rather than be assumed.
  // ⛓️ WAS: `m.model === 'programme' || m.model === 'compat_programme'`.
  return m.model !== 'unreadable'
}

/**
 * 🛑 THE ONE QUESTION EVERY CONSEQUENTIAL PATH ASKS.
 *
 * Consequential means: it sources, sends, enrols, charges, or grants legacy approval
 * authority. A display surface may render `unreadable` as "we cannot tell"; a path that spends
 * money must refuse.
 */
export function mayUseLegacyCommercialPath(_m: CommercialModel): boolean {
  // 🛑 ⚑ 23 Sep (R137) — ALWAYS NO. Every retired door asks this one question — the $4 approve,
  // the reveal, the $299 pack checkout, wallet top-ups, legacy sourcing and sending — so this
  // single line is what closes them all, on deploy, for every client.
  return false
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

  // ── 🛑 ⚑ 23 Sep (R137) — THE RETIRED MODEL IS NEVER RESOLVED AGAIN ───────────────────────
  //
  // Founder, verbatim: *"the 299/4 is retired/ this must go. everything must be updated to new
  // programme pricing model."* — completing R124 (16 Sep): *"299/4 is gone. out. we are on the
  // programme. all clients."*
  //
  // ⛓️ WAS: stored 'legacy' → `{ model: 'legacy' }`, and NULL with no open programme →
  // `compat_legacy`. Both granted the per-lead path — a $4 charge per approved lead — and NULL
  // was what every company seat and every non-Milla creation path produced. R124 retired the
  // model BY DECISION and the code never followed, so the door stayed open to every account
  // nobody had classified. It is closed HERE, at the one resolver every legacy door asks, so it
  // closes the moment this deploys — before `20260923_all_clients_programme` has even run.
  //
  // ⚠️ NULL IS STILL NOT READ AS "WE KNOW". It resolves to `compat_programme` — undeclared,
  // programme economics — which is exactly what it will be once the migration writes the row.
  // A missing FIELD is still `unreadable` (above), because that is not a NULL, it is no answer.
  //
  // ⚠️ AND A DECLARED 'legacy' ROW WITH AN OPEN PROGRAMME IS NO LONGER A CONFLICT. That refusal
  // existed because the legacy path could CHARGE a client whose programme was paid for. With
  // the legacy path gone there is no second truth left to disagree with, and refusing would
  // only block a paying programme until the migration rewrites a word in the row.
  //
  // `'legacy'` and `'compat_legacy'` stay in the type so older stored values and older API
  // responses still type-check, and so Vida's branches for them are explicit. Nothing produces
  // them.
  return { model: 'compat_programme', declared: false, openProgramme: open }
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
    case 'legacy':          return 'Programme client · was declared legacy (retired)'
    case 'compat_programme': return m.openProgramme
      ? 'Programme (not yet recorded on the account)'
      : 'Programme client · no active programme (not yet recorded on the account)'
    // ⚑ 23 Sep (R137) — retired states. Nothing produces them; if an old response carries one,
    // the label says what is TRUE now rather than what the state used to mean.
    case 'compat_legacy':   return 'Programme client · was unclassified (legacy retired)'
    case 'unreadable':      return 'Unresolved — needs an operator'
  }
}

// ══════════════════════════════════════════════════════════════════════════════════════════
// ⚑ 18 Sep (XC-7 · R124 · LR 18) — THE LEGACY DOORS, AND THE ONE WAY THEY REFUSE
//
// ── 🛑 WHY A HELPER RATHER THAN THE PREDICATE ABOVE ────────────────────────────────────
//
// `mayUseLegacyCommercialPath` answers a question; every caller then had to decide what to DO
// with `unreadable`, and that decision is the whole safety property. R124 (16 Sep,
// founder-locked): *"299/4 is gone. out. we are on the programme. all clients."* — so a door
// built on the retired wallet must not open for a programme customer, and it must not open for
// a customer we could not classify either. One helper, one refusal, one status code per case.
//
// ⚠️ `unreadable` IS A 503, NOT A 403. "We could not tell" and "you are on the programme" are
// different sentences and only one of them is about the client. A 503 also says the honest
// thing to a retry: come back, this may resolve.
//
// ⛓️ ~~⚠️ AND A LEGACY CLIENT IS UNAFFECTED, WHICH IS THE POINT. R74 keeps the retired runtime
// live until the coordinated migration ships; this fences the doors for PROGRAMME customers
// only.~~ SUPERSEDED 23 Sep by R137 — `mayUseLegacyCommercialPath` answers no for everyone, so
// every door below refuses every account.
// ══════════════════════════════════════════════════════════════════════════════════════════

/** What a programme customer is told at a door built on the retired wallet. */
export const LEGACY_DOOR_REFUSAL =
  'This account is on the programme, so the per-lead credit path is not part of it. '
  + 'Everything for this client runs through their programme.'

export type LegacyDoorVerdict =
  | { allowed: true }
  | { allowed: false; status: 403 | 503; reason: string }

/**
 * May this client use a door built on the retired per-lead model?
 *
 * ⚠️ IT NEVER THROWS. A door that crashes on its own gate is a door that fails OPEN the moment
 * somebody wraps it in a try/catch that logs and continues.
 */
export async function legacyDoorVerdict(clientId: string): Promise<LegacyDoorVerdict> {
  try {
    const model = await clientCommercialModel(clientId)
    if (model.model === 'unreadable') {
      return {
        allowed: false, status: 503,
        reason: `This account's commercial model could not be read (${model.reason}), so nothing was done. Try again shortly.`,
      }
    }
    if (mayUseLegacyCommercialPath(model)) return { allowed: true }
    return { allowed: false, status: 403, reason: LEGACY_DOOR_REFUSAL }
  } catch (err) {
    return {
      allowed: false, status: 503,
      reason: `This account's commercial model could not be read (${err instanceof Error ? err.message : String(err)}), so nothing was done.`,
    }
  }
}
