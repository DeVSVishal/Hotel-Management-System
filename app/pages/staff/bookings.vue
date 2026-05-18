<script setup lang="ts">
const { user } = useUserSession()
if (!user.value || !['STAFF', 'MANAGER', 'ADMIN'].includes(user.value.role)) {
  navigateTo('/')
}

/* =======================================================
        Status filter + fetch
   ======================================================= */
const statusFilter = ref('all')
const statusItems = [
  { label: 'All', value: 'all' },
  { label: 'Confirmed', value: 'CONFIRMED' },
  { label: 'Checked-in', value: 'CHECKED_IN' },
  { label: 'Checked-out', value: 'CHECKED_OUT' },
  { label: 'Cancelled', value: 'CANCELLED' },
]

const { data, pending, refresh } = await useFetch('/api/staff/bookings', {
  query: computed(() => statusFilter.value === 'all' ? {} : { status: statusFilter.value }),
})
const bookings = computed<any[]>(() => data.value?.bookings ?? [])

function statusColor(s: string) {
  if (s === 'CONFIRMED') return 'info' as const
  if (s === 'CHECKED_IN') return 'success' as const
  if (s === 'CHECKED_OUT') return 'neutral' as const
  return 'error' as const
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString()
}

function rowAction(b: any) {
  if (b.status === 'CONFIRMED') return { to: `/staff/checkin/${b.id}`, label: 'Check in' }
  if (b.status === 'CHECKED_IN') return { to: `/staff/checkout/${b.id}`, label: 'Check out' }
  return null
}
</script>

<template>
  <div>
    <header class="mb-6 pb-4 border-b border-(--ui-border) flex items-end justify-between flex-wrap gap-3">
      <div>
        <h1 class="text-2xl font-bold">Bookings</h1>
        <p class="text-sm text-(--ui-text-muted) mt-1">All reservations for your hotel.</p>
      </div>
      <div class="flex gap-2 items-center">
        <label class="text-xs text-(--ui-text-muted)">Filter:</label>
        <USelect v-model="statusFilter" :items="statusItems" class="w-40" />
        <UButton size="sm" color="neutral" variant="outline" icon="i-lucide-refresh-cw" @click="refresh()" />
      </div>
    </header>

    <div v-if="pending" class="flex justify-center py-12">
      <UIcon name="i-lucide-loader-circle" class="h-6 w-6 animate-spin text-muted" />
    </div>

    <div v-else-if="bookings.length === 0" class="border border-(--ui-border) rounded-md py-10 text-center text-sm text-(--ui-text-muted)">
      No bookings found.
    </div>

    <div v-else class="border border-(--ui-border) rounded-md overflow-hidden bg-(--ui-bg-elevated)">
      <table class="w-full text-sm">
        <thead class="bg-(--ui-bg-muted) text-(--ui-text-muted) text-xs uppercase tracking-wider">
          <tr>
            <th class="text-left px-4 py-3 font-medium">#</th>
            <th class="text-left px-4 py-3 font-medium">Guest</th>
            <th class="text-left px-4 py-3 font-medium">Rooms</th>
            <th class="text-left px-4 py-3 font-medium">Check-in</th>
            <th class="text-left px-4 py-3 font-medium">Check-out</th>
            <th class="text-left px-4 py-3 font-medium">Status</th>
            <th class="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-(--ui-border)">
          <tr v-for="b in bookings" :key="b.id" class="hover:bg-(--ui-bg-muted) transition-colors">
            <td class="px-4 py-3 font-mono">{{ b.id }}</td>
            <td class="px-4 py-3">
              <div>{{ b.guest.name }}</div>
              <div class="text-xs text-(--ui-text-muted)">{{ b.guest.email }}</div>
            </td>
            <td class="px-4 py-3 text-xs text-(--ui-text-muted)">{{ b.bookingRooms.map((br: any) => br.room.roomNumber).join(', ') }}</td>
            <td class="px-4 py-3">{{ fmtDate(b.checkIn) }}</td>
            <td class="px-4 py-3">{{ fmtDate(b.checkOut) }}</td>
            <td class="px-4 py-3">
              <UBadge :color="statusColor(b.status)" variant="subtle" size="sm">{{ b.status.replace('_', ' ') }}</UBadge>
            </td>
            <td class="px-4 py-3 text-right whitespace-nowrap">
              <div class="flex justify-end gap-1">
                <UButton v-if="rowAction(b)" size="xs" color="primary" :to="rowAction(b)?.to">{{ rowAction(b)?.label }}</UButton>
                <UButton size="xs" color="neutral" variant="ghost" icon="i-lucide-eye" :to="`/guest/bookings/${b.id}`" />
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
