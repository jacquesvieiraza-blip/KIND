// #611 PHASE B — THE GUARDS ON THE FIRST TWO WRITES THAT DESTROY SOMETHING.
//
// Phase A (`house-audit.ts`) was read-only on purpose, and its own header says so: *"there is
// deliberately no button that acts on a finding… a 'clean it up' button would make the audit
// and the action one click apart, which is how the wrong row gets deleted at 11pm."* The
// founder has now ruled on the rows (4 Aug), so Phase B builds the two actions he ruled for —
// and this file is the distance that comment asked for.
//
// ⚠️ ONE OF THESE IS THE FIRST DELETE OF A REAL CLIENT ROW IN THE PRODUCT. `purgeDemoClient`
// deletes clients today but refuses anything not flagged `is_demo`, and its comment calls that
// check *"the whole safety of this function"*. The accounts the founder wants gone — Stripe
// Test, ACME — are **not** demo rows, so that guard cannot be reused; a new one has to be at
// least as strong. Hence: the judgement is PURE and lives here, provable without a database,
// rather than inlined in a route where the only way to test it is to delete something.
//
// WHY A TYPED PHRASE AND NOT A CONFIRM DIALOG. A dialog is dismissed by muscle memory; a
// phrase has to be read. Same shape as `WIPE_CONFIRMATION` in `seed-wipe.ts` and `FOUNDER_FLIP`
// for 🟢 dots — the repo already settled that destructive things are typed, not clicked.

import type { Classification } from './seed-wipe'

/** Typed to zero the house wallet. Exact, including the case. */
export const ZERO_WALLET_CONFIRMATION = 'ZERO THE HOUSE WALLET'

/**
 * The house account's hunting budget, in USD.
 *
 * WHY $4,000 AND WHY IT IS A CONSTANT, NOT A FIELD. The house account has to work ~1,000 leads
 * to land clients at the founder's own win rate. Approvals draw the onboarding pack first (100
 * included), and everything past it draws the wallet at `LEAD_PRICE_USD` — so the wallet is
 * what stops the account stalling half way through its own prospecting. A number typed into a
 * box would make this endpoint an arbitrary "give any client any money" surface; a constant
 * makes it one reviewable decision.
 */
export const HOUSE_HUNTING_BUDGET_USD = 4000

/**
 * The tag every hunting-budget grant carries in its ledger note — and the thing the
 * repeat-press guard matches on.
 *
 * ⚠️ WHY A GUARD AT ALL. Fable's verify (4 Aug, same session) found the grant button had no
 * "already granted" check: press it today, $4,000; press it again next week — after re-running
 * the audit, or by mistake — another $4,000. The UI's `disabled={busy}` only blocks a
 * double-click in the same moment, not a second deliberate press. We had just built an endpoint
 * to REMOVE invented money from this account; a button that can quietly re-invent it is the
 * same defect wearing a plus sign.
 *
 * The tag is matched with `includes`, so the timestamp suffix in the note never breaks it. The
 * $100 comp grant from house-client setup says "house client comp — Client Zero" and does NOT
 * match — the two grants are different decisions and must not block each other.
 */
export const HOUSE_GRANT_NOTE_TAG = 'house hunting budget — #611'

export function houseGrantNote(nowIso: string): string {
  return `[${HOUSE_GRANT_NOTE_TAG}, granted from Vida ${nowIso}]`
}

/**
 * Has the hunting budget already been granted?
 *
 * Takes the house account's `manual_grant` rows and answers from the ledger — the one record
 * that survives sessions, redeploys and memory. Returns WHEN so the refusal can say
 * "already granted on <date>" instead of a bare no.
 */
export function priorHouseGrant(
  rows: Array<{ note?: string | null; created_at?: string | null }>,
): { granted: boolean; when: string | null } {
  const hit = rows.find(r => (r.note ?? '').includes(HOUSE_GRANT_NOTE_TAG))
  if (!hit) return { granted: false, when: null }
  return { granted: true, when: hit.created_at ?? null }
}

export type GuardRefusal = { ok: false; why: string }

