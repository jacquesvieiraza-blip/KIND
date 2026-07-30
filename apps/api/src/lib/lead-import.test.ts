import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import {
  MAX_IMPORT_ROWS, parseCsv, parseRow, decideRows, toLeadRow, candidateEmails, normaliseHeader,
} from './lead-import'

// #549 — THE APOLLO CSV, AND THE THREE WAYS AN IMPORT LIES.
//
// Client Zero's prospects arrive as a spreadsheet. Getting them into the product is only half
// the job; the half that matters is that an imported lead is treated EXACTLY like a sourced
// one. Three failure modes this file exists to pin:
//
//   ① A NAIVE PARSER SHIFTS COLUMNS. `split(',')` on `"Acme, Inc."` moves every field after it
//      one place left, so job titles land in the country column and nobody notices until a send
//      goes out addressed to "Head of Ops, United Kingdom".
//   ② A SUPPRESSED PERSON GETS IN. The sourcing path drops opt-outs and the do-not-contact
//      floor. An import path that does not is a second door into the same tables — and the
//      person who opted out gets mailed anyway.
//   ③ A PARTIAL IMPORT REPORTS SUCCESS. 1,000 uploaded, "imported" shown, 300 silently
//      skipped. That is #349 in file form: the operation half-happened and the report said it
//      happened.
//
// A do-not-contact domain is injected via SUPPRESSED_DOMAINS rather than using the hard-coded
// floor, so these assertions never depend on the founder's employer being named in a test.
const BLOCKED_DOMAIN = 'donotcontact-example.test'
const ORIGINAL_SUPPRESSED = process.env.SUPPRESSED_DOMAINS

beforeEach(() => { process.env.SUPPRESSED_DOMAINS = BLOCKED_DOMAIN })
afterAll(() => {
  if (ORIGINAL_SUPPRESSED === undefined) delete process.env.SUPPRESSED_DOMAINS
  else process.env.SUPPRESSED_DOMAINS = ORIGINAL_SUPPRESSED
})

const rowsOf = (csv: string) => parseCsv(csv).rows
const decide = (csv: string, owned: string[] = [], blocked: string[] = []) =>
  decideRows({ rows: rowsOf(csv), owned: new Set(owned), blocked: new Set(blocked) })

describe('the parser survives a real export, not a tidy one', () => {
  it('a comma inside a quoted company name does NOT shift the columns', () => {
    // The assertion the hand-rolled parser exists for. With split(','), `country` here would
    // read "Inc." and the whole row would be wrong in a way that still looks like a lead.
    const { rows } = parseCsv(
      'first name,last name,email,company,country\n' +
      'Ada,Lovelace,ada@acme.test,"Acme, Inc.",United Kingdom\n',
    )
    expect(rows).toHaveLength(1)
    expect(rows[0]['company']).toBe('Acme, Inc.')
    expect(rows[0]['country']).toBe('United Kingdom')
  })

  it('escaped quotes and newlines inside a quoted field stay inside it', () => {
    const { rows } = parseCsv(
      'email,title\n' +
      'ada@acme.test,"Head of ""Special"" Projects\nand Ops"\n',
    )
    expect(rows).toHaveLength(1)
    expect(rows[0]['title']).toBe('Head of "Special" Projects\nand Ops')
  })

  it('CRLF line endings and a UTF-8 BOM do not become part of the first header', () => {
    // Excel writes both. A BOM glued to `first name` means the name column is never found and
    // every lead imports nameless — a silent, whole-file degradation.
    const { headers, rows } = parseCsv('﻿first name,email\r\nAda,ada@acme.test\r\n')
    expect(headers[0]).toBe('first name')
    expect(rows[0]['first name']).toBe('Ada')
  })

  it('a short row reads as empty cells rather than failing the whole file', () => {
    const { rows } = parseCsv('first name,email,country\nAda,ada@acme.test\n')
    expect(rows[0]['country']).toBe('')
  })

  it('trailing blank lines are not rows', () => {
    expect(rowsOf('email\nada@acme.test\n\n\n')).toHaveLength(1)
  })

  it('headers are matched however Apollo spelled them', () => {
    // `First Name`, `first_name` and `FIRST NAME` are one column, and each field is looked up
    // across its aliases — guessing one header name costs the entire import.
    expect(normaliseHeader('  First_Name ')).toBe('first name')
    const a = parseRow(parseCsv('First Name,Email Address\nAda,ada@acme.test\n').rows[0])
    const b = parseRow(parseCsv('first_name,work email\nAda,ada@acme.test\n').rows[0])
    expect(a.ok && a.lead.first_name).toBe('Ada')
    expect(b.ok && b.lead.first_name).toBe('Ada')
  })
})

