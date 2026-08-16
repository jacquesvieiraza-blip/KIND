import { PACK_PRICE_USD } from '@kind/shared'
import { RATES } from './comp-engine'

// ── THE PARTNER DOCUMENT PACK (#202) — ONE HOME ─────────────────────────────────────────
//
// The founder asked for the contractual documents to live in Vida under Partners (16 Aug),
// because the seat's document vault was five labels with nothing behind them: `VaultItem`
// rendered a hover state and no link. A menu that names a contract nobody can open is worse
// than no menu — it reads as proof the paperwork exists.
//
// Why the documents are CODE rather than files in docs/: they have to be served to two apps
// (Vida for the operator, the portal for the seat holder) in production, where the repo's
// docs/ folder does not ship. Keeping a markdown copy as well would put the same sentences
// in two places, and the moment they disagree nobody can tell which one a person signed.
// So this module is the single home, and the old draft file points here.
//
// ⚠️ MONEY IS INTERPOLATED, NEVER TYPED (method rule 7). Every percentage and price below
// comes from the same constants the product bills from — RATES in comp-engine and
// PACK_PRICE_USD in @kind/shared. A document that says 8% while the engine pays 5% is not a
// typo, it is a dispute, and a person could sign it.
//
// ⚠️ These are DRAFTS written by Claude Code on the founder's explicit instruction — "Opus
// drafts. I have no counsel" (15 Aug). Every document carries that disclaimer in its own
// body, and a test asserts it is still there, because the one thing that must never be
// quietly edited out is the sentence saying a lawyer has not read this.

export type PartnerDocumentKind = 'agreement' | 'policy' | 'plan' | 'statement'

export type PartnerDocument = {
  id: string
  title: string
  kind: PartnerDocumentKind
  version: string
  updated: string
  /** Does a human have to sign this before the seat starts selling? */
  signatureRequired: boolean
  /** One line the operator reads in Vida without opening the document. */
  summary: string
  /** Markdown. Empty for a live view (see `live`). */
  body: string
  /** A statement is DERIVED from commission rows — there is no file to store. */
  live?: boolean
}

const DISCLAIMER = `> ### ⚠️ Read this first
>
> **This document was drafted by Claude Code, not by a lawyer**, on the founder's explicit
> instruction — *"Opus drafts. I have no counsel"* (15 Aug 2026). **It is not legal advice.**
> It is a plain-language starting point written so that a solicitor corrects a draft rather
> than bills for a blank page. **Have it reviewed before either party signs.**`

const pct = (n: number) => `${Math.round(n * 100)}%`
const usd = (n: number) => `$${n.toFixed(2)}`

/**
 * The pack for one seat. The retain rate is the SEAT'S rate — a Client Partner earns more
 * because she also runs customer success (R40) — so her comp plan states her number, not a
 * generic one.
 */
export function partnerDocuments(opts: {
  seatType?: string | null
  retainRate?: number | null
  name?: string | null
} = {}): PartnerDocument[] {
  const isClientPartner = opts.seatType === 'client_partner'
  const land = RATES.PARTNER_ACQUISITION
  const retain = opts.retainRate && opts.retainRate > 0
    ? opts.retainRate
    : (isClientPartner ? RATES.CLIENT_PARTNER_RETENTION : RATES.PARTNER_RETENTION)
  const pack = PACK_PRICE_USD
  const who = opts.name?.trim() || '[FULL NAME]'
  const role = isClientPartner ? 'Client Partner' : 'Partner'

  const landOnPack = pack * land

  return [
    {
      id: 'commission-agreement',
      title: 'Commission agreement',
      kind: 'agreement',
      version: '1.0',
      updated: '2026-08-15',
      signatureRequired: true,
      summary: `Commission-only contractor agreement — ${pct(land)} land, ${pct(retain)} retain, own network only.`,
      body: commissionAgreement({ who, role, land, retain, pack }),
    },
    {
      id: 'nda',
      title: 'Non-disclosure agreement',
      kind: 'agreement',
      version: '1.0',
      updated: '2026-08-16',
      signatureRequired: true,
      summary: 'What must stay confidential, for how long, and what is explicitly hers to keep.',
      body: nda({ who, role }),
    },
    {
      id: 'ip-assignment',
      title: 'Intellectual property agreement',
      kind: 'agreement',
      version: '1.0',
      updated: '2026-08-16',
      signatureRequired: true,
      summary: 'Work created for the Company belongs to the Company; her own network and prior work stay hers.',
      body: ipAssignment({ who, role }),
    },
    {
      id: 'comp-plan',
      title: `Compensation plan — ${pct(land)} land · ${pct(retain)} retain`,
      kind: 'plan',
      version: '1.0',
      updated: '2026-08-16',
      signatureRequired: false,
      summary: `How the money is calculated, with worked examples. ${usd(landOnPack)} per client who starts.`,
      body: compPlan({ role, land, retain, pack, landOnPack }),
    },
    {
      id: 'payout-statements',
      title: 'Payout statements',
      kind: 'statement',
      version: 'live',
      updated: '',
      signatureRequired: false,
      summary: 'Derived from commission rows each month — not a stored file.',
      body: '',
      live: true,
    },
  ]
}

