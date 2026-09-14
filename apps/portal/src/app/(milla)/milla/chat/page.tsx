'use client'

import { useEffect } from 'react'
import { useMillaConversation } from '@/components/milla/MillaConversation'

// ═══════════════════════════════════════════════════════════════════════════════════════
// #489 — MILLA CONCIERGE CHAT.
//
// ⛓️ 14 Sep (R121, Build 2) — THIS ROUTE USED TO BUILD A SECOND MILLA, and it was the last
// place in the product where two of her existed at once.
//
// 🛑 THE DEFECT, EXACTLY. `MillaShell` mounts ONE `MillaConversation` beside every `(milla)`
// route — its own header says so: "A route that needs Milla to be talking about ITS subject
// calls focus(...) on the context below — it does not build a second one." This page built a
// second one anyway: its own `messages` state, its own session lookup, its own composer and
// its own Send, all pointed at the SAME `milla_sessions` thread. So the client had two
// transcripts of one conversation on one screen, each unaware of what had just been typed
// into the other, and whichever they used last was the only one that looked complete.
//
// ⚠️ IT IS A ROUTE, NOT A CHAT, NOW. The conversation is already on screen; this simply puts
// the cursor in it — the same thing every other `(milla)` route does. The URL keeps working,
// which matters because the middleware redirects `/dashboard/figsy-chat` and
// `/dashboard/messages` here.
// ═══════════════════════════════════════════════════════════════════════════════════════
export default function MillaChatPage() {
  const conversation = useMillaConversation()

  // ⚠️ ONCE, ON ARRIVAL. `focus` is stable and this is not a subscription — re-running it on
  // every render would steal the cursor back from a client who had clicked somewhere else.
  useEffect(() => { conversation.focus() }, [conversation])

  return (
    <div className="flex-1 min-h-0 flex items-center justify-center px-6 py-10">
      <div className="max-w-md text-center">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#7C3AED] to-[#EC4899] text-white flex items-center justify-center text-[20px] font-extrabold mx-auto mb-4">M</div>
        <h1 className="text-[19px] font-extrabold text-[#1f1235] mb-2">Milla is right here</h1>
        <p className="text-[13.5px] leading-relaxed text-[#5c5279]">
          She&rsquo;s in the panel beside you, and she remembers everything you&rsquo;ve told
          her — your business, who you want to reach, and who to leave alone. Ask her how
          things are going, or tell her something has changed.
        </p>
      </div>
    </div>
  )
}
