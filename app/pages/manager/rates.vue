<script setup lang="ts">
const { user } = useUserSession()
if (!user.value || !['MANAGER', 'ADMIN'].includes(user.value.role)) {
  navigateTo('/')
}

const { data, pending, refresh } = await useFetch('/api/manager/rooms')
const rooms = computed<any[]>(() => data.value?.rooms ?? [])

const edits = ref<Record<number, { priceOffPeak: number; pricePeak: number }>>({})
const savingId = ref<number | null>(null)
const errorMsg = ref('')
const successMsg = ref('')

watch(rooms, (rs) => {
  for (const r of rs) {
    if (!edits.value[r.id]) {
      edits.value[r.id] = { priceOffPeak: r.priceOffPeak, pricePeak: r.pricePeak }
    }
  }
}, { immediate: true })

async function saveRates(room: any) {
  errorMsg.value = ''
  successMsg.value = ''
  const e = edits.value[room.id]
  if (!e) return
  if (e.priceOffPeak === room.priceOffPeak && e.pricePeak === room.pricePeak) {
    successMsg.value = 'No changes.'
    return
  }
  savingId.value = room.id
  try {
    await $fetch(`/api/manager/rooms/${room.id}/rates`, {
      method: 'PUT',
      body: { priceOffPeak: Number(e.priceOffPeak), pricePeak: Number(e.pricePeak) },
    })
    successMsg.value = `Updated room ${room.roomNumber}.`
    refresh()
  } catch (err: any) {
    errorMsg.value = err?.data?.message ?? 'Failed to update rates'
  } finally {
    savingId.value = null
  }
}
</script>

<template>
  <div>
    <header class="mb-6 pb-4 border-b border-(--ui-border)">
      <h1 class="text-2xl font-bold">Room rates</h1>
      <p class="text-sm text-(--ui-text-muted) mt-1">Update peak / off-peak nightly rates per room. Existing bookings keep their booked price.</p>
    </header>

    <UAlert v-if="errorMsg" color="error" variant="subtle" :title="errorMsg" class="mb-4" />
    <UAlert v-if="successMsg" color="success" variant="subtle" :title="successMsg" class="mb-4" />

    <div v-if="pending" class="flex justify-center py-12">
      <UIcon name="i-lucide-loader-circle" class="h-6 w-6 animate-spin text-muted" />
    </div>

    <div v-else-if="rooms.length === 0" class="border border-(--ui-border) rounded-md py-10 text-center text-sm text-(--ui-text-muted)">
      No rooms found.
    </div>

    <div v-else class="border border-(--ui-border) rounded-md overflow-hidden bg-(--ui-bg-elevated)">
      <table class="w-full text-sm">
        <thead class="bg-(--ui-bg-muted) text-(--ui-text-muted) text-xs uppercase tracking-wider">
          <tr>
            <th class="text-left px-4 py-3 font-medium">Room</th>
            <th class="text-left px-4 py-3 font-medium">Hotel</th>
            <th class="text-left px-4 py-3 font-medium">Type</th>
            <th class="text-left px-4 py-3 font-medium">Off-peak £</th>
            <th class="text-left px-4 py-3 font-medium">Peak £</th>
            <th class="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-(--ui-border)">
          <tr v-for="r in rooms" :key="r.id">
            <td class="px-4 py-3 font-mono">{{ r.roomNumber }}</td>
            <td class="px-4 py-3">{{ r.hotel?.name }}</td>
            <td class="px-4 py-3">{{ r.type.replace(/_/g, ' ') }}</td>
            <td class="px-4 py-3">
              <UInput v-if="edits[r.id]" v-model="edits[r.id]!.priceOffPeak" type="number" min="0" size="sm" class="w-28" />
            </td>
            <td class="px-4 py-3">
              <UInput v-if="edits[r.id]" v-model="edits[r.id]!.pricePeak" type="number" min="0" size="sm" class="w-28" />
            </td>
            <td class="px-4 py-3 text-right">
              <UButton size="xs" color="primary" :loading="savingId === r.id" @click="saveRates(r)">Save</UButton>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
