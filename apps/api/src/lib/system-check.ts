// THE SYSTEM CHECK — the entire live state of Milla AND Vida, through one probe.
//
// Founder's spec, 26 Jul: *"I want to know everything live reported back through one check.
// reports back errors of state."* And both halves, because *"the system needs vida console
// to be right to operate milla."*
//
// THE ONE RULE, and it is the lesson of the whole week:
//
//     Every row is CHECKED-OK, CHECKED-BROKEN, or NOT-MEASURED — with the reason.
//     Nothing is green unless it was actually probed.
//
// A dashboard that shows green for something nobody looked at is how "the ONLY items not
// built: #515 + CI" survived while the entire sending spine was dead. So NOT-MEASURED is a
// first-class result here, and it always carries WHY.
//
// READ-ONLY. Probes are the cheapest call each provider offers, never a paid endpoint and
// never a send.

export type RowState = 'CHECKED-OK' | 'CHECKED-BROKEN' | 'NOT-MEASURED'

export type Row = {
  /** What was checked, in plain words. */
  label: string
  state: RowState
  /** The finding, or — for NOT-MEASURED — why it could not be established. */
  detail: string
  /** What to do about it, when there is something to do. */
  action?: string
}

export type Section = { title: string; side: 'milla' | 'vida' | 'both'; rows: Row[] }

export const ok = (label: string, detail: string): Row => ({ label, state: 'CHECKED-OK', detail })
export const broken = (label: string, detail: string, action?: string): Row =>
  ({ label, state: 'CHECKED-BROKEN', detail, action })
/** Never a substitute for a green: it says we did NOT establish this, and why. */
export const unmeasured = (label: string, why: string, action?: string): Row =>
  ({ label, state: 'NOT-MEASURED', detail: why, action })

/**
 * Wrap a probe so one failure can never take the report down — and can never render as a
 * pass either. An exception becomes NOT-MEASURED with the error attached.
 */
export async function probe(label: string, fn: () => Promise<Row>): Promise<Row> {
  try { return await fn() }
  catch (e) { return unmeasured(label, `The probe itself failed: ${e instanceof Error ? e.message : String(e)}`) }
}

export type Totals = { ok: number; broken: number; unmeasured: number }

export function tally(sections: Section[]): Totals {
  const rows = sections.flatMap(s => s.rows)
  return {
    ok: rows.filter(r => r.state === 'CHECKED-OK').length,
    broken: rows.filter(r => r.state === 'CHECKED-BROKEN').length,
    unmeasured: rows.filter(r => r.state === 'NOT-MEASURED').length,
  }
}

/**
 * The headline.
 *
 * Anything unmeasured is stated in the same breath as "all clear", because a report that
 * cannot see everything must never claim everything is fine.
 */
export function systemHeadline(t: Totals): string {
  if (t.broken > 0) {
    return `${t.broken} thing(s) BROKEN` + (t.unmeasured > 0 ? `, and ${t.unmeasured} could not be measured.` : '.')
  }
  if (t.unmeasured > 0) {
    return `Nothing broken in what could be checked — but ${t.unmeasured} row(s) were NOT measured, so this is not a clean bill of health.`
  }
  return `All ${t.ok} checks passed. Everything measurable is working.`
}

/**
 * An env-var probe: is the key present at all?
 *
 * Presence is not health — a key can be set and rotated/revoked — so a present key alone is
 * only ever NOT-MEASURED until something actually calls the provider. Callers that CAN make
 * a live call upgrade the row to OK or BROKEN themselves.
 */
export function keyRow(label: string, value: string | undefined, whatItIsFor: string): Row {
  if (!value) return broken(label, `Not set. ${whatItIsFor}`, `Set it in Railway → @kind/api → Variables.`)
  return unmeasured(label, `Key is set, but nothing has called the provider — a set key can still be revoked.`, 'A live probe upgrades this row.')
}
