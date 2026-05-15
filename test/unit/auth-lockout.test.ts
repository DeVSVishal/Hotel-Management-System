import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

function isLocked(lockedUntil: Date | null): { locked: boolean; minutesRemaining: number | null } {
  if (lockedUntil && lockedUntil > new Date()) {
    return { locked: true, minutesRemaining: Math.ceil((lockedUntil.getTime() - Date.now()) / 60000) }
  }
  return { locked: false, minutesRemaining: null }
}

function applyFailedLogin(current: number, lockedUntil: Date | null): {
  failedLoginAttempts: number
  lockedUntil: Date | null
  locked: boolean
} {
  const attempts = current + 1
  if (attempts >= 5) {
    const lockTime = new Date(Date.now() + 15 * 60 * 1000)
    return { failedLoginAttempts: attempts, lockedUntil: lockTime, locked: true }
  }
  return { failedLoginAttempts: attempts, lockedUntil: null, locked: false }
}

function onSuccessfulLogin(): { failedLoginAttempts: number; lockedUntil: null } {
  return { failedLoginAttempts: 0, lockedUntil: null }
}

describe('auth lockout logic', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts unlocked with 0 failed attempts', () => {
    expect(isLocked(null).locked).toBe(false)
  })

  it('does not lock before 5 failed attempts', () => {
    let state = { failedLoginAttempts: 0, lockedUntil: null as Date | null }

    for (let i = 1; i <= 4; i++) {
      const result = applyFailedLogin(state.failedLoginAttempts, state.lockedUntil)
      expect(result.locked).toBe(false)
      state = { failedLoginAttempts: result.failedLoginAttempts, lockedUntil: result.lockedUntil }
    }

    expect(state.failedLoginAttempts).toBe(4)
    expect(state.lockedUntil).toBeNull()
  })

  it('locks the account after 5 failed attempts', () => {
    let state = { failedLoginAttempts: 4, lockedUntil: null as Date | null }

    const result = applyFailedLogin(state.failedLoginAttempts, state.lockedUntil)

    expect(result.locked).toBe(true)
    expect(result.failedLoginAttempts).toBe(5)
    expect(result.lockedUntil).not.toBeNull()
  })

  it('sets a 15-minute lockout duration', () => {
    const now = new Date()
    vi.setSystemTime(now)

    const result = applyFailedLogin(4, null)

    const fifteenMinutesMs = 15 * 60 * 1000
    const expectedLockUntil = new Date(now.getTime() + fifteenMinutesMs)

    expect(result.lockedUntil!.getTime()).toBe(expectedLockUntil.getTime())
  })

  it('reports account as locked during lockout period', () => {
    const future = new Date(Date.now() + 5 * 60 * 1000)
    const status = isLocked(future)
    expect(status.locked).toBe(true)
    expect(status.minutesRemaining).toBe(5)
  })

  it('reports account as unlocked when lockout expires', () => {
    const past = new Date(Date.now() - 1000)
    expect(isLocked(past).locked).toBe(false)
  })

  it('resets counter and lockout on successful login', () => {
    const state = onSuccessfulLogin()
    expect(state.failedLoginAttempts).toBe(0)
    expect(state.lockedUntil).toBeNull()
  })

  it('allows login after lockout expires', () => {
    let lockState = { failedLoginAttempts: 5, lockedUntil: new Date(Date.now() + 15 * 60 * 1000) }

    expect(isLocked(lockState.lockedUntil).locked).toBe(true)

    vi.advanceTimersByTime(16 * 60 * 1000)

    expect(isLocked(lockState.lockedUntil).locked).toBe(false)
  })
})
