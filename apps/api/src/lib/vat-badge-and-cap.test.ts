// C6 + #626 — TWO THINGS THE SCREENS WERE SUPPOSED TO SAY AND DID NOT.
//
// C6: #615 shipped `vatBadge` and Vida never rendered it, so "no tax ID on file" was a fact the
// operator could only find by opening a client one at a time — on the exact list where they
// decide who to chase. VAT evidence is the difference between charging 20% and eating it.
//
// #626: the System check reported *"no usable pdl_monthly_cap_usd setting exists"* and told the
// operator to set it — with NO way to do so. It needed SQL, and the Supabase dashboard is locked
// behind the same account flag that has kept GitHub Actions at zero runs since July. A screen
// that names a fix nobody can perform is worse than one that stays quiet.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { validateCapUsd, PDL_MONTHLY_CAP_KEY, PDL_CAP_MAX_USD } from './app-settings'
import { stripCommentsForEnvScan } from './env-inventory'

describe('#626 validateCapUsd — what counts as a usable ceiling', () => {
  it('accepts a sensible cap', () => {
    expect(validateCapUsd(100)).toEqual({ ok: true, value: 100 })
    expect(validateCapUsd('250')).toEqual({ ok: true, value: 250 })
    expect(validateCapUsd(' 99.5 ')).toEqual({ ok: true, value: 99.5 })
  })

  it('REFUSES $0 — it would read as "unset" to the probe while looking deliberately set', () => {
    // The probe tests `cap <= 0` and reports NOT-MEASURED. A founder who typed 0 to stop
    // sourcing would believe it was capped while the check said no cap existed.
    const v = validateCapUsd(0)
    expect(v.ok).toBe(false)
    if (!v.ok) expect(v.error).toContain('kill-switch')
  })

  it('refuses negatives and nonsense rather than coercing them', () => {
    for (const bad of [-1, 'abc', '', null, undefined, {}]) {
      expect(validateCapUsd(bad as never).ok, `${JSON.stringify(bad)} must be refused`).toBe(false)
    }
  })

  it('refuses an absurd figure — a typo must not read as a deliberate ceiling', () => {
    const v = validateCapUsd(PDL_CAP_MAX_USD + 1)
    expect(v.ok).toBe(false)
    if (!v.ok) expect(v.error).toContain('ceiling')
  })

  it('accepts exactly the maximum — the boundary is inclusive', () => {
    expect(validateCapUsd(PDL_CAP_MAX_USD).ok).toBe(true)
  })

  it('rounds to cents, so a stored cap is never $99.99999999', () => {
    expect(validateCapUsd(99.999)).toEqual({ ok: true, value: 100 })
  })
})

describe('#626 ONE key, two callers — the drift this exists to prevent', () => {
  const probe = stripCommentsForEnvScan(readFileSync(join(__dirname, 'system-probes.ts'), 'utf8'))
  const route = stripCommentsForEnvScan(readFileSync(join(__dirname, '../routes/operator.ts'), 'utf8'))

  it('the probe reads the CONSTANT, not a typed string', () => {
    // Two spellings of one key would let the founder set a cap the check cannot see. Nothing
    // errors; the screen just keeps saying "not set" against a value that exists.
    expect(probe).toContain('PDL_MONTHLY_CAP_KEY')
    expect(probe).not.toContain("eq('key', 'pdl_monthly_cap_usd')")
  })

  it('the route writes the same constant', () => {
    expect(route).toContain('PDL_MONTHLY_CAP_KEY')
  })

  it('the setter RE-READS after writing instead of echoing the input', () => {
    // An echo would report a cap saved that landed as something else — the #349 class.
    const at = route.indexOf("post('/settings/pdl-cap'")
    expect(at).toBeGreaterThan(-1)
    const body = route.slice(at, route.indexOf('operatorRouter.', at + 10))
    expect(body).toContain('upsert(')
    const upsertAt = body.indexOf('upsert(')
    expect(body.indexOf('.select(', upsertAt), 'must read back AFTER the write').toBeGreaterThan(upsertAt)
  })

  it('the write is CHECKED and audited — a silent failure would leave sourcing unbounded', () => {
    const at = route.indexOf("post('/settings/pdl-cap'")
    const body = route.slice(at, route.indexOf('operatorRouter.', at + 10))
    expect(body).toContain('was NOT saved')
    expect(body).toContain('writeOperatorAudit({')
  })

  it('it is a DATA write — no CREATE/ALTER anywhere near it', () => {
    const at = route.indexOf("post('/settings/pdl-cap'")
    const body = route.slice(at, route.indexOf('operatorRouter.', at + 10))
    expect(body).not.toMatch(/CREATE TABLE|ALTER TABLE/i)
  })
})

