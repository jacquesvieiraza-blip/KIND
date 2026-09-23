// ⛓️ 23 Sep (R137) — `PACK_PRICE_USD` is no longer imported: the playbook quotes no price at all.

// ── THE WORDS (#654) — ONE HOME ─────────────────────────────────────────────────────────
//
// The second reason sellers go quiet: they know WHO to call and have no idea WHAT to say, so
// the call keeps getting postponed until it is too late to make. A seller with a list and no
// words is a seller who does nothing.
//
// ⚠️ EVERY CLAIM HERE MUST BE TRUE TODAY (R27 discipline). These words go to real people in
// a seller's own network — the relationships they will still have long after this. So no
// invented client counts, no "companies are seeing", no results nobody has had. What the
// product does is described plainly and the seller is told to be honest about being new.
//
// ⚠️ Money is interpolated from the constants the product bills from, never typed.

export type PlaybookEntry = {
  id: string
  /** Which ramp gate needs these words. */
  gate: 'name-your-20' | 'send-five-asks' | 'first-demo' | 'first-client'
  title: string
  /** What this is for, in one line. */
  purpose: string
  /** Copy-paste text. Placeholders in [brackets] for the seller to fill. */
  body: string
  /** The thing people get wrong with this one. */
  watchOut: string
}

export function sellerPlaybook(): PlaybookEntry[] {
  return [
    {
      id: 'who-to-name',
      gate: 'name-your-20',
      title: 'Who belongs on your list',
      purpose: 'Deciding who counts, so the list gets written instead of agonised over.',
      body: [
        'Put someone on the list if ANY of these is true:',
        '',
        '· they own or run a business that sells to other businesses',
        '· they run a sales team, or they ARE the sales team',
        '· they have complained to you about not having enough customers',
        '· they hired someone to find customers and it did not work',
        '',
        'Do not filter for who will say yes. You cannot tell, and filtering is how a list of',
        'twenty becomes a list of three.',
      ].join('\n'),
      watchOut: 'The temptation is to only write down the impressive names. The first client usually comes from the person you almost left off.',
    },
    {
      id: 'the-ask',
      gate: 'send-five-asks',
      title: 'The ask — a conversation, never a pitch',
      purpose: 'The first message. Its only job is to get fifteen minutes.',
      body: [
        'Hi [name],',
        '',
        'I have started working with a company that does outbound for small B2B teams —',
        'they find the right people to approach and write the emails, and the client just',
        'approves who is worth pursuing.',
        '',
        'I thought of you because [the real reason — something they told you about needing',
        'customers, a hire that did not work, a quiet quarter].',
        '',
        'Can I steal fifteen minutes to show you what it looks like? If it is not for you,',
        'I will say so myself.',
        '',
        '[your name]',
      ].join('\n'),
      watchOut: 'Do not attach anything and do not send a price. The ask is for fifteen minutes; a price in the first message gets answered with a decision instead of a conversation.',
    },
    {
      id: 'the-demo-invite',
      gate: 'first-demo',
      title: 'Turning a yes into a booked demo',
      purpose: 'What to send once they have said they are interested.',
      body: [
        'Great — I will bring the person who built it, so you can ask the awkward questions',
        'directly rather than through me.',
        '',
        'Does [day] at [time] work? It takes about twenty minutes.',
        '',
        'Nothing to prepare. It helps if you can say who your best customer is, because we',
        'can point it at that kind of company while you watch.',
      ].join('\n'),
      watchOut: 'Offer two specific times, not "when suits you?". An open question is one more decision for a busy person and it is where booked demos go to die.',
    },
    {
      id: 'being-new',
      gate: 'send-five-asks',
      title: 'What to say when they ask how long you have done this',
      purpose: 'The honest answer, which sells better than the clever one.',
      body: [
        'Be straight: you are new to this, you came across the product, you thought of them',
        'specifically. Say what is true — that you would not put your own name to it if you',
        'thought it would waste their time.',
        '',
        'You are not pretending to be a salesperson at a big company. You are someone they',
        'already know, bringing them something. That is a stronger position, not a weaker one.',
      ].join('\n'),
      watchOut: 'Never invent client numbers, results or names. Your network is the asset — a claim that turns out to be untrue costs you the relationship, not just the deal.',
    },
    {
      id: 'the-day-30-move',
      gate: 'first-client',
      title: 'The day-30 move — how a finite list refills',
      purpose: 'The single habit that decides whether month three has anything in it.',
      body: [
        'Once a client you landed has been running for about a month, ask them this:',
        '',
        '"Now that you have seen it work — is there one person you know who has the same',
        'problem you had? I would rather come to them through you than cold."',
        '',
        // ⛓️ 23 Sep (R137) — WAS "…and the ${pack} starting pack means it is an easy thing for
        // them to recommend." The pack is retired (founder: *"the 299/4 is retired/ this must
        // go."*). The replacement is R124's structure-only wording — Free Proof before you pay —
        // and names no price, because the programme curve is still not published (R124/R81).
        'One introduction. Not a list, not a favour, one name — and because they see a free',
        'Proof of who we would reach before they pay anything, it is an easy thing to recommend.',
      ].join('\n'),
      watchOut: 'Everyone knows to do this and almost nobody does. Your own network is finite: about twenty to fifty names. This ask is what refills it, and the month you stop doing it is the month your pipeline stops.',
    },
  ]
}
