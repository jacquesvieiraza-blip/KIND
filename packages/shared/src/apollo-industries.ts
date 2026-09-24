// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 23 Sep (R142 · A2a) — INDUSTRY IS PICKED FROM APOLLO'S OWN LIST. NEVER TYPED, NEVER GUESSED.
//
// Founder, verbatim: *"this is why we use apollo drop downs and make sure we do not assume."* ·
// on how the client is told: *"milla must say please look to the right and drop down and choose."*
//
// 🛑 WHAT WAS LIVE. The client's industry was free text ("property developers and construction
// companies") that never reached the search at all — Blackburne Enterprises' Proof came back
// with a doughnut shop and a debt-collection agency.
//
// ⚠️ WHERE THIS LIST COMES FROM. Apollo's Industry filter is the company's self-reported
// industry from its social profile — LinkedIn's standard industry list — per Apollo's
// "Industry Filter Options" help article (knowledge.apollo.io/hc/en-us/articles/4409230850189).
// That page blocks automated download, so the list below is LinkedIn's standard list plus
// "Agriculture", which Apollo's page shows. Apollo matches these as organisation keywords
// (`q_organization_keyword_tags`), lower-cased — proven 23 Sep: `construction` alone, UK,
// 11–50, C-suite → 4,760 people, page one all construction firms.
// ═══════════════════════════════════════════════════════════════════════════════════════

export const APOLLO_INDUSTRIES: readonly string[] = [
  'Accounting', 'Agriculture', 'Airlines/Aviation', 'Alternative Dispute Resolution',
  'Alternative Medicine', 'Animation', 'Apparel & Fashion', 'Architecture & Planning',
  'Arts & Crafts', 'Automotive', 'Aviation & Aerospace', 'Banking', 'Biotechnology',
  'Broadcast Media', 'Building Materials', 'Business Supplies & Equipment', 'Capital Markets',
  'Chemicals', 'Civic & Social Organization', 'Civil Engineering', 'Commercial Real Estate',
  'Computer & Network Security', 'Computer Games', 'Computer Hardware', 'Computer Networking',
  'Computer Software', 'Construction', 'Consumer Electronics', 'Consumer Goods',
  'Consumer Services', 'Cosmetics', 'Dairy', 'Defense & Space', 'Design', 'E-Learning',
  'Education Management', 'Electrical/Electronic Manufacturing', 'Entertainment',
  'Environmental Services', 'Events Services', 'Executive Office', 'Facilities Services',
  'Farming', 'Financial Services', 'Fine Art', 'Fishery', 'Food & Beverages', 'Food Production',
  'Fund-Raising', 'Furniture', 'Gambling & Casinos', 'Glass, Ceramics & Concrete',
  'Government Administration', 'Government Relations', 'Graphic Design',
  'Health, Wellness & Fitness', 'Higher Education', 'Hospital & Health Care', 'Hospitality',
  'Human Resources', 'Import & Export', 'Individual & Family Services', 'Industrial Automation',
  'Information Services', 'Information Technology & Services', 'Insurance',
  'International Affairs', 'International Trade & Development', 'Internet',
  'Investment Banking', 'Investment Management', 'Judiciary', 'Law Enforcement', 'Law Practice',
  'Legal Services', 'Legislative Office', 'Leisure, Travel & Tourism', 'Libraries',
  'Logistics & Supply Chain', 'Luxury Goods & Jewelry', 'Machinery', 'Management Consulting',
  'Maritime', 'Market Research', 'Marketing & Advertising',
  'Mechanical or Industrial Engineering', 'Media Production', 'Medical Devices',
  'Medical Practice', 'Mental Health Care', 'Military', 'Mining & Metals',
  'Motion Pictures & Film', 'Museums & Institutions', 'Music', 'Nanotechnology', 'Newspapers',
  'Non-Profit Organization Management', 'Oil & Energy', 'Online Media',
  'Outsourcing/Offshoring', 'Package/Freight Delivery', 'Packaging & Containers',
  'Paper & Forest Products', 'Performing Arts', 'Pharmaceuticals', 'Philanthropy',
  'Photography', 'Plastics', 'Political Organization', 'Primary/Secondary Education',
  'Printing', 'Professional Training & Coaching', 'Program Development', 'Public Policy',
  'Public Relations & Communications', 'Public Safety', 'Publishing', 'Railroad Manufacture',
  'Ranching', 'Real Estate', 'Recreational Facilities & Services', 'Religious Institutions',
  'Renewables & Environment', 'Research', 'Restaurants', 'Retail', 'Security & Investigations',
  'Semiconductors', 'Shipbuilding', 'Sporting Goods', 'Sports', 'Staffing & Recruiting',
  'Supermarkets', 'Telecommunications', 'Textiles', 'Think Tanks', 'Tobacco',
  'Translation & Localization', 'Transportation/Trucking/Railroad', 'Utilities',
  'Venture Capital & Private Equity', 'Veterinary', 'Warehousing', 'Wholesale',
  'Wine & Spirits', 'Wireless', 'Writing & Editing',
]

const BY_LOWER: ReadonlyMap<string, string> = new Map(APOLLO_INDUSTRIES.map(i => [i.toLowerCase(), i]))

/** The list's own spelling of an industry, or null — a word not on Apollo's list is never guessed into one. */
export function apolloIndustry(s: unknown): string | null {
  return BY_LOWER.get(String(s ?? '').trim().toLowerCase()) ?? null
}

/** Only the entries that are on Apollo's list, in the list's own spelling, without repeats. */
export function apolloIndustriesOnly(xs: readonly unknown[] | null | undefined): string[] {
  const out: string[] = []
  for (const x of xs ?? []) {
    const v = apolloIndustry(x)
    if (v && !out.includes(v)) out.push(v)
  }
  return out
}

/** What Milla says when the client has not picked an industry yet — the founder's own instruction. */
export const PICK_INDUSTRY_COPY =
  'Please look to the right — open the Industry drop-down and choose the industries you sell to. I won’t guess this one: Apollo only finds the right companies when the industry comes from its own list.'

/**
 * ⚑ 24 Sep (R145 step 2 · #73) — the two "Never contact" lists only the client holds. Ticking
 * one tells Milla to ask for it; neither is a provider filter, and both only ever remove people.
 */
export const NEVER_CONTACT_KINDS = ['Existing customers', 'Open opportunities'] as const

/** What Milla says, once, when one of those is ticked: only the client has the list, so she asks for it. */
export const NEVER_CONTACT_ASK_COPY =
  'Good. Put their company names under Never contact on the right, or paste them here, and I’ll keep every one of them out.'
