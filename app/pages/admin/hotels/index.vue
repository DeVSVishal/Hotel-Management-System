<script setup lang="ts">
const { user } = useUserSession()
if (user.value?.role !== 'ADMIN') navigateTo('/')

const { data, pending, refresh } = await useFetch('/api/hotels')
const hotels = computed<any[]>(() => data.value?.hotels ?? [])

const addModalOpen = ref(false)
const deleteTarget = ref<number | null>(null)
const error = ref('')

const form = reactive({ name: '', city: '', country: '' })
const saving = ref(false)

const deleteModalOpen = computed({
  get: () => deleteTarget.value !== null,
  set: (v) => { if (!v) deleteTarget.value = null },
})

async function addHotel() {
  if (!form.name || !form.city || !form.country) return
  saving.value = true
  error.value = ''
  try {
    await $fetch('/api/admin/hotels', { method: 'POST', body: { ...form } })
    addModalOpen.value = false
    Object.assign(form, { name: '', city: '', country: '' })
    refresh()
  } catch (e: any) {
    error.value = e?.data?.message ?? 'Failed to add hotel.'
  } finally {
    saving.value = false
  }
}

async function deleteHotel() {
  if (!deleteTarget.value) return
  try {
    await $fetch(`/api/admin/hotels/${deleteTarget.value}`, { method: 'DELETE' })
    deleteTarget.value = null
    refresh()
  } catch (e: any) {
    error.value = e?.data?.message ?? 'Failed to delete hotel.'
    deleteTarget.value = null
  }
}
</script>

<template>
  <div>
    <header class="mb-6 pb-4 border-b border-(--ui-border) flex items-end justify-between flex-wrap gap-3">
      <div>
        <h1 class="text-2xl font-bold">Hotels</h1>
        <p class="text-sm text-(--ui-text-muted) mt-1">Manage Verdan properties and their basic details.</p>
      </div>
      <UButton color="primary" icon="i-lucide-plus" @click="addModalOpen = true">Add hotel</UButton>
    </header>

    <UAlert v-if="error" color="error" variant="subtle" :title="error" class="mb-4" />

    <div v-if="pending" class="flex justify-center py-12">
      <UIcon name="i-lucide-loader-circle" class="h-6 w-6 animate-spin text-muted" />
    </div>

    <div v-else-if="hotels.length === 0" class="border border-(--ui-border) rounded-md py-10 text-center text-sm text-(--ui-text-muted)">
      No hotels found.
    </div>

    <div v-else class="border border-(--ui-border) rounded-md overflow-hidden bg-(--ui-bg-elevated)">
      <table class="w-full text-sm">
        <thead class="bg-(--ui-bg-muted) text-(--ui-text-muted) text-xs uppercase tracking-wider">
          <tr>
            <th class="text-left px-4 py-3 font-medium">Name</th>
            <th class="text-left px-4 py-3 font-medium">City</th>
            <th class="text-left px-4 py-3 font-medium">Country</th>
            <th class="text-right px-4 py-3 font-medium">Rooms</th>
            <th class="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-(--ui-border)">
          <tr v-for="h in hotels" :key="h.id" class="hover:bg-(--ui-bg-muted) transition-colors">
            <td class="px-4 py-3">
              <NuxtLink :to="`/admin/hotels/${h.id}`" class="font-medium text-(--ui-primary) hover:underline">{{ h.name }}</NuxtLink>
            </td>
            <td class="px-4 py-3">{{ h.city }}</td>
            <td class="px-4 py-3">{{ h.country }}</td>
            <td class="px-4 py-3 text-right">{{ h.roomCount }}</td>
            <td class="px-4 py-3 text-right whitespace-nowrap">
              <div class="flex justify-end gap-1">
                <UButton size="xs" color="neutral" variant="outline" :to="`/admin/hotels/${h.id}`">Edit</UButton>
                <UButton size="xs" color="error" variant="ghost" icon="i-lucide-trash-2" @click="deleteTarget = h.id" />
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <UModal v-model:open="addModalOpen" title="Add hotel">
      <template #body>
        <div class="flex flex-col gap-3">
          <div>
            <label class="text-xs font-medium text-(--ui-text-muted) block mb-1">Name</label>
            <UInput v-model="form.name" placeholder="Verdan Tokyo" />
          </div>
          <div>
            <label class="text-xs font-medium text-(--ui-text-muted) block mb-1">City</label>
            <UInput v-model="form.city" placeholder="Tokyo" />
          </div>
          <div>
            <label class="text-xs font-medium text-(--ui-text-muted) block mb-1">Country</label>
            <UInput v-model="form.country" placeholder="Japan" />
          </div>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2 w-full">
          <UButton label="Cancel" color="neutral" variant="outline" @click="addModalOpen = false" />
          <UButton label="Add" color="primary" :loading="saving" @click="addHotel" />
        </div>
      </template>
    </UModal>

    <UModal v-model:open="deleteModalOpen" title="Delete hotel">
      <template #body>
        <p class="text-sm text-(--ui-text-muted)">This will delete the hotel. Hotels with active bookings cannot be deleted.</p>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2 w-full">
          <UButton label="Cancel" color="neutral" variant="outline" @click="deleteTarget = null" />
          <UButton label="Delete" color="error" @click="deleteHotel" />
        </div>
      </template>
    </UModal>
  </div>
</template>
