'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

// ── /onboard IS A REDIRECT STUB. THE INTERVIEW IT USED TO HOLD IS GONE (founder-ruled 24 Aug) ──
//
// This page was a six-question scripted intake that ran BEFORE a new client had entered
// K.I.N.D. Three things were wrong with it at once, and the founder found all three on a
// live walk:
//
//   1. IT ASKED BUSINESS-DISCOVERY QUESTIONS BEFORE THE PRODUCT. "What does your company do?
//      Tell me who you help and how" — the same question Milla then asked AGAIN on
//      /milla/welcome. The client was interviewed twice by two different eras of the same
//      flow, because /milla/welcome was built later and nobody deleted what it replaced.
//   2. IT WORE THE WRONG FACE. Step 0 read "Hi — I'm Milla." while the header photo, the
//      identity bar and every chat bubble showed /agents/figsy.png and the words
//      "FIGSY · The Opener". An earlier fix had changed the WORDS and left the CHROME.
//   3. IT SPLIT THE FIRST RUN IN TWO. Account creation and business understanding are
//      different things, and that distinction is real — but it never justified a separate
//      screen in front of the product.
//
// The founder's ruling: authentication is all that happens before K.I.N.D. Everything this
// page used to collect — company name, what the business does, country, contact name, phone,
// website — Milla now collects conversationally at /milla/welcome, in ONE journey, and the
// clients row is written there at the moment the client confirms her understanding.
//
// ⚠️ THE ROUTE IS KEPT ON PURPOSE, AND IT MUST STAY EMPTY. Kept, because an emailed
// /auth/callback?next=/onboard link, an old bookmark or a stale tab must still land
// somewhere sane, and because two enumeration guards walk this directory
// (portal-auth-routes.test.ts, portal-public-routes.test.ts). Empty, because the founder was
// explicit that no replacement form may appear under a different URL and no form may be
// moved into a modal and called Milla: NO steps, NO form, NO inputs, NO business questions,
// NO FIGSY, and NO POST /auth/onboard. `first-run-milla.test.ts` fails if any of those
// return. A stub that quietly regrows a question is the bug this file already had once.
export default function OnboardPage() {
  const router = useRouter()

  useEffect(() => { router.replace('/milla/welcome') }, [router])

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: 'linear-gradient(135deg, #FFF5EE 0%, #FAF0FF 55%, #EDE6FF 100%)' }}
    >
      <Loader2 className="w-6 h-6 animate-spin text-[#7C3AED]" />
      <span className="sr-only">Taking you to Milla…</span>
    </div>
  )
}
