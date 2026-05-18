<script setup lang="ts">
const { user } = useUserSession()
if (user.value?.role !== 'ADMIN') navigateTo('/')

const ROOM_TYPES = ['STANDARD_DOUBLE', 'DELUXE_KING', 'FAMILY_SUITE', 'PENTHOUSE'] as const

const { data: hotelsData } = await useFetch('/api/hotels')
const hotels = computed<any[]>(() => hotelsData.value?.hotels ?? [])
const hotelItems = computed(() => [
  { label: 'All hotels', value: 'all' },
  ...hotels.value.map((h: any) => ({ label: h.name, value: String(h.id) })),
])

const filterHotel = ref('all')
const { data, pending, refresh } = await useFetch('/api/rooms', {
  query: computed(() => filterHotel.value && filterHotel.value !== 'all' ? { hotelId: filterHotel.value } : {}),
})
const rooms = computed<any[]>(() => data.value?.rooms ?? [])

const addModalOpen = ref(false)
const deleteTarget = ref<any | null>(null)
const error = ref('')
const saving = ref(false)

const deleteModalOpen = computed({
  get: () => deleteTarget.value !== null,
  set: (v) => { if (!v) deleteTarget.value = null },
})

async function deleteRoom() {
  if (!deleteTarget.value) return
  saving.value = true
  error.value = ''
  try {
    await $fetch(`/api/admin/rooms/${deleteTarget.value.id}`, { method: 'DELETE' })
    deleteTarget.value = null
    refresh()
  } catch (e: any) {
    error.value = e?.data?.message ?? 'Failed to delete room.'
    deleteTarget.value = null
  } finally {
    saving.value = false
  }
}

const form = reactive({
  hotelId: '',
  roomNumber: '',
  type: 'STANDARD_DOUBLE',
  capacity: 2,
  priceOffPeak: 120,
  pricePeak: 180,
})

const typeItems = ROOM_TYPES.map(t => ({ label: t.replace(/_/g, ' '), value: t }))

async function addRoom() {
  if (!form.hotelId || !form.roomNumber) return
  saving.value = true
  error.value = ''
  try {
    await $fetch('/api/admin/rooms', {
      method: 'POST',
      body: { ...form, hotelId: Number(form.hotelId), capacity: Number(form.capacity), priceOffPeak: Number(form.priceOffPeak), pricePeak: Number(form.pricePeak) },
    })
    addModalOpen.value = false
    Object.assign(form, { hotelId: '', roomNumber: '', type: 'STANDARD_DOUBLE', capacity: 2, priceOffPeak: 120, pricePeak: 180 })
    refresh()
  } catch (e: any) {
    error.value = e?.data?.message ?? 'Failed to add room.'
  } finally {
    saving.value = false
  }
}

function statusColor(s: string) {
  if (s === 'AVAILABLE') return 'success' as const
  if (s === 'OCCUPIED') return 'error' as const
  if (s === 'CLEANING') return 'warning' as const
  return 'neutral' as const
}
</script>

