import { describe, expect, it } from 'vitest'
import { validatePassword } from '../../server/utils/auth'

describe('validatePassword', () => {
  it('accepts a valid password', () => {
    const result = validatePassword('Strong1!')
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('rejects a password shorter than 8 characters', () => {
    const result = validatePassword('Ab1!')
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Minimum 8 characters')
  })

  it('rejects a password without an uppercase letter', () => {
    const result = validatePassword('weakpassword1!')
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Must contain an uppercase letter')
  })

  it('rejects a password without a lowercase letter', () => {
    const result = validatePassword('UPPERCASE1!')
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Must contain a lowercase letter')
  })

  it('rejects a password without a number', () => {
    const result = validatePassword('NoNumber!')
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Must contain a number')
  })

  it('rejects a password without a special character', () => {
    const result = validatePassword('NoSpecial1')
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Must contain a special character')
  })

  it('returns all missing requirements for a very weak password', () => {
    const result = validatePassword('short')
    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThanOrEqual(4)
    expect(result.errors).toContain('Minimum 8 characters')
    expect(result.errors).toContain('Must contain an uppercase letter')
    expect(result.errors).toContain('Must contain a number')
    expect(result.errors).toContain('Must contain a special character')
  })

  it('accepts a password with all edge requirements met', () => {
    const result = validatePassword('ValidPass123!@#')
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('accepts a password with exactly 8 characters meeting all rules', () => {
    const result = validatePassword('Abcd123!')
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })
})
