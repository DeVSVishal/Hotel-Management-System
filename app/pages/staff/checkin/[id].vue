<script setup lang="ts">
const { user } = useUserSession()
if (!user.value || !['STAFF', 'MANAGER', 'ADMIN'].includes(user.value.role)) {
  navigateTo('/')
}

const route = useRoute()
const id = computed(() => route.params.id)

const { data, pending, refresh, error } = await useFetch(() => `/api/bookings/${id.value}`)
const booking = computed(() => data.value?.booking ?? null)

const saving = ref(false)
const checkedIn = ref(false)
const errorMsg = ref('')

async function doCheckIn() {
  saving.value = true
  errorMsg.value = ''
  try {
    await $fetch(`/api/staff/bookings/${id.value}/checkin`, { method: 'PUT' })
    checkedIn.value = true
    refresh()
  } catch (e: any) {
    errorMsg.value = e?.data?.message ?? 'Check-in failed'
  } finally {
    saving.value = false
  }
}

function fmtDate(d?: string) {
  return d ? new Date(d).toLocaleDateString() : ''
}
</script>

<template>
  <div class="max-w-3xl mx-auto">
    <header class="mb-6 pb-4 border-b border-(--ui-border) flex items-center justify-between flex-wrap gap-2">
      <div>
        <NuxtLink to="/staff/dashboard" class="text-xs text-(--ui-text-muted) hover:underline">← Dashboard</NuxtLink>
        <h1 class="text-2xl font-bold mt-1">Check in</h1>
      </div>
    </header>

    <div v-if="pending" class="flex justify-center py-12">
      <UIcon name="i-lucide-loader-circle" class="h-6 w-6 animate-spin text-muted" />
    </div>

    <UAlert v-else-if="error" color="error" variant="subtle" :title="(error as any)?.data?.message ?? 'Failed to load booking'" />

    <div v-else-if="booking">
      <!-- ===================================================
                          Booking summary
           =================================================== -->
      <section class="mb-6">
        <h2 class="text-sm font-semibold text-(--ui-text-muted) uppercase tracking-wider mb-2">Booking #{{ booking.id }}</h2>
        <div class="border border-(--ui-border) rounded-md bg-(--ui-bg-elevated)">
          <dl class="divide-y divide-(--ui-border) text-sm">
            <div class="flex px-4 py-3">
              <dt class="w-40 text-(--ui-text-muted)">Guest</dt>
              <dd>
                <div class="font-medium">{{ booking.guest?.name }}</div>
                <div class="text-xs text-(--ui-text-muted)">{{ booking.guest?.email }}</div>
              </dd>
            </div>
            <div class="flex px-4 py-3">
              <dt class="w-40 text-(--ui-text-muted)">Check-in</dt>
              <dd>{{ fmtDate(booking.checkIn) }}</dd>
            </div>
            <div class="flex px-4 py-3">
              <dt class="w-40 text-(--ui-text-muted)">Check-out</dt>
              <dd>{{ fmtDate(booking.checkOut) }}</dd>
            </div>
            <div class="flex px-4 py-3">
              <dt class="w-40 text-(--ui-text-muted)">Status</dt>
              <dd>
                <UBadge :color="checkedIn ? 'success' : 'info'" variant="subtle">
                  {{ checkedIn ? 'CHECKED IN' : booking.status.replace('_', ' ') }}
                </UBadge>
              </dd>
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
                <th class="text-right px-4 py-2 font-medium">Nightly</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-(--ui-border)">
              <tr v-for="br in booking.bookingRooms" :key="br.roomId">
                <td class="px-4 py-2 font-mono">{{ br.room.roomNumber }}</td>
                <td class="px-4 py-2">{{ br.room.type.replace(/_/g, ' ') }}</td>
                <td class="px-4 py-2 text-right">£{{ br.priceAtBooking }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <UAlert v-if="errorMsg" color="error" variant="subtle" :title="errorMsg" class="mb-4" />

      <div v-if="!checkedIn && booking.status === 'CONFIRMED'" class="flex justify-end gap-2">
        <UButton variant="outline" color="neutral" to="/staff/dashboard">Cancel</UButton>
        <UButton color="primary" icon="i-lucide-check-circle" :loading="saving" @click="doCheckIn">Confirm check-in</UButton>
      </div>

      <UAlert
        v-else-if="checkedIn"
        color="success"
        variant="subtle"
        title="Check-in complete"
        description="The guest has been checked in successfully."
      />

      <UAlert
        v-else
        color="warning"
        variant="subtle"
        :title="`Cannot check in — booking is ${booking.status}`"
      />
    </div>
  </div>
</template>
