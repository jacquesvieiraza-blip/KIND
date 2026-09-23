// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 23 Sep — PARTNERS ARE FROZEN. ONE SWITCH, READ BY THE API, THE PORTAL AND VIDA.
//
// Founder, verbatim: *"we have no partners at the moment. so remove all partner related
// information. or freeze tis."* — and, asked which: *"Freeze."*
//
// FROZEN, NOT REMOVED. Every partner screen, route and document is switched off at its door —
// the `/partners` API, the operator's partner-seat creation, the portal's partner pages and
// Vida's partner pages — and nothing is deleted: the code, the tables, the commission rules
// (R68/R78) and the documents stay, so partners can come back by flipping this to `false`.
//
// ⚠️ ONE CONSTANT, NOT ONE PER SURFACE. Four doors each deciding "are partners on?" for
// themselves is four answers that drift; this is the only place the answer lives.
// ═══════════════════════════════════════════════════════════════════════════════════════

/** Whether the partner programme is switched off. Flip to `false` to bring partners back. */
export const PARTNERS_FROZEN: boolean = true

/** What any partner door says while frozen — the same sentence everywhere. */
export const PARTNERS_FROZEN_COPY =
  'The partner programme is paused. Nothing here is available at the moment.'
