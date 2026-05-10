'use client'

import { useState, useEffect, useRef } from 'react'
import { api } from '@/lib/api'
import {
  FileText, Download, Loader2, Upload, X, CheckCircle2, AlertCircle, File,
} from 'lucide-react'

const DOC_TYPE_LABELS: Record<string, string> = {
  offer: 'Offer Document',
  msa: 'Master Service Agreement',
  sla: 'SLA',
  playbook: 'Agency Playbook',
  service_order: 'Service Order',
  other: 'Document',
}

interface Document {
  id: string
  name: string
  file_path: string
  file_size: number | null
  mime_type: string | null
  document_type: string
  uploaded_by: string
  created_at: string
  download_url: string | null
}

function formatBytes(bytes: number | null): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function DocumentsClient({ token }: { token: string }) {
  const [docs, setDocs] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function fetchDocs() {
    try {
      const res = await api.get<{ data: Document[] }>('/documents', token)
      setDocs(res.data ?? [])
    } catch { /* ignore */ }
    setLoading(false)
  }

  useEffect(() => { fetchDocs() }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setUploadError(null)
    setUploadSuccess(false)

    try {
      // 1. Get signed upload URL
      const urlRes = await api.post<{ data: { signed_url: string; path: string } }>(
        '/documents/upload-url',
        { filename: file.name, mime_type: file.type },
        token
      )

      // 2. Upload directly to Supabase Storage
      const uploadRes = await fetch(urlRes.data.signed_url, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      })

      if (!uploadRes.ok) throw new Error('Upload failed')

      // 3. Register the document
      await api.post('/documents', {
        name: file.name,
        file_path: urlRes.data.path,
        file_size: file.size,
        mime_type: file.type,
        document_type: 'other',
      }, token)

      setUploadSuccess(true)
      fetchDocs()
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed')
    }

    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this document?')) return
    try {
      await api.delete(`/documents/${id}`, token)
      setDocs((prev) => prev.filter((d) => d.id !== id))
    } catch { /* ignore */ }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Upload section */}
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Upload a Document</h2>
        </div>
        <div
          className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center cursor-pointer hover:border-brand-400 hover:bg-brand-50 transition-colors"
          onClick={() => fileRef.current?.click()}
        >
          <Upload className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">Click to upload a PDF, Word doc, or image</p>
          <p className="text-xs text-gray-400 mt-1">Max 50 MB</p>
        </div>
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
          onChange={handleUpload}
        />

        {uploading && (
          <div className="flex items-center gap-2 mt-3 text-sm text-blue-600">
            <Loader2 className="w-4 h-4 animate-spin" />
            Uploading…
          </div>
        )}
        {uploadSuccess && (
          <div className="flex items-center gap-2 mt-3 text-sm text-green-600">
            <CheckCircle2 className="w-4 h-4" />
            Document uploaded successfully
          </div>
        )}
        {uploadError && (
          <div className="flex items-center gap-2 mt-3 text-sm text-red-600">
            <AlertCircle className="w-4 h-4" />
            {uploadError}
          </div>
        )}
      </div>

      {/* Documents list */}
      <div className="bg-white rounded-xl border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Your Documents</h2>
        </div>

        {docs.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No documents yet.</p>
            <p className="text-xs mt-1">Your K.I.N.D team will upload your agreement documents here.</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-50">
            {docs.map((doc) => (
              <li key={doc.id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors">
                <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center shrink-0">
                  <File className="w-5 h-5 text-brand-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{doc.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {DOC_TYPE_LABELS[doc.document_type] ?? 'Document'}
                    {doc.file_size ? ` · ${formatBytes(doc.file_size)}` : ''}
                    {` · ${new Date(doc.created_at).toLocaleDateString('en-ZA')}`}
                    {doc.uploaded_by === 'admin' ? ' · From K.I.N.D' : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {doc.download_url && (
                    <a
                      href={doc.download_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:text-brand-700 px-3 py-1.5 rounded-lg hover:bg-brand-50 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download
                    </a>
                  )}
                  {doc.uploaded_by === 'client' && (
                    <button
                      onClick={() => handleDelete(doc.id)}
                      className="text-gray-300 hover:text-red-500 transition-colors p-1.5"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
