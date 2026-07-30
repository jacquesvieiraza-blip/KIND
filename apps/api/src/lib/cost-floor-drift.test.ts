import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

// THE PLATFORM FLOOR IS STATED IN THREE PLACES, AND IT HAS DRIFTED FIVE TIMES.
//
// `run-costs-and-cashflow.md` keeps its own correction history, and it is the argument for this
// file: **$138 → $203 → ~$175–190 → ~$457 → ~$423.** Every one of those was wrong somewhere
// while being right somewhere else, because the number is written in prose in two documents and
// COMPUTED from editable inputs in a third.
//
// So this does not check that the floor is any particular value — it checks that the three
// places AGREE, and that the computed one is actually computed from every row it displays.
//
// Guard 3 is the one that caught a live bug while this file was being written: adding a cost row
// to `CASHFLOW-LAB.html` without adding its id to `FIXED_IDS` renders the row, lets you type a
// number into it, and silently EXCLUDES it from the total. A cost you can see and edit but that
// does not count is worse than a missing row — it reads as accounted for.

const docs = (f: string) => readFileSync(join(__dirname, '../../../../docs', f), 'utf8')
const lab = docs('CASHFLOW-LAB.html')
const runCosts = docs('run-costs-and-cashflow.md')
const launchPad = docs('LAUNCH-PAD.md')

/** Every fixed-cost input the page renders, as id → dollars. */
function fixedInputs(): Record<string, number> {
  const out: Record<string, number> = {}
  for (const m of lab.matchAll(/id="(f_[a-z]+)"\s+value="(-?[\d.]+)"/g)) out[m[1]] = parseFloat(m[2])
  return out
}

/** The ids the page's own arithmetic actually sums. */
function registeredIds(): string[] {
  const m = lab.match(/const FIXED_IDS\s*=\s*\[([^\]]+)\]/)
  if (!m) throw new Error('FIXED_IDS not found in CASHFLOW-LAB.html — the model cannot compute a floor')
  return [...m[1].matchAll(/'([^']+)'/g)].map(x => x[1])
}

const inputs = fixedInputs()
const registered = registeredIds()
const computedFloor = registered.reduce((s, id) => s + (inputs[id] ?? 0), 0)

describe('the interactive model can compute a floor at all', () => {
  it('renders at least the eight known cost lines', () => {
    expect(Object.keys(inputs).length).toBeGreaterThanOrEqual(8)
  })

  it('EVERY rendered cost row is registered in FIXED_IDS', () => {
    // The bug this exists for: a row you can see and edit that is excluded from the total reads
    // as accounted for, which is worse than a row that is simply missing.
    const orphans = Object.keys(inputs).filter(id => !registered.includes(id))
    expect(orphans, `cost rows rendered but NOT summed: ${orphans.join(', ')}`).toEqual([])
  })

  it('and every registered id actually exists as a row', () => {
    // The mirror image: an id in the array with no input is a silent zero.
    const ghosts = registered.filter(id => !(id in inputs))
    expect(ghosts, `ids summed but not rendered: ${ghosts.join(', ')}`).toEqual([])
  })
})

describe('all three documents agree on the floor', () => {
  // BOUND TO THE SPECIFIC CLAIM SITE, not to "does this number appear anywhere".
  //
  // The first version of these two tests used `claims(doc).toContain(floor)` over every "~$NNN"
  // in the file — and it did NOT fail when the headline figure was changed to $999, because the
  // correct number still appeared in the correction-history paragraph further down. A test that
  // cannot fail for the reason it names is worse than no test: it reports the drift as absent.
  const floor = Math.round(computedFloor)

  it('run-costs-and-cashflow.md states the computed floor in its PLATFORM FLOOR row', () => {
    const row = runCosts.split('\n').find(l => l.includes('PLATFORM FLOOR'))
    expect(row, 'the PLATFORM FLOOR table row must exist').toBeTruthy()
    expect(row).toContain(`$${floor}`)
  })

  it('and in its opening summary line', () => {
    const lede = runCosts.split('\n').find(l => l.startsWith('> **The floor is'))
    expect(lede, 'the opening floor claim must exist').toBeTruthy()
    expect(lede).toContain(`$${floor}`)
  })

  it('LAUNCH-PAD states the same figure', () => {
    // LAUNCH-PAD mirrors the model in #556. When the two disagree the founder reads whichever
    // they opened, which is exactly how "we're at 50%" arguments start.
    const row = launchPad.split('\n').find(l => l.includes('Honest platform floor'))
    expect(row, 'LAUNCH-PAD #556 must state the floor').toBeTruthy()
    expect(row).toContain(`$${floor}`)
  })

  it('the historical figures are kept as HISTORY, not restated as current', () => {
    // $457 is still in both docs on purpose — the correction history is worth keeping. What must
    // not happen is a bare "the floor is ~$457" with no date, which is what made it drift.
    expect(runCosts).toMatch(/~\$457 on 25 Jul|was \*\*~\$457\*\*/)
  })
})

