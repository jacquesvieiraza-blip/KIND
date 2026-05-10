'use client'

import { useState, useRef } from 'react'
import { File, Download, Upload, Loader2, X, CheckCircle2, AlertCircle } from 'lucide-react'

const ADMIN_API = '/api/admin'

const DOC_TYPE_OPTIONS = [
  { value: 'offer', label: 'Offer Document' },
  { value: 'msa', label: 'Master Service Agreement' },
  { value: 'sla', label: 'SLA' },
  { value: 'playbook', label: 'Agency Playbook' },
  { value: 'service_order', label: 'Service Order' },
  { value: 'other', label: 'Other' },
]

interface Doc {
  id: string
  name: string
  file_path: string
  file_size: number | null
  document_type: string
  uploaded_by: string
  created_at: string
  download_url: string | null
}

function formatBytes(bytes: number | null): string {
  if (!bytes) return ''
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function ClientDocuments({ clientId, initialDocs }: { clientId: string; initialDocs: Doc[] }) {
  const [docs, setDocs] = useState(initialDocs)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [docType, setDocType] = useState('offer')
  const [deleting, setDeleting] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function adminFetch(path: string, options?: RequestInit) {
    const res = await fetch(`${ADMIN_API}${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...options?.headers },
    })
    return res.json()
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setError(null)
    setSuccess(false)

    try {
      // 1. Get signed upload URL
      const urlRes = await adminFetch(`/clients/${clientId}/documents/upload-url`, {
        method: 'POST',
        body: JSON.stringify({ filename: file.name, mime_type: file.type }),
      })

      if (!urlRes.success) throw new Error(urlRes.error || 'Failed to get upload URL')

      // 2. Upload to Supabase Storage directly
      const uploadRes = await fetch(urlRes.data.signed_url, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      })
      if (!uploadRes.ok) throw new Error('Upload failed')

      // 3. Register document
      const regRes = await adminFetch(`/clients/${clientId}/documents`, {
        method: 'POST',
        body: JSON.stringify({
          name: file.name,
          file_path: urlRes.data.path,
          file_size: file.size,
          mime_type: file.type,
          document_type: docType,
        }),
      })

      if (!regRes.success) throw new Error(regRes.error || 'Failed to register document')

      setDocs((prev) => [{ ...regRes.data, download_url: null }, ...prev])
      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    }

    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function handleDelete(doc: Doc) {
    if (!confirm(`Delete "${doc.name}"?`)) return
    setDeleting(doc.id)
    try {
      await adminFetch(`/documents/${doc.id}`, { method: 'DELETE' })
      setDocs((prev) => prev.filter((d) => d.id !== doc.id))
    } catch { /* ignore */ }
    setDeleting(null)
  }

  return (
    <div className="space-y-5">
      {/* Upload */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <h2 className="font-semibold text-gray-900 mb-4">Upload Document for Client</h2>
        <div className="flex items-center gap-3 mb-3">
          <label className="text-sm text-gray-600 font-medium whitespace-nowrap">Document Type</label>
          <select
            value={docType}
            onChange={(e) => setDocType(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {DOC_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div
          className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
          onClick={() => fileRef.current?.click()}
        >
          <Upload className="w-7 h-7 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">Click to upload PDF, Word doc, or image</p>
          <p className="text-xs text-gray-400 mt-1">Max 50 MB</p>
        </div>
        <input ref={fileRef} type="file" className="hidden" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" onChange={handleUpload} />

        {uploading && (
          <div className="flex items-center gap-2 mt-3 text-sm text-blue-600">
            <Loader2 className="w-4 h-4 animate-spin" /> Uploading…
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2 mt-3 text-sm text-green-600">
            <CheckCircle2 className="w-4 h-4" /> Document uploaded successfully
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 mt-3 text-sm text-red-600">
            <AlertCircle className="w-4 h-4" /> {error}
          </div>
        )}
      </div>

      {/* Document list */}
      <div className="bg-white rounded-xl border border-gray-100">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Client Documents ({docs.length})</h2>
        </div>
        {docs.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-10">No documents uploaded yet</p>
        ) : (
          <ul className="divide-y divide-gray-50">
            {docs.map((doc) => (
              <li key={doc.id} className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50">
                <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                  <File className="w-4 h-4 text-blue-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm truncate">{doc.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {DOC_TYPE_OPTIONS.find((o) => o.value === doc.document_type)?.label ?? doc.document_type}
                    {doc.file_size ? ` · ${formatBytes(doc.file_size)}` : ''}
                    {` · ${new Date(doc.created_at).toLocaleDateString('en-ZA')}`}
                    {` · By ${doc.uploaded_by}`}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {doc.download_url && (
                    <a href={doc.download_url} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-blue-50">
                      <Download className="w-3.5 h-3.5" /> Download
                    </a>
                  )}
                  <button onClick={() => handleDelete(doc)} disabled={deleting === doc.id}
                    className="text-gray-300 hover:text-red-500 p-1.5 disabled:opacity-40">
                    {deleting === doc.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
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
