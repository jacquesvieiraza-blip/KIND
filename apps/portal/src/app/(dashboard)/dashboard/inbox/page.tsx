'use client'
// ⛓️ 25 Sep (R165) — THE UNIBOX IS RETIRED; THIS ROUTE RENDERS THE ONE INBOX.
//
// This file held the old four-pane "Unibox": a LinkedIn filter for a product that only sends
// email, folders and tags with nothing behind them, an empty "ICP fit", "FIGSY says" copy, links
// to retired screens, and a Send box that R150 forbids for clients. Signed-in clients are
// redirected from /dashboard to /milla anyway; rather than keep a second reply screen that can
// drift, this route renders the same `MillaInbox` the client sees in Milla.
import MillaInbox from '@/components/milla/MillaInbox'

export default function InboxPage() {
  return <MillaInbox />
}
