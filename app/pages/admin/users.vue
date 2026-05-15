<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'

const { loggedIn, user: currentUser } = useUserSession()

if (!loggedIn.value) {
  navigateTo('/login')
}

const selectedRole = ref('all')
const { data, refresh, pending } = useFetch('/api/admin/users', {
  query: computed(() => selectedRole.value !== 'all' ? { role: selectedRole.value } : {}),
})

const roles = ['GUEST', 'STAFF', 'MANAGER', 'ADMIN']

const confirmDelete = ref<number | null>(null)

const deleteModalOpen = computed({
  get: () => confirmDelete.value !== null,
  set: (val) => { if (!val) confirmDelete.value = null },
})

const columns: TableColumn<{
  id: number; name: string; email: string; role: string; lockedUntil: string | null
}>[] = [
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'email', header: 'Email' },
  { accessorKey: 'role', header: 'Role' },
  { accessorKey: 'status', header: 'Status' },
  { accessorKey: 'actions', header: '' },
]

function isLocked(u: { lockedUntil: string | null }) {
  return u.lockedUntil && new Date(u.lockedUntil) > new Date()
}

function badgeColor(role: string) {
  if (role === 'ADMIN') return 'error' as const
  if (role === 'MANAGER') return 'warning' as const
  if (role === 'STAFF') return 'info' as const
  return 'neutral' as const
}

async function changeRole(userId: number, role: string) {
  try {
    await $fetch(`/api/admin/users/${userId}`, { method: 'PUT', body: { role } })
    refresh()
  } catch {}
}

async function unlockUser(userId: number) {
  try {
    await $fetch(`/api/admin/users/${userId}`, { method: 'PUT', body: { unlock: true } })
    refresh()
  } catch {}
}

async function deleteUser(userId: number) {
  try {
    await $fetch(`/api/admin/users/${userId}`, { method: 'DELETE' })
    confirmDelete.value = null
    refresh()
  } catch {}
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold">Users</h1>

      <USelect
        v-model="selectedRole"
        :items="[{ label: 'All roles', value: 'all' }, ...roles.map(r => ({ label: r, value: r }))]"
        class="w-40"
      />
    </div>

    <div v-if="pending" class="flex justify-center py-12">
      <UIcon name="i-lucide-loader-circle" class="h-6 w-6 animate-spin text-muted" />
    </div>

    <UTable v-else :columns="columns" :data="data?.users ?? []" class="w-full">
      <template #name-cell="{ row }">
        <NuxtLink :to="`/admin/users/${row.original.id}`" class="text-primary font-medium hover:underline">
          {{ row.original.name }}
        </NuxtLink>
      </template>

      <template #email-cell="{ row }">
        <span class="text-muted text-sm">{{ row.original.email }}</span>
      </template>

      <template #role-cell="{ row }">
        <UBadge :color="badgeColor(row.original.role)" variant="subtle">
          {{ row.original.role }}
        </UBadge>
      </template>

      <template #status-cell="{ row }">
        <UBadge v-if="isLocked(row.original)" color="error" variant="subtle">Locked</UBadge>
        <UBadge v-else color="success" variant="subtle">Active</UBadge>
      </template>

      <template #actions-cell="{ row }">
        <div class="flex items-center justify-end gap-2">
          <USelect
            :model-value="row.original.role"
            :items="roles.map(r => ({ label: r, value: r }))"
            :disabled="row.original.id === currentUser?.id && row.original.role === 'ADMIN'"
            class="w-28"
            @update:model-value="changeRole(row.original.id, $event)"
          />

          <UButton
            v-if="isLocked(row.original)"
            icon="i-lucide-unlock"
            color="warning"
            variant="ghost"
            size="sm"
            title="Unlock"
            @click="unlockUser(row.original.id)"
          />

          <UButton
            v-if="row.original.id !== currentUser?.id"
            icon="i-lucide-trash-2"
            color="error"
            variant="ghost"
            size="sm"
            title="Delete"
            @click="confirmDelete = row.original.id"
          />
        </div>
      </template>

      <template #empty>
        <div class="flex flex-col items-center gap-3 py-12">
          <span class="text-muted text-sm">No users found</span>
        </div>
      </template>
    </UTable>

    <UModal v-model:open="deleteModalOpen">
      <UCard>
        <template #header>
          <h2 class="text-lg font-semibold">Delete user</h2>
        </template>
        <p class="text-sm text-muted">Are you sure you want to delete this user? This action cannot be undone.</p>
        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton label="Cancel" color="neutral" variant="outline" @click="confirmDelete = null" />
            <UButton label="Delete" color="error" @click="confirmDelete && deleteUser(confirmDelete)" />
          </div>
        </template>
      </UCard>
    </UModal>
  </div>
</template>
