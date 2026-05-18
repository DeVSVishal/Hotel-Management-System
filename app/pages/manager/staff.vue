<script setup lang="ts">
const { user } = useUserSession()
if (!user.value || !['MANAGER', 'ADMIN'].includes(user.value.role)) {
  navigateTo('/')
}

const isAdmin = computed(() => user.value?.role === 'ADMIN')

const { data: hotelsData } = await useFetch('/api/hotels')
const hotels = computed<any[]>(() => hotelsData.value?.hotels ?? [])
const hotelItems = computed(() => hotels.value.map((h: any) => ({ label: h.name, value: String(h.id) })))

const { data, pending, refresh } = await useFetch('/api/manager/staff')
const staff = computed<any[]>(() => data.value?.staff ?? [])

const addOpen = ref(false)
const deleteTarget = ref<any | null>(null)
const errorMsg = ref('')
const saving = ref(false)

const form = reactive({
  name: '',
  email: '',
  password: '',
  role: 'STAFF',
  hotelId: '',
})

const roleItems = computed(() => {
  const items = [{ label: 'Staff', value: 'STAFF' }]
  if (isAdmin.value) items.push({ label: 'Manager', value: 'MANAGER' })
  return items
})

const deleteOpen = computed({
  get: () => !!deleteTarget.value,
  set: (v: boolean) => { if (!v) deleteTarget.value = null },
})

async function addStaff() {
  if (!form.name || !form.email || !form.password) return
  if (isAdmin.value && !form.hotelId) {
    errorMsg.value = 'Please select a hotel'
    return
  }
  saving.value = true
  errorMsg.value = ''
  try {
    const body: any = { name: form.name, email: form.email, password: form.password, role: form.role }
    if (isAdmin.value) body.hotelId = Number(form.hotelId)
    await $fetch('/api/manager/staff', { method: 'POST', body })
    addOpen.value = false
    Object.assign(form, { name: '', email: '', password: '', role: 'STAFF', hotelId: '' })
    refresh()
  } catch (e: any) {
    errorMsg.value = e?.data?.message ?? 'Failed to create staff'
  } finally {
    saving.value = false
  }
}

async function confirmDelete() {
  if (!deleteTarget.value) return
  saving.value = true
  errorMsg.value = ''
  try {
    await $fetch(`/api/manager/staff/${deleteTarget.value.id}`, { method: 'DELETE' })
    deleteTarget.value = null
    refresh()
  } catch (e: any) {
    errorMsg.value = e?.data?.message ?? 'Failed to remove staff'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div>
    <header class="mb-6 pb-4 border-b border-(--ui-border) flex items-end justify-between flex-wrap gap-3">
      <div>
        <h1 class="text-2xl font-bold">Staff</h1>
        <p class="text-sm text-(--ui-text-muted) mt-1">Staff and managers assigned to your hotel.</p>
      </div>
      <UButton color="primary" icon="i-lucide-plus" @click="addOpen = true">Add staff</UButton>
    </header>

    <UAlert v-if="errorMsg" color="error" variant="subtle" :title="errorMsg" class="mb-4" />

    <div v-if="pending" class="flex justify-center py-12">
      <UIcon name="i-lucide-loader-circle" class="h-6 w-6 animate-spin text-muted" />
    </div>

    <div v-else-if="staff.length === 0" class="border border-(--ui-border) rounded-md py-10 text-center text-sm text-(--ui-text-muted)">
      No staff found.
    </div>

    <div v-else class="border border-(--ui-border) rounded-md overflow-hidden bg-(--ui-bg-elevated)">
      <table class="w-full text-sm">
        <thead class="bg-(--ui-bg-muted) text-(--ui-text-muted) text-xs uppercase tracking-wider">
          <tr>
            <th class="text-left px-4 py-3 font-medium">Name</th>
            <th class="text-left px-4 py-3 font-medium">Email</th>
            <th class="text-left px-4 py-3 font-medium">Role</th>
            <th class="text-left px-4 py-3 font-medium">Hotel</th>
            <th class="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-(--ui-border)">
          <tr v-for="s in staff" :key="s.id">
            <td class="px-4 py-3">{{ s.name }}</td>
            <td class="px-4 py-3 text-(--ui-text-muted)">{{ s.email }}</td>
            <td class="px-4 py-3">
              <UBadge :color="s.role === 'MANAGER' ? 'info' : 'neutral'" variant="subtle" size="sm">{{ s.role }}</UBadge>
            </td>
            <td class="px-4 py-3">{{ s.hotel?.name ?? '—' }}</td>
            <td class="px-4 py-3 text-right">
              <UButton v-if="s.id !== user?.id" size="xs" color="error" variant="ghost" icon="i-lucide-trash-2" @click="deleteTarget = s" />
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <UModal v-model:open="addOpen" title="Add staff member">
      <template #body>
        <div class="flex flex-col gap-3">
          <div>
            <label class="text-xs font-medium text-(--ui-text-muted) block mb-1">Name</label>
            <UInput v-model="form.name" />
          </div>
          <div>
            <label class="text-xs font-medium text-(--ui-text-muted) block mb-1">Email</label>
            <UInput v-model="form.email" type="email" />
          </div>
          <div>
            <label class="text-xs font-medium text-(--ui-text-muted) block mb-1">Password</label>
            <UInput v-model="form.password" type="password" />
            <p class="text-xs text-(--ui-text-muted) mt-1">8+ chars, upper, lower, number, special</p>
          </div>
          <div>
            <label class="text-xs font-medium text-(--ui-text-muted) block mb-1">Role</label>
            <USelect v-model="form.role" :items="roleItems" />
          </div>
          <div v-if="isAdmin">
            <label class="text-xs font-medium text-(--ui-text-muted) block mb-1">Hotel</label>
            <USelect v-model="form.hotelId" :items="hotelItems" placeholder="Select hotel" />
          </div>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2 w-full">
          <UButton label="Cancel" color="neutral" variant="outline" @click="addOpen = false" />
          <UButton label="Add" color="primary" :loading="saving" @click="addStaff" />
        </div>
      </template>
    </UModal>

    <UModal v-model:open="deleteOpen" title="Remove staff?">
      <template #body>
        <p class="text-sm">
          Remove <span class="font-medium">{{ deleteTarget?.name }}</span> ({{ deleteTarget?.email }})?
          This cannot be undone.
        </p>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2 w-full">
          <UButton label="Cancel" color="neutral" variant="outline" @click="deleteTarget = null" />
          <UButton label="Remove" color="error" :loading="saving" @click="confirmDelete" />
        </div>
      </template>
    </UModal>
  </div>
</template>
