<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

const { loggedIn } = useUserSession()

if (loggedIn.value) {
  navigateTo('/')
}

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

type Schema = z.output<typeof schema>

const state = reactive<Partial<Schema>>({
  name: '',
  email: '',
  password: '',
})

const errorMessage = ref('')
const loading = ref(false)

const checks = computed(() => [
  { label: '8+ characters', pass: state.password.length >= 8 },
  { label: 'Uppercase letter', pass: /[A-Z]/.test(state.password) },
  { label: 'Lowercase letter', pass: /[a-z]/.test(state.password) },
  { label: 'Number', pass: /[0-9]/.test(state.password) },
  { label: 'Special character', pass: /[!@#$%^&*(),.?":{}|<>]/.test(state.password) },
])

const passwordValid = computed(() => checks.value.every(c => c.pass))

async function onSubmit(event: FormSubmitEvent<Schema>) {
  if (!passwordValid.value) return

  errorMessage.value = ''
  loading.value = true

  try {
    await $fetch('/api/auth/register', {
      method: 'POST',
      body: event.data,
    })
    navigateTo('/login?registered=true')
  } catch (err: any) {
    errorMessage.value = err?.statusMessage || err?.message || 'Registration failed'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="flex min-h-[80dvh] items-center justify-center">
    <UCard class="w-full max-w-sm">
      <template #header>
        <div class="text-center">
          <h1 class="text-xl font-semibold">
            Create account
          </h1>
          <p class="mt-1 text-sm text-muted">
            Register for a new account
          </p>
        </div>
      </template>

      <UAlert v-if="errorMessage" color="error" variant="subtle" :title="errorMessage" class="mb-4" />

      <UForm :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
        <UFormField name="name" label="Name" required>
          <UInput v-model="state.name" placeholder="Your full name" />
        </UFormField>

        <UFormField name="email" label="Email" required>
          <UInput v-model="state.email" type="email" placeholder="you@example.com" />
        </UFormField>

        <UFormField name="password" label="Password" required>
          <UInput v-model="state.password" type="password" placeholder="Create a strong password" />
        </UFormField>

        <ul class="space-y-1 text-sm">
          <li v-for="check in checks" :key="check.label" class="flex items-center gap-2">
            <span :class="check.pass ? 'text-green-600' : 'text-gray-400'">
              {{ check.pass ? '✓' : '○' }}
            </span>
            <span :class="check.pass ? 'text-green-700' : 'text-gray-500'">
              {{ check.label }}
            </span>
          </li>
        </ul>

        <UButton type="submit" label="Create account" block :loading="loading" :disabled="!passwordValid && state.password.length > 0" />
      </UForm>

      <template #footer>
        <p class="text-center text-sm text-muted">
          Already have an account?
          <NuxtLink to="/login" class="text-primary font-medium">Sign in</NuxtLink>
        </p>
      </template>
    </UCard>
  </div>
</template>
