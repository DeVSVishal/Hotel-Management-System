<script setup lang="ts">
const { user } = useUserSession()
if (!user.value || !['STAFF', 'MANAGER', 'ADMIN'].includes(user.value.role)) {
  navigateTo('/')
}

/* =======================================================
        Fetch aggregated dashboard payload
   ======================================================= */
const { data, pending, refresh } = await useFetch('/api/staff/dashboard')

const occupancy = computed(() => data.value?.occupancy ?? {
  totalRooms: 0, occupiedRooms: 0, availableRooms: 0, cleaningRooms: 0, outOfServiceRooms: 0, occupancyRate: 0,
})
const arrivals = computed(() => data.value?.todayArrivals ?? [])
const departures = computed(() => data.value?.todayDepartures ?? [])
const activity = computed(() => data.value?.recentActivity ?? [])

function formatTime(ts: string) {
  return new Date(ts).toLocaleString()
}

function actionColor(action: string) {
  if (action === 'CHECK_IN') return 'success' as const
  if (action === 'CHECK_OUT') return 'info' as const
  if (action === 'BOOKING_CANCEL') return 'error' as const
  if (action === 'ROOM_STATUS_CHANGE') return 'warning' as const
  return 'neutral' as const
}
</script>

<template>
  <div>
    <header class="mb-6 pb-4 border-b border-(--ui-border) flex items-end justify-between flex-wrap gap-3">
      <div>
        <h1 class="text-2xl font-bold">Dashboard</h1>
        <p class="text-sm text-(--ui-text-muted) mt-1">Today's arrivals, departures, and live occupancy.</p>
      </div>
      <UButton size="sm" color="neutral" variant="outline" icon="i-lucide-refresh-cw" @click="refresh()">Refresh</UButton>
    </header>

    <div v-if="pending" class="flex justify-center py-12">
      <UIcon name="i-lucide-loader-circle" class="h-6 w-6 animate-spin text-muted" />
    </div>

    <div v-else>
      <!-- ===================================================
                          Occupancy stats row
           =================================================== -->
      <section class="mb-8">
        <h2 class="text-sm font-semibold text-(--ui-text-muted) uppercase tracking-wider mb-3">Occupancy</h2>
        <div class="border border-(--ui-border) rounded-md divide-x divide-(--ui-border) grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 bg-(--ui-bg-elevated)">
          <div class="p-4">
            <div class="text-xs text-(--ui-text-muted) uppercase tracking-wider">Total</div>
            <div class="text-2xl font-bold mt-1">{{ occupancy.totalRooms }}</div>
          </div>
          <div class="p-4">
            <div class="text-xs text-(--ui-text-muted) uppercase tracking-wider">Occupied</div>
            <div class="text-2xl font-bold mt-1">{{ occupancy.occupiedRooms }}</div>
          </div>
          <div class="p-4">
            <div class="text-xs text-(--ui-text-muted) uppercase tracking-wider">Available</div>
            <div class="text-2xl font-bold mt-1">{{ occupancy.availableRooms }}</div>
          </div>
          <div class="p-4">
            <div class="text-xs text-(--ui-text-muted) uppercase tracking-wider">Cleaning</div>
            <div class="text-2xl font-bold mt-1">{{ occupancy.cleaningRooms }}</div>
          </div>
          <div class="p-4">
            <div class="text-xs text-(--ui-text-muted) uppercase tracking-wider">Out of service</div>
            <div class="text-2xl font-bold mt-1">{{ occupancy.outOfServiceRooms }}</div>
          </div>
          <div class="p-4 bg-(--ui-primary)/5">
            <div class="text-xs text-(--ui-text-muted) uppercase tracking-wider">Occupancy</div>
            <div class="text-2xl font-bold mt-1 text-(--ui-primary)">{{ occupancy.occupancyRate }}%</div>
          </div>
        </div>
      </section>

      <!-- ===================================================
                          Today's arrivals
           =================================================== -->
      <section class="mb-8">
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-sm font-semibold text-(--ui-text-muted) uppercase tracking-wider">
            Today's arrivals
            <span class="ml-2 text-(--ui-text-dimmed)">({{ arrivals.length }})</span>
          </h2>
        </div>
        <div v-if="arrivals.length === 0" class="border border-(--ui-border) rounded-md py-6 text-center text-sm text-(--ui-text-muted)">
          No arrivals today.
        </div>
        <div v-else class="border border-(--ui-border) rounded-md overflow-hidden bg-(--ui-bg-elevated)">
          <table class="w-full text-sm">
            <thead class="bg-(--ui-bg-muted) text-(--ui-text-muted) text-xs uppercase tracking-wider">
              <tr>
                <th class="text-left px-4 py-2 font-medium">Booking</th>
                <th class="text-left px-4 py-2 font-medium">Guest</th>
                <th class="text-left px-4 py-2 font-medium">Rooms</th>
                <th class="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-(--ui-border)">
              <tr v-for="a in arrivals" :key="a.bookingId">
                <td class="px-4 py-2 font-mono">#{{ a.bookingId }}</td>
                <td class="px-4 py-2">{{ a.guestName }}</td>
                <td class="px-4 py-2 text-(--ui-text-muted)">{{ a.roomNumbers.join(', ') }}</td>
                <td class="px-4 py-2 text-right">
                  <UButton size="xs" color="primary" :to="`/staff/checkin/${a.bookingId}`">Check in</UButton>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- ===================================================
                        Today's departures
           =================================================== -->
      <section class="mb-8">
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-sm font-semibold text-(--ui-text-muted) uppercase tracking-wider">
            Today's departures
            <span class="ml-2 text-(--ui-text-dimmed)">({{ departures.length }})</span>
          </h2>
        </div>
        <div v-if="departures.length === 0" class="border border-(--ui-border) rounded-md py-6 text-center text-sm text-(--ui-text-muted)">
          No departures today.
        </div>
        <div v-else class="border border-(--ui-border) rounded-md overflow-hidden bg-(--ui-bg-elevated)">
          <table class="w-full text-sm">
            <thead class="bg-(--ui-bg-muted) text-(--ui-text-muted) text-xs uppercase tracking-wider">
              <tr>
                <th class="text-left px-4 py-2 font-medium">Booking</th>
                <th class="text-left px-4 py-2 font-medium">Guest</th>
                <th class="text-left px-4 py-2 font-medium">Rooms</th>
                <th class="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-(--ui-border)">
              <tr v-for="d in departures" :key="d.bookingId">
                <td class="px-4 py-2 font-mono">#{{ d.bookingId }}</td>
                <td class="px-4 py-2">{{ d.guestName }}</td>
                <td class="px-4 py-2 text-(--ui-text-muted)">{{ d.roomNumbers.join(', ') }}</td>
                <td class="px-4 py-2 text-right">
                  <UButton size="xs" color="primary" :to="`/staff/checkout/${d.bookingId}`">Check out</UButton>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- ===================================================
                          Activity feed
           =================================================== -->
      <section>
        <h2 class="text-sm font-semibold text-(--ui-text-muted) uppercase tracking-wider mb-3">Recent activity</h2>
        <div v-if="activity.length === 0" class="border border-(--ui-border) rounded-md py-6 text-center text-sm text-(--ui-text-muted)">
          No recent activity.
        </div>
        <ul v-else class="border border-(--ui-border) rounded-md divide-y divide-(--ui-border) bg-(--ui-bg-elevated)">
          <li v-for="log in activity" :key="log.id" class="px-4 py-2 flex items-center justify-between text-sm">
            <div class="flex items-center gap-3 min-w-0">
              <UBadge :color="actionColor(log.action)" variant="subtle" size="sm">{{ log.action }}</UBadge>
              <span class="truncate">{{ log.details }}</span>
              <span class="text-xs text-(--ui-text-muted) hidden sm:inline">by {{ log.userName }}</span>
            </div>
            <span class="text-xs text-(--ui-text-muted) whitespace-nowrap ml-3">{{ formatTime(log.timestamp) }}</span>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>
