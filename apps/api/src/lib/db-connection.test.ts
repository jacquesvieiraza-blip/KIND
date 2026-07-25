import { describe, it, expect } from 'vitest'
import { projectRef, isDirectSupabaseHost, connectionCandidates, safeHost, isUnreachableError, passwordOf, usernameOf, isAuthError } from './db-connection'

const DIRECT = 'postgresql://postgres:s3cr3t-pw@db.abcdefghijklmno.supabase.co:5432/postgres'
const POOLER = 'postgresql://postgres.abcdefghijklmno:s3cr3t-pw@aws-0-eu-west-1.pooler.supabase.com:5432/postgres'
const API_URL = 'https://abcdefghijklmno.supabase.co'

describe('projectRef', () => {
  it('reads the ref from the direct database host', () => {
    expect(projectRef(DIRECT, null)).toBe('abcdefghijklmno')
  })

  it('falls back to the Supabase API URL', () => {
    expect(projectRef('postgresql://user:pw@some-other-host:5432/db', API_URL)).toBe('abcdefghijklmno')
  })

  it('returns null when neither carries one', () => {
    expect(projectRef('postgresql://user:pw@localhost:5432/db', null)).toBe(null)
    expect(projectRef(undefined, undefined)).toBe(null)
  })
})

describe('isDirectSupabaseHost', () => {
  it('recognises the IPv6-only direct host', () => {
    expect(isDirectSupabaseHost(DIRECT)).toBe(true)
  })

  it('does not mistake the pooler for it', () => {
    // This is the distinction the whole fallback rests on: a pooler URL is already IPv4 and
    // must be used as-is, never "corrected".
    expect(isDirectSupabaseHost(POOLER)).toBe(false)
  })

  it('leaves a self-hosted or local URL alone', () => {
    expect(isDirectSupabaseHost('postgresql://postgres:pw@localhost:5432/postgres')).toBe(false)
  })
})

describe('connectionCandidates', () => {
  it('tries the configured URL FIRST', () => {
    // If DATABASE_URL works, nothing else should ever be attempted.
    expect(connectionCandidates(DIRECT, API_URL)[0]).toBe(DIRECT)
  })

  it('adds pooler candidates for the direct host', () => {
    const c = connectionCandidates(DIRECT, API_URL)
    expect(c.length).toBeGreaterThan(1)
    // Session mode (5432), pooler host, and the ref folded into the username — all three are
    // required or the pooler rejects the connection.
    for (const url of c.slice(1)) {
      expect(url).toContain('postgres.abcdefghijklmno:')
      expect(url).toContain('.pooler.supabase.com:5432')
    }
  })

  it('carries the password across unchanged', () => {
    expect(connectionCandidates(DIRECT, API_URL)[1]).toContain('s3cr3t-pw')
  })

  it('returns ONLY the configured URL when it is already a pooler', () => {
    expect(connectionCandidates(POOLER, API_URL)).toEqual([POOLER])
  })

  it('returns ONLY the configured URL for a non-Supabase host', () => {
    const local = 'postgresql://postgres:pw@localhost:5432/postgres'
    expect(connectionCandidates(local, null)).toEqual([local])
  })

  it('cannot build candidates without a password, and says so by not guessing', () => {
    const noPw = 'postgresql://postgres@db.abcdefghijklmno.supabase.co:5432/postgres'
    expect(connectionCandidates(noPw, API_URL)).toEqual([noPw])
  })

  it('produces no duplicate candidates', () => {
    const c = connectionCandidates(DIRECT, API_URL)
    expect(new Set(c).size).toBe(c.length)
  })
})

describe('safeHost', () => {
  it('returns host:port and NEVER the password', () => {
    const h = safeHost(DIRECT)
    expect(h).toBe('db.abcdefghijklmno.supabase.co:5432')
    expect(h).not.toContain('s3cr3t-pw')
  })

  it('handles the pooler form', () => {
    expect(safeHost(POOLER)).toBe('aws-0-eu-west-1.pooler.supabase.com:5432')
  })
})

