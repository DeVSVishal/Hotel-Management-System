<script setup lang="ts">
const { user } = useUserSession()
if (user.value?.role !== 'ADMIN') navigateTo('/')

const route = useRoute()
const id = route.params.id as string

const { data, pending } = await useFetch(`/api/hotels/${id}`)
const hotel = computed(() => data.value?.hotel)

const form = reactive({ name: '', city: '', country: '' })
const saving = ref(false)
const success = ref(false)
const error = ref('')

watch(hotel, (h) => {
  if (h) {
    form.name = h.name
    form.city = h.city
    form.country = h.country
  }
}, { immediate: true })

async function save() {
  saving.value = true
  error.value = ''
  success.value = false
  try {
    await $fetch(`/api/admin/hotels/${id}`, { method: 'PUT', body: { ...form } })
    success.value = true
  } catch (e: any) {
    error.value = e?.data?.message ?? 'Failed to save.'
  } finally {
    saving.value = false
  }
}

function statusColor(s: string) {
  if (s === 'AVAILABLE') return 'success' as const
  if (s === 'OCCUPIED') return 'error' as const
  if (s === 'CLEANING') return 'warning' as const
  return 'neutral' as const
}
</script>

<template>
  <div class="max-w-3xl">
    <header class="mb-6 pb-4 border-b border-(--ui-border)">
      <NuxtLink to="/admin/hotels" class="text-xs text-(--ui-text-muted) hover:underline">← Hotels</NuxtLink>
      <h1 class="text-2xl font-bold mt-1">Edit hotel</h1>
    </header>

    <div v-if="pending" class="flex justify-center py-12">
      <UIcon name="i-lucide-loader-circle" class="h-6 w-6 animate-spin text-muted" />
    </div>

    <UAlert v-else-if="!hotel" color="error" variant="subtle" title="Hotel not found" />

    <div v-else>
      <!-- ===================================================
                            Edit form
           =================================================== -->
      <section class="mb-8">
        <h2 class="text-sm font-semibold text-(--ui-text-muted) uppercase tracking-wider mb-3">Hotel details</h2>
        <div class="border border-(--ui-border) rounded-md bg-(--ui-bg-elevated) p-5">
          <div class="flex flex-col gap-4">
            <div>
              <label class="text-xs font-medium text-(--ui-text-muted) block mb-1">Name</label>
              <UInput v-model="form.name" />
            </div>
            <div>
              <label class="text-xs font-medium text-(--ui-text-muted) block mb-1">City</label>
              <UInput v-model="form.city" />
            </div>
            <div>
              <label class="text-xs font-medium text-(--ui-text-muted) block mb-1">Country</label>
              <UInput v-model="form.country" />
            </div>
          </div>
          <div class="flex items-center justify-between mt-5 pt-4 border-t border-(--ui-border)">
            <div class="flex-1 mr-4">
              <UAlert v-if="success" color="success" variant="subtle" title="Saved" />
              <UAlert v-if="error" color="error" variant="subtle" :title="error" />
            </div>
            <UButton color="primary" :loading="saving" @click="save">Save changes</UButton>
          </div>
        </div>
      </section>

      <!-- ===================================================
                          Rooms in this hotel
           =================================================== -->
      <section>
        <h2 class="text-sm font-semibold text-(--ui-text-muted) uppercase tracking-wider mb-3">Rooms ({{ hotel.rooms?.length ?? 0 }})</h2>
        <div class="border border-(--ui-border) rounded-md overflow-hidden bg-(--ui-bg-elevated)">
          <table class="w-full text-sm">
            <thead class="bg-(--ui-bg-muted) text-(--ui-text-muted) text-xs uppercase tracking-wider">
              <tr>
                <th class="text-left px-4 py-2 font-medium">Room</th>
                <th class="text-left px-4 py-2 font-medium">Type</th>
                <th class="text-left px-4 py-2 font-medium">Status</th>
                <th class="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-(--ui-border)">
              <tr v-for="r in hotel.rooms" :key="r.id">
                <td class="px-4 py-2 font-mono">{{ r.roomNumber }}</td>
                <td class="px-4 py-2">{{ r.type.replace(/_/g, ' ') }}</td>
                <td class="px-4 py-2">
                  <UBadge :color="statusColor(r.status)" variant="subtle" size="sm">{{ r.status.replace('_', ' ') }}</UBadge>
                </td>
                <td class="px-4 py-2 text-right">
                  <UButton size="xs" color="neutral" variant="outline" :to="`/admin/rooms/${r.id}`">Edit</UButton>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  </div>
</template>
