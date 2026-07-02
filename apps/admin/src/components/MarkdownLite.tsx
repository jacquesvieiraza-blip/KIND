'use client'

import React from 'react'

/**
 * MarkdownLite — a tiny, zero-dependency markdown renderer.
 * Copied from apps/portal (#277) so admin agent output (Nora) renders **bold**,
 * headers, lists and tables instead of dumping literal `**` / `|---|` on screen.
 */

let keySeed = 0
function nextKey() { return `md-${keySeed++}` }

/** Parse inline markdown (**bold**, *italic*, `code`) into React nodes. */
function renderInline(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = []
  const pattern = /(\*\*([^*]+)\*\*|`([^`]+)`|\*([^*]+)\*|_([^_]+)_)/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index))
    }
    if (match[2] !== undefined) {
      nodes.push(<strong key={nextKey()}>{match[2]}</strong>)
    } else if (match[3] !== undefined) {
      nodes.push(
        <code key={nextKey()} className="px-1 py-0.5 rounded bg-purple-50 text-[#6D28D9] text-[0.85em] font-mono">
          {match[3]}
        </code>,
      )
    } else if (match[4] !== undefined) {
      nodes.push(<em key={nextKey()}>{match[4]}</em>)
    } else if (match[5] !== undefined) {
      nodes.push(<em key={nextKey()}>{match[5]}</em>)
    }
    lastIndex = pattern.lastIndex
  }
  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex))
  }
  return nodes
}

function isTableRow(line: string) { return /^\s*\|.*\|\s*$/.test(line) }
function isTableDivider(line: string) { return /^\s*\|?[\s:-]*-[\s:|-]*\|?\s*$/.test(line) && line.includes('-') }
function splitCells(line: string) { return line.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim()) }

export default function MarkdownLite({ content }: { content: string }) {
  const lines = (content ?? '').replace(/\r\n/g, '\n').split('\n')
  const blocks: React.ReactNode[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    if (/^\s*```/.test(line)) { i++; continue }
    if (line.trim() === '') { i++; continue }

    if (isTableRow(line) && i + 1 < lines.length && isTableDivider(lines[i + 1])) {
      const header = splitCells(line)
      i += 2
      const rows: string[][] = []
      while (i < lines.length && isTableRow(lines[i])) { rows.push(splitCells(lines[i])); i++ }
      blocks.push(
        <div key={nextKey()} className="my-2 overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr>{header.map((h, hi) => (
                <th key={hi} className="border-b border-purple-100 px-2 py-1 font-semibold text-[#6D28D9]">{renderInline(h)}</th>
              ))}</tr>
            </thead>
            <tbody>{rows.map((r, ri) => (
              <tr key={ri}>{r.map((c, ci) => (
                <td key={ci} className="border-b border-purple-50 px-2 py-1 align-top">{renderInline(c)}</td>
              ))}</tr>
            ))}</tbody>
          </table>
        </div>,
      )
      continue
    }

    const headerMatch = /^(#{1,3})\s+(.*)$/.exec(line)
    if (headerMatch) {
      const level = headerMatch[1].length
      const cls = level === 1 ? 'text-base font-bold' : level === 2 ? 'text-sm font-bold' : 'text-sm font-semibold'
      blocks.push(<p key={nextKey()} className={`${cls} mt-2 mb-1`}>{renderInline(headerMatch[2])}</p>)
      i++
      continue
    }

    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) { items.push(lines[i].replace(/^\s*[-*]\s+/, '')); i++ }
      blocks.push(<ul key={nextKey()} className="list-disc pl-5 my-1 space-y-0.5">{items.map(it => <li key={nextKey()}>{renderInline(it)}</li>)}</ul>)
      continue
    }

    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) { items.push(lines[i].replace(/^\s*\d+\.\s+/, '')); i++ }
      blocks.push(<ol key={nextKey()} className="list-decimal pl-5 my-1 space-y-0.5">{items.map(it => <li key={nextKey()}>{renderInline(it)}</li>)}</ol>)
      continue
    }

    const para: string[] = []
    while (
      i < lines.length && lines[i].trim() !== '' && !/^\s*```/.test(lines[i]) &&
      !/^(#{1,3})\s+/.test(lines[i]) && !/^\s*[-*]\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i]) && !isTableRow(lines[i])
    ) { para.push(lines[i]); i++ }
    blocks.push(
      <p key={nextKey()} className="my-1 first:mt-0 last:mb-0">
        {para.map((p, pi) => (
          <React.Fragment key={pi}>{renderInline(p)}{pi < para.length - 1 && <br />}</React.Fragment>
        ))}
      </p>,
    )
  }

  return <div className="space-y-0.5">{blocks}</div>
}
