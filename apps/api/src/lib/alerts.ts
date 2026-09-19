/**
 * Founder alerting (#285/#286) — the admin's first sense. The business ran on
 * "remember to look"; this pushes to the founder when something needs them.
 *
 * Default channel = founder email (Resend, already configured). If SLACK_WEBHOOK_URL
 * is set, it also posts to Slack. Zero config required beyond FOUNDER_EMAIL/RESEND
 * that already exist. Every send is best-effort and never throws into the caller —
 * an alert failing must not break the payment webhook / signup path it rides on.
 *
 * #339 (AR-02) — BLIND-ALARM FIX. This is the stated mitigation for ~15 money-failure
 * paths, so it must not fail silently:
 *   1. resend.emails.send() RETURNS { error } (it does NOT throw on an API-level
 *      failure — bad recipient, rate limit, rotated key). The old try/catch only saw
 *      network throws, so those failures were swallowed. We now CHECK the result.
 *   2. Every alert is written to the durable `founder_alerts` table regardless of push
 *      outcome, so the founder can still see it in admin even if BOTH channels fail.
 *   3. If NOTHING delivered (no email, no Slack) AND the durable write also failed, we
 *      escalate with a loud, greppable console.error — the true last resort.
 */
import { Resend } from 'resend'
import { db } from '@kind/db'
import { raiseOperatorTask, dedupeKeyFor, type OperatorTaskKind, type OperatorTaskSeverity } from './operator-tasks'

const resend  = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
const FROM    = 'K.I.N.D Alerts <hello@get-kind.com>'
const FOUNDER = process.env.FOUNDER_EMAIL || 'hello@get-kind.com'
const SLACK   = process.env.SLACK_WEBHOOK_URL || ''

export type AlertKind = 'payment_failed' | 'new_signup' | 'sends_stalled' | 'api_down' | 'churn_risk' | 'charge_failed' | 'source_down' | 'hot_reply' | 'support_escalation'
  // An operator action happened and the ONLY record of it could not be written. Not fail-closed
  // — a human's action is never blocked by a logging hiccup — but never silent either.
  | 'audit_dropped'

// ── XC-5 · EVERY ALERT CLASS IS ALSO A PERSISTED TASK (R117 / D-47) ───────────────────
//
// An email is not a queue. It cannot be assigned, deduped, resolved with a reason,
// counted, or shown in Vida Needs-you — which is where the person who has to act looks.
// So the durable half of an alert now ALSO writes an `operator_tasks` row, and the email
// becomes a mirror of it.
//
// ⚠️ `founder_alerts` IS KEPT. It is what the existing admin surface reads; removing it
// would break a working screen in order to tidy a layer.
//
// ⚠️ THE LISTS BELOW MUST STAY TOTAL. An `AlertKind` with no task class would push an
// email and silently write no task — this item's own defect, reintroduced for one value.
// `alerts-become-tasks.test.ts` fails the gate if a kind is added without both entries.

/** Every alert kind, as a value, so the mapping below can be proven total. */
export const ALERT_KINDS = [
  'payment_failed', 'new_signup', 'sends_stalled', 'api_down', 'churn_risk',
  'charge_failed', 'source_down', 'hot_reply', 'support_escalation', 'audit_dropped',
] as const satisfies readonly AlertKind[]

export const ALERT_TASK_CLASS: Record<AlertKind, OperatorTaskKind> = {
  payment_failed:     'payment_failed',
  new_signup:         'new_signup',
  sends_stalled:      'sends_stalled',
  api_down:           'api_down',
  churn_risk:         'churn_risk',
  charge_failed:      'charge_failed',
  source_down:        'source_down',
  hot_reply:          'hot_reply',
  support_escalation: 'support_escalation',
  audit_dropped:      'audit_dropped',
}

/**
 * How loudly each class lands in Needs-you.
 *
 * ⚠️ A SIGNUP IS GOOD NEWS. Filing it as an exception would train the operator to ignore
 * the list, and "NORMAL IS SILENT" is the entire design of Needs-you. Money failures and
 * outages are `critical`; everything a human should look at today is `warn`.
 */
export const ALERT_TASK_SEVERITY: Record<AlertKind, OperatorTaskSeverity> = {
  payment_failed:     'critical',
  charge_failed:      'critical',
  api_down:           'critical',
  source_down:        'critical',
  sends_stalled:      'warn',
  churn_risk:         'warn',
  support_escalation: 'warn',
  audit_dropped:      'warn',
  hot_reply:          'info',
  new_signup:         'info',
}

