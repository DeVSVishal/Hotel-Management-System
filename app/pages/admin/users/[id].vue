<script setup lang="ts">
const { loggedIn, user: currentUser } = useUserSession()
const route = useRoute()
const router = useRouter()

if (!loggedIn.value) {
  navigateTo('/login')
}

const id = computed(() => Number(route.params.id))

const { data: profile, pending: loading } = useFetch(`/api/users/${id.value}`)

const state = reactive({
  name: '',
  email: '',
  role: '',
  phone: '',
  hotelId: null as number | null,
})

watch(profile, (p) => {
  if (p?.user) {
    state.name = p.user.name || ''
    state.email = p.user.email || ''
    state.role = p.user.role || ''
    state.phone = p.user.phone || ''
    state.hotelId = p.user.hotelId ?? null
  }
}, { immediate: true })

const roles = ['GUEST', 'STAFF', 'MANAGER', 'ADMIN']

const isSelf = computed(() => id.value === currentUser?.id)

const staticHotels = [
  { id: 1, name: 'Grand London Hotel', city: 'London' },
  { id: 2, name: 'Paris Luxe Suites', city: 'Paris' },
  { id: 3, name: 'New York Skyline Inn', city: 'New York' },
]

const errorMessage = ref('')
const successMessage = ref('')
const submitting = ref(false)

async function onSubmit() {
  errorMessage.value = ''
  successMessage.value = ''
  submitting.value = true

  try {
    const body: Record<string, unknown> = {
      name: state.name,
      email: state.email,
      role: state.role,
      phone: state.phone || null,
    }

    if (state.role === 'STAFF') {
      body.hotelId = state.hotelId
    }

    await $fetch(`/api/admin/users/${id.value}`, { method: 'PUT', body })
    successMessage.value = 'User updated'
  } catch (err: any) {
    errorMessage.value = err?.statusMessage || err?.message || 'Update failed'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div>
    <div class="mb-6">
      <UButton color="neutral" variant="ghost" to="/admin/users" icon="i-lucide-arrow-left" label="Back to users" />
    </div>

    <UCard v-if="loading" class="flex justify-center py-12">
      <UIcon name="i-lucide-loader-circle" class="h-6 w-6 animate-spin text-muted" />
    </UCard>

    <UCard v-else class="max-w-lg">
      <template #header>
        <h1 class="text-xl font-semibold">Edit User</h1>
      </template>

      <UAlert v-if="successMessage" color="success" variant="subtle" :title="successMessage" class="mb-4" />
      <UAlert v-if="errorMessage" color="error" variant="subtle" :title="errorMessage" class="mb-4" />

      <form class="space-y-4" @submit.prevent="onSubmit">
        <UFormField label="Name" required>
          <UInput v-model="state.name" placeholder="Full name" />
        </UFormField>

        <UFormField label="Email" required>
          <UInput v-model="state.email" type="email" placeholder="Email address" />
        </UFormField>

        <UFormField label="Role">
          <USelect
            v-model="state.role"
            :items="roles.map(r => ({ label: r, value: r }))"
            :disabled="isSelf"
          />
          <p v-if="isSelf" class="text-xs text-muted mt-1">You cannot change your own role.</p>
        </UFormField>

        <UFormField label="Phone">
          <UInput v-model="state.phone" type="tel" placeholder="Phone number" />
        </UFormField>

        <UFormField v-if="state.role === 'STAFF'" label="Managed hotel">
          <USelect
            v-model="state.hotelId"
            :items="staticHotels.map(h => ({ label: `${h.name} (${h.city})`, value: h.id }))"
            placeholder="Select a hotel"
          />
          <p class="text-xs text-muted mt-1">
            Note: Backend hotel assignment is pending implementation.
          </p>
        </UFormField>

        <UButton type="submit" label="Save changes" block :loading="submitting" />
      </form>
    </UCard>
  </div>
</template>
