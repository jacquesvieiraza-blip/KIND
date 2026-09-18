// ══════════════════════════════════════════════════════════════════════════════════════════
// D-62 / D-63 / D-64 · HYGIENE — THE THREE THAT STAY FIXED (RC-4)
//
// REQ: *"'passed' CHECK; meeting comment; /milla/chat unmounted; model literals."*
// GREEN: *"'passed' CHECK constraint; meeting comment; /milla/chat unmounted; model literals
// from one constant."*
//
// ── WHY THESE THREE NEED A GUARD AND NOT JUST A COMMIT ──────────────────────────────────
//
// Every one of them is a defect that ALREADY CAME BACK ONCE, or would have:
//
// ① **THE MEETING COMMENT** was written twice, the second a rewrite of the first. Nothing was
//    wrong with either sentence — which is exactly why it survived: a duplicated comment
//    breaks no test and reads as emphasis until you notice the two copies disagree about how
//    much they explain.
//
// ② **`POST /milla/chat`** was DISCONNECTED on 14 Sep and stayed MOUNTED. The guard that
//    covered it (O1) proved no UI hands out the endpoint — a true statement that says nothing
//    about whether the endpoint answers. Four days of "that's handled" sat on top of an open
//    door.
//
// ③ **THE MODEL LITERALS** are the strongest case of the three, because the constant already
//    existed and lost anyway: four files IMPORTED `BACKGROUND_MODEL` and hand-typed the model
//    id beside it, and one call site had already drifted to the undated alias
//    `'claude-haiku-4-5'`. One decision, two spellings, nothing red.
//
// ⚠️ THE `'passed'` CHECK CONSTRAINT — THE FOURTH CLAUSE — IS **OPEN**, NOT DONE, and section
// ④ below pins it rather than closing it. The product writes a status value the repository's
// only CHECK record does not permit; which constraint production actually carries is RUNTIME
// UNVERIFIED and unreadable from here; and the one founder lock on that constraint was written
// about a different value. Widening it would mean acting on my own reading of his lock, on a
// constraint the whole outreach path writes through. So the divergence is made VISIBLE and
// regression-guarded, and the question goes to the founder by name.
// ══════════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const API = join(__dirname, '..')
const read = (p: string) => readFileSync(join(API, p), 'utf8')