/**
 * May we zero the house wallet?
 *
 * The order of these checks is the safety property, and it is deliberately house-identity
 * FIRST: a caller who cannot even be shown to be the house account never reaches the money.
 */
export function zeroWalletCheck(a: {
  /** Resolved by `decideHouseClient` — never by company name (#584/#593). */
  houseClientId: string | null
  targetClientId: string
  balanceUsd: number
  typed: string | null | undefined
}): { ok: true; from: number } | GuardRefusal {
  if (!a.houseClientId) {
    return { ok: false, why: 'The house account could not be resolved, so there is nothing this endpoint is permitted to touch. Set up Client Zero first, then run the audit.' }
  }
  // Belt AND braces. The route resolves the target itself, so this can only fire if somebody
  // later widens the route to take an id from the body — which is exactly when it should.
  if (a.targetClientId !== a.houseClientId) {
    return { ok: false, why: `This endpoint only ever zeroes the HOUSE account (${a.houseClientId}). It refuses every other client — including one that looks like test data, because "looks like" is how the wrong account gets emptied.` }
  }
  if (!Number.isFinite(a.balanceUsd)) {
    return { ok: false, why: 'The current balance could not be read. A write that does not know what it is replacing is not a write worth making — press the audit again first.' }
  }
  // Sub-cent, because a float balance can land at 1e-15 and "already zero" should not become
  // "refuses forever".
  if (Math.abs(a.balanceUsd) < 0.005) {
    return { ok: false, why: 'The house wallet is already zero — nothing to do. Refusing rather than writing, so the audit log does not fill with entries that changed nothing.' }
  }
  if ((a.typed ?? '').trim() !== ZERO_WALLET_CONFIRMATION) {
    return { ok: false, why: `Type the phrase exactly to confirm: "${ZERO_WALLET_CONFIRMATION}".` }
  }
  return { ok: true, from: a.balanceUsd }
}

/**
 * May we delete this client, rows and all?
 *
 * ⚠️ THE CLASSIFICATION IS IMPORTED, NEVER RE-DERIVED. `seed-wipe.ts`'s `classify` already
 * ranks real money above `is_demo` above everything, and its comment explains why: *"the flag
 * is a human's opinion and a Stripe-referenced ledger row is a fact, and on a destructive path
 * the fact has to win."* A second opinion about what is deletable, written here, would be a
 * second thing to keep in step — and the one that disagrees is the one that deletes a client.
 *
 * The two explicit id refusals below are redundant with `classify` on purpose. They are the
 * checks that survive somebody "simplifying" the classifier.
 */
export function wipeClientCheck(a: {
  classification: Classification
  houseClientId: string | null
  demoClientIds: string[]
  typedCompanyName: string | null | undefined
}): { ok: true } | GuardRefusal {
  const c = a.classification

  if (a.houseClientId && c.clientId === a.houseClientId) {
    return { ok: false, why: 'That is the house account (Client Zero) — the account our own outreach runs from, and the one whose history the audit exists to protect. It is never wipeable from here.' }
  }
  if (a.demoClientIds.includes(c.clientId)) {
    return { ok: false, why: 'That is the demo account. MBF is how the product gets SOLD, and `demo-mbf.ts` rebuilds it on demand — use the demo reset, not a delete.' }
  }
  if (c.disposition !== 'eligible') {
    return { ok: false, why: `Refusing — ${c.reason}.` }
  }

  const typed = (a.typedCompanyName ?? '').trim()
  if (!typed) {
    return { ok: false, why: `Type the company name exactly to confirm: "${c.companyName}".` }
  }
  // Case-insensitive, whitespace-trimmed — the gate is "you read the row and typed its name",
  // not a spelling test. A near-miss still refuses, which is the whole point: on a delete, the
  // dangerous input is the name of the account NEXT to the one you meant.
  if (typed.toLowerCase() !== c.companyName.trim().toLowerCase()) {
    return { ok: false, why: `You typed "${typed}", and this client is "${c.companyName}". Refusing — on a delete, a near-miss is the entire risk.` }
  }

  return { ok: true }
}
