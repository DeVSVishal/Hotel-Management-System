<script setup lang="ts">
const { loggedIn, user: currentUser } = useUserSession()
const route = useRoute()

if (!loggedIn.value) navigateTo('/login')

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

const { data: hotelsData } = await useFetch('/api/hotels')
const hotels = computed<any[]>(() => hotelsData.value?.hotels ?? [])

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

    if (state.role === 'STAFF' || state.role === 'MANAGER') {
      body.hotelId = state.hotelId
    }

    await $fetch(`/api/admin/users/${id.value}`, { method: 'PUT', body })
    successMessage.value = 'User updated.'
  } catch (err: any) {
    errorMessage.value = err?.statusMessage || err?.message || 'Update failed'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="max-w-2xl">
    <header class="mb-6 pb-4 border-b border-(--ui-border)">
      <NuxtLink to="/admin/users" class="text-xs text-(--ui-text-muted) hover:underline">← Users</NuxtLink>
      <h1 class="text-2xl font-bold mt-1">Edit user</h1>
    </header>

    <div v-if="loading" class="flex justify-center py-12">
      <UIcon name="i-lucide-loader-circle" class="h-6 w-6 animate-spin text-muted" />
    </div>

    <section v-else>
      <h2 class="text-sm font-semibold text-(--ui-text-muted) uppercase tracking-wider mb-3">Account details</h2>

      <UAlert v-if="successMessage" color="success" variant="subtle" :title="successMessage" class="mb-4" />
      <UAlert v-if="errorMessage" color="error" variant="subtle" :title="errorMessage" class="mb-4" />

      <div class="border border-(--ui-border) rounded-md bg-(--ui-bg-elevated) p-5">
        <form class="flex flex-col gap-4" @submit.prevent="onSubmit">
          <div>
            <label class="text-xs font-medium text-(--ui-text-muted) block mb-1">Name</label>
            <UInput v-model="state.name" placeholder="Full name" />
          </div>
          <div>
            <label class="text-xs font-medium text-(--ui-text-muted) block mb-1">Email</label>
            <UInput v-model="state.email" type="email" />
          </div>
          <div>
            <label class="text-xs font-medium text-(--ui-text-muted) block mb-1">Role</label>
            <USelect
              v-model="state.role"
              :items="roles.map(r => ({ label: r, value: r }))"
              :disabled="isSelf"
            />
            <p v-if="isSelf" class="text-xs text-(--ui-text-muted) mt-1">You cannot change your own role.</p>
          </div>
          <div>
            <label class="text-xs font-medium text-(--ui-text-muted) block mb-1">Phone</label>
            <UInput v-model="state.phone" type="tel" />
          </div>
          <div v-if="state.role === 'STAFF' || state.role === 'MANAGER'">
            <label class="text-xs font-medium text-(--ui-text-muted) block mb-1">Managed hotel</label>
            <USelect
              v-model="state.hotelId"
              :items="hotels.map((h: any) => ({ label: `${h.name} (${h.city})`, value: h.id }))"
              placeholder="Select a hotel"
            />
          </div>

          <div class="flex justify-end pt-4 border-t border-(--ui-border)">
            <UButton type="submit" color="primary" label="Save changes" :loading="submitting" />
          </div>
        </form>
      </div>
    </section>
  </div>
</template>
