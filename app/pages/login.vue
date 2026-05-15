<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

const { loggedIn } = useUserSession()
const router = useRouter()
const route = useRoute()

if (loggedIn.value) {
  navigateTo('/')
}

const schema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

type Schema = z.output<typeof schema>

const state = reactive<Partial<Schema>>({
  email: '',
  password: '',
})

const errorMessage = ref('')
const loading = ref(false)

async function onSubmit(event: FormSubmitEvent<Schema>) {
  errorMessage.value = ''
  loading.value = true

  try {
    const res = await $fetch('/api/auth/login', {
      method: 'POST',
      body: event.data,
    })

    if (res.passwordExpired) {
      navigateTo('/change-password')
      return
    }

    await useUserSession().fetch()
    navigateTo('/')
  } catch (err: any) {
    const status = err?.statusCode || err?.status || 0
    const msg = err?.statusMessage || err?.message || 'An error occurred'

    if (status === 423) {
      errorMessage.value = msg
    } else {
      errorMessage.value = 'Invalid email or password'
    }
  } finally {
    loading.value = false
  }
}

const showSuccess = computed(() => route.query.registered === 'true')
</script>

<template>
  <div class="flex min-h-[80dvh] items-center justify-center">
    <UCard class="w-full max-w-sm">
      <template #header>
        <div class="text-center">
          <h1 class="text-xl font-semibold">
            Welcome back
          </h1>
          <p class="mt-1 text-sm text-muted">
            Sign in to your account
          </p>
        </div>
      </template>

      <UAlert v-if="showSuccess" color="success" variant="subtle" title="Account created" description="Please sign in with your new credentials." class="mb-4" />

      <UAlert v-if="errorMessage" color="error" variant="subtle" :title="errorMessage" class="mb-4" />

      <UForm :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
        <UFormField name="email" label="Email" required>
          <UInput v-model="state.email" type="email" placeholder="you@example.com" />
        </UFormField>

        <UFormField name="password" label="Password" required>
          <UInput v-model="state.password" type="password" placeholder="Enter your password" />
        </UFormField>

        <UButton type="submit" label="Sign in" block :loading="loading" />
      </UForm>

      <template #footer>
        <p class="text-center text-sm text-muted">
          Don't have an account?
          <NuxtLink to="/register" class="text-primary font-medium">Create one</NuxtLink>
        </p>
      </template>
    </UCard>
  </div>
</template>
