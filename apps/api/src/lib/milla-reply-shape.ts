// ═══════════════════════════════════════════════════════════════════════════════════════
// S1-RT-007 — HARMLESS MODEL-SHAPE VARIATION IS OURS TO ABSORB, NOT THE CUSTOMER'S TO RETYPE.
//
// ── THE LIVE DEFECT ────────────────────────────────────────────────────────────────────
//
// Two valid customer turns became HTTP 503 "Milla didn't catch that". Both times the client
// pressed Try again WITHOUT changing a word and the identical transcript returned 200. So the
// customer's input was never in question: the model produced tool output, OUR reply contract
// refused it, and a different sample of the same request passed. Production logs:
//
//   {"category":"INVALID_SHAPE","input_key_count":6,"zod_paths":["icp"]}
//   {"category":"INVALID_SHAPE","input_key_count":8,"zod_paths":["brief"]}
//
// ── THE TWO CAUSES, AND THEY ARE NOT THE SAME KIND OF THING ────────────────────────────
//
// 🛑 ①  `["icp"]` — `null` WHERE A KEY COULD SIMPLY HAVE BEEN OMITTED.
//
// Every field of the reply schema is `.optional()`, which in Zod means `T | undefined` and
// NOT `T | null`. So a model that says "I have no ICP proposal yet" the obvious way —
// `icp: null` — is refused, while the same model omitting the key entirely is accepted. The
// two are identical in meaning and only one of them worked. Nothing about the customer's
// answer differs between those two samples; only the JSON does.
//
// 🛑 ②  `["brief"]` — NOT A SHAPE ERROR AT ALL.
//
// `MillaReplyInput` has no `brief` key. That path is `millaReplyFor`'s own
// `ctx.addIssue({ path: ['brief'] })`: the ELEVEN-FACT GATE. The model declared `complete`
// while the gate could resolve fewer than eleven facts. That is a model misjudging its own
// readiness — and the product was charging it to the CUSTOMER as a failed turn, with a
// banner telling them to try again at something they had done correctly.
//
// ── WHAT THIS MODULE DOES, AND THE LINE IT WILL NOT CROSS ──────────────────────────────
//
// It normalises SHAPE. It never normalises TRUTH.
//
//   · a `null` becomes an absent key — "nothing here" said two ways, read one way;
//   · a premature completion is recognised as one, so the ROUTE can continue the
//     conversation with Milla's own sentence instead of refusing the customer.
//
// It does NOT invent a fact, fill a default, turn unknown into known, mark a Brief complete,
// or let a genuinely malformed reply through. `icp: null` is nothing; `icp: "agencies"` is
// malformed and still fails closed, because a string where an object belongs is the model
// getting it wrong in a way we cannot safely read.
//
// ⚠️ PURE, AND THAT IS THE POINT. No database, no request, no clock. Four guards in this
// batch have already passed while the behaviour behind them was dead, so these decisions are
// EXECUTED by the gate rather than asserted about as source text.
// ═══════════════════════════════════════════════════════════════════════════════════════

/** Depth bound. The reply contract is two levels deep; this only stops a pathological one. */
const MAX_DEPTH = 6

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

/**
 * 🛑 `null` MEANS "I HAVE NOTHING FOR THIS", AND SO DOES AN ABSENT KEY. Read them the same.
 *
 * ⚠️ ONLY `null` AND `undefined` ARE DROPPED. `false`, `0` and `''` are answers — `website_none:
 * false` is a real statement about a real website and must survive untouched. Dropping a
 * falsy value would be exactly the silent loss of customer truth this repo keeps closing.
 *
 * ⚠️ IT DROPS, IT NEVER SUBSTITUTES. A dropped key is ABSENT, not defaulted to `''` or `[]`.
 * That distinction is load-bearing twice over: `saveBriefDraft` MERGES, so an absent key
 * leaves a previously captured answer alone where a `null` would overwrite it with nothing;
 * and an empty provider list means UNCONSTRAINED downstream, so inventing one would widen a
 * client's search rather than express it.
 *
 * ⚠️ AND IT DOES NOT REPAIR A WRONG TYPE. A string where an object belongs, an array where a
 * string belongs — those are not "nothing", they are the model getting it wrong, and they
 * must still reach Zod and be refused. The only thing this function knows how to read is
 * emptiness.
 */
export function normaliseModelReply(input: unknown, depth = 0): unknown {
  if (depth > MAX_DEPTH) return input
  if (Array.isArray(input)) {
    // A `null` ELEMENT is nothing too — `proof: [null]` is an empty claim, not a claim of
    // nothing. Dropping it leaves the real claims beside it untouched.
    return input
      .filter(v => v !== null && v !== undefined)
      .map(v => normaliseModelReply(v, depth + 1))
  }
  if (!isPlainObject(input)) return input
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(input)) {
    if (value === null || value === undefined) continue
    out[key] = normaliseModelReply(value, depth + 1)
  }
  return out
}

