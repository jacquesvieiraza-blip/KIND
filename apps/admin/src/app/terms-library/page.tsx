'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import { FileText, Upload, Trash2, ExternalLink, Loader2, GripVertical, CheckCircle } from 'lucide-react'

interface Template {
  id: string
  name: string
  description: string | null
  file_url: string
  sort_order: number
  is_active: boolean
  created_at: string
}

const REQUIRED_DOCS = [
  { name: 'KIND Master Services Agreement', description: 'Core legal agreement covering all services, liability, and obligations.' },
  { name: 'KIND Client Offer Document', description: 'Commercial offer outlining products, pricing, and service scope.' },
  { name: 'Exhibit A — Chatbot SLA', description: 'Service Level Agreement specific to the AI Chatbot product.' },
  { name: 'Exhibit B — Service Order', description: 'Per-engagement service order form template.' },
  { name: 'KIND POPIA Compliant Process', description: 'Data processing procedure and POPIA compliance documentation.' },
]

export default function TermsLibraryPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadTarget, setUploadTarget] = useState<string | null>(null)
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null)

  useEffect(() => { fetchTemplates() }, [])

  async function fetchTemplates() {
    const res = await fetch('/api/templates')
    const json = await res.json()
    setTemplates(json.data || [])
    setLoading(false)
  }

  function triggerUpload(docName: string) {
    setUploadTarget(docName)
    fileInputRef.current?.click()
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !uploadTarget) return
    if (file.type !== 'application/pdf') { alert('Only PDF files accepted.'); return }

    setUploading(uploadTarget)

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const fileName = `${Date.now()}-${file.name.replace(/[^a-z0-9.-]/gi, '_')}`
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('agreement-templates')
      .upload(fileName, file, { contentType: 'application/pdf', upsert: false })

    if (uploadError) {
      alert(`Upload failed: ${uploadError.message}`)
      setUploading(null)
      return
    }

    const { data: urlData } = supabase.storage.from('agreement-templates').getPublicUrl(uploadData.path)

    const sortOrder = REQUIRED_DOCS.findIndex(d => d.name === uploadTarget)
    const docMeta = REQUIRED_DOCS.find(d => d.name === uploadTarget)

    await fetch('/api/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: uploadTarget,
        description: docMeta?.description,
        file_path: uploadData.path,
        file_url: urlData.publicUrl,
        sort_order: sortOrder,
      }),
    })

    setUploadSuccess(uploadTarget)
    setTimeout(() => setUploadSuccess(null), 3000)
    setUploading(null)
    setUploadTarget(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    fetchTemplates()
  }

  async function deleteTemplate(id: string) {
    if (!confirm('Delete this document? Clients will no longer see it in their T&C viewer.')) return
    setDeleting(id)
    await fetch(`/api/templates/${id}`, { method: 'DELETE' })
    setTemplates(prev => prev.filter(t => t.id !== id))
    setDeleting(null)
  }

  const uploadedNames = templates.map(t => t.name)
  const allUploaded = REQUIRED_DOCS.every(d => uploadedNames.includes(d.name))

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-[#001f4d] text-white px-8 py-4 flex items-center justify-between">
        <div>
          <h1 className="font-bold text-lg">K.I.N.D Admin</h1>
          <p className="text-white/50 text-xs">Terms Library</p>
        </div>
        <div className="flex items-center gap-6">
          <a href="/" className="text-xs text-white/60 hover:text-white transition-colors">← Dashboard</a>
          <a href="/clients" className="text-xs text-white/60 hover:text-white transition-colors">Clients →</a>
        </div>
      </header>

      <main className="px-8 py-8 max-w-4xl mx-auto space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Agreement Template Library</h2>
          <p className="text-gray-500 text-sm mt-1">
            Upload your 5 legal PDFs once. They automatically appear in every client's T&C viewer when their Order Form is sent.
          </p>
        </div>

        {/* Status banner */}
        <div className={`rounded-xl px-5 py-4 flex items-center gap-3 ${allUploaded ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'}`}>
          {allUploaded
            ? <><CheckCircle className="w-5 h-5 text-green-500 shrink-0" /><p className="text-sm text-green-800 font-medium">All 5 required documents uploaded. Clients can view T&Cs on their Order Form.</p></>
            : <><Upload className="w-5 h-5 text-amber-500 shrink-0" /><p className="text-sm text-amber-800"><strong>{5 - uploadedNames.filter(n => REQUIRED_DOCS.some(d => d.name === n)).length} document(s) missing.</strong> Upload all 5 before sending Order Forms to clients.</p></>
          }
        </div>

        {/* Hidden file input */}
        <input ref={fileInputRef} type="file" accept="application/pdf" className="hidden" onChange={handleFileChange} />

        {/* Required docs list */}
        <div className="space-y-3">
          {REQUIRED_DOCS.map((doc, i) => {
            const uploaded = templates.find(t => t.name === doc.name)
            const isUploading = uploading === doc.name
            const succeeded = uploadSuccess === doc.name

            return (
              <div key={doc.name} className={`bg-white rounded-xl border p-5 flex items-start justify-between gap-4 ${uploaded ? 'border-gray-100' : 'border-dashed border-gray-200'}`}>
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${uploaded ? 'bg-green-50' : 'bg-gray-50'}`}>
                    <FileText className={`w-5 h-5 ${uploaded ? 'text-green-500' : 'text-gray-400'}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm text-gray-900">{doc.name}</p>
                      {uploaded && <span className="text-xs bg-green-50 text-green-600 px-1.5 py-0.5 rounded font-medium">Uploaded</span>}
                      {!uploaded && <span className="text-xs bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded font-medium">Missing</span>}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{doc.description}</p>
                    {uploaded && (
                      <a href={uploaded.file_url} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-blue-500 hover:underline mt-1">
                        <ExternalLink className="w-3 h-3" />View PDF
                      </a>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {uploaded ? (
                    <>
                      <button onClick={() => triggerUpload(doc.name)}
                        className="text-xs text-gray-500 hover:text-gray-700 border border-gray-200 px-3 py-1.5 rounded-lg hover:border-gray-400 transition-colors">
                        Replace
                      </button>
                      <button onClick={() => deleteTemplate(uploaded.id)} disabled={deleting === uploaded.id}
                        className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500 transition-colors disabled:opacity-40">
                        {deleting === uploaded.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      </button>
                    </>
                  ) : (
                    <button onClick={() => triggerUpload(doc.name)} disabled={isUploading}
                      className="flex items-center gap-2 bg-[#0066FF] hover:bg-[#0055dd] text-white text-xs font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-60">
                      {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : succeeded ? <CheckCircle className="w-3.5 h-3.5" /> : <Upload className="w-3.5 h-3.5" />}
                      {isUploading ? 'Uploading…' : succeeded ? 'Done!' : 'Upload PDF'}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Supabase storage note */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-xs text-blue-700">
          <strong>Note:</strong> PDFs are stored in Supabase Storage bucket <code className="bg-blue-100 px-1 rounded">agreement-templates</code>.
          Create this bucket in your Supabase dashboard → Storage → New bucket → name: <code className="bg-blue-100 px-1 rounded">agreement-templates</code> → Public.
        </div>
      </main>
    </div>
  )
}
