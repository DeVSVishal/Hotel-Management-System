<script setup lang="ts">
const props = defineProps<{
  room: {
    id: number
    roomNumber: string
    priceOffPeak: number
    pricePeak: number
    hotel: { name: string }
  }
}>()

const emit = defineEmits<{ success: [bookingId: number] }>()

const { loggedIn } = useUserSession()

/* =======================================================
        Default to today / tomorrow with HTML5 native
        date inputs. We rely on min={today} to prevent
        past dates from being chosen.
   ======================================================= */
const today = new Date().toISOString().slice(0, 10)
const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10)

const checkIn = ref(today)
const checkOut = ref(tomorrow)
const error = ref('')
const loading = ref(false)

const SERVICE_PRICES: Record<string, number> = {
  AIRPORT_TRANSFER: 50,
  BREAKFAST: 20,
  SPA_ACCESS: 35,
  LATE_CHECKOUT: 40,
}

const SERVICE_LABELS: Record<string, string> = {
  AIRPORT_TRANSFER: 'Airport Transfer (one-way) — £50',
  BREAKFAST: 'Full English Breakfast (per person/day) — £20',
  SPA_ACCESS: 'Spa Access (per person/day) — £35',
  LATE_CHECKOUT: 'Late Check-out until 2PM — £40',
}

const selectedServices = ref<string[]>([])

function isPeak(date: Date) {
  const m = date.getMonth() + 1
  const d = date.getDate()
  if (m >= 6 && m <= 8) return true
  if (m === 12 && d >= 20) return true
  if (m === 1 && d <= 5) return true
  return false
}

const nights = computed(() => {
  const ci = new Date(checkIn.value)
  const co = new Date(checkOut.value)
  const n = Math.ceil((co.getTime() - ci.getTime()) / 86400000)
  return n > 0 ? n : 0
})

const roomTotal = computed(() => {
  if (nights.value === 0) return 0
  let total = 0
  const cursor = new Date(checkIn.value)
  for (let i = 0; i < nights.value; i++) {
    total += isPeak(cursor) ? props.room.pricePeak : props.room.priceOffPeak
    cursor.setDate(cursor.getDate() + 1)
  }
  return total
})

const servicesTotal = computed(() =>
  selectedServices.value.reduce((sum, s) => sum + (SERVICE_PRICES[s] ?? 0), 0),
)

const grandTotal = computed(() => roomTotal.value + servicesTotal.value)

const dateError = computed(() => {
  if (!checkIn.value || !checkOut.value) return ''
  if (new Date(checkOut.value) <= new Date(checkIn.value)) return 'Check-out must be after check-in'
  if (new Date(checkIn.value) < new Date(today)) return 'Check-in cannot be in the past'
  return ''
})

async function submit() {
  if (!loggedIn.value) { navigateTo('/login'); return }
  if (dateError.value) return
  error.value = ''
  loading.value = true

  try {
    const data = await $fetch('/api/bookings', {
      method: 'POST',
      body: {
        checkIn: checkIn.value,
        checkOut: checkOut.value,
        roomIds: [props.room.id],
        services: selectedServices.value.map(s => ({ service: s, quantity: 1 })),
      },
    }) as { booking: { id: number } }

    emit('success', data.booking.id)
  } catch (e: any) {
    error.value = e?.data?.message ?? 'Booking failed. Please try again.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="grid grid-cols-2 gap-3">
      <div>
        <label class="text-xs font-medium text-muted block mb-1">Check-in</label>
        <UInput v-model="checkIn" type="date" :min="today" />
      </div>
      <div>
        <label class="text-xs font-medium text-muted block mb-1">Check-out</label>
        <UInput v-model="checkOut" type="date" :min="checkIn" />
      </div>
    </div>

    <UAlert v-if="dateError" color="error" variant="subtle" :title="dateError" />

    <div>
      <p class="text-xs font-medium text-muted mb-2">Optional services</p>
      <div class="flex flex-col gap-2">
        <label
          v-for="(label, key) in SERVICE_LABELS"
          :key="key"
          class="flex items-center gap-2 text-sm cursor-pointer select-none"
        >
          <input
            v-model="selectedServices"
            type="checkbox"
            :value="key"
            class="h-4 w-4 accent-(--ui-primary) cursor-pointer"
          >
          <span>{{ label }}</span>
        </label>
      </div>
    </div>

    <div class="border-t border-(--ui-border) pt-3 flex flex-col gap-1">
      <div class="flex justify-between text-sm">
        <span class="text-muted">Room ({{ nights }} night{{ nights !== 1 ? 's' : '' }})</span>
        <span>£{{ roomTotal.toFixed(2) }}</span>
      </div>
      <div v-if="servicesTotal > 0" class="flex justify-between text-sm">
        <span class="text-muted">Services</span>
        <span>£{{ servicesTotal.toFixed(2) }}</span>
      </div>
      <div class="flex justify-between font-bold text-lg mt-1">
        <span>Total</span>
        <span class="text-(--ui-primary)">£{{ grandTotal.toFixed(2) }}</span>
      </div>
    </div>

    <UAlert v-if="error" color="error" variant="subtle" :title="error" />

    <UButton
      :loading="loading"
      :disabled="nights === 0 || !!dateError"
      color="primary"
      size="lg"
      block
      icon="i-lucide-check-circle"
      @click="submit"
    >
      {{ loggedIn ? 'Confirm Booking' : 'Sign in to Book' }}
    </UButton>
  </div>
</template>
