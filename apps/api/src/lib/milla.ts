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

// Defensive per-message cap when assembling the prompt. The /chat routes already
// bound new input, but historical rows persisted before that cap (or via other
// paths) could still be oversized — truncating here keeps the total context well
// under Claude's limit so old sessions don't keep failing with "prompt too long".
const MAX_TURN_CHARS = 4000

/**
 * Retrieves relevant document chunks, then calls Claude to answer the user's question.
 */
export async function chat(params: ChatParams): Promise<ChatResult> {
  const { clientId, userMessage, messageHistory } = params

  // ── 12 Aug (same day as the snapshot fix): BOTH lookups run in PARALLEL ──────
  // The portal aborts any API call at 15s (apps/portal/src/lib/api.ts), and this
  // route answers un-streamed — chunk search + model call already lived near that
  // edge. Adding the snapshot SERIALLY pushed first questions over it, and the
  // client saw "I hit a snag reaching the engine". Parallel = the snapshot costs
  // ~nothing; the model swap below buys the rest of the margin back.
  // ⚑ 30 Aug (BUILD-004A-2) — THE PROGRAMME JOINS THE SAME PARALLEL BATCH. It is one row
  // read, so it costs nothing against the 15s bound, and putting it here rather than after
  // the chunk search keeps that margin intact.
  const [chunks, snapshot, programme] = await Promise.all([
    searchChunks(clientId, userMessage),
    (async (): Promise<import('./milla-chat-system').MillaSnapshot | null> => {
      try {
        const { buildMillaSummaryData } = await import('./milla-summary')
        return await buildMillaSummaryData(clientId)
      } catch (e) {
        console.error('[milla/chat] snapshot lookup failed — answering without live numbers', e)
        return null
      }
    })(),
    (async (): Promise<import('./customer-programme').CustomerProgramme | null> => {
      try {
        const { readCustomerProgramme } = await import('./customer-programme')
        return await readCustomerProgramme(clientId)
      } catch (e) {
        console.error('[milla/chat] programme lookup failed — answering without it', e)
        return null
      }
    })(),
  ])

  const hasContext = chunks.length > 0

  const contextText = hasContext
    ? chunks.map((c, i) => `[${i + 1}] (${c.document_name})\n${c.content}`).join('\n\n')
    : 'No relevant documents found.'

  // ── 12 Aug — MILLA NOW SEES THE CLIENT'S OWN NUMBERS ────────────────────────
  // Found on the founder's screenshot: asked "How is my ROI looking?" she answered
  // "I don't have access to your specific ROI data … share or upload your relevant
  // data" — while the SAME SCREEN showed every number she disclaimed, and the old
  // prompt below this comment literally instructed the upload-request behaviour.
  // The snapshot is the same builder /leads/milla-summary feeds the desk from, so
  // the chat can never disagree with the KPIs beside it. FAIL-SOFT: if the lookup
  // throws, she gets an explicit "numbers unavailable — never invent" block instead;
  // a chat that answers without numbers beats a chat that is down.
  const { buildMillaChatSystem } = await import('./milla-chat-system')
  const systemPrompt =
    buildMillaChatSystem(snapshot, programme) +
    '\n\n' +
    (hasContext
      ? 'The client has uploaded business documents, and relevant excerpts are provided below. ' +
        'When the answer is found in those documents, ground your response in them and prefer that ' +
        'information over general knowledge.'
      // ⛓️ 30 Aug — "general lead-gen guidance" WAS THE OPENING FOR THE RETIRED MODEL. It is
      // the one line that invited her to answer as a generic lead-gen chatbot, which is
      // where cost-per-lead and campaign metrics came from on the founder's walk. She is
      // still told to be helpful; what she is helpful ABOUT is now the programme.
      : 'No uploaded documents matched this question. Still be genuinely helpful — about their ' +
        'outcome, their programme and their targeting — but never invent client-specific facts, ' +
        'never fall back on generic lead-gen or campaign framing, and never ask the client to ' +
        'upload data the product already shows (their live numbers are above; anything beyond ' +
        'them lives on the Reports page).')

  // Build message history for Claude (last N turns already filtered by caller)
  const history: Anthropic.Messages.MessageParam[] = messageHistory
    .filter(m => m.role === 'user' || m.role === 'assistant')
    .map(m => ({
      role:    m.role as 'user' | 'assistant',
      content: m.content.slice(0, MAX_TURN_CHARS),
    }))

  // ⚑ 31 Aug — THE LIFECYCLE IS RE-ASSERTED HERE, AND THE POSITION IS THE WHOLE FIX.
  //
  // 🛑 #1616 put the ordered lifecycle in the system prompt and BOTH live accounts still
  // answered the old way. The route-level test captured the real payload and showed why: the
  // prompt was correct, and the ten replayed thread messages above are Milla's OWN pre-#1616
  // answers stating the wrong sequence. Ten agreeing assistant turns outweigh one system
  // block, so the correction has to be the LAST thing read — not louder, later.
  //
  // ⚠️ THE QUESTION STAYS AT THE END. Appending the re-assertion after it buries what the
  // client actually asked, which is its own defect; the guard asserts this ordering.
  const { buildLifecycleReassertion } = await import('./milla-chat-system')
  history.push({
    role:    'user',
    content: `${buildLifecycleReassertion()}\n\nContext from documents:\n${contextText}\n\n` +
             `Question: ${userMessage.slice(0, MAX_TURN_CHARS)}`,
  })

  // Haiku, same as the stateless panel: with the client's numbers injected the desk
  // chat is short factual Q&A (the prompt caps it at 2–4 sentences), and Sonnet's
  // extra latency was most of the 15s budget. One model on both doors.
  const response = await anthropic.messages.create({
    model:      'claude-haiku-4-5-20251001',
    max_tokens: 600,
    system:     systemPrompt,
    messages:   history,
  })

  // Find the first text block — do not assume content[0] is text.
  const textBlock = response.content.find(
    (block): block is Anthropic.Messages.TextBlock => block.type === 'text',
  )
  const reply = textBlock?.text.trim() || "I'm sorry, I wasn't able to generate a response. Please try rephrasing your question."

  const sources = chunks.map(c => ({
    document_name: c.document_name,
    chunk_content: c.content.slice(0, 200),
  }))

  return { reply, sources }
}