describe('a row that can never be contacted is refused, and says why', () => {
  it('no email column at all', () => {
    const r = parseRow({ 'first name': 'Ada' })
    expect(r.ok).toBe(false)
    expect(!r.ok && r.why).toContain('no email')
  })

  it('a cell that is not an address', () => {
    const r = parseRow({ email: 'not-an-address' })
    expect(r.ok).toBe(false)
    expect(!r.ok && r.why).toContain('not a usable email')
  })

  it('emails are normalised the same way the reveal path normalises them', () => {
    // Both sides of every duplicate and blocklist comparison must be normalised by the SAME
    // function, or `Ada@Acme.test` imports alongside `ada@acme.test` as two people.
    const r = parseRow({ email: '  Ada@ACME.test  ' })
    expect(r.ok && r.lead.email).toBe('ada@acme.test')
  })

  it('a missing name is allowed through — it is the operator\'s call, not ours', () => {
    // Dropping a nameless row would silently discard a real prospect. It lands blank on the
    // desk instead, where somebody can see it and decide.
    const r = parseRow({ email: 'ada@acme.test' })
    expect(r.ok).toBe(true)
    expect(r.ok && r.lead.first_name).toBe('')
  })
})

describe('every gate the sourcing path applies, the import applies too', () => {
  const CSV = (...emails: string[]) => 'first name,email\n' + emails.map(e => `X,${e}`).join('\n') + '\n'

  it('an opted-out address is SKIPPED and REPORTED, never imported', () => {
    // ② above. The blocklist is the sourcing path's second gate; an import that ignored it
    // would mail somebody who told us to stop.
    const { verdicts, tally } = decide(CSV('ada@acme.test', 'gone@acme.test'), [], ['gone@acme.test'])
    expect(tally).toEqual({ imported: 1, duplicate: 0, suppressed: 1, invalid: 0 })
    const s = verdicts.find(v => v.outcome === 'suppressed')
    expect(s && 'why' in s && s.why).toContain('blocklist')
  })

  it('the do-not-contact floor is applied to imported rows as well', () => {
    const { tally } = decide(CSV('ada@acme.test', `someone@${BLOCKED_DOMAIN}`))
    expect(tally.suppressed).toBe(1)
    expect(tally.imported).toBe(1)
  })

  it('a contact the client already holds is a duplicate, not a second lead', () => {
    const { tally } = decide(CSV('ada@acme.test', 'held@acme.test'), ['held@acme.test'])
    expect(tally).toEqual({ imported: 1, duplicate: 1, suppressed: 0, invalid: 0 })
  })

  it('the same person twice IN ONE FILE imports once', () => {
    // Within-file dedupe is separate from the owned check: neither address exists in the
    // database yet, so `owned` cannot catch this one.
    const { tally, verdicts } = decide(CSV('ada@acme.test', 'ADA@acme.test'))
    expect(tally.imported).toBe(1)
    expect(tally.duplicate).toBe(1)
    const d = verdicts.find(v => v.outcome === 'duplicate')
    expect(d && 'why' in d && d.why).toContain('more than once')
  })

  it('someone both already-held AND opted-out reports as SUPPRESSED, not duplicate', () => {
    // Order is deliberate. "Duplicate" reads as harmless housekeeping; "suppressed" is the
    // fact an operator needs to see, so suppression is checked first.
    const { verdicts } = decide(CSV('gone@acme.test'), ['gone@acme.test'], ['gone@acme.test'])
    expect(verdicts[0].outcome).toBe('suppressed')
  })
})

