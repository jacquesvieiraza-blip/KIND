'use client'

import { useState, useEffect, useRef } from 'react'
import { File, Upload, Trash2, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'

const API_URL = '/api/admin'

const DOC_TYPE_OPTIONS = [
  { value: 'msa', label: 'Master Services Agreement' },
  { value: 'offer', label: 'Offer Document' },
  { value: 'sla', label: 'Chatbot SLA (Exhibit A)' },
  { value: 'service_order', label: 'Service Order (Exhibit B)' },
  { value: 'popia', label: 'POPIA Compliant Process' },
  { value: 'other', label: 'Other' },
]

interface TermsDoc {
  id: string
  name: string
  document_type: string
  version: string
  active: boolean
  file_size: number | null
  created_at: string
  download_url: string | null
}

function formatBytes(bytes: number | null): string {
  if (!bytes) return ''
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function TermsLibrary() {
  const [docs, setDocs] = useState<TermsDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [docType, setDocType] = useState('msa')
  const [version, setVersion] = useState('1.0')
  const [uploadError, setUploadError] = useState('')
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function fetchDocs() {
    try {
      const res = await fetch(`${API_URL}/terms`)
      const data = await res.json() as { data: TermsDoc[] }
      setDocs(data.data ?? [])
    } catch { /* ignore */ }
    setLoading(false)
  }

  useEffect(() => { fetchDocs() }, [])

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setUploadError('')
    setUploadSuccess(false)

    try {
      // 1. Get signed upload URL
      const urlRes = await fetch(`${API_URL}/terms/upload-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name }),
      })
      const urlData = await urlRes.json() as { data: { signed_url: string; path: string } }

      // 2. Upload directly to Supabase Storage
      const uploadRes = await fetch(urlData.data.signed_url, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      })
      if (!uploadRes.ok) throw new Error('Upload failed')

      // 3. Register the document
      const regRes = await fetch(`${API_URL}/terms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: file.name.replace(/\.[^.]+$/, '').replace(/_/g, ' '),
          document_type: docType,
          file_path: urlData.data.path,
          file_size: file.size,
          version,
        }),
      })
      if (!regRes.ok) throw new Error('Registration failed')

      setUploadSuccess(true)
      fetchDocs()
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return
    try {
      await fetch(`${API_URL}/terms/${id}`, { method: 'DELETE' })
      setDocs((prev) => prev.filter((d) => d.id !== id))
    } catch { /* ignore */ }
  }

  return (
    <div className="space-y-6">
      {/* Upload panel */}
      <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Upload a Terms Document</h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Document type</label>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white"
            >
              {DOC_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Version</label>
            <input
              type="text"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              placeholder="1.0"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
          </div>
        </div>

        <div
          className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center cursor-pointer hover:border-brand-400 hover:bg-brand-50 transition-colors"
          onClick={() => fileRef.current?.click()}
        >
          <Upload className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">Click to upload a PDF</p>
          <p className="text-xs text-gray-400 mt-1">Max 50 MB</p>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={handleUpload}
        />

        {uploading && (
          <div className="flex items-center gap-2 text-sm text-blue-600">
            <Loader2 className="w-4 h-4 animate-spin" />
            Uploading…
          </div>
        )}
        {uploadSuccess && (
          <div className="flex items-center gap-2 text-sm text-green-600">
            <CheckCircle2 className="w-4 h-4" />
            Document uploaded and added to the library.
          </div>
        )}
        {uploadError && (
          <div className="flex items-center gap-2 text-sm text-red-600">
            <AlertCircle className="w-4 h-4" />
            {uploadError}
          </div>
        )}
      </div>

      {/* Library */}
      <div className="bg-white rounded-xl border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Terms Library ({docs.length})</h2>
          <p className="text-xs text-gray-400 mt-0.5">All documents here appear in the T&amp;C viewer on every Order Form.</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-5 h-5 animate-spin text-brand-500" />
          </div>
        ) : docs.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <File className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No terms documents yet.</p>
            <p className="text-xs mt-1">Upload your 5 agreement PDFs above.</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-50">
            {docs.map((doc) => (
              <li key={doc.id} className="flex items-center gap-4 px-6 py-4">
                <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center shrink-0">
                  <File className="w-5 h-5 text-brand-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{doc.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {DOC_TYPE_OPTIONS.find((o) => o.value === doc.document_type)?.label ?? doc.document_type}
                    {` · v${doc.version}`}
                    {doc.file_size ? ` · ${formatBytes(doc.file_size)}` : ''}
                    {` · ${new Date(doc.created_at).toLocaleDateString('en-ZA')}`}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {doc.download_url && (
                    <a
                      href={doc.download_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-brand-600 hover:text-brand-700 font-medium px-3 py-1.5 rounded-lg hover:bg-brand-50 transition-colors"
                    >
                      View
                    </a>
                  )}
                  <button
                    onClick={() => handleDelete(doc.id, doc.name)}
                    className="text-gray-300 hover:text-red-500 transition-colors p-1.5"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