/**
 * Classes where EVERY OCCURRENCE is its own event, so they are never deduped.
 *
 * A second prospect replying is not a repeat of the first, and a second signup is not a
 * repeat of the first. Everything else — an outage, a stalled sender, a failing provider —
 * is one condition that persists, and twelve identical rows a day is a list nobody reads.
 */
const NEVER_DEDUPED: ReadonlySet<AlertKind> = new Set<AlertKind>(['hot_reply', 'new_signup', 'support_escalation'])

/**
 * 🛑 ⚑ 14 Sep (RT-008) — IT NOW REPORTS WHETHER ANYBODY WAS ACTUALLY REACHED.
 *
 * ⛓️ IT RETURNED `void`. Every one of the three channels already tracked its own success
 * here, and the function threw all three away — so a caller could not tell "the founder has
 * been told" from "nothing landed anywhere". `POST /support/escalate` answered
 * `{ success: true }` regardless, and the Milla Get Help button told a stuck client that a
 * human was coming on the strength of a function that had just logged ⛔ ALERT LOST.
 *
 * ⚠️ NOTHING ABOUT DELIVERY CHANGED. Same three channels, same order, same swallowing of
 * each individual failure — an alert must still never throw into a caller's path. The only
 * change is that the outcome is now knowable by the caller that needs to be honest about it.
 *
 * ⚠️ `delivered` MEANS AT LEAST ONE CHANNEL LANDED, and the durable row counts: a founder
 * alert sitting in `founder_alerts` is recoverable, where a lost one is not.
 */
export interface AlertDelivery {
  delivered: boolean
  emailOk: boolean
  slackOk: boolean
  durableOk: boolean
  /**
   * ⛓️ XC-5 — did the OPERATOR TASK get written? Reported for the same reason the three
   * flags above are: a caller that must be honest about whether a human will see this
   * cannot be honest if the function swallows its own outcome. `delivered` keeps its
   * existing meaning exactly — a `founder_alerts` row still counts — so no existing caller
   * changes behaviour.
   */
  taskOk: boolean
  taskId?: string
}

/**
 * ⚑ 18 Sep (J2-C1) — WHO THIS ALERT IS ABOUT, when it is about somebody.
 *
 * ⚠️ OPTIONAL BY DESIGN, AND ITS ABSENCE IS NOT A MISSING VALUE. `api_down` and `source_down`
 * genuinely ARE facts about the company; an alert that omits this keeps the exact global
 * behaviour it has always had, dedupe key included.
 */
export interface AlertSubject {
  clientId?: string | null
  programmeId?: string | null
  subjectKind?: string | null
  subjectId?: string | null
  /**
   * ⛓️ 19 Sep (J22-C1) — AN EXPLICIT KEY, FOR THE CALLER THAT ALREADY RAISED THE ROW ITSELF.
   *
   * 🛑 WHY IT HAD TO EXIST. An unclassified reply's task must be DURABLE BEFORE its provider is
   * answered 200 (R132), and this function cannot be what waits: it sends the email and the
   * Slack post FIRST, so awaiting it would hang a stranger's reply-acknowledgement on our email
   * vendor. So `reply-pipeline` awaits `raiseOperatorTask` itself and then sends the mirror
   * here — and without a key to collide on, `support_escalation` being NEVER_DEDUPED would file
   * a SECOND row for the same reply, which is the duplicate the item forbids.
   *
   * ⚠️ OPT-IN, AND EVERY EXISTING CALLER IS UNCHANGED. Omitted (the default) keeps exactly the
   * behaviour below: null for a never-deduped class, the computed subject key otherwise.
   * Passing `null` still means "never dedupe".
   */
  dedupeKey?: string | null
}

