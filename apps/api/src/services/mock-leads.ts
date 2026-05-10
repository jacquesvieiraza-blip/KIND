import { ApolloContact } from './apollo'

const FIRST_NAMES = [
  'Sipho', 'Thabo', 'Nomvula', 'Lerato', 'Kagiso', 'Zanele', 'Bongani', 'Ayanda',
  'Thandeka', 'Siyanda', 'Mpho', 'Nokuthula', 'Lebogang', 'Nkosi', 'Palesa',
  'James', 'Sarah', 'Michael', 'Emma', 'David', 'Amara', 'Chidi', 'Fatima',
  'Kofi', 'Ama', 'Kwame', 'Abena', 'Emeka', 'Ngozi', 'Yetunde',
]

const LAST_NAMES = [
  'Dlamini', 'Nkosi', 'Mokoena', 'Khumalo', 'Ndlovu', 'Mahlangu', 'Mthembu',
  'Molefe', 'Sithole', 'Mkhize', 'Shabalala', 'Zwane', 'Nxumalo', 'Buthelezi',
  'Okafor', 'Mensah', 'Asante', 'Boateng', 'Diallo', 'Kamara', 'Traoré',
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Davis', 'Miller',
]

const COMPANIES: Record<string, string[]> = {
  'Financial Services': [
    'Apex Capital', 'Meridian Finance', 'Pinnacle Wealth', 'Sentinel Bank',
    'CoreFund', 'NovaTrust', 'BlueSky Financial', 'Atlas Capital',
  ],
  'Retail': [
    'Crest Retail Group', 'Nova Stores', 'Pinnacle Brands', 'Apex Commerce',
    'Meridian Retail', 'Summit Shopping', 'CoreMart', 'BlueLeaf Retail',
  ],
  'Technology': [
    'Apex Tech', 'Nova Systems', 'CoreLogic', 'Meridian Software',
    'Pinnacle Digital', 'BlueSky Tech', 'Atlas Systems', 'Sentinel Tech',
  ],
  'Healthcare': [
    'Apex Health', 'MediCore', 'Pinnacle Health', 'Nova Medical',
    'Meridian Healthcare', 'BlueSky Medical', 'Atlas Health', 'CoreCare',
  ],
  'Manufacturing': [
    'Apex Industries', 'CoreManufacturing', 'Pinnacle Works', 'Nova Industries',
    'Meridian Manufacturing', 'Atlas Works', 'BlueSky Industries', 'Sentinel Manufacturing',
  ],
  'Default': [
    'Apex Group', 'Nova Enterprises', 'Pinnacle Holdings', 'CoreBusiness',
    'Meridian Group', 'Atlas Enterprises', 'BlueSky Holdings', 'Sentinel Group',
  ],
}

const LOCATIONS: Record<string, string> = {
  'Johannesburg': 'South Africa',
  'Cape Town': 'South Africa',
  'Durban': 'South Africa',
  'Pretoria': 'South Africa',
  'Lagos': 'Nigeria',
  'Abuja': 'Nigeria',
  'Nairobi': 'Kenya',
  'Accra': 'Ghana',
  'Kampala': 'Uganda',
  'Dar es Salaam': 'Tanzania',
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function slug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function generateEmail(firstName: string, lastName: string, company: string): string {
  const domains = ['gmail.com', 'outlook.com', `${slug(company)}.com`, `${slug(company)}.co.za`]
  const patterns = [
    `${slug(firstName)}.${slug(lastName)}@${pick(domains)}`,
    `${slug(firstName)[0]}${slug(lastName)}@${pick(domains)}`,
    `${slug(firstName)}@${pick(domains)}`,
  ]
  return pick(patterns)
}

export function generateMockLeads(
  icp: {
    job_titles: string[]
    industries: string[]
    locations: string[]
    company_sizes: string[]
    keywords: string[]
  },
  count: number
): ApolloContact[] {
  const leads: ApolloContact[] = []
  const industry = icp.industries[0] ?? 'Default'
  const companyPool = COMPANIES[industry] ?? COMPANIES['Default']

  const locationPool = icp.locations.length
    ? icp.locations.map((l) => ({ city: l, country: LOCATIONS[l] ?? 'Africa' }))
    : Object.entries(LOCATIONS).map(([city, country]) => ({ city, country }))

  for (let i = 0; i < count; i++) {
    const firstName = pick(FIRST_NAMES)
    const lastName = pick(LAST_NAMES)
    const company = pick(companyPool)
    const jobTitle = pick(icp.job_titles.length ? icp.job_titles : ['Director', 'Manager', 'Head of Operations'])
    const location = pick(locationPool)

    leads.push({
      first_name: firstName,
      last_name: lastName,
      email: generateEmail(firstName, lastName, company),
      title: jobTitle,
      linkedin_url: `https://linkedin.com/in/${slug(firstName)}-${slug(lastName)}-${Math.floor(Math.random() * 9000) + 1000}`,
      organization: { name: company },
      city: location.city,
      country: location.country,
    })
  }

  return leads
}
