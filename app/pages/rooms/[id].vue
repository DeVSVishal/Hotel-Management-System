<script setup lang="ts">
const route = useRoute()
const id = route.params.id as string

const { data, pending, error } = await useFetch(`/api/rooms/${id}`)
const room = computed(() => data.value?.room)

const bookingSuccess = ref(false)
const bookingId = ref<number | null>(null)

function formatType(type: string) {
  return type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function onBookingSuccess(id: number) {
  bookingId.value = id
  bookingSuccess.value = true
}
</script>

<template>
  <div class="max-w-4xl mx-auto px-4 py-8">
    <div v-if="pending" class="flex justify-center py-16">
      <UIcon name="i-lucide-loader-circle" class="h-6 w-6 animate-spin text-muted" />
    </div>

    <UAlert v-else-if="error || !room" color="error" variant="subtle" title="Room not found" />

    <div v-else>
      <!-- ===================================================
                          Breadcrumb + heading
           =================================================== -->
      <header class="mb-6 pb-4 border-b border-(--ui-border)">
        <NuxtLink :to="`/hotels/${room.hotel.id}`" class="text-xs text-(--ui-text-muted) hover:underline">
          ← {{ room.hotel.name }}
        </NuxtLink>
        <h1 class="text-2xl font-bold mt-1">Room {{ room.roomNumber }}</h1>
        <p class="text-sm text-(--ui-text-muted) mt-1">
          {{ formatType(room.type) }} · {{ room.hotel.city }}, {{ room.hotel.country }}
        </p>
      </header>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
        <!-- ===================================================
                          Room information
             =================================================== -->
        <section>
          <h2 class="text-sm font-semibold text-(--ui-text-muted) uppercase tracking-wider mb-2">Room information</h2>
          <div class="border border-(--ui-border) rounded-md bg-(--ui-bg-elevated)">
            <dl class="divide-y divide-(--ui-border) text-sm">
              <div class="flex px-4 py-3">
                <dt class="w-32 text-(--ui-text-muted)">Type</dt>
                <dd class="font-medium">{{ formatType(room.type) }}</dd>
              </div>
              <div class="flex px-4 py-3">
                <dt class="w-32 text-(--ui-text-muted)">Capacity</dt>
                <dd>{{ room.capacity }} guest{{ room.capacity > 1 ? 's' : '' }}</dd>
              </div>
              <div class="flex px-4 py-3">
                <dt class="w-32 text-(--ui-text-muted)">Off-peak rate</dt>
                <dd class="font-semibold">£{{ room.priceOffPeak }}/night</dd>
              </div>
              <div class="flex px-4 py-3">
                <dt class="w-32 text-(--ui-text-muted)">Peak rate</dt>
                <dd class="font-semibold">£{{ room.pricePeak }}/night</dd>
              </div>
            </dl>
          </div>
          <p class="text-xs text-(--ui-text-muted) mt-2">Peak season: Jun–Aug, Dec 20–Jan 5.</p>
        </section>

        <!-- ===================================================
                          Booking panel
             =================================================== -->
        <section>
          <h2 class="text-sm font-semibold text-(--ui-text-muted) uppercase tracking-wider mb-2">
            {{ bookingSuccess ? 'Booking confirmed' : 'Book this room' }}
          </h2>
          <div class="border border-(--ui-border) rounded-md bg-(--ui-bg-elevated) p-4">
            <div v-if="bookingSuccess" class="flex flex-col gap-3">
              <UAlert color="success" variant="subtle" title="Booking confirmed!" description="Your reservation has been created." />
              <UButton color="primary" icon="i-lucide-eye" :to="`/guest/bookings/${bookingId}`">View booking</UButton>
              <UButton color="neutral" variant="outline" icon="i-lucide-calendar-days" to="/guest/bookings">All my bookings</UButton>
            </div>
            <BookingForm v-else :room="room" @success="onBookingSuccess" />
          </div>
        </section>
      </div>
    </div>
  </div>
</template>
