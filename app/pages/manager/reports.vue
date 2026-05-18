<script setup lang="ts">
const { user } = useUserSession()
if (!user.value || !['MANAGER', 'ADMIN'].includes(user.value.role)) {
  navigateTo('/')
}

const today = new Date()
const monthAgo = new Date()
monthAgo.setDate(today.getDate() - 30)

const startDate = ref(monthAgo.toISOString().slice(0, 10))
const endDate = ref(today.toISOString().slice(0, 10))
const hotelId = ref<string>('all')

const { data: hotelsData } = await useFetch('/api/hotels')
const isAdmin = computed(() => user.value?.role === 'ADMIN')
const hotelItems = computed(() => {
  const items = [{ label: 'All hotels', value: 'all' }]
  for (const h of (hotelsData.value?.hotels ?? [])) {
    items.push({ label: h.name, value: String(h.id) })
  }
  return items
})

const queryParams = computed(() => {
  const q: Record<string, string> = { startDate: startDate.value, endDate: endDate.value }
  if (isAdmin.value && hotelId.value !== 'all') q.hotelId = hotelId.value
  return q
})

const { data: occData, pending: occPending, refresh: refreshOcc } = await useFetch('/api/manager/reports/occupancy', { query: queryParams })
const { data: revData, pending: revPending, refresh: refreshRev } = await useFetch('/api/manager/reports/revenue', { query: queryParams })
const { data: demoData, pending: demoPending, refresh: refreshDemo } = await useFetch('/api/manager/reports/guest-demographics', { query: queryParams })

function reload() {
  refreshOcc()
  refreshRev()
  refreshDemo()
}

const occDays = computed<any[]>(() => occData.value?.days ?? [])
const maxOcc = computed(() => Math.max(1, ...occDays.value.map((d: any) => d.rate)))

const rev = computed(() => revData.value ?? { totalRevenue: 0, roomRevenue: 0, serviceRevenue: 0, byRoomType: [], byService: [] })
const maxRoomRev = computed(() => Math.max(1, ...rev.value.byRoomType.map((r: any) => r.revenue)))
const maxSvcRev = computed(() => Math.max(1, ...rev.value.byService.map((r: any) => r.revenue)))

const demo = computed(() => demoData.value ?? { topGuests: [], averageStay: 0, bookingFrequency: 0, uniqueGuests: 0, totalBookings: 0 })
</script>