<template>
  <div>
    <header class="mb-6 pb-4 border-b border-(--ui-border) flex items-end justify-between flex-wrap gap-3">
      <div>
        <h1 class="text-2xl font-bold">Rooms</h1>
        <p class="text-sm text-(--ui-text-muted) mt-1">All rooms across every Verdan property.</p>
      </div>
      <div class="flex gap-2 items-end">
        <div>
          <label class="text-xs text-(--ui-text-muted) block mb-1">Hotel</label>
          <USelect v-model="filterHotel" :items="hotelItems" class="w-44" />
        </div>
        <UButton color="primary" icon="i-lucide-plus" @click="addModalOpen = true">Add room</UButton>
      </div>
    </header>

    <UAlert v-if="error" color="error" variant="subtle" :title="error" class="mb-4" />

    <div v-if="pending" class="flex justify-center py-12">
      <UIcon name="i-lucide-loader-circle" class="h-6 w-6 animate-spin text-muted" />
    </div>

    <div v-else-if="rooms.length === 0" class="border border-(--ui-border) rounded-md py-10 text-center text-sm text-(--ui-text-muted)">
      No rooms found.
    </div>

    <div v-else class="border border-(--ui-border) rounded-md overflow-hidden bg-(--ui-bg-elevated)">
      <table class="w-full text-sm">
        <thead class="bg-(--ui-bg-muted) text-(--ui-text-muted) text-xs uppercase tracking-wider">
          <tr>
            <th class="text-left px-4 py-3 font-medium">Room</th>
            <th class="text-left px-4 py-3 font-medium">Hotel</th>
            <th class="text-left px-4 py-3 font-medium">Type</th>
            <th class="text-left px-4 py-3 font-medium">Capacity</th>
            <th class="text-right px-4 py-3 font-medium">Off-peak £</th>
            <th class="text-right px-4 py-3 font-medium">Peak £</th>
            <th class="text-left px-4 py-3 font-medium">Status</th>
            <th class="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-(--ui-border)">
          <tr v-for="r in rooms" :key="r.id" class="hover:bg-(--ui-bg-muted) transition-colors">
            <td class="px-4 py-3 font-mono">{{ r.roomNumber }}</td>
            <td class="px-4 py-3">{{ r.hotel?.name }}</td>
            <td class="px-4 py-3">{{ r.type.replace(/_/g, ' ') }}</td>
            <td class="px-4 py-3">{{ r.capacity }}</td>
            <td class="px-4 py-3 text-right">£{{ r.priceOffPeak }}</td>
            <td class="px-4 py-3 text-right">£{{ r.pricePeak }}</td>
            <td class="px-4 py-3">
              <UBadge :color="statusColor(r.status)" variant="subtle" size="sm">{{ r.status.replace('_', ' ') }}</UBadge>
            </td>
            <td class="px-4 py-3 text-right whitespace-nowrap">
              <div class="flex justify-end gap-1">
                <UButton size="xs" color="neutral" variant="outline" :to="`/admin/rooms/${r.id}`">Edit</UButton>
                <UButton size="xs" color="error" variant="ghost" icon="i-lucide-trash-2" @click="deleteTarget = r" />
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <UModal v-model:open="deleteModalOpen" title="Delete room">
      <template #body>
        <p class="text-sm text-(--ui-text-muted)">
          Delete room <span class="font-mono font-medium text-(--ui-text)">{{ deleteTarget?.roomNumber }}</span>
          at <span class="font-medium text-(--ui-text)">{{ deleteTarget?.hotel?.name }}</span>?
          Rooms with active bookings (confirmed or checked-in) cannot be deleted.
        </p>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2 w-full">
          <UButton label="Cancel" color="neutral" variant="outline" @click="deleteTarget = null" />
          <UButton label="Delete" color="error" :loading="saving" @click="deleteRoom" />
        </div>
      </template>
    </UModal>

    <UModal v-model:open="addModalOpen" title="Add room">
      <template #body>
        <div class="flex flex-col gap-3">
          <div>
            <label class="text-xs font-medium text-(--ui-text-muted) block mb-1">Hotel</label>
            <USelect v-model="form.hotelId" :items="hotelItems.slice(1)" />
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-xs font-medium text-(--ui-text-muted) block mb-1">Room number</label>
              <UInput v-model="form.roomNumber" placeholder="101" />
            </div>
            <div>
              <label class="text-xs font-medium text-(--ui-text-muted) block mb-1">Type</label>
              <USelect v-model="form.type" :items="typeItems" />
            </div>
          </div>
          <div class="grid grid-cols-3 gap-3">
            <div>
              <label class="text-xs font-medium text-(--ui-text-muted) block mb-1">Capacity</label>
              <UInput v-model="form.capacity" type="number" min="1" />
            </div>
            <div>
              <label class="text-xs font-medium text-(--ui-text-muted) block mb-1">Off-peak £</label>
              <UInput v-model="form.priceOffPeak" type="number" min="0" />
            </div>
            <div>
              <label class="text-xs font-medium text-(--ui-text-muted) block mb-1">Peak £</label>
              <UInput v-model="form.pricePeak" type="number" min="0" />
            </div>
          </div>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2 w-full">
          <UButton label="Cancel" color="neutral" variant="outline" @click="addModalOpen = false" />
          <UButton label="Add" color="primary" :loading="saving" @click="addRoom" />
        </div>
      </template>
    </UModal>
  </div>
</template>
