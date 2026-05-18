<script setup lang="ts">
const { loggedIn, user } = useUserSession()
if (!loggedIn.value) navigateTo('/login')

/* =======================================================
        Load bookings + derive dashboard summaries
   ======================================================= */
const { data, pending } = await useFetch('/api/bookings')
const bookings = computed<any[]>(() => data.value?.bookings ?? [])

const now = new Date()

function nights(b: any) {
  return Math.max(1, Math.ceil((new Date(b.checkOut).getTime() - new Date(b.checkIn).getTime()) / 86400000))
}
function bookingTotal(b: any) {
  const n = nights(b)
  const rooms = b.bookingRooms?.reduce((s: number, br: any) => s + br.priceAtBooking * n, 0) ?? 0
  const svc = b.services?.reduce((s: number, sv: any) => s + sv.price * sv.quantity, 0) ?? 0
  return Math.round((rooms + svc) * 100) / 100
}

const activeStay = computed(() => bookings.value.find((b) => b.status === 'CHECKED_IN'))
const upcoming = computed(() =>
  bookings.value
    .filter((b) => b.status === 'CONFIRMED' && new Date(b.checkIn) >= now)
    .sort((a, b) => new Date(a.checkIn).getTime() - new Date(b.checkIn).getTime()),
)
const history = computed(() => bookings.value.filter((b) => b.status === 'CHECKED_OUT' || b.status === 'CANCELLED'))

const totalSpent = computed(() =>
  bookings.value
    .filter((b) => b.status === 'CHECKED_OUT' || b.status === 'CHECKED_IN')
    .reduce((s, b) => s + bookingTotal(b), 0),
)

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function statusColor(s: string) {
  if (s === 'CONFIRMED') return 'info' as const
  if (s === 'CHECKED_IN') return 'success' as const
  if (s === 'CHECKED_OUT') return 'neutral' as const
  return 'error' as const
}
</script>

