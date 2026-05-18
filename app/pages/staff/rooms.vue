<script setup lang="ts">
const { user } = useUserSession()
if (!user.value || !['STAFF', 'MANAGER', 'ADMIN'].includes(user.value.role)) {
  navigateTo('/')
}

/* =======================================================
        Filters + fetch
   ======================================================= */
const statusFilter = ref('all')
const typeFilter = ref('all')

const statusItems = [
  { label: 'All', value: 'all' },
  { label: 'Available', value: 'AVAILABLE' },
  { label: 'Occupied', value: 'OCCUPIED' },
  { label: 'Cleaning', value: 'CLEANING' },
  { label: 'Out of service', value: 'OUT_OF_SERVICE' },
]
const typeItems = [
  { label: 'All', value: 'all' },
  { label: 'Standard Double', value: 'STANDARD_DOUBLE' },
  { label: 'Deluxe King', value: 'DELUXE_KING' },
  { label: 'Family Suite', value: 'FAMILY_SUITE' },
  { label: 'Penthouse', value: 'PENTHOUSE' },
]

const { data, pending, refresh } = await useFetch('/api/staff/rooms', {
  query: computed(() => {
    const q: Record<string, string> = {}
    if (statusFilter.value !== 'all') q.status = statusFilter.value
    if (typeFilter.value !== 'all') q.type = typeFilter.value
    return q
  }),
})
const rooms = computed<any[]>(() => data.value?.rooms ?? [])

function statusColor(s: string) {
  if (s === 'AVAILABLE') return 'success' as const
  if (s === 'OCCUPIED') return 'error' as const
  if (s === 'CLEANING') return 'warning' as const
  return 'neutral' as const
}

/* =======================================================
        Allowed status transitions per current status
   ======================================================= */
const allowed: Record<string, string[]> = {
  AVAILABLE: ['CLEANING', 'OUT_OF_SERVICE'],
  CLEANING: ['AVAILABLE', 'OUT_OF_SERVICE'],
  OUT_OF_SERVICE: ['AVAILABLE'],
  OCCUPIED: ['CLEANING'],
}

const errorMsg = ref('')
const savingId = ref<number | null>(null)

async function setStatus(room: any, newStatus: string) {
  errorMsg.value = ''
  savingId.value = room.id
  try {
    await $fetch(`/api/staff/rooms/${room.id}/status`, {
      method: 'PUT',
      body: { status: newStatus },
    })
    refresh()
  } catch (e: any) {
    errorMsg.value = e?.data?.message ?? 'Failed to update status'
  } finally {
    savingId.value = null
  }
}
</script>

<template>
  <div>
    <header class="mb-6 pb-4 border-b border-(--ui-border) flex items-end justify-between flex-wrap gap-3">
      <div>
        <h1 class="text-2xl font-bold">Rooms</h1>
        <p class="text-sm text-(--ui-text-muted) mt-1">Update room status as you clean and inspect.</p>
      </div>
      <div class="flex gap-2 items-end flex-wrap">
        <div>
          <label class="text-xs text-(--ui-text-muted) block mb-1">Status</label>
          <USelect v-model="statusFilter" :items="statusItems" class="w-40" />
        </div>
        <div>
          <label class="text-xs text-(--ui-text-muted) block mb-1">Type</label>
          <USelect v-model="typeFilter" :items="typeItems" class="w-44" />
        </div>
      </div>
    </header>

    <UAlert v-if="errorMsg" color="error" variant="subtle" :title="errorMsg" class="mb-4" />

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
            <th class="text-left px-4 py-3 font-medium">Capacity</th>
            <th class="text-left px-4 py-3 font-medium">Status</th>
            <th class="text-left px-4 py-3 font-medium">Change status to</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-(--ui-border)">
          <tr v-for="r in rooms" :key="r.id" class="hover:bg-(--ui-bg-muted) transition-colors">
            <td class="px-4 py-3 font-mono">{{ r.roomNumber }}</td>
            <td class="px-4 py-3">{{ r.hotel?.name }}</td>
            <td class="px-4 py-3">{{ r.type.replace(/_/g, ' ') }}</td>
            <td class="px-4 py-3">{{ r.capacity }}</td>
            <td class="px-4 py-3">
              <UBadge :color="statusColor(r.status)" variant="subtle" size="sm">{{ r.status.replace('_', ' ') }}</UBadge>
            </td>
            <td class="px-4 py-3">
              <div class="flex gap-1 flex-wrap">
                <UButton
                  v-for="opt in (allowed[r.status] || [])"
                  :key="opt"
                  size="xs"
                  color="neutral"
                  variant="outline"
                  :loading="savingId === r.id"
                  @click="setStatus(r, opt)"
                >
                  → {{ opt.replace('_', ' ') }}
                </UButton>
                <span v-if="(allowed[r.status] || []).length === 0" class="text-xs text-(--ui-text-muted)">—</span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
