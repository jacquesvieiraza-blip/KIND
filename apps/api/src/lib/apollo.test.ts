import { describe, it, expect } from 'vitest'
import { isPlaceholderEmail } from './email-hygiene'

describe('isPlaceholderEmail (#375 — Apollo placeholder filter)', () => {
  it('flags Apollo locked-email placeholders', () => {
    expect(isPlaceholderEmail('email_not_unlocked@domain.com')).toBe(true)
    expect(isPlaceholderEmail('email_not_found@acme.com')).toBe(true)
    expect(isPlaceholderEmail('notunlocked@acme.com')).toBe(true)
  })
  it('flags Apollo literal placeholder domains', () => {
    expect(isPlaceholderEmail('jane@domain.com')).toBe(true)
    expect(isPlaceholderEmail('john@example.com')).toBe(true)
  })
  it('flags empty / malformed addresses', () => {
    expect(isPlaceholderEmail('')).toBe(true)
    expect(isPlaceholderEmail(null)).toBe(true)
    expect(isPlaceholderEmail(undefined)).toBe(true)
    expect(isPlaceholderEmail('not-an-email')).toBe(true)
  })
  it('passes a real deliverable address', () => {
    expect(isPlaceholderEmail('lerato@yoco.com')).toBe(false)
    expect(isPlaceholderEmail('CEO@Real-Company.co.za')).toBe(false)
  })
  it('is case-insensitive', () => {
    expect(isPlaceholderEmail('Email_Not_Unlocked@Domain.com')).toBe(true)
  })
})