<template>
  <div class="max-w-5xl mx-auto px-4 py-8">
    <!-- ===================================================
                          Page heading
         =================================================== -->
    <header class="mb-8 pb-4 border-b border-(--ui-border)">
      <h1 class="text-2xl font-bold">Welcome back, {{ user?.name?.split(' ')[0] ?? 'Guest' }}</h1>
      <p class="text-sm text-(--ui-text-muted) mt-1">
        Manage your reservations and plan your next stay.
      </p>
      <div class="mt-4 flex gap-2 flex-wrap">
        <UButton color="primary" icon="i-lucide-search" to="/">Search rooms</UButton>
        <UButton color="neutral" variant="outline" icon="i-lucide-calendar-days" to="/guest/bookings">All bookings</UButton>
        <UButton color="neutral" variant="outline" icon="i-lucide-user" to="/guest/profile">Profile</UButton>
      </div>
    </header>

    <div v-if="pending" class="flex justify-center py-12">
      <UIcon name="i-lucide-loader-circle" class="h-6 w-6 animate-spin text-muted" />
    </div>

    <template v-else>
      <!-- ===================================================
                            Stats row
           =================================================== -->
      <section class="mb-8">
        <div class="border border-(--ui-border) rounded-md divide-x divide-(--ui-border) grid grid-cols-2 sm:grid-cols-4 bg-(--ui-bg-elevated)">
          <div class="p-4">
            <div class="text-xs text-(--ui-text-muted) uppercase tracking-wider">Active stay</div>
            <div class="text-2xl font-bold mt-1">{{ activeStay ? 1 : 0 }}</div>
          </div>
          <div class="p-4">
            <div class="text-xs text-(--ui-text-muted) uppercase tracking-wider">Upcoming</div>
            <div class="text-2xl font-bold mt-1">{{ upcoming.length }}</div>
          </div>
          <div class="p-4">
            <div class="text-xs text-(--ui-text-muted) uppercase tracking-wider">Past stays</div>
            <div class="text-2xl font-bold mt-1">{{ history.length }}</div>
          </div>
          <div class="p-4">
            <div class="text-xs text-(--ui-text-muted) uppercase tracking-wider">Total spent</div>
            <div class="text-2xl font-bold mt-1 text-(--ui-primary)">£{{ totalSpent.toFixed(2) }}</div>
          </div>
        </div>
      </section>

      <!-- ===================================================
                  Active stay panel (if checked in)
           =================================================== -->
      <section v-if="activeStay" class="mb-8">
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-lg font-semibold flex items-center gap-2">
            <UBadge color="success" variant="subtle">CHECKED IN</UBadge>
            Current stay
          </h2>
          <UButton size="sm" color="neutral" variant="outline" :to="`/guest/bookings/${activeStay.id}`">View details</UButton>
        </div>
        <div class="border border-(--ui-border) rounded-md bg-(--ui-bg-elevated)">
          <dl class="divide-y divide-(--ui-border) text-sm">
            <div class="flex px-4 py-3">
              <dt class="w-32 text-(--ui-text-muted)">Hotel</dt>
              <dd class="font-medium">{{ activeStay.bookingRooms?.[0]?.room?.hotel?.name }}</dd>
            </div>
            <div class="flex px-4 py-3">
              <dt class="w-32 text-(--ui-text-muted)">Room</dt>
              <dd>{{ activeStay.bookingRooms?.map((br: any) => br.room?.roomNumber).join(', ') }}</dd>
            </div>
            <div class="flex px-4 py-3">
              <dt class="w-32 text-(--ui-text-muted)">Check-out</dt>
              <dd>{{ formatDate(activeStay.checkOut) }}</dd>
            </div>
            <div class="flex px-4 py-3">
              <dt class="w-32 text-(--ui-text-muted)">Running total</dt>
              <dd class="font-semibold">£{{ bookingTotal(activeStay).toFixed(2) }}</dd>
            </div>
          </dl>
        </div>
      </section>

      <!-- ===================================================
                          Upcoming bookings
           =================================================== -->
      <section class="mb-8">
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-lg font-semibold">Upcoming bookings</h2>
          <NuxtLink to="/guest/bookings" class="text-xs text-(--ui-primary) hover:underline">View all →</NuxtLink>
        </div>
        <div v-if="upcoming.length === 0" class="border border-(--ui-border) rounded-md py-8 text-center text-sm text-(--ui-text-muted)">
          No upcoming bookings. <NuxtLink to="/" class="text-(--ui-primary) underline">Search rooms</NuxtLink> to plan your next stay.
        </div>
        <div v-else class="border border-(--ui-border) rounded-md overflow-hidden bg-(--ui-bg-elevated)">
          <table class="w-full text-sm">
            <thead class="bg-(--ui-bg-muted) text-(--ui-text-muted) text-xs uppercase tracking-wider">
              <tr>
                <th class="text-left px-4 py-2 font-medium">#</th>
                <th class="text-left px-4 py-2 font-medium">Hotel</th>
                <th class="text-left px-4 py-2 font-medium">Check-in</th>
                <th class="text-left px-4 py-2 font-medium">Check-out</th>
                <th class="text-right px-4 py-2 font-medium">Total</th>
                <th class="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-(--ui-border)">
              <tr v-for="b in upcoming.slice(0, 5)" :key="b.id">
                <td class="px-4 py-2 font-mono">{{ b.id }}</td>
                <td class="px-4 py-2">{{ b.bookingRooms?.[0]?.room?.hotel?.name }}</td>
                <td class="px-4 py-2">{{ formatDate(b.checkIn) }}</td>
                <td class="px-4 py-2">{{ formatDate(b.checkOut) }}</td>
                <td class="px-4 py-2 text-right font-medium">£{{ bookingTotal(b).toFixed(2) }}</td>
                <td class="px-4 py-2 text-right">
                  <UButton size="xs" color="neutral" variant="ghost" :to="`/guest/bookings/${b.id}`">Details</UButton>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- ===================================================
                          Recent history
           =================================================== -->
      <section>
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-lg font-semibold">Recent history</h2>
          <NuxtLink to="/guest/bookings" class="text-xs text-(--ui-primary) hover:underline">View all →</NuxtLink>
        </div>
        <div v-if="history.length === 0" class="border border-(--ui-border) rounded-md py-8 text-center text-sm text-(--ui-text-muted)">
          No past stays yet.
        </div>
        <div v-else class="border border-(--ui-border) rounded-md overflow-hidden bg-(--ui-bg-elevated)">
          <table class="w-full text-sm">
            <thead class="bg-(--ui-bg-muted) text-(--ui-text-muted) text-xs uppercase tracking-wider">
              <tr>
                <th class="text-left px-4 py-2 font-medium">#</th>
                <th class="text-left px-4 py-2 font-medium">Hotel</th>
                <th class="text-left px-4 py-2 font-medium">Dates</th>
                <th class="text-left px-4 py-2 font-medium">Status</th>
                <th class="text-right px-4 py-2 font-medium">Total</th>
                <th class="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-(--ui-border)">
              <tr v-for="b in history.slice(0, 5)" :key="b.id">
                <td class="px-4 py-2 font-mono">{{ b.id }}</td>
                <td class="px-4 py-2">{{ b.bookingRooms?.[0]?.room?.hotel?.name }}</td>
                <td class="px-4 py-2">{{ formatDate(b.checkIn) }} → {{ formatDate(b.checkOut) }}</td>
                <td class="px-4 py-2">
                  <UBadge :color="statusColor(b.status)" variant="subtle" size="sm">{{ b.status }}</UBadge>
                </td>
                <td class="px-4 py-2 text-right font-medium">£{{ bookingTotal(b).toFixed(2) }}</td>
                <td class="px-4 py-2 text-right">
                  <NuxtLink v-if="b.invoice" :to="`/guest/bookings/${b.id}/invoice`" class="text-xs text-(--ui-primary) hover:underline">Invoice →</NuxtLink>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>
  </div>
</template>
