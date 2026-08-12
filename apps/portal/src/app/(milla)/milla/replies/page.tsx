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
import SourcePage from '@/app/(dashboard)/dashboard/inbox/page'

export default function MillaNative_replies() {
  return (
    <div className="h-full overflow-y-auto p-5 sm:p-6">
      <SourcePage />
    </div>
  )
}