// ── the documents ───────────────────────────────────────────────────────────────────────

function commissionAgreement(o: { who: string; role: string; land: number; retain: number; pack: number }): string {
  return `# ${o.role} — commission agreement (DRAFT)

${DISCLAIMER}
>
> ⚠️ **The single biggest risk this draft tries to manage:** in South Africa, someone paid only
> in commission who works set hours, under supervision, using the company's tools, can be found
> to be an **employee** regardless of what a contract calls them — which brings tax, UIF and
> unfair-dismissal exposure. The clauses below are written to keep the relationship a genuine
> contractor one, but only a South African employment lawyer can confirm it.

---

**This agreement is between**

**KIND Technologies Ltd**, a company registered in England and Wales, trading as Milla&Vida
("the Company")

**and**

**${o.who}**, of [ADDRESS], South Africa ("the ${o.role}")

Dated: [DATE]

---

## 1 · What the ${o.role} does

The ${o.role} will introduce prospective clients to the Company from their **own network and
relationships**, support those clients through their first sessions with the product, and remain
their named point of contact.

The ${o.role} **does not** use the Company's lead-sourcing systems to find prospects, and **does
not** run product demonstrations; the Company's founder does.

## 2 · An independent contractor, not an employee

2.1 The ${o.role} is an independent contractor. Nothing in this agreement creates employment,
partnership, agency or a joint venture.

2.2 The ${o.role} **decides their own working hours, methods and location**, provides their own
equipment, and is free to work for others, including in the same industry, provided clause 6
(confidentiality) is observed.

2.3 The ${o.role} is responsible for **their own taxes and any statutory contributions** in
South Africa. The Company deducts nothing and withholds nothing.

2.4 The ${o.role} has **no authority to bind the Company** — not to a price, a discount, a
delivery promise, a contract term, or anything else. Pricing is fixed and published.

## 3 · Commission — the whole of the payment

3.1 The ${o.role} is paid **commission only**. There is no salary, retainer, base, guarantee or
expense budget.

3.2 Commission is earned as follows:

| Event | Commission |
|---|---|
| A client introduced by the ${o.role} pays for a starting pack | **${pct(o.land)}** of that pack |
| Any subsequent amount that client spends with the Company | **${pct(o.retain)}** of that amount, monthly, while the ${o.role} holds the relationship |

3.3 **Earned when collected.** Commission is earned only on money the Company has actually
received. Amounts invoiced, promised or pending are not commissionable until collected.

3.4 **No clawback.** Once commission has been earned under 3.3 it is not reversed, save where the
underlying payment is itself reversed by the payer or their bank (a chargeback or refund), in
which case the corresponding commission is cancelled.

3.5 **Attribution.** A client is the ${o.role}'s where they were introduced through the referral
mechanism the Company provides. Where attribution is unclear the parties will agree it in writing
before the client's first payment.

3.6 **Payment.** Commission accrued in a calendar month is paid in the following month, against
an invoice from the ${o.role}, by Wise transfer in South African rand at the prevailing rate on
the day of payment. The Company will provide a statement showing how each amount was calculated.

3.7 **No cap.** There is no ceiling on commission.

## 4 · What the Company provides

The product itself, product demonstrations by the founder, pricing and materials, a portal
showing the ${o.role}'s clients and earnings, and reasonable support to answer questions about
how the product works.

## 5 · Client data and privacy

5.1 The ${o.role} may see the names of their own clients and how those clients are progressing.
The ${o.role} will **not** be given the spending figures of any client.

5.2 The ${o.role} will handle any personal information they encounter in line with the Protection
of Personal Information Act (POPIA) and the Company's own obligations under UK and EU data
protection law: used only to do this job, never copied to personal systems, never shared, and
deleted or returned when this agreement ends.

5.3 The ${o.role} will not export, download or retain any client list or contact data.

## 6 · Confidentiality

Everything the ${o.role} learns about the Company's product, pricing model, clients, plans and
methods is confidential, both during this agreement and after it ends, except information that is
already public through no fault of theirs. **The separate non-disclosure agreement sets this out
in full and takes precedence where the two differ.**

## 7 · Intellectual property

Any material the ${o.role} creates in the course of this work — messaging, collateral, written
material, recordings — belongs to the Company, and the ${o.role} assigns those rights to the
Company. The ${o.role} keeps their own pre-existing materials and their own network, which are
theirs. **The separate intellectual property agreement sets this out in full and takes precedence
where the two differ.**

## 8 · Ending the agreement

8.1 Either party may end this agreement by giving **30 days' written notice**, for any reason or
none.

8.2 Either party may end it immediately for a material breach that is not put right within 14
days of being raised in writing.

8.3 **Commission already earned under 3.3 survives termination** and is paid on the normal monthly
cycle.

8.4 After termination, no further retention commission accrues on clients from the date the
relationship ends, unless the parties agree otherwise in writing.

## 9 · No exclusivity, no restraint

The Company does not restrict who else the ${o.role} works for, before or after this agreement.
[⚠️ REVIEW: if any restraint of trade is ever wanted, it must be drafted separately and narrowly
— an over-broad restraint is unenforceable and can taint the contractor status established in
clause 2.]

## 10 · General

10.1 This agreement is the whole agreement between the parties on this subject and replaces
anything discussed beforehand.

10.2 Any change must be in writing and signed by both.

10.3 **Governing law:** the laws of England and Wales, with the courts of England and Wales having
jurisdiction. [⚠️ REVIEW: the ${o.role} performs this work in South Africa. South African law may
apply to aspects of the relationship regardless of this clause, and a South African forum may be
more practical for both sides. This is the clause most likely to need changing.]

---

**Signed for KIND Technologies Ltd**

Name: [    ]  ·  Signature: [    ]  ·  Date: [    ]

**Signed by the ${o.role}**

Name: [    ]  ·  Signature: [    ]  ·  Date: [    ]

---

### Open points for the reviewing lawyer

1. **Contractor vs employee status under South African law** — clause 2. The commission-only
   structure is the sensitive part.
2. **Governing law and forum** — clause 10.3, given the work is performed in South Africa.
3. **Whether any restraint is wanted at all** — clause 9 currently imposes none, deliberately.
4. **Chargeback treatment** — clause 3.4 is the only circumstance in which earned commission
   reverses; confirm that is the intent and that it is expressed enforceably.
5. **POPIA sufficiency** — clause 5, particularly whether a separate data-processing schedule is
   needed rather than a clause.
`
}

