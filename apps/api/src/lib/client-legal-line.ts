// ═══════════════════════════════════════════════════════════════════════════════════════
// A CLIENT'S EMAILS END WITH THEIR OWN COMPANY NAME AND REGISTERED OFFICE.
//
// ⛓️ R189 ⑥ (founder-ruled 2 Oct): the legal line is the client's company name and registered
// office, given by the client and CHECKED BEFORE GO-LIVE. House is the exception: it carries its
// own line (HOUSE_POSTAL_FOOTER_LINE in @kind/shared — the address has one home).
//
// This file holds the line and the go-live check. Printing it on each email is part 3, once
// the email layout (#2571) that carries a footer line is merged.
// ═══════════════════════════════════════════════════════════════════════════════════════

/** "Acme Ltd · 10 High Street, London" — or null while either half is missing. */
export function clientLegalLine(companyName: string | null | undefined, registeredOffice: string | null | undefined): string | null {
  const name = companyName?.trim()
  const office = registeredOffice?.trim()
  return name && office ? `${name} · ${office}` : null
}

/** The sentence Make Live answers with when the line cannot be printed, or null when it can. */
export function legalLineProblem(companyName: string | null | undefined, registeredOffice: string | null | undefined): string | null {
  const missing = [
    companyName?.trim() ? null : 'company name',
    registeredOffice?.trim() ? null : 'registered office address',
  ].filter(Boolean)
  if (missing.length === 0) return null
  return `Not taken live: the client's ${missing.join(' and ')} ${missing.length > 1 ? 'are' : 'is'} not on file, and every email we send for them must end with their company name and registered office (R189 ⑥). Ask them to add it in Milla → Settings → Business Profile, then press Make live again.`
}

/**
 * The go-live check for one programme. House is exempt (it carries its own line). An unreadable
 * client refuses — Make Live is never pressed on a guess.
 */
export async function goLiveLegalLineProblem(programmeId: string): Promise<string | null> {
  const { db } = await import('@kind/db')
  const { data: p, error: pErr } = await db.from('programmes').select('client_id').eq('id', programmeId).maybeSingle()
  if (pErr) return `Not taken live: the programme could not be read to check the client's legal line (${pErr.message}).`
  const clientId = (p as { client_id?: string } | null)?.client_id
  if (!clientId) return null   // no such programme — goLiveProgramme gives its own answer
  const { isHouseClient } = await import('./house-client')
  if (await isHouseClient(clientId)) return null
  const { data: c, error } = await db.from('clients').select('company_name, registered_office').eq('id', clientId).maybeSingle()
  if (error) {
    return `Not taken live: the client's legal line could not be checked (${error.message}). If this says the column does not exist, migration 20261002_client_registered_office has not been applied yet.`
  }
  const row = c as { company_name?: string | null; registered_office?: string | null } | null
  return legalLineProblem(row?.company_name, row?.registered_office)
}
