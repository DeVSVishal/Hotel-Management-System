<script setup lang="ts">
const { loggedIn } = useUserSession()
if (!loggedIn.value) navigateTo('/login')

const route = useRoute()
const id = route.params.id as string

const { data, pending, refresh } = await useFetch(`/api/bookings/${id}`)
const booking = computed(() => data.value?.booking)

const cancelling = ref(false)
const cancelError = ref('')
const cancelModalOpen = ref(false)
const cancelResult = ref<{ cancellationFee: number } | null>(null)

async function cancelBooking() {
  cancelling.value = true
  cancelError.value = ''
  try {
    const res = await $fetch(`/api/bookings/${id}/cancel`, { method: 'PUT' }) as any
    cancelResult.value = res
    cancelModalOpen.value = false
    refresh()
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

function formatService(s: string) {
  return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

const nights = computed(() => {
  if (!booking.value) return 0
  return Math.ceil((new Date(booking.value.checkOut).getTime() - new Date(booking.value.checkIn).getTime()) / 86400000)
})

const roomTotal = computed(() =>
  (booking.value?.bookingRooms ?? []).reduce((s: number, br: any) => s + br.priceAtBooking * nights.value, 0),
)

const servicesTotal = computed(() =>
  (booking.value?.services ?? []).reduce((s: number, sv: any) => s + sv.price * sv.quantity, 0),
)

const grandTotal = computed(() => roomTotal.value + servicesTotal.value)
</script>

<template>
  <div class="max-w-3xl mx-auto px-4 py-8">
    <div v-if="pending" class="flex justify-center py-16">
      <UIcon name="i-lucide-loader-circle" class="h-6 w-6 animate-spin text-muted" />
    </div>

    <div v-else-if="!booking">
      <UAlert color="error" variant="subtle" title="Booking not found" />
    </div>

    <div v-else>
      <!-- ===================================================
                          Page heading
           =================================================== -->
      <header class="mb-6 pb-4 border-b border-(--ui-border) flex items-end justify-between flex-wrap gap-3">
        <div>
          <NuxtLink to="/guest/bookings" class="text-xs text-(--ui-text-muted) hover:underline">← My Bookings</NuxtLink>
          <h1 class="text-2xl font-bold mt-1">Booking #{{ booking.id }}</h1>
        </div>
        <UBadge :color="statusColor(booking.status)" variant="subtle" size="lg">{{ booking.status }}</UBadge>
      </header>

      <UAlert
        v-if="cancelResult"
        color="success"
        variant="subtle"
        :title="`Booking cancelled. Fee: £${cancelResult.cancellationFee.toFixed(2)}`"
        class="mb-4"
      />

      <!-- ===================================================
                          Stay details
           =================================================== -->
      <section class="mb-6">
        <h2 class="text-sm font-semibold text-(--ui-text-muted) uppercase tracking-wider mb-2">Stay details</h2>
        <div class="border border-(--ui-border) rounded-md bg-(--ui-bg-elevated)">
          <dl class="divide-y divide-(--ui-border) text-sm">
            <div class="flex px-4 py-3">
              <dt class="w-40 text-(--ui-text-muted)">Hotel</dt>
              <dd class="font-medium">{{ booking.bookingRooms?.[0]?.room?.hotel?.name }}</dd>
            </div>
            <div class="flex px-4 py-3">
              <dt class="w-40 text-(--ui-text-muted)">Check-in</dt>
              <dd>{{ formatDate(booking.checkIn) }}</dd>
            </div>
            <div class="flex px-4 py-3">
              <dt class="w-40 text-(--ui-text-muted)">Check-out</dt>
              <dd>{{ formatDate(booking.checkOut) }}</dd>
            </div>
            <div class="flex px-4 py-3">
              <dt class="w-40 text-(--ui-text-muted)">Nights</dt>
              <dd>{{ nights }}</dd>
            </div>
          </dl>
        </div>
      </section>

      <!-- ===================================================
                          Rooms table
           =================================================== -->
      <section class="mb-6">
        <h2 class="text-sm font-semibold text-(--ui-text-muted) uppercase tracking-wider mb-2">Rooms</h2>
        <div class="border border-(--ui-border) rounded-md overflow-hidden bg-(--ui-bg-elevated)">
          <table class="w-full text-sm">
            <thead class="bg-(--ui-bg-muted) text-(--ui-text-muted) text-xs uppercase tracking-wider">
              <tr>
                <th class="text-left px-4 py-2 font-medium">Room</th>
                <th class="text-left px-4 py-2 font-medium">Type</th>
                <th class="text-right px-4 py-2 font-medium">£/night</th>
                <th class="text-right px-4 py-2 font-medium">Subtotal</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-(--ui-border)">
              <tr v-for="br in booking.bookingRooms" :key="br.roomId">
                <td class="px-4 py-2 font-mono">{{ br.room?.roomNumber }}</td>
                <td class="px-4 py-2">{{ br.room?.type?.replace(/_/g, ' ') }}</td>
                <td class="px-4 py-2 text-right">£{{ br.priceAtBooking }}</td>
                <td class="px-4 py-2 text-right font-medium">£{{ (br.priceAtBooking * nights).toFixed(2) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- ===================================================
                          Services table
           =================================================== -->
      <section v-if="booking.services?.length" class="mb-6">
        <h2 class="text-sm font-semibold text-(--ui-text-muted) uppercase tracking-wider mb-2">Services</h2>
        <div class="border border-(--ui-border) rounded-md overflow-hidden bg-(--ui-bg-elevated)">
          <table class="w-full text-sm">
            <thead class="bg-(--ui-bg-muted) text-(--ui-text-muted) text-xs uppercase tracking-wider">
              <tr>
                <th class="text-left px-4 py-2 font-medium">Service</th>
                <th class="text-right px-4 py-2 font-medium">Qty</th>
                <th class="text-right px-4 py-2 font-medium">Price</th>
                <th class="text-right px-4 py-2 font-medium">Subtotal</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-(--ui-border)">
              <tr v-for="sv in booking.services" :key="sv.id">
                <td class="px-4 py-2">{{ formatService(sv.service) }}</td>
                <td class="px-4 py-2 text-right">{{ sv.quantity }}</td>
                <td class="px-4 py-2 text-right">£{{ sv.price }}</td>
                <td class="px-4 py-2 text-right font-medium">£{{ (sv.price * sv.quantity).toFixed(2) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- ===================================================
                          Totals + actions
           =================================================== -->
      <section class="mb-6">
        <div class="border border-(--ui-border) rounded-md bg-(--ui-bg-elevated) p-4">
          <div class="flex justify-between text-sm pb-2 border-b border-(--ui-border)">
            <span class="text-(--ui-text-muted)">Rooms subtotal</span>
            <span>£{{ roomTotal.toFixed(2) }}</span>
          </div>
          <div v-if="servicesTotal > 0" class="flex justify-between text-sm py-2 border-b border-(--ui-border)">
            <span class="text-(--ui-text-muted)">Services subtotal</span>
            <span>£{{ servicesTotal.toFixed(2) }}</span>
          </div>
          <div class="flex justify-between font-bold text-lg pt-2">
            <span>Total</span>
            <span class="text-(--ui-primary)">£{{ grandTotal.toFixed(2) }}</span>
          </div>
          <div v-if="booking.invoice" class="flex justify-between text-sm mt-3 pt-3 border-t border-(--ui-border)">
            <span class="text-(--ui-text-muted)">Invoice status</span>
            <UBadge :color="booking.invoice.paid ? 'success' : 'warning'" variant="subtle" size="sm">
              {{ booking.invoice.paid ? 'Paid' : 'Unpaid' }}
            </UBadge>
          </div>
        </div>
      </section>

      <div class="flex justify-end gap-2 flex-wrap">
        <UButton color="neutral" variant="outline" icon="i-lucide-file-text" :to="`/guest/bookings/${id}/invoice`">
          View invoice
        </UButton>
        <UButton v-if="booking.status === 'CONFIRMED'" color="error" variant="outline" icon="i-lucide-x" @click="cancelModalOpen = true">
          Cancel booking
        </UButton>
      </div>
    </div>

    <UModal v-model:open="cancelModalOpen" title="Cancel booking">
      <template #body>
        <p class="text-sm text-muted">
          Cancellation fees apply based on how close to check-in you are. This cannot be undone.
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