function nda(o: { who: string; role: string }): string {
  return `# Non-disclosure agreement (DRAFT)

${DISCLAIMER}

---

**Between** **KIND Technologies Ltd**, a company registered in England and Wales, trading as
Milla&Vida ("the Company")

**and** **${o.who}** ("the Recipient"), engaged as a ${o.role}.

Dated: [DATE]

---

## 1 · Why this exists

To do this work the Recipient will be told things the Company does not publish: how the product
actually works, what clients pay, who the clients are, and what the Company plans next. This
agreement says what may be done with that.

## 2 · What is confidential

Anything the Recipient learns from the Company that is not public, including:

- **Clients and prospects** — who they are, what they are trying to do, anything they said in
  confidence, and any personal information about the people who work there.
- **Money** — what any individual client pays or has paid, margins, costs, and any figure shown
  in an internal console.
- **The product** — how the system sources, scores, sequences and sends; the operator tooling;
  screens and features that are not on the public website.
- **Plans** — roadmap, pricing under consideration, hiring, funding, partners under discussion.
- **Anything marked confidential**, and anything a reasonable person would understand to be.

## 3 · What is NOT confidential

3.1 Information that is already public, or becomes public, other than because the Recipient made
it so.

3.2 Information the Recipient already had before this engagement and can show they had.

3.3 Information the Recipient receives from someone else who is free to share it.

3.4 **The Recipient's own network.** The people the Recipient already knew, and their contact
details, remain the Recipient's own. Working here does not make the Recipient's own contacts the
Company's confidential information. *(This mirrors the intellectual property agreement, which
says the same in the other direction.)*

## 4 · What the Recipient agrees to do

4.1 Use confidential information **only** to carry out the engagement — never for the Recipient's
own benefit, and never for anyone else's.

4.2 Not disclose it to anyone, including family, other clients, or another employer, without the
Company's written permission.

4.3 Keep it on the Company's systems. **Do not** copy client data, lead lists, exports or
screenshots to personal devices, personal cloud storage, personal email or messaging apps.

4.4 Tell the Company promptly if confidential information is lost, exposed, or asked for by
somebody who should not have it.

4.5 Take the same care with it that a sensible person takes with their own confidential material,
and no less.

## 5 · If the law requires disclosure

If the Recipient is legally required to disclose confidential information — by a court, a
regulator, or a data protection authority — they may do so, but will tell the Company first where
it is lawful to do so, so the Company can respond.

## 6 · Personal information

Where confidential information includes personal data, the Recipient will also comply with the
Protection of Personal Information Act (POPIA) and with the Company's obligations under UK and EU
data protection law. This is a legal duty in its own right and is not softened by anything in
this agreement.

## 7 · When the engagement ends

7.1 The Recipient will return or delete all confidential information in their possession, and
confirm in writing that they have done so, within **14 days** of being asked.

7.2 The Recipient may keep one copy of documents they are legally required to retain — such as
their own invoices and tax records.

## 8 · How long this lasts

8.1 The duties in clause 4 continue for **three years** after the engagement ends.

8.2 For **trade secrets and personal data** the duties continue for as long as the information
remains a trade secret or the data protection law applies — there is no expiry.

[⚠️ REVIEW: three years is a common and defensible period for commercial information. A reviewing
lawyer should confirm it is right for this business and enforceable in South Africa, where the
Recipient works.]

## 9 · What happens if this is broken

The Company may ask a court to stop a breach or a threatened breach, in addition to any other
remedy. Damages alone may not be an adequate remedy for disclosure, because information once
disclosed cannot be recalled.

## 10 · General

10.1 This agreement does not give the Recipient any right or licence in the Company's
intellectual property. That is dealt with separately.

10.2 Any change must be in writing and signed by both.

10.3 **Governing law:** the laws of England and Wales. [⚠️ REVIEW: same point as the commission
agreement — the Recipient performs the work in South Africa, and an SA court may be the practical
forum.]

---

**Signed for KIND Technologies Ltd**

Name: [    ]  ·  Signature: [    ]  ·  Date: [    ]

**Signed by the Recipient**

Name: [    ]  ·  Signature: [    ]  ·  Date: [    ]
`
}

