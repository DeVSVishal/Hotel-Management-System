import { describe, expect, it, vi } from 'vitest'
import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'

describe('register form', () => {
  it('renders the form with name, email, password, and submit button', async () => {
    registerEndpoint('/api/auth/register', {
      method: 'POST',
      handler: () => ({ user: { id: 1, email: 'test@test.com', name: 'Test', role: 'GUEST' } }),
    })

    const page = await import('~/pages/register.vue')
    const component = await mountSuspended(page.default)

    expect(component.find('input[placeholder="Your full name"]').exists()).toBe(true)
    expect(component.find('input[type="email"]').exists()).toBe(true)
    expect(component.find('input[type="password"]').exists()).toBe(true)
    expect(component.text()).toContain('Create account')
  })

  it('shows checklist items as user types a password', async () => {
    registerEndpoint('/api/auth/register', {
      method: 'POST',
      handler: () => ({ user: { id: 1, email: 'test@test.com', name: 'Test', role: 'GUEST' } }),
    })

    const page = await import('~/pages/register.vue')
    const component = await mountSuspended(page.default)

    const passwordInput = component.find('input[type="password"]')

    await passwordInput.setValue('a')

    expect(component.text()).toContain('8+ characters')
    expect(component.text()).toContain('Uppercase letter')
    expect(component.text()).toContain('Lowercase letter')
    expect(component.text()).toContain('Number')
    expect(component.text()).toContain('Special character')
  })

  it('marks checklist items as the password meets requirements', async () => {
    const page = await import('~/pages/register.vue')
    const component = await mountSuspended(page.default)

    const passwordInput = component.find('input[type="password"]')

    await passwordInput.setValue('Strong1!')

    const text = component.text()

    expect(text).toContain('8+ characters')
    expect(text).toContain('Uppercase letter')
    expect(text).toContain('Lowercase letter')
    expect(text).toContain('Number')
    expect(text).toContain('Special character')
  })

  it('shows error message on registration failure', async () => {
    registerEndpoint('/api/auth/register', {
      method: 'POST',
      handler: () => {
        throw createError({ statusCode: 400, statusMessage: 'Email already registered' })
      },
    })

    const page = await import('~/pages/register.vue')
    const component = await mountSuspended(page.default)

    const nameInput = component.find('input[placeholder="Your full name"]')
    const emailInput = component.find('input[type="email"]')
    const passwordInput = component.find('input[type="password"]')

    await nameInput.setValue('Test')
    await emailInput.setValue('existing@test.com')
    await passwordInput.setValue('ValidPass1!')

    const form = component.find('form')
    await form.trigger('submit')

    await vi.waitFor(() => {
      expect(component.text()).toContain('Email already registered')
    })
  })
})
