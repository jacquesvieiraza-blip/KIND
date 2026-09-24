import {
  BookOpen,
  Users,
  Phone,
  MonitorPlay,
  MessageSquare,
  FileText,
  Mail,
  BarChart2,
  TrendingUp,
  ChevronDown,
} from 'lucide-react'
import { PROGRAMME_ANCHOR_1_USD, PROGRAMME_ANCHOR_10_USD, PROGRAMME_FLOOR_USD, PROOF_READY_TARGET } from '@kind/shared'

// #706 — every account is on the programme (R124 · R137): the Brief and a free Proof come
// before any payment (R138). Every price below is read from the shared curve (R81 · R141),
// never typed — `usd` renders 450 → "450", 437.5 → "437.50".
const usd = (n: number) => `$${Number.isInteger(n) ? n : n.toFixed(2)}`

// ─── Types ───────────────────────────────────────────────────────────────────

interface Section {
  id: string
  title: string
  subtitle: string
  icon: React.ElementType
  color: string
  accent: string
  content: React.ReactNode
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function ScriptBlock({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-purple-50/40 border border-purple-100 rounded-xl p-4 font-mono text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
      {children}
    </div>
  )
}

function ProbeList({ probes }: { probes: string[] }) {
  return (
    <ul className="mt-2 space-y-1 pl-4">
      {probes.map((p, i) => (
        <li key={i} className="text-sm text-gray-500 before:content-['→'] before:mr-2 before:text-blue-400">
          {p}
        </li>
      ))}
    </ul>
  )
}

function Tag({ children, color = 'blue' }: { children: React.ReactNode; color?: 'blue' | 'green' | 'red' | 'amber' }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
    green: 'bg-green-50 text-green-700 border-green-100',
    red: 'bg-red-50 text-red-700 border-red-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
  }
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium border ${colors[color]}`}>
      {children}
    </span>
  )
}

function Table({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-100">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-purple-100">
            {headers.map((h) => (
              <th key={h} className="text-left px-4 py-2.5 font-medium text-gray-600 text-xs uppercase tracking-wide">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-3 text-gray-700 align-top">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Section content ─────────────────────────────────────────────────────────

function IcpContent() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-blue-50 rounded-xl p-5 space-y-3">
          <h4 className="font-semibold text-blue-900 text-sm uppercase tracking-wide">ICP Profile</h4>
          <div className="space-y-2 text-sm">
            {[
              ['Title', 'Founder, CEO, MD, Sales Director'],
              ['Company size', '5–50 employees'],
              ['Model', 'B2B only'],
              ['Markets', 'SA · NG · KE (primary)'],
              ['Industries', 'Professional services, Fintech, Logistics, Tech, SaaS, Consulting, Agencies'],
            ].map(([label, value]) => (
              <div key={label} className="flex gap-2">
                <span className="font-medium text-blue-700 w-28 shrink-0">{label}:</span>
                <span className="text-blue-900">{value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-green-50 rounded-xl p-4">
            <h4 className="font-semibold text-green-800 text-sm mb-2">✓ Qualify — must have ALL 3</h4>
            <ul className="space-y-1.5 text-sm text-green-800">
              <li>Has a sales function (even if it&#39;s just the founder)</li>
              <li>B2B — sells to businesses</li>
              <li>Pain = founder IS the sales team / no system</li>
            </ul>
          </div>
          <div className="bg-red-50 rounded-xl p-4">
            <h4 className="font-semibold text-red-800 text-sm mb-2">✗ Disqualify if</h4>
            <ul className="space-y-1.5 text-sm text-red-700">
              <li>B2C only</li>
              <li>Under 6 months old, no revenue</li>
              <li>Needs custom dev as core requirement</li>
              <li>Expects managed service (wants KIND to sell for them)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

function DiscoveryContent() {
  const questions = [
    {
      q: 'How do you currently find and qualify new clients?',
      probes: [
        'Is that mostly inbound, referrals, or are you doing any outbound?',
        'When you say referrals — how often does that actually happen? Weekly? Monthly?',
        'And when you do reach out cold — what does that process look like right now?',
        'Who actually does that outreach? You personally?',
      ],
      listen: 'Founder doing it themselves, inconsistency, no real system, reliance on luck/referrals.',
    },
    {
      q: 'Where does your pipeline break down most often?',
      probes: [
        'Is it finding the right people, getting responses, or converting after they show interest?',
        'If you had to pick one stage — top of funnel, middle, or close — which is the biggest problem?',
        'What does your pipeline actually look like right now — do you track it anywhere?',
      ],
      listen: 'No visibility, deals going cold, founder chasing, inconsistent follow-up.',
    },
    {
      q: 'Have you tried outbound before? What happened?',
      probes: [
        'What tools or methods did you use?',
        'How many contacts did you reach out to? What was the reply rate?',
        'What made you stop — was it the results, the time, or something else?',
        'Did you use tools like Apollo, Lemlist, Instantly?',
      ],
      listen: 'Bad past experience to address. What KIND does differently: Africa-first data, AI scoring, FIGSY.',
    },
    {
      q: 'What markets and job titles are you targeting?',
      probes: [
        'Is it primarily SA, or are you looking at other African markets?',
        'When you say [title] — is that enterprise, mid-market, or SME?',
        'Do you have your ICP written down, or is it more intuitive right now?',
      ],
      listen: 'Vague ICP = perfect use case for AI ICP builder. Also validating KIND data coverage.',
    },
    {
      q: "What's your budget for sales infrastructure this year?",
      probes: [
        'Are you paying for any outbound tools — LinkedIn Sales Nav, Apollo, email tools?',
        'Is this allocated or would you need to justify internally?',
        'If this worked as promised — consistent qualified leads every week — what would that be worth in new revenue?',
      ],
      listen: 'Budget signal, willingness to invest. Get them to anchor to value before you show pricing.',
    },
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-3">
        {[
          { phase: 'Opening', time: '2 min', desc: 'Confirm time · set agenda' },
          { phase: 'Rapport', time: '3 min', desc: 'What they do · team size · stage' },
          { phase: 'Pain Discovery', time: '15 min', desc: '5 questions with probes' },
          { phase: 'Demo Pivot', time: '5 min', desc: 'Bridge pain → demo' },
          { phase: 'Demo', time: '30 min', desc: 'See Section 3' },
          { phase: 'Close', time: '5 min', desc: 'Next steps · Brief + free Proof' },
        ].map(({ phase, time, desc }) => (
          <div key={phase} className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="font-semibold text-gray-800 text-sm">{phase}</p>
            <p className="text-[#7C3AED] font-bold text-lg">{time}</p>
            <p className="text-xs text-gray-400">{desc}</p>
          </div>
        ))}
      </div>

      <div className="space-y-4">
        <h4 className="font-semibold text-gray-800">Opening Script</h4>
        <ScriptBlock>{`"[Name], good to connect. I've blocked 30–45 minutes for us — does that still work on your end?

Here's what I'd like to do: spend the first part understanding your current sales setup and where you're getting stuck, then I'll show you exactly what KIND does and whether it makes sense for you. If it doesn't fit, I'll tell you. Sound good?"`}</ScriptBlock>
      </div>

