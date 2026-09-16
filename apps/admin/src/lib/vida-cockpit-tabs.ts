// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 16 Sep (MVP1 · A2) — WHICH CLIENT-WORK TABS BELONG AT THIS STAGE.
//
// 🛑 THE DEFECT. `vida/page.tsx` declared `COCKPIT_TABS` as a flat eleven-item constant with
// no stage gate, and then RE-TYPED the same eleven strings inline at the render. Both lists
// were unconditional, so a prospect in the middle of Proof — who has no campaign, no
// sequence, no approvals and nobody to send to — appeared in Vida with People, Approvals,
// Campaign and Sequence all offering work. Proof is the CLIENT's conversation with Milla;
// presenting its batch as Vida's working set invites an operator to act inside a calibration
// they are not part of.
//
// 🛑 AND TWO HAND-TYPED COPIES OF ONE LIST IS THE DRIFT ITSELF. The constant was used for URL
// validation and the inline copy for the strip, so a tab could legitimately exist in one and
// not the other. There is now ONE list, and the strip renders from this function.
//
// ⚠️ THIS WITHHOLDS TABS. IT DELETES NOTHING. `/operator/people` is untouched, no row is
// removed or hidden server-side, and every tab returns the moment the client leaves Proof.
// The founder's boundary, verbatim: *"Do NOT rewrite `/operator/people`. Do NOT delete rows.
// Do NOT break People after Proof."*
//
// ⚠️ AND AN EXCEPTION RE-OPENS THEM, deliberately. The rule is "healthy Proof is not Vida's
// working set" — once there IS a genuine operator exception, the operator is in it, and what
// was sourced (including the candidates our own gate set aside) is the evidence they need.
// ═══════════════════════════════════════════════════════════════════════════════════════

export const COCKPIT_TABS = [
  'Inbox', 'Approvals', 'People', 'Campaign', 'ICP', 'Sequence',
  'Asks', 'Bookings', 'Programme', 'Pool', 'Exceptions',
] as const

export type CockpitTab = typeof COCKPIT_TABS[number]

/**
 * The tabs that are CLIENT WORK — the ones that offer an operator something to do to a
 * prospect's pipeline. These are exactly the four the founder named (A2, 16 Sep).
 *
 * ⚠️ `ICP` IS NOT ONE OF THEM, and that is the point of the list being explicit. Targeting is
 * how an operator CORRECTS a Proof problem, so removing it would take away the remedy at the
 * moment it is needed. Nor are `Asks`, `Bookings`, `Programme`, `Pool` or `Exceptions`:
 * they are reference and diagnostics, not work performed on a pipeline that does not exist.
 */
export const CLIENT_WORK_TABS: readonly CockpitTab[] = ['Approvals', 'People', 'Campaign', 'Sequence']

/**
 * The tab an operator lands on when the one they were reading is withheld.
 *
 * `ICP` rather than `Inbox`: if a Proof client is on screen at all, their targeting is the
 * only thing about them an operator can usefully act on.
 */
export const PROOF_FALLBACK_TAB: CockpitTab = 'ICP'

export type TabVisibilityInput = {
  /** The CANONICAL stage from the server's one derivation. Never a local guess. */
  stage: string | null | undefined
  /** The server's own needs-you verdict. An exception re-opens the withheld tabs. */
  needsYou: boolean | null | undefined
}

/**
 * ⚑ 16 Sep (MVP1 · A2) — IS THIS A HEALTHY PROOF CLIENT, i.e. one Vida should stay out of?
 *
 * ⚠️ IT ASKS THE SERVER'S STAGE, NOT A LOCAL INFERENCE. `vida/page.tsx` must not re-derive
 * where a client is; that is `deriveLifecycle`'s single job, and a second opinion drawn in the
 * browser is how the panel and the nav came to disagree before.
 *
 * ⚠️ AN UNKNOWN STAGE IS NOT PROOF. A null stage means the lifecycle has not loaded (or could
 * not be read), and withholding tabs on an unreadable answer would hide working controls from
 * an operator looking at a live client. It fails OPEN, because the cost of being wrong in that
 * direction is a tab nobody needed, and in the other direction it is a tab somebody did.
 */
export function isHealthyProof(i: TabVisibilityInput): boolean {
  return i.stage === 'proof' && i.needsYou !== true
}

/**
 * The tabs to render, in their fixed order.
 *
 * ⚠️ ORDER IS NEVER RECOMPUTED — it filters `COCKPIT_TABS`, so the strip cannot reshuffle
 * itself between clients and an operator's muscle memory keeps working.
 */
export function cockpitTabsFor(i: TabVisibilityInput): CockpitTab[] {
  if (!isHealthyProof(i)) return [...COCKPIT_TABS]
  return COCKPIT_TABS.filter(t => !CLIENT_WORK_TABS.includes(t))
}

/**
 * Which tab should actually be shown, given the one the operator had selected.
 *
 * 🛑 WITHHOLDING A TAB WITHOUT REDIRECTING IT WOULD RENDER AN EMPTY PANE. Switching from a
 * programme client on People to a Proof client would leave People selected and invisible, so
 * the operator would see a blank workspace with no explanation.
 */
export function resolveCockpitTab(tab: CockpitTab, i: TabVisibilityInput): CockpitTab {
  const allowed = cockpitTabsFor(i)
  return allowed.includes(tab) ? tab : PROOF_FALLBACK_TAB
}

/**
 * The one sentence the strip shows in place of the withheld tabs.
 *
 * ⚠️ IT EXPLAINS RATHER THAN JUST HIDING. A tab that silently vanishes reads as a bug; a
 * sentence saying whose turn it is reads as the product working.
 */
export const PROOF_TABS_WITHHELD_COPY =
  'Proof is the client’s conversation with Milla — no pipeline exists yet, so there is nothing here to work on. Their targeting is on ICP.'
