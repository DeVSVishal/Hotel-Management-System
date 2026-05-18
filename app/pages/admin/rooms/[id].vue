<script setup lang="ts">
const { user } = useUserSession()
if (user.value?.role !== 'ADMIN') navigateTo('/')

const route = useRoute()
const id = route.params.id as string

const ROOM_TYPES = ['STANDARD_DOUBLE', 'DELUXE_KING', 'FAMILY_SUITE', 'PENTHOUSE']
const STATUSES = ['AVAILABLE', 'OCCUPIED', 'CLEANING', 'OUT_OF_SERVICE']

const typeItems = ROOM_TYPES.map(t => ({ label: t.replace(/_/g, ' '), value: t }))
const statusItems = STATUSES.map(s => ({ label: s.replace('_', ' '), value: s }))

const { data, pending } = await useFetch(`/api/rooms/${id}`)
const room = computed(() => data.value?.room)

const form = reactive({
  roomNumber: '',
  type: '',
  capacity: 2,
  priceOffPeak: 0,
  pricePeak: 0,
  status: '',
})

watch(room, (r) => {
  if (r) {
    form.roomNumber = r.roomNumber
    form.type = r.type
    form.capacity = r.capacity
    form.priceOffPeak = r.priceOffPeak
    form.pricePeak = r.pricePeak
    form.status = r.status
  }
}, { immediate: true })

const saving = ref(false)
const success = ref(false)
const error = ref('')

async function save() {
  saving.value = true
  error.value = ''
  success.value = false
  try {
    await $fetch(`/api/admin/rooms/${id}`, {
      method: 'PUT',
      body: { ...form, capacity: Number(form.capacity), priceOffPeak: Number(form.priceOffPeak), pricePeak: Number(form.pricePeak) },
    })
    success.value = true
  } catch (e: any) {
    error.value = e?.data?.message ?? 'Failed to save.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="max-w-2xl">
    <header class="mb-6 pb-4 border-b border-(--ui-border)">
      <NuxtLink to="/admin/rooms" class="text-xs text-(--ui-text-muted) hover:underline">← Rooms</NuxtLink>
      <h1 class="text-2xl font-bold mt-1">Edit room</h1>
    </header>

    <div v-if="pending" class="flex justify-center py-12">
      <UIcon name="i-lucide-loader-circle" class="h-6 w-6 animate-spin text-muted" />
    </div>

    <UAlert v-else-if="!room" color="error" variant="subtle" title="Room not found" />

    <section v-else>
      <h2 class="text-sm font-semibold text-(--ui-text-muted) uppercase tracking-wider mb-3">
        Room {{ room.roomNumber }} · {{ room.hotel?.name }}
      </h2>
      <div class="border border-(--ui-border) rounded-md bg-(--ui-bg-elevated) p-5">
        <div class="flex flex-col gap-4">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-xs font-medium text-(--ui-text-muted) block mb-1">Room number</label>
              <UInput v-model="form.roomNumber" />
            </div>
            <div>
              <label class="text-xs font-medium text-(--ui-text-muted) block mb-1">Capacity</label>
              <UInput v-model="form.capacity" type="number" min="1" />
            </div>
          </div>
          <div>
            <label class="text-xs font-medium text-(--ui-text-muted) block mb-1">Type</label>
            <USelect v-model="form.type" :items="typeItems" />
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-xs font-medium text-(--ui-text-muted) block mb-1">Off-peak price (£)</label>
              <UInput v-model="form.priceOffPeak" type="number" min="0" />
            </div>
            <div>
              <label class="text-xs font-medium text-(--ui-text-muted) block mb-1">Peak price (£)</label>
              <UInput v-model="form.pricePeak" type="number" min="0" />
            </div>
          </div>
          <div>
            <label class="text-xs font-medium text-(--ui-text-muted) block mb-1">Status</label>
            <USelect v-model="form.status" :items="statusItems" />
          </div>
        </div>
        <div class="flex items-center justify-between mt-5 pt-4 border-t border-(--ui-border)">
          <div class="flex-1 mr-4">
            <UAlert v-if="success" color="success" variant="subtle" title="Saved successfully" />
            <UAlert v-if="error" color="error" variant="subtle" :title="error" />
          </div>
          <UButton color="primary" :loading="saving" @click="save">Save changes</UButton>
        </div>
      </div>
    </section>
  </div>
</template>
