<script setup lang="ts">
const { loggedIn, user: currentUser } = useUserSession()
if (!loggedIn.value) navigateTo('/login')

const selectedRole = ref('all')
const { data, refresh, pending } = useFetch('/api/admin/users', {
  query: computed(() => selectedRole.value !== 'all' ? { role: selectedRole.value } : {}),
})
const users = computed<any[]>(() => data.value?.users ?? [])

const roles = ['GUEST', 'STAFF', 'MANAGER', 'ADMIN']

const confirmDelete = ref<number | null>(null)
const deleteModalOpen = computed({
  get: () => confirmDelete.value !== null,
  set: (val) => { if (!val) confirmDelete.value = null },
})

function isLocked(u: any) {
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
    <header class="mb-6 pb-4 border-b border-(--ui-border) flex items-end justify-between flex-wrap gap-3">
      <div>
        <h1 class="text-2xl font-bold">Users</h1>
        <p class="text-sm text-(--ui-text-muted) mt-1">All user accounts across roles. Click a name to edit.</p>
      </div>
      <USelect
        v-model="selectedRole"
        :items="[{ label: 'All roles', value: 'all' }, ...roles.map(r => ({ label: r, value: r }))]"
        class="w-40"
      />
    </header>

    <div v-if="pending" class="flex justify-center py-12">
      <UIcon name="i-lucide-loader-circle" class="h-6 w-6 animate-spin text-muted" />
    </div>

    <div v-else-if="users.length === 0" class="border border-(--ui-border) rounded-md py-10 text-center text-sm text-(--ui-text-muted)">
      No users found.
    </div>

    <div v-else class="border border-(--ui-border) rounded-md overflow-hidden bg-(--ui-bg-elevated)">
      <table class="w-full text-sm">
        <thead class="bg-(--ui-bg-muted) text-(--ui-text-muted) text-xs uppercase tracking-wider">
          <tr>
            <th class="text-left px-4 py-3 font-medium">Name</th>
            <th class="text-left px-4 py-3 font-medium">Email</th>
            <th class="text-left px-4 py-3 font-medium">Role</th>
            <th class="text-left px-4 py-3 font-medium">Status</th>
            <th class="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-(--ui-border)">
          <tr v-for="u in users" :key="u.id" class="hover:bg-(--ui-bg-muted) transition-colors">
            <td class="px-4 py-3">
              <NuxtLink :to="`/admin/users/${u.id}`" class="font-medium text-(--ui-primary) hover:underline">{{ u.name }}</NuxtLink>
            </td>
            <td class="px-4 py-3 text-(--ui-text-muted)">{{ u.email }}</td>
            <td class="px-4 py-3">
              <UBadge :color="badgeColor(u.role)" variant="subtle">{{ u.role }}</UBadge>
            </td>
            <td class="px-4 py-3">
              <UBadge v-if="isLocked(u)" color="error" variant="subtle">Locked</UBadge>
              <UBadge v-else color="success" variant="subtle">Active</UBadge>
            </td>
            <td class="px-4 py-3">
              <div class="flex items-center justify-end gap-2">
                <USelect
                  :model-value="u.role"
                  :items="roles.map(r => ({ label: r, value: r }))"
                  :disabled="u.id === currentUser?.id && u.role === 'ADMIN'"
                  class="w-28"
                  @update:model-value="changeRole(u.id, $event)"
                />
                <UButton
                  v-if="isLocked(u)"
                  icon="i-lucide-unlock"
                  color="warning"
                  variant="ghost"
                  size="sm"
                  title="Unlock"
                  @click="unlockUser(u.id)"
                />
                <UButton
                  v-if="u.id !== currentUser?.id"
                  icon="i-lucide-trash-2"
                  color="error"
                  variant="ghost"
                  size="sm"
                  title="Delete"
                  @click="confirmDelete = u.id"
                />
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <UModal v-model:open="deleteModalOpen" title="Delete user">
      <template #body>
        <p class="text-sm text-(--ui-text-muted)">Are you sure you want to delete this user? This action cannot be undone.</p>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2 w-full">
          <UButton label="Cancel" color="neutral" variant="outline" @click="confirmDelete = null" />
          <UButton label="Delete" color="error" @click="confirmDelete && deleteUser(confirmDelete)" />
        </div>
      </template>
    </UModal>
  </div>
</template>