<template>
  <div>
    <header class="mb-6 pb-4 border-b border-(--ui-border)">
      <h1 class="text-2xl font-bold">Reports</h1>
      <p class="text-sm text-(--ui-text-muted) mt-1">Occupancy, revenue, and guest demographics over a date range.</p>
    </header>

    <!-- ===================================================
                          Filters
         =================================================== -->
    <section class="mb-6">
      <div class="border border-(--ui-border) rounded-md bg-(--ui-bg-elevated) p-4">
        <div class="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
          <div>
            <label class="text-xs font-medium text-(--ui-text-muted) block mb-1">Start date</label>
            <UInput v-model="startDate" type="date" />
          </div>
          <div>
            <label class="text-xs font-medium text-(--ui-text-muted) block mb-1">End date</label>
            <UInput v-model="endDate" type="date" />
          </div>
          <div v-if="isAdmin">
            <label class="text-xs font-medium text-(--ui-text-muted) block mb-1">Hotel</label>
            <USelect v-model="hotelId" :items="hotelItems" />
          </div>
          <UButton color="primary" icon="i-lucide-refresh-cw" @click="reload">Apply</UButton>
        </div>
      </div>
    </section>

    <!-- ===================================================
                        Occupancy by day
         =================================================== -->
    <section class="mb-8">
      <h2 class="text-sm font-semibold text-(--ui-text-muted) uppercase tracking-wider mb-3">Occupancy by day</h2>
      <div class="border border-(--ui-border) rounded-md bg-(--ui-bg-elevated) p-4">
        <div v-if="occPending" class="flex justify-center py-6">
          <UIcon name="i-lucide-loader-circle" class="h-5 w-5 animate-spin text-muted" />
        </div>
        <div v-else-if="occDays.length === 0" class="text-center text-(--ui-text-muted) text-sm py-6">No data for this range.</div>
        <div v-else class="space-y-1">
          <div v-for="d in occDays" :key="d.date" class="flex items-center gap-3 text-sm">
            <span class="w-24 text-xs text-(--ui-text-muted)">{{ d.date }}</span>
            <div class="flex-1 h-5 bg-(--ui-bg-muted) rounded overflow-hidden">
              <div class="h-full bg-(--ui-primary)" :style="{ width: `${(d.rate / maxOcc) * 100}%` }" />
            </div>
            <span class="w-14 text-right text-xs">{{ d.rate }}%</span>
            <span class="w-20 text-right text-xs text-(--ui-text-muted)">{{ d.bookedRooms }}/{{ d.totalRooms }}</span>
          </div>
        </div>
      </div>
    </section>

    <!-- ===================================================
                          Revenue summary
         =================================================== -->
    <section class="mb-8">
      <h2 class="text-sm font-semibold text-(--ui-text-muted) uppercase tracking-wider mb-3">Revenue summary</h2>
      <div v-if="revPending" class="border border-(--ui-border) rounded-md py-6 flex justify-center">
        <UIcon name="i-lucide-loader-circle" class="h-5 w-5 animate-spin text-muted" />
      </div>
      <div v-else>
        <div class="border border-(--ui-border) rounded-md divide-x divide-(--ui-border) grid grid-cols-3 bg-(--ui-bg-elevated) mb-4">
          <div class="p-4">
            <div class="text-xs text-(--ui-text-muted) uppercase tracking-wider">Total</div>
            <div class="text-2xl font-bold mt-1 text-(--ui-primary)">£{{ rev.totalRevenue }}</div>
          </div>
          <div class="p-4">
            <div class="text-xs text-(--ui-text-muted) uppercase tracking-wider">Rooms</div>
            <div class="text-2xl font-bold mt-1">£{{ rev.roomRevenue }}</div>
          </div>
          <div class="p-4">
            <div class="text-xs text-(--ui-text-muted) uppercase tracking-wider">Services</div>
            <div class="text-2xl font-bold mt-1">£{{ rev.serviceRevenue }}</div>
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div class="border border-(--ui-border) rounded-md bg-(--ui-bg-elevated) p-4">
            <h3 class="text-xs font-semibold text-(--ui-text-muted) uppercase tracking-wider mb-3">By room type</h3>
            <div v-if="rev.byRoomType.length === 0" class="text-sm text-(--ui-text-muted)">No revenue data.</div>
            <div v-else class="space-y-2">
              <div v-for="r in rev.byRoomType" :key="r.type" class="flex items-center gap-3 text-sm">
                <span class="w-36 truncate">{{ r.type.replace(/_/g, ' ') }}</span>
                <div class="flex-1 h-5 bg-(--ui-bg-muted) rounded overflow-hidden">
                  <div class="h-full bg-(--ui-primary)" :style="{ width: `${(r.revenue / maxRoomRev) * 100}%` }" />
                </div>
                <span class="w-20 text-right font-medium">£{{ r.revenue }}</span>
              </div>
            </div>
          </div>

          <div class="border border-(--ui-border) rounded-md bg-(--ui-bg-elevated) p-4">
            <h3 class="text-xs font-semibold text-(--ui-text-muted) uppercase tracking-wider mb-3">By service</h3>
            <div v-if="rev.byService.length === 0" class="text-sm text-(--ui-text-muted)">No service revenue.</div>
            <div v-else class="space-y-2">
              <div v-for="r in rev.byService" :key="r.service" class="flex items-center gap-3 text-sm">
                <span class="w-40 truncate">{{ r.service.replace(/_/g, ' ') }}</span>
                <div class="flex-1 h-5 bg-(--ui-bg-muted) rounded overflow-hidden">
                  <div class="h-full bg-(--ui-primary)" :style="{ width: `${(r.revenue / maxSvcRev) * 100}%` }" />
                </div>
                <span class="w-20 text-right font-medium">£{{ r.revenue }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ===================================================
                        Guest demographics
         =================================================== -->
    <section>
      <h2 class="text-sm font-semibold text-(--ui-text-muted) uppercase tracking-wider mb-3">Guest demographics</h2>
      <div v-if="demoPending" class="border border-(--ui-border) rounded-md py-6 flex justify-center">
        <UIcon name="i-lucide-loader-circle" class="h-5 w-5 animate-spin text-muted" />
      </div>
      <div v-else>
        <div class="border border-(--ui-border) rounded-md divide-x divide-(--ui-border) grid grid-cols-2 sm:grid-cols-4 bg-(--ui-bg-elevated) mb-4">
          <div class="p-4">
            <div class="text-xs text-(--ui-text-muted) uppercase tracking-wider">Unique guests</div>
            <div class="text-xl font-bold mt-1">{{ demo.uniqueGuests }}</div>
          </div>
          <div class="p-4">
            <div class="text-xs text-(--ui-text-muted) uppercase tracking-wider">Total bookings</div>
            <div class="text-xl font-bold mt-1">{{ demo.totalBookings }}</div>
          </div>
          <div class="p-4">
            <div class="text-xs text-(--ui-text-muted) uppercase tracking-wider">Avg. stay</div>
            <div class="text-xl font-bold mt-1">{{ demo.averageStay }} nights</div>
          </div>
          <div class="p-4">
            <div class="text-xs text-(--ui-text-muted) uppercase tracking-wider">Booking freq.</div>
            <div class="text-xl font-bold mt-1">{{ demo.bookingFrequency }} / guest</div>
          </div>
        </div>

        <h3 class="text-xs font-semibold text-(--ui-text-muted) uppercase tracking-wider mb-2">Top guests by spend</h3>
        <div v-if="demo.topGuests.length === 0" class="border border-(--ui-border) rounded-md py-6 text-center text-sm text-(--ui-text-muted)">
          No data.
        </div>
        <div v-else class="border border-(--ui-border) rounded-md overflow-hidden bg-(--ui-bg-elevated)">
          <table class="w-full text-sm">
            <thead class="bg-(--ui-bg-muted) text-(--ui-text-muted) text-xs uppercase tracking-wider">
              <tr>
                <th class="text-left px-4 py-2 font-medium">Guest</th>
                <th class="text-left px-4 py-2 font-medium">Email</th>
                <th class="text-right px-4 py-2 font-medium">Bookings</th>
                <th class="text-right px-4 py-2 font-medium">Total spend</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-(--ui-border)">
              <tr v-for="g in demo.topGuests" :key="g.guestId">
                <td class="px-4 py-2 font-medium">{{ g.name }}</td>
                <td class="px-4 py-2 text-(--ui-text-muted)">{{ g.email }}</td>
                <td class="px-4 py-2 text-right">{{ g.bookingCount }}</td>
                <td class="px-4 py-2 text-right font-semibold">£{{ g.totalSpend }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  </div>
</template>
