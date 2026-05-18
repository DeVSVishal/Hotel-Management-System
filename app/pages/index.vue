<script setup lang="ts">
const { loggedIn, user } = useUserSession()

/* =======================================================
        Search filters state
   ======================================================= */
const ROOM_TYPES = [
  { label: 'Any type', value: 'all' },
  { label: 'Standard Double', value: 'STANDARD_DOUBLE' },
  { label: 'Deluxe King', value: 'DELUXE_KING' },
  { label: 'Family Suite', value: 'FAMILY_SUITE' },
  { label: 'Penthouse', value: 'PENTHOUSE' },
]

const today = new Date().toISOString().slice(0, 10)
const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10)

const city = ref('all')
const checkIn = ref(today)
const checkOut = ref(tomorrow)
const capacity = ref('')
const roomType = ref('all')

const searched = ref(false)
const rooms = ref<any[]>([])
const loading = ref(false)
const error = ref('')

const { data: hotelsData } = await useFetch('/api/hotels')
const cities = computed(() => {
  const raw = hotelsData.value?.hotels?.map((h: any) => h.city) ?? []
  return [{ label: 'Any city', value: 'all' }, ...raw.map((c: string) => ({ label: c, value: c }))]
})

async function search() {
  error.value = ''
  loading.value = true
  searched.value = true

  try {
    const query: Record<string, string> = {
      checkIn: checkIn.value,
      checkOut: checkOut.value,
    }
    if (city.value && city.value !== 'all') query.city = city.value
    if (capacity.value) query.capacity = capacity.value
    if (roomType.value && roomType.value !== 'all') query.type = roomType.value

    const data = await $fetch('/api/rooms/search', { query }) as { rooms: any[] }
    rooms.value = data.rooms
  } catch (e: any) {
    error.value = e?.data?.message ?? 'Search failed. Please try again.'
    rooms.value = []
  } finally {
    loading.value = false
  }
}

function formatType(t: string) {
  return t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

const isGuest = computed(() => loggedIn.value && user.value?.role === 'GUEST')
</script>

<template>
  <div class="max-w-6xl mx-auto px-4 py-10">
    <!-- ===================================================
                        Page heading
         =================================================== -->
    <header class="mb-8 pb-4 border-b border-(--ui-border)">
      <h1 class="text-3xl font-bold text-(--ui-text-highlighted)">Verdan Hotels</h1>
      <p class="text-sm text-(--ui-text-muted) mt-1">
        Search room availability across our London, Paris, and New York properties.
      </p>
      <div v-if="!loggedIn" class="mt-4 flex gap-2">
        <UButton color="primary" to="/register">Create account</UButton>
        <UButton color="neutral" variant="outline" to="/login">Sign in</UButton>
      </div>
      <div v-else-if="isGuest" class="mt-4 flex gap-2 flex-wrap">
        <UButton color="primary" variant="outline" icon="i-lucide-layout-dashboard" to="/guest/dashboard">My dashboard</UButton>
        <UButton color="neutral" variant="outline" icon="i-lucide-calendar-days" to="/guest/bookings">My bookings</UButton>
      </div>
    </header>

    <!-- ===================================================
                          Search form
         =================================================== -->
    <section class="mb-8">
      <h2 class="text-lg font-semibold mb-4 text-(--ui-text)">Find a room</h2>
      <div class="border border-(--ui-border) rounded-md bg-(--ui-bg-elevated) p-5">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label class="text-xs font-medium text-(--ui-text-muted) block mb-1">City</label>
            <USelect v-model="city" :items="cities" />
          </div>
          <div>
            <label class="text-xs font-medium text-(--ui-text-muted) block mb-1">Check-in</label>
            <UInput v-model="checkIn" type="date" :min="today" />
          </div>
          <div>
            <label class="text-xs font-medium text-(--ui-text-muted) block mb-1">Check-out</label>
            <UInput v-model="checkOut" type="date" :min="checkIn" />
          </div>
          <div>
            <label class="text-xs font-medium text-(--ui-text-muted) block mb-1">Guests</label>
            <UInput v-model="capacity" type="number" min="1" max="10" placeholder="Any" />
          </div>
          <div>
            <label class="text-xs font-medium text-(--ui-text-muted) block mb-1">Room type</label>
            <USelect v-model="roomType" :items="ROOM_TYPES" />
          </div>
          <div class="flex items-end">
            <UButton block color="primary" icon="i-lucide-search" :loading="loading" @click="search">
              Search
            </UButton>
          </div>
        </div>
      </div>
    </section>

    <UAlert v-if="error" color="error" variant="subtle" :title="error" class="mb-4" />

    <!-- ===================================================
                        Search results table
         =================================================== -->
    <section v-if="searched">
      <div class="flex items-center justify-between mb-3">
        <h2 class="text-lg font-semibold">
          {{ loading ? 'Searching…' : `${rooms.length} room${rooms.length !== 1 ? 's' : ''} available` }}
        </h2>
        <span v-if="!loading && rooms.length" class="text-xs text-(--ui-text-muted)">
          {{ checkIn }} → {{ checkOut }}
        </span>
      </div>

      <div v-if="loading" class="flex justify-center py-12">
        <UIcon name="i-lucide-loader-circle" class="h-6 w-6 animate-spin text-muted" />
      </div>

      <div v-else-if="rooms.length === 0" class="border border-(--ui-border) rounded-md py-10 text-center text-sm text-(--ui-text-muted)">
        No rooms match your search.
      </div>

      <div v-else class="border border-(--ui-border) rounded-md overflow-hidden bg-(--ui-bg-elevated)">
        <table class="w-full text-sm">
          <thead class="bg-(--ui-bg-muted) text-(--ui-text-muted) text-xs uppercase tracking-wider">
            <tr>
              <th class="text-left px-4 py-3 font-medium">Hotel</th>
              <th class="text-left px-4 py-3 font-medium">Room</th>
              <th class="text-left px-4 py-3 font-medium">Type</th>
              <th class="text-left px-4 py-3 font-medium">Capacity</th>
              <th class="text-right px-4 py-3 font-medium">£/night (off-peak)</th>
              <th class="text-right px-4 py-3 font-medium">£/night (peak)</th>
              <th class="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-(--ui-border)">
            <tr v-for="r in rooms" :key="r.id" class="hover:bg-(--ui-bg-muted) transition-colors">
              <td class="px-4 py-3">
                <div class="font-medium">{{ r.hotel.name }}</div>
                <div class="text-xs text-(--ui-text-muted)">{{ r.hotel.city }}, {{ r.hotel.country }}</div>
              </td>
              <td class="px-4 py-3 font-mono">{{ r.roomNumber }}</td>
              <td class="px-4 py-3">{{ formatType(r.type) }}</td>
              <td class="px-4 py-3">{{ r.capacity }}</td>
              <td class="px-4 py-3 text-right font-medium">£{{ r.priceOffPeak }}</td>
              <td class="px-4 py-3 text-right text-(--ui-text-muted)">£{{ r.pricePeak }}</td>
              <td class="px-4 py-3 text-right">
                <UButton size="xs" color="primary" :to="`/rooms/${r.id}`">View / Book</UButton>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- ===================================================
                        Idle prompt
         =================================================== -->
    <section v-else class="border border-dashed border-(--ui-border) rounded-md py-12 text-center text-sm text-(--ui-text-muted)">
      Choose your dates and click Search to see available rooms.
    </section>
  </div>
</template>