describe('#626 the Engine card exists and cannot lie', () => {
  const src = stripCommentsForEnvScan(readFileSync(join(__dirname, '../../../admin/src/app/vida/engine/page.tsx'), 'utf8'))

  it('reads the current cap and offers a save', () => {
    expect(src).toContain('/api/proxy/operator/settings/pdl-cap')
    expect(src).toContain('savePdlCap')
  })

  it('says "not set" rather than inventing a number when there is none', () => {
    expect(src).toContain('Not set —')
  })

  it('re-reads after saving instead of trusting the response echo', () => {
    const at = src.indexOf('async function savePdlCap')
    const body = src.slice(at, src.indexOf('async function runMigration', at))
    expect(body).toContain('await loadPdlCap()')
  })
})

describe('C6 the VAT badge finally reaches the clients list', () => {
  const route = stripCommentsForEnvScan(readFileSync(join(__dirname, '../routes/operator.ts'), 'utf8'))
    // ⚑ 4 Sep (UI-009) — RETARGETED, NOT RELAXED. The client list moved out of the console and
  // into the operator nav as a collapsible group; the rules it carries are unchanged, and these
  // read the file that now renders them.
  const vida = stripCommentsForEnvScan(readFileSync(join(__dirname, '../../../admin/src/components/vida/VidaClients.tsx'), 'utf8'))

  it('the worklist serves vat_number on the query it already makes', () => {
    expect(route).toContain('vat_number')
    const at = route.indexOf("operatorRouter.get('/worklist'")
    const body = route.slice(at, route.indexOf('operatorRouter.', at + 10))
    expect(body).toContain('vat_number')
  })

  // ⛓️ RETARGETED 9 Sep — VAT EVIDENCE MOVED FROM THE CLIENT ROW TO THE CLIENT'S TRUTH PANEL.
  //
  // The founder locked the client row at **name · stage · needs you** ("NO giant metrics in
  // list rows"), so the badge came off it. #615's lesson is the one that survives and is the
  // reason these cases exist: `vatBadge` once shipped with NOTHING rendering it, and "no tax
  // ID" became a fact you could only find by opening the client. It is now on the selected
  // client's Account card in `page.tsx`, and these assertions follow it there.
  const CONSOLE = readFileSync(join(__dirname, '..', '..', '..', 'admin', 'src', 'app', 'vida', 'page.tsx'), 'utf8')

  it('Vida renders the SHARED badge — no local VAT rule', () => {
    // A second opinion about VAT status is how the client-facing page and the operator board
    // start disagreeing about who owes 20%.
    expect(CONSOLE).toContain('vatBadge(')
    expect(CONSOLE).not.toContain("=== 'NOT_REGISTERED'")
  })

  it('🛑 "missing" is never silent — the tone that needs a person is the one that is drawn', () => {
    // ⛓️ THIS ASSERTED ALL THREE TONES ON A ROW BADGE. The Account card is an EXCEPTION
    // surface: it appears when there is something to say and draws nothing when the account is
    // clean, which is what keeps every previewed state looking as previewed. So the duty is
    // narrowed to the half that mattered — **amber must never be silent** — and asserted on the
    // shared function's own verdict rather than on a colour.
    const at = CONSOLE.indexOf('const accountCard = useMemo(')
    const block = CONSOLE.slice(at, CONSOLE.indexOf('}, [selectedClient', at))
    expect(block).toContain("vat.tone === 'amber'")
    expect(block).toContain('No VAT evidence on file')
    // And it is still the SHARED function deciding, never a local reading of the column.
    expect(block).not.toContain("vat_number ===")
  })

  it('does NOT special-case the house or demo account', () => {
    // The shared function decides. A name-based exception here is the #584/#593 mistake.
    // Asserted on the ARGUMENT: the only input is vat_number, which IS "no special-casing".
    expect(CONSOLE).toContain('vatBadge({ vat_number: selectedClient.vat_number ?? null })')
  })
})
