<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

const { loggedIn, user } = useUserSession()

if (!loggedIn.value) {
  navigateTo('/login')
}

const schema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(1, 'New password is required'),
  confirmPassword: z.string().min(1, 'Please confirm your new password'),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

type Schema = z.output<typeof schema>

const state = reactive<Partial<Schema>>({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
})

const checks = computed(() => [
  { label: '8+ characters', pass: (state.newPassword?.length ?? 0) >= 8 },
  { label: 'Uppercase letter', pass: /[A-Z]/.test(state.newPassword || '') },
  { label: 'Lowercase letter', pass: /[a-z]/.test(state.newPassword || '') },
  { label: 'Number', pass: /[0-9]/.test(state.newPassword || '') },
  { label: 'Special character', pass: /[!@#$%^&*(),.?":{}|<>]/.test(state.newPassword || '') },
])

const passwordValid = computed(() => checks.value.every(c => c.pass))

const errorMessage = ref('')
const successMessage = ref('')
const submitting = ref(false)

async function onSubmit(event: FormSubmitEvent<Schema>) {
  if (!passwordValid.value) return

  errorMessage.value = ''
  successMessage.value = ''
  submitting.value = true

  try {
    const { data } = event

    await $fetch(`/api/users/${user.value!.id}`, {
      method: 'PUT',
      body: {
        password: data.newPassword,
        currentPassword: data.currentPassword,
      },
    })

    await useUserSession().fetch()
    successMessage.value = 'Password changed successfully'
    state.currentPassword = ''
    state.newPassword = ''
    state.confirmPassword = ''

    setTimeout(() => navigateTo('/'), 2000)
  } catch (err: any) {
    errorMessage.value = err?.statusMessage || err?.message || 'Failed to change password'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="flex min-h-[80dvh] items-center justify-center">
    <UCard class="w-full max-w-sm">
      <template #header>
        <div class="text-center">
          <h1 class="text-xl font-semibold">
            Change Password
          </h1>
          <p class="mt-1 text-sm text-muted">
            Your password has expired. Please set a new one.
          </p>
        </div>
      </template>

      <UAlert v-if="successMessage" color="success" variant="subtle" :title="successMessage" class="mb-4" />
      <UAlert v-if="errorMessage" color="error" variant="subtle" :title="errorMessage" class="mb-4" />

      <UForm :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
        <UFormField name="currentPassword" label="Current Password" required>
          <UInput v-model="state.currentPassword" type="password" placeholder="Enter current password" />
        </UFormField>

        <UFormField name="newPassword" label="New Password" required>
          <UInput v-model="state.newPassword" type="password" placeholder="Enter new password" />
        </UFormField>

        <ul v-if="state.newPassword" class="space-y-1 text-sm">
          <li v-for="check in checks" :key="check.label" class="flex items-center gap-2">
            <span :class="check.pass ? 'text-(--ui-success)' : 'text-(--ui-text-dimmed)'">
              {{ check.pass ? '✓' : '○' }}
            </span>
            <span :class="check.pass ? 'text-(--ui-text)' : 'text-muted'">
              {{ check.label }}
            </span>
          </li>
        </ul>

        <UFormField name="confirmPassword" label="Confirm New Password" required>
          <UInput v-model="state.confirmPassword" type="password" placeholder="Re-enter new password" />
        </UFormField>

        <UButton type="submit" label="Change Password" block :loading="submitting" :disabled="!passwordValid && !!state.newPassword" />
      </UForm>
    </UCard>
  </div>
</template>