function ipAssignment(o: { who: string; role: string }): string {
  return `# Intellectual property agreement (DRAFT)

${DISCLAIMER}
>
> ⚠️ **Why this document exists at all.** The Company's legal pack records that *"all future
> contractors must sign an IP assignment clause before access"*, and that code and content
> produced under the founder's direction is the Company's. Until now that requirement lived only
> as a line in a risk table — there was no document to sign. This is that document.

---

**Between** **KIND Technologies Ltd**, a company registered in England and Wales, trading as
Milla&Vida ("the Company")

**and** **${o.who}** ("the Contributor"), engaged as a ${o.role}.

Dated: [DATE]

---

## 1 · What this covers

Anything the Contributor creates, writes, records, designs or contributes **in the course of the
engagement, or using the Company's confidential information or systems** ("Work Product"). It
includes:

- outreach copy, sequences, scripts, messaging and positioning written for the Company
- decks, one-pagers, proposals, case studies and collateral
- recordings, screenshots and demonstration material featuring the product
- feedback, suggestions and ideas about the product itself
- anything produced with or by the Company's tools while doing this work

## 2 · Who owns it

2.1 **All Work Product belongs to the Company** from the moment it is created.

2.2 To the extent any right does not vest automatically, the Contributor **assigns it to the
Company now**, worldwide, for the full duration of the right, including copyright, database
rights, design rights and rights in confidential information.

2.3 The assignment covers rights that come into existence in the future in respect of that same
Work Product.

2.4 The Contributor **waives moral rights** in the Work Product to the extent the law allows —
so the Company can edit, adapt, extend and publish it without further permission. [⚠️ REVIEW:
moral rights and their waiver work differently in England and in South Africa; confirm the wording
carries in both.]

## 3 · What stays the Contributor's

This is deliberately not a grab of everything the Contributor has ever done.

3.1 **Pre-existing material.** Anything the Contributor made before this engagement, or makes
outside it and without the Company's information or systems, stays theirs.

3.2 **Their own network.** The Contributor's relationships and contacts are their own and remain
so after this ends. *(The non-disclosure agreement says the same.)*

3.3 **General skill and know-how.** What the Contributor learns about selling, about the market,
and about doing this job well is theirs to carry onward. Knowledge is not assignable; specific
confidential information is a different thing and stays confidential.

3.4 If the Contributor includes pre-existing material of theirs in Work Product, they keep owning
it but grant the Company a **perpetual, worldwide, royalty-free licence** to use it as part of
that Work Product.

## 4 · Third-party material

4.1 The Contributor will not put anything into Work Product that they do not have the right to
use — no copied copy, no stock imagery without a licence, no material from a previous employer or
another client.

4.2 If the Contributor uses AI tools to produce anything delivered to the Company, they remain
responsible for clause 4.1 being true of the result.

## 5 · The Company's own IP

5.1 Nothing in this agreement gives the Contributor any right in the Company's platform, code,
data, models, brand, or the agent names and characters.

5.2 The Contributor may use the Company's brand and materials **only** as needed to do the
engagement, in the form the Company supplies, and must stop when the engagement ends.

## 6 · Helping to make it stick

The Contributor will, at the Company's reasonable request and cost, sign anything and do anything
reasonably needed to register, perfect or defend the rights assigned here — including after the
engagement ends.

## 7 · General

7.1 This agreement runs alongside the commission agreement and the non-disclosure agreement.
Where any of them conflict on intellectual property, **this one governs**.

7.2 Any change must be in writing and signed by both.

7.3 **Governing law:** the laws of England and Wales. [⚠️ REVIEW: as with the other documents —
the work is performed in South Africa.]

---

**Signed for KIND Technologies Ltd**

Name: [    ]  ·  Signature: [    ]  ·  Date: [    ]

**Signed by the Contributor**

Name: [    ]  ·  Signature: [    ]  ·  Date: [    ]

---

### Open points for the reviewing lawyer

1. **Moral rights waiver** (2.4) — enforceability in both jurisdictions.
2. **Present assignment of future rights** (2.3) — whether the wording is effective under English
   law without a further confirmatory assignment.
3. **AI-produced material** (4.2) — whether the Company wants a stronger warranty here, given its
   own platform is largely AI-produced under human direction.
4. Whether a separate **confirmatory assignment** should be signed at the end of the engagement.
`
}