      <div className="space-y-4">
        <h4 className="font-semibold text-gray-800">Pain Discovery Questions</h4>
        {questions.map((item, i) => (
          <div key={i} className="border border-gray-100 rounded-xl overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-[#7C3AED] text-gray-900 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                {i + 1}
              </span>
              <p className="font-medium text-gray-800 text-sm">{item.q}</p>
            </div>
            <div className="px-4 py-3 space-y-3">
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Follow-up probes</p>
                <ProbeList probes={item.probes} />
              </div>
              <div className="bg-amber-50 rounded-lg px-3 py-2">
                <p className="text-xs font-medium text-amber-700">Listen for: <span className="font-normal">{item.listen}</span></p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <h4 className="font-semibold text-gray-800">Demo Pivot Script</h4>
        <ScriptBlock>{`"Okay — based on everything you've told me, here's what I'm hearing:

[Summarise their 2–3 biggest pains in their own words.]

That's exactly what KIND was built to solve. Let me show you what your platform would look like. I'm going to use one of our demo environments — this is a live, working version of the product. Give me 20 minutes and you'll see whether this fits or not."`}</ScriptBlock>
      </div>

      <div className="space-y-2">
        <h4 className="font-semibold text-gray-800">Close Script</h4>
        <ScriptBlock>{`"So — what stood out to you? What questions do you have?"

[Handle objections — see Objection Handling section.]

"Here's what I'd suggest as a next step: we start your Brief — that's where we capture exactly who you want to reach, and nothing is paid at this stage. From it we prepare a free Proof: ${PROOF_READY_TARGET} real people from your market, so you judge the quality before you commit anything. I'll send a short proposal with the meeting target we'd recommend based on what you've told me today. Can we get that sorted now or do you need a day to check in with someone?"

If they want time: "Of course. When specifically — tomorrow morning or Thursday?" [Never "I'll send it and you can get back to me."]`}</ScriptBlock>
      </div>
    </div>
  )
}

function DemoContent() {
  const steps = [
    {
      step: 1,
      time: '2 min',
      title: 'Context Set',
      nav: null,
      script: `"I'm going to show you exactly what your platform would look like from day one. This isn't a mockup — it's a live environment. Watch how fast this goes."`,
      action: 'Admin portal → Demo Envs → Create Demo → Open Demo in new tab',
    },
    {
      step: 2,
      time: '5 min',
      title: 'ICP Builder — AI Suggest',
      nav: 'Navigate to: ICP Builder',
      script: `"The first thing you do is define who you're after. You can do this manually — or let the AI do it."

Click "Suggest ICP with AI" → type their company type → watch AI fill the form.

"You can edit any of this. But most clients review it, make small adjustments, and they're done in 3 minutes. Previously this would take hours of research."`,
      action: 'Show AI populating: industry, company size, geography, job titles, pain points',
    },
    {
      step: 3,
      time: '7 min',
      title: 'Leads with Scoring Reasoning',
      nav: 'Navigate to: Lead Gen',
      script: `"Based on your ICP, KIND pulls leads from our Africa-first database. Each lead has a score — click on any lead."

Show scoring reasoning panel:

"It shows you exactly why this person scored 87 — company size matches, job title matches, they're in your target geography, LinkedIn suggests they're actively hiring sales roles. That's intent data. You're not just getting a list — you're getting a qualified shortlist with reasoning."`,
      action: 'Click a lead card → show scoring reasoning sidebar',
    },
    {
      step: 4,
      time: '8 min',
      title: 'FIGSY — Campaign Creation',
      nav: 'Navigate to: FIGSY (AI SDR)',
      script: `"This is your AI sales rep. Let me show you how fast you can launch a campaign."

Click "New Campaign" → describe their offer in plain English → show sequence preview.

"You review it, edit anything, approve — and FIGSY runs it. It sends at human-like intervals, tracks opens and replies, and routes hot replies to your inbox. Our average reply rate is 8%. Industry average is 2–3%."`,
      action: 'New Campaign → sequence preview → show multi-step: email 1, follow-up, breakup',
    },
    {
      step: 5,
      time: '3 min',
      title: 'Billing — Credit Top-Up Flow',
      nav: 'Navigate to: Billing',
      script: `"Quick note on pricing — it's a credit model. You top up when you need more. No monthly retainer trap. No 12-month contract. Credits don't expire."

Show credit bundle tiers.

"You start with your Brief and a free Proof — no payment. After that, the programme is priced per qualified meeting: ${usd(PROGRAMME_ANCHOR_1_USD)} for one, easing to ${usd(PROGRAMME_ANCHOR_10_USD)} at ten and a ${usd(PROGRAMME_FLOOR_USD)} floor from fifty — paid half at the start and half at approval."`,
      action: 'Show credit tier cards and top-up flow',
    },
    {
      step: 6,
      time: '5 min',
      title: 'Close',
      nav: null,
      script: `"That's it. That's your platform. ICP defined, leads scored, sequences running — in under a week from today.

The average client has their first leads delivered within 2 hours of completing setup. First replies typically come in within 3–5 business days.

What questions do you have before I put together your proposal?"`,
      action: null,
    },
  ]

  return (
    <div className="space-y-4">
      <div className="bg-amber-50 border border-amber-100 rounded-lg px-4 py-3 text-sm text-amber-800">
        <strong>Before the demo:</strong> Have a Demo Environment open in the Admin portal. Create a fresh, clean instance with no test data clutter.
      </div>
      {steps.map((s) => (
        <div key={s.step} className="border border-gray-100 rounded-xl overflow-hidden">
          <div className="bg-brand-900 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="w-7 h-7 rounded-full bg-white/15 text-white text-xs font-bold flex items-center justify-center">
                {s.step}
              </span>
              <div>
                <p className="text-white font-medium text-sm">{s.title}</p>
                {s.nav && <p className="text-white/50 text-xs">{s.nav}</p>}
              </div>
            </div>
            <Tag color="blue">{s.time}</Tag>
          </div>
          <div className="p-4 space-y-3">
            <ScriptBlock>{s.script}</ScriptBlock>
            {s.action && (
              <div className="flex items-start gap-2 text-xs text-gray-500">
                <span className="font-medium text-gray-700 shrink-0">Action:</span>
                <span>{s.action}</span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

function ObjectionContent() {
  const objections = [
    {
      objection: 'We already use Lemlist / Instantly / Apollo.',
      response: `"Those are great tools — built for global markets. The problem is their data in Africa is thin. SA, NG, KE contacts are often out of date, wrong emails, wrong titles. KIND's database is built specifically for the African B2B market, and our scoring layer tells you which leads are worth reaching out to. It's not a replacement for your sequencer — it's the missing intelligence layer. Most clients switch to FIGSY because it's already connected."`,
      tag: 'Competition',
    },
    {
      objection: "We don't have budget.",
      response: `"I hear you. What are you currently spending on your sales effort — even just your own time? At your billing rate, if KIND saves you 5 hours a week of manual prospecting, it pays for itself in month one. Our Starter bundle is less than one client acquisition the old way. And before you commit anything, we prepare a free Proof — ${PROOF_READY_TARGET} real people from your market — so you can judge it first."`,
      tag: 'Budget',
    },
    {
      objection: 'We do this in-house.',
      response: `"Great — it means you have an outbound motion already. The question is: is it consistent? Most in-house outbound at small companies is ad hoc — a few hundred contacts when someone has spare time, then nothing for 6 weeks. KIND makes it systematic. You keep your people, you just give them better infrastructure. What does your current weekly outreach volume look like?"`,
      tag: 'Incumbent',
    },
    {
      objection: 'I need to think about it.',
      response: `"Totally fair. What specifically is giving you pause — is it the price, the timing, or something about the product that didn't land? I'd rather spend 5 minutes addressing that now than have you sit with a question that could have been answered. What's the one thing holding you back?"`,
      tag: 'Stall',
    },
    {
      objection: "It's too expensive.",
      response: `"Compared to what — what were you expecting? [Let them answer.] Let's put this in context: one new client closed from KIND pays for [X months] of subscription. You said your average deal is [amount from discovery]. If KIND gets you one extra deal in 90 days, it's already ROI positive. We also have the credit model — you top up when you need to. Want to start on the Starter tier and scale up as you see results?"`,
      tag: 'Price',
    },
    {
      objection: "We're not ready yet.",
      response: `"What would 'ready' look like for you? In my experience, 'not ready' usually means one of three things: the product isn't built, the team isn't in place, or you're not sure the ICP is locked. Which one is it? Because two of those three make you the perfect KIND client right now — our ICP builder and lead gen are exactly how you figure out who to go after. You don't need to have it all figured out first."`,
      tag: 'Timing',
    },
    {
      objection: 'How do I know the leads are good?',
      response: `"Fair challenge. Every data source has errors. What KIND does differently is show you exactly why each lead scored the way it did — you see the reasoning, so you're not flying blind. Our 8% reply rate isn't marketing copy — it's our actual average across campaigns. That's what the free Proof is for: once your Brief is in, we show you ${PROOF_READY_TARGET} real people in your exact ICP so you see quality before you pay anything."`,
      tag: 'Quality',
    },
    {
      objection: "What's the reply rate?",
      response: `"Our average across campaigns is 8%. Cold email industry average is 2–3%. The reason ours is higher: FIGSY personalises emails based on each prospect's profile, sends at human-like timing and intervals, and the leads are pre-scored — so you're not emailing people who will never respond. Results vary by industry and offer, but 8% is a fair benchmark."`,
      tag: 'Data',
    },
    {
      objection: 'Is my data safe? What about POPIA?',
      response: `"Great question — we take this seriously. KIND is POPIA compliant. We have a built-in consent workflow that captures and stores consent records for every contact. Your client data stays in your environment — we don't sell or share it. We're hosted on infrastructure compliant with South African data residency requirements. I can send you our DPA to review with your legal team — most clients find it straightforward."`,
      tag: 'Legal',
    },
  ]

  const tagColors: Record<string, 'blue' | 'green' | 'red' | 'amber'> = {
    Competition: 'blue',
    Budget: 'amber',
    Incumbent: 'blue',
    Stall: 'amber',
    Price: 'amber',
    Timing: 'blue',
    Quality: 'green',
    Data: 'green',
    Legal: 'red',
  }

  return (
    <div className="space-y-3">
      {objections.map((item, i) => (
        <div key={i} className="border border-gray-100 rounded-xl overflow-hidden">
          <div className="bg-red-50 px-4 py-3 flex items-start justify-between gap-3">
            <p className="font-medium text-red-800 text-sm">&#34;{item.objection}&#34;</p>
            <Tag color={tagColors[item.tag] ?? 'blue'}>{item.tag}</Tag>
          </div>
          <div className="p-4">
            <ScriptBlock>{item.response}</ScriptBlock>
          </div>
        </div>
      ))}
    </div>
  )
}

function ProposalContent() {
  return (
    <div className="space-y-6">
      <div className="bg-brand-100/40 border border-brand-200/50 rounded-lg p-5 space-y-4">
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Subject line</p>
          <p className="text-sm text-gray-700 font-mono">KIND Proposal — [Company Name] — [Date]</p>
        </div>
        <hr className="border-gray-100" />
        <div className="space-y-4 text-sm text-gray-700 leading-relaxed">
          <div>
            <p className="font-semibold text-gray-800 mb-1">Executive Summary</p>
            <p className="text-gray-500 italic">
              [Company] is currently relying on [founder-led / ad hoc / referral-only] sales to grow, which means pipeline
              is inconsistent and growth is capped by how many hours [Name] personally has to spend on outreach. KIND gives
              [Company] a systematic, AI-powered outbound function — automated lead generation, scored by relevance, with
              FIGSY running personalised campaigns in the background. The expected outcome is a consistent pipeline of
              qualified leads within the first week, without adding headcount.
            </p>
          </div>
        </div>
      </div>

      <div>
        <h4 className="font-semibold text-gray-800 mb-3">Recommended Products</h4>
        <Table
          headers={['Product', 'Why it fits [Company]']}
          rows={[
            ['Lead Gen (ICP + Scoring)', 'ICP undefined / wasting time on unqualified leads — AI ICP builder solves this'],
            ['FIGSY AI SDR', 'No consistent outbound motion — FIGSY runs campaigns while they focus on closing'],
            ['Milla / Vida (if applicable)', 'If they mentioned inbound or website qualification needs'],
          ]}
        />
      </div>

      <div>
        <h4 className="font-semibold text-gray-800 mb-3">Pricing</h4>
        <Table
          headers={['Tier', 'Credits', 'Best for', 'Price']}
          rows={[
            ['Starter', '500 credits', '5–15 leads/week', 'R[X]'],
            ['Growth', '1,500 credits', '15–40 leads/week', 'R[X]'],
            ['Pro', '5,000 credits', '40+ leads/week', 'R[X]'],
          ]}
        />
        <p className="text-xs text-gray-400 mt-2">Credits are flexible — top up as needed, never expire, no long-term contract.</p>
      </div>

      <div>
        <h4 className="font-semibold text-gray-800 mb-3">What Happens Next</h4>
        <Table
          headers={['When', 'Action']}
          rows={[
            ['Day 1', 'Sign up, start your Brief — no payment'],
            ['Day 2–3', '30-min onboarding call — configure ICP, set up FIGSY'],
            ['Day 3–5', 'First batch of scored leads delivered to your dashboard'],
            ['Day 5–7', 'First campaign launched, sequences running'],
            ['Week 2', 'First replies in your inbox'],
          ]}
        />
      </div>

      <div className="bg-green-50 rounded-xl p-5 space-y-2">
        <h4 className="font-semibold text-green-800">Risk Reversal</h4>
        <ul className="space-y-1.5 text-sm text-green-700">
          <li>{`Your Brief and a free ${PROOF_READY_TARGET}-person Proof come before any payment`}</li>
          <li>Credit model — pay per use, no monthly lock-in</li>
          <li>No long-term contract — cancel any time</li>
          <li>The meeting count is a target, not a guarantee — any qualified meeting we don&#39;t deliver is credited to your wallet for your next programme</li>
        </ul>
      </div>

      <div className="border-2 border-[#7C3AED] rounded-xl p-5 text-center space-y-2">
        <p className="font-bold text-gray-900">Next Step — One Action</p>
        <p className="text-sm text-gray-500">
          Click the link to start your Brief and book your onboarding call — you see your free Proof before you pay anything. Or reply to this email and I&#39;ll set it up on a call.
        </p>
        <div className="flex items-center justify-center gap-2 mt-2">
          <span className="text-[#7C3AED] font-medium text-sm">→ KIND sign-up link</span>
        </div>
      </div>
    </div>
  )
}

function FollowUpContent() {
  return (
    <div className="space-y-6">
      <div className="bg-amber-50 border border-amber-100 rounded-lg px-4 py-3 text-sm text-amber-800">
        <strong>Rule:</strong> Always have a specific next step booked before ending a call. These templates are for when that falls through.
      </div>

      {[
        {
          timing: 'Same Day After Call',
          subject: 'Quick recap — [Company Name] + KIND',
          body: `Hi [Name],

Great speaking today. As promised — attached is the proposal with my recommendations based on what you shared.

Quick summary:
- Problem: [1-line summary of their pain from the call]
- Recommended: [Product(s)]
- Next step: your Brief and a free ${PROOF_READY_TARGET}-person Proof, onboarding call booked for [date] / [book here: link]

Any questions, just reply here.

[Your name]`,
          tag: 'green' as const,
        },
        {
          timing: 'Day 2 — No Reply',
          subject: 'Re: Quick recap — [Company Name] + KIND',
          body: `Hi [Name],

Checking in on the proposal — did you get a chance to look at it?

One thing I didn't mention on the call: most clients have their first leads delivered within 2 hours of completing setup. Your Brief and Proof cost nothing — you see real people from your market before you pay anything.

Worth 15 minutes this week to get it running?

[Your name]`,
          tag: 'amber' as const,
        },
        {
          timing: 'Day 5 — Breakup Email',
          subject: 'Closing the loop',
          body: `Hi [Name],

I'm going to assume the timing isn't right and close this off on my end.

If that changes — pipeline going cold, you're ready to start outbound, or you just want to see the product again — my calendar is always open: [link].

Best of luck with [Company].

[Your name]`,
          tag: 'red' as const,
        },
      ].map(({ timing, subject, body, tag }) => (
        <div key={timing} className="border border-gray-100 rounded-xl overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 flex items-center justify-between">
            <p className="font-semibold text-gray-800 text-sm">{timing}</p>
            <Tag color={tag}>{timing.includes('Breakup') ? 'Final' : timing.includes('Day 2') ? 'Follow-up' : 'Send now'}</Tag>
          </div>
          <div className="p-4 space-y-2">
            <p className="text-xs text-gray-500">
              <span className="font-medium text-gray-700">Subject:</span> {subject}
            </p>
            <ScriptBlock>{body}</ScriptBlock>
          </div>
        </div>
      ))}
    </div>
  )
}

function LossTrackerContent() {
  const lossReasons = [
    'No budget / no budget authority — spoke to someone who could not approve spend. Always qualify financial authority in discovery.',
    'Wrong timing — genuine "not now". Note and re-engage in 90 days.',
    'Champion left — main contact changed jobs or role. Build relationships with 2 people in the account.',
    'Competitor already in — another tool embedded, switching cost too high. Probe for incumbent tools early.',
    'ICP mismatch — deal should have been disqualified earlier. Review qualification criteria.',
    'Product gap — something they needed that KIND did not have. Log for product team.',
    'No urgency — pain was not acute enough. Did not tie cost of inaction to a real number in discovery.',
    'Proposal too slow — took more than 48 hours to send. Same-day or next-day is the standard.',
  ]

  return (
    <div className="space-y-6">
      <div>
        <h4 className="font-semibold text-gray-800 mb-3">Loss Log — fill in after every lost deal</h4>
        <Table
          headers={['Date', 'Company', 'Stage Lost', 'Reason', 'What I\'d Do Differently']}
          rows={[
            ['', '', '', '', ''],
            ['', '', '', '', ''],
            ['', '', '', '', ''],
          ]}
        />
        <p className="text-xs text-gray-400 mt-2">
          Stage options: Outreach → Discovery Booked → Demo Given → Proposal Sent → Negotiation → Closed Lost
        </p>
      </div>

      <div>
        <h4 className="font-semibold text-gray-800 mb-3">8 Most Common B2B SaaS Loss Reasons</h4>
        <div className="space-y-2">
          {lossReasons.map((reason, i) => (
            <div key={i} className="flex items-start gap-3 text-sm border border-gray-100 rounded-lg px-4 py-3">
              <span className="w-5 h-5 rounded-full bg-gray-100 text-gray-500 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                {i + 1}
              </span>
              <p className="text-gray-700">{reason}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function WinMetricsContent() {
  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 text-sm text-blue-800">
        Track weekly. Review every Monday morning. Adjust activity if falling short — don&#39;t wait for month-end.
      </div>

      <div>
        <h4 className="font-semibold text-gray-800 mb-3">Weekly Targets</h4>
        <div className="grid grid-cols-3 gap-3">
          {[
            { metric: 'Outreach Sent', target: '50 / week', color: 'blue' },
            { metric: 'Discovery Calls Booked', target: '5 / week', color: 'indigo' },
            { metric: 'Demos Given', target: '3 / week', color: 'purple' },
            { metric: 'Proposals Sent', target: '2 / week', color: 'amber' },
            { metric: 'Deals Closed', target: '1 / week', color: 'green' },
            { metric: 'Pipeline Value', target: 'R50,000+', color: 'teal' },
          ].map(({ metric, target }) => (
            <div key={metric} className="bg-white border border-gray-100 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-[#7C3AED]">{target}</p>
              <p className="text-xs text-gray-500 mt-1">{metric}</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h4 className="font-semibold text-gray-800 mb-3">Conversion Benchmarks</h4>
        <Table
          headers={['Stage', 'Target Rate', 'What it means']}
          rows={[
            ['Outreach → Discovery booked', '10%', '5 calls from 50 outreaches'],
            ['Discovery → Demo', '60%', '3 demos from 5 calls'],
            ['Demo → Proposal', '67%', '2 proposals from 3 demos'],
            ['Proposal → Close', '50%', '1 close from 2 proposals'],
          ]}
        />
      </div>

      <div>
        <h4 className="font-semibold text-gray-800 mb-3">Lagging Indicators to Watch</h4>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Avg deal size', value: 'R5,000–R15,000 MRR' },
            { label: 'Time to close', value: 'Under 14 days' },
            { label: 'Monthly churn', value: 'Under 5%' },
            { label: 'NPS (at 30 days)', value: 'Ask every client' },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between border border-gray-100 rounded-lg px-4 py-3 text-sm">
              <span className="text-gray-600">{label}</span>
              <span className="font-semibold text-gray-900">{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PlaybookPage() {
  const sections: Section[] = [
    {
      id: 'icp',
      title: 'ICP & Qualification',
      subtitle: 'Who we sell to and how to qualify fast',
      icon: Users,
      color: 'bg-blue-600',
      accent: 'text-blue-600',
      content: <IcpContent />,
    },
    {
      id: 'discovery',
      title: 'Discovery Call Script',
      subtitle: '30–45 min · 5 questions with probes',
      icon: Phone,
      color: 'bg-indigo-600',
      accent: 'text-indigo-600',
      content: <DiscoveryContent />,
    },
    {
      id: 'demo',
      title: 'Demo Flow',
      subtitle: '30 min · step-by-step using Demo Environments',
      icon: MonitorPlay,
      color: 'bg-violet-600',
      accent: 'text-violet-600',
      content: <DemoContent />,
    },
    {
      id: 'objections',
      title: 'Objection Handling',
      subtitle: '9 real objections with non-pushy responses',
      icon: MessageSquare,
      color: 'bg-rose-600',
      accent: 'text-rose-600',
      content: <ObjectionContent />,
    },
    {
      id: 'proposal',
      title: 'Proposal Template',
      subtitle: 'Fill-in-the-blank structure for every deal',
      icon: FileText,
      color: 'bg-amber-600',
      accent: 'text-amber-600',
      content: <ProposalContent />,
    },
    {
      id: 'followup',
      title: 'Follow-Up Sequences',
      subtitle: 'Same day · Day 2 · Day 5 breakup',
      icon: Mail,
      color: 'bg-teal-600',
      accent: 'text-teal-600',
      content: <FollowUpContent />,
    },
    {
      id: 'loss',
      title: 'Loss Reason Tracker',
      subtitle: 'Fill in after every lost deal · review weekly',
      icon: BarChart2,
      color: 'bg-gray-600',
      accent: 'text-gray-600',
      content: <LossTrackerContent />,
    },
    {
      id: 'metrics',
      title: 'Win Metrics',
      subtitle: 'Weekly targets and conversion benchmarks',
      icon: TrendingUp,
      color: 'bg-green-600',
      accent: 'text-green-600',
      content: <WinMetricsContent />,
    },
  ]

  return (

      <div className="px-8 py-8 max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Sales Playbook</h2>
            <p className="text-gray-500 text-sm mt-1">
              Discovery script, objection handling, demo flow, and proposal template. Version 1.0 — May 2026.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[#7C3AED]" />
            <span className="text-xs text-gray-400 font-medium">Internal use only</span>
          </div>
        </div>

        {/* Quick-nav strip */}
        <div className="bg-white rounded-2xl border border-purple-100 shadow-sm p-4">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">Jump to section</p>
          <div className="flex flex-wrap gap-2">
            {sections.map((s) => {
              const Icon = s.icon
              return (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  <Icon className="w-3.5 h-3.5" />
                  {s.title}
                </a>
              )
            })}
          </div>
        </div>

        {/* Sections */}
        {sections.map((section, idx) => {
          const Icon = section.icon
          return (
            <div
              key={section.id}
              id={section.id}
              className="bg-white rounded-xl border border-gray-100 overflow-hidden"
            >
              {/* Section header */}
              <div className={`${section.color} px-6 py-4 text-gray-900`}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gray-200 flex items-center justify-center">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500 text-xs font-medium uppercase tracking-wider">
                        Section {idx + 1}
                      </span>
                    </div>
                    <h3 className="font-bold text-lg leading-tight">{section.title}</h3>
                    <p className="text-gray-700 text-xs">{section.subtitle}</p>
                  </div>
                  <ChevronDown className="w-4 h-4 text-gray-400 ml-auto" />
                </div>
              </div>

              {/* Section body */}
              <div className="p-6">{section.content}</div>
            </div>
          )
        })}

        <p className="text-center text-xs text-gray-400 pb-4">
          This playbook is a living document — update it when you find something that works better. Review quarterly.
        </p>
    </div>
  )
}
