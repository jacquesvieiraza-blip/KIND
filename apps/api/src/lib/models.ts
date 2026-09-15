// ═══════════════════════════════════════════════════════════════════════════════════════
// THE MODEL A HUMAN TALKS TO HAS ONE NAME, IN ONE PLACE. (Founder-ruled 14 Sep.)
//
// ── WHY THIS FILE EXISTS ───────────────────────────────────────────────────────────────
//
// Every conversational surface in this product ran on the cheapest model, and the model id
// was TYPED BY HAND at 46 sites across 25 files. There was no constant, so "which model does
// Milla use?" could only be answered by grepping, and changing it meant finding all of them.
//
// The founder's ruling: "i dont want Haiku. I want sonnet." · "sonnet on every human facing
// surface." · "in terms of costs. lets get up and running and then peal back if needed."
//
// ── THE SPLIT, AND IT IS ABOUT WHO IS READING ──────────────────────────────────────────
//
// 🛑 `CONVERSATION_MODEL` — A PERSON IS WAITING FOR THIS REPLY AND WILL READ IT AS US.
// A client talking to Milla, an operator talking to Vida, a prospect reading a reply we
// drafted. Interpreting what a person actually meant — badly spelled, mid-correction, three
// facts at once — is the whole job on these surfaces, and it is the job the cheapest model
// was worst at.
//
// 🛑 `BACKGROUND_MODEL` — NOBODY IS IN THE ROOM. Scoring a lead, reading a website,
// summarising a batch, internal tooling. Work that is checked by code or by an operator
// before it reaches anyone, where the cheaper model is the right trade and stays.
//
// ⚠️ THIS IS NOT A REPO-WIDE MIGRATION, and the two constants exist to keep it that way.
// A new call site has to answer one question — is a human waiting for this? — and the answer
// is visible in the import. A bare model string in a new route is the thing this replaces.
//
// ⚠️ WHAT IS DELIBERATELY NOT DECIDED HERE. Prospect-facing GENERATION that no founder ruling
// covers — FIGSY's sequence and campaign writers, Denise's follow-up and proposal drafts —
// stays on `BACKGROUND_MODEL` and is an OPEN QUESTION for the founder. A prospect reads that
// text too, so it is a reasonable candidate; nobody has ruled on it, and quietly moving it
// would be deciding a product question on his behalf.
// ═══════════════════════════════════════════════════════════════════════════════════════

/**
 * 🛑 EVERY SURFACE WHERE A HUMAN IS WAITING FOR THE REPLY.
 *
 * Milla (onboarding, concierge, targeting) · Vida (the operator's conversation, the ICP
 * conversation, a reply drafted for a prospect) · FIGSY, Casey, Denise and Support chat.
 */
export const CONVERSATION_MODEL = 'claude-sonnet-5'

/**
 * 🛑 EVERYTHING NOBODY IS WAITING ON. Scoring, scraping, enrichment, LinkedIn, WhatsApp,
 * batch provider work, internal and operator tooling, and generation an operator reviews
 * before anyone sees it.
 *
 * ⚠️ NOT A LESSER DEFAULT — A DIFFERENT JOB. Moving one of these to the conversation model
 * is a cost decision the founder makes, not a tidy-up.
 */
export const BACKGROUND_MODEL = 'claude-haiku-4-5-20251001'

/**
 * 🛑 THE SERVER HALF OF THE BROWSER'S BUDGET, AND IT IS WHAT MAKES THE BUDGET TRUE.
 *
 * ⚠️ WITHOUT THIS THE PORTAL'S TIMEOUT IS THE ONLY BOUND, and the SDK's own default is TEN
 * MINUTES. A browser that walks away at 45s while the server is still willing to wait ten
 * minutes is not an arithmetic, it is a coincidence — the client sees "Request timed out"
 * and the turn continues in a process nobody is listening to.
 *
 * ⚠️ `maxRetries: 0` IS LOAD-BEARING, and the reason is in the SDK rather than in taste. Its
 * retry honours a server `retry-after` header with a sleep of up to just under 60 SECONDS
 * between attempts, so "timeout: 30s with 2 retries" has a worst case near 150s — a number
 * no browser budget can cover. One bounded attempt is the only shape whose worst case is
 * provable from the SDK's own code. The visible Try again control is the retry.
 *
 * 30s server + transport, under a 45s browser budget (`AI_TURN_TIMEOUT_MS` in the portal).
 *
 * ⚠️ THE ONBOARDING ROUTE DOES NOT USE THIS. It states its own 45s/60s arithmetic inline and
 * is revisited by its own build; two budgets, both written down where they are spent.
 */
export const AI_TURN_BOUND = { timeout: 30_000, maxRetries: 0 } as const