function compPlan(o: { role: string; land: number; retain: number; pack: number; landOnPack: number }): string {
  const exampleSpend = 400
  const exampleClients = 10
  const monthlyRetain = exampleSpend * o.retain
  return `# ${o.role} — compensation plan

${DISCLAIMER}
>
> This plan describes how commission is calculated. **The commission agreement is the contract**;
> if the two ever disagree, the agreement governs and this plan is wrong and must be fixed.

---

## The whole plan in two lines

- **${pct(o.land)} of the starting pack** when a client you introduced pays — ${usd(o.landOnPack)} on today's ${usd(o.pack)} pack.
- **${pct(o.retain)} of everything that client spends afterwards**, every month, for as long as you hold them.

There is **no salary, no retainer and no cap**. You are paid on money the Company has actually
collected.

## What "earned" means

Commission is earned when the Company **receives** the money — not when a client signs, promises,
or is invoiced. Once earned it is not taken back, unless the client's own payment is reversed by
their bank (a chargeback or a refund), in which case that commission is cancelled with it.

## Worked examples

**One client who starts and stays**

| When | What happens | You earn |
|---|---|---|
| Month 1 | They buy the ${usd(o.pack)} starting pack | **${usd(o.landOnPack)}** |
| Month 1 | They spend ${usd(exampleSpend)} that month | **${usd(monthlyRetain)}** |
| Month 2 onward | They spend ${usd(exampleSpend)} a month | **${usd(monthlyRetain)} every month** |

**A book of ${exampleClients} clients, each spending ${usd(exampleSpend)} a month**

You earn **${usd(exampleClients * monthlyRetain)} a month** in retention, before any new client
you land that month. That is the whole point of the model: the ${pct(o.land)} is the reward for
landing, the ${pct(o.retain)} is the reward for keeping.

*(The ${usd(exampleSpend)} figure is an assumption used to show the shape of the maths. It is not
a reading of any real client's account, and nothing here is a promise of earnings.)*

## What you are paid for

| Paid | Not paid |
|---|---|
| A client from **your own network** who starts | Leads sourced by the Company's own system |
| Every month you hold that relationship | Months after the relationship moves to someone else |
| Money the Company has collected | Invoices raised but unpaid |

## How and when you are paid

Commission accrued in a calendar month is paid **the following month**, against your invoice, by
Wise transfer in South African rand at the rate on the day of payment. Your portal shows every
amount and how it was calculated, and your payout statement is generated from those same rows —
the number in your portal and the number on your statement cannot disagree, because they are the
same data.

## What this plan does not do

It does not set your hours, your methods or your location — you are an independent contractor and
those are yours. It does not give you authority to agree a price or a discount: pricing is fixed
and published.
`
}
