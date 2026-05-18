<script setup lang="ts">
const route = useRoute()
const id = route.params.id as string

const { data, pending, error } = await useFetch(`/api/hotels/${id}`)
const hotel = computed(() => data.value?.hotel)

function formatType(type: string) {
  return type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function statusColor(s: string) {
  if (s === 'AVAILABLE') return 'success' as const
  if (s === 'OCCUPIED') return 'error' as const
  if (s === 'CLEANING') return 'warning' as const
  return 'neutral' as const
}
</script>

<template>
  <div class="max-w-5xl mx-auto px-4 py-8">
    <div v-if="pending" class="flex justify-center py-16">
      <UIcon name="i-lucide-loader-circle" class="h-6 w-6 animate-spin text-muted" />
    </div>

    <UAlert v-else-if="error || !hotel" color="error" variant="subtle" title="Hotel not found" />

    <div v-else>
      <header class="mb-6 pb-4 border-b border-(--ui-border)">
        <NuxtLink to="/" class="text-xs text-(--ui-text-muted) hover:underline">← Back to search</NuxtLink>
        <h1 class="text-2xl font-bold mt-1">{{ hotel.name }}</h1>
        <p class="text-sm text-(--ui-text-muted) mt-1">{{ hotel.city }}, {{ hotel.country }}</p>
      </header>

      <h2 class="text-sm font-semibold text-(--ui-text-muted) uppercase tracking-wider mb-2">Rooms ({{ hotel.rooms?.length ?? 0 }})</h2>
      <div v-if="!hotel.rooms?.length" class="border border-(--ui-border) rounded-md py-10 text-center text-sm text-(--ui-text-muted)">
        No rooms in this hotel.
      </div>
      <div v-else class="border border-(--ui-border) rounded-md overflow-hidden bg-(--ui-bg-elevated)">
        <table class="w-full text-sm">
          <thead class="bg-(--ui-bg-muted) text-(--ui-text-muted) text-xs uppercase tracking-wider">
            <tr>
              <th class="text-left px-4 py-3 font-medium">Room</th>
              <th class="text-left px-4 py-3 font-medium">Type</th>
              <th class="text-left px-4 py-3 font-medium">Capacity</th>
              <th class="text-right px-4 py-3 font-medium">£/night (off-peak)</th>
              <th class="text-right px-4 py-3 font-medium">£/night (peak)</th>
              <th class="text-left px-4 py-3 font-medium">Status</th>
              <th class="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-(--ui-border)">
            <tr v-for="r in hotel.rooms" :key="r.id" class="hover:bg-(--ui-bg-muted) transition-colors">
              <td class="px-4 py-3 font-mono">{{ r.roomNumber }}</td>
              <td class="px-4 py-3">{{ formatType(r.type) }}</td>
              <td class="px-4 py-3">{{ r.capacity }}</td>
              <td class="px-4 py-3 text-right">£{{ r.priceOffPeak }}</td>
              <td class="px-4 py-3 text-right text-(--ui-text-muted)">£{{ r.pricePeak }}</td>
              <td class="px-4 py-3">
                <UBadge :color="statusColor(r.status)" variant="subtle" size="sm">{{ r.status.replace('_', ' ') }}</UBadge>
              </td>
              <td class="px-4 py-3 text-right">
                <UButton size="xs" color="primary" :to="`/rooms/${r.id}`">View / Book</UButton>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
