<script setup lang="ts">
const { user } = useUserSession()
if (!user.value || !['STAFF', 'MANAGER', 'ADMIN'].includes(user.value.role)) {
  navigateTo('/')
}

/* =======================================================
        Service catalog + active bookings to attach to
   ======================================================= */
const { data: servicesData } = await useFetch('/api/services')
const services = computed<any[]>(() => servicesData.value?.services ?? [])

const { data: checkedInData, refresh: refreshA } = await useFetch('/api/staff/bookings', { query: { status: 'CHECKED_IN' } })
const { data: confirmedData, refresh: refreshB } = await useFetch('/api/staff/bookings', { query: { status: 'CONFIRMED' } })

const activeBookings = computed<any[]>(() => [
  ...(checkedInData.value?.bookings ?? []),
  ...(confirmedData.value?.bookings ?? []),
])

const selectedBookingId = ref<string>('')
const selectedService = ref<string>('AIRPORT_TRANSFER')
const quantity = ref(1)
const adding = ref(false)
const errorMsg = ref('')
const successMsg = ref('')

const bookingItems = computed(() => activeBookings.value.map((b: any) => ({
  label: `#${b.id} — ${b.guest.name} (${b.status})`,
  value: String(b.id),
})))
const serviceItems = computed(() => services.value.map((s: any) => ({
  label: `${s.label} — £${s.price} (${s.unit})`,
  value: s.type,
})))

const selectedBooking = computed<any | undefined>(() => activeBookings.value.find((b: any) => String(b.id) === selectedBookingId.value))

async function refreshBookings() {
  await Promise.all([refreshA(), refreshB()])
}

async function addService() {
  if (!selectedBookingId.value) return
  adding.value = true
  errorMsg.value = ''
  successMsg.value = ''
  try {
    await $fetch(`/api/bookings/${selectedBookingId.value}/services`, {
      method: 'POST',
      body: { service: selectedService.value, quantity: quantity.value },
    })
    await refreshBookings()
    successMsg.value = 'Service added.'
    quantity.value = 1
    setTimeout(() => { successMsg.value = '' }, 4000)
  } catch (e: any) {
    errorMsg.value = e?.data?.message ?? 'Failed to add service'
  } finally {
    adding.value = false
  }
}

async function removeService(bookingId: number, serviceId: number) {
  errorMsg.value = ''
  try {
    await $fetch(`/api/bookings/${bookingId}/services/${serviceId}`, { method: 'DELETE' })
    await refreshBookings()
  } catch (e: any) {
    errorMsg.value = e?.data?.message ?? 'Failed to remove service'
  }
}
</script>

<template>
  <div>
    <header class="mb-6 pb-4 border-b border-(--ui-border)">
      <h1 class="text-2xl font-bold">Ancillary services</h1>
      <p class="text-sm text-(--ui-text-muted) mt-1">Attach extras (breakfast, transfer, spa, late checkout) to active bookings.</p>
    </header>

    <UAlert v-if="errorMsg" color="error" variant="subtle" :title="errorMsg" class="mb-4" />
    <UAlert v-if="successMsg" color="success" variant="subtle" :title="successMsg" class="mb-4" />

    <!-- ===================================================
                        Service catalog
         =================================================== -->
    <section class="mb-8">
      <h2 class="text-sm font-semibold text-(--ui-text-muted) uppercase tracking-wider mb-3">Service catalog</h2>
      <div class="border border-(--ui-border) rounded-md overflow-hidden bg-(--ui-bg-elevated)">
        <table class="w-full text-sm">
          <thead class="bg-(--ui-bg-muted) text-(--ui-text-muted) text-xs uppercase tracking-wider">
            <tr>
              <th class="text-left px-4 py-2 font-medium">Service</th>
              <th class="text-left px-4 py-2 font-medium">Unit</th>
              <th class="text-right px-4 py-2 font-medium">Price</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-(--ui-border)">
            <tr v-for="s in services" :key="s.type">
              <td class="px-4 py-2 font-medium">{{ s.label }}</td>
              <td class="px-4 py-2 text-(--ui-text-muted)">{{ s.unit }}</td>
              <td class="px-4 py-2 text-right font-semibold">£{{ s.price }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- ===================================================
                Add a service to an active booking
         =================================================== -->
    <section class="mb-8">
      <h2 class="text-sm font-semibold text-(--ui-text-muted) uppercase tracking-wider mb-3">Add to booking</h2>
      <div class="border border-(--ui-border) rounded-md bg-(--ui-bg-elevated) p-5">
        <div class="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
          <div class="sm:col-span-5">
            <label class="text-xs font-medium text-(--ui-text-muted) block mb-1">Booking</label>
            <USelect v-model="selectedBookingId" :items="bookingItems" placeholder="Select a booking" />
          </div>
          <div class="sm:col-span-4">
            <label class="text-xs font-medium text-(--ui-text-muted) block mb-1">Service</label>
            <USelect v-model="selectedService" :items="serviceItems" />
          </div>
          <div class="sm:col-span-1">
            <label class="text-xs font-medium text-(--ui-text-muted) block mb-1">Qty</label>
            <UInput v-model="quantity" type="number" min="1" />
          </div>
          <div class="sm:col-span-2">
            <UButton block color="primary" :loading="adding" :disabled="!selectedBookingId" @click="addService">Add</UButton>
          </div>
        </div>
      </div>
    </section>

    <!-- ===================================================
              Services on the selected booking
         =================================================== -->
    <section v-if="selectedBooking">
      <h2 class="text-sm font-semibold text-(--ui-text-muted) uppercase tracking-wider mb-3">
        Services on booking #{{ selectedBooking.id }}
      </h2>
      <div v-if="selectedBooking.services.length === 0" class="border border-(--ui-border) rounded-md py-6 text-center text-sm text-(--ui-text-muted)">
        No services added to this booking yet.
      </div>
      <div v-else class="border border-(--ui-border) rounded-md overflow-hidden bg-(--ui-bg-elevated)">
        <table class="w-full text-sm">
          <thead class="bg-(--ui-bg-muted) text-(--ui-text-muted) text-xs uppercase tracking-wider">
            <tr>
              <th class="text-left px-4 py-2 font-medium">Service</th>
              <th class="text-right px-4 py-2 font-medium">Qty</th>
              <th class="text-right px-4 py-2 font-medium">Price ea.</th>
              <th class="text-right px-4 py-2 font-medium">Subtotal</th>
              <th class="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-(--ui-border)">
            <tr v-for="s in selectedBooking.services" :key="s.id">
              <td class="px-4 py-2">{{ s.service.replace(/_/g, ' ') }}</td>
              <td class="px-4 py-2 text-right">{{ s.quantity }}</td>
              <td class="px-4 py-2 text-right">£{{ s.price }}</td>
              <td class="px-4 py-2 text-right font-medium">£{{ (s.price * s.quantity).toFixed(2) }}</td>
              <td class="px-4 py-2 text-right">
                <UButton size="xs" color="error" variant="ghost" icon="i-lucide-trash-2" @click="removeService(selectedBooking.id, s.id)" />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>
