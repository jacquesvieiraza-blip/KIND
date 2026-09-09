// ═══════════════════════════════════════════════════════════════════════════════════════
// THE TWO WORKSPACES — the approved Vida architecture, as data rather than as markup.
//
// ── WHY THIS IS A MODULE AND NOT JSX IN THE LAYOUT ──────────────────────────────────────
//
// The locked structure is a founder decision with named retirements in it. Held as JSX it can
// only be checked by reading it; held here it can be ASSERTED — that Bookings is absent from
// the Command Centre, that Meetings appears in Clients and nowhere else, that Ops and
// Compliance are gone from primary nav. Those are the exact facts the correction pass turned
// on, and they are the ones a future edit would silently undo.
//
// ── THE ARCHITECTURE (founder-locked 9 Sep, from the final preview set) ─────────────────
//
//   CLIENTS         the default workspace — one client at a time, their lifecycle, the one
//                   action genuinely required. NORMAL = Vida works and watches;
//                   EXCEPTION = Vida interrupts the operator.
//   COMMAND CENTRE  the business, not one client — delivery, money, system, growth, company.
//
// ── THE RETIREMENTS, WHICH ARE NOT PENDING ──────────────────────────────────────────────
//
// 🛑 `Ops`, `Compliance` and `Bookings` ARE DELIBERATELY ABSENT FROM THE LISTS BELOW, and
// their pages are deliberately still on disk. The founder retired them from PRIMARY NAV; he
// did not retire the capability or the data, and deleting a route because a menu entry went
// away is the failure this comment exists to prevent. `/vida/ops`, `/vida/compliance` and
// `/vida/bookings` all still resolve if typed or linked.
//
// 🛑 MEETINGS LIVES IN CLIENTS, AND ONLY THERE. The Command Centre has no Bookings entry: a
// meeting is a fact about ONE client's programme, so it belongs beside that client rather than
// in the view that is explicitly "the business, not one client". `/vida/bookings` is the
// meetings screen and is reached from the Clients workspace under its real name.
// ═══════════════════════════════════════════════════════════════════════════════════════

export type NavItem = {
  href: string
  label: string
  icon: string
  /**
   * ⚑ 9 Sep — A FILTER ON THE SAME SCREEN, NOT A DESTINATION.
   *
   * 🛑 `Needs you` IS NOT A LIFECYCLE STAGE and must not become one. It is the client list,
   * filtered to the clients where Vida genuinely requires a person. Encoding it as a query on
   * `/vida` keeps three things true at once: it is a real URL you can bookmark and share, it
   * does not navigate away from the workspace, and the reachability tests can still check that
   * `href` points at a page that exists.
   */
  query?: string
  /** Show a live count beside the label. Only ever the number of clients that need somebody. */
  badge?: 'needs_you'
}
export type NavGroup = { title: string; items: NavItem[] }

/**
 * The CLIENTS workspace rail, above the client list itself.
 *
 * ⛓️ 9 Sep — **Needs you** IS HERE NOW, and it was deliberately absent this morning: it is a
 * filtered view of the client list, and no filter existed, so drawing it would have repeated
 * the bug this console shipped three times (`/vida/demo`, `/partners`,
 * `/governed-documents` — a row that lands nowhere). The founder ruled: build it. The filter
 * is real, the count is real, and it selects clients where Vida genuinely needs a person —
 * never a lifecycle transition that happened by itself.
 */
export const CLIENTS_WORKSPACE: NavItem[] = [
  { href: '/vida',          label: 'Clients',   icon: '👥' },
  { href: '/vida',          label: 'Needs you', icon: '❗', query: 'needs=1', badge: 'needs_you' },
  { href: '/vida/bookings', label: 'Meetings',  icon: '📅' },
  { href: '/vida/reports',  label: 'Reports',   icon: '🧾' },
]

