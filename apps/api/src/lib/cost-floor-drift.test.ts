import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
// #628 — the all-in floor now has to agree too. The three documents agreed perfectly on $146
// while the real floor was $352, because the total was never one of the compared quantities.
import { PLATFORM_FLOOR_USD, COMPANY_FLOOR_USD, TOTAL_FLOOR_USD } from '@kind/shared'

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
/** #628 — history's home. Facts retired off LAUNCH-PAD land here, and must still be findable. */
const kindMaster = docs('KIND-MASTER.md')

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
    // ⚠️ RE-ANCHORED 6 Aug (#628). This looked for a line starting `> **The floor is`, and that
    // wording was itself the bug: the sentence said "the floor" and gave the PLATFORM half.
    // The lede now says "The PLATFORM floor is", which is both true and what this test is for.
    const lede = runCosts.split('\n').find(l => l.startsWith('> **The platform floor is'))
    expect(lede, 'the opening platform-floor claim must exist').toBeTruthy()
    expect(lede).toContain(`$${floor}`)
  })

  it('and the doc does NOT let the platform half stand in for the all-in floor', () => {
    // THE DEFECT THIS TEST DID NOT CATCH, ADDED 6 Aug (#628). Everything above pins the three
    // documents to each other and to the model — and all three agreed on $146 while the ALL-IN
    // floor was $352, because `TOTAL_FLOOR_USD` was never one of the things being compared.
    // Perfect agreement on the wrong quantity. The company lines landed on 4 Aug and the prose
    // never followed, so the biggest number in the repo was understated by $206 for three days
    // with a green gate over it.
    const lede = runCosts.split('\n').find(l => l.includes('all-in'))
    expect(lede, 'the doc must state an all-in figure, not only the platform half').toBeTruthy()
    expect(lede).toContain(`$${TOTAL_FLOOR_USD}`)
    // Both halves named, so the total can be argued with rather than taken on trust.
    expect(lede).toContain(`$${PLATFORM_FLOOR_USD}`)
    expect(lede).toContain(`$${COMPANY_FLOOR_USD}`)
  })

  it('LAUNCH-PAD states the same figure', () => {
    // LAUNCH-PAD mirrors the model. When the two disagree the founder reads whichever they
    // opened, which is exactly how "we're at 50%" arguments start.
    //
    // ⚠️ RE-ANCHORED 6 Aug (#628). This read the `Honest platform floor` phrase out of the #556
    // row, which lived in LAUNCH-PAD's BLOCK M — retired to KIND-MASTER when the runlist was dug
    // out from under 200 lines of superseded prose. The FACT did not change home: the inventory
    // row still carries it and this now reads the live honest-state line, which names both halves.
    const row = launchPad.split('\n').find(l => l.includes('The cost floor is'))
    expect(row, 'LAUNCH-PAD must state the floor in its honest state').toBeTruthy()
    expect(row).toContain(`$${TOTAL_FLOOR_USD}`)
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

  it('the ordered three steps are spelled out for the founder, wherever they live', () => {
    // ⚠️ RE-HOMED 6 Aug (#628). This read LAUNCH-PAD's 3-Aug money block, which was retired to
    // KIND-MASTER with the rest of the superseded prose; LAUNCH-PAD's A12 row now carries the
    // one-line version (`pinned order in the runbook: DNS repoint FIRST`) and the runbook has
    // the detail. The ORDER is the thing that must survive a doc move, not the paragraph — so
    // this reads whichever living doc holds it rather than a fixed page.
    //
    // It also no longer slices a fixed 700 characters. That window overran its own subject twice
    // in this codebase; the block is bounded by the next table row instead.
    const doc = [kindMaster, launchPad].find(d => d.includes('delete the Cloudflare'))
    expect(doc, 'the ordered teardown must exist in a living doc').toBeTruthy()
    const at = doc!.indexOf('Failover teardown')
    const end = doc!.indexOf('\n|', doc!.indexOf('delete the Cloudflare'))
    const block = doc!.slice(at, end > at ? end : undefined)
    expect(block).toContain('repoint')
    expect(block.indexOf('repoint')).toBeLessThan(block.indexOf('delete the Cloudflare'))
    expect(block.indexOf('delete the Cloudflare')).toBeLessThan(block.indexOf('Render `kind-api-standby`'))
  })

  it('and LAUNCH-PAD still tells the founder the order matters, even in one line', () => {
    // The detail moved; the warning must not. A12 is a row he reads while deciding what to do
    // today, and the wrong order takes the live API down.
    const row = launchPad.split('\n').find(l => l.includes('Failover teardown'))
    expect(row, 'A12 must still be on the runlist').toBeTruthy()
    expect(row).toMatch(/DNS repoint FIRST/i)
  })
})
