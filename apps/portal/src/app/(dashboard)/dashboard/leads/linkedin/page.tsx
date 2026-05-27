'use client'

import { useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { api } from '@/lib/api'
import {
  Linkedin, Upload, CheckCircle2, AlertCircle, Loader2,
  ArrowRight, X, FileText, Users, ArrowLeft, Info,
  ChevronDown, ShieldCheck,
} from 'lucide-react'
import Link from 'next/link'

// ── Column mapping ─────────────────────────────────────────────────────────────

const LI_AUTO_MAP: Record<string, string> = {
  'first name':           'first_name',
  'last name':            'last_name',
  'email address':        'email',
  'email':                'email',
  'job title':            'job_title',
  'title':                'job_title',
  'current title':        'job_title',
  'company':              'company',
  'company name':         'company',
  'current company':      'company',
  'linkedin member url':  'linkedin_url',
  'linkedin url':         'linkedin_url',
  'profile url':          'linkedin_url',
  'person linkedin url':  'linkedin_url',
  'location':             'country',
  'country':              'country',
  'region':               'country',
  'industry':             'industry',
  'phone':                'phone',
  'phone number':         'phone',
  'mobile phone':         'phone',
  'number of employees':  'company_size',
  'company size':         'company_size',
}

const LEAD_FIELDS = [
  { key: 'first_name',    label: 'First name' },
  { key: 'last_name',     label: 'Last name' },
  { key: 'email',         label: 'Email address' },
  { key: 'job_title',     label: 'Job title' },
  { key: 'company',       label: 'Company name' },
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

// ── Step indicator ─────────────────────────────────────────────────────────────

function Step({ n, label, active, done }: { n: number; label: string; active: boolean; done: boolean }) {
  return (
    <div className={`flex items-center gap-2 ${active ? 'text-gray-900' : done ? 'text-green-600' : 'text-gray-400'}`}>
      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
        done ? 'bg-green-100 text-green-600' : active ? 'bg-[#0066FF] text-white' : 'bg-gray-100 text-gray-400'
      }`}>
        {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : n}
      </div>
      <span className="text-sm font-medium hidden sm:block">{label}</span>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────

type PageStep = 'upload' | 'map' | 'preview' | 'importing' | 'done'

interface ImportResult {
  created: number
  skipped: number
  errors: number
}

export default function LinkedInImportPage() {
  const supabase = createClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState<PageStep>('upload')
  const [dragging, setDragging] = useState(false)

  // CSV data
  const [fileName, setFileName]   = useState('')
  const [headers, setHeaders]     = useState<string[]>([])
  const [rows, setRows]           = useState<Record<string, string>[]>([])
  const [mapping, setMapping]     = useState<Record<string, string>>({})

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
      setHeaders(headers)
      setRows(rows)
      setMapping(autoMap(headers))
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

  // ── Import ────────────────────────────────────────────────────────────────

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

  const mappedCount = Object.values(mapping).filter(v => v && v !== '--ignore--').length
  const previewLeads = buildLeads()

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link href="/dashboard/leads" className="text-gray-400 hover:text-gray-600 transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <Linkedin className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">LinkedIn CSV Import</h1>
          </div>
          <p className="text-sm text-gray-500 ml-11">
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
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-5">
            <div className="flex items-start gap-3">
              <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-blue-900 mb-2">How to export from LinkedIn Sales Navigator</p>
                <ol className="text-xs text-blue-700 space-y-1 list-decimal list-inside">
                  <li>Go to Sales Navigator → Lists → Lead lists</li>
                  <li>Select your list → click <strong>Export</strong> in the top-right</li>
                  <li>Choose <strong>Export to CSV</strong></li>
                  <li>Download and upload the file below</li>
                </ol>
                <p className="text-xs text-blue-600 mt-2">
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
              dragging ? 'border-[#0066FF] bg-blue-50' : 'border-gray-200 bg-gray-50 hover:border-[#0066FF]/50 hover:bg-blue-50/30'
            }`}
          >
            <div className="w-14 h-14 rounded-2xl bg-blue-100 flex items-center justify-center">
              <Upload className="w-7 h-7 text-[#0066FF]" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-gray-800">Drag & drop your CSV file here</p>
              <p className="text-xs text-gray-400 mt-1">or click to browse</p>
            </div>
            <p className="text-xs text-gray-400 bg-white border border-gray-200 px-3 py-1.5 rounded-full">
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
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold text-gray-900">Column mapping</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  <span className="font-medium text-blue-600">{fileName}</span>
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
                    <p className="text-[10px] text-gray-400 truncate">{rows[0]?.[header] || '—'}</p>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                  <div className="relative flex-1">
                    <select
                      value={mapping[header] ?? '--ignore--'}
                      onChange={e => setMapping(m => ({ ...m, [header]: e.target.value }))}
                      className="w-full appearance-none border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white pr-7"
                    >
                      {LEAD_FIELDS.map(f => (
                        <option key={f.key} value={f.key}>{f.label}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
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
              className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg transition-colors"
            >
              ← Back
            </button>
            <button
              onClick={() => setStep('preview')}
              disabled={mappedCount === 0}
              className="px-5 py-2.5 bg-[#0066FF] hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors flex items-center gap-2"
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
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-gray-900">Import preview</h2>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">{previewLeads.length} leads ready to import</span>
              </div>
            </div>

            {/* Field coverage */}
            <div className="grid grid-cols-3 gap-3 mb-5">
              {[
                { label: 'With email',    count: previewLeads.filter(l => l.email).length },
                { label: 'With LinkedIn', count: previewLeads.filter(l => l.linkedin_url).length },
                { label: 'With company',  count: previewLeads.filter(l => l.company).length },
              ].map(({ label, count }) => (
                <div key={label} className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-gray-900">{count}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            {/* Preview table */}
            <div className="overflow-x-auto rounded-xl border border-gray-100">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    {['Name', 'Job Title', 'Company', 'Email', 'LinkedIn'].map(h => (
                      <th key={h} className="px-3 py-2.5 text-left text-gray-500 font-semibold uppercase tracking-wide">
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
                      <td className="px-3 py-2.5 text-gray-500 truncate max-w-36">{l.email || '—'}</td>
                      <td className="px-3 py-2.5">
                        {l.linkedin_url
                          ? <a href={l.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">View ↗</a>
                          : <span className="text-gray-300">—</span>
                        }
                      </td>
                    </tr>
                  ))}
                  {previewLeads.length > 8 && (
                    <tr>
                      <td colSpan={5} className="px-3 py-2.5 text-center text-gray-400 italic">
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
              className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg transition-colors disabled:opacity-40"
            >
              ← Back
            </button>
            <button
              onClick={handleImport}
              disabled={step === 'importing' || previewLeads.length === 0}
              className="px-6 py-2.5 bg-[#0066FF] hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-colors flex items-center gap-2"
            >
              {step === 'importing'
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Importing {previewLeads.length} leads…</>
                : <><Upload className="w-4 h-4" /> Import {previewLeads.length} leads</>
              }
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 4: Done ───────────────────────────────────────────────────── */}
      {step === 'done' && result && (
        <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Import complete!</h2>
          <p className="text-gray-500 text-sm mb-6">
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
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-2xl font-bold text-gray-700">{result.errors}</p>
              <p className="text-xs text-gray-500 mt-0.5">Errors</p>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3">
            <Link
              href="/dashboard/leads"
              className="flex items-center gap-2 px-5 py-2.5 bg-[#0066FF] hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors"
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
              className="px-5 py-2.5 border border-gray-200 hover:border-gray-400 text-gray-700 text-sm font-medium rounded-xl transition-colors"
            >
              Import another file
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
