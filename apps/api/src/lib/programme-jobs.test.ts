// ⚑ 3 Oct (sequencing piece 5 — the founder's blueprint view 6) — FIVE EMAILS, ONE JOB EACH,
// for a programme written to an approved direction. Every other sequence is written as before.
import { describe, it, expect, vi } from 'vitest'
vi.mock('@kind/db', () => ({ db: {} }))
import { readFileSync } from 'fs'
import { join } from 'path'
import { DIRECTION_JOBS, JOBS_SPINE } from './sequence-templates'
import { readSteps } from './programme-chain'
import { preparationHash } from './preparation-snapshot'

const read = (p: string) => readFileSync(join(__dirname, p), 'utf8')

describe('the five jobs', () => {
  it('problem → impact → solution → proof → ask, and never an invented result', () => {
    expect(DIRECTION_JOBS.map(j => j.job)).toEqual(['Problem', 'Impact', 'Solution', 'Proof', 'Ask'])
    expect(DIRECTION_JOBS[3].guidance).toMatch(/never invent a result/)
    expect(JOBS_SPINE).toMatch(/NEVER a number, percentage, price, result/)
  })
})

describe('the writer asks for them only when the client approved a direction', () => {
  const figsy = read('figsy.ts')
  const gen = read('programme-sequence-generation.ts')
  it('the programme writer passes the jobs only with a direction, and keeps each email\'s job', () => {
    expect(gen).toContain('...(direction ? { jobs: DIRECTION_JOBS } : {})')
    expect(gen).toContain('...(direction ? { job: DIRECTION_JOBS[n - 1]?.job } : {})')
  })
  it('the prompt gives each step its job and tells the spine across the five — the old spine otherwise', () => {
    expect(figsy).toContain('ONE JOB EACH — ${j.job.toUpperCase()}: ${j.guidance}')
    expect(figsy).toContain("opts?.jobs && opts.jobs.length === plan.depth ? `\\n${JOBS_SPINE}` : plan.purpose === 'meeting' ? `\\n${VALUE_SPINE}` : ''")
  })
})

describe('🛑 the job travels with the frozen version, and no existing version moves', () => {
  const base = [{ channel: 'email', subject: 'S', body: 'B', wait_days: 4 }]
  it('kept when present', () => {
    expect(readSteps([{ ...base[0], job: 'Problem' }])[0]).toMatchObject({ job: 'Problem' })
  })
  it('absent when not — a version frozen before piece 5 hashes exactly as it did', () => {
    const steps = readSteps(base)
    expect('job' in steps[0]).toBe(false)
    expect(preparationHash({ steps } as never)).toBe(preparationHash({ steps: [{ channel: 'email', subject: 'S', body: 'B', wait_days: 4 }] } as never))
  })
})

describe('Vida and Milla show each email\'s job', () => {
  it('both review routes pass it, both panels draw it', () => {
    expect(read('../routes/programme.ts')).toContain("...(typeof (st as { job?: unknown }).job === 'string' ? { job: String((st as { job: string }).job) } : {}) })),")
    expect(read('../routes/my-programme.ts')).toContain("...(typeof (st as { job?: unknown }).job === 'string' ? { job: String((st as { job: string }).job) } : {}),")
    expect(read('../../../admin/src/components/vida/FounderWordingApproval.tsx')).toContain("Email {e.step} of {w.emails.length}{e.job ? ` · ${e.job}` : ''}")
    const milla = read('../../../portal/src/components/milla/ProgrammeApproval.tsx')
    expect(milla).toContain('data-testid="one-job-each"')
    expect(milla).toContain('{i + 1} · {m.job}')
  })
  it('the harness writes five when asked for one job each', () => {
    expect(readFileSync(join(__dirname, '../../../../scripts/fullstack/fakes.mjs'), 'utf8')).toContain("prompt.includes('ONE JOB EACH')")
  })
})