/**
 * The COMMAND CENTRE rail — Cockpit, then six named groups, in the locked order.
 *
 * ⚠️ EVERY HREF BELOW IS AN EXISTING PAGE. The preview also lists **Founder prospecting** under
 * COMPANY; there is no such page in this repo (the nearest is `/cmo`, "CMO Tools", which is a
 * different screen and is not silently relabelled to fill a gap). It is left out and reported,
 * rather than pointed at something that is not it.
 */
export const COMMAND_CENTRE: NavGroup[] = [
  { title: '', items: [{ href: '/vida/cockpit', label: 'Cockpit', icon: '📟' }] },
  { title: 'Delivery', items: [
    { href: '/vida/queue',       label: 'Lead queue',  icon: '✦' },
    { href: '/vida/sending',     label: 'Sending',     icon: '📤' },
    { href: '/vida/unibox',      label: 'Unibox',      icon: '📥' },
    { href: '/vida/suppression', label: 'Suppression', icon: '🚫' },
  ] },
  { title: 'Clients', items: [
    { href: '/vida/clients-admin', label: 'Client admin',  icon: '🗂' },
    { href: '/vida/demo',          label: 'Demo accounts', icon: '🎬' },
  ] },
  { title: 'Money', items: [
    { href: '/vida/money-path', label: 'Money Path',       icon: '💰' },
    { href: '/vida/billing',    label: 'Billing',          icon: '🧾' },
    { href: '/vida/revenue',    label: 'Revenue',          icon: '📈' },
    { href: '/vida/reports',    label: 'Reports & billing', icon: '📊' },
  ] },
  { title: 'System', items: [
    { href: '/vida/system', label: 'System',    icon: '🩺' },
    { href: '/vida/engine', label: 'Engine',    icon: '📡' },
    { href: '/vida/health', label: 'Health',    icon: '❤️' },
    { href: '/vida/audit',  label: 'Audit log', icon: '📋' },
  ] },
  { title: 'Growth', items: [
    { href: '/vida/gtm',      label: 'GTM Hub',       icon: '🚀' },
    { href: '/vida/partners', label: 'Partners',      icon: '🤝' },
    { href: '/vida/nexus',    label: 'Nexus signals', icon: '🧠' },
  ] },
  { title: 'Company', items: [
    { href: '/vida/founder',             label: 'Founder',   icon: '👑' },
    { href: '/vida/governed-documents',  label: 'Documents', icon: '📁' },
  ] },
]

/**
 * Retired from PRIMARY NAV on 9 Sep — the pages, and the data behind them, are untouched.
 *
 * ⚠️ THIS LIST IS THE RECEIPT. Without it "why is Ops missing" is answerable only by reading a
 * commit message, and the most likely repair for a missing menu entry is to add it back.
 */
export const RETIRED_FROM_PRIMARY_NAV: { route: string; why: string }[] = [
  // ⚠️ THE KEY IS `route`, NOT `href`, ON PURPOSE. `href` means "a row the operator can click"
  // everywhere else in this file; reusing it for a receipt would make "is this in the nav?"
  // unanswerable by reading — and that is exactly the question the tests ask.
  { route: '/vida/ops',        why: 'Founder decision 9 Sep — removed from primary nav. The page and its data remain.' },
  { route: '/vida/compliance', why: 'Founder decision 9 Sep — removed from primary nav. The page and its data remain.' },
  { route: '/vida/bookings',   why: 'Not retired — MOVED. Meetings belongs to one client, so it lives in the Clients workspace and has no Command Centre entry.' },
  { route: '/vida/outreach',   why: 'Superseded by Delivery → Sending, which answers the same question from real send activity.' },
]

/** Every destination the two workspaces can reach — used to prove nothing is orphaned. */
export function allNavHrefs(): string[] {
  return [...CLIENTS_WORKSPACE.map(i => i.href), ...COMMAND_CENTRE.flatMap(g => g.items.map(i => i.href))]
}