export async function sendFounderAlert(
  kind: AlertKind, subject: string, lines: string[], about?: AlertSubject,
): Promise<AlertDelivery> {
  const body = lines.filter(Boolean).join('\n')
  const tag = `[${kind}]`

  let emailOk = false
  let slackOk = false

  // ── EMAIL ─────────────────────────────────────────────────────────────────────
  if (resend) {
    try {
      // supabase-js-style clients and Resend RETURN their error — they don't throw it.
      // Treat a returned { error } as a failed send, not a success.
      const { error } = await resend.emails.send({
        from: FROM, to: [FOUNDER], subject: `🔔 ${subject}`, text: `${body}\n\n${tag}`,
      })
      if (error) {
        console.error('[alerts] email send returned error', error)
      } else {
        emailOk = true
      }
    } catch (err) {
      console.error('[alerts] email send threw', err)
    }
  } else {
    // No email transport — still log so the signal is not lost.
    console.warn(`[alerts] (no RESEND_API_KEY) ${subject} — ${body}`)
  }

  // ── SLACK (real fallback, not decoration) ───────────────────────────────────────
  if (SLACK) {
    try {
      const res = await fetch(SLACK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: `*🔔 ${subject}*\n${body}\n${tag}` }),
      })
      if (res.ok) slackOk = true
      else console.error('[alerts] slack post non-OK', res.status)
    } catch (err) {
      console.error('[alerts] slack post threw', err)
    }
  }

  // ── DURABLE STORE — always write, so the alert survives even if both pushes fail ──
  let durableOk = false
  try {
    const { error } = await db.from('founder_alerts').insert({
      kind, subject, body, email_ok: emailOk, slack_ok: slackOk,
    })
    if (error) console.error('[alerts] durable insert returned error', error)
    else durableOk = true
  } catch (err) {
    console.error('[alerts] durable insert threw', err)
  }

  // ── THE OPERATOR TASK (XC-5) — the record, of which the email is a mirror ────────
  //
  // ⚠️ IT NEVER THROWS INTO THE CALLER, for the same reason nothing else here does: this
  // function rides on the payment webhook, the signup path and the send gate. An exception
  // path that breaks the path it rides on is worse than one that reports nothing.
  let taskOk = false
  let taskId: string | undefined
  try {
    // ⛓️ 18 Sep (J2-C1) — THE TASK NOW KNOWS WHO IT IS ABOUT, WHEN THE CALLER KNOWS.
    //
    // WHAT THIS REPLACED, and the sentence that justified it:
    //   ~~`dedupeKey: NEVER_DEDUPED.has(kind) ? null : \`alert:${kind}:${dedupeKeyFor({})}\``~~
    //   ~~"these classes are facts about the company, not about a client we can name here"~~
    //
    // 🛑 TRUE OF `api_down`, FALSE THE MOMENT AN ALERT CAN NAME A SUBJECT — and the function
    // had no way to be given one, so every task was raised with `client_id: null`. Two
    // consequences, both of which defeat XC-5's purpose:
    //
    //   ① `listOpenOperatorTasks({ clientId })` — the per-client rail — could never return it.
    //      An operator working that exact client saw nothing, and the client id survived only
    //      inside the title PROSE, which is the sentence-a-human-re-keys shape XC-5 replaced.
    //   ② for a DEDUPED kind the key was `alert:<kind>:global`, so `charge_failed` for the
    //      second client collided with the first client's row and filed nothing. A morning of
    //      failed charges became one task about whoever it happened to first.
    //
    // ⚠️ AN ALERT WITH NO SUBJECT IS UNCHANGED IN EVERY RESPECT. Same key, same null client,
    // same global dedupe — a correctly-global condition must not become one row per client.
    const t = await raiseOperatorTask({
      kind: ALERT_TASK_CLASS[kind],
      severity: ALERT_TASK_SEVERITY[kind],
      title: subject,
      detail: body || null,
      clientId: about?.clientId ?? null,
      programmeId: about?.programmeId ?? null,
      subjectKind: about?.subjectKind ?? null,
      subjectId: about?.subjectId ?? null,
      // Null means "never dedupe" — see NEVER_DEDUPED above. Otherwise the condition dedupes
      // per SUBJECT when one was given, and globally when it was not.
      // ⛓️ 19 Sep (J22-C1) — an explicit key from the caller wins, so a caller that has already
      // written this exact row can send the mirror without filing a second one. See `AlertSubject`.
      dedupeKey: about?.dedupeKey !== undefined
        ? about.dedupeKey
        : NEVER_DEDUPED.has(kind)
        ? null
        : `alert:${kind}:${dedupeKeyFor({
            clientId: about?.clientId ?? undefined,
            programmeId: about?.programmeId ?? undefined,
            subjectKind: about?.subjectKind ?? undefined,
            subjectId: about?.subjectId ?? undefined,
          })}`,
      evidence: { alert_kind: kind, email_ok: emailOk, slack_ok: slackOk },
    })
    taskOk = t.ok === true
    taskId = t.taskId
  } catch (err) {
    console.error('[alerts] operator task write threw', err)
  }

  // ── LAST RESORT — nothing landed anywhere. Make it loud + greppable. ─────────────
  if (!emailOk && !slackOk && !durableOk && !taskOk) {
    console.error(`[alerts] ⛔ ALERT LOST — no channel delivered: ${tag} ${subject} — ${body}`)
  }
  return { delivered: emailOk || slackOk || durableOk, emailOk, slackOk, durableOk, taskOk, taskId }
}
