<script setup lang="ts">
const { user } = useUserSession()
if (!user.value || user.value.role !== 'ADMIN') {
  navigateTo('/')
}

/* =======================================================
        Filters + pagination state
   ======================================================= */
const actionFilter = ref('all')
const startDate = ref('')
const endDate = ref('')
const page = ref(1)
const pageSize = 50

const actionItems = [
  { label: 'All actions', value: 'all' },
  { label: 'API_ACCESS', value: 'API_ACCESS' },
  { label: 'LOGIN', value: 'LOGIN' },
  { label: 'BOOKING_CREATE', value: 'BOOKING_CREATE' },
  { label: 'BOOKING_CANCEL', value: 'BOOKING_CANCEL' },
  { label: 'CHECK_IN', value: 'CHECK_IN' },
  { label: 'CHECK_OUT', value: 'CHECK_OUT' },
  { label: 'ROOM_STATUS_CHANGE', value: 'ROOM_STATUS_CHANGE' },
  { label: 'ROOM_RATE_CHANGE', value: 'ROOM_RATE_CHANGE' },
  { label: 'SERVICE_ADD', value: 'SERVICE_ADD' },
  { label: 'SERVICE_REMOVE', value: 'SERVICE_REMOVE' },
  { label: 'INVOICE_PAID', value: 'INVOICE_PAID' },
  { label: 'STAFF_CREATE', value: 'STAFF_CREATE' },
  { label: 'STAFF_REMOVE', value: 'STAFF_REMOVE' },
]

const queryParams = computed(() => {
  const q: Record<string, string | number> = { page: page.value, pageSize }
  if (actionFilter.value !== 'all') q.action = actionFilter.value
  if (startDate.value) q.startDate = startDate.value
  if (endDate.value) q.endDate = endDate.value
  return q
})

const { data, pending, refresh } = await useFetch('/api/audit-logs', { query: queryParams })
const logs = computed<any[]>(() => data.value?.logs ?? [])
const pagination = computed(() => data.value?.pagination ?? { page: 1, totalPages: 1, total: 0 })

watch([actionFilter, startDate, endDate], () => {
  page.value = 1
})

function fmtDate(d: string) {
  return new Date(d).toLocaleString()
}
</script>

<template>
  <div>
    <header class="mb-6 pb-4 border-b border-(--ui-border)">
      <h1 class="text-2xl font-bold">Audit logs</h1>
      <p class="text-sm text-(--ui-text-muted) mt-1">Filter by action and date range. API_ACCESS rows show authenticated requests.</p>
    </header>

    <!-- ===================================================
                          Filters
         =================================================== -->
    <section class="mb-4">
      <div class="border border-(--ui-border) rounded-md bg-(--ui-bg-elevated) p-4">
        <div class="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
          <div>
            <label class="text-xs font-medium text-(--ui-text-muted) block mb-1">Action</label>
            <USelect v-model="actionFilter" :items="actionItems" />
          </div>
          <div>
            <label class="text-xs font-medium text-(--ui-text-muted) block mb-1">From</label>
            <UInput v-model="startDate" type="date" />
          </div>
          <div>
            <label class="text-xs font-medium text-(--ui-text-muted) block mb-1">To</label>
            <UInput v-model="endDate" type="date" />
          </div>
          <UButton color="primary" variant="outline" icon="i-lucide-refresh-cw" @click="refresh()">Refresh</UButton>
        </div>
      </div>
    </section>

    <div v-if="pending" class="flex justify-center py-12">
      <UIcon name="i-lucide-loader-circle" class="h-6 w-6 animate-spin text-muted" />
    </div>

    <div v-else-if="logs.length === 0" class="border border-(--ui-border) rounded-md py-10 text-center text-sm text-(--ui-text-muted)">
      No logs match these filters.
    </div>

    <div v-else class="border border-(--ui-border) rounded-md overflow-hidden bg-(--ui-bg-elevated)">
      <table class="w-full text-sm">
        <thead class="bg-(--ui-bg-muted) text-(--ui-text-muted) text-xs uppercase tracking-wider">
          <tr>
            <th class="text-left px-4 py-2 font-medium">When</th>
            <th class="text-left px-4 py-2 font-medium">Action</th>
            <th class="text-left px-4 py-2 font-medium">User</th>
            <th class="text-left px-4 py-2 font-medium">Details</th>
            <th class="text-left px-4 py-2 font-medium">IP</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-(--ui-border)">
          <tr v-for="log in logs" :key="log.id">
            <td class="px-4 py-2 text-xs whitespace-nowrap">{{ fmtDate(log.createdAt) }}</td>
            <td class="px-4 py-2">
              <UBadge color="neutral" variant="subtle" size="sm">{{ log.action }}</UBadge>
            </td>
            <td class="px-4 py-2">
              <div>{{ log.user?.name ?? 'System' }}</div>
              <div class="text-xs text-(--ui-text-muted)">{{ log.user?.email ?? '—' }}</div>
            </td>
            <td class="px-4 py-2 text-xs">{{ log.details ?? '—' }}</td>
            <td class="px-4 py-2 text-xs text-(--ui-text-muted) font-mono">{{ log.ipAddress ?? '—' }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ===================================================
                            Pagination
         =================================================== -->
    <div v-if="pagination.totalPages > 1" class="flex items-center justify-between mt-4">
      <span class="text-xs text-(--ui-text-muted)">Page {{ pagination.page }} of {{ pagination.totalPages }} ({{ pagination.total }} total)</span>
      <div class="flex gap-2">
        <UButton size="sm" color="neutral" variant="outline" :disabled="page <= 1" @click="page--">Previous</UButton>
        <UButton size="sm" color="neutral" variant="outline" :disabled="page >= pagination.totalPages" @click="page++">Next</UButton>
      </div>
    </div>
  </div>
</template>
