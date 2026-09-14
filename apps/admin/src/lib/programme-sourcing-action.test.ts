// ═══════════════════════════════════════════════════════════════════════════════════════
// THE VIDA SOURCING SHORTCUT OBEYS THE PROGRAMME (founder-locked 7 Sep, HOUSE-008).
//
// 🛑 WHAT WAS ON SCREEN. The visible chip read `Source 20 leads` — a hard-coded string in an
// array — and pressing it did this:
//
//     runCommand("Source 20 leads")
//       → parseSourceIntent(text)         → 20, read out of the label's own digits
//       → GET  /operator/source-preview   → a PDL/pool cost card
//       → POST /operator/source           → selects ICPs by `is_active = true`
//
// Three things wrong with that for a programme, and each is independently fatal:
//   ① the QUANTITY came from parsing a sentence, so the number on the button decided the run
//   ② there was no `programme_id` anywhere — the call was scoped to a CLIENT
//   ③ `is_active` cannot reach House's v4, which is attached to the programme and deliberately
//      NOT client-facing active. The retired African Retail-Tech audience is the active one.
//
// THE FIX IS WIRING, NOT A REDESIGN. The programme-native backend already exists and is
// deployed (`POST /operator/programme/source`). Vida already holds the programme truth it
// needs — id, next batch, attached ICP — from the panel beside it. This connects the two.
//
// ⚠️ AND THE QUANTITY COMES FROM THE SERVER'S OWN RULE. `next_batch` is `nextBatchSize(p)` —
// the exact function `sourceProgramme` uses — carried on the truth payload the panel already
// fetches. The screen therefore cannot overstate the run, because it is not computing it.
//
// RED PROOF — before the fix `./programme-sourcing-action` does not exist, and the component
// still carries the literal chip and the legacy endpoints on the programme path.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import {
  programmeSourcingAction,
  programmeSourceRequest,
  sourcingChipLabel,
  sourcingConfirmQuestion,
  PROGRAMME_SOURCE_ENDPOINT,
  type ProgrammeTruthish,
} from './programme-sourcing-action'

const CONV_SRC = readFileSync(join(__dirname, '../components/vida/VidaConversation.tsx'), 'utf8')