describe('every row gets an outcome — the count and the reasons agree', () => {
  it('the four tallies add up to the number of rows read', () => {
    // ③ above. If these ever disagree, some rows vanished between reading and reporting —
    // which is exactly the shape of a silent partial import.
    const { verdicts, tally } = decide(
      'first name,email\n' +
      'A,ada@acme.test\n' +
      'B,gone@acme.test\n' +
      'C,held@acme.test\n' +
      'D,nonsense\n' +
      'E,ada@acme.test\n',
      ['held@acme.test'], ['gone@acme.test'],
    )
    expect(verdicts).toHaveLength(5)
    expect(tally.imported + tally.duplicate + tally.suppressed + tally.invalid).toBe(5)
    expect(tally).toEqual({ imported: 1, duplicate: 2, suppressed: 1, invalid: 1 })
  })

  it('no skipped row is reported without a reason', () => {
    const { verdicts } = decide(
      'email\ngone@acme.test\nheld@acme.test\nnonsense\n',
      ['held@acme.test'], ['gone@acme.test'],
    )
    for (const v of verdicts) {
      expect(v.outcome).not.toBe('imported')
      expect('why' in v && v.why.length).toBeGreaterThan(10)
    }
  })

  it('candidateEmails returns exactly the addresses the decision will judge', () => {
    // The route asks the blocklist about THIS list. If it were computed by a separate rule,
    // the blocklist would be queried for a set that is not the set being imported — and a
    // missed lookup fails OPEN, importing the very people it was meant to catch.
    expect(candidateEmails(rowsOf('email\nAda@Acme.test\nada@acme.test\nnonsense\n')))
      .toEqual(['ada@acme.test'])
  })
})

describe('an imported lead is indistinguishable from a sourced one', () => {
  const lead = { first_name: 'Ada', last_name: 'Lovelace', email: 'ada@acme.test', job_title: 'CTO', company: 'Acme', linkedin_url: null, country: 'UK' }

  it('lands pending and undelivered, exactly as pool-serve inserts', () => {
    // This is what makes it appear on the desk and flow approve → enrol → send. Setting
    // `delivered_at` here would put a raw import in front of the client with no operator
    // ever having looked at it.
    const row = toLeadRow(lead, 'client-1')
    expect(row.status).toBe('pending')
    expect(row.delivered_at).toBeNull()
    expect(row.client_id).toBe('client-1')
  })

  it('belongs to no ICP, and says where it came from', () => {
    const row = toLeadRow(lead, 'client-1')
    expect(row.icp_id).toBeNull()
    expect(row.source).toBe('csv_import')
  })

  it('never claims recorded consent', () => {
    // `apollo_consented` is a legacy column name that gates nothing on its own, but a `true`
    // on an imported row would read to the next person as "consent was recorded". It was not.
    expect(toLeadRow(lead, 'client-1').apollo_consented).toBe(false)
  })
})

describe('the cap is a number, not a suggestion', () => {
  it('MAX_IMPORT_ROWS is 1,000 and is exported so the screen can state it', () => {
    // A cap the operator cannot see is a trap: they split a 5,000-row file only after the
    // upload is refused. The UI reads this same constant.
    expect(MAX_IMPORT_ROWS).toBe(1000)
  })

  it('the screen states the cap, the gates and the no-charge fact BEFORE a file is chosen', () => {
    // Source-scanned with COMMENT LINES STRIPPED. This trap has caught me four times: the
    // component's own comments explain all three facts, so an unstripped scan would pass on
    // the prose alone while the rendered panel said none of it.
    const ui = readFileSync(join(__dirname, '../../../admin/src/components/ImportLeads.tsx'), 'utf8')
    const rendered = ui.split('\n').filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n')

    expect(rendered).toContain(`const MAX_IMPORT_ROWS = ${MAX_IMPORT_ROWS}`)
    expect(rendered).toContain('rows per file')
    expect(rendered).toContain('same gates a sourced lead passes')
    expect(rendered).toContain('Nothing is charged on import')
    // The dry run is offered, and it says plainly that it writes nothing.
    expect(rendered).toContain('writes nothing')
  })
})
