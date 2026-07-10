/**
 * Learning Centre video config (#454, Phase 6 · buildplan §10).
 *
 * Host = the K.I.N.D YouTube channel (unlisted uploads). Adding a video is ONE entry
 * here (newest first) — no CMS, no DB. Playback is the privacy-enhanced embed
 * (youtube-nocookie.com); thumbnails come from i.ytimg.com.
 *
 * ┌─ HOW THE FOUNDER ADDS A VIDEO ────────────────────────────────────────────┐
 * │ 1. Record it, upload to the K.I.N.D YouTube channel as **Unlisted**.       │
 * │ 2. Copy the video id from the URL (youtube.com/watch?v=XXXXXXXXXXX → the    │
 * │    `XXXXXXXXXXX` part, 11 chars).                                           │
 * │ 3. Paste it into `youtube_id` on the matching card below.                   │
 * │ 4. Set `duration` (e.g. "2:14") and flip `isNew: true` if it should carry   │
 * │    the New badge. Done — the card lights up automatically.                  │
 * │ Empty `youtube_id` = a tasteful "coming soon" card (never a broken embed).  │
 * └────────────────────────────────────────────────────────────────────────────┘
 */

export type VideoCategory =
  | 'getting-started'
  | 'icp'
  | 'leads'
  | 'campaigns'
  | 'billing'
  | 'whats-new'

export type OnboardingVideo = {
  id: string
  title: string
  description: string
  /** The unlisted YouTube video id — founder pastes it here. Empty = coming soon. */
  youtube_id: string
  /** Display duration, e.g. "2:14". */
  duration: string
  category: VideoCategory
  isNew: boolean
  /** ISO date; used only for ordering / "what's new". */
  publishedAt: string
}

// Newest first. Seeded with the 6 reference cards; youtube_ids are placeholders —
// founder pastes the unlisted YouTube video id here (see header).
export const ONBOARDING_VIDEOS: OnboardingVideo[] = [
  {
    id: 'whats-new',
    title: "What's new",
    description: 'The latest FIGSY features and improvements, in 60 seconds.',
    youtube_id: '', // founder pastes the unlisted YouTube video id here
    duration: '',
    category: 'whats-new',
    isNew: true,
    publishedAt: '2026-07-10',
  },
  {
    id: 'getting-started',
    title: 'Getting started',
    description: 'A 2-minute tour of your AI Revenue OS and how FIGSY works for you.',
    youtube_id: '', // founder pastes the unlisted YouTube video id here
    duration: '',
    category: 'getting-started',
    isNew: false,
    publishedAt: '2026-07-10',
  },
  {
    id: 'create-first-icp',
    title: 'Create your first ICP',
    description: 'Tell FIGSY exactly who you sell to so he targets the right people.',
    youtube_id: '', // founder pastes the unlisted YouTube video id here
    duration: '',
    category: 'icp',
    isNew: false,
    publishedAt: '2026-07-10',
  },
  {
    id: 'finding-revealing-leads',
    title: 'Finding and revealing leads',
    description: 'Browse scored leads for free and spend $1 to unmask the ones you want.',
    youtube_id: '', // founder pastes the unlisted YouTube video id here
    duration: '',
    category: 'leads',
    isNew: false,
    publishedAt: '2026-07-10',
  },
  {
    id: 'launch-first-campaign',
    title: 'Launch your first campaign',
    description: 'Enroll leads and let FIGSY write, send and follow up on your behalf.',
    youtube_id: '', // founder pastes the unlisted YouTube video id here
    duration: '',
    category: 'campaigns',
    isNew: false,
    publishedAt: '2026-07-10',
  },
  {
    id: 'credits-and-billing',
    title: 'Credits & billing',
    description: 'How the $1 reveal and $3 FIGSY credits work — and how to top up.',
    youtube_id: '', // founder pastes the unlisted YouTube video id here
    duration: '',
    category: 'billing',
    isNew: false,
    publishedAt: '2026-07-10',
  },
]

/** The first-login welcome video — the "Getting started" card if it has an id,
 *  else the first video that does (so the welcome card only shows a real video). */
export function welcomeVideo(): OnboardingVideo | null {
  const gs = ONBOARDING_VIDEOS.find(v => v.id === 'getting-started' && v.youtube_id)
  if (gs) return gs
  return ONBOARDING_VIDEOS.find(v => v.youtube_id) ?? null
}

/** Privacy-enhanced embed URL (no cookie until play). */
export function youtubeEmbedUrl(id: string): string {
  return `https://www.youtube-nocookie.com/embed/${id}`
}

/** hqdefault thumbnail for a video id. */
export function youtubeThumbnail(id: string): string {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
}