/** Executable lines only — a comment describing the removed wiring must not read as it. */
const code = (src: string) => src.split('\n')
  .filter(l => { const t = l.trim(); return t && !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*') })
  .join('\n')
const CONV = code(CONV_SRC)

const PROG_ID = 'prog-house-1'
const V4 = { id: 'icp-v4', name: 'Founder-Led B2B Agencies UK/US', is_active: false }
const OLD = { id: 'icp-old', name: 'African Retail-Tech', is_active: true }

/** The exact House truth the founder read off the live Vida screen. */
const HOUSE: ProgrammeTruthish = {
  programme: {
    id: PROG_ID,
    status: 'SOURCING_AUTHORISED',
    state: 'continuing',
    sourcing_ceiling: 2500,
    sourced_used: 0,
    sourced_reserved: 0,
    room_remaining: 2500,
    batch_size: 250,
    next_batch: 250,
    may_source: true,
    source_blocked_reason: null,
  },
  icps: { attached: [V4], eligible: [OLD], unreadable: false },
}

const withProgramme = (patch: Record<string, unknown>): ProgrammeTruthish =>
  ({ ...HOUSE, programme: { ...HOUSE.programme!, ...patch } })

// ── A / G — THE NUMBER IS THE PROGRAMME'S, NOT THE LABEL'S ─────────────────────────────

describe('A/G · the quantity comes from programme truth', () => {
  it('A · current House state gives 250 — the chip reads "Source 250 leads", never "Source 20 leads"', () => {
    const action = programmeSourcingAction(HOUSE)
    expect(action).not.toBeNull()
    expect(action!.nextBatch).toBe(250)
    expect(sourcingChipLabel(action)).toBe('Source 250 leads')
    expect(sourcingChipLabel(action)).not.toBe('Source 20 leads')
  })

  it('G · when remaining room is below the batch size, the label SHRINKS to the truth', () => {
    // `next_batch` is the server's own `nextBatchSize(p)`, so the screen cannot overstate a run.
    const tight = withProgramme({ sourced_used: 2400, room_remaining: 100, next_batch: 100 })
    const action = programmeSourcingAction(tight)
    expect(action!.nextBatch).toBe(100)
    expect(sourcingChipLabel(action)).toBe('Source 100 leads')
  })

  it('G2 · the screen never recomputes the batch rule — it reads the server\'s number', () => {
    // A truth payload whose next_batch disagrees with a naive min(batch_size, room) must still
    // render the SERVER's number: that is the one the run will actually use.
    const odd = withProgramme({ room_remaining: 2500, batch_size: 250, next_batch: 137 })
    expect(programmeSourcingAction(odd)!.nextBatch).toBe(137)
  })

  it('F · no digit anywhere in the programme path is parsed out of text', () => {
    // `parseSourceIntent` still exists for the legacy typed path. What must be true is that the
    // programme branch never consults it.
    expect(CONV, 'the programme branch derives its quantity from a parsed sentence')
      .not.toMatch(/programmeSourcing[\s\S]{0,400}parseSourceIntent/)
  })
})

// ── H — THE OPERATOR CAN SEE WHAT THEY ARE ABOUT TO DO ─────────────────────────────────

describe('H · the confirmation names the quantity, the programme and the ICP', () => {
  it('reads exactly as the founder asked', () => {
    const action = programmeSourcingAction(HOUSE)!
    expect(sourcingConfirmQuestion(action))
      .toBe('Source 250 leads for this programme using Founder-Led B2B Agencies UK/US?')
  })

  it('the attached ICP name is carried, and it is v4 — never the active old audience', () => {
    const action = programmeSourcingAction(HOUSE)!
    expect(action.icpName).toBe('Founder-Led B2B Agencies UK/US')
    expect(action.icpName).not.toBe('African Retail-Tech')
  })

  it('an unnamed ICP still produces an honest sentence rather than "undefined"', () => {
    const anon = { ...HOUSE, icps: { attached: [{ id: 'i1', name: null, is_active: false }], eligible: [], unreadable: false } }
    const q = sourcingConfirmQuestion(programmeSourcingAction(anon)!)
    expect(q).toContain('Source 250 leads for this programme')
    expect(q).not.toContain('undefined')
    expect(q).not.toContain('null')
  })

  it('no provider is named to the operator — Apollo, PDL, Hunter and cost stay off this screen', () => {
    const action = programmeSourcingAction(HOUSE)!
    const shown = `${sourcingChipLabel(action)} ${sourcingConfirmQuestion(action)}`
    for (const word of ['Apollo', 'PDL', 'Hunter', 'pool', '$']) {
      expect(shown, `the confirmation exposes provider detail: ${word}`).not.toContain(word)
    }
  })
})

// ── B / C / D / E / I — WHERE IT GOES, AND WITH WHAT ──────────────────────────────────

describe('B/C/D/E/I · the request', () => {
  it('C · the endpoint is the programme-native route', () => {
    expect(PROGRAMME_SOURCE_ENDPOINT).toBe('/api/proxy/operator/programme/source')
  })

  it('B/I · the payload is EXACTLY { programme_id, confirm: true }', () => {
    const req = programmeSourceRequest(programmeSourcingAction(HOUSE)!)
    expect(req.url).toBe('/api/proxy/operator/programme/source')
    expect(req.body).toEqual({ programme_id: PROG_ID, confirm: true })
    // Exactly those two keys — a stray `count` would be a second opinion about the quantity,
    // and a stray `client_id` would reopen the client-scoped path this replaces.
    expect(Object.keys(req.body).sort()).toEqual(['confirm', 'programme_id'])
  })

  it('B · the programme id is explicit and is the programme\'s own', () => {
    expect(programmeSourcingAction(HOUSE)!.programmeId).toBe(PROG_ID)
  })

  it('D/E · the programme branch never touches the legacy client endpoints', () => {
    const at = CONV.indexOf('async function confirmProgrammeSource')
    expect(at, 'there is no programme confirm handler').toBeGreaterThan(-1)
    const body = CONV.slice(at, CONV.indexOf('\n  async function', at + 10) > -1 ? CONV.indexOf('\n  async function', at + 10) : at + 2000)
    expect(body, 'the programme confirm still posts to the client-scoped route').not.toContain('/operator/source')
    expect(body, 'the programme confirm still calls the PDL/pool preview').not.toContain('source-preview')
    // ⛓️ RETARGETED. This first demanded the literal `PROGRAMME_SOURCE_ENDPOINT` in the
    // handler. The implementation builds the whole request through `programmeSourceRequest`
    // instead — one shape, which also THROWS on a blocked action — so the endpoint reaches
    // the fetch as `req.url`. The endpoint itself is pinned by test C and the payload by
    // B/I; what belongs here is that the handler does not assemble its own request.
    expect(body, 'the programme confirm assembles its own request instead of using the helper')
      .toContain('programmeSourceRequest(')
    expect(body).toContain('fetch(req.url')
  })

  it('the component builds the request through the shared helper — no second payload shape', () => {
    expect(CONV).toContain('programmeSourceRequest(')
  })
})

// ── J / K — FAIL CLOSED ───────────────────────────────────────────────────────────────

describe('J/K · no programme, or no authority, means no programme-native request', () => {
  it('J · no programme at all → null, and the legacy path is left exactly as it was', () => {
    expect(programmeSourcingAction(null)).toBeNull()
    expect(programmeSourcingAction({ programme: null, icps: undefined })).toBeNull()
  })

  it('J2 · the legacy chip and its wiring survive for non-programme clients', () => {
    expect(CONV, 'the legacy sourcing shortcut was removed for ordinary clients').toContain("'Source 20 leads'")
    expect(CONV, 'the legacy preview was removed').toContain('source-preview')
    expect(CONV, 'the legacy sourcing POST was removed').toContain("'/api/proxy/operator/source'")
    // ⛓️ 14 Sep (R121, Build 3) — ~~`toContain('parseSourceIntent')`~~. The browser-side
    // language parser is DELETED: it required a sourcing verb AND a lead noun, so
    // "get me some more people for these guys" fell through to a keyword router that
    // answered "I'm not sure what you're asking me to do with that". Vida reads the
    // sentence now and proposes a count.
    //
    // 🛑 WHAT THIS TEST IS ACTUALLY FOR IS UNCHANGED AND STILL ASSERTED ABOVE: the
    // ordinary-client sourcing path — the chip, the preview, the POST — still exists and
    // still goes through the operator's confirm. Only WHO decides it was meant changed.
    expect(CONV, 'the proposal no longer reaches the ordinary-client preview')
      .toContain("proposal?.kind === 'propose_sourcing'")
  })

  it('K · no sourcing authority → blocked, with the server\'s own reason', () => {
    const draft = withProgramme({
      status: 'DRAFT', may_source: false,
      source_blocked_reason: 'This programme is DRAFT, which carries no sourcing authority yet.',
    })
    const action = programmeSourcingAction(draft)!
    expect(action.blocked).toBe('This programme is DRAFT, which carries no sourcing authority yet.')
  })

  it('K2 · no room left → blocked', () => {
    const spent = withProgramme({
      sourced_used: 2500, room_remaining: 0, next_batch: 0, may_source: false,
      source_blocked_reason: 'This programme has consumed its authorised sourcing volume.',
    })
    expect(programmeSourcingAction(spent)!.blocked).toMatch(/consumed its authorised sourcing volume/)
  })

  it('K3 · a next_batch of zero is blocked even if the server forgot to say so', () => {
    // Belt. A zero-size run is not a run, and "Source 0 leads" is not a button.
    const zero = withProgramme({ next_batch: 0 })
    expect(programmeSourcingAction(zero)!.blocked).not.toBeNull()
  })

  it('K4 · NO attached ICP → blocked, and it never falls back to the active one', () => {
    const none = { ...HOUSE, icps: { attached: [], eligible: [OLD], unreadable: false } }
    const action = programmeSourcingAction(none)!
    expect(action.blocked).toMatch(/no ICP attached|No ICP is attached/i)
    expect(action.icpName).toBeNull()
  })

  it('K5 · MORE THAN ONE attached ICP → blocked as ambiguous, never a silent pick', () => {
    const two = { ...HOUSE, icps: { attached: [V4, { id: 'i2', name: 'Second', is_active: false }], eligible: [], unreadable: false } }
    expect(programmeSourcingAction(two)!.blocked).toMatch(/more than one|ambiguous/i)
  })

  it('K6 · targeting that could not be READ is blocked — an empty list is not "none"', () => {
    const unread = { ...HOUSE, icps: { attached: [], eligible: [], unreadable: true } }
    expect(programmeSourcingAction(unread)!.blocked).toMatch(/could not be read/i)
  })

  it('K7 · a blocked action has no run in it — the chip says so and the label is not a quantity', () => {
    const spent = withProgramme({ next_batch: 0, may_source: false, source_blocked_reason: 'no room' })
    const action = programmeSourcingAction(spent)!
    expect(sourcingChipLabel(action)).not.toMatch(/Source \d+ leads/)
  })

  it('K8 · a blocked action still cannot be turned into a request', () => {
    const spent = withProgramme({ next_batch: 0, may_source: false, source_blocked_reason: 'no room' })
    expect(() => programmeSourceRequest(programmeSourcingAction(spent)!)).toThrow()
  })
})

// ── THE COMPONENT USES IT ─────────────────────────────────────────────────────────────

describe('the chip on screen is the programme one when there is a programme', () => {
  it('the label is derived, not a literal, on the programme branch', () => {
    expect(CONV).toContain('sourcingChipLabel(')
    expect(CONV).toContain('sourcingConfirmQuestion(')
  })

  it('the programme action reaches the conversation through the published surface', () => {
    expect(CONV, 'the conversation cannot see the programme on screen').toMatch(/programmeSourcing/)
  })

  it('and the surface type carries it, so the console must publish it deliberately', () => {
    expect(CONV).toMatch(/programmeSourcing:\s*ProgrammeSourcingAction \| null/)
  })
})
