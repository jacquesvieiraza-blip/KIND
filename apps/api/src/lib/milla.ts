import Anthropic from '@anthropic-ai/sdk'
import { db } from '@kind/db'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ── Text chunking ─────────────────────────────────────────────────────────────

/**
 * Splits text into overlapping chunks of ~chunkSize chars on sentence boundaries.
 */
export function chunkText(text: string, chunkSize = 500): string[] {
  if (!text.trim()) return []

  // Split on sentence-ending punctuation followed by whitespace
  const sentences = text.match(/[^.!?\n]+[.!?\n]+[\s]*/g) ?? [text]
  const chunks: string[] = []
  let current = ''

  for (const sentence of sentences) {
    if ((current + sentence).length > chunkSize && current.trim()) {
      chunks.push(current.trim())
      // Overlap: keep last sentence in current for context
      current = sentence
    } else {
      current += sentence
    }
  }

  if (current.trim()) {
    chunks.push(current.trim())
  }

  return chunks.filter(c => c.length > 0)
}

// ── Document processing ───────────────────────────────────────────────────────

/**
 * Chunks document content and stores chunks in milla_chunks.
 * Updates milla_documents.status to 'ready' on success.
 */
export async function processDocument(
  documentId: string,
  clientId: string,
  content: string,
): Promise<void> {
  try {
    const chunks = chunkText(content)

    if (chunks.length > 0) {
      const rows = chunks.map((chunk, index) => ({
        document_id:  documentId,
        client_id:    clientId,
        content:      chunk,
        chunk_index:  index,
      }))

      const { error: insertError } = await db.from('milla_chunks').insert(rows)
      if (insertError) throw insertError
    }

    await db.from('milla_documents')
      .update({ status: 'ready' })
      .eq('id', documentId)
  } catch (err) {
    console.error('[milla/processDocument]', err)
    await db.from('milla_documents')
      .update({ status: 'error' })
      .eq('id', documentId)
  }
}

// ── Chunk retrieval via full-text search ──────────────────────────────────────

interface ChunkResult {
  content: string
  document_name: string
}

/**
 * Searches milla_chunks for the client using Supabase full-text search.
 * Returns the top matching chunks with their document names.
 */
export async function searchChunks(
  clientId: string,
  query: string,
  limit = 5,
): Promise<ChunkResult[]> {
  try {
    const searchQuery = query.trim().split(/\s+/).join(' & ')

    const { data, error } = await db
      .from('milla_chunks')
      .select('content, milla_documents(name)')
      .eq('client_id', clientId)
      .textSearch('content', searchQuery, { type: 'websearch' })
      .limit(limit)

    if (error) {
      console.error('[milla/searchChunks]', error)
      return []
    }

    return (data ?? []).map((row: { content: string; milla_documents: { name: string } | { name: string }[] | null }) => {
      const doc = Array.isArray(row.milla_documents) ? row.milla_documents[0] : row.milla_documents
      return {
        content:       row.content,
        document_name: doc?.name ?? 'Unknown document',
      }
    })
  } catch (err) {
    console.error('[milla/searchChunks]', err)
    return []
  }
}

// ── Chat ──────────────────────────────────────────────────────────────────────

interface ChatParams {
  clientId: string
  sessionId: string
  userMessage: string
  messageHistory: Array<{ role: string; content: string }>
}

interface ChatResult {
  reply: string
  sources: Array<{ document_name: string; chunk_content: string }>
}

/**
 * Retrieves relevant document chunks, then calls Claude to answer the user's question.
 */
export async function chat(params: ChatParams): Promise<ChatResult> {
  const { clientId, userMessage, messageHistory } = params

  // Fetch relevant context chunks
  const chunks = await searchChunks(clientId, userMessage)

  const contextText = chunks.length > 0
    ? chunks.map((c, i) => `[${i + 1}] (${c.document_name})\n${c.content}`).join('\n\n')
    : 'No relevant documents found.'

  const systemPrompt =
    "You are Milla, a professional AI assistant trained on the company's business documents. " +
    'Answer questions accurately using the provided context. ' +
    "If the answer isn't in the documents, say so honestly. " +
    'Keep responses professional and concise.'

  // Build message history for Claude (last N turns already filtered by caller)
  const history: Anthropic.Messages.MessageParam[] = messageHistory
    .filter(m => m.role === 'user' || m.role === 'assistant')
    .map(m => ({
      role:    m.role as 'user' | 'assistant',
      content: m.content,
    }))

  // Add the current user turn with injected context
  history.push({
    role:    'user',
    content: `Context from documents:\n${contextText}\n\nQuestion: ${userMessage}`,
  })

  const response = await anthropic.messages.create({
    model:      'claude-sonnet-4-6',
    max_tokens: 1024,
    system:     systemPrompt,
    messages:   history,
  })

  const reply = (response.content[0] as { type: string; text: string }).text.trim()

  const sources = chunks.map(c => ({
    document_name: c.document_name,
    chunk_content: c.content.slice(0, 200),
  }))

  return { reply, sources }
}