describe('isUnreachableError', () => {
  it('treats routing failures as worth retrying elsewhere', () => {
    for (const code of ['ENETUNREACH', 'ENOTFOUND', 'ECONNREFUSED', 'EHOSTUNREACH', 'ETIMEDOUT']) {
      expect(isUnreachableError(Object.assign(new Error('nope'), { code }))).toBe(true)
    }
    // The exact error the Engine page reported.
    expect(isUnreachableError(new Error('connect ENETUNREACH 2a05:d018:cb1:bb00::1:5432 - Local (:::0)'))).toBe(true)
  })

  it('does NOT retry a credentials failure', () => {
    // Replaying a bad password against 18 regions is how an account gets locked out.
    expect(isUnreachableError(Object.assign(new Error('password authentication failed for user "postgres"'), { code: '28P01' }))).toBe(false)
  })

  it('does not retry a SQL or permission error', () => {
    expect(isUnreachableError(Object.assign(new Error('permission denied for schema public'), { code: '42501' }))).toBe(false)
  })
})

describe('passwordOf — the truncation trap', () => {
  it('reads a simple password', () => {
    expect(passwordOf(DIRECT)).toBe('s3cr3t-pw')
  })

  it('is greedy to the LAST @, so an unencoded @ in the password is not truncated', () => {
    // A password truncated at the first '@' comes back as "password authentication failed",
    // which sends you hunting a credentials problem that is really a parsing bug.
    const url = 'postgresql://postgres:p@ss@db.abcdefghijklmno.supabase.co:5432/postgres'
    expect(passwordOf(url)).toBe('p@ss')
  })

  it('handles a URL-encoded password without mangling it', () => {
    const url = 'postgresql://postgres:p%40ss%3Aword@db.abcdefghijklmno.supabase.co:5432/postgres'
    expect(passwordOf(url)).toBe('p%40ss%3Aword')
  })

  it('returns null when there is no password at all', () => {
    expect(passwordOf('postgresql://postgres@db.abcdefghijklmno.supabase.co:5432/postgres')).toBe(null)
  })
})

describe('usernameOf', () => {
  it('reads the user', () => {
    expect(usernameOf(DIRECT)).toBe('postgres')
    expect(usernameOf(POOLER)).toBe('postgres.abcdefghijklmno')
  })
})

describe('connectionCandidates with a password override', () => {
  it('does NOT keep the configured URL, because its password is the thing being replaced', () => {
    const c = connectionCandidates(DIRECT, API_URL, 'brand-new-pw')
    expect(c.some(u => u.includes('s3cr3t-pw'))).toBe(false)
  })

  it('uses the override on every candidate, URL-encoded', () => {
    const c = connectionCandidates(DIRECT, API_URL, 'p@ss word')
    expect(c.length).toBeGreaterThan(1)
    for (const u of c) {
      expect(u).toContain(encodeURIComponent('p@ss word'))
      expect(u).not.toContain('p@ss word')   // raw would break URL parsing
    }
  })

  it('still tries the pooler when overriding even if the URL was already a pooler', () => {
    // "the stored password is stale" applies whatever host is configured.
    const c = connectionCandidates(POOLER, API_URL, 'new-pw')
    expect(c.length).toBeGreaterThan(1)
  })

  it('ignores an empty override rather than connecting with no password', () => {
    expect(connectionCandidates(DIRECT, API_URL, '')).toEqual(connectionCandidates(DIRECT, API_URL))
  })
})

describe('isAuthError — the distinction that matters', () => {
  it('recognises a rejected password', () => {
    expect(isAuthError(Object.assign(new Error('password authentication failed for user "postgres"'), { code: '28P01' }))).toBe(true)
  })

  it('recognises Supavisor rejecting the tenant', () => {
    expect(isAuthError(new Error('Tenant or user not found'))).toBe(true)
  })

  it('does NOT call a network failure an auth failure', () => {
    // Conflating these is what sent us chasing IPv6 a second time.
    expect(isAuthError(new Error('connect ENETUNREACH 2a05:d018::1:5432'))).toBe(false)
  })
})
