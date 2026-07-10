/**
 * Guided onboarding tour — step config (#454, buildplan §3a / §4).
 *
 * The step list is CONFIG, not code. Adding / reordering a step is a content edit
 * here, never a rebuild. Targets are `data-tour="<key>"` anchors registered on the
 * REAL components (never raw CSS selectors) — a redesign that keeps the anchor keeps
 * the tour.
 */

export type CompletionCondition = 'action' | 'route-reached' | 'data-check'
export type Placement = 'top' | 'bottom' | 'left' | 'right' | 'center'
export type MobilePresentation = 'popover' | 'bottom-sheet'

/** What to do when a step's target element isn't in the DOM (buildplan §7). */
export type TargetFallback =
  | 'center' // show the popover centered, no spotlight (informational / target may appear)
  | 'wait'   // keep waiting for the target (async surfaces, e.g. leads landing)
  | 'skip'   // advance past this step

/** Keys into /onboarding/progress's boolean flags — the real data-checks. */
export type ProgressCheck = 'hasIcp' | 'hasLeads' | 'hasReveal' | 'hasEnrollment' | 'hasPurchase'

export type OnboardingStep = {
  id: string
  required: boolean
  route: string
  /** data-attribute anchor, e.g. '[data-tour="reveal-btn"]'. NEVER a raw CSS selector. */
  target: string
  title: string
  /** FIGSY's voice. */
  body: string
  placement: Placement
  completionCondition: CompletionCondition
  /** key into /onboarding/progress when completionCondition === 'data-check'. */
  completionCheck?: ProgressCheck
  fallback: TargetFallback
  analyticsEvent: string
  mobilePresentation: MobilePresentation
  /**
   * Step 2 only — write an example ICP into the existing `kind_icp_prefill`
   * localStorage key (icp/page.tsx reads it on "New ICP") so the client isn't
   * staring at an empty form. Reuses the existing prefill hook, no new system.
   */
  prefillExampleIcp?: boolean
}

// The example ICP the tour drops into `kind_icp_prefill` for step 2's "use an
// example ICP". Shape matches icp/page.tsx's ICPFormData (partial is fine).
export const EXAMPLE_ICP_PREFILL = {
  name: 'B2B SaaS Growth Leaders',
  industries: ['SaaS'],
  job_titles: ['Head of Sales', 'VP Sales', 'Growth Lead'],
  seniority_levels: ['C-Suite', 'VP / Director', 'Head of'],
  company_sizes: ['11–50', '51–200', '201–500'],
  geographies: ['South Africa', 'Nigeria', 'Kenya'],
  keywords: ['SaaS', 'B2B software', 'cloud platform'],
}

export const ONBOARDING_VERSION = 1

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    required: true,
    route: '/dashboard',
    target: '[data-tour="figsy-card"]',
    title: "Hi, I'm FIGSY 👋",
    body: "I'm your AI SDR. In the next few steps I'll find your best-fit leads, unmask the ones you like, and launch outreach for you. Ready? Let's go.",
    placement: 'bottom',
    completionCondition: 'route-reached',
    fallback: 'center',
    analyticsEvent: 'onboarding_welcome',
    mobilePresentation: 'popover',
  },
  {
    id: 'create-icp',
    required: true,
    route: '/dashboard/leads/icp',
    target: '[data-tour="icp-template-picker"]',
    title: 'Tell me who you sell to',
    body: "Click “New ICP” — I've pre-filled an example you can tweak. Pick a vertical template or edit the fields, then Save. This is how I know who to look for.",
    placement: 'right',
    completionCondition: 'data-check',
    completionCheck: 'hasIcp',
    fallback: 'center',
    analyticsEvent: 'onboarding_create_icp',
    mobilePresentation: 'bottom-sheet',
    prefillExampleIcp: true,
  },
  {
    id: 'run-icp',
    required: true,
    route: '/dashboard/leads/icp',
    target: '[data-tour="run-icp-btn"]',
    title: 'Now let me go find them',
    body: "Hit Run ICP and I'll start sourcing leads that match. This runs in the background — you don't have to wait around.",
    placement: 'left',
    completionCondition: 'action',
    fallback: 'center',
    analyticsEvent: 'onboarding_run_icp',
    mobilePresentation: 'popover',
  },
  {
    id: 'review-leads',
    required: true,
    route: '/dashboard/leads',
    target: '[data-tour="lead-list"]',
    title: 'Your leads land here',
    body: "I'm searching — I'll let you know the moment leads land. Feel free to keep going; nothing here blocks. Each lead is scored 0–100 so you see the best fits first.",
    placement: 'top',
    completionCondition: 'data-check',
    completionCheck: 'hasLeads',
    fallback: 'wait',
    analyticsEvent: 'onboarding_review_leads',
    mobilePresentation: 'popover',
  },
  {
    id: 'reveal-lead',
    required: true,
    route: '/dashboard/leads',
    target: '[data-tour="reveal-btn"]',
    title: 'Unmask the ones you want — $1 each',
    body: "Emails stay hidden until you reveal them. Spend $1 to unmask a lead you like — you only ever pay for the ones you choose, and never twice for the same person.",
    placement: 'left',
    completionCondition: 'data-check',
    completionCheck: 'hasReveal',
    fallback: 'center',
    analyticsEvent: 'onboarding_reveal_lead',
    mobilePresentation: 'popover',
  },
  {
    id: 'select-leads',
    required: true,
    route: '/dashboard/leads',
    target: '[data-tour="lead-checkbox"]',
    title: 'Pick who I should contact',
    body: 'Tick the leads you want me to reach out to. Select as many as you like — I handle each one personally.',
    placement: 'right',
    completionCondition: 'action',
    fallback: 'center',
    analyticsEvent: 'onboarding_select_leads',
    mobilePresentation: 'popover',
  },
  {
    id: 'enroll',
    required: true,
    route: '/dashboard/figsy',
    target: '[data-tour="enroll-btn"]',
    title: 'Put me to work',
    body: 'Create a campaign and I’ll enroll your chosen leads into it. This is where I take over the outreach.',
    placement: 'bottom',
    completionCondition: 'data-check',
    completionCheck: 'hasEnrollment',
    fallback: 'center',
    analyticsEvent: 'onboarding_enroll',
    mobilePresentation: 'popover',
  },
  {
    id: 'review-sequence',
    required: true,
    route: '/dashboard/figsy/sequence-builder',
    target: '[data-tour="sequence-preview"]',
    title: 'This is how I’ll reach out',
    body: "Here's the sequence I'll send — the emails, the timing, the follow-ups. Take a look; you're always in control of what I say.",
    placement: 'top',
    completionCondition: 'route-reached',
    fallback: 'center',
    analyticsEvent: 'onboarding_review_sequence',
    mobilePresentation: 'popover',
  },
  {
    id: 'launch',
    required: true,
    route: '/dashboard/figsy',
    target: '[data-tour="launch-btn"]',
    title: 'Launch — and I’m off',
    body: "Hit Activate and I start working: writing in your voice, sending, following up, and booking meetings. You've done it — welcome to your AI Revenue OS.",
    placement: 'left',
    completionCondition: 'action',
    fallback: 'center',
    analyticsEvent: 'onboarding_launch',
    mobilePresentation: 'popover',
  },
]

/** Required steps only, in order — powers the numbered progress rail. */
export const REQUIRED_STEPS = ONBOARDING_STEPS.filter(s => s.required)
