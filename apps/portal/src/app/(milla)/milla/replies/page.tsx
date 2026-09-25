'use client'

// #644 — THE ROUTE THAT DID NOT EXIST.
//
// Milla's rail listed the client's recent replies as plain text — no link, no route, nothing
// to click — and the rail carried no Replies entry either, so a client could SEE that a
// prospect had replied and had no way whatsoever to open it. The reply screen was built and
// working the whole time; nothing navigated to it. Found 12 Aug by the founder pressing it.
//
// Same Milla-native pattern as /milla/billing: render the REAL inbox inside the Milla shell,
// so there is one implementation of the reply experience rather than a second copy that drifts.
//
// ⛓️ 25 Sep (R165) — THE ONE IMPLEMENTATION IS NOW `MillaInbox` ("Inbox", not "Replies"). The
// old dashboard Unibox was rebuilt as it, and `/dashboard/inbox` renders the same component, so
// there is still exactly one reply screen. The URL stays `/milla/replies` so no link breaks.
import MillaInbox from '@/components/milla/MillaInbox'

/**
 * ⚑ 18 Sep (J22-C2 · PV 11 C) — WHAT HAPPENS TO A REPLY WE CANNOT PLACE, SAID HERE.
 *
 * ── 🛑 THE CLIENT COULD NOT LEARN THIS ANYWHERE ─────────────────────────────────────────
 *
 * A reply that cannot be matched to exactly one client is held: written to nobody, retained in
 * full, and put in front of a person at K.I.N.D who attributes or discards it. That is the
 * right behaviour — R131's *"if the system cannot determine one safe owner: FAIL CLOSED"* —
 * and until now the client's side of it was silence. Somebody who knows a prospect answered
 * them, and does not see it here, is left to conclude we lost it.
 *
 * ⚠️ IT DESCRIBES THE RULE, NEVER A PARTICULAR REPLY. A held reply may belong to another
 * client — that is precisely why it is held — so naming one here would hand a client the
 * knowledge that somebody replied to somebody. The sentence says what happens and how long it
 * takes, and nothing about who.
 *
 * ⚠️ AND IT PROMISES NO AUTOMATIC ARRIVAL. "A person checks it" is what actually occurs; "it
 * will appear shortly" would be a claim about an outcome an operator has not decided yet.
 */
export default function MillaNative_replies() {
  return (
    <div className="h-full overflow-y-auto p-5 sm:p-6">
      <MillaInbox />
      <p data-testid="held-reply-note" className="mt-3 px-1 text-[11.5px] text-[#9b8ec4] leading-relaxed">
        Very occasionally a reply arrives that we cannot match to your programme automatically.
        When that happens it is not lost and it is not deleted — a person at K.I.N.D reads it and
        places it, and it appears here once they have.
      </p>
    </div>
  )
}
