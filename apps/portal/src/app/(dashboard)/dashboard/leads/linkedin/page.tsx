'use client'

import { useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { api } from '@/lib/api'
import {
  Linkedin, Upload, CheckCircle2, AlertCircle, Loader2,
  ArrowRight, FileText, Users, ArrowLeft, Info,
  ChevronDown, ShieldCheck, Sparkles, Map,
} from 'lucide-react'
import Link from 'next/link'

// ── Column mapping ─────────────────────────────────────────────────────────────

const LI_AUTO_MAP: Record<string, string> = {
  // ── Person: name
  'first name':                     'first_name',
  'first_name':                     'first_name',
  'firstname':                      'first_name',
  'given name':                     'first_name',
  'last name':                      'last_name',
  'last_name':                      'last_name',
  'lastname':                       'last_name',
  'surname':                        'last_name',
  'family name':                    'last_name',
  // ── Person: contact
  'email address':                  'email',
  'email':                          'email',
  'work email':                     'email',
  'business email':                 'email',
  'corporate email':                'email',
  'phone':                          'phone',
  'phone number':                   'phone',
  'mobile phone':                   'phone',
  'direct phone':                   'phone',
  'work phone':                     'phone',
  'mobile':                         'phone',
  'company hq phone':               'phone',
  // ── Person: title / seniority
  'job title':                      'job_title',
  'title':                          'job_title',
  'current title':                  'job_title',
  'position':                       'job_title',
  'role':                           'job_title',
  'designation':                    'job_title',
  'seniority':                      'seniority',
  'seniority level':                'seniority',
  'management level':               'seniority',
  // ── Company
  'company':                        'company',
  'company name':                   'company',
  'current company':                'company',
  'organization':                   'company',
  'organization name':              'company',
  'account name':                   'company',
  'employer':                       'company',
  // ── LinkedIn / social
  'linkedin member url':            'linkedin_url',
  'linkedin url':                   'linkedin_url',
  'profile url':                    'linkedin_url',
  'person linkedin url':            'linkedin_url',
  'linkedin profile url':           'linkedin_url',
  'linkedin':                       'linkedin_url',
  'li profile url':                 'linkedin_url',
  // ── Location
  'location':                       'country',
  'country':                        'country',
  'region':                         'country',
  'country/region':                 'country',
  'geography':                      'country',
  'headquarters location':          'country',
  'hq location':                    'country',
  'hq country':                     'country',
  'city':                           'country',
  // ── Industry
  'industry':                       'industry',
  'primary industry':               'industry',
  'industry vertical':              'industry',
  'sector':                         'industry',
  'company industry':               'industry',
  'industries':                     'industry',
  // ── Company size
  'number of employees':            'company_size',
  'company size':                   'company_size',
  'employees':                      'company_size',
  'employee count':                 'company_size',
  'employee range':                 'company_size',
  'employees range':                'company_size',
  'headcount':                      'company_size',
  'headcount range':                'company_size',
  'company headcount':              'company_size',
  'company headcount range':        'company_size',
  '# employees':                    'company_size',
  'num employees':                  'company_size',
  'estimated number of employees':  'company_size',
}

const LEAD_FIELDS = [
  { key: 'first_name',    label: 'First name' },
  { key: 'last_name',     label: 'Last name' },
  { key: 'email',         label: 'Email address' },
  { key: 'job_title',     label: 'Job title' },
  { key: 'seniority',     label: 'Seniority level' },
  { key: 'company',       label: 'Company name' },
  { key: 'company_size',  label: 'Company size' },
  { key: 'linkedin_url',  label: 'LinkedIn URL' },
  { key: 'country',       label: 'Country / Location' },
  { key: 'industry',      label: 'Industry' },
  { key: 'phone',         label: 'Phone number' },
  { key: '--ignore--',    label: '— Ignore this column —' },
]

// ── CSV parser ─────────────────────────────────────────────────────────────────

function parseCSV(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim().split('\n')
  if (!lines.length) return { headers: [], rows: [] }

  function parseRow(line: string): string[] {
    const cells: string[] = []
    let inQuotes = false
    let cell = ''
    for (let i = 0; i < line.length; i++) {
      const c = line[i]
      if (c === '"') {
        if (inQuotes && line[i + 1] === '"') { cell += '"'; i++ }
        else inQuotes = !inQuotes
      } else if (c === ',' && !inQuotes) {
        cells.push(cell.trim())
        cell = ''
      } else {
        cell += c
      }
    }
    cells.push(cell.trim())
    return cells
  }

  const headers = parseRow(lines[0])
  const rows = lines.slice(1).filter(l => l.trim()).map(line => {
    const cells = parseRow(line)
    return Object.fromEntries(headers.map((h, i) => [h, cells[i] ?? '']))
  })

  return { headers, rows }
}

function autoMap(headers: string[]): Record<string, string> {
  const map: Record<string, string> = {}
  for (const h of headers) {
    const norm = h.toLowerCase().trim()
    const mapped = LI_AUTO_MAP[norm]
    if (mapped) map[h] = mapped
    else map[h] = '--ignore--'
  }
  return map
}

// Returns true when the CSV looks like a company/account list with no contact columns
function isCompanyList(headers: string[]): boolean {
  const norms = headers.map(h => h.toLowerCase().trim())
  const hasContact = norms.some(h =>
    h.includes('first name') || h.includes('first_name') || h === 'firstname' ||
    h.includes('email') || h.includes('linkedin member') || h.includes('person linkedin')
  )
  const hasCompany = norms.some(h =>
    h.includes('company') || h.includes('organization') || h.includes('account name')
  )
  return !hasContact && hasCompany
}

// Extract sample values for a column from the first 50 rows
function sampleValues(rows: Record<string, string>[], header: string): string[] {
  return [...new Set(
    rows.slice(0, 50).map(r => r[header]).filter(Boolean)
  )].slice(0, 10)
}

// Build ICP query params from company-level CSV data
function buildIcpParams(
  headers: string[],
  mapping: Record<string, string>,
  rows: Record<string, string>[]
): string {
  const params = new URLSearchParams()
  for (const [header, field] of Object.entries(mapping)) {
    if (field === 'industry' || field === 'company_size') {
      const vals = sampleValues(rows, header)
      if (vals.length) params.set(field, vals.slice(0, 5).join(','))
    }
  }
  params.set('source', 'csv_import')
  return params.toString()
}

// ── Step indicator ─────────────────────────────────────────────────────────────

function Step({ n, label, active, done }: { n: number; label: string; active: boolean; done: boolean }) {
  return (
    <div className={`flex items-center gap-2 ${active ? 'text-gray-900' : done ? 'text-green-600' : 'text-[#9B8EC4]'}`}>
      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
        done ? 'bg-green-100 text-green-600' : active ? 'bg-[#7C3AED] text-white' : 'bg-gray-100 text-[#9B8EC4]'
      }`}>
        {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : n}
      </div>
      <span className="text-sm font-medium hidden sm:block">{label}</span>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────

type PageStep = 'upload' | 'map' | 'preview' | 'importing' | 'done' | 'finding' | 'found'

interface ImportResult {
  created: number
  skipped: number
  errors?: number
  total_found?: number
}

export default function LinkedInImportPage() {
  const supabase = createClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState<PageStep>('upload')
  const [dragging, setDragging] = useState(false)

  // CSV data
  const [fileName, setFileName]     = useState('')
  const [headers, setHeaders]       = useState<string[]>([])
  const [rows, setRows]             = useState<Record<string, string>[]>([])
  const [mapping, setMapping]       = useState<Record<string, string>>({})
  const [isAcctList, setIsAcctList] = useState(false)

  // Import result
  const [result, setResult]       = useState<ImportResult | null>(null)
  const [importError, setImportError] = useState<string | null>(null)

  // ── File handling ─────────────────────────────────────────────────────────

  function handleFile(file: File) {
    if (!file.name.endsWith('.csv')) {
      alert('Please upload a CSV file (.csv)')
      return
    }
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = e => {
      const text = e.target?.result as string
      const { headers, rows } = parseCSV(text)
      if (!headers.length) { alert('Could not parse CSV — check the file format.'); return }
      const mapped = autoMap(headers)
      setHeaders(headers)
      setRows(rows)
      setMapping(mapped)
      setIsAcctList(isCompanyList(headers))
      setStep('map')
    }
    reader.readAsText(file)
  }

  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [])

  // ── Build preview data ────────────────────────────────────────────────────

  function buildLeads() {
    return rows.map(row => {
      const lead: Record<string, string> = {}
      for (const [header, field] of Object.entries(mapping)) {
        if (field && field !== '--ignore--' && row[header]) {
          lead[field] = row[header]
        }
      }
      return lead
    }).filter(l => l.first_name || l.last_name || l.email || l.linkedin_url)
  }

  // ── Import contacts CSV ───────────────────────────────────────────────────

  async function handleImport() {
    setStep('importing')
    setImportError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')
      const leads = buildLeads()
      const res = await api.post<{ data: ImportResult }>('/leads/import/linkedin', { leads }, session.access_token)
      setResult(res.data)
      setStep('done')
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Import failed — please try again.')
      setStep('preview')
    }
  }

  // ── Find contacts at companies (company/account list) ─────────────────────

  async function handleFindAtCompanies() {
    setStep('finding')
    setImportError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      // Extract company names from the mapped column
      const companyHeader = Object.entries(mapping).find(([, v]) => v === 'company')?.[0]
      const companies = companyHeader
        ? [...new Set(rows.map(r => r[companyHeader]).filter(Boolean))].slice(0, 100)
        : []

      if (!companies.length) {
        setImportError('No company names found in the mapped column.')
        setStep('map')
        return
      }

      const res = await api.post<{ data: ImportResult }>(
        '/leads/find-at-companies',
        { companies, limit: 100 },
        session.access_token,
      )
      setResult(res.data)
      setStep('found')
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Search failed — please try again.')
      setStep('map')
    }
  }

  const mappedCount = Object.values(mapping).filter(v => v && v !== '--ignore--').length
  const previewLeads = buildLeads()

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link href="/dashboard/leads" className="text-[#9B8EC4] hover:text-gray-600 transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="w-8 h-8 rounded-lg bg-[#7C3AED] flex items-center justify-center">
              <Linkedin className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">LinkedIn CSV Import</h1>
          </div>
          <p className="text-sm text-[#7B6FA0] ml-11">
            Import leads from LinkedIn Sales Navigator exports — AI-scored and ready for FIGSY.
          </p>
        </div>
      </div>

      {/* Step bar */}
      <div className="flex items-center gap-3">
        <Step n={1} label="Upload file"     active={step === 'upload'}   done={['map','preview','importing','done'].includes(step)} />
        <div className="flex-1 h-px bg-gray-200" />
        <Step n={2} label="Map columns"     active={step === 'map'}      done={['preview','importing','done'].includes(step)} />
        <div className="flex-1 h-px bg-gray-200" />
        <Step n={3} label="Review & import" active={['preview','importing'].includes(step)} done={step === 'done'} />
      </div>

      {/* ── STEP 1: Upload ─────────────────────────────────────────────────── */}
      {step === 'upload' && (
        <div className="space-y-4">
          {/* Instructions */}
          <div className="bg-[#F5F0FF] border border-purple-100 rounded-xl p-5">
            <div className="flex items-start gap-3">
              <Info className="w-4 h-4 text-[#7C3AED] shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-blue-900 mb-2">How to export from LinkedIn Sales Navigator</p>
                <ol className="text-xs text-[#6D28D9] space-y-1 list-decimal list-inside">
                  <li>Go to Sales Navigator → Lists → Lead lists</li>
                  <li>Select your list → click <strong>Export</strong> in the top-right</li>
                  <li>Choose <strong>Export to CSV</strong></li>
                  <li>Download and upload the file below</li>
                </ol>
                <p className="text-xs text-[#7C3AED] mt-2">
                  Don&apos;t have Sales Navigator?{' '}
                  <a href="https://www.linkedin.com/sales" target="_blank" rel="noopener noreferrer" className="underline font-medium">
                    Get started →
                  </a>
                </p>
              </div>
            </div>
          </div>

          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => fileRef.current?.click()}
            className={`cursor-pointer rounded-2xl border-2 border-dashed transition-all py-16 flex flex-col items-center justify-center gap-4 ${
              dragging ? 'border-[#7C3AED] bg-[#F5F0FF]' : 'border-purple-100/80 bg-gray-50 hover:border-[#7C3AED]/50 hover:bg-[#F5F0FF]/30'
            }`}
          >
            <div className="w-14 h-14 rounded-2xl bg-blue-100 flex items-center justify-center">
              <Upload className="w-7 h-7 text-[#7C3AED]" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-gray-800">Drag & drop your CSV file here</p>
              <p className="text-xs text-[#9B8EC4] mt-1">or click to browse</p>
            </div>
            <p className="text-xs text-[#9B8EC4] bg-white border border-purple-100/80 px-3 py-1.5 rounded-full">
              LinkedIn Sales Navigator export (.csv)
            </p>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
          />

          {/* POPIA notice */}
          <div className="flex items-start gap-3 px-4 py-3 bg-green-50 border border-green-100 rounded-xl">
            <ShieldCheck className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
            <p className="text-xs text-green-700">
              <span className="font-semibold">POPIA & GDPR note:</span> Only import leads you have a lawful basis to contact.
              LinkedIn connections and publicly visible profiles qualify under legitimate interest. All leads will be marked
              for manual consent review before any outreach is sent.
            </p>
          </div>
        </div>
      )}

      {/* ── STEP 2: Map columns ────────────────────────────────────────────── */}
      {step === 'map' && (
        <div className="space-y-4">
          {/* Company / account-list detected */}
          {isAcctList && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
              <div className="flex items-start gap-3 mb-3">
                <Sparkles className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-amber-800">This looks like a company / account list</p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    {rows.length} companies detected. FIGSY can search Apollo for real decision-makers at these exact companies and import them as scored leads — ready for outreach.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={handleFindAtCompanies}
                  className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-lg transition-colors"
                >
                  <Users className="w-3.5 h-3.5" /> Find contacts at these {rows.length} companies
                </button>
                <Link
                  href={`/dashboard/leads/icp?${buildIcpParams(headers, mapping, rows)}`}
                  className="flex items-center gap-1.5 px-4 py-2 bg-white border border-amber-300 text-amber-700 text-xs font-semibold rounded-lg transition-colors hover:bg-amber-50"
                >
                  <Map className="w-3.5 h-3.5" /> Pre-fill ICP instead
                </Link>
              </div>
            </div>
          )}

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-purple-100/60 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold text-gray-900">Column mapping</h2>
                <p className="text-xs text-[#9B8EC4] mt-0.5">
                  <span className="font-medium text-[#7C3AED]">{fileName}</span>
                  {' — '}{rows.length} rows detected
                </p>
              </div>
              <span className="text-xs bg-green-100 text-green-700 font-semibold px-3 py-1 rounded-full">
                {mappedCount} columns matched
              </span>
            </div>

            <div className="space-y-2">
              {headers.map(header => (
                <div key={header} className="flex items-center gap-3">
                  <div className="w-44 shrink-0">
                    <p className="text-xs font-medium text-gray-700 truncate" title={header}>{header}</p>
                    <p className="text-[10px] text-[#9B8EC4] truncate">{rows[0]?.[header] || '—'}</p>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                  <div className="relative flex-1">
                    <select
                      value={mapping[header] ?? '--ignore--'}
                      onChange={e => setMapping(m => ({ ...m, [header]: e.target.value }))}
                      className="w-full appearance-none border border-purple-100/80 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white pr-7"
                    >
                      {LEAD_FIELDS.map(f => (
                        <option key={f.key} value={f.key}>{f.label}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[#9B8EC4] pointer-events-none" />
                  </div>
                  {mapping[header] && mapping[header] !== '--ignore--' && (
                    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <button
              onClick={() => setStep('upload')}
              className="px-4 py-2 text-sm text-[#7B6FA0] hover:text-gray-700 border border-purple-100/80 rounded-lg transition-colors"
            >
              ← Back
            </button>
            <button
              onClick={() => setStep('preview')}
              disabled={mappedCount === 0}
              className="px-5 py-2.5 bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors flex items-center gap-2"
            >
              Review {previewLeads.length} leads <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 3: Preview & import ───────────────────────────────────────── */}
      {(step === 'preview' || step === 'importing') && (
        <div className="space-y-4">
          {importError && (
            <div className="flex items-start gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{importError}</p>
            </div>
          )}

          {/* Summary */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-purple-100/60 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-gray-900">Import preview</h2>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#7B6FA0]">{previewLeads.length} leads ready to import</span>
              </div>
            </div>

            {/* Field coverage */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
              {[
                { label: 'With email',    count: previewLeads.filter(l => l.email).length },
                { label: 'With LinkedIn', count: previewLeads.filter(l => l.linkedin_url).length },
                { label: 'With company',  count: previewLeads.filter(l => l.company).length },
              ].map(({ label, count }) => (
                <div key={label} className="bg-[#F5EEFF]/60 rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-gray-900">{count}</p>
                  <p className="text-xs text-[#7B6FA0] mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            {/* Preview table */}
            <div className="overflow-x-auto rounded-xl border border-purple-100/60">
              <table className="w-full text-xs min-w-[560px]">
                <thead>
                  <tr className="border-b border-purple-100/60 bg-gray-50">
                    {['Name', 'Job Title', 'Company', 'Email', 'LinkedIn'].map(h => (
                      <th key={h} className="px-3 py-2.5 text-left text-[#7B6FA0] font-semibold uppercase tracking-wide">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {previewLeads.slice(0, 8).map((l, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-3 py-2.5 font-medium text-gray-800">
                        {[l.first_name, l.last_name].filter(Boolean).join(' ') || '—'}
                      </td>
                      <td className="px-3 py-2.5 text-gray-600 truncate max-w-32">{l.job_title || '—'}</td>
                      <td className="px-3 py-2.5 text-gray-600">{l.company || '—'}</td>
                      <td className="px-3 py-2.5 text-[#7B6FA0] truncate max-w-36">{l.email || '—'}</td>
                      <td className="px-3 py-2.5">
                        {l.linkedin_url
                          ? <a href={l.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-purple-500 hover:underline">View ↗</a>
                          : <span className="text-gray-300">—</span>
                        }
                      </td>
                    </tr>
                  ))}
                  {previewLeads.length > 8 && (
                    <tr>
                      <td colSpan={5} className="px-3 py-2.5 text-center text-[#9B8EC4] italic">
                        + {previewLeads.length - 8} more leads…
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Consent notice */}
            <div className="flex items-start gap-2 mt-4 text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2.5">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>
                Imported leads will be added with status <strong>Pending Review</strong>. FIGSY will not contact them until you
                mark them as Consented. You remain responsible for ensuring a lawful basis to contact.
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <button
              onClick={() => setStep('map')}
              disabled={step === 'importing'}
              className="px-4 py-2 text-sm text-[#7B6FA0] hover:text-gray-700 border border-purple-100/80 rounded-lg transition-colors disabled:opacity-40"
            >
              ← Back
            </button>
            <button
              onClick={handleImport}
              disabled={step === 'importing' || previewLeads.length === 0}
              className="px-6 py-2.5 bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-colors flex items-center gap-2"
            >
              {step === 'importing'
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Importing {previewLeads.length} leads…</>
                : <><Upload className="w-4 h-4" /> Import {previewLeads.length} leads</>
              }
            </button>
          </div>
        </div>
      )}

      {/* ── Finding contacts ──────────────────────────────────────────────── */}
      {step === 'finding' && (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-purple-100/60 p-12 text-center">
          <Loader2 className="w-10 h-10 text-[#7C3AED] animate-spin mx-auto mb-4" />
          <p className="text-base font-semibold text-gray-900 mb-1">Searching Apollo for contacts…</p>
          <p className="text-sm text-[#7B6FA0]">Finding decision-makers at your target companies. This takes a few seconds.</p>
        </div>
      )}

      {/* ── Found contacts (company list result) ──────────────────────────── */}
      {step === 'found' && result && (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-purple-100/60 p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Contacts found and imported!</h2>
          <p className="text-[#7B6FA0] text-sm mb-6">
            FIGSY found {result.total_found ?? result.created} contacts at your target companies and is scoring them now.
          </p>
          <div className="grid grid-cols-2 gap-4 max-w-xs mx-auto mb-8">
            <div className="bg-green-50 rounded-xl p-4">
              <p className="text-2xl font-bold text-green-700">{result.created}</p>
              <p className="text-xs text-green-600 mt-0.5">Imported</p>
            </div>
            <div className="bg-amber-50 rounded-xl p-4">
              <p className="text-2xl font-bold text-amber-700">{result.skipped}</p>
              <p className="text-xs text-amber-600 mt-0.5">Already in system</p>
            </div>
          </div>
          <div className="flex items-center justify-center gap-3">
            <Link href="/dashboard/leads" className="flex items-center gap-2 px-5 py-2.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-sm font-semibold rounded-xl transition-colors">
              <Users className="w-4 h-4" /> View leads
            </Link>
            <button onClick={() => { setStep('upload'); setFileName(''); setHeaders([]); setRows([]); setMapping({}); setResult(null) }}
              className="px-5 py-2.5 border border-purple-100/80 hover:border-gray-400 text-gray-700 text-sm font-medium rounded-xl transition-colors">
              Import another file
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 4: Done ───────────────────────────────────────────────────── */}
      {step === 'done' && result && (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-purple-100/60 p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Import complete!</h2>
          <p className="text-[#7B6FA0] text-sm mb-6">
            Your LinkedIn leads are now in the system and being AI-scored.
          </p>

          <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto mb-8">
            <div className="bg-green-50 rounded-xl p-4">
              <p className="text-2xl font-bold text-green-700">{result.created}</p>
              <p className="text-xs text-green-600 mt-0.5">Imported</p>
            </div>
            <div className="bg-amber-50 rounded-xl p-4">
              <p className="text-2xl font-bold text-amber-700">{result.skipped}</p>
              <p className="text-xs text-amber-600 mt-0.5">Skipped (dups)</p>
            </div>
            <div className="bg-[#F5EEFF]/60 rounded-xl p-4">
              <p className="text-2xl font-bold text-gray-700">{result.errors}</p>
              <p className="text-xs text-[#7B6FA0] mt-0.5">Errors</p>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3">
            <Link
              href="/dashboard/leads"
              className="flex items-center gap-2 px-5 py-2.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-sm font-semibold rounded-xl transition-colors"
            >
              <Users className="w-4 h-4" /> View leads
            </Link>
            <button
              onClick={() => {
                setStep('upload')
                setFileName('')
                setHeaders([])
                setRows([])
                setMapping({})
                setResult(null)
              }}
              className="px-5 py-2.5 border border-purple-100/80 hover:border-gray-400 text-gray-700 text-sm font-medium rounded-xl transition-colors"
            >
              Import another file
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
