<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

const { loggedIn, user } = useUserSession()

if (!loggedIn.value) {
  navigateTo('/login')
}

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z.string().optional(),
  password: z.string().optional(),
})

type Schema = z.output<typeof schema>

const { data: profile, pending: loadingProfile } = useFetch(`/api/users/${user.value!.id}`)

const state = reactive<Partial<Schema>>({
  name: '',
  phone: '',
  password: '',
})

watch(profile, (p) => {
  if (p?.user) {
    state.name = p.user.name
    state.phone = p.user.phone || ''
  }
}, { immediate: true })

const checks = computed(() => [
  { label: '8+ characters', pass: (state.password?.length ?? 0) >= 8 },
  { label: 'Uppercase letter', pass: /[A-Z]/.test(state.password || '') },
  { label: 'Lowercase letter', pass: /[a-z]/.test(state.password || '') },
  { label: 'Number', pass: /[0-9]/.test(state.password || '') },
  { label: 'Special character', pass: /[!@#$%^&*(),.?":{}|<>]/.test(state.password || '') },
])

const passwordValid = computed(() => !state.password || checks.value.every(c => c.pass))

const errorMessage = ref('')
const successMessage = ref('')
const submitting = ref(false)

async function onSubmit(event: FormSubmitEvent<Schema>) {
  errorMessage.value = ''
  successMessage.value = ''
  submitting.value = true

  try {
    const body: Record<string, unknown> = { name: event.data.name, phone: event.data.phone || null }
    if (event.data.password) {
      body.password = event.data.password
    }

    await $fetch(`/api/users/${user.value!.id}`, { method: 'PUT', body })
    await useUserSession().fetch()
    successMessage.value = 'Profile updated'
    state.password = ''
  } catch (err: any) {
    errorMessage.value = err?.statusMessage || err?.message || 'Failed to update profile'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-lg py-8">
    <UCard>
      <template #header>
        <h1 class="text-xl font-semibold">
          My Profile
        </h1>
      </template>

      <div v-if="loadingProfile" class="flex justify-center py-8">
        <UIcon name="i-lucide-loader-circle" class="h-6 w-6 animate-spin text-muted" />
      </div>

      <template v-else>
        <UAlert v-if="successMessage" color="success" variant="subtle" :title="successMessage" class="mb-4" />
        <UAlert v-if="errorMessage" color="error" variant="subtle" :title="errorMessage" class="mb-4" />

        <div class="mb-6">
          <p class="text-sm text-muted">Email</p>
          <p class="font-medium">{{ profile?.user?.email }}</p>
        </div>

        <UForm :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
          <UFormField name="name" label="Name" required>
            <UInput v-model="state.name" placeholder="Your full name" />
          </UFormField>

          <UFormField name="phone" label="Phone">
            <UInput v-model="state.phone" type="tel" placeholder="+1 (555) 000-0000" />
          </UFormField>

          <div class="border-t border-gray-200 pt-4">
            <h2 class="text-sm font-semibold mb-2">Change password</h2>
            <p class="text-xs text-muted mb-3">Leave blank to keep your current password.</p>

            <UFormField name="password" label="New password">
              <UInput v-model="state.password" type="password" placeholder="Enter new password" />
            </UFormField>

            <ul v-if="state.password" class="mt-2 space-y-1 text-sm">
              <li v-for="check in checks" :key="check.label" class="flex items-center gap-2">
                <span :class="check.pass ? 'text-green-600' : 'text-gray-400'">
                  {{ check.pass ? '✓' : '○' }}
                </span>
                <span :class="check.pass ? 'text-green-700' : 'text-gray-500'">
                  {{ check.label }}
                </span>
              </li>
            </ul>
          </div>

          <UButton type="submit" label="Save changes" block :loading="submitting" :disabled="!passwordValid" />
        </UForm>
      </template>
    </UCard>
  </div>
</template>
