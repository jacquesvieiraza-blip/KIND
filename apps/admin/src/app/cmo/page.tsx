'use client'

import { useState } from 'react'
import { AdminNav } from '@/components/AdminNav'
import { Loader2, Copy, Check, Linkedin, Search } from 'lucide-react'

function adminPost<T>(path: string, body?: unknown): Promise<T> {
  return fetch(`/api/proxy${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  }).then(r => r.json())
}

interface LinkedInPost {
  day: string
  text: string
}

interface Prospect {
  first_name?: string
  last_name?: string
  title?: string
  organization?: { name?: string }
  organization_name?: string
  email?: string
  country?: string
}

export default function CmoPage() {
  // LinkedIn posts state
  const [postsLoading, setPostsLoading]     = useState(false)
  const [posts, setPosts]                   = useState<LinkedInPost[]>([])
  const [postsError, setPostsError]         = useState('')
  const [copied, setCopied]                 = useState<number | null>(null)

  // Prospect state
  const [prospectLoading, setProspectLoading] = useState(false)
  const [prospects, setProspects]             = useState<Prospect[]>([])
  const [prospectMsg, setProspectMsg]         = useState('')
  const [prospectError, setProspectError]     = useState('')

  async function generatePosts() {
    setPostsLoading(true)
    setPostsError('')
    try {
      const res = await adminPost<{ success: boolean; data: { posts: LinkedInPost[] }; error?: string }>(
        '/internal/cmo/linkedin-posts'
      )
      if (res.success) {
        setPosts(res.data.posts)
      } else {
        setPostsError(res.error ?? 'Failed to generate posts')
      }
    } catch {
      setPostsError('Request failed — check API connection')
    }
    setPostsLoading(false)
  }

  async function findProspects() {
    setProspectLoading(true)
    setProspectError('')
    setProspectMsg('')
    try {
      const res = await adminPost<{ success: boolean; data: { found: number; emailed_to?: string; message?: string; contacts?: Prospect[] }; error?: string }>(
        '/internal/cmo/prospect'
      )
      if (res.success) {
        if (res.data.found === 0) {
          setProspectMsg(res.data.message ?? 'No new prospects found')
          setProspects([])
        } else {
          setProspectMsg(`Found ${res.data.found} prospects — results emailed to ${res.data.emailed_to ?? 'founder'}`)
          setProspects(res.data.contacts ?? [])
        }
      } else {
        setProspectError(res.error ?? 'Prospect search failed')
      }
    } catch {
      setProspectError('Request failed — check API connection')
    }
    setProspectLoading(false)
  }

  function copyPost(idx: number, text: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(idx)
      setTimeout(() => setCopied(null), 2000)
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav />
      <main className="px-8 py-6 max-w-5xl space-y-8">

        <div>
          <h1 className="text-2xl font-bold text-gray-900">CMO Tools</h1>
          <p className="text-gray-500 text-sm mt-1">LinkedIn content generation and K.I.N.D outbound prospecting — powered by Claude + Apollo</p>
        </div>

        {/* ── LinkedIn Post Generator ─────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-1">
            <Linkedin className="w-5 h-5 text-[#0A66C2]" />
            <h2 className="font-semibold text-gray-900">LinkedIn Post Generator</h2>
          </div>
          <p className="text-xs text-gray-400 mb-5">Claude generates 3 branded posts using K.I.N.D&apos;s voice — Mon / Wed / Fri cadence</p>

          <button
            onClick={generatePosts}
            disabled={postsLoading}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#0066FF] hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {postsLoading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</>
            ) : (
              'Generate 3 LinkedIn Posts'
            )}
          </button>

          {postsError && (
            <p className="mt-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-2">{postsError}</p>
          )}

          {posts.length > 0 && (
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              {posts.map((post, i) => (
                <div key={i} className="border border-blue-100 rounded-xl bg-blue-50/30 p-4 flex flex-col">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-[#0066FF] bg-blue-100 px-2 py-0.5 rounded">{post.day}</span>
                    <button
                      onClick={() => copyPost(i, post.text)}
                      className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 transition-colors px-2 py-1 rounded hover:bg-white"
                    >
                      {copied === i ? (
                        <><Check className="w-3.5 h-3.5 text-green-500" /> Copied</>
                      ) : (
                        <><Copy className="w-3.5 h-3.5" /> Copy</>
                      )}
                    </button>
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed flex-1">{post.text}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Prospect Finder ──────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-1">
            <Search className="w-5 h-5 text-indigo-600" />
            <h2 className="font-semibold text-gray-900">Prospect Finder</h2>
          </div>
          <p className="text-xs text-gray-400 mb-5">Apollo search using K.I.N.D&apos;s own ICP — B2B founders &amp; sales directors at African SMEs. Results emailed to you.</p>

          <button
            onClick={findProspects}
            disabled={prospectLoading}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {prospectLoading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Searching…</>
            ) : (
              'Find Prospects for K.I.N.D'
            )}
          </button>

          {prospectError && (
            <p className="mt-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-2">{prospectError}</p>
          )}

          {prospectMsg && (
            <p className="mt-3 text-sm text-gray-600 bg-gray-50 border border-gray-100 rounded-lg px-4 py-2">{prospectMsg}</p>
          )}

          {prospects.length > 0 && (
            <div className="mt-5 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    {['Name', 'Title', 'Company', 'Country', 'Email'].map(h => (
                      <th key={h} className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {prospects.map((p, i) => (
                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                      <td className="px-3 py-3 font-medium text-gray-900">
                        {[p.first_name, p.last_name].filter(Boolean).join(' ') || '—'}
                      </td>
                      <td className="px-3 py-3 text-gray-500">{p.title ?? '—'}</td>
                      <td className="px-3 py-3 text-gray-500">{p.organization?.name ?? p.organization_name ?? '—'}</td>
                      <td className="px-3 py-3 text-gray-500">{p.country ?? '—'}</td>
                      <td className="px-3 py-3">
                        {p.email ? (
                          <a href={`mailto:${p.email}`} className="text-[#0066FF] hover:underline">{p.email}</a>
                        ) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </main>
    </div>
  )
}