/**
 * 🛑 THE FOUR REFUSALS THAT MEAN "THE MODEL SAID FINISHED TOO SOON".
 *
 * `MillaReplyInput` and `millaReplyFor` raise exactly four `custom` issues, and every one of
 * them is a READINESS judgement about a `complete` reply — not a statement that the reply is
 * unreadable:
 *
 *   `brief`                     fewer than eleven facts resolved
 *   `icp`                       a completion with no icp object
 *   `profile.company_name`      a first-run completion with no company name
 *
 * ⛓️ `profile.country` WAS THE FOURTH AND IS GONE (S1-RT-009B). The rule that raised it has
 * been removed: the client's own business country is NOT one of the eleven, the prompt told
 * the model never to invent one, and requiring it to COMPLETE made inventing it the only way
 * through. It is now asked for at promotion, by the affordance that already existed.
 *
 * ⚠️ A WHITELIST, NOT A PATTERN. A fifth readiness rule added later is NOT covered, and that
 * is deliberate: it will refuse as it does today and this list is where somebody has to
 * decide whether it belongs. Silent inclusion is how a rule nobody reviewed starts changing
 * customer-facing behaviour.
 */
export const COMPLETION_READINESS_PATHS: readonly string[] = [
  'brief', 'icp', 'profile.company_name',
]

/**
 * 🛑 WAS THE *ONLY* THING WRONG WITH THIS REPLY THAT IT CLAIMED TO BE FINISHED TOO SOON?
 *
 * Both live failures were this: a `complete` refused for readiness, shown to the customer as
 * "Milla didn't catch that". They had done nothing wrong and there was nothing for them to
 * change — the judgement was the MODEL's, about its own state.
 *
 * ⚠️ `code === 'custom'` IS THE LOAD-BEARING HALF, AND IT IS WHAT KEEPS THIS SAFE. Our four
 * readiness refusals are `custom`; every structural refusal Zod raises is not
 * (`invalid_type`, `invalid_enum_value`, `too_small`, …). So `icp: null` — which normalises
 * to absent and then trips the readiness rule at path `icp` — is continued, while
 * `icp: "agencies"` raises `invalid_type` at the SAME path and is still refused. Same path,
 * opposite meaning, and only the code tells them apart.
 *
 * ⚠️ EVERY ISSUE MUST QUALIFY. One structural error anywhere in the set and the whole reply
 * is refused as before. This can only ever relax a reply that is otherwise perfectly formed.
 *
 * ⚠️ AND IT IS NOT PERMISSION TO COMPLETE. It says "this was a conversational turn wearing
 * the wrong label". The caller must still produce a QUESTION — the Brief stays incomplete,
 * the eleven-fact gate is untouched, and nothing is persisted as finished.
 */
export function isPrematureCompletion(
  issues: ReadonlyArray<{ code?: string; path: ReadonlyArray<string | number> }>,
): boolean {
  if (issues.length === 0) return false
  return issues.every(i =>
    i.code === 'custom' && COMPLETION_READINESS_PATHS.includes(i.path.join('.')))
}

/**
 * 🛑 MODEL EMPTINESS IS NOISE. CUSTOMER EMPTINESS IS INTENT. THEY USE DIFFERENT DOORS.
 *
 * `saveBriefDraft` MERGES, and it is shared by two callers that mean opposite things by an
 * empty value:
 *
 *   · `PUT /milla/brief-draft` — the CUSTOMER's own edit. Every field is `.nullish()` there
 *     precisely so a person can CLEAR an answer. That is intent, it is the only explicit
 *     clear mechanism in the product, and it must keep working exactly as it does.
 *
 *   · the model's `brief_so_far` snapshot — where `''` and `[]` mean "I have not established
 *     this", because the model has no way to express a clear and the prompt tells it to
 *     "leave out anything they have not established yet". Merging those would erase a fact
 *     the customer gave three turns ago because one sample went quiet about it.
 *
 * So the filter lives HERE, on the model path, and NOT inside `saveBriefDraft` — putting it
 * there would silently disable the customer's ability to clear anything.
 *
 * ⚠️ `false` IS NOT EMPTY. `website_none: false` is "I do have a website" — an answer, and
 * one of the eleven facts. Only `''`, whitespace and `[]` are dropped.
 */
export function modelFactsOnly(snapshot: unknown): Record<string, unknown> {
  if (snapshot === null || typeof snapshot !== 'object' || Array.isArray(snapshot)) return {}
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(snapshot as Record<string, unknown>)) {
    if (value === null || value === undefined) continue
    if (typeof value === 'string' && value.trim() === '') continue
    if (Array.isArray(value) && value.filter(v => String(v ?? '').trim() !== '').length === 0) continue
    out[key] = value
  }
  return out
}

/**
 * 🛑 ONE BAD FIELD MUST NOT COST THE WHOLE TURN.
 *
 * `BriefSoFar.safeParse(...)` is all-or-nothing: a single wrong type anywhere — `geographies`
 * sent as a string, a number where text belongs — fails the parse, the `if (snapshot.success)`
 * guard skips the save, and EVERY OTHER FACT THE CUSTOMER GAVE IN THAT TURN is discarded.
 * Silently: there is no log on that path. The customer says six things, one of them confuses
 * the model's formatting, and all six are lost.
 *
 * ⚠️ IT DROPS, IT NEVER REPAIRS. The offending keys are removed and the rest re-parsed
 * through the SAME schema. A value we could not read is not guessed at, coerced or
 * defaulted — it is simply not saved, exactly as if the model had never mentioned it, and
 * the fact stays missing until the customer says it again.
 */
export function dropKeysNamedByIssues(
  raw: Record<string, unknown>,
  issues: ReadonlyArray<{ path: ReadonlyArray<string | number> }>,
): Record<string, unknown> {
  const bad = new Set(issues.map(i => String(i.path[0] ?? '')).filter(Boolean))
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(raw)) if (!bad.has(k)) out[k] = v
  return out
}

export const PREMATURE_COMPLETION = 'PREMATURE_COMPLETE_CONTINUED'
