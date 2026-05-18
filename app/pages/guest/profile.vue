<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

const { loggedIn, user } = useUserSession()
if (!loggedIn.value) navigateTo('/login')

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z.string().optional(),
  password: z.string().optional(),
  currentPassword: z.string().optional(),
})

type Schema = z.output<typeof schema>

const { data: profile, pending: loadingProfile } = useFetch(`/api/users/${user.value!.id}`)

const state = reactive<Partial<Schema>>({
  name: '',
  phone: '',
  password: '',
  currentPassword: '',
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
      body.currentPassword = event.data.currentPassword
    }

    await $fetch(`/api/users/${user.value!.id}`, { method: 'PUT', body })
    await useUserSession().fetch()
    successMessage.value = 'Profile updated.'
    state.password = ''
    state.currentPassword = ''
  } catch (err: any) {
    errorMessage.value = err?.statusMessage || err?.message || 'Failed to update profile'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="max-w-2xl mx-auto px-4 py-8">
    <header class="mb-6 pb-4 border-b border-(--ui-border)">
      <NuxtLink to="/guest/dashboard" class="text-xs text-(--ui-text-muted) hover:underline">← Dashboard</NuxtLink>
      <h1 class="text-2xl font-bold mt-1">My profile</h1>
    </header>

    <div v-if="loadingProfile" class="flex justify-center py-8">
      <UIcon name="i-lucide-loader-circle" class="h-6 w-6 animate-spin text-muted" />
    </div>

    <template v-else>
      <UAlert v-if="successMessage" color="success" variant="subtle" :title="successMessage" class="mb-4" />
      <UAlert v-if="errorMessage" color="error" variant="subtle" :title="errorMessage" class="mb-4" />

      <UForm :schema="schema" :state="state" class="flex flex-col gap-6" @submit="onSubmit">
        <!-- ===================================================
                          Account section
             =================================================== -->
        <section>
          <h2 class="text-sm font-semibold text-(--ui-text-muted) uppercase tracking-wider mb-3">Account</h2>
          <div class="border border-(--ui-border) rounded-md bg-(--ui-bg-elevated) p-5 flex flex-col gap-4">
            <div>
              <label class="text-xs text-(--ui-text-muted) block mb-1">Email</label>
              <p class="text-sm font-medium">{{ profile?.user?.email }}</p>
            </div>
            <UFormField name="name" label="Name" required>
              <UInput v-model="state.name" placeholder="Your full name" />
            </UFormField>
            <UFormField name="phone" label="Phone">
              <UInput v-model="state.phone" type="tel" placeholder="+44 20 ..." />
            </UFormField>
          </div>
        </section>

        <!-- ===================================================
                        Change password section
             =================================================== -->
        <section>
          <h2 class="text-sm font-semibold text-(--ui-text-muted) uppercase tracking-wider mb-3">Change password</h2>
          <div class="border border-(--ui-border) rounded-md bg-(--ui-bg-elevated) p-5 flex flex-col gap-4">
            <p class="text-xs text-(--ui-text-muted)">Leave blank to keep your current password.</p>
            <UFormField name="currentPassword" label="Current password">
              <UInput v-model="state.currentPassword" type="password" />
            </UFormField>
            <UFormField name="password" label="New password">
              <UInput v-model="state.password" type="password" />
            </UFormField>
            <ul v-if="state.password" class="space-y-1 text-sm pl-4">
              <li v-for="check in checks" :key="check.label" class="flex items-center gap-2">
                <span :class="check.pass ? 'text-(--ui-success)' : 'text-(--ui-text-dimmed)'">
                  {{ check.pass ? '✓' : '○' }}
                </span>
                <span :class="check.pass ? 'text-(--ui-text)' : 'text-(--ui-text-muted)'">
                  {{ check.label }}
                </span>
              </li>
            </ul>
          </div>
        </section>

        <div class="flex justify-end">
          <UButton type="submit" color="primary" label="Save changes" :loading="submitting" :disabled="!passwordValid" />
        </div>
      </UForm>
    </template>
  </div>
</template>