describe('the Instantly-first decision is recorded where the money is', () => {
  it('the model names Growth, and says WHY it is not HyperGrowth', () => {
    // ⚠️ THIS GUARD WAS INVERTED ON 30 Jul, and the inversion is the decision.
    //
    // It used to assert the lab said "HyperGrowth" — correct while Instantly was going to SEND
    // for us, because only that tier carries the API. The founder then amended #577: our own
    // engine sends, Instantly is a warmup utility, and the API is not used at all. So the tier
    // we need is Growth, and a guard still demanding HyperGrowth would defend a $60/mo
    // overspend on a capability we deliberately dropped.
    expect(lab).toContain('Growth (warmup utility)')
    expect(lab).toContain('NOT HyperGrowth')
    expect(lab).not.toMatch(/id="f_instantly"\s+value="97"/)
  })

  it('and records the mailbox constraint that makes the purchase specific', () => {
    // The trap this prevents costs real money: Instantly's done-for-you boxes are $1 CHEAPER
    // and cannot be sent through by our engine at all — #577 has both vendors confirming in
    // writing that their mailboxes expose no SMTP credentials, and sending-inbox.ts requires
    // smtp_host + smtp_user + smtp_pass_enc. Buying the cheaper box breaks the architecture.
    expect(lab).toContain('MUST BE BOUGHT DIRECT FROM GOOGLE')
    expect(lab).toContain('no SMTP credentials')
  })

  it('Smartlead is recorded as DEFERRED rather than deleted', () => {
    // Nothing gets deleted (CORE-MAP rule 3) — and a $0 row with no explanation would read as
    // "Smartlead is free", which is the opposite of true.
    expect(lab).toContain('DEFERRED')
    expect(lab).toMatch(/id="f_smartlead"\s+value="0"/)
    expect(lab).toContain('returns at ≈$94')
  })

  it('the code no longer repeats Instantly\'s own wrong plan name', () => {
    const instantly = readFileSync(join(__dirname, './instantly.ts'), 'utf8')
    expect(instantly).toContain('HYPERGROWTH')
    expect(instantly).not.toContain('requires the Instantly Growth plan')
  })
})

// ── THE IDLE RULE, AND THE TWO TABLES IT CREATED (30 Jul) ────────────────────────────────
//
// This is founder-funded, so the cost register now states TWO things rather than one: what is
// actually being spent today, and what it becomes at the first client. That split only means
// anything if the rule behind it is written down — a $0 line with no trigger reads as "this
// tool is free", which is the opposite of true and exactly how the earlier ~$190 floor came to
// omit four paid tools.
describe('the register separates what we spend NOW from what we will spend', () => {
  it('both tables exist by heading', () => {
    expect(runCosts).toContain('### NOW — pre-first-client')
    expect(runCosts).toContain('### FUTURE — first client onward')
  })

  it('the idle rule is stated, not just implied by the zeroes', () => {
    // Bound to the sentence itself. Without it, someone reading a $0 Hunter line concludes we
    // do not pay for Hunter — rather than that we pay for it the month it does work.
    expect(runCosts).toContain('IDLE TOOLS BILL NOTHING')
    expect(runCosts).toContain('bills nothing this month')
  })

  it('every $0 line names the trigger that switches it back on', () => {
    for (const trigger of ['a sourcing run happens', 'a client signs', 'would feel an outage']) {
      expect(runCosts, `missing trigger: ${trigger}`).toContain(trigger)
    }
  })

  it('the model marks the deferred tools as idle rather than deleting them', () => {
    // CORE-MAP rule 3 applied to money: a removed row cannot be switched back on, and the
    // reader cannot tell whether it was cancelled or forgotten.
    expect(lab).toContain('IDLE = $0')
    expect(lab).toMatch(/id="f_hunter"\s+value="0"/)
  })
})

describe('the failover teardown records the order that does not break production', () => {
  it('the model says the DNS repoint comes FIRST', () => {
    // The one instruction with a blast radius: api.get-kind.com routes THROUGH the Cloudflare
    // load balancer, so deleting the LB before repointing to Railway takes the live API down.
    // A cost note that omits the order is a cost note that causes an outage.
    expect(lab).toContain('DNS REPOINT FIRST')
    expect(lab).toContain('render-cloudflare-failover.md')
  })

  it('and says the runbook and render.yaml stay in the repo', () => {
    // Cancelling the service is not the same as deleting the recipe (rule 3).
    expect(lab).toContain('STAY in the repo')
  })

  it('LAUNCH-PAD spells the three steps out in order for the founder', () => {
    const block = launchPad.slice(launchPad.indexOf('Failover teardown'), launchPad.indexOf('Failover teardown') + 700)
    expect(block).toContain('repoint')
    expect(block.indexOf('repoint')).toBeLessThan(block.indexOf('delete the Cloudflare'))
    expect(block.indexOf('delete the Cloudflare')).toBeLessThan(block.indexOf('Render `kind-api-standby`'))
  })
})
