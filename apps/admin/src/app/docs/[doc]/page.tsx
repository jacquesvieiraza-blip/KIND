import fs from 'fs'
import path from 'path'
import { notFound } from 'next/navigation'
import { BookOpen, Clock, ExternalLink } from 'lucide-react'

const DOC_MAP: Record<string, { filePath: string; title: string }> = {
  'master':        { filePath: path.join(process.cwd(), '../../MASTER.md'),                        title: 'MASTER Document' },
  'run-costs':     { filePath: path.join(process.cwd(), '../../docs/run-costs-and-cashflow.md'),  title: 'Run Costs & Cashflow' },
  'legal':         { filePath: path.join(process.cwd(), '../../docs/legal.md'),                    title: 'Legal' },
  'sales-playbook':{ filePath: path.join(process.cwd(), '../../docs/sales-playbook.md'),           title: 'Sales Playbook' },
  'art-of-possible': { filePath: path.join(process.cwd(), '../../docs/art-of-possible.md'),       title: 'Art of Possible' },
}

/** Simple regex-based markdown → HTML renderer (no external deps) */
function renderMarkdown(md: string): string {
  let html = md
    // Escape existing HTML
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  // Process line by line for block elements
  const lines = html.split('\n')
  const result: string[] = []
  let inTable = false
  let inList = false
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // Headings
    if (line.startsWith('### ')) {
      if (inList) { result.push('</ul>'); inList = false }
      if (inTable) { result.push('</tbody></table>'); inTable = false }
      result.push(`<h3>${applyInline(line.slice(4))}</h3>`)
    } else if (line.startsWith('## ')) {
      if (inList) { result.push('</ul>'); inList = false }
      if (inTable) { result.push('</tbody></table>'); inTable = false }
      result.push(`<h2>${applyInline(line.slice(3))}</h2>`)
    } else if (line.startsWith('# ')) {
      if (inList) { result.push('</ul>'); inList = false }
      if (inTable) { result.push('</tbody></table>'); inTable = false }
      result.push(`<h1>${applyInline(line.slice(2))}</h1>`)

    // Horizontal rule
    } else if (/^---+$/.test(line.trim())) {
      if (inList) { result.push('</ul>'); inList = false }
      if (inTable) { result.push('</tbody></table>'); inTable = false }
      result.push('<hr />')

    // Table row
    } else if (line.trim().startsWith('|')) {
      if (inList) { result.push('</ul>'); inList = false }
      // Skip separator row (|---|---|)
      if (/^\|[\s|:-]+\|$/.test(line.trim())) {
        i++
        continue
      }
      const cells = line.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim())
      if (!inTable) {
        result.push('<table><thead><tr>' + cells.map(c => `<th>${applyInline(c)}</th>`).join('') + '</tr></thead><tbody>')
        inTable = true
      } else {
        result.push('<tr>' + cells.map(c => `<td>${applyInline(c)}</td>`).join('') + '</tr>')
      }

    // Bullet list
    } else if (/^[-*] /.test(line)) {
      if (inTable) { result.push('</tbody></table>'); inTable = false }
      if (!inList) { result.push('<ul>'); inList = true }
      result.push(`<li>${applyInline(line.slice(2))}</li>`)

    // Numbered list
    } else if (/^\d+\. /.test(line)) {
      if (inTable) { result.push('</tbody></table>'); inTable = false }
      if (!inList) { result.push('<ol>'); inList = true }
      result.push(`<li>${applyInline(line.replace(/^\d+\. /, ''))}</li>`)

    // Empty line
    } else if (line.trim() === '') {
      if (inList) { result.push('</ul>'); inList = false }
      if (inTable) { result.push('</tbody></table>'); inTable = false }
      result.push('')

    // Paragraph
    } else {
      if (inTable) { result.push('</tbody></table>'); inTable = false }
      if (inList) { result.push('</ul>'); inList = false }
      result.push(`<p>${applyInline(line)}</p>`)
    }

    i++
  }

  if (inList) result.push('</ul>')
  if (inTable) result.push('</tbody></table>')

  return result.join('\n')
}

