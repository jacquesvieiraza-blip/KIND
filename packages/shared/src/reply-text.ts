// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 6 Oct (row 11 · founder "GO on 11") — A PROSPECT'S REPLY READS AS THEIR WORDS.
//
// The founder's live Inbox: a prospect's "Stop." showed as "Stop.&nbsp; &nbsp; … Founder &amp;
// CEO … KIND &lt;hello@…&gt; wrote:" on one line. Each reply reader (Resend, Smartlead,
// Instantly) removed the HTML tags its own way, none turned the codes back into characters, and
// every line break was lost. This is now the ONE way a reply becomes text — used where a reply
// arrives, and again where the Inbox shows one, so replies saved before this read right too.
//
// It returns plain text only. Nothing here is ever placed into a page as HTML.
// ═══════════════════════════════════════════════════════════════════════════════════════

/** Real HTML tags only — so a plain-text "Ann <ann@example.com> wrote:" is never mistaken for markup. */
const HTML_TAG = /<\/?(html|head|body|div|p|br|span|table|tbody|thead|tr|td|th|font|a|b|i|u|strong|em|blockquote|ul|ol|li|h[1-6]|meta|style|img|hr|center|o:p)(?=[\s/>])[^>]*>/i

const NAMED: Record<string, string> = {
  nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: '\'',
  rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', ndash: '–', mdash: '—', hellip: '…',
  bull: '•', middot: '·', copy: '©', reg: '®', trade: '™', euro: '€', pound: '£', zwnj: '', zwj: '',
}

/** One pass, so "&amp;lt;" becomes the text "&lt;" and never "<". An unknown code is left as written. */
function decodeCodes(s: string): string {
  return s.replace(/&(#\d{1,7}|#x[0-9a-f]{1,6}|[a-z][a-z0-9]{1,31});/gi, (whole, code: string) => {
    if (code[0] === '#') {
      const n = code[1] === 'x' || code[1] === 'X' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10)
      return Number.isFinite(n) && n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : whole
    }
    const v = NAMED[code.toLowerCase()]
    return v === undefined ? whole : v
  })
}

function fromHtml(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(style|script|head)\b[\s\S]*?<\/\1>/gi, '')
    .replace(/\r?\n/g, ' ')                                   // line breaks in HTML source are just spaces
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|tr|li|h[1-6]|blockquote|table)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
}

/** A reply as readable plain text: codes turned back into characters, its lines kept, spacing tidied. */
export function replyText(raw: string | null | undefined): string {
  if (!raw) return ''
  const text = decodeCodes(HTML_TAG.test(raw) ? fromHtml(raw) : raw.replace(/\r\n?/g, '\n'))
  return text
    .replace(/ /g, ' ')
    .split('\n')
    .map(line => line.replace(/[ \t]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