/** Source with comments removed — a guard that reads prose is not reading the product. */
const codeOnly = (s: string) => s
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .split('\n')
  .map(l => { const i = l.search(/(?<![:\\])\/\//); return i === -1 ? l : l.slice(0, i) })
  .join('\n')

// ═════════════════════════════════════════════════════════════════════════════════════════
// D-62 · THE MEETING COMMENT IS WRITTEN ONCE
// ═════════════════════════════════════════════════════════════════════════════════════════
describe('D-62 · the brief says why a failed count is not zero, once', () => {
  const BRIEF = 'lib/morning-brief-deliver.ts'

  it('🛑 THE #136a NOTE APPEARS EXACTLY ONCE', () => {
    // Two copies stood here, the second strictly fuller than the first — it also explained
    // why `meetingCounts` returns null rather than an empty result. The fuller one was kept.
    const src = read(BRIEF)
    expect((src.match(/#136a/g) ?? []).length,
      'the #136a note is duplicated again — two explanations of one rule drift apart').toBe(1)
    expect((src.match(/a number we could not measure must not render as zero/g) ?? []).length,
      'the sentence is written twice').toBe(1)
  })

  it('🛑 AND THE RULE IT EXPLAINS IS STILL ENFORCED — the comment is not the guarantee', () => {
    // ⚠️ THE POINT OF THIS CASE. Deleting a duplicated comment is hygiene; deleting the
    // BEHAVIOUR it describes would be a client with three meetings told they had a quiet
    // week. The comment was tidied — the refusal underneath it is asserted, on live code.
    const live = codeOnly(read(BRIEF))
    expect(live, 'an unreadable meeting count no longer stops the brief')
      .toContain("return { status: 'failed', reason: 'meetings count unreadable' }")
    expect(live, 'the failed count is compared against null, so 0 would pass as a real count')
      .toContain('counts === null')
  })
})

// ═════════════════════════════════════════════════════════════════════════════════════════
// D-63 · THE STATELESS DOOR IS UNMOUNTED
// ═════════════════════════════════════════════════════════════════════════════════════════
describe('D-63 · the memoryless Milla has no door', () => {
  it('🛑 NO ROUTE REGISTERS POST /chat ON THE MILLA ROUTER', () => {
    // ⚠️ ON CODE, NOT PROSE. The tombstone left where the route stood quotes
    // `millaRouter.post('/chat'` while explaining why it went, so a raw scan would match the
    // explanation and report the door open.
    const live = codeOnly(read('routes/milla.ts'))
    expect(live, 'the stateless Milla door is mounted again')
      .not.toMatch(/millaRouter\.post\(\s*['"]\/chat['"]/)
  })

  it('🛑 AND THE PERSISTED DOOR IS STILL MOUNTED — otherwise this proves only that the file broke', () => {
    const live = codeOnly(read('routes/milla.ts'))
    expect(live, 'the desk chat is gone too — Milla has no door at all')
      .toMatch(/millaRouter\.post\(\s*['"]\/sessions\/:sessionId\/chat['"]/)
  })

  it('🛑 AND NOTHING IN THE PRODUCT POSTS TO IT — the door is gone AND unreferenced', () => {
    // O1's original question, kept: a UI that hands out the endpoint is how the door came to
    // be worth having in the first place.
    for (const f of [
      '../../portal/src/app/(dashboard)/AgentColumn.tsx',
      '../../portal/src/components/ui/AgentSidePanel.tsx',
      '../../portal/src/components/milla/MillaConversation.tsx',
    ]) {
      expect(codeOnly(read(f)), `${f} posts to the stateless Milla door`)
        .not.toMatch(/['"]\/milla\/chat['"]\s*[,)]/)
    }
  })
})

// ═════════════════════════════════════════════════════════════════════════════════════════
// D-64 · EVERY MODEL ID COMES FROM ONE CONSTANT
// ═════════════════════════════════════════════════════════════════════════════════════════
describe('D-64 · the model a call uses is named in one place', () => {
  /** Every non-test source in the API, the file that DEFINES the constants excepted. */
  function apiSources(): string[] {
    const out: string[] = []
    for (const dir of ['lib', 'routes', 'middleware', 'eval']) {
      let names: string[] = []
      try { names = readdirSync(join(API, dir)) } catch { continue }
      for (const n of names) {
        if (!n.endsWith('.ts') || n.includes('.test.') || n.includes('.eval.')) continue
        if (dir === 'lib' && n === 'models.ts') continue   // THE ONE HOME
        out.push(`${dir}/${n}`)
      }
    }
    return out
  }

  it('🛑 NO HAND-TYPED MODEL ID SURVIVES OUTSIDE models.ts', () => {
    // 🛑 THE DEFECT THIS REPLACES WAS NOT "there is no constant". There was one, and these
    // files imported it: `routes/figsy.ts`, `routes/leads.ts`, `routes/operator.ts` and
    // `lib/figsy.ts` each held `BACKGROUND_MODEL` in scope AND hand-typed the model id beside
    // it. A constant nothing is obliged to use is documentation.
    const offenders: string[] = []
    for (const f of apiSources()) {
      for (const [i, line] of codeOnly(read(f)).split('\n').entries()) {
        const m = line.match(/['"]claude-[a-z0-9.-]+['"]/)
        if (m) offenders.push(`${f}:${i + 1} ${m[0]}`)
      }
    }
    expect(offenders, 'a model id is hand-typed instead of read from @kind models').toEqual([])
  })

  it('🛑 AND THE TWO CONSTANTS ARE THE ONLY PLACE A MODEL ID IS SPELLED', () => {
    const models = codeOnly(read('lib/models.ts'))
    const ids = models.match(/['"]claude-[a-z0-9.-]+['"]/g) ?? []
    expect(ids.length, `models.ts spells ${ids.length} model ids; exactly 2 are the product's decisions`).toBe(2)
  })

  it('🛑 AND THE BACKGROUND ID IS PINNED, NOT A FLOATING ALIAS', () => {
    // ⚠️ THIS IS THE DRIFT THAT HAD ALREADY HAPPENED. `routes/internal-briefs.ts` named
    // `'claude-haiku-4-5'` — the same model, unpinned — so one background call could move
    // under us while every other stayed put. An alias here reopens exactly that.
    const models = read('lib/models.ts')
    expect(models, 'the background model is an unpinned alias again')
      .toMatch(/BACKGROUND_MODEL = ['"]claude-haiku-4-5-\d{8}['"]/)
  })
})

// ═════════════════════════════════════════════════════════════════════════════════════════
// ④ THE 'passed' CHECK — OPEN, AND PINNED SO IT STAYS VISIBLE
// ═════════════════════════════════════════════════════════════════════════════════════════
describe("D-62 · 'passed' is written by the product and absent from the CHECK (OPEN)", () => {
  const MIG = join(API, '../../../supabase/migrations')
  const migration = (f: string) => readFileSync(join(MIG, f), 'utf8')

  it('🛑 THE PRODUCT WRITES `status: passed`', () => {
    expect(codeOnly(read('lib/approve-lead.ts')), 'passLead no longer writes the value this item is about')
      .toContain("update({ status: 'passed'")
  })

  it("🛑 AND THE REPOSITORY'S ONLY CHECK RECORD DOES NOT ALLOW IT — this is the contradiction", () => {
    // ⚠️ IF THIS GOES RED, THE ITEM MOVED. Either somebody widened `leads_status_check` — in
    // which case the founder lock on that constraint was acted on and this guard must be
    // re-read, not deleted — or the migration was rewritten. Both deserve a human.
    const check = migration('20260525_fix_leads_status_and_figsy_memory.sql')
    const allowed = check.slice(check.indexOf('CHECK (status IN ('), check.indexOf('))', check.indexOf('CHECK (status IN (')))
    expect(allowed, 'the CHECK migration no longer has a status list to read').not.toBe('')
    expect(allowed, "leads_status_check now allows 'passed' — the divergence is resolved and this item needs re-reading")
      .not.toContain("'passed'")
  })

  it('🛑 AND THE ONLY RECORD THAT MAKES PRODUCTION WORK IS AN ENUM ALTERED OUTSIDE THE RUNNER', () => {
    // This is why the pass action is not visibly broken today: prod's `leads.status` is an
    // ENUM, and `passed` was added to the TYPE by hand. It is the sole evidence that the
    // write lands — and it is evidence about a database, not about this repository.
    expect(migration('20260723_operator_audit_log.sql'))
      .toContain("ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'passed'")
  })

  it('🛑 SO THE WRITE REPORTS ITS OWN REFUSAL — the one thing that makes an open divergence survivable', () => {
    // ⚠️ THIS IS THE GUARD THAT ACTUALLY PROTECTS A CLIENT. While the constraint question is
    // open, the failure mode is a refused write; collapsing that into "lead not found" is what
    // showed a client a 404 on a card they were looking straight at, with their feedback lost.
    const live = codeOnly(read('lib/approve-lead.ts'))
    expect(live, 'a refused status write is silently a missing lead again')
      .toContain("return { status: 'failed', detail: error.message }")
    expect(live, "the refusal is no longer told apart from 'no such lead'")
      .toContain("return { status: data ? 'passed' : 'not_found' }")
  })
})
