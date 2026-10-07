// ⚑ 6 Oct (N5) — THE TWO BATCH CHIPS SAY WHICH BATCH THEY COUNT.
//
// Sourced and Qualified count only the newest batch (the one being checked or approved); the
// other pipeline chips count the whole programme. Unlabelled, "252 Sourced · 249 Qualified" beside
// "234 In the sequence" read as wrong numbers. With the batch number they read
// "Batch 2: 252 found · 249 qualified". "qualified", not "checked": it is who PASSED the check.

export type BatchChipLabels = { prefix: string | null; sourced: string; qualified: string }

export function batchChipLabels(batchSeq: number | null | undefined): BatchChipLabels {
  if (typeof batchSeq !== 'number' || !Number.isFinite(batchSeq) || batchSeq < 1) {
    return { prefix: null, sourced: 'Sourced', qualified: 'Qualified' }
  }
  return { prefix: `Batch ${batchSeq}:`, sourced: 'found', qualified: 'qualified' }
}

/** The batch the Sourced/Qualified chips count; undefined with no programme, null from an older API. */
export function batchSeqOf(lc: { counts: object; programme: unknown } | null | undefined): number | null | undefined {
  if (!lc || !lc.programme) return undefined
  const v = (lc.counts as Record<string, unknown>).batchSeq
  return typeof v === 'number' ? v : null
}
