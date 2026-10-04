// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 3 Oct (sequencing piece 7 — the founder's blueprint view 9: "New goal = new sequence. Not new
// onboarding.").
//
// A returning client sees their programmes side by side — goal, the problem each led with, the
// ask, who it was for, and which version of "Your business" it was written from — and a timeline
// of what changed: each direction version drafted and approved, each "Your business" change.
//
// READ-ONLY, and built only from what is already stored: the direction store (piece 3), the
// programmes table, and "Your business" history (piece 2). Nothing about a prospect is shown.
// ⚠️ R145: prospect details are kept 90 days; the client's own direction and business facts are
// theirs and are kept — the screen says so in those words.
// ═══════════════════════════════════════════════════════════════════════════════════════
import { db } from '@kind/db'
import type { Direction, DirectionStore } from './programme-direction'
import { audienceLine } from './programme-direction'

export type PastProgramme = {
  programmeId: string; status: string | null; startedAt: string | null; meetingTarget: number | null
  goal: string; problem: string; ask: string; audience: string | null; businessVersion: number | null
}
export type HistoryEvent = { at: string; title: string; detail: string }
export type ProgrammeHistory = { programmes: PastProgramme[]; events: HistoryEvent[] }

type Rec = Record<string, unknown>
type ProgrammeRowLite = { id: string; status: string | null; meeting_target: number | null; first_paid_at: string | null; created_at: string | null }

const BUSINESS_LABEL: Record<string, string> = {
  sells: 'What you sell', problems: 'Problems you solve', impact: 'What those problems cost your customers',
  answer: 'Your answer', result: 'A result we may quote', not_fit: 'Who isn’t a fit',
}

/** Oldest programme first; one row per programme a direction was approved for. Pure. */
export function buildHistory(store: DirectionStore, programmes: ProgrammeRowLite[], businessHistory: Rec[]): ProgrammeHistory {
  const all = [...store.history, ...(store.current ? [store.current] : [])]
  const byProgramme = new Map<string, Direction>()
  for (const d of all) if (d.programme_id && d.status === 'approved') byProgramme.set(d.programme_id, d) // later wins
  const rows: PastProgramme[] = programmes
    .filter(p => byProgramme.has(p.id))
    .map(p => {
      const d = byProgramme.get(p.id)!
      return {
        programmeId: p.id, status: p.status, startedAt: p.first_paid_at ?? p.created_at,
        meetingTarget: p.meeting_target, goal: d.goal, problem: d.problem, ask: d.ask,
        audience: d.audience ? audienceLine(d.audience) : null, businessVersion: d.business_version ?? null,
      }
    })
    .sort((a, b) => String(a.startedAt ?? '').localeCompare(String(b.startedAt ?? '')))

  const events: HistoryEvent[] = []
  for (const d of all) {
    if (d.drafted_at) events.push({ at: d.drafted_at, title: `Direction version ${d.version} drafted`, detail: d.goal })
    if (d.status === 'approved' && d.approved_at) events.push({ at: d.approved_at, title: `Direction version ${d.version} approved`, detail: `Leads with: ${d.problem}` })
  }
  for (const h of businessHistory) {
    const at = typeof h.at === 'string' ? h.at : ''
    if (!at) continue
    events.push({ at, title: `Your business — version ${h.version ?? '?'}`, detail: `${BUSINESS_LABEL[String(h.key)] ?? 'A fact'} changed.` })
  }
  // De-duplicate (a version is re-pushed into history when it changes) and show newest first.
  const seen = new Set<string>()
  const uniq = events.filter(e => { const k = `${e.at}|${e.title}`; if (seen.has(k)) return false; seen.add(k); return true })
  uniq.sort((a, b) => b.at.localeCompare(a.at))
  return { programmes: rows, events: uniq.slice(0, 20) }
}

/** A failed read THROWS — the screen says it could not load, never "no history". */
export async function readProgrammeHistory(clientId: string): Promise<ProgrammeHistory> {
  const { readDirectionStore } = await import('./programme-direction')
  const store = await readDirectionStore(clientId)
  const { data: progs, error } = await db.from('programmes')
    .select('id, status, meeting_target, first_paid_at, created_at').eq('client_id', clientId)
  if (error) throw new Error(error.message)
  const { data: pitch, error: kErr } = await db.from('figsy_knowledge')
    .select('data').eq('client_id', clientId).eq('kind', 'pitch').maybeSingle()
  if (kErr) throw new Error(kErr.message)
  const profile = (((pitch as { data?: Rec } | null)?.data ?? {}).profile ?? {}) as Rec
  const history = Array.isArray(profile.history) ? profile.history as Rec[] : []
  return buildHistory(store, (progs ?? []) as ProgrammeRowLite[], history)
}
