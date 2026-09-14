// ═══════════════════════════════════════════════════════════════════════════════════════
// "ACTUALLY INCLUDE THE US AS WELL" — A CORRECTION IS STRUCTURE, NOT PROSE. (R121, 14 Sep.)
//
// ── THE DEFECT THIS CLOSES ─────────────────────────────────────────────────────────────
//
// 🛑 THE DURABLE BRIEF MERGES SHALLOWLY, so a list fact is REPLACED WHOLESALE by whatever
// the model emitted this turn. That is correct when the model restates the whole list and
// silently destructive when it does not:
//
//   turn 3   "we target UK agencies"        →  geographies: ['United Kingdom']
//   turn 7   "actually include the US too"  →  geographies: ['United States']   ← the UK is GONE
//
// The client added a market and lost one. Nothing logged it, nothing could catch it, and
// whether it happened at all depended on which way the model happened to phrase its snapshot
// that turn. No test in the repo exercised a correction.
//
// ── WHY THIS IS NOT A LANGUAGE PROBLEM ─────────────────────────────────────────────────
//
// 🛑 THE MODEL ALREADY UNDERSTANDS "AS WELL". What it had no way to SAY was "add this to what
// you already hold" — the only channel was a full list, so every correction was a guess about
// whether it had remembered every earlier item. This gives the understanding somewhere to go.
//
// ⚠️ SO NOTHING HERE READS A SENTENCE. `add`, `remove` and a full restatement are three
// shapes the model chooses between; this module applies the one it chose. Put a regex in
// this file and the defect R121 exists to stop is back, one layer down.
//
// ⚠️ AND `set` STILL WINS. A model that restates the whole list is making a deliberate
// statement about its entirety — including, legitimately, that a market is no longer there.
// Ops are for the turns where it does not.
// ═══════════════════════════════════════════════════════════════════════════════════════

/**
 * The Brief facts that are LISTS, and therefore the ones a correction can silently truncate.
 *
 * ⚠️ THE STRING FACTS ARE DELIBERATELY ABSENT. `exclusions`, `what_they_do` and
 * `desired_outcome` are single statements the model rewrites in full — it can see the current
 * value in the resume block, so "forget software firms" is it revising a sentence, not
 * patching a list. Adding them here would invent a second way to say the same thing.
 */
export const LIST_FACTS = [
  'geographies', 'company_sizes', 'job_titles', 'seniority_levels',
] as const

export type ListFact = (typeof LIST_FACTS)[number]

/** What the model may say about one list beyond restating it. */
export interface ListOp {
  add?: unknown
  remove?: unknown
}

export type ListOps = Partial<Record<ListFact, ListOp>>

const clean = (v: unknown): string[] =>
  Array.isArray(v)
    ? v.map(x => String(x ?? '').trim()).filter(s => s.length > 0)
    : []

/** Case- and space-insensitive identity, so "united states" removes "United States". */
const key = (s: string): string => s.trim().toLowerCase().replace(/\s+/g, ' ')

/**
 * 🛑 APPLY ONE TURN'S LIST CHANGES TO THE CUMULATIVE RECORD.
 *
 * `held`     — the durable Brief as stored, before this turn.
 * `snapshot` — what the model restated this turn (a `set`, and it wins where present).
 * `ops`      — what the model said to ADD or REMOVE relative to what is already held.
 *
 * ⚠️ RETURNS ONLY THE FACTS IT ACTUALLY CHANGED. An untouched list is absent from the result,
 * so the caller's merge leaves the stored value alone — an empty object here means "this turn
 * said nothing about any list", which must never be confused with "every list is now empty".
 *
 * ⚠️ ORDER IS PRESERVED AND DUPLICATES ARE NOT CREATED. A client who adds a market they
 * already have gets the list they already had, not the same market twice.
 *
 * ⚠️ A REMOVE THAT EMPTIES A LIST IS HONOURED. "actually drop the US" on a single-market
 * Brief leaves the fact genuinely empty, which makes it MISSING again and Milla asks — that is
 * the client's meaning, and quietly keeping the old value would be the opposite of it.
 */
export function applyListOps(
  held: Record<string, unknown>,
  snapshot: Record<string, unknown>,
  ops: ListOps | undefined,
): Partial<Record<ListFact, string[]>> {
  const out: Partial<Record<ListFact, string[]>> = {}
  if (!ops || typeof ops !== 'object') return out

  for (const fact of LIST_FACTS) {
    const op = ops[fact]
    if (!op || typeof op !== 'object') continue

    const add = clean(op.add)
    const remove = clean(op.remove)
    if (add.length === 0 && remove.length === 0) continue

    // 🛑 `set` BEATS `add`/`remove` FOR THE SAME FACT. Both in one turn is the model saying
    // the same thing twice; the full statement is the less ambiguous of the two, and honouring
    // the ops on top of it could add back a value the restatement deliberately dropped.
    if (Object.prototype.hasOwnProperty.call(snapshot, fact) && Array.isArray(snapshot[fact])) continue

    const base = clean(held[fact])
    const gone = new Set(remove.map(key))
    const kept = base.filter(v => !gone.has(key(v)))

    const seen = new Set(kept.map(key))
    for (const v of add) {
      if (gone.has(key(v))) continue      // added and removed in one turn — the removal stands
      if (seen.has(key(v))) continue
      seen.add(key(v))
      kept.push(v)
    }
    out[fact] = kept
  }
  return out
}
