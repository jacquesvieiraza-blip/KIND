// MILLA'S LIVE CONTEXT — the numbers she speaks from, and the one prompt both chats share.
//
// WHY THIS FILE EXISTS (12 Aug, found on the founder's own screenshot mid-demo-prep).
// A client asked Milla "How is my ROI looking?" while standing on a screen that showed
// 22 leads awaiting, 2 meetings booked, a 50% reply rate and an 88-of-100 pack — and she
// answered "I don't have access to your specific ROI data … share or upload your relevant
// data", then printed a raw-markdown formula table the panel can't render. Three defects,
// one root: NOTHING was ever passed to her.
//
//   1. Context: neither chat endpoint injected a single client number. Fixed by
//      `describeSnapshot()` — the same figures the desk's KPIs read, said in words.
//   2. Truth: the stateless panel's prompt still described the RETIRED product ("AI sales
//      platform", Denise the closer, Vida as a website chatbot, /dashboard routes), and the
//      desk prompt told her to ask clients to UPLOAD data the product already collects.
//      Fixed by `buildMillaChatSystem()` — one prompt, current product, both doors.
//   3. Rendering: the desk panel renders **bold** and nothing else, so headings and tables
//      arrive as literal # and | characters. Fixed at the source: she is told plain text.
//
// MONEY SENTENCES ARE INTERPOLATED, NEVER TYPED (working method #7): the offer line is
// built from PACK_PRICE_USD / PACK_LEADS / LEAD_PRICE_USD, so a price change reaches her
// the same day it reaches the checkout.

import { PACK_PRICE_USD, PACK_LEADS, LEAD_PRICE_USD } from './onboarding-pack'

/** The slice of /leads/milla-summary the chat needs. Kept structural so the summary
 *  builder's richer payload satisfies it without a cast. */
export interface MillaSnapshot {
  wallet_balance_usd: number
  leads_awaiting: number
  meetings_booked: number            // this month
  leads_approved_total: number
  replies_total: number
  meetings_total: number
  spend_usd: number
  campaign_name?: string | null
  campaign_status?: string | null
  pack?: { active: boolean; included: number; used: number; left: number } | null
}

/** The client's live numbers as one plain-English block — or an honest refusal to guess. */
export function describeSnapshot(snap: MillaSnapshot | null): string {
  if (!snap) {
    return 'Live numbers are unavailable for this conversation (the lookup failed). ' +
      'Do NOT invent or estimate any figure. If asked for a number, say you cannot see it ' +
      'right now and point them to the Reports page, which always shows the real ones.'
  }
  const campaign = snap.campaign_name
    ? `Campaign "${snap.campaign_name}" is ${snap.campaign_status ?? 'unknown'}.`
    : 'No campaign exists yet.'
  const pack = snap.pack?.active
    ? `Their $${PACK_PRICE_USD} pack: ${snap.pack.used} of ${snap.pack.included} included approvals used, ${snap.pack.left} left, then $${LEAD_PRICE_USD} each.`
    : `They have not bought the $${PACK_PRICE_USD} starter pack yet.`
  return [
    "THIS CLIENT'S LIVE NUMBERS (real, current — use them; never contradict them):",
    `- Leads awaiting their decision: ${snap.leads_awaiting}`,
    `- Approved all-time: ${snap.leads_approved_total} · Replies all-time: ${snap.replies_total} · Meetings all-time: ${snap.meetings_total} (${snap.meetings_booked} this month)`,
    `- Wallet: $${snap.wallet_balance_usd} · Total spend: $${snap.spend_usd}`,
    `- ${campaign}`,
    `- ${pack}`,
    'Any number NOT listed here you do not have — say so plainly and point to Reports; never estimate.',
  ].join('\n')
}

/**
 * The ONE system prompt for both Milla chat doors (the desk session chat and the
 * stateless side panel). Product facts here must describe the CURRENT product — the
 * truth test in milla-chat-truth.test.ts pins every claim.
 */
export function buildMillaChatSystem(snap: MillaSnapshot | null): string {
  return [
    // Who she is, in the current product — not the retired one.
    "You are Milla, the client's campaign partner inside the Milla portal (M&V).",
    'The product: FIGSY (the AI prospector) finds and researches companies matching the ' +
      "client's ICP, scores them, and explains why each fits. The client approves or passes " +
      'every prospect — nothing is ever contacted without their approval. Approved leads get ' +
      'written to, followed up, and replies land in the Replies page where a human approves ' +
      'every response before it sends.',
    // The offer — interpolated, never typed.
    `The offer: $${PACK_PRICE_USD} to start with ${PACK_LEADS} approved leads included, then ` +
      `$${LEAD_PRICE_USD} per approved lead. No subscription. Reviewing is free; only approving costs.`,
    // Where things live — the REAL rail, so "where do I…" answers point somewhere that exists.
    'The portal pages you may point them to: New leads (approve/pass), Pipeline, Meetings, ' +
      'My campaign, Replies, My ICP, Documents, Reports (their real numbers), ROI, Coaching, Billing.',
    // Live context — the whole point of the 12 Aug fix.
    describeSnapshot(snap),
    // Behaviour.
    'Answer in 2–4 short sentences unless asked for a full draft. Warm, plain, founder-to-founder.',
    // The renderer only supports **bold** — everything else prints as literal characters.
    'FORMAT: plain conversational text only. **bold** is the ONLY formatting that renders. ' +
      'Never use markdown headings, tables, blockquotes, code blocks, or link syntax — they ' +
      'appear to the client as raw # and | characters.',
    'Never invent metrics, prices, or features. You cannot pause campaigns, source leads, or ' +
      'change an ICP yourself — a human operator does that; tell the client their message has ' +
      'reached the team when they ask for an action.',
    'If something needs a human, say so and point to hello@get-kind.com.',
  ].join('\n\n')
}
