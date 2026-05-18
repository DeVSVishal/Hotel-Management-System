<script setup lang="ts">
const { loggedIn } = useUserSession()
if (!loggedIn.value) navigateTo('/login')

/* =======================================================
        Load bookings + split into upcoming / past tabs
   ======================================================= */
const { data, pending, refresh } = await useFetch('/api/bookings')
const bookings = computed<any[]>(() => data.value?.bookings ?? [])

const now = new Date()
const upcoming = computed(() =>
  bookings.value.filter((b) => b.status !== 'CANCELLED' && b.status !== 'CHECKED_OUT' && new Date(b.checkOut) >= now),
)
const past = computed(() =>
  bookings.value.filter((b) => b.status === 'CANCELLED' || b.status === 'CHECKED_OUT' || new Date(b.checkOut) < now),
)

const activeTab = ref<'upcoming' | 'past'>('upcoming')
const visible = computed(() => (activeTab.value === 'upcoming' ? upcoming.value : past.value))

/* =======================================================
        Cancel-booking modal state
   ======================================================= */
const cancelTarget = ref<number | null>(null)
const cancelling = ref(false)
const cancelError = ref('')
const cancelSuccess = ref('')

const cancelModalOpen = computed({
  get: () => cancelTarget.value !== null,
  set: (v) => { if (!v) { cancelTarget.value = null; cancelError.value = '' } },
})

