import { describe, expect, it, vi } from 'vitest'
import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'

describe('login form', () => {
  it('renders the form with email, password, and submit button', async () => {
    registerEndpoint('/api/auth/login', {
      method: 'POST',
      handler: () => ({ user: { id: 1, email: 'test@test.com', name: 'Test', role: 'GUEST' } }),
    })

    const page = await import('~/pages/login.vue')
    const component = await mountSuspended(page.default)

    expect(component.find('input[type="email"]').exists()).toBe(true)
    expect(component.find('input[type="password"]').exists()).toBe(true)
    expect(component.text()).toContain('Sign in')
  })

  it('shows error message on invalid credentials', async () => {
    registerEndpoint('/api/auth/login', {
      method: 'POST',
      handler: () => {
        throw createError({ statusCode: 401, statusMessage: 'Invalid credentials' })
      },
    })

    const page = await import('~/pages/login.vue')
    const component = await mountSuspended(page.default)

    const emailInput = component.find('input[type="email"]')
    const passwordInput = component.find('input[type="password"]')

    await emailInput.setValue('test@test.com')
    await passwordInput.setValue('wrong')

    const form = component.find('form')
    await form.trigger('submit')

    await vi.waitFor(() => {
      expect(component.text()).toContain('Invalid email or password')
    })
  })

  it('shows lockout message when account is locked', async () => {
    registerEndpoint('/api/auth/login', {
      method: 'POST',
      handler: () => {
        throw createError({ statusCode: 423, statusMessage: 'Account locked. Try again in 15 minute(s).' })
      },
    })

    const page = await import('~/pages/login.vue')
    const component = await mountSuspended(page.default)

    const emailInput = component.find('input[type="email"]')
    const passwordInput = component.find('input[type="password"]')

    await emailInput.setValue('test@test.com')
    await passwordInput.setValue('password')

    const form = component.find('form')
    await form.trigger('submit')

    await vi.waitFor(() => {
      expect(component.text()).toContain('Account locked')
    })
  })
})