function applyInline(text: string): string {
  return text
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default async function DocPage({ params }: { params: { doc: string } }) {
  const docKey = params.doc

  // Handle audits separately — no file, just a link
  if (docKey === 'audits') {
    return (
      <main className="px-8 py-6 max-w-4xl space-y-6">
        <div className="flex items-center gap-3">
          <BookOpen className="w-6 h-6 text-white/40" />
          <div>
            <h1 className="text-2xl font-bold text-white">Audit Reports</h1>
            <p className="text-sm text-white/40 mt-0.5">GitHub Issues — filtered by label:audit</p>
          </div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-8 text-center">
          <BookOpen className="w-10 h-10 text-white/20 mx-auto mb-4" />
          <p className="text-white/60 text-sm leading-relaxed">
            Audit reports are stored as GitHub Issues — filter by <code className="text-white/40 bg-white/5 px-1.5 py-0.5 rounded text-xs">label:audit</code> at{' '}
            <a
              href="https://github.com/jacquesvieiraza-blip/KIND/issues?q=label%3Aaudit"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#4d94ff] hover:text-[#0066FF] underline underline-offset-2"
            >
              github.com/jacquesvieiraza-blip/KIND/issues
            </a>
          </p>
          <a
            href="https://github.com/jacquesvieiraza-blip/KIND/issues?q=label%3Aaudit"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 mt-6 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Open GitHub Issues
          </a>
        </div>
      </main>
    )
  }

  const doc = DOC_MAP[docKey]
  if (!doc) notFound()

  let content = ''
  let lastModified: Date | null = null

  try {
    content = fs.readFileSync(doc.filePath, 'utf-8')
    const stat = fs.statSync(doc.filePath)
    lastModified = stat.mtime
  } catch {
    content = `# File not found\n\nCould not read \`${doc.filePath}\`.`
  }

  const renderedHtml = renderMarkdown(content)

  return (
    <main className="px-8 py-6 max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <BookOpen className="w-6 h-6 text-white/40" />
          <div>
            <h1 className="text-2xl font-bold text-white">{doc.title}</h1>
            {lastModified && (
              <div className="flex items-center gap-1.5 mt-1">
                <Clock className="w-3.5 h-3.5 text-white/30" />
                <p className="text-xs text-white/30">Last modified: {formatDate(lastModified)}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Rendered markdown */}
      <div
        className="bg-white/5 border border-white/10 rounded-xl p-8 doc-content"
        dangerouslySetInnerHTML={{ __html: renderedHtml }}
      />

      <style>{`
        .doc-content h1 { font-size: 1.75rem; font-weight: 700; color: white; margin-top: 1.5rem; margin-bottom: 0.75rem; }
        .doc-content h2 { font-size: 1.25rem; font-weight: 600; color: white; margin-top: 2rem; margin-bottom: 0.5rem; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 0.4rem; }
        .doc-content h3 { font-size: 1rem; font-weight: 600; color: rgba(255,255,255,0.8); margin-top: 1.25rem; margin-bottom: 0.4rem; }
        .doc-content p { font-size: 0.875rem; color: rgba(255,255,255,0.65); line-height: 1.7; margin-bottom: 0.75rem; }
        .doc-content ul, .doc-content ol { margin: 0.5rem 0 0.75rem 1.25rem; }
        .doc-content li { font-size: 0.875rem; color: rgba(255,255,255,0.65); line-height: 1.6; margin-bottom: 0.2rem; list-style-type: disc; }
        .doc-content ol li { list-style-type: decimal; }
        .doc-content strong { color: rgba(255,255,255,0.9); font-weight: 600; }
        .doc-content em { color: rgba(255,255,255,0.7); font-style: italic; }
        .doc-content code { background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.8); font-family: monospace; font-size: 0.8rem; padding: 0.1rem 0.35rem; border-radius: 4px; }
        .doc-content hr { border: none; border-top: 1px solid rgba(255,255,255,0.08); margin: 1.5rem 0; }
        .doc-content table { width: 100%; border-collapse: collapse; margin: 1rem 0; font-size: 0.8rem; }
        .doc-content th { text-align: left; padding: 0.5rem 0.75rem; border-bottom: 1px solid rgba(255,255,255,0.15); color: rgba(255,255,255,0.4); font-weight: 600; text-transform: uppercase; font-size: 0.7rem; letter-spacing: 0.05em; }
        .doc-content td { padding: 0.5rem 0.75rem; border-bottom: 1px solid rgba(255,255,255,0.05); color: rgba(255,255,255,0.6); }
        .doc-content tr:hover td { background: rgba(255,255,255,0.02); }
        .doc-content a { color: #4d94ff; text-decoration: underline; text-underline-offset: 2px; }
        .doc-content a:hover { color: #0066FF; }
      `}</style>
    </main>
  )
}

export function generateStaticParams() {
  return [
    { doc: 'master' },
    { doc: 'run-costs' },
    { doc: 'legal' },
    { doc: 'audits' },
  ]
}