async function cancelBooking() {
  if (!cancelTarget.value) return
  cancelling.value = true
  cancelError.value = ''
  try {
    const res = await $fetch(`/api/bookings/${cancelTarget.value}/cancel`, { method: 'PUT' }) as any
    cancelSuccess.value = res?.cancellationFee > 0
      ? `Booking cancelled. Fee: £${res.cancellationFee.toFixed(2)}`
      : 'Booking cancelled (no fee).'
    cancelTarget.value = null
    refresh()
    setTimeout(() => { cancelSuccess.value = '' }, 6000)
  } catch (e: any) {
    cancelError.value = e?.data?.message ?? 'Cancel failed.'
  } finally {
    cancelling.value = false
  }
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function statusColor(s: string) {
  if (s === 'CONFIRMED') return 'info' as const
  if (s === 'CHECKED_IN') return 'success' as const
  if (s === 'CHECKED_OUT') return 'neutral' as const
  return 'error' as const
}

function bookingTotal(b: any) {
  const n = Math.ceil((new Date(b.checkOut).getTime() - new Date(b.checkIn).getTime()) / 86400000)
  const r = b.bookingRooms?.reduce((s: number, br: any) => s + br.priceAtBooking * n, 0) ?? 0
  const sv = b.services?.reduce((s: number, x: any) => s + x.price * x.quantity, 0) ?? 0
  return (r + sv).toFixed(2)
}
</script>

<template>
  <div class="max-w-5xl mx-auto px-4 py-8">
    <header class="mb-6 pb-4 border-b border-(--ui-border) flex items-end justify-between flex-wrap gap-3">
      <div>
        <NuxtLink to="/guest/dashboard" class="text-xs text-(--ui-text-muted) hover:underline">← Dashboard</NuxtLink>
        <h1 class="text-2xl font-bold mt-1">My Bookings</h1>
      </div>
      <UButton color="primary" icon="i-lucide-plus" to="/">New booking</UButton>
    </header>

    <UAlert v-if="cancelSuccess" color="success" variant="subtle" :title="cancelSuccess" class="mb-4" />

    <!-- ===================================================
                            Tabs
         =================================================== -->
    <div class="flex gap-6 mb-4 border-b border-(--ui-border)">
      <button
        v-for="tab in (['upcoming', 'past'] as const)"
        :key="tab"
        class="pb-3 px-1 text-sm font-medium capitalize border-b-2 transition-colors"
        :class="activeTab === tab
          ? 'border-(--ui-primary) text-(--ui-primary)'
          : 'border-transparent text-(--ui-text-muted) hover:text-(--ui-text)'"
        @click="activeTab = tab"
      >
        {{ tab }}
        <span class="ml-1 text-xs text-(--ui-text-dimmed)">({{ tab === 'upcoming' ? upcoming.length : past.length }})</span>
      </button>
    </div>

    <div v-if="pending" class="flex justify-center py-12">
      <UIcon name="i-lucide-loader-circle" class="h-6 w-6 animate-spin text-muted" />
    </div>

    <!-- ===================================================
                            Bookings table
         =================================================== -->
    <div v-else-if="visible.length === 0" class="border border-(--ui-border) rounded-md py-10 text-center text-sm text-(--ui-text-muted)">
      <template v-if="activeTab === 'upcoming'">
        No upcoming bookings. <NuxtLink to="/" class="text-(--ui-primary) underline">Search rooms</NuxtLink>.
      </template>
      <template v-else>
        No past bookings yet.
      </template>
    </div>

    <div v-else class="border border-(--ui-border) rounded-md overflow-hidden bg-(--ui-bg-elevated)">
      <table class="w-full text-sm">
        <thead class="bg-(--ui-bg-muted) text-(--ui-text-muted) text-xs uppercase tracking-wider">
          <tr>
            <th class="text-left px-4 py-3 font-medium">#</th>
            <th class="text-left px-4 py-3 font-medium">Hotel</th>
            <th class="text-left px-4 py-3 font-medium">Room(s)</th>
            <th class="text-left px-4 py-3 font-medium">Check-in</th>
            <th class="text-left px-4 py-3 font-medium">Check-out</th>
            <th class="text-left px-4 py-3 font-medium">Status</th>
            <th class="text-right px-4 py-3 font-medium">Total</th>
            <th class="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-(--ui-border)">
          <tr v-for="b in visible" :key="b.id" class="hover:bg-(--ui-bg-muted) transition-colors">
            <td class="px-4 py-3 font-mono">{{ b.id }}</td>
            <td class="px-4 py-3">{{ b.bookingRooms?.[0]?.room?.hotel?.name }}</td>
            <td class="px-4 py-3 text-(--ui-text-muted) text-xs">
              {{ b.bookingRooms?.map((br: any) => br.room?.roomNumber).join(', ') }}
            </td>
            <td class="px-4 py-3">{{ formatDate(b.checkIn) }}</td>
            <td class="px-4 py-3">{{ formatDate(b.checkOut) }}</td>
            <td class="px-4 py-3">
              <UBadge :color="statusColor(b.status)" variant="subtle" size="sm">{{ b.status }}</UBadge>
            </td>
            <td class="px-4 py-3 text-right font-medium">£{{ bookingTotal(b) }}</td>
            <td class="px-4 py-3 text-right whitespace-nowrap">
              <div class="flex justify-end gap-1">
                <UButton size="xs" color="neutral" variant="ghost" icon="i-lucide-eye" :to="`/guest/bookings/${b.id}`" />
                <UButton size="xs" color="neutral" variant="ghost" icon="i-lucide-file-text" :to="`/guest/bookings/${b.id}/invoice`" />
                <UButton
                  v-if="b.status === 'CONFIRMED'"
                  size="xs"
                  color="error"
                  variant="ghost"
                  icon="i-lucide-x"
                  @click="cancelTarget = b.id"
                />
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <UModal v-model:open="cancelModalOpen" title="Cancel booking">
      <template #body>
        <p class="text-sm text-muted">
          Cancellation fees may apply depending on how close to check-in you are cancelling.
          This action cannot be undone.
        </p>
        <UAlert v-if="cancelError" color="error" variant="subtle" :title="cancelError" class="mt-3" />
      </template>
      <template #footer>
        <div class="flex justify-end gap-2 w-full">
          <UButton label="Keep booking" color="neutral" variant="outline" @click="cancelModalOpen = false" />
          <UButton label="Yes, cancel" color="error" :loading="cancelling" @click="cancelBooking" />
        </div>
      </template>
    </UModal>
  </div>
</template>
